import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { activateProvider } from '../../../services/proServices';
import { getDeviceTimezone } from '../../../services/proServices/helpers';

const HERO_FLY_PURPLE = require('../../../assets/icons/pngicons/welcome.png');
const HERO_FLY_GOLD = require('../../../assets/icons/pngicons/Golden_Bee_Masco.png');

export default function ActivateServicesScreen({
  navigation,
  onActivated,
  onBack,
  onClose,
  isBusinessProfile = false,
  isDarkMode = false,
  t,
}) {
  const handleBack = onBack || onClose || (() => navigation?.goBack?.());

  const [headline, setHeadline] = useState('');
  const [about, setAbout] = useState('');
  const [timezone, setTimezone] = useState(getDeviceTimezone());
  const [loading, setLoading] = useState(false);

  const brandAccent = isBusinessProfile ? '#CBA257' : '#7C3AED';
  const buttonGradient = isBusinessProfile ? ['#B8924F', '#CBA257'] : ['#5227A3', '#402090'];
  const bg = isDarkMode ? '#110D17' : '#FAF8FD';
  const cardBg = isDarkMode ? '#1E1828' : '#FFFFFF';
  const border = isDarkMode ? 'rgba(255,255,255,0.1)' : '#EDE7F6';
  const textColor = isDarkMode ? '#F3F4F6' : '#1F2937';
  const mutedColor = isDarkMode ? '#9CA3AF' : '#6B7280';

  const handleActivate = async () => {
    setLoading(true);
    try {
      const response = await activateProvider({
        headline: headline.trim(),
        about: about.trim(),
        timezone,
      });

      const data = response?.data || response;
      if (response?.success !== false) {
        if (onActivated) {
          onActivated(data);
        } else {
          Alert.alert(
            t ? t('services.activatedSuccessTitle', 'Services Activated!') : 'Services Activated!',
            t ? t('services.activatedSuccessMsg', 'Your professional services account is ready.') : 'Your professional services account is ready.',
          );
        }
      } else {
        Alert.alert(
          t ? t('common.error', 'Error') : 'Error',
          response?.message || 'Could not activate services. Please try again.',
        );
      }
    } catch (err) {
      Alert.alert(
        t ? t('common.error', 'Error') : 'Error',
        err?.response?.data?.message || err?.message || 'Failed to activate services.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bg }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>
          {t ? t('services.activateTitle', 'Activate Your Services') : 'Activate Your Services'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Card with generous padding and no text cutoff */}
        <LinearGradient
          colors={isDarkMode ? (isBusinessProfile ? ['#3A3018', '#261F0E'] : ['#351A5A', '#24103E']) : buttonGradient}
          style={styles.heroCard}
        >
          <Image
            source={isBusinessProfile ? HERO_FLY_GOLD : HERO_FLY_PURPLE}
            style={styles.heroImage}
            resizeMode="contain"
          />
          <Text style={styles.heroTitle}>
            {t ? t('services.activateHeroTitle', 'Turn your expertise into client bookings') : 'Turn your expertise into client bookings'}
          </Text>
          <Text style={styles.heroSub}>
            {t ? t('services.activateHeroSub', 'Offer consultations, mentorships, appointments, events, and monthly packages to your followers.') : 'Offer consultations, mentorships, appointments, events, and monthly packages to your followers.'}
          </Text>
        </LinearGradient>

        {/* Form Inputs */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            {t ? t('services.providerDetails', 'Provider Details') : 'Provider Details'}
          </Text>

          {/* Headline */}
          <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, { color: textColor }]}>
              {t ? t('services.headlineLabel', 'Professional Headline') : 'Professional Headline'}
            </Text>
            <TextInput
              value={headline}
              onChangeText={setHeadline}
              placeholder="e.g. CEO | Mentor | Business Consultant"
              placeholderTextColor={mutedColor}
              style={[styles.input, { color: textColor, borderColor: border, backgroundColor: isDarkMode ? '#241D30' : '#FBF9FE' }]}
              maxLength={120}
            />
          </View>

          {/* About */}
          <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, { color: textColor }]}>
              {t ? t('services.aboutLabel', 'About You & Your Services') : 'About You & Your Services'}
            </Text>
            <TextInput
              value={about}
              onChangeText={setAbout}
              placeholder="Describe how you help clients achieve their goals..."
              placeholderTextColor={mutedColor}
              style={[styles.textArea, { color: textColor, borderColor: border, backgroundColor: isDarkMode ? '#241D30' : '#FBF9FE' }]}
              multiline
              numberOfLines={4}
              maxLength={1000}
            />
          </View>

          {/* Timezone */}
          <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, { color: textColor }]}>
              {t ? t('services.timezoneLabel', 'Timezone') : 'Timezone'}
            </Text>
            <View style={[styles.timezoneRow, { borderColor: border, backgroundColor: isDarkMode ? '#241D30' : '#FBF9FE' }]}>
              <Ionicons name="globe-outline" size={18} color={brandAccent} style={{ marginRight: 8 }} />
              <TextInput
                value={timezone}
                onChangeText={setTimezone}
                style={[styles.timezoneInput, { color: textColor }]}
                placeholder="Device Timezone"
                placeholderTextColor={mutedColor}
              />
            </View>
            <Text style={[styles.hintText, { color: mutedColor }]}>
              {t ? t('services.timezoneHint', 'Used to coordinate your booking availability and calendar.') : 'Used to coordinate your booking availability and calendar.'}
            </Text>
          </View>
        </View>

        {/* Activate Button */}
        <TouchableOpacity
          activeOpacity={0.88}
          disabled={loading}
          onPress={handleActivate}
          style={styles.activateBtn}
        >
          <LinearGradient colors={buttonGradient} style={styles.activateGradient}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.activateBtnText}>
                  {t ? t('services.activateBtn', 'Activate Services Now') : 'Activate Services Now'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 40 },
  heroCard: {
    borderRadius: 22,
    paddingTop: 22,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  heroImage: { width: 62, height: 62, marginBottom: 10 },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
    paddingHorizontal: 8,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12.5,
    lineHeight: 18.5,
    textAlign: 'center',
    paddingHorizontal: 6,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 14 },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  input: {
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  textArea: {
    minHeight: 90,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  timezoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  timezoneInput: { flex: 1, fontSize: 14 },
  hintText: { fontSize: 11, marginTop: 4 },
  activateBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 4 },
  activateGradient: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activateBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
