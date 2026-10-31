import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiLogOut, FiX } from 'react-icons/fi';

const LogoutConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  title = 'Log Out?',
  message = 'Are you sure you want to log out of your account? You will need to sign in again to access your bookings and data.',
  confirmLabel = 'Yes, Log Out',
  cancelLabel = 'Cancel'
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!isLoading ? onClose : undefined}
            className="absolute inset-0 bg-slate-950/65 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 360 }}
            className="bg-white rounded-[28px] shadow-2xl max-w-sm w-full p-6 sm:p-7 relative z-10 overflow-hidden border border-slate-100"
          >
            {/* Close Button */}
            {!isLoading && (
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200/80 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <FiX className="w-4 h-4" />
              </button>
            )}

            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-4 text-rose-600 shadow-xs">
              <FiLogOut className="w-7 h-7 ml-0.5" />
            </div>

            {/* Title & Description */}
            <div className="text-center mb-6">
              <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">
                {title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">
                {message}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-slate-700 bg-slate-100 hover:bg-slate-200/80 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-rose-600 hover:bg-rose-700 active:scale-98 shadow-md shadow-rose-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <FiLogOut className="w-4 h-4" />
                    <span>{confirmLabel}</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LogoutConfirmModal;

