import { useThemeContext } from './ThemeContext';
import {
  resolveTheme,
  normalTheme,
  isBusinessProfileType,
} from './theme';

/**
 * Hook providing access to the current or overridden theme tokens and helper styles.
 *
 * @param {string|object} [profileTypeOverride] - Optional profile override ('company', 'business', 'user', 'normal')
 * @returns {object} Theme tokens + backward-compatible helper styles
 */
export const useAppTheme = profileTypeOverride => {
  const context = useThemeContext();
  const {
    isDarkMode = false,
    theme: contextTheme,
    activeProfile = 'user',
  } = context || {};

  let resolvedProfileType = activeProfile || 'user';
  if (profileTypeOverride !== undefined && profileTypeOverride !== null) {
    resolvedProfileType = isBusinessProfileType(profileTypeOverride) ? 'company' : 'user';
  }

  let resolvedTheme = null;
  if (profileTypeOverride !== undefined && profileTypeOverride !== null) {
    resolvedTheme = resolveTheme(resolvedProfileType, isDarkMode);
  } else {
    resolvedTheme = contextTheme || resolveTheme(activeProfile, isDarkMode) || normalTheme;
  }

  const isBusinessProfile = resolvedProfileType === 'company';

  return {
    ...resolvedTheme,
    isDarkMode: !!isDarkMode,
    activeProfile: resolvedProfileType,
    isBusinessProfile,
    bgStyle: {
      backgroundColor: resolvedTheme?.screenBackground || resolvedTheme?.bg,
    },
    textStyle: {
      color: resolvedTheme?.textPrimary || resolvedTheme?.text,
    },
    cardStyle: {
      backgroundColor: resolvedTheme?.cardBackground || resolvedTheme?.card,
    },
    borderStyle: {
      borderColor: resolvedTheme?.borderColor || resolvedTheme?.border,
    },
    mutedTextStyle: {
      color: resolvedTheme?.textSecondary || resolvedTheme?.mutedText,
    },
    accentStyle: {
      color: resolvedTheme?.primary || resolvedTheme?.accent,
    },
    buttonBgStyle: {
      backgroundColor: resolvedTheme?.buttonBackground || resolvedTheme?.accent,
    },
  };
};
