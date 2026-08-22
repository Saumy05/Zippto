import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FiSearch,
  FiUser,
  FiPhone,
  FiMail,
  FiCheckCircle,
  FiSlash,
  FiCheck,
  FiTrash2,
  FiEye,
  FiEdit2,
  FiSave,
  FiLock,
  FiMapPin,
  FiCreditCard,
  FiShield,
  FiLoader,
  FiDollarSign
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { adminUserService } from '../../../../services/adminUserService';
import { CustomSelect } from '../../../../components/common';
import Modal from '../UserCategories/components/Modal';

const AllUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // View User Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Edit User Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editTab, setEditTab] = useState('basic'); // 'basic', 'status', 'wallet', 'address'
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    isActive: true,
    isPhoneVerified: true,
    isEmailVerified: false,
    profilePhoto: '',
    walletBalance: 0,
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
  });

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 10,
        search: debouncedSearch
      };

      if (statusFilter !== 'all') {
        params.isActive = statusFilter === 'active';
      }

      const response = await adminUserService.getAllUsers(params);
      if (response.success) {
        setUsers(response.data);
        setTotalPages(response.pagination.pages);
        setTotalUsers(response.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, debouncedSearch, statusFilter]);

  const handleStatusToggle = async (userId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'block' : 'activate'} this user?`)) {
      return;
    }

    try {
      const response = await adminUserService.toggleUserStatus(userId, !currentStatus);
      if (response.success) {
        toast.success(response.message);
        setUsers(users.map(user =>
          user._id === userId ? { ...user, isActive: !currentStatus } : user
        ));
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await adminUserService.deleteUser(userId);
      if (response.success) {
        toast.success(response.message);
        fetchUsers();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to delete user');
    }
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };

  const handleOpenEditUser = (user) => {
    setEditingUser(user);
    setEditTab('basic');

    const primaryAddress = user.addresses?.[0] || {};

    setEditForm({
      name: user.name || '',
      phone: user.phone || '',
      email: user.email || '',
      password: '',
      isActive: user.isActive !== undefined ? user.isActive : true,
      isPhoneVerified: Boolean(user.isPhoneVerified),
      isEmailVerified: Boolean(user.isEmailVerified),
      profilePhoto: user.profilePhoto || '',
      walletBalance: user.wallet?.balance || 0,
      addressLine1: primaryAddress.addressLine1 || '',
      addressLine2: primaryAddress.addressLine2 || '',
      city: primaryAddress.city || '',
      state: primaryAddress.state || '',
      pincode: primaryAddress.pincode || '',
      landmark: primaryAddress.landmark || '',
    });

    setIsEditModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e?.preventDefault();
    if (!editingUser) return;

    if (!editForm.name.trim() || !editForm.phone.trim()) {
      toast.error('User name and phone number are required.');
      return;
    }

    try {
      setIsSaving(true);

      const payload = {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email ? editForm.email.trim() : '',
        isActive: Boolean(editForm.isActive),
        isPhoneVerified: Boolean(editForm.isPhoneVerified),
        isEmailVerified: Boolean(editForm.isEmailVerified),
        profilePhoto: editForm.profilePhoto || null,
        wallet: {
          balance: Number(editForm.walletBalance) || 0
        },
        addresses: editForm.addressLine1 ? [{
          type: 'home',
          addressLine1: editForm.addressLine1.trim(),
          addressLine2: editForm.addressLine2.trim(),
          city: editForm.city.trim(),
          state: editForm.state.trim(),
          pincode: editForm.pincode.trim(),
          landmark: editForm.landmark.trim(),
          isDefault: true
        }] : (editingUser.addresses || [])
      };

      if (editForm.password && editForm.password.trim().length >= 6) {
        payload.password = editForm.password.trim();
      }

      const response = await adminUserService.updateUser(editingUser._id, payload);
      if (response.success) {
        toast.success('User details updated successfully!');
        setIsEditModalOpen(false);
        setEditingUser(null);
        await fetchUsers();
      } else {
        toast.error(response.message || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Failed to update user details');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search users by name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="w-44">
            <CustomSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active Only' },
                { value: 'inactive', label: 'Blocked Only' }
              ]}
              size="sm"
            />
          </div>

          <div className="px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100 shrink-0">
            <span className="text-xs font-bold text-blue-700">{totalUsers} Users</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Joined Date</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-xs text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <FiLoader className="w-4 h-4 animate-spin text-blue-600" />
                      Loading users...
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-xs text-gray-500">No users found</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                          {(user.name || 'U')[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-xs">{user.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">ID: {user._id.slice(-6).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-gray-600 text-[11px]">
                          <FiPhone className="w-3 h-3 text-gray-400" />
                          <span className="font-mono">{user.phone}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600 text-[11px]">
                          <FiMail className="w-3 h-3 text-gray-400" />
                          <span>{user.email || 'No email registered'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${user.isActive
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        {user.isActive ? 'Active' : 'Blocked'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] text-gray-600 font-medium">
                        {new Date(user.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        {/* View User Details */}
                        <button
                          onClick={() => handleViewUser(user)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>

                        {/* Edit User Details */}
                        <button
                          onClick={() => handleOpenEditUser(user)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit User Details"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>

                        {/* Block/Unblock Toggle */}
                        <button
                          onClick={() => handleStatusToggle(user._id, user.isActive)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${user.isActive
                            ? 'text-red-500 hover:bg-red-50'
                            : 'text-green-600 hover:bg-green-50'
                            }`}
                          title={user.isActive ? 'Block User Login' : 'Unblock User Login'}
                        >
                          {user.isActive ? <FiSlash className="w-4 h-4" /> : <FiCheck className="w-4 h-4" />}
                        </button>

                        {/* Delete User */}
                        <button
                          onClick={() => handleDeleteUser(user._id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete User"
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

        {/* Pagination */}
        {!loading && users.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/30">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">
              Showing {users.length} of {totalUsers} users
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 disabled:opacity-50 hover:bg-white transition-all cursor-pointer"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 disabled:opacity-50 hover:bg-white transition-all cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── View User Details Modal ────────────────────────────────────────── */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedUser(null);
        }}
        title="Customer Details"
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-lg">
                  {(selectedUser.name || 'U')[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">{selectedUser.name}</h3>
                  <p className="text-xs text-gray-500 font-mono">ID: {selectedUser._id}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const u = selectedUser;
                  setIsViewModalOpen(false);
                  handleOpenEditUser(u);
                }}
                className="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold text-xs rounded-xl border border-amber-200/60 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FiEdit2 className="w-3.5 h-3.5" />
                Edit Details
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Phone Number</label>
                <div className="text-sm font-semibold text-gray-900 font-mono">{selectedUser.phone}</div>
              </div>
              <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email Address</label>
                <div className="text-sm font-semibold text-gray-900">{selectedUser.email || 'N/A'}</div>
              </div>
              <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Account Status</label>
                <div className={`text-sm font-bold mt-1 ${selectedUser.isActive ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedUser.isActive ? '● Active (Login Enabled)' : '○ Blocked (Login Disabled)'}
                </div>
              </div>
              <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Wallet Balance</label>
                <div className="text-sm font-bold text-emerald-600">₹{(selectedUser.wallet?.balance || 0).toLocaleString()}</div>
              </div>
              <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 sm:col-span-2">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Registered Date</label>
                <div className="text-xs font-semibold text-gray-700">
                  {new Date(selectedUser.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 sm:col-span-2">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Saved Address</label>
                <div className="text-xs font-medium text-gray-700">
                  {selectedUser.addresses?.[0]?.addressLine1
                    ? `${selectedUser.addresses[0].addressLine1}, ${selectedUser.addresses[0].city || ''} ${selectedUser.addresses[0].state || ''} ${selectedUser.addresses[0].pincode || ''}`
                    : 'No saved address recorded'}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Edit User Details Modal ────────────────────────────────────────── */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          if (!isSaving) {
            setIsEditModalOpen(false);
            setEditingUser(null);
          }
        }}
        title={`Edit Customer: ${editingUser?.name || ''}`}
        size="lg"
      >
        {editingUser && (
          <form onSubmit={handleSaveUser} className="space-y-6">
            {/* Modal Tabs Navigation */}
            <div className="flex gap-1.5 border-b border-gray-200 pb-2 overflow-x-auto">
              {[
                { id: 'basic', label: 'Personal Info', icon: FiUser },
                { id: 'status', label: 'Account & Security', icon: FiShield },
                { id: 'wallet', label: 'Wallet Balance', icon: FiDollarSign },
                { id: 'address', label: 'Saved Address', icon: FiMapPin },
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

            {/* Tab 1: Personal Info */}
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
                        placeholder="e.g. Saumy User"
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
                        placeholder="e.g. 7389279971"
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium font-mono"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
                    <div className="relative">
                      <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        placeholder="e.g. customer@zippto.com"
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

            {/* Tab 2: Account & Security */}
            {editTab === 'status' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Account Status & Permissions
                  </label>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <input
                      type="checkbox"
                      id="userActive"
                      checked={editForm.isActive}
                      onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                      className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
                    />
                    <label htmlFor="userActive" className="text-xs font-bold text-gray-800 cursor-pointer">
                      Account Active (User can log in and place bookings)
                    </label>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <input
                      type="checkbox"
                      id="userPhoneVerified"
                      checked={editForm.isPhoneVerified}
                      onChange={(e) => setEditForm({ ...editForm, isPhoneVerified: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="userPhoneVerified" className="text-xs font-bold text-gray-800 cursor-pointer">
                      Phone Number Verified
                    </label>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <input
                      type="checkbox"
                      id="userEmailVerified"
                      checked={editForm.isEmailVerified}
                      onChange={(e) => setEditForm({ ...editForm, isEmailVerified: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="userEmailVerified" className="text-xs font-bold text-gray-800 cursor-pointer">
                      Email Address Verified
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Wallet Balance */}
            {editTab === 'wallet' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="p-4 bg-emerald-50/60 border border-emerald-200/70 rounded-2xl">
                  <label className="block text-xs font-bold text-emerald-900 mb-1">
                    Customer Wallet Balance (₹)
                  </label>
                  <div className="relative mt-2">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editForm.walletBalance}
                      onChange={(e) => setEditForm({ ...editForm, walletBalance: Number(e.target.value) })}
                      placeholder="0"
                      className="w-full pl-8 pr-3 py-2.5 bg-white border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-sm font-bold text-slate-900"
                    />
                  </div>
                  <p className="text-[11px] text-emerald-700 mt-2">
                    Directly credits or adjusts the customer's in-app wallet balance for service bookings.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 4: Saved Address */}
            {editTab === 'address' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Address Line 1</label>
                    <input
                      type="text"
                      value={editForm.addressLine1}
                      onChange={(e) => setEditForm({ ...editForm, addressLine1: e.target.value })}
                      placeholder="House / Flat / Block No., Street"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Address Line 2 (Optional)</label>
                    <input
                      type="text"
                      value={editForm.addressLine2}
                      onChange={(e) => setEditForm({ ...editForm, addressLine2: e.target.value })}
                      placeholder="Apartment, Landmark, Area"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Landmark</label>
                    <input
                      type="text"
                      value={editForm.landmark}
                      onChange={(e) => setEditForm({ ...editForm, landmark: e.target.value })}
                      placeholder="Near City Hospital / School"
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

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingUser(null);
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

export default AllUsers;
