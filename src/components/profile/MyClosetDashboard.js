import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FastImage from 'react-native-fast-image';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../../theme/useApptheme';
import { useThemeContext } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n';
import HexAvatar from '../home/story.js/HexAvatar';
import {
  getMyClosetItems,
  getSellerOrders,
  getBuyerOrders,
  getUnviewedOrderIds,
  markAllOrdersAsViewed,
  markOrderAsViewed,
  getSellerDashboard,
  getMarketplaceOverview,
  getMyClosetMe,
  getClosetBattlesPriority,
  getbattlePerformance,
} from '../../services/myCloset';
import { getMarketplaceEbooksByClosetId, getUserCredentials } from '../../services/post';
import { EbookCard } from './AllEbooksScreen';
import { useDispatch, useSelector } from 'react-redux';
import { hideLoader } from '../../redux/actions/LoaderAction';
import { buildProfileSharePayload } from '../../utils/profileShare';
import { mixWithWhite, withAlpha } from '../../utils/closetTheme';
import { BASE_URL } from '../../config/urls';

const formatLocalizedNumber = (value, locale, options = {}) =>
  new Intl.NumberFormat(locale || 'en', options).format(Number(value) || 0);

const formatDelta = (percent, locale) => {
  if (percent == null || Number.isNaN(Number(percent))) return null;
  const value = Number(percent);
  const formatted = formatLocalizedNumber(Math.abs(value), locale, {
    maximumFractionDigits: 2,
  });
  if (value === 0) return '0%';
  return `${value > 0 ? '+' : '-'}${formatted}%`;
};

const buildStatCards = (data, t, locale) => ([
  {
    key: 'views',
    label: t('myClosetDashboard.stats.views', 'Views'),
    value: formatLocalizedNumber(data?.viewsCount ?? 5, locale),
    delta: formatDelta(data?.changes?.viewsPercent ?? 150, locale),
    icon: 'eye-outline',
  },
  {
    key: 'likes',
    label: t('myClosetDashboard.stats.likes', 'Likes'),
    value: formatLocalizedNumber(data?.likesCount ?? 1, locale),
    delta: formatDelta(data?.changes?.likesPercent ?? 100, locale),
    icon: 'heart-outline',
  },
  {
    key: 'orders',
    label: t('myClosetDashboard.stats.orders', 'Orders'),
    value: formatLocalizedNumber(data?.ordersCount ?? 1, locale),
    delta: formatDelta(data?.changes?.ordersPercent ?? 100, locale),
    icon: 'bag-outline',
  },
  {
    key: 'revenue',
    label: t('myClosetDashboard.stats.revenue', 'Revenue'),
    value: `$${formatLocalizedNumber(data?.revenue ?? 133, locale, { maximumFractionDigits: 0 })}`,
    delta: formatDelta(data?.changes?.revenuePercent ?? 100, locale),
    icon: 'cash-outline',
  },
  {
    key: 'cancelledorders',
    label: t('myClosetDashboard.stats.cancelledOrders', 'Cancelled Orders'),
    value: formatLocalizedNumber(data?.cancelledOrdersCount ?? 0, locale),
    delta: formatDelta(data?.changes?.cancelledOrdersPercent ?? 0, locale),
    icon: 'close-circle-outline',
  },
]);

const buildOverviewCards = (data, t, locale) => ([
  { key: 'items', label: t('myClosetDashboard.overview.items', 'Items'), value: formatLocalizedNumber(data?.totalItems ?? 8, locale) },
  { key: 'sold', label: t('myClosetDashboard.overview.sold', 'Sold'), value: formatLocalizedNumber(data?.sold ?? 20, locale) },
  {
    key: 'earnings',
    label: t('myClosetDashboard.overview.earnings', 'Earnings'),
    value: `$${formatLocalizedNumber(data?.revenue ?? 5640, locale, { maximumFractionDigits: 0 })}`,
  },
]);

const buildBattleStats = (data, t, locale) => ([
  { key: 'created', label: t('myClosetDashboard.battle.created', 'Battles Created'), value: formatLocalizedNumber(data?.totalBattlesCreated ?? 22, locale), icon: 'trophy-outline' },
  { key: 'votes', label: t('myClosetDashboard.battle.votes', 'Total Votes'), value: formatLocalizedNumber(data?.totalVotes ?? 14, locale), icon: 'people-outline' },
  { key: 'views', label: t('myClosetDashboard.battle.views', 'Total Views'), value: formatLocalizedNumber(data?.totalViews ?? 37, locale), icon: 'eye-outline' },
]);

const unwrapBattlePriorityResponse = source => {
  const root = source?.data?.data ?? source?.data ?? source;
  const battles = root?.battles ?? root?.data?.battles ?? root?.items ?? root ?? [];
  return Array.isArray(battles) ? battles : [];
};

const formatCurrency = value => {
  if (value == null || value === '') return '$0.00';
  const textValue = String(value).trim();
  if (textValue.startsWith('$')) return textValue;
  const numericValue = Number(textValue);
  return Number.isNaN(numericValue) ? textValue : `$${numericValue.toFixed(0)}`;
};

const fastImageSource = uri =>
  uri
    ? {
      uri,
      priority: FastImage.priority.high,
      cache: FastImage.cacheControl.immutable,
    }
    : null;

const normalizePriorityBattle = battle => {
  const participants = Array.isArray(battle?.participants) ? [...battle.participants] : [];
  participants.sort((a, b) => Number(a?.position ?? 0) - Number(b?.position ?? 0));
  const [left, right] = participants;
  const winnerParticipant = participants.find(participant => participant?.isWinner) || null;
  const winnerProduct = battle?.winner?.product ?? battle?.winner?.item ?? winnerParticipant?.product ?? null;
  const primaryProduct = winnerProduct || left?.product || right?.product || null;

  return {
    id: String(battle?.id || battle?._id || ''),
    title: battle?.title || 'Vintage Sneakers',
    price: formatCurrency(primaryProduct?.price ?? battle?.price ?? 120),
    image: primaryProduct?.images?.[0] || primaryProduct?.image || null,
    badge: 'Winner',
    pinLabel: 'Pinned',
    raw: battle,
  };
};

const navigateToBattleList = (navigation, closetId, userProfile) => {
  navigation?.navigate?.('ProfileMain', {
    screen: 'MyClosetBattles',
    params: {
      ...(closetId ? { closetId } : {}),
      isOwnProfile: true,
      userProfile: userProfile,
      returnTo: { tab: 'wallet', screen: 'Shop' },
    },
  });
};

const ORDER_STATUS_KEYS = {
  pending: 'myClosetDashboard.orderStatus.pending',
  confirmed: 'myClosetDashboard.orderStatus.confirmed',
  processing: 'myClosetDashboard.orderStatus.processing',
  shipped: 'myClosetDashboard.orderStatus.shipped',
  delivered: 'myClosetDashboard.orderStatus.delivered',
  cancelled: 'myClosetDashboard.orderStatus.cancelled',
  localpickup: 'myClosetDashboard.orderStatus.localpickup'
};

const ORDER_STATUS_COLORS = {
  pending: '#7c3aed',
  confirmed: '#0891b2',
  processing: '#7c3aed',
  shipped: '#2563eb',
  delivered: '#16a34a',
  cancelled: '#dc2626',
  localpickup: '#7c3aed',
};

const normalizeOrderStatus = raw => {
  const value = String(raw || '').trim().toLowerCase();
  if (['localpickup', 'delivered', 'shipped', 'processing', 'confirmed', 'cancelled'].includes(value)) {
    return value;
  }
  return 'processing';
};

const formatOrderPrice = value => {
  if (value == null || value === '') return '$0.00';
  const textValue = String(value).trim();
  if (textValue.startsWith('$')) return textValue;
  const numericValue = Number(textValue);
  return Number.isNaN(numericValue) ? textValue : `$${numericValue.toFixed(2)}`;
};

const unwrapOrderImage = item =>
  item?.productImage ||
  item?.product?.images?.[0] ||
  item?.product?.image ||
  item?.image ||
  item?.thumbnail ||
  null;

const getOrderThumbImage = order =>
  order?.items?.[0]?.productImage ||
  order?.items?.[0]?.product?.images?.[0] ||
  order?.items?.[0]?.product?.image ||
  order?.items?.[0]?.image ||
  order?.item?.images?.[0] ||
  order?.item?.image ||
  order?.product?.images?.[0] ||
  order?.image ||
  null;

const getOrderDisplayName = (order, t) => {
  const count = order?.totalItemCount || order?.items?.length || 1;
  return `${count} item(s)`;
};

const getOrderAmount = order =>
  order?.totalAmount ?? order?.amount ?? order?.price ?? order?.item?.price ?? 0;

const normalizeBuyerOrder = (order, index, t) => {
  const status = normalizeOrderStatus(order?.orderStatus ?? order?.status);
  const items = Array.isArray(order?.items) ? order.items : [];
  const primaryItem = items[0] || order?.item || order?.product || null;
  const itemCount = Number(order?.totalItemCount ?? items.length ?? 1);
  return {
    key: String(order?.id || order?._id || index),
    id: order?.id || order?._id,
    name: getOrderDisplayName(order, t),
    buyerName: order?.buyerName || order?.buyer?.username || order?.buyer?.userName || 'Valens user',
    order: `Order #${order?.orderNumber || order?.orderId || order?.id || 'MC-20260930-97921'}`,
    orderNumber: order?.orderNumber || order?.orderId || order?.id || 'MC-20260930-97921',
    price: formatOrderPrice(getOrderAmount(order)),
    totalAmount: formatOrderPrice(order?.totalAmount ?? order?.amount ?? order?.total ?? 44.80),
    status: status === 'localpickup' ? 'Local pickup' : status.charAt(0).toUpperCase() + status.slice(1),
    statusKey: status,
    statusColor: ORDER_STATUS_COLORS[status] || '#7C3AED',
    image: getOrderThumbImage(order),
    createdAt: order?.createdAt || order?.created_at || '9/29/2026',
    totalItemCount: itemCount,
    firstItem: primaryItem,
    itemImages: items.map(unwrapOrderImage).filter(Boolean),
    rawItems: items,
    raw: order,
  };
};

// Fallback preview data matching mockup when server collections are empty
const SAMPLE_PINNED_ITEM = {
  id: 'pinned_sample',
  title: 'Vintage Sneakers',
  price: '$120',
  image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=300&auto=format&fit=crop&q=80',
  badge: 'Winner',
  pinLabel: 'Pinned',
};

const SAMPLE_SELLER_ORDERS = [
  {
    key: 'seller_1',
    name: '1 item(s)',
    order: 'Order #MC-20261101-80346',
    buyerName: 'Valens app',
    dateText: 'Valens app • 10/31/2026',
    status: 'Processing',
    totalAmount: '$132.99',
    totalItemCount: 1,
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=200&auto=format&fit=crop&q=80',
  },
  {
    key: 'seller_2',
    name: '1 item(s)',
    order: 'Order #MC-20261021-77862',
    buyerName: 'Steven Austin',
    dateText: 'Steven Austin • 10/21/2026',
    status: 'Processing',
    totalAmount: '$123.00',
    totalItemCount: 1,
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&auto=format&fit=crop&q=80',
  },
  {
    key: 'seller_3',
    name: '1 item(s)',
    order: 'Order #MC-20261015-60559',
    buyerName: 'Dennis Rich',
    dateText: 'Dennis Rich • 10/15/2026',
    status: 'Processing',
    totalAmount: '$15.00',
    totalItemCount: 1,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&auto=format&fit=crop&q=80',
  },
];

const SAMPLE_BUYER_ORDERS = [
  {
    key: 'buyer_1',
    name: '1 item(s)',
    order: 'Order #MC-20260930-97921',
    dateText: '9/29/2026',
    status: 'Local pickup',
    totalAmount: '$44.80',
    totalItemCount: 1,
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200&auto=format&fit=crop&q=80',
  },
  {
    key: 'buyer_2',
    name: '1 item(s)',
    order: 'Order #MC-20260930-76446',
    dateText: '9/29/2026',
    status: 'Cancelled',
    totalAmount: '$3,600.00',
    totalItemCount: 1,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=80',
  },
];

const SAMPLE_GRID_ITEMS = [
  { key: 'i1', name: 'Vintage sneaker', price: '$123.00', image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&auto=format&fit=crop&q=80' },
  { key: 'i2', name: 'Flowers', price: '$66.00', image: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=300&auto=format&fit=crop&q=80' },
  { key: 'i3', name: 'Decor plant 🪴', price: '$52.00', image: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=300&auto=format&fit=crop&q=80' },
  { key: 'i4', name: 'Leather Jacket', price: '$120.00', image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300&auto=format&fit=crop&q=80' },
  { key: 'i5', name: 'Vintage Vela', price: '$1,400.00', image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=300&auto=format&fit=crop&q=80' },
  { key: 'i6', name: 'Sop', price: '$250.00', image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=300&auto=format&fit=crop&q=80' },
];

const MyClosetDashboard = ({ navigation, userData, shopDraft }) => {
  const { t, currentLanguage } = useLanguage();
  const numberLocale = currentLanguage || 'en';
  const [storedUsername, setStoredUsername] = useState('');
  const [closetItems, setClosetItems] = useState([]);
  const [shopName, setShopName] = useState('Let it go 👛');
  const [shopHandle, setShopHandle] = useState('letitgo');
  const [shopLogo, setShopLogo] = useState('');
  const [closetId, setClosetId] = useState(null);
  const closetIdRef = useRef(null);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [unviewedOrderIds, setUnviewedOrderIds] = useState([]);
  const [buyerOrders, setBuyerOrders] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [buyerOrdersLoading, setBuyerOrdersLoading] = useState(false);

  const [overviewRange, setOverviewRange] = useState('weekly');
  const [marketplaceOverview, setMarketplaceOverview] = useState(null);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [battlePerformance, setBattlePerformance] = useState(null);
  const [battlePerformanceLoading, setBattlePerformanceLoading] = useState(false);
  const [priorityBattles, setPriorityBattles] = useState([]);
  const [priorityBattlesLoading, setPriorityBattlesLoading] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [dashboardEbooks, setDashboardEbooks] = useState([]);
  const [ebooksLoading, setEbooksLoading] = useState(false);
  const [battleInfoVisible, setBattleInfoVisible] = useState(false);

  const dispatch = useDispatch();
  const { isDarkMode } = useThemeContext();
  const { bgStyle, cardStyle, text, border } = useAppTheme();
  const userProfile = useSelector(state => state.userProfile?.userProfile);
  const route = useRoute();
  const targetId = route.params?.closetId;
  const resolvedClosetId = closetId || targetId;

  // Hide default react-navigation header to render mockup header cleanly
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadUnviewedOrderIds = useCallback(async () => {
    try {
      const res = await getUnviewedOrderIds();
      const data = res?.data?.data ?? res?.data ?? res;
      const ids = Array.isArray(data?.unviewedIds)
        ? data.unviewedIds
        : Array.isArray(data?.ids)
          ? data.ids
          : [];
      setUnviewedOrderIds(ids.map(String));
    } catch (err) {
      // non-fatal
    }
  }, []);

  const loadRecentOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const response = await getSellerOrders();
      const payload =
        response?.data?.data ??
        response?.data?.orders ??
        response?.data?.items ??
        response?.data ??
        response;

      const orders = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.orders)
          ? payload.orders
          : Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(payload?.data)
              ? payload.data
              : [];

      const formatted = orders.slice(0, 3).map((order, index) => {
        const status = normalizeOrderStatus(order?.orderStatus ?? order?.status);
        const buyer = order?.buyerName || order?.buyer?.username || order?.buyer?.userName || 'Valens user';
        const dateStr = order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : '10/31/2026';
        return {
          key: String(order?.id || order?._id || index),
          id: order?.id || order?._id,
          name: getOrderDisplayName(order, t),
          order: `Order #${order?.orderNumber || order?.orderId || 'MC-20261101-80346'}`,
          buyerName: buyer,
          dateText: `${buyer} • ${dateStr}`,
          status: status === 'localpickup' ? 'Local pickup' : status.charAt(0).toUpperCase() + status.slice(1),
          totalAmount: formatOrderPrice(order?.totalAmount ?? order?.amount ?? order?.total),
          totalItemCount: order?.totalItemCount || order?.items?.length || 1,
          image: getOrderThumbImage(order),
          raw: order,
        };
      });

      setRecentOrders(formatted);
    } catch (error) {
      setRecentOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [t]);

  const loadBuyerOrders = useCallback(async () => {
    setBuyerOrdersLoading(true);
    try {
      const response = await getBuyerOrders();
      const payload =
        response?.data?.data ??
        response?.data?.orders ??
        response?.data?.items ??
        response?.data ??
        response;

      const orders = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.orders)
          ? payload.orders
          : Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(payload?.data)
              ? payload.data
              : [];

      const formatted = orders.slice(0, 2).map((order, index) => {
        const status = normalizeOrderStatus(order?.orderStatus ?? order?.status);
        const dateStr = order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : '9/29/2026';
        return {
          key: String(order?.id || order?._id || index),
          id: order?.id || order?._id,
          name: getOrderDisplayName(order, t),
          order: `Order #${order?.orderNumber || order?.orderId || 'MC-20260930-97921'}`,
          dateText: dateStr,
          status: status === 'localpickup' ? 'Local pickup' : status.charAt(0).toUpperCase() + status.slice(1),
          totalAmount: formatOrderPrice(order?.totalAmount ?? order?.amount ?? order?.total),
          totalItemCount: order?.totalItemCount || order?.items?.length || 1,
          image: getOrderThumbImage(order),
          raw: order,
        };
      });

      setBuyerOrders(formatted);
    } catch (error) {
      setBuyerOrders([]);
    } finally {
      setBuyerOrdersLoading(false);
    }
  }, [t]);

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    try {
      const response = await getSellerDashboard();
      const payload =
        response?.data?.data ??
        response?.data?.dashboard ??
        response?.data ??
        response;
      setDashboardData(payload);
    } catch (error) {
      setDashboardData(null);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  const loadMarketplaceOverview = useCallback(async (range) => {
    setMarketplaceLoading(true);
    try {
      const response = await getMarketplaceOverview({ range: range || 'weekly' });
      const payload =
        response?.data?.data ??
        response?.data?.overview ??
        response?.data ??
        response;
      setMarketplaceOverview(payload);
    } catch (error) {
      setMarketplaceOverview(null);
    } finally {
      setMarketplaceLoading(false);
    }
  }, []);

  const loadBattlePerformance = useCallback(async () => {
    setBattlePerformanceLoading(true);
    try {
      const response = await getbattlePerformance();
      const payload =
        response?.data?.data ??
        response?.data?.performance ??
        response?.data ??
        response;
      setBattlePerformance(payload);
    } catch (error) {
      setBattlePerformance(null);
    } finally {
      setBattlePerformanceLoading(false);
    }
  }, []);

  const loadPriorityBattles = useCallback(async (cId) => {
    setPriorityBattlesLoading(true);
    try {
      const response = await getClosetBattlesPriority(cId || resolvedClosetId);
      const raw = unwrapBattlePriorityResponse(response);
      const normalized = raw.map(normalizePriorityBattle);
      setPriorityBattles(normalized);
    } catch (error) {
      setPriorityBattles([]);
    } finally {
      setPriorityBattlesLoading(false);
    }
  }, [resolvedClosetId]);

  const loadEbooks = useCallback(async (cId) => {
    let targetClosetId = cId || closetIdRef.current || resolvedClosetId;
    if (!targetClosetId) {
      try {
        const response = await getMyClosetMe();
        const data = response?.data?.data ?? response?.data ?? {};
        targetClosetId = data?.closetId ?? data?.id ?? data?._id ?? null;
        if (targetClosetId) {
          closetIdRef.current = targetClosetId;
          setClosetId(targetClosetId);
        }
      } catch (err) {
        // non-fatal
      }
    }

    if (!targetClosetId) return;

    setEbooksLoading(true);
    try {
      const response = await getMarketplaceEbooksByClosetId(targetClosetId);
      const payload =
        response?.data?.ebooks ??
        response?.ebooks ??
        response?.data?.posts ??
        response?.data?.data ??
        [];

      const formattedData = Array.isArray(payload) ? payload : [];
      setDashboardEbooks(formattedData.slice(0, 3));
    } catch (error) {
      // non-fatal
    } finally {
      setEbooksLoading(false);
    }
  }, [resolvedClosetId]);

  const loadClosetItems = useCallback(async () => {
    setItemsLoading(true);
    try {
      const response = await getMyClosetItems();
      const payload = response?.data?.data ?? response?.data?.items ?? response?.data ?? [];
      const items = Array.isArray(payload) ? payload : [];
      setClosetItems(items);
    } catch (error) {
      setClosetItems([]);
    } finally {
      setItemsLoading(false);
    }
  }, []);

  const checkShopState = useCallback(async () => {
    try {
      const response = await getMyClosetMe();
      const data = response?.data?.data ?? response?.data ?? {};
      const resolvedCId = data?.closetId ?? data?.id ?? data?._id ?? null;
      if (data?.shopName) setShopName(data.shopName);
      if (data?.shopUsername) setShopHandle(data.shopUsername);
      setClosetId(resolvedCId);
      closetIdRef.current = resolvedCId;
      if (data?.shopLogo) setShopLogo(data.shopLogo);
      if (data?.userId && !currentUserId) setCurrentUserId(String(data.userId));
      return resolvedCId;
    } catch (error) {
      return closetIdRef.current;
    }
  }, [currentUserId]);

  useFocusEffect(
    useCallback(() => {
      dispatch(hideLoader());
      const loadAll = async () => {
        const cId = await checkShopState();
        loadClosetItems();
        loadRecentOrders();
        loadUnviewedOrderIds();
        loadBuyerOrders();
        loadDashboard();
        loadMarketplaceOverview(overviewRange);
        loadBattlePerformance();
        loadPriorityBattles(cId);
        loadEbooks(cId);
      };
      loadAll();
    }, [overviewRange, checkShopState, loadClosetItems, loadRecentOrders, loadUnviewedOrderIds, loadBuyerOrders, loadDashboard, loadMarketplaceOverview, loadBattlePerformance, loadPriorityBattles, loadEbooks, dispatch]),
  );

  const statCards = useMemo(() => buildStatCards(marketplaceOverview, t, numberLocale), [marketplaceOverview, t, numberLocale]);
  const overviewCards = useMemo(() => buildOverviewCards(dashboardData, t, numberLocale), [dashboardData, t, numberLocale]);
  const battleStats = useMemo(() => buildBattleStats(battlePerformance, t, numberLocale), [battlePerformance, t, numberLocale]);

  const handleToggleRange = () => {
    setOverviewRange(prev => (prev === 'weekly' ? 'monthly' : 'weekly'));
  };

  const avatarUri =
    shopDraft?.logo?.uri ||
    shopLogo ||
    currentUserData?.image ||
    userData?.image ||
    'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=200&auto=format&fit=crop&q=80';

  const handleAddItemPress = () => {
    navigation?.navigate?.('ProfileMain', {
      screen: 'MyClosetAddItemPhotos',
      params: {
        draft: {},
        isFirstItem: closetItems.length === 0,
      },
    });
  };

  const handleSharePress = async () => {
    try {
      let userId = userData?.id || userData?._id || userProfile?.id || userProfile?._id;
      if (!userId) userId = await AsyncStorage.getItem('userId');
      const username = shopHandle || 'letitgo';
      const link = `${BASE_URL}/closet/${encodeURIComponent(String(userId || ''))}`;
      const shareMessage = `🛒 Check out @${username}'s closet on Valens!\n\n🔗 ${link}`;
      await Share.share({ message: shareMessage });
    } catch (error) {
      // non-fatal
    }
  };

  const handleCreateBattlePress = () => {
    navigation?.navigate?.('ProfileMain', {
      screen: 'CreateBattle',
      params: {
        sellerId: currentUserId || userData?.id || userData?._id,
      },
    });
  };

  const handleViewAllBattles = () => {
    navigateToBattleList(navigation, resolvedClosetId, userProfile);
  };

  const handleViewAllItems = () => {
    navigation?.navigate?.('ProfileMain', {
      screen: 'MyClosetItemsManagement',
      params: { section: 'items', returnTo: 'MyClosetDashboard' },
    });
  };

  const handleViewAllEbooks = () => {
    navigation?.navigate?.('ProfileMain', {
      screen: 'AllEbooks',
      params: {
        closetId: resolvedClosetId,
        username: shopHandle || 'letitgo',
        from: 'MyClosetDashboard',
        returnTo: 'MyClosetDashboard',
      },
    });
  };

  const handleViewAllOrders = () => {
    setUnviewedOrderIds([]);
    markAllOrdersAsViewed().catch(() => {});
    navigation?.navigate?.('ProfileMain', {
      screen: 'MyClosetOrders',
      params: { viewType: 'seller', profileType: userData?.profile },
    });
  };

  const handleOpenAnalytics = () => {
    navigation?.navigate?.('wallet', {
      screen: 'MarketplaceAnalytics',
    });
  };

  const handleOpenEarnings = () => {
    navigation?.navigate?.('MyClosetEarnings');
  };

  const handleOpenOrder = (order) => {
    const rawOrder = order.raw || order;
    navigation?.navigate?.('ProfileMain', {
      screen: 'MyClosetOrderDetail',
      params: {
        orderId: rawOrder?.id || rawOrder?._id || order.id,
        orderPreview: rawOrder,
        viewType: 'seller',
        returnTo: 'MyClosetDashboard',
      },
    });
  };

  const handleViewAllBuyerOrders = () => {
    navigation?.navigate?.('ProfileMain', {
      screen: 'MyClosetOrders',
      params: { viewType: 'buyer', profileType: userData?.profile },
    });
  };

  const handleOpenBuyerOrder = (order) => {
    navigation?.navigate?.('ProfileMain', {
      screen: 'MyClosetOrderDetail',
      params: {
        orderId: order.raw?.id || order.raw?._id || order.id,
        orderPreview: order.raw,
        viewType: 'buyer',
        returnTo: 'MyClosetDashboard',
      },
    });
  };

  const getItemImage = item => item?.images?.[0] || item?.image || item?.thumbnail || null;

  const displayItems = closetItems.length > 0
    ? closetItems.slice(0, 6).map((item, index) => ({
      key: String(item?.id || item?._id || index),
      name: item?.name || item?.title || 'Vintage sneaker',
      price: formatOrderPrice(item?.price ?? item?.amount ?? 123),
      image: getItemImage(item),
      raw: item,
    }))
    : SAMPLE_GRID_ITEMS;

  const pinnedItems = priorityBattles.length > 0 ? priorityBattles.slice(0, 1) : [SAMPLE_PINNED_ITEM];
  const activeSellerOrders = recentOrders.length > 0 ? recentOrders : SAMPLE_SELLER_ORDERS;
  const activeBuyerOrders = buyerOrders.length > 0 ? buyerOrders : SAMPLE_BUYER_ORDERS;

  // Colors aligned with the mockup
  const screenBg = isDarkMode ? '#0F0C1B' : '#FAF8FD';
  const cardBg = isDarkMode ? '#1E1B2E' : '#FFFFFF';
  const cardBorder = isDarkMode ? '#2D2640' : '#EDE9FE';
  const primaryText = isDarkMode ? '#FFFFFF' : '#1E1B4B';
  const secondaryText = isDarkMode ? '#94A3B8' : '#64748B';
  const brandPurple = '#6B21A8';
  const deepPurple = '#3B0764';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: screenBg }]} edges={['top', 'left', 'right']}>
      {/* ── Top Header ── */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => navigation.openDrawer()}
          style={styles.headerBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Open drawer"
        >
          <Ionicons name="menu" size={28} color={primaryText} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: primaryText }]}>
          {t('walletStack.myCloset', 'My Closet')}
        </Text>

        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Hero Profile Card ── */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroAvatarWrap}>
              <HexAvatar
                uri={avatarUri}
                size={54}
                borderWidth={1.5}
                borderColor={brandPurple}
              />
              <View style={[styles.verifiedDot, { backgroundColor: brandPurple }]}>
                <Ionicons name="checkmark" size={10} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.heroMetaWrap}>
              <Text style={[styles.heroShopName, { color: primaryText }]} numberOfLines={1}>
                {shopName}
              </Text>
              <Text style={[styles.heroShopHandle, { color: secondaryText }]} numberOfLines={1}>
                valens.app/{String(shopHandle || 'letitgo').toLowerCase().replace(/\s+/g, '')}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSharePress}
              style={[styles.sharePill, { borderColor: cardBorder, backgroundColor: cardBg }]}
            >
              <Feather name="share" size={13} color={primaryText} style={{ marginRight: 5 }} />
              <Text style={[styles.sharePillText, { color: primaryText }]}>
                {t('myClosetDashboard.shareShop', 'Share')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Metrics: Items, Sold, Earnings */}
          <View style={styles.heroMetricsRow}>
            {overviewCards.map((card, idx) => (
              <React.Fragment key={card.key}>
                <TouchableOpacity
                  activeOpacity={card.key === 'earnings' ? 0.75 : 1}
                  onPress={card.key === 'earnings' ? handleOpenEarnings : undefined}
                  disabled={card.key !== 'earnings'}
                  style={styles.heroMetricCol}
                >
                  <Text
                    style={[
                      styles.heroMetricValue,
                      { color: card.key === 'earnings' ? brandPurple : primaryText },
                    ]}
                  >
                    {card.value}
                  </Text>
                  <Text style={[styles.heroMetricLabel, { color: secondaryText }]}>
                    {card.label}
                  </Text>
                </TouchableOpacity>
                {idx < overviewCards.length - 1 && (
                  <View style={[styles.heroMetricDivider, { backgroundColor: cardBorder }]} />
                )}
              </React.Fragment>
            ))}
          </View>

          {/* Status banner */}
          <View style={[styles.statusBanner, { backgroundColor: isDarkMode ? '#2E1065' : '#F5F3FF' }]}>
            <Ionicons name="bag-handle-outline" size={16} color={brandPurple} style={{ marginRight: 8 }} />
            <Text style={[styles.statusBannerText, { color: primaryText }]}>
              <Text style={{ fontWeight: '800' }}>Your shop is live! 🎉 </Text>
              <Text style={{ color: secondaryText, fontWeight: '500' }}>Keep adding items and grow your closet.</Text>
            </Text>
          </View>

          {/* Action Buttons: Add Item & Manage Items */}
          <View style={styles.heroActionsRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.primaryActionBtn, { backgroundColor: deepPurple }]}
              onPress={handleAddItemPress}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.primaryActionBtnText}>
                {t('myClosetDashboard.addItem', 'Add Item')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.secondaryActionBtn, { borderColor: brandPurple }]}
              onPress={handleViewAllItems}
            >
              <Ionicons name="layers-outline" size={16} color={brandPurple} style={{ marginRight: 6 }} />
              <Text style={[styles.secondaryActionBtnText, { color: brandPurple }]}>
                {t('myClosetDashboard.manageItems', 'Manage Items')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 2. Pinned Items ── */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: primaryText }]}>
              {t('myClosetDashboard.pinnedItemTitle', 'Pinned Items')}
            </Text>
            <TouchableOpacity activeOpacity={0.7} onPress={handleViewAllBattles}>
              <Text style={[styles.cardViewAll, { color: secondaryText }]}>
                {t('myClosetDashboard.manage', 'Manage')} ›
              </Text>
            </TouchableOpacity>
          </View>

          {pinnedItems.map((item) => (
            <View key={item.id} style={styles.pinnedItemCard}>
              <View style={[styles.pinnedThumbWrap, { backgroundColor: isDarkMode ? '#241738' : '#F1F5F9' }]}>
                {item.image ? (
                  <FastImage
                    source={fastImageSource(item.image)}
                    style={styles.pinnedThumbImage}
                    resizeMode={FastImage.resizeMode.cover}
                  />
                ) : (
                  <Ionicons name="shirt-outline" size={28} color={brandPurple} />
                )}
              </View>

              <View style={styles.pinnedInfoCol}>
                <Text style={[styles.pinnedItemTitle, { color: primaryText }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.pinnedItemPrice, { color: deepPurple }]}>
                  {item.price}
                </Text>
                <View style={[styles.pinnedBadge, { backgroundColor: isDarkMode ? '#2E1065' : '#F3E8FF' }]}>
                  <Ionicons name="pin-outline" size={12} color={brandPurple} style={{ marginRight: 3 }} />
                  <Text style={[styles.pinnedBadgeText, { color: brandPurple }]}>Pinned</Text>
                </View>
              </View>

              <View style={styles.winnerBadge}>
                <Text style={styles.winnerBadgeText}>🏆 Winner</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── 3. Overview (Weekly / Monthly stats) ── */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: primaryText }]}>
              {t('myClosetDashboard.overviewTitle', 'Overview')}
            </Text>
            <TouchableOpacity activeOpacity={0.7} onPress={handleOpenAnalytics}>
              <Text style={[styles.cardViewAll, { color: secondaryText }]}>
                {t('myClosetDashboard.viewAll', 'View all')} ›
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity activeOpacity={0.7} onPress={handleToggleRange} style={styles.rangeDropdown}>
            <Text style={[styles.rangeDropdownText, { color: primaryText }]}>
              {overviewRange === 'weekly' ? 'This week' : 'This month'} ▾
            </Text>
          </TouchableOpacity>

          {/* Row 1: Views, Likes, Orders (3 cards) */}
          <View style={styles.statsRowThree}>
            {statCards.slice(0, 3).map((c) => (
              <View
                key={c.key}
                style={[styles.statBoxThree, { backgroundColor: isDarkMode ? '#241738' : '#FAF8FE', borderColor: cardBorder }]}
              >
                <View style={styles.statHeaderRow}>
                  <Ionicons name={c.icon} size={15} color={brandPurple} style={{ marginRight: 4 }} />
                  <Text style={[styles.statBoxLabel, { color: secondaryText }]} numberOfLines={1}>
                    {c.label}
                  </Text>
                </View>
                <Text style={[styles.statBoxValue, { color: primaryText }]}>{c.value}</Text>
                {c.delta != null && (
                  <Text style={[styles.statDeltaText, { color: c.delta.startsWith('-') ? '#DC2626' : '#16A34A' }]}>
                    {c.delta}
                  </Text>
                )}
              </View>
            ))}
          </View>

          {/* Row 2: Revenue, Cancelled Orders (2 cards) */}
          <View style={styles.statsRowTwo}>
            {statCards.slice(3, 5).map((c) => (
              <View
                key={c.key}
                style={[styles.statBoxTwo, { backgroundColor: isDarkMode ? '#241738' : '#FAF8FE', borderColor: cardBorder }]}
              >
                <View style={styles.statHeaderRow}>
                  <Ionicons name={c.icon} size={15} color={brandPurple} style={{ marginRight: 4 }} />
                  <Text style={[styles.statBoxLabel, { color: secondaryText }]} numberOfLines={1}>
                    {c.label}
                  </Text>
                </View>
                <Text style={[styles.statBoxValue, { color: primaryText }]}>{c.value}</Text>
                {c.delta != null && (
                  <Text style={[styles.statDeltaText, { color: c.delta.startsWith('-') ? '#DC2626' : '#16A34A' }]}>
                    {c.delta}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* ── 4. Battle Performance ── */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="flame" size={17} color={brandPurple} style={{ marginRight: 6 }} />
              <Text style={[styles.cardTitle, { color: primaryText }]}>
                {t('myClosetDashboard.battlePerformanceTitle', 'Battle Performance')}
              </Text>
              <Ionicons name="information-circle-outline" size={15} color={secondaryText} style={{ marginLeft: 5 }} />
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={handleViewAllBattles}>
              <Text style={[styles.cardViewAll, { color: secondaryText }]}>
                {t('myClosetDashboard.viewAll', 'View all')} ›
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.battleStatsRow}>
            {battleStats.map((stat) => (
              <View
                key={stat.key}
                style={[styles.battleStatCard, { backgroundColor: isDarkMode ? '#241738' : '#FAF8FE', borderColor: cardBorder }]}
              >
                <Ionicons name={stat.icon} size={18} color={brandPurple} style={{ marginBottom: 4 }} />
                <Text style={[styles.battleStatValue, { color: primaryText }]}>{stat.value}</Text>
                <Text style={[styles.battleStatLabel, { color: secondaryText }]}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── 5. Orders — As a Seller ── */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: primaryText }]}>
              {t('myClosetDashboard.sellerOrdersTitle', 'Orders — As a Seller')}
            </Text>
            <TouchableOpacity activeOpacity={0.7} onPress={handleViewAllOrders}>
              <Text style={[styles.cardViewAll, { color: secondaryText }]}>
                {t('myClosetDashboard.viewAll', 'View all')} ›
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.ordersListWrap}>
            {activeSellerOrders.map((item) => (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.8}
                style={styles.orderItemRow}
                onPress={() => handleOpenOrder(item)}
              >
                <View style={[styles.orderThumbWrap, { backgroundColor: isDarkMode ? '#241738' : '#F1F5F9' }]}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.orderThumbImage} />
                  ) : (
                    <Ionicons name="shirt-outline" size={20} color={brandPurple} />
                  )}
                </View>

                <View style={styles.orderMidCol}>
                  <Text style={[styles.orderItemName, { color: primaryText }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.orderIdText, { color: secondaryText }]} numberOfLines={1}>
                    {item.order}
                  </Text>
                  <Text style={[styles.orderMetaText, { color: secondaryText }]} numberOfLines={1}>
                    {item.dateText || item.buyerName}
                  </Text>
                </View>

                <View style={styles.orderRightCol}>
                  <View style={[styles.statusPill, { backgroundColor: isDarkMode ? '#2E1065' : '#F3E8FF' }]}>
                    <Text style={[styles.statusPillText, { color: brandPurple }]}>{item.status}</Text>
                  </View>
                  <Text style={[styles.orderAmountText, { color: primaryText }]}>{item.totalAmount}</Text>
                  <Text style={[styles.orderCountSubtext, { color: secondaryText }]}>
                    {item.totalItemCount} item{item.totalItemCount === 1 ? '' : 's'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── 6. Orders — As a Buyer ── */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="cart-outline" size={17} color={brandPurple} style={{ marginRight: 6 }} />
              <Text style={[styles.cardTitle, { color: primaryText }]}>
                {t('myClosetDashboard.buyerOrdersTitle', 'Orders — As a Buyer')}
              </Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={handleViewAllBuyerOrders}>
              <Text style={[styles.cardViewAll, { color: secondaryText }]}>
                {t('myClosetDashboard.viewAll', 'View all')} ›
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.ordersListWrap}>
            {activeBuyerOrders.map((item) => (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.8}
                style={styles.orderItemRow}
                onPress={() => handleOpenBuyerOrder(item)}
              >
                <View style={[styles.orderThumbWrap, { backgroundColor: isDarkMode ? '#241738' : '#F1F5F9' }]}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.orderThumbImage} />
                  ) : (
                    <Ionicons name="bag-handle-outline" size={20} color={brandPurple} />
                  )}
                </View>

                <View style={styles.orderMidCol}>
                  <Text style={[styles.orderItemName, { color: primaryText }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.orderIdText, { color: secondaryText }]} numberOfLines={1}>
                    {item.order}
                  </Text>
                  <Text style={[styles.orderMetaText, { color: secondaryText }]} numberOfLines={1}>
                    {item.dateText}
                  </Text>
                </View>

                <View style={styles.orderRightCol}>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          item.status.toLowerCase() === 'cancelled'
                            ? (isDarkMode ? '#3B1219' : '#FEE2E2')
                            : (isDarkMode ? '#2E1065' : '#F3E8FF'),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        {
                          color:
                            item.status.toLowerCase() === 'cancelled' ? '#DC2626' : brandPurple,
                        },
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                  <Text style={[styles.orderAmountText, { color: primaryText }]}>{item.totalAmount}</Text>
                  <Text style={[styles.orderCountSubtext, { color: secondaryText }]}>
                    {item.totalItemCount} item{item.totalItemCount === 1 ? '' : 's'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── 7. Your Items Grid ── */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: primaryText }]}>
              {t('myClosetDashboard.yourItemsTitle', 'Your Items')}
            </Text>
            <TouchableOpacity activeOpacity={0.7} onPress={handleViewAllItems}>
              <Text style={[styles.cardViewAll, { color: secondaryText }]}>
                {t('myClosetDashboard.viewAll', 'View all')} ›
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.itemsGridWrap}>
            {displayItems.map((item) => (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.85}
                style={styles.gridItemTile}
                onPress={() =>
                  navigation?.navigate?.('ProfileMain', {
                    screen: 'MyClosetItemEditor',
                    params: {
                      item: item.raw || item,
                      returnTo: 'MyClosetDashboard',
                    },
                  })
                }
              >
                <View style={[styles.gridItemImageWrap, { backgroundColor: isDarkMode ? '#241738' : '#F1F5F9' }]}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.gridItemImage} />
                  ) : (
                    <Ionicons name="shirt-outline" size={24} color={brandPurple} />
                  )}
                </View>
                <Text style={[styles.gridItemName, { color: primaryText }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.gridItemPrice, { color: secondaryText }]}>
                  {item.price}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Dotted Add New Item Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.dottedAddBtn, { borderColor: brandPurple }]}
            onPress={handleAddItemPress}
          >
            <Ionicons name="add" size={18} color={brandPurple} style={{ marginRight: 4 }} />
            <Text style={[styles.dottedAddBtnText, { color: brandPurple }]}>
              {t('myClosetDashboard.addNewItem', 'Add New Item')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── 8. My E-books ── */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="book-outline" size={17} color={brandPurple} style={{ marginRight: 6 }} />
              <Text style={[styles.cardTitle, { color: primaryText }]}>
                {t('myClosetDashboard.ebooksTitle', 'My E-books')}
              </Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={handleViewAllEbooks}>
              <Text style={[styles.cardViewAll, { color: secondaryText }]}>
                {t('myClosetDashboard.viewAll', 'View all')} ›
              </Text>
            </TouchableOpacity>
          </View>

          {dashboardEbooks.length > 0 ? (
            dashboardEbooks.map((item) => (
              <EbookCard
                key={String(item.id || item._id)}
                item={item}
                isPurchased={true}
                isOwnProfile={true}
                accentColor={brandPurple}
                onPress={() => {
                  navigation?.navigate?.('EbookDetail', {
                    ebook: item,
                    userData,
                    from: 'MyClosetDashboard',
                    returnTo: 'MyClosetDashboard',
                  });
                }}
              />
            ))
          ) : (
            <View style={styles.emptyEbooksWrap}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="book-outline" size={16} color={secondaryText} style={{ marginRight: 6 }} />
                <Text style={[styles.emptyEbooksText, { color: primaryText }]}>
                  {t('myClosetDashboard.noEbooksYet', 'No E-books yet')}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.addEbookPill, { backgroundColor: isDarkMode ? '#2E1065' : '#F3E8FF' }]}
                onPress={() =>
                  navigation?.navigate?.('wallet', {
                    screen: 'EbookPublisher',
                    params: { type: 'private', format: 'ebook', fromRootNavigator: true },
                  })
                }
              >
                <Ionicons name="add" size={14} color={brandPurple} style={{ marginRight: 4 }} />
                <Text style={[styles.addEbookPillText, { color: brandPurple }]}>
                  {t('myClosetDashboard.addEbook', 'Add E-book')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── 9. What's a Battle Shop? Explainer ── */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setBattleInfoVisible(true)}
          style={[styles.explainerCard, { backgroundColor: isDarkMode ? '#1E1B2E' : '#FAF8FE', borderColor: cardBorder }]}
        >
          <View style={[styles.explainerIconWrap, { backgroundColor: isDarkMode ? '#2E1065' : '#F3E8FF' }]}>
            <Ionicons name="bulb-outline" size={20} color={brandPurple} />
          </View>
          <View style={styles.explainerTextWrap}>
            <Text style={[styles.explainerTitle, { color: primaryText }]}>
              {t('myClosetDashboard.battleExplainerTitle', "What's a Battle Shop?")}
            </Text>
            <Text style={[styles.explainerSubtitle, { color: secondaryText }]}>
              {t(
                'myClosetDashboard.battleExplainerSubtitle',
                'Turn your items into a fun battle and let the community vote. Showcase your items and engage with others!'
              )}
            </Text>
          </View>
        </TouchableOpacity>

        {/* ── 10. Sticky / Promo Battle Item Bar ── */}
        <View style={[styles.battleStickyBar, { backgroundColor: deepPurple }]}>
          <View style={styles.battleStickyLeft}>
            <View style={styles.flameCircle}>
              <Ionicons name="flame" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.battleStickyTextWrap}>
              <Text style={styles.battleStickyTitle} numberOfLines={1}>
                {t('myClosetDashboard.battleCtaTitle', 'Battle Item')}
              </Text>
              <Text style={styles.battleStickySubtitle} numberOfLines={2}>
                {t('myClosetDashboard.battleCtaSubtitle', 'Let your items compete and earn votes!')}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleCreateBattlePress}
            style={styles.battleStickyBtn}
          >
            <Text style={styles.battleStickyBtnText} numberOfLines={1}>
              {t('myClosetDashboard.createBattleButton', 'Create Battle')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Battle Info Modal */}
      <Modal
        visible={battleInfoVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setBattleInfoVisible(false)}
      >
        <View style={styles.battleModalOverlay}>
          <View style={[styles.battleModalCard, { backgroundColor: cardBg }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.battleModalTop}>
                <Text style={[styles.battleModalTitle, { color: brandPurple }]}>
                  {t('myClosetDashboard.battleModal.title', "What's a Battle Shop?")}
                </Text>
                <TouchableOpacity
                  onPress={() => setBattleInfoVisible(false)}
                  style={[styles.battleModalClose, { backgroundColor: isDarkMode ? '#2E1065' : '#F3E8FF' }]}
                >
                  <Ionicons name="close" size={20} color={brandPurple} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.battleModalIntro, { color: secondaryText }]}>
                {t(
                  'myClosetDashboard.battleModal.intro',
                  'Turn your closet items into engaging head-to-head battles! Let the community vote for their favorites and boost visibility.'
                )}
              </Text>

              <Text style={[styles.battleModalSectionTitle, { color: brandPurple }]}>How It Works</Text>
              <View style={styles.battleStepsRow}>
                {[
                  { number: '1', title: 'Pick Items', desc: 'Select 2 items to compete' },
                  { number: '2', title: 'Community Votes', desc: 'Followers & shoppers vote' },
                  { number: '3', title: 'Winner Boosted', desc: 'Earn badges and top spots' },
                ].map((s) => (
                  <View key={s.number} style={[styles.battleStepBox, { backgroundColor: isDarkMode ? '#241738' : '#FAF8FE' }]}>
                    <Text style={[styles.battleStepNumText, { color: brandPurple }]}>{s.number}</Text>
                    <Text style={[styles.battleStepBoxTitle, { color: primaryText }]}>{s.title}</Text>
                    <Text style={[styles.battleStepBoxDesc, { color: secondaryText }]}>{s.desc}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setBattleInfoVisible(false)}
              style={[styles.battleModalDoneBtn, { backgroundColor: brandPurple }]}
            >
              <Text style={styles.battleModalDoneBtnText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default MyClosetDashboard;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroAvatarWrap: {
    marginRight: 12,
    position: 'relative',
  },
  verifiedDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  heroMetaWrap: {
    flex: 1,
    paddingRight: 8,
  },
  heroShopName: {
    fontSize: 18,
    fontWeight: '800',
  },
  heroShopHandle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  sharePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  sharePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  heroMetricCol: {
    flex: 1,
    alignItems: 'center',
  },
  heroMetricValue: {
    fontSize: 19,
    fontWeight: '800',
  },
  heroMetricLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 3,
  },
  heroMetricDivider: {
    width: 1,
    height: 30,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  statusBannerText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 12,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 11,
    backgroundColor: 'transparent',
  },
  secondaryActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardViewAll: {
    fontSize: 12,
    fontWeight: '600',
  },
  pinnedItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinnedThumbWrap: {
    width: 76,
    height: 76,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pinnedThumbImage: {
    width: '100%',
    height: '100%',
  },
  pinnedInfoCol: {
    flex: 1,
    paddingRight: 8,
  },
  pinnedItemTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  pinnedItemPrice: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 3,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  pinnedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  winnerBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  winnerBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
  },
  rangeDropdown: {
    marginBottom: 12,
  },
  rangeDropdownText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsRowThree: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  statBoxThree: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
  },
  statsRowTwo: {
    flexDirection: 'row',
    gap: 8,
  },
  statBoxTwo: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
  },
  statHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statBoxLabel: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  statBoxValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  statDeltaText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  battleStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  battleStatCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: 'flex-start',
  },
  battleStatValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  battleStatLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  ordersListWrap: {
    gap: 12,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderThumbWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  orderThumbImage: {
    width: '100%',
    height: '100%',
  },
  orderMidCol: {
    flex: 1,
    paddingRight: 6,
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '700',
  },
  orderIdText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  orderMetaText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  orderRightCol: {
    alignItems: 'flex-end',
  },
  statusPill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  orderAmountText: {
    fontSize: 14,
    fontWeight: '800',
  },
  orderCountSubtext: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  itemsGridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItemTile: {
    width: '31%',
    marginBottom: 6,
  },
  gridItemImageWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  gridItemImage: {
    width: '100%',
    height: '100%',
  },
  gridItemName: {
    fontSize: 12,
    fontWeight: '700',
  },
  gridItemPrice: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  dottedAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingVertical: 12,
    marginTop: 10,
  },
  dottedAddBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyEbooksWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  emptyEbooksText: {
    fontSize: 13,
    fontWeight: '700',
  },
  addEbookPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addEbookPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  explainerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  explainerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  explainerTextWrap: {
    flex: 1,
  },
  explainerTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  explainerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 3,
    lineHeight: 16,
  },
  battleStickyBar: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    shadowColor: '#3B0764',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  battleStickyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  flameCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  battleStickyTextWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  battleStickyTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  battleStickySubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
  },
  battleStickyBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  battleStickyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  battleModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  battleModalCard: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 22,
    padding: 20,
  },
  battleModalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  battleModalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  battleModalClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  battleModalIntro: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  battleModalSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  battleStepsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  battleStepBox: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  battleStepNumText: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  battleStepBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  battleStepBoxDesc: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  battleModalDoneBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  battleModalDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
