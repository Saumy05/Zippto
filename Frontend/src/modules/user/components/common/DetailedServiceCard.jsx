import React, { memo } from 'react';
import { AiFillStar } from 'react-icons/ai';
import { optimizeCloudinaryUrl } from '../../../../utils/cloudinaryOptimize';

const DetailedServiceCard = memo(({ image, title, rating, reviews, price, originalPrice, discount, onClick, onAddClick }) => {
  // Format price
  const formatPrice = (p) => {
    if (!p) return null;
    const clean = p.toString().replace(/[^0-9]/g, '');
    return new Intl.NumberFormat('en-IN').format(clean);
  };

  const displayPrice = formatPrice(price);
  const displayOriginalPrice = formatPrice(originalPrice);

  return (
    <div
      className="w-[110px] md:w-[calc((100%-4rem)/5)] shrink-0 flex flex-col bg-white rounded-md overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-md border border-[#E5E7EB]"
      style={{
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      }}
      onClick={onClick}
    >
      <div className="relative w-full aspect-square overflow-hidden bg-gray-50">
        {discount && (
          <div
            className="absolute top-1.5 left-1.5 bg-[#B33A35] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-sm shadow-xs z-10"
          >
            {discount.toString().toUpperCase().includes('OFF') ? discount : `${discount}% OFF`}
          </div>
        )}
        {image ? (
          <img
            src={optimizeCloudinaryUrl(image, { width: 300, quality: 'auto' })}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <span className="text-[10px] text-gray-400 font-medium">No Image</span>
          </div>
        )}
      </div>

      <div className="p-2 flex flex-col flex-1">
        <h3 className="text-[11px] font-semibold text-gray-900 leading-snug mb-1 line-clamp-2 min-h-[30px]">{title}</h3>

        <div className="flex items-center gap-0.5 mb-1.5">
          <AiFillStar className="w-3 h-3 text-[#F59E0B]" />
          <span className="text-[10px] text-gray-900 font-bold">
            {Number(rating) > 0 ? Number(rating).toFixed(1) : (rating || 'New')}
          </span>
          {reviews && reviews !== '0' && reviews !== 0 && (
            <span className="text-[9px] text-gray-400">
              ({typeof reviews === 'number' ? `${reviews}` : reviews})
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-1 mt-auto pt-1">
          <div className="flex flex-col">
            {displayOriginalPrice && (
              <span className="text-[9px] text-gray-400 line-through leading-none">₹{displayOriginalPrice}</span>
            )}
            <span className="text-[12px] font-bold text-gray-900 leading-tight">₹{displayPrice}</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddClick?.();
            }}
            className="text-[9.5px] font-bold px-2 py-0.5 rounded-sm border border-[#B33A35]/30 text-[#B33A35] hover:bg-[#B33A35] hover:text-white active:scale-95 transition-all"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
});

DetailedServiceCard.displayName = 'DetailedServiceCard';

export default DetailedServiceCard;
