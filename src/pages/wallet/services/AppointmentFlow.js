import React, { useState } from 'react';
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

const DEFAULT_APPOINTMENT_CATEGORIES = [
  'Beauty & Aesthetics',
  'Hair & Styling',
  'Health & Wellness',
  'Fitness & Personal Training',
  'Photography & Media',
  'Home & Interior Services',
  'Other',
];

export default function AppointmentFlow({
  colors = {},
  isDarkMode = false,
  isBusinessProfile = false,
  t,
  onBack,
  onFinish,
  initialServiceId = null,
  metaCategories = [],
  userProfilePic,
}) {
  // Step: 0 = Choose Category, 1 = Create Appointment, 2 = Set Details, 3 = Availability, 4 = Review, 5 = All Set
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState(initialServiceId);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Category
  const categoriesList = metaCategories && metaCategories.length > 0 ? metaCategories : DEFAULT_APPOINTMENT_CATEGORIES;
  const [category, setCategory] = useState(categoriesList[0] || 'Beauty & Aesthetics');

  // Step 1: Info
  const [title, setTitle] = useState('Hydrafacial Treatment');
  const [description, setDescription] = useState(
    'Deep cleansing, exfoliation and hydration for glowing, healthy skin.',
  );
  const [includedItems, setIncludedItems] = useState([
    { id: '1', text: 'Skin analysis', checked: true },
    { id: '2', text: 'Hydrafacial treatment', checked: true },
    { id: '3', text: 'Moisturizing mask', checked: true },
    { id: '4', text: 'Aftercare advice', checked: true },
  ]);
  const [newInclusionText, setNewInclusionText] = useState('');

  // Step 2: Details
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [format, setFormat] = useState('IN_PERSON'); // 'IN_PERSON' | 'ONLINE'
  const [price, setPrice] = useState('150');
  const [address, setAddress] = useState('1750 Broadway, Suite 200');
  const [city, setCity] = useState('New York');
  const [country, setCountry] = useState('USA');
  const [contactPhone, setContactPhone] = useState('+1 212 555 0100');
  const [coverImage, setCoverImage] = useState(null);

  // Step 3: Availability
  const [timezone] = useState(getDeviceTimezone());
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]); // Mon-Fri
  const [timeSlots] = useState([
    { start: '10:00', end: '12:00' },
    { start: '14:00', end: '18:00' },
  ]);

  // Review
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

  // Step 0 -> Step 1
  const handleCategorySelected = () => {
    setStep(1);
  };

  // Step 1 -> Step 2
  const handleStep1Continue = async () => {
    if (!title.trim()) {
      Alert.alert(t ? t('common.error', 'Error') : 'Error', 'Please enter a title for the appointment.');
      return;
    }
    setLoading(true);
    try {
      const activeIncluded = includedItems.filter(i => i.checked).map(i => i.text.trim()).filter(Boolean);
      const payload = {
        type: 'APPOINTMENT',
        category,
        title: title.trim(),
        description: description.trim(),
        includedItems: activeIncluded,
      };

      if (!serviceId) {
        const response = await createServiceDraft(payload);
        const data = response?.data || response;
        if (data?.id) setServiceId(data.id);
      } else {
        await updateService(serviceId, payload);
      }
      setStep(2);
    } catch (err) {
      Alert.alert(
        t ? t('common.error', 'Error') : 'Error',
        err?.response?.data?.message || err?.message || 'Failed to save appointment.',
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 2 -> Step 3
  const handleStep2Continue = async () => {
    if (!serviceId) return;
    setLoading(true);
    try {
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

  // Step 3 -> Step 4 (Review)
  const handleStep3Continue = async () => {
    if (!serviceId) return;
    setLoading(true);
    try {
      const rules = [];
      selectedDays.forEach(dayOfWeek => {
        timeSlots.forEach(slot => {
          rules.push({ dayOfWeek, start: slot.start, end: slot.end });
        });
      });
      await setServiceAvailability(serviceId, { timezone, rules });

      const reviewRes = await getServiceDetails(serviceId);
      const data = reviewRes?.data || reviewRes;
      setServiceData(data);
      setReadinessProblems(data?.readiness?.problems || []);

      setStep(4);
    } catch (err) {
      Alert.alert(
        t ? t('common.error', 'Error') : 'Error',
        err?.response?.data?.message || err?.message || 'Could not save availability.',
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 4 -> Publish
  const handlePublish = async () => {
    if (!serviceId) return;
    setPublishing(true);
    try {
      const response = await publishService(serviceId);
      if (response?.success !== false) {
        setStep(5);
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

  const renderProgressBar = (curr, total = 4) => (
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
            if (step > 0 && step < 5) setStep(step - 1);
            else onBack();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>
          {step === 5 ? 'All Set!' : 'Create Appointment'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {step >= 1 && step < 5 && renderProgressBar(step, 4)}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── STEP 0: Category Selection ── */}
        {step === 0 && (
          <View style={styles.stepContainer}>
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
              <Text style={[styles.cardTitle, { color: textColor }]}>Choose Category</Text>
              <Text style={[styles.hintText, { color: mutedColor, marginBottom: 12 }]}>
                The category is required to publish and organizes your service in search.
              </Text>

              {categoriesList.map(cat => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={[
                      styles.categoryOption,
                      {
                        backgroundColor: isSelected ? (isDarkMode ? 'rgba(203,162,87,0.15)' : '#F3E8FF') : 'transparent',
                        borderColor: isSelected ? brandAccent : border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={isSelected ? brandAccent : mutedColor}
                      style={{ marginRight: 10 }}
                    />
                    <Text style={{ color: textColor, fontWeight: isSelected ? '700' : '500', fontSize: 14 }}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity activeOpacity={0.88} onPress={handleCategorySelected} style={styles.actionBtn}>
              <LinearGradient colors={buttonGradient} style={styles.btnGradient}>
                <Text style={styles.btnText}>Continue</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 1: Name, Description, Inclusions ── */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
              <Text style={[styles.cardTitle, { color: textColor }]}>Appointment Info</Text>

              <View style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, { color: textColor }]}>Category</Text>
                <View style={[styles.readOnlyPill, { borderColor: border }]}>
                  <Text style={{ color: brandAccent, fontWeight: '700' }}>{category}</Text>
                </View>
              </View>

              <View style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, { color: textColor }]}>Appointment Title</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Hydrafacial Treatment"
                  placeholderTextColor={mutedColor}
                  style={[styles.input, { color: textColor, borderColor: border }]}
                />
              </View>

              <View style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, { color: textColor }]}>Description</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe your treatment and benefits..."
                  placeholderTextColor={mutedColor}
                  style={[styles.textArea, { color: textColor, borderColor: border }]}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>

            {/* Inclusions */}
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
                  placeholder="Add item..."
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

        {/* ── STEP 2: Details (Format, Duration, Location, Phone, Price) ── */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
              <Text style={[styles.cardTitle, { color: textColor }]}>Location & Pricing</Text>

              <View style={styles.formatRow}>
                {['IN_PERSON', 'ONLINE'].map(f => (
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
                      name={f === 'IN_PERSON' ? 'location-outline' : 'videocam-outline'}
                      size={16}
                      color={format === f ? '#fff' : brandAccent}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={{ color: format === f ? '#fff' : textColor, fontWeight: '700', fontSize: 13 }}>
                      {f === 'IN_PERSON' ? 'In Person' : 'Online'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

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

            <TouchableOpacity activeOpacity={0.88} onPress={handleStep2Continue} disabled={loading} style={styles.actionBtn}>
              <LinearGradient colors={buttonGradient} style={styles.btnGradient}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Continue to Availability</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 3: Availability & Photo ── */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
              <Text style={[styles.cardTitle, { color: textColor }]}>Available Days & Hours</Text>
              <Text style={[styles.hintText, { color: mutedColor, marginBottom: 12 }]}>Timezone: {timezone}</Text>

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

              <View style={styles.slotRow}>
                <Ionicons name="time-outline" size={18} color={brandAccent} style={{ marginRight: 8 }} />
                <Text style={{ color: textColor, fontWeight: '600' }}>Time Slots: 10:00 – 12:00, 14:00 – 18:00</Text>
              </View>
            </View>

            {/* Cover Photo */}
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
              <Text style={[styles.cardTitle, { color: textColor }]}>Appointment Photo</Text>
              <TouchableOpacity onPress={handlePickCover} style={[styles.photoBox, { borderColor: border }]}>
                {coverImage ? (
                  <Image source={{ uri: coverImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Ionicons name="camera-outline" size={32} color={brandAccent} />
                    <Text style={{ color: mutedColor, fontSize: 12, marginTop: 4 }}>Upload Cover Image (Max 10 MB)</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity activeOpacity={0.88} onPress={handleStep3Continue} disabled={loading} style={styles.actionBtn}>
              <LinearGradient colors={buttonGradient} style={styles.btnGradient}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Review Appointment</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 4: Review & Publish ── */}
        {step === 4 && (
          <View style={styles.stepContainer}>
            {readinessProblems.length > 0 && (
              <View style={styles.problemsCard}>
                <Ionicons name="alert-circle" size={20} color="#DC2626" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.problemHeader}>Incomplete Information</Text>
                  {readinessProblems.map((p, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setStep(mapProblemFieldToStep(p.field, 'APPOINTMENT'))}
                    >
                      <Text style={styles.problemText}>• {p.message} <Text style={{ textDecorationLine: 'underline' }}>(Fix)</Text></Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
              <Text style={[styles.cardTitle, { color: textColor }]}>{serviceData?.title || title}</Text>
              <Text style={[styles.priceTag, { color: brandAccent }]}>
                {formatPriceUnit('SESSION', serviceData?.price || parseFloat(price))}
              </Text>

              <View style={styles.summaryItem}>
                <Ionicons name="calendar-outline" size={16} color={brandAccent} style={{ marginRight: 8 }} />
                <Text style={{ color: textColor }}>{category} • {format === 'IN_PERSON' ? 'In Person' : 'Online'}</Text>
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
                {publishing ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Publish Appointment</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 5: All Set! ── */}
        {step === 5 && (
          <View style={styles.allSetContainer}>
            <View style={[styles.allSetCircle, { backgroundColor: isDarkMode ? '#281F36' : '#F3E8FF' }]}>
              <Ionicons name="checkmark-circle" size={64} color="#16A34A" />
            </View>
            <Text style={[styles.allSetTitle, { color: textColor }]}>Appointment Published!</Text>
            <Text style={[styles.allSetSub, { color: mutedColor }]}>
              Your appointment service is live and ready for clients to book.
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
  readOnlyPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignSelf: 'flex-start' },
  categoryOption: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginVertical: 4 },
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
