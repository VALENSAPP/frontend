import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Share,
  Platform,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  createServiceDraft,
  updateService,
  setServiceAvailability,
  getServiceAvailability,
  setGroupCohorts,
  getServiceDetails,
  publishService,
  getServiceMetaTypes,
  uploadServiceCover,
} from '../../../services/proServices';
import {
  formatDaysPayload,
  formatPriceWithUnit,
  getDeviceTimezone,
  mapReadinessToStep,
  DAYS_MAP,
} from '../../../services/proServices/helpers';

const DEFAULT_GOALS = [
  'Business Growth',
  'Leadership',
  'Strategy',
  'Career Development',
  'Marketing & Sales',
  'Personal Branding',
  'Fundraising',
  'Product Design',
];

export default function MentorshipFlow({
  colors,
  isDarkMode,
  t,
  onBack,
  onFinish,
  userProfilePic,
  initialServiceId = null,
}) {
  // Step: 1 = Create, 2 = Program Details, 3 = Session Details & Availability/Cohorts, 4 = Review, 5 = All Set
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState(initialServiceId);
  const [loading, setLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);

  // Meta from backend
  const [meta, setMeta] = useState(null);

  // Theme accents
  const brandAccent = colors?.primary?.[0] || '#7C3AED';
  const textColor = colors?.text || (isDarkMode ? '#FFFFFF' : '#111827');
  const mutedColor = colors?.textMuted || (isDarkMode ? '#9CA3AF' : '#6B7280');
  const cardBg = isDarkMode ? '#1E1B2E' : '#FFFFFF';
  const border = colors?.border || (isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)');
  const inputBg = isDarkMode ? '#252033' : '#F9FAFB';

  // Step 1: Basic Info
  const [title, setTitle] = useState('Business Growth Mentorship');
  const [description, setDescription] = useState(
    '1:1 personalized mentoring to help you scale your business, clarify your strategy and achieve your goals.',
  );
  const [includedItems, setIncludedItems] = useState([
    '60 min 1:1 session',
    'Personalized advice',
    'Action plan & resources',
    'Follow-up support',
  ]);
  const [newInclusion, setNewInclusion] = useState('');

  // Step 2: Program Details
  const [mode, setMode] = useState('ONE_ON_ONE'); // 'ONE_ON_ONE' | 'GROUP'
  const [programType, setProgramType] = useState('LONG_PROGRAM'); // 'ONE_SESSION' | 'SHORT_PROGRAM' | 'LONG_PROGRAM'
  const [programLengthWeeks, setProgramLengthWeeks] = useState(12);
  const [sessionsCount, setSessionsCount] = useState(12);
  const [frequency, setFrequency] = useState('WEEKLY'); // 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM'
  const [selectedGoals, setSelectedGoals] = useState(['Business Growth', 'Leadership', 'Strategy']);
  const [customGoal, setCustomGoal] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [allowCustomStart, setAllowCustomStart] = useState(true);

  // Step 3: Session Details
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [format, setFormat] = useState('ONLINE');
  const [price, setPrice] = useState('150');

  // Availability (for 1:1)
  const [selectedDays, setSelectedDays] = useState([1, 3, 5]); // Mon, Wed, Fri
  const [dayTimes, setDayTimes] = useState({
    1: [{ start: '10:00', end: '18:00' }],
    3: [{ start: '10:00', end: '18:00' }],
    5: [{ start: '10:00', end: '18:00' }],
  });

  // Group cohorts (for GROUP mode)
  const [cohorts, setCohorts] = useState([
    {
      name: 'Spring Cohort 2027',
      startAt: new Date(Date.now() + 14 * 86400000).toISOString(),
      seats: 10,
    },
  ]);
  const [newCohortName, setNewCohortName] = useState('');

  // Step 4: Review & Readiness
  const [serviceDetails, setServiceDetails] = useState(null);
  const [readinessProblems, setReadinessProblems] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const typesRes = await getServiceMetaTypes();
        if (typesRes.success && typesRes.data) {
          setMeta(typesRes.data);
        }
      } catch (_) {}
    })();
  }, []);

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

  const toggleGoal = goal => {
    if (selectedGoals.includes(goal)) {
      setSelectedGoals(selectedGoals.filter(g => g !== goal));
    } else if (selectedGoals.length < 10) {
      setSelectedGoals([...selectedGoals, goal]);
    }
  };

  const addCustomGoal = () => {
    const trimmed = customGoal.trim();
    if (trimmed && !selectedGoals.includes(trimmed) && selectedGoals.length < 10) {
      setSelectedGoals([...selectedGoals, trimmed]);
      setCustomGoal('');
    }
  };

  const toggleDay = dayNum => {
    if (selectedDays.includes(dayNum)) {
      setSelectedDays(selectedDays.filter(d => d !== dayNum));
      const nextTimes = { ...dayTimes };
      delete nextTimes[dayNum];
      setDayTimes(nextTimes);
    } else {
      setSelectedDays([...selectedDays, dayNum].sort());
      setDayTimes({
        ...dayTimes,
        [dayNum]: [{ start: '10:00', end: '18:00' }],
      });
    }
  };

  // STEP 1 -> STEP 2 (Create draft)
  const handleStep1Continue = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a mentorship title.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        type: 'MENTORSHIP',
        title: title.trim(),
        description: description.trim(),
        includedItems: includedItems.filter(Boolean),
      };

      if (!serviceId) {
        const res = await createServiceDraft(payload);
        if (res.success && res.data?.id) {
          setServiceId(res.data.id);
          setStep(2);
        } else {
          Alert.alert('Error', res.message || 'Failed to create mentorship draft.');
        }
      } else {
        const res = await updateService(serviceId, payload);
        if (res.success) {
          setStep(2);
        } else {
          Alert.alert('Error', res.message || 'Failed to update mentorship.');
        }
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save mentorship draft.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2 -> STEP 3 (Save program details)
  const handleStep2Continue = async () => {
    if (!serviceId) return;
    setLoading(true);
    try {
      const mentorshipObj = {
        mode,
        programType,
        programLengthWeeks: Number(programLengthWeeks) || 12,
        sessionsCount: Number(sessionsCount) || 12,
        frequency,
        goals: selectedGoals,
        allowCustomStart: mode === 'ONE_ON_ONE' ? Boolean(allowCustomStart) : false,
      };

      if (mode === 'GROUP') {
        mentorshipObj.maxParticipants = Number(maxParticipants) || 10;
        mentorshipObj.allowCustomStart = false;
      }

      const res = await updateService(serviceId, { mentorship: mentorshipObj });
      if (res.success) {
        setStep(3);
      } else {
        Alert.alert('Error', res.message || 'Failed to update program details.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save program details.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 3 -> STEP 4 (Save details & availability / cohorts)
  const handleStep3Continue = async () => {
    if (!serviceId) return;
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      Alert.alert('Required', 'Please enter a valid price per session.');
      return;
    }

    setLoading(true);
    try {
      // 1. Update session format & price
      const detailsRes = await updateService(serviceId, {
        durationMinutes: Number(durationMinutes) || 60,
        format,
        price: numPrice,
      });

      if (!detailsRes.success) {
        Alert.alert('Error', detailsRes.message || 'Failed to update session details.');
        setLoading(false);
        return;
      }

      // 2. Set Availability (1:1) or Cohorts (GROUP)
      if (mode === 'ONE_ON_ONE') {
        // Explicitly persist allowCustomStart: true on mentorship to guarantee server readiness
        await updateService(serviceId, {
          mentorship: {
            allowCustomStart: true,
          },
        });

        const rules = [];
        selectedDays.forEach(dayNum => {
          const slots = dayTimes[dayNum] || [{ start: '10:00', end: '18:00' }];
          slots.forEach(s => {
            rules.push({ dayOfWeek: dayNum, start: s.start, end: s.end });
          });
        });

        const availRes = await setServiceAvailability(serviceId, {
          timezone: getDeviceTimezone(),
          rules,
        });

        if (!availRes.success) {
          Alert.alert('Warning', availRes.message || 'Failed to save availability rules.');
        }
      } else {
        // Group mode: cohorts
        if (cohorts.length === 0) {
          Alert.alert('Required', 'Please add at least one cohort for group mentorship.');
          setLoading(false);
          return;
        }

        const formattedCohorts = cohorts.map(c => ({
          ...(c.id ? { id: c.id } : {}),
          startAt: c.startAt,
          seats: Number(c.seats || c.capacity || maxParticipants || 10),
        }));

        const cohortRes = await setGroupCohorts(serviceId, formattedCohorts);
        if (!cohortRes.success && cohortRes.message) {
          Alert.alert('Cohort Notice', cohortRes.message);
        }
      }

      // 3. Load full service details & check readiness
      const reviewRes = await getServiceDetails(serviceId);
      if (reviewRes.success && reviewRes.data) {
        setServiceDetails(reviewRes.data);
        setReadinessProblems(reviewRes.data.readiness?.problems || []);
      }

      setStep(4);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save session settings.');
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
          'Cannot Publish Yet',
          res.message || 'Please complete all required fields before publishing.',
        );
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to publish mentorship.');
    } finally {
      setPublishLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Book a mentorship session: ${title} on Valens!`,
      });
    } catch (_) {}
  };

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: CREATE MENTORSHIP
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <View style={[styles.root, { backgroundColor: cardBg }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Create Mentorship</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.stepIndicator, { color: brandAccent }]}>STEP 1 OF 4</Text>
          <Text style={[styles.screenTitle, { color: textColor }]}>Mentorship Overview</Text>
          <Text style={[styles.screenSub, { color: mutedColor }]}>
            Offer structured 1:1 or group mentorship to guide clients toward their personal and professional goals.
          </Text>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: textColor }]}>Mentorship Title *</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Business Growth Mentorship"
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
              placeholder="Describe the outcomes, methodology, and who this mentorship is for..."
              placeholderTextColor={mutedColor}
              multiline
              numberOfLines={4}
              maxLength={5000}
              style={[styles.textArea, { color: textColor, borderColor: border, backgroundColor: inputBg }]}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: textColor }]}>What's Included</Text>
            <Text style={[styles.subHint, { color: mutedColor }]}>
              List key deliverables, session formats, or materials provided.
            </Text>

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
                  placeholder="Add another item (e.g. Weekly Q&A)"
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
              <Text style={styles.continueBtnText}>Continue to Program Details</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2: PROGRAM DETAILS
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <View style={[styles.root, { backgroundColor: cardBg }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Program Details</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.stepIndicator, { color: brandAccent }]}>STEP 2 OF 4</Text>
          <Text style={[styles.screenTitle, { color: textColor }]}>Structure & Goals</Text>
          <Text style={[styles.screenSub, { color: mutedColor }]}>
            Define whether this is 1:1 or group, how many weeks/sessions, and primary mentorship goals.
          </Text>

          {/* 1:1 vs Group */}
          <Text style={[styles.label, { color: textColor, marginTop: 10 }]}>Mentorship Mode</Text>
          <View style={styles.row}>
            <TouchableOpacity
              onPress={() => setMode('ONE_ON_ONE')}
              style={[
                styles.optionCard,
                {
                  flex: 1,
                  marginRight: 6,
                  borderColor: mode === 'ONE_ON_ONE' ? brandAccent : border,
                  backgroundColor: mode === 'ONE_ON_ONE' ? (isDarkMode ? 'rgba(124, 58, 237, 0.15)' : 'rgba(124, 58, 237, 0.08)') : inputBg,
                },
              ]}
            >
              <Ionicons
                name="person-outline"
                size={22}
                color={mode === 'ONE_ON_ONE' ? brandAccent : mutedColor}
              />
              <Text
                style={[
                  styles.optionTitle,
                  { color: mode === 'ONE_ON_ONE' ? brandAccent : textColor },
                ]}
              >
                1:1 Mentoring
              </Text>
              <Text style={[styles.optionSub, { color: mutedColor }]}>Personal direct sessions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMode('GROUP')}
              style={[
                styles.optionCard,
                {
                  flex: 1,
                  marginLeft: 6,
                  borderColor: mode === 'GROUP' ? brandAccent : border,
                  backgroundColor: mode === 'GROUP' ? (isDarkMode ? 'rgba(124, 58, 237, 0.15)' : 'rgba(124, 58, 237, 0.08)') : inputBg,
                },
              ]}
            >
              <Ionicons
                name="people-outline"
                size={22}
                color={mode === 'GROUP' ? brandAccent : mutedColor}
              />
              <Text
                style={[
                  styles.optionTitle,
                  { color: mode === 'GROUP' ? brandAccent : textColor },
                ]}
              >
                Group Cohort
              </Text>
              <Text style={[styles.optionSub, { color: mutedColor }]}>Cohort-based batches</Text>
            </TouchableOpacity>
          </View>

          {/* Program Type */}
          <Text style={[styles.label, { color: textColor, marginTop: 18 }]}>Program Duration Structure</Text>
          <View style={styles.row}>
            {[
              { id: 'ONE_SESSION', label: 'Single Session', weeks: 1, sessions: 1 },
              { id: 'SHORT_PROGRAM', label: 'Short (4 Wks)', weeks: 4, sessions: 4 },
              { id: 'LONG_PROGRAM', label: 'Long (12 Wks)', weeks: 12, sessions: 12 },
            ].map(type => (
              <TouchableOpacity
                key={type.id}
                onPress={() => {
                  setProgramType(type.id);
                  setProgramLengthWeeks(type.weeks);
                  setSessionsCount(type.sessions);
                }}
                style={[
                  styles.pillBtn,
                  {
                    flex: 1,
                    marginHorizontal: 3,
                    borderColor: programType === type.id ? brandAccent : border,
                    backgroundColor: programType === type.id ? brandAccent : inputBg,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: programType === type.id ? '#FFFFFF' : textColor, fontSize: 11 },
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Frequency & Sessions count */}
          <View style={[styles.row, { marginTop: 14 }]}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.label, { color: textColor }]}>Frequency</Text>
              <View style={[styles.pickerWrap, { borderColor: border, backgroundColor: inputBg }]}>
                {['WEEKLY', 'BIWEEKLY', 'MONTHLY'].map(f => (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setFrequency(f)}
                    style={[
                      styles.smallChoice,
                      frequency === f && { backgroundColor: brandAccent },
                    ]}
                  >
                    <Text
                      style={{
                        color: frequency === f ? '#FFFFFF' : textColor,
                        fontSize: 11,
                        fontWeight: '700',
                      }}
                    >
                      {f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ width: 110 }}>
              <Text style={[styles.label, { color: textColor }]}>Sessions</Text>
              <TextInput
                value={String(sessionsCount)}
                onChangeText={v => setSessionsCount(v.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                style={[styles.input, { color: textColor, borderColor: border, backgroundColor: inputBg, textAlign: 'center' }]}
              />
            </View>
          </View>

          {/* Group Mentorship specific fields */}
          {mode === 'GROUP' ? (
            <View style={[styles.groupCard, { borderColor: border, backgroundColor: inputBg }]}>
              <Text style={[styles.label, { color: textColor }]}>Cohort Settings</Text>
              <View style={[styles.row, { marginTop: 8 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subHint, { color: mutedColor }]}>Max Participants per Cohort</Text>
                  <TextInput
                    value={String(maxParticipants)}
                    onChangeText={v => setMaxParticipants(v.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    style={[styles.input, { color: textColor, borderColor: border, backgroundColor: cardBg }]}
                  />
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.toggleCard, { borderColor: border, backgroundColor: inputBg, marginTop: 14 }]}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <View style={styles.row}>
                  <Ionicons name="calendar-outline" size={20} color={brandAccent} style={{ marginRight: 6 }} />
                  <Text style={[styles.label, { color: textColor, marginBottom: 0 }]}>
                    Flexible Start Date
                  </Text>
                </View>
                <Text style={[styles.subHint, { color: mutedColor, marginTop: 4 }]}>
                  Allow clients to choose their own start date upon booking based on your weekly availability.
                </Text>
              </View>
              <Switch
                value={allowCustomStart}
                onValueChange={setAllowCustomStart}
                trackColor={{ false: '#D1D5DB', true: brandAccent }}
                thumbColor="#FFFFFF"
              />
            </View>
          )}

          {/* Mentorship Goals */}
          <Text style={[styles.label, { color: textColor, marginTop: 18 }]}>
            Mentorship Goals ({selectedGoals.length}/10)
          </Text>
          <Text style={[styles.subHint, { color: mutedColor, marginBottom: 8 }]}>
            Select the key themes and skill areas covered in this program.
          </Text>

          <View style={styles.wrapRow}>
            {DEFAULT_GOALS.map(goal => {
              const active = selectedGoals.includes(goal);
              return (
                <TouchableOpacity
                  key={goal}
                  onPress={() => toggleGoal(goal)}
                  style={[
                    styles.tagChip,
                    {
                      borderColor: active ? brandAccent : border,
                      backgroundColor: active ? brandAccent : inputBg,
                    },
                  ]}
                >
                  <Text style={{ color: active ? '#FFFFFF' : textColor, fontSize: 12, fontWeight: '600' }}>
                    {goal}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom Goal */}
          {selectedGoals.length < 10 && (
            <View style={[styles.addInclusionRow, { marginTop: 8 }]}>
              <TextInput
                value={customGoal}
                onChangeText={setCustomGoal}
                placeholder="Type custom goal..."
                placeholderTextColor={mutedColor}
                style={[styles.input, { flex: 1, color: textColor, borderColor: border, backgroundColor: inputBg }]}
              />
              <TouchableOpacity
                onPress={addCustomGoal}
                style={[styles.addBtn, { backgroundColor: brandAccent }]}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            activeOpacity={0.88}
            disabled={loading}
            onPress={handleStep2Continue}
            style={[styles.continueBtn, { backgroundColor: brandAccent, marginTop: 24 }]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.continueBtnText}>Continue to Pricing & Availability</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3: SESSION DETAILS & AVAILABILITY / COHORTS
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 3) {
    return (
      <View style={[styles.root, { backgroundColor: cardBg }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(2)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Pricing & Schedule</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.stepIndicator, { color: brandAccent }]}>STEP 3 OF 4</Text>
          <Text style={[styles.screenTitle, { color: textColor }]}>Session Details & Schedule</Text>
          <Text style={[styles.screenSub, { color: mutedColor }]}>
            Price is set per session. The backend automatically calculates total program cost.
          </Text>

          {/* Duration & Format */}
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.label, { color: textColor }]}>Duration</Text>
              <View style={styles.row}>
                {[30, 60, 90].map(mins => (
                  <TouchableOpacity
                    key={mins}
                    onPress={() => setDurationMinutes(mins)}
                    style={[
                      styles.pillBtn,
                      {
                        flex: 1,
                        marginHorizontal: 2,
                        borderColor: durationMinutes === mins ? brandAccent : border,
                        backgroundColor: durationMinutes === mins ? brandAccent : inputBg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        { color: durationMinutes === mins ? '#FFFFFF' : textColor, fontSize: 11 },
                      ]}
                    >
                      {mins}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: textColor }]}>Format</Text>
              <View style={styles.row}>
                {['ONLINE', 'IN_PERSON'].map(f => (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setFormat(f)}
                    style={[
                      styles.pillBtn,
                      {
                        flex: 1,
                        marginHorizontal: 2,
                        borderColor: format === f ? brandAccent : border,
                        backgroundColor: format === f ? brandAccent : inputBg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        { color: format === f ? '#FFFFFF' : textColor, fontSize: 11 },
                      ]}
                    >
                      {f === 'ONLINE' ? 'Online' : 'In-Person'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Price per Session */}
          <View style={[styles.formGroup, { marginTop: 14 }]}>
            <Text style={[styles.label, { color: textColor }]}>Price per Session *</Text>
            <View style={[styles.priceInputWrap, { borderColor: border, backgroundColor: inputBg }]}>
              <Text style={[styles.currencyPrefix, { color: brandAccent }]}>$</Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
                placeholder="150"
                placeholderTextColor={mutedColor}
                style={[styles.priceInput, { color: textColor }]}
              />
              <Text style={[styles.priceUnitTag, { color: mutedColor }]}>/ session</Text>
            </View>
            <Text style={[styles.subHint, { color: mutedColor, marginTop: 4 }]}>
              Estimated program total: ${((parseFloat(price) || 0) * (Number(sessionsCount) || 1)).toFixed(2)} for {sessionsCount} sessions
            </Text>
          </View>

          {/* Schedule: 1:1 uses Weekly Availability; GROUP uses Cohorts */}
          {mode === 'ONE_ON_ONE' ? (
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: textColor }]}>Weekly Available Days</Text>
              <Text style={[styles.subHint, { color: mutedColor, marginBottom: 8 }]}>
                Select the days of the week you accept booking requests.
              </Text>

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
          ) : (
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: textColor }]}>Group Cohorts</Text>
              <Text style={[styles.subHint, { color: mutedColor, marginBottom: 8 }]}>
                At least one upcoming cohort is required to publish a group mentorship.
              </Text>

              {cohorts.map((c, idx) => (
                <View key={idx} style={[styles.cohortCard, { borderColor: border, backgroundColor: inputBg }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cohortTitle, { color: textColor }]}>{c.name}</Text>
                    <Text style={[styles.cohortDate, { color: mutedColor }]}>
                      Starts: {new Date(c.startAt).toLocaleDateString()} • {c.seats || c.capacity || maxParticipants} seats
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setCohorts(cohorts.filter((_, i) => i !== idx))}
                  >
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}

              <View style={[styles.addInclusionRow, { marginTop: 8 }]}>
                <TextInput
                  value={newCohortName}
                  onChangeText={setNewCohortName}
                  placeholder="New Cohort (e.g. Summer Batch)"
                  placeholderTextColor={mutedColor}
                  style={[styles.input, { flex: 1, color: textColor, borderColor: border, backgroundColor: inputBg }]}
                />
                <TouchableOpacity
                  onPress={() => {
                    if (newCohortName.trim()) {
                      const futureDate = new Date(Date.now() + (cohorts.length + 1) * 14 * 86400000).toISOString();
                      setCohorts([
                        ...cohorts,
                        {
                          name: newCohortName.trim(),
                          startAt: futureDate,
                          seats: Number(maxParticipants) || 10,
                        },
                      ]);
                      setNewCohortName('');
                    }
                  }}
                  style={[styles.addBtn, { backgroundColor: brandAccent }]}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity
            activeOpacity={0.88}
            disabled={loading}
            onPress={handleStep3Continue}
            style={[styles.continueBtn, { backgroundColor: brandAccent, marginTop: 24 }]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.continueBtnText}>Review Mentorship</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 4: REVIEW & READINESS CHECK
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 4) {
    const canPublish = readinessProblems.length === 0;

    return (
      <View style={[styles.root, { backgroundColor: cardBg }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(3)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Review Mentorship</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.stepIndicator, { color: brandAccent }]}>STEP 4 OF 4</Text>
          <Text style={[styles.screenTitle, { color: textColor }]}>Ready to Publish?</Text>
          <Text style={[styles.screenSub, { color: mutedColor }]}>
            Review your program details, pricing calculation, and publishing readiness.
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

          {/* Summary Card */}
          <View style={[styles.reviewCard, { borderColor: border, backgroundColor: inputBg }]}>
            <View style={styles.reviewHeaderRow}>
              <View style={[styles.typeBadge, { backgroundColor: brandAccent }]}>
                <Text style={styles.typeBadgeText}>MENTORSHIP</Text>
              </View>
              <Text style={[styles.programLabelText, { color: brandAccent }]}>
                {serviceDetails?.programLabel || `${programLengthWeeks}-Week Program`}
              </Text>
            </View>

            <Text style={[styles.reviewTitle, { color: textColor }]}>{title}</Text>
            <Text style={[styles.reviewDesc, { color: mutedColor }]}>{description}</Text>

            <View style={[styles.divider, { backgroundColor: border }]} />

            <View style={styles.rowBetween}>
              <Text style={[styles.reviewMetricLabel, { color: mutedColor }]}>Mode</Text>
              <Text style={[styles.reviewMetricVal, { color: textColor }]}>
                {mode === 'ONE_ON_ONE' ? '1:1 Mentorship' : `Group Cohort (${maxParticipants} max)`}
              </Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={[styles.reviewMetricLabel, { color: mutedColor }]}>Sessions</Text>
              <Text style={[styles.reviewMetricVal, { color: textColor }]}>
                {sessionsCount} sessions ({durationMinutes} mins each)
              </Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={[styles.reviewMetricLabel, { color: mutedColor }]}>Price per session</Text>
              <Text style={[styles.reviewMetricVal, { color: textColor }]}>${price}</Text>
            </View>

            <View style={[styles.rowBetween, { marginTop: 6 }]}>
              <Text style={[styles.reviewMetricLabel, { color: textColor, fontWeight: '800' }]}>
                Total Program Cost
              </Text>
              <Text style={[styles.reviewTotalPrice, { color: brandAccent }]}>
                ${serviceDetails?.totalPrice || ((parseFloat(price) || 0) * (Number(sessionsCount) || 1)).toFixed(2)}
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

          {/* Goals */}
          {selectedGoals.length > 0 && (
            <View style={[styles.reviewCard, { borderColor: border, backgroundColor: inputBg, marginTop: 14 }]}>
              <Text style={[styles.label, { color: textColor, marginBottom: 8 }]}>Program Goals</Text>
              <View style={styles.wrapRow}>
                {selectedGoals.map(g => (
                  <View key={g} style={[styles.staticGoalChip, { borderColor: border, backgroundColor: cardBg }]}>
                    <Text style={{ color: textColor, fontSize: 12 }}>{g}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

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
                {canPublish ? 'Publish Mentorship' : 'Publish (Resolve Issues First)'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 5: YOU'RE ALL SET
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: cardBg, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
      <Ionicons name="checkmark-circle" size={80} color="#10B981" />
      <Text style={[styles.successTitle, { color: textColor }]}>You're All Set!</Text>
      <Text style={[styles.successSub, { color: mutedColor }]}>
        Your mentorship program has been published and is now bookable from your profile.
      </Text>

      <TouchableOpacity
        activeOpacity={0.88}
        onPress={handleShare}
        style={[styles.shareBtn, { borderColor: brandAccent }]}
      >
        <Ionicons name="share-outline" size={18} color={brandAccent} style={{ marginRight: 6 }} />
        <Text style={[styles.shareBtnText, { color: brandAccent }]}>Share Mentorship Link</Text>
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
  subHint: { fontSize: 11, marginBottom: 6 },
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
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap' },
  optionCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  optionTitle: { fontSize: 13, fontWeight: '800', marginTop: 4 },
  optionSub: { fontSize: 10, textAlign: 'center', marginTop: 2 },
  pillBtn: {
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
  },
  pillText: { fontWeight: '700' },
  pickerWrap: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    padding: 3,
  },
  smallChoice: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
    marginBottom: 8,
  },
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
  dayCircle: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  groupCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  cohortCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
  },
  cohortTitle: { fontSize: 13, fontWeight: '700' },
  cohortDate: { fontSize: 11, marginTop: 2 },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
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
  reviewTotalPrice: { fontSize: 18, fontWeight: '800' },
  deliverableRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 3 },
  deliverableText: { fontSize: 12 },
  staticGoalChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6,
    marginBottom: 6,
  },
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
