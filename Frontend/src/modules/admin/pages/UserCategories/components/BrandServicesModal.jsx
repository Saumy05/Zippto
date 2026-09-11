import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiUpload, FiImage } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import Modal from './Modal';
import { serviceService } from '../../../../../services/catalogService';
import { toAssetUrl } from '../utils';
import { z } from 'zod';

const serviceSchema = z.object({
  title: z.string().min(2, "Title is required"),
  basePrice: z.number().min(0, "Price must be non-negative"),
  gstPercentage: z.number().min(0).max(100).default(18),
  discountPrice: z.number().optional(),
  iconUrl: z.string().optional()
});

const BrandServicesModal = ({ isOpen, onClose, brand }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: '',
    basePrice: '',
    gstPercentage: 18,
    discountPrice: '',
    iconUrl: ''
  });

  useEffect(() => {
    if (isOpen && brand) {
      loadServices();
    } else {
      setServices([]);
      resetForm();
    }
  }, [isOpen, brand]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const response = await serviceService.getAll({ brandId: brand.id });
      if (response.success) {
        setServices(response.services || []);
      }
    } catch (error) {
      console.error('Failed to load services:', error);
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      title: '',
      basePrice: '',
      gstPercentage: 18,
      discountPrice: '',
      iconUrl: ''
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingIcon(true);
      const res = await serviceService.uploadImage(file, 'services');
      if (res.success && res.imageUrl) {
        setForm(p => ({ ...p, iconUrl: res.imageUrl }));
        toast.success('Service image uploaded successfully');
      } else {
        toast.error(res.message || 'Failed to upload image');
      }
    } catch (err) {
      console.error('Service image upload error:', err);
      toast.error('Failed to upload image');
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = {
      title: form.title,
      basePrice: Number(form.basePrice),
      gstPercentage: Number(form.gstPercentage),
      discountPrice: form.discountPrice ? Number(form.discountPrice) : undefined,
      iconUrl: form.iconUrl || undefined
    };

    const result = serviceSchema.safeParse(data);
    if (!result.success) {
      const errMsg = result.error?.issues?.[0]?.message || result.error?.errors?.[0]?.message || 'Validation failed';
      toast.error(errMsg);
      return;
    }

    try {
      setLoading(true);
      if (editingId) {
        const response = await serviceService.update(editingId, {
          ...result.data,
          brandId: brand.id
        });
        if (response.success) {
          toast.success('Service updated');
          loadServices();
          resetForm();
        }
      } else {
        const response = await serviceService.create({
          ...result.data,
          brandId: brand.id
        });
        if (response.success) {
          toast.success('Service created');
          loadServices();
          resetForm();
        }
      }
    } catch (error) {
      console.error('Save service error:', error);
      toast.error(error.response?.data?.message || 'Failed to save service');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      await serviceService.delete(id);
      toast.success('Service deleted');
      loadServices();
    } catch (error) {
      toast.error('Failed to delete service');
    }
  };

  const handleEdit = (service) => {
    setEditingId(service.id || service._id);
    setForm({
      title: service.title,
      basePrice: service.basePrice,
      gstPercentage: service.gstPercentage || 18,
      discountPrice: service.discountPrice || '',
      iconUrl: service.iconUrl || ''
    });
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Manage Services for ${brand?.title}`} size="xl">
      <div className="space-y-6">
        {/* Form */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
            {editingId ? 'Edit Service' : 'Add New Service'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Service Title</label>
                <input
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. AC Filter Cleaning"
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Base Price (₹)</label>
                <input
                  type="number"
                  value={form.basePrice}
                  onChange={e => setForm(p => ({ ...p, basePrice: e.target.value }))}
                  placeholder="0"
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  required
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">GST (%)</label>
                <input
                  type="number"
                  value={form.gstPercentage}
                  onChange={e => setForm(p => ({ ...p, gstPercentage: e.target.value }))}
                  placeholder="18"
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Discount Price (Optional ₹)</label>
                <input
                  type="number"
                  value={form.discountPrice}
                  onChange={e => setForm(p => ({ ...p, discountPrice: e.target.value }))}
                  placeholder="Optional discounted price"
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  min="0"
                />
              </div>
            </div>

            {/* Service Image Upload Section */}
            <div className="pt-2 border-t border-gray-200">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Custom Service Photo (Optional)
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="w-14 h-14 rounded-xl border border-gray-200 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                  {form.iconUrl ? (
                    <img src={toAssetUrl(form.iconUrl)} alt="Service preview" className="w-full h-full object-cover" />
                  ) : brand?.iconUrl ? (
                    <img src={toAssetUrl(brand.iconUrl)} alt={brand.title} className="w-full h-full object-contain p-1 opacity-50" title="Will inherit brand icon" />
                  ) : (
                    <FiImage className="w-6 h-6 text-gray-300" />
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold transition-colors">
                      <FiUpload className="w-3.5 h-3.5" />
                      {uploadingIcon ? 'Uploading...' : 'Upload Photo'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingIcon}
                        className="hidden"
                      />
                    </label>

                    {form.iconUrl && (
                      <button
                        type="button"
                        onClick={() => setForm(p => ({ ...p, iconUrl: '' }))}
                        className="px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    {form.iconUrl
                      ? 'Custom image uploaded for this specific service.'
                      : 'Leave blank to automatically use this Brand’s default image.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={loading || uploadingIcon}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 disabled:opacity-50"
              >
                {editingId ? 'Update Service' : 'Add Service'}
              </button>
            </div>
          </form>
        </div>

        {/* List */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Service</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Base Price</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">GST</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {services.map(service => (
                <tr key={service.id || service._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg border border-gray-100 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                        {service.iconUrl ? (
                          <img src={toAssetUrl(service.iconUrl)} alt={service.title} className="w-full h-full object-cover" />
                        ) : brand?.iconUrl ? (
                          <img src={toAssetUrl(brand.iconUrl)} alt={brand.title} className="w-full h-full object-contain p-0.5 opacity-50" title="Inheriting from brand" />
                        ) : (
                          <FiImage className="w-4 h-4 text-gray-300" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{service.title}</div>
                        {service.iconUrl ? (
                          <span className="text-[10px] text-emerald-600 font-medium">Custom Photo</span>
                        ) : (
                          <span className="text-[10px] text-gray-400">Brand Photo</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div>₹{service.basePrice}</div>
                    {service.discountPrice && (
                      <div className="text-xs text-emerald-600 font-bold">Discounted: ₹{service.discountPrice}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{service.gstPercentage}%</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(service)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(service.id || service._id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-sm text-gray-500">
                    No services found for this brand. Add one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};

export default BrandServicesModal;
