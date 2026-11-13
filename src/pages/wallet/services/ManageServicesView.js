import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Share,
  Modal,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  getStoredServices,
  getClientOrders,
  getClientProducts,
  getProviderOrders,
  saveService,
} from './servicesStorage';

export default function ManageServicesView({
  colors,
  isDarkMode,
  t,
  onAddNewService,
  initialSide = 'professional',
  userProfilePic,
}) {
  const { width: windowWidth = Dimensions.get('window').width } = useWindowDimensions();
  const screenW = windowWidth || Dimensions.get('window').width || 390;
  const availableWidth = Math.max(0, screenW - 32);

  // Duo Side: 'professional' | 'client'
  const [activeSide, setActiveSide] = useState(initialSide);

  // Sub-tabs for Professional side: 'products' (Services Product List) | 'orders' (Client Orders)
  const [proTab, setProTab] = useState('products');

  // Sub-tabs for Client side: 'orders' (Services Orders) | 'products' (Services Product List)
  const [clientTab, setClientTab] = useState('orders');

  // Filter for services product list
  const [serviceFilter, setServiceFilter] = useState('all');

  // Data states
  const [services, setServices] = useState([]);
  const [clientOrders, setClientOrders] = useState([]);
  const [clientProducts, setClientProducts] = useState([]);
  const [providerOrders, setProviderOrders] = useState([]);
  const [showNotificationBanner, setShowNotificationBanner] = useState(true);

  // Selected item modal for preview
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);

  const loadAllData = useCallback(async () => {
    const svcs = await getStoredServices();
    const cOrders = await getClientOrders();
    const cProds = await getClientProducts();
    const pOrders = await getProviderOrders();

    setServices(svcs);
    setClientOrders(cOrders);
    setClientProducts(cProds);
    setProviderOrders(pOrders);
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleShare = async item => {
    try {
      await Share.share({
        message: `Book ${item.title} on Valens! Check it out here: https://valens.app/services/${item.id}`,
        title: item.title,
      });
    } catch (_) {}
  };

  const handleToggleActive = async serviceId => {
    const updated = services.map(s => {
      if (s.id === serviceId) {
        return { ...s, status: s.status === 'active' ? 'paused' : 'active' };
      }
      return s;
    });
    setServices(updated);
    const target = updated.find(s => s.id === serviceId);
    if (target) {
      await saveService(target);
    }
  };

  const filteredServices = services.filter(s => {
    if (serviceFilter === 'all') return true;
    return s.type === serviceFilter;
  });

  return (
    <View style={styles.container}>
      {/* DUO-SIDE SWITCHER (Professional vs Client) */}
      <View style={[styles.duoSwitcherWrap, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <TouchableOpacity
          onPress={() => setActiveSide('professional')}
          activeOpacity={0.8}
          style={[
            styles.duoSwitcherBtn,
            activeSide === 'professional' && {
              backgroundColor: colors.accent,
              shadowColor: colors.accent,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.35,
              shadowRadius: 5,
              elevation: 4,
            },
          ]}
        >
          <Ionicons
            name="briefcase"
            size={16}
            color={activeSide === 'professional' ? '#FFFFFF' : colors.muted}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.duoSwitcherText,
              { color: activeSide === 'professional' ? '#FFFFFF' : colors.muted, fontWeight: '700' },
            ]}
          >
            {t('manageServices.meAsProfessional', 'Me as a Professional')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveSide('client')}
          activeOpacity={0.8}
          style={[
            styles.duoSwitcherBtn,
            activeSide === 'client' && {
              backgroundColor: colors.accent,
              shadowColor: colors.accent,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.35,
              shadowRadius: 5,
              elevation: 4,
            },
          ]}
        >
          <Ionicons
            name="person"
            size={16}
            color={activeSide === 'client' ? '#FFFFFF' : colors.muted}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.duoSwitcherText,
              { color: activeSide === 'client' ? '#FFFFFF' : colors.muted, fontWeight: '700' },
            ]}
          >
            {t('manageServices.meAsClient', 'Me as a Client')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ========================================================================= */}
      {/* 💼 SIDE 1: ME AS A PROFESSIONAL */}
      {/* ========================================================================= */}
      {activeSide === 'professional' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Quick Metrics Bar */}
          <LinearGradient
            colors={isDarkMode ? (colors.isBusiness ? ['#33291B', '#241E16'] : ['#2D1B4E', '#1F1335']) : (colors.isBusiness ? ['#FAF1E2', '#F5ECE0'] : ['#F4ECFF', '#EBE0FF'])}
            style={[styles.metricsCard, { borderColor: colors.cardBorder }]}
          >
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: colors.accent }]}>$4,320</Text>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>Earnings</Text>
            </View>
            <View style={[styles.metricDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: colors.title }]}>{services.length}</Text>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>Services</Text>
            </View>
            <View style={[styles.metricDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: colors.title }]}>38</Text>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>Bookings</Text>
            </View>
            <View style={[styles.metricDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: '#F59E0B' }]}>4.9 ★</Text>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>Rating</Text>
            </View>
          </LinearGradient>

          {/* Sub Navigation (Services Product List vs Client Bookings / Orders) */}
          <View style={[styles.subTabsRow, { borderBottomColor: colors.divider }]}>
            <TouchableOpacity
              onPress={() => setProTab('products')}
              style={[
                styles.subTabItem,
                proTab === 'products' && [styles.subTabItemActive, { borderBottomColor: colors.accent }],
              ]}
            >
              <Ionicons
                name="grid-outline"
                size={16}
                color={proTab === 'products' ? colors.accent : colors.muted}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.subTabText,
                  { color: proTab === 'products' ? colors.accent : colors.muted, fontWeight: proTab === 'products' ? '700' : '500' },
                ]}
              >
                Services Product List ({services.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setProTab('orders')}
              style={[
                styles.subTabItem,
                proTab === 'orders' && [styles.subTabItemActive, { borderBottomColor: colors.accent }],
              ]}
            >
              <Ionicons
                name="receipt-outline"
                size={16}
                color={proTab === 'orders' ? colors.accent : colors.muted}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.subTabText,
                  { color: proTab === 'orders' ? colors.accent : colors.muted, fontWeight: proTab === 'orders' ? '700' : '500' },
                ]}
              >
                Client Orders ({providerOrders.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* SUB-TAB 1: SERVICES PRODUCT LIST */}
          {proTab === 'products' && (
            <View style={styles.tabContentWrap}>
              {/* Category Filter Pills & Add Button */}
              <View style={[styles.filterAndActionRow, { width: availableWidth }]}>
                <View
                  style={[
                    styles.filterPillsContainer,
                    {
                      width: Math.max(0, availableWidth - 100),
                      maxWidth: Math.max(0, availableWidth - 100),
                    },
                  ]}
                >
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterPillsScrollView}
                    contentContainerStyle={styles.filterPillsScroll}
                  >
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'mentorship', label: 'Mentorship' },
                      { id: 'consultation', label: 'Consultation' },
                      { id: 'appointment', label: 'Appointment' },
                      { id: 'event', label: 'Events' },
                      { id: 'monthly_package', label: 'Package' },
                    ].map(f => {
                      const isFActive = serviceFilter === f.id;
                      return (
                        <TouchableOpacity
                          key={f.id}
                          onPress={() => setServiceFilter(f.id)}
                          style={[
                            styles.filterPill,
                            {
                              backgroundColor: isFActive ? colors.accent : colors.surface,
                              borderColor: isFActive ? colors.accent : colors.cardBorder,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.filterPillText,
                              { color: isFActive ? '#FFFFFF' : colors.muted, fontWeight: isFActive ? '700' : '500' },
                            ]}
                          >
                            {f.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <TouchableOpacity
                  onPress={onAddNewService}
                  activeOpacity={0.85}
                  style={styles.proAddServiceBtn}
                >
                  <LinearGradient
                    colors={colors.btnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.proAddServiceGrad}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text style={styles.proAddServiceText} numberOfLines={1}>
                      {t ? t('manageServices.create', 'Create') : 'Create'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Services Cards */}
              {filteredServices.map(item => (
                <View
                  key={item.id}
                  style={[styles.serviceProCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                >
                  <View style={styles.serviceProCardHeader}>
                    <View style={styles.serviceProIconWrap}>
                      <LinearGradient
                        colors={colors.btnGradient}
                        style={styles.serviceProIconGrad}
                      >
                        <Ionicons name={item.icon || 'star'} size={20} color="#FFFFFF" />
                      </LinearGradient>
                    </View>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={styles.titleRow}>
                        <Text style={[styles.serviceProTitle, { color: colors.title }]} numberOfLines={1}>
                          {item.title}
                        </Text>
                      </View>
                      <Text style={[styles.serviceProSubtitle, { color: colors.muted }]} numberOfLines={1}>
                        {item.subtitle || `${item.category} • ${item.duration || 'Flexible'}`}
                      </Text>
                      <View style={styles.priceRow}>
                        <Text style={[styles.serviceProPrice, { color: colors.accent }]}>
                          ${item.price}
                          {item.type === 'monthly_package' ? '/month' : ''}
                        </Text>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor:
                                item.status === 'active' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.statusDot,
                              { backgroundColor: item.status === 'active' ? '#22C55E' : '#EAB308' },
                            ]}
                          />
                          <Text
                            style={[
                              styles.statusText,
                              { color: item.status === 'active' ? '#16A34A' : '#CA8A04' },
                            ]}
                          >
                            {item.status === 'active' ? 'Active' : 'Paused'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Highlights / Inclusions */}
                  {item.included && item.included.length > 0 && (
                    <View style={[styles.inclusionsSnippet, { backgroundColor: colors.cardInner }]}>
                      <Text style={[styles.inclusionsTitle, { color: colors.muted }]}>What's included:</Text>
                      <Text style={[styles.inclusionsBody, { color: colors.title }]} numberOfLines={2}>
                        ✓ {item.included.slice(0, 3).join('   ✓ ')}
                      </Text>
                    </View>
                  )}

                  {/* Footer Meta & Actions */}
                  <View style={[styles.serviceProFooter, { borderTopColor: colors.divider }]}>
                    <View style={styles.footerInfoCol}>
                      <Text style={[styles.footerMetaLabel, { color: colors.muted }]}>
                        {item.type === 'event'
                          ? `${item.totalSold || 280} Tickets Sold`
                          : item.type === 'monthly_package'
                          ? `${item.subscribersCount || 18}/${item.maxSubscribers || 25} Subscribers`
                          : `${item.bookingsCount || 12} Bookings completed`}
                      </Text>
                    </View>

                    <View style={styles.footerActionsRow}>
                      <TouchableOpacity
                        onPress={() => handleShare(item)}
                        style={[styles.actionIconBtn, { backgroundColor: colors.iconBg }]}
                      >
                        <Ionicons name="share-social-outline" size={17} color={colors.accent} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleToggleActive(item.id)}
                        style={[
                          styles.actionPillBtn,
                          {
                            backgroundColor: item.status === 'active' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.actionPillText,
                            { color: item.status === 'active' ? '#EF4444' : '#22C55E' },
                          ]}
                        >
                          {item.status === 'active' ? 'Pause' : 'Activate'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          setSelectedItem(item);
                          setDetailModalVisible(true);
                        }}
                        style={[styles.actionPillBtn, { backgroundColor: colors.accent }]}
                      >
                        <Text style={[styles.actionPillText, { color: '#FFFFFF', fontWeight: '700' }]}>
                          Manage
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* SUB-TAB 2: CLIENT ORDERS RECEIVED */}
          {proTab === 'orders' && (
            <View>
              <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
                Incoming orders and bookings placed by clients for your services.
              </Text>

              {providerOrders.map(order => (
                <View
                  key={order.id}
                  style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                >
                  <View style={styles.orderCardTop}>
                    <View style={styles.clientAvatarWrap}>
                      <LinearGradient colors={colors.btnGradient} style={styles.avatarMini}>
                        <Ionicons name="person" size={16} color="#FFFFFF" />
                      </LinearGradient>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.clientName, { color: colors.title }]}>{order.clientName}</Text>
                      <Text style={[styles.orderServiceName, { color: colors.accent }]}>{order.service}</Text>
                      <Text style={[styles.orderDate, { color: colors.muted }]}>{order.date}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.orderPrice, { color: colors.title }]}>{order.price}</Text>
                      <View style={[styles.orderStatusPill, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                        <Text style={styles.orderStatusText}>{order.status}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.orderCardBottom, { borderTopColor: colors.divider }]}>
                    <TouchableOpacity
                      onPress={() => Alert.alert('Client Communication', `Opening direct message with ${order.clientName}...`)}
                      style={[styles.orderActionBtn, { backgroundColor: colors.surface }]}
                    >
                      <Ionicons name="chatbubble-outline" size={16} color={colors.accent} style={{ marginRight: 6 }} />
                      <Text style={[styles.orderActionText, { color: colors.title }]}>Message Client</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => Alert.alert('Session Ready', `Session for ${order.service} is confirmed and synced to your Valens calendar.`)}
                      style={[styles.orderActionBtn, { backgroundColor: colors.surface }]}
                    >
                      <Ionicons name="videocam-outline" size={16} color={colors.accent} style={{ marginRight: 6 }} />
                      <Text style={[styles.orderActionText, { color: colors.title }]}>Session Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 👤 SIDE 2: ME AS A CLIENT */}
      {/* ========================================================================= */}
      {activeSide === 'client' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Buyer Notification Banner */}
          {showNotificationBanner && (
            <View style={[styles.buyerNotifBanner, { backgroundColor: isDarkMode ? (colors.isBusiness ? '#33291B' : '#281745') : (colors.isBusiness ? '#FAF1E2' : '#F5EEFF'), borderColor: colors.accent }]}>
              <View style={styles.notifIconWrap}>
                <Ionicons name="notifications" size={20} color={colors.accent} />
              </View>
              <View style={{ flex: 1, marginHorizontal: 10 }}>
                <Text style={[styles.notifTitle, { color: colors.title }]}>
                  Buyer Notification
                </Text>
                <Text style={[styles.notifDesc, { color: colors.body }]}>
                  When you book or purchase a service, your booking notification arrives here and is automatically placed in your <Text style={{ fontWeight: '700' }}>Services Orders</Text> and <Text style={{ fontWeight: '700' }}>Services Product List</Text>.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowNotificationBanner(false)}>
                <Ionicons name="close" size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Sub Navigation (Services Orders vs Services Product List) */}
          <View style={[styles.subTabsRow, { borderBottomColor: colors.divider }]}>
            <TouchableOpacity
              onPress={() => setClientTab('orders')}
              style={[
                styles.subTabItem,
                clientTab === 'orders' && [styles.subTabItemActive, { borderBottomColor: colors.accent }],
              ]}
            >
              <Ionicons
                name="receipt-outline"
                size={16}
                color={clientTab === 'orders' ? colors.accent : colors.muted}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.subTabText,
                  { color: clientTab === 'orders' ? colors.accent : colors.muted, fontWeight: clientTab === 'orders' ? '700' : '500' },
                ]}
              >
                Services Orders ({clientOrders.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setClientTab('products')}
              style={[
                styles.subTabItem,
                clientTab === 'products' && [styles.subTabItemActive, { borderBottomColor: colors.accent }],
              ]}
            >
              <Ionicons
                name="cube-outline"
                size={16}
                color={clientTab === 'products' ? colors.accent : colors.muted}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.subTabText,
                  { color: clientTab === 'products' ? colors.accent : colors.muted, fontWeight: clientTab === 'products' ? '700' : '500' },
                ]}
              >
                Services Product List ({clientProducts.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* SUB-TAB 1: BUYER SERVICES ORDERS */}
          {clientTab === 'orders' && (
            <View>
              <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
                Your booked appointments, consultations, events, and packages.
              </Text>

              {clientOrders.map(order => (
                <View
                  key={order.id}
                  style={[styles.clientOrderCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                >
                  <View style={styles.clientOrderHeader}>
                    <View style={styles.orderIconBubble}>
                      <LinearGradient colors={colors.btnGradient} style={styles.serviceProIconGrad}>
                        <Ionicons name={order.icon || 'briefcase'} size={18} color="#FFFFFF" />
                      </LinearGradient>
                    </View>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[styles.orderNumberText, { color: colors.muted }]}>
                          {order.orderNumber || '#VAL-ORDER'}
                        </Text>
                        <View style={[styles.orderStatusPill, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                          <Text style={styles.orderStatusText}>{order.status}</Text>
                        </View>
                      </View>
                      <Text style={[styles.clientOrderTitle, { color: colors.title }]}>{order.title}</Text>
                      <Text style={[styles.clientOrderProvider, { color: colors.accent }]}>
                        Provider: {order.providerName}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.clientOrderDetailsWrap, { backgroundColor: colors.cardInner }]}>
                    <View style={styles.orderDetailItem}>
                      <Ionicons name="calendar-outline" size={15} color={colors.accent} style={{ marginRight: 8 }} />
                      <Text style={[styles.orderDetailText, { color: colors.body }]}>
                        {order.date} • {order.time || 'Confirmed'}
                      </Text>
                    </View>

                    {order.address ? (
                      <View style={styles.orderDetailItem}>
                        <Ionicons name="location-outline" size={15} color={colors.accent} style={{ marginRight: 8 }} />
                        <Text style={[styles.orderDetailText, { color: colors.body }]} numberOfLines={1}>
                          {order.address}
                        </Text>
                      </View>
                    ) : null}

                    {order.link ? (
                      <View style={styles.orderDetailItem}>
                        <Ionicons name="videocam-outline" size={15} color={colors.accent} style={{ marginRight: 8 }} />
                        <Text style={[styles.orderDetailText, { color: colors.accent }]}>
                          Online Video Link Ready
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.orderDetailItem}>
                      <Ionicons name="pricetag-outline" size={15} color={colors.accent} style={{ marginRight: 8 }} />
                      <Text style={[styles.orderDetailText, { color: colors.body, fontWeight: '700' }]}>
                        ${order.price}
                      </Text>
                    </View>
                  </View>

                  {/* Actions for buyer */}
                  <View style={[styles.clientOrderActions, { borderTopColor: colors.divider }]}>
                    {order.type === 'event' ? (
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedItem(order);
                          setQrModalVisible(true);
                        }}
                        style={[styles.clientMainActionBtn, { backgroundColor: colors.accent }]}
                      >
                        <Ionicons name="qr-code-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.clientMainActionText}>View Ticket QR</Text>
                      </TouchableOpacity>
                    ) : order.format === 'online' ? (
                      <TouchableOpacity
                        onPress={() => Alert.alert('Joining Session', 'Connecting to secure Valens video session...')}
                        style={[styles.clientMainActionBtn, { backgroundColor: colors.accent }]}
                      >
                        <Ionicons name="videocam" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.clientMainActionText}>Join Online Session</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => Alert.alert('Directions', `Directions to: ${order.address || 'Provider location'}`)}
                        style={[styles.clientMainActionBtn, { backgroundColor: colors.accent }]}
                      >
                        <Ionicons name="navigate" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.clientMainActionText}>Get Directions</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      onPress={() => Alert.alert('Contact', `Messaging provider ${order.providerName}...`)}
                      style={[styles.clientSecActionBtn, { backgroundColor: colors.surface }]}
                    >
                      <Ionicons name="chatbubble-outline" size={16} color={colors.title} style={{ marginRight: 6 }} />
                      <Text style={[styles.clientSecActionText, { color: colors.title }]}>Contact</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* SUB-TAB 2: BUYER SERVICES PRODUCT LIST */}
          {clientTab === 'products' && (
            <View>
              <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
                Active subscriptions, purchased packages, and available service passes in your library.
              </Text>

              {clientProducts.map(prod => (
                <View
                  key={prod.id}
                  style={[styles.clientProductCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                >
                  <View style={styles.clientProductHeader}>
                    <View style={styles.productIconWrap}>
                      <LinearGradient colors={colors.btnGradient} style={styles.serviceProIconGrad}>
                        <Ionicons name={prod.icon || 'gift'} size={20} color="#FFFFFF" />
                      </LinearGradient>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.clientProdTitle, { color: colors.title }]}>{prod.title}</Text>
                      <Text style={[styles.clientProdProvider, { color: colors.muted }]}>By {prod.provider}</Text>
                      <View style={styles.prodStatusRow}>
                        <Text style={[styles.clientProdPrice, { color: colors.accent }]}>{prod.price}</Text>
                        <View style={[styles.productStatusBadge, { backgroundColor: 'rgba(124, 58, 237, 0.12)' }]}>
                          <Text style={[styles.productStatusText, { color: colors.accent }]}>{prod.status}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Included features */}
                  {prod.inclusions && prod.inclusions.length > 0 && (
                    <View style={[styles.productInclusionsBox, { backgroundColor: colors.cardInner }]}>
                      <Text style={[styles.productInclusionsHeading, { color: colors.muted }]}>Package Items:</Text>
                      <View style={styles.inclusionsChipRow}>
                        {prod.inclusions.map((item, idx) => (
                          <View key={idx} style={[styles.inclusionChip, { backgroundColor: colors.surface }]}>
                            <Ionicons name="checkmark-circle" size={13} color="#22C55E" style={{ marginRight: 4 }} />
                            <Text style={[styles.inclusionChipText, { color: colors.title }]}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Downloadable extras */}
                  {prod.extras && prod.extras.length > 0 && (
                    <View style={styles.extrasWrap}>
                      {prod.extras.map((ex, idx) => (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => Alert.alert('Download', `Opening ${ex.name}...`)}
                          style={[styles.extraItemBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                        >
                          <Ionicons
                            name={ex.name.toLowerCase().includes('pdf') || ex.size.includes('PDF') ? 'document-text' : 'videocam'}
                            size={16}
                            color={colors.accent}
                            style={{ marginRight: 8 }}
                          />
                          <Text style={[styles.extraNameText, { color: colors.title }]} numberOfLines={1}>
                            {ex.name}
                          </Text>
                          <Text style={[styles.extraSizeText, { color: colors.muted }]}>({ex.size})</Text>
                          <Ionicons name="download-outline" size={16} color={colors.accent} style={{ marginLeft: 'auto' }} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <View style={[styles.clientProductFooter, { borderTopColor: colors.divider }]}>
                    <TouchableOpacity
                      onPress={() => Alert.alert('Book Session', `Booking session for ${prod.title}...`)}
                      style={[styles.prodBookBtn, { backgroundColor: colors.accent }]}
                    >
                      <Text style={styles.prodBookText}>Book Next Session</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => Alert.alert('Subscription Info', 'Manage subscription, payment method, and billing renewal.')}
                      style={[styles.prodManageBtn, { backgroundColor: colors.surface }]}
                    >
                      <Text style={[styles.prodManageText, { color: colors.title }]}>Subscription</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* TICKET QR MODAL */}
      <Modal visible={qrModalVisible} transparent animationType="fade" onRequestClose={() => setQrModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentCard, { backgroundColor: colors.surface }]}>
            <View style={styles.qrHeader}>
              <Text style={[styles.qrModalTitle, { color: colors.title }]}>Digital Event Ticket</Text>
              <TouchableOpacity onPress={() => setQrModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.title} />
              </TouchableOpacity>
            </View>

            <View style={styles.qrCenter}>
              <View style={[styles.qrBox, { backgroundColor: '#FFFFFF', borderColor: colors.cardBorder }]}>
                <Ionicons name="qr-code" size={180} color={colors.isBusiness ? '#3D2E10' : '#1F1335'} />
              </View>
              <Text style={[styles.qrCodeLabel, { color: colors.title }]}>
                {selectedItem?.ticketCode || 'VAL-PASS-2024'}
              </Text>
              <Text style={[styles.qrSubText, { color: colors.muted }]}>
                Show this barcode at entry for verification.
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setQrModalVisible(false)}
              style={[styles.closeModalBtn, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.closeModalBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal visible={detailModalVisible} transparent animationType="slide" onRequestClose={() => setDetailModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentCard, { backgroundColor: colors.surface }]}>
            <View style={styles.qrHeader}>
              <Text style={[styles.qrModalTitle, { color: colors.title }]}>Service Details</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.title} />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <ScrollView style={{ maxHeight: 380 }}>
                <Text style={[styles.detailModalHeading, { color: colors.title }]}>{selectedItem.title}</Text>
                <Text style={[styles.detailModalSub, { color: colors.accent }]}>
                  ${selectedItem.price} • {selectedItem.category}
                </Text>

                <View style={[styles.detailRow, { borderBottomColor: colors.divider }]}>
                  <Text style={[styles.detailLabel, { color: colors.muted }]}>Status</Text>
                  <Text style={[styles.detailVal, { color: '#22C55E' }]}>{selectedItem.status || 'Active'}</Text>
                </View>

                {selectedItem.availability && (
                  <View style={[styles.detailRow, { borderBottomColor: colors.divider }]}>
                    <Text style={[styles.detailLabel, { color: colors.muted }]}>Availability</Text>
                    <Text style={[styles.detailVal, { color: colors.title }]}>{selectedItem.availability}</Text>
                  </View>
                )}

                {selectedItem.address && (
                  <View style={[styles.detailRow, { borderBottomColor: colors.divider }]}>
                    <Text style={[styles.detailLabel, { color: colors.muted }]}>Location</Text>
                    <Text style={[styles.detailVal, { color: colors.title }]}>{selectedItem.address}</Text>
                  </View>
                )}

                {selectedItem.included && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[styles.detailLabel, { color: colors.muted, marginBottom: 6 }]}>Included Features</Text>
                    {selectedItem.included.map((inc, i) => (
                      <Text key={i} style={[styles.detailVal, { color: colors.title, marginVertical: 2 }]}>
                        ✓ {inc}
                      </Text>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              onPress={() => setDetailModalVisible(false)}
              style={[styles.closeModalBtn, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.closeModalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  duoSwitcherWrap: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  duoSwitcherBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  duoSwitcherText: {
    fontSize: 13,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  metricsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricDivider: {
    width: 1,
    height: 26,
  },
  subTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  subTabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginRight: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabItemActive: {
    borderBottomWidth: 2,
  },
  subTabText: {
    fontSize: 14,
  },
  tabContentWrap: {},
  filterAndActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  filterPillsContainer: {
    overflow: 'hidden',
    marginRight: 10,
  },
  filterPillsScrollView: {
    width: '100%',
  },
  filterPillsScroll: {
    paddingRight: 6,
    alignItems: 'center',
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  filterPillText: {
    fontSize: 12,
  },
  proAddServiceBtn: {
    width: 90,
    height: 34,
    borderRadius: 14,
    overflow: 'hidden',
    flexShrink: 0,
  },
  proAddServiceGrad: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // paddingHorizontal: 8,
    borderRadius: 15
  },
  proAddServiceText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  serviceProCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  serviceProCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceProIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
  },
  serviceProIconGrad: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serviceProTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  serviceProSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  serviceProPrice: {
    fontSize: 15,
    fontWeight: '800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  inclusionsSnippet: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
  },
  inclusionsTitle: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  inclusionsBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  serviceProFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  footerInfoCol: {
    flex: 1,
  },
  footerMetaLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  footerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  actionPillBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 6,
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  orderCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  orderCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientAvatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
  },
  avatarMini: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientName: {
    fontSize: 14,
    fontWeight: '700',
  },
  orderServiceName: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  orderDate: {
    fontSize: 11,
    marginTop: 2,
  },
  orderPrice: {
    fontSize: 14,
    fontWeight: '800',
  },
  orderStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  orderStatusText: {
    color: '#16A34A',
    fontSize: 10,
    fontWeight: '700',
  },
  orderCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  orderActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  orderActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  buyerNotifBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  notifIconWrap: {
    marginTop: 2,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  notifDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  clientOrderCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  clientOrderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
  },
  orderNumberText: {
    fontSize: 11,
    fontWeight: '600',
  },
  clientOrderTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  clientOrderProvider: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  clientOrderDetailsWrap: {
    borderRadius: 10,
    padding: 10,
    marginVertical: 10,
  },
  orderDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  orderDetailText: {
    fontSize: 12,
  },
  clientOrderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  clientMainActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    marginRight: 8,
  },
  clientMainActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  clientSecActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  clientSecActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clientProductCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  clientProductHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
  },
  clientProdTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  clientProdProvider: {
    fontSize: 12,
    marginTop: 1,
  },
  prodStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  clientProdPrice: {
    fontSize: 14,
    fontWeight: '800',
  },
  productStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  productStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  productInclusionsBox: {
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  productInclusionsHeading: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  inclusionsChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  inclusionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  inclusionChipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  extrasWrap: {
    marginTop: 10,
  },
  extraItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  extraNameText: {
    fontSize: 12,
    fontWeight: '600',
  },
  extraSizeText: {
    fontSize: 11,
    marginLeft: 6,
  },
  clientProductFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
  },
  prodBookBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    marginRight: 8,
  },
  prodBookText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  prodManageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  prodManageText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContentCard: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  qrModalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  qrCenter: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  qrBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCodeLabel: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 14,
    letterSpacing: 1.5,
  },
  qrSubText: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  closeModalBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  closeModalBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  detailModalHeading: {
    fontSize: 18,
    fontWeight: '800',
  },
  detailModalSub: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  detailLabel: {
    fontSize: 13,
  },
  detailVal: {
    fontSize: 13,
    fontWeight: '600',
  },
});
