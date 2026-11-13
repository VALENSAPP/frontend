import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVICES_KEY = '@valens_user_services_v1';
const CLIENT_ORDERS_KEY = '@valens_client_services_orders_v1';
const CLIENT_PRODUCTS_KEY = '@valens_client_services_products_v1';
const PROVIDER_ORDERS_KEY = '@valens_provider_services_orders_v1';
const NOTIFICATIONS_KEY = '@valens_services_notifications_v1';

export const INITIAL_SERVICES = [
  {
    id: 'svc_mentorship_1',
    type: 'mentorship',
    title: 'Business Growth Mentorship',
    subtitle: '3 Months Program • Online',
    category: 'Mentorship',
    duration: '3 Months',
    sessionDuration: '60 minutes',
    format: 'online',
    price: '750.00',
    availability: 'Mon, Wed, Fri 10:00 AM – 6:00 PM (EST)',
    status: 'active',
    bookingsCount: 8,
    rating: 4.9,
    createdAt: '2026-11-01',
    icon: 'school-outline',
  },
  {
    id: 'svc_consultation_1',
    type: 'consultation',
    title: 'Business Strategy Consultation',
    subtitle: '60 min • Online',
    category: 'Consultation',
    duration: '60 minutes',
    format: 'online',
    price: '150.00',
    availability: 'Mon, Wed, Fri 10:00 AM – 6:00 PM (EST)',
    included: [
      '60 min 1:1 session',
      'Personalized advice',
      'Action plan & recommendations',
      'Q&A',
      'Follow-up summary',
    ],
    status: 'active',
    bookingsCount: 14,
    rating: 5.0,
    createdAt: '2026-11-04',
    icon: 'chatbubble-ellipses-outline',
  },
  {
    id: 'svc_appointment_1',
    type: 'appointment',
    title: 'Hydrafacial Treatment',
    subtitle: '60 min • In Person',
    category: 'Beauty & Aesthetics',
    duration: '60 minutes',
    format: 'in_person',
    address: '1750 Broadway, Suite 200, New York, NY 10019, USA',
    price: '150.00',
    availability: 'Mon, Wed, Fri 10:00 AM – 12:00 PM, 2:00 PM – 6:00 PM',
    included: [
      'Skin analysis',
      'Hydrafacial treatment',
      'Moisturizing mask',
      'Aftercare advice',
    ],
    status: 'active',
    bookingsCount: 22,
    rating: 4.9,
    createdAt: '2026-11-07',
    icon: 'calendar-outline',
  },
  {
    id: 'svc_event_1',
    type: 'event',
    title: 'Glow Birthday Party',
    subtitle: 'Saturday, June 15, 2024 • 9:00 PM',
    category: 'Birthday Party',
    location: 'Luminous Lounge, 123 Party Street, Miami, FL 33101, USA',
    date: 'Saturday, June 15, 2024',
    time: '9:00 PM – 2:00 AM',
    ageRestriction: '21+',
    dressCode: 'Dress to impress',
    tickets: [
      { type: 'Early Bird', price: '25.00', count: 100, sold: 100 },
      { type: 'General Admission', price: '40.00', count: 200, sold: 142 },
      { type: 'VIP Access', price: '80.00', count: 50, sold: 38 },
    ],
    status: 'active',
    totalSold: 280,
    createdAt: '2026-11-08',
    icon: 'ticket-outline',
  },
  {
    id: 'svc_package_1',
    type: 'monthly_package',
    title: 'Beauty Set',
    subtitle: 'Monthly Package • Self-Care',
    category: 'Monthly Package',
    billing: 'Monthly',
    price: '199.00',
    subscribersCount: 18,
    maxSubscribers: 25,
    sessionsPerMonth: 2,
    included: [
      'Hair brush',
      '2x Nails',
      '1x Eyebrows',
      '1x Massage',
      'Exclusive content',
      'Priority booking',
    ],
    extras: [
      { name: 'Beauty Set Guide', size: 'PDF • 2.4 MB' },
      { name: 'Welcome Video', size: 'MP4 • 5:32' },
    ],
    status: 'active',
    createdAt: '2026-11-09',
    icon: 'gift-outline',
  },
];

export const INITIAL_CLIENT_ORDERS = [
  {
    id: 'ord_1',
    orderNumber: 'VAL-78291',
    title: 'Hydrafacial Treatment',
    type: 'appointment',
    providerName: 'Dr. Elena Vance',
    providerRole: 'Aesthetics & Skin Specialist',
    date: 'Friday, Nov 14, 2026',
    time: '10:00 AM – 11:00 AM',
    format: 'in_person',
    address: '1750 Broadway, Suite 200, New York, NY 10019',
    price: '150.00',
    status: 'Confirmed',
    notification: 'Booking confirmed! Check in at front desk 10 min early.',
    icon: 'calendar-outline',
  },
  {
    id: 'ord_2',
    orderNumber: 'VAL-44819',
    title: 'Business Strategy Consultation',
    type: 'consultation',
    providerName: 'Marcus Sterling, Esq.',
    providerRole: 'Corporate & IP Advisory',
    date: 'Tomorrow, Nov 12, 2026',
    time: '2:00 PM – 3:00 PM (EST)',
    format: 'online',
    price: '150.00',
    status: 'Confirmed',
    link: 'https://valens.app/meet/strat-44819',
    notification: 'Video meeting room is ready. Tap to join online session.',
    icon: 'chatbubble-ellipses-outline',
  },
  {
    id: 'ord_3',
    orderNumber: 'VAL-90124',
    title: 'Glow Birthday Party Ticket',
    type: 'event',
    providerName: 'Valens Nightlife Host',
    date: 'Saturday, June 15, 2024',
    time: '9:00 PM – 2:00 AM',
    location: 'Luminous Lounge, 123 Party Street, Miami, FL',
    tier: 'General Admission',
    price: '40.00',
    status: 'Ticket Ready',
    ticketCode: 'V-GLOW-9821',
    notification: 'Ticket ready. Show digital barcode at entry.',
    icon: 'ticket-outline',
  },
  {
    id: 'ord_4',
    orderNumber: 'VAL-11094',
    title: 'Beauty Set (Monthly Package)',
    type: 'monthly_package',
    providerName: 'Graziela Barretto',
    billing: '$199.00 / month',
    status: 'Active Subscription',
    renewDate: 'Dec 11, 2026',
    sessionsRemaining: '2 of 2 sessions remaining this month',
    icon: 'gift-outline',
  },
];

export const INITIAL_CLIENT_PRODUCTS = [
  {
    id: 'prd_1',
    title: 'Beauty Set Subscription',
    type: 'monthly_package',
    provider: 'Graziela Barretto',
    status: 'Active • Renews Dec 11',
    price: '$199.00 / mo',
    inclusions: [
      'Hair brush',
      '2x Nails',
      '1x Eyebrows',
      '1x Massage',
      'Exclusive content',
    ],
    extras: [
      { name: 'Beauty Set Guide', size: 'PDF • 2.4 MB' },
      { name: 'Welcome Video', size: 'MP4 • 5:32' },
    ],
    icon: 'gift-outline',
  },
  {
    id: 'prd_2',
    title: 'Hydrafacial Treatment Session',
    type: 'appointment',
    provider: 'Dr. Elena Vance',
    status: 'Booked • Friday Nov 14',
    price: '$150.00',
    address: '1750 Broadway, Suite 200, NY',
    icon: 'calendar-outline',
  },
  {
    id: 'prd_3',
    title: 'Glow Birthday Party Entry Pass',
    type: 'event',
    provider: 'Valens Nightlife Host',
    status: 'Ticket Confirmed (Tier: General)',
    price: '$40.00',
    location: 'Luminous Lounge, Miami',
    icon: 'ticket-outline',
  },
  {
    id: 'prd_4',
    title: 'Business Growth Mentorship (3 Months)',
    type: 'mentorship',
    provider: 'Sarah Jenkins',
    status: 'In Progress (Session 3 of 12)',
    price: '$750.00',
    icon: 'school-outline',
  },
];

export const INITIAL_PROVIDER_ORDERS = [
  {
    id: 'p_ord_1',
    clientName: 'Sarah Miller',
    clientAvatar: null,
    service: 'Hydrafacial Treatment',
    type: 'appointment',
    date: 'Friday, Nov 14, 2026 at 10:00 AM',
    price: '$150.00',
    format: 'In-Person',
    status: 'Confirmed',
  },
  {
    id: 'p_ord_2',
    clientName: 'David Chen',
    clientAvatar: null,
    service: 'Business Strategy Consultation',
    type: 'consultation',
    date: 'Tomorrow, Nov 12, 2026 at 2:00 PM',
    price: '$150.00',
    format: 'Online',
    status: 'Confirmed',
  },
  {
    id: 'p_ord_3',
    clientName: 'Jessica Taylor',
    clientAvatar: null,
    service: 'Beauty Set (Monthly Package)',
    type: 'monthly_package',
    date: 'Subscribed Nov 10, 2026',
    price: '$199.00 / month',
    format: 'Monthly Recurring',
    status: 'Active Subscriber',
  },
  {
    id: 'p_ord_4',
    clientName: 'Alex Rivera',
    clientAvatar: null,
    service: 'Business Growth Mentorship',
    type: 'mentorship',
    date: 'Session 4 scheduled for Nov 18',
    price: '$750.00',
    format: 'Online',
    status: 'In Progress',
  },
];

export const getStoredServices = async () => {
  try {
    const raw = await AsyncStorage.getItem(SERVICES_KEY);
    if (!raw) {
      await AsyncStorage.setItem(SERVICES_KEY, JSON.stringify(INITIAL_SERVICES));
      return INITIAL_SERVICES;
    }
    return JSON.parse(raw);
  } catch (_) {
    return INITIAL_SERVICES;
  }
};

export const saveService = async newService => {
  try {
    const current = await getStoredServices();
    const filtered = current.filter(s => s.id !== newService.id);
    const updated = [newService, ...filtered];
    await AsyncStorage.setItem(SERVICES_KEY, JSON.stringify(updated));

    // Also automatically simulate placing the booking in buyer's "Services Orders" and "Services Product List"
    await simulateBuyerPlacement(newService);

    return updated;
  } catch (_) {
    return [newService, ...INITIAL_SERVICES];
  }
};

export const getClientOrders = async () => {
  try {
    const raw = await AsyncStorage.getItem(CLIENT_ORDERS_KEY);
    if (!raw) {
      await AsyncStorage.setItem(CLIENT_ORDERS_KEY, JSON.stringify(INITIAL_CLIENT_ORDERS));
      return INITIAL_CLIENT_ORDERS;
    }
    return JSON.parse(raw);
  } catch (_) {
    return INITIAL_CLIENT_ORDERS;
  }
};

export const getClientProducts = async () => {
  try {
    const raw = await AsyncStorage.getItem(CLIENT_PRODUCTS_KEY);
    if (!raw) {
      await AsyncStorage.setItem(CLIENT_PRODUCTS_KEY, JSON.stringify(INITIAL_CLIENT_PRODUCTS));
      return INITIAL_CLIENT_PRODUCTS;
    }
    return JSON.parse(raw);
  } catch (_) {
    return INITIAL_CLIENT_PRODUCTS;
  }
};

export const getProviderOrders = async () => {
  try {
    const raw = await AsyncStorage.getItem(PROVIDER_ORDERS_KEY);
    if (!raw) {
      await AsyncStorage.setItem(PROVIDER_ORDERS_KEY, JSON.stringify(INITIAL_PROVIDER_ORDERS));
      return INITIAL_PROVIDER_ORDERS;
    }
    return JSON.parse(raw);
  } catch (_) {
    return INITIAL_PROVIDER_ORDERS;
  }
};

export const getServiceNotifications = async () => {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (_) {
    return [];
  }
};

export const addServiceNotification = async notification => {
  try {
    const current = await getServiceNotifications();
    const updated = [notification, ...current];
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
    return updated;
  } catch (_) {
    return [notification];
  }
};

export const simulateBuyerPlacement = async service => {
  try {
    const clientOrder = {
      id: `ord_${Date.now()}`,
      orderNumber: `VAL-${Math.floor(10000 + Math.random() * 90000)}`,
      title: service.title,
      type: service.type,
      providerName: 'You (@yourprofile)',
      providerRole: service.category || 'Service Provider',
      date: service.date || 'Available for booking',
      time: service.time || service.availability || 'Schedule on booking',
      format: service.format || (service.location ? 'in_person' : 'online'),
      address: service.address || service.location || '',
      price: service.price || (service.tickets?.[0]?.price ? `$${service.tickets[0].price}` : '150.00'),
      status: 'Confirmed',
      notification: `Buyer received notification: Your ${service.title} has been booked and placed in your Services Orders & Product List.`,
      icon: service.icon || 'star-outline',
    };

    const clientProduct = {
      id: `prd_${Date.now()}`,
      title: service.title,
      type: service.type,
      provider: 'You (@yourprofile)',
      status: 'Active • Ready for Use',
      price: `$${service.price || '150.00'}`,
      address: service.address || service.location,
      inclusions: service.included || [],
      extras: service.extras || [],
      icon: service.icon || 'star-outline',
    };

    const orders = await getClientOrders();
    const updatedOrders = [clientOrder, ...orders];
    await AsyncStorage.setItem(CLIENT_ORDERS_KEY, JSON.stringify(updatedOrders));

    const products = await getClientProducts();
    const updatedProducts = [clientProduct, ...products];
    await AsyncStorage.setItem(CLIENT_PRODUCTS_KEY, JSON.stringify(updatedProducts));

    await addServiceNotification({
      id: `notif_${Date.now()}`,
      title: `Service Placed: ${service.title}`,
      body: `Buyer notification delivered: Placed in Services Orders & Product List.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
    });
  } catch (_) {}
};
