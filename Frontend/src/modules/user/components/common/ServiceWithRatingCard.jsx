import React, { memo } from 'react';
import { AiFillStar } from 'react-icons/ai';

const ServiceWithRatingCard = memo(({ image, title, rating, reviews, price, originalPrice, discount, onClick, onAddClick }) => {
  return (
    <div
      className="w-[130px] xs:w-[140px] sm:w-[160px] md:w-[230px] shrink-0 bg-white rounded-md overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-md border border-[#E5E7EB] p-2.5 flex flex-col justify-between group"
      style={{
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
      }}
      onClick={onClick}
    >
      <div>
        <div className="relative w-full aspect-[4/3] rounded-md overflow-hidden bg-gray-50 mb-2">
          {discount && (
            <div
              className="absolute top-1.5 left-1.5 bg-[#B33A35] text-white text-[8.5px] font-bold px-1.5 py-0.2 rounded-sm shadow-xs z-10"
            >
              {discount} OFF
            </div>
          )}
          {image ? (
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <span className="text-gray-300 text-xs">No image</span>
            </div>
          )}
        </div>

        <h3 className="text-xs sm:text-[13px] font-semibold text-gray-900 leading-snug mb-1 line-clamp-2 min-h-[32px] font-heading">{title}</h3>

        {rating && (
          <div className="flex items-center gap-1 mb-2">
            <AiFillStar className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span className="text-xs text-gray-900 font-bold">
              {Number(rating) > 0 ? Number(rating).toFixed(1) : rating}
            </span>
            {reviews && reviews !== '0' && reviews !== 0 && (
              <span className="text-[10px] text-gray-400">
                ({typeof reviews === 'number' ? `${reviews}` : reviews})
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="text-xs sm:text-sm font-bold text-gray-900">
              {price && !isNaN(price.toString().replace(/[,]/g, '')) ? `₹${price}` : (price || 'Custom')}
            </span>
            {originalPrice && (
              <span className="text-[10px] text-gray-400 line-through">₹{originalPrice}</span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddClick?.();
          }}
          className="px-3 py-1 rounded-md text-xs font-bold transition-all active:scale-95 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
        >
          Add
        </button>
      </div>
    </div>
  );
});

ServiceWithRatingCard.displayName = 'ServiceWithRatingCard';

export default ServiceWithRatingCard;
