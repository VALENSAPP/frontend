import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  createServiceDraft,
  updateService,
  setServiceAvailability,
  uploadServiceCover,
  getServiceDetails,
  publishService,
} from '../../../services/proServices';
import {
  DAYS_CONFIG,
  getDeviceTimezone,
  mapProblemFieldToStep,
  formatPriceUnit,
} from '../../../services/proServices/helpers';

export default function ConsultationFlow({
  colors = {},
  isDarkMode = false,
  isBusinessProfile = false,
  t,
  onBack,
  onFinish,
  initialServiceId = null,
  userProfilePic,
}) {
  // Step: 1 = Create, 2 = Details & Availability, 3 = Review, 4 = All Set
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState(initialServiceId);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Form State - Step 1
  const [title, setTitle] = useState('Business Strategy Consultation');
  const [description, setDescription] = useState(
    'Get personalized expert advice to improve your business, solve challenges, and reach your goals.',
  );
  const [includedItems, setIncludedItems] = useState([
    { id: '1', text: '60 min 1:1 session', checked: true },
    { id: '2', text: 'Personalized advice', checked: true },
    { id: '3', text: 'Action plan & recommendations', checked: true },
    { id: '4', text: 'Q&A', checked: true },
    { id: '5', text: 'Follow-up summary', checked: true },
  ]);
  const [newInclusionText, setNewInclusionText] = useState('');

  // Form State - Step 2 (Details)
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [format, setFormat] = useState('ONLINE'); // 'ONLINE' | 'IN_PERSON'
  const [price, setPrice] = useState('150');
  const [address, setAddress] = useState('1750 Broadway, Suite 200');
  const [city, setCity] = useState('New York');
  const [country, setCountry] = useState('USA');
  const [contactPhone, setContactPhone] = useState('+1 212 555 0100');
  const [coverImage, setCoverImage] = useState(null);

  // Form State - Step 2 (Availability)
  const [timezone] = useState(getDeviceTimezone());
  const [selectedDays, setSelectedDays] = useState([1, 3, 5]); // Mon, Wed, Fri
  const [timeSlots, setTimeSlots] = useState([
    { start: '10:00', end: '18:00' },
  ]);

  // Review & Readiness State
  const [serviceData, setServiceData] = useState(null);
  const [readinessProblems, setReadinessProblems] = useState([]);

  const brandAccent = isBusinessProfile ? '#CBA257' : '#7C3AED';
  const buttonGradient = isBusinessProfile ? ['#B8924F', '#CBA257'] : ['#5227A3', '#402090'];
  const bg = isDarkMode ? '#110D17' : '#FAF8FD';
  const cardBg = isDarkMode ? '#1E1828' : '#FFFFFF';
  const border = isDarkMode ? 'rgba(255,255,255,0.1)' : '#EDE7F6';
  const textColor = isDarkMode ? '#F3F4F6' : '#1F2937';
  const mutedColor = isDarkMode ? '#9CA3AF' : '#6B7280';

  const toggleDay = dayOfWeek => {
    setSelectedDays(prev =>
      prev.includes(dayOfWeek) ? prev.filter(d => d !== dayOfWeek) : [...prev, dayOfWeek].sort(),
    );
  };

  const handlePickCover = async () => {
    try {
      const res = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
      if (res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        setCoverImage(asset.uri);
        if (serviceId) {
          await uploadServiceCover(serviceId, asset);
        }
      }
    } catch (_) {}
  };

  // Step 1 -> Continue
  const handleStep1Continue = async () => {
    if (!title.trim()) {
      Alert.alert(t ? t('common.error', 'Error') : 'Error', 'Please provide a consultation title.');
      return;
    }
    setLoading(true);
    try {
      const activeIncluded = includedItems.filter(i => i.checked).map(i => i.text.trim()).filter(Boolean);
      const payload = {
        type: 'CONSULTATION',
        title: title.trim(),
        description: description.trim(),
        includedItems: activeIncluded,
      };

      if (!serviceId) {
        const response = await createServiceDraft(payload);
        const data = response?.data || response;
        if (data?.id) {
          setServiceId(data.id);
        }
      } else {
        await updateService(serviceId, payload);
      }
      setStep(2);
    } catch (err) {
      Alert.alert(
        t ? t('common.error', 'Error') : 'Error',
        err?.response?.data?.message || err?.message || 'Could not save consultation.',
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 2 -> Continue
  const handleStep2Continue = async () => {
    if (!serviceId) return;
    setLoading(true);
    try {
      // 1. Update Details
      const patchData = {
        durationMinutes: Number(durationMinutes) || 60,
        format,
        price: parseFloat(price) || 0,
      };
      if (format === 'IN_PERSON') {
        patchData.address = address.trim();
        patchData.city = city.trim();
        patchData.country = country.trim();
        patchData.contactPhone = contactPhone.trim();
      }
      await updateService(serviceId, patchData);

      // 2. Update Availability
      const rules = [];
      selectedDays.forEach(dayOfWeek => {
        timeSlots.forEach(slot => {
          rules.push({ dayOfWeek, start: slot.start, end: slot.end });
        });
      });
      await setServiceAvailability(serviceId, { timezone, rules });

      // 3. Load Details for Review
      const reviewRes = await getServiceDetails(serviceId);
      const data = reviewRes?.data || reviewRes;
      setServiceData(data);
      setReadinessProblems(data?.readiness?.problems || []);

      setStep(3);
    } catch (err) {
      Alert.alert(
        t ? t('common.error', 'Error') : 'Error',
        err?.response?.data?.message || err?.message || 'Could not update details.',
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 3 -> Publish
  const handlePublish = async () => {
    if (!serviceId) return;
    setPublishing(true);
    try {
      const response = await publishService(serviceId);
      if (response?.success !== false) {
        setStep(4);
      } else {
        Alert.alert(
          t ? t('services.publishError', 'Could Not Publish') : 'Could Not Publish',
          response?.message || 'Please complete all required fields.',
        );
      }
    } catch (err) {
      Alert.alert(
        t ? t('services.publishError', 'Could Not Publish') : 'Could Not Publish',
        err?.response?.data?.message || err?.message || 'Publishing failed.',
      );
    } finally {
      setPublishing(false);
    }
  };

  const renderProgressBar = (curr, total = 3) => (
    <View style={styles.progressWrap}>
      <Text style={[styles.stepIndicatorText, { color: mutedColor }]}>
        Step {curr} of {total}
      </Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(curr / total) * 100}%`, backgroundColor: brandAccent }]} />
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (step > 1 && step < 4) setStep(step - 1);
            else onBack();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>
          {step === 4 ? 'All Set!' : 'Create Consultation'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {step < 4 && renderProgressBar(step, 3)}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── STEP 1: Title, Description, Included Items ── */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
              <Text style={[styles.cardTitle, { color: textColor }]}>Consultation Info</Text>

              <View style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, { color: textColor }]}>Consultation Title</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Business Strategy Consultation"
                  placeholderTextColor={mutedColor}
                  style={[styles.input, { color: textColor, borderColor: border }]}
                />
              </View>

              <View style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, { color: textColor }]}>Description</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What will clients get from this consultation?"
                  placeholderTextColor={mutedColor}
                  style={[styles.textArea, { color: textColor, borderColor: border }]}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>

            {/* Included Items */}
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
              <Text style={[styles.cardTitle, { color: textColor }]}>What's Included</Text>
              {includedItems.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.inclusionRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    setIncludedItems(prev =>
                      prev.map(i => (i.id === item.id ? { ...i, checked: !i.checked } : i)),
                    );
                  }}
                >
                  <Ionicons
                    name={item.checked ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={item.checked ? brandAccent : mutedColor}
                    style={{ marginRight: 10 }}
                  />
                  <Text style={[styles.inclusionText, { color: textColor }]}>{item.text}</Text>
                </TouchableOpacity>
              ))}

              <View style={styles.addInclusionRow}>
                <TextInput
                  value={newInclusionText}
                  onChangeText={setNewInclusionText}
                  placeholder="Add another item..."
                  placeholderTextColor={mutedColor}
                  style={[styles.addInclusionInput, { color: textColor, borderColor: border }]}
                />
                <TouchableOpacity
                  onPress={() => {
                    if (!newInclusionText.trim()) return;
                    setIncludedItems(prev => [
                      ...prev,
                      { id: String(Date.now()), text: newInclusionText.trim(), checked: true },
                    ]);
                    setNewInclusionText('');
                  }}
                  style={[styles.addBtn, { backgroundColor: brandAccent }]}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity activeOpacity={0.88} onPress={handleStep1Continue} disabled={loading} style={styles.actionBtn}>
              <LinearGradient colors={buttonGradient} style={styles.btnGradient}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Continue to Details</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 2: Details & Availability ── */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            {/* Format & Pricing */}
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
              <Text style={[styles.cardTitle, { color: textColor }]}>Session Details</Text>

              {/* Format Switcher */}
              <View style={styles.formatRow}>
                {['ONLINE', 'IN_PERSON'].map(f => (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setFormat(f)}
                    style={[
                      styles.formatPill,
                      {
                        backgroundColor: format === f ? brandAccent : isDarkMode ? '#241D30' : '#F3E8FF',
                        borderColor: format === f ? brandAccent : border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={f === 'ONLINE' ? 'videocam-outline' : 'location-outline'}
                      size={16}
                      color={format === f ? '#fff' : brandAccent}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={{ color: format === f ? '#fff' : textColor, fontWeight: '700', fontSize: 13 }}>
                      {f === 'ONLINE' ? 'Online Video' : 'In Person'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Duration & Price */}
              <View style={styles.dualFieldRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.fieldLabel, { color: textColor }]}>Duration (Mins)</Text>
                  <TextInput
                    value={String(durationMinutes)}
                    onChangeText={v => setDurationMinutes(parseInt(v, 10) || 0)}
                    keyboardType="number-pad"
                    style={[styles.input, { color: textColor, borderColor: border }]}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.fieldLabel, { color: textColor }]}>Price ($)</Text>
                  <TextInput
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                    style={[styles.input, { color: textColor, borderColor: border }]}
                  />
                </View>
              </View>

              {format === 'IN_PERSON' && (
                <>
                  <View style={styles.fieldWrap}>
                    <Text style={[styles.fieldLabel, { color: textColor }]}>Address</Text>
                    <TextInput value={address} onChangeText={setAddress} style={[styles.input, { color: textColor, borderColor: border }]} />
                  </View>
                  <View style={styles.dualFieldRow}>
                    <TextInput value={city} onChangeText={setCity} placeholder="City" placeholderTextColor={mutedColor} style={[styles.input, { flex: 1, marginRight: 6, color: textColor, borderColor: border }]} />
                    <TextInput value={country} onChangeText={setCountry} placeholder="Country" placeholderTextColor={mutedColor} style={[styles.input, { flex: 1, color: textColor, borderColor: border }]} />
                  </View>
                  <View style={styles.fieldWrap}>
                    <Text style={[styles.fieldLabel, { color: textColor }]}>Contact Phone (Required for In-Person)</Text>
                    <TextInput value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" style={[styles.input, { color: textColor, borderColor: border }]} />
                  </View>
                </>
              )}
            </View>

            {/* Weekly Availability */}
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
              <Text style={[styles.cardTitle, { color: textColor }]}>Weekly Availability</Text>
              <Text style={[styles.hintText, { color: mutedColor, marginBottom: 12 }]}>
                Timezone: {timezone}
              </Text>

              {/* Days Chips */}
              <View style={styles.daysRow}>
                {DAYS_CONFIG.map(d => {
                  const isSel = selectedDays.includes(d.dayOfWeek);
                  return (
                    <TouchableOpacity
                      key={d.key}
                      onPress={() => toggleDay(d.dayOfWeek)}
                      style={[
                        styles.dayChip,
                        {
                          backgroundColor: isSel ? brandAccent : isDarkMode ? '#241D30' : '#F3E8FF',
                          borderColor: isSel ? brandAccent : border,
                        },
                      ]}
                    >
                      <Text style={{ color: isSel ? '#fff' : textColor, fontWeight: '700', fontSize: 12 }}>
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Time Slot Row */}
              <View style={styles.slotRow}>
                <Ionicons name="time-outline" size={18} color={brandAccent} style={{ marginRight: 8 }} />
                <Text style={{ color: textColor, fontWeight: '600' }}>Available Hours: 10:00 AM – 6:00 PM</Text>
              </View>
            </View>

            {/* Cover Image Upload */}
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
              <Text style={[styles.cardTitle, { color: textColor }]}>Service Photo</Text>
              <TouchableOpacity onPress={handlePickCover} style={[styles.photoBox, { borderColor: border }]}>
                {coverImage ? (
                  <Image source={{ uri: coverImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Ionicons name="camera-outline" size={32} color={brandAccent} />
                    <Text style={{ color: mutedColor, fontSize: 12, marginTop: 4 }}>Tap to upload cover image</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity activeOpacity={0.88} onPress={handleStep2Continue} disabled={loading} style={styles.actionBtn}>
              <LinearGradient colors={buttonGradient} style={styles.btnGradient}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Review Consultation</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 3: Review & Publish ── */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            {/* Readiness Problems Banner */}
            {readinessProblems.length > 0 && (
              <View style={styles.problemsCard}>
                <Ionicons name="alert-circle" size={20} color="#DC2626" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.problemHeader}>Incomplete Information</Text>
                  {readinessProblems.map((p, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setStep(mapProblemFieldToStep(p.field, 'CONSULTATION'))}
                    >
                      <Text style={styles.problemText}>• {p.message} <Text style={{ textDecorationLine: 'underline' }}>(Fix)</Text></Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Review Summary Card */}
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
              <Text style={[styles.cardTitle, { color: textColor }]}>{serviceData?.title || title}</Text>
              <Text style={[styles.priceTag, { color: brandAccent }]}>
                {formatPriceUnit('SESSION', serviceData?.price || parseFloat(price))}
              </Text>

              <View style={styles.summaryItem}>
                <Ionicons name="time-outline" size={16} color={brandAccent} style={{ marginRight: 8 }} />
                <Text style={{ color: textColor }}>{serviceData?.durationMinutes || durationMinutes} minutes • {format === 'ONLINE' ? 'Online Video' : 'In Person'}</Text>
              </View>

              <Text style={[styles.summaryDesc, { color: mutedColor }]}>{serviceData?.description || description}</Text>

              <Text style={[styles.subHeading, { color: textColor }]}>Included:</Text>
              {(serviceData?.includedItems || includedItems.filter(i => i.checked).map(i => i.text)).map((inc, i) => (
                <View key={i} style={styles.summaryIncRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#16A34A" style={{ marginRight: 6 }} />
                  <Text style={{ color: textColor, fontSize: 13 }}>{inc}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity activeOpacity={0.88} onPress={handlePublish} disabled={publishing} style={styles.actionBtn}>
              <LinearGradient colors={buttonGradient} style={styles.btnGradient}>
                {publishing ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Publish Consultation</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 4: All Set! ── */}
        {step === 4 && (
          <View style={styles.allSetContainer}>
            <View style={[styles.allSetCircle, { backgroundColor: isDarkMode ? '#281F36' : '#F3E8FF' }]}>
              <Ionicons name="checkmark-circle" size={64} color="#16A34A" />
            </View>
            <Text style={[styles.allSetTitle, { color: textColor }]}>You're All Set!</Text>
            <Text style={[styles.allSetSub, { color: mutedColor }]}>
              Your consultation is published and now available on your profile for followers and clients to book.
            </Text>

            <TouchableOpacity activeOpacity={0.88} onPress={onFinish} style={[styles.actionBtn, { width: '100%', marginTop: 24 }]}>
              <LinearGradient colors={buttonGradient} style={styles.btnGradient}>
                <Text style={styles.btnText}>View My Services</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
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
  headerTitle: { fontSize: 17, fontWeight: '800' },
  progressWrap: { paddingHorizontal: 16, marginBottom: 8 },
  stepIndicatorText: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  progressTrack: { height: 4, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  stepContainer: { gap: 14 },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '700' },
  input: { height: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 14 },
  textArea: { minHeight: 80, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, textAlignVertical: 'top' },
  inclusionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  inclusionText: { fontSize: 13, fontWeight: '600' },
  addInclusionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  addInclusionInput: { flex: 1, height: 40, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, fontSize: 13, marginRight: 8 },
  addBtn: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  formatRow: { flexDirection: 'row', gap: 10, marginVertical: 6 },
  formatPill: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  dualFieldRow: { flexDirection: 'row', alignItems: 'center' },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 6 },
  dayChip: { width: 42, height: 42, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  slotRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  photoBox: { height: 120, borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  actionBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 10 },
  btnGradient: { height: 50, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  problemsCard: { flexDirection: 'row', backgroundColor: '#FEE2E2', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#FCA5A5' },
  problemHeader: { color: '#DC2626', fontWeight: '800', fontSize: 13, marginBottom: 2 },
  problemText: { color: '#B91C1C', fontSize: 12, marginTop: 2 },
  priceTag: { fontSize: 20, fontWeight: '900', marginBottom: 8 },
  summaryItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  summaryDesc: { fontSize: 13, lineHeight: 18, marginVertical: 6 },
  subHeading: { fontSize: 13, fontWeight: '800', marginTop: 8, marginBottom: 4 },
  summaryIncRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 3 },
  allSetContainer: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  allSetCircle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  allSetTitle: { fontSize: 24, fontWeight: '900', marginBottom: 8 },
  allSetSub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
