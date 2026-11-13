import React, { useState } from 'react';
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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { saveService } from './servicesStorage';

export default function ConsultationFlow({
  colors,
  isDarkMode,
  t,
  onBack,
  onFinish,
  userProfilePic,
}) {
  // Step: 1 = Create Consultation, 2 = Set Details, 3 = Review, 4 = All Set
  const [step, setStep] = useState(1);

  // Form State
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
  const [duration, setDuration] = useState('60 minutes');
  const [format, setFormat] = useState('online'); // 'online' | 'in_person'
  const [address, setAddress] = useState('1750 Broadway, Suite 200, New York, NY 10019, USA');
  const [price, setPrice] = useState('150.00');
  const [selectedDays, setSelectedDays] = useState(['Mon', 'Wed', 'Fri']);
  const [availabilityTime, setAvailabilityTime] = useState('10:00 AM – 6:00 PM (EST)');

  const toggleItem = id => {
    setIncludedItems(prev =>
      prev.map(item => (item.id === id ? { ...item, checked: !item.checked } : item)),
    );
  };

  const addCustomInclusion = () => {
    if (!newInclusionText.trim()) return;
    setIncludedItems(prev => [
      ...prev,
      { id: String(Date.now()), text: newInclusionText.trim(), checked: true },
    ]);
    setNewInclusionText('');
  };

  const handleConfirm = async () => {
    const serviceData = {
      id: `svc_consultation_${Date.now()}`,
      type: 'consultation',
      title: title.trim() || 'Business Strategy Consultation',
      subtitle: `${duration} • ${format === 'online' ? 'Online' : 'In Person'}`,
      category: 'Consultation',
      duration,
      format,
      address: format === 'in_person' ? address : '',
      price: price || '150.00',
      availability: `${selectedDays.join(', ')} ${availabilityTime}`,
      included: includedItems.filter(i => i.checked).map(i => i.text),
      status: 'active',
      bookingsCount: 0,
      rating: 5.0,
      createdAt: new Date().toISOString(),
      icon: 'chatbubble-ellipses-outline',
    };

    await saveService(serviceData);
    setStep(4);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Book a Consultation: ${title} with me on Valens! https://valens.app/services/consultation`,
        title,
      });
    } catch (_) {}
  };

  const renderProgressBar = (curr, total = 4) => (
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
                backgroundColor: i < curr ? colors.accent : (isDarkMode ? '#3A2755' : '#E9D7FD'),
              },
            ]}
          />
        ))}
      </View>
    </View>
  );

  // STEP 1: CREATE CONSULTATION
  if (step === 1) {
    return (
      <View style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={[styles.headerBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="chevron-back" size={22} color={colors.title} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.title }]}>Create Consultation</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {renderProgressBar(1, 4)}

          <View style={styles.iconCircleWrap}>
            <View style={[styles.bigIconBubble, { backgroundColor: colors.iconBg }]}>
              <Ionicons name="chatbubble-ellipses" size={32} color={colors.accent} />
            </View>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.title }]}>Consultation Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Business Strategy Consultation"
            placeholderTextColor={colors.muted}
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.title }]}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
            <Text style={[styles.fieldLabel, { color: colors.title }]}>Description</Text>
            <Text style={[styles.counterText, { color: colors.muted }]}>{description.length}/500</Text>
          </View>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe what clients will gain..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={4}
            maxLength={500}
            style={[
              styles.input,
              styles.textArea,
              { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.title },
            ]}
          />

          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 18, marginBottom: 8 }]}>
            What's included?
          </Text>
          {includedItems.map(item => (
            <TouchableOpacity
              key={item.id}
              onPress={() => toggleItem(item.id)}
              activeOpacity={0.7}
              style={[
                styles.checkItemRow,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
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
              value={newInclusionText}
              onChangeText={setNewInclusionText}
              placeholder="+ Add another inclusion item"
              placeholderTextColor={colors.muted}
              style={[styles.addInput, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.title }]}
            />
            {newInclusionText.length > 0 && (
              <TouchableOpacity onPress={addCustomInclusion} style={[styles.addBtn, { backgroundColor: colors.accent }]}>
                <Ionicons name="add" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
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

  // STEP 2: SET DETAILS
  if (step === 2) {
    return (
      <View style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(1)} style={[styles.headerBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="chevron-back" size={22} color={colors.title} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.title }]}>Consultation Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {renderProgressBar(2, 4)}

          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 12 }]}>Duration</Text>
          <View style={styles.pillsRow}>
            {['30 minutes', '45 minutes', '60 minutes', '90 minutes'].map(d => (
              <TouchableOpacity
                key={d}
                onPress={() => setDuration(d)}
                style={[
                  styles.pillOption,
                  {
                    backgroundColor: duration === d ? colors.accent : colors.card,
                    borderColor: duration === d ? colors.accent : colors.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.pillOptionText, { color: duration === d ? '#FFFFFF' : colors.title }]}>
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 18 }]}>Format</Text>
          <View style={[styles.toggleContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <TouchableOpacity
              onPress={() => setFormat('online')}
              style={[styles.toggleBtn, format === 'online' && { backgroundColor: colors.accent }]}
            >
              <Ionicons
                name="globe-outline"
                size={16}
                color={format === 'online' ? '#FFFFFF' : colors.muted}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.toggleText, { color: format === 'online' ? '#FFFFFF' : colors.muted }]}>
                Online
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setFormat('in_person')}
              style={[styles.toggleBtn, format === 'in_person' && { backgroundColor: colors.accent }]}
            >
              <Ionicons
                name="location-outline"
                size={16}
                color={format === 'in_person' ? '#FFFFFF' : colors.muted}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.toggleText, { color: format === 'in_person' ? '#FFFFFF' : colors.muted }]}>
                In-person
              </Text>
            </TouchableOpacity>
          </View>

          {format === 'in_person' && (
            <View style={{ marginTop: 14 }}>
              <Text style={[styles.fieldLabel, { color: colors.title }]}>Office / Studio Address</Text>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="Enter address"
                placeholderTextColor={colors.muted}
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.title }]}
              />
            </View>
          )}

          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 18 }]}>Price</Text>
          <View style={[styles.priceInputWrap, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.currencyPrefix, { color: colors.muted }]}>USD $</Text>
            <TextInput
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              style={[styles.priceInput, { color: colors.title }]}
            />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 18 }]}>Availability</Text>
          <View style={[styles.availabilityCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Ionicons name="calendar-outline" size={18} color={colors.accent} style={{ marginRight: 8 }} />
              <Text style={[styles.availabilityTitle, { color: colors.title }]}>Days & Schedule</Text>
            </View>
            <View style={styles.daysRow}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                const isSelected = selectedDays.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => {
                      setSelectedDays(prev =>
                        prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day],
                      );
                    }}
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
            <Text style={[styles.hoursNotice, { color: colors.muted }]}>
              Available Hours: {availabilityTime}
            </Text>
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

  // STEP 3: REVIEW CONSULTATION (Button changed to "Confirm"!)
  if (step === 3) {
    return (
      <View style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(2)} style={[styles.headerBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="chevron-back" size={22} color={colors.title} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.title }]}>Review Consultation</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {renderProgressBar(3, 4)}

          {/* Hero Review Card */}
          <View style={[styles.reviewHeroCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.reviewAvatarWrap}>
              {userProfilePic ? (
                <Image source={{ uri: userProfilePic }} style={styles.avatarImg} />
              ) : (
                <LinearGradient colors={colors.btnGradient} style={styles.avatarImg}>
                  <Ionicons name="person" size={24} color="#FFFFFF" />
                </LinearGradient>
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.reviewTitle, { color: colors.title }]}>{title}</Text>
              <Text style={[styles.reviewSub, { color: colors.muted }]}>
                {duration} • {format === 'online' ? 'Online' : 'In Person'}
              </Text>
              <Text style={[styles.reviewPrice, { color: colors.accent }]}>${price}</Text>
            </View>
          </View>

          {/* What's Included Card */}
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.summaryCardTitle, { color: colors.title }]}>What's included</Text>
            {includedItems.filter(i => i.checked).map((item, idx) => (
              <View key={idx} style={styles.summaryItemRow}>
                <Ionicons name="checkmark-circle" size={17} color={colors.accent} style={{ marginRight: 10 }} />
                <Text style={[styles.summaryItemText, { color: colors.title }]}>{item.text}</Text>
              </View>
            ))}

            <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />

            <View style={styles.summaryMetaRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.accent} style={{ marginRight: 8 }} />
              <Text style={[styles.metaLabel, { color: colors.muted }]}>Availability:</Text>
              <Text style={[styles.metaVal, { color: colors.title }]}>
                {selectedDays.join(', ')} {availabilityTime}
              </Text>
            </View>

            <View style={styles.summaryMetaRow}>
              <Ionicons name="globe-outline" size={16} color={colors.accent} style={{ marginRight: 8 }} />
              <Text style={[styles.metaLabel, { color: colors.muted }]}>Format:</Text>
              <Text style={[styles.metaVal, { color: colors.title }]}>
                {format === 'online' ? 'Online Video' : 'In-Person'}
              </Text>
            </View>

            {format === 'in_person' && (
              <View style={styles.summaryMetaRow}>
                <Ionicons name="location-outline" size={16} color={colors.accent} style={{ marginRight: 8 }} />
                <Text style={[styles.metaLabel, { color: colors.muted }]}>Address:</Text>
                <Text style={[styles.metaVal, { color: colors.title }]} numberOfLines={1}>
                  {address}
                </Text>
              </View>
            )}

            <View style={styles.summaryMetaRow}>
              <Ionicons name="pricetag-outline" size={16} color={colors.accent} style={{ marginRight: 8 }} />
              <Text style={[styles.metaLabel, { color: colors.muted }]}>Price:</Text>
              <Text style={[styles.metaVal, { color: colors.accent, fontWeight: '700' }]}>
                ${price}
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.bottomBar, { backgroundColor: colors.surface }]}>
          {/* USER REQUIREMENT: Changed from "Continue" to "Confirm" */}
          <TouchableOpacity onPress={handleConfirm} activeOpacity={0.85} style={styles.primaryContinueBtn}>
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

  // STEP 4: YOU'RE ALL SET! LIVE CONFIRMATION
  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={[styles.headerBtn, { backgroundColor: colors.surface }]}>
          <Ionicons name="chevron-back" size={22} color={colors.title} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.title }]}>Consultation is Live</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.celebrationCenter}>
          <View style={styles.confettiWrap}>
            <LinearGradient colors={colors.btnGradient} style={styles.bigCheckCircle}>
              <Ionicons name="checkmark" size={44} color="#FFFFFF" />
            </LinearGradient>
            <Ionicons name="star" size={14} color="#C084FC" style={{ position: 'absolute', top: 4, left: 24 }} />
            <Ionicons name="sparkles" size={18} color="#E879F9" style={{ position: 'absolute', top: 10, right: 28 }} />
            <Ionicons name="sparkles" size={14} color="#C4B5FD" style={{ position: 'absolute', bottom: 16, right: 20 }} />
          </View>

          <Text style={[styles.allSetTitle, { color: colors.title }]}>You're all set!</Text>
          <Text style={[styles.allSetSubtitle, { color: colors.muted }]}>
            Your consultation is now live and ready to be booked.
          </Text>
        </View>

        <View style={[styles.livePreviewCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.liveCardHeaderRow}>
            <View style={styles.reviewAvatarWrap}>
              {userProfilePic ? (
                <Image source={{ uri: userProfilePic }} style={styles.avatarImg} />
              ) : (
                <LinearGradient colors={colors.btnGradient} style={styles.avatarImg}>
                  <Ionicons name="person" size={24} color="#FFFFFF" />
                </LinearGradient>
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.liveCardTitle, { color: colors.title }]}>{title}</Text>
              <Text style={[styles.liveCardSubtitle, { color: colors.muted }]}>
                {duration} • {format === 'online' ? 'Online' : 'In Person'}
              </Text>
              <Text style={[styles.liveCardPrice, { color: colors.accent }]}>${price}</Text>
            </View>
          </View>

          <View style={[styles.liveInfoRow, { borderColor: colors.divider }]}>
            <Ionicons name="calendar-outline" size={18} color={colors.accent} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.liveInfoLabel, { color: colors.muted }]}>Availability</Text>
              <Text style={[styles.liveInfoValue, { color: colors.title }]}>
                {selectedDays.join(', ')}{'\n'}{availabilityTime}
              </Text>
            </View>
          </View>

          <View style={[styles.liveInfoRow, { borderColor: colors.divider }]}>
            <Ionicons name="globe-outline" size={18} color={colors.accent} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.liveInfoLabel, { color: colors.muted }]}>Format</Text>
              <Text style={[styles.liveInfoValue, { color: colors.title }]}>
                {format === 'online' ? 'Online Video' : 'In-Person'}
              </Text>
            </View>
          </View>

          <View style={[styles.liveInfoRow, { borderColor: colors.divider }]}>
            <Ionicons name="cash-outline" size={18} color={colors.accent} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.liveInfoLabel, { color: colors.muted }]}>Price</Text>
              <Text style={[styles.liveInfoValue, { color: colors.title }]}>${price}</Text>
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
              <Text style={styles.viewMyServicesText}>View My Services</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleShare} activeOpacity={0.85} style={[styles.shareServiceBtn, { borderColor: colors.cardBorder }]}>
            <Ionicons name="share-social-outline" size={18} color={colors.accent} style={{ marginRight: 8 }} />
            <Text style={[styles.shareServiceText, { color: colors.accent }]}>Share Your Service</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.lockRow}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.muted} />
          <Text style={[styles.lockText, { color: colors.muted }]}>
            We'll notify you when someone books a session.
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
  iconCircleWrap: {
    alignItems: 'center',
    marginVertical: 14,
  },
  bigIconBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
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
    height: 100,
    textAlignVertical: 'top',
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
  toggleContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '700',
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
  availabilityCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  availabilityTitle: {
    fontSize: 14,
    fontWeight: '700',
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
  hoursNotice: {
    fontSize: 12,
    marginTop: 4,
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
  reviewHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  reviewAvatarWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  reviewSub: {
    fontSize: 12,
    marginTop: 2,
  },
  reviewPrice: {
    fontSize: 16,
    fontWeight: '800',
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
    marginVertical: 14,
  },
  summaryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  metaLabel: {
    fontSize: 13,
    marginRight: 6,
  },
  metaVal: {
    fontSize: 13,
    fontWeight: '600',
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
  liveCardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  liveCardPrice: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
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
