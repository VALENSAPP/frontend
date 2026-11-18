import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from './useApptheme';
import { useThemeContext } from './ThemeContext';
import { isBusinessProfileType } from './theme';

/**
 * Account-aware theme hook:
 * Provides theme tokens and `isBusinessProfile` indicator, synchronized with the active account.
 * Primary source of truth is Redux (`state.userProfile.userProfile`).
 *
 * @param {boolean|string|object} [override] - Optional explicit override
 * @returns {object} { isBusinessProfile, ...themeTokens, ...styleHelpers }
 */
export function useBusinessProfileTheme(override) {
  const reduxProfile = useSelector(state => state.userProfile?.userProfile);
  const context = useThemeContext();
  const contextIsBusiness = context?.isBusinessProfile;

  const [storedProfile, setStoredProfile] = useState('');

  const loadProfileType = useCallback(async () => {
    try {
      const type = await AsyncStorage.getItem('profile');
      if (type) setStoredProfile(type);
    } catch (e) {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfileType();
    }, [loadProfileType]),
  );

  useEffect(() => {
    loadProfileType();
  }, [loadProfileType]);

  // Determine active profile state:
  let isBusiness = false;

  if (typeof override === 'boolean') {
    isBusiness = override;
  } else if (typeof override === 'string' || (override && typeof override === 'object')) {
    isBusiness = isBusinessProfileType(override);
  } else if (reduxProfile !== undefined && reduxProfile !== null && reduxProfile !== '') {
    // Redux is primary source of truth
    isBusiness = isBusinessProfileType(reduxProfile);
  } else if (typeof contextIsBusiness === 'boolean') {
    isBusiness = contextIsBusiness;
  } else if (storedProfile) {
    isBusiness = isBusinessProfileType(storedProfile);
  }

  const theme = useAppTheme(isBusiness ? 'company' : 'user');

  return {
    isBusinessProfile: isBusiness,
    ...theme,
  };
}
