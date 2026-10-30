import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Svg, { Ellipse, Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useToast } from 'react-native-toast-notifications';
import { useLanguage } from '../../i18n';
import { useThemeContext } from '../../theme/ThemeContext';
import { showToastMessage } from '../../components/displaytoastmessage';

const NOTIFY_KEY = 'servicesComingSoonNotifyMe';
const HERO_FLY = require('../../assets/icons/pngicons/welcome.png');

const OFFERINGS = [
  { key: 'mentorships', icon: 'school-outline' },
  { key: 'consultations', icon: 'chatbubble-ellipses-outline' },
  { key: 'appointments', icon: 'calendar-outline' },
  { key: 'events', icon: 'ticket-outline' },
  { key: 'packages', icon: 'gift-outline' },
];

const FLOATING_ICONS = [
  { icon: 'school-outline', style: { top: 2, right: 10 } },
  { icon: 'chatbubble-ellipses-outline', style: { top: 58, left: 0 } },
  { icon: 'calendar-outline', style: { top: 8, left: 46 } },
  { icon: 'ticket-outline', style: { top: 78, right: -4 } },
  { icon: 'gift-outline', style: { bottom: 6, right: 36 } },
];

const Sparkle = ({ style, size = 10, color = '#C4B5FD' }) => (
  <Ionicons name="sparkles" size={size} color={color} style={style} />
);

export default function ServicesComingSoon() {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const toast = useToast();
  const { isDarkMode } = useThemeContext();
  const { width } = useWindowDimensions();
  const [notified, setNotified] = useState(false);

  const colors = useMemo(
    () =>
      isDarkMode
        ? {
            bg: ['#1A1228', '#241536', '#1A1228'],
            surface: '#2A1C40',
            card: '#2C2044',
            launch: '#32224C',
            title: '#F3E8FF',
            body: '#C4B5D6',
            muted: '#A78BBE',
            iconBg: '#3B2760',
            wave: '#4C1D95',
            wave2: '#2E1064',
            headerIcon: '#EDE4FF',
          }
        : {
            bg: ['#FBFAFF', '#F4ECFF', '#EDE4FE'],
            surface: '#FFFFFF',
            card: '#FFFFFF',
            launch: '#F3EAFF',
            title: '#2A1258',
            body: '#5B4A7A',
            muted: '#7A6A94',
            iconBg: '#EFE6FF',
            wave: '#D8C4F6',
            wave2: '#C4A7F0',
            headerIcon: '#2A1258',
          },
    [isDarkMode],
  );

  useEffect(() => {
    AsyncStorage.getItem(NOTIFY_KEY).then(value => {
      setNotified(value === 'true');
    });
  }, []);

  const handleNotify = useCallback(async () => {
    const next = !notified;
    setNotified(next);
    await AsyncStorage.setItem(NOTIFY_KEY, String(next));
    showToastMessage(
      toast,
      'success',
      next
        ? t('servicesComingSoon.notifySuccess')
        : t('servicesComingSoon.notifyRemoved'),
    );
  }, [notified, t, toast]);

  const handleInfo = useCallback(() => {
    Alert.alert(
      t('servicesComingSoon.header'),
      t('servicesComingSoon.infoMessage'),
    );
  }, [t]);

  const waveWidth = Math.max(width, 360);

  return (
    <LinearGradient colors={colors.bg} style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.headerBtn, { backgroundColor: colors.surface }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={22} color={colors.headerIcon} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleInfo}
            style={[styles.headerBtn, { backgroundColor: colors.surface }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="information-circle-outline"
              size={22}
              color={colors.headerIcon}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.heroRow}>
            <View style={styles.heroCopy}>
              <View style={styles.pillWrap}>
                <Sparkle style={styles.pillSparkleLeft} size={12} color="#A78BFA" />
                <LinearGradient
                  colors={['#7C3AED', '#A855F7', '#C026D3']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.comingSoonPill}
                >
                  <Ionicons name="megaphone" size={13} color="#FFFFFF" />
                  <Text style={styles.comingSoonText} numberOfLines={1}>
                    {t('servicesComingSoon.comingSoon')}
                  </Text>
                </LinearGradient>
                <Sparkle style={styles.pillSparkleRight} size={11} color="#E879F9" />
              </View>
              <Text style={[styles.heroTitle, { color: colors.title }]}>
                {t('servicesComingSoon.headline')}
              </Text>
              <Text style={[styles.heroBody, { color: colors.body }]}>
                {t('servicesComingSoon.body')}
              </Text>
            </View>

            <View style={styles.heroArt}>
              <Svg width={168} height={176} style={styles.orbit}>
                <Ellipse
                  cx="86"
                  cy="92"
                  rx="62"
                  ry="58"
                  stroke="#C4B5FD"
                  strokeWidth="2"
                  strokeDasharray="5 7"
                  fill="none"
                  opacity={0.55}
                  transform="rotate(-18 86 92)"
                />
              </Svg>
              {FLOATING_ICONS.map(item => (
                <View
                  key={item.icon}
                  style={[
                    styles.floatIcon,
                    { backgroundColor: colors.surface },
                    item.style,
                  ]}
                >
                  <Ionicons name={item.icon} size={16} color="#7C3AED" />
                </View>
              ))}
              <View style={styles.bagWrap}>
                <View style={styles.bagHandle} />
                <LinearGradient
                  colors={['#DDD6FE', '#A78BFA', '#7C3AED']}
                  start={{ x: 0.15, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={styles.bag}
                >
                  <View style={styles.bagFlap} />
                  <View style={styles.bagShine} />
                  <Image source={HERO_FLY} style={styles.bagFly} resizeMode="contain" />
                </LinearGradient>
              </View>
              <Sparkle style={styles.artSparkle} size={14} color="#C4B5FD" />
            </View>
          </View>

          <View style={[styles.launchCard, { backgroundColor: colors.launch }]}>
            <View style={styles.launchLeft}>
              <View style={[styles.launchIcon, { backgroundColor: colors.surface }]}>
                <Ionicons name="calendar-outline" size={22} color="#7C3AED" />
              </View>
              <View style={styles.launchCopy}>
                <Text style={[styles.launchTitle, { color: colors.title }]}>
                  {t('servicesComingSoon.launchingTitle')}
                </Text>
                <Text style={[styles.launchSubtitle, { color: colors.muted }]}>
                  {t('servicesComingSoon.launchingSubtitle')}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleNotify}
              activeOpacity={0.85}
              style={styles.notifyTouchable}
            >
              <LinearGradient
                colors={notified ? ['#5B21B6', '#4C1D95'] : ['#5B21B6', '#6D28D9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.notifyBtn}
              >
                <Ionicons
                  name={notified ? 'notifications' : 'notifications-outline'}
                  size={14}
                  color="#FFFFFF"
                />
                <Text style={styles.notifyText} numberOfLines={1}>
                  {notified
                    ? t('servicesComingSoon.notified')
                    : t('servicesComingSoon.notifyMe')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.title }]}>
            {t('servicesComingSoon.offerTitle')}
          </Text>
          <View style={styles.offerRow}>
            {OFFERINGS.map(item => (
              <View key={item.key} style={styles.offerItem}>
                <View style={[styles.offerIcon, { backgroundColor: colors.surface }]}>
                  <Ionicons name={item.icon} size={22} color="#7C3AED" />
                </View>
                <Text
                  style={[styles.offerLabel, { color: colors.body }]}
                  numberOfLines={item.key === 'packages' ? 2 : 1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {t(`servicesComingSoon.offer.${item.key}`)}
                </Text>
              </View>
            ))}
          </View>

          <View style={[styles.builtCard, { backgroundColor: colors.card }]}>
            <View style={[styles.shieldWrap, { backgroundColor: colors.iconBg }]}>
              <Ionicons name="shield-checkmark-outline" size={28} color="#7C3AED" />
            </View>
            <View style={styles.builtCopy}>
              <Text style={[styles.builtTitle, { color: colors.title }]}>
                {t('servicesComingSoon.builtTitle')}
              </Text>
              <Text style={[styles.builtBody, { color: colors.muted }]}>
                {t('servicesComingSoon.builtBody')}
              </Text>
            </View>
          </View>
        </ScrollView>

        <View pointerEvents="none" style={styles.waveWrap}>
          <Svg width={waveWidth} height={90} viewBox="0 0 390 90">
            <Path
              d="M0 40 C70 10 130 70 195 42 C270 10 330 58 390 28 L390 90 L0 90 Z"
              fill={colors.wave}
              opacity={0.55}
            />
            <Path
              d="M0 58 C80 28 150 78 220 52 C290 26 340 70 390 48 L390 90 L0 90 Z"
              fill={colors.wave2}
              opacity={0.45}
            />
          </Svg>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 96,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  heroCopy: {
    flex: 1,
    paddingRight: 6,
  },
  pillWrap: {
    alignSelf: 'flex-start',
    marginBottom: 14,
    position: 'relative',
    paddingHorizontal: 10
  },
  pillSparkleLeft: {
    position: 'absolute',
    top: -8,
    left: -8,
    zIndex: 1,
  },
  pillSparkleRight: {
    position: 'absolute',
    top: -6,
    right: -10,
    zIndex: 1,
  },
  comingSoonPill: {
    height: 32,
    minWidth: 130,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // paddingHorizontal: 16,
    borderRadius: 16,
  },
  comingSoonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 6,
    includeFontPadding: false,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 38,
    marginBottom: 10,
  },
  heroBody: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },
  heroArt: {
    width: 168,
    height: 176,
  },
  orbit: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  floatIcon: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6D28D9',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    zIndex: 2,
  },
  bagWrap: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    alignItems: 'center',
  },
  bagHandle: {
    width: 46,
    height: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 8,
    borderBottomWidth: 0,
    borderColor: '#A78BFA',
    marginBottom: -6,
    zIndex: 1,
  },
  bag: {
    width: 108,
    height: 116,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bagFlap: {
    position: 'absolute',
    top: 12,
    width: '76%',
    height: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  bagShine: {
    position: 'absolute',
    top: 8,
    left: 10,
    width: 28,
    height: 70,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    transform: [{ rotate: '18deg' }],
  },
  bagFly: {
    width: 76,
    height: 76,
    marginTop: 14,
  },
  artSparkle: {
    position: 'absolute',
    right: 8,
    bottom: 54,
  },
  launchCard: {
    marginTop: 22,
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  launchLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  launchIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  launchCopy: {
    flex: 1,
    justifyContent: 'center',
  },
  launchTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  launchSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  notifyTouchable: {
    flexShrink: 0,
    minWidth: 120,
  },
  notifyBtn: {
    height: 38,
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // paddingHorizontal: 18,
    borderRadius: 19,
  },
  notifyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 6,
    includeFontPadding: false,
  },
  sectionTitle: {
    marginTop: 26,
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
  },
  offerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginHorizontal: -4,
  },
  offerItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  offerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  offerLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 13,
    letterSpacing: -0.2,
    minHeight: 26,
  },
  builtCard: {
    marginTop: 22,
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  shieldWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  builtCopy: {
    flex: 1,
  },
  builtTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  builtBody: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  waveWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
