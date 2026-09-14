import React, { useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiShoppingCart,
  FiTrash2,
  FiPlus,
  FiMinus,
  FiArrowRight,
  FiTag,
  FiCheckCircle
} from 'react-icons/fi';
import { HiSparkles, HiShieldCheck } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import { useCart } from '../../../../context/CartContext';
import { useSettings } from '../../../../context/SettingsContext';
import NotificationBell from '../../components/common/NotificationBell';

const toAssetUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  if (url.includes('/uploads/')) {
    const uploadPath = url.substring(url.indexOf('/uploads/'));
    const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001').replace(/\/api\/?$/, '');
    return `${base}${uploadPath}`;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (!url.startsWith('/')) return `/${url}`;
  return url;
};

const Cart = () => {
  const navigate = useNavigate();
  const { cartItems, isLoading: loading, removeItem, removeCategoryItems, updateItem } = useCart();
  const { settings, refreshSettings } = useSettings();
  const gstPercentage = settings?.serviceGstPercentage !== undefined ? Number(settings.serviceGstPercentage) : 18;
  const visitedFee = settings?.visitedCharges !== undefined && Number(settings.visitedCharges) > 0 ? Number(settings.visitedCharges) : 29;

  // Refresh settings whenever Cart is opened to guarantee dynamic accuracy
  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  // Popular category quick shortcuts for empty cart state
  const quickCategories = [
    { id: 'electrician', title: 'Electrician & Plumbing', image: '/cat_electrician_plumber.png' },
    { id: 'cleaning', title: 'Deep Cleaning', image: '/cat_cleaning.png' },
    { id: 'ac-repair', title: 'AC Service & Repair', image: '/ac_foam_jet_service.png' },
    { id: 'appliance', title: 'Appliance Repair', image: '/ac_repair_wall.png' },
  ];

  // Purge any corrupted / ghost items automatically
  React.useEffect(() => {
    const corruptItems = cartItems.filter(item => {
      const isCorrupt = (!item.title || item.title.trim() === '' || item.title === 'S') && (!item.price || item.price === 0);
      return isCorrupt;
    });
    if (corruptItems.length > 0) {
      corruptItems.forEach(item => {
        removeItem(item._id || item.id, item.title);
      });
    }
  }, [cartItems, removeItem]);

  // Group items by category (filtering out corrupt items)
  const groupedItems = useMemo(() => {
    const groups = {};
    cartItems.forEach(item => {
      const isCorrupt = (!item.title || item.title.trim() === '' || item.title === 'S') && (!item.price || item.price === 0);
      if (isCorrupt) return;

      const category = item.category || 'Home Services';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });
    return groups;
  }, [cartItems]);

  const cartCount = Object.values(groupedItems).reduce((sum, list) => sum + list.length, 0);

  const handleBack = () => {
    navigate(-1);
  };

  const handleDeleteCategory = async (category) => {
    try {
      const response = await removeCategoryItems(category);
      if (response && response.success !== false) {
        toast.success('Category items removed');
      } else {
        toast.error(response?.message || 'Failed to remove category items');
      }
    } catch (error) {
      toast.error('Failed to remove category items');
    }
  };

  const handleDelete = async (itemId, itemTitle) => {
    try {
      const response = await removeItem(itemId, itemTitle);
      if (response && response.success !== false) {
        toast.success('Item removed from cart');
      } else {
        toast.error(response?.message || 'Failed to remove item');
      }
    } catch (error) {
      toast.error('Failed to remove item');
    }
  };

  const handleQuantityChange = async (itemId, change, itemTitle) => {
    try {
      const item = cartItems.find(i => (i._id || i.id) === itemId || (itemTitle && i.title === itemTitle));
      if (!item) return;

      const currentCount = item.serviceCount || 1;
      const newCount = currentCount + change;

      if (newCount <= 0) {
        await handleDelete(itemId || item._id || item.id, itemTitle || item.title);
        return;
      }

      const response = await updateItem(itemId || item._id || item.id, newCount);

      if (!response || response.success === false) {
        toast.error(response?.message || 'Failed to update quantity');
      }
    } catch (error) {
      toast.error('Failed to update quantity');
    }
  };

  const handleAddServices = (category) => {
    navigate('/user/services');
  };

  const handleCategoryCheckout = (category) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      toast('Please sign in to proceed with booking', { icon: '🔒' });
      navigate('/user/login', {
        state: {
          from: {
            pathname: '/user/checkout',
            state: { category: category }
          }
        }
      });
      return;
    }
    navigate('/user/checkout', { state: { category: category } });
  };

  // Calculate totals
  const totalPrice = cartItems.reduce((sum, item) => sum + (item.price || 0), 0);
  const totalOriginalPrice = cartItems.reduce((sum, item) => {
    const unitOriginalPrice = item.originalPrice || (item.unitPrice || (item.price / (item.serviceCount || 1)));
    return sum + (unitOriginalPrice * (item.serviceCount || 1));
  }, 0);

  const savings = Math.max(0, totalOriginalPrice - totalPrice);
  const gstAmount = totalPrice > 0 ? Math.round((totalPrice * gstPercentage) / 100) : 0;
  const convenienceFee = totalPrice > 0 ? visitedFee : 0;
  const totalPayable = totalPrice > 0 ? (totalPrice + gstAmount + convenienceFee) : 0;

  return (
    <div className="min-h-screen bg-[var(--background,#F8F9FA)] text-[var(--text-primary,#1F2937)] font-sans antialiased pb-28">
      <div className="relative z-10">
        {/* Sticky Navbar Header */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[var(--border,#E5E7EB)] px-4 py-3 shadow-2xs">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="w-8 h-8 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center transition-colors active:scale-95"
                aria-label="Go back"
              >
                <FiArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                    Your Cart
                  </h1>
                  {cartCount > 0 && (
                    <span className="bg-[#B33A35] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {cartCount} {cartCount === 1 ? 'item' : 'items'}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 font-medium">Zippto Doorstep Booking</span>
              </div>
            </div>
            <NotificationBell />
          </div>
        </header>

        {/* Main Content View */}
        <main className="max-w-4xl mx-auto px-4 pt-5 space-y-5">
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-md p-4 border border-[var(--border,#E5E7EB)] shadow-2xs animate-pulse space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-slate-200 rounded-lg"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-36 bg-slate-200 rounded"></div>
                      <div className="h-3 w-24 bg-slate-200 rounded"></div>
                    </div>
                  </div>
                  <div className="h-10 bg-slate-100 rounded-md"></div>
                </div>
              ))}
            </div>
          ) : cartItems.length === 0 ? (
            /* EMPTY CART STATE */
            <div className="space-y-6">
              <div className="bg-white rounded-md p-8 text-center border border-[var(--border,#E5E7EB)] shadow-2xs space-y-4 relative overflow-hidden">
                <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-tr from-[#B33A35] via-[#D56C67] to-[#9E2E2A] text-white flex items-center justify-center shadow-md">
                  <FiShoppingCart className="w-8 h-8" />
                </div>

                <div className="max-w-sm mx-auto space-y-1.5">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Your Zippto Cart is Empty
                  </h2>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Explore expert electrical repairs, home cleaning, AC servicing, and plumbing packages delivered to your doorstep.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => navigate('/user')}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-[#B33A35] hover:bg-[#9E2E2A] text-white font-semibold text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95"
                  >
                    <HiSparkles className="w-4 h-4 text-amber-200" />
                    <span>Explore All Services</span>
                  </button>
                </div>
              </div>

              {/* QUICK CATEGORY DISCOVERY TILES */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 tracking-tight px-1">
                  Popular Categories to Explore
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {quickCategories.map((cat) => (
                    <div
                      key={cat.id}
                      onClick={() => navigate('/user')}
                      className="bg-white rounded-md p-3 border border-[var(--border,#E5E7EB)] shadow-2xs hover:border-[#B33A35] transition-all cursor-pointer group flex flex-col items-center text-center space-y-2"
                    >
                      <div className="w-full aspect-square rounded-md bg-slate-50 flex items-center justify-center p-2 overflow-hidden">
                        <img
                          src={cat.image}
                          alt={cat.title}
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-900 leading-tight">
                        {cat.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* POPULATED CART STATE */
            <div className="space-y-5">
              {/* Savings Notification Header */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 flex items-center gap-3 text-emerald-800">
                <HiShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="text-xs font-semibold leading-snug">
                  🎉 Instant Technician Dispatch & Verified Service Warranty included with your order!
                </p>
              </div>

              {/* Category Grouped Items */}
              <div className="space-y-4">
                {Object.entries(groupedItems).map(([category, items]) => {
                  const serviceCount = items.reduce((sum, item) => sum + (item.serviceCount || 1), 0);

                  return (
                    <div
                      key={category}
                      className="bg-white rounded-md p-4 border border-[var(--border,#E5E7EB)] shadow-xs space-y-4"
                    >
                      {/* Category Header */}
                      <div className="flex items-center justify-between border-b border-[var(--border,#E5E7EB)] pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-[#B33A35]/10 text-[#B33A35] flex items-center justify-center font-bold text-sm shrink-0">
                            <FiTag className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                              {category}
                            </h3>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {serviceCount} {serviceCount === 1 ? 'service item' : 'service items'}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteCategory(category)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          aria-label="Delete category items"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Line Items */}
                      <div className="space-y-2.5">
                        {items.map((item) => (
                          <div
                            key={item._id || item.id}
                            className="w-full flex items-center gap-3 p-3 rounded-md bg-white border border-[var(--border,#E5E7EB)] shadow-xs"
                          >
                            {/* Item Thumbnail */}
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden shrink-0 border border-[var(--border,#E5E7EB)] bg-slate-50 flex items-center justify-center relative">
                              {item.image || item.icon ? (
                                <>
                                  <img
                                    src={toAssetUrl(item.image || item.icon)}
                                    alt={item.title || 'Service'}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      const fb = e.currentTarget.nextElementSibling;
                                      if (fb) fb.style.display = 'flex';
                                    }}
                                  />
                                  <div
                                    className="w-full h-full items-center justify-center bg-slate-100 text-[#B33A35] font-bold text-sm"
                                    style={{ display: 'none' }}
                                  >
                                    {(item.title || 'S').charAt(0)}
                                  </div>
                                </>
                              ) : (
                                <span className="text-sm font-bold text-[#B33A35]">
                                  {(item.title || 'S').charAt(0)}
                                </span>
                              )}
                            </div>

                            {/* Middle: Title + Category + Price */}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                                {item.title || 'Home Service'}
                              </h4>
                              {item.category && (
                                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                                  {item.category}
                                </p>
                              )}
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs sm:text-sm font-bold text-slate-900">
                                  ₹{(item.price || 0).toLocaleString('en-IN')}
                                </span>
                                {item.originalPrice && item.originalPrice > item.price && (
                                  <span className="text-[11px] text-gray-400 line-through">
                                    ₹{item.originalPrice.toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Right: Quantity Stepper + Delete Icon */}
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center border border-[var(--border,#E5E7EB)] rounded-md overflow-hidden bg-white">
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(item._id || item.id, -1, item.title)}
                                  className="w-6 h-6 hover:bg-gray-100 text-slate-700 flex items-center justify-center font-bold text-xs transition-colors cursor-pointer active:scale-95"
                                  title="Decrease quantity or remove"
                                >
                                  <FiMinus className="w-3 h-3" />
                                </button>
                                <span className="min-w-[20px] text-center text-xs font-semibold text-slate-900 px-1">
                                  {item.serviceCount || 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(item._id || item.id, 1, item.title)}
                                  className="w-6 h-6 hover:bg-gray-100 text-slate-700 flex items-center justify-center font-bold text-xs transition-colors cursor-pointer active:scale-95"
                                  title="Increase quantity"
                                >
                                  <FiPlus className="w-3 h-3" />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDelete(item._id || item.id, item.title)}
                                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer active:scale-95"
                                title="Remove item"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Category Action Footer */}
                      <div className="flex gap-2.5 pt-1">
                        <button
                          onClick={() => handleAddServices(category)}
                          className="flex-1 py-2 px-3 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors"
                        >
                          Add More
                        </button>
                        <button
                          onClick={() => handleCategoryCheckout(category)}
                          className="flex-1 py-2 px-3 rounded-md bg-[#B33A35] hover:bg-[#9E2E2A] text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-colors active:scale-95"
                        >
                          <span>Checkout ({category})</span>
                          <FiArrowRight className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* BILL SUMMARY */}
              <div className="bg-white rounded-md p-4 border border-[var(--border,#E5E7EB)] shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--border,#E5E7EB)] pb-2.5">
                  <h3 className="text-sm font-bold text-slate-900">
                    Payment Summary
                  </h3>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Prices include taxes & fees
                  </span>
                </div>

                <div className="space-y-2 text-xs font-medium text-slate-600">
                  <div className="flex justify-between">
                    <span>Item Total</span>
                    <span className="text-slate-900 font-bold">₹{totalPrice.toLocaleString('en-IN')}</span>
                  </div>

                  {savings > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Discount Savings</span>
                      <span>-₹{savings.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  {gstAmount > 0 && (
                    <div className="flex justify-between">
                      <span>GST ({gstPercentage}%)</span>
                      <span className="text-slate-800 font-medium">₹{gstAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  {convenienceFee > 0 && (
                    <div className="flex justify-between">
                      <span>Convenience Fee</span>
                      <span className="text-slate-800 font-medium">₹{convenienceFee.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  <div className="border-t border-[var(--border,#E5E7EB)] pt-2.5 flex justify-between text-sm font-bold text-slate-900">
                    <span>Total Amount</span>
                    <span className="text-[#B33A35] text-base font-extrabold">₹{totalPayable.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Cart;
