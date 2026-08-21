import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiStar, FiX, FiCheck, FiMessageSquare, FiArrowRight, FiCamera, FiImage, FiTrash2, FiMaximize2 } from 'react-icons/fi';
import { themeColors } from '../../../../theme';
import { uploadToCloudinary } from '../../../../utils/cloudinaryUpload';
import { toast } from 'react-hot-toast';

const RatingModal = ({ isOpen, onClose, onSubmit, bookingName, partnerName }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewLightbox, setPreviewLightbox] = useState(null);
  const fileInputRef = useRef(null);

  const handlePhotoSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (images.length + files.length > 5) {
      toast.error('You can upload a maximum of 5 photos');
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      const uploadedUrls = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image`);
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 10MB limit`);
          continue;
        }

        const url = await uploadToCloudinary(file, 'zippto_reviews', (pct) => {
          const step = Math.round(((i + pct / 100) / files.length) * 100);
          setUploadProgress(step);
        });

        if (url) {
          uploadedUrls.push(url);
        }
      }

      setImages(prev => [...prev, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} photo(s) attached!`);
    } catch (err) {
      console.error('Photo upload error:', err);
      toast.error('Failed to upload one or more photos');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (indexToRemove) => {
    setImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      await onSubmit({ rating, review, reviewImages: images, images });
    } catch (error) {
      console.error('Submit review error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Top Bar (Mobile Drag Handle) */}
          <div className="flex justify-center py-3 sm:hidden">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
          </div>

          <div className="p-6 sm:p-8 overflow-y-auto flex-1">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-black text-gray-900 leading-tight">Rate your experience</h2>
                <p className="text-gray-500 text-sm mt-1">How was the {bookingName} service?</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                disabled={isSubmitting}
              >
                <FiX className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-6">
              {/* Stars Card */}
              <div className="bg-gray-50 rounded-2xl p-6 text-center border border-gray-100 shadow-inner">
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Tap to rate</p>
                <div className="flex justify-center gap-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <motion.button
                      key={star}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHover(star)}
                      onMouseLeave={() => setHover(0)}
                      className="focus:outline-none cursor-pointer"
                    >
                      <FiStar
                        className={`w-10 h-10 transition-colors duration-200 ${star <= (hover || rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                          }`}
                      />
                    </motion.button>
                  ))}
                </div>
                {rating > 0 && (
                  <motion.p
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 text-sm font-bold text-gray-700"
                  >
                    {rating === 5 ? 'Excellent! 🌟' :
                      rating === 4 ? 'Good! 👍' :
                        rating === 3 ? 'Average OK' :
                          rating === 2 ? 'Disappointed' : 'Needs Improvement'}
                  </motion.p>
                )}
              </div>

              {/* Review Textarea */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-700 font-bold text-sm">
                  <FiMessageSquare className="w-4 h-4 text-teal-600" />
                  <span>Share your feedback</span>
                </div>
                <div className="relative group">
                  <textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    placeholder="Tell us what you liked or what could be better..."
                    className="w-full bg-white border-2 border-gray-100 focus:border-teal-500 rounded-2xl p-4 text-sm min-h-[100px] transition-all outline-none resize-none placeholder:text-gray-400"
                    disabled={isSubmitting}
                  />
                  <div className="absolute bottom-3 right-3 text-[10px] font-bold text-gray-300 uppercase letter-spacing-1">
                    {review.length} characters
                  </div>
                </div>
              </div>

              {/* Photo Upload Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-700 font-bold text-sm">
                    <FiCamera className="w-4 h-4 text-teal-600" />
                    <span>Add Photos of Completed Work</span>
                  </div>
                  <span className="text-[11px] text-gray-400 font-semibold">{images.length}/5 photos</span>
                </div>

                {/* Upload Progress */}
                {uploading && (
                  <div className="bg-teal-50 border border-teal-100 rounded-xl p-3">
                    <div className="flex justify-between text-xs font-bold text-teal-700 mb-1.5">
                      <span>Uploading photo(s)...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-teal-200/50 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-teal-600 h-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}

                {/* Thumbnails Grid & Add Button */}
                <div className="flex flex-wrap gap-2.5 items-center">
                  {images.map((imgUrl, index) => (
                    <div key={index} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group bg-gray-50 shadow-2xs">
                      <img src={imgUrl} alt={`Attached ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-red-600 text-white rounded-full transition-colors"
                        title="Remove photo"
                      >
                        <FiX className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewLightbox(imgUrl)}
                        className="absolute bottom-1 right-1 p-1 bg-black/50 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Preview"
                      >
                        <FiMaximize2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}

                  {images.length < 5 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || isSubmitting}
                      className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 hover:border-teal-500 bg-gray-50 hover:bg-teal-50/50 flex flex-col items-center justify-center text-gray-400 hover:text-teal-600 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <FiCamera className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-bold">+ Photo</span>
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={rating === 0 || isSubmitting || uploading}
                className={`w-full py-4 rounded-2xl font-black text-white text-lg flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100 cursor-pointer`}
                style={{ background: rating > 0 ? themeColors.brand.gradient : '#CBD5E1' }}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </div>
                ) : (
                  <>
                    <span>Submit Review</span>
                    <FiArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Decorative Background */}
          <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-teal-50 rounded-full blur-2xl opacity-50 pointer-events-none" />
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-yellow-50 rounded-full blur-2xl opacity-50 pointer-events-none" />
        </motion.div>

        {/* Lightbox Modal */}
        <AnimatePresence>
          {previewLightbox && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setPreviewLightbox(null)}
                className="absolute inset-0 bg-black/85 backdrop-blur-md"
              />
              <div className="relative z-10 max-w-2xl max-h-[85vh]">
                <button
                  onClick={() => setPreviewLightbox(null)}
                  className="absolute -top-10 right-0 text-white p-2 rounded-full hover:bg-white/20"
                >
                  <FiX className="w-6 h-6" />
                </button>
                <img
                  src={previewLightbox}
                  alt="Enlarged review photo"
                  className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl object-contain"
                />
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
};

export default RatingModal;
