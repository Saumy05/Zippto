import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Comprehensive translations for English, Hindi, Marathi, Gujarati, Tamil, Telugu, Bengali, Kannada
const TRANSLATIONS = {
  en: {
    // General & Navigation
    'app_name': 'Zippto',
    'home': 'Home',
    'jobs': 'Jobs',
    'wallet': 'Wallet',
    'profile': 'Profile',
    'bookings': 'Bookings',
    'cart': 'Cart',
    'account': 'Account',
    'settings': 'Settings',
    'notifications': 'Notifications',
    'ratings': 'Ratings',
    'help_support': 'Help & Support',
    'logout': 'Logout',
    'search_services': 'Search services, repairs...',
    'select_language': 'Select Language',
    'language': 'Language',

    // Vendor Operations & Actions
    'accept_job': 'Accept Job',
    'decline': 'Decline',
    'start_journey': 'Start Journey',
    'arrived': "Arrived (At customer's site)",
    'work_done': 'Work Done',
    'complete_work': 'Complete Work',
    'proceed_to_billing': 'Proceed to Billing',
    'manage_services': 'Manage Services',
    'wallet_payouts': 'Wallet & Payouts',
    'job_completed_settled': 'Job Completed & Settled',
    'daily_net_revenue': 'Daily Net Revenue',
    'urgent': 'Urgent',
    'instant_booking': 'Instant Booking',
    'new_booking_request': 'New Booking Request',
    'enter_visit_otp': 'Enter Customer Visit OTP',
    'verify_visit': 'Verify Visit OTP',
    'proof_of_work': 'Work Photos (Mandatory)',
    'final_step': 'Final Step',
    'service_radius': 'Service Radius',
    'active_jobs': 'Active Jobs',
    'pending_alerts': 'Pending Alerts',
    'today_earnings': "Today's Earnings",
    'completed_jobs': 'Completed Jobs',

    // Customer Booking & Tracking
    'book_now': 'Book Now',
    'schedule_service': 'Schedule Service',
    'view_cart': 'View Cart',
    'checkout': 'Checkout',
    'select_slot': 'Select Date & Time',
    'live_tracking': 'Live Tracking',
    'waiting_for_arrival': 'Waiting for arrival',
    'start_code': 'Start Code',
    'final_payment': 'Final Payment',
    'pay_online_now': 'Pay Online Now',
    'payment_received': 'Payment Received',
    'cash_on_service': 'Cash on Service',
    'rate_service': 'Rate Your Experience',
    'verified_partner': 'Verified Partner',
    'service_partner': 'Service Partner',
    'my_bookings': 'My Bookings',
    'booking_confirmed': 'Booking Confirmed',

    // Service Categories
    'cat_ac_repair': 'AC Repair & Service',
    'cat_cleaning': 'Home Cleaning',
    'cat_plumbing': 'Plumbing Services',
    'cat_electrician': 'Electrician Services',
    'cat_salon': 'Salon at Home',
    'cat_painting': 'Painting & Waterproofing',
    'cat_pest_control': 'Pest Control',
    'cat_car_wash': 'Car Wash & Detailing',
    'cat_appliance': 'Appliance Repair',
    'cat_carpenter': 'Carpenter Services',
    'cat_laundry': 'Laundry & Dry Clean',
    'cat_beauty': 'Beauty & Spa',

    // Booking Statuses
    'status_requested': 'Requested',
    'status_searching': 'Searching Partner',
    'status_confirmed': 'Confirmed',
    'status_assigned': 'Partner Assigned',
    'status_journey_started': 'On the Way',
    'status_visited': 'Service in Progress',
    'status_work_done': 'Awaiting Payment',
    'status_completed': 'Completed',
    'status_cancelled': 'Cancelled'
  },

  hi: {
    // General & Navigation
    'app_name': 'ज़िप्टो (Zippto)',
    'home': 'होम',
    'jobs': 'कार्य (Jobs)',
    'wallet': 'वॉलेट',
    'profile': 'प्रोफ़ाइल',
    'bookings': 'बुकिंग्स',
    'cart': 'कार्ट',
    'account': 'अकाउंट',
    'settings': 'सेटिंग्स',
    'notifications': 'सूचनाएं',
    'ratings': 'रेटिंग और समीक्षाएं',
    'help_support': 'सहायता और सपोर्ट',
    'logout': 'लॉग आउट',
    'search_services': 'सेवाएं, रिपेयर खोजें...',
    'select_language': 'भाषा चुनें (Select Language)',
    'language': 'भाषा (Language)',

    // Vendor Operations & Actions
    'accept_job': 'जॉब स्वीकार करें',
    'decline': 'अस्वीकार करें',
    'start_journey': 'यात्रा शुरू करें',
    'arrived': 'पहुँच गए (ग्राहक के पते पर)',
    'work_done': 'काम पूरा हुआ',
    'complete_work': 'काम पूरा करें',
    'proceed_to_billing': 'बिलिंग के लिए आगे बढ़ें',
    'manage_services': 'सेवाएं प्रबंधित करें',
    'wallet_payouts': 'वॉलेट और पेआउट',
    'job_completed_settled': 'काम पूरा और भुगतान संपन्न',
    'daily_net_revenue': 'दैनिक शुद्ध आय',
    'urgent': 'अति आवश्यक',
    'instant_booking': 'तत्काल बुकिंग',
    'new_booking_request': 'नई बुकिंग का अनुरोध',
    'enter_visit_otp': 'ग्राहक का विज़िट OTP दर्ज करें',
    'verify_visit': 'विज़िट OTP सत्यापित करें',
    'proof_of_work': 'कार्य की तस्वीरें (अनिवार्य)',
    'final_step': 'अंतिम चरण',
    'service_radius': 'सेवा दूरी (Radius)',
    'active_jobs': 'सक्रिय कार्य',
    'pending_alerts': 'लंबित अलर्ट',
    'today_earnings': 'आज की कमाई',
    'completed_jobs': 'पूर्ण किए गए कार्य',

    // Customer Booking & Tracking
    'book_now': 'अभी बुक करें',
    'schedule_service': 'सेवा शेड्यूल करें',
    'view_cart': 'कार्ट देखें',
    'checkout': 'चेकआउट करें',
    'select_slot': 'दिनांक और समय चुनें',
    'live_tracking': 'लाइव ट्रैकिंग',
    'waiting_for_arrival': 'आगमन की प्रतीक्षा',
    'start_code': 'स्टार्ट कोड (OTP)',
    'final_payment': 'अंतिम भुगतान',
    'pay_online_now': 'अभी ऑनलाइन भुगतान करें',
    'payment_received': 'भुगतान प्राप्त हुआ',
    'cash_on_service': 'सेवा उपरांत नकद',
    'rate_service': 'अपने अनुभव को रेट करें',
    'verified_partner': 'सत्यापित पार्टनर',
    'service_partner': 'सेवा साथी (Service Partner)',
    'my_bookings': 'मेरी बुकिंग्स',
    'booking_confirmed': 'बुकिंग की पुष्टि हो गई',

    // Service Categories
    'cat_ac_repair': 'एसी मरम्मत और सर्विस',
    'cat_cleaning': 'घर की सफाई',
    'cat_plumbing': 'प्लंबिंग सेवाएं',
    'cat_electrician': 'इलेक्ट्रीशियन सेवाएं',
    'cat_salon': 'घर पर सैलून',
    'cat_painting': 'पेंटिंग और वॉटरप्रूफिंग',
    'cat_pest_control': 'पेस्ट कंट्रोल',
    'cat_car_wash': 'कार वॉश',
    'cat_appliance': 'उपकरण मरम्मत (Appliance)',
    'cat_carpenter': 'बढ़ई (Carpenter) सेवाएं',
    'cat_laundry': 'लॉन्ड्री और ड्राई क्लीन',
    'cat_beauty': 'ब्यूटी और स्पा',

    // Booking Statuses
    'status_requested': 'अनुरोध भेजा गया',
    'status_searching': 'पार्टनर खोज रहे हैं',
    'status_confirmed': 'पुष्टि हो गई',
    'status_assigned': 'पार्टनर नियुक्त',
    'status_journey_started': 'रास्ते में हैं',
    'status_visited': 'कार्य प्रगति पर है',
    'status_work_done': 'भुगतान की प्रतीक्षा',
    'status_completed': 'सफलतापूर्वक पूर्ण',
    'status_cancelled': 'रद्द किया गया'
  },

  mr: {
    // Marathi
    'app_name': 'झिप्टो (Zippto)',
    'home': 'होम',
    'jobs': 'कामे (Jobs)',
    'wallet': 'वॉलेट',
    'profile': 'प्रोफाइल',
    'bookings': 'बुकिंग्ज',
    'cart': 'कार्ट',
    'accept_job': 'काम स्वीकारा',
    'decline': 'नाकारा',
    'start_journey': 'प्रवास सुरू करा',
    'arrived': 'पोहोचलो',
    'work_done': 'काम पूर्ण झाले',
    'pay_online_now': 'आता ऑनलाइन पैसे भरा',
    'book_now': 'आता बुक करा',
    'select_language': 'भाषा निवडा',
    'today_earnings': 'आजची कमाई',
    'job_completed_settled': 'काम पूर्ण आणि सेटल झाले'
  },

  gu: {
    // Gujarati
    'app_name': 'ઝિપ્ટો (Zippto)',
    'home': 'હોમ',
    'jobs': 'કામ (Jobs)',
    'wallet': 'વોલેટ',
    'profile': 'પ્રોફાઇલ',
    'bookings': 'બુકિંગ',
    'cart': 'કાર્ટ',
    'accept_job': 'કામ સ્વીકારો',
    'decline': 'અસ્વીકાર કરો',
    'start_journey': 'પ્રવાસ શરૂ કરો',
    'arrived': 'પહોંચી ગયા',
    'work_done': 'કામ પૂરું થયું',
    'pay_online_now': 'ઓનલાઇન પેમેન્ટ કરો',
    'book_now': 'હમણાં બુક કરો',
    'select_language': 'ભાષા પસંદ કરો',
    'today_earnings': 'આજની કમાણી',
    'job_completed_settled': 'કામ પૂરું અને સેટલ થયું'
  },

  ta: {
    // Tamil
    'app_name': 'ஜிப்டோ (Zippto)',
    'home': 'முகப்பு',
    'jobs': 'பணிகள்',
    'wallet': 'வாலட்',
    'profile': 'சுயவிவரம்',
    'bookings': 'முன்பதிவுகள்',
    'accept_job': 'பணியை ஏற்கவும்',
    'start_journey': 'பயணத்தைத் தொடங்கு',
    'arrived': 'வந்துவிட்டேன்',
    'work_done': 'வேலை முடிந்தது',
    'pay_online_now': 'ஆன்லைனில் பணம் செலுத்துங்கள்',
    'book_now': 'இப்போது புக் செய்யவும்',
    'select_language': 'மொழியைத் தேர்ந்தெடுக்கவும்'
  },

  te: {
    // Telugu
    'app_name': 'జిప్టో (Zippto)',
    'home': 'హోమ్',
    'jobs': 'పనులు',
    'wallet': 'వాలెట్',
    'profile': 'ప్రొఫైల్',
    'bookings': 'బుకింగ్స్',
    'accept_job': 'పనిని అంగీకరించండి',
    'start_journey': 'ప్రయాణం ప్రారంభించండి',
    'arrived': 'చేరుకున్నాను',
    'work_done': 'పని పూర్తయింది',
    'pay_online_now': 'ఆన్‌లైన్‌లో చెల్లించండి',
    'book_now': 'ఇప్పుడే బుక్ చేయండి',
    'select_language': 'భాషను ఎంచుకోండి'
  },

  bn: {
    // Bengali
    'app_name': 'জিপ্টো (Zippto)',
    'home': 'হোম',
    'jobs': 'কাজ',
    'wallet': 'ওয়ালেট',
    'profile': 'প্রোফাইল',
    'bookings': 'বুকিংস',
    'accept_job': 'কাজ গ্রহণ করুন',
    'start_journey': 'যাত্রা শুরু করুন',
    'arrived': 'পৌঁছে গেছি',
    'work_done': 'কাজ সম্পন্ন',
    'pay_online_now': 'অনলাইনে পেমেন্ট করুন',
    'book_now': 'এখনই বুক করুন',
    'select_language': 'ভাষা নির্বাচন করুন'
  },

  kn: {
    // Kannada
    'app_name': 'ಜಿಪ್ಟೋ (Zippto)',
    'home': 'ಮುಖಪುಟ',
    'jobs': 'ಕೆಲಸಗಳು',
    'wallet': 'ವಾಲೆಟ್',
    'profile': 'ಪ್ರೊಫೈಲ್',
    'bookings': 'ಬುಕಿಂಗ್‌ಗಳು',
    'accept_job': 'ಕೆಲಸ ಸ್ವೀಕರಿಸಿ',
    'start_journey': 'ಪ್ರಯಾಣ ಆರಂಭಿಸಿ',
    'arrived': 'ತಲುಪಿದೆ',
    'work_done': 'ಕೆಲಸ ಮುಗಿದಿದೆ',
    'pay_online_now': 'ಆನ್‌ಲೈನ್ ಪಾವತಿಸಿ',
    'book_now': 'ಈಗಲೇ ಬುಕ್ ಮಾಡಿ',
    'select_language': 'ಭಾಷೆ ಆಯ್ಕೆಮಾಡಿ'
  }
};

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' }
];

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [currentLang, setCurrentLang] = useState(() => {
    return localStorage.getItem('zippto_language') || 'en';
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sync Google Maps script parameter and document lang
  useEffect(() => {
    localStorage.setItem('zippto_language', currentLang);
    document.documentElement.lang = currentLang;

    // Dispatch global event so Google Maps or dynamic components re-render with new language
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: currentLang } }));
  }, [currentLang]);

  const changeLanguage = useCallback((langCode) => {
    if (TRANSLATIONS[langCode]) {
      setCurrentLang(langCode);
      setIsModalOpen(false);
    }
  }, []);

  const t = useCallback((key, fallback = '') => {
    const langDict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
    if (langDict[key]) return langDict[key];
    if (TRANSLATIONS.en[key]) return TRANSLATIONS.en[key];
    return fallback || key;
  }, [currentLang]);

  return (
    <LanguageContext.Provider value={{
      currentLang,
      changeLanguage,
      t,
      isModalOpen,
      openLanguageModal: () => setIsModalOpen(true),
      closeLanguageModal: () => setIsModalOpen(false),
      supportedLanguages: SUPPORTED_LANGUAGES
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
