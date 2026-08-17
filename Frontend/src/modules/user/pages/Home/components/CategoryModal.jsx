import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { FiX, FiLayers, FiArrowLeft, FiPlus, FiCheck } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';
import { themeColors } from '../../../../../theme';
import { publicCatalogService } from '../../../../../services/catalogService';
import { useCart } from '../../../../../context/CartContext';
import { toast } from 'react-hot-toast';

const toAssetUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
    const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001').replace(/\/api\/?$/, '');
    return `${base}/${url.replace(/^\/+/, '')}`;
  }
  return url;
};

const CategoryModal = React.memo(({ isOpen, onClose, category, location, cartCount, currentCity }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [isClosing, setIsClosing] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const [view, setView] = useState('brands'); // 'brands' | 'services'
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [services, setServices] = useState([]); // Sub-services
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const cityId = currentCity?._id || currentCity?.id;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setIsClosing(false);
      // Reset state on close
      setTimeout(() => {
        setView('brands');
        setSelectedBrand(null);
        setBrands([]);
        setServices([]);
        setIsRedirecting(false);
      }, 300);
    } else if (category?.id) {
      if (category.initialBrand) {
        // Direct to brand services if initialBrand is provided (from search)
        const brand = category.initialBrand;
        setSelectedBrand(brand);
        setView('services');
        fetchServices(brand.id || brand._id);
      }
      // Always fetch brands for this category to populate the background/back-navigation
      fetchBrands();
    }
  }, [isOpen, category?.id, cityId]);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const response = await publicCatalogService.getBrands({
        categoryId: category.id,
        cityId: cityId
      });
      if (response.success) {
        setBrands(response.brands || []);
      }
    } catch (error) {
      console.error("Failed to load brands:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async (brandId) => {
    try {
      setLoading(true);
      const response = await publicCatalogService.getServices({
        brandId: brandId,
        cityId: cityId,
        categoryId: category?.id
      });
      if (response.success) {
        setServices(response.services || []);
      }
    } catch (error) {
      console.error("Failed to load services:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBrandClick = (brand) => {
    setSelectedBrand(brand);
    setView('services');
    fetchServices(brand.id || brand._id);
  };

  const handleBackToBrands = () => {
    setView('brands');
    setSelectedBrand(null);
    setServices([]);
  };

  const handleServiceClick = async (service) => {
    // Add to cart logic
    try {
      const cartItemData = {
        serviceId: service.id || service._id,
        categoryId: category?.id,
        title: service.title,
        description: service.description || '',
        icon: toAssetUrl(service.icon || ''),
        category: category?.title,
        categoryTitle: category?.title || '', // Explicit field
        categoryIcon: toAssetUrl(category?.homeIconUrl || category?.iconUrl || ''), // Explicit field
        // Brand info — stored as sectionTitle/sectionIcon for booking flow
        sectionId: selectedBrand?.id || selectedBrand?._id || null, // VITAL: Added for plan benefits
        sectionTitle: selectedBrand?.title || '',
        sectionIcon: toAssetUrl(selectedBrand?.iconUrl || selectedBrand?.icon || ''),
        price: service.discountPrice || service.basePrice,
        originalPrice: service.discountPrice ? service.basePrice : null,
        unitPrice: service.discountPrice || service.basePrice,
        serviceCount: 1,
        rating: "4.8",
        reviews: "1k+",
        vendorId: service.vendorId || selectedBrand?.vendorId || null,
        card: {
          title: service.title,
          subtitle: service.description || '',
          price: service.discountPrice || service.basePrice,
          originalPrice: service.discountPrice ? service.basePrice : null,
          duration: service.duration || '',
          description: service.description || '',
          imageUrl: toAssetUrl(service.icon || ''),
          features: service.features || []
        }
      };

      const response = await addToCart(cartItemData);
      if (response.success) {
        setIsRedirecting(true);
        setTimeout(() => {
          navigate('/user/cart');
        }, 1200);
      } else {
        toast.error(response.message || 'Failed to add to cart');
      }
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  if (!isOpen && !isClosing) return null;
  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop (Blocks background touch scroll) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] touch-none"
            onClick={onClose}
            onTouchMove={(e) => e.preventDefault()}
          />

          {/* Bottom Sheet Modal Container (Full Edge-to-Edge Sheet Overlay) */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-[9999] w-full bg-white rounded-t-[32px] max-h-[85vh] sm:max-h-[90vh] overflow-y-auto overscroll-y-contain shadow-2xl border-t border-gray-100"
            style={{
              willChange: 'transform',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            {/* Top Handle Pill */}
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 mb-1"></div>

            {isRedirecting ? (
              <div className="flex flex-col items-center justify-center min-h-[35vh] py-12">
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6"
                >
                  <FiCheck className="w-10 h-10 text-green-500" />
                </motion.div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Service Added!</h3>
                <p className="text-gray-500 text-sm">Proceeding to checkout...</p>
              </div>
            ) : (
              <div>
                {/* Header Bar */}
                <div className="sticky top-0 bg-white/95 backdrop-blur-md z-10 px-5 pt-2 pb-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {view === 'services' && (
                      <button
                        onClick={handleBackToBrands}
                        className="p-1.5 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"
                      >
                        <FiArrowLeft className="w-6 h-6" />
                      </button>
                    )}
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                        {view === 'brands' ? (category?.title || 'Categories') : (selectedBrand?.title || 'Services')}
                      </h2>
                      {view === 'services' && <p className="text-xs text-gray-500 font-medium">Select a service to add</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {loading && <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>}
                    <button
                      onClick={onClose}
                      className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
                      aria-label="Close"
                    >
                      <FiX className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Content Body */}
                <div className="px-5 py-6">
                  {loading && (view === 'brands' ? brands.length === 0 : services.length === 0) ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-6 animate-pulse">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="flex flex-col items-center">
                          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-200 rounded-full mb-3"></div>
                          <div className="h-3 w-16 bg-gray-200 rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {view === 'brands' ? (
                        // Brands / Subcategories Grid (Matching Screenshot 2 - Circular Avatars)
                        brands.length > 0 ? (
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-y-7 gap-x-4">
                            {brands.map((brand) => (
                              <div
                                key={brand.id || brand._id}
                                onClick={() => handleBrandClick(brand)}
                                className="flex flex-col items-center cursor-pointer group active:scale-95 transition-transform"
                              >
                                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-50 flex items-center justify-center shadow-sm overflow-hidden border border-gray-100 group-hover:shadow-md transition-all relative">
                                  {brand.icon ? (
                                    <img
                                      src={toAssetUrl(brand.icon)}
                                      alt={brand.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <FiLayers className="w-8 h-8 text-gray-300" />
                                  )}
                                  {brand.badge && (
                                    <span className="absolute bottom-1 bg-purple-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                      {brand.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-semibold text-gray-800 text-center mt-2.5 leading-tight line-clamp-2 px-1">
                                  {brand.title}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-gray-500">
                            <p className="text-sm font-medium">No subcategories found in this category.</p>
                          </div>
                        )
                      ) : (
                        // Services List
                        services.length > 0 ? (
                          <div className="space-y-4">
                            {services.map((svc) => (
                              <div key={svc.id || svc._id} className="flex justify-between items-center p-4 border border-gray-100 rounded-2xl hover:shadow-md transition-shadow bg-gray-50/50">
                                <div className="flex-1 pr-4">
                                  <h3 className="font-bold text-gray-900 text-base leading-snug mb-1">{svc.title}</h3>
                                  <p className="text-xs text-gray-500 line-clamp-2 mb-2">{svc.description}</p>
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg font-black text-emerald-600">₹{svc.discountPrice || svc.basePrice}</span>
                                    {svc.discountPrice && svc.discountPrice < svc.basePrice && (
                                      <span className="text-xs text-gray-400 line-through font-bold opacity-60">₹{svc.basePrice}</span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleServiceClick(svc)}
                                  className="px-5 py-2.5 bg-green-50 text-green-700 rounded-xl text-sm font-bold flex items-center gap-1.5 hover:bg-green-100 active:scale-95 transition-all shadow-sm"
                                >
                                  <FiPlus className="w-4 h-4" /> Add
                                </button>
                              </div>
                            ))}

                            {/* Bottom Disclaimer */}
                            <div className="mt-8 pt-4 border-t border-gray-100 flex items-start gap-3 bg-gray-50 p-4 rounded-2xl">
                              <div className="mt-0.5 text-gray-400">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <p className="text-xs text-rose-500 font-medium italic leading-snug">
                                * Base price only, additional charges may be applicable after service inspection
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-12 text-gray-500">
                            <p className="text-sm font-medium">No services available for this option yet.</p>
                          </div>
                        )
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
});

CategoryModal.displayName = 'CategoryModal';
export default CategoryModal;
