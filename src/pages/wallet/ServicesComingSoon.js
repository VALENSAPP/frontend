import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Svg, { Ellipse, Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { getServicesSettingsDraft } from '../../services/servicesSettings';
import { useToast } from 'react-native-toast-notifications';
import { useSelector } from 'react-redux';
import { useLanguage } from '../../i18n';
import { useThemeContext } from '../../theme/ThemeContext';
import { useBusinessProfileTheme } from '../../theme/useBusinessProfileTheme';
import { showToastMessage } from '../../components/displaytoastmessage';
import { normalizeProfileType } from '../../utils/supportEligibility';
import RegularSubscriptionPrompt from '../../components/modals/RegularSubscriptionPrompt';
import { saveService, getStoredServices } from './services/servicesStorage';
import ManageServicesView from './services/ManageServicesView';
import ConsultationFlow from './services/ConsultationFlow';
import AppointmentFlow from './services/AppointmentFlow';
import EventFlow from './services/EventFlow';
import MonthlyPackageFlow from './services/MonthlyPackageFlow';
import MentorshipFlow from './services/MentorshipFlow';
import ActivateServicesScreen from './services/ActivateServicesScreen';
import ChooseServiceTypeModal from './services/ChooseServiceTypeModal';
import ProfileServicesTab from './services/ProfileServicesTab';
import { getProviderEligibility } from '../../services/proServices';

const NOTIFY_KEY = 'servicesComingSoonNotifyMe';
const HERO_FLY = require('../../assets/icons/pngicons/welcome.png');
const HERO_FLY_BUSINESS = require('../../assets/icons/pngicons/Golden_Bee_Masco.png');

const MOCKUP_PRO_SERVICES = [
  {
    id: 'mock_pro_1',
    title: '1:1 Mentorship Pack',
    price: '$199.00 / month',
    status: 'Active',
    clientsCount: '48 Clients',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
  },
  {
    id: 'mock_pro_2',
    title: 'Beauty Set',
    price: '$129.00 / month',
    status: 'Active',
    clientsCount: '36 Clients',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80',
  },
  {
    id: 'mock_pro_3',
    title: 'Business Coaching',
    price: '$249.00 / month',
    status: 'Active',
    clientsCount: '21 Clients',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&q=80',
  },
];

const MOCKUP_CLIENT_PACKAGES = [
  {
    id: 'mock_client_pkg_1',
    title: '1:1 Mentorship Pack',
    price: '$199.00 / month',
    status: 'Active',
    renewsText: 'Renews on Jun 24, 2024',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
  },
  {
    id: 'mock_client_pkg_2',
    title: 'Beauty Set',
    price: '$129.00 / month',
    status: 'Active',
    renewsText: 'Renews on Jun 30, 2024',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80',
  },
];

const MOCKUP_UPCOMING_SESSIONS = [
  {
    id: 'mock_session_1',
    month: 'MAY',
    day: '24',
    title: '1:1 Mentorship Session',
    time: 'Today • 10:00 AM – 11:00 AM',
    provider: 'with Graziela Barrette',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
  },
  {
    id: 'mock_session_2',
    month: 'MAY',
    day: '27',
    title: 'Beauty Set – Nails',
    time: 'Mon • 2:00 PM – 3:00 PM',
    provider: 'with Studio Glam',
    icon: 'sparkles',
  },
];

const MOCKUP_RECOMMENDED = [
  {
    id: 'mock_rec_1',
    title: 'Business Coaching',
    price: '$249 / session',
    rating: '4.9 (63)',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&q=80',
  },
  {
    id: 'mock_rec_2',
    title: 'Personal Styling Session',
    price: '$159 / session',
    rating: '4.8 (42)',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&q=80',
  },
];

const OFFERINGS = [
  { key: 'mentorships', icon: 'school-outline' },
  { key: 'consultations', icon: 'chatbubble-ellipses-outline' },
  { key: 'appointments', icon: 'calendar-outline' },
  { key: 'events', icon: 'ticket-outline' },
  { key: 'packages', icon: 'gift-outline' },
];

const VERTICAL_HERO_CARDS = [
  { icon: 'person', top: 4 },
  { icon: 'calendar-outline', top: 50 },
  { icon: 'chatbubble-ellipses-outline', top: 96 },
  { icon: 'gift-outline', top: 142 },
];

const DAYS_OF_WEEK = [
  { id: 'Mon', label: 'Mon' },
  { id: 'Tue', label: 'Tue' },
  { id: 'Wed', label: 'Wed' },
  { id: 'Thu', label: 'Thu' },
  { id: 'Fri', label: 'Fri' },
  { id: 'Sat', label: 'Sat' },
  { id: 'Sun', label: 'Sun' },
];

const INITIAL_DAY_SLOTS = {
  Mon: {
    enabled: true,
    slots: [
      { id: '1', from: '10:00 AM', to: '12:00 PM' },
      { id: '2', from: '2:00 PM', to: '6:00 PM' },
    ],
  },
  Wed: {
    enabled: true,
    slots: [
      { id: '1', from: '9:00 AM', to: '1:00 PM' },
      { id: '2', from: '2:00 PM', to: '5:00 PM' },
    ],
  },
  Fri: {
    enabled: true,
    slots: [
      { id: '1', from: '10:00 AM', to: '1:00 PM' },
      { id: '2', from: '3:00 PM', to: '7:00 PM' },
    ],
  },
};

const Sparkle = ({ style, size = 10, color }) => (
  <Ionicons name="sparkles" size={size} color={color || '#C4B5FD'} style={style} />
);

export default function ServicesComingSoon() {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const toast = useToast();
  const { isDarkMode } = useThemeContext();
  const { width } = useWindowDimensions();

  const reduxProfile = useSelector(state => state.userProfile?.userProfile);
  const userProfilePic = useSelector(state => state.profileImage?.profileImg);

  const incomingParams = route?.params?.params || route?.params || {};
  const isOwnProfile =
    incomingParams.isOwnProfile !== undefined
      ? Boolean(incomingParams.isOwnProfile)
      : incomingParams.fromUsersProfile !== undefined
      ? !incomingParams.fromUsersProfile
      : true;

  const targetUser = incomingParams.userData || null;
  const targetUserId =
    incomingParams.userId ||
    incomingParams.targetUserId ||
    targetUser?.id ||
    targetUser?._id ||
    targetUser?.userId ||
    null;

  const [myUserId, setMyUserId] = useState(null);
  const [showStorefrontPreview, setShowStorefrontPreview] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const id = await AsyncStorage.getItem('userId');
        if (id) setMyUserId(id);
      } catch (_) {}
    })();
  }, []);

  const incomingProfileType =
    incomingParams.profileType ||
    targetUser?.profile ||
    reduxProfile;

  const { isBusinessProfile: hookIsBusiness } = useBusinessProfileTheme();

  const routeIsBusiness =
    incomingParams.isBusinessProfile === true ||
    hookIsBusiness === true ||
    normalizeProfileType(incomingProfileType) === 'company';

  const [notified, setNotified] = useState(false);
  const [isBusiness, setIsBusiness] = useState(routeIsBusiness);
  const effectiveIsBusiness = Boolean(isBusiness || routeIsBusiness || hookIsBusiness);
  const [hasMembership, setHasMembership] = useState(routeIsBusiness || hookIsBusiness);
  const [showMembershipModal, setShowMembershipModal] = useState(false);

  // Setup Flow Steps: 0 = Original Landing, 1 = Choose Type, 2 = Program Details, 3 = Service Details, 4 = Availability, 5 = Review, 6 = Live / All Set
  const isDirectSetup = route.name === 'ServiceSetup' || Boolean(route?.params?.startSetup);
  const [currentStep, setCurrentStep] = useState(isDirectSetup ? 1 : 0);
  const [roleMode, setRoleMode] = useState(
    route?.params?.initialSide === 'client' || route?.params?.initialRole === 'client'
      ? 'client'
      : 'professional',
  );
  const [mainTab, setMainTab] = useState(route?.params?.initialTab || 'services'); // 'services' | 'manage'
  const [activeFlow, setActiveFlow] = useState(null); // 'consultation' | 'appointment' | 'event' | 'monthly_package' | 'mentorship' | null
  const [storedServices, setStoredServices] = useState([]);
  const [selectedServiceAction, setSelectedServiceAction] = useState(null);
  const [overviewMonthDropdown, setOverviewMonthDropdown] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('This Month');
  const [servicesInfo, setServicesInfo] = useState(null);

  // Pro Services State
  const [eligibility, setEligibility] = useState(null);
  const [showActivateScreen, setShowActivateScreen] = useState(false);
  const [chooseTypeModalVisible, setChooseTypeModalVisible] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);

  const fetchEligibility = useCallback(async () => {
    if (!isOwnProfile) return;
    try {
      const res = await getProviderEligibility();
      if (res && res.success && res.data) {
        setEligibility(res.data);
      }
    } catch (_) {}
  }, [isOwnProfile]);

  useEffect(() => {
    fetchEligibility();
  }, [fetchEligibility]);

  useEffect(() => {
    (async () => {
      try {
        const list = await getStoredServices();
        if (Array.isArray(list) && list.length > 0) {
          setStoredServices(list);
        }
      } catch (_) {}
    })();
  }, [currentStep, activeFlow]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      (async () => {
        try {
          const draft = await getServicesSettingsDraft();
          if (isMounted && draft && (draft.title || draft.name || draft.whoAreYou || draft.servicePicture || draft.location)) {
            setServicesInfo(draft);
          }
        } catch (_e) {}
      })();
      return () => {
        isMounted = false;
      };
    }, [])
  );

  // Form State
  const [selectedServiceType, setSelectedServiceType] = useState('mentorship');
  const [durationStructure, setDurationStructure] = useState('long'); // 'one' | 'short' | 'long'
  const [programLength, setProgramLength] = useState('3 Months');
  const [selectedGoals, setSelectedGoals] = useState(['growth', 'leadership']);
  const [sessionDuration, setSessionDuration] = useState('60 minutes');
  const [serviceFormat, setServiceFormat] = useState('online'); // 'online' | 'in_person'
  const [officeAddress, setOfficeAddress] = useState('1750 Broadway, 20th Floor, New York, NY 10019, USA');
  const [phoneNumber, setPhoneNumber] = useState('+1 (555) 019-2834');
  const [priceAmount, setPriceAmount] = useState('150.00');
  const [selectedDays, setSelectedDays] = useState(['Mon', 'Wed', 'Fri']);
  const [daySchedule, setDaySchedule] = useState(INITIAL_DAY_SLOTS);
  const [timeZone, setTimeZone] = useState('(GMT-05:00) Eastern Time (US & Canada)');

  // Responsive scale — 1.0 on a 390-pt base
  const scale = Math.min(width / 390, 1.15);

  const colors = useMemo(() => {
    if (effectiveIsBusiness) {
      return isDarkMode
        ? {
          bg: ['#1A1713', '#251F18', '#1A1713'],
          surface: '#241E16',
          card: '#2A2319',
          cardBorder: '#4D3E28',
          cardInner: '#1F1A13',
          launch: '#33291B',
          title: '#FBF5E8',
          body: '#DDD0B8',
          muted: '#B8A688',
          iconBg: '#3D311F',
          wave: '#8C6D37',
          wave2: '#5C441D',
          headerIcon: '#FDF7EB',
          accent: '#CBA257',
          accentDark: '#A88038',
          btnGradient: ['#CBA257', '#CBA257'],
          pillBg: 'rgba(203, 162, 87, 0.22)',
          inputBg: '#1F1A13',
          divider: '#3D3220',
          isBusiness: true,
          // Business Theme Tokens
          dashboardGradient: ['#73541B', '#A88038'],
          dashboardShadow: '#A88038',
          dashboardBg: '#A88038',
          roleSwitcherBg: '#241E16',
          roleSwitcherBorder: '#4D3E28',
          roleSwitcherActiveBg: '#CBA257',
          roleSwitcherActiveShadow: '#CBA257',
          proStatValueColor: '#E8D9BD',
          priceColor: '#CBA257',
          brandIconBg: '#CBA257',
          brandTitle: '#CBA257',
          calendarHeaderStripe: '#8C6010',
          calendarBodyBg: '#1F1A13',
          calendarStar: '#CBA257',
          calendarCheckBadge: '#8C6010',
          sessionDateBlockBg: '#33291B',
          sessionDateMonth: '#CBA257',
          sessionDateDay: '#E8D9BD',
          sparklesIcon: '#CBA257',
        }
        : {
          bg: ['#FAF7F0', '#FAF7F0', '#FAF7F0'],
          surface: '#FFFFFF',
          card: '#FFFFFF',
          cardBorder: '#E8D9BD',
          cardInner: '#FAF7F0',
          launch: '#FAF7F0',
          title: '#CBA257',
          body: '#6E5D34',
          muted: '#8C7A55',
          iconBg: '#FAF1E2',
          wave: '#E8D9BD',
          wave2: '#DFC496',
          headerIcon: '#CBA257',
          accent: '#CBA257',
          accentDark: '#A88038',
          btnGradient: ['#CBA257', '#CBA257'],
          pillBg: 'rgba(203, 162, 87, 0.12)',
          inputBg: '#FFFFFF',
          divider: '#E8D9BD',
          isBusiness: true,
          // Business Theme Tokens
          dashboardGradient: ['#967026', '#CBA257'],
          dashboardShadow: '#CBA257',
          dashboardBg: '#CBA257',
          roleSwitcherBg: '#F7F2E7',
          roleSwitcherBorder: '#E8D9BD',
          roleSwitcherActiveBg: '#CBA257',
          roleSwitcherActiveShadow: '#CBA257',
          proStatValueColor: '#5C441D',
          priceColor: '#CBA257',
          brandIconBg: '#CBA257',
          brandTitle: '#CBA257',
          calendarHeaderStripe: '#A88038',
          calendarBodyBg: '#FAF7F0',
          calendarStar: '#CBA257',
          calendarCheckBadge: '#A88038',
          sessionDateBlockBg: '#F5EEDD',
          sessionDateMonth: '#8C6010',
          sessionDateDay: '#6E4E10',
          sparklesIcon: '#CBA257',
        };
    }
    return isDarkMode
      ? {
        bg: ['#1A1228', '#241536', '#1A1228'],
        surface: '#2A1C40',
        card: '#2C2044',
        cardBorder: '#3F2C61',
        cardInner: '#201533',
        launch: '#32224C',
        title: '#F3E8FF',
        body: '#C4B5D6',
        muted: '#A78BBE',
        iconBg: '#3B2760',
        wave: '#402090',
        wave2: '#2E1064',
        headerIcon: '#EDE4FF',
        accent: '#402090',
        accentDark: '#311870',
        btnGradient: ['#402090', '#5A2D82'],
        pillBg: 'rgba(64, 32, 144, 0.2)',
        inputBg: '#1E1430',
        divider: '#362354',
        isBusiness: false,
        // Persona Theme Tokens
        dashboardGradient: ['#4C1D95', '#6D28D9'],
        dashboardShadow: '#5B21B6',
        dashboardBg: '#6D28D9',
        roleSwitcherBg: '#1F1A2E',
        roleSwitcherBorder: '#3B3355',
        roleSwitcherActiveBg: '#6D28D9',
        roleSwitcherActiveShadow: '#6D28D9',
        proStatValueColor: '#F3E8FF',
        priceColor: '#A78BFA',
        brandIconBg: '#7C3AED',
        brandTitle: '#A78BFA',
        calendarHeaderStripe: '#5B21B6',
        calendarBodyBg: '#201533',
        calendarStar: '#A78BFA',
        calendarCheckBadge: '#5B21B6',
        sessionDateBlockBg: '#32224C',
        sessionDateMonth: '#C4B5D6',
        sessionDateDay: '#F3E8FF',
        sparklesIcon: '#A78BFA',
      }
      : {
        bg: ['#FAF5FE', '#FAF5FE', '#FAF5FE'],
        surface: '#FFFFFF',
        card: '#FFFFFF',
        cardBorder: '#EAE4F5',
        cardInner: '#F8F4FD',
        launch: '#FAF5FE',
        title: '#402090',
        body: '#5B4A7A',
        muted: '#7A7289',
        iconBg: '#F3ECFA',
        wave: '#E0D4F5',
        wave2: '#D0BFF0',
        headerIcon: '#402090',
        accent: '#402090',
        accentDark: '#311870',
        btnGradient: ['#402090', '#402090'],
        pillBg: 'rgba(64, 32, 144, 0.08)',
        inputBg: '#FFFFFF',
        divider: '#EAE4F5',
        isBusiness: false,
        // Persona Theme Tokens
        dashboardGradient: ['#5B21B6', '#7C3AED'],
        dashboardShadow: '#5B21B6',
        dashboardBg: '#6D28D9',
        roleSwitcherBg: '#F1EBFB',
        roleSwitcherBorder: '#E4DCF5',
        roleSwitcherActiveBg: '#6D28D9',
        roleSwitcherActiveShadow: '#6D28D9',
        proStatValueColor: '#3B0764',
        priceColor: '#7C3AED',
        brandIconBg: '#7C3AED',
        brandTitle: '#7C3AED',
        calendarHeaderStripe: '#6D28D9',
        calendarBodyBg: '#FAF5FF',
        calendarStar: '#7C3AED',
        calendarCheckBadge: '#5B21B6',
        sessionDateBlockBg: '#EDE9FE',
        sessionDateMonth: '#6D28D9',
        sessionDateDay: '#5B21B6',
        sparklesIcon: '#7C3AED',
      };
  }, [isDarkMode, effectiveIsBusiness]);

  useEffect(() => {
    if (routeIsBusiness || hookIsBusiness) {
      setIsBusiness(true);
    }
    AsyncStorage.getItem(NOTIFY_KEY).then(value => {
      setNotified(value === 'true');
    });

    (async () => {
      const stored = await AsyncStorage.getItem('profile');
      const resolved = normalizeProfileType(incomingProfileType || stored);
      const isBiz = routeIsBusiness || resolved === 'company';
      setIsBusiness(isBiz);

      const mem = await AsyncStorage.getItem('hasValensMembership');
      if (mem === 'true' || isBiz) {
        setHasMembership(true);
      }
    })();
  }, [incomingProfileType, routeIsBusiness, hookIsBusiness]);

  const handleNotify = useCallback(async () => {
    const next = !notified;
    setNotified(next);
    await AsyncStorage.setItem(NOTIFY_KEY, String(next));
    showToastMessage(
      toast,
      'success',
      next
        ? t('servicesComingSoon.notifySuccess')
        : t('servicesComingSoon.notifyRemoved'),
    );
  }, [notified, t, toast]);

  const handleInfo = useCallback(() => {
    Alert.alert(
      t('servicesComingSoon.header'),
      t('servicesComingSoon.infoMessage'),
    );
  }, [t]);

  const handleActivateServicesPress = useCallback(async (preselectedType = null) => {
    let resolvedType = typeof preselectedType === 'string' ? preselectedType : null;
    if (resolvedType === 'mentorships') resolvedType = 'mentorship';
    else if (resolvedType === 'consultations') resolvedType = 'consultation';
    else if (resolvedType === 'appointments') resolvedType = 'appointment';
    else if (resolvedType === 'events') resolvedType = 'event';
    else if (resolvedType === 'packages') resolvedType = 'monthly_package';

    try {
      const eligRes = await getProviderEligibility();
      if (eligRes && eligRes.success && eligRes.data) {
        setEligibility(eligRes.data);
        if (eligRes.data.upgradeRequired) {
          setShowMembershipModal(true);
          return;
        }
        if (!eligRes.data.isActivated) {
          setShowActivateScreen(true);
          return;
        }
      }
    } catch (_) {}

    if (resolvedType) {
      setEditingServiceId(null);
      setActiveFlow(resolvedType);
    } else {
      setChooseTypeModalVisible(true);
    }
  }, []);

  const handleMembershipLearnMore = useCallback(async () => {
    setShowMembershipModal(false);
    await AsyncStorage.setItem('hasValensMembership', 'true');
    setHasMembership(true);
    showToastMessage(
      toast,
      'success',
      t('serviceActivation.membershipModalDesc', 'Once you sign up for Valens Membership, services will be unlocked and ready to set up.'),
    );
    setCurrentStep(1);
  }, [toast, t]);

  const serviceTypes = useMemo(
    () => [
      {
        id: 'mentorship',
        icon: 'school-outline',
        title: t('serviceActivation.typeMentorship', 'Mentorship'),
        desc: t('serviceActivation.typeMentorshipDesc', 'Offer 1:1 or group mentorship sessions.'),
      },
      {
        id: 'consultation',
        icon: 'chatbubble-ellipses-outline',
        title: t('serviceActivation.typeConsultation', 'Consultation'),
        desc: t('serviceActivation.typeConsultationDesc', 'Provide expert advice and guidance.'),
      },
      {
        id: 'appointment',
        icon: 'calendar-outline',
        title: t('serviceActivation.typeAppointment', 'Appointment'),
        desc: t('serviceActivation.typeAppointmentDesc', 'Let people book time with you.'),
      },
      {
        id: 'event',
        icon: 'ticket-outline',
        title: t('serviceActivation.typeEvent', 'Event'),
        desc: t('serviceActivation.typeEventDesc', 'Create and host events.'),
      },
      {
        id: 'monthly_package',
        icon: 'gift-outline',
        title: t('serviceActivation.typeMonthlyPackage', 'Monthly Package'),
        desc: t('serviceActivation.typeMonthlyPackageDesc', 'Offer ongoing value with recurring payments.'),
      },
    ],
    [t],
  );

  const goalOptions = useMemo(
    () => [
      { id: 'growth', label: t('serviceActivation.goalBusinessGrowth', 'Business Growth'), icon: 'trending-up-outline' },
      { id: 'leadership', label: t('serviceActivation.goalLeadership', 'Leadership'), icon: 'checkmark-circle-outline' },
      { id: 'career', label: t('serviceActivation.goalCareerGrowth', 'Career Growth'), icon: 'briefcase-outline' },
      { id: 'marketing', label: t('serviceActivation.goalMarketing', 'Marketing'), icon: 'megaphone-outline' },
      { id: 'sales', label: t('serviceActivation.goalSales', 'Sales'), icon: 'cash-outline' },
      { id: 'finance', label: t('serviceActivation.goalFinance', 'Finance'), icon: 'pie-chart-outline' },
      { id: 'startup', label: t('serviceActivation.goalStartup', 'Startup'), icon: 'rocket-outline' },
      { id: 'personal', label: t('serviceActivation.goalPersonalDev', 'Personal Development'), icon: 'body-outline' },
      { id: 'mindset', label: t('serviceActivation.goalMindset', 'Mindset'), icon: 'sparkles-outline' },
      { id: 'other', label: t('serviceActivation.goalOther', 'Other (Custom)'), icon: 'ellipsis-horizontal-circle-outline' },
    ],
    [t],
  );

  const toggleGoal = useCallback(goalId => {
    setSelectedGoals(prev =>
      prev.includes(goalId) ? prev.filter(g => g !== goalId) : [...prev, goalId],
    );
  }, []);

  const toggleDaySelection = useCallback(day => {
    setSelectedDays(prev => {
      const exists = prev.includes(day);
      if (exists) {
        return prev.filter(d => d !== day);
      }
      return [...prev, day];
    });

    setDaySchedule(prev => ({
      ...prev,
      [day]: prev[day] || {
        enabled: true,
        slots: [{ id: '1', from: '9:00 AM', to: '5:00 PM' }],
      },
    }));
  }, []);

  const toggleDaySwitch = useCallback(day => {
    setDaySchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day]?.enabled,
      },
    }));
  }, []);

  const addTimeSlot = useCallback(day => {
    setDaySchedule(prev => {
      const existing = prev[day]?.slots || [];
      const newSlot = {
        id: String(Date.now()),
        from: '1:00 PM',
        to: '4:00 PM',
      };
      return {
        ...prev,
        [day]: {
          ...prev[day],
          slots: [...existing, newSlot],
        },
      };
    });
  }, []);

  const removeTimeSlot = useCallback((day, slotId) => {
    setDaySchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: (prev[day]?.slots || []).filter(s => s.id !== slotId),
      },
    }));
  }, []);

  const handleHeaderBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      navigation.goBack();
    }
  }, [currentStep, navigation]);

  const renderProgressBar = (stepNum, totalSteps = 5) => (
    <View style={styles.progressWrap}>
      <Text style={[styles.stepIndicatorText, { color: colors.muted }]}>
        {t('serviceActivation.stepIndicator', { current: stepNum, total: totalSteps })}
      </Text>
      <View style={styles.progressBarTrack}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View
            key={`step-${i}`}
            style={[
              styles.progressBarSegment,
              {
                backgroundColor: i < stepNum ? colors.accent : (isDarkMode ? colors.cardBorder : colors.divider),
              },
            ]}
          />
        ))}
      </View>
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // SUBFLOWS: CONSULTATION, APPOINTMENT, EVENT, MONTHLY PACKAGE, MENTORSHIP
  // ─────────────────────────────────────────────────────────────────────────────
  if (showActivateScreen) {
    return (
      <ActivateServicesScreen
        isBusinessProfile={effectiveIsBusiness}
        onClose={() => setShowActivateScreen(false)}
        onBack={() => setShowActivateScreen(false)}
        onActivated={() => {
          setShowActivateScreen(false);
          fetchEligibility();
          setChooseTypeModalVisible(true);
        }}
      />
    );
  }

  if (activeFlow === 'mentorship') {
    return (
      <LinearGradient colors={colors.bg} style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <MentorshipFlow
            colors={colors}
            isDarkMode={isDarkMode}
            t={t}
            onBack={() => {
              setActiveFlow(null);
              setEditingServiceId(null);
              setCurrentStep(0);
            }}
            onFinish={() => {
              setActiveFlow(null);
              setEditingServiceId(null);
              setCurrentStep(0);
              setMainTab('manage');
            }}
            userProfilePic={userProfilePic}
            initialServiceId={editingServiceId}
          />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (activeFlow === 'consultation') {
    return (
      <LinearGradient colors={colors.bg} style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <ConsultationFlow
            colors={colors}
            isDarkMode={isDarkMode}
            t={t}
            onBack={() => {
              setActiveFlow(null);
              setEditingServiceId(null);
              setCurrentStep(0);
            }}
            onFinish={() => {
              setActiveFlow(null);
              setEditingServiceId(null);
              setCurrentStep(0);
              setMainTab('manage');
            }}
            userProfilePic={userProfilePic}
            initialServiceId={editingServiceId}
          />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (activeFlow === 'appointment') {
    return (
      <LinearGradient colors={colors.bg} style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <AppointmentFlow
            colors={colors}
            isDarkMode={isDarkMode}
            t={t}
            onBack={() => {
              setActiveFlow(null);
              setEditingServiceId(null);
              setCurrentStep(0);
            }}
            onFinish={() => {
              setActiveFlow(null);
              setEditingServiceId(null);
              setCurrentStep(0);
              setMainTab('manage');
            }}
            userProfilePic={userProfilePic}
            initialServiceId={editingServiceId}
          />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (activeFlow === 'event') {
    return (
      <LinearGradient colors={colors.bg} style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <EventFlow
            colors={colors}
            isDarkMode={isDarkMode}
            t={t}
            onBack={() => {
              setActiveFlow(null);
              setEditingServiceId(null);
              setCurrentStep(0);
            }}
            onFinish={() => {
              setActiveFlow(null);
              setEditingServiceId(null);
              setCurrentStep(0);
              setMainTab('manage');
            }}
            userProfilePic={userProfilePic}
            initialServiceId={editingServiceId}
          />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (activeFlow === 'monthly_package') {
    return (
      <LinearGradient colors={colors.bg} style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <MonthlyPackageFlow
            colors={colors}
            isDarkMode={isDarkMode}
            t={t}
            onBack={() => {
              setActiveFlow(null);
              setEditingServiceId(null);
              setCurrentStep(0);
            }}
            onFinish={() => {
              setActiveFlow(null);
              setEditingServiceId(null);
              setCurrentStep(0);
              setMainTab('manage');
            }}
            userProfilePic={userProfilePic}
            initialServiceId={editingServiceId}
          />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MANAGE SERVICES TAB
  // ─────────────────────────────────────────────────────────────────────────────
  if (mainTab === 'manage') {
    return (
      <LinearGradient colors={colors.bg} style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={styles.mockupHeader}>
            <TouchableOpacity
              onPress={() => setMainTab('services')}
              style={styles.mockupHeaderLeft}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.title} />
              <Text style={[styles.brandTitleText, { color: colors.title, marginLeft: 8 }]}>
                {t ? t('services.backToDashboard', 'Services Dashboard') : 'Services Dashboard'}
              </Text>
            </TouchableOpacity>
          </View>
          <ManageServicesView
            colors={colors}
            isDarkMode={isDarkMode}
            t={t}
            initialSide={roleMode}
            userProfilePic={userProfilePic}
            onAddNewService={() => handleActivateServicesPress()}
            onEditService={item => {
              const rawType = (item.type || '').toUpperCase();
              const typeFlowMap = {
                MENTORSHIP: 'mentorship',
                CONSULTATION: 'consultation',
                APPOINTMENT: 'appointment',
                EVENT: 'event',
                MONTHLY_PACKAGE: 'monthly_package',
              };
              setEditingServiceId(item.id);
              setActiveFlow(typeFlowMap[rawType] || 'consultation');
            }}
          />

          {/* Choose Service Type Modal for Manage View */}
          <ChooseServiceTypeModal
            visible={chooseTypeModalVisible}
            onClose={() => setChooseTypeModalVisible(false)}
            onSelectType={type => {
              setChooseTypeModalVisible(false);
              setEditingServiceId(null);
              const typeFlowMap = {
                MENTORSHIP: 'mentorship',
                CONSULTATION: 'consultation',
                APPOINTMENT: 'appointment',
                EVENT: 'event',
                MONTHLY_PACKAGE: 'monthly_package',
              };
              setActiveFlow(typeFlowMap[type] || 'mentorship');
            }}
            isBusinessProfile={effectiveIsBusiness}
          />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // BUYER / VISITOR STOREFRONT VIEW (When opening another user's services)
  // Or previewing own storefront
  // ─────────────────────────────────────────────────────────────────────────────
  if (!isOwnProfile || showStorefrontPreview) {
    const isPreview = isOwnProfile && showStorefrontPreview;
    const providerUser = isPreview
      ? {
          displayName: reduxProfile?.displayName || reduxProfile?.first_name || 'My Storefront',
          userName: reduxProfile?.username || reduxProfile?.userName,
          profile_image: userProfilePic,
          headline: reduxProfile?.headline || reduxProfile?.about,
        }
      : targetUser;

    const providerId = isPreview ? myUserId : targetUserId;

    const providerName =
      providerUser?.displayName ||
      providerUser?.first_name ||
      providerUser?.name ||
      providerUser?.userName ||
      providerUser?.username ||
      'Professional Provider';
    const providerUsername =
      providerUser?.userName || providerUser?.username ? `@${providerUser?.userName || providerUser?.username}` : '';
    const providerAvatar =
      providerUser?.profile_image ||
      providerUser?.profileImg ||
      providerUser?.profilepic ||
      (isPreview ? userProfilePic : null);
    const providerHeadline =
      providerUser?.headline ||
      providerUser?.profession ||
      providerUser?.bio ||
      providerUser?.about ||
      (effectiveIsBusiness ? 'Business Services & Solutions' : 'Personal & Professional Services');

    return (
      <LinearGradient colors={colors.bg} style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          {/* Top Navigation Bar */}
          <View style={styles.mockupHeader}>
            <TouchableOpacity
              onPress={() => {
                if (isPreview) {
                  setShowStorefrontPreview(false);
                } else {
                  navigation.goBack();
                }
              }}
              activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center' }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={24} color={colors.title} />
              <Text style={[styles.brandTitleText, { color: colors.title, marginLeft: 4, fontSize: 16 }]}>
                {isPreview ? 'Exit Preview' : t('common.back', 'Back')}
              </Text>
            </TouchableOpacity>

            <Text
              style={[styles.mockupHeaderCenterTitle, { color: colors.title, maxWidth: width * 0.5 }]}
              numberOfLines={1}
            >
              {isPreview ? 'Storefront Preview' : providerName}
            </Text>

            <TouchableOpacity
              onPress={() => {
                Share.share({
                  message: `Check out ${providerName}'s services on Valens!`,
                });
              }}
              activeOpacity={0.7}
              style={styles.mockupHeaderIconBtn}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="share-outline" size={22} color={colors.title} />
            </TouchableOpacity>
          </View>

          {/* Provider Profile Summary Card */}
          <View
            style={[
              styles.providerHeaderCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <View style={styles.providerAvatarWrap}>
              {providerAvatar ? (
                <Image source={{ uri: providerAvatar }} style={styles.providerAvatarImg} />
              ) : (
                <View style={[styles.providerAvatarFallback, { backgroundColor: colors.pillBg }]}>
                  <Text style={[styles.providerAvatarText, { color: colors.accent }]}>
                    {providerName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.providerInfoWrap}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.providerNameText, { color: colors.title }]} numberOfLines={1}>
                  {providerName}
                </Text>
                {effectiveIsBusiness ? (
                  <Ionicons name="checkmark-seal" size={16} color="#CBA257" style={{ marginLeft: 4 }} />
                ) : (
                  <Ionicons name="shield-checkmark" size={15} color="#7C3AED" style={{ marginLeft: 4 }} />
                )}
                {isPreview && (
                  <View style={{ backgroundColor: colors.pillBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 6 }}>
                    <Text style={{ fontSize: 10, color: colors.accent, fontWeight: '700' }}>PREVIEW</Text>
                  </View>
                )}
              </View>
              {Boolean(providerUsername) && (
                <Text style={[styles.providerUsernameText, { color: colors.muted }]}>
                  {providerUsername}
                </Text>
              )}
              {Boolean(providerHeadline) && (
                <Text style={[styles.providerHeadlineText, { color: colors.body }]} numberOfLines={2}>
                  {providerHeadline}
                </Text>
              )}
            </View>
          </View>

          {/* Public Services Tab for this provider */}
          <View style={{ flex: 1 }}>
            {providerId ? (
              <ProfileServicesTab
                userId={providerId}
                isOwnProfile={isPreview}
                isBusinessProfile={effectiveIsBusiness}
                isDarkMode={isDarkMode}
                onNavigateToManage={isPreview ? () => setShowStorefrontPreview(false) : null}
              />
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                <Ionicons name="alert-circle-outline" size={48} color={colors.muted} />
                <Text style={{ color: colors.title, fontSize: 16, fontWeight: '700', marginTop: 12 }}>
                  Provider Not Found
                </Text>
                <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 6 }}>
                  Unable to load services for this user profile.
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 0: SERVICES DASHBOARD (PROFESSIONAL & CLIENT MOCKUP VIEWS)
  // ─────────────────────────────────────────────────────────────────────────────
  if (currentStep === 0) {
    const displayedProServices =
      storedServices.length > 0
        ? [
            ...storedServices.map(s => ({
              id: s.id || `stored_${Date.now()}`,
              title: s.title || s.type || 'Custom Service',
              price: s.price ? `$${s.price} / month` : '$199.00 / month',
              status: 'Active',
              clientsCount: '1 Client',
              image:
                s.image ||
                userProfilePic ||
                'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
            })),
            ...MOCKUP_PRO_SERVICES,
          ]
        : MOCKUP_PRO_SERVICES;

    return (
      <LinearGradient colors={colors.bg} style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          {/* Header matching Mockup: Left brand icon + VALENS, Center Services, Right Bell + Chat */}
          <View style={styles.mockupHeader}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              style={styles.mockupHeaderLeft}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={22} color={colors.title} style={{ marginRight: 6 }} />
              <View style={[styles.brandIconBox, { backgroundColor: colors.brandIconBg }]}>
                <Ionicons name="checkmark-done" size={14} color="#FFFFFF" />
              </View>
              <Text style={[styles.brandTitleText, { color: colors.brandTitle }]}>VALENS</Text>
            </TouchableOpacity>

            <Text style={[styles.mockupHeaderCenterTitle, { color: colors.title }]}>
              {t('valensServices.comingSoon', 'Services')}
            </Text>

            <View style={styles.mockupHeaderRight}>
              <TouchableOpacity
                onPress={() => setShowStorefrontPreview(true)}
                activeOpacity={0.7}
                style={styles.mockupHeaderIconBtn}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="eye-outline" size={22} color={colors.title} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('Notification')}
                activeOpacity={0.7}
                style={styles.mockupHeaderIconBtn}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="notifications-outline" size={22} color={colors.title} />
                <View style={styles.headerBadgeDot}>
                  <Text style={styles.headerBadgeText}>6</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('Chat')}
                activeOpacity={0.7}
                style={styles.mockupHeaderIconBtn}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="chatbubble-outline" size={21} color={colors.title} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Segmented Role Switcher: [ I'm Professional ] | [ I'm Client ] */}
          <View style={[styles.roleSwitcherContainer, { backgroundColor: colors.roleSwitcherBg, borderColor: colors.roleSwitcherBorder }]}>
            <TouchableOpacity
              onPress={() => setRoleMode('professional')}
              activeOpacity={0.85}
              style={[
                styles.roleSwitcherBtn,
                roleMode === 'professional' && [
                  styles.roleSwitcherBtnActive,
                  { backgroundColor: colors.roleSwitcherActiveBg, shadowColor: colors.roleSwitcherActiveShadow },
                ],
              ]}
            >
              <Text
                style={[
                  styles.roleSwitcherText,
                  roleMode === 'professional'
                    ? styles.roleSwitcherTextActive
                    : { color: isDarkMode ? '#9CA3AF' : '#6B7280' },
                ]}
              >
                {t('services.imProfessional', "I'm Professional")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setRoleMode('client')}
              activeOpacity={0.85}
              style={[
                styles.roleSwitcherBtn,
                roleMode === 'client' && [
                  styles.roleSwitcherBtnActive,
                  { backgroundColor: colors.roleSwitcherActiveBg, shadowColor: colors.roleSwitcherActiveShadow },
                ],
              ]}
            >
              <Text
                style={[
                  styles.roleSwitcherText,
                  roleMode === 'client'
                    ? styles.roleSwitcherTextActive
                    : { color: isDarkMode ? '#9CA3AF' : '#6B7280' },
                ]}
              >
                {t('services.imClient', "I'm Client")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Eligibility Warning Banners */}
          {eligibility?.missing?.includes('KYC_REQUIRED') && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#F59E0B' }}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#D97706" style={{ marginRight: 8 }} />
              <Text style={{ flex: 1, color: '#92400E', fontSize: 12, fontWeight: '600' }}>
                Complete verification to publish services (Drafts still work).
              </Text>
            </View>
          )}
          {eligibility?.missing?.includes('PAYOUT_ACCOUNT_REQUIRED') && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#F59E0B' }}>
              <Ionicons name="card-outline" size={18} color="#D97706" style={{ marginRight: 8 }} />
              <Text style={{ flex: 1, color: '#92400E', fontSize: 12, fontWeight: '600' }}>
                Connect your payout account to publish services (Drafts still work).
              </Text>
            </View>
          )}
          {Boolean(eligibility?.membershipGraceEndsAt) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#EF4444' }}>
              <Ionicons name="warning-outline" size={18} color="#DC2626" style={{ marginRight: 8 }} />
              <Text style={{ flex: 1, color: '#B91C1C', fontSize: 12, fontWeight: '600' }}>
                Renew your membership soon or your services will be paused.
              </Text>
            </View>
          )}

{/* MAIN SCROLLABLE CONTENT */}
          <ScrollView
            style={styles.flex}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.mockupScrollContent}
          >
            {roleMode === 'professional' ? (
              /* ═══════════════════════════════════════════════════════════
                 PROFESSIONAL VIEW
                 ═══════════════════════════════════════════════════════════ */
              <>
                {/* Professional Dashboard Card */}
                <View style={[styles.proDashboardCardWrapper, { shadowColor: colors.dashboardShadow }]}>
                  <View style={[styles.proDashboardCard, { backgroundColor: colors.dashboardBg }]}>
                    <LinearGradient
                      colors={colors.dashboardGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.proCardHeaderRow}>
                      <Text style={styles.proCardTitle}>
                        {t('services.proDashboard', 'Professional Dashboard')}
                      </Text>
                      <View style={styles.proBadgePill}>
                        <Text style={styles.proBadgeText}>Pro</Text>
                      </View>
                    </View>
                    <Text style={styles.proCardSubtitle}>
                      {t('services.proSubtitle', 'Manage your services, packages and clients.')}
                    </Text>

                    {/* 4 Stat Tiles Row */}
                    <View style={styles.proStatTilesRow}>
                      <View style={styles.proStatTile}>
                        <Text style={[styles.proStatValue, { color: colors.proStatValueColor }]}>12</Text>
                        <Text style={styles.proStatLabel} numberOfLines={2}>
                          {t('services.activeServices', 'Active Services')}
                        </Text>
                      </View>
                      <View style={styles.proStatTile}>
                        <Text style={[styles.proStatValue, { color: colors.proStatValueColor }]}>248</Text>
                        <Text style={styles.proStatLabel} numberOfLines={2}>
                          {t('services.totalClients', 'Total Clients')}
                        </Text>
                      </View>
                      <View style={styles.proStatTile}>
                        <Text style={[styles.proStatValue, { color: colors.proStatValueColor }]}>$8,450</Text>
                        <Text style={styles.proStatLabel} numberOfLines={2}>
                          {t('services.monthlyRevenue', 'Monthly Revenue')}
                        </Text>
                      </View>
                      <View style={styles.proStatTile}>
                        <Text style={[styles.proStatValue, { color: colors.proStatValueColor }]}>32</Text>
                        <Text style={styles.proStatLabel} numberOfLines={2}>
                          {t('services.upcomingSessions', 'Upcoming Sessions')}
                        </Text>
                      </View>
                    </View>

                    {/* Create New Service or Package Button */}
                    <TouchableOpacity
                      onPress={() => handleActivateServicesPress()}
                      activeOpacity={0.85}
                      style={styles.proCreateBtn}
                    >
                      <Ionicons name="add" size={19} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.proCreateBtnText}>
                        {t('services.createNewService', 'Create New Service or Package')}
                      </Text>
                    </TouchableOpacity>

                    {/* Manage All Services Button */}
                    <TouchableOpacity
                      onPress={() => setMainTab('manage')}
                      activeOpacity={0.85}
                      style={[styles.proCreateBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#FFFFFF', marginTop: 8 }]}
                    >
                      <Ionicons name="list-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.proCreateBtnText}>
                        Manage All Services
                      </Text>
                    </TouchableOpacity>

                    {/* Preview Public Storefront Button */}
                    <TouchableOpacity
                      onPress={() => setShowStorefrontPreview(true)}
                      activeOpacity={0.85}
                      style={[styles.proCreateBtn, { backgroundColor: 'rgba(255,255,255,0.18)', marginTop: 8 }]}
                    >
                      <Ionicons name="eye-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.proCreateBtnText}>
                        Preview Public Storefront
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Overview Section */}
                <View style={styles.mockupSectionHeaderRow}>
                  <Text style={[styles.sectionHeading, { color: colors.title }]}>
                    {t('services.overview', 'Overview')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setOverviewMonthDropdown(prev => !prev)}
                    activeOpacity={0.7}
                    style={styles.monthDropdownBtn}
                  >
                    <Text style={[styles.monthDropdownText, { color: colors.priceColor }]}>{selectedMonth}</Text>
                    <Ionicons name="chevron-down" size={14} color={colors.priceColor} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </View>

                {/* 4 Metric Cards in 2x2 Grid */}
                <View style={styles.proMetricCardsGrid}>
                  {/* Revenue */}
                  <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                    <Text style={[styles.metricLabel, { color: colors.muted }]}>
                      {t('services.revenue', 'Revenue')}
                    </Text>
                    <Text style={[styles.metricMainValue, { color: colors.title }]}>$8,450</Text>
                    <View style={styles.metricTrendRow}>
                      <Ionicons name="arrow-up" size={13} color="#10B981" />
                      <Text style={styles.metricTrendGreen}>18% vs last month</Text>
                    </View>
                  </View>

                  {/* New Clients */}
                  <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                    <Text style={[styles.metricLabel, { color: colors.muted }]}>
                      {t('services.newClients', 'New Clients')}
                    </Text>
                    <Text style={[styles.metricMainValue, { color: colors.title }]}>28</Text>
                    <View style={styles.metricTrendRow}>
                      <Ionicons name="arrow-up" size={13} color="#10B981" />
                      <Text style={styles.metricTrendGreen}>12% vs last month</Text>
                    </View>
                  </View>

                  {/* Sessions */}
                  <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                    <Text style={[styles.metricLabel, { color: colors.muted }]}>
                      {t('services.sessions', 'Sessions')}
                    </Text>
                    <Text style={[styles.metricMainValue, { color: colors.title }]}>32</Text>
                    <View style={styles.metricTrendRow}>
                      <Ionicons name="arrow-up" size={13} color="#10B981" />
                      <Text style={styles.metricTrendGreen}>8% vs last month</Text>
                    </View>
                  </View>

                  {/* Reviews */}
                  <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                    <Text style={[styles.metricLabel, { color: colors.muted }]}>
                      {t('services.reviews', 'Reviews')}
                    </Text>
                    <Text style={[styles.metricMainValue, { color: colors.title }]}>4.9</Text>
                    <View style={styles.metricTrendRow}>
                      <Ionicons name="star" size={13} color="#F59E0B" />
                      <Text style={styles.metricTrendAmber}>from 86 clients</Text>
                    </View>
                  </View>
                </View>

                {/* Your Services Section */}
                <View style={styles.mockupSectionHeaderRow}>
                  <Text style={[styles.sectionHeading, { color: colors.title }]}>
                    {t('services.yourServices', 'Your Services')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      showToastMessage('All 12 services loaded');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewAllText}>{t('services.viewAll', 'View all')}</Text>
                  </TouchableOpacity>
                </View>

                {/* Services List */}
                <View style={styles.servicesListWrap}>
                  {displayedProServices.map((svc, idx) => (
                    <View
                      key={svc.id || idx}
                      style={[
                        styles.serviceItemCard,
                        { backgroundColor: colors.surface, borderColor: colors.cardBorder },
                      ]}
                    >
                      <Image
                        source={{ uri: svc.image }}
                        style={styles.serviceItemThumbnail}
                        resizeMode="cover"
                      />
                      <View style={styles.serviceItemDetails}>
                        <Text style={[styles.serviceItemTitle, { color: colors.title }]} numberOfLines={1}>
                          {svc.title}
                        </Text>
                        <View style={styles.servicePriceBadgeRow}>
                          <Text style={[styles.serviceItemPrice, { color: colors.priceColor }]}>{svc.price}</Text>
                          <View style={styles.activePillBadge}>
                            <Text style={styles.activePillText}>{svc.status || 'Active'}</Text>
                          </View>
                        </View>
                        <Text style={[styles.serviceItemMeta, { color: colors.muted }]}>
                          {svc.clientsCount}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => setSelectedServiceAction(svc)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={styles.serviceActionMenuBtn}
                      >
                        <Ionicons name="ellipsis-horizontal" size={20} color={colors.title} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              /* ═══════════════════════════════════════════════════════════
                 CLIENT VIEW
                 ═══════════════════════════════════════════════════════════ */
              <>
                {/* Client Dashboard Banner with 3D Calendar illustration */}
                <View style={[styles.clientDashboardCardWrapper, { shadowColor: colors.dashboardShadow }]}>
                  <View style={[styles.clientDashboardCard, { backgroundColor: colors.dashboardBg }]}>
                    <LinearGradient
                      colors={colors.dashboardGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.clientBannerCopy}>
                      <Text style={styles.clientCardTitle}>
                        {t('services.clientDashboard', 'Client Dashboard')}
                      </Text>
                      <Text style={styles.clientCardSubtitle}>
                        {t(
                          'services.clientSubtitle',
                          'Manage your bookings, packages and favorite services.',
                        )}
                      </Text>
                    </View>

                    {/* Calendar 3D Illustration */}
                    <View style={styles.calendarIllustrationBox}>
                      <View style={styles.calendarSheet}>
                        <View style={[styles.calendarHeaderStripe, { backgroundColor: colors.calendarHeaderStripe }]}>
                          <View style={styles.calendarRing} />
                          <View style={styles.calendarRing} />
                        </View>
                        <View style={[styles.calendarBody, { backgroundColor: colors.calendarBodyBg }]}>
                          <Ionicons name="star" size={26} color={colors.calendarStar} />
                        </View>
                      </View>
                      <View style={[styles.calendarCheckBadge, { backgroundColor: colors.calendarCheckBadge }]}>
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      </View>
                    </View>
                  </View>
                </View>

                {/* My Packages Section */}
                <View style={styles.mockupSectionHeaderRow}>
                  <Text style={[styles.sectionHeading, { color: colors.title }]}>
                    {t('services.myPackages', 'My Packages')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => showToastMessage('Showing all packages')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.viewAllText, { color: colors.priceColor }]}>{t('services.viewAll', 'View all')}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.servicesListWrap}>
                  {MOCKUP_CLIENT_PACKAGES.map((pkg, idx) => (
                    <TouchableOpacity
                      key={pkg.id || idx}
                      activeOpacity={0.85}
                      onPress={() => {
                        Alert.alert(pkg.title, `Package details:\n${pkg.price}\n${pkg.renewsText}`);
                      }}
                      style={[
                        styles.serviceItemCard,
                        { backgroundColor: colors.surface, borderColor: colors.cardBorder },
                      ]}
                    >
                      <Image
                        source={{ uri: pkg.image }}
                        style={styles.serviceItemThumbnail}
                        resizeMode="cover"
                      />
                      <View style={styles.serviceItemDetails}>
                        <Text style={[styles.serviceItemTitle, { color: colors.title }]} numberOfLines={1}>
                          {pkg.title}
                        </Text>
                        <View style={styles.servicePriceBadgeRow}>
                          <Text style={[styles.serviceItemPrice, { color: colors.priceColor }]}>{pkg.price}</Text>
                          <View style={styles.activePillBadge}>
                            <Text style={styles.activePillText}>{pkg.status || 'Active'}</Text>
                          </View>
                        </View>
                        <Text style={[styles.serviceItemMeta, { color: colors.muted }]}>
                          {pkg.renewsText}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Upcoming Sessions Section */}
                <View style={styles.mockupSectionHeaderRow}>
                  <Text style={[styles.sectionHeading, { color: colors.title }]}>
                    {t('services.upcomingSessionsTitle', 'Upcoming Sessions')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => showToastMessage('Showing all upcoming sessions')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.viewAllText, { color: colors.priceColor }]}>{t('services.viewAll', 'View all')}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.servicesListWrap}>
                  {MOCKUP_UPCOMING_SESSIONS.map((sess, idx) => (
                    <TouchableOpacity
                      key={sess.id || idx}
                      activeOpacity={0.85}
                      onPress={() => {
                        Alert.alert(sess.title, `${sess.time}\n${sess.provider}`);
                      }}
                      style={[
                        styles.sessionItemCard,
                        { backgroundColor: colors.surface, borderColor: colors.cardBorder },
                      ]}
                    >
                      {/* Date block on the left */}
                      <View style={[styles.sessionDateBlock, { backgroundColor: colors.sessionDateBlockBg }]}>
                        <Text style={[styles.sessionDateMonth, { color: colors.sessionDateMonth }]}>{sess.month}</Text>
                        <Text style={[styles.sessionDateDay, { color: colors.sessionDateDay }]}>{sess.day}</Text>
                      </View>

                      <View style={styles.sessionDetails}>
                        <Text style={[styles.sessionTitle, { color: colors.title }]} numberOfLines={1}>
                          {sess.title}
                        </Text>
                        <Text style={[styles.sessionTime, { color: colors.muted }]}>
                          {sess.time}
                        </Text>
                        <View style={styles.sessionHostRow}>
                          {sess.avatar ? (
                            <Image source={{ uri: sess.avatar }} style={styles.sessionHostAvatar} />
                          ) : (
                            <View style={[styles.sessionHostIconBadge, { backgroundColor: colors.sessionDateBlockBg }]}>
                              <Ionicons name="sparkles" size={11} color={colors.sparklesIcon} />
                            </View>
                          )}
                          <Text style={[styles.sessionHostName, { color: colors.title }]}>
                            {sess.provider}
                          </Text>
                        </View>
                      </View>

                      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Recommended for You Section */}
                <View style={styles.mockupSectionHeaderRow}>
                  <Text style={[styles.sectionHeading, { color: colors.title }]}>
                    {t('services.recommendedForYou', 'Recommended for You')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => showToastMessage('Showing all recommendations')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.viewAllText, { color: colors.priceColor }]}>{t('services.viewAll', 'View all')}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.recommendedGridRow}>
                  {MOCKUP_RECOMMENDED.map((rec, idx) => (
                    <TouchableOpacity
                      key={rec.id || idx}
                      activeOpacity={0.85}
                      onPress={() => {
                        Alert.alert(rec.title, `${rec.price}\nRating: ${rec.rating}`);
                      }}
                      style={[
                        styles.recommendedCard,
                        { backgroundColor: colors.surface, borderColor: colors.cardBorder },
                      ]}
                    >
                      <Image
                        source={{ uri: rec.image }}
                        style={styles.recommendedThumbnail}
                        resizeMode="cover"
                      />
                      <View style={styles.recommendedContent}>
                        <Text style={[styles.recommendedTitle, { color: colors.title }]} numberOfLines={2}>
                          {rec.title}
                        </Text>
                        <Text style={[styles.recommendedPrice, { color: colors.priceColor }]}>{rec.price}</Text>
                        <View style={styles.recommendedRatingRow}>
                          <Ionicons name="star" size={12} color="#F59E0B" />
                          <Text style={[styles.recommendedRatingText, { color: colors.muted }]}>
                            {rec.rating}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Service Action Menu Modal */}
          {selectedServiceAction && (
            <Modal
              visible={!!selectedServiceAction}
              transparent
              animationType="fade"
              onRequestClose={() => setSelectedServiceAction(null)}
            >
              <TouchableOpacity
                style={styles.actionModalOverlay}
                activeOpacity={1}
                onPress={() => setSelectedServiceAction(null)}
              >
                <View style={[styles.actionModalContent, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.actionModalTitle, { color: colors.title }]}>
                    {selectedServiceAction.title}
                  </Text>
                  <Text style={[styles.actionModalSub, { color: colors.muted }]}>
                    {selectedServiceAction.price} • {selectedServiceAction.clientsCount || 'Active'}
                  </Text>

                  <TouchableOpacity
                    style={styles.actionModalOption}
                    onPress={() => {
                      const item = selectedServiceAction;
                      setSelectedServiceAction(null);
                      Alert.alert('Service Details', `${item.title}\nPrice: ${item.price}`);
                    }}
                  >
                    <Ionicons name="eye-outline" size={20} color={colors.accent} />
                    <Text style={[styles.actionModalOptionText, { color: colors.title }]}>View Details</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionModalOption}
                    onPress={() => {
                      setSelectedServiceAction(null);
                      setCurrentStep(1);
                    }}
                  >
                    <Ionicons name="create-outline" size={20} color={colors.accent} />
                    <Text style={[styles.actionModalOptionText, { color: colors.title }]}>Edit Service</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionModalOption}
                    onPress={() => {
                      const shareTitle = selectedServiceAction.title;
                      setSelectedServiceAction(null);
                      Share.share({
                        message: `Check out my service on Valens: ${shareTitle}!`,
                      });
                    }}
                  >
                    <Ionicons name="share-social-outline" size={20} color={colors.accent} />
                    <Text style={[styles.actionModalOptionText, { color: colors.title }]}>Share Service</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionModalOption, { borderBottomWidth: 0 }]}
                    onPress={() => {
                      setSelectedServiceAction(null);
                      showToastMessage('Service status updated');
                    }}
                  >
                    <Ionicons name="pause-circle-outline" size={20} color="#EF4444" />
                    <Text style={[styles.actionModalOptionText, { color: '#EF4444' }]}>Pause Service</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionModalCancelBtn}
                    onPress={() => setSelectedServiceAction(null)}
                  >
                    <Text style={styles.actionModalCancelText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Modal>
          )}

          {/* Month selector dropdown modal */}
          {overviewMonthDropdown && (
            <Modal
              visible={overviewMonthDropdown}
              transparent
              animationType="fade"
              onRequestClose={() => setOverviewMonthDropdown(false)}
            >
              <TouchableOpacity
                style={styles.actionModalOverlay}
                activeOpacity={1}
                onPress={() => setOverviewMonthDropdown(false)}
              >
                <View style={[styles.actionModalContent, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.actionModalTitle, { color: colors.title, marginBottom: 12 }]}>
                    Select Period
                  </Text>
                  {['This Month', 'Last Month', 'Last 3 Months', 'This Year'].map(m => (
                    <TouchableOpacity
                      key={m}
                      style={styles.actionModalOption}
                      onPress={() => {
                        setSelectedMonth(m);
                        setOverviewMonthDropdown(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.actionModalOptionText,
                          { color: selectedMonth === m ? colors.accent : colors.title, fontWeight: selectedMonth === m ? '700' : '500' },
                        ]}
                      >
                        {m}
                      </Text>
                      {selectedMonth === m && <Ionicons name="checkmark" size={18} color={colors.accent} />}
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            </Modal>
          )}

          {/* Valens Membership Required Modal */}
          <RegularSubscriptionPrompt
            visible={showMembershipModal}
            isBusinessProfile={isBusiness}
            onLater={() => setShowMembershipModal(false)}
            onLearnMore={handleMembershipLearnMore}
          />

          {/* Choose Service Type Modal */}
          <ChooseServiceTypeModal
            visible={chooseTypeModalVisible}
            onClose={() => setChooseTypeModalVisible(false)}
            onSelectType={type => {
              setChooseTypeModalVisible(false);
              setEditingServiceId(null);
              const typeFlowMap = {
                MENTORSHIP: 'mentorship',
                CONSULTATION: 'consultation',
                APPOINTMENT: 'appointment',
                EVENT: 'event',
                MONTHLY_PACKAGE: 'monthly_package',
              };
              setActiveFlow(typeFlowMap[type] || 'mentorship');
            }}
            isBusinessProfile={effectiveIsBusiness}
          />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: CHOOSE SERVICE TYPE
  // ─────────────────────────────────────────────────────────────────────────────
  if (currentStep === 1) {
    return (
      <LinearGradient colors={colors.bg} style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={styles.topHeader}>
            <TouchableOpacity
              onPress={handleHeaderBack}
              style={[styles.headerBtn, { backgroundColor: colors.surface }]}
            >
              <Ionicons name="chevron-back" size={22} color={colors.title} />
            </TouchableOpacity>
            <Text style={[styles.flowHeaderTitle, { color: colors.title }]}>
              {t('serviceActivation.step1Header', 'Choose Service Type')}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.flowContent}>
            <Text style={[styles.stepQuestion, { color: colors.title }]}>
              {t('serviceActivation.step1Title', 'What would you like to offer?')}
            </Text>

            <View style={styles.serviceCardsContainer}>
              {serviceTypes.map(st => {
                const isSelected = selectedServiceType === st.id;
                return (
                  <TouchableOpacity
                    key={st.id}
                    onPress={() => setSelectedServiceType(st.id)}
                    activeOpacity={0.8}
                    style={[
                      styles.serviceOptionCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: isSelected ? colors.accent : colors.cardBorder,
                      },
                    ]}
                  >
                    <View style={[styles.serviceOptionIconWrap, { backgroundColor: colors.pillBg }]}>
                      <Ionicons name={st.icon} size={22} color={colors.accent} />
                    </View>
                    <View style={styles.serviceOptionTextWrap}>
                      <Text style={[styles.serviceOptionTitle, { color: colors.title }]}>
                        {st.title}
                      </Text>
                      <Text style={[styles.serviceOptionDesc, { color: colors.muted }]}>
                        {st.desc}
                      </Text>
                    </View>
                    {isSelected ? (
                      <View style={[styles.selectedCircle, { backgroundColor: colors.accent }]}>
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      </View>
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={[styles.bottomBar, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              onPress={() => {
                if (selectedServiceType === 'mentorship') {
                  setCurrentStep(2);
                } else {
                  setActiveFlow(selectedServiceType);
                }
              }}
              activeOpacity={0.85}
              style={styles.primaryContinueBtn}
            >
              <LinearGradient
                colors={colors.btnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryContinueGradient}
              >
                <Text style={styles.primaryContinueText}>
                  {t('serviceActivation.continue', 'Continue')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: PROGRAM DETAILS & GOALS
  // ─────────────────────────────────────────────────────────────────────────────
  if (currentStep === 2) {
    return (
      <LinearGradient colors={colors.bg} style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={styles.topHeader}>
            <TouchableOpacity
              onPress={handleHeaderBack}
              style={[styles.headerBtn, { backgroundColor: colors.surface }]}
            >
              <Ionicons name="chevron-back" size={22} color={colors.title} />
            </TouchableOpacity>
            <Text style={[styles.flowHeaderTitle, { color: colors.title }]}>
              {t('serviceActivation.step2Header', 'Program Details')}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.flowContent}>
            {renderProgressBar(2, 5)}

            <Text style={[styles.fieldSectionTitle, { color: colors.title }]}>
              {t('serviceActivation.durationTitle', 'Mentorship Duration')}
            </Text>
            <View style={styles.durationCardRow}>
              <TouchableOpacity
                onPress={() => setDurationStructure('one')}
                style={[
                  styles.durationCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: durationStructure === 'one' ? colors.accent : colors.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.durationCardTitle, { color: colors.title }]}>
                  {t('serviceActivation.durationOneSession', 'One Session')}
                </Text>
                <Text style={[styles.durationCardSub, { color: colors.muted }]}>
                  {t('serviceActivation.durationOneSessionSub', 'Single 30, 60 or 90 min session')}
                </Text>
                <View style={[styles.radioCircle, { borderColor: colors.cardBorder }, durationStructure === 'one' && { borderColor: colors.accent, backgroundColor: colors.accent }]}>
                  {durationStructure === 'one' && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setDurationStructure('short')}
                style={[
                  styles.durationCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: durationStructure === 'short' ? colors.accent : colors.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.durationCardTitle, { color: colors.title }]}>
                  {t('serviceActivation.durationShort', 'Short Program')}
                </Text>
                <Text style={[styles.durationCardSub, { color: colors.muted }]}>
                  {t('serviceActivation.durationShortSub', '2 weeks or 1 month')}
                </Text>
                <View style={[styles.radioCircle, { borderColor: colors.cardBorder }, durationStructure === 'short' && { borderColor: colors.accent, backgroundColor: colors.accent }]}>
                  {durationStructure === 'short' && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setDurationStructure('long')}
                style={[
                  styles.durationCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: durationStructure === 'long' ? colors.accent : colors.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.durationCardTitle, { color: colors.title }]}>
                  {t('serviceActivation.durationLong', 'Long-Term Program')}
                </Text>
                <Text style={[styles.durationCardSub, { color: colors.muted }]}>
                  {t('serviceActivation.durationLongSub', '3, 6 or 12 months or custom')}
                </Text>
                <View style={[styles.radioCircle, { borderColor: colors.cardBorder }, durationStructure === 'long' && { borderColor: colors.accent, backgroundColor: colors.accent }]}>
                  {durationStructure === 'long' && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                </View>
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldSectionTitle, { color: colors.title, marginTop: 18 }]}>
              {t('serviceActivation.selectLength', 'Select Program Length')}
            </Text>
            <View style={[styles.pickerBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.pickerBoxText, { color: colors.title }]}>{programLength}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.muted} />
            </View>

            <Text style={[styles.fieldSectionTitle, { color: colors.title, marginTop: 22 }]}>
              {t('serviceActivation.goalsTitle', 'Mentorship Goals (Select all that apply)')}
            </Text>
            <View style={styles.goalChipsWrap}>
              {goalOptions.map(g => {
                const isSelected = selectedGoals.includes(g.id);
                return (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => toggleGoal(g.id)}
                    activeOpacity={0.75}
                    style={[
                      styles.goalChip,
                      {
                        backgroundColor: isSelected ? colors.pillBg : colors.card,
                        borderColor: isSelected ? colors.accent : colors.cardBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : g.icon}
                      size={15}
                      color={isSelected ? colors.accent : colors.muted}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.goalChipText,
                        { color: isSelected ? colors.accent : colors.title, fontWeight: isSelected ? '700' : '500' },
                      ]}
                    >
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={[styles.bottomBar, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              onPress={() => setCurrentStep(3)}
              activeOpacity={0.85}
              style={styles.primaryContinueBtn}
            >
              <LinearGradient
                colors={colors.btnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryContinueGradient}
              >
                <Text style={styles.primaryContinueText}>
                  {t('serviceActivation.continue', 'Continue')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: DETAILS, IN-PERSON ADDRESS & PHONE, PRICE
  // ─────────────────────────────────────────────────────────────────────────────
  if (currentStep === 3) {
    return (
      <LinearGradient colors={colors.bg} style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={styles.topHeader}>
            <TouchableOpacity
              onPress={handleHeaderBack}
              style={[styles.headerBtn, { backgroundColor: colors.surface }]}
            >
              <Ionicons name="chevron-back" size={22} color={colors.title} />
            </TouchableOpacity>
            <Text style={[styles.flowHeaderTitle, { color: colors.title }]}>
              {t('serviceActivation.step3Header', 'Mentorship Details')}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.flowContent}>
            {renderProgressBar(3, 5)}

            <Text style={[styles.fieldSectionTitle, { color: colors.title }]}>
              {t('serviceActivation.sessionDuration', 'Duration')}
            </Text>
            <View style={[styles.pickerBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.pickerBoxText, { color: colors.title }]}>{sessionDuration}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.muted} />
            </View>

            <Text style={[styles.fieldSectionTitle, { color: colors.title, marginTop: 18 }]}>
              {t('serviceActivation.formatTitle', 'Format')}
            </Text>
            <View style={styles.formatToggleRow}>
              <TouchableOpacity
                onPress={() => setServiceFormat('online')}
                style={[
                  styles.formatToggleBtn,
                  serviceFormat === 'online'
                    ? [styles.formatToggleActive, { backgroundColor: colors.accentDark }]
                    : [styles.formatToggleInactive, { backgroundColor: colors.card, borderColor: colors.cardBorder }],
                ]}
              >
                <Ionicons
                  name="videocam-outline"
                  size={16}
                  color={serviceFormat === 'online' ? '#FFFFFF' : colors.muted}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.formatToggleText, { color: serviceFormat === 'online' ? '#FFFFFF' : colors.body }]}>
                  {t('serviceActivation.formatOnline', 'Online')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setServiceFormat('in_person')}
                style={[
                  styles.formatToggleBtn,
                  serviceFormat === 'in_person'
                    ? [styles.formatToggleActive, { backgroundColor: colors.accentDark }]
                    : [styles.formatToggleInactive, { backgroundColor: colors.card, borderColor: colors.cardBorder }],
                ]}
              >
                <Ionicons
                  name="location-outline"
                  size={16}
                  color={serviceFormat === 'in_person' ? '#FFFFFF' : colors.muted}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.formatToggleText, { color: serviceFormat === 'in_person' ? '#FFFFFF' : colors.body }]}>
                  {t('serviceActivation.formatInPerson', 'In-person')}
                </Text>
              </TouchableOpacity>
            </View>

            {serviceFormat === 'in_person' && (
              <View style={[styles.inPersonBox, { backgroundColor: colors.cardInner, borderColor: colors.cardBorder }]}>
                <View style={styles.inPersonHeaderRow}>
                  <Ionicons name="business-outline" size={18} color={colors.accent} />
                  <Text style={[styles.inPersonHeading, { color: colors.title }]}>
                    {t('serviceActivation.officeAddress', 'Office Address')} &amp; {t('serviceActivation.phoneNumber', 'Phone Number')}
                  </Text>
                </View>

                <Text style={[styles.subFieldLabel, { color: colors.muted }]}>
                  {t('serviceActivation.officeAddress', 'Office Address')}
                </Text>
                <TextInput
                  value={officeAddress}
                  onChangeText={setOfficeAddress}
                  placeholder={t('serviceActivation.officeAddressPlaceholder', 'Enter your office or studio address')}
                  placeholderTextColor={colors.muted}
                  style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.title }]}
                />

                <Text style={[styles.subFieldLabel, { color: colors.muted, marginTop: 10 }]}>
                  {t('serviceActivation.phoneNumber', 'Phone Number')}
                </Text>
                <TextInput
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  placeholder={t('serviceActivation.phoneNumberPlaceholder', '+1 (555) 000-0000')}
                  placeholderTextColor={colors.muted}
                  style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.title }]}
                />

                <Text style={[styles.inPersonHint, { color: colors.muted }]}>
                  {t(
                    'serviceActivation.officeAddressHint',
                    'Clients will see your office address on the booking confirmation after payment.',
                  )}
                </Text>
              </View>
            )}

            <Text style={[styles.fieldSectionTitle, { color: colors.title, marginTop: 18 }]}>
              {t('serviceActivation.priceTitle', 'Price')}
            </Text>
            <View style={[styles.priceInputRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.priceCurrency, { color: colors.muted }]}>USD $</Text>
              <TextInput
                value={priceAmount}
                onChangeText={setPriceAmount}
                keyboardType="decimal-pad"
                style={[styles.priceInput, { color: colors.title }]}
              />
            </View>

            <Text style={[styles.fieldSectionTitle, { color: colors.title, marginTop: 18 }]}>
              {t('serviceActivation.availabilityTitle', 'Availability')}
            </Text>
            <TouchableOpacity
              onPress={() => setCurrentStep(4)}
              style={[styles.pickerBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            >
              <Text style={[styles.pickerBoxText, { color: colors.body }]}>
                {selectedDays.length > 0
                  ? `${selectedDays.join(', ')} (10:00 AM - 6:00 PM)`
                  : t('serviceActivation.selectDaysTimes', 'Select days and times')}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </TouchableOpacity>
          </ScrollView>

          <View style={[styles.bottomBar, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              onPress={() => setCurrentStep(4)}
              activeOpacity={0.85}
              style={styles.primaryContinueBtn}
            >
              <LinearGradient
                colors={colors.btnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryContinueGradient}
              >
                <Text style={styles.primaryContinueText}>
                  {t('serviceActivation.continue', 'Continue')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: AVAILABILITY & TIME SLOTS
  // ─────────────────────────────────────────────────────────────────────────────
  if (currentStep === 4) {
    return (
      <LinearGradient colors={colors.bg} style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={styles.topHeader}>
            <TouchableOpacity
              onPress={handleHeaderBack}
              style={[styles.headerBtn, { backgroundColor: colors.surface }]}
            >
              <Ionicons name="chevron-back" size={22} color={colors.title} />
            </TouchableOpacity>
            <Text style={[styles.flowHeaderTitle, { color: colors.title }]}>
              {t('serviceActivation.step4Header', 'When are you available?')}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.flowContent}>
            {renderProgressBar(4, 5)}

            <View style={styles.calendarHeaderCenter}>
              <View style={[styles.calendarIconCircle, { backgroundColor: colors.pillBg }]}>
                <Ionicons name="calendar-outline" size={30} color={colors.accent} />
              </View>
              <Text style={[styles.availabilityHeading, { color: colors.title }]}>
                {t('serviceActivation.step4Header', 'When are you available?')}
              </Text>
              <Text style={[styles.availabilitySubtitle, { color: colors.muted }]}>
                {t(
                  'serviceActivation.availabilitySubtitle',
                  'Select the days and times when you’re available for mentorship sessions. These will be the open slots for customers to book.',
                )}
              </Text>
            </View>

            <Text style={[styles.stepSubSectionTitle, { color: colors.title }]}>
              {t('serviceActivation.selectDays', '1. Select Days')}
            </Text>
            <View style={styles.daysPillRow}>
              {DAYS_OF_WEEK.map(d => {
                const isSelected = selectedDays.includes(d.id);
                return (
                  <TouchableOpacity
                    key={d.id}
                    onPress={() => toggleDaySelection(d.id)}
                    style={[
                      styles.dayPill,
                      {
                        backgroundColor: isSelected ? colors.accentDark : colors.card,
                        borderColor: isSelected ? colors.accentDark : colors.cardBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayPillText,
                        { color: isSelected ? '#FFFFFF' : colors.body, fontWeight: isSelected ? '700' : '500' },
                      ]}
                    >
                      {d.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={13} color="#FFFFFF" style={{ marginTop: 2 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.stepSubSectionTitle, { color: colors.title, marginTop: 20 }]}>
              {t('serviceActivation.setTime', '2. Set Time for Each Selected Day')}
            </Text>

            <View style={styles.daySchedulesList}>
              {selectedDays.map(dayId => {
                const dayData = daySchedule[dayId] || { enabled: true, slots: [] };
                return (
                  <View
                    key={dayId}
                    style={[styles.dayScheduleCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                  >
                    <View style={styles.dayCardHeader}>
                      <Text style={[styles.dayCardTitle, { color: colors.title }]}>
                        {dayId === 'Mon'
                          ? 'Monday'
                          : dayId === 'Tue'
                            ? 'Tuesday'
                            : dayId === 'Wed'
                              ? 'Wednesday'
                              : dayId === 'Thu'
                                ? 'Thursday'
                                : dayId === 'Fri'
                                  ? 'Friday'
                                  : dayId === 'Sat'
                                    ? 'Saturday'
                                    : 'Sunday'}
                      </Text>
                      <Switch
                        value={Boolean(dayData.enabled)}
                        onValueChange={() => toggleDaySwitch(dayId)}
                        trackColor={{ false: isDarkMode ? (isBusiness ? '#3D301C' : '#3A2952') : '#E5E7EB', true: colors.accentDark }}
                        thumbColor="#FFFFFF"
                      />
                    </View>

                    {dayData.enabled && (
                      <View style={styles.slotsContainer}>
                        {(dayData.slots || []).map(slot => (
                          <View key={slot.id} style={styles.slotRow}>
                            <View style={styles.timeDropdownWrap}>
                              <Text style={[styles.timeLabel, { color: colors.muted }]}>
                                {t('serviceActivation.from', 'From')}
                              </Text>
                              <View style={[styles.timePickerMini, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                                <Text style={[styles.timePickerText, { color: colors.title }]}>{slot.from}</Text>
                                <Ionicons name="chevron-down" size={14} color={colors.muted} />
                              </View>
                            </View>

                            <View style={styles.timeDropdownWrap}>
                              <Text style={[styles.timeLabel, { color: colors.muted }]}>
                                {t('serviceActivation.to', 'To')}
                              </Text>
                              <View style={[styles.timePickerMini, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                                <Text style={[styles.timePickerText, { color: colors.title }]}>{slot.to}</Text>
                                <Ionicons name="chevron-down" size={14} color={colors.muted} />
                              </View>
                            </View>

                            <TouchableOpacity
                              onPress={() => removeTimeSlot(dayId, slot.id)}
                              style={styles.trashBtn}
                            >
                              <Ionicons name="trash-outline" size={18} color={colors.muted} />
                            </TouchableOpacity>
                          </View>
                        ))}

                        <TouchableOpacity
                          onPress={() => addTimeSlot(dayId)}
                          style={styles.addSlotBtn}
                        >
                          <Text style={[styles.addSlotText, { color: colors.accent }]}>
                            {t('serviceActivation.addTimeSlot', '+ Add Time Slot')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            <Text style={[styles.stepSubSectionTitle, { color: colors.title, marginTop: 16 }]}>
              {t('serviceActivation.timeZone', 'Time Zone')}
            </Text>
            <View style={[styles.pickerBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="globe-outline" size={18} color={colors.accent} style={{ marginRight: 8 }} />
                <Text style={[styles.pickerBoxText, { color: colors.title }]}>{timeZone}</Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={colors.muted} />
            </View>

            <View style={[styles.infoBanner, { backgroundColor: colors.pillBg, borderColor: colors.pillBorder }]}>
              <Ionicons name="information-circle-outline" size={18} color={colors.accent} style={{ marginRight: 8 }} />
              <Text style={[styles.infoBannerText, { color: colors.body }]}>
                {t(
                  'serviceActivation.timeSlotNotice',
                  'These time slots will be visible to customers as available for booking.',
                )}
              </Text>
            </View>
          </ScrollView>

          <View style={[styles.bottomBar, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              onPress={() => setCurrentStep(5)}
              activeOpacity={0.85}
              style={styles.primaryContinueBtn}
            >
              <LinearGradient
                colors={colors.btnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryContinueGradient}
              >
                <Text style={styles.primaryContinueText}>
                  {t('serviceActivation.continue', 'Continue')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 5: REVIEW SERVICE & CONFIRM
  // ─────────────────────────────────────────────────────────────────────────────
  if (currentStep === 5) {
    return (
      <LinearGradient colors={colors.bg} style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={styles.topHeader}>
            <TouchableOpacity
              onPress={handleHeaderBack}
              style={[styles.headerBtn, { backgroundColor: colors.surface }]}
            >
              <Ionicons name="chevron-back" size={22} color={colors.title} />
            </TouchableOpacity>
            <Text style={[styles.flowHeaderTitle, { color: colors.title }]}>
              {t('serviceActivation.step5Header', 'Review Mentorship')}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.flowContent}>
            {renderProgressBar(5, 5)}

            <View style={[styles.reviewHeroCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.reviewHeroAvatar}>
                {userProfilePic ? (
                  <Image source={{ uri: userProfilePic }} style={styles.avatarImg} />
                ) : (
                  <LinearGradient colors={colors.btnGradient} style={styles.avatarImg}>
                    <Ionicons name="person" size={28} color="#FFFFFF" />
                  </LinearGradient>
                )}
              </View>
              <View style={styles.reviewHeroMeta}>
                <Text style={[styles.reviewHeroTitle, { color: colors.title }]}>
                  Business Growth Mentorship
                </Text>
                <Text style={[styles.reviewHeroSubtitle, { color: colors.muted }]}>
                  {programLength} Program • {serviceFormat === 'online' ? 'Online' : 'In Person'}
                </Text>
                <Text style={[styles.reviewHeroPrice, { color: colors.accent }]}>
                  ${priceAmount}
                </Text>
              </View>
            </View>

            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.summaryCardHeader, { color: colors.title }]}>
                {t('serviceActivation.programSummary', 'Program Summary')}
              </Text>

              <View style={styles.summaryItemRow}>
                <Ionicons name="calendar-outline" size={17} color={colors.accent} style={{ marginRight: 10 }} />
                <Text style={[styles.summaryLabel, { color: colors.muted }]}>
                  {t('serviceActivation.summaryDuration', 'Duration')}
                </Text>
                <Text style={[styles.summaryValue, { color: colors.title }]}>{programLength}</Text>
              </View>

              <View style={styles.summaryItemRow}>
                <Ionicons name="school-outline" size={17} color={colors.accent} style={{ marginRight: 10 }} />
                <Text style={[styles.summaryLabel, { color: colors.muted }]}>
                  {t('serviceActivation.summaryGoals', 'Goals')}
                </Text>
                <Text style={[styles.summaryValue, { color: colors.title }]}>
                  Business Growth, Leadership
                </Text>
              </View>

              <View style={styles.summaryItemRow}>
                <Ionicons name="people-outline" size={17} color={colors.accent} style={{ marginRight: 10 }} />
                <Text style={[styles.summaryLabel, { color: colors.muted }]}>
                  {t('serviceActivation.summarySessions', 'Sessions')}
                </Text>
                <Text style={[styles.summaryValue, { color: colors.title }]}>12 Sessions (1 per week)</Text>
              </View>

              <View style={styles.summaryItemRow}>
                <Ionicons name="time-outline" size={17} color={colors.accent} style={{ marginRight: 10 }} />
                <Text style={[styles.summaryLabel, { color: colors.muted }]}>
                  {t('serviceActivation.summaryEachSession', 'Each Session')}
                </Text>
                <Text style={[styles.summaryValue, { color: colors.title }]}>{sessionDuration}</Text>
              </View>

              <View style={styles.summaryItemRow}>
                <Ionicons name="globe-outline" size={17} color={colors.accent} style={{ marginRight: 10 }} />
                <Text style={[styles.summaryLabel, { color: colors.muted }]}>
                  {t('serviceActivation.summaryFormat', 'Format')}
                </Text>
                <Text style={[styles.summaryValue, { color: colors.title }]}>
                  {serviceFormat === 'online' ? 'Online' : 'In Person'}
                </Text>
              </View>

              {serviceFormat === 'in_person' && (
                <>
                  <View style={styles.summaryItemRow}>
                    <Ionicons name="location-outline" size={17} color={colors.accent} style={{ marginRight: 10 }} />
                    <Text style={[styles.summaryLabel, { color: colors.muted }]}>
                      {t('serviceActivation.summaryLocation', 'Location (In Person)')}
                    </Text>
                    <Text style={[styles.summaryValue, { color: colors.title, flex: 1, textAlign: 'right' }]}>
                      {officeAddress}
                    </Text>
                  </View>
                  <View style={styles.summaryItemRow}>
                    <Ionicons name="call-outline" size={17} color={colors.accent} style={{ marginRight: 10 }} />
                    <Text style={[styles.summaryLabel, { color: colors.muted }]}>
                      {t('serviceActivation.summaryPhone', 'Contact Phone')}
                    </Text>
                    <Text style={[styles.summaryValue, { color: colors.title }]}>{phoneNumber}</Text>
                  </View>
                </>
              )}

              <View style={styles.summaryItemRow}>
                <Ionicons name="pricetag-outline" size={17} color={colors.accent} style={{ marginRight: 10 }} />
                <Text style={[styles.summaryLabel, { color: colors.muted }]}>
                  {t('serviceActivation.summaryPrice', 'Price')}
                </Text>
                <Text style={[styles.summaryValue, { color: colors.accent, fontWeight: '700' }]}>
                  ${priceAmount}
                </Text>
              </View>

              <View style={styles.summaryItemRow}>
                <Ionicons name="calendar" size={17} color={colors.accent} style={{ marginRight: 10 }} />
                <Text style={[styles.summaryLabel, { color: colors.muted }]}>
                  {t('serviceActivation.summaryAvailability', 'Availability')}
                </Text>
                <Text style={[styles.summaryValue, { color: colors.title }]}>
                  {selectedDays.join(', ')} 10:00 AM – 6:00 PM (EST)
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={[styles.bottomBar, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              onPress={async () => {
                await saveService({
                  id: `svc_mentorship_${Date.now()}`,
                  type: 'mentorship',
                  title: 'Business Growth Mentorship',
                  subtitle: `${programLength} Program • ${serviceFormat === 'online' ? 'Online' : 'In Person'}`,
                  category: 'Mentorship',
                  duration: programLength,
                  sessionDuration: sessionDuration,
                  format: serviceFormat,
                  address: serviceFormat === 'in_person' ? officeAddress : '',
                  price: priceAmount || '750.00',
                  availability: `${selectedDays.join(', ')} 10:00 AM – 6:00 PM (EST)`,
                  status: 'active',
                  bookingsCount: 0,
                  rating: 5.0,
                  createdAt: new Date().toISOString(),
                  icon: 'school-outline',
                });
                setCurrentStep(6);
              }}
              activeOpacity={0.85}
              style={styles.primaryContinueBtn}
            >
              <LinearGradient
                colors={colors.btnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryContinueGradient}
              >
                <Text style={styles.primaryContinueText}>
                  {t('serviceActivation.confirmBtn', 'Confirm')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 6: YOU'RE ALL SET! LIVE CONFIRMATION
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <LinearGradient colors={colors.bg} style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.topHeader}>
          <TouchableOpacity
            onPress={() => setCurrentStep(0)}
            style={[styles.headerBtn, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.title} />
          </TouchableOpacity>
          <Text style={[styles.flowHeaderTitle, { color: colors.title }]}>
            {t('serviceActivation.step6Header', 'Mentorship is Live')}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.flowContent}>
          <View style={styles.celebrationCenter}>
            <View style={styles.confettiWrap}>
              <LinearGradient colors={colors.btnGradient} style={[styles.bigCheckCircle, { shadowColor: colors.accent }]}>
                <Ionicons name="checkmark" size={44} color="#FFFFFF" />
              </LinearGradient>
              <Ionicons name="star" size={14} color={isBusiness ? '#F3E2B8' : '#C084FC'} style={{ position: 'absolute', top: 4, left: 24 }} />
              <Ionicons name="sparkles" size={18} color={colors.accent} style={{ position: 'absolute', top: 10, right: 28 }} />
              <Ionicons name="ellipse" size={8} color={colors.accent} style={{ position: 'absolute', bottom: 12, left: 16 }} />
              <Ionicons name="sparkles" size={14} color={isBusiness ? '#F3E2B8' : '#C4B5FD'} style={{ position: 'absolute', bottom: 16, right: 20 }} />
            </View>

            <Text style={[styles.allSetTitle, { color: colors.title }]}>
              {t('serviceActivation.allSetTitle', "You're all set!")}
            </Text>
            <Text style={[styles.allSetSubtitle, { color: colors.muted }]}>
              {t('serviceActivation.allSetSubtitle', 'Your mentorship is now live and ready to be booked.')}
            </Text>
          </View>

          <View style={[styles.livePreviewCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.liveCardHeaderRow}>
              <View style={styles.liveAvatarWrap}>
                {userProfilePic ? (
                  <Image source={{ uri: userProfilePic }} style={styles.avatarImg} />
                ) : (
                  <LinearGradient colors={colors.btnGradient} style={styles.avatarImg}>
                    <Ionicons name="person" size={26} color="#FFFFFF" />
                  </LinearGradient>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.liveCardTitle, { color: colors.title }]}>
                  Business Growth Mentorship
                </Text>
                <Text style={[styles.liveCardSubtitle, { color: colors.muted }]}>
                  {sessionDuration} • {serviceFormat === 'online' ? 'Online' : 'In Person'}
                </Text>
                <Text style={[styles.liveCardPrice, { color: colors.accent }]}>
                  ${priceAmount}
                </Text>
              </View>
            </View>

            <View style={[styles.liveInfoRow, { borderColor: colors.divider }]}>
              <Ionicons name="calendar-outline" size={18} color={colors.accent} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.liveInfoLabel, { color: colors.muted }]}>
                  {t('serviceActivation.availabilityTitle', 'Availability')}
                </Text>
                <Text style={[styles.liveInfoValue, { color: colors.title }]}>
                  {selectedDays.join(', ')}{'\n'}10:00 AM – 6:00 PM (EST)
                </Text>
              </View>
            </View>

            {serviceFormat === 'in_person' && (
              <View style={[styles.liveInfoRow, { borderColor: colors.divider }]}>
                <Ionicons name="location-outline" size={18} color={colors.accent} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.liveInfoLabel, { color: colors.muted }]}>
                    {t('serviceActivation.summaryLocation', 'Location (In Person)')}
                  </Text>
                  <Text style={[styles.liveInfoValue, { color: colors.title }]}>
                    {officeAddress}
                  </Text>
                </View>
              </View>
            )}

            <View style={[styles.liveInfoRow, { borderColor: colors.divider }]}>
              <Ionicons name="cash-outline" size={18} color={colors.accent} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.liveInfoLabel, { color: colors.muted }]}>
                  {t('serviceActivation.priceTitle', 'Price')}
                </Text>
                <Text style={[styles.liveInfoValue, { color: colors.title }]}>
                  ${priceAmount}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.liveActionsWrap}>
            <TouchableOpacity
              onPress={() => {
                showToastMessage(toast, 'success', t('serviceActivation.allSetTitle', "You're all set!"));
                setCurrentStep(0);
                setMainTab('manage');
              }}
              activeOpacity={0.85}
              style={styles.viewMyServicesBtn}
            >
              <LinearGradient
                colors={colors.btnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.viewMyServicesGradient}
              >
                <Text style={styles.viewMyServicesText}>
                  {t('serviceActivation.viewMyServices', 'View My Services')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={async () => {
                try {
                  await Share.share({
                    message: 'Book Business Growth Mentorship with me on Valens! https://valens.app/services/mentorship',
                    title: 'Business Growth Mentorship',
                  });
                } catch (_) { }
              }}
              activeOpacity={0.8}
              style={[styles.shareServiceBtn, { borderColor: colors.accent, backgroundColor: colors.surface }]}
            >
              <Ionicons name="share-social-outline" size={17} color={colors.accent} style={{ marginRight: 6 }} />
              <Text style={[styles.shareServiceText, { color: colors.accent }]}>
                {t('serviceActivation.shareService', 'Share Your Service')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.securityRow}>
            <Ionicons name="lock-closed-outline" size={13} color={colors.muted} />
            <Text style={[styles.securityText, { color: colors.muted }]}>
              {'  '}{t('serviceActivation.bookingNotice', "We'll notify you when someone books a session.")}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
    zIndex: 10,
  },
  headerCenterTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenterTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
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
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  flowHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 40,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 0,
    position: 'relative',
    minHeight: 95,
  },
  heroCopy: {
    flex: 1,
    paddingRight: 110,
  },
  heroTitleMain: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    letterSpacing: -0.3,
  },
  heroTitleHighlight: {
    color: '#402090',
    fontWeight: '800',
  },
  heroSubtitleText: {
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: '500',
    marginTop: 12,
    width: '80%',
    paddingTop:10
  },
  heroArt: {
    width: 154,
    height: 186,
    flexShrink: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroSparkleTop: {
    position: 'absolute',
    top: 6,
    left: 20,
    zIndex: 1,
  },
  heroSparkleBottom: {
    position: 'absolute',
    bottom: 18,
    left: 32,
    zIndex: 1,
  },
  bagWrap: {
    position: 'absolute',
    right: 28,
    top: 14,
    alignItems: 'center',
  },
  bagHandle: {
    width: 44,
    height: 18,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderWidth: 7,
    borderBottomWidth: 0,
    borderColor: '#A78BFA',
    marginBottom: -5,
    zIndex: 1,
  },
  bag: {
    width: 92,
    height: 100,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bagFlap: {
    position: 'absolute',
    top: 10,
    width: '74%',
    height: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  bagShine: {
    position: 'absolute',
    top: 6,
    left: 10,
    width: 24,
    height: 64,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    transform: [{ rotate: '18deg' }],
  },
  bagFly: {
    width: 72,
    height: 72,
    marginTop: 12,
  },
  verticalHeroCard: {
    position: 'absolute',
    right: 0,
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#402090',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    zIndex: 2,
  },
  activateBtnWrap: {
    width: '100%',
    height: 52,
    minHeight: 52,
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 18,
    marginBottom: 8,
    shadowColor: '#402090',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  activateBtn: {
    width: '100%',
    height: 52,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  activateBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  trustBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  trustBadgeText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionDividerLine: {
    flex: 1,
    height: 1,
    opacity: 0.7,
  },
  sectionTitle: {
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  offerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
    width: '100%',
  },
  offerItem: {
    alignItems: 'center',
  },
  offerIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#402090',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  offerLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
    width: '100%',
    includeFontPadding: false,
  },
  builtCard: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#402090',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  shieldWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  builtCopy: {
    flex: 1,
  },
  builtTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  builtBody: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  waveWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  flowContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  progressWrap: {
    marginBottom: 16,
    marginTop: 4,
  },
  stepIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressBarTrack: {
    flexDirection: 'row',
    gap: 6,
  },
  progressBarSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  stepQuestion: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 18,
    marginTop: 8,
  },
  serviceCardsContainer: {
    gap: 12,
  },
  serviceOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceOptionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  serviceOptionTextWrap: {
    flex: 1,
  },
  serviceOptionTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    marginBottom: 3,
  },
  serviceOptionDesc: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '500',
  },
  selectedCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 14 : 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  primaryContinueBtn: {
    width: '100%',
    height: 52,
    minHeight: 52,
    borderRadius: 16,
    overflow: 'hidden',
  },
  primaryContinueGradient: {
    width: '100%',
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryContinueText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '700',
  },
  fieldSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  durationCardRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durationCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'space-between',
    minHeight: 120,
  },
  durationCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  durationCardSub: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
    flex: 1,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    alignSelf: 'flex-end',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.2,
  },
  pickerBoxText: {
    fontSize: 14,
    fontWeight: '600',
  },
  goalChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1.2,
  },
  goalChipText: {
    fontSize: 12.5,
  },
  formatToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formatToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
  },
  formatToggleActive: {
    shadowColor: '#402090',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  formatToggleInactive: {
    borderWidth: 1.2,
  },
  formatToggleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  inPersonBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.2,
  },
  inPersonHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  inPersonHeading: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  subFieldLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  inputBox: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 13,
  },
  inPersonHint: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 8,
    fontStyle: 'italic',
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.2,
  },
  priceCurrency: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 10,
  },
  priceInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    padding: 0,
  },
  calendarHeaderCenter: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  calendarIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  availabilityHeading: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  availabilitySubtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '500',
  },
  stepSubSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  daysPillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dayPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginHorizontal: 2,
    borderRadius: 12,
    borderWidth: 1.2,
  },
  dayPillText: {
    fontSize: 12.5,
  },
  daySchedulesList: {
    gap: 12,
  },
  dayScheduleCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.2,
  },
  dayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayCardTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  slotsContainer: {
    marginTop: 10,
    gap: 10,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  timeDropdownWrap: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 3,
  },
  timePickerMini: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  timePickerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  trashBtn: {
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  addSlotBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  addSlotText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 18,
  },
  infoBannerText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
    fontWeight: '500',
  },
  reviewHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.2,
    marginBottom: 16,
  },
  reviewHeroAvatar: {
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 14,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewHeroMeta: {
    flex: 1,
  },
  reviewHeroTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 3,
  },
  reviewHeroSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  reviewHeroPrice: {
    fontSize: 16,
    fontWeight: '800',
  },
  summaryCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.2,
    gap: 12,
  },
  summaryCardHeader: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  summaryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '500',
    width: 130,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  celebrationCenter: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  confettiWrap: {
    position: 'relative',
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  bigCheckCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#402090',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  allSetTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  allSetSubtitle: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  livePreviewCard: {
    borderRadius: 18,
    borderWidth: 1.2,
    padding: 16,
    marginBottom: 20,
  },
  liveCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  liveAvatarWrap: {
    width: 58,
    height: 58,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 12,
  },
  liveCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  liveCardSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  liveCardPrice: {
    fontSize: 15,
    fontWeight: '800',
  },
  liveInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  liveInfoLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  liveInfoValue: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '600',
  },
  liveActionsWrap: {
    gap: 10,
    marginBottom: 16,
  },
  viewMyServicesBtn: {
    width: '100%',
    height: 52,
    minHeight: 52,
    borderRadius: 16,
    overflow: 'hidden',
  },
  viewMyServicesGradient: {
    width: '100%',
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewMyServicesText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '700',
  },
  shareServiceBtn: {
    width: '100%',
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
  },
  shareServiceText: {
    fontSize: 15,
    fontWeight: '700',
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  securityText: {
    fontSize: 12,
    fontWeight: '500',
  },
  mainTopTabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  mainTopTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  mainTopTabText: {
    fontSize: 13.5,
  },
  manageServicesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  manageIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  manageBannerSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  // Mockup Design Styles (Services Tab)
  mockupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  mockupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  brandTitleText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  mockupHeaderCenterTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  mockupHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mockupHeaderIconBtn: {
    padding: 6,
    marginLeft: 8,
    position: 'relative',
  },
  headerBadgeDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  roleSwitcherContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 3,
    borderRadius: 14,
    borderWidth: 1,
  },
  roleSwitcherBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  roleSwitcherBtnActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  roleSwitcherText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  roleSwitcherTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  mockupScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    width: '100%',
  },
  // Professional Dashboard Card
  proDashboardCardWrapper: {
    width: '100%',
    marginBottom: 20,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  proDashboardCard: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    padding: 16,
    paddingBottom: 16,
    position: 'relative',
  },
  proCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  proCardTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    flexShrink: 1,
  },
  proBadgePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  proBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  proCardSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    marginTop: 3,
    marginBottom: 14,
  },
  proStatTilesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 14,
  },
  proStatTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 2,
    marginHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  proStatValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  proStatLabel: {
    color: '#6B7280',
    fontSize: 8.5,
    fontWeight: '600',
    marginTop: 3,
    textAlign: 'center',
    lineHeight: 11,
  },
  proCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
    paddingVertical: 12,
    width: '100%',
    marginTop: 2,
  },
  proCreateBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  // Overview Section
  mockupSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 6,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '800',
  },
  monthDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  monthDropdownText: {
    fontSize: 13,
    fontWeight: '600',
  },
  proMetricCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  metricCard: {
    width: '48.5%',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  metricMainValue: {
    fontSize: 19,
    fontWeight: '800',
    marginVertical: 4,
  },
  metricTrendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricTrendGreen: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 3,
  },
  metricTrendAmber: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 3,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Services & Packages List
  servicesListWrap: {
    marginBottom: 18,
  },
  serviceItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  serviceItemThumbnail: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  serviceItemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  serviceItemTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    marginBottom: 3,
  },
  servicePriceBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  serviceItemPrice: {
    fontSize: 13,
    fontWeight: '700',
    marginRight: 8,
  },
  activePillBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  activePillText: {
    color: '#15803D',
    fontSize: 10.5,
    fontWeight: '700',
  },
  serviceItemMeta: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  serviceActionMenuBtn: {
    padding: 6,
  },
  // Client Dashboard Banner
  clientDashboardCardWrapper: {
    width: '100%',
    marginBottom: 20,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  clientDashboardCard: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    padding: 18,
    minHeight: 110,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  clientBannerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  clientCardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  clientCardSubtitle: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 12,
    lineHeight: 17,
  },
  calendarIllustrationBox: {
    width: 68,
    height: 68,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarSheet: {
    width: 54,
    height: 54,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  calendarHeaderStripe: {
    height: 14,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  calendarRing: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  calendarBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarCheckBadge: {
    position: 'absolute',
    bottom: -2,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Upcoming Sessions
  sessionItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  sessionDateBlock: {
    width: 50,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionDateMonth: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sessionDateDay: {
    fontSize: 18,
    fontWeight: '800',
  },
  sessionDetails: {
    flex: 1,
    marginLeft: 12,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  sessionTime: {
    fontSize: 11.5,
    fontWeight: '500',
    marginBottom: 4,
  },
  sessionHostRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionHostAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 6,
  },
  sessionHostIconBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  sessionHostName: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  // Recommended Grid
  recommendedGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  recommendedCard: {
    width: '48.5%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  recommendedThumbnail: {
    width: '100%',
    height: 94,
    backgroundColor: '#E5E7EB',
  },
  recommendedContent: {
    padding: 10,
  },
  recommendedTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
    minHeight: 34,
  },
  recommendedPrice: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  recommendedRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendedRatingText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 3,
  },
  // Action sheet modal
  actionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  actionModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  actionModalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  actionModalSub: {
    fontSize: 12.5,
    marginTop: 2,
    marginBottom: 16,
  },
  actionModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  actionModalOptionText: {
    fontSize: 14.5,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  actionModalCancelBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(150,150,150,0.15)',
    alignItems: 'center',
  },
  actionModalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  servicesProfileBannerCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  servicesProfileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  servicesProfileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  servicesProfileInfoCol: {
    flex: 1,
    marginLeft: 12,
  },
  servicesProfileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  servicesProfileName: {
    fontSize: 16,
    fontWeight: '800',
  },
  servicesProfileTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  servicesProfileLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  servicesProfileLocationText: {
    fontSize: 11.5,
    marginLeft: 3,
  },
  servicesProfileBio: {
    fontSize: 12,
    lineHeight: 16.5,
    marginTop: 10,
  },
  editServicesBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  servicesSetupPromptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  servicesSetupPromptIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  servicesSetupPromptTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  servicesSetupPromptSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  providerHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  providerAvatarWrap: {
    marginRight: 12,
  },
  providerAvatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  providerAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerAvatarText: {
    fontSize: 22,
    fontWeight: '800',
  },
  providerInfoWrap: {
    flex: 1,
  },
  providerNameText: {
    fontSize: 16,
    fontWeight: '800',
  },
  providerUsernameText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  providerHeadlineText: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
});
