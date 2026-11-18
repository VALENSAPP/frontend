import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
  Image,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppTheme } from '../../theme/useApptheme';
import { useLanguage } from '../../i18n';
import {
  getMyClosetItems,
  getMyClosetExploreItems,
  getCart,
  getWishlist,
  addWishlistItem,
  deleteWishlistItem,
  toggleMyClosetItemLike,
} from '../../services/myCloset';
import { withClosetNavParams } from '../../utils/closetNavigation';
import {
  getActivePromotions,
  calculatePromotionDeliveryRank,
  sortExploreFeedWithAlgorithm,
} from '../../utils/marketplaceDeliveryAlgorithm';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_GAP = 12;
const HORIZONTAL_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - (HORIZONTAL_PADDING * 2) - COLUMN_GAP) / 2;

const CATEGORIES = [
  { key: 'all', labelKey: 'marketplace.catAll', labelFallback: 'All', icon: 'grid-outline' },
  { key: 'clothing', labelKey: 'marketplace.catClothing', labelFallback: 'Clothing', icon: 'shirt-outline' },
  { key: 'shoes', labelKey: 'marketplace.catShoes', labelFallback: 'Shoes', icon: 'footsteps-outline' },
  { key: 'bags', labelKey: 'marketplace.catBags', labelFallback: 'Bags', icon: 'bag-handle-outline' },
  { key: 'home', labelKey: 'marketplace.catHome', labelFallback: 'Home & Decor', icon: 'home-outline' },
  { key: 'accessories', labelKey: 'marketplace.catAccessories', labelFallback: 'Accessories', icon: 'watch-outline' },
  { key: 'beauty', labelKey: 'marketplace.catBeauty', labelFallback: 'Beauty', icon: 'sparkles-outline' },
  { key: 'ebooks', labelKey: 'marketplace.catEbooks', labelFallback: 'E-books', icon: 'book-outline' },
  { key: 'others', labelKey: 'marketplace.catOthers', labelFallback: 'Others', icon: 'cube-outline' },
];

const SORT_OPTIONS = [
  { key: 'latest', labelKey: 'marketplace.sortLatest', labelFallback: 'Latest' },
  { key: 'popular', labelKey: 'marketplace.sortPopular', labelFallback: 'Most Popular' },
  { key: 'price_low', labelKey: 'marketplace.sortPriceLow', labelFallback: 'Price: Low to High' },
  { key: 'price_high', labelKey: 'marketplace.sortPriceHigh', labelFallback: 'Price: High to Low' },
];

const CONDITION_OPTIONS = [
  { key: 'all', labelKey: 'marketplace.allConditions', labelFallback: 'All Conditions', icon: 'grid-outline' },
  { key: 'New', labelKey: 'marketplace.condNew', labelFallback: 'Brand New', icon: 'sparkles-outline' },
  { key: 'Good_condition', labelKey: 'marketplace.condGood', labelFallback: 'Good Condition', icon: 'thumbs-up-outline' },
  { key: 'Used', labelKey: 'marketplace.condUsed', labelFallback: 'Gently Used', icon: 'repeat-outline' },
  { key: 'Need_attention', labelKey: 'marketplace.condNeedAttention', labelFallback: 'Needs Attention', icon: 'alert-circle-outline' },
];

const SORT_BY_OPTIONS = [
  { key: 'all', labelKey: 'marketplace.smartRank', labelFallback: 'Smart Rank', icon: 'sparkles-outline' },
  { key: 'createdAt', labelKey: 'marketplace.dateAdded', labelFallback: 'Latest Added', icon: 'time-outline' },
  { key: 'price', labelKey: 'marketplace.sortPrice', labelFallback: 'Price', icon: 'pricetag-outline' },
  { key: 'priority', labelKey: 'marketplace.sortPriority', labelFallback: 'Priority Tier', icon: 'ribbon-outline' },
  { key: 'promotedAt', labelKey: 'marketplace.sortPromoted', labelFallback: 'Battle Promoted', icon: 'trophy-outline' },
  { key: 'boostedAt', labelKey: 'marketplace.sortBoosted', labelFallback: 'Boosted', icon: 'rocket-outline' },
];

const SORT_ORDER_OPTIONS = [
  { key: 'desc', labelKey: 'marketplace.orderDesc', labelFallback: 'High to Low (Newest)', icon: 'arrow-down' },
  { key: 'asc', labelKey: 'marketplace.orderAsc', labelFallback: 'Low to High (Oldest)', icon: 'arrow-up' },
];

const PRICE_PRESETS = [
  { label: '< $25', min: '', max: '25' },
  { label: '$25 - $50', min: '25', max: '50' },
  { label: '$50 - $100', min: '50', max: '100' },
  { label: '$100+', min: '100', max: '' },
];

export default function MarketplaceScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const {
    bgStyle,
    textStyle,
    text,
    card,
    cardStyle,
    border,
    mutedText,
    mutedTextStyle,
    accent,
    isDarkMode,
    isBusinessProfile,
  } = useAppTheme();

  // Dynamic theme-aware palette values (responsive to dark/light mode & business/persona profile)
  const themeCardBg = isDarkMode ? '#252525' : (isBusinessProfile ? '#FAF7F0' : '#F8F6FC');
  const themeCardBorder = isDarkMode ? '#383838' : (border || (isBusinessProfile ? '#EFE7D8' : '#EDE6F6'));
  const themeItemText = isDarkMode ? (isBusinessProfile ? '#EAD6AA' : '#EDE7F6') : (isBusinessProfile ? '#785A1E' : text);
  const themeItemIcon = isDarkMode ? (isBusinessProfile ? '#C9A15A' : '#C4B5FD') : (isBusinessProfile ? '#A8843C' : mutedText);
  const themeBadgeBg = isDarkMode ? '#333333' : (isBusinessProfile ? '#FAF4E8' : '#F4EFFC');
  const themeDragHandle = isDarkMode ? '#484848' : (isBusinessProfile ? '#E8DFCE' : '#E2D9F3');

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedSortBy, setSelectedSortBy] = useState('all');
  const [selectedSortOrder, setSelectedSortOrder] = useState('desc');
  const [selectedSort, setSelectedSort] = useState('latest');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Staged filter state for the modal
  const [tempCondition, setTempCondition] = useState('all');
  const [tempMinPrice, setTempMinPrice] = useState('');
  const [tempMaxPrice, setTempMaxPrice] = useState('');
  const [tempSortBy, setTempSortBy] = useState('all');
  const [tempSortOrder, setTempSortOrder] = useState('desc');

  const [cartItemCount, setCartItemCount] = useState(0);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const activePromotionsRef = useRef({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const filtersRef = useRef({
    search: '',
    category: 'all',
    condition: 'all',
    minPrice: '',
    maxPrice: '',
    sortBy: 'all',
    sortOrder: 'desc',
  });

  // ─── Resolve Image URL ──────────────────────────────────────────────────────
  const resolveImage = (item) => {
    if (!item) return null;
    if (Array.isArray(item.images) && item.images.length > 0) {
      const first = item.images[0];
      if (typeof first === 'string') return first;
      if (first?.url) return first.url;
      if (first?.uri) return first.uri;
    }
    if (typeof item.image === 'string') return item.image;
    if (item.image?.uri) return item.image.uri;
    if (item.image?.url) return item.image.url;
    if (item.thumbnail) return item.thumbnail;
    if (item.coverImage) return item.coverImage;
    return null;
  };

  // ─── Format Price ───────────────────────────────────────────────────────────
  const formatPrice = (val) => {
    if (val == null) return '$0.00';
    if (typeof val === 'string' && val.startsWith('$')) return val;
    const num = Number(val);
    if (Number.isNaN(num)) return `$${val}`;
    return `$${num.toFixed(2)}`;
  };

  // ─── Format Product Item from API & Apply Delivery Algorithm ─────────────────
  const formatProduct = useCallback((item, idx, localPromosOverride) => {
    const itemId = String(item.id || item._id || item.productId || idx);
    const img = resolveImage(item);
    const originalPrice = Number(item.pricing?.originalPrice ?? item.price ?? item.amount ?? 0) || 0;
    let currentPrice = Number(item.pricing?.currentPrice ?? item.pricing?.promoPrice ?? item.price ?? item.amount ?? 0) || 0;

    // Evaluate promotion delivery rank & local active promotions
    const activePromos = localPromosOverride || activePromotionsRef.current || {};
    const promoDelivery = calculatePromotionDeliveryRank(item, activePromos);
    const effectivePromo = promoDelivery.effectivePromotion || item.promotion || {};

    let hasDiscount = Boolean(
      (item.pricing?.promoPrice && item.pricing.promoPrice < originalPrice) ||
      (currentPrice > 0 && originalPrice > currentPrice) ||
      effectivePromo.hasPercentageOff ||
      effectivePromo.discountPercent
    );

    let discountPercent = effectivePromo.discountPercent ||
      (hasDiscount && originalPrice > 0 ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : null);

    // Apply active promotional discount
    if (effectivePromo.hasPercentageOff && effectivePromo.discountPercent) {
      const pct = Number(effectivePromo.discountPercent) || 0;
      if (pct > 0 && originalPrice > 0) {
        hasDiscount = true;
        discountPercent = pct;
        currentPrice = Number((originalPrice * (1 - pct / 100)).toFixed(2));
      }
    }

    const shippingFee = Number(item.pricing?.currentShippingFee ?? item.shippingFee ?? 0) || 0;
    const isFreeShipping = Boolean(effectivePromo.hasFreeShipping || shippingFee === 0);
    const quantity = Number(item.quantity != null ? item.quantity : 1);
    const isOutOfStock = quantity <= 0;

    return {
      id: itemId,
      name: item.name || item.itemName || item.title || t('marketplace.untitled', 'Product'),
      price: currentPrice,
      originalPrice,
      hasDiscount,
      discountPercent,
      formattedPrice: formatPrice(currentPrice),
      formattedOriginalPrice: formatPrice(originalPrice),
      image: img,
      images: Array.isArray(item.images) && item.images.length > 0 ? item.images : (img ? [img] : []),
      category: String(item.category || item.shopCategory || 'Other').toLowerCase(),
      displayCategory: item.category || item.shopCategory || 'General',
      condition: item.condition || 'New',
      brand: item.brand || '',
      description: item.description || '',
      quantity,
      isOutOfStock,
      soldCount: Number(item.soldCount || 0),
      shippingOption: item.shippingOption || 'both',
      shippingFee,
      isFreeShipping,
      estimateShippingTime: item.estimateShippingTime || '',
      returnPolicy: item.returnPolicy || '',
      promotion: effectivePromo,
      pricing: item.pricing || {},
      seller: {
        id: item.userId || item.sellerId || item.closet?.userId || item.user?.id,
        username: item.closet?.shopUsername || item.user?.userName || item.seller?.username || 'shop',
        displayName: item.closet?.shopName || item.user?.displayName || item.seller?.displayName || 'Shop',
        avatar: item.closet?.shopLogo || item.user?.image || item.seller?.profilePicture || null,
        location: item.closet?.location || item.pickUpCity || null,
      },
      closet: item.closet || null,
      closetId: item.closetId || item.closet?.id || null,
      isEbook: item.type === 'EBOOK' || item.isEbook === true,
      createdAt: item.createdAt || '',
      raw: item,
      _promoDelivery: promoDelivery,
      isPromoted: promoDelivery.isPromoted,
      isBattleWinner: promoDelivery.isBattleWinner,
      promotionBadge: promoDelivery.effectiveBadge,
    };
  }, [t]);

  // ─── Fetch Cart Count ───────────────────────────────────────────────────────
  const fetchCartCount = useCallback(async () => {
    try {
      const res = await getCart();
      const cartsArr = res?.data?.data?.carts ?? res?.data?.carts ?? [];
      const count = cartsArr.reduce((acc, c) => acc + (c?.cartItems?.length || 0), 0);
      setCartItemCount(count);
    } catch {
      // Cart fetch is non-blocking
    }
  }, []);

  // ─── Fetch Wishlist ─────────────────────────────────────────────────────────
  const fetchWishlistState = useCallback(async () => {
    try {
      const res = await getWishlist();
      const raw = res?.data?.data ?? res?.data?.wishlist ?? res?.data ?? [];
      const list = Array.isArray(raw) ? raw : (raw?.items || []);
      const ids = new Set();
      list.forEach(w => {
        const pId = w?.productId || w?.product?.id || w?.id || w?._id;
        if (pId) ids.add(String(pId));
      });
      setWishlistIds(ids);
    } catch {
      // Wishlist fetch is non-blocking
    }
  }, []);

  // ─── Fetch Products From API ────────────────────────────────────────────────
  const fetchProducts = useCallback(async (isRefresh = false, pageNumber = 1, filterOverrides = null) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (pageNumber === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      // 1. Sync active promotions locally so promoted battle winners are delivered immediately
      const activePromos = await getActivePromotions();
      activePromotionsRef.current = activePromos;

      const currentF = filterOverrides || filtersRef.current || {};
      const exploreParams = {
        page: pageNumber,
        limit: 20,
      };

      if (currentF.search && currentF.search.trim()) {
        exploreParams.search = currentF.search.trim();
      }
      if (currentF.category && currentF.category !== 'all') {
        exploreParams.category = currentF.category;
      }
      if (currentF.condition && currentF.condition !== 'all' && currentF.condition !== '--') {
        exploreParams.condition = currentF.condition;
      }
      if (currentF.minPrice !== '' && currentF.minPrice != null && !isNaN(Number(currentF.minPrice))) {
        exploreParams.minPrice = Number(currentF.minPrice);
      }
      if (currentF.maxPrice !== '' && currentF.maxPrice != null && !isNaN(Number(currentF.maxPrice))) {
        exploreParams.maxPrice = Number(currentF.maxPrice);
      }
      if (currentF.sortBy && currentF.sortBy !== 'all' && currentF.sortBy !== '--') {
        exploreParams.sortBy = currentF.sortBy;
      }
      if (currentF.sortOrder && currentF.sortOrder !== 'all' && currentF.sortOrder !== '--') {
        exploreParams.sortOrder = currentF.sortOrder;
      }

      let res;
      try {
        res = await getMyClosetExploreItems(exploreParams);
      } catch (exploreErr) {
        console.warn('⚠️ [Marketplace:fetchProducts] explore endpoint fallback:', exploreErr?.message);
        res = await getMyClosetItems();
      }

      const rawData = res?.data?.data ?? res?.data ?? {};
      const productList = Array.isArray(rawData?.products)
        ? rawData.products
        : (Array.isArray(rawData?.items)
            ? rawData.items
            : (Array.isArray(rawData) ? rawData : []));

      const formatted = productList.map((item, idx) => formatProduct(item, idx, activePromos));

      if (pageNumber === 1 || isRefresh) {
        setProducts(formatted);
      } else {
        setProducts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newUnique = formatted.filter(p => !existingIds.has(p.id));
          return [...prev, ...newUnique];
        });
      }

      const total = rawData?.total ?? productList.length;
      const totalP = rawData?.totalPages ?? 1;
      const more = rawData?.hasMore ?? (pageNumber < totalP);

      setPage(pageNumber);
      setTotalCount(total);
      setTotalPages(totalP);
      setHasMore(more);
    } catch (err) {
      console.warn('❌ [MarketplaceScreen:fetchProducts] error:', err?.message || err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [formatProduct]);

  // Load more on end reached
  const handleLoadMore = () => {
    if (!loading && !loadingMore && !refreshing && hasMore) {
      fetchProducts(false, page + 1);
    }
  };

  const fetchProductsRef = useRef(fetchProducts);
  fetchProductsRef.current = fetchProducts;
  const fetchCartCountRef = useRef(fetchCartCount);
  fetchCartCountRef.current = fetchCartCount;
  const fetchWishlistStateRef = useRef(fetchWishlistState);
  fetchWishlistStateRef.current = fetchWishlistState;

  useFocusEffect(
    useCallback(() => {
      fetchProductsRef.current?.(false, 1);
      fetchCartCountRef.current?.();
      fetchWishlistStateRef.current?.();
    }, [])
  );

  // ─── Filter & Search Handlers ───────────────────────────────────────────────
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCondition && selectedCondition !== 'all') count += 1;
    if (minPrice !== '' && !isNaN(Number(minPrice))) count += 1;
    if (maxPrice !== '' && !isNaN(Number(maxPrice))) count += 1;
    if (selectedSortBy && selectedSortBy !== 'all') count += 1;
    return count;
  }, [selectedCondition, minPrice, maxPrice, selectedSortBy]);

  const searchTimerRef = useRef(null);
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      const updated = { ...filtersRef.current, search: text };
      filtersRef.current = updated;
      fetchProducts(false, 1, updated);
    }, 450);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const updated = { ...filtersRef.current, search: '' };
    filtersRef.current = updated;
    fetchProducts(false, 1, updated);
  };

  const handleSearchSubmit = () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const updated = { ...filtersRef.current, search: searchQuery };
    filtersRef.current = updated;
    fetchProducts(false, 1, updated);
  };

  const handleSelectCategory = (catKey) => {
    setSelectedCategory(catKey);
    const updated = { ...filtersRef.current, category: catKey };
    filtersRef.current = updated;
    fetchProducts(false, 1, updated);
  };

  const openFilterModal = () => {
    setTempCondition(selectedCondition);
    setTempMinPrice(minPrice ? String(minPrice) : '');
    setTempMaxPrice(maxPrice ? String(maxPrice) : '');
    setTempSortBy(selectedSortBy);
    setTempSortOrder(selectedSortOrder);
    setFilterModalVisible(true);
  };

  const handleApplyFilters = () => {
    setSelectedCondition(tempCondition);
    setMinPrice(tempMinPrice);
    setMaxPrice(tempMaxPrice);
    setSelectedSortBy(tempSortBy);
    setSelectedSortOrder(tempSortOrder);
    setFilterModalVisible(false);

    const updated = {
      ...filtersRef.current,
      condition: tempCondition,
      minPrice: tempMinPrice,
      maxPrice: tempMaxPrice,
      sortBy: tempSortBy,
      sortOrder: tempSortOrder,
    };
    filtersRef.current = updated;
    fetchProducts(false, 1, updated);
  };

  const handleResetFilters = () => {
    setTempCondition('all');
    setTempMinPrice('');
    setTempMaxPrice('');
    setTempSortBy('all');
    setTempSortOrder('desc');
  };

  const handleClearAllActiveFilters = () => {
    setSelectedCategory('all');
    setSelectedCondition('all');
    setMinPrice('');
    setMaxPrice('');
    setSelectedSortBy('all');
    setSelectedSortOrder('desc');
    setSearchQuery('');

    const cleared = {
      search: '',
      category: 'all',
      condition: 'all',
      minPrice: '',
      maxPrice: '',
      sortBy: 'all',
      sortOrder: 'desc',
    };
    filtersRef.current = cleared;
    fetchProducts(false, 1, cleared);
  };

  const handleRemoveCondition = () => {
    setSelectedCondition('all');
    const updated = { ...filtersRef.current, condition: 'all' };
    filtersRef.current = updated;
    fetchProducts(false, 1, updated);
  };

  const handleRemovePrice = () => {
    setMinPrice('');
    setMaxPrice('');
    const updated = { ...filtersRef.current, minPrice: '', maxPrice: '' };
    filtersRef.current = updated;
    fetchProducts(false, 1, updated);
  };

  const handleRemoveSort = () => {
    setSelectedSortBy('all');
    setSelectedSortOrder('desc');
    const updated = { ...filtersRef.current, sortBy: 'all', sortOrder: 'desc' };
    filtersRef.current = updated;
    fetchProducts(false, 1, updated);
  };

  // ─── Toggle Wishlist ────────────────────────────────────────────────────────
  const handleToggleWishlist = async (item) => {
    const pId = String(item.id);
    const isCurrentlyLiked = wishlistIds.has(pId);
    const nextSet = new Set(wishlistIds);

    if (isCurrentlyLiked) {
      nextSet.delete(pId);
    } else {
      nextSet.add(pId);
    }
    setWishlistIds(nextSet);

    try {
      if (isCurrentlyLiked) {
        await deleteWishlistItem(pId);
      } else {
        await addWishlistItem(pId);
        await toggleMyClosetItemLike(pId);
      }
    } catch {
      setWishlistIds(wishlistIds);
    }
  };

  // ─── Navigate to Product Details ────────────────────────────────────────────
  const handleProductPress = (item) => {
    if (item.isEbook) {
      navigation.navigate('EbookBuyDetails', {
        item: item.raw || item,
        ebook: item.raw || item,
        sellerId: item.seller?.id,
      });
      return;
    }

    const battleWinner = (item.isBattleWinner || item.promotion?.battleId)
      ? {
          isWinner: true,
          pct: item.promotion?.discountPercent ? Math.round(100 - Number(item.promotion.discountPercent)) : 100,
          battleId: item.promotion?.battleId,
          battleTitle: item.promotion?.promotionMessage || item.promotionBadge || 'Battle Winner',
        }
      : null;

    navigation.navigate('MyClosetBuyerItemDetail', withClosetNavParams(
      {},
      {
        item: item.raw || item,
        seller: item.seller,
        sellerId: item.seller?.id,
        closetId: item.closetId,
        displayName: item.seller?.displayName || item.seller?.username,
        battleWinner,
      }
    ));
  };

  // ─── Filter & Sort Products (Explore Promotion Delivery Algorithm) ──────────
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Category filter matching real backend category paths
    if (selectedCategory !== 'all') {
      result = result.filter(p => {
        const cat = p.category.toLowerCase();
        const name = p.name.toLowerCase();
        if (selectedCategory === 'clothing') {
          return cat.includes('cloth') || cat.includes('jacket') || cat.includes('shirt') || cat.includes('jean') || cat.includes('dress') || cat.includes('pant') || name.includes('tshirt') || name.includes('shirt') || name.includes('jacket');
        }
        if (selectedCategory === 'shoes') {
          return cat.includes('shoe') || cat.includes('sneaker') || cat.includes('boot') || cat.includes('heel') || name.includes('sneaker') || name.includes('shoe');
        }
        if (selectedCategory === 'bags') {
          return cat.includes('bag') || cat.includes('handbag') || cat.includes('purse') || cat.includes('backpack') || name.includes('bag');
        }
        if (selectedCategory === 'home') {
          return cat.includes('home') || cat.includes('decor') || cat.includes('scenery') || cat.includes('plant') || cat.includes('flower') || cat.includes('furniture');
        }
        if (selectedCategory === 'accessories') {
          return cat.includes('access') || cat.includes('jewel') || cat.includes('watch') || cat.includes('glasses') || cat.includes('headphone') || name.includes('headphone');
        }
        if (selectedCategory === 'beauty') {
          return cat.includes('beauty') || cat.includes('cream') || cat.includes('skin') || cat.includes('cosmetic') || name.includes('cream');
        }
        if (selectedCategory === 'ebooks') {
          return p.isEbook || cat.includes('ebook') || cat.includes('book');
        }
        if (selectedCategory === 'others') {
          return cat.includes('other');
        }
        return cat.includes(selectedCategory);
      });
    }

    // Condition filter fallback
    if (selectedCondition && selectedCondition !== 'all') {
      result = result.filter(p => {
        const c = String(p.condition || '').toLowerCase().replace(/\s+/g, '_');
        const target = selectedCondition.toLowerCase().replace(/\s+/g, '_');
        return c.includes(target) || target.includes(c);
      });
    }

    // Price range filter fallback
    if (minPrice !== '' && !isNaN(Number(minPrice))) {
      result = result.filter(p => Number(p.price || 0) >= Number(minPrice));
    }
    if (maxPrice !== '' && !isNaN(Number(maxPrice))) {
      result = result.filter(p => Number(p.price || 0) <= Number(maxPrice));
    }

    // Search query filter
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.brand.toLowerCase().includes(query) ||
        p.displayCategory.toLowerCase().includes(query) ||
        p.seller.displayName.toLowerCase().includes(query) ||
        p.seller.username.toLowerCase().includes(query)
      );
    }

    // Apply the Explore Promotion Delivery Algorithm
    return sortExploreFeedWithAlgorithm(result, selectedSort, selectedSortBy, selectedSortOrder);
  }, [products, selectedCategory, selectedCondition, minPrice, maxPrice, searchQuery, selectedSort, selectedSortBy, selectedSortOrder]);

  // ─── Render Product Card ────────────────────────────────────────────────────
  const renderProductCard = ({ item }) => {
    const isLiked = wishlistIds.has(String(item.id));
    const isPromoted = Boolean(item.isPromoted || item._promoDelivery?.isPromoted);
    const isBattleWinner = Boolean(item.isBattleWinner || item._promoDelivery?.isBattleWinner);
    const cardBorder = isBattleWinner
      ? '#F59E0B'
      : isPromoted
        ? (accent || '#7C3AED')
        : (border || '#EDE6F6');

    return (
      <TouchableOpacity
        style={[
          styles.card,
          cardStyle,
          {
            borderColor: cardBorder,
            backgroundColor: card || '#fff',
            borderWidth: isBattleWinner ? 1.5 : 1,
          },
        ]}
        activeOpacity={0.85}
        onPress={() => handleProductPress(item)}
      >
        {/* Product Image */}
        <View style={[styles.imageContainer, { backgroundColor: isDarkMode ? '#252525' : '#F6F3F9' }]}>
          {item.image ? (
            <Image
              source={{ uri: item.image }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons
                name={item.isEbook ? 'book-outline' : 'shirt-outline'}
                size={34}
                color={mutedText}
              />
            </View>
          )}

          {/* Sold out overlay */}
          {item.isOutOfStock && (
            <View style={styles.soldOutOverlay}>
              <Text style={styles.soldOutText}>
                {t('marketplace.soldOut', 'SOLD OUT')}
              </Text>
            </View>
          )}

          {/* Top-left Badges */}
          <View style={styles.badgeWrap}>
            {item.promotionBadge ? (
              <View style={[
                styles.badge,
                { backgroundColor: isBattleWinner ? '#D97706' : '#6366F1' },
                styles.promotedBadgeGlow,
              ]}>
                <Text style={styles.badgeText}>
                  {isBattleWinner ? `🏆 ${item.promotionBadge}` : `⚡ ${item.promotionBadge}`}
                </Text>
              </View>
            ) : item.isEbook ? (
              <View style={[styles.badge, { backgroundColor: '#6366F1' }]}>
                <Text style={styles.badgeText}>E-Book</Text>
              </View>
            ) : item.condition ? (
              <View style={[styles.badge, { backgroundColor: accent }]}>
                <Text style={styles.badgeText}>
                  {String(item.condition).replace('_', ' ')}
                </Text>
              </View>
            ) : null}

            {item.hasDiscount && item.discountPercent ? (
              <View style={[styles.badge, styles.discountBadge]}>
                <Text style={styles.badgeText}>{`-${item.discountPercent}%`}</Text>
              </View>
            ) : null}
          </View>

          {/* Wishlist Heart Button */}
          <TouchableOpacity
            style={[
              styles.heartButton,
              { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.92)' },
            ]}
            activeOpacity={0.7}
            onPress={() => handleToggleWishlist(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={17}
              color={isLiked ? '#FF4D6D' : mutedText}
            />
          </TouchableOpacity>
        </View>

        {/* Product Info */}
        <View style={styles.cardInfo}>
          {isPromoted && (
            <View style={styles.promotedLabelRow}>
              <Ionicons
                name={isBattleWinner ? 'trophy' : 'sparkles'}
                size={11}
                color={isBattleWinner ? '#D97706' : accent}
                style={{ marginRight: 3 }}
              />
              <Text style={[styles.promotedLabelText, { color: isBattleWinner ? '#D97706' : accent }]}>
                {isBattleWinner
                  ? t('marketplace.battleWinnerItem', 'Battle Winner')
                  : t('marketplace.promoted', 'Promoted')}
              </Text>
            </View>
          )}

          {/* Title */}
          <Text style={[styles.productName, textStyle]} numberOfLines={2}>
            {item.name}
          </Text>

          {/* Price & Brand Row */}
          <View style={styles.priceRow}>
            <View style={styles.priceWithDiscount}>
              <Text style={[styles.productPrice, { color: accent }]}>
                {item.formattedPrice}
              </Text>
              {item.hasDiscount && item.originalPrice > item.price ? (
                <Text style={[styles.originalPrice, mutedTextStyle]}>
                  {item.formattedOriginalPrice}
                </Text>
              ) : null}
            </View>

            {item.brand ? (
              <Text style={[styles.brandText, mutedTextStyle]} numberOfLines={1}>
                {item.brand}
              </Text>
            ) : null}
          </View>

          {/* Shop / Creator Row */}
          <View style={styles.sellerRow}>
            <Ionicons name="storefront-outline" size={13} color={mutedText} style={{ marginRight: 4 }} />
            <Text style={[styles.sellerName, mutedTextStyle]} numberOfLines={1}>
              {item.seller.displayName || `@${item.seller.username}`}
            </Text>
          </View>

          {/* Shipping & Popularity Meta */}
          <View style={styles.metaRow}>
            {item.isFreeShipping ? (
              <View style={[styles.metaPill, { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}>
                <Text style={[styles.metaPillText, { color: '#059669' }]}>
                  {t('marketplace.freeShipping', 'Free ship')}
                </Text>
              </View>
            ) : item.shippingOption === 'local_pick' ? (
              <View style={[styles.metaPill, { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF' }]}>
                <Text style={[styles.metaPillText, { color: '#2563EB' }]}>
                  {t('marketplace.pickup', 'Pickup')}
                </Text>
              </View>
            ) : null}

            {item.soldCount > 0 ? (
              <Text style={[styles.soldCountText, mutedTextStyle]}>
                {`${item.soldCount} ${t('marketplace.sold', 'sold')}`}
              </Text>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, bgStyle]}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: border || '#EDE6F6' }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, textStyle]}>
            {t('marketplace.title', 'Marketplace')}
          </Text>
          <Text style={[styles.headerSubtitle, mutedTextStyle]}>
            {t('marketplace.subtitle', 'Explore products from our creators')}
          </Text>
        </View>

        {/* Cart / Add to Cart button (commented out for now; preserved for future use) */}
        {/*
        <TouchableOpacity
          style={[
            styles.cartButton,
            {
              backgroundColor: isDarkMode ? '#222' : (isBusinessProfile ? '#FAF6ED' : '#F4EFFC'),
              borderColor: border || (isBusinessProfile ? '#EAE2D2' : '#EDE6F6'),
            },
          ]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('MyClosetBuyerCart')}
        >
          <Ionicons name="bag-handle-outline" size={22} color={accent} />
          {cartItemCount > 0 && (
            <View style={[styles.cartBadge, { backgroundColor: accent }]}>
              <Text style={styles.cartBadgeText}>
                {cartItemCount > 9 ? '9+' : cartItemCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        */}
      </View>

      {/* ── Search Bar & Filter Button ──────────────────────────────────── */}
      <View style={styles.searchSection}>
        <View style={styles.searchRow}>
          <View style={[styles.searchBar, { backgroundColor: card || (isDarkMode ? '#1E1E1E' : '#fff'), borderColor: border || (isBusinessProfile ? '#EAE2D2' : '#EDE6F6') }]}>
            <Ionicons name="search" size={18} color={mutedText} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, textStyle]}
              placeholder={t('marketplace.searchPlaceholder', 'Search products, brands, or shops...')}
              placeholderTextColor={mutedText}
              value={searchQuery}
              onChangeText={handleSearchChange}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && Platform.OS !== 'ios' && (
              <TouchableOpacity onPress={handleClearSearch} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Ionicons name="close-circle" size={18} color={mutedText} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Modal Trigger Button */}
          <TouchableOpacity
            style={[
              styles.filterBtn,
              activeFiltersCount > 0
                ? { backgroundColor: accent, borderColor: accent }
                : { backgroundColor: card || (isDarkMode ? '#1E1E1E' : '#fff'), borderColor: border || (isBusinessProfile ? '#EAE2D2' : '#EDE6F6') },
            ]}
            activeOpacity={0.75}
            onPress={openFilterModal}
          >
            <Ionicons
              name="options-outline"
              size={19}
              color={activeFiltersCount > 0 ? '#fff' : (accent || text)}
            />
            {activeFiltersCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Category Chips Scroller ────────────────────────────────────── */}
      <View style={styles.categoryContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(cat) => cat.key}
          contentContainerStyle={styles.categoryContent}
          renderItem={({ item: cat }) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  isSelected
                    ? { backgroundColor: accent, borderColor: accent }
                    : { backgroundColor: card || (isDarkMode ? '#1E1E1E' : '#fff'), borderColor: border || (isDarkMode ? '#333' : (isBusinessProfile ? '#EAE2D2' : '#EDE6F6')) },
                ]}
                activeOpacity={0.7}
                onPress={() => handleSelectCategory(cat.key)}
              >
                <Ionicons
                  name={cat.icon}
                  size={14}
                  color={isSelected ? '#fff' : mutedText}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.categoryText,
                    isSelected
                      ? { color: '#fff', fontWeight: '700' }
                      : { color: isDarkMode ? (isBusinessProfile ? '#EAD6AA' : '#EDE7F6') : (isBusinessProfile ? '#785A1E' : text), fontWeight: '500' },
                  ]}
                >
                  {t(cat.labelKey, cat.labelFallback)}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* ── Active Filter Badges Bar ───────────────────────────────────── */}
      {(activeFiltersCount > 0 || (selectedCategory !== 'all')) && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeFiltersContent}>
            {selectedCategory !== 'all' && (
              <TouchableOpacity
                style={[styles.activeTag, { backgroundColor: isDarkMode ? (isBusinessProfile ? '#2A2416' : '#2D223B') : (isBusinessProfile ? '#FBF7EE' : '#F3E8FF'), borderColor: accent }]}
                onPress={() => handleSelectCategory('all')}
              >
                <Text style={[styles.activeTagText, { color: accent }]}>
                  {CATEGORIES.find(c => c.key === selectedCategory)?.labelFallback || selectedCategory}
                </Text>
                <Ionicons name="close" size={13} color={accent} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}

            {selectedCondition !== 'all' && (
              <TouchableOpacity
                style={[styles.activeTag, { backgroundColor: isDarkMode ? (isBusinessProfile ? '#2A2416' : '#2D223B') : (isBusinessProfile ? '#FBF7EE' : '#F3E8FF'), borderColor: accent }]}
                onPress={handleRemoveCondition}
              >
                <Text style={[styles.activeTagText, { color: accent }]}>
                  {CONDITION_OPTIONS.find(c => c.key === selectedCondition)?.labelFallback || selectedCondition}
                </Text>
                <Ionicons name="close" size={13} color={accent} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}

            {(minPrice !== '' || maxPrice !== '') && (
              <TouchableOpacity
                style={[styles.activeTag, { backgroundColor: isDarkMode ? (isBusinessProfile ? '#2A2416' : '#2D223B') : (isBusinessProfile ? '#FBF7EE' : '#F3E8FF'), borderColor: accent }]}
                onPress={handleRemovePrice}
              >
                <Text style={[styles.activeTagText, { color: accent }]}>
                  {minPrice && maxPrice ? `$${minPrice} - $${maxPrice}` : minPrice ? `≥ $${minPrice}` : `≤ $${maxPrice}`}
                </Text>
                <Ionicons name="close" size={13} color={accent} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}

            {selectedSortBy !== 'all' && (
              <TouchableOpacity
                style={[styles.activeTag, { backgroundColor: isDarkMode ? (isBusinessProfile ? '#2A2416' : '#2D223B') : (isBusinessProfile ? '#FBF7EE' : '#F3E8FF'), borderColor: accent }]}
                onPress={handleRemoveSort}
              >
                <Text style={[styles.activeTagText, { color: accent }]}>
                  {`Sort: ${SORT_BY_OPTIONS.find(s => s.key === selectedSortBy)?.labelFallback || selectedSortBy} (${selectedSortOrder})`}
                </Text>
                <Ionicons name="close" size={13} color={accent} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.clearAllTag} onPress={handleClearAllActiveFilters}>
              <Text style={styles.clearAllTagText}>{t('marketplace.clearFilters', 'Clear All')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* ── Sort & Results Row ─────────────────────────────────────────── */}
      <View style={styles.sortRow}>
        <Text style={[styles.resultsCount, mutedTextStyle]}>
          {totalCount > 0 && selectedCategory === 'all' && !searchQuery && activeFiltersCount === 0
            ? `${totalCount} ${totalCount === 1 ? t('marketplace.itemSingular', 'product') : t('marketplace.itemPlural', 'products')}`
            : `${filteredProducts.length} ${filteredProducts.length === 1 ? t('marketplace.itemSingular', 'product') : t('marketplace.itemPlural', 'products')}`}
        </Text>

        {/* Sort / Filter Pill */}
        <TouchableOpacity
          style={[styles.sortPill, { borderColor: border || (isDarkMode ? '#333' : (isBusinessProfile ? '#EAE2D2' : '#EDE6F6')), backgroundColor: card || (isDarkMode ? '#1E1E1E' : '#fff') }]}
          activeOpacity={0.7}
          onPress={openFilterModal}
        >
          <Ionicons name="swap-vertical-outline" size={13} color={accent} style={{ marginRight: 4 }} />
          <Text style={[styles.sortText, { color: accent }]}>
            {selectedSortBy !== 'all'
              ? `${SORT_BY_OPTIONS.find(s => s.key === selectedSortBy)?.labelFallback || selectedSortBy} (${selectedSortOrder})`
              : t(
                  SORT_OPTIONS.find(s => s.key === selectedSort)?.labelKey,
                  SORT_OPTIONS.find(s => s.key === selectedSort)?.labelFallback
                )}
          </Text>
          <Ionicons name="chevron-down" size={12} color={accent} style={{ marginLeft: 3 }} />
        </TouchableOpacity>
      </View>

      {/* ── Products Grid ──────────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accent} />
          <Text style={[styles.loadingText, mutedTextStyle]}>
            {t('marketplace.loading', 'Loading marketplace products...')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderProductCard}
          numColumns={2}
          columnWrapperStyle={styles.gridColumnWrapper}
          contentContainerStyle={[
            styles.gridContent,
            { paddingBottom: Math.max(insets.bottom + 70, 90) },
          ]}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={accent} />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                fetchProducts(true, 1);
                fetchCartCount();
                fetchWishlistState();
              }}
              tintColor={accent}
              colors={[accent]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconWrap, { backgroundColor: isDarkMode ? '#222' : '#F4EFFC' }]}>
                <Ionicons name="storefront-outline" size={44} color={accent} />
              </View>
              <Text style={[styles.emptyTitle, textStyle]}>
                {t('marketplace.noProductsTitle', 'No products found')}
              </Text>
              <Text style={[styles.emptySubtitle, mutedTextStyle]}>
                {searchQuery || activeFiltersCount > 0 || selectedCategory !== 'all'
                  ? t('marketplace.noMatchesQuery', 'Try different keywords or clear your search')
                  : t('marketplace.noProductsInCategory', 'No products listed in this category yet')}
              </Text>
              {(searchQuery || selectedCategory !== 'all' || activeFiltersCount > 0) && (
                <TouchableOpacity
                  style={[styles.resetButton, { backgroundColor: accent }]}
                  activeOpacity={0.7}
                  onPress={handleClearAllActiveFilters}
                >
                  <Text style={styles.resetButtonText}>
                    {t('marketplace.clearFilters', 'Clear Filters')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* ── Filter Bottom Sheet Modal ──────────────────────────────────── */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalDismissTouchable}
            activeOpacity={1}
            onPress={() => setFilterModalVisible(false)}
          />
          <View style={[styles.modalSheet, { backgroundColor: card || (isDarkMode ? '#1E1E1E' : '#fff') }]}>
            {/* Drag Handle */}
            <View style={[styles.modalDragHandle, { backgroundColor: themeDragHandle }]} />

            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: themeCardBorder }]}>
              <View style={styles.modalHeaderTitleRow}>
                <View style={[styles.modalHeaderIconWrap, { backgroundColor: themeBadgeBg }]}>
                  <Ionicons name="options-outline" size={18} color={accent} />
                </View>
                <Text style={[styles.modalTitle, textStyle]}>
                  {t('marketplace.filterModalTitle', 'Filters & Sorting')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: themeBadgeBg }]}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={18} color={themeItemText} />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              {/* 1. Condition Section */}
              <View style={styles.filterSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionHeading, textStyle]}>
                    {t('marketplace.conditionSection', 'Condition')}
                  </Text>
                </View>
                <View style={styles.chipsWrap}>
                  {CONDITION_OPTIONS.map(opt => {
                    const isSelected = tempCondition === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        style={[
                          styles.filterChip,
                          isSelected
                            ? { backgroundColor: accent, borderColor: accent }
                            : { backgroundColor: themeCardBg, borderColor: themeCardBorder },
                        ]}
                        activeOpacity={0.7}
                        onPress={() => setTempCondition(opt.key)}
                      >
                        {opt.icon && (
                          <Ionicons
                            name={opt.icon}
                            size={14}
                            color={isSelected ? '#fff' : themeItemIcon}
                            style={{ marginRight: 6 }}
                          />
                        )}
                        <Text
                          style={[
                            styles.filterChipText,
                            isSelected ? { color: '#fff', fontWeight: '700' } : { color: themeItemText, fontWeight: '500' },
                          ]}
                        >
                          {t(opt.labelKey, opt.labelFallback)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 2. Price Range Section */}
              <View style={styles.filterSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionHeading, textStyle]}>
                    {t('marketplace.priceSection', 'Price Range')}
                  </Text>
                  {(tempMinPrice || tempMaxPrice) ? (
                    <TouchableOpacity onPress={() => { setTempMinPrice(''); setTempMaxPrice(''); }}>
                      <Text style={[styles.sectionResetText, { color: accent }]}>{t('common.clear', 'Clear')}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <View style={styles.priceInputsRow}>
                  <View style={[styles.priceInputBox, { backgroundColor: themeCardBg, borderColor: themeCardBorder }]}>
                    <Text style={[styles.currencyPrefix, mutedTextStyle]}>$</Text>
                    <TextInput
                      style={[styles.priceTextInput, { color: themeItemText }]}
                      placeholder={t('marketplace.minPrice', 'Min')}
                      placeholderTextColor={mutedText}
                      value={tempMinPrice}
                      onChangeText={setTempMinPrice}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={[styles.priceDividerBadge, { backgroundColor: themeBadgeBg }]}>
                    <Ionicons name="arrow-forward" size={13} color={mutedText} />
                  </View>
                  <View style={[styles.priceInputBox, { backgroundColor: themeCardBg, borderColor: themeCardBorder }]}>
                    <Text style={[styles.currencyPrefix, mutedTextStyle]}>$</Text>
                    <TextInput
                      style={[styles.priceTextInput, { color: themeItemText }]}
                      placeholder={t('marketplace.maxPrice', 'Max')}
                      placeholderTextColor={mutedText}
                      value={tempMaxPrice}
                      onChangeText={setTempMaxPrice}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Quick Price Presets */}
                <View style={styles.pricePresetsGrid}>
                  {PRICE_PRESETS.map((p, idx) => {
                    const isMatch = tempMinPrice === p.min && tempMaxPrice === p.max;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.presetPill,
                          isMatch
                            ? { backgroundColor: accent, borderColor: accent }
                            : { backgroundColor: themeCardBg, borderColor: themeCardBorder },
                        ]}
                        onPress={() => {
                          if (isMatch) {
                            setTempMinPrice('');
                            setTempMaxPrice('');
                          } else {
                            setTempMinPrice(p.min);
                            setTempMaxPrice(p.max);
                          }
                        }}
                      >
                        <Text style={[styles.presetText, isMatch ? { color: '#fff', fontWeight: '700' } : { color: themeItemText }]}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 3. Sort By Section */}
              <View style={styles.filterSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionHeading, textStyle]}>
                    {t('marketplace.sortBySection', 'Sort By')}
                  </Text>
                </View>
                <View style={styles.sortCardsGrid}>
                  {SORT_BY_OPTIONS.map(opt => {
                    const isSelected = tempSortBy === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        style={[
                          styles.sortCard,
                          isSelected
                            ? { backgroundColor: accent, borderColor: accent }
                            : { backgroundColor: themeCardBg, borderColor: themeCardBorder },
                        ]}
                        activeOpacity={0.7}
                        onPress={() => setTempSortBy(opt.key)}
                      >
                        <View style={styles.sortCardLeft}>
                          <Ionicons
                            name={opt.icon}
                            size={16}
                            color={isSelected ? '#fff' : themeItemIcon}
                            style={{ marginRight: 8, flexShrink: 0 }}
                          />
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.sortCardText,
                              isSelected ? { color: '#fff', fontWeight: '700' } : { color: themeItemText, fontWeight: '500' },
                            ]}
                          >
                            {t(opt.labelKey, opt.labelFallback)}
                          </Text>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={16} color="#fff" style={{ flexShrink: 0, marginLeft: 4 }} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 4. Sort Order Section */}
              <View style={styles.filterSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionHeading, textStyle]}>
                    {t('marketplace.sortOrderSection', 'Sort Order')}
                  </Text>
                </View>
                <View style={styles.orderCardsRow}>
                  {SORT_ORDER_OPTIONS.map(opt => {
                    const isSelected = tempSortOrder === opt.key;
                    const isDesc = opt.key === 'desc';
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        style={[
                          styles.orderCard,
                          isSelected
                            ? { backgroundColor: accent, borderColor: accent }
                            : { backgroundColor: themeCardBg, borderColor: themeCardBorder },
                        ]}
                        activeOpacity={0.7}
                        onPress={() => setTempSortOrder(opt.key)}
                      >
                        <View
                          style={[
                            styles.orderIconWrap,
                            isSelected
                              ? { backgroundColor: 'rgba(255, 255, 255, 0.22)' }
                              : { backgroundColor: themeBadgeBg },
                          ]}
                        >
                          <Ionicons
                            name={isDesc ? 'arrow-down' : 'arrow-up'}
                            size={18}
                            color={isSelected ? '#fff' : accent}
                          />
                        </View>
                        <View style={styles.orderTextWrap}>
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.orderMainTitle,
                              isSelected ? { color: '#fff' } : { color: themeItemText },
                            ]}
                          >
                            {isDesc ? t('marketplace.descending', 'Descending') : t('marketplace.ascending', 'Ascending')}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.orderSubTitle,
                              isSelected ? { color: 'rgba(255, 255, 255, 0.85)' } : mutedTextStyle,
                            ]}
                          >
                            {isDesc ? t('marketplace.descSub', 'High to Low') : t('marketplace.ascSub', 'Low to High')}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            {/* Modal Sticky Footer */}
            <View style={[styles.modalFooter, { borderTopColor: themeCardBorder, backgroundColor: card || (isDarkMode ? '#1E1E1E' : '#fff'), paddingBottom: Math.max(insets.bottom, 16) }]}>
              <TouchableOpacity
                style={[styles.footerResetBtn, { borderColor: themeCardBorder, backgroundColor: themeCardBg }]}
                onPress={handleResetFilters}
              >
                <Ionicons name="refresh-outline" size={16} color={themeItemText} style={{ marginRight: 6 }} />
                <Text style={[styles.footerResetText, { color: themeItemText }]}>
                  {t('marketplace.resetAll', 'Reset All')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerApplyBtn, { backgroundColor: accent }]}
                onPress={handleApplyFilters}
              >
                <Ionicons name="checkmark-done" size={17} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.footerApplyText}>
                  {t('marketplace.applyFilters', 'Apply Filters')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  cartButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  activeFiltersContainer: {
    paddingVertical: 6,
  },
  activeFiltersContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  activeTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  clearAllTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  clearAllTagText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  categoryContainer: {
    paddingVertical: 4,
  },
  categoryContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  sortText: {
    fontSize: 12,
    fontWeight: '700',
  },
  gridColumnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  gridContent: {
    paddingTop: 4,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    height: CARD_WIDTH * 1.08,
    position: 'relative',
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeWrap: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'column',
    gap: 4,
    alignItems: 'flex-start',
    zIndex: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  discountBadge: {
    backgroundColor: '#EF4444',
  },
  promotedBadgeGlow: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 3,
  },
  promotedLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  promotedLabelText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  soldOutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  soldOutText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  heartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 3,
  },
  cardInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  priceWithDiscount: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '800',
  },
  originalPrice: {
    fontSize: 11,
    textDecorationLine: 'line-through',
  },
  brandText: {
    fontSize: 11,
    fontWeight: '500',
    maxWidth: '45%',
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  sellerName: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  metaPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metaPillText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  soldCountText: {
    fontSize: 10,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  resetButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
    justifyContent: 'flex-end',
  },
  modalDismissTouchable: {
    flex: 1,
  },
  modalSheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  modalDragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalHeaderIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  filterSection: {
    marginTop: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  sectionResetText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12.5,
  },
  priceInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priceInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  currencyPrefix: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 6,
  },
  priceTextInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 0,
  },
  priceDividerBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricePresetsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  presetPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  sortCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortCard: {
    width: '48.8%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  sortCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 4,
  },
  sortCardText: {
    flex: 1,
    fontSize: 12,
  },
  orderCardsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  orderCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  orderIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  orderTextWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  orderMainTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  orderSubTitle: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  footerResetBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  footerResetText: {
    fontSize: 14,
    fontWeight: '700',
  },
  footerApplyBtn: {
    flex: 1.8,
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  footerApplyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});
