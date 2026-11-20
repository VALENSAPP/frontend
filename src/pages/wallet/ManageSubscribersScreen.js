import React, { useMemo, useState } from 'react';
import {
  View,
  Image,
  Platform,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useLanguage } from '../../i18n';
import { useBusinessProfileTheme } from '../../theme/useBusinessProfileTheme';
import HexAvatar from '../../components/home/story.js/HexAvatar';
import { getSubscribersList, getMySubscriptionsList } from '../../services/wallet';
import { useEffect } from 'react';
import { navigateToUserProfile } from '../../utils/navigateToUserProfile';
import { formatLocalizedDate } from '../../utils/dateTimeFormatter';

const STATUS = {
  active: 'active',
  pending: 'pending',
  canceled: 'canceled',
  expired: 'expired',
};

const STATUS_COLORS = {
  active: { fg: '#1F8A4C', bg: '#E8F7EE', border: '#8FD6A8' },
  pending: { fg: '#C56A12', bg: '#FFF3E4', border: '#F5C48A' },
  canceled: { fg: '#C0392B', bg: '#FDECEC', border: '#F0A8A2' },
  expired: { fg: '#6B7280', bg: '#F3F4F6', border: '#D1D5DB' },
};

// Helper function to map API subscriber response to display format
const transformSubscriber = (item, language) => {
  const startDate = new Date(item.startDate);
  const endDate = new Date(item.endDate);
  const now = new Date();

  // Determine status
  let status = STATUS.active;
  if (item.status === 'EXPIRED' || endDate < now) {
    status = STATUS.expired;
  } else if (item.status === 'ACTIVE' && item.isActive) {
    status = STATUS.active;
  } else if (
    item.status === 'CANCELED' ||
    item.status === 'canceled' ||
    item.status === 'cancelled' ||
    item.cancelAtPeriodEnd === true ||
    item.isCancelled === true ||
    item.autoPay === false ||
    item.autoRenew === false
  ) {
    status = STATUS.canceled;
  }

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return formatLocalizedDate(date, language) || 'N/A';
  };

  const calculateDaysUntil = (date) => {
    if (!date) return null;
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((targetDate - today) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : null;
  };

  return {
    id: item.subscriber?.id || item.id,
    profileUserId: item.subscriber?.id || item.subscriber?.userId || item.subscriberId || null,
    handle: `@${item.subscriber?.userName || 'user'}`,
    name: item.subscriber?.displayName || item.subscriber?.userName || 'Unknown User',
    avatar: item.subscriber?.image || '',
    status,
    price: item.priceAtSubscription || 0,
    nextPrice: null,
    nextBilling: formatDate(item.endDate),
    nextBillingHint: (() => {
      const hint = calculateDaysUntil(item.endDate);
      return hint;
    })(),
    joined: formatDate(item.startDate),
    startDateRaw: item.startDate || item.createdAt || null,
    totalEarned: item.totalEarnedFromSubscriber || 0,
    totalPaid: item.totalPaidBySubscriber || 0,
    paymentsCount: item.paymentsCount || 0,
  };
};

// Helper function to map API subscription response to display format
const transformSubscription = (item, language) => {
  const startDate = new Date(item.startDate);
  const endDate = new Date(item.endDate);
  const now = new Date();

  let status = STATUS.active;
  if (item.status === 'EXPIRED' || endDate < now) {
    status = STATUS.expired;
  } else if (
    item.status === 'CANCELED' ||
    item.status === 'canceled' ||
    item.status === 'cancelled' ||
    item.cancelAtPeriodEnd === true ||
    item.isCancelled === true ||
    item.autoPay === false ||
    item.autoRenew === false
  ) {
    status = STATUS.canceled;
  } else if (item.status === 'ACTIVE' && item.isActive) {
    status = STATUS.active;
  }

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return formatLocalizedDate(date, language) || 'N/A';
  };

  const calculateDaysUntil = (date) => {
    if (!date) return null;
    const targetDate = new Date(date);
    const today = new Date();
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : null;
  };

  return {
    id: item.creator?.id || item.id,
    profileUserId: item.creator?.id || item.creator?.userId || item.creatorId || item.followingId || null,
    handle: `@${item.creator?.userName || 'creator'}`,
    name: item.creator?.displayName || item.creator?.userName || 'Unknown Creator',
    avatar: item.creator?.image || '',
    status,
    price: item.priceAtSubscription || 0,
    nextPrice: null,
    nextBilling: formatDate(item.endDate),
    nextBillingHint: (() => {
      const hint = calculateDaysUntil(item.endDate);
      return hint;
    })(),
    joined: formatDate(item.startDate),
    startDateRaw: item.startDate || item.createdAt || null,
    totalEarned: item.totalEarnedFromSubscriber || 0,
    totalPaid: item.totalPaidBySubscriber || 0,
    paymentsCount: item.paymentsCount || 0,
  };
};

const SORT_OPTIONS = ['newest', 'oldest', 'priceHigh', 'priceLow'];

const ManageSubscribersScreen = () => {
  const { t, currentLanguage } = useLanguage();
  const navigation = useNavigation();
  const route = useRoute();
  const theme = useBusinessProfileTheme();
  const { width } = useWindowDimensions();
  const statGap = 10;
  const statCardWidth = Math.floor((width - 32 - statGap) / 2);

  const isBusiness = Boolean(theme.isBusinessProfile);
  const brandColor = isBusiness ? '#CBA257' : '#402090';
  const pageBg = theme.isDarkMode
    ? (isBusiness ? '#12100C' : '#0F0C1B')
    : (isBusiness ? '#FAF7F0' : '#FAF5FE');
  const cardBorderColor = isBusiness ? '#E8D9BD' : '#EAE4F5';
  const subtleCardBg = theme.isDarkMode ? theme.card : '#FFFFFF';
  const innerBoxBg = theme.isDarkMode ? 'rgba(255,255,255,0.03)' : (isBusiness ? '#FAF7F0' : '#F9F6FE');
  const innerBoxBorder = theme.isDarkMode ? 'rgba(255,255,255,0.08)' : (isBusiness ? '#EFE5D2' : '#EDE4F7');
  const dividerColor = theme.isDarkMode ? 'rgba(255,255,255,0.1)' : (isBusiness ? '#E8D9BD' : '#E8E1F5');

  const [mode, setMode] = useState(route.params?.initialMode || 'subscribers');
  const [query, setQuery] = useState(route.params?.query || '');
  const [statusFilter, setStatusFilter] = useState(route.params?.statusFilter || 'all');
  const [sortBy, setSortBy] = useState(route.params?.sortBy || 'newest');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // New state for API data
  const [subscribersList, setSubscribersList] = useState([]);
  const [mySubscriptionsList, setMySubscriptionsList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch data based on mode
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        if (mode === 'subscribers') {
          const response = await getSubscribersList();
          if (response?.statusCode === 200 && response?.data?.subscribers) {
            const transformedData = response.data.subscribers.map(item => transformSubscriber(item, currentLanguage));
            setSubscribersList(transformedData);
          } else if (response?.status === 200 && response?.data?.subscribers) {
            const transformedData = response.data.subscribers.map(item => transformSubscriber(item, currentLanguage));
            setSubscribersList(transformedData);
          } else {
            setSubscribersList([]);
          }
        } else {
          const response = await getMySubscriptionsList();
          if (response?.statusCode === 200 && response?.data?.subscriptions) {
            const transformedData = response.data.subscriptions.map(item => transformSubscription(item, currentLanguage));
            setMySubscriptionsList(transformedData);
          } else if (response?.status === 200 && response?.data?.subscriptions) {
            const transformedData = response.data.subscriptions.map(item => transformSubscription(item, currentLanguage));
            setMySubscriptionsList(transformedData);
          } else {
            setMySubscriptionsList([]);
          }
        }
      } catch (err) {
        console.error('Error fetching subscriptions:', err);
        setError(err?.message || 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [mode, currentLanguage]);

  const isSubscriberView = mode === 'subscriptions';
  const sourceList = isSubscriberView ? mySubscriptionsList : subscribersList;

  const handleCancelSuccess = (canceledId) => {
    setMySubscriptionsList(prev => prev.map(item => item.id === canceledId ? { ...item, status: STATUS.canceled } : item));
  };

  // Calculate stats from actual data
  const stats = useMemo(() => {
    const list = isSubscriberView ? mySubscriptionsList : subscribersList;
    const statsCounts = {
      active: 0,
      pending: 0,
      canceled: 0,
      expired: 0,
    };

    list.forEach(item => {
      if (item.status === STATUS.active) statsCounts.active++;
      else if (item.status === STATUS.pending) statsCounts.pending++;
      else if (item.status === STATUS.canceled) statsCounts.canceled++;
      else if (item.status === STATUS.expired) statsCounts.expired++;
    });
    const total = list.length || 1;
    return {
      active: { count: statsCounts.active, pct: total ? ((statsCounts.active / total) * 100).toFixed(1) : 0 },
      pending: { count: statsCounts.pending, pct: total ? ((statsCounts.pending / total) * 100).toFixed(1) : 0 },
      canceled: { count: statsCounts.canceled, pct: total ? ((statsCounts.canceled / total) * 100).toFixed(1) : 0 },
      expired: { count: statsCounts.expired, pct: total ? ((statsCounts.expired / total) * 100).toFixed(1) : 0 },
    };
  }, [subscribersList, mySubscriptionsList, isSubscriberView]);

  const filteredList = useMemo(() => {
    const q = query.trim().toLowerCase();
    let next = sourceList.filter(row => {
      const matchesQuery =
        !q ||
        row.handle.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      return matchesQuery && matchesStatus;
    });

    next = [...next].sort((a, b) => {
      const timeA = new Date(a.startDateRaw || a.joined || 0).getTime() || 0;
      const timeB = new Date(b.startDateRaw || b.joined || 0).getTime() || 0;
      if (sortBy === 'oldest') return timeA - timeB;
      if (sortBy === 'priceHigh') return b.price - a.price;
      if (sortBy === 'priceLow') return a.price - b.price;
      return timeB - timeA;
    });
    return next;
  }, [query, sourceList, statusFilter, sortBy]);

  const statusLabel = status => {
    if (status === STATUS.pending) return t('manageSubscribers.statusPending');
    if (status === STATUS.canceled) return t('manageSubscribers.statusCanceled');
    if (status === STATUS.expired) return t('manageSubscribers.statusExpired');
    return t('manageSubscribers.statusActive');
  };

  const renderStatCard = (key, icon, color) => (
    <View
      key={key}
      style={[
        styles.statCard,
        {
          backgroundColor: subtleCardBg,
          borderColor: cardBorderColor,
          borderBottomColor: color,
          width: statCardWidth,
        },
      ]}>
      <View style={styles.statTopRow}>
        <View style={[styles.statIconWrap, { backgroundColor: `${color}18` }]}>
          <Ionicons name={icon} size={15} color={color} />
        </View>
        <Text style={[styles.statPct, { color: theme.mutedText }]} numberOfLines={1}>
          {t('manageSubscribers.pctOfTotal', { pct: stats[key].pct })}
        </Text>
      </View>
      <Text
        style={[styles.statLabel, { color: theme.mutedText }]}
        numberOfLines={1}
        ellipsizeMode="tail">
        {statusLabel(key)}
      </Text>
      <Text style={[styles.statCount, { color: brandColor }]}>{stats[key].count}</Text>
    </View>
  );

  const handleProfilePress = async (row) => {
    const profileUserId = row?.profileUserId || row?.id;
    if (!profileUserId) return;

    await navigateToUserProfile(navigation, profileUserId, {
      user: {
        id: profileUserId,
        displayName: row.name,
        userName: String(row.handle || '').replace(/^@/, ''),
        image: row.avatar,
      },
      returnTo: {
        tab: 'wallet',
        screen: 'ManageSubscribers',
        params: {
          initialMode: isSubscriberView ? 'subscriptions' : 'subscribers',
          query,
          statusFilter,
          sortBy,
        },
      },
    });
  };

  const renderRow = row => {
    const colors = STATUS_COLORS[row.status] || STATUS_COLORS.active;
    const isRowActive = row.status === STATUS.active;
    return (
      <View
        key={row.id}
        style={[styles.personCard, { backgroundColor: subtleCardBg, borderColor: cardBorderColor }]}>
        <View style={styles.personTop}>
          <TouchableOpacity
            style={styles.profileLink}
            activeOpacity={0.7}
            onPress={() => handleProfilePress(row)}
            accessibilityRole="link"
            accessibilityLabel={`View ${row.name}'s profile`}
          >
            <HexAvatar uri={row.avatar} size={42} borderWidth={1.5} borderColor={brandColor} />
            <View style={styles.personMeta}>
              <Text style={[styles.handle, { color: brandColor }]} numberOfLines={1}>
                {row.handle}
              </Text>
              <Text style={[styles.fullName, { color: theme.mutedText }]} numberOfLines={1}>
                {row.name}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={[
            styles.badge,
            {
              backgroundColor: isRowActive ? '#E8F7EE' : colors.bg,
              borderColor: isRowActive ? '#A3E6BA' : colors.border,
            }
          ]}>
            <Text style={[styles.badgeText, { color: isRowActive ? '#10B981' : colors.fg }]}>
              {statusLabel(row.status)}
            </Text>
          </View>
        </View>

        {/* Faint divider line matching mockup */}
        <View style={[styles.cardDivider, { backgroundColor: dividerColor }]} />

        {/* 3-column detail section matching mockup */}
        <View style={styles.detailRow}>
          <View style={styles.detailCol}>
            <Text style={[styles.detailColLabel, { color: theme.mutedText }]}>
              {t('manageSubscribers.currentPrice')}
            </Text>
            <Text style={[styles.detailColValue, { color: brandColor }]} numberOfLines={1}>
              ${Number(row.price || 0).toFixed(2)} / month
            </Text>
          </View>

          <View style={[styles.detailColDivider, { backgroundColor: dividerColor }]} />

          <View style={styles.detailCol}>
            <Text style={[styles.detailColLabel, { color: theme.mutedText }]}>
              {t('manageSubscribers.nextBilling')}
            </Text>
            <Text style={[styles.detailColValue, { color: brandColor }]} numberOfLines={1}>
              {row.nextBilling}
            </Text>
            {row.nextBillingHint ? (
              <Text style={[styles.detailColHint, { color: theme.mutedText }]}>
                {t('manageSubscribers.inDays', { days: row.nextBillingHint })}
              </Text>
            ) : null}
          </View>

          <View style={[styles.detailColDivider, { backgroundColor: dividerColor }]} />

          <View style={styles.detailCol}>
            <Text style={[styles.detailColLabel, { color: theme.mutedText }]}>
              {t('manageSubscribers.joined')}
            </Text>
            <Text style={[styles.detailColValue, { color: brandColor }]} numberOfLines={1}>
              {row.joined}
            </Text>
          </View>
        </View>

        {isSubscriberView && row.status !== STATUS.canceled && row.status !== STATUS.expired && (
          <View style={{ marginTop: 10 }}>
            <TouchableOpacity
              style={[styles.outlineBtn, { borderColor: cardBorderColor, borderRadius: 10, paddingVertical: 6 }]}
              onPress={() => navigation.navigate('CancelSubscriptionFlow', { subscription: row, onCancelSuccess: () => handleCancelSuccess(row.id) })}>
              <Text style={[styles.outlineBtnText, { color: theme.mutedText, fontSize: 12 }]}>Cancel Subscription</Text>
            </TouchableOpacity>
          </View>
        )}

      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: pageBg }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: cardBorderColor, backgroundColor: subtleCardBg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={brandColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: brandColor }]} numberOfLines={1}>
          {isSubscriberView
            ? t('manageSubscribers.mySubscriptionsTitle')
            : t('manageSubscribers.title')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: theme.mutedText }]}>
          {isSubscriberView
            ? t('manageSubscribers.mySubscriptionsSubtitle')
            : t('manageSubscribers.subtitle')}
        </Text>

        <View style={styles.modeRow}>
          <TouchableOpacity
            onPress={() => setMode('subscribers')}
            activeOpacity={0.8}
            style={[styles.modeBtn, {
              borderColor: !isSubscriberView ? brandColor : cardBorderColor,
              backgroundColor: !isSubscriberView ? brandColor : subtleCardBg,
            }]}>
            <Ionicons
              name="people-outline"
              size={16}
              color={!isSubscriberView ? '#fff' : brandColor}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.modeBtnText, {
              color: !isSubscriberView ? '#fff' : brandColor
            }]} numberOfLines={1}>
              {t('manageSubscribers.viewMySubscribers')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode('subscriptions')}
            activeOpacity={0.8}
            style={[styles.modeBtn, {
              borderColor: isSubscriberView ? brandColor : cardBorderColor,
              backgroundColor: isSubscriberView ? brandColor : subtleCardBg,
            }]}>
            <Ionicons
              name="receipt-outline"
              size={16}
              color={isSubscriberView ? '#fff' : brandColor}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.modeBtnText, {
              color: isSubscriberView ? '#fff' : brandColor
            }]} numberOfLines={1}>
              {t('manageSubscribers.viewMySubscriptions')}
            </Text>
          </TouchableOpacity>
        </View>

        {!isSubscriberView ? (
          <View style={styles.statsWrap}>
            {renderStatCard('active', 'person-outline', STATUS_COLORS.active.fg)}
            {renderStatCard('expired', 'calendar-outline', STATUS_COLORS.expired.fg)}
          </View>
        ) : null}

        {!isSubscriberView ? (
          <View style={[styles.bannerContainer, { borderColor: cardBorderColor }]}>
            <LinearGradient
              colors={
                theme.isDarkMode
                  ? (isBusiness ? ['#251F18', '#1A1713'] : ['#201736', '#171026'])
                  : (isBusiness ? ['#FAF5E8', '#F5ECE0'] : ['#F6EEFD', '#EAE0FB'])
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bannerGradient}
            >
              <View style={styles.bannerCopy}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Ionicons name="information-circle" size={20} color={brandColor} />
                  <Text style={[styles.bannerTitle, { color: brandColor }]}>
                    {t('manageSubscribers.priceUpdateTitle')}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.bannerBtn, { backgroundColor: subtleCardBg, borderColor: brandColor }]}
                  onPress={() => navigation.navigate('SubscriptionUpdateSummary', {
                    currentPrice: 9.9,
                    newPrice: 14.9,
                  })}>
                  <Text style={[styles.bannerBtnText, { color: brandColor }]}>
                    {t('manageSubscribers.viewUpdateDetails')}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.bannerArtWrap}>
                <Image
                  source={require('../../assets/icons/pngicons/calendar_update_3d.png')}
                  style={styles.bannerArt}
                  resizeMode="contain"
                />
              </View>
            </LinearGradient>
          </View>
        ) : null}

        <View style={[styles.searchRow, { borderColor: cardBorderColor, backgroundColor: subtleCardBg }]}>
          <Ionicons name="search-outline" size={18} color={theme.mutedText} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={
              isSubscriberView
                ? t('manageSubscribers.searchSubscriptions')
                : t('manageSubscribers.searchPlaceholder')
            }
            placeholderTextColor={theme.mutedText}
            style={[styles.searchInput, { color: theme.text }]}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={theme.mutedText} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, { borderColor: cardBorderColor, backgroundColor: subtleCardBg }]}
            onPress={() => {
              setShowSortMenu(false);
              setShowStatusMenu(v => !v);
            }}>
            <Text style={[styles.filterChipText, { color: brandColor }]} numberOfLines={1}>
              {statusFilter === 'all'
                ? t('manageSubscribers.allStatus')
                : statusLabel(statusFilter)}
            </Text>
            <Ionicons name="chevron-down" size={14} color={brandColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, { borderColor: cardBorderColor, backgroundColor: subtleCardBg }]}
            onPress={() => {
              setShowStatusMenu(false);
              setShowSortMenu(v => !v);
            }}>
            <Text style={[styles.filterChipText, { color: brandColor }]} numberOfLines={1}>
              {t(`manageSubscribers.sort.${sortBy}`)}
            </Text>
            <Ionicons name="chevron-down" size={14} color={brandColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, { borderColor: cardBorderColor, backgroundColor: subtleCardBg }]}
            onPress={() => setShowFilters(v => !v)}>
            <Ionicons name="options-outline" size={16} color={brandColor} />
            <Text style={[styles.filterChipText, { color: brandColor }]}>
              {t('manageSubscribers.filters')}
            </Text>
          </TouchableOpacity>
        </View>

        {showStatusMenu ? (
          <View style={[styles.menu, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {['all', STATUS.active, STATUS.expired].map(key => (
              <TouchableOpacity
                key={key}
                style={styles.menuItem}
                onPress={() => {
                  setStatusFilter(key);
                  setShowStatusMenu(false);
                }}>
                <Text style={{ color: statusFilter === key ? theme.accent : theme.text, fontWeight: '600' }}>
                  {key === 'all' ? t('manageSubscribers.allStatus') : statusLabel(key)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {showSortMenu ? (
          <View style={[styles.menu, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {SORT_OPTIONS.map(key => (
              <TouchableOpacity
                key={key}
                style={styles.menuItem}
                onPress={() => {
                  setSortBy(key);
                  setShowSortMenu(false);
                }}>
                <Text style={{ color: sortBy === key ? theme.accent : theme.text, fontWeight: '600' }}>
                  {t(`manageSubscribers.sort.${key}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {showFilters ? (
          <Text style={[styles.filterHint, { color: theme.mutedText }]}>
            {t('manageSubscribers.filterHint')}
          </Text>
        ) : null}

        {isLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Ionicons name="hourglass-outline" size={32} color={theme.mutedText} />
            <Text style={[styles.empty, { color: theme.mutedText, marginTop: 8 }]}>
              Loading...
            </Text>
          </View>
        ) : error ? (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Ionicons name="alert-circle-outline" size={32} color={theme.accent} />
            <Text style={[styles.empty, { color: theme.accent, marginTop: 8 }]}>
              {error}
            </Text>
          </View>
        ) : filteredList.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Ionicons name="search-outline" size={32} color={theme.mutedText} />
            <Text style={[styles.empty, { color: theme.mutedText, marginTop: 8 }]}>
              No data found
            </Text>
          </View>
        ) : (
          filteredList.map(renderRow)
        )}

        {/* <Text style={[styles.showing, { color: theme.mutedText }]}>
          {t('manageSubscribers.showing', {
            from: filteredList.length ? 1 : 0,
            to: filteredList.length,
            total: isSubscriberView ? MOCK_MY_SUBSCRIPTIONS.length : 464,
          })}
        </Text> */}

        {/* <View style={styles.legend}>
          {[STATUS.active, STATUS.pending, STATUS.canceled, STATUS.expired].map(key => (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS[key].fg }]} />
              <Text style={[styles.legendText, { color: theme.mutedText }]}>
                {t(`manageSubscribers.legend.${key}`)}
              </Text>
            </View>
          ))}
        </View> */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, maginBottom: '5%' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 8 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  headerSpacer: { width: 40 },
  scroll: { padding: 16, paddingBottom: 40 },
  subtitle: { fontSize: 13, lineHeight: 18, marginBottom: 14 },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexGrow: 1,
    flexShrink: 1,
  },
  outlineBtnText: { fontSize: 13, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
  primaryBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
    flexGrow: 1,
    minWidth: 140,
  },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  statsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 8,
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    marginBottom: 12,
    shadowColor: '#402090',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  statCount: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
  },
  statPct: {
    fontSize: 11.5,
    marginTop: 2,
  },
  statBottomStripe: {
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    width: '100%',
  },
  bannerContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#402090',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  bannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  bannerCopy: {
    flex: 1,
    paddingRight: 8,
  },
  bannerTitle: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  bannerBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6.5,
  },
  bannerBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  bannerArtWrap: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerArt: {
    width: 72,
    height: 72,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    minHeight: 46,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    paddingVertical: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 38,
  },
  filterChipText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  menu: { borderWidth: 1, borderRadius: 10, marginBottom: 10, overflow: 'hidden' },
  menuItem: { paddingHorizontal: 14, paddingVertical: 12 },
  filterHint: { fontSize: 12, marginBottom: 10 },
  empty: { textAlign: 'center', marginVertical: 24, fontSize: 14 },
  personCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#402090',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  personTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileLink: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  personMeta: {
    flex: 1,
    minWidth: 0,
  },
  handle: {
    fontSize: 15,
    fontWeight: '800',
  },
  fullName: {
    fontSize: 12,
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    marginVertical: 10,
    width: '100%',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  detailCol: {
    flex: 1,
    minWidth: 0,
  },
  detailColDivider: {
    width: 1,
    height: 28,
    marginHorizontal: 8,
    alignSelf: 'center',
  },
  detailColLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 3,
  },
  detailColValue: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  detailColHint: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  rowActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showing: { fontSize: 12, marginTop: 4, marginBottom: 16 },
  legend: { gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  legendText: { flex: 1, fontSize: 12, lineHeight: 18 },
});

export default ManageSubscribersScreen;
