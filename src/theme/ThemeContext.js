import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import {
  resolveTheme,
  normalizeProfileType,
  isBusinessProfileType,
  normalTheme,
  businessTheme,
  normalDarkTheme,
  businessDarkTheme,
} from './theme';

export const DARK_MODE_STORAGE_KEY = 'darkMode';

const ThemeContext = createContext();

const getSystemIsDark = () => Appearance.getColorScheme() === 'dark';

const persistDarkMode = async value => {
  try {
    await AsyncStorage.setItem(DARK_MODE_STORAGE_KEY, JSON.stringify(!!value));
  } catch (error) {
    console.warn('Failed to save theme preference:', error);
  }
};

export const ThemeProvider = ({ children, activeProfile: propActiveProfile }) => {
  const reduxProfile = useSelector(state => state.userProfile?.userProfile);
  const [storedProfile, setStoredProfile] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(getSystemIsDark);
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('profile')
      .then(type => {
        if (type) setStoredProfile(type);
      })
      .catch(() => {});
  }, []);

  // Primary source of truth is Redux state, with graceful fallbacks
  const activeProfile = useMemo(() => {
    if (reduxProfile !== undefined && reduxProfile !== null && reduxProfile !== '') {
      return normalizeProfileType(reduxProfile);
    }
    if (propActiveProfile !== undefined && propActiveProfile !== null && propActiveProfile !== '') {
      return normalizeProfileType(propActiveProfile);
    }
    if (storedProfile) {
      return normalizeProfileType(storedProfile);
    }
    return 'user';
  }, [reduxProfile, propActiveProfile, storedProfile]);

  const isBusinessProfile = activeProfile === 'company';

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const systemDark = getSystemIsDark();
        setIsDarkMode(systemDark);
        await persistDarkMode(systemDark);
      } catch (error) {
        console.warn('Failed to load theme preference:', error);
      } finally {
        setIsThemeLoaded(true);
      }
    };

    loadTheme();
  }, []);

  // Phone Display dark/light change → update theme in real-time
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      const nextDark = colorScheme === 'dark';
      setIsDarkMode(nextDark);
      persistDarkMode(nextDark);
    });
    return () => subscription.remove();
  }, []);

  const toggleDarkMode = useCallback(async () => {
    const value = !isDarkMode;
    setIsDarkMode(value);
    await persistDarkMode(value);
  }, [isDarkMode]);

  const theme = useMemo(
    () => resolveTheme(activeProfile, isDarkMode),
    [activeProfile, isDarkMode],
  );

  const switchTheme = useCallback(profileType => {
    // Kept for API compatibility; profile switching is driven by Redux.
    void profileType;
  }, []);

  const contextValue = useMemo(
    () => ({
      theme,
      isDarkMode,
      toggleDarkMode,
      isThemeLoaded,
      activeProfile,
      isBusinessProfile,
      switchTheme,
    }),
    [theme, isDarkMode, toggleDarkMode, isThemeLoaded, activeProfile, isBusinessProfile, switchTheme],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: normalTheme,
      isDarkMode: false,
      toggleDarkMode: () => {},
      isThemeLoaded: true,
      activeProfile: 'user',
      isBusinessProfile: false,
      switchTheme: () => {},
    };
  }
  return context;
};
