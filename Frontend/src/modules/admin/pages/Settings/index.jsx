import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiSettings, FiGrid, FiDollarSign, FiSave, FiUser, FiMail, FiTrash2, FiPlus, 
  FiUsers, FiShield, FiFileText, FiMapPin, FiPhone, FiHeadphones, FiMessageCircle, 
  FiEdit, FiLock, FiUnlock, FiX, FiGlobe, FiCheck, FiSearch, FiChevronDown, 
  FiGift, FiToggleRight, FiToggleLeft, FiBell, FiBriefcase, FiCreditCard, FiCpu, FiCheckCircle, FiXCircle,
  FiArrowLeft, FiSliders
} from 'react-icons/fi';
import { getSettings, updateSettings, updateAdminProfile, getAdminProfile, getAllAdmins, createAdmin, deleteAdmin, updateAdminDetails, toggleAdminStatus } from '../../services/settingsService';
import { cityService } from '../../services/cityService';
import { DEFAULT_SUPPORTED_LANGUAGES } from '../../../../context/LanguageContext';
import CityManagement from '../Cities';
import { toast } from 'react-hot-toast';

// Exclusively Indian regional languages and scheduled languages
export const PRESET_INDIAN_LANGUAGES = [
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', flag: '🇮🇳' },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली', flag: '🇮🇳' },
  { code: 'gom', name: 'Konkani', nativeName: 'कोंकणी', flag: '🇮🇳' },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي / सिन्धी', flag: '🇮🇳' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', flag: '🇳🇵' },
  { code: 'ks', name: 'Kashmiri', nativeName: 'کٲشُر / कश्मीरी', flag: '🇮🇳' },
  { code: 'doi', name: 'Dogri', nativeName: 'डोगरी', flag: '🇮🇳' },
  { code: 'sat', name: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', flag: '🇮🇳' },
  { code: 'brx', name: 'Bodo', nativeName: 'बर’', flag: '🇮🇳' },
  { code: 'mni', name: 'Manipuri (Meitei)', nativeName: 'ꯃꯤꯇꯩꯂꯣꯟ', flag: '🇮🇳' },
  { code: 'bho', name: 'Bhojpuri', nativeName: 'भोजपुरी', flag: '🇮🇳' },
  { code: 'awa', name: 'Awadhi', nativeName: 'अवधी', flag: '🇮🇳' },
  { code: 'mwr', name: 'Marwari', nativeName: 'मारवाड़ी', flag: '🇮🇳' },
  { code: 'mag', name: 'Magahi', nativeName: 'मगही', flag: '🇮🇳' },
  { code: 'chg', name: 'Chhattisgarhi', nativeName: 'छत्तीसगढ़ी', flag: '🇮🇳' },
  { code: 'lus', name: 'Mizo', nativeName: 'Mizo ṭawng', flag: '🇮🇳' },
  { code: 'kha', name: 'Khasi', nativeName: 'Ka Ktien Khasi', flag: '🇮🇳' },
  { code: 'gar', name: 'Garo', nativeName: 'A·chik', flag: '🇮🇳' }
];

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    workerAutoAssignment: true,
  });

  const [financialSettings, setFinancialSettings] = useState({
    visitedCharges: 0,
    serviceGstPercentage: 18,
    partsGstPercentage: 18,
    servicePayoutPercentage: 90,
    partsPayoutPercentage: 100,
    vendorCashLimit: 10000,
    cancellationPenalty: 49,
    tdsPercentage: 1,
    platformFeePercentage: 1,
    maxSearchTime: 5,
    waveDuration: 60,
    searchRadius: 10,
    isOnlinePaymentEnabled: true
  });

  // Centralized Feature Toggles State (Essential Platform Toggles)
  const [featureToggles, setFeatureToggles] = useState({
    isReferralEnabled: true,
    isPushNotificationEnabled: true,
    isChatEnabled: true
  });

  // Referral Program State
  const [referralSettings, setReferralSettings] = useState({
    isReferralEnabled: true,
    referralRewardAmount: 50,
    refereeRewardAmount: 50
  });
  const [referralLoading, setReferralLoading] = useState(false);

  // Billing Configuration State
  const [billingSettings, setBillingSettings] = useState({
    companyName: 'TodayMyDream',
    companyGSTIN: '',
    companyPAN: '',
    companyAddress: '',
    companyCity: '',
    companyState: '',
    companyPincode: '',
    companyPhone: '',
    companyEmail: '',
    invoicePrefix: 'INV',
    sacCode: '998599'
  });
  const [billingLoading, setBillingLoading] = useState(false);

  // Support Settings State
  const [supportSettings, setSupportSettings] = useState({
    supportEmail: '',
    supportPhone: '',
    supportWhatsapp: ''
  });
  const [supportLoading, setSupportLoading] = useState(false);

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    role: 'admin',
    assignedCity: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Admin Management State
  const [admins, setAdmins] = useState([]);
  const [cities, setCities] = useState([]); // State for cities
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '', role: 'admin', cityId: '' }); // Added cityId
  const [adminLoading, setAdminLoading] = useState(false);

  // Language Management State
  const [languages, setLanguages] = useState(DEFAULT_SUPPORTED_LANGUAGES);
  const [showAddLanguage, setShowAddLanguage] = useState(false);
  const [langLoading, setLangLoading] = useState(false);
  const [langSearch, setLangSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Derive active view from the URL so sidebar links work correctly
  const activeView = useMemo(() => {
    const seg = location.pathname.replace('/admin/settings', '').replace(/^\//, '');
    const map = {
      'profile':            'profile',
      'general':            'financial',
      'financial':          'financial',
      'worker-assignment':  'financial',  // Dispatch & Radii fields live inside the financial view
      'system':             'system',     // Global System Settings → Contact & Support view
      'customization':      'customization',
      'toggles':            'toggles',
      'cities':             'cities',
      'admins':             'admins',
      'languages':          'languages',
    };
    return map[seg] || 'main';
  }, [location.pathname]);

  // Adapter: translate view keys to URL paths
  const setActiveView = (view) => {
    const viewToPath = {
      'main':          '/admin/settings',
      'profile':       '/admin/settings/profile',
      'financial':     '/admin/settings/general',
      'customization': '/admin/settings/customization',
      'toggles':       '/admin/settings/toggles',
      'system':        '/admin/settings/system',
      'cities':        '/admin/settings/cities',
      'admins':        '/admin/settings/admins',
      'languages':     '/admin/settings/languages',
    };
    navigate(viewToPath[view] || '/admin/settings');
  };

  const isSuperAdmin = profile.role === 'super_admin';

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await getAdminProfile();
        if (res.success && res.data) {
          setProfile(prev => ({
            ...prev,
            email: res.data.email,
            name: res.data.name || 'Admin',
            role: res.data.role || 'admin',
            assignedCity: res.data.cityName || res.data.cityId?.name || ''
          }));
          const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');
          const newData = { ...adminData, ...res.data };
          localStorage.setItem('adminData', JSON.stringify(newData));
        }
      } catch (error) {
        console.error('Error loading admin profile:', error);
      }
    };

    const loadSettings = () => {
      try {
        const adminSettings = JSON.parse(localStorage.getItem('adminSettings') || '{}');
        if (Object.keys(adminSettings).length > 0) {
          setSettings(prev => ({ ...prev, ...adminSettings }));
        }
      } catch (error) {
        console.error('Error loading admin settings:', error);
      }
    };

    const loadFinancialSettings = async () => {
      try {
        const res = await getSettings();
        if (res.success && res.settings) {
          setFinancialSettings({
            visitedCharges: res.settings.visitedCharges || 0,
            serviceGstPercentage: res.settings.serviceGstPercentage ?? 18,
            partsGstPercentage: res.settings.partsGstPercentage ?? 18,
            servicePayoutPercentage: res.settings.servicePayoutPercentage ?? 90,
            partsPayoutPercentage: res.settings.partsPayoutPercentage ?? 100,
            tdsPercentage: res.settings.tdsPercentage || 1,
            platformFeePercentage: res.settings.platformFeePercentage || 1,
            vendorCashLimit: res.settings.vendorCashLimit || 10000,
            cancellationPenalty: res.settings.cancellationPenalty !== undefined ? res.settings.cancellationPenalty : 49,
            searchRadius: res.settings.searchRadius || 10,
            isOnlinePaymentEnabled: res.settings.isOnlinePaymentEnabled !== undefined ? res.settings.isOnlinePaymentEnabled : true
          });
          // Load feature toggles (3 Essential Platform Toggles)
          setFeatureToggles({
            isReferralEnabled: res.settings.isReferralEnabled !== false,
            isPushNotificationEnabled: res.settings.isPushNotificationEnabled !== false,
            isChatEnabled: res.settings.isChatEnabled !== false
          });

          // Load referral settings
          if (res.settings.isReferralEnabled !== undefined) {
            setReferralSettings({
              isReferralEnabled: res.settings.isReferralEnabled,
              referralRewardAmount: res.settings.referralRewardAmount !== undefined ? res.settings.referralRewardAmount : 50,
              refereeRewardAmount: res.settings.refereeRewardAmount !== undefined ? res.settings.refereeRewardAmount : 50
            });
          }
          // Load billing settings
          setBillingSettings({
            companyName: res.settings.companyName || 'TodayMyDream',
            companyGSTIN: res.settings.companyGSTIN || '',
            companyPAN: res.settings.companyPAN || '',
            companyAddress: res.settings.companyAddress || '',
            companyCity: res.settings.companyCity || '',
            companyState: res.settings.companyState || '',
            companyPincode: res.settings.companyPincode || '',
            companyPhone: res.settings.companyPhone || '',
            companyEmail: res.settings.companyEmail || '',
            invoicePrefix: res.settings.invoicePrefix || 'INV',
            sacCode: res.settings.sacCode || '998599'
          });
          // Load support settings
          setSupportSettings({
            supportEmail: res.settings.supportEmail || '',
            supportPhone: res.settings.supportPhone || '',
            supportWhatsapp: res.settings.supportWhatsapp || ''
          });
          // Load dynamic languages
          if (Array.isArray(res.settings.supportedLanguages) && res.settings.supportedLanguages.length > 0) {
            setLanguages(res.settings.supportedLanguages);
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadProfile();
    loadSettings();
    loadFinancialSettings();
  }, []);

  const loadAdmins = async () => {
    try {
      console.log('Fetching admins list...');
      const res = await getAllAdmins();
      console.log('Admins fetched:', res);
      if (res.success) {
        setAdmins(res.data || []);
      }
    } catch (error) {
      console.error('Error loading admins:', error);
    }
  };

  // Fetch cities for dropdown
  const loadCities = async () => {
    try {
      const res = await cityService.getAll();
      if (res.success) {
        setCities(res.cities || []);
      }
    } catch (error) {
      console.error('Error loading cities:', error);
    }
  };

  // Load admins and cities when entering admin view
  useEffect(() => {
    if (isSuperAdmin && (activeView === 'admins' || admins.length === 0)) {
      loadAdmins();
      loadCities(); // Fetch cities as well
    }
  }, [isSuperAdmin, activeView]);

  const handleToggle = (key) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    localStorage.setItem('adminSettings', JSON.stringify(updated));
    window.dispatchEvent(new Event('adminSettingsUpdated'));
  };

  const handleFinancialChange = (e) => {
    const { name, value } = e.target;
    setFinancialSettings(prev => ({
      ...prev,
      [name]: Number(value)
    }));
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleFinancialSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateSettings(financialSettings);
      toast.success('Financial settings updated');
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  // Handle billing settings change
  const handleBillingChange = (e) => {
    const { name, value } = e.target;
    // Auto-uppercase for specific fields
    const upperFields = ['companyGSTIN', 'companyPAN', 'invoicePrefix'];
    const newValue = upperFields.includes(name) ? value.toUpperCase() : value;
    setBillingSettings(prev => ({ ...prev, [name]: newValue }));
  };

  const validateBilling = () => {
    const {
      companyName, companyGSTIN, companyPAN, companyAddress,
      companyCity, companyState, companyPincode,
      companyPhone, companyEmail, invoicePrefix, sacCode
    } = billingSettings;

    if (!companyName?.trim()) return "Company Name is required";

    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!companyGSTIN || !gstRegex.test(companyGSTIN)) return "Invalid GSTIN format (e.g., 27ABCDE1234F1Z5)";

    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!companyPAN || !panRegex.test(companyPAN)) return "Invalid PAN format (e.g., ABCDE1234F)";

    if (!companyAddress?.trim()) return "Address is required";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!companyEmail || !emailRegex.test(companyEmail)) return "Invalid Email Address";

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!companyPhone || !phoneRegex.test(companyPhone)) return "Invalid Phone Number (must be 10 digits)";

    if (!companyCity?.trim()) return "City is required";
    if (!companyState?.trim()) return "State is required";

    const pincodeRegex = /^[1-9][0-9]{5}$/;
    if (!companyPincode || !pincodeRegex.test(companyPincode)) return "Invalid Pincode (must be 6 digits)";

    if (!invoicePrefix?.trim()) return "Invoice Prefix is required";

    const sacRegex = /^\d{6}$/;
    if (!sacCode || !sacRegex.test(sacCode)) return "Invalid SAC Code (must be 6 digits)";

    return null;
  };

  // Save billing settings
  const handleBillingSave = async (e) => {
    e.preventDefault();

    const error = validateBilling();
    if (error) return toast.error(error);

    setBillingLoading(true);
    try {
      await updateSettings(billingSettings);
      toast.success('Billing settings updated');
    } catch (error) {
      toast.error('Failed to update billing settings');
    } finally {
      setBillingLoading(false);
    }
  };

  // Handle support settings change
  const handleSupportChange = (e) => {
    const { name, value } = e.target;
    setSupportSettings(prev => ({ ...prev, [name]: value }));
  };

  // Save support settings
  const handleSupportSave = async (e) => {
    e.preventDefault();
    setSupportLoading(true);
    try {
      await updateSettings(supportSettings);
      toast.success('Support settings updated');
    } catch (error) {
      toast.error('Failed to update support settings');
    } finally {
      setSupportLoading(false);
    }
  };

  // Referral management handlers
  const handleReferralChange = (e) => {
    const { name, value } = e.target;
    setReferralSettings(prev => ({ ...prev, [name]: Number(value) }));
  };

  const handleReferralToggle = async () => {
    const newValue = !referralSettings.isReferralEnabled;
    setReferralSettings(prev => ({ ...prev, isReferralEnabled: newValue }));
    try {
      await updateSettings({ isReferralEnabled: newValue });
      toast.success(newValue ? 'Referral program enabled' : 'Referral program paused');
    } catch (err) {
      toast.error('Failed to toggle referral program');
    }
  };

  const handleReferralSave = async (e) => {
    e.preventDefault();
    setReferralLoading(true);
    try {
      await updateSettings(referralSettings);
      toast.success('Referral settings updated successfully');
    } catch (error) {
      toast.error('Failed to update referral settings');
    } finally {
      setReferralLoading(false);
    }
  };

  // Centralized Feature Toggle Handler
  const handleFeatureToggle = async (key, label) => {
    const newValue = !featureToggles[key];
    setFeatureToggles(prev => ({ ...prev, [key]: newValue }));
    if (key === 'isReferralEnabled') {
      setReferralSettings(prev => ({ ...prev, isReferralEnabled: newValue }));
    }
    if (key === 'isOnlinePaymentEnabled') {
      setFinancialSettings(prev => ({ ...prev, isOnlinePaymentEnabled: newValue }));
    }
    if (key === 'workerAutoAssignment') {
      setSettings(prev => ({ ...prev, workerAutoAssignment: newValue }));
    }
    try {
      await updateSettings({ [key]: newValue });
      toast.success(`${label} ${newValue ? 'Enabled' : 'Disabled'}`);
    } catch (err) {
      toast.error(`Failed to update ${label}`);
    }
  };

  // Language management handlers
  const handleSaveLanguages = async (updatedLangs) => {
    setLangLoading(true);
    try {
      const targetList = updatedLangs || languages;
      await updateSettings({ supportedLanguages: targetList });
      setLanguages(targetList);
      toast.success('Language settings updated successfully');
    } catch (error) {
      toast.error('Failed to update language settings');
    } finally {
      setLangLoading(false);
    }
  };

  const handleDeleteLanguage = (code, name) => {
    if (code === 'en') {
      return toast.error('English is the default primary language and cannot be deleted.');
    }
    const updated = languages.filter(l => l.code !== code);
    setLanguages(updated);
    handleSaveLanguages(updated);
    toast.success(`Removed ${name || code} from platform languages`);
  };

  const handlePresetSelect = (presetCode) => {
    if (!presetCode) return;
    const preset = PRESET_POPULAR_LANGUAGES.find(p => p.code === presetCode);
    if (preset) {
      setNewLanguage({
        code: preset.code,
        name: preset.name,
        nativeName: preset.nativeName,
        flag: preset.flag || '🌐',
        isEnabled: true
      });
    }
  };

  const handleQuickAddPreset = (preset) => {
    if (languages.some(l => l.code === preset.code)) {
      return toast.error(`${preset.name} is already added`);
    }
    const updated = [...languages, { ...preset, isEnabled: true }];
    setLanguages(updated);
    handleSaveLanguages(updated);
    setShowAddLanguage(false);
    toast.success(`Added ${preset.name} (${preset.nativeName}) successfully!`);
  };

  const handleAddLanguageSubmit = (e) => {
    e.preventDefault();
    if (!newLanguage.code || !newLanguage.name || !newLanguage.nativeName) {
      return toast.error('Language code, English Name, and Native Name are required');
    }
    const cleanCode = newLanguage.code.trim().toLowerCase();
    if (languages.some(l => l.code === cleanCode)) {
      return toast.error('Language code already exists');
    }
    const updated = [...languages, { ...newLanguage, code: cleanCode, isEnabled: true }];
    setLanguages(updated);
    setShowAddLanguage(false);
    setNewLanguage({ code: '', name: '', nativeName: '', flag: '🌐', isEnabled: true });
    handleSaveLanguages(updated);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (profile.newPassword && profile.newPassword !== profile.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    if (profile.newPassword && !profile.currentPassword) {
      return toast.error('Current password required');
    }

    setProfileLoading(true);
    try {
      const updateData = { email: profile.email };
      if (profile.newPassword) {
        updateData.currentPassword = profile.currentPassword;
        updateData.newPassword = profile.newPassword;
      } else if (profile.currentPassword) {
        updateData.currentPassword = profile.currentPassword;
      }

      await updateAdminProfile(updateData);
      const adminData = JSON.parse(localStorage.getItem('adminUser') || '{}');
      adminData.email = profile.email;
      localStorage.setItem('adminUser', JSON.stringify(adminData));

      toast.success('Profile updated');
      setProfile(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    const isEdit = !!newAdmin.id;

    if (!newAdmin.name || !newAdmin.email) {
      return toast.error('Name and Email are required');
    }
    if (!isEdit && !newAdmin.password) {
      return toast.error('Password is required for new admin');
    }

    setAdminLoading(true);
    try {
      // Prepare payload
      const payload = { ...newAdmin };
      if (payload.cityId) {
        const cityObj = cities.find(c => (c._id || c.id) === payload.cityId);
        if (cityObj) payload.cityName = cityObj.name;
      } else {
        delete payload.cityId;
        payload.cityName = '';
      }

      if (isEdit) {
        await updateAdminDetails(newAdmin.id, payload);
        toast.success('Admin updated successfully');
      } else {
        await createAdmin(payload);
        toast.success('Admin created successfully');
      }
      setNewAdmin({ name: '', email: '', password: '', role: 'admin', cityId: '' });
      setShowAddAdmin(false);
      loadAdmins();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleEditClick = (admin) => {
    setNewAdmin({
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      password: '',
      cityId: admin.cityId?._id || admin.cityId || '' // Handle populated or raw ID
    });
    setShowAddAdmin(true);
  };

  const handleBlockAdmin = async (id, currentStatus) => {
    const action = currentStatus ? 'block' : 'unblock';
    if (!window.confirm(`Are you sure you want to ${action} this admin?`)) return;

    try {
      await toggleAdminStatus(id);
      toast.success(`Admin ${action}ed`);
      loadAdmins();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDeleteAdmin = async (id, name) => {
    if (!window.confirm(`Delete admin "${name}"? This cannot be undone.`)) return;
    try {
      await deleteAdmin(id);
      toast.success('Admin deleted');
      loadAdmins();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete');
    }
  };

  const [serviceMode, setServiceMode] = useState('multi');
  useEffect(() => {
    const config = JSON.parse(localStorage.getItem('adminServiceConfig') || '{}');
    setServiceMode(config.mode || 'multi');
  }, []);

  // Render Function for Main Settings Menu (Compact Sleek Cards)
  const renderMainMenu = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
      {/* Profile Settings Card */}
      <div
        onClick={() => setActiveView('profile')}
        className="bg-white p-4 rounded-xl shadow-2xs border border-gray-100 hover:border-blue-200 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
      >
        <div>
          <div className="w-8.5 h-8.5 bg-blue-50 group-hover:bg-blue-100 rounded-lg flex items-center justify-center mb-2.5 transition-colors">
            <FiUser className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Profile Settings</h3>
          <p className="text-xs text-gray-500 leading-snug mt-1">Manage your personal account details and password</p>
        </div>
      </div>

      {/* Financial Settings Card - Super Admin Only */}
      {isSuperAdmin && (
        <div
          onClick={() => setActiveView('financial')}
          className="bg-white p-4 rounded-xl shadow-2xs border border-gray-100 hover:border-emerald-200 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-8.5 h-8.5 bg-emerald-50 group-hover:bg-emerald-100 rounded-lg flex items-center justify-center mb-2.5 transition-colors">
              <FiDollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">Financial Info</h3>
            <p className="text-xs text-gray-500 leading-snug mt-1">Configure charges, commissions, and billing details</p>
          </div>
        </div>
      )}

      {/* Customization Settings Card - Super Admin Only */}
      {isSuperAdmin && (
        <div
          onClick={() => setActiveView('customization')}
          className="bg-white p-4 rounded-xl shadow-2xs border border-gray-100 hover:border-rose-200 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-8.5 h-8.5 bg-rose-50 group-hover:bg-rose-100 rounded-lg flex items-center justify-center transition-colors">
                <FiToggleRight className="w-4 h-4 text-rose-600" />
              </div>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-100/80 rounded-md">
                {Object.values(featureToggles).filter(Boolean).length} Active
              </span>
            </div>
            <h3 className="text-sm font-bold text-gray-900 group-hover:text-rose-600 transition-colors">Customization Settings</h3>
            <p className="text-xs text-gray-500 leading-snug mt-1">Centrally toggle off or customize platform modules & features</p>
          </div>
        </div>
      )}

      {/* Support Settings Card - Super Admin Only */}
      {isSuperAdmin && (
        <div
          onClick={() => setActiveView('system')}
          className="bg-white p-4 rounded-xl shadow-2xs border border-gray-100 hover:border-indigo-200 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-8.5 h-8.5 bg-indigo-50 group-hover:bg-indigo-100 rounded-lg flex items-center justify-center mb-2.5 transition-colors">
              <FiHeadphones className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">Contact & Support</h3>
            <p className="text-xs text-gray-500 leading-snug mt-1">Manage customer support email, phone, and WhatsApp contact</p>
          </div>
        </div>
      )}

      {/* City Management Card - Super Admin Only */}
      {isSuperAdmin && (
        <div
          onClick={() => setActiveView('cities')}
          className="bg-white p-4 rounded-xl shadow-2xs border border-gray-100 hover:border-teal-200 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-8.5 h-8.5 bg-teal-50 group-hover:bg-teal-100 rounded-lg flex items-center justify-center mb-2.5 transition-colors">
              <FiMapPin className="w-4 h-4 text-teal-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 group-hover:text-teal-600 transition-colors">City Management</h3>
            <p className="text-xs text-gray-500 leading-snug mt-1">Manage operational cities and default location</p>
          </div>
        </div>
      )}

      {/* Language Management Card - Super Admin & Admin */}
      <div
        onClick={() => setActiveView('languages')}
        className="bg-white p-4 rounded-xl shadow-2xs border border-gray-100 hover:border-sky-200 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
      >
        <div>
          <div className="w-8.5 h-8.5 bg-sky-50 group-hover:bg-sky-100 rounded-lg flex items-center justify-center mb-2.5 transition-colors">
            <FiGlobe className="w-4 h-4 text-sky-600" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 group-hover:text-sky-600 transition-colors">Languages & Localization</h3>
          <p className="text-xs text-gray-500 leading-snug mt-1">Enable/disable regional languages & add new languages</p>
        </div>
      </div>

      {/* Admin Management Card - Super Admin Only */}
      {isSuperAdmin && (
        <div
          onClick={() => setActiveView('admins')}
          className="bg-white p-4 rounded-xl shadow-2xs border border-gray-100 hover:border-amber-200 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-8.5 h-8.5 bg-amber-50 group-hover:bg-amber-100 rounded-lg flex items-center justify-center mb-2.5 transition-colors">
              <FiUsers className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 group-hover:text-amber-600 transition-colors">Manage Admins</h3>
            <p className="text-xs text-gray-500 leading-snug mt-1">Add, remove, and view all system administrators</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* Header / Breadcrumb */}
      {activeView !== 'main' && activeView !== 'customization' && activeView !== 'toggles' && (
        <button onClick={() => setActiveView('main')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-4 transition-colors">
          <span className="text-lg">←</span> Back to Settings
        </button>
      )}

      {activeView === 'main' && renderMainMenu()}

      <AnimatePresence mode="wait">

        {/* Profile View */}
        {activeView === 'profile' && (
          <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            <div className="max-w-2xl mx-auto bg-white rounded-xl p-8 shadow-sm border border-gray-100">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl">
                  {profile.name ? profile.name.charAt(0).toUpperCase() : <FiUser />}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{profile.name || 'Admin'}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      {isSuperAdmin && <FiShield className="text-amber-500" />}
                      {isSuperAdmin ? 'Super Admin' : 'Admin'} • {profile.email}
                    </p>
                    {profile.role !== 'super_admin' ? (
                      <span className="px-2 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-bold rounded-lg border border-teal-100 flex items-center gap-1">
                        <FiMapPin className="w-2.5 h-2.5" />
                        {profile.assignedCity || 'Restricted Access'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-lg border border-amber-100">
                        Global Access
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input type="email" name="email" value={profile.email} onChange={handleProfileChange} required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>

                <div className="pt-6 border-t border-gray-100 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Change Password</h3>
                  <div className="space-y-4">
                    <input type="password" name="currentPassword" value={profile.currentPassword} onChange={handleProfileChange}
                      placeholder="Current Password"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 transition-all" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input type="password" name="newPassword" value={profile.newPassword} onChange={handleProfileChange}
                        placeholder="New Password"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 transition-all" />
                      <input type="password" name="confirmPassword" value={profile.confirmPassword} onChange={handleProfileChange}
                        placeholder="Confirm New Password"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 transition-all" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <button type="submit" disabled={profileLoading}
                    className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 flex items-center gap-2 disabled:opacity-70 shadow-lg shadow-blue-200 transition-all">
                    {profileLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiSave className="w-5 h-5" />}
                    Update Profile
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {/* Dedicated Customization Settings Switchboard */}
        {(activeView === 'customization' || activeView === 'toggles') && (
          <motion.div
            key="customization"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 max-w-6xl mx-auto"
          >
            {/* Sleek Breadcrumb Back Button */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveView('main')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-all shadow-2xs active:scale-95 cursor-pointer"
              >
                <FiArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Settings</span>
              </button>
              <div className="text-xs text-gray-500 font-medium hidden sm:block">
                Settings &gt; Customization Switchboard
              </div>
            </div>

            {/* Main White Card Container */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200/90 shadow-2xs space-y-4">
              {/* Section Heading Inside Card */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-1.5 text-gray-800 font-bold text-xs sm:text-sm">
                  <FiSliders className="w-3.5 h-3.5 text-gray-600" />
                  <span>Manage All Toggles Here</span>
                </div>
                <div className="text-[10px] font-bold px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-full border border-gray-200/60">
                  {Object.values(featureToggles).filter(Boolean).length} / 3 Enabled
                </div>
              </div>

              {/* 3-Column Compact Platform Toggle Grid (Referral, Push Notifications, In-App Chat) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {/* 1. Referral & Invite Program */}
                <div className="bg-[#F9FAFB] hover:bg-white rounded-xl p-3.5 border border-gray-200/80 hover:border-gray-300 transition-all shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs sm:text-[13px] font-bold text-gray-900 leading-tight">Referral & Invite Program</h3>
                      <button
                        type="button"
                        onClick={() => handleFeatureToggle('isReferralEnabled', 'Referral & Invite Program')}
                        className={`relative w-9 h-5 rounded-full transition-colors duration-300 shrink-0 cursor-pointer ${
                          featureToggles.isReferralEnabled ? 'bg-[#10B981]' : 'bg-[#D1D5DB]'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                            featureToggles.isReferralEnabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-snug mt-1.5 font-normal">
                      Global toggle to enable/disable automated referral rewards and bonus engine.
                    </p>
                  </div>

                  {featureToggles.isReferralEnabled && (
                    <form onSubmit={handleReferralSave} className="mt-2.5 pt-2 border-t border-gray-200/70 space-y-1.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">Referrer (₹)</label>
                          <input
                            type="number"
                            name="referralRewardAmount"
                            min="0"
                            value={referralSettings.referralRewardAmount}
                            onChange={handleReferralChange}
                            className="w-full px-2 py-1 text-xs font-bold bg-white border border-gray-200 rounded-md outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">Referee (₹)</label>
                          <input
                            type="number"
                            name="refereeRewardAmount"
                            min="0"
                            value={referralSettings.refereeRewardAmount}
                            onChange={handleReferralChange}
                            className="w-full px-2 py-1 text-xs font-bold bg-white border border-gray-200 rounded-md outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={referralLoading}
                          className="px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        >
                          {referralLoading ? <div className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin" /> : <FiSave className="w-2.5 h-2.5" />}
                          Save ₹
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* 2. Push Notification */}
                <div className="bg-[#F9FAFB] hover:bg-white rounded-xl p-3.5 border border-gray-200/80 hover:border-gray-300 transition-all shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs sm:text-[13px] font-bold text-gray-900 leading-tight">Push Notification Broadcast</h3>
                      <button
                        type="button"
                        onClick={() => handleFeatureToggle('isPushNotificationEnabled', 'Push Notification')}
                        className={`relative w-9 h-5 rounded-full transition-colors duration-300 shrink-0 cursor-pointer ${
                          featureToggles.isPushNotificationEnabled ? 'bg-[#10B981]' : 'bg-[#D1D5DB]'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                            featureToggles.isPushNotificationEnabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-snug mt-1.5 font-normal">
                      Controls real-time Firebase device push notification alerts for booking updates.
                    </p>
                  </div>
                </div>

                {/* 3. In-App Chat Messaging */}
                <div className="bg-[#F9FAFB] hover:bg-white rounded-xl p-3.5 border border-gray-200/80 hover:border-gray-300 transition-all shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs sm:text-[13px] font-bold text-gray-900 leading-tight">In-App Chat Messaging</h3>
                      <button
                        type="button"
                        onClick={() => handleFeatureToggle('isChatEnabled', 'In-App Chat Messaging')}
                        className={`relative w-9 h-5 rounded-full transition-colors duration-300 shrink-0 cursor-pointer ${
                          featureToggles.isChatEnabled ? 'bg-[#10B981]' : 'bg-[#D1D5DB]'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                            featureToggles.isChatEnabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-snug mt-1.5 font-normal">
                      Controls live customer-technician in-app chat modal during active jobs.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Financial View */}
        {activeView === 'financial' && (
            <motion.div key="financial" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* General Financial Settings */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 h-fit">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FiDollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-800">Financial Configuration</h2>
                </div>

                <form onSubmit={handleFinancialSave} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Service GST (%)</label>
                      <input type="number" name="serviceGstPercentage" value={financialSettings.serviceGstPercentage} onChange={handleFinancialChange}
                        min="0" max="100"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-500 transition-all" />
                      <p className="text-[10px] text-gray-400 mt-1">GST rate applied to services</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Parts GST (%)</label>
                      <input type="number" name="partsGstPercentage" value={financialSettings.partsGstPercentage} onChange={handleFinancialChange}
                        min="0" max="100"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-500 transition-all" />
                      <p className="text-[10px] text-gray-400 mt-1">GST rate applied to parts &amp; materials</p>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 uppercase">Service Payout (%)</label>
                        <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                          Platform Commission: {100 - (financialSettings.servicePayoutPercentage || 90)}%
                        </span>
                      </div>
                      <input type="number" name="servicePayoutPercentage" value={financialSettings.servicePayoutPercentage} onChange={handleFinancialChange}
                        min="0" max="100"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-500 transition-all font-semibold" />
                      <p className="text-[10px] text-gray-400 mt-1">Vendor keeps {financialSettings.servicePayoutPercentage || 90}% of service base price</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Parts Payout (%)</label>
                      <input type="number" name="partsPayoutPercentage" value={financialSettings.partsPayoutPercentage} onChange={handleFinancialChange}
                        min="0" max="100"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-500 transition-all font-semibold" />
                      <p className="text-[10px] text-gray-400 mt-1">Vendor keeps {financialSettings.partsPayoutPercentage || 100}% of parts charges</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">Vendor Cash Collection Limit (₹)</label>
                      <input type="number" name="vendorCashLimit" value={financialSettings.vendorCashLimit} onChange={handleFinancialChange}
                        min="500" step="500"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-500 transition-all font-bold text-slate-900" />
                      <p className="text-[10px] text-gray-400 mt-1">Max unpaid cash dues allowed before auto-locking vendor accounts (default ₹10,000)</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">TDS Percentage (%)</label>
                      <input type="number" name="tdsPercentage" value={financialSettings.tdsPercentage} onChange={handleFinancialChange}
                        min="0" max="100"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-500 transition-all" />
                      <p className="text-[10px] text-gray-400 mt-1">TDS deducted on vendor withdrawal payouts (Govt. mandated)</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Platform Fee (%)</label>
                      <input type="number" name="platformFeePercentage" value={financialSettings.platformFeePercentage} onChange={handleFinancialChange}
                        min="0" max="100"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-500 transition-all" />
                      <p className="text-[10px] text-gray-400 mt-1">Processing charge on vendor payouts</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Cancellation Penalty (₹)</label>
                      <input type="number" name="cancellationPenalty" value={financialSettings.cancellationPenalty} onChange={handleFinancialChange}
                        min="0"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-500 transition-all" />
                    </div>
                    <div className="pt-4 border-t border-gray-100 md:col-span-2">
                      <h4 className="text-xs font-bold text-gray-700 uppercase mb-3">Booking Timing & Waves</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Max Global Search Time (Mins)</label>
                          <input type="number" name="maxSearchTime" value={financialSettings.maxSearchTime} onChange={handleFinancialChange}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-500 transition-all" />
                          <p className="text-[10px] text-gray-400 mt-1">Total time to find a vendor before search is auto-cancelled</p>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Wave Alert Threshold (Secs)</label>
                          <input type="number" name="waveDuration" value={financialSettings.waveDuration} onChange={handleFinancialChange}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-500 transition-all" />
                          <p className="text-[10px] text-gray-400 mt-1">Time waited before alerting the next batch of vendors</p>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Global Search Radius (Km)</label>
                          <input type="number" name="searchRadius" value={financialSettings.searchRadius} onChange={handleFinancialChange}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-500 transition-all" />
                          <p className="text-[10px] text-gray-400 mt-1">Default distance to hunt for vendors around booking location</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button type="submit" disabled={loading}
                      className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center gap-2 disabled:opacity-60 shadow-lg shadow-green-200">
                      {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiSave className="w-4 h-4" />}
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>

              {/* Billing Information - Super Admin Only */}
              {isSuperAdmin && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 h-fit">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <FiFileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-800">Billing & Company Details</h2>
                      <p className="text-xs text-gray-500">For invoices and tax documents</p>
                    </div>
                  </div>

                  <form onSubmit={handleBillingSave} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Company Name</label>
                      <input type="text" name="companyName" value={billingSettings.companyName} onChange={handleBillingChange}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">GSTIN</label>
                        <input type="text" name="companyGSTIN" value={billingSettings.companyGSTIN} onChange={handleBillingChange}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500 uppercase" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">PAN</label>
                        <input type="text" name="companyPAN" value={billingSettings.companyPAN} onChange={handleBillingChange}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500 uppercase" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Full Address</label>
                      <textarea name="companyAddress" value={billingSettings.companyAddress} onChange={handleBillingChange} rows="2"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500 resize-none" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Company Email</label>
                        <input type="email" name="companyEmail" value={billingSettings.companyEmail} onChange={handleBillingChange}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Company Phone</label>
                        <input type="text" name="companyPhone" value={billingSettings.companyPhone} onChange={handleBillingChange}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">City</label>
                        <input type="text" name="companyCity" value={billingSettings.companyCity} onChange={handleBillingChange}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">State</label>
                        <input type="text" name="companyState" value={billingSettings.companyState} onChange={handleBillingChange}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Pincode</label>
                        <input type="text" name="companyPincode" value={billingSettings.companyPincode} onChange={handleBillingChange}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500" />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                      <h4 className="text-xs font-bold text-gray-700 mb-3">Invoice Settings</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Prefix</label>
                          <input type="text" name="invoicePrefix" value={billingSettings.invoicePrefix} onChange={handleBillingChange}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500 uppercase" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">SAC Code</label>
                          <input type="text" name="sacCode" value={billingSettings.sacCode} onChange={handleBillingChange}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500" />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button type="submit" disabled={billingLoading}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-60">
                        {billingLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiSave className="w-4 h-4" />}
                        Update Billing
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </motion.div>
          )
        }

        {/* Contact & Support View */}
        {activeView === 'system' && (
          <motion.div
            key="system"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <FiHeadphones className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Contact & Support Details</h2>
                  <p className="text-xs text-gray-500">Contact numbers and email displayed to users and vendors for assistance</p>
                </div>
              </div>

              <form onSubmit={handleSupportSave} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Support Email</label>
                  <div className="relative">
                    <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="email"
                      name="supportEmail"
                      value={supportSettings.supportEmail}
                      onChange={handleSupportChange}
                      placeholder="support@zippto.com"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-medium text-gray-800"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Direct support inquiries and ticket responses will route here</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Support Helpline Phone</label>
                  <div className="relative">
                    <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="tel"
                      name="supportPhone"
                      value={supportSettings.supportPhone}
                      onChange={handleSupportChange}
                      placeholder="+91 98765 43210"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-medium text-gray-800"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Official phone number shown on invoices and the mobile app help drawer</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">WhatsApp Support Hotline</label>
                  <div className="relative">
                    <FiMessageCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="tel"
                      name="supportWhatsapp"
                      value={supportSettings.supportWhatsapp}
                      onChange={handleSupportChange}
                      placeholder="+91 98765 43210"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-medium text-gray-800"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Enables 1-click WhatsApp customer care in the user profile</p>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={supportLoading}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-60 shadow-lg shadow-blue-200 transition-all cursor-pointer"
                  >
                    {supportLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiSave className="w-4 h-4" />}
                    Save Support Details
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {/* City Management View */}
        {
          activeView === 'cities' && (
            <motion.div key="cities" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              <CityManagement />
            </motion.div>
          )
        }

        {/* Admin Management View - Super Admin Only */}
        {
          activeView === 'admins' && isSuperAdmin && (
            <motion.div key="admins" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <FiUsers className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Admin Management</h2>
                      <p className="text-sm text-gray-500">Total {admins.length} administrators found</p>
                    </div>
                  </div>
                  <button onClick={() => { setNewAdmin({ name: '', email: '', password: '', role: 'admin', cityId: '' }); setShowAddAdmin(!showAddAdmin); }}
                    className={`px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg transition-all ${showAddAdmin ? 'bg-gray-100 text-gray-600' : 'bg-amber-600 text-white hover:bg-amber-700 shadow-amber-100'}`}>
                    {showAddAdmin ? <FiX className="w-4 h-4" /> : <FiPlus className="w-4 h-4" />}
                    {showAddAdmin ? 'Cancel' : 'Add New Admin'}
                  </button>
                </div>

                {/* Add/Edit Admin Form */}
                <AnimatePresence>
                  {showAddAdmin && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-b border-gray-100 bg-amber-50/50">
                      <form onSubmit={handleCreateAdmin} className="p-6">
                        <h3 className="text-sm font-bold text-gray-800 mb-4">{newAdmin.id ? 'Edit Administrator' : 'Create New Administrator'}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4"> {/* Increased columns */}
                          <input type="text" placeholder="Full Name" value={newAdmin.name} onChange={e => setNewAdmin(p => ({ ...p, name: e.target.value }))}
                            className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200" />
                          <input type="email" placeholder="Email Address" value={newAdmin.email} onChange={e => setNewAdmin(p => ({ ...p, email: e.target.value }))}
                            className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200" />
                          <input type="password" placeholder={newAdmin.id ? "Password (leave blank to keep)" : "Password"} value={newAdmin.password} onChange={e => setNewAdmin(p => ({ ...p, password: e.target.value }))}
                            className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200" />

                          {/* Role Selection */}
                          <select value={newAdmin.role} onChange={e => setNewAdmin(p => ({ ...p, role: e.target.value }))}
                            className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200">
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super Admin</option>
                          </select>

                          {/* City Selection */}
                          <select value={newAdmin.cityId} onChange={e => setNewAdmin(p => ({ ...p, cityId: e.target.value }))}
                            className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200">
                            <option value="">All Cities (Global)</option>
                            {cities.map(city => (
                              <option key={city._id} value={city._id}>
                                {city.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex justify-end mt-4">
                          <button type="submit" disabled={adminLoading}
                            className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-60 font-medium text-sm">
                            {adminLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (newAdmin.id ? 'Update Admin' : 'Create Admin')}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Admins Table List */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b border-gray-100">
                        <th className="px-6 py-4 font-semibold">Administrator</th>
                        <th className="px-6 py-4 font-semibold">Role</th>
                        <th className="px-6 py-4 font-semibold">Assigned City</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {admins.map((admin) => (
                        <tr key={admin._id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center font-bold text-gray-600 shadow-sm border border-white">
                                {admin.name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800 text-sm">{admin.name}</p>
                                <p className="text-xs text-gray-500">{admin.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 text-xs font-bold rounded-full border ${admin.role === 'super_admin'
                              ? 'bg-amber-50 text-amber-700 border-amber-100'
                              : 'bg-blue-50 text-blue-700 border-blue-100'
                              }`}>
                              {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {admin.cityId ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                                {admin.cityId.name || 'Unknown City'}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">All Cities</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`flex items-center gap-1.5 text-xs font-medium ${admin.isActive !== false ? 'text-green-600' : 'text-red-500'}`}>
                              <span className={`w-2 h-2 rounded-full ${admin.isActive !== false ? 'bg-green-500' : 'bg-red-500'}`}></span>
                              {admin.isActive !== false ? 'Active' : 'Blocked'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {admin._id !== profile.id && admin.email !== 'admin@admin.com' && (
                              <div className="flex justify-end gap-2">
                                <button onClick={() => handleEditClick(admin)}
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                  title="Edit Admin">
                                  <FiEdit className="w-4 h-4" />
                                </button>

                                <button onClick={() => handleBlockAdmin(admin._id, admin.isActive !== false)}
                                  className={`p-2 text-gray-400 rounded-lg transition-all ${admin.isActive !== false ? 'hover:text-amber-600 hover:bg-amber-50' : 'hover:text-green-600 hover:bg-green-50'
                                    }`}
                                  title={admin.isActive !== false ? "Block Admin" : "Unblock Admin"}>
                                  {admin.isActive !== false ? <FiLock className="w-4 h-4" /> : <FiUnlock className="w-4 h-4" />}
                                </button>

                                <button onClick={() => handleDeleteAdmin(admin._id, admin.name)}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  title="Delete Admin">
                                  <FiTrash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {admins.length === 0 && (
                        <tr>
                          <td colSpan="4" className="px-6 py-12 text-center text-gray-400">
                            <FiUsers className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No administrators found</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )
        }

        {/* Language Management View */}
        {
          activeView === 'languages' && (
            <motion.div key="languages" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
              className="space-y-6">
              
              {/* Header Bar */}
              <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <FiGlobe className="text-sky-600 w-6 h-6" /> Multi-Language & Regional Localization
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Manage active platform languages for Customer & Vendor applications. Changes reflect immediately.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowAddLanguage(true)}
                    className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-all active:scale-95"
                  >
                    <FiPlus className="w-4 h-4" /> Add New Language
                  </button>
                </div>
              </div>

              {/* Languages Grid - Direct Add/Delete Model */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {languages.map((lang) => {
                  const isPrimary = lang.code === 'en';
                  return (
                    <div
                      key={lang.code}
                      className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all flex items-center justify-between shadow-2xs"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-xl shrink-0">
                          {lang.flag || '🌐'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm sm:text-base font-extrabold text-gray-900 truncate">
                              {lang.nativeName}
                            </h4>
                            <span className="px-1.5 py-0.2 bg-gray-100 text-gray-600 text-[10px] font-black rounded uppercase">
                              {lang.code}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 font-medium truncate mt-0.5">
                            {lang.name}
                          </p>
                        </div>
                      </div>

                      {/* Action: Primary Badge or Delete Button */}
                      {isPrimary ? (
                        <span className="px-2.5 py-1 bg-sky-50 text-sky-700 text-[11px] font-bold rounded-lg border border-sky-100 shrink-0">
                          Primary
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDeleteLanguage(lang.code, lang.name)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all border border-gray-100 hover:border-red-100 shrink-0 cursor-pointer group shadow-2xs"
                          title={`Delete ${lang.name}`}
                        >
                          <FiTrash2 className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Language Modal (Indian Languages Only) */}
              {showAddLanguage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
                  >
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-xl">
                          🇮🇳
                        </div>
                        <div>
                          <h3 className="text-base font-black text-gray-900">Add Indian Regional Language</h3>
                          <p className="text-xs text-gray-500">Select from official scheduled languages & regional dialects</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setShowAddLanguage(false);
                          setIsDropdownOpen(false);
                          setLangSearch('');
                        }}
                        className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 cursor-pointer"
                      >
                        <FiX className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Custom Interactive Dropdown with Live Search */}
                    <div className="relative">
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Select Indian Language from Dropdown
                      </label>
                      
                      {/* Trigger Button */}
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white focus:border-orange-500 text-xs font-bold text-gray-800 outline-none transition-all shadow-2xs cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">🇮🇳</span>
                          <span className="text-gray-700">Choose an Indian language to add...</span>
                        </div>
                        <FiChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-orange-500' : ''}`} />
                      </button>

                      {/* Custom Dropdown Menu with Live Search */}
                      <AnimatePresence>
                        {isDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.98 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 right-0 top-full mt-2 z-30 bg-white rounded-2xl border border-gray-200 shadow-2xl p-2.5 space-y-2 max-h-72 flex flex-col"
                          >
                            {/* Live Search Input */}
                            <div className="relative flex items-center px-1">
                              <FiSearch className="absolute left-3.5 text-gray-400 w-3.5 h-3.5" />
                              <input
                                type="text"
                                value={langSearch}
                                onChange={(e) => setLangSearch(e.target.value)}
                                placeholder="Type to search (e.g. Sanskrit, Maithili, Bhojpuri)..."
                                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white text-xs font-medium outline-none"
                                autoFocus
                              />
                            </div>

                            {/* Scrollable Language List */}
                            <div className="overflow-y-auto max-h-48 space-y-1 p-0.5">
                              {PRESET_INDIAN_LANGUAGES
                                .filter(p => {
                                  const q = langSearch.toLowerCase().trim();
                                  if (!q) return true;
                                  return p.name.toLowerCase().includes(q) || p.nativeName.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
                                })
                                .map((p) => {
                                  const isAlreadyAdded = languages.some(l => l.code === p.code);
                                  return (
                                    <button
                                      key={p.code}
                                      type="button"
                                      disabled={isAlreadyAdded || langLoading}
                                      onClick={() => {
                                        handleQuickAddPreset(p);
                                        setIsDropdownOpen(false);
                                        setLangSearch('');
                                      }}
                                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                                        isAlreadyAdded
                                          ? 'bg-gray-50/70 text-gray-400 cursor-not-allowed opacity-60'
                                          : 'hover:bg-orange-50 hover:text-orange-900 active:scale-[0.99] cursor-pointer text-gray-800'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <span className="text-base">{p.flag}</span>
                                        <div className="min-w-0 flex items-center gap-2">
                                          <span className="text-xs font-black truncate">{p.name}</span>
                                          <span className="text-[11px] font-medium text-orange-700 bg-orange-100/60 px-2 py-0.5 rounded-md">
                                            {p.nativeName}
                                          </span>
                                        </div>
                                      </div>

                                      {isAlreadyAdded ? (
                                        <span className="text-[10px] font-bold text-gray-400 bg-gray-200/60 px-2 py-0.5 rounded-full shrink-0">
                                          Active
                                        </span>
                                      ) : (
                                        <span className="text-[11px] font-bold text-orange-600 shrink-0 flex items-center gap-1">
                                          <FiPlus className="w-3.5 h-3.5" />
                                          Add
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Quick Add 1-Click Badges */}
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-400 mb-2">
                        ⚡ Quick Add (1-Click)
                      </label>
                      <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-2xl border border-gray-100">
                        {PRESET_INDIAN_LANGUAGES.filter(p => !languages.some(l => l.code === p.code)).length === 0 ? (
                          <p className="text-xs text-gray-400 py-3 px-2 text-center w-full">All regional Indian languages are already active!</p>
                        ) : (
                          PRESET_INDIAN_LANGUAGES.filter(p => !languages.some(l => l.code === p.code)).map((preset) => (
                            <button
                              key={preset.code}
                              type="button"
                              disabled={langLoading}
                              onClick={() => handleQuickAddPreset(preset)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-orange-50 border border-gray-200 hover:border-orange-300 text-gray-800 hover:text-orange-700 text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
                            >
                              <span>{preset.flag}</span>
                              <span>{preset.name}</span>
                              <span className="text-[11px] text-gray-400 font-normal">({preset.nativeName})</span>
                              <FiPlus className="w-3.5 h-3.5 text-orange-600 ml-0.5" />
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end pt-3 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddLanguage(false);
                          setIsDropdownOpen(false);
                          setLangSearch('');
                        }}
                        className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </motion.div>
          )
        }
      </AnimatePresence >
    </motion.div >
  );
};
export default AdminSettings;
