import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Clipboard from '@react-native-clipboard/clipboard';
import ViewShot from 'react-native-view-shot';
import Share from 'react-native-share';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useToast } from 'react-native-toast-notifications';

import HexAvatar from '../../components/home/story.js/HexAvatar';
import { showToastMessage } from '../../components/displaytoastmessage';
import { getTransactionDetails } from '../../services/wallet';
import { useAppTheme } from '../../theme/useApptheme';
import { useThemeContext } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n';
import { formatDisplayCurrency } from '../../utils/displayLocale';
import { resolveTransactionDirection, resolveTransactionType } from '../../utils/transactionAmount';
import { Dragonfly } from '../../assets/icons';
import { navigateToUserProfile } from '../../utils/navigateToUserProfile';
import Svg, { Path, Rect, Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

const pickFirst = (...values) =>
  values.find(value => value !== undefined && value !== null && value !== '');

const toNumber = value => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const formatMoney = (value, language, { signed = false, tone } = {}) => {
  const formatted = formatDisplayCurrency(Math.abs(toNumber(value)), language);
  if (!signed) return formatted;
  if (tone === 'positive') return `+${formatted}`;
  if (tone === 'negative') return `-${formatted}`;
  return formatted;
};

const formatDetailDate = (value, t, language) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  const localeByLanguage = {
    en: 'en-US',
    pt: 'pt-BR',
    it: 'it-IT',
    es: 'es-ES',
    fr: 'fr-FR',
  };
  const locale = localeByLanguage[language] || 'en-US';
  const isEnglish = language === 'en' || !language;
  const datePart = date.toLocaleDateString(locale, {
    month: 'short',
    day: isEnglish ? '2-digit' : 'numeric',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString(locale, {
    hour: isEnglish ? 'numeric' : '2-digit',
    minute: '2-digit',
    hour12: isEnglish,
  });
  const at = t ? t('transactionDetails.atTime') : 'at';
  return `${datePart} ${at} ${timePart}`;
};

const titleCase = value =>
  String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();

const formatHandle = value => {
  const raw = String(value || '').trim().replace(/^@/, '');
  return raw ? `@${raw}` : '';
};

const formatTypeLabel = (raw, t) => {
  const lowered = String(raw || '').trim().toLowerCase();
  if (!lowered) return t('transactionDetails.defaultType');
  if (lowered === 'following' || lowered === 'payfollowing' || lowered.includes('follow')) {
    return t('transactionDetails.typeFollowing');
  }
  if (lowered === 'tip') return t('transactionDetails.typeTip');
  if (lowered === 'donation' || lowered.includes('mission')) return t('transactionDetails.typeDonation');
  if (lowered === 'shopebook' || lowered.includes('ebook')) return 'Shop Ebook';
  if (lowered === 'marketplace' || lowered.includes('market')) return 'Marketplace';
  return titleCase(raw);
};

const formatPaymentMethod = (raw, t) => {
  const value = String(raw || '').trim();
  if (!value) return 'Stripe'; // Default to Stripe as per image style if not present or just Valens balance
  if (value.toLowerCase() === 'stripe') return 'Stripe';
  if (value.toLowerCase() === 'valens' || value.toLowerCase().includes('balance')) {
    return t('transactionDetails.valensBalance');
  }
  return titleCase(value);
};

const partyFrom = (obj = {}) => ({
  id: pickFirst(obj.id, obj._id, obj.userId, ''),
  displayName: pickFirst(obj.displayName, obj.name, obj.fullName, ''),
  handle: formatHandle(pickFirst(obj.userName, obj.username, '')),
  image: pickFirst(obj.image, obj.avatar, obj.profilePicture, ''),
});

const unwrapPayload = payload => {
  if (!payload || typeof payload !== 'object') return {};
  if (payload.paymentId || payload.transactionId || payload.from || payload.to) return payload;
  if (payload.data && typeof payload.data === 'object') return unwrapPayload(payload.data);
  return payload;
};

const normalizeDetails = (payload, preview = {}, t, language) => {
  const data = unwrapPayload(payload);
  const previewSafe = preview && typeof preview === 'object' ? preview : {};
  const previewTx = previewSafe.rawTx || {};
  const merged = { ...previewSafe, ...previewTx, ...data };

  const fromParty = partyFrom(data.from || previewTx.from || {});
  const toParty = partyFrom(data.to || previewTx.to || {});
  const directionRaw = String(pickFirst(data.direction, previewSafe.direction, '')).toUpperCase();
  const direction = resolveTransactionDirection({
    ...merged,
    direction: data.direction || previewSafe.direction,
  });
  const isReceived = direction === 'credit' || directionRaw === 'RECEIVED';
  const normType = resolveTransactionType(merged);
  const typeLabel = formatTypeLabel(
    pickFirst(
      data.typeTransaction,
      previewSafe.typeTransaction,
      previewTx.typeTransaction,
      ['credit', 'debit'].includes(String(data.type || '').toLowerCase()) ? '' : data.type,
      data.source,
      previewSafe.typeLabel,
      previewSafe.type,
    ),
    t,
  );
  const statusRaw = String(pickFirst(data.status, previewSafe.status, 'succeeded')).toLowerCase();

  const rawAmountValue = pickFirst(
    data.amount,
    previewSafe.rawAmount,
    previewTx.amount,
    data.amountUsd,
    previewSafe.amountUsd,
    0,
  );
  const rawTotalValue = pickFirst(
    data.totalAmount,
    previewSafe.totalAmount,
    previewTx.totalAmount,
    data.total,
    previewSafe.total,
    toNumber(rawAmountValue),
  );
  const rawPlatformFeeValue = pickFirst(
    data.platformFee,
    data.platformFees,
    previewSafe.platformFee,
    previewTx.platformFee,
    data.fee,
    previewSafe.fee,
    0,
  );

  const amountTone = isReceived ? 'positive' : 'negative';
  const counterpart = isReceived ? fromParty : toParty;
  const headerName = pickFirst(
    counterpart.displayName,
    isReceived ? toParty.displayName : fromParty.displayName,
    previewSafe.profileDisplayName,
    previewSafe.title,
    t('transactionDetails.valensWallet'),
  );
  const headerHandle = pickFirst(counterpart.handle, formatHandle(previewSafe.profileUserName), '');
  const period =
    data.periodStart && data.periodEnd
      ? `${formatDetailDate(data.periodStart, t, language)} – ${formatDetailDate(data.periodEnd, t, language)}`
      : '';

  const isCreditWithFee =
    (normType === 'payFollowing' ||
      normType === 'donation' ||
      normType === 'shopEbook' ||
      normType === 'marketplace') &&
    direction === 'credit';
  const isSingleAmountSent =
    ((normType === 'payFollowing' ||
      normType === 'donation' ||
      normType === 'shopEbook' ||
      normType === 'marketplace') &&
      direction === 'debit') ||
    normType === 'tip';

  const formattedAmount = formatMoney(rawAmountValue, language, {
    signed: true,
    tone: amountTone,
  });
  const formattedTotal = formatMoney(rawTotalValue, language, {
    signed: true,
    tone: amountTone,
  });
  const formattedPlatformFee = formatDisplayCurrency(
    Math.abs(toNumber(rawPlatformFeeValue)),
    language,
  );

  return {
    displayName: headerName,
    handle: headerHandle,
    typeLabel,
    status: statusRaw,
    isReceived,
    amount: formattedAmount,
    fee: formatMoney(rawPlatformFeeValue, language, { signed: false }),
    total: formattedTotal,
    platformFee: formattedPlatformFee,
    isCreditWithFee,
    isSingleAmountSent,
    amountTone,
    date: formatDetailDate(pickFirst(data.createdAt, previewSafe.createdAt), t, language) || previewSafe.date || '',
    period,
    fromId: fromParty.id,
    fromName: pickFirst(fromParty.displayName, t('transactionDetails.valensWallet')),
    fromHandle: fromParty.handle,
    fromImage: fromParty.image,
    toId: toParty.id,
    toName: pickFirst(toParty.displayName, t('transactionDetails.valensWallet')),
    toHandle: toParty.handle,
    toImage: toParty.image,
    paymentMethod: formatPaymentMethod(data.paymentMethod, t),
    transactionId: String(pickFirst(data.transactionId, data.paymentId, previewSafe.paymentId, previewSafe.key, '')),
    paymentId: String(pickFirst(data.paymentId, previewSafe.paymentId, '')),
    note: pickFirst(data.note, data.description, data.memo, data.message, previewSafe.note, ''),
    profileImage: pickFirst(
      counterpart.image,
      isReceived ? fromParty.image : toParty.image,
      previewSafe.profileImage,
      '',
    ),
  };
};

const statusMeta = (status, typeLabel, isReceived, t) => {
  if (status.includes('fail') || status.includes('cancel') || status.includes('error')) {
    return {
      color: '#EF4444',
      bg: '#FEE2E2',
      icon: 'close',
      title: t('transactionDetails.statusFailed'),
      label: t('transactionDetails.statusFailed'),
      message: t('transactionDetails.statusMessageFailed', { type: typeLabel }),
    };
  }
  if (status.includes('pend') || status.includes('process')) {
    return {
      color: '#D97706',
      bg: '#FEF3C7',
      icon: 'time',
      title: t('transactionDetails.statusPending'),
      label: t('transactionDetails.statusPending'),
      message: t('transactionDetails.statusMessagePending', { type: typeLabel }),
    };
  }
  return {
    color: '#22C55E',
    bg: '#DCFCE7',
    icon: 'checkmark',
    title: t('transactionDetails.statusSucceeded'),
    label: t('transactionDetails.statusCompleted'),
    message: isReceived
      ? t('transactionDetails.statusMessageReceived', { type: typeLabel })
      : t('transactionDetails.statusMessageSucceeded', { type: typeLabel }),
  };
};

const ReceiptIllustration = () => (
  <View style={styles.receiptGraphicWrap} pointerEvents="none">
    <Svg width={105} height={85} viewBox="0 0 110 96" fill="none">
      <Defs>
        <SvgGradient id="waveGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#EDE4FA" />
          <Stop offset="100%" stopColor="#DFD0F6" />
        </SvgGradient>
        <SvgGradient id="checkGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#34D399" />
          <Stop offset="100%" stopColor="#10B981" />
        </SvgGradient>
        <SvgGradient id="paperFold" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#E2E8F0" />
          <Stop offset="100%" stopColor="#F8FAFC" />
        </SvgGradient>
      </Defs>

      {/* Background Soft Purple Wave */}
      <Path
        d="M 12 70 C 25 50, 75 42, 108 50 L 108 86 C 85 96, 35 94, 12 86 Z"
        fill="url(#waveGrad)"
      />

      {/* Yellow Spark / Rays above receipt */}
      <Path
        d="M 38 12 L 34 5"
        stroke="#FBBF24"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <Path
        d="M 50 8 L 50 1"
        stroke="#FBBF24"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <Path
        d="M 62 12 L 66 5"
        stroke="#FBBF24"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* 3D Paper Shadow */}
      <Path
        d="M 37 17 L 85 17 C 88 17, 90 19, 90 22 L 87 75 L 83 71 L 79 75 L 75 71 L 71 75 L 67 71 L 63 75 L 59 71 L 55 75 L 51 71 L 47 75 L 43 71 L 39 75 L 35 71 L 32 75 L 34 22 C 34 19, 35 17, 37 17 Z"
        fill="rgba(0, 0, 0, 0.05)"
        transform="translate(1, 2)"
      />

      {/* Main White Receipt Sheet with zigzag bottom */}
      <Path
        d="M 37 16 L 85 16 C 88 16, 90 18, 90 21 L 87 74 L 83 70 L 79 74 L 75 70 L 71 74 L 67 70 L 63 74 L 59 70 L 55 74 L 51 70 L 47 74 L 43 70 L 39 74 L 35 70 L 32 74 L 34 21 C 34 18, 35 16, 37 16 Z"
        fill="#FFFFFF"
      />

      {/* Top Fold / Curved Header of Receipt */}
      <Path
        d="M 34 21 C 34 17, 39 15, 45 15 L 77 15 C 83 15, 88 17, 88 21 L 87 25 L 35 25 Z"
        fill="url(#paperFold)"
      />

      {/* Purple Logo Emblem on receipt */}
      <Rect x="54" y="27" width="13" height="13" rx="3.5" fill="#431370" />
      <Path
        d="M 57.5 33.5 L 59.5 35.5 L 63.5 30.5"
        stroke="#FFFFFF"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Receipt Line Items */}
      <Rect x="44" y="44" width="33" height="2.5" rx="1.25" fill="#CBD5E1" />
      <Rect x="44" y="49.5" width="23" height="2.5" rx="1.25" fill="#CBD5E1" />
      <Rect x="44" y="55" width="28" height="2.5" rx="1.25" fill="#CBD5E1" />

      {/* Green 3D Checkmark Badge on bottom-right of receipt */}
      <Circle cx="83" cy="67" r="14" fill="rgba(0,0,0,0.12)" />
      <Circle cx="82" cy="66" r="13" fill="#059669" />
      <Circle cx="82" cy="65" r="12.5" fill="url(#checkGrad)" />
      <Path
        d="M 77 65 L 80.5 68.5 L 87.5 61"
        stroke="#FFFFFF"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  </View>
);

export default function TransactionDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const toast = useToast();
  const { t, currentLanguage } = useLanguage();
  const { isDarkMode } = useThemeContext();
  const { bg, bgStyle, text, card, border, mutedText, accent, icon } = useAppTheme();

  const paymentId = pickFirst(route?.params?.paymentId, route?.params?.id, '');
  const preview = route?.params?.preview || {};

  const [details, setDetails] = useState(() => normalizeDetails({}, preview, t, currentLanguage));
  const [loading, setLoading] = useState(true);

  const loadDetails = useCallback(async () => {
    if (!paymentId) {
      setLoading(false);
      showToastMessage(toast, 'danger', t('transactionDetails.missingId'));
      return;
    }
    try {
      setLoading(true);
      const response = await getTransactionDetails(paymentId);
      if (response?.error || (response?.statusCode && response.statusCode >= 400 && !response?.success)) {
        throw new Error(response?.message || t('transactionDetails.loadFailed'));
      }
      setDetails(normalizeDetails(response, preview, t, currentLanguage));
    } catch (error) {
      showToastMessage(
        toast,
        'danger',
        error?.response?.data?.message || error?.message || t('transactionDetails.loadFailed'),
      );
      setDetails(normalizeDetails({}, preview, t, currentLanguage));
    } finally {
      setLoading(false);
    }
  }, [paymentId, preview, t, toast, currentLanguage]);

  useFocusEffect(
    useCallback(() => {
      loadDetails();
    }, [loadDetails]),
  );

  const status = useMemo(
    () => statusMeta(details.status, details.typeLabel, details.isReceived, t),
    [details.status, details.typeLabel, details.isReceived, t],
  );

  const amountColor =
    details.amountTone === 'positive' ? '#22C55E' : details.amountTone === 'negative' ? text : text;

  const copyId = () => {
    if (!details.transactionId) return;
    Clipboard.setString(details.transactionId);
    showToastMessage(toast, 'success', t('transactionDetails.copied'));
  };

  const openHelp = () => {
    const email = 'Support@valens.app';
    const url = `mailto:${email}?subject=${encodeURIComponent(t('settings.helpEmailSubject'))}&body=${encodeURIComponent(t('settings.helpEmailBody'))}`;
    Linking.openURL(url).catch(() => {
      Alert.alert(t('settings.error'), t('settings.noMailApp'));
    });
  };

  const handleProfilePress = (userId) => {
    if (!userId) return;
    navigateToUserProfile(navigation, userId, {
      returnTo: 'TransactionDetails',
      returnParams: route.params,
    });
  };

  const StatusBadge = () => (
    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
      <Ionicons name={status.icon} size={14} color={status.color} />
      <Text style={[styles.statusBadgeText, { color: status.color }]}>{status.label}</Text>
    </View>
  );

  const row = (iconName, label, value, valueColor, valueStyle, labelStyle) => (
    <View style={styles.detailRow}>
      <View style={styles.detailLeft}>
        <View style={styles.detailIconContainer}>
          <Ionicons name={iconName} size={18} color={accent || text} style={{ opacity: 0.7 }} />
        </View>
        <Text style={[styles.detailLabel, { color: mutedText }, labelStyle]}>{label}</Text>
      </View>
      <Text style={[styles.detailValue, { color: valueColor || text }, valueStyle]} numberOfLines={1}>
        {value || '—'}
      </Text>
    </View>
  );

  const viewShotRef = React.useRef();

  const downloadReceipt = async () => {
    try {
      if (viewShotRef.current) {
        const uri = await viewShotRef.current.capture();
        await Share.open({
          url: uri,
          title: t('transactionDetails.receiptShareTitle'),
          message: t('transactionDetails.receiptShareMessage'),
        });
      }
    } catch (err) {
    }
  };

  return (
    <SafeAreaView style={[styles.safe, bgStyle]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: 'transparent' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={accent || text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: accent || text }]}>{t('transactionDetails.receiptTitle')}</Text>
        <TouchableOpacity onPress={downloadReceipt} style={styles.headerBtn} hitSlop={12}>
          <Ionicons name="download-outline" size={22} color={accent || text} />
        </TouchableOpacity>
      </View>

      {loading && !details.displayName ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={accent || text} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.9 }} style={{ backgroundColor: bgStyle?.backgroundColor || '#F9F8FD' }}>
            <View style={[styles.receiptCard, { backgroundColor: card, borderColor: isDarkMode ? border : '#EFE8F8' }]}>
            
            {/* Top Logo and Status */}
            <View style={styles.cardHeader}>
              <View style={styles.logoContainer}>
                <View style={[styles.logoBadge, { backgroundColor: accent || '#431370' }]}>
                  <Ionicons name="shield-checkmark" size={15} color="#FFFFFF" />
                </View>
                <Text style={[styles.logoText, { color: accent || '#3B1768' }]}>Valens</Text>
              </View>
              <StatusBadge />
            </View>

            {/* Hero Row: Title & 3D Receipt Graphic */}
            <View style={styles.heroRow}>
              <View style={styles.heroLeft}>
                <Text style={[styles.successTitle, { color: accent || text }]}>
                  {details.status === 'succeeded' ? (t('transactionDetails.statusSucceededTitle') || 'Transaction\nsuccessful') : status.title}
                </Text>
                <Text style={[styles.successSubtitle, { color: mutedText }]}>
                  {t('transactionDetails.thankYouMessage') || 'Thank you for using Valens.'}
                </Text>
              </View>
              <ReceiptIllustration />
            </View>

            {/* Transaction ID Box */}
            <View style={[styles.txnBox, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F3EEFA' }]}>
              <View style={styles.txnIconWrap}>
                <Ionicons name="document-text-outline" size={18} color={accent || '#5B21B6'} />
              </View>
              <View style={styles.txnTextWrap}>
                <Text style={[styles.txnLabel, { color: mutedText }]}>{t('transactionDetails.transactionId') || 'Transaction ID'}</Text>
                <Text style={[styles.txnValue, { color: accent || '#2D1152' }]} numberOfLines={1}>
                  {details.transactionId || '—'}
                </Text>
              </View>
              <TouchableOpacity onPress={copyId} style={styles.copyBtn} hitSlop={10}>
                <Ionicons name="copy-outline" size={18} color={accent || '#5B21B6'} />
              </TouchableOpacity>
            </View>

            {/* From / To Section */}
            <View style={styles.partiesRow}>
              <View style={styles.partyCol}>
                <Text style={[styles.partyLabel, { color: mutedText }]}>{t('transactionDetails.from') || 'From'}</Text>
                <TouchableOpacity 
                  style={styles.partyProfile}
                  onPress={() => handleProfilePress(details.fromId)}
                  activeOpacity={details.fromId ? 0.7 : 1}
                >
                  <HexAvatar uri={details.fromImage} size={38} borderWidth={1} borderColor={border} />
                  <View style={styles.partyInfo}>
                    <Text style={[styles.partyName, { color: accent || text }]} numberOfLines={1}>
                      {details.fromName}
                    </Text>
                    {!!details.fromHandle && (
                      <Text style={[styles.partyHandle, { color: mutedText }]} numberOfLines={1}>
                        {details.fromHandle}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
              
              <View style={styles.arrowContainer}>
                <View style={[styles.arrowCircle, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#F0E8FA' }]}>
                  <Ionicons name="arrow-forward" size={14} color={accent || '#5B21B6'} />
                </View>
              </View>
              
              <View style={styles.partyCol}>
                <Text style={[styles.partyLabel, { color: mutedText, textAlign: 'right' }]}>{t('transactionDetails.to') || 'To'}</Text>
                <TouchableOpacity 
                  style={styles.partyProfileRight}
                  onPress={() => handleProfilePress(details.toId)}
                  activeOpacity={details.toId ? 0.7 : 1}
                >
                  <HexAvatar uri={details.toImage} size={38} borderWidth={1} borderColor={border} />
                  <View style={styles.partyInfoRight}>
                    <Text style={[styles.partyName, { color: accent || text }]} numberOfLines={1}>
                      {details.toName}
                    </Text>
                    {!!details.toHandle && (
                      <Text style={[styles.partyHandle, { color: mutedText }]} numberOfLines={1}>
                        {details.toHandle}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Details List */}
            <View style={styles.detailsList}>
              {row('heart-outline', t('transactionDetails.type') || 'Type', details.typeLabel, accent || text, styles.boldValue)}
              {details.isCreditWithFee ? (
                <>
                  {row(
                    'calendar-outline',
                    t('transactionDetails.totalAmountReceived') || 'Total Amount Received',
                    details.amount,
                    amountColor,
                    styles.totalValue,
                    styles.totalLabel,
                  )}
                  {row(
                    'pie-chart-outline',
                    t('transactionDetails.platformFee') || 'Platform Fee',
                    details.platformFee,
                    accent || text,
                    styles.boldValue,
                  )}
                </>
              ) : details.isSingleAmountSent ? (
                row(
                  'calendar-outline',
                  t('transactionDetails.amountSent') || t('transactionDetails.totalReceived') || 'Amount Sent',
                  details.total,
                  amountColor,
                  styles.totalValue,
                  styles.totalLabel,
                )
              ) : (
                <>
                  {row('calendar-outline', t('transactionDetails.totalReceived') || 'Total Received', details.total, amountColor, styles.totalValue, styles.totalLabel)}
                  {row('time-outline', t('transactionDetails.amount') || 'Amount', details.amount, amountColor, styles.boldValue)}
                </>
              )}
              {row('card-outline', t('transactionDetails.paymentMethod') || 'Payment Method', details.paymentMethod, accent || text, styles.boldValue)}
              {row('calendar-outline', t('transactionDetails.dateTime') || 'Date & Time', details.date, text, styles.boldValue)}
              
              {/* Custom Status Row */}
              <View style={styles.detailRow}>
                <View style={styles.detailLeft}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="shield-checkmark-outline" size={17} color={accent || text} style={{ opacity: 0.7 }} />
                  </View>
                  <Text style={[styles.detailLabel, { color: mutedText }]}>{t('transactionDetails.status') || 'Status'}</Text>
                </View>
                <StatusBadge />
              </View>
            </View>

            {/* Official Receipt Notice */}
            <View style={[styles.noticeBox, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F3EEFA' }]}>
              <Ionicons name="shield-checkmark-outline" size={22} color={accent || '#5B21B6'} style={styles.noticeIcon} />
              <View style={styles.noticeTextWrap}>
                <Text style={[styles.noticeTitle, { color: accent || '#2D1152' }]}>
                  {t('transactionDetails.officialReceiptTitle') || 'This is an official receipt for your records.'}
                </Text>
                <Text style={[styles.noticeBody, { color: mutedText }]}>
                  {t('transactionDetails.officialReceiptBody') || 'No physical goods or services were provided in exchange for this donation.'}
                </Text>
              </View>
            </View>

          </View>
          </ViewShot>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9F8FD' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingTop: 4, paddingBottom: 24 },
  
  receiptCard: {
    borderRadius: 22,
    padding: 16,
    shadowColor: '#431370',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EFE8F8',
    marginBottom: 12,
  },
  
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroLeft: {
    flex: 1,
    paddingRight: 6,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 25,
  },
  successSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  receiptGraphicWrap: {
    width: 105,
    height: 85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  txnBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  txnIconWrap: {
    marginRight: 10,
  },
  txnTextWrap: {
    flex: 1,
  },
  txnLabel: {
    fontSize: 10.5,
    marginBottom: 1,
    fontWeight: '500',
  },
  txnValue: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  copyBtn: {
    padding: 4,
  },
  
  partiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  partyCol: {
    flex: 1,
  },
  partyLabel: {
    fontSize: 11,
    marginBottom: 4,
    fontWeight: '500',
  },
  partyProfile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partyInfo: {
    marginLeft: 8,
    flex: 1,
  },
  partyProfileRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  partyInfoRight: {
    marginLeft: 8,
    flex: 1,
  },
  partyName: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  partyHandle: {
    fontSize: 10.5,
    marginTop: 1,
  },
  
  arrowContainer: {
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    height: 38,
    marginTop: 18,
  },
  arrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
    opacity: 0.5,
  },
  
  detailsList: {
    gap: 8,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2.5,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIconContainer: {
    width: 22,
    alignItems: 'center',
    marginRight: 6,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13.5,
  },
  boldValue: {
    fontWeight: '700',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  
  noticeBox: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'flex-start',
    marginTop: 6,
  },
  noticeIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  noticeTextWrap: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 3,
  },
  noticeBody: {
    fontSize: 11,
    lineHeight: 15,
  },
});
