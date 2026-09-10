/**
 * Centralized Theme Colors Configuration
 * Primary Rust/Crimson Red theme with Light/Dark system support
 */

// DoorMeets Core Brand Colors
const brand = {
  primary: '#B33A35',
  rust: '#B33A35',
  rustDark: '#9E2E2A',
  rustLight: '#D56C67',
  deepRust: '#9E2E2A',
  coralRust: '#D56C67',
  // Backward compatibility mappings
  teal: '#B33A35',
  yellow: '#D68F35',
  orange: '#D56C67',
  gradient: 'linear-gradient(135deg, #B33A35 0%, #D56C67 50%, #9E2E2A 100%)',
  conic: 'conic-gradient(from 0deg, #B33A35, #D56C67, #9E2E2A, #B33A35)'
};

// Status and Alert Colors
const statusColors = {
  success: '#22C55E',
  successDark: '#0F8A5F',
  warning: '#F59E0B',
  warningStar: '#FBBF24',
  error: '#EF4444',
  info: '#3B82F6',
  electricianBlue: '#2874F0'
};

// Category Pastel Backgrounds (Home Page Grid)
const categoryPastels = {
  yellow: { bg: '#FEFBE8', text: '#854D0E', darkBg: 'rgba(253, 230, 0, 0.08)' },
  purple: { bg: '#FAE8FF', text: '#86198F', darkBg: 'rgba(168, 85, 247, 0.08)' },
  rose: { bg: '#FFE4E6', text: '#9F1239', darkBg: 'rgba(244, 63, 94, 0.08)' },
  red: { bg: '#FFF1F2', text: '#991B1B', darkBg: 'rgba(239, 68, 68, 0.08)' },
  green: { bg: '#F0FDF4', text: '#166534', darkBg: 'rgba(34, 197, 94, 0.08)' },
  sky: { bg: '#E0F2FE', text: '#075985', darkBg: 'rgba(14, 165, 233, 0.08)' },
  indigo: { bg: '#EEF2FF', text: '#3730A3', darkBg: 'rgba(99, 102, 241, 0.08)' },
  amber: { bg: '#FEF3C7', text: '#92400E', darkBg: 'rgba(245, 158, 11, 0.08)' },
  blue: { bg: '#EFF6FF', text: '#1E40AF', darkBg: 'rgba(59, 130, 246, 0.08)' }
};

// User Theme Colors
const userTheme = {
  backgroundGradient: 'linear-gradient(180deg, #FFF5F5 0%, #FFFFFF 20%)',
  gradient: brand.gradient,
  headerGradient: 'linear-gradient(135deg, #B33A35 0%, #D56C67 50%, #9E2E2A 100%)',
  headerBg: '#FFFFFF',
  button: brand.primary,
  icon: brand.primary,
  cardShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
  cardBorder: '1px solid #E5E7EB',
  brand: brand,
  status: statusColors,
  pastels: categoryPastels
};

// Vendor Theme Colors
const vendorTheme = {
  backgroundGradient: 'linear-gradient(to bottom, rgba(179, 58, 53, 0.03) 0%, rgba(213, 108, 103, 0.02) 10%, #ffffff 20%)',
  gradient: brand.gradient,
  headerGradient: brand.primary,
  button: brand.primary,
  icon: brand.primary,
  brand: brand
};

// Admin Theme Colors
const adminTheme = {
  backgroundGradient: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)',
  gradient: brand.gradient,
  headerGradient: '#0F172A',
  button: '#2563EB',
  icon: '#2563EB',
  brand: brand
};

const themeColors = userTheme;

export { userTheme, vendorTheme, adminTheme, brand, statusColors, categoryPastels };
export default themeColors;
