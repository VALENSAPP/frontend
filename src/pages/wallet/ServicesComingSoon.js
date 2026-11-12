import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
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
import { useNavigation, useRoute } from '@react-navigation/native';
import { useToast } from 'react-native-toast-notifications';
import { useSelector } from 'react-redux';
import { useLanguage } from '../../i18n';
import { useThemeContext } from '../../theme/ThemeContext';
import { showToastMessage } from '../../components/displaytoastmessage';
import { normalizeProfileType } from '../../utils/supportEligibility';
import RegularSubscriptionPrompt from '../../components/modals/RegularSubscriptionPrompt';
import { saveService } from './services/servicesStorage';
import ManageServicesView from './services/ManageServicesView';
import ConsultationFlow from './services/ConsultationFlow';
import AppointmentFlow from './services/AppointmentFlow';
import EventFlow from './services/EventFlow';
import MonthlyPackageFlow from './services/MonthlyPackageFlow';

const NOTIFY_KEY = 'servicesComingSoonNotifyMe';
const HERO_FLY = require('../../assets/icons/pngicons/welcome.png');

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

const Sparkle = ({ style, size = 10, color = '#C4B5FD' }) => (
  <Ionicons name="sparkles" size={size} color={color} style={style} />
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

  const incomingProfileType =
    route?.params?.profileType ||
    route?.params?.params?.profileType ||
    route?.params?.userData?.profile ||
    reduxProfile;

  const [notified, setNotified] = useState(false);
  const [isBusiness, setIsBusiness] = useState(false);
  const [hasMembership, setHasMembership] = useState(false);
  const [showMembershipModal, setShowMembershipModal] = useState(false);

  // Setup Flow Steps: 0 = Original Landing, 1 = Choose Type, 2 = Program Details, 3 = Service Details, 4 = Availability, 5 = Review, 6 = Live / All Set
  const isDirectSetup = route.name === 'ServiceSetup' || Boolean(route?.params?.startSetup);
  const [currentStep, setCurrentStep] = useState(isDirectSetup ? 1 : 0);
  const [mainTab, setMainTab] = useState(route?.params?.initialTab || 'services'); // 'services' | 'manage'
  const [activeFlow, setActiveFlow] = useState(null); // 'consultation' | 'appointment' | 'event' | 'monthly_package' | null

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

  const colors = useMemo(
    () =>
      isDarkMode
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
            wave: '#4C1D95',
            wave2: '#2E1064',
            headerIcon: '#EDE4FF',
            accent: '#8B5CF6',
            accentDark: '#6D28D9',
            btnGradient: ['#7C3AED', '#A855F7', '#C026D3'],
            pillBg: 'rgba(139, 92, 246, 0.2)',
            inputBg: '#1E1430',
            divider: '#362354',
          }
        : {
            bg: ['#FBFAFF', '#F4ECFF', '#EDE4FE'],
            surface: '#FFFFFF',
            card: '#FFFFFF',
            cardBorder: '#E9D7FD',
            cardInner: '#F8F3FF',
            launch: '#F3EAFF',
            title: '#2A1258',
            body: '#5B4A7A',
            muted: '#7A6A94',
            iconBg: '#EFE6FF',
            wave: '#D8C4F6',
            wave2: '#C4A7F0',
            headerIcon: '#2A1258',
            accent: '#7C3AED',
            accentDark: '#5B21B6',
            btnGradient: ['#6D28D9', '#9333EA', '#C026D3'],
            pillBg: 'rgba(124, 58, 237, 0.08)',
            inputBg: '#FFFFFF',
            divider: '#EBDCFD',
          },
    [isDarkMode],
  );

  useEffect(() => {
    AsyncStorage.getItem(NOTIFY_KEY).then(value => {
      setNotified(value === 'true');
    });

    (async () => {
      const stored = await AsyncStorage.getItem('profile');
      const resolved = normalizeProfileType(incomingProfileType || stored);
      const isBiz = resolved === 'company';
      setIsBusiness(isBiz);

      const mem = await AsyncStorage.getItem('hasValensMembership');
      if (mem === 'true' || isBiz) {
        setHasMembership(true);
      }
    })();
  }, [incomingProfileType]);

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

  const handleActivateServicesPress = useCallback((preselectedType = null) => {
    let resolvedType = preselectedType;
    if (preselectedType === 'mentorships') resolvedType = 'mentorship';
    else if (preselectedType === 'consultations') resolvedType = 'consultation';
    else if (preselectedType === 'appointments') resolvedType = 'appointment';
    else if (preselectedType === 'events') resolvedType = 'event';
    else if (preselectedType === 'packages') resolvedType = 'monthly_package';

    if (resolvedType) {
      setSelectedServiceType(resolvedType);
    }

    if (isBusiness || hasMembership) {
      if (!resolvedType) {
        setCurrentStep(1);
        return;
      }
      if (resolvedType === 'mentorship') {
        setCurrentStep(2);
      } else {
        setActiveFlow(resolvedType);
      }
      return;
    }

    setShowMembershipModal(true);
  }, [isBusiness, hasMembership]);

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
                backgroundColor: i < stepNum ? colors.accent : (isDarkMode ? '#3A2755' : '#E9D7FD'),
              },
            ]}
          />
        ))}
      </View>
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // SUBFLOWS: CONSULTATION, APPOINTMENT, EVENT, MONTHLY PACKAGE
  // ─────────────────────────────────────────────────────────────────────────────
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
              setCurrentStep(1);
            }}
            onFinish={() => {
              setActiveFlow(null);
              setCurrentStep(0);
              setMainTab('manage');
            }}
            userProfilePic={userProfilePic}
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
              setCurrentStep(1);
            }}
            onFinish={() => {
              setActiveFlow(null);
              setCurrentStep(0);
              setMainTab('manage');
            }}
            userProfilePic={userProfilePic}
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
              setCurrentStep(1);
            }}
            onFinish={() => {
              setActiveFlow(null);
              setCurrentStep(0);
              setMainTab('manage');
            }}
            userProfilePic={userProfilePic}
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
              setCurrentStep(1);
            }}
            onFinish={() => {
              setActiveFlow(null);
              setCurrentStep(0);
              setMainTab('manage');
            }}
            userProfilePic={userProfilePic}
          />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 0: ACTIVATE SERVICES HERO SCREEN & MANAGE SERVICES
  // ─────────────────────────────────────────────────────────────────────────────
  if (currentStep === 0) {
    const rawTitle = t('serviceActivation.heroTitle', 'Activate\nYour Services\nNow');
    const titleLines = String(rawTitle).split('\n');
    const line1 = titleLines[0] || 'Activate';
    const line2 = titleLines[1] || 'Your Services';
    const line3 = titleLines[2] || 'Now';

    return (
      <LinearGradient colors={colors.bg} style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.headerBtn, { backgroundColor: colors.surface }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={22} color={colors.headerIcon} />
            </TouchableOpacity>

            <View style={styles.headerCenterTitleWrap}>
              <Ionicons name="briefcase-outline" size={19} color="#7C3AED" style={{ marginRight: 7 }} />
              <Text style={[styles.headerCenterTitle, { color: colors.title }]}>
                {t('valensServices.comingSoon', 'Services')}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleInfo}
              style={[styles.headerBtn, { backgroundColor: colors.surface }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="information-circle-outline"
                size={22}
                color={colors.headerIcon}
              />
            </TouchableOpacity>
          </View>

          {/* MAIN TABS: Services | Manage Services */}
          <View style={[styles.mainTopTabBar, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <TouchableOpacity
              onPress={() => setMainTab('services')}
              activeOpacity={0.8}
              style={[
                styles.mainTopTabBtn,
                mainTab === 'services' && { backgroundColor: colors.accent },
              ]}
            >
              <Ionicons
                name="briefcase-outline"
                size={16}
                color={mainTab === 'services' ? '#FFFFFF' : colors.muted}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.mainTopTabText,
                  { color: mainTab === 'services' ? '#FFFFFF' : colors.muted, fontWeight: '700' },
                ]}
              >
                {t('serviceActivation.header', 'Services')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMainTab('manage')}
              activeOpacity={0.8}
              style={[
                styles.mainTopTabBtn,
                mainTab === 'manage' && { backgroundColor: colors.accent },
              ]}
            >
              <Ionicons
                name="layers-outline"
                size={16}
                color={mainTab === 'manage' ? '#FFFFFF' : colors.muted}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.mainTopTabText,
                  { color: mainTab === 'manage' ? '#FFFFFF' : colors.muted, fontWeight: '700' },
                ]}
              >
                {t('manageServices.tabTitle', 'Manage Services')}
              </Text>
            </TouchableOpacity>
          </View>

          {mainTab === 'manage' ? (
            <ManageServicesView
              colors={colors}
              isDarkMode={isDarkMode}
              t={t}
              onAddNewService={() => {
                setMainTab('services');
                handleActivateServicesPress();
              }}
              userProfilePic={userProfilePic}
            />
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.content}
            >
              {/* Shortcut Banner to Manage Services */}
              <TouchableOpacity
                onPress={() => setMainTab('manage')}
                activeOpacity={0.85}
                style={[styles.manageServicesBanner, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
              >
                <View style={[styles.manageIconCircle, { backgroundColor: colors.iconBg }]}>
                  <Ionicons name="layers" size={20} color={colors.accent} />
                </View>
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                  <Text style={[styles.manageBannerTitle, { color: colors.title }]}>
                    Manage Services
                  </Text>
                  <Text style={[styles.manageBannerSub, { color: colors.muted }]}>
                    Duo Side: Me as a Professional & Me as a Client
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.accent} />
              </TouchableOpacity>
            {/* Hero Row: Left (Headline & Subtitle), Right (3D Bag Art + Vertical Floating Cards) */}
            <View style={styles.heroRow}>
              <View style={styles.heroCopy}>
                <Text style={[styles.heroTitleMain, { color: colors.title }]}>
                  {line1}
                  {'\n'}
                  <Text style={styles.heroTitleHighlight}>
                    {line2}
                  </Text>
                  {line3 ? `\n${line3}` : ''}
                </Text>

                <Text style={[styles.heroSubtitleText, { color: colors.body }]}>
                  {t(
                    'serviceActivation.heroSubtitle',
                    'Start selling your services on Valens. Offer mentorships, consultations, appointments, events, and monthly packages directly from your profile.',
                  )}
                </Text>
              </View>

              <View style={[styles.heroArt, { width: Math.round(154 * scale), height: Math.round(186 * scale) }]}>
                <Sparkle style={styles.heroSparkleTop} size={13} color="#C4B5FD" />

                <View style={styles.bagWrap}>
                  <View style={styles.bagHandle} />
                  <LinearGradient
                    colors={['#DDD6FE', '#A78BFA', '#7C3AED']}
                    start={{ x: 0.15, y: 0 }}
                    end={{ x: 0.9, y: 1 }}
                    style={[styles.bag, { width: Math.round(92 * scale), height: Math.round(100 * scale) }]}
                  >
                    <View style={styles.bagFlap} />
                    <View style={styles.bagShine} />
                    <Image source={HERO_FLY} style={styles.bagFly} resizeMode="contain" />
                  </LinearGradient>
                </View>

                {VERTICAL_HERO_CARDS.map(c => (
                  <View
                    key={c.icon}
                    style={[
                      styles.verticalHeroCard,
                      {
                        top: Math.round(c.top * scale),
                        backgroundColor: colors.surface,
                      },
                    ]}
                  >
                    <Ionicons name={c.icon} size={18} color="#7C3AED" />
                  </View>
                ))}

                <Sparkle style={styles.heroSparkleBottom} size={12} color="#E879F9" />
              </View>
            </View>

            {/* Activate Services Button with Explicit Radius & Gradient */}
            <TouchableOpacity
              onPress={() => handleActivateServicesPress()}
              activeOpacity={0.85}
              style={styles.activateBtnWrap}
            >
              <LinearGradient
                colors={colors.btnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.activateBtn, { borderRadius: 18 }]}
              >
                <Text style={styles.activateBtnText}>
                  {t('serviceActivation.activateBtn', 'Activate Services')}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </LinearGradient>
            </TouchableOpacity>

            {/* Trust Badge: 100% secure • You're in control */}
            <View style={styles.trustBadgeRow}>
              <Ionicons name="lock-closed-outline" size={13} color={colors.muted} />
              <Text style={[styles.trustBadgeText, { color: colors.muted }]}>
                {t('serviceActivation.secureNote', "100% secure • You're in control")}
              </Text>
            </View>

            {/* Section Divider & Title: What you can sell */}
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionDividerLine, { backgroundColor: colors.divider }]} />
              <Text style={[styles.sectionTitle, { color: colors.title }]}>
                {t('serviceActivation.whatYouCanSell', 'What you can sell')}
              </Text>
              <View style={[styles.sectionDividerLine, { backgroundColor: colors.divider }]} />
            </View>

            {/* 5 Offering Items */}
            <View style={styles.offerRow}>
              {OFFERINGS.map(item => {
                const itemWidth = Math.floor((width - 44) / OFFERINGS.length);
                const label = t(`servicesComingSoon.offer.${item.key}`);
                const numLines = label.includes(' ') ? 2 : 1;
                return (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => handleActivateServicesPress(item.key)}
                    activeOpacity={0.75}
                    style={[styles.offerItem, { width: itemWidth, maxWidth: itemWidth }]}
                  >
                    <View style={[styles.offerIcon, { backgroundColor: colors.surface }]}>
                      <Ionicons name={item.icon} size={22} color="#7C3AED" />
                    </View>
                    <Text
                      style={[styles.offerLabel, { color: colors.body }]}
                      numberOfLines={numLines}
                      adjustsFontSizeToFit
                      minimumFontScale={0.65}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Built for creators and experts Card */}
            <View style={[styles.builtCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <View style={[styles.shieldWrap, { backgroundColor: colors.iconBg }]}>
                <Ionicons name="shield-checkmark-outline" size={26} color="#7C3AED" />
              </View>
              <View style={styles.builtCopy}>
                <Text style={[styles.builtTitle, { color: colors.title }]}>
                  {t('serviceActivation.builtTitle', 'Built for creators and experts')}
                </Text>
                <Text style={[styles.builtBody, { color: colors.muted }]}>
                  {t(
                    'serviceActivation.builtDesc',
                    'Grow your business, get paid securely, and build lasting relationships with your community.',
                  )}
                </Text>
              </View>
            </View>
          </ScrollView>
          )}

          {/* Valens Membership Required Modal */}
          <RegularSubscriptionPrompt
            visible={showMembershipModal}
            isBusinessProfile={false}
            onLater={() => setShowMembershipModal(false)}
            onLearnMore={handleMembershipLearnMore}
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
                <View style={[styles.radioCircle, durationStructure === 'one' && { borderColor: colors.accent, backgroundColor: colors.accent }]}>
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
                <View style={[styles.radioCircle, durationStructure === 'short' && { borderColor: colors.accent, backgroundColor: colors.accent }]}>
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
                <View style={[styles.radioCircle, durationStructure === 'long' && { borderColor: colors.accent, backgroundColor: colors.accent }]}>
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
                        trackColor={{ false: isDarkMode ? '#3A2952' : '#E5E7EB', true: colors.accentDark }}
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
              <LinearGradient colors={colors.btnGradient} style={styles.bigCheckCircle}>
                <Ionicons name="checkmark" size={44} color="#FFFFFF" />
              </LinearGradient>
              <Ionicons name="star" size={14} color="#C084FC" style={{ position: 'absolute', top: 4, left: 24 }} />
              <Ionicons name="sparkles" size={18} color="#E879F9" style={{ position: 'absolute', top: 10, right: 28 }} />
              <Ionicons name="ellipse" size={8} color="#A855F7" style={{ position: 'absolute', bottom: 12, left: 16 }} />
              <Ionicons name="sparkles" size={14} color="#C4B5FD" style={{ position: 'absolute', bottom: 16, right: 20 }} />
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
                } catch (_) {}
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
    marginBottom: 6,
  },
  heroCopy: {
    flex: 1,
    paddingRight: 6,
  },
  heroTitleMain: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    letterSpacing: -0.3,
  },
  heroTitleHighlight: {
    color: '#C026D3',
    fontWeight: '800',
  },
  heroSubtitleText: {
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: '500',
    marginTop: 12,
  },
  heroArt: {
    width: 154,
    height: 186,
    flexShrink: 0,
    position: 'relative',
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
    shadowColor: '#6D28D9',
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
    shadowColor: '#7C3AED',
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
    shadowColor: '#7C3AED',
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
    shadowColor: '#7C3AED',
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
    shadowColor: '#6D28D9',
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
    shadowColor: '#7C3AED',
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
});
