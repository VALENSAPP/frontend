import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Switch,
  Share,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  createServiceDraft,
  updateService,
  setServiceAvailability,
  getServiceAvailability,
  uploadServiceAttachments,
  deleteServiceAttachment,
  getServiceDetails,
  publishService,
} from '../../../services/proServices';
import {
  formatDaysPayload,
  formatPriceWithUnit,
  getDeviceTimezone,
  mapReadinessToStep,
  DAYS_MAP,
} from '../../../services/proServices/helpers';

export default function MonthlyPackageFlow({
  colors,
  isDarkMode,
  t,
  onBack,
  onFinish,
  userProfilePic,
  initialServiceId = null,
}) {
  // Step: 1 = Create Package, 2 = Package Details, 3 = Availability & Capacity, 4 = Review, 5 = All Set
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState(initialServiceId);
  const [loading, setLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);

  // Theme accents
  const brandAccent = colors?.primary?.[0] || '#7C3AED';
  const textColor = colors?.text || (isDarkMode ? '#FFFFFF' : '#111827');
  const mutedColor = colors?.textMuted || (isDarkMode ? '#9CA3AF' : '#6B7280');
  const cardBg = isDarkMode ? '#1E1B2E' : '#FFFFFF';
  const border = colors?.border || (isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)');
  const inputBg = isDarkMode ? '#252033' : '#F9FAFB';

  // Step 1: Basic Info
  const [packageTitle, setPackageTitle] = useState('Beauty Set');
  const [description, setDescription] = useState(
    'Monthly beauty package with everything you need to look and feel amazing. Self-care made easy!',
  );
  const [price, setPrice] = useState('199');
  const [includedItems, setIncludedItems] = useState([
    'Hair brush',
    '2x Nails',
    '1x Eyebrows',
    '1x Massage',
    'Exclusive content',
    'Priority booking',
  ]);
  const [newInclusion, setNewInclusion] = useState('');
  const [attachments, setAttachments] = useState([]);

  // Step 2: Package Details (Private Circle)
  const [includesPrivateCircle, setIncludesPrivateCircle] = useState(true);

  // Step 3: Availability & Booking Rules
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [sessionsPerMonth, setSessionsPerMonth] = useState(2);
  const [maxSubscribers, setMaxSubscribers] = useState(25);
  const [minNoticeHours, setMinNoticeHours] = useState(24);
  const [cancelNoticeHours, setCancelNoticeHours] = useState(12);
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const [autoHideUnavailable, setAutoHideUnavailable] = useState(true);

  const [selectedDays, setSelectedDays] = useState([1, 2, 4, 5, 6]); // Mon, Tue, Thu, Fri, Sat
  const [dayStart, setDayStart] = useState('09:00');
  const [dayEnd, setDayEnd] = useState('18:00');

  // Step 4: Review
  const [serviceDetails, setServiceDetails] = useState(null);
  const [readinessProblems, setReadinessProblems] = useState([]);

  const toggleDay = dayNum => {
    setSelectedDays(prev =>
      prev.includes(dayNum) ? prev.filter(d => d !== dayNum) : [...prev, dayNum].sort(),
    );
  };

  const addInclusion = () => {
    const trimmed = newInclusion.trim();
    if (trimmed && includedItems.length < 20) {
      setIncludedItems([...includedItems, trimmed]);
      setNewInclusion('');
    }
  };

  const removeInclusion = index => {
    setIncludedItems(includedItems.filter((_, i) => i !== index));
  };

  // STEP 1 -> STEP 2 (Create / update package draft)
  const handleStep1Continue = async () => {
    if (!packageTitle.trim()) {
      Alert.alert('Required', 'Please enter a package title.');
      return;
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      Alert.alert('Required', 'Please enter a valid monthly price.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        type: 'MONTHLY_PACKAGE',
        title: packageTitle.trim(),
        description: description.trim(),
        price: numPrice,
        includedItems: includedItems.filter(Boolean),
      };

      if (!serviceId) {
        const res = await createServiceDraft(payload);
        if (res.success && res.data?.id) {
          setServiceId(res.data.id);
          setStep(2);
        } else {
          Alert.alert('Error', res.message || 'Failed to create package draft.');
        }
      } else {
        const res = await updateService(serviceId, payload);
        if (res.success) {
          setStep(2);
        } else {
          Alert.alert('Error', res.message || 'Failed to update package draft.');
        }
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save monthly package.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2 -> STEP 3 (Save package details)
  const handleStep2Continue = async () => {
    if (!serviceId) return;
    setLoading(true);
    try {
      const res = await updateService(serviceId, {
        package: {
          includesPrivateCircle,
        },
      });
      if (res.success) {
        setStep(3);
      } else {
        Alert.alert('Error', res.message || 'Failed to update package details.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save package details.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 3 -> STEP 4 (Set availability and booking rules)
  const handleStep3Continue = async () => {
    if (!serviceId) return;
    if (selectedDays.length === 0) {
      Alert.alert('Required', 'Please select at least one available day.');
      return;
    }

    setLoading(true);
    try {
      // 1. Availability rules: repeat start/end for each selected day
      const rules = selectedDays.map(dayNum => ({
        dayOfWeek: dayNum,
        start: dayStart,
        end: dayEnd,
      }));

      const availRes = await setServiceAvailability(serviceId, {
        timezone: getDeviceTimezone(),
        rules,
      });

      if (!availRes.success) {
        Alert.alert('Warning', availRes.message || 'Failed to save availability rules.');
      }

      // 2. Package rules
      const pkgRulesRes = await updateService(serviceId, {
        durationMinutes: Number(durationMinutes) || 60,
        package: {
          includesPrivateCircle,
          sessionsPerMonth: Number(sessionsPerMonth) || 2,
          maxSubscribers: Number(maxSubscribers) || 25,
          minNoticeHours: Number(minNoticeHours) || 24,
          cancelNoticeHours: Number(cancelNoticeHours) || 12,
          bufferMinutes: Number(bufferMinutes) || 15,
          autoHideUnavailable,
        },
      });

      if (!pkgRulesRes.success) {
        Alert.alert('Error', pkgRulesRes.message || 'Failed to save package booking rules.');
        setLoading(false);
        return;
      }

      // 3. Load full service details & check readiness
      const reviewRes = await getServiceDetails(serviceId);
      if (reviewRes.success && reviewRes.data) {
        setServiceDetails(reviewRes.data);
        setReadinessProblems(reviewRes.data.readiness?.problems || []);
      }

      setStep(4);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save availability and rules.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 4 -> PUBLISH
  const handlePublish = async () => {
    if (!serviceId) return;
    setPublishLoading(true);
    try {
      const res = await publishService(serviceId);
      if (res.success) {
        setStep(5);
      } else {
        Alert.alert(
          'Cannot Publish Package',
          res.message || 'Please complete all required fields before publishing.',
        );
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to publish package.');
    } finally {
      setPublishLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Subscribe to my monthly package: ${packageTitle} on Valens!`,
      });
    } catch (_) {}
  };

  // Calculated sessions available
  const totalSessionsAvailable = (Number(sessionsPerMonth) || 0) * (Number(maxSubscribers) || 0);

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: CREATE PACKAGE
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <View style={[styles.root, { backgroundColor: cardBg }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Create Monthly Package</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.stepIndicator, { color: brandAccent }]}>STEP 1 OF 4</Text>
          <Text style={[styles.screenTitle, { color: textColor }]}>Package Overview</Text>
          <Text style={[styles.screenSub, { color: mutedColor }]}>
            Package is a recurring monthly subscription with bundled sessions and perks.
          </Text>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: textColor }]}>Package Name *</Text>
            <TextInput
              value={packageTitle}
              onChangeText={setPackageTitle}
              placeholder="e.g. Beauty Set"
              placeholderTextColor={mutedColor}
              maxLength={120}
              style={[styles.input, { color: textColor, borderColor: border, backgroundColor: inputBg }]}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: textColor }]}>Description *</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the monthly perks, items, and experience..."
              placeholderTextColor={mutedColor}
              multiline
              numberOfLines={4}
              maxLength={5000}
              style={[styles.textArea, { color: textColor, borderColor: border, backgroundColor: inputBg }]}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: textColor }]}>Monthly Price ($) *</Text>
            <View style={[styles.priceInputWrap, { borderColor: border, backgroundColor: inputBg }]}>
              <Text style={[styles.currencyPrefix, { color: brandAccent }]}>$</Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
                placeholder="199"
                placeholderTextColor={mutedColor}
                style={[styles.priceInput, { color: textColor }]}
              />
              <Text style={[styles.priceUnitTag, { color: mutedColor }]}>/ month</Text>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: textColor }]}>What's Included</Text>
            {includedItems.map((item, index) => (
              <View key={index} style={[styles.inclusionRow, { borderColor: border }]}>
                <Ionicons name="checkmark-circle" size={18} color={brandAccent} style={{ marginRight: 8 }} />
                <Text style={[styles.inclusionText, { color: textColor }]}>{item}</Text>
                <TouchableOpacity onPress={() => removeInclusion(index)}>
                  <Ionicons name="close-circle-outline" size={20} color={mutedColor} />
                </TouchableOpacity>
              </View>
            ))}

            {includedItems.length < 20 && (
              <View style={styles.addInclusionRow}>
                <TextInput
                  value={newInclusion}
                  onChangeText={setNewInclusion}
                  placeholder="Add item (e.g. 2x Nails)"
                  placeholderTextColor={mutedColor}
                  maxLength={160}
                  style={[styles.input, { flex: 1, color: textColor, borderColor: border, backgroundColor: inputBg }]}
                />
                <TouchableOpacity
                  onPress={addInclusion}
                  style={[styles.addBtn, { backgroundColor: brandAccent }]}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.88}
            disabled={loading}
            onPress={handleStep1Continue}
            style={[styles.continueBtn, { backgroundColor: brandAccent }]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.continueBtnText}>Continue to Package Details</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2: PACKAGE DETAILS (COMMUNITY ACCESS)
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <View style={[styles.root, { backgroundColor: cardBg }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Package Details</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.stepIndicator, { color: brandAccent }]}>STEP 2 OF 4</Text>
          <Text style={[styles.screenTitle, { color: textColor }]}>Community & Perks</Text>
          <Text style={[styles.screenSub, { color: mutedColor }]}>
            Grant exclusive benefits and private community space to your subscribers.
          </Text>

          <View style={[styles.toggleCard, { borderColor: border, backgroundColor: inputBg }]}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={styles.row}>
                <Ionicons name="people-circle-outline" size={22} color={brandAccent} style={{ marginRight: 8 }} />
                <Text style={[styles.toggleTitle, { color: textColor }]}>Private Circle Access</Text>
              </View>
              <Text style={[styles.toggleDesc, { color: mutedColor }]}>
                Automatically add active subscribers to your exclusive Valens Private Circle for direct discussions and updates.
              </Text>
            </View>
            <Switch
              value={includesPrivateCircle}
              onValueChange={setIncludesPrivateCircle}
              trackColor={{ false: '#D1D5DB', true: brandAccent }}
              thumbColor="#FFFFFF"
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.88}
            disabled={loading}
            onPress={handleStep2Continue}
            style={[styles.continueBtn, { backgroundColor: brandAccent, marginTop: 24 }]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.continueBtnText}>Continue to Availability & Capacity</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3: SET AVAILABILITY & CAPACITY
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 3) {
    return (
      <View style={[styles.root, { backgroundColor: cardBg }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(2)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Availability & Capacity</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.stepIndicator, { color: brandAccent }]}>STEP 3 OF 4</Text>
          <Text style={[styles.screenTitle, { color: textColor }]}>Schedule & Rules</Text>
          <Text style={[styles.screenSub, { color: mutedColor }]}>
            Set your weekly working hours, session duration, and subscriber limits.
          </Text>

          {/* Working Hours */}
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.label, { color: textColor }]}>Start Time (24h)</Text>
              <TextInput
                value={dayStart}
                onChangeText={setDayStart}
                placeholder="09:00"
                placeholderTextColor={mutedColor}
                style={[styles.input, { color: textColor, borderColor: border, backgroundColor: inputBg }]}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: textColor }]}>End Time (24h)</Text>
              <TextInput
                value={dayEnd}
                onChangeText={setDayEnd}
                placeholder="18:00"
                placeholderTextColor={mutedColor}
                style={[styles.input, { color: textColor, borderColor: border, backgroundColor: inputBg }]}
              />
            </View>
          </View>

          {/* Days */}
          <View style={[styles.formGroup, { marginTop: 14 }]}>
            <Text style={[styles.label, { color: textColor }]}>Available Days</Text>
            <View style={styles.row}>
              {Object.keys(DAYS_MAP).map(dayKey => {
                const dayNum = Number(dayKey);
                const isSelected = selectedDays.includes(dayNum);
                return (
                  <TouchableOpacity
                    key={dayNum}
                    onPress={() => toggleDay(dayNum)}
                    style={[
                      styles.dayCircle,
                      {
                        borderColor: isSelected ? brandAccent : border,
                        backgroundColor: isSelected ? brandAccent : inputBg,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: isSelected ? '#FFFFFF' : textColor,
                        fontWeight: '700',
                        fontSize: 12,
                      }}
                    >
                      {DAYS_MAP[dayNum].slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Capacity settings */}
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.label, { color: textColor }]}>Sessions/Month</Text>
              <TextInput
                value={String(sessionsPerMonth)}
                onChangeText={v => setSessionsPerMonth(v.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                style={[styles.input, { color: textColor, borderColor: border, backgroundColor: inputBg, textAlign: 'center' }]}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: textColor }]}>Max Subscribers</Text>
              <TextInput
                value={String(maxSubscribers)}
                onChangeText={v => setMaxSubscribers(v.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                style={[styles.input, { color: textColor, borderColor: border, backgroundColor: inputBg, textAlign: 'center' }]}
              />
            </View>
          </View>

          {/* Total sessions banner */}
          <View style={[styles.sessionsBanner, { backgroundColor: isDarkMode ? '#28203E' : '#F5F3FF' }]}>
            <Ionicons name="calendar-outline" size={20} color={brandAccent} style={{ marginRight: 8 }} />
            <Text style={[styles.sessionsBannerText, { color: brandAccent }]}>
              Total monthly sessions available: {totalSessionsAvailable}
            </Text>
          </View>

          {/* Notice & buffer rules */}
          <View style={[styles.row, { marginTop: 14 }]}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <Text style={[styles.subHint, { color: mutedColor }]}>Min Notice (hrs)</Text>
              <TextInput
                value={String(minNoticeHours)}
                onChangeText={v => setMinNoticeHours(v.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                style={[styles.input, { color: textColor, borderColor: border, backgroundColor: inputBg }]}
              />
            </View>

            <View style={{ flex: 1, marginHorizontal: 3 }}>
              <Text style={[styles.subHint, { color: mutedColor }]}>Cancel Notice (hrs)</Text>
              <TextInput
                value={String(cancelNoticeHours)}
                onChangeText={v => setCancelNoticeHours(v.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                style={[styles.input, { color: textColor, borderColor: border, backgroundColor: inputBg }]}
              />
            </View>

            <View style={{ flex: 1, marginLeft: 6 }}>
              <Text style={[styles.subHint, { color: mutedColor }]}>Buffer (mins)</Text>
              <TextInput
                value={String(bufferMinutes)}
                onChangeText={v => setBufferMinutes(v.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                style={[styles.input, { color: textColor, borderColor: border, backgroundColor: inputBg }]}
              />
            </View>
          </View>

          {/* Auto-hide toggle */}
          <View style={[styles.toggleCard, { borderColor: border, backgroundColor: inputBg, marginTop: 14 }]}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.toggleTitle, { color: textColor }]}>Auto-hide When Full</Text>
              <Text style={[styles.toggleDesc, { color: mutedColor }]}>
                Automatically hide booking slots when all sessions are filled.
              </Text>
            </View>
            <Switch
              value={autoHideUnavailable}
              onValueChange={setAutoHideUnavailable}
              trackColor={{ false: '#D1D5DB', true: brandAccent }}
              thumbColor="#FFFFFF"
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.88}
            disabled={loading}
            onPress={handleStep3Continue}
            style={[styles.continueBtn, { backgroundColor: brandAccent, marginTop: 24 }]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.continueBtnText}>Review Package</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 4: REVIEW PACKAGE & READINESS
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 4) {
    const canPublish = readinessProblems.length === 0;

    return (
      <View style={[styles.root, { backgroundColor: cardBg }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(3)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Review Package</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.stepIndicator, { color: brandAccent }]}>STEP 4 OF 4</Text>
          <Text style={[styles.screenTitle, { color: textColor }]}>Ready to Publish?</Text>
          <Text style={[styles.screenSub, { color: mutedColor }]}>
            Review subscription pricing, capacity rules, and readiness before going live.
          </Text>

          {/* Readiness Problems Banner */}
          {readinessProblems.length > 0 && (
            <View style={styles.warningBanner}>
              <Ionicons name="alert-circle" size={22} color="#EF4444" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.warningTitle}>Incomplete Information</Text>
                {readinessProblems.map((prob, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => {
                      const targetStep = mapReadinessToStep(prob.field);
                      setStep(targetStep);
                    }}
                  >
                    <Text style={styles.warningItem}>• {prob.message} (Tap to fix)</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Package Summary Card */}
          <View style={[styles.reviewCard, { borderColor: border, backgroundColor: inputBg }]}>
            <View style={styles.reviewHeaderRow}>
              <View style={[styles.typeBadge, { backgroundColor: brandAccent }]}>
                <Text style={styles.typeBadgeText}>MONTHLY PACKAGE</Text>
              </View>
              <Text style={[styles.programLabelText, { color: brandAccent }]}>Subscription</Text>
            </View>

            <Text style={[styles.reviewTitle, { color: textColor }]}>{packageTitle}</Text>
            <Text style={[styles.reviewDesc, { color: mutedColor }]}>{description}</Text>

            <View style={[styles.divider, { backgroundColor: border }]} />

            <View style={styles.rowBetween}>
              <Text style={[styles.reviewMetricLabel, { color: mutedColor }]}>Monthly Fee</Text>
              <Text style={[styles.reviewMetricVal, { color: textColor }]}>${price} / month</Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={[styles.reviewMetricLabel, { color: mutedColor }]}>Sessions Included</Text>
              <Text style={[styles.reviewMetricVal, { color: textColor }]}>
                {sessionsPerMonth} sessions / month
              </Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={[styles.reviewMetricLabel, { color: mutedColor }]}>Capacity</Text>
              <Text style={[styles.reviewMetricVal, { color: textColor }]}>
                Max {maxSubscribers} subscribers ({totalSessionsAvailable} sessions total)
              </Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={[styles.reviewMetricLabel, { color: mutedColor }]}>Private Circle</Text>
              <Text style={[styles.reviewMetricVal, { color: textColor }]}>
                {includesPrivateCircle ? 'Included' : 'Not Included'}
              </Text>
            </View>
          </View>

          {/* Included Deliverables */}
          <View style={[styles.reviewCard, { borderColor: border, backgroundColor: inputBg, marginTop: 14 }]}>
            <Text style={[styles.label, { color: textColor, marginBottom: 8 }]}>What's Included</Text>
            {includedItems.map((item, idx) => (
              <View key={idx} style={styles.deliverableRow}>
                <Ionicons name="checkmark-circle" size={16} color={brandAccent} style={{ marginRight: 6 }} />
                <Text style={[styles.deliverableText, { color: textColor }]}>{item}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            activeOpacity={0.88}
            disabled={publishLoading}
            onPress={handlePublish}
            style={[
              styles.continueBtn,
              {
                backgroundColor: canPublish ? brandAccent : '#9CA3AF',
                marginTop: 24,
              },
            ]}
          >
            {publishLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.continueBtnText}>
                {canPublish ? 'Publish Package' : 'Publish (Resolve Issues First)'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 5: ALL SET
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: cardBg, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
      <Ionicons name="checkmark-circle" size={80} color="#10B981" />
      <Text style={[styles.successTitle, { color: textColor }]}>Package Published!</Text>
      <Text style={[styles.successSub, { color: mutedColor }]}>
        Your monthly subscription package is now live and can be subscribed to from your profile.
      </Text>

      <TouchableOpacity
        activeOpacity={0.88}
        onPress={handleShare}
        style={[styles.shareBtn, { borderColor: brandAccent }]}
      >
        <Ionicons name="share-outline" size={18} color={brandAccent} style={{ marginRight: 6 }} />
        <Text style={[styles.shareBtnText, { color: brandAccent }]}>Share Package Link</Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onFinish}
        style={[styles.continueBtn, { backgroundColor: brandAccent, width: '100%', marginTop: 12 }]}
      >
        <Text style={styles.continueBtnText}>Go to Manage Services</Text>
      </TouchableOpacity>
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
  headerTitle: { fontSize: 18, fontWeight: '800' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  stepIndicator: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  screenTitle: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  screenSub: { fontSize: 13, lineHeight: 18, marginBottom: 18 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  subHint: { fontSize: 11, marginBottom: 4 },
  input: {
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  textArea: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  inclusionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  inclusionText: { flex: 1, fontSize: 13 },
  addInclusionRow: { flexDirection: 'row', alignItems: 'center' },
  addBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  priceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  currencyPrefix: { fontSize: 18, fontWeight: '800', marginRight: 4 },
  priceInput: { flex: 1, fontSize: 16, fontWeight: '700' },
  priceUnitTag: { fontSize: 13, fontWeight: '600' },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  toggleTitle: { fontSize: 14, fontWeight: '700' },
  toggleDesc: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  dayCircle: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  sessionsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  sessionsBannerText: { fontSize: 13, fontWeight: '700' },
  continueBtn: {
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F87171',
  },
  warningTitle: { color: '#B91C1C', fontSize: 13, fontWeight: '800', marginBottom: 2 },
  warningItem: { color: '#B91C1C', fontSize: 11, marginTop: 2 },
  reviewCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  reviewHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  typeBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  programLabelText: { fontSize: 12, fontWeight: '800' },
  reviewTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  reviewDesc: { fontSize: 12, lineHeight: 16 },
  divider: { height: 1, marginVertical: 12 },
  reviewMetricLabel: { fontSize: 12 },
  reviewMetricVal: { fontSize: 12, fontWeight: '700' },
  deliverableRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 3 },
  deliverableText: { fontSize: 12 },
  successTitle: { fontSize: 22, fontWeight: '800', marginTop: 16, marginBottom: 6 },
  successSub: { fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 24 },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    width: '100%',
    marginBottom: 8,
  },
  shareBtnText: { fontSize: 14, fontWeight: '700' },
});
