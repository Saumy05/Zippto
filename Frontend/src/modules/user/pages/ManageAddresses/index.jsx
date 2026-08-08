import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  FiArrowLeft,
  FiPlus,
  FiMoreVertical,
  FiEdit2,
  FiTrash2,
  FiMapPin,
  FiNavigation,
  FiHome,
  FiBriefcase
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';
import AddressSelectionModal from '../Checkout/components/AddressSelectionModal';
import { userAuthService } from '../../../../services/authService';
import NotificationBell from '../../components/common/NotificationBell';
import { z } from "zod";

// Zod schema for Address validation
const addressSchema = z.object({
  addressLine1: z.string().min(5, "Address location is too short"),
  addressLine2: z.string().optional(),
  city: z.string().min(2, "City name is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().regex(/^\d{6}$/, "Invalid Pincode format"),
});

const ManageAddresses = () => {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMenu, setShowMenu] = useState(null);
  const [editingAddress, setEditingAddress] = useState(null);
  const [houseNumber, setHouseNumber] = useState('');

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const response = await userAuthService.getProfile();
      if (response.success && response.user?.addresses) {
        setAddresses(response.user.addresses);
      }
    } catch (error) {
      console.warn('Failed to load addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = () => {
    setEditingAddress(null);
    setHouseNumber('');
    setShowAddModal(true);
  };

  const handleEdit = (address) => {
    setEditingAddress(address);
    setHouseNumber(address.addressLine2 || '');
    setShowMenu(null);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingAddress(null);
    setHouseNumber('');
  };

  const getComponent = (components, type) => {
    return components?.find(c => c.types.includes(type))?.long_name || '';
  };

  const handleSaveAddress = async (savedHouseNumber, locationObj) => {
    try {
      if (!locationObj) {
        toast.error('Please select a location on the map');
        return;
      }

      const components = locationObj.components || [];
      const city = getComponent(components, 'locality') || getComponent(components, 'administrative_area_level_2') || '';
      const state = getComponent(components, 'administrative_area_level_1') || '';
      const pincode = getComponent(components, 'postal_code') || '';

      const addressData = {
        addressLine1: locationObj.address,
        addressLine2: savedHouseNumber,
        city,
        state,
        pincode
      };

      const validationResult = addressSchema.safeParse(addressData);
      if (!validationResult.success) {
        toast.error(validationResult.error.errors[0].message);
        return;
      }

      const newAddress = {
        type: 'home',
        ...addressData,
        lat: locationObj.lat,
        lng: locationObj.lng,
        isDefault: addresses.length === 0
      };

      const updatedAddresses = [newAddress];

      toast.loading('Saving address...', { id: 'save-addr' });
      const response = await userAuthService.updateProfile({ addresses: updatedAddresses });

      if (response.success) {
        setAddresses(response.user.addresses || updatedAddresses);
        toast.success(editingAddress ? 'Address updated!' : 'Address added!', { id: 'save-addr' });
        handleCloseModal();
      } else {
        toast.error(response.message || 'Failed to save address', { id: 'save-addr' });
      }

    } catch (error) {
      toast.error('Something went wrong saving address', { id: 'save-addr' });
    }
  };

  const handleDelete = async (addressId) => {
    try {
      const updatedAddresses = addresses.filter(addr => (addr._id || addr.id) !== addressId);

      toast.loading('Deleting address...', { id: 'del-addr' });
      const response = await userAuthService.updateProfile({ addresses: updatedAddresses });

      if (response.success) {
        setAddresses(response.user.addresses || updatedAddresses);
        setShowMenu(null);
        toast.success('Address deleted successfully!', { id: 'del-addr' });
      } else {
        toast.error('Failed to delete address', { id: 'del-addr' });
      }
    } catch (error) {
      toast.error('Failed to delete address', { id: 'del-addr' });
    }
  };

  const handleMenuToggle = (addressId) => {
    setShowMenu(showMenu === addressId ? null : addressId);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] font-sans antialiased pb-28">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -ml-20" />
      </div>

      <div className="relative z-10">
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-3.5 shadow-2xs">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 flex items-center justify-center transition-colors active:scale-95"
                aria-label="Go back"
              >
                <FiArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none">
                  Manage Addresses
                </h1>
                <span className="text-[10px] text-slate-500 font-semibold">Doorstep Delivery Locations</span>
              </div>
            </div>
            <NotificationBell />
          </div>
        </header>

        {/* Main Content Container */}
        <main className="max-w-4xl mx-auto px-4 pt-5 space-y-5">
          
          {/* HERO BANNER CARD */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0B132B] via-[#1C2541] to-[#0B132B] p-5 sm:p-6 text-white shadow-md border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
              <div className="space-y-1.5 max-w-lg">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/30 text-[10px] font-black uppercase tracking-wider">
                  <HiSparkles className="w-3 h-3" /> Pinpoint Location Accuracy
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                  Your Saved Doorstep Locations
                </h2>
                <p className="text-xs text-slate-300 font-medium">
                  Verified technicians are dispatched directly to your active default address.
                </p>
              </div>

              <button
                onClick={handleAddAddress}
                className="w-full sm:w-auto shrink-0 px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-[#0B132B] font-extrabold text-xs tracking-wider uppercase shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <FiPlus className="w-4 h-4 stroke-[3]" />
                <span>Add New Address</span>
              </button>
            </div>
          </section>

          {/* ADDRESS LIST */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                <FiMapPin className="w-4 h-4 text-rose-500" /> Saved Locations
              </h3>
              <span className="text-[10px] font-bold text-slate-400">
                {addresses.length} {addresses.length === 1 ? 'Address' : 'Addresses'}
              </span>
            </div>

            {loading ? (
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs animate-pulse space-y-3">
                <div className="h-4 w-32 bg-slate-200 rounded"></div>
                <div className="h-8 w-full bg-slate-100 rounded-xl"></div>
              </div>
            ) : addresses.length === 0 ? (
              /* RICH EMPTY STATE CARD */
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 shadow-2xs space-y-4 relative overflow-hidden">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-[#0B132B] via-[#1C2541] to-[#0B132B] text-amber-400 flex items-center justify-center shadow-lg border border-slate-800">
                  <FiNavigation className="w-10 h-10" />
                </div>

                <div className="max-w-sm mx-auto space-y-1.5">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    No Saved Addresses Yet
                  </h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Add your home, office, or apartment address to enable 1-tap booking for instant technician service.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleAddAddress}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#0B132B] hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all"
                  >
                    <FiPlus className="w-4 h-4 text-amber-400 stroke-[3]" />
                    <span>Add Doorstep Address</span>
                  </button>
                </div>
              </div>
            ) : (
              addresses.map((address) => (
                <div
                  key={address._id || address.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all relative space-y-3 group"
                >
                  {/* Top Badges & Actions */}
                  <div className="flex items-center justify-between pr-8">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                        <FiHome className="w-3 h-3 text-slate-500" />
                        {address.type || 'HOME'}
                      </span>
                      {address.isDefault && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
                          Default Address
                        </span>
                      )}
                    </div>

                    {/* Three Dots Menu Button */}
                    <button
                      onClick={() => handleMenuToggle(address._id || address.id)}
                      className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
                      title="Address Options"
                    >
                      <FiMoreVertical className="w-4 h-4" />
                    </button>

                    {/* Menu Dropdown Popup */}
                    {showMenu === (address._id || address.id) && (
                      <div className="absolute top-12 right-6 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 min-w-[130px] p-1 space-y-0.5">
                        <button
                          onClick={() => handleEdit(address)}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-xl transition-colors text-left text-xs font-bold text-slate-700"
                        >
                          <FiEdit2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(address._id || address.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 rounded-xl transition-colors text-left text-xs font-bold text-red-600"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Address Content */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 border border-rose-100">
                      <FiMapPin className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                        {address.addressLine2 ? `${address.addressLine2}, ` : ''}{address.addressLine1}
                      </h4>
                      <p className="text-xs font-medium text-slate-500">
                        {address.city}, {address.state} - <span className="font-bold text-slate-700">{address.pincode}</span>
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>

        </main>

        {/* FLOATING ACTION BUTTON (FAB) */}
        <button
          onClick={handleAddAddress}
          className="fixed bottom-20 right-4 z-40 bg-[#0B132B] hover:bg-slate-800 text-amber-400 border border-amber-400/40 font-extrabold text-xs px-4 py-3 rounded-full shadow-xl flex items-center gap-2 active:scale-95 transition-all"
        >
          <FiPlus className="w-4 h-4 stroke-[3]" />
          <span className="uppercase tracking-wider">Add Address</span>
        </button>

        {/* Address Selection Modal */}
        <AddressSelectionModal
          isOpen={showAddModal}
          onClose={handleCloseModal}
          houseNumber={houseNumber}
          onHouseNumberChange={setHouseNumber}
          onSave={handleSaveAddress}
        />

        {/* Backdrop for Menu */}
        {showMenu && (
          <div
            className="fixed inset-0 z-10 bg-slate-900/10"
            onClick={() => setShowMenu(null)}
          />
        )}
      </div>
    </div>
  );
};

export default ManageAddresses;
