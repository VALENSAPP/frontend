import { useThemeContext } from './ThemeContext';

import {
  businessTheme,
  businessDarkTheme,
  normalTheme,
  normalDarkTheme,
} from './theme';

const resolveTheme = (profileType, isDarkMode) => {
  const normalized =
    typeof profileType === 'string' ? profileType.toLowerCase().trim() : '';

  if (normalized === 'company' || normalized === 'business') {
    return isDarkMode ? businessDarkTheme : businessTheme;
  }

  if (normalized === 'user' || normalized === 'normal') {
    return isDarkMode ? normalDarkTheme : normalTheme;
  }

  return null;
};

export const useAppTheme = profileTypeOverride => {
  const { isDarkMode, theme: contextTheme } = useThemeContext();

  const normalizedProfileType =
    typeof profileTypeOverride === 'string'
      ? profileTypeOverride.toLowerCase().trim()
      : undefined;
  // Map legacy 'normal' → 'user', 'business' → 'company'
  const resolvedProfileType =
    normalizedProfileType === 'normal'
      ? 'user'
      : normalizedProfileType === 'business'
        ? 'company'
        : normalizedProfileType;

  const resolvedTheme =
    resolveTheme(resolvedProfileType, isDarkMode) ?? contextTheme;

  return {
    ...resolvedTheme,
    bgStyle: {
      backgroundColor: resolvedTheme.bg,
    },
    textStyle: {
      color: resolvedTheme.text,
    },
    cardStyle: {
      backgroundColor: resolvedTheme.card,
    },
    borderStyle: {
      borderColor: resolvedTheme.border,
    },
    mutedTextStyle: {
      color: resolvedTheme.mutedText,
    },
    accentStyle: {
      color: resolvedTheme.accent,
    },
    buttonBgStyle: {
      backgroundColor: resolvedTheme.accent,
    },
  };
};
