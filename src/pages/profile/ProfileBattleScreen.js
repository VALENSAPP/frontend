import { useNavigation, useRoute } from '@react-navigation/native';
import React from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useLanguage } from '../../i18n';
import ProfileBattleHub from '../../components/profile/ProfileBattleHub';
import { useAppTheme } from '../../theme/useApptheme';
import { useThemeContext } from '../../theme/ThemeContext';

export default function ProfileBattleScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const returnTo = route?.params?.returnTo;
  const { profile } = route.params || {};
  const { isBusinessProfile, accent } = useAppTheme(profile);
  const { isDarkMode } = useThemeContext();
  const viewedUserId = route?.params?.viewedUserId || '';
  const isOwner = Boolean(route?.params?.isOwner);
  const title = route?.params?.title || t('profileBattle.defaultTitle', 'My Battles');

  const isBusiness = Boolean(
    isBusinessProfile ||
    profile === 'company' ||
    profile === 'business' ||
    route?.params?.isCompanyProfile
  );

  const handleBack = () => {
    if (route?.params?.returnTo === 'UserProfile') {
      navigation.goBack();
    } else if (route?.params?.returnTo === 'Home') {
      navigation.navigate('ProfileMain', { screen: 'Profile' });
    } else if (route?.params?.returnTo) {
      navigation.navigate(route.params.returnTo);
    } else {
      navigation.goBack();
    }
  };

  const screenBg = isDarkMode
    ? (isBusiness ? '#141009' : '#0F091A')
    : (isBusiness ? '#FAF7F0' : '#F9F8FD');
  const titleColor = isDarkMode
    ? (isBusiness ? '#F5DEB3' : '#FFFFFF')
    : (isBusiness ? '#6B4F1A' : '#2D1152');

  return (
    <View style={[styles.root, { backgroundColor: screenBg }]}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
      />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: screenBg }]} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.headerIconBtn} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={titleColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: titleColor }]}>{title}</Text>
          <View style={styles.headerIconBtn} />
        </View>

        <ProfileBattleHub
          viewedUserId={String(viewedUserId)}
          isOwner={isOwner}
          openBattleRoute="OpenBattle"
          profile={profile}
          returnTo={returnTo}
          isCompanyProfile={isBusiness}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginBottom: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
  },
});
