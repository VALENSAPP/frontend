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
  normalTheme,
  normalDarkTheme,
  businessTheme,
  businessDarkTheme,
} from './theme';

export const DARK_MODE_STORAGE_KEY = 'darkMode';

const ThemeContext = createContext();

const getSystemIsDark = () => Appearance.getColorScheme() === 'dark';

const resolveProfileTheme = (profileType, isDarkMode) => {
  const normalized = String(profileType || '').trim().toLowerCase();
  const isCompany = normalized === 'company' || normalized === 'business';

  if (isCompany) {
    return isDarkMode ? businessDarkTheme : businessTheme;
  }

  return isDarkMode ? normalDarkTheme : normalTheme;
};

const persistDarkMode = async value => {
  try {
    await AsyncStorage.setItem(DARK_MODE_STORAGE_KEY, JSON.stringify(!!value));
  } catch (error) {
    console.warn('Failed to save theme preference:', error);
  }
};

export const ThemeProvider = ({ children }) => {
  const reduxProfile = useSelector(state => state.userProfile.userProfile);
  const [storedProfile, setStoredProfile] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(getSystemIsDark);
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('profile').then(type => {
      if (type) setStoredProfile(type);
    }).catch(() => {});
  }, []);

  const activeProfile = useMemo(() => {
    const raw = (reduxProfile && reduxProfile !== 'normal') ? reduxProfile : storedProfile;
    const normalized = String(raw || '').trim().toLowerCase();
    return (normalized === 'company' || normalized === 'business') ? 'company' : 'user';
  }, [reduxProfile, storedProfile]);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        // Start from phone Settings (iOS + Android), then keep switch in sync.
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

  // Phone Display dark/light change → update switch + app theme.
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
    () => resolveProfileTheme(activeProfile, isDarkMode),
    [activeProfile, isDarkMode],
  );

  const switchTheme = useCallback(profileType => {
    // Kept for API compatibility with dev branch; profile is driven by Redux.
    void profileType;
  }, []);

  const contextValue = useMemo(
    () => ({
      theme,
      isDarkMode,
      toggleDarkMode,
      isThemeLoaded,
      activeProfile,
      switchTheme,
    }),
    [theme, isDarkMode, toggleDarkMode, isThemeLoaded, activeProfile, switchTheme],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => useContext(ThemeContext);
