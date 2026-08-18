import React, { useState } from 'react';
import { FiStar, FiMaximize2, FiX, FiImage } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const ReviewCard = ({ booking, onWriteReview }) => {
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Logic to determine if card should be shown
  // Show if status is work_done/completed OR if there is already a rating
  const isCompleted = ['work_done', 'completed', 'COMPLETED'].includes(booking?.status);
  const isPaid = ['success', 'paid', 'collected_by_vendor'].includes(booking?.paymentStatus?.toLowerCase());
  const hasRating = !!booking?.rating;
  const reviewPhotos = booking?.reviewImages || booking?.rating?.images || [];

  if (!hasRating && (!isCompleted || !isPaid)) {
    return null;
  }

  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-lg border-none relative group mb-6">
      {/* Top Accent Gradient */}
      <div className="h-1.5 bg-gradient-to-r from-orange-400 to-orange-600" />

      <div className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500 shadow-inner">
            <FiStar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-900">How was your experience?</h3>
            <p className="text-gray-500 text-sm">Your feedback helps us improve.</p>
          </div>
        </div>

        {!hasRating ? (
          <button
            onClick={onWriteReview}
            className="w-full py-3.5 text-white font-bold rounded-xl shadow-lg shadow-orange-200 active:scale-95 transition-all hover:brightness-105 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #F97316, #EA580C)'
            }}
          >
            Write a Review
          </button>
        ) : (
          <div className="bg-orange-50/80 rounded-2xl p-5 border border-orange-100 text-center">
            <p className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-3">Your Rating</p>
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <FiStar
                  key={star}
                  className={`w-8 h-8 transition-transform hover:scale-110 ${star <= (booking.rating?.rating || booking.rating)
                    ? 'fill-orange-500 text-orange-500 drop-shadow-sm'
                    : 'text-gray-300'
                    }`}
                />
              ))}
            </div>

            {/* Review text */}
            {(booking.rating?.review || booking.review) && (
              <div className="bg-white rounded-xl p-4 shadow-sm relative mb-3">
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 transform"></div>
                <p className="text-gray-700 italic font-medium leading-relaxed">
                  "{booking.rating?.review || booking.review}"
                </p>
              </div>
            )}

            {/* Customer Uploaded Photos Gallery */}
            {reviewPhotos.length > 0 && (
              <div className="mt-4 pt-3 border-t border-orange-200/60">
                <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-orange-700 mb-2">
                  <FiImage className="w-3.5 h-3.5" />
                  <span>Photos Attached ({reviewPhotos.length})</span>
                </div>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {reviewPhotos.map((url, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedPhoto(url)}
                      className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-orange-200 shadow-2xs cursor-pointer group hover:scale-105 transition-transform"
                    >
                      <img src={url} alt={`Review photo ${i + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <FiMaximize2 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Thank You Note */}
            <div className="mt-3 text-xs text-orange-500 font-semibold">
              Thank you for your feedback!
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPhoto(null)}
              className="fixed inset-0 bg-black/85 backdrop-blur-md"
            />
            <div className="relative z-10 max-w-2xl max-h-[85vh]">
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute -top-10 right-0 text-white p-2 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
              >
                <FiX className="w-6 h-6" />
              </button>
              <img
                src={selectedPhoto}
                alt="Enlarged review photo"
                className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl object-contain"
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReviewCard;
