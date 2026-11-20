import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Svg, { Path } from 'react-native-svg';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { useToast } from 'react-native-toast-notifications';
import { useFocusEffect } from '@react-navigation/native';
import { hideLoader, showLoader } from '../../redux/actions/LoaderAction';
import { setProfileImg } from '../../redux/actions/ProfileImgAction';
import { showToastMessage } from '../../components/displaytoastmessage';
import { useBusinessProfileTheme } from '../../theme/useBusinessProfileTheme';
import { useThemeContext } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n';
import { BASE_URL } from '../../config/urls';
import {
  createMyCloset,
  getMyClosetMe,
  updateMyCloset,
} from '../../services/myCloset';
import { EditProfile } from '../../services/createProfile';
import { getUserCredentials } from '../../services/post';
import PostLocationModal from '../../components/modals/PostLocationModal';
import { validateUsername } from '../../utils/validation';

// ─── Helpers & Utilities ───────────────────────────────────────────────────────
const defaultState = {
  shopName: '',
  shopUsername: '',
  description: '',
  shopLogo: null,
  location: '',
  shippingOptions: '',
  returnPolicy: '',
  paymentMethod: '',
  shopPreferences: '',
  notificationsEnabled: true,
};

const stripPrefix = value => String(value || '').replace(/^valens\.app\//i, '');

const normalizeUrl = value => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/')) return `${BASE_URL}${raw}`;
  return `${BASE_URL}/${raw}`;
};

const getFirstPresent = (source, keys) => {
  for (const key of keys) {
    const value = source?.[key];
    if (value != null && String(value).trim() !== '') return value;
  }
  return '';
};

const unwrapMyClosetResponse = source => {
  if (!source) return {};
  const level1 = source?.data ?? source;
  if (level1 && typeof level1 === 'object' && !Array.isArray(level1)) {
    if (level1.data && typeof level1.data === 'object') {
      return level1.data;
    }
    return level1;
  }
  return {};
};

const normalizeShopData = source => {
  const data = unwrapMyClosetResponse(source);
  const shopLogo =
    getFirstPresent(data, ['shopLogo', 'shopLogoUrl', 'logo', 'logoUrl', 'image']) || null;

  return {
    shopName: getFirstPresent(data, ['shopName', 'name', 'businessName', 'displayName']),
    shopUsername: stripPrefix(
      getFirstPresent(data, ['shopUsername', 'username', 'userName', 'handle']),
    ),
    description: getFirstPresent(data, ['description', 'shopDescription', 'about', 'bio']),
    shopLogo: typeof shopLogo === 'string' ? normalizeUrl(shopLogo) : shopLogo,
    location: getFirstPresent(data, ['location', 'city', 'address', 'shopLocation']),
    shippingOptions: getFirstPresent(data, ['shippingOptions', 'shippingPolicy']),
    returnPolicy: getFirstPresent(data, ['returnPolicy', 'returnsPolicy']),
    paymentMethod: getFirstPresent(data, ['paymentMethod', 'paymentMethods']),
    shopPreferences: getFirstPresent(data, ['shopPreferences', 'preferences']),
    notificationsEnabled:
      data?.notificationsEnabled == null ? true : Boolean(data.notificationsEnabled),
  };
};

const toPickableFile = asset => {
  if (!asset?.uri) return null;
  return {
    uri: asset.uri,
    name: asset.fileName || `shop-logo-${Date.now()}.jpg`,
    type: asset.type || 'image/jpeg',
  };
};

// ─── Decorative SVGs ──────────────────────────────────────────────────────────
const DecorativeBurst = memo(({ color = '#A855F7', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M8 4L4 8" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <Path d="M14 6L11 9" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <Path d="M19 11L14 13" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </Svg>
));
DecorativeBurst.displayName = 'DecorativeBurst';

const CurvedUnderline = memo(({ color = '#A855F7', width = 140 }) => (
  <Svg width={width} height={8} viewBox="0 0 140 8" fill="none">
    <Path
      d="M3 5C45 2 95 2 137 6"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      opacity={0.35}
    />
  </Svg>
));
CurvedUnderline.displayName = 'CurvedUnderline';

// ─── Edit Modal ───────────────────────────────────────────────────────────────
const EditModal = ({
  visible,
  title,
  value,
  placeholder,
  multiline = false,
  onCancel,
  onSave,
  accent,
  cardStyle,
  border,
  labelColor,
  mutedText,
  isDarkMode,
}) => {
  const { t } = useLanguage();
  const [draftValue, setDraftValue] = useState(value || '');

  useEffect(() => {
    if (visible) {
      setDraftValue(value || '');
    }
  }, [visible, value]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.modalBackdrop} onPress={onCancel}>
        <Pressable
          style={[
            styles.modalCard,
            cardStyle,
            { borderColor: border, borderWidth: 1 },
          ]}
          onPress={() => {}}
        >
          <Text style={[styles.modalTitle, { color: labelColor }]}>{title}</Text>
          <TextInput
            value={draftValue}
            onChangeText={setDraftValue}
            placeholder={placeholder}
            placeholderTextColor={mutedText}
            multiline={multiline}
            textAlignVertical={multiline ? 'top' : 'center'}
            autoFocus
            style={[
              styles.modalInput,
              multiline && styles.modalInputMultiline,
              {
                borderColor: border,
                color: labelColor,
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#fff',
              },
            ]}
          />
          <View style={styles.modalActions}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onCancel}
              style={[
                styles.modalSecondary,
                { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#f3f4f6' },
              ]}
            >
              <Text style={[styles.modalSecondaryText, { color: labelColor }]}>
                {t('shopSettings.cancel', 'Cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onSave(draftValue)}
              style={[styles.modalPrimary, { backgroundColor: accent }]}
            >
              <Text style={styles.modalPrimaryText}>{t('shopSettings.save', 'Save')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ─── Settings Row Component ───────────────────────────────────────────────────
const SettingsRow = memo(({
  icon,
  title,
  subtitle,
  value,
  hasValue,
  accent,
  isBusinessProfile,
  labelColor,
  onPress,
}) => (
  <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={styles.rowItem}>
    <View
      style={[
        styles.rowIconBox,
        {
          backgroundColor: isBusinessProfile
            ? 'rgba(203, 162, 87, 0.10)'
            : 'rgba(90, 45, 130, 0.08)',
        },
      ]}
    >
      <Ionicons name={icon} size={21} color={accent} />
    </View>
    <View style={styles.rowContent}>
      <Text style={[styles.rowTitle, { color: labelColor }]}>{title}</Text>
      {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      <Text
        style={[
          styles.rowValue,
          {
            color: hasValue
              ? (isBusinessProfile ? accent : '#5a2d82')
              : '#9CA3AF',
            fontWeight: hasValue ? '700' : '600',
          },
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" style={styles.rowChevron} />
  </TouchableOpacity>
));
SettingsRow.displayName = 'SettingsRow';

// ─── Main ShopSettingsScreen ──────────────────────────────────────────────────
const ShopSettingsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const toast = useToast();
  const { isBusinessProfile, bgStyle, cardStyle, accent, mutedText, border, card } =
    useBusinessProfileTheme();
  const { isDarkMode } = useThemeContext();
  const { t } = useLanguage();
  const labelColor = isDarkMode ? '#ffffff' : '#111827';

  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(defaultState);
  const [initialData, setInitialData] = useState(null);
  const [activeField, setActiveField] = useState(null);
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  // ── Load Shop / Profile Settings ──────────────────────────────────────────
  const loadShopSettings = useCallback(async () => {
    dispatch(showLoader());
    try {
      const userId = await AsyncStorage.getItem('userId');
      const [apiResponse, draftValue, userCreds] = await Promise.all([
        getMyClosetMe().catch(error => error?.response?.data || null),
        AsyncStorage.getItem('myClosetDraft'),
        userId ? getUserCredentials(userId).catch(() => null) : Promise.resolve(null),
      ]);

      const normalizedApiData = normalizeShopData(apiResponse);
      let normalizedDraft = null;

      if (draftValue) {
        try {
          normalizedDraft = normalizeShopData({ data: JSON.parse(draftValue) });
        } catch (parseError) {
          console.warn('ShopSettings draft parse error:', parseError);
        }
      }

      // Persona credentials fallback
      const credsData = userCreds?.data?.user || userCreds?.data || userCreds;
      const personaFallback = {
        shopName: credsData?.displayName || credsData?.name || '',
        shopUsername: stripPrefix(credsData?.username || credsData?.userName || ''),
        description: credsData?.bio || credsData?.about || '',
        shopLogo: credsData?.profileImage || credsData?.image || null,
        location: credsData?.location || credsData?.city || '',
      };

      const merged = {
        ...defaultState,
        ...personaFallback,
        ...(normalizedDraft || {}),
        ...normalizedApiData,
      };

      setData(merged);
      setInitialData(merged);
    } catch (error) {
      console.warn('ShopSettings load error:', error);
      showToastMessage(
        toast,
        'danger',
        error?.response?.data?.message || error?.message || t('shopSettings.toasts.loadFailed', 'Failed to load settings'),
      );
    } finally {
      dispatch(hideLoader());
    }
  }, [dispatch, t, toast]);

  useFocusEffect(
    useCallback(() => {
      loadShopSettings();
    }, [loadShopSettings]),
  );

  // ── Change Detection ───────────────────────────────────────────────────────
  const hasChanges = useMemo(() => {
    if (!initialData) return false;
    const nameDiff = String(data.shopName || '').trim() !== String(initialData.shopName || '').trim();
    const usernameDiff = String(data.shopUsername || '').trim() !== String(initialData.shopUsername || '').trim();
    const descDiff = String(data.description || '').trim() !== String(initialData.description || '').trim();
    const locDiff = String(data.location || '').trim() !== String(initialData.location || '').trim();
    const logoDiff = data.shopLogo !== initialData.shopLogo;

    return nameDiff || usernameDiff || descDiff || locDiff || logoDiff;
  }, [data, initialData]);

  // ── Public Shop Link ───────────────────────────────────────────────────────
  const shopLink = useMemo(() => {
    const handle = String(data.shopUsername || '').trim().toLowerCase();
    return handle ? `valens.app/${handle}` : `valens.app/${t('shopSettings.yourShopSlug', 'your-shop')}`;
  }, [data.shopUsername, t]);

  // ── Logo / Photo Picking ───────────────────────────────────────────────────
  const handleImagePick = useCallback(async () => {
    try {
      const response = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        includeBase64: false,
        quality: 0.9,
      });

      if (response?.didCancel || response?.errorCode) return;
      const asset = response?.assets?.[0];
      const file = toPickableFile(asset);
      if (!file) return;

      setData(prev => ({
        ...prev,
        shopLogo: file,
      }));
    } catch (error) {
      console.warn('Shop logo picker error:', error);
      showToastMessage(toast, 'danger', t('shopSettings.toasts.photoLibraryUnavailable', 'Photo library unavailable'));
    }
  }, [t, toast]);

  // ── Save Functionality ─────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!hasChanges) {
      showToastMessage(toast, 'info', t('shopSettings.toasts.noChanges', 'No changes to save'));
      return;
    }

    const shopUsernameError = validateUsername(data.shopUsername, t);
    if (shopUsernameError) {
      showToastMessage(toast, 'danger', shopUsernameError);
      return;
    }

    const closetPayload = {
      shopName: String(data.shopName || '').trim(),
      shopUsername: String(data.shopUsername || '').trim(),
      description: String(data.description || '').trim(),
      location: String(data.location || '').trim(),
      shippingOptions: String(data.shippingOptions || '').trim(),
      returnPolicy: String(data.returnPolicy || '').trim(),
      paymentMethod: String(data.paymentMethod || '').trim(),
      shopPreferences: String(data.shopPreferences || '').trim(),
      notifications: data.notificationsEnabled ? 'enabled' : 'disabled',
      shopLogo: data.shopLogo,
    };

    setSaving(true);
    dispatch(showLoader());
    try {
      let closetRes = await updateMyCloset(closetPayload);

      if (closetRes?.statusCode === 404 || closetRes?.error) {
        closetRes = await createMyCloset(closetPayload);
      }

      // If Persona account, also sync personal profile details
      if (!isBusinessProfile) {
        try {
          const profileForm = new FormData();
          if (data.shopName) {
            profileForm.append('displayName', String(data.shopName).trim());
            profileForm.append('name', String(data.shopName).trim());
          }
          if (data.shopUsername) {
            profileForm.append('username', String(data.shopUsername).trim());
          }
          if (data.description) {
            profileForm.append('bio', String(data.description).trim());
          }
          if (data.location) {
            profileForm.append('location', String(data.location).trim());
          }
          if (data.shopLogo?.uri && data.shopLogo.uri.startsWith('file://')) {
            profileForm.append('image', {
              uri: data.shopLogo.uri,
              name: data.shopLogo.name || `profile-${Date.now()}.jpg`,
              type: data.shopLogo.type || 'image/jpeg',
            });
          }
          await EditProfile(profileForm).catch(e => console.warn('EditProfile sync error:', e));
          if (data.shopLogo?.uri) {
            dispatch(setProfileImg(data.shopLogo.uri));
          }
        } catch (profileErr) {
          console.warn('Persona profile sync error:', profileErr);
        }
      }

      if (closetRes?.statusCode === 200 || closetRes?.statusCode === 201 || closetRes?.success) {
        showToastMessage(
          toast,
          'success',
          closetRes?.message || t('shopSettings.toasts.saveSuccess', 'Changes saved successfully'),
        );

        setInitialData({ ...data });

        if (closetPayload.shopUsername) {
          await AsyncStorage.setItem(
            'myClosetDraft',
            JSON.stringify({
              ...data,
              shopUsername: closetPayload.shopUsername,
            }),
          );
        }
        return;
      }

      showToastMessage(
        toast,
        'danger',
        closetRes?.message || t('shopSettings.toasts.saveFailed', 'Failed to save changes'),
      );
    } catch (error) {
      showToastMessage(
        toast,
        'danger',
        error?.response?.data?.message || error?.message || t('shopSettings.toasts.saveFailed', 'Failed to save changes'),
      );
    } finally {
      setSaving(false);
      dispatch(hideLoader());
    }
  }, [data, dispatch, hasChanges, isBusinessProfile, t, toast]);

  // ── Modal Field Configuration ──────────────────────────────────────────────
  const activeModalConfig = {
    shopName: {
      title: isBusinessProfile
        ? t('shopSettings.modals.shopName.title', 'Shop Name')
        : t('shopSettings.rows.personalName', 'Display name'),
      placeholder: isBusinessProfile
        ? t('shopSettings.modals.shopName.placeholder', 'e.g. Valens Boutique')
        : t('shopSettings.rows.personalNameSubtitle', 'Your personal display name'),
      multiline: false,
    },
    shopUsername: {
      title: t('shopSettings.modals.shopUsername.title', 'Username'),
      placeholder: t('shopSettings.modals.shopUsername.placeholder', 'e.g. my-shop'),
      multiline: false,
    },
    description: {
      title: isBusinessProfile
        ? t('shopSettings.modals.description.title', 'Shop Description')
        : t('shopSettings.rows.personalBio', 'Bio / Description'),
      placeholder: isBusinessProfile
        ? t('shopSettings.modals.description.placeholder', 'What makes your shop special...')
        : t('shopSettings.rows.personalBioSubtitle', 'Tell people about yourself...'),
      multiline: true,
    },
  }[activeField];

  // Preview Image URI
  const previewImageUri = data.shopLogo?.uri || (typeof data.shopLogo === 'string' ? data.shopLogo : null);

  const cardBorderColor = isBusinessProfile ? '#E8D9BD' : 'rgba(90, 45, 130, 0.12)';

  return (
    <SafeAreaView style={[styles.safeArea, bgStyle]}>
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── Banner Card (Card 1) ────────────────────────────────────────── */}
          <View
            style={[
              styles.bannerCard,
              cardStyle,
              { borderColor: cardBorderColor },
            ]}
          >
            <View style={styles.bannerTextCol}>
              <View style={styles.bannerHeadingWrap}>
                <Text
                  style={[
                    styles.bannerHeading,
                    { color: isBusinessProfile ? accent : '#402090' },
                  ]}
                >
                  {t('shopSettings.bannerHeading', 'Small details.\nBig shop energy.')}
                </Text>
                <View style={styles.burstWrap}>
                  <DecorativeBurst color={isBusinessProfile ? accent : '#A855F7'} size={21} />
                </View>
              </View>

              <Text
                style={[
                  styles.bannerBody,
                  { color: isBusinessProfile ? '#8C733E' : '#4B5563' },
                ]}
              >
                {t(
                  'shopSettings.bannerDescription',
                  "Give your shop a name, add your logo, and tell shoppers what makes it special. These are the details they'll see when they visit.",
                )}
              </Text>

              <View style={styles.taglineWrap}>
                <Text
                  style={[
                    styles.bannerTagline,
                    { color: isBusinessProfile ? accent : '#5a2d82' },
                  ]}
                >
                  {t(
                    'shopSettings.bannerTagline',
                    'Dralens brought the cart.\nYou bring the good stuff!',
                  )}
                </Text>
                <CurvedUnderline color={isBusinessProfile ? accent : '#A855F7'} width={135} />
              </View>
            </View>

            <Image
              source={
                isBusinessProfile
                  ? require('../../assets/Valens Stickers/Valens Stickers/PNG/shopping_gold.png')
                  : require('../../assets/Valens Stickers/Valens Stickers/WEBP/Pack 2/shopping.webp')
              }
              style={styles.bannerMascot}
              resizeMode="contain"
            />
          </View>

          {/* ── Shop Preview Card (Card 2) ──────────────────────────────────── */}
          <View
            style={[
              styles.previewCard,
              cardStyle,
              { borderColor: cardBorderColor },
            ]}
          >
            <View
              style={[
                styles.previewIconBox,
                {
                  borderColor: isBusinessProfile ? '#E8D9BD' : 'rgba(90, 45, 130, 0.18)',
                  backgroundColor: isBusinessProfile ? '#FAF7F0' : '#FAF5FF',
                },
              ]}
            >
              {previewImageUri ? (
                <Image source={{ uri: previewImageUri }} style={styles.previewImage} resizeMode="cover" />
              ) : (
                <Ionicons
                  name={isBusinessProfile ? 'bag-handle-outline' : 'bag-handle-outline'}
                  size={28}
                  color={accent}
                />
              )}
            </View>

            <View style={styles.previewTextCol}>
              <View
                style={[
                  styles.previewPill,
                  {
                    backgroundColor: isBusinessProfile
                      ? 'rgba(203, 162, 87, 0.12)'
                      : 'rgba(90, 45, 130, 0.10)',
                  },
                ]}
              >
                <Text style={[styles.previewPillText, { color: accent }]}>
                  {t('shopSettings.shopPreviewPill', 'Shop preview')}
                </Text>
              </View>

              <Text
                style={[
                  styles.previewTitle,
                  { color: isBusinessProfile ? accent : labelColor },
                ]}
                numberOfLines={1}
              >
                {data.shopName || t('shopSettings.yourShopFallback', 'Your Shop')}
              </Text>

              <Text
                style={[
                  styles.previewLink,
                  { color: isBusinessProfile ? '#8C733E' : '#6B7280' },
                ]}
                numberOfLines={1}
              >
                {shopLink}
              </Text>

              <Text
                style={[
                  styles.previewDescription,
                  { color: isBusinessProfile ? '#A38A5A' : '#9CA3AF' },
                ]}
                numberOfLines={1}
              >
                {data.description || t('shopSettings.previewDefaultStory', "Your shop's story starts here.")}
              </Text>
            </View>
          </View>

          {/* ── Shop Information Section (Card 3) ───────────────────────────── */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeading, { color: accent }]}>
              {t('shopSettings.shopInformation', 'Shop information')}
            </Text>
          </View>

          <View
            style={[
              styles.infoCard,
              cardStyle,
              { borderColor: cardBorderColor },
            ]}
          >
            {/* Row 1: Shop Name / Display Name */}
            <SettingsRow
              icon={isBusinessProfile ? 'storefront-outline' : 'person-outline'}
              title={
                isBusinessProfile
                  ? t('shopSettings.rows.shopName', 'Shop name')
                  : t('shopSettings.rows.personalName', 'Display name')
              }
              subtitle={
                isBusinessProfile
                  ? t('shopSettings.rows.shopNameSubtitle', 'Pick a name shoppers will remember.')
                  : t('shopSettings.rows.personalNameSubtitle', 'Your personal display name shown to others.')
              }
              value={data.shopName || t('shopSettings.tapToAdd', 'Tap to add')}
              hasValue={Boolean(data.shopName)}
              accent={accent}
              isBusinessProfile={isBusinessProfile}
              labelColor={labelColor}
              onPress={() => setActiveField('shopName')}
            />
            <View
              style={[
                styles.rowDivider,
                { backgroundColor: isBusinessProfile ? '#E8D9BD' : 'rgba(90, 45, 130, 0.08)' },
              ]}
            />

            {/* Row 2: Username */}
            <SettingsRow
              icon="link-outline"
              title={t('shopSettings.rows.username', 'Username')}
              subtitle={
                isBusinessProfile
                  ? t('shopSettings.rows.usernameSubtitleNew', 'Your public shop link. Make it easy to share.')
                  : t('shopSettings.rows.personalUsernameSubtitle', 'Your public profile link. Make it easy to share.')
              }
              value={data.shopUsername ? `valens.app/${data.shopUsername}` : 'valens.app/your-shop'}
              hasValue={Boolean(data.shopUsername)}
              accent={accent}
              isBusinessProfile={isBusinessProfile}
              labelColor={labelColor}
              onPress={() => setActiveField('shopUsername')}
            />
            <View
              style={[
                styles.rowDivider,
                { backgroundColor: isBusinessProfile ? '#E8D9BD' : 'rgba(90, 45, 130, 0.08)' },
              ]}
            />

            {/* Row 3: Shop Description / Bio */}
            <SettingsRow
              icon="document-text-outline"
              title={
                isBusinessProfile
                  ? t('shopSettings.rows.description', 'Shop description')
                  : t('shopSettings.rows.personalBio', 'Shop description')
              }
              subtitle={
                isBusinessProfile
                  ? t('shopSettings.rows.descriptionSubtitle', 'What do you sell? Give shoppers a reason to explore.')
                  : t('shopSettings.rows.personalBioSubtitle', 'Tell shoppers what makes your collection special.')
              }
              value={data.description || t('shopSettings.tapToDescribe', 'Tap to describe your shop')}
              hasValue={Boolean(data.description)}
              accent={accent}
              isBusinessProfile={isBusinessProfile}
              labelColor={labelColor}
              onPress={() => setActiveField('description')}
            />
            <View
              style={[
                styles.rowDivider,
                { backgroundColor: isBusinessProfile ? '#E8D9BD' : 'rgba(90, 45, 130, 0.08)' },
              ]}
            />

            {/* Row 4: Shop Logo / Profile Photo */}
            <SettingsRow
              icon="image-outline"
              title={
                isBusinessProfile
                  ? t('shopSettings.rows.logo', 'Shop logo')
                  : t('shopSettings.rows.personalPhoto', 'Shop logo')
              }
              subtitle={
                isBusinessProfile
                  ? t('shopSettings.rows.logoSubtitleNew', "Your shop's signature look. A square image works best.")
                  : t('shopSettings.rows.personalPhotoSubtitle', 'Your signature look. A square image works best.')
              }
              value={
                data.shopLogo
                  ? (isBusinessProfile ? t('shopSettings.rows.logoUploaded', 'Logo uploaded') : t('shopSettings.rows.personalPhotoUploaded', 'Photo uploaded'))
                  : t('shopSettings.addLogo', 'Add a logo')
              }
              hasValue={Boolean(data.shopLogo)}
              accent={accent}
              isBusinessProfile={isBusinessProfile}
              labelColor={labelColor}
              onPress={handleImagePick}
            />
            <View
              style={[
                styles.rowDivider,
                { backgroundColor: isBusinessProfile ? '#E8D9BD' : 'rgba(90, 45, 130, 0.08)' },
              ]}
            />

            {/* Row 5: Location */}
            <SettingsRow
              icon="location-outline"
              title={t('shopSettings.rows.location', 'Location')}
              subtitle={
                isBusinessProfile
                  ? t('shopSettings.rows.locationSubtitleNew', "Let shoppers know where you're based. Shown on your public shop page.")
                  : t('shopSettings.rows.personalLocationSubtitle', "Let shoppers know where you're based. Shown on your public page.")
              }
              value={data.location || t('shopSettings.tapToAddLocation', 'Tap to add your location')}
              hasValue={Boolean(data.location)}
              accent={accent}
              isBusinessProfile={isBusinessProfile}
              labelColor={labelColor}
              onPress={() => setLocationModalVisible(true)}
            />
          </View>

          {/* ── Save Changes Button ────────────────────────────────────────── */}
          <View style={styles.actionWrap}>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleSave}
              disabled={saving || !hasChanges}
              style={[
                styles.saveButton,
                {
                  backgroundColor: accent,
                  opacity: saving ? 0.75 : !hasChanges ? 0.5 : 1,
                  shadowColor: accent,
                },
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {t('shopSettings.saveChanges', 'Save changes')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* ── Location Modal ──────────────────────────────────────────────── */}
        <PostLocationModal
          visible={locationModalVisible}
          initialValue={data.location}
          saving={false}
          onClose={() => setLocationModalVisible(false)}
          onSave={value => {
            setData(prev => ({ ...prev, location: String(value || '').trim() }));
            setLocationModalVisible(false);
          }}
        />

        {/* ── Edit Modal ──────────────────────────────────────────────────── */}
        <EditModal
          visible={Boolean(activeModalConfig)}
          title={activeModalConfig?.title || ''}
          value={String(data[activeField] || '')}
          placeholder={activeModalConfig?.placeholder || ''}
          multiline={activeModalConfig?.multiline}
          onCancel={() => setActiveField(null)}
          onSave={value => {
            if (activeField === 'shopUsername') {
              const shopUsernameError = validateUsername(value, t);
              if (shopUsernameError) {
                showToastMessage(toast, 'danger', shopUsernameError);
                return;
              }
            }
            setData(prev => ({ ...prev, [activeField]: value }));
            setActiveField(null);
          }}
          accent={accent}
          cardStyle={cardStyle}
          border={border}
          labelColor={labelColor}
          mutedText={mutedText}
          isDarkMode={isDarkMode}
        />
      </View>
    </SafeAreaView>
  );
};

export default ShopSettingsScreen;

// ─── Stylesheet ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  scrollContent: {
    paddingBottom: 72,
  },

  // ── Banner Card ──
  bannerCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1.5,
  },
  bannerTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  bannerHeadingWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bannerHeading: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 25,
    letterSpacing: -0.2,
  },
  burstWrap: {
    marginLeft: 4,
    marginTop: -2,
  },
  bannerBody: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '400',
    marginBottom: 8,
  },
  taglineWrap: {
    alignSelf: 'flex-start',
  },
  bannerTagline: {
    fontSize: 12.5,
    fontWeight: '700',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  bannerMascot: {
    width: 130,
    height: 130,
    marginLeft: 4,
  },

  // ── Preview Card ──
  previewCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1.5,
  },
  previewIconBox: {
    width: 68,
    height: 68,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  previewTextCol: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  previewPill: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  previewPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  previewTitle: {
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 21,
  },
  previewLink: {
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 17,
    marginTop: 1,
  },
  previewDescription: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    marginTop: 2,
  },

  // ── Info Section ──
  sectionHeaderRow: {
    marginBottom: 10,
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  infoCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1.5,
  },

  // ── Settings Row ──
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
    paddingRight: 8,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 19,
  },
  rowSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    marginVertical: 2,
  },
  rowValue: {
    fontSize: 13,
    lineHeight: 17,
    marginTop: 1,
  },
  rowChevron: {
    marginLeft: 4,
  },
  rowDivider: {
    height: 1,
    marginLeft: 72,
  },

  // ── Action Wrap & Save Button ──
  actionWrap: {
    marginTop: 22,
    marginBottom: 20,
  },
  saveButton: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // ── Modal Styles ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 46,
  },
  modalInputMultiline: {
    minHeight: 96,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  modalSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalPrimary: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalPrimaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});
