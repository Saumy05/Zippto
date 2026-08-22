import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FiCheck,
  FiX,
  FiEye,
  FiSearch,
  FiFilter,
  FiDownload,
  FiLoader,
  FiPower,
  FiTrash2,
  FiEdit2,
  FiSave,
  FiUser,
  FiBriefcase,
  FiMapPin,
  FiCreditCard,
  FiShield,
  FiPhone,
  FiMail,
  FiLock,
  FiPlus,
  FiDollarSign
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import CardShell from '../UserCategories/components/CardShell';
import Modal from '../UserCategories/components/Modal';
import adminVendorService from '../../../../services/adminVendorService';

const AllVendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Edit Vendor State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [editTab, setEditTab] = useState('basic'); // 'basic', 'services', 'address', 'kyc_bank', 'status'
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    businessName: '',
    password: '',
    service: '',
    approvalStatus: 'approved',
    isActive: true,
    isPhoneVerified: true,
    isEmailVerified: false,
    profilePhoto: '',
    serviceRange: 10,
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
    aadharNumber: '',
    panNumber: '',
    cashLimit: 5000,
    isWalletBlocked: false,
    blockReason: '',
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: '',
    isBankVerified: false,
  });

  // Load vendors from backend
  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const response = await adminVendorService.getAllVendors();
      if (response.success) {
        // Transform backend data to frontend format, preserving full vendor details
        const transformedVendors = response.data.map(vendor => ({
          ...vendor,
          id: vendor._id,
          name: vendor.name || '',
          email: vendor.email || '',
          phone: vendor.phone || '',
          businessName: vendor.businessName || '',
          service: vendor.service || vendor.categories || [],
          approvalStatus: vendor.approvalStatus || 'pending',
          aadharNumber: vendor.aadhar?.number || '',
          panNumber: vendor.pan?.number || '',
          documents: {
            aadhar: vendor.aadhar?.document,
            aadharBack: vendor.aadhar?.backDocument,
            pan: vendor.pan?.document,
            other: vendor.otherDocuments?.[0]
          },
          createdAt: vendor.createdAt,
          isActive: vendor.isActive !== undefined ? vendor.isActive : true
        }));
        setVendors(transformedVendors);
      } else {
        toast.error(response.message || 'Failed to load vendors');
      }
    } catch (error) {
      console.error('Error loading vendors:', error);
      toast.error('Failed to load vendors. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = useMemo(() => {
    return vendors.filter(vendor => {
      const serviceString = Array.isArray(vendor.service)
        ? vendor.service.join(' ')
        : (vendor.service || '');

      const matchesStatus = filterStatus === 'all' || vendor.approvalStatus === filterStatus;

      const matchesSearch =
        (vendor.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (vendor.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (vendor.phone || '').includes(searchQuery) ||
        serviceString.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (vendor.businessName && vendor.businessName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesStatus && matchesSearch;
    });
  }, [vendors, filterStatus, searchQuery]);

  const handleApprove = async (vendorId) => {
    try {
      const response = await adminVendorService.approveVendor(vendorId);
      if (response.success) {
        setVendors(prev => prev.map(v =>
          v.id === vendorId ? { ...v, approvalStatus: 'approved' } : v
        ));
        toast.success('Vendor approved successfully!');
      } else {
        toast.error(response.message || 'Failed to approve vendor');
      }
    } catch (error) {
      console.error('Error approving vendor:', error);
      toast.error('Failed to approve vendor. Please try again.');
    }
  };

  const handleReject = async (vendorId) => {
    try {
      const response = await adminVendorService.rejectVendor(vendorId);
      if (response.success) {
        setVendors(prev => prev.map(v =>
          v.id === vendorId ? { ...v, approvalStatus: 'rejected' } : v
        ));
        toast.success('Vendor rejected successfully.');
      } else {
        toast.error(response.message || 'Failed to reject vendor');
      }
    } catch (error) {
      console.error('Error rejecting vendor:', error);
      toast.error('Failed to reject vendor. Please try again.');
    }
  };

  const handleToggleStatus = async (vendorId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      const response = await adminVendorService.toggleStatus(vendorId, newStatus);
      if (response.success) {
        setVendors(prev => prev.map(v =>
          v.id === vendorId ? { ...v, isActive: newStatus } : v
        ));
        toast.success(`Vendor ${newStatus ? 'activated' : 'deactivated'} successfully`);
      } else {
        toast.error(response.message || 'Failed to update vendor status');
      }
    } catch (error) {
      console.error('Error toggling vendor status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (vendorId) => {
    if (!window.confirm('Are you sure you want to delete this vendor? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await adminVendorService.deleteVendor(vendorId);
      if (response.success) {
        setVendors(prev => prev.filter(v => v.id !== vendorId));
        toast.success('Vendor deleted successfully');
      } else {
        toast.error(response.message || 'Failed to delete vendor');
      }
    } catch (error) {
      console.error('Error deleting vendor:', error);
      toast.error('Failed to delete vendor');
    }
  };

  const handleViewDetails = (vendor) => {
    setSelectedVendor(vendor);
    setIsViewModalOpen(true);
  };

  // Open Edit Modal with vendor details populated
  const handleOpenEditModal = (vendor) => {
    setEditingVendor(vendor);
    setEditTab('basic');

    const serviceString = Array.isArray(vendor.service)
      ? vendor.service.join(', ')
      : (vendor.service || '');

    setEditForm({
      name: vendor.name || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      businessName: vendor.businessName || '',
      password: '',
      service: serviceString,
      approvalStatus: vendor.approvalStatus || 'approved',
      isActive: vendor.isActive !== undefined ? vendor.isActive : true,
      isPhoneVerified: vendor.isPhoneVerified !== undefined ? vendor.isPhoneVerified : true,
      isEmailVerified: vendor.isEmailVerified !== undefined ? vendor.isEmailVerified : false,
      profilePhoto: vendor.profilePhoto || vendor.avatar || '',
      serviceRange: vendor.settings?.serviceRange || 10,
      addressLine1: vendor.address?.addressLine1 || '',
      addressLine2: vendor.address?.addressLine2 || '',
      city: vendor.address?.city || '',
      state: vendor.address?.state || '',
      pincode: vendor.address?.pincode || '',
      landmark: vendor.address?.landmark || '',
      aadharNumber: vendor.aadhar?.number || vendor.aadharNumber || '',
      panNumber: vendor.pan?.number || vendor.panNumber || '',
      cashLimit: vendor.wallet?.cashLimit !== undefined ? vendor.wallet.cashLimit : 5000,
      isWalletBlocked: Boolean(vendor.wallet?.isBlocked),
      blockReason: vendor.wallet?.blockReason || '',
      accountHolderName: vendor.bankDetails?.accountHolderName || '',
      bankName: vendor.bankDetails?.bankName || '',
      accountNumber: vendor.bankDetails?.accountNumber || '',
      ifscCode: vendor.bankDetails?.ifscCode || '',
      upiId: vendor.bankDetails?.upiId || '',
      isBankVerified: Boolean(vendor.bankDetails?.isVerified),
    });

    setIsEditModalOpen(true);
  };

  // Handle Save Edit Form
  const handleSaveVendor = async (e) => {
    e?.preventDefault();
    if (!editingVendor) return;

    if (!editForm.name.trim() || !editForm.phone.trim()) {
      toast.error('Vendor name and phone number are required.');
      return;
    }

    try {
      setIsSaving(true);
      const servicesArray = Array.isArray(editForm.service)
        ? editForm.service
        : editForm.service.split(',').map(s => s.trim()).filter(Boolean);

      const payload = {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim(),
        businessName: editForm.businessName.trim(),
        service: servicesArray,
        categories: servicesArray,
        approvalStatus: editForm.approvalStatus,
        isActive: Boolean(editForm.isActive),
        isPhoneVerified: Boolean(editForm.isPhoneVerified),
        isEmailVerified: Boolean(editForm.isEmailVerified),
        profilePhoto: editForm.profilePhoto || null,
        address: {
          addressLine1: editForm.addressLine1.trim(),
          addressLine2: editForm.addressLine2.trim(),
          city: editForm.city.trim(),
          state: editForm.state.trim(),
          pincode: editForm.pincode.trim(),
          landmark: editForm.landmark.trim(),
        },
        aadhar: {
          number: editForm.aadharNumber.trim(),
        },
        pan: {
          number: editForm.panNumber.trim(),
        },
        wallet: {
          cashLimit: Number(editForm.cashLimit) || 5000,
          isBlocked: Boolean(editForm.isWalletBlocked),
          blockReason: editForm.blockReason ? editForm.blockReason.trim() : '',
        },
        bankDetails: {
          accountHolderName: editForm.accountHolderName.trim(),
          bankName: editForm.bankName.trim(),
          accountNumber: editForm.accountNumber.trim(),
          ifscCode: editForm.ifscCode.trim().toUpperCase(),
          upiId: editForm.upiId.trim(),
          isVerified: Boolean(editForm.isBankVerified),
        },
        settings: {
          serviceRange: Number(editForm.serviceRange) || 10,
        }
      };

      if (editForm.password && editForm.password.trim().length >= 6) {
        payload.password = editForm.password.trim();
      }

      const response = await adminVendorService.updateVendor(editingVendor.id || editingVendor._id, payload);
      if (response.success) {
        toast.success('Vendor details updated successfully!');
        setIsEditModalOpen(false);
        setEditingVendor(null);
        await loadVendors();
      } else {
        toast.error(response.message || 'Failed to update vendor');
      }
    } catch (error) {
      console.error('Error saving vendor:', error);
      toast.error(error.response?.data?.message || 'Failed to update vendor details');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      approved: 'bg-green-100 text-green-800 border-green-300',
      rejected: 'bg-red-100 text-red-800 border-red-300',
      suspended: 'bg-orange-100 text-orange-800 border-orange-300'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles.pending}`}>
        {(status || 'pending').charAt(0).toUpperCase() + (status || 'pending').slice(1)}
      </span>
    );
  };

  const pendingCount = vendors.filter(v => v.approvalStatus === 'pending').length;
  const approvedCount = vendors.filter(v => v.approvalStatus === 'approved').length;
  const rejectedCount = vendors.filter(v => v.approvalStatus === 'rejected').length;

  return (
    <div className="space-y-4">
      <CardShell
        icon={FiFilter}
        title="Vendor Management"
        subtitle="Manage, edit, and verify platform vendors"
      >
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
            <div className="text-[10px] font-bold text-yellow-700 uppercase tracking-wider mb-1">Pending</div>
            <div className="text-xl font-bold text-yellow-900">{pendingCount}</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <div className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-1">Approved</div>
            <div className="text-xl font-bold text-green-900">{approvedCount}</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <div className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1">Rejected</div>
            <div className="text-xl font-bold text-red-900">{rejectedCount}</div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search vendors by name, phone, email, or services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['all', 'pending', 'approved', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-2 rounded-lg text-xs font-bold capitalize transition-all whitespace-nowrap ${filterStatus === status
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Vendor Details</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Business Info</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-xs text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <FiLoader className="w-4 h-4 animate-spin text-blue-600" />
                        Loading vendors...
                      </div>
                    </td>
                  </tr>
                ) : filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-xs text-gray-500">No vendors found</td>
                  </tr>
                ) : (
                  filteredVendors.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-bold text-gray-900 text-xs">{vendor.name}</p>
                          <p className="text-[10px] text-gray-500 font-mono">{vendor.phone}</p>
                          <p className="text-[10px] text-gray-400">{vendor.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-bold text-gray-800 text-xs">{vendor.businessName || 'N/A'}</p>
                          <p className="text-[10px] text-blue-600 font-medium line-clamp-1 max-w-md">
                            {Array.isArray(vendor.service) ? vendor.service.join(', ') : (vendor.service || 'No service assigned')}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${vendor.approvalStatus === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                          vendor.approvalStatus === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                            vendor.approvalStatus === 'suspended' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }`}>
                          {vendor.approvalStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {/* View Details */}
                          <button
                            onClick={() => handleViewDetails(vendor)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="View Details"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>

                          {/* Edit Vendor Details */}
                          <button
                            onClick={() => handleOpenEditModal(vendor)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Vendor Details"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>

                          {/* Toggle Active Status */}
                          <button
                            onClick={() => handleToggleStatus(vendor.id, vendor.isActive)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${vendor.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                            title={vendor.isActive ? "Disable Login" : "Enable Login"}
                          >
                            <FiPower className={`w-4 h-4 ${vendor.isActive ? 'fill-current' : ''}`} />
                          </button>

                          {/* Approve/Reject (Only for pending) */}
                          {vendor.approvalStatus === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(vendor.id)}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors cursor-pointer"
                                title="Approve"
                              >
                                <FiCheck className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReject(vendor.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Reject"
                              >
                                <FiX className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* Delete Vendor */}
                          <button
                            onClick={() => handleDelete(vendor.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Vendor"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardShell>

      {/* ── View Vendor Details Modal ────────────────────────────────────────── */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedVendor(null);
        }}
        title="Vendor Details"
        size="lg"
      >
        {selectedVendor && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-lg">
                  {(selectedVendor.name || 'V')[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">{selectedVendor.name}</h3>
                  <p className="text-xs text-gray-500">{selectedVendor.businessName || 'Individual Partner'}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const v = selectedVendor;
                  setIsViewModalOpen(false);
                  handleOpenEditModal(v);
                }}
                className="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold text-xs rounded-xl border border-amber-200/60 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FiEdit2 className="w-3.5 h-3.5" />
                Edit Details
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Business Name</label>
                <div className="text-sm font-semibold text-gray-900">{selectedVendor.businessName || 'N/A'}</div>
              </div>
              <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Owner Name</label>
                <div className="text-sm font-semibold text-gray-900">{selectedVendor.name}</div>
              </div>
              <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email</label>
                <div className="text-sm font-semibold text-gray-900">{selectedVendor.email || 'N/A'}</div>
              </div>
              <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Phone</label>
                <div className="text-sm font-semibold text-gray-900 font-mono">{selectedVendor.phone}</div>
              </div>
              <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 sm:col-span-2">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Service Categories</label>
                <div className="text-sm font-semibold text-blue-600">
                  {Array.isArray(selectedVendor.service) ? selectedVendor.service.join(', ') : (selectedVendor.service || 'N/A')}
                </div>
              </div>
              <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Approval Status</label>
                <div className="mt-1">{getStatusBadge(selectedVendor.approvalStatus)}</div>
              </div>
              <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Login Status</label>
                <div className={`text-sm font-bold mt-1 ${selectedVendor.isActive ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedVendor.isActive ? '● Active (Login Enabled)' : '○ Inactive (Login Disabled)'}
                </div>
              </div>
              <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 sm:col-span-2">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Address</label>
                <div className="text-xs font-medium text-gray-700">
                  {selectedVendor.address?.fullAddress ||
                    `${selectedVendor.address?.addressLine1 || ''} ${selectedVendor.address?.city || ''} ${selectedVendor.address?.state || ''} ${selectedVendor.address?.pincode || ''}`.trim() || 'No address provided'}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">KYC Documents</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedVendor.documents?.aadhar && (
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <label className="block text-xs font-bold text-gray-600 mb-2">Aadhar Front</label>
                    <img
                      src={selectedVendor.documents.aadhar}
                      alt="Aadhar Front"
                      className="w-full h-40 object-cover rounded-lg border border-gray-200"
                    />
                    <a
                      href={selectedVendor.documents.aadhar}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-bold"
                    >
                      <FiDownload className="w-3.5 h-3.5" />
                      Download
                    </a>
                  </div>
                )}
                {selectedVendor.documents?.aadharBack && (
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <label className="block text-xs font-bold text-gray-600 mb-2">Aadhar Back</label>
                    <img
                      src={selectedVendor.documents.aadharBack}
                      alt="Aadhar Back"
                      className="w-full h-40 object-cover rounded-lg border border-gray-200"
                    />
                    <a
                      href={selectedVendor.documents.aadharBack}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-bold"
                    >
                      <FiDownload className="w-3.5 h-3.5" />
                      Download
                    </a>
                  </div>
                )}
                {selectedVendor.documents?.pan && (
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <label className="block text-xs font-bold text-gray-600 mb-2">PAN Card</label>
                    <img
                      src={selectedVendor.documents.pan}
                      alt="PAN"
                      className="w-full h-40 object-cover rounded-lg border border-gray-200"
                    />
                    <a
                      href={selectedVendor.documents.pan}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-bold"
                    >
                      <FiDownload className="w-3.5 h-3.5" />
                      Download
                    </a>
                  </div>
                )}
              </div>
            </div>

            {selectedVendor.approvalStatus === 'pending' && (
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={async () => {
                    await handleApprove(selectedVendor.id);
                    setIsViewModalOpen(false);
                    setSelectedVendor(null);
                  }}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FiCheck className="w-5 h-5" />
                  Approve Vendor
                </button>
                <button
                  onClick={async () => {
                    await handleReject(selectedVendor.id);
                    setIsViewModalOpen(false);
                    setSelectedVendor(null);
                  }}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FiX className="w-5 h-5" />
                  Reject Vendor
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Edit Vendor Details Modal ────────────────────────────────────────── */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          if (!isSaving) {
            setIsEditModalOpen(false);
            setEditingVendor(null);
          }
        }}
        title={`Edit Partner: ${editingVendor?.name || ''}`}
        size="lg"
      >
        {editingVendor && (
          <form onSubmit={handleSaveVendor} className="space-y-6">
            {/* Modal Tabs Navigation */}
            <div className="flex gap-1.5 border-b border-gray-200 pb-2 overflow-x-auto">
              {[
                { id: 'basic', label: 'Basic Info', icon: FiUser },
                { id: 'services', label: 'Services & Coverage', icon: FiBriefcase },
                { id: 'address', label: 'Address Details', icon: FiMapPin },
                { id: 'kyc_bank', label: 'KYC & Banking', icon: FiCreditCard },
                { id: 'status', label: 'Status & Security', icon: FiShield },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = editTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setEditTab(tab.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab 1: Basic Info */}
            {editTab === 'basic' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        required
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="e.g. Rajesh Kumar"
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        required
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        placeholder="e.g. 9876543210"
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
                    <div className="relative">
                      <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        placeholder="e.g. vendor@zippto.com"
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Business / Firm Name</label>
                    <div className="relative">
                      <FiBriefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={editForm.businessName}
                        onChange={(e) => setEditForm({ ...editForm, businessName: e.target.value })}
                        placeholder="e.g. Kumar Electrical Solutions"
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Reset Password <span className="text-gray-400 font-normal">(Leave blank to keep current)</span>
                    </label>
                    <div className="relative">
                      <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="password"
                        value={editForm.password}
                        onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                        placeholder="Enter new 6+ digit password if changing"
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Services & Coverage */}
            {editTab === 'services' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Offered Services & Categories <span className="text-gray-400 font-normal">(comma-separated)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={editForm.service}
                    onChange={(e) => setEditForm({ ...editForm, service: e.target.value })}
                    placeholder="e.g. Electrician, AC Repair, Plumbing, Carpenter, Cleaning"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium leading-relaxed"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Separate multiple service names with commas.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Service Radius (km)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={editForm.serviceRange}
                    onChange={(e) => setEditForm({ ...editForm, serviceRange: Number(e.target.value) })}
                    className="w-full sm:w-48 p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Maximum dispatch distance for customer bookings.</p>
                </div>
              </div>
            )}

            {/* Tab 3: Address Details */}
            {editTab === 'address' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Address Line 1</label>
                    <input
                      type="text"
                      value={editForm.addressLine1}
                      onChange={(e) => setEditForm({ ...editForm, addressLine1: e.target.value })}
                      placeholder="Shop/House number, Street, Area"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Address Line 2 (Optional)</label>
                    <input
                      type="text"
                      value={editForm.addressLine2}
                      onChange={(e) => setEditForm({ ...editForm, addressLine2: e.target.value })}
                      placeholder="Suite, Floor, Locality"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Landmark</label>
                    <input
                      type="text"
                      value={editForm.landmark}
                      onChange={(e) => setEditForm({ ...editForm, landmark: e.target.value })}
                      placeholder="Near City Square / Metro"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={editForm.city}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      placeholder="e.g. Indore"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      value={editForm.state}
                      onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                      placeholder="e.g. Madhya Pradesh"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Pincode</label>
                    <input
                      type="text"
                      value={editForm.pincode}
                      onChange={(e) => setEditForm({ ...editForm, pincode: e.target.value })}
                      placeholder="e.g. 452001"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: KYC & Banking */}
            {editTab === 'kyc_bank' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Identity Cards */}
                <div>
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FiShield className="w-3.5 h-3.5 text-blue-600" />
                    Government ID Numbers
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Aadhar Card Number</label>
                      <input
                        type="text"
                        value={editForm.aadharNumber}
                        onChange={(e) => setEditForm({ ...editForm, aadharNumber: e.target.value })}
                        placeholder="12-digit Aadhar number"
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">PAN Card Number</label>
                      <input
                        type="text"
                        value={editForm.panNumber}
                        onChange={(e) => setEditForm({ ...editForm, panNumber: e.target.value })}
                        placeholder="10-character alphanumeric PAN"
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* Bank Account */}
                <div className="border-t border-gray-100 pt-4">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FiCreditCard className="w-3.5 h-3.5 text-green-600" />
                    Bank & Payout Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Account Holder Name</label>
                      <input
                        type="text"
                        value={editForm.accountHolderName}
                        onChange={(e) => setEditForm({ ...editForm, accountHolderName: e.target.value })}
                        placeholder="Name as per bank records"
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={editForm.bankName}
                        onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })}
                        placeholder="e.g. HDFC Bank / SBI"
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Account Number</label>
                      <input
                        type="text"
                        value={editForm.accountNumber}
                        onChange={(e) => setEditForm({ ...editForm, accountNumber: e.target.value })}
                        placeholder="Bank account number"
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">IFSC Code</label>
                      <input
                        type="text"
                        value={editForm.ifscCode}
                        onChange={(e) => setEditForm({ ...editForm, ifscCode: e.target.value })}
                        placeholder="e.g. HDFC0001234"
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">UPI ID (Optional)</label>
                      <input
                        type="text"
                        value={editForm.upiId}
                        onChange={(e) => setEditForm({ ...editForm, upiId: e.target.value })}
                        placeholder="e.g. vendor@okhdfcbank"
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium"
                      />
                    </div>
                    <div className="flex items-center gap-3 mt-4 sm:mt-6">
                      <input
                        type="checkbox"
                        id="isBankVerified"
                        checked={editForm.isBankVerified}
                        onChange={(e) => setEditForm({ ...editForm, isBankVerified: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <label htmlFor="isBankVerified" className="text-xs font-bold text-gray-700 cursor-pointer">
                        Mark Bank Account as Verified
                      </label>
                    </div>
                  </div>
                </div>

                {/* Cash Limit & Wallet Blocking */}
                <div className="border-t border-gray-100 pt-4">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FiDollarSign className="w-3.5 h-3.5 text-amber-600" />
                    Wallet Limits & Settlement Controls
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Cash Collection Limit (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={editForm.cashLimit}
                        onChange={(e) => setEditForm({ ...editForm, cashLimit: Number(e.target.value) })}
                        placeholder="e.g. 5000"
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">Maximum cash vendor can hold before settlement block.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Block Wallet</label>
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="checkbox"
                          id="isWalletBlocked"
                          checked={editForm.isWalletBlocked}
                          onChange={(e) => setEditForm({ ...editForm, isWalletBlocked: e.target.checked })}
                          className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500 cursor-pointer"
                        />
                        <label htmlFor="isWalletBlocked" className="text-xs font-bold text-red-600 cursor-pointer">
                          Freeze Partner Wallet
                        </label>
                      </div>
                    </div>
                    {editForm.isWalletBlocked && (
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-gray-700 mb-1">Block Reason</label>
                        <input
                          type="text"
                          value={editForm.blockReason}
                          onChange={(e) => setEditForm({ ...editForm, blockReason: e.target.value })}
                          placeholder="Reason for blocking partner wallet..."
                          className="w-full p-2.5 bg-red-50 border border-red-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-xs font-medium"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 5: Status & Security */}
            {editTab === 'status' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Approval Status</label>
                    <select
                      value={editForm.approvalStatus}
                      onChange={(e) => setEditForm({ ...editForm, approvalStatus: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-semibold capitalize"
                    >
                      <option value="approved">Approved</option>
                      <option value="pending">Pending Review</option>
                      <option value="rejected">Rejected</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-gray-700">Account Toggles</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={editForm.isActive}
                        onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                        className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
                      />
                      <label htmlFor="isActive" className="text-xs font-bold text-gray-800 cursor-pointer">
                        Account Active (Partner can log in & accept orders)
                      </label>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="isPhoneVerified"
                        checked={editForm.isPhoneVerified}
                        onChange={(e) => setEditForm({ ...editForm, isPhoneVerified: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <label htmlFor="isPhoneVerified" className="text-xs font-bold text-gray-800 cursor-pointer">
                        Phone Number Verified
                      </label>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="isEmailVerified"
                        checked={editForm.isEmailVerified}
                        onChange={(e) => setEditForm({ ...editForm, isEmailVerified: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <label htmlFor="isEmailVerified" className="text-xs font-bold text-gray-800 cursor-pointer">
                        Email Address Verified
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingVendor(null);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <FiLoader className="w-4 h-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <FiSave className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default AllVendors;

