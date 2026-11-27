import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { subscriptionEarningGraph, totalSupport, transationActivity } from '../../services/wallet';
import { useAppTheme } from '../../theme/useApptheme';
import { useThemeContext } from '../../theme/ThemeContext';
import { getUserCredentials } from '../../services/post';
import { useLanguage } from '../../i18n';
import HexAvatar from '../../components/home/story.js/HexAvatar';
import { resolveTransactionAmount } from '../../utils/transactionAmount';
import SubscriptionTrendChart, {
  parseSubscriptionGraphResponse,
  SUBSCRIPTION_CHART_LINE,
  formatSupportUsd,
} from '../../components/wallet/SubscriptionTrendChart';

const H_PADDING = 16;
const RECENT_TX_PREVIEW_LIMIT = 5;
const TOTAL_REVENUE_HIDDEN_KEY = 'is_total_revenue_hidden';
const PERSONAL_MASCOT_ASPECT = 418 / 540;
const BUSINESS_MASCOT_ASPECT = 342 / 540;

const PERIOD_MAP = {
  Daily: 'daily',
  Weekly: 'weekly',
  Monthly: 'monthly',
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const pickFirst = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

const resolveTransactionUserId = (tx) =>
  pickFirst(
    tx?.userId,
    tx?.senderId,
    tx?.payerId,
    tx?.buyerId,
    tx?.fromUserId,
    tx?.user?.id,
    tx?.user?._id,
    tx?.user?.userId,
    '',
  );

const extractTransactions = (response) => {
  const raw =
    response?.data?.transactions ||
    response?.data?.data?.transactions ||
    response?.data?.data ||
    response?.data ||
    [];
  return Array.isArray(raw) ? raw : [];
};

const enrichTransactionsWithProfiles = async (transactions) => {
  const uniqueUserIds = [
    ...new Set(transactions.map(resolveTransactionUserId).filter(Boolean).map(String)),
  ];

  const profileResults = await Promise.allSettled(
    uniqueUserIds.map((userId) => getUserCredentials(userId)),
  );

  const profileMap = {};
  uniqueUserIds.forEach((userId, index) => {
    const result = profileResults[index];
    if (result.status === 'fulfilled') {
      const profileData =
        result.value?.data?.data ?? result.value?.data ?? result.value;
      profileMap[userId] = {
        displayName: profileData?.displayName ?? profileData?.userName ?? null,
        userName: profileData?.userName ?? null,
        image: profileData?.image ?? null,
      };
    }
  });

  return transactions.map((tx) => {
    const userId = resolveTransactionUserId(tx);
    return {
      ...tx,
      userId: userId || tx.userId,
      _profile: userId ? profileMap[userId] ?? null : null,
    };
  });
};

const HeroCardWaves = () => (
  <View style={styles.heroWavesWrap} pointerEvents="none">
    <Svg width="100%" height="100%" viewBox="0 0 360 60" preserveAspectRatio="none">
      <Path
        d="M0 32 C72 8, 136 48, 214 30 C282 14, 326 12, 360 28 L360 60 L0 60 Z"
        fill="rgba(255,255,255,0.10)"
      />
      <Path
        d="M0 44 C64 20, 130 56, 206 38 C274 22, 320 22, 360 40 L360 60 L0 60 Z"
        fill="rgba(255,255,255,0.16)"
      />
    </Svg>
  </View>
);

export default function RevenueFromSubscriptions({ navigation, route }) {
  const { isBusinessProfile: routeBusinessParam } = route?.params || {};
  const { isDarkMode } = useThemeContext();
  const {
    bgStyle,
    textStyle,
    text,
    cardStyle,
    primary,
    borderColor,
    textSecondary,
    accentLight,
    cardBackground,
    isBusinessProfile: themeBusinessProfile,
  } = useAppTheme(routeBusinessParam ? 'company' : undefined);
  const { t } = useLanguage();
  const { width: screenWidth } = useWindowDimensions();

  const isBusinessProfile =
    routeBusinessParam !== undefined ? Boolean(routeBusinessParam) : themeBusinessProfile;

  const [chartPeriod, setChartPeriod] = useState('Daily');
  const [graphData, setGraphData] = useState([]);
  const [graphTotalAmount, setGraphTotalAmount] = useState(0);
  const [graphLoading, setGraphLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [amountHidden, setAmountHidden] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [revenueLoading, setRevenueLoading] = useState(false);

  const contentWidth = screenWidth - H_PADDING * 2;
  const chartViewportWidth = Math.max(contentWidth - 32, 220);
  const mascotWidth = clamp(Math.round(contentWidth * 0.44), 138, 174);
  const mascotHeight = Math.round(
    mascotWidth * (isBusinessProfile ? BUSINESS_MASCOT_ASPECT : PERSONAL_MASCOT_ASPECT),
  );

  const mascotSource = isBusinessProfile
    ? require('../../assets/icons/pngicons/revenue_mascot_gold.png')
    : require('../../assets/icons/pngicons/subscribe.png');

  const heroGradientColors = useMemo(() => {
    if (isBusinessProfile) {
      return isDarkMode
        ? ['#6B4E16', '#9B7526', '#CBA257']
        : ['#9A7020', '#C49A45', '#DFBA6D'];
    }
    return isDarkMode
      ? ['#31156E', '#5B21B6', '#7C3AED']
      : ['#5B21B6', '#7C3AED', '#9333EA'];
  }, [isBusinessProfile, isDarkMode]);

  const mutedText = textSecondary || '#7A7289';
  const cardBorder = borderColor || '#EAE4F5';
  const activeTabBg = primary || '#402090';
  const chartLineColor = isBusinessProfile ? '#CBA257' : SUBSCRIPTION_CHART_LINE;

  useEffect(() => {
    AsyncStorage.getItem(TOTAL_REVENUE_HIDDEN_KEY)
      .then((val) => {
        if (val !== null) setAmountHidden(val === 'true');
      })
      .catch(() => {});
  }, []);

  const handleToggleAmountHidden = useCallback(() => {
    setAmountHidden((prev) => {
      const next = !prev;
      AsyncStorage.setItem(TOTAL_REVENUE_HIDDEN_KEY, String(next)).catch(() => {});
      return next;
    });
  }, []);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack?.()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('wallet', { screen: 'Dashboard' });
  }, [navigation]);

  const fetchGraph = useCallback(async () => {
    setGraphLoading(true);
    try {
      const interval = PERIOD_MAP[chartPeriod] ?? 'daily';
      const response = await subscriptionEarningGraph({ interval });
      const { points, totalAmount } = parseSubscriptionGraphResponse(response, interval);
      setGraphData(points);
      setGraphTotalAmount(totalAmount);
    } catch (error) {
      console.error('Error fetching subscription earning graph:', error);
      setGraphData([]);
      setGraphTotalAmount(0);
    } finally {
      setGraphLoading(false);
    }
  }, [chartPeriod]);

  const fetchRevenue = useCallback(async () => {
    setRevenueLoading(true);
    try {
      const [supportRes, activityRes] = await Promise.allSettled([
        totalSupport({ params: { page: 1 } }),
        transationActivity({
          page: 1,
          limit: RECENT_TX_PREVIEW_LIMIT,
          paymentType: 'subscription',
        }),
      ]);

      if (supportRes.status === 'fulfilled') {
        const data = supportRes.value?.data ?? supportRes.value;
        setTotalRevenue(Number(data?.totalAmount) || 0);
      } else {
        setTotalRevenue(0);
      }

      if (activityRes.status === 'fulfilled') {
        const rawTransactions = extractTransactions(activityRes.value);
        const enriched = await enrichTransactionsWithProfiles(rawTransactions);
        setTransactions(enriched);
      } else if (supportRes.status === 'fulfilled') {
        const fallbackTransactions = extractTransactions(supportRes.value).map((tx) => ({
          ...tx,
          type: tx?.type || 'credit',
        }));
        const enriched = await enrichTransactionsWithProfiles(fallbackTransactions);
        setTransactions(enriched);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching subscription revenue:', error);
      setTotalRevenue(0);
      setTransactions([]);
    } finally {
      setRevenueLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchGraph(), fetchRevenue()]);
    setRefreshing(false);
  }, [fetchGraph, fetchRevenue]);

  const getDisplayName = (tx) => {
    const profile = tx._profile;
    if (profile?.displayName) return profile.displayName;
    if (profile?.userName) return `@${profile.userName}`;
    if (tx.userId) return `@${tx.userId.slice(0, 8)}…`;
    return t('revenue.unknownUser');
  };

  const handleTransactionProfilePress = useCallback(
    (tx) => {
      const userId = String(tx?.userId || '').trim();
      if (!userId) return;

      navigation.navigate('HomeMain', {
        screen: 'UsersProfile',
        params: {
          userId,
          userName: tx?._profile?.userName,
          returnTo: { tab: 'wallet', screen: 'RevenueFromSubscriptions' },
        },
      });
    },
    [navigation],
  );

  const handleViewAllTransactions = useCallback(() => {
    navigation.navigate('TransactionActivity', {
      returnTo: { tab: 'wallet', screen: 'RevenueFromSubscriptions' },
      paymentType: 'subscription',
    });
  }, [navigation]);

  const previewTransactions = transactions.slice(0, RECENT_TX_PREVIEW_LIMIT);
  const periodOptions = [
    { key: 'Daily', label: t('revenue.periodDaily') || 'Daily' },
    { key: 'Weekly', label: t('revenue.periodWeekly') || 'Weekly' },
    { key: 'Monthly', label: t('revenue.periodMonthly') || 'Monthly' },
  ];

  const periodDeltaLabel =
    chartPeriod === 'Weekly'
      ? t('formats.vsLastWeek')
      : chartPeriod === 'Monthly'
        ? t('formats.vsLastMonth')
        : chartPeriod === 'Daily'
          ? t('formats.vsPriorDay')
          : t('formats.vsPriorPeriod');

  return (
    <SafeAreaView style={[styles.safe, bgStyle]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={[
            styles.backCircleBtn,
            cardStyle,
            isDarkMode ? styles.shadowDark : styles.shadowLight,
            { borderColor: cardBorder },
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={20} color={text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, textStyle]}>
          {t('revenue.subscriptionRevenue', 'Subscription Revenue')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[text]}
            tintColor={text}
          />
        }
      >
        {/* Total Revenue Gradient Hero Card */}
        <View
          style={[
            styles.heroCardWrap,
            isDarkMode ? styles.shadowDark : styles.shadowLight,
          ]}
        >
          {/* A plain View sizes and clips the card; the gradient is only a
              background layer. When LinearGradient (a legacy native view on
              the New Architecture) was the container, its native frame could
              end up shorter than its content and clip the text/mascot. */}
          <View style={[styles.heroCard, { minHeight: Math.max(138, mascotHeight + 8) }]}>
            <LinearGradient
              colors={heroGradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <HeroCardWaves />

            <View style={[styles.heroTextCol, { paddingRight: mascotWidth + 6 }]}>
              <View style={styles.heroLabelRow}>
                <Text style={styles.heroLabel} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                  {t('revenue.totalRevenue')}
                </Text>
                <TouchableOpacity
                  onPress={handleToggleAmountHidden}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={amountHidden ? 'Show revenue' : 'Hide revenue'}
                >
                  <Ionicons
                    name={amountHidden ? 'eye-off-outline' : 'eye-outline'}
                    size={16}
                    color="rgba(255,255,255,0.88)"
                  />
                </TouchableOpacity>
              </View>

              <Text
                style={styles.heroAmount}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.68}
                maxFontSizeMultiplier={1.2}
              >
                {revenueLoading
                  ? '…'
                  : amountHidden
                    ? '••••••'
                    : formatSupportUsd(totalRevenue)}
              </Text>

              <View style={styles.stripeRow}>
                <Text style={styles.poweredBy} maxFontSizeMultiplier={1.3}>{t('revenue.poweredBy')} </Text>
                <Text style={styles.stripeBrand} maxFontSizeMultiplier={1.3}>stripe</Text>
              </View>
            </View>

            <Image
              source={mascotSource}
              style={[
                styles.heroMascot,
                { width: mascotWidth, height: mascotHeight },
              ]}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* How it works Card */}
        <View
          style={[
            styles.howCard,
            cardStyle,
            isDarkMode ? styles.shadowDark : styles.shadowLight,
            { borderColor: cardBorder },
          ]}
        >
          <View style={styles.howTextCol}>
            <Text style={[styles.howTitle, textStyle]}>
              {t('revenue.howItWorks')}
            </Text>
            <Text style={[styles.howDesc, { color: mutedText }]}>
              {t(
                'revenue.howItWorksDesc',
                'Users subscribe on Valens via Stripe and the revenue is instantly split between you and the platform.',
              )}
            </Text>
          </View>

          <View
            style={[
              styles.splitBox,
              { backgroundColor: accentLight || '#F5F1FD' },
            ]}
          >
            <View style={styles.splitHeaderRow}>
              <Ionicons name="flash-outline" size={12} color={text} />
              <Text style={[styles.splitHeaderText, textStyle]}>
                {t('revenue.instantSplit')}
              </Text>
            </View>
            <View style={styles.splitValueRow}>
              <Text style={[styles.splitPctLarge, textStyle]}>80%</Text>
              <Text style={[styles.splitPctSub, { color: mutedText }]}>
                {t('revenue.toYou')}
              </Text>
            </View>
            <View style={styles.splitValueRow}>
              <Text style={[styles.splitPctSmall, textStyle]}>20%</Text>
              <Text style={[styles.splitPctSub, { color: mutedText }]}>
                {t('revenue.valensFee')}
              </Text>
            </View>
          </View>
        </View>

        {/* Revenue Overview */}
        <Text style={[styles.sectionTitle, textStyle]}>
          {t('revenue.revenueOverview')}
        </Text>

        <View
          style={[
            styles.periodSelector,
            cardStyle,
            isDarkMode ? styles.shadowDark : styles.shadowLight,
            { borderColor: cardBorder },
          ]}
        >
          {periodOptions.map(({ key, label }) => {
            const isActive = chartPeriod === key;
            return (
              <TouchableOpacity
                key={key}
                activeOpacity={0.85}
                style={[
                  styles.periodButton,
                  isActive && { backgroundColor: activeTabBg },
                ]}
                onPress={() => setChartPeriod(key)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    { color: mutedText },
                    isActive && styles.periodButtonTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Subscription Earnings Chart Card */}
        <View
          style={[
            styles.chartCard,
            cardStyle,
            isDarkMode ? styles.shadowDark : styles.shadowLight,
            { borderColor: cardBorder },
          ]}
        >
          <SubscriptionTrendChart
            points={graphData}
            totalAmount={graphTotalAmount}
            periodDeltaLabel={periodDeltaLabel}
            chartViewportWidth={chartViewportWidth}
            lineColor={chartLineColor}
            textColor={text}
            mutedTextColor={mutedText}
            iconBgColor={accentLight || '#F3EEFA'}
            dotFillColor={cardBackground || '#FFFFFF'}
            gridColor={isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(64,32,144,0.08)'}
            interval={PERIOD_MAP[chartPeriod] ?? 'daily'}
            loading={graphLoading}
            emptyTitle={
              graphLoading ? t('revenue.loadingChart') : t('revenue.noDataAvailable')
            }
            emptySubtitle={graphLoading ? undefined : t('revenue.checkBackLater')}
          />
        </View>

        {/* Recent Transactions */}
        <View
          style={[
            styles.txCard,
            cardStyle,
            isDarkMode ? styles.shadowDark : styles.shadowLight,
            { borderColor: cardBorder },
          ]}
        >
          <View style={styles.txHeader}>
            <Text style={[styles.txTitle, textStyle]}>
              {t('revenue.recentTransactions')}
            </Text>
            {transactions.length > 0 ? (
              <TouchableOpacity
                onPress={handleViewAllTransactions}
                accessibilityRole="button"
                accessibilityLabel={t('valensWallet.viewAll')}
              >
                <Text style={[styles.viewAll, { color: activeTabBg }]}>
                  {t('valensWallet.viewAll')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {revenueLoading ? (
            <View style={styles.txEmptyWrap}>
              <Ionicons name="hourglass-outline" size={28} color={mutedText} />
              <Text style={[styles.txEmptyText, { color: mutedText }]}>
                {t('revenue.loading')}
              </Text>
            </View>
          ) : transactions.length === 0 ? (
            <Text style={[styles.txEmptyText, styles.txNoItems, { color: mutedText }]}>
              {t('revenue.noTransactions')}
            </Text>
          ) : (
            previewTransactions.map((tx) => {
              const { formatted, amountTone } = resolveTransactionAmount(tx);
              const amountColor = amountTone === 'negative' ? '#EF4444' : '#22C55E';

              return (
                <TouchableOpacity
                  key={tx.id ?? tx._id}
                  style={styles.txRow}
                  activeOpacity={tx.userId ? 0.75 : 1}
                  onPress={() => handleTransactionProfilePress(tx)}
                  disabled={!tx.userId}
                >
                  <View style={styles.txAvatar}>
                    <HexAvatar
                      uri={tx._profile?.image ?? ''}
                      size={42}
                      borderWidth={1.5}
                      borderColor={text}
                    />
                  </View>

                  <View style={styles.txInfoCol}>
                    <Text style={[styles.txName, textStyle]} numberOfLines={1}>
                      {getDisplayName(tx)}
                    </Text>
                    {tx._profile?.userName && tx._profile?.displayName ? (
                      <Text style={[styles.txSub, { color: mutedText }]} numberOfLines={1}>
                        @{tx._profile.userName}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.txRightCol}>
                    <Text style={[styles.txAmount, { color: amountColor }]}>
                      {formatted}
                    </Text>
                    <Text style={[styles.txDate, { color: mutedText }]}>
                      {tx.createdAt
                        ? new Date(tx.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 38,
    height: 38,
  },
  scrollContent: {
    paddingHorizontal: H_PADDING,
    paddingTop: 6,
    paddingBottom:80,
  },
  shadowLight: {
    shadowColor: '#402090',
  },
  shadowDark: {
    shadowColor: '#000',
  },
  heroCardWrap: {
    marginBottom: 14,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 4,
  },
  heroCard: {
    width: '100%',
    borderRadius: 20,
    paddingVertical: 20,
    paddingLeft: 18,
    paddingRight: 12,
    minHeight: 138,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  heroWavesWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 54,
    zIndex: 1,
  },
  heroTextCol: {
    zIndex: 2,
    flexShrink: 1,
  },
  heroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  stripeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  poweredBy: {
    fontSize: 11.5,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
  },
  stripeBrand: {
    fontSize: 14,
    fontWeight: '800',
    fontStyle: 'italic',
    color: '#FFFFFF',
  },
  heroMascot: {
    position: 'absolute',
    right: 4,
    bottom: 2,
    zIndex: 3,
  },
  howCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  howTextCol: {
    flex: 1,
  },
  howTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  howDesc: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  splitBox: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 118,
  },
  splitHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  splitHeaderText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  splitValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 2,
  },
  splitPctLarge: {
    fontSize: 20,
    fontWeight: '800',
  },
  splitPctSmall: {
    fontSize: 16,
    fontWeight: '800',
  },
  splitPctSub: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 10,
  },
  periodSelector: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  periodButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 9,
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chartCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  txCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  txTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  viewAll: {
    fontSize: 13,
    fontWeight: '700',
  },
  txEmptyWrap: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  txEmptyText: {
    fontSize: 13,
    fontWeight: '500',
  },
  txNoItems: {
    textAlign: 'center',
    paddingVertical: 16,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
  },
  txAvatar: {
    marginRight: 10,
  },
  txInfoCol: {
    flex: 1,
  },
  txName: {
    fontSize: 14,
    fontWeight: '700',
  },
  txSub: {
    fontSize: 11.5,
    marginTop: 1,
  },
  txRightCol: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  txDate: {
    fontSize: 10.5,
    marginTop: 2,
  },
});
