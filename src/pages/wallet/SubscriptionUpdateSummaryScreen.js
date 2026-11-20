import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../../i18n';
import { useBusinessProfileTheme } from '../../theme/useBusinessProfileTheme';
import { getPriceUpdateSummary, getPriceUpdateSubscribers } from '../../services/wallet';

const RESPONSE_CARDS = [
  { key: 'accepted', icon: 'checkmark-circle-outline', color: '#218A4D', background: '#F0FAF3', border: '#CBEAD5' },
  { key: 'canceled', icon: 'close-circle-outline', color: '#C53F3F', background: '#FEF4F4', border: '#F4D6D6' },
  { key: 'pending', icon: 'time-outline', color: '#B8771F', background: '#FFF9F0', border: '#F3E4C7' },
];

const formatPrice = price => `$${Number(price || 0).toFixed(2)} / month`;

const SubscriptionUpdateSummaryScreen = () => {
  const { t } = useLanguage();
  const navigation = useNavigation();
  const route = useRoute();
  const theme = useBusinessProfileTheme();
  const [activeTab, setActiveTab] = useState('overview');

  const isBusiness = Boolean(theme.isBusinessProfile);
  const brandColor = isBusiness ? '#CBA257' : '#402090';
  const pageBg = theme.isDarkMode
    ? (isBusiness ? '#12100C' : '#0F0C1B')
    : (isBusiness ? '#FAF7F0' : '#FAF5FE');
  const cardBorderColor = isBusiness ? '#E8D9BD' : '#E8E1F5';
  const subtleCardBg = theme.isDarkMode ? theme.card : '#FFFFFF';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiData, setApiData] = useState(null);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [subscriberList, setSubscriberList] = useState([]);
  const [subscriberLoading, setSubscriberLoading] = useState(false);

  const fetchSummary = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await getPriceUpdateSummary();
      const data = res?.data?.data || res?.data || res;
      if (data && typeof data === 'object') {
        setApiData(data);
        const statuses = ['ACCEPTED', 'DECLINED', 'PENDING'];
        const counts = await Promise.all(statuses.map(async status => {
          const response = await getPriceUpdateSubscribers({ page: 1, limit: 50, status });
          const body = response?.data?.data || response?.data || response;
          const list = Array.isArray(body) ? body : body?.subscribers || body?.users || body?.items || body?.results || [];
          const total = body?.totalCount ?? body?.total ?? body?.pagination?.total ?? body?.meta?.total ?? list.length;
          return Number(total) || 0;
        }));
        setApiData(current => ({
          ...(current || data),
          responses: { accepted: counts[0], canceled: counts[1], pending: counts[2] },
        }));
      }
    } catch (error) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSummary();
    }, [fetchSummary]),
  );

  const cardTitle =
    apiData?.title ||
    t('manageSubscribers.updateSummary.priceUpdate', 'Price update to all subscribers');

  const rawStatus = apiData?.status || route.params?.status || 'Completed';
  const isCompleted = String(rawStatus).toLowerCase() === 'completed';
  const statusColor = isCompleted ? '#218A4D' : '#B8771F';

  const fromValue =
    apiData?.from ??
    (apiData?.fromPrice != null ? formatPrice(apiData.fromPrice) : null) ??
    (apiData?.oldPrice != null ? formatPrice(apiData.oldPrice) : null) ??
    formatPrice(route.params?.currentPrice ?? 20);

  const toValue =
    apiData?.to ??
    (apiData?.toPrice != null ? formatPrice(apiData.toPrice) : null) ??
    (apiData?.newPrice != null ? formatPrice(apiData.newPrice) : null) ??
    formatPrice(route.params?.newPrice ?? 20);

  const effectiveValue =
    apiData?.effective ??
    apiData?.effectiveType ??
    route.params?.effective;

  const dateValue = String(
    apiData?.date ??
    apiData?.effectiveDate ??
    route.params?.date ??
    'Sep 8, 2026',
  ).replace(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g,
    (month) => t(`date.monthNamesAbbr.${month.toLowerCase()}`),
  );

  const responses = {
    accepted:
      apiData?.responses?.accepted ??
      apiData?.acceptedCount ??
      route.params?.responses?.accepted ??
      0,
    canceled:
      apiData?.responses?.canceled ??
      apiData?.responses?.cancelled ??
      apiData?.cancelledCount ??
      route.params?.responses?.canceled ??
      0,
    pending:
      apiData?.responses?.pending ??
      apiData?.pendingCount ??
      route.params?.responses?.pending ??
      0,
  };

  const openResponse = async key => {
    const status = key === 'accepted' ? 'ACCEPTED' : key === 'canceled' ? 'DECLINED' : 'PENDING';
    setSelectedResponse(key);
    setSubscriberLoading(true);
    try {
      const res = await getPriceUpdateSubscribers({ page: 1, limit: 50, status });
      const body = res?.data?.data || res?.data || res;
      const list = Array.isArray(body) ? body : body?.subscribers || body?.users || body?.items || body?.results || [];
      setSubscriberList(list);
    } catch (error) {
      setSubscriberList([]);
    } finally {
      setSubscriberLoading(false);
    }
  };

  const startChat = subscriber => {
    const user = subscriber?.user || subscriber?.subscriber || subscriber;
    const userId = user?.userId || user?.id || subscriber?.userId || subscriber?.subscriberId;
    if (!userId) return;
    navigation.getParent()?.navigate('HomeMain', {
      screen: 'UserChat',
      params: {
        userId,
        user,
        returnToSubscriptionUpdateSummary: true,
        initialMessage: t('manageSubscribers.updateSummary.friendlyMessage', 'Hi! Thanks for being part of my community. I wanted to reach out and see if you have any questions about my subscription update.'),
      },
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: pageBg }]}>
      <View style={[styles.header, { backgroundColor: subtleCardBg, borderBottomColor: cardBorderColor }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('manageSubscribers.updateSummary.back')}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={26} color={brandColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: brandColor }]}>
          {t('manageSubscribers.updateSummary.title', 'Creator – Update Summary')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchSummary(true)}
            tintColor={brandColor}
          />
        }
      >
        <Text style={[styles.subtitle, { color: theme.mutedText }]}>
          {t('manageSubscribers.updateSummary.subtitle', 'Track your price update.')}
        </Text>

        {/* Pill Mode Switcher matching mockup */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.modeBtn,
              {
                backgroundColor: activeTab === 'overview' ? brandColor : subtleCardBg,
                borderColor: activeTab === 'overview' ? brandColor : cardBorderColor,
              },
            ]}
            onPress={() => setActiveTab('overview')}
          >
            <Text
              style={[
                styles.modeBtnText,
                { color: activeTab === 'overview' ? '#FFFFFF' : brandColor },
              ]}
            >
              {t('manageSubscribers.updateSummary.overview', 'Overview')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.modeBtn,
              {
                backgroundColor: activeTab === 'responses' ? brandColor : subtleCardBg,
                borderColor: activeTab === 'responses' ? brandColor : cardBorderColor,
              },
            ]}
            onPress={() => setActiveTab('responses')}
          >
            <Text
              style={[
                styles.modeBtnText,
                { color: activeTab === 'responses' ? '#FFFFFF' : brandColor },
              ]}
            >
              {t('manageSubscribers.updateSummary.responses', 'Responses')}
            </Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={brandColor} />
          </View>
        ) : activeTab === 'overview' ? (
          <>
            {/* Main Hero Card with Mascot & Inner Box Bottom */}
            <View style={[styles.heroCardContainer, { borderColor: cardBorderColor, backgroundColor: subtleCardBg }]}>
              <LinearGradient
                colors={
                  theme.isDarkMode
                    ? (isBusiness ? ['#251F18', '#1A1713'] : ['#201736', '#171026'])
                    : (isBusiness ? ['#FAF5E8', '#F5ECE0'] : ['#F6EEFD', '#EAE0FB'])
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCardGradient}
              >
                <View style={styles.heroCardTopRow}>
                  <View style={styles.heroCardLeft}>
                    <Text style={[styles.heroCardTitle, { color: brandColor }]}>
                      {cardTitle}
                    </Text>
                    <View style={styles.statusPill}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginRight: 4 }} />
                      <Text style={styles.statusPillText}>
                        {t(`manageSubscribers.updateSummary.${rawStatus.toLowerCase()}`, rawStatus)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.heroMascotWrap} pointerEvents="none">
                    <Image
                      source={require('../../assets/icons/pngicons/dralens_checklist.png')}
                      style={styles.heroMascotImg}
                      resizeMode="contain"
                    />
                  </View>
                </View>

                {/* Box Bottom: Inner rounded white card matching mockup */}
                <View style={[styles.boxBottom, { backgroundColor: subtleCardBg, borderColor: cardBorderColor }]}>
                  <View style={styles.boxRow}>
                    <View style={styles.boxRowLeft}>
                      <Ionicons name="pricetag-outline" size={16} color={theme.mutedText} style={{ marginRight: 8 }} />
                      <Text style={[styles.boxRowLabel, { color: theme.mutedText }]}>
                        {t('manageSubscribers.updateSummary.from', 'From')}
                      </Text>
                    </View>
                    <Text style={[styles.boxRowValue, { color: brandColor }]}>{fromValue}</Text>
                  </View>

                  <View style={[styles.boxRowDivider, { backgroundColor: cardBorderColor }]} />

                  <View style={styles.boxRow}>
                    <View style={styles.boxRowLeft}>
                      <Ionicons name="pricetag-outline" size={16} color={theme.mutedText} style={{ marginRight: 8 }} />
                      <Text style={[styles.boxRowLabel, { color: theme.mutedText }]}>
                        {t('manageSubscribers.updateSummary.to', 'To')}
                      </Text>
                    </View>
                    <Text style={[styles.boxRowValue, { color: brandColor }]}>{toValue}</Text>
                  </View>

                  <View style={[styles.boxRowDivider, { backgroundColor: cardBorderColor }]} />

                  <View style={styles.boxRow}>
                    <View style={styles.boxRowLeft}>
                      <Ionicons name="calendar-outline" size={16} color={theme.mutedText} style={{ marginRight: 8 }} />
                      <Text style={[styles.boxRowLabel, { color: theme.mutedText }]}>
                        {t('manageSubscribers.updateSummary.effective', 'Effective')}
                      </Text>
                    </View>
                    <Text style={[styles.boxRowValue, { color: brandColor }]}>
                      {effectiveValue === 'On next renewal'
                        ? t('manageSubscribers.updateSummary.nextRenewal', 'On next renewal')
                        : (effectiveValue || 'On next renewal')}
                    </Text>
                  </View>

                  <View style={[styles.boxRowDivider, { backgroundColor: cardBorderColor }]} />

                  <View style={styles.boxRow}>
                    <View style={styles.boxRowLeft}>
                      <Ionicons name="calendar-outline" size={16} color={theme.mutedText} style={{ marginRight: 8 }} />
                      <Text style={[styles.boxRowLabel, { color: theme.mutedText }]}>
                        {t('manageSubscribers.updateSummary.date', 'Date')}
                      </Text>
                    </View>
                    <Text style={[styles.boxRowValue, { color: brandColor }]}>{dateValue}</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Responses Title */}
            <Text style={[styles.sectionTitle, { color: brandColor }]}>
              {t('manageSubscribers.updateSummary.responses', 'Responses')}
            </Text>

            {/* Responses 3 Cards Grid */}
            <View style={styles.responseGrid}>
              {RESPONSE_CARDS.map(card => {
                const count = responses[card.key] ?? 0;
                const isAccepted = card.key === 'accepted';
                const isCanceled = card.key === 'canceled';
                const cardBg = isAccepted ? '#EFF9F3' : (isCanceled ? '#FDF2F2' : '#FEF9EE');
                const cardBorder = isAccepted ? '#CBEAD5' : (isCanceled ? '#F8D7DA' : '#FBE8C3');
                const fgColor = isAccepted ? '#10B981' : (isCanceled ? '#DC2626' : '#D97706');
                const iconName = isAccepted ? 'checkmark-circle-outline' : (isCanceled ? 'close-circle-outline' : 'time-outline');

                return (
                  <TouchableOpacity
                    key={card.key}
                    activeOpacity={0.85}
                    style={[styles.responseCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
                    onPress={() => {
                      setActiveTab('responses');
                      openResponse(card.key);
                    }}
                    accessibilityRole="button"
                  >
                    <Ionicons name={iconName} size={20} color={fgColor} />
                    <Text style={[styles.responseLabel, { color: fgColor }]}>
                      {t(`manageSubscribers.updateSummary.${card.key}`, card.key)}
                    </Text>
                    <Text style={[styles.responseValue, { color: fgColor }]}>
                      {count}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* View Details Button matching mockup */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.detailsButton, { backgroundColor: subtleCardBg, borderColor: cardBorderColor }]}
              onPress={() => navigation.navigate('ManageSubscribers')}
              accessibilityRole="button"
            >
              <View style={styles.detailsLeft}>
                <Ionicons name="document-text-outline" size={19} color={brandColor} style={{ marginRight: 8 }} />
                <Text style={[styles.detailsText, { color: brandColor }]}>
                  {t('manageSubscribers.updateSummary.viewDetails', 'View Details')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={brandColor} />
            </TouchableOpacity>
          </>
        ) : (
          <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {t('manageSubscribers.updateSummary.responseBreakdown', 'Subscriber responses')}
            </Text>
            {RESPONSE_CARDS.map((card, index) => (
                <View key={card.key}>
                {index > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
                <TouchableOpacity style={styles.detailRow} onPress={() => openResponse(card.key)} accessibilityRole="button">
                  <View style={[styles.responseIcon, { backgroundColor: card.background }]}>
                    <Ionicons name={card.icon} size={20} color={card.color} />
                  </View>
                  <Text style={[styles.detailLabel, { color: theme.text }]}>
                    {t(`manageSubscribers.updateSummary.${card.key}`, card.key)}
                  </Text>
                  <Text style={[styles.detailValue, { color: card.color }]}>
                    {responses[card.key]}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
            {selectedResponse && (
              <View style={styles.subscriberSection}>
                <View style={styles.listHeading}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>
                    {t(`manageSubscribers.updateSummary.${selectedResponse}`, selectedResponse)}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedResponse(null)} accessibilityRole="button">
                    <Ionicons name="close" size={22} color={theme.mutedText} />
                  </TouchableOpacity>
                </View>
                {subscriberLoading ? <ActivityIndicator color={theme.accent} style={styles.listLoader} /> : subscriberList.length ? subscriberList.map((item, index) => {
                  const user = item?.user || item?.subscriber || item;
                  const name = user?.displayName || user?.userName || user?.username || user?.name || t('manageSubscribers.updateSummary.subscriber', 'Subscriber');
                  return <TouchableOpacity key={String(user?.id || user?.userId || index)} style={[styles.subscriberRow, { borderTopColor: theme.border }]} onPress={() => startChat(item)} accessibilityRole="button">
                    {user?.image || user?.avatar ? <Image source={{ uri: user.image || user.avatar }} style={styles.avatar} /> : <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.accent }]}><Text style={styles.avatarLetter}>{String(name).charAt(0).toUpperCase()}</Text></View>}
                    <View style={styles.subscriberInfo}><Text style={[styles.subscriberName, { color: theme.text }]}>{name}</Text><Text style={[styles.messageHint, { color: theme.mutedText }]}>{t('manageSubscribers.updateSummary.sendFriendlyMessage', 'Send a friendly message')}</Text></View>
                    <Ionicons name="chatbubble-ellipses-outline" size={21} color={theme.accent} />
                  </TouchableOpacity>;
                }) : <Text style={[styles.emptyList, { color: theme.mutedText }]}>{t('manageSubscribers.updateSummary.noSubscribers', 'No subscribers found.')}</Text>}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const SummaryRow = ({ label, value, theme, last }) => (
  <View style={[styles.summaryRow, !last && styles.summaryRowSpaced]}>
    <Text style={[styles.rowLabel, { color: theme.mutedText }]}>{label}</Text>
    <Text style={[styles.rowValue, { color: theme.text }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: { width: 34, paddingVertical: 5 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17.5, fontWeight: '800' },
  headerSpacer: { width: 34 },
  content: { paddingHorizontal: 16, paddingBottom: 36 },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  modeBtn: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  loadingContainer: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center' },

  /* Hero Card Container */
  heroCardContainer: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#402090',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  heroCardGradient: {
    borderRadius: 18,
    paddingTop: 14,
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  heroCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
  heroCardLeft: {
    flex: 1,
    paddingRight: 6,
  },
  heroCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F7EE',
    borderColor: '#A3E6BA',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    alignSelf: 'flex-start',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  heroMascotWrap: {
    width: 105,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -8,
  },
  heroMascotImg: {
    width: '100%',
    height: '100%',
  },

  /* Box Bottom */
  boxBottom: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  boxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  boxRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  boxRowLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  boxRowValue: {
    fontSize: 13.5,
    fontWeight: '800',
    textAlign: 'right',
  },
  boxRowDivider: {
    height: 1,
    width: '100%',
  },

  /* Responses Section */
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  responseGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  responseCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  responseLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 5,
    textAlign: 'center',
  },
  responseValue: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 2,
    textAlign: 'center',
  },

  /* Details Button */
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    marginTop: 14,
    paddingHorizontal: 16,
    height: 48,
    shadowColor: '#402090',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  detailsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsText: {
    fontSize: 14,
    fontWeight: '700',
  },

  /* Response Breakdown List */
  summaryCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#402090',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 12 },
  divider: { height: 1 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  responseIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  detailLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  detailValue: { fontSize: 18, fontWeight: '800' },
  subscriberSection: { marginTop: 14 },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  listLoader: { paddingVertical: 18 },
  subscriberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#fff', fontSize: 16, fontWeight: '700' },
  subscriberInfo: { flex: 1, marginHorizontal: 12 },
  subscriberName: { fontSize: 14, fontWeight: '700' },
  messageHint: { fontSize: 12, marginTop: 2 },
  emptyList: { paddingVertical: 14, fontSize: 14, textAlign: 'center' },
});

export default SubscriptionUpdateSummaryScreen;
