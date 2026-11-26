import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
  Alert,
  Share,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  getUserServices,
  getPublicServiceDetails,
  favoriteService,
  unfavoriteService,
} from '../../../services/proServices';
import { formatPriceWithUnit } from '../../../services/proServices/helpers';

export default function ProfileServicesTab({
  userId,
  isOwnProfile = false,
  isBusinessProfile = false,
  isDarkMode = false,
  onNavigateToManage = null,
}) {
  const [loading, setLoading] = useState(true);
  const [servicesData, setServicesData] = useState(null);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedSort, setSelectedSort] = useState('popular');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  // Detail Modal
  const [selectedService, setSelectedService] = useState(null);
  const [serviceDetails, setServiceDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Theme accents
  const brandAccent = isBusinessProfile ? '#CBA257' : '#7C3AED';
  const textColor = isDarkMode ? '#FFFFFF' : '#111827';
  const mutedColor = isDarkMode ? '#9CA3AF' : '#6B7280';
  const cardBg = isDarkMode ? '#1E1B2E' : '#FFFFFF';
  const border = isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const inputBg = isDarkMode ? '#252033' : '#F9FAFB';

  const fetchServices = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const params = { sort: selectedSort, page: 1, limit: 20 };
      if (selectedType !== 'all') {
        params.type = selectedType;
      }
      const res = await getUserServices(userId, params);
      if (res && res.success && res.data) {
        setServicesData(res.data);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, [userId, selectedType, selectedSort]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleToggleFavorite = async item => {
    try {
      const wasFav = item.isFavorite;
      // Optimistic update
      setServicesData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map(s =>
            s.id === item.id ? { ...s, isFavorite: !wasFav } : s,
          ),
        };
      });

      if (wasFav) {
        await unfavoriteService(item.id);
      } else {
        await favoriteService(item.id);
      }
    } catch (_) {}
  };

  const handleOpenDetails = async item => {
    setSelectedService(item);
    setDetailModalVisible(true);
    setDetailsLoading(true);
    try {
      const res = await getPublicServiceDetails(item.id);
      if (res && res.success && res.data) {
        setServiceDetails(res.data);
      } else {
        setServiceDetails(item);
      }
    } catch (_) {
      setServiceDetails(item);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleShare = async item => {
    try {
      await Share.share({
        message: `Check out ${item.title} on Valens!`,
        title: item.title,
      });
    } catch (_) {}
  };

  const filters = servicesData?.filters || { all: 0 };
  const items = servicesData?.items || [];

  return (
    <View style={styles.container}>
      {/* Filters & Sort Header */}
      <View style={styles.topControlsRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {[
            { id: 'all', label: `All (${filters.all || 0})` },
            { id: 'MENTORSHIP', label: `Mentorships (${filters.MENTORSHIP || 0})` },
            { id: 'CONSULTATION', label: `Consultations (${filters.CONSULTATION || 0})` },
            { id: 'APPOINTMENT', label: `Appointments (${filters.APPOINTMENT || 0})` },
            { id: 'EVENT', label: `Events (${filters.EVENT || 0})` },
            { id: 'MONTHLY_PACKAGE', label: `Packages (${filters.MONTHLY_PACKAGE || 0})` },
          ].map(f => {
            const isSelected = selectedType === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => setSelectedType(f.id)}
                style={[
                  styles.filterChip,
                  {
                    borderColor: isSelected ? brandAccent : border,
                    backgroundColor: isSelected
                      ? isDarkMode
                        ? 'rgba(124, 58, 237, 0.2)'
                        : 'rgba(124, 58, 237, 0.08)'
                      : cardBg,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: isSelected ? brandAccent : mutedColor,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity
          onPress={() => setSortDropdownOpen(prev => !prev)}
          style={[styles.sortBtn, { borderColor: border, backgroundColor: cardBg }]}
        >
          <Ionicons name="swap-vertical" size={16} color={brandAccent} />
        </TouchableOpacity>
      </View>

      {/* Sort Dropdown Modal */}
      {sortDropdownOpen && (
        <Modal
          visible={sortDropdownOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setSortDropdownOpen(false)}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setSortDropdownOpen(false)}
          >
            <View style={[styles.sortModalBox, { backgroundColor: cardBg, borderColor: border }]}>
              <Text style={[styles.sortModalTitle, { color: textColor }]}>Sort Services</Text>
              {[
                { id: 'popular', label: 'Most Popular' },
                { id: 'newest', label: 'Newest First' },
                { id: 'price_asc', label: 'Price: Low to High' },
                { id: 'price_desc', label: 'Price: High to Low' },
                { id: 'rating', label: 'Highest Rated' },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  style={styles.sortOptionRow}
                  onPress={() => {
                    setSelectedSort(opt.id);
                    setSortDropdownOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      {
                        color: selectedSort === opt.id ? brandAccent : textColor,
                        fontWeight: selectedSort === opt.id ? '700' : '500',
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {selectedSort === opt.id && (
                    <Ionicons name="checkmark" size={18} color={brandAccent} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Loading state */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={brandAccent} size="large" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="briefcase-outline" size={48} color={mutedColor} />
          <Text style={[styles.emptyTitle, { color: textColor }]}>No Services Available</Text>
          <Text style={[styles.emptySub, { color: mutedColor }]}>
            {isOwnProfile
              ? 'You have not published any services yet.'
              : 'This provider currently has no available services.'}
          </Text>
          {isOwnProfile && onNavigateToManage && (
            <TouchableOpacity
              onPress={onNavigateToManage}
              style={[styles.manageLinkBtn, { backgroundColor: brandAccent }]}
            >
              <Text style={styles.manageLinkText}>Manage Services</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.cardsScroll}>
          {items.map(item => {
            const formattedPrice = formatPriceWithUnit(item.price, item.priceUnit, item.currency);
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.88}
                onPress={() => handleOpenDetails(item)}
                style={[styles.serviceCard, { backgroundColor: cardBg, borderColor: border }]}
              >
                {/* Cover Image or Type Banner */}
                {item.coverImage ? (
                  <Image source={{ uri: item.coverImage }} style={styles.cardCover} />
                ) : (
                  <View style={[styles.cardPlaceholderCover, { backgroundColor: inputBg }]}>
                    <Ionicons name="briefcase" size={32} color={brandAccent} />
                  </View>
                )}

                {/* Most Popular Badge */}
                {item.isMostPopular && (
                  <View style={[styles.popularBadge, { backgroundColor: brandAccent }]}>
                    <Ionicons name="flame" size={12} color="#FFFFFF" style={{ marginRight: 3 }} />
                    <Text style={styles.popularBadgeText}>Most Popular</Text>
                  </View>
                )}

                {/* Bookmark Button */}
                <TouchableOpacity
                  onPress={() => handleToggleFavorite(item)}
                  style={[styles.favoriteBtn, { backgroundColor: isDarkMode ? '#1E1B2E' : '#FFFFFF' }]}
                >
                  <Ionicons
                    name={item.isFavorite ? 'bookmark' : 'bookmark-outline'}
                    size={18}
                    color={brandAccent}
                  />
                </TouchableOpacity>

                {/* Card Body */}
                <View style={styles.cardBody}>
                  <View style={styles.typeRow}>
                    <Text style={[styles.typeText, { color: brandAccent }]}>
                      {item.type?.replace('_', ' ')}
                    </Text>
                    {item.format && (
                      <Text style={[styles.formatText, { color: mutedColor }]}>
                        • {item.format === 'ONLINE' ? 'Online' : 'In-Person'}
                      </Text>
                    )}
                  </View>

                  <Text style={[styles.cardTitle, { color: textColor }]} numberOfLines={2}>
                    {item.title}
                  </Text>

                  {item.programLabel ? (
                    <Text style={[styles.programSub, { color: mutedColor }]}>
                      {item.programLabel}
                    </Text>
                  ) : item.event ? (
                    <Text style={[styles.programSub, { color: mutedColor }]}>
                      {new Date(item.event.startAt).toLocaleDateString()} • {item.event.venueName}
                    </Text>
                  ) : null}

                  <View style={styles.cardFooter}>
                    {item.ratingAvg > 0 ? (
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
                        <Text style={[styles.ratingVal, { color: textColor }]}>
                          {item.ratingAvg.toFixed(1)}
                        </Text>
                        <Text style={[styles.ratingCount, { color: mutedColor }]}>
                          ({item.reviewCount})
                        </Text>
                      </View>
                    ) : (
                      <View />
                    )}

                    <Text style={[styles.priceTag, { color: brandAccent }]}>
                      {formattedPrice || `$${item.price}`}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Service Details Modal */}
      <Modal
        visible={detailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.detailModalSheet, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Service Overview</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>

            {detailsLoading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator color={brandAccent} size="large" />
              </View>
            ) : selectedService && (
              <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
                <Text style={[styles.detailServiceTitle, { color: textColor }]}>
                  {selectedService.title}
                </Text>
                <Text style={[styles.detailServicePrice, { color: brandAccent }]}>
                  {formatPriceWithUnit(selectedService.price, selectedService.priceUnit, selectedService.currency)}
                </Text>

                {serviceDetails?.description && (
                  <View style={styles.sectionWrap}>
                    <Text style={[styles.sectionHeading, { color: textColor }]}>About</Text>
                    <Text style={[styles.sectionBody, { color: mutedColor }]}>
                      {serviceDetails.description}
                    </Text>
                  </View>
                )}

                {/* What's included */}
                {serviceDetails?.includedItems && serviceDetails.includedItems.length > 0 && (
                  <View style={styles.sectionWrap}>
                    <Text style={[styles.sectionHeading, { color: textColor }]}>What's Included</Text>
                    {serviceDetails.includedItems.map((inc, i) => (
                      <View key={i} style={styles.incRow}>
                        <Ionicons name="checkmark-circle" size={16} color={brandAccent} style={{ marginRight: 6 }} />
                        <Text style={[styles.incText, { color: textColor }]}>{inc}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Event Venue */}
                {serviceDetails?.event && (
                  <View style={styles.sectionWrap}>
                    <Text style={[styles.sectionHeading, { color: textColor }]}>Venue & Schedule</Text>
                    <Text style={[styles.incText, { color: textColor }]}>
                      {serviceDetails.event.venueName}
                    </Text>
                    <Text style={[styles.incText, { color: mutedColor }]}>
                      {serviceDetails.location?.isRevealed ? serviceDetails.location.address : (serviceDetails.location?.city || 'Location provided after booking')}
                    </Text>
                  </View>
                )}

                {/* Action Button */}
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => {
                    Alert.alert(
                      'Booking & Checkout',
                      'Direct booking and checkout release is arriving in the next Valens Services update!',
                    );
                  }}
                  style={[styles.bookBtn, { backgroundColor: brandAccent }]}
                >
                  <Text style={styles.bookBtnText}>
                    {selectedService.type === 'EVENT' ? 'Get Tickets' : selectedService.type === 'MONTHLY_PACKAGE' ? 'Subscribe' : 'Book Session'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterScroll: { flexDirection: 'row', alignItems: 'center' },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6,
  },
  filterChipText: { fontSize: 12 },
  sortBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sortModalBox: {
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
  },
  sortModalTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  sortOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  sortOptionText: { fontSize: 14 },
  centerBox: {
    flex: 1,
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 12 },
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 4, marginHorizontal: 30 },
  manageLinkBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
  },
  manageLinkText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  cardsScroll: { paddingHorizontal: 16, paddingBottom: 30 },
  serviceCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
  },
  cardCover: { width: '100%', height: 140 },
  cardPlaceholderCover: {
    width: '100%',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  popularBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  popularBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  favoriteBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: { padding: 14 },
  typeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  typeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  formatText: { fontSize: 11, marginLeft: 4 },
  cardTitle: { fontSize: 15, fontWeight: '800', lineHeight: 20 },
  programSub: { fontSize: 12, marginTop: 4 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingVal: { fontSize: 12, fontWeight: '700' },
  ratingCount: { fontSize: 11, marginLeft: 2 },
  priceTag: { fontSize: 15, fontWeight: '800' },
  detailModalSheet: {
    maxHeight: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  detailServiceTitle: { fontSize: 20, fontWeight: '800' },
  detailServicePrice: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  sectionWrap: { marginTop: 16 },
  sectionHeading: { fontSize: 14, fontWeight: '800', marginBottom: 6 },
  sectionBody: { fontSize: 13, lineHeight: 18 },
  incRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 3 },
  incText: { fontSize: 13 },
  bookBtn: {
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  bookBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
