import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiCamera,
  FiCheckCircle,
  FiImage,
  FiLoader,
  FiMapPin,
  FiX,
  FiPackage,
  FiAlertCircle
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { z } from 'zod';

import api from '../../../../services/api';
import AddressSelectionModal from '../Checkout/components/AddressSelectionModal';
import { uploadToCloudinary } from '../../../../utils/cloudinaryUpload';
import flutterBridge from '../../../../utils/flutterBridge';

// Zod schema for Scrap
const scrapSchema = z.object({
  title: z.string().min(3, 'Title too short'),
  description: z.string().optional(),
  address: z
    .object({
      addressLine1: z.string().min(5, 'Address must be selected'),
      city: z.string().optional(),
      state: z.string().optional(),
      pincode: z.string().optional(),
      lat: z.any().optional(),
      lng: z.any().optional()
    })
    .refine((data) => data.addressLine1 && data.addressLine1.length > 0, {
      message: 'Pickup address is required'
    })
});

const AddScrap = () => {
  const navigate = useNavigate();

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [houseNumber, setHouseNumber] = useState('');
  const [addressDetails, setAddressDetails] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    images: [],
    address: {
      addressLine1: '',
      city: '',
      state: '',
      pincode: ''
    }
  });

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isFlutter, setIsFlutter] = useState(flutterBridge.isFlutter);
  const [showSourceSheet, setShowSourceSheet] = useState(false);

  useEffect(() => {
    flutterBridge.waitForFlutter().then((ready) => {
      setIsFlutter(ready);
    });
  }, []);

  const handleNativeCamera = async () => {
    const file = await flutterBridge.openCamera();
    if (file) {
      const newFile = {
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
        status: 'idle'
      };
      setSelectedFiles((prev) => [...prev, newFile]);
      flutterBridge.hapticFeedback('success');
    }
  };

  const handlePhotoClick = () => {
    setShowSourceSheet(true);
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + selectedFiles.length > 5) {
      return toast.error('Maximum 5 images allowed');
    }
    const newFiles = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      status: 'idle'
    }));
    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const removeImage = (index) => {
    setSelectedFiles((prev) => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    const validationResult = scrapSchema.safeParse(formData);
    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0].message);
      return;
    }

    try {
      setIsUploading(true);
      toast.loading('Uploading images and listing item...', { id: 'scrap' });

      const imageUrls = [];
      const updatedFiles = [...selectedFiles];

      for (let i = 0; i < updatedFiles.length; i++) {
        const item = updatedFiles[i];
        try {
          setSelectedFiles((prev) =>
            prev.map((f) => (f.id === item.id ? { ...f, status: 'uploading' } : f))
          );

          const url = await uploadToCloudinary(item.file, 'scrap_items', (pct) => {
            setSelectedFiles((prev) =>
              prev.map((f) => (f.id === item.id ? { ...f, progress: pct } : f))
            );
          });

          imageUrls.push(url);
          setSelectedFiles((prev) =>
            prev.map((f) => (f.id === item.id ? { ...f, status: 'done', progress: 100 } : f))
          );
        } catch (err) {
          console.error('Image upload failed', err);
          setSelectedFiles((prev) =>
            prev.map((f) => (f.id === item.id ? { ...f, status: 'error' } : f))
          );
          toast.error(`Failed to upload image ${i + 1}`);
        }
      }

      if (selectedFiles.length > 0 && imageUrls.length === 0) {
        setIsUploading(false);
        toast.dismiss('scrap');
        return toast.error('Failed to upload images. Please try again.');
      }

      const finalData = { ...formData, images: imageUrls };
      const res = await api.post('/scrap', finalData);
      if (res.data.success) {
        toast.success('Scrap item listed successfully!', { id: 'scrap' });
        navigate(-1);
      }
    } catch (err) {
      toast.error('Failed to create listing', { id: 'scrap' });
    } finally {
      setIsUploading(false);
    }
  };

  const getAddressComponent = (components, type) => {
    return components?.find((c) => c.types.includes(type))?.long_name || '';
  };

  const handleAddressSave = (savedHouseNumber, locationObj) => {
    setHouseNumber(savedHouseNumber);
    setAddressDetails(locationObj);
    if (locationObj) {
      const components = locationObj.components;
      setFormData((prev) => ({
        ...prev,
        address: {
          addressLine1: locationObj.address,
          addressLine2: savedHouseNumber,
          city:
            getAddressComponent(components, 'locality') ||
            getAddressComponent(components, 'administrative_area_level_2') ||
            '',
          state: getAddressComponent(components, 'administrative_area_level_1') || '',
          pincode: getAddressComponent(components, 'postal_code') || '',
          lat: locationObj.lat,
          lng: locationObj.lng
        }
      }));
    }
    setShowAddressModal(false);
  };

  const isFormReady = formData.title.trim().length >= 3 && formData.address.addressLine1;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans antialiased pb-28">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/5 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-slate-800/5 rounded-full blur-3xl -ml-20" />
      </div>

      <div className="relative z-10">
        {/* Sticky Header */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-3.5 shadow-2xs">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center transition-colors active:scale-95"
              aria-label="Go back"
            >
              <FiArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none">
                Add Scrap Item
              </h1>
              <span className="text-[10px] text-slate-500 font-semibold">List for doorstep pickup</span>
            </div>
          </div>
        </header>

        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-[#0B132B] via-[#1C2541] to-[#0B132B] px-5 py-5">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[9px] font-extrabold tracking-[0.15em] text-amber-400 uppercase">
                Zippto Scrap Pickup
              </span>
              <h2 className="text-lg font-black text-white leading-tight tracking-tight">
                Sell Your Old Items
              </h2>
              <p className="text-[11px] text-slate-400 font-medium leading-snug max-w-xs">
                List your scrap and our team will pick it up from your doorstep.
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
              <FiPackage className="w-7 h-7 text-amber-400" />
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleCreate} className="max-w-2xl mx-auto px-4 pt-5 space-y-4">

          {/* Item Title */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="px-4 pt-4 pb-1">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">
                Item Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                className="w-full bg-transparent text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none border-none pb-3"
                placeholder="e.g. Old LG Split AC, Samsung Fridge"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="h-px bg-slate-100 mx-4" />
            <div className="px-4 pt-3 pb-4">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">
                Description
              </label>
              <textarea
                className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder-slate-400 outline-none border-none resize-none"
                rows="3"
                placeholder="Condition, model year, approximate weight, etc."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          {/* Image Upload */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                Item Photos
              </label>
              <span className="text-[10px] font-bold text-slate-400">
                {selectedFiles.length}/5 added
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              {selectedFiles.map((item, index) => (
                <div
                  key={item.id || index}
                  className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-50 group"
                >
                  <img src={item.preview} alt="Preview" className="w-full h-full object-cover" />

                  {item.status === 'uploading' && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center p-1.5">
                      <div className="w-full bg-white/30 rounded-full h-1 mb-1">
                        <div
                          className="bg-amber-400 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-[8px] text-white font-black">{item.progress}%</span>
                    </div>
                  )}

                  {item.status === 'done' && (
                    <div className="absolute top-1 left-1 bg-emerald-500 rounded-full p-0.5 shadow-sm">
                      <FiCheckCircle size={9} className="text-white" />
                    </div>
                  )}

                  {item.status === 'error' && (
                    <div className="absolute inset-0 bg-rose-500/20 flex items-center justify-center">
                      <FiAlertCircle className="text-rose-600 w-5 h-5" />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    disabled={isUploading}
                    className="absolute top-1 right-1 w-5 h-5 bg-slate-900/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity disabled:hidden"
                  >
                    <FiX size={10} />
                  </button>
                </div>
              ))}

              {selectedFiles.length < 5 && !isUploading && (
                <div
                  onClick={handlePhotoClick}
                  className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 hover:border-amber-400 hover:bg-amber-50 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 group"
                >
                  <FiCamera className="w-5 h-5 text-slate-400 group-hover:text-amber-500 transition-colors" />
                  <span className="text-[9px] font-extrabold text-slate-400 group-hover:text-amber-600 uppercase tracking-wider transition-colors">
                    Add
                  </span>
                  <input
                    id="add-scrap-photo-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
            </div>

            {selectedFiles.length === 0 && (
              <p className="text-[10px] text-slate-400 font-medium text-center mt-3">
                Photos help buyers trust your listing. Add up to 5.
              </p>
            )}
          </div>

          {/* Pickup Address */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#0B132B] flex items-center justify-center shrink-0">
                  <FiMapPin className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <span className="text-xs font-extrabold text-slate-900 tracking-tight">
                  Pickup Location
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddressModal(true)}
                className="text-[10px] font-extrabold text-[#0B132B] hover:text-amber-600 uppercase tracking-wider transition-colors"
              >
                {formData.address.addressLine1 ? 'Change' : 'Select'}
              </button>
            </div>

            {formData.address.addressLine1 ? (
              <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-3 space-y-0.5">
                <p className="font-extrabold text-slate-900 text-sm leading-snug">
                  {houseNumber ? `${houseNumber}, ` : ''}
                  {formData.address.addressLine1.split(',')[0]}
                </p>
                <p className="text-[11px] text-slate-500 font-medium truncate">
                  {formData.address.addressLine1}
                </p>
                {formData.address.city && (
                  <p className="text-[10px] text-slate-400 font-semibold">
                    {formData.address.city}
                    {formData.address.pincode ? ` — ${formData.address.pincode}` : ''}
                  </p>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddressModal(true)}
                className="w-full py-3.5 border-2 border-dashed border-slate-300 hover:border-amber-400 hover:bg-amber-50 rounded-2xl text-slate-500 text-xs font-bold transition-all active:scale-95 group"
              >
                <span className="group-hover:text-amber-600 transition-colors">
                  + Select Pickup Address
                </span>
              </button>
            )}
          </div>

          {/* Tips Card */}
          <div className="bg-amber-50 border border-amber-200/60 rounded-3xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <HiSparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-xs font-extrabold text-amber-800">Listing Tips</span>
            </div>
            <ul className="space-y-1 text-[11px] text-amber-700 font-medium pl-6 list-disc leading-relaxed">
              <li>Add clear photos from multiple angles</li>
              <li>Mention brand, model, and condition in description</li>
              <li>Set the correct pickup address for faster collection</li>
            </ul>
          </div>

          {/* Submit CTA */}
          <div className="pt-2 pb-4">
            <button
              type="submit"
              disabled={!isFormReady || isUploading}
              className="w-full py-4 rounded-2xl font-extrabold text-sm tracking-wide shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2.5 bg-[#0B132B] hover:bg-slate-800 text-white"
            >
              {isUploading ? (
                <>
                  <FiLoader className="animate-spin w-4 h-4" />
                  <span>Listing Item...</span>
                </>
              ) : (
                <>
                  <HiSparkles className="w-4 h-4 text-amber-400" />
                  <span>List Item for Pickup</span>
                </>
              )}
            </button>
            {!isFormReady && !isUploading && (
              <p className="text-center text-[11px] text-slate-400 font-medium mt-2">
                Fill in item title and pickup address to continue
              </p>
            )}
          </div>
        </form>
      </div>

      {/* Address Modal */}
      <AddressSelectionModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        address={formData.address.addressLine1 || ''}
        houseNumber={houseNumber}
        onHouseNumberChange={setHouseNumber}
        onSave={handleAddressSave}
      />

      {/* Photo Source Bottom Sheet */}
      <AnimatePresence>
        {showSourceSheet && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSourceSheet(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative bg-white w-full rounded-t-[32px] p-6 pb-10 shadow-2xl z-10"
            >
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />

              <div className="flex items-center justify-between mb-5">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">Add Photos</h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Choose a photo source
                  </p>
                </div>
                <button
                  onClick={() => setShowSourceSheet(false)}
                  className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Camera Option */}
                <button
                  type="button"
                  onClick={() => {
                    setShowSourceSheet(false);
                    if (isFlutter) {
                      handleNativeCamera();
                    } else {
                      document.getElementById('add-scrap-photo-upload')?.click();
                    }
                  }}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-[#0B132B] active:scale-95 transition-all"
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center">
                    <FiCamera className="w-6 h-6 text-amber-400" />
                  </div>
                  <span className="font-extrabold text-white text-xs uppercase tracking-wider">
                    Camera
                  </span>
                </button>

                {/* Gallery Option */}
                <button
                  type="button"
                  onClick={() => {
                    setShowSourceSheet(false);
                    document.getElementById('add-scrap-photo-upload')?.click();
                  }}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-slate-100 border border-slate-200 active:scale-95 transition-all"
                >
                  <div className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center">
                    <FiImage className="w-6 h-6 text-slate-700" />
                  </div>
                  <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                    Gallery
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AddScrap;
