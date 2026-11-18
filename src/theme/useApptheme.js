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

  let resolvedTheme = null;

  if (profileTypeOverride !== undefined && profileTypeOverride !== null) {
    const isCompany = isBusinessProfileType(profileTypeOverride);
    resolvedTheme = resolveTheme(isCompany ? 'company' : 'user', isDarkMode);
  } else {
    resolvedTheme = contextTheme || resolveTheme(activeProfile, isDarkMode) || normalTheme;
  }

  return {
    ...resolvedTheme,
    bgStyle: {
      backgroundColor: resolvedTheme.screenBackground || resolvedTheme.bg,
    },
    textStyle: {
      color: resolvedTheme.textPrimary || resolvedTheme.text,
    },
    cardStyle: {
      backgroundColor: resolvedTheme.cardBackground || resolvedTheme.card,
    },
    borderStyle: {
      borderColor: resolvedTheme.borderColor || resolvedTheme.border,
    },
    mutedTextStyle: {
      color: resolvedTheme.textSecondary || resolvedTheme.mutedText,
    },
    accentStyle: {
      color: resolvedTheme.primary || resolvedTheme.accent,
    },
    buttonBgStyle: {
      backgroundColor: resolvedTheme.buttonBackground || resolvedTheme.accent,
    },
  };
};
