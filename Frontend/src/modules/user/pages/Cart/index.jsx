import React, { useMemo } from 'react';
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
import NotificationBell from '../../components/common/NotificationBell';

const Cart = () => {
  const navigate = useNavigate();
  const { cartItems, isLoading: loading, removeItem, removeCategoryItems, updateItem } = useCart();

  // Popular category quick shortcuts for empty cart state
  const quickCategories = [
    { id: 'electrician', title: 'Electrician & Plumbing', image: '/cat_electrician_plumber.png' },
    { id: 'cleaning', title: 'Deep Cleaning', image: '/cat_cleaning.png' },
    { id: 'ac-repair', title: 'AC Service & Repair', image: '/ac_foam_jet_service.png' },
    { id: 'appliance', title: 'Appliance Repair', image: '/ac_repair_wall.png' },
  ];

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups = {};
    cartItems.forEach(item => {
      const category = item.category || 'Home Services';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });
    return groups;
  }, [cartItems]);

  const cartCount = cartItems.length;

  const handleBack = () => {
    navigate(-1);
  };

  const handleDeleteCategory = async (category) => {
    try {
      const response = await removeCategoryItems(category);
      if (response.success) {
        toast.success('Category items removed');
      } else {
        toast.error(response.message || 'Failed to remove category items');
      }
    } catch (error) {
      toast.error('Failed to remove category items');
    }
  };

  const handleDelete = async (itemId) => {
    try {
      const response = await removeItem(itemId);
      if (response.success) {
        toast.success('Item removed from cart');
      } else {
        toast.error(response.message || 'Failed to remove item');
      }
    } catch (error) {
      toast.error('Failed to remove item');
    }
  };

  const handleQuantityChange = async (itemId, change) => {
    try {
      const item = cartItems.find(i => (i._id || i.id) === itemId);
      if (!item) return;

      const newCount = Math.max(1, (item.serviceCount || 1) + change);
      const response = await updateItem(itemId, newCount);

      if (!response.success) {
        toast.error(response.message || 'Failed to update quantity');
      }
    } catch (error) {
      toast.error('Failed to update quantity');
    }
  };

  const handleAddServices = (category) => {
    navigate('/user');
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] font-sans antialiased pb-28">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -ml-20" />
      </div>

      <div className="relative z-10">
        {/* Sticky Navbar Header */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-3.5 shadow-2xs">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 flex items-center justify-center transition-colors active:scale-95"
                aria-label="Go back"
              >
                <FiArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none">
                    Your Cart
                  </h1>
                  {cartCount > 0 && (
                    <span className="bg-[#0B132B] text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs">
                      {cartCount} {cartCount === 1 ? 'item' : 'items'}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 font-semibold">Zippto Doorstep Booking</span>
              </div>
            </div>
            <NotificationBell />
          </div>
        </header>

        {/* Main Content View */}
        <main className="max-w-4xl mx-auto px-4 pt-5 space-y-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs animate-pulse space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-slate-200 rounded-2xl"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-36 bg-slate-200 rounded"></div>
                      <div className="h-3 w-24 bg-slate-200 rounded"></div>
                    </div>
                  </div>
                  <div className="h-12 bg-slate-100 rounded-2xl"></div>
                </div>
              ))}
            </div>
          ) : cartItems.length === 0 ? (
            /* EMPTY CART STATE */
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 shadow-2xs space-y-4 relative overflow-hidden">
                {/* Decorative Amber Glow */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-[#0B132B] via-[#1C2541] to-[#0B132B] text-amber-400 flex items-center justify-center shadow-lg border border-slate-800">
                  <FiShoppingCart className="w-10 h-10" />
                </div>

                <div className="max-w-sm mx-auto space-y-1.5">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Your Zippto Cart is Empty
                  </h2>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Explore expert electrical repairs, home cleaning, AC servicing, and Plumbing packages delivered to your doorstep.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => navigate('/user')}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#0B132B] hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all"
                  >
                    <HiSparkles className="w-4 h-4 text-amber-400" />
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
                      className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs hover:border-slate-400 hover:shadow-xs transition-all cursor-pointer group flex flex-col items-center text-center space-y-2"
                    >
                      <div className="w-full aspect-square rounded-xl bg-slate-50 flex items-center justify-center p-2 overflow-hidden">
                        <img
                          src={cat.image}
                          alt={cat.title}
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-900 leading-tight">
                        {cat.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* POPULATED CART STATE */
            <div className="space-y-6">
              {/* Savings Notification Header */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3.5 flex items-center gap-3 text-emerald-800">
                <HiShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="text-xs font-bold leading-snug">
                  🎉 Instant Technician Dispatch & Verified Service Warranty included with your order!
                </p>
              </div>

              {/* Category Grouped Items */}
              <div className="space-y-4">
                {Object.entries(groupedItems).map(([category, items]) => {
                  const categoryTotal = items.reduce((sum, item) => sum + (item.price || 0), 0);
                  const serviceCount = items.reduce((sum, item) => sum + (item.serviceCount || 1), 0);

                  return (
                    <div
                      key={category}
                      className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-4"
                    >
                      {/* Category Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#0B132B] text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
                            <FiTag className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                              {category}
                            </h3>
                            <p className="text-[11px] text-slate-500 font-semibold">
                              {serviceCount} {serviceCount === 1 ? 'service item' : 'service items'}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteCategory(category)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          aria-label="Delete category items"
                        >
                          <FiTrash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>

                      {/* Line Items */}
                      <div className="space-y-3">
                        {items.map((item) => (
                          <div
                            key={item._id || item.id}
                            className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100"
                          >
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                {item.title}
                              </h4>
                              <p className="text-[11px] font-extrabold text-slate-900 mt-0.5">
                                ₹{(item.price || 0).toLocaleString('en-IN')}
                              </p>
                            </div>

                            {/* Quantity Stepper */}
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                                <button
                                  onClick={() => handleQuantityChange(item._id || item.id, -1)}
                                  className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold transition-colors"
                                >
                                  <FiMinus className="w-3 h-3" />
                                </button>
                                <span className="text-xs font-black text-slate-900 px-1 min-w-[16px] text-center">
                                  {item.serviceCount || 1}
                                </span>
                                <button
                                  onClick={() => handleQuantityChange(item._id || item.id, 1)}
                                  className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold transition-colors"
                                >
                                  <FiPlus className="w-3 h-3" />
                                </button>
                              </div>

                              <button
                                onClick={() => handleDelete(item._id || item.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
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
                          className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs transition-colors"
                        >
                          Add More
                        </button>
                        <button
                          onClick={() => handleCategoryCheckout(category)}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-[#0B132B] hover:bg-slate-800 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <span>Checkout ({category})</span>
                          <FiArrowRight className="w-3.5 h-3.5 text-amber-400" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* BILL SUMMARY */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs space-y-3">
                <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2.5">
                  Payment Summary
                </h3>

                <div className="space-y-2 text-xs font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span>Item Total</span>
                    <span className="text-slate-900">₹{totalPrice.toLocaleString('en-IN')}</span>
                  </div>

                  {savings > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Discount Savings</span>
                      <span>-₹{savings.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>Taxes & Safety Fee</span>
                    <span className="text-emerald-600 font-bold">FREE</span>
                  </div>

                  <div className="border-t border-slate-100 pt-2.5 flex justify-between text-sm font-black text-slate-900">
                    <span>Total Amount</span>
                    <span className="text-slate-900 text-base">₹{totalPrice.toLocaleString('en-IN')}</span>
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
