import React, { useState, useEffect } from 'react';
import { FiX, FiPlus, FiMapPin, FiHome, FiBriefcase, FiCheckCircle } from 'react-icons/fi';
import { userAuthService } from '../../../../../services/authService';
import { themeColors } from '../../../../../theme';

const addressKey = (a) => a._id || a.id || `${a.addressLine1}|${a.addressLine2 || ''}`;

const TypeIcon = ({ type }) => {
  const cls = 'w-5 h-5';
  if (type === 'work') return <FiBriefcase className={cls} />;
  if (type === 'other') return <FiMapPin className={cls} />;
  return <FiHome className={cls} />;
};

/**
 * Bottom sheet listing the user's saved addresses (from Manage Addresses) so one can be picked
 * at checkout, with an option to add a new one on the map. If the user has none saved it hands
 * straight over to the map flow via onAddNew.
 */
const SavedAddressesModal = ({ isOpen, onClose, selectedAddress = '', selectedHouseNumber = '', onSelect, onAddNew }) => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    userAuthService.getProfile()
      .then((response) => {
        if (cancelled) return;
        const saved = response.success ? (response.user?.addresses || []) : [];
        if (saved.length === 0) {
          onAddNew();
        } else {
          setAddresses(saved);
        }
      })
      .catch(() => { if (!cancelled) onAddNew(); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div
          className="bg-white rounded-t-3xl shadow-2xl flex flex-col animate-slide-up"
          style={{ maxHeight: '80dvh', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
            <h2 className="text-lg font-bold text-black">Select Address</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Close">
              <FiX className="w-5 h-5 text-black" />
            </button>
          </div>

          <div className="px-4 py-3 overflow-y-auto flex-1 space-y-3" style={{ overscrollBehavior: 'contain' }}>
            {loading ? (
              <div className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
            ) : (
              addresses.map((a) => {
                const isSelected = a.addressLine1 === selectedAddress && (a.addressLine2 || '') === selectedHouseNumber;
                return (
                  <button
                    key={addressKey(a)}
                    onClick={() => onSelect(a)}
                    className={`w-full text-left flex items-start gap-3 p-4 rounded-2xl border transition-colors ${
                      isSelected ? 'border-[#B33A35] bg-red-50/40' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
                      <TypeIcon type={a.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold text-black capitalize">{a.type || 'home'}</span>
                        {a.isDefault && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase">Default</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 leading-snug">
                        {a.addressLine2 ? `${a.addressLine2}, ` : ''}{a.addressLine1}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{[a.city, a.state].filter(Boolean).join(', ')}{a.pincode ? ` - ${a.pincode}` : ''}</p>
                    </div>
                    {isSelected && <FiCheckCircle className="w-5 h-5 shrink-0" style={{ color: themeColors.button }} />}
                  </button>
                );
              })
            )}
          </div>

          <div className="p-4 border-t border-gray-100 shrink-0">
            <button
              onClick={onAddNew}
              className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border-2 active:scale-95 transition-all"
              style={{ borderColor: themeColors.button, color: themeColors.button }}
            >
              <FiPlus className="w-4 h-4" /> Add New Address
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SavedAddressesModal;
