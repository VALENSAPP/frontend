import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useAppTheme } from '../../theme/useApptheme';
import { useLanguage } from '../../i18n';
import EarningsSourceCard from '../../components/wallet/EarningsSourceCard';
import {
  payFollowingGraph,
  tipGraph,
  missionDonationsGraph,
  shopEarningGraph,
  usdtTransferGraph,
  totalamount,
} from '../../services/wallet';
import {
  formatEarningsUsd,
  isEarningsGraphFailure,
  parseEarningsGraphResponse,
  parseTotalAmountParam,
} from '../../utils/earningsGraph';
import {
  getCachedTotalEarningsHidden,
  loadTotalEarningsHidden,
  persistTotalEarningsHidden,
} from '../../utils/earningsPrivacy';

const H_PADDING = 16;
const CARD_GAP = 12;
const SOURCE_KEYS = ['mission', 'tip', 'wallet', 'fans', 'shop'];
const PERSONAL_MASCOT_ASPECT_RATIO = 367 / 508;
const BUSINESS_MASCOT_ASPECT_RATIO = 363 / 540;

const emptyCardState = (overrides = {}) => ({
  points: [],
  totalAmount: 0,
  percentage: 0,
  overallTotalEarning: 0,
  count: 0,
  countLabel: '',
  loading: true,
  error: false,
  ...overrides,
});

const failedCardState = () =>
  emptyCardState({
    loading: false,
    error: true,
  });

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const resolveSettledCard = settledItem => {
  if (!settledItem || typeof settledItem !== 'object') {
    return failedCardState();
  }

  if (settledItem.status !== 'fulfilled') {
    return failedCardState();
  }

  const payload = settledItem.value;
  if (isEarningsGraphFailure(payload)) {
    return failedCardState();
  }

  try {
    const parsed = parseEarningsGraphResponse(payload) || {};
    return {
      points: Array.isArray(parsed.points) ? parsed.points : [],
      totalAmount: Number(parsed.totalAmount) || 0,
      percentage: Number(parsed.percentage) || 0,
      overallTotalEarning: Number(parsed.overallTotalEarning) || 0,
      count: Number(parsed.count) || 0,
      countLabel: parsed.countLabel || '',
      loading: false,
      error: false,
    };
  } catch (error) {
    return failedCardState();
  }
};

const HeroBottomWaves = ({ isBusinessProfile, isDarkMode }) => {
  const backFill = isBusinessProfile
    ? isDarkMode
      ? 'rgba(203, 162, 87, 0.14)'
      : 'rgba(243, 224, 181, 0.7)'
    : isDarkMode
      ? 'rgba(124, 77, 255, 0.16)'
      : 'rgba(221, 214, 254, 0.65)';

  const frontTop = isBusinessProfile
    ? isDarkMode
      ? '#CBA257'
      : '#E8C57B'
    : isDarkMode
      ? '#7C4DFF'
      : '#C4B5FD';

  const frontBottom = isBusinessProfile
    ? isDarkMode
      ? '#8C6D32'
      : '#D8AD5A'
    : isDarkMode
      ? '#5B21B6'
      : '#A78BFA';

  const frontOpacity = isDarkMode ? 0.28 : 0.75;

  return (
    <View style={styles.heroWavesWrap} pointerEvents="none">
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 360 64"
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id="heroWaveFront" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={frontTop} stopOpacity={frontOpacity} />
            <Stop offset="1" stopColor={frontBottom} stopOpacity={frontOpacity} />
          </LinearGradient>
        </Defs>
        {/* Soft upper back wave */}
        <Path
          d="M0 30 C68 8, 128 48, 204 34 C272 22, 318 8, 360 22 L360 64 L0 64 Z"
          fill={backFill}
        />
        {/* Foreground wave */}
        <Path
          d="M0 44 C56 18, 118 56, 188 42 C258 28, 310 18, 360 36 L360 64 L0 64 Z"
          fill="url(#heroWaveFront)"
        />
      </Svg>
    </View>
  );
};

const TotalEarningsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const {
    bgStyle,
    textStyle,
    text,
    cardStyle,
    borderColor,
    textSecondary,
    isDarkMode,
    isBusinessProfile: themeBusinessProfile,
  } = useAppTheme();
  const { width: screenWidth } = useWindowDimensions();

  const paramTotal = parseTotalAmountParam(route?.params?.totalAmount);
  const [heroTotal, setHeroTotal] = useState(paramTotal);
  const [amountHidden, setAmountHidden] = useState(getCachedTotalEarningsHidden);
  const [refreshing, setRefreshing] = useState(false);
  const [sources, setSources] = useState({
    mission: emptyCardState(),
    tip: emptyCardState(),
    wallet: emptyCardState(),
    fans: emptyCardState(),
    shop: emptyCardState(),
  });

  const rawProfileParam = String(route?.params?.profileType || '').trim().toLowerCase();
  const isBusinessProfile = rawProfileParam
    ? rawProfileParam === 'company' || rawProfileParam === 'business'
    : themeBusinessProfile;
  const mascotSource = isBusinessProfile
    ? require('../../assets/icons/pngicons/goldearning.png')
    : require('../../assets/icons/pngicons/Earning.png');

  const contentWidth = screenWidth - H_PADDING * 2;
  const cardWidth = (contentWidth - CARD_GAP) / 2;
  const mascotWidth = clamp(Math.round(contentWidth * 0.43), 136, 174);
  const mascotHeight = Math.round(
    mascotWidth * (isBusinessProfile ? BUSINESS_MASCOT_ASPECT_RATIO : PERSONAL_MASCOT_ASPECT_RATIO),
  );
  const mutedText = textSecondary || '#7A7289';
  const cardBorderColor = borderColor || '#EAE4F5';

  const sourceConfig = useMemo(
    () => [
      {
        key: 'mission',
        title: t('totalEarnings.missionPost') || 'Mission Post',
        icon: 'ribbon-outline',
        accentColor: '#7C3AED',
        chartType: 'area',
        footerFallback: t('totalEarnings.campaigns') || 'Campaigns',
      },
      {
        key: 'tip',
        title: t('totalEarnings.tip') || 'Tip',
        icon: 'heart-circle-outline',
        accentColor: '#DB2777',
        chartType: 'area',
        footerFallback: t('totalEarnings.tips') || 'Tips',
      },
      {
        key: 'wallet',
        title: t('totalEarnings.walletToWallet') || 'Wallet to Wallet',
        icon: 'wallet-outline',
        accentColor: '#2563EB',
        chartType: 'area',
        footerFallback: t('totalEarnings.transactions') || 'Transactions',
      },
      {
        key: 'fans',
        title: t('totalEarnings.subscribedFans') || 'Subscribed Fans',
        icon: 'people-outline',
        accentColor: '#059669',
        chartType: 'area',
        footerFallback: t('totalEarnings.subscribers') || 'Subscribers',
      },
      {
        key: 'shop',
        title: t('totalEarnings.shop') || 'Shop',
        icon: 'bag-handle-outline',
        accentColor: '#7C3AED',
        chartType: 'area',
        footerFallback: t('totalEarnings.sales') || 'Sales',
      },
    ],
    [t],
  );

  const loadGraphs = useCallback(async () => {
    setSources({
      mission: emptyCardState({ loading: true, error: false }),
      tip: emptyCardState({ loading: true, error: false }),
      wallet: emptyCardState({ loading: true, error: false }),
      fans: emptyCardState({ loading: true, error: false }),
      shop: emptyCardState({ loading: true, error: false }),
    });

    let settledList = [];
    try {
      settledList = await Promise.allSettled([
        missionDonationsGraph(),
        tipGraph(),
        usdtTransferGraph(),
        payFollowingGraph(),
        shopEarningGraph(),
      ]);
    } catch (error) {
      settledList = [];
    }

    const safeList = Array.isArray(settledList) ? settledList : [];
    const nextSources = {};
    SOURCE_KEYS.forEach((key, index) => {
      nextSources[key] = resolveSettledCard(safeList[index]);
    });
    setSources(nextSources);

    // Hero: prefer nav param; else use overall `totalEarning` from any graph API.
    if (!(paramTotal > 0)) {
      const fromGraphs = SOURCE_KEYS.map(key => nextSources[key]?.overallTotalEarning || 0).find(
        n => n > 0,
      );
      if (fromGraphs > 0) {
        setHeroTotal(fromGraphs);
      }
    }
  }, [paramTotal]);

  const ensureHeroTotal = useCallback(async () => {
    if (paramTotal > 0) {
      setHeroTotal(paramTotal);
      return;
    }
    try {
      const response = await totalamount();
      const rawValue =
        response?.data?.totalAmount ??
        response?.data?.data?.totalAmount ??
        response?.data?.totalEarning ??
        response?.data?.data?.totalEarning ??
        response?.data?.totalReceived ??
        response?.data?.data?.totalReceived ??
        response?.data?.amount ??
        response?.data?.data?.amount ??
        0;
      const n = Number(rawValue) || 0;
      if (n > 0) setHeroTotal(n);
    } catch {
      // Graph responses may still fill hero via overallTotalEarning.
    }
  }, [paramTotal]);

  useFocusEffect(
    useCallback(() => {
      loadTotalEarningsHidden().then(hidden => {
        setAmountHidden(hidden);
      });
      ensureHeroTotal();
      loadGraphs();
    }, [ensureHeroTotal, loadGraphs]),
  );

  const handleToggleAmountHidden = useCallback(() => {
    setAmountHidden(prev => {
      const next = !prev;
      persistTotalEarningsHidden(next);
      return next;
    });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([ensureHeroTotal(), loadGraphs()]);
    } finally {
      setRefreshing(false);
    }
  }, [ensureHeroTotal, loadGraphs]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack?.()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('wallet', { screen: 'Dashboard' });
  }, [navigation]);

  return (
    <SafeAreaView style={[styles.safe, bgStyle]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={[
            styles.backCircleBtn,
            cardStyle,
            isDarkMode ? styles.shadowDark : styles.shadowLight,
            {
              borderColor: cardBorderColor,
            },
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={20} color={text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, textStyle]}>
          {t('totalEarnings.title') || 'Earnings'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={text} />
        }
      >
        <View
          style={[
            styles.heroCard,
            cardStyle,
            isDarkMode ? styles.shadowDark : styles.shadowLight,
            {
              borderColor: cardBorderColor,
            },
          ]}
        >
          <HeroBottomWaves
            isBusinessProfile={isBusinessProfile}
            isDarkMode={isDarkMode}
          />

          <View
            style={[
              styles.heroTextCol,
              { paddingRight: mascotWidth + 6 },
            ]}
          >
            <View style={styles.heroLabelRow}>
              <Text style={[styles.heroLabel, { color: mutedText }]}>
                {t('totalEarnings.totalEarnings') || 'Total Earnings'}
              </Text>
              <TouchableOpacity
                onPress={handleToggleAmountHidden}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={amountHidden ? 'Show earnings' : 'Hide earnings'}
              >
                <Ionicons
                  name={amountHidden ? 'eye-off-outline' : 'eye-outline'}
                  size={16}
                  color={mutedText}
                />
              </TouchableOpacity>
            </View>
            <Text
              style={[styles.heroAmount, { color: text }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.68}
            >
              {amountHidden ? '••••••' : formatEarningsUsd(heroTotal)}
            </Text>
            <Text style={[styles.heroSub, { color: mutedText }]}>
              {t('totalEarnings.allTimeEarnings') || 'All time earnings'}
            </Text>
          </View>

          <Image
            source={mascotSource}
            style={[
              styles.heroMascotImage,
              {
                width: mascotWidth,
                height: mascotHeight,
              },
            ]}
            resizeMode="contain"
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, textStyle]}>
            {t('totalEarnings.bySource') || 'Earnings by Source'}
          </Text>
        </View>

        <View style={styles.grid}>
          {sourceConfig.map(config => {
            const data = sources[config.key] || emptyCardState({ loading: false });
            return (
              <EarningsSourceCard
                key={config.key}
                title={config.title}
                icon={config.icon}
                accentColor={config.accentColor}
                chartType={config.chartType}
                amount={data.totalAmount}
                percentage={data.percentage}
                points={data.points}
                loading={data.loading}
                width={cardWidth}
              />
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FAF5FE',
  },
  header: {
    height: 56,
    paddingHorizontal: H_PADDING,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  headerSpacer: {
    width: 38,
    height: 38,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: H_PADDING,
    paddingTop: 6,
    paddingBottom: 28,
  },
  heroCard: {
    borderRadius: 20,
    paddingVertical: 20,
    paddingLeft: 18,
    paddingRight: 12,
    minHeight: 146,
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EAE4F5',
    marginBottom: 22,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  heroWavesWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 58,
    zIndex: 1,
  },
  heroTextCol: {
    zIndex: 2,
    paddingBottom: 8,
  },
  heroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  heroAmount: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  heroMascotImage: {
    position: 'absolute',
    right: 6,
    bottom: 4,
    zIndex: 3,
  },
  shadowLight: {
    shadowColor: '#402090',
  },
  shadowDark: {
    shadowColor: '#000',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: CARD_GAP,
    marginBottom: 24,
  },
});

export default TotalEarningsScreen;
