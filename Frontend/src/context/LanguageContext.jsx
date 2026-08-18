import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Default Curated Indian Regional Languages + English
export const DEFAULT_SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', isEnabled: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', isEnabled: true },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳', isEnabled: true },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳', isEnabled: true },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳', isEnabled: true },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', isEnabled: true },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳', isEnabled: true },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳', isEnabled: true },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳', isEnabled: true },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳', isEnabled: true },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ಿଆ', flag: '🇮🇳', isEnabled: true },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', flag: '🇮🇳', isEnabled: true },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇮🇳', isEnabled: true }
];

export const SUPPORTED_LANGUAGES = DEFAULT_SUPPORTED_LANGUAGES;

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [currentLang, setCurrentLang] = useState(() => {
    return localStorage.getItem('zippto_language') || 'en';
  });
  const [languagesList, setLanguagesList] = useState(DEFAULT_SUPPORTED_LANGUAGES);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch dynamic languages from Admin settings / Backend API
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
        const res = await fetch(`${base}/public/config`);
        const data = await res.json();
        if (data.success && Array.isArray(data.settings?.supportedLanguages) && data.settings.supportedLanguages.length > 0) {
          setLanguagesList(data.settings.supportedLanguages.filter(l => l.isEnabled !== false));
        }
      } catch (err) {
        // Fallback to defaults
      }
    };
    fetchLanguages();
  }, []);

  // Helper to set Google Translate cookies across all hostnames and root paths
  const applyGoogleTranslateCookie = (langCode) => {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

    if (langCode === 'en') {
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      if (!isLocal) {
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${hostname}; path=/;`;
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=.${hostname}; path=/;`;
      }
    } else {
      document.cookie = `googtrans=/en/${langCode}; path=/;`;
      document.cookie = `googtrans=/auto/${langCode}; path=/;`;
      if (!isLocal) {
        document.cookie = `googtrans=/en/${langCode}; domain=${hostname}; path=/;`;
        document.cookie = `googtrans=/auto/${langCode}; domain=${hostname}; path=/;`;
        document.cookie = `googtrans=/en/${langCode}; domain=.${hostname}; path=/;`;
      }
    }
  };

  // Sync Google Maps & Google Translate Engine
  useEffect(() => {
    localStorage.setItem('zippto_language', currentLang);
    document.documentElement.lang = currentLang;
    document.documentElement.dir = 'ltr';
    applyGoogleTranslateCookie(currentLang);

    // Dispatch global event so Google Maps or dynamic components re-render with new language
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: currentLang } }));
  }, [currentLang]);

  const changeLanguage = useCallback((langCode) => {
    setCurrentLang(langCode);
    setIsModalOpen(false);
    applyGoogleTranslateCookie(langCode);

    // Trigger Google Translate engine if available
    const selectEl = document.querySelector('.goog-te-combo');
    if (selectEl) {
      selectEl.value = langCode;
      selectEl.dispatchEvent(new Event('change'));
    }

    // Smooth reload to ensure 100% of DOM nodes and Google Maps re-render cleanly
    window.location.reload();
  }, []);

  // Safe fallback helper
  const t = useCallback((key, fallback = '') => fallback || key, []);

  return (
    <LanguageContext.Provider value={{
      currentLang,
      changeLanguage,
      t,
      isModalOpen,
      openLanguageModal: () => setIsModalOpen(true),
      closeLanguageModal: () => setIsModalOpen(false),
      supportedLanguages: languagesList
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
