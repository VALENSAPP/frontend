import React, { useState } from 'react';
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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { saveService } from './servicesStorage';

export default function MonthlyPackageFlow({
  colors,
  isDarkMode,
  t,
  onBack,
  onFinish,
  userProfilePic,
}) {
  // Step: 1 = Create Package, 2 = Package Details, 3 = Set Availability & Capacity, 4 = Review, 5 = Checkout Demo, 6 = All Set
  const [step, setStep] = useState(1);

  // Form State
  const [packageTitle, setPackageTitle] = useState('Beauty Set');
  const [description, setDescription] = useState(
    'Monthly beauty package with everything you need to look and feel amazing. Self-care made easy!',
  );
  const [price, setPrice] = useState('199.00');
  const [inclusions, setInclusions] = useState([
    { id: '1', text: 'Hair brush', checked: true },
    { id: '2', text: '2x Nails', checked: true },
    { id: '3', text: '1x Eyebrows', checked: true },
    { id: '4', text: '1x Massage', checked: true },
    { id: '5', text: 'Exclusive content', checked: true },
    { id: '6', text: 'Priority booking', checked: true },
  ]);
  const [newInclusion, setNewInclusion] = useState('');

  // Extras
  const [hasPdf, setHasPdf] = useState(true);
  const [hasVideo, setHasVideo] = useState(true);
  const [agreedTerms, setAgreedTerms] = useState(true);

  // Availability & Capacity
  const [workingHours, setWorkingHours] = useState('09:00 AM – 06:00 PM');
  const [timeZone, setTimeZone] = useState('America/New York (EST)');
  const [sessionDuration, setSessionDuration] = useState('60 min');
  const [maxSubscribers, setMaxSubscribers] = useState(25);
  const [sessionsPerSub, setSessionsPerSub] = useState(2);
  const [selectedDays, setSelectedDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);

  // Toggles
  const [hideUnavailable, setHideUnavailable] = useState(true);
  const [preventDoubleBooking, setPreventDoubleBooking] = useState(true);
  const [syncCalendar, setSyncCalendar] = useState(true);

  const toggleDay = day => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day],
    );
  };

  const handleConfirm = async () => {
    const serviceData = {
      id: `svc_package_${Date.now()}`,
      type: 'monthly_package',
      title: packageTitle.trim() || 'Beauty Set',
      subtitle: `Monthly Package • $${price}/mo`,
      category: 'Monthly Package',
      billing: 'Monthly',
      price: price || '199.00',
      duration: sessionDuration,
      maxSubscribers,
      subscribersCount: 0,
      sessionsPerMonth: sessionsPerSub,
      availability: `${selectedDays.join(', ')} ${workingHours}`,
      included: inclusions.filter(i => i.checked).map(i => i.text),
      extras: [
        ...(hasPdf ? [{ name: 'Beauty Set Guide', size: 'PDF • 2.4 MB' }] : []),
        ...(hasVideo ? [{ name: 'Welcome Video', size: 'MP4 • 5:32' }] : []),
      ],
      status: 'active',
      createdAt: new Date().toISOString(),
      icon: 'gift-outline',
    };

    await saveService(serviceData);
    setStep(6);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Subscribe to my monthly package: ${packageTitle} on Valens! https://valens.app/packages/beauty`,
        title: packageTitle,
      });
    } catch (_) {}
  };

  const renderProgressBar = (curr, total = 5) => (
    <View style={styles.progressWrap}>
      <Text style={[styles.stepIndicatorText, { color: colors.muted }]}>
        Step {curr} of {total}
      </Text>
      <View style={styles.progressBarTrack}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={`step-${i}`}
            style={[
              styles.progressBarSegment,
              {
                backgroundColor: i < curr ? colors.accent : (isDarkMode ? colors.cardBorder : (colors.divider || (colors.isBusiness ? '#F0E2C8' : '#E9D7FD'))),
              },
            ]}
          />
        ))}
      </View>
    </View>
  );

  // STEP 1: CREATE MONTHLY PACKAGE
  if (step === 1) {
    return (
      <View style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={[styles.headerBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="chevron-back" size={22} color={colors.title} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.title }]}>Create Monthly Package</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {renderProgressBar(1, 5)}

          {/* Any type of package Highlight Card */}
          <View style={[styles.highlightCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.highlightIconCircle, { backgroundColor: colors.iconBg }]}>
              <Ionicons name="sparkles" size={18} color={colors.accent} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.highlightTitle, { color: colors.title }]}>Any type of package</Text>
              <Text style={[styles.highlightBody, { color: colors.body }]}>
                Create any kind of monthly package you want! From mentorships to beauty sets, fitness, coaching, and much more.
              </Text>
            </View>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 14 }]}>Package Title</Text>
          <TextInput
            value={packageTitle}
            onChangeText={setPackageTitle}
            placeholder="e.g. Beauty Set, Executive Coaching"
            placeholderTextColor={colors.muted}
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.title }]}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
            <Text style={[styles.fieldLabel, { color: colors.title }]}>Description</Text>
            <Text style={[styles.counterText, { color: colors.muted }]}>{description.length}/250</Text>
          </View>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What makes this package special..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={3}
            maxLength={250}
            style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.title }]}
          />

          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 16 }]}>Billing</Text>
          <View style={[styles.readOnlyField, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="calendar-outline" size={18} color={colors.accent} style={{ marginRight: 8 }} />
            <Text style={[styles.readOnlyText, { color: colors.title }]}>Monthly</Text>
            <Ionicons name="chevron-down" size={18} color={colors.muted} style={{ marginLeft: 'auto' }} />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 16 }]}>Monthly Price (USD)</Text>
          <View style={[styles.priceInputWrap, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.currencyPrefix, { color: colors.muted }]}>$</Text>
            <TextInput
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              style={[styles.priceInput, { color: colors.title }]}
            />
            <Text style={[styles.monthSuffix, { color: colors.muted }]}>/ month</Text>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 18, marginBottom: 8 }]}>
            What's Included
          </Text>
          {inclusions.map(item => (
            <TouchableOpacity
              key={item.id}
              onPress={() => {
                setInclusions(prev =>
                  prev.map(i => (i.id === item.id ? { ...i, checked: !i.checked } : i)),
                );
              }}
              style={[styles.checkItemRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            >
              <View
                style={[
                  styles.checkCircle,
                  item.checked ? { backgroundColor: colors.accent } : { borderColor: colors.cardBorder, borderWidth: 1 },
                ]}
              >
                {item.checked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <Text style={[styles.checkItemText, { color: colors.title }]}>{item.text}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.addInclusionRow}>
            <TextInput
              value={newInclusion}
              onChangeText={setNewInclusion}
              placeholder="+ Add item to package"
              placeholderTextColor={colors.muted}
              style={[styles.addInput, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.title }]}
            />
            {newInclusion.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setInclusions(prev => [...prev, { id: String(Date.now()), text: newInclusion.trim(), checked: true }]);
                  setNewInclusion('');
                }}
                style={[styles.addBtn, { backgroundColor: colors.accent }]}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>

          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 18, marginBottom: 8 }]}>
            Add Extras (Optional)
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={() => setHasPdf(!hasPdf)}
              style={[
                styles.extraUploadCard,
                {
                  backgroundColor: colors.card,
                  borderColor: hasPdf ? colors.accent : colors.cardBorder,
                  borderWidth: hasPdf ? 2 : 1,
                },
              ]}
            >
              <Ionicons name="document-text-outline" size={24} color={hasPdf ? colors.accent : colors.muted} />
              <Text style={[styles.uploadText, { color: colors.title }]}>Upload PDF</Text>
              <Text style={[styles.uploadSub, { color: colors.muted }]}>PDF, guides, manual</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setHasVideo(!hasVideo)}
              style={[
                styles.extraUploadCard,
                {
                  backgroundColor: colors.card,
                  borderColor: hasVideo ? colors.accent : colors.cardBorder,
                  borderWidth: hasVideo ? 2 : 1,
                },
              ]}
            >
              <Ionicons name="videocam-outline" size={24} color={hasVideo ? colors.accent : colors.muted} />
              <Text style={[styles.uploadText, { color: colors.title }]}>Upload Video</Text>
              <Text style={[styles.uploadSub, { color: colors.muted }]}>MP4, MOV up to 1GB</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={[styles.bottomBar, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => setStep(2)} activeOpacity={0.85} style={styles.primaryContinueBtn}>
            <LinearGradient
              colors={colors.btnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryContinueGradient}
            >
              <Text style={styles.primaryContinueText}>Continue</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // STEP 2: PACKAGE DETAILS (Review inclusions, guide files, policies)
  if (step === 2) {
    return (
      <View style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(1)} style={[styles.headerBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="chevron-back" size={22} color={colors.title} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.title }]}>Package Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {renderProgressBar(2, 5)}

          <View style={[styles.reviewHeroCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.reviewAvatarWrap}>
              <LinearGradient colors={colors.btnGradient} style={styles.avatarImg}>
                <Ionicons name="gift" size={24} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.reviewTitle, { color: colors.title }]}>{packageTitle}</Text>
              <Text style={[styles.reviewPrice, { color: colors.accent }]}>${price} / month</Text>
              <Text style={[styles.reviewSub, { color: colors.muted }]} numberOfLines={2}>
                {description}
              </Text>
            </View>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.summaryCardTitle, { color: colors.title }]}>What's Included</Text>
            {inclusions.filter(i => i.checked).map((item, idx) => (
              <View key={idx} style={styles.summaryItemRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.accent} style={{ marginRight: 8 }} />
                <Text style={[styles.summaryItemText, { color: colors.title }]}>{item.text}</Text>
              </View>
            ))}

            <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />

            {hasPdf && (
              <View style={[styles.fileDownloadItem, { backgroundColor: colors.surface }]}>
                <Ionicons name="document-text" size={20} color={colors.accent} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fileName, { color: colors.title }]}>Beauty Set Guide</Text>
                  <Text style={[styles.fileSize, { color: colors.muted }]}>PDF • 2.4 MB</Text>
                </View>
                <Ionicons name="download-outline" size={18} color={colors.accent} />
              </View>
            )}

            {hasVideo && (
              <View style={[styles.fileDownloadItem, { backgroundColor: colors.surface, marginTop: 8 }]}>
                <Ionicons name="play-circle" size={20} color={colors.accent} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fileName, { color: colors.title }]}>Welcome Video</Text>
                  <Text style={[styles.fileSize, { color: colors.muted }]}>MP4 • 5:32</Text>
                </View>
                <Ionicons name="play-outline" size={18} color={colors.accent} />
              </View>
            )}

            <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />

            <View style={styles.summaryMetaRow}>
              <Ionicons name="repeat-outline" size={18} color={colors.accent} style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.metaLabel, { color: colors.title, fontWeight: '700' }]}>Recurring monthly billing</Text>
                <Text style={[styles.metaSub, { color: colors.muted }]}>You'll be charged every month</Text>
              </View>
            </View>

            <View style={[styles.summaryMetaRow, { marginTop: 10 }]}>
              <Ionicons name="close-circle-outline" size={18} color={colors.accent} style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.metaLabel, { color: colors.title, fontWeight: '700' }]}>Cancel anytime</Text>
                <Text style={[styles.metaSub, { color: colors.muted }]}>No commitments. Cancel anytime.</Text>
              </View>
            </View>

            <View style={[styles.summaryMetaRow, { marginTop: 10 }]}>
              <Ionicons name="people-outline" size={18} color={colors.accent} style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.metaLabel, { color: colors.title, fontWeight: '700' }]}>Community access</Text>
                <Text style={[styles.metaSub, { color: colors.muted }]}>Access to Private Circle</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setAgreedTerms(!agreedTerms)}
              style={styles.termsAgreementRow}
            >
              <View style={[styles.checkCircle, agreedTerms ? { backgroundColor: colors.accent } : { borderColor: colors.cardBorder, borderWidth: 1 }]}>
                {agreedTerms && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
              </View>
              <Text style={[styles.termsText, { color: colors.title }]}>
                I agree to the Terms and Conditions
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={[styles.bottomBar, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => setStep(3)} activeOpacity={0.85} style={styles.primaryContinueBtn}>
            <LinearGradient
              colors={colors.btnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryContinueGradient}
            >
              <Text style={styles.primaryContinueText}>Continue</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // STEP 3: SET YOUR AVAILABILITY & CAPACITY
  if (step === 3) {
    return (
      <View style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(2)} style={[styles.headerBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="chevron-back" size={22} color={colors.title} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.title }]}>Set Your Availability</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {renderProgressBar(3, 5)}

          <Text style={[styles.sectionDescText, { color: colors.muted, marginVertical: 8 }]}>
            Choose when subscribers can book sessions included in this package.
          </Text>

          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 10 }]}>Available Days</Text>
          <View style={styles.daysRow}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
              const isSelected = selectedDays.includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => toggleDay(day)}
                  style={[
                    styles.dayCircle,
                    {
                      backgroundColor: isSelected ? colors.accent : colors.surface,
                      borderColor: isSelected ? colors.accent : colors.cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.dayText, { color: isSelected ? '#FFFFFF' : colors.muted }]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 16 }]}>Working Hours</Text>
          <View style={[styles.addressInputWrap, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="time-outline" size={18} color={colors.accent} style={{ marginRight: 8 }} />
            <TextInput
              value={workingHours}
              onChangeText={setWorkingHours}
              style={[styles.addressInput, { color: colors.title }]}
            />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 14 }]}>Time Zone</Text>
          <View style={[styles.readOnlyField, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="globe-outline" size={18} color={colors.accent} style={{ marginRight: 8 }} />
            <Text style={[styles.readOnlyText, { color: colors.title }]}>{timeZone}</Text>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 16 }]}>Session Duration</Text>
          <View style={styles.pillsRow}>
            {['30 min', '45 min', '60 min', '90 min'].map(d => (
              <TouchableOpacity
                key={d}
                onPress={() => setSessionDuration(d)}
                style={[
                  styles.pillOption,
                  {
                    backgroundColor: sessionDuration === d ? colors.accent : colors.card,
                    borderColor: sessionDuration === d ? colors.accent : colors.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.pillOptionText, { color: sessionDuration === d ? '#FFFFFF' : colors.title }]}>
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Maximum Subscribers Card */}
          <View style={[styles.subscribersCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, marginTop: 18 }]}>
            <Text style={[styles.fieldLabel, { color: colors.title }]}>Maximum Subscribers</Text>
            <Text style={[styles.uploadSub, { color: colors.muted, marginBottom: 10 }]}>
              How many active subscribers can purchase this package?
            </Text>

            <View style={styles.subscriberCounterRow}>
              <TouchableOpacity
                onPress={() => setMaxSubscribers(prev => Math.max(5, prev - 5))}
                style={[styles.counterBtnSquare, { backgroundColor: colors.surface }]}
              >
                <Text style={[styles.counterBtnText, { color: colors.title }]}>−</Text>
              </TouchableOpacity>

              <Text style={[styles.subscriberCountNumber, { color: colors.title }]}>{maxSubscribers}</Text>

              <TouchableOpacity
                onPress={() => setMaxSubscribers(prev => prev + 5)}
                style={[styles.counterBtnSquare, { backgroundColor: colors.surface }]}
              >
                <Text style={[styles.counterBtnText, { color: colors.title }]}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.capacitySummaryBox, { backgroundColor: colors.cardInner }]}>
              <View style={styles.capLine}>
                <Text style={[styles.capLabel, { color: colors.muted }]}>Sessions per subscriber:</Text>
                <Text style={[styles.capVal, { color: colors.title }]}>{sessionsPerSub} / month</Text>
              </View>
              <View style={styles.capLine}>
                <Text style={[styles.capLabel, { color: colors.muted }]}>Maximum subscribers:</Text>
                <Text style={[styles.capVal, { color: colors.title }]}>{maxSubscribers}</Text>
              </View>
              <View style={styles.capLine}>
                <Text style={[styles.capLabel, { color: colors.muted }]}>Total sessions available:</Text>
                <Text style={[styles.capVal, { color: colors.title }]}>{maxSubscribers * sessionsPerSub} / month</Text>
              </View>
              <View style={[styles.capacityPill, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                <Text style={styles.capacityPillText}>✓ Capacity Available</Text>
              </View>
            </View>
          </View>

          {/* Booking Rules & Toggles */}
          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 18, marginBottom: 10 }]}>
            Booking Rules & Controls
          </Text>

          <View style={[styles.toggleSettingRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={[styles.toggleSettingTitle, { color: colors.title }]}>
                Automatically hide unavailable slots
              </Text>
            </View>
            <Switch
              value={hideUnavailable}
              onValueChange={setHideUnavailable}
              trackColor={{ false: '#767577', true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.toggleSettingRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={[styles.toggleSettingTitle, { color: colors.title }]}>
                Prevent double booking
              </Text>
            </View>
            <Switch
              value={preventDoubleBooking}
              onValueChange={setPreventDoubleBooking}
              trackColor={{ false: '#767577', true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.toggleSettingRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={[styles.toggleSettingTitle, { color: colors.title }]}>
                Sync with Valens Calendar
              </Text>
            </View>
            <Switch
              value={syncCalendar}
              onValueChange={setSyncCalendar}
              trackColor={{ false: '#767577', true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
        </ScrollView>

        <View style={[styles.bottomBar, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => setStep(4)} activeOpacity={0.85} style={styles.primaryContinueBtn}>
            <LinearGradient
              colors={colors.btnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryContinueGradient}
            >
              <Text style={styles.primaryContinueText}>Continue</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // STEP 4: REVIEW PACKAGE (Confirm button!)
  if (step === 4) {
    return (
      <View style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(3)} style={[styles.headerBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="chevron-back" size={22} color={colors.title} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.title }]}>Review Package</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {renderProgressBar(4, 5)}

          <View style={[styles.reviewHeroCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.reviewAvatarWrap}>
              <LinearGradient colors={colors.btnGradient} style={styles.avatarImg}>
                <Ionicons name="gift" size={24} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.reviewTitle, { color: colors.title }]}>{packageTitle}</Text>
              <Text style={[styles.reviewPrice, { color: colors.accent }]}>${price} / month</Text>
            </View>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.summaryCardTitle, { color: colors.title }]}>What's Included</Text>
            {inclusions.filter(i => i.checked).map((item, idx) => (
              <View key={idx} style={styles.summaryItemRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.accent} style={{ marginRight: 8 }} />
                <Text style={[styles.summaryItemText, { color: colors.title }]}>{item.text}</Text>
              </View>
            ))}

            <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />

            <View style={styles.summaryMetaRow}>
              <Ionicons name="calendar-outline" size={18} color={colors.accent} style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.metaLabel, { color: colors.muted }]}>Availability:</Text>
                <Text style={[styles.metaVal, { color: colors.title }]}>
                  {selectedDays.join(', ')}{'\n'}{workingHours} ({timeZone})
                </Text>
              </View>
            </View>

            <View style={[styles.summaryMetaRow, { marginTop: 8 }]}>
              <Ionicons name="people-outline" size={18} color={colors.accent} style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.metaLabel, { color: colors.muted }]}>Subscribers Limit:</Text>
                <Text style={[styles.metaVal, { color: colors.title }]}>
                  {maxSubscribers} Max ({sessionsPerSub} sessions / month)
                </Text>
              </View>
            </View>

            <View style={[styles.summaryMetaRow, { marginTop: 8 }]}>
              <Ionicons name="refresh-outline" size={18} color={colors.accent} style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.metaLabel, { color: colors.muted }]}>Billing:</Text>
                <Text style={[styles.metaVal, { color: colors.title }]}>
                  Recurring monthly • Cancel anytime
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.bottomBar, { backgroundColor: colors.surface }]}>
          {/* USER REQUIREMENT: Changed from "Continue" to "Confirm" */}
          <TouchableOpacity onPress={() => setStep(5)} activeOpacity={0.85} style={styles.primaryContinueBtn}>
            <LinearGradient
              colors={colors.btnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryContinueGradient}
            >
              <Text style={styles.primaryContinueText}>Confirm</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // STEP 5: SUBSCRIBER CHECKOUT DEMO (Image 6 Step 6)
  if (step === 5) {
    const subtotal = parseFloat(price) || 199.00;
    const platformFee = 9.95;
    const total = (subtotal + platformFee).toFixed(2);

    return (
      <View style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(4)} style={[styles.headerBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="chevron-back" size={22} color={colors.title} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.title }]}>Checkout Preview</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={[styles.sectionDescText, { color: colors.muted, marginVertical: 8 }]}>
            Preview of what clients see when purchasing your monthly package.
          </Text>

          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.summaryCardTitle, { color: colors.title }]}>Order Summary</Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <LinearGradient colors={colors.btnGradient} style={{ width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <Ionicons name="gift" size={20} color="#FFFFFF" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[styles.reviewTitle, { color: colors.title, fontSize: 14 }]}>{packageTitle}</Text>
                <Text style={[styles.reviewSub, { color: colors.muted }]}>${price} / month • Monthly subscription</Text>
              </View>
            </View>

            <View style={styles.checkoutLine}>
              <Text style={[styles.metaLabel, { color: colors.muted }]}>Subtotal</Text>
              <Text style={[styles.metaVal, { color: colors.title }]}>${price}</Text>
            </View>

            <View style={styles.checkoutLine}>
              <Text style={[styles.metaLabel, { color: colors.muted }]}>Platform Fee</Text>
              <Text style={[styles.metaVal, { color: colors.title }]}>${platformFee.toFixed(2)}</Text>
            </View>

            <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />

            <View style={styles.checkoutLine}>
              <Text style={[styles.summaryCardTitle, { color: colors.title }]}>Total</Text>
              <Text style={[styles.summaryCardTitle, { color: colors.accent, fontSize: 18 }]}>
                ${total} / month
              </Text>
            </View>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 12 }]}>Payment Method</Text>
          <View style={[styles.paymentMethodCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="card" size={24} color="#3B82F6" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.title }]}>Visa ending in 4242</Text>
              <Text style={[styles.cardSub, { color: colors.muted }]}>Expires 04/27</Text>
            </View>
            <TouchableOpacity>
              <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 13 }}>Change</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.lockRow, { marginTop: 16 }]}>
            <Ionicons name="lock-closed" size={14} color="#22C55E" />
            <Text style={[styles.lockText, { color: colors.muted }]}>
              Secure and encrypted payment
            </Text>
          </View>
        </ScrollView>

        <View style={[styles.bottomBar, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={handleConfirm} activeOpacity={0.85} style={styles.primaryContinueBtn}>
            <LinearGradient
              colors={colors.btnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryContinueGradient}
            >
              <Text style={styles.primaryContinueText}>Publish Package & Launch</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // STEP 6: YOU'RE ALL SET! LIVE CONFIRMATION
  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={[styles.headerBtn, { backgroundColor: colors.surface }]}>
          <Ionicons name="chevron-back" size={22} color={colors.title} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.title }]}>Monthly Package is Live</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.celebrationCenter}>
          <View style={styles.confettiWrap}>
            <LinearGradient colors={colors.btnGradient} style={[styles.bigCheckCircle, { shadowColor: colors.accent }]}>
              <Ionicons name="checkmark" size={44} color="#FFFFFF" />
            </LinearGradient>
            <Ionicons name="star" size={14} color={colors.isBusiness ? '#F3E2B8' : '#C084FC'} style={{ position: 'absolute', top: 4, left: 24 }} />
            <Ionicons name="sparkles" size={18} color={colors.isBusiness ? '#DFBA74' : '#E879F9'} style={{ position: 'absolute', top: 10, right: 28 }} />
            <Ionicons name="sparkles" size={14} color={colors.isBusiness ? '#C9A15A' : '#C4B5FD'} style={{ position: 'absolute', bottom: 16, right: 20 }} />
          </View>

          <Text style={[styles.allSetTitle, { color: colors.title }]}>You're All Set!</Text>
          <Text style={[styles.allSetSubtitle, { color: colors.muted }]}>
            Your Monthly Package is live. You can start getting subscribers and growing your business.
          </Text>
        </View>

        <View style={[styles.livePreviewCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.liveCardHeaderRow}>
            <LinearGradient colors={colors.btnGradient} style={styles.avatarImg}>
              <Ionicons name="gift" size={24} color="#FFFFFF" />
            </LinearGradient>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.liveCardTitle, { color: colors.title }]}>{packageTitle}</Text>
              <Text style={[styles.liveCardPrice, { color: colors.accent }]}>${price} / month</Text>
              <Text style={[styles.liveCardSubtitle, { color: colors.muted }]}>Active • Renews every month</Text>
            </View>
          </View>

          <View style={[styles.liveInfoRow, { borderColor: colors.divider }]}>
            <Ionicons name="calendar-outline" size={18} color={colors.accent} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.liveInfoLabel, { color: colors.muted }]}>Your Calendar</Text>
              <Text style={[styles.liveInfoValue, { color: colors.title }]}>
                {selectedDays.join(', ')}{'\n'}{workingHours}
              </Text>
            </View>
          </View>

          <View style={[styles.liveInfoRow, { borderColor: colors.divider }]}>
            <Ionicons name="people-outline" size={18} color={colors.accent} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.liveInfoLabel, { color: colors.muted }]}>Capacity</Text>
              <Text style={[styles.liveInfoValue, { color: colors.title }]}>
                {maxSubscribers} Subscribers ({sessionsPerSub} Sessions per Month)
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.liveActionsWrap}>
          <TouchableOpacity onPress={onFinish} activeOpacity={0.85} style={styles.viewMyServicesBtn}>
            <LinearGradient
              colors={colors.btnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.viewMyServicesGradient}
            >
              <Text style={styles.viewMyServicesText}>View Package</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleShare} activeOpacity={0.85} style={[styles.shareServiceBtn, { borderColor: colors.cardBorder }]}>
            <Ionicons name="share-social-outline" size={18} color={colors.accent} style={{ marginRight: 8 }} />
            <Text style={[styles.shareServiceText, { color: colors.accent }]}>Share Package</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.lockRow}>
          <Ionicons name="help-circle-outline" size={14} color={colors.muted} />
          <Text style={[styles.lockText, { color: colors.muted }]}>
            Need help? We're here for you 24/7.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  progressWrap: {
    marginBottom: 16,
  },
  stepIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  progressBarTrack: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    gap: 6,
  },
  progressBarSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  highlightIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  highlightBody: {
    fontSize: 12,
    lineHeight: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  counterText: {
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  readOnlyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  priceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  currencyPrefix: {
    fontSize: 15,
    fontWeight: '700',
    marginRight: 6,
  },
  priceInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 8,
  },
  monthSuffix: {
    fontSize: 13,
    fontWeight: '600',
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  addInclusionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  addInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  extraUploadCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 14,
  },
  uploadText: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  uploadSub: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
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
  reviewHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  reviewAvatarWrap: {
    width: 50,
    height: 50,
    borderRadius: 14,
    overflow: 'hidden',
  },
  avatarImg: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  reviewPrice: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  reviewSub: {
    fontSize: 12,
    marginTop: 4,
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  summaryCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  summaryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  summaryItemText: {
    fontSize: 13,
    fontWeight: '500',
  },
  summaryDivider: {
    height: 1,
    marginVertical: 12,
  },
  fileDownloadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '700',
  },
  fileSize: {
    fontSize: 11,
  },
  summaryMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  metaLabel: {
    fontSize: 13,
  },
  metaSub: {
    fontSize: 11,
    marginTop: 2,
  },
  metaVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  termsAgreementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
  },
  termsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionDescText: {
    fontSize: 13,
    lineHeight: 18,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dayText: {
    fontSize: 11,
    fontWeight: '700',
  },
  addressInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  addressInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pillOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  pillOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  subscribersCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  subscriberCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  counterBtnSquare: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: {
    fontSize: 22,
    fontWeight: '700',
  },
  subscriberCountNumber: {
    fontSize: 28,
    fontWeight: '800',
    marginHorizontal: 24,
  },
  capacitySummaryBox: {
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  capLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  capLabel: {
    fontSize: 12,
  },
  capVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  capacityPill: {
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  capacityPillText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '700',
  },
  toggleSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  toggleSettingTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  checkoutLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardSub: {
    fontSize: 11,
    marginTop: 2,
  },
  celebrationCenter: {
    alignItems: 'center',
    marginVertical: 20,
  },
  confettiWrap: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  bigCheckCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allSetTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  allSetSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  livePreviewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  liveCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  liveCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  liveCardPrice: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  liveCardSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  liveInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  liveInfoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  liveInfoValue: {
    fontSize: 13,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  shareServiceText: {
    fontSize: 14,
    fontWeight: '700',
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  lockText: {
    fontSize: 12,
  },
});
