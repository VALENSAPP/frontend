import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import { useAppTheme } from '../theme/useApptheme';
import { navigate as rootNavigate } from '../navigations/RootNavigation';

export const normalizeProfileType = profile => {
  const normalized = String(profile || '').trim().toLowerCase();
  if (normalized === 'company' || normalized === 'business') return 'company';
  if (normalized === 'user' || normalized === 'normal') return 'user';
  return normalized || undefined;
};

export const useResolvedCompanyProfile = () => {
  const reduxProfile = useSelector(state => state?.userProfile?.userProfile);
  const [storedProfile, setStoredProfile] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('profile').then(value => {
      if (value) setStoredProfile(value);
    });
  }, []);

  const resolvedProfile = String(
    reduxProfile && reduxProfile !== 'normal' ? reduxProfile : storedProfile || 'user',
  ).trim().toLowerCase();

  return resolvedProfile === 'company' || resolvedProfile === 'business';
};

export const useTargetClosetScreen = () => {
  const isCompany = useResolvedCompanyProfile();
  return isCompany ? 'Shop' : 'MyCloset';
};

export const navigateToTargetClosetScreen = (navigation, targetScreen, extraParams = {}) => {
  if (!navigation) return;
  const resolvedTarget = targetScreen || 'MyCloset';
  const targetParams = Object.keys(extraParams).length > 0 ? { screen: resolvedTarget, params: extraParams } : { screen: resolvedTarget };

  try {
    navigation.navigate('wallet', targetParams);
    return;
  } catch (_e) {}

  try {
    const parent = navigation.getParent?.();
    if (parent) {
      parent.navigate('wallet', targetParams);
      return;
    }
  } catch (_e) {}

  try {
    navigation.navigate('MainApp', {
      screen: 'wallet',
      params: targetParams,
    });
  } catch (_e) {}
};

export const getClosetRouteProfile = route => {
  if (
    (route?.params?.entryPoint === 'battleExplore' || route?.params?.entryPoint === 'search') &&
    route?.params?.profileType
  ) {
    return normalizeProfileType(route.params.profileType);
  }
  return normalizeProfileType(
    route?.params?.sellerProfile ||
    route?.params?.seller?.profile ||
    route?.params?.profileType ||
    route?.params?.profile ||
    route?.params?.userProfile,
  );
};

export const useClosetTheme = route => {
  const profileType = getClosetRouteProfile(route);
  return useAppTheme(profileType || 'user');
};

export const buildClosetReturnTo = ({
  isOwnProfile = true,
  sellerProfile,
  sellerId,
  fromWallet = false,
} = {}) => {
  const tabKey = normalizeProfileType(sellerProfile) === 'company' ? 'shop' : 'closet';

  if (fromWallet) {
    return {
      tab: 'wallet',
      screen: tabKey === 'shop' ? 'Shop' : 'MyCloset',
    };
  }

  if (!isOwnProfile && sellerId) {
    return {
      tab: 'HomeMain',
      screen: 'UsersProfile',
      params: { userId: sellerId, initialTab: tabKey },
    };
  }

  return {
    tab: 'ProfileMain',
    screen: 'Profile',
    params: { initialTab: tabKey },
  };
};

export const buildClosetNavContext = ({
  isOwnProfile = true,
  sellerProfile,
  sellerId,
  closetId,
  seller,
  fromWallet = false,
} = {}) => {
  const normalizedProfile = normalizeProfileType(sellerProfile);
  return {
    isOwnProfile,
    sellerProfile: normalizedProfile,
    sellerId,
    closetId,
    seller,
    returnTo: buildClosetReturnTo({
      isOwnProfile,
      sellerProfile: normalizedProfile,
      sellerId,
      fromWallet,
    }),
  };
};

export const withClosetNavParams = (route, params = {}) => {
  const sellerProfile =
    getClosetRouteProfile(route) ||
    normalizeProfileType(params?.sellerProfile || params?.seller?.profile || params?.profileType);

  const nextSeller = params?.seller ?? route?.params?.seller;
  const sellerWithProfile =
    nextSeller && sellerProfile
      ? { ...nextSeller, profile: nextSeller.profile || sellerProfile }
      : nextSeller;

  return {
    ...route?.params,
    ...params,
    seller: sellerWithProfile,
    ...(sellerProfile
      ? { sellerProfile, profileType: sellerProfile }
      : {}),
  };
};

export const themeGradient = accent => [accent, accent];

export const navigateClosetReturn = (navigation, returnTo) => {
  if (!navigation) return;

  if (!returnTo) {
    if (navigation.canGoBack?.()) navigation.goBack();
    return;
  }

  if (typeof returnTo === 'string') {
    if (returnTo === 'SearchHome') {
      const tabNav = navigation.getParent?.() || navigation;
      try {
        tabNav.navigate('Search', { screen: 'SearchHome' });
        return;
      } catch (_error) {}
      if (navigation.canGoBack?.()) navigation.goBack();
      return;
    }
    navigation.navigate(returnTo);
    return;
  }

  const { tab, screen, params } = returnTo;
  const tabNav = navigation.getParent?.() || navigation;

  if (tab && screen) {
    try {
      tabNav.navigate(tab, { screen, params });
      return;
    } catch (_error) {}
    try {
      navigation.navigate(tab, { screen, params });
      return;
    } catch (_error) {}
    if (navigation.canGoBack?.()) navigation.goBack();
    return;
  }

  if (screen) {
    if (screen === 'SearchHome') {
      try {
        tabNav.navigate('Search', { screen: 'SearchHome', params: params || {} });
        return;
      } catch (_error) {}
      if (navigation.canGoBack?.()) navigation.goBack();
      return;
    }
    try {
      navigation.navigate(screen, params || {});
      return;
    } catch (_error) {}
  }

  if (navigation.canGoBack?.()) navigation.goBack();
};

export const sanitizeClosetNavParams = params => {
  if (!params || typeof params !== 'object') return {};
  const { ...clean } = params;
  if (clean.returnTo && typeof clean.returnTo === 'object' && clean.returnTo.params) {
    const { returnTo: _nestedReturnTo, ...cleanNestedParams } = clean.returnTo.params;
    clean.returnTo = {
      ...clean.returnTo,
      params: cleanNestedParams,
    };
  }
  if (clean.isOwnProfile !== undefined) {
    clean.isOwnProfile = clean.isOwnProfile === true;
  }
  if (clean.returnToProfile && typeof clean.returnToProfile === 'object') {
    clean.returnToProfile = {
      ...clean.returnToProfile,
      isOwnProfile: clean.returnToProfile.isOwnProfile === true,
    };
  }
  return clean;
};

const navigatorHasRoute = (nav, routeName) => {
  if (!nav) return false;
  try {
    const state = nav.getState?.();
    const routeNames = state?.routeNames;
    if (Array.isArray(routeNames)) {
      return routeNames.includes(routeName);
    }
  } catch (_e) {}
  return false;
};

export const navigateToBattleLive = (navigation, params = {}) => {
  const battleParams = sanitizeClosetNavParams(params);

  // 1. If navigation (or an ancestor) directly has 'BattleLive' in its route list, navigate to it directly
  let targetNav = navigation;
  while (targetNav) {
    if (navigatorHasRoute(targetNav, 'BattleLive')) {
      try {
        targetNav.navigate('BattleLive', battleParams);
        return true;
      } catch (_e) {}
    }
    targetNav = targetNav.getParent?.();
  }

  // 2. If 'BattleLive' is not registered on this stack directly, check if any parent or current navigator
  // has 'ProfileMain' (ProfileStack hosts BattleLive and all closet battle screens).
  targetNav = navigation;
  while (targetNav) {
    if (navigatorHasRoute(targetNav, 'ProfileMain')) {
      try {
        targetNav.navigate('ProfileMain', {
          screen: 'BattleLive',
          params: battleParams,
        });
        return true;
      } catch (_e) {}
    }
    targetNav = targetNav.getParent?.();
  }

  // 3. Fallback on navigation.navigate('ProfileMain', ...)
  if (navigation?.navigate) {
    try {
      navigation.navigate('ProfileMain', {
        screen: 'BattleLive',
        params: battleParams,
      });
      return true;
    } catch (_error) {}
  }

  // 4. Fallback on navigation.getParent()
  try {
    const parent = navigation?.getParent?.();
    if (parent?.navigate) {
      parent.navigate('ProfileMain', {
        screen: 'BattleLive',
        params: battleParams,
      });
      return true;
    }
  } catch (_error) {}

  // 5. Drawer wrapper check: MainApp -> ProfileMain -> BattleLive
  targetNav = navigation;
  while (targetNav) {
    if (navigatorHasRoute(targetNav, 'MainApp')) {
      try {
        targetNav.navigate('MainApp', {
          screen: 'ProfileMain',
          params: {
            screen: 'BattleLive',
            params: battleParams,
          },
        });
        return true;
      } catch (_e) {}
    }
    targetNav = targetNav.getParent?.();
  }

  // 6. Ultimate fallback: root navigation container ref
  try {
    rootNavigate('ProfileMain', {
      screen: 'BattleLive',
      params: battleParams,
    });
    return true;
  } catch (_e) {}

  return false;
};
