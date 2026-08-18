import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheck, FiGlobe } from 'react-icons/fi';
import { useLanguage, SUPPORTED_LANGUAGES } from '../../context/LanguageContext';

export const LanguageSelectorModal = () => {
  const { isModalOpen, closeLanguageModal, currentLang, changeLanguage, supportedLanguages } = useLanguage();

  if (!isModalOpen) return null;

  const languagesList = Array.isArray(supportedLanguages) && supportedLanguages.length > 0
    ? supportedLanguages
    : SUPPORTED_LANGUAGES;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeLanguageModal}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="notranslate relative z-10 w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                <FiGlobe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 leading-tight">Choose Language</h3>
                <p className="text-xs text-gray-500 font-medium">भाषा का चयन करें</p>
              </div>
            </div>
            <button
              onClick={closeLanguageModal}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 active:scale-95 transition-all"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Languages Grid */}
          <div className="grid grid-cols-2 gap-2.5 py-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {languagesList.map((lang) => {
              const isSelected = currentLang === lang.code;

              return (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`p-3.5 rounded-2xl text-left border-2 transition-all active:scale-[0.97] flex items-center justify-between ${
                    isSelected
                      ? 'border-teal-600 bg-teal-50/70 shadow-sm'
                      : 'border-gray-100 hover:border-gray-200 bg-white'
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`text-sm font-extrabold truncate ${isSelected ? 'text-teal-900' : 'text-gray-900'}`}>
                      {lang.nativeName}
                    </p>
                    <p className="text-[11px] text-gray-500 font-medium truncate">
                      {lang.name}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
                      <FiCheck className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Note */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
            <span>Powered by Dynamic Google Engine</span>
            <span className="font-bold text-teal-700">Instant Sync</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export const LanguageToggle = ({ className = '' }) => {
  const { currentLang, openLanguageModal, supportedLanguages } = useLanguage();
  const activeObj = (supportedLanguages && supportedLanguages.find(l => l.code === currentLang)) || { nativeName: 'English', code: 'en' };

  return (
    <button
      onClick={openLanguageModal}
      className={`notranslate inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white border border-gray-200/80 shadow-xs hover:shadow-sm text-xs font-black text-gray-800 active:scale-95 transition-all cursor-pointer backdrop-blur-sm ${className}`}
      title="Change Language"
    >
      <FiGlobe className="w-3.5 h-3.5 text-teal-600" />
      <span>{activeObj.nativeName || 'English'}</span>
    </button>
  );
};

export default LanguageSelectorModal;
