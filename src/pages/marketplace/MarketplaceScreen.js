import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppTheme } from '../../theme/useApptheme';
import { useLanguage } from '../../i18n';
import {
  getMyClosetItems,
  getCart,
  getWishlist,
  addWishlistItem,
  deleteWishlistItem,
  toggleMyClosetItemLike,
  getShops,
} from '../../services/myCloset';
import { withClosetNavParams } from '../../utils/closetNavigation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_GAP = 12;
const HORIZONTAL_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - (HORIZONTAL_PADDING * 2) - COLUMN_GAP) / 2;

const CATEGORIES = [
  { key: 'all', labelKey: 'marketplace.catAll', labelFallback: 'All', icon: 'grid-outline' },
  { key: 'clothing', labelKey: 'marketplace.catClothing', labelFallback: 'Clothing', icon: 'shirt-outline' },
  { key: 'shoes', labelKey: 'marketplace.catShoes', labelFallback: 'Shoes', icon: 'footsteps-outline' },
  { key: 'bags', labelKey: 'marketplace.catBags', labelFallback: 'Bags', icon: 'bag-handle-outline' },
  { key: 'accessories', labelKey: 'marketplace.catAccessories', labelFallback: 'Accessories', icon: 'watch-outline' },
  { key: 'ebooks', labelKey: 'marketplace.catEbooks', labelFallback: 'E-books', icon: 'book-outline' },
  { key: 'beauty', labelKey: 'marketplace.catBeauty', labelFallback: 'Beauty', icon: 'sparkles-outline' },
  { key: 'electronics', labelKey: 'marketplace.catElectronics', labelFallback: 'Electronics', icon: 'hardware-chip-outline' },
  { key: 'vintage', labelKey: 'marketplace.catVintage', labelFallback: 'Vintage', icon: 'diamond-outline' },
];

const SORT_OPTIONS = [
  { key: 'latest', labelKey: 'marketplace.sortLatest', labelFallback: 'Latest' },
  { key: 'price_low', labelKey: 'marketplace.sortPriceLow', labelFallback: 'Price: Low to High' },
  { key: 'price_high', labelKey: 'marketplace.sortPriceHigh', labelFallback: 'Price: High to Low' },
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
  } = useAppTheme();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSort, setSelectedSort] = useState('latest');
  const [cartItemCount, setCartItemCount] = useState(0);
  const [wishlistIds, setWishlistIds] = useState(new Set());

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

  // ─── Fetch All Products From Platform ──────────────────────────────────────
  const fetchProducts = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // Fetch platform closet items
      const res = await getMyClosetItems();
      const raw = res?.data?.data ?? res?.data?.items ?? res?.data ?? [];
      const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.items) ? raw.items : []);

      const formatted = list.map((item, idx) => {
        const itemId = String(item.id || item._id || item.productId || idx);
        const img = resolveImage(item);
        const priceNum = Number(item.price != null ? item.price : (item.amount || 0)) || 0;

        return {
          id: itemId,
          name: item.name || item.itemName || item.title || t('marketplace.untitled', 'Product'),
          price: priceNum,
          formattedPrice: formatPrice(item.price || item.amount),
          image: img,
          images: Array.isArray(item.images) && item.images.length > 0 ? item.images : (img ? [img] : []),
          category: String(item.category || item.shopCategory || 'Other').toLowerCase(),
          displayCategory: item.category || item.shopCategory || 'General',
          condition: item.condition || 'New',
          brand: item.brand || '',
          description: item.description || '',
          seller: {
            id: item.userId || item.sellerId || item.seller?.id || item.user?.id,
            username: item.seller?.username || item.user?.username || item.shopUsername || 'seller',
            displayName: item.seller?.displayName || item.user?.displayName || item.shopName || 'Shop',
            avatar: item.seller?.profilePicture || item.user?.image || item.shopLogo || null,
          },
          closetId: item.closetId || item.closet?.id || null,
          isEbook: item.type === 'EBOOK' || item.isEbook === true,
          raw: item,
        };
      });

      setProducts(formatted);
    } catch (err) {
      console.warn('❌ [MarketplaceScreen:fetchProducts] error:', err?.message || err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
      fetchCartCount();
      fetchWishlistState();
    }, [fetchProducts, fetchCartCount, fetchWishlistState])
  );

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
      // Revert on failure
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

    navigation.navigate('MyClosetBuyerItemDetail', withClosetNavParams(
      {},
      {
        item: item.raw || item,
        seller: item.seller,
        sellerId: item.seller?.id,
        closetId: item.closetId,
        displayName: item.seller?.displayName || item.seller?.username,
      }
    ));
  };

  // ─── Filter & Sort Products ─────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter(p => {
        const cat = p.category.toLowerCase();
        if (selectedCategory === 'ebooks') return p.isEbook || cat.includes('ebook') || cat.includes('book');
        return cat.includes(selectedCategory);
      });
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

    // Sort
    if (selectedSort === 'price_low') {
      result.sort((a, b) => a.price - b.price);
    } else if (selectedSort === 'price_high') {
      result.sort((a, b) => b.price - a.price);
    }

    return result;
  }, [products, selectedCategory, searchQuery, selectedSort]);

  // ─── Render Product Card ────────────────────────────────────────────────────
  const renderProductCard = ({ item }) => {
    const isLiked = wishlistIds.has(String(item.id));

    return (
      <TouchableOpacity
        style={[
          styles.card,
          cardStyle,
          {
            borderColor: border || '#EDE6F6',
            backgroundColor: card || '#fff',
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

          {/* Condition / Category Badge */}
          {item.isEbook ? (
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

          {/* Wishlist Heart Button */}
          <TouchableOpacity
            style={[
              styles.heartButton,
              { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.9)' },
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
          <Text style={[styles.productName, textStyle]} numberOfLines={2}>
            {item.name}
          </Text>

          <View style={styles.priceRow}>
            <Text style={[styles.productPrice, { color: accent }]}>
              {item.formattedPrice}
            </Text>
            {item.brand ? (
              <Text style={[styles.brandText, mutedTextStyle]} numberOfLines={1}>
                {item.brand}
              </Text>
            ) : null}
          </View>

          {/* Seller / Shop Info */}
          <View style={styles.sellerRow}>
            <Ionicons name="storefront-outline" size={12} color={mutedText} style={{ marginRight: 4 }} />
            <Text style={[styles.sellerName, mutedTextStyle]} numberOfLines={1}>
              {item.seller.displayName || `@${item.seller.username}`}
            </Text>
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

        {/* Cart Button */}
        <TouchableOpacity
          style={[styles.cartButton, { borderColor: border || '#E5DBF3' }]}
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
      </View>

      {/* ── Search Bar ─────────────────────────────────────────────────── */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBar, { backgroundColor: card || '#fff', borderColor: border || '#E5DBF3' }]}>
          <Ionicons name="search" size={18} color={mutedText} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, textStyle]}
            placeholder={t('marketplace.searchPlaceholder', 'Search products, brands, or shops...')}
            placeholderTextColor={mutedText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && Platform.OS !== 'ios' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="close-circle" size={18} color={mutedText} />
            </TouchableOpacity>
          )}
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
                    : { backgroundColor: card || '#fff', borderColor: border || '#EDE6F6' },
                ]}
                activeOpacity={0.7}
                onPress={() => setSelectedCategory(cat.key)}
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
                    isSelected ? { color: '#fff', fontWeight: '700' } : { color: text, fontWeight: '500' },
                  ]}
                >
                  {t(cat.labelKey, cat.labelFallback)}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* ── Sort & Results Row ─────────────────────────────────────────── */}
      <View style={styles.sortRow}>
        <Text style={[styles.resultsCount, mutedTextStyle]}>
          {filteredProducts.length}{' '}
          {filteredProducts.length === 1
            ? t('marketplace.itemSingular', 'product')
            : t('marketplace.itemPlural', 'products')}
        </Text>

        {/* Sort Pill */}
        <TouchableOpacity
          style={[styles.sortPill, { borderColor: border || '#EDE6F6', backgroundColor: card || '#fff' }]}
          activeOpacity={0.7}
          onPress={() => {
            const nextIdx = (SORT_OPTIONS.findIndex(s => s.key === selectedSort) + 1) % SORT_OPTIONS.length;
            setSelectedSort(SORT_OPTIONS[nextIdx].key);
          }}
        >
          <Ionicons name="swap-vertical-outline" size={13} color={accent} style={{ marginRight: 4 }} />
          <Text style={[styles.sortText, { color: accent }]}>
            {t(
              SORT_OPTIONS.find(s => s.key === selectedSort)?.labelKey,
              SORT_OPTIONS.find(s => s.key === selectedSort)?.labelFallback
            )}
          </Text>
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                fetchProducts(true);
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
                {searchQuery
                  ? t('marketplace.noMatchesQuery', 'Try different keywords or clear your search')
                  : t('marketplace.noProductsInCategory', 'No products listed in this category yet')}
              </Text>
              {(searchQuery || selectedCategory !== 'all') && (
                <TouchableOpacity
                  style={[styles.resetButton, { backgroundColor: accent }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
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
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
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
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
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
  productPrice: {
    fontSize: 15,
    fontWeight: '800',
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
});
