/**
 * VALENS Centralized Theme Tokens & Theme System
 *
 * Supports:
 * 1. Personal Account – Purple Theme (Primary: #402090, Light lavender bg: #FAF7FD, Cards: #FFFFFF, subtle lavender border: #EAE4F5)
 * 2. Business Account – Gold Theme (Primary/Headings: #CBA257, Light gold bg: #FAF7F0, Cards: #FFFFFF, Borders: #E8D9BD)
 *
 * Each theme defines standard tokens:
 * - primary, secondary, background, screenBackground, cardBackground, borderColor,
 *   textPrimary, textSecondary, buttonBackground, buttonText, iconColor, activeColor, inactiveColor.
 *
 * Full backward-compatibility with legacy keys:
 * - bg, text, card, border, mutedText, accent, icon.
 */

// ─── Profile Type Helpers ───────────────────────────────────────────────────

export const isBusinessProfileType = profileValue => {
  if (!profileValue) return false;
  let raw = profileValue;
  if (typeof profileValue === 'object') {
    raw =
      profileValue.profile ||
      profileValue.profileType ||
      profileValue.type ||
      profileValue.role ||
      '';
  }
  const normalized = String(raw || '').trim().toLowerCase();
  return normalized === 'company' || normalized === 'business';
};

export const normalizeProfileType = profileValue => {
  return isBusinessProfileType(profileValue) ? 'company' : 'user';
};

// ─── Theme Definitions ──────────────────────────────────────────────────────

export const PERSONAL_THEME = Object.freeze({
  // Required Color Tokens
  primary: '#402090',
  secondary: '#6B46C1',
  background: '#FAF5FE',
  screenBackground: '#FAF5FE',
  cardBackground: '#FFFFFF',
  borderColor: '#EAE4F5',
  textPrimary: '#402090',
  textSecondary: '#7A7289',
  buttonBackground: '#402090',
  buttonText: '#FFFFFF',
  iconColor: '#402090',
  activeColor: '#402090',
  inactiveColor: '#A59DB5',

  // Semantic & Backwards-Compatibility Aliases
  bg: '#FAF5FE',
  text: '#402090',
  card: '#FFFFFF',
  border: '#EAE4F5',
  mutedText: '#7A7289',
  accent: '#402090',
  icon: '#402090',
  accentLight: '#F0EAFF',
  heading: '#402090',
});

export const BUSINESS_THEME = Object.freeze({
  // Required Color Tokens
  primary: '#CBA257',
  secondary: '#8C8270',
  background: '#FAF7F0',
  screenBackground: '#FAF7F0',
  cardBackground: '#FFFFFF',
  borderColor: '#E8D9BD',
  textPrimary: '#CBA257',
  textSecondary: '#8C8270',
  buttonBackground: '#CBA257',
  buttonText: '#FFFFFF',
  iconColor: '#CBA257',
  activeColor: '#CBA257',
  inactiveColor: '#C4B79E',

  // Semantic & Backwards-Compatibility Aliases
  bg: '#FAF7F0',
  text: '#CBA257',
  card: '#FFFFFF',
  border: '#E8D9BD',
  mutedText: '#8C8270',
  accent: '#CBA257',
  icon: '#CBA257',
  accentLight: '#FDFBF7',
  heading: '#CBA257',
});

export const PERSONAL_DARK_THEME = Object.freeze({
  primary: '#7C4DFF',
  secondary: '#9E77ED',
  background: '#121212',
  screenBackground: '#121212',
  cardBackground: '#1E1E1E',
  borderColor: '#2E2838',
  textPrimary: '#EDE7F6',
  textSecondary: '#A59DB5',
  buttonBackground: '#402090',
  buttonText: '#FFFFFF',
  iconColor: '#C4B5FD',
  activeColor: '#A78BFA',
  inactiveColor: '#6E6480',

  bg: '#121212',
  text: '#EDE7F6',
  card: '#1E1E1E',
  border: '#2E2838',
  mutedText: '#A59DB5',
  accent: '#7C4DFF',
  icon: '#C4B5FD',
  accentLight: '#261C38',
  heading: '#EDE7F6',
});

export const BUSINESS_DARK_THEME = Object.freeze({
  primary: '#CBA257',
  secondary: '#B89344',
  background: '#121212',
  screenBackground: '#121212',
  cardBackground: '#1E1E1E',
  borderColor: '#332D22',
  textPrimary: '#CBA257',
  textSecondary: '#A69C8B',
  buttonBackground: '#CBA257',
  buttonText: '#FFFFFF',
  iconColor: '#CBA257',
  activeColor: '#CBA257',
  inactiveColor: '#6E6659',

  bg: '#121212',
  text: '#CBA257',
  card: '#1E1E1E',
  border: '#332D22',
  mutedText: '#A69C8B',
  accent: '#CBA257',
  icon: '#CBA257',
  accentLight: '#2A2418',
  heading: '#CBA257',
});

// ─── Backward-Compatible Named Exports ──────────────────────────────────────

export const normalTheme = PERSONAL_THEME;
export const businessTheme = BUSINESS_THEME;
export const normalDarkTheme = PERSONAL_DARK_THEME;
export const businessDarkTheme = BUSINESS_DARK_THEME;

// ─── Theme Resolution Engine ────────────────────────────────────────────────

export const THEMES = Object.freeze({
  personal: Object.freeze({
    light: PERSONAL_THEME,
    dark: PERSONAL_DARK_THEME,
  }),
  business: Object.freeze({
    light: BUSINESS_THEME,
    dark: BUSINESS_DARK_THEME,
  }),
});

/**
 * Resolves the appropriate theme object based on profile type and dark mode preference.
 * @param {string|object} profileType - 'normal', 'user', 'company', 'business', or profile object
 * @param {boolean} isDarkMode
 * @returns {object} Themed color tokens object
 */
export const resolveTheme = (profileType, isDarkMode = false) => {
  const isCompany = isBusinessProfileType(profileType);
  const category = isCompany ? 'business' : 'personal';
  const mode = isDarkMode ? 'dark' : 'light';
  return THEMES[category][mode];
};
