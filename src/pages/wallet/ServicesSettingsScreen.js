import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { launchImageLibrary } from 'react-native-image-picker';
import { useToast } from 'react-native-toast-notifications';
import { showToastMessage } from '../../components/displaytoastmessage';
import { useBusinessProfileTheme } from '../../theme/useBusinessProfileTheme';
import { useThemeContext } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n';
import PostLocationModal from '../../components/modals/PostLocationModal';
import {
  DEFAULT_SERVICES_SETTINGS,
  getServicesSettingsDraft,
  saveServicesSettingsDraft,
} from '../../services/servicesSettings';

const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

// ─── Edit Modal Component ─────────────────────────────────────────────────────
const EditModal = ({
  visible,
  title,
  value,
  placeholder,
  multiline = false,
  maxLength = 200,
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

  const handleSave = () => {
    onSave(draftValue.trim());
  };

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
            maxLength={maxLength}
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
          <View style={styles.charCountRow}>
            <Text style={[styles.charCountText, { color: mutedText }]}>
              {draftValue.length}/{maxLength}
            </Text>
          </View>
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
                {t('servicesSettings.buttons.cancel', 'Cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSave}
              style={[styles.modalPrimary, { backgroundColor: accent }]}
            >
              <Text style={styles.modalPrimaryText}>
                {t('servicesSettings.buttons.save', 'Save')}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ─── Settings Row Item ────────────────────────────────────────────────────────
const SettingRowItem = ({
  icon,
  title,
  subtitle,
  value,
  hasValue,
  accent,
  isBusinessProfile,
  labelColor,
  mutedColor,
  borderColor,
  onPress,
  rightComponent,
}) => (
  <TouchableOpacity
    activeOpacity={0.75}
    onPress={onPress}
    style={[styles.rowItem, { borderBottomColor: borderColor }]}
  >
    {icon ? (
      <View
        style={[
          styles.rowIconBox,
          {
            backgroundColor: isBusinessProfile
              ? 'rgba(203, 162, 87, 0.12)'
              : 'rgba(64, 32, 144, 0.08)',
          },
        ]}
      >
        <Ionicons name={icon} size={20} color={accent} />
      </View>
    ) : null}
    <View style={styles.rowContent}>
      <Text style={[styles.rowTitle, { color: labelColor }]}>{title}</Text>
      {subtitle ? <Text style={[styles.rowSubtitle, { color: mutedColor }]}>{subtitle}</Text> : null}
      {value ? (
        <Text
          style={[
            styles.rowValue,
            { color: hasValue ? labelColor : mutedColor },
          ]}
          numberOfLines={2}
        >
          {value}
        </Text>
      ) : null}
    </View>
    {rightComponent ? (
      rightComponent
    ) : (
      <Ionicons name="chevron-forward" size={18} color={mutedColor} />
    )}
  </TouchableOpacity>
);

// ─── Main ServicesSettingsScreen Component ─────────────────────────────────────
const ServicesSettingsScreen = ({ navigation }) => {
  const { t } = useLanguage();
  const toast = useToast();

  const {
    accent,
    card,
    border,
    text,
    mutedText,
    screenBackground,
    isBusinessProfile,
  } = useBusinessProfileTheme();
  const { isDarkMode } = useThemeContext();

  const [data, setData] = useState({ ...DEFAULT_SERVICES_SETTINGS });
  const [initialData, setInitialData] = useState({ ...DEFAULT_SERVICES_SETTINGS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit Modal State
  const [activeModalField, setActiveModalField] = useState(null);
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  // Colors
  const brandPrimary = accent || (isBusinessProfile ? '#CBA257' : '#402090');
  const cardBg = isDarkMode ? '#1E1729' : (card || '#FFFFFF');
  const pageBg = isDarkMode ? '#121212' : (screenBackground || (isBusinessProfile ? '#FAF7F0' : '#FAF5FE'));
  const cardBorder = isDarkMode ? '#382A4C' : (border || (isBusinessProfile ? '#E8D9BD' : '#EAE4F5'));
  const labelColor = isDarkMode ? '#F5F0FF' : '#1F2937';
  const subtextColor = isDarkMode ? '#A59DB5' : (mutedText || '#6B7280');

  // Load draft on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      const draft = await getServicesSettingsDraft();
      if (isMounted) {
        setData(draft);
        setInitialData(draft);
        setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute hasChanges
  const hasChanges = useMemo(() => {
    return (
      data.name !== initialData.name ||
      data.title !== initialData.title ||
      data.whoAreYou !== initialData.whoAreYou ||
      data.aboutServices !== initialData.aboutServices ||
      data.whatWillPeopleFindHere !== initialData.whatWillPeopleFindHere ||
      data.location !== initialData.location ||
      JSON.stringify(data.servicePicture) !== JSON.stringify(initialData.servicePicture)
    );
  }, [data, initialData]);

  // Intercept back navigation if unsaved changes exist
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      if (!hasChanges) return;

      e.preventDefault();

      Alert.alert(
        t('servicesSettings.modals.unsavedTitle', 'Unsaved Changes'),
        t('servicesSettings.modals.unsavedMessage', 'You have unsaved changes. Are you sure you want to discard them?'),
        [
          { text: t('servicesSettings.buttons.keepEditing', 'Keep Editing'), style: 'cancel', onPress: () => {} },
          {
            text: t('servicesSettings.buttons.discard', 'Discard'),
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });

    return unsubscribe;
  }, [hasChanges, navigation, t]);

  // Handle Save
  const handleSave = useCallback(async () => {
    if (!hasChanges) {
      showToastMessage(toast, 'info', t('servicesSettings.toasts.noChanges', 'No changes to save'));
      return;
    }

    setSaving(true);
    const res = await saveServicesSettingsDraft(data);
    setSaving(false);

    if (res.success) {
      setInitialData({ ...data });
      showToastMessage(
        toast,
        'success',
        t('servicesSettings.toasts.draftSaved', 'Saved as local draft. (Public profile publishing requires backend integration)'),
      );
    } else {
      showToastMessage(
        toast,
        'danger',
        t('servicesSettings.toasts.saveFailed', 'Failed to save draft'),
      );
    }
  }, [data, hasChanges, t, toast]);

  // Handle Service Picture Selection
  const handlePickServicePicture = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.85,
        selectionLimit: 1,
      });

      if (result.didCancel || !result.assets?.length) return;

      const asset = result.assets[0];
      if (asset?.uri) {
        setData(prev => ({
          ...prev,
          servicePicture: {
            uri: asset.uri,
            name: asset.fileName || `service-picture-${Date.now()}.jpg`,
            type: asset.type || 'image/jpeg',
          },
        }));
      }
    } catch (error) {
      console.warn('Service picture picker error:', error);
      showToastMessage(
        toast,
        'danger',
        t('servicesSettings.toasts.photoLibraryUnavailable', 'Photo library unavailable'),
      );
    }
  }, [t, toast]);

  // Modal field definitions
  const modalConfigs = {
    name: {
      title: t('servicesSettings.rows.name', 'Name'),
      placeholder: t('servicesSettings.rows.namePlaceholder', 'Enter your display name'),
      multiline: false,
      maxLength: 50,
      value: data.name,
    },
    title: {
      title: t('servicesSettings.rows.title', "What's your title?"),
      placeholder: t('servicesSettings.rows.titlePlaceholder', 'e.g. CEO | Business Mentor | Strategist'),
      multiline: false,
      maxLength: 80,
      value: data.title,
    },
    whoAreYou: {
      title: t('servicesSettings.rows.whoAreYou', 'Who are you?'),
      placeholder: t('servicesSettings.rows.whoAreYouPlaceholder', 'Tell your audience about your background, journey, and expertise...'),
      multiline: true,
      maxLength: 500,
      value: data.whoAreYou,
    },
    aboutServices: {
      title: t('servicesSettings.rows.aboutServices', 'About your services'),
      placeholder: t('servicesSettings.rows.aboutServicesPlaceholder', 'Describe the scope and impact of what you provide...'),
      multiline: true,
      maxLength: 600,
      value: data.aboutServices,
    },
    whatWillPeopleFindHere: {
      title: t('servicesSettings.rows.whatWillPeopleFindHere', 'What will people find here?'),
      placeholder: t('servicesSettings.rows.whatWillPeopleFindHerePlaceholder', 'e.g. Mentorships, consulting sessions, bookings, and masterclasses.'),
      multiline: true,
      maxLength: 600,
      value: data.whatWillPeopleFindHere,
    },
  };

  const activeConfig = activeModalField ? modalConfigs[activeModalField] : null;

  // Resolve preview image uri
  const resolvedServicePicture =
    data.servicePicture?.uri ||
    (typeof data.servicePicture === 'string' ? data.servicePicture : null);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: pageBg }]}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={brandPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: pageBg }]}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Section Title & Subtitle ─────────────────────────────────── */}
          <View style={styles.headerSection}>
            <Text style={[styles.mainSectionTitle, { color: brandPrimary }]}>
              {t('servicesSettings.servicesInfo', 'Services information')}
            </Text>
            <Text style={[styles.mainSectionSubtitle, { color: subtextColor }]}>
              {t('servicesSettings.servicesSubtitle', 'Update the details customers see when they visit your services page.')}
            </Text>
          </View>

          {/* ── Live Services Profile Preview Card (Mockup image15.png) ──── */}
          <View style={[styles.previewCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.previewTopRow}>
              {/* 1:1 Square Service Image */}
              <View style={[styles.previewImageWrap, { borderColor: cardBorder }]}>
                <Image
                  source={{ uri: resolvedServicePicture || DEFAULT_AVATAR }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
              </View>

              {/* Preview Details */}
              <View style={styles.previewDetails}>
                <View style={styles.previewNameRow}>
                  <Text style={[styles.previewName, { color: labelColor }]} numberOfLines={1}>
                    {data.name || t('servicesSettings.defaultName', 'Your Name')}
                  </Text>
                  <Ionicons name="checkmark-circle" size={16} color="#3B82F6" style={{ marginLeft: 4 }} />
                </View>

                <Text style={[styles.previewTitle, { color: brandPrimary }]} numberOfLines={1}>
                  {data.title || t('servicesSettings.defaultTitle', "What's your title?")}
                </Text>

                {data.location ? (
                  <View style={styles.previewLocationRow}>
                    <Ionicons name="location-sharp" size={12} color={subtextColor} />
                    <Text style={[styles.previewLocationText, { color: subtextColor }]} numberOfLines={1}>
                      {data.location}
                    </Text>
                  </View>
                ) : null}
              </View>


            </View>

            {/* Bio summary */}
            <Text style={[styles.previewBio, { color: subtextColor }]} numberOfLines={3}>
              {data.whoAreYou || data.aboutServices || t('servicesSettings.defaultBio', 'Tell customers who you are and what you offer.')}
            </Text>
          </View>

          {/* ── The 7 Settings Rows ─────────────────────────────────────── */}
          <View style={[styles.rowsContainer, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            {/* 1. Name */}
            <SettingRowItem
              title={t('servicesSettings.rows.name', 'Name')}
              value={data.name || t('servicesSettings.rows.namePlaceholder', 'Enter your display name')}
              hasValue={Boolean(data.name)}
              accent={brandPrimary}
              isBusinessProfile={isBusinessProfile}
              labelColor={labelColor}
              mutedColor={subtextColor}
              borderColor={cardBorder}
              onPress={() => setActiveModalField('name')}
            />

            {/* 2. What's your title? */}
            <SettingRowItem
              title={t('servicesSettings.rows.title', "What's your title?")}
              value={data.title || t('servicesSettings.rows.titlePlaceholder', 'e.g. CEO | Business Mentor | Strategist')}
              hasValue={Boolean(data.title)}
              accent={brandPrimary}
              isBusinessProfile={isBusinessProfile}
              labelColor={labelColor}
              mutedColor={subtextColor}
              borderColor={cardBorder}
              onPress={() => setActiveModalField('title')}
            />

            {/* 3. Who are you? */}
            <SettingRowItem
              title={t('servicesSettings.rows.whoAreYou', 'Who are you?')}
              value={data.whoAreYou || t('servicesSettings.rows.whoAreYouPlaceholder', 'Tell your audience about your background, journey, and expertise...')}
              hasValue={Boolean(data.whoAreYou)}
              accent={brandPrimary}
              isBusinessProfile={isBusinessProfile}
              labelColor={labelColor}
              mutedColor={subtextColor}
              borderColor={cardBorder}
              onPress={() => setActiveModalField('whoAreYou')}
            />

            {/* 4. About your services */}
            <SettingRowItem
              title={t('servicesSettings.rows.aboutServices', 'About your services')}
              value={data.aboutServices || t('servicesSettings.rows.aboutServicesPlaceholder', 'Describe the scope and impact of what you provide...')}
              hasValue={Boolean(data.aboutServices)}
              accent={brandPrimary}
              isBusinessProfile={isBusinessProfile}
              labelColor={labelColor}
              mutedColor={subtextColor}
              borderColor={cardBorder}
              onPress={() => setActiveModalField('aboutServices')}
            />

            {/* 5. What will people find here? */}
            <SettingRowItem
              title={t('servicesSettings.rows.whatWillPeopleFindHere', 'What will people find here?')}
              value={data.whatWillPeopleFindHere || t('servicesSettings.rows.whatWillPeopleFindHerePlaceholder', 'e.g. Mentorships, consulting sessions, bookings, and masterclasses.')}
              hasValue={Boolean(data.whatWillPeopleFindHere)}
              accent={brandPrimary}
              isBusinessProfile={isBusinessProfile}
              labelColor={labelColor}
              mutedColor={subtextColor}
              borderColor={cardBorder}
              onPress={() => setActiveModalField('whatWillPeopleFindHere')}
            />

            {/* 6. Service picture (1:1 image) */}
            <SettingRowItem
              title={t('servicesSettings.rows.servicePicture', 'Service picture')}
              subtitle={t('servicesSettings.rows.servicePictureSubtitle', 'Use a square image for best results.')}
              value={resolvedServicePicture ? t('servicesSettings.rows.imageUploaded', 'Image uploaded') : t('servicesSettings.rows.tapToUpload', 'Tap to upload')}
              hasValue={Boolean(resolvedServicePicture)}
              accent={brandPrimary}
              isBusinessProfile={isBusinessProfile}
              labelColor={labelColor}
              mutedColor={subtextColor}
              borderColor={cardBorder}
              onPress={handlePickServicePicture}
              rightComponent={
                <View style={styles.imageRightWrapper}>
                  {resolvedServicePicture ? (
                    <Image
                      source={{ uri: resolvedServicePicture }}
                      style={[styles.thumbnail1x1, { borderColor: cardBorder }]}
                    />
                  ) : (
                    <View style={[styles.thumbnailPlaceholder1x1, { borderColor: cardBorder, backgroundColor: isDarkMode ? '#241D30' : '#EDE8F5' }]}>
                      <Ionicons name="image-outline" size={18} color={subtextColor} />
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={18} color={subtextColor} style={{ marginLeft: 6 }} />
                </View>
              }
            />

            {/* 7. Location */}
            <SettingRowItem
              title={t('servicesSettings.rows.location', 'Location')}
              subtitle={t('servicesSettings.rows.locationSubtitle', 'Where do you offer your services?')}
              value={data.location ? `📍 ${data.location}` : t('servicesSettings.rows.selectLocation', 'Select location')}
              hasValue={Boolean(data.location)}
              accent={brandPrimary}
              isBusinessProfile={isBusinessProfile}
              labelColor={labelColor}
              mutedColor={subtextColor}
              borderColor="transparent"
              onPress={() => setLocationModalVisible(true)}
            />
          </View>

          <View style={{ height: 90 }} />
        </ScrollView>

        {/* ── Fixed Bottom Save Button ──────────────────────────────────── */}
        <View style={[styles.bottomActionBar, { backgroundColor: cardBg, borderTopColor: cardBorder }]}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleSave}
            disabled={saving || !hasChanges}
            style={[
              styles.saveButton,
              {
                backgroundColor: hasChanges ? brandPrimary : (isDarkMode ? '#382A4C' : '#D1C8E5'),
              },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>
                {t('servicesSettings.buttons.saveChanges', 'Save Changes')}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Active Edit Modal ─────────────────────────────────────────── */}
        {activeConfig && (
          <EditModal
            visible={Boolean(activeModalField)}
            title={activeConfig.title}
            value={activeConfig.value}
            placeholder={activeConfig.placeholder}
            multiline={activeConfig.multiline}
            maxLength={activeConfig.maxLength}
            accent={brandPrimary}
            cardStyle={{ backgroundColor: cardBg }}
            border={cardBorder}
            labelColor={labelColor}
            mutedText={subtextColor}
            isDarkMode={isDarkMode}
            onCancel={() => setActiveModalField(null)}
            onSave={newValue => {
              setData(prev => ({
                ...prev,
                [activeModalField]: newValue,
              }));
              setActiveModalField(null);
            }}
          />
        )}

        {/* ── Location Modal ────────────────────────────────────────────── */}
        {locationModalVisible && (
          <PostLocationModal
            visible={locationModalVisible}
            onClose={() => setLocationModalVisible(false)}
            onSelectLocation={loc => {
              const locationStr = typeof loc === 'string' ? loc : loc?.description || loc?.name || '';
              setData(prev => ({ ...prev, location: locationStr }));
              setLocationModalVisible(false);
            }}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Stylesheet ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  headerSection: {
    marginBottom: 16,
  },
  mainSectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    marginBottom: 4,
  },
  mainSectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  previewCard: {
    borderRadius: 18,
    borderWidth: 1.2,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  previewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewImageWrap: {
    width: 64,
    height: 64,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#EDE8F5',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  previewNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewName: {
    fontSize: 16,
    fontWeight: '700',
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  previewLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 3,
  },
  previewLocationText: {
    fontSize: 11,
    fontWeight: '500',
  },
  previewBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  previewBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  previewBio: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  rowsContainer: {
    borderRadius: 18,
    borderWidth: 1.2,
    paddingHorizontal: 14,
    paddingVertical: 6,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rowIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
    marginRight: 10,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 3,
  },
  rowValue: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  imageRightWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail1x1: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
  },
  thumbnailPlaceholder1x1: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 8,
  },
  saveButton: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  modalInputMultiline: {
    minHeight: 110,
    maxHeight: 180,
  },
  charCountRow: {
    alignItems: 'flex-end',
    marginTop: 6,
    marginBottom: 14,
  },
  charCountText: {
    fontSize: 11,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalPrimary: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ServicesSettingsScreen;
