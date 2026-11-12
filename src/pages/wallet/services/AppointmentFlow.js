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

const APPOINTMENT_TYPES = [
  {
    id: 'beauty',
    name: 'Beauty & Aesthetics',
    desc: 'Offer beauty and aesthetic services.',
    icon: 'sparkles-outline',
    defaultTitle: 'Hydrafacial Treatment',
    defaultDesc: 'Deep cleansing, exfoliation and hydration for glowing, healthy skin. Personalized for your skin type.',
    defaultInclusions: ['Skin analysis', 'Hydrafacial treatment', 'Moisturizing mask', 'Aftercare advice'],
  },
  {
    id: 'hair',
    name: 'Hair & Styling',
    desc: 'Offer hair care, styling, and treatments.',
    icon: 'cut-outline',
    defaultTitle: 'Haircut & Professional Styling',
    defaultDesc: 'Custom wash, cut, blow-dry and professional hair styling session tailored to your face shape.',
    defaultInclusions: ['Consultation', 'Hair wash & massage', 'Precision haircut', 'Styling & finish'],
  },
  {
    id: 'nails',
    name: 'Nails',
    desc: 'Offer manicures, pedicures, and nail art.',
    icon: 'hand-left-outline',
    defaultTitle: 'Deluxe Gel Manicure & Nail Art',
    defaultDesc: 'Full nail care, cuticle treatment, gel polish application, and custom nail art.',
    defaultInclusions: ['Nail shaping', 'Cuticle care', 'Gel application', 'Nail art design'],
  },
  {
    id: 'makeup',
    name: 'Makeup',
    desc: 'Offer professional makeup services.',
    icon: 'color-palette-outline',
    defaultTitle: 'Glamour & Event Makeup',
    defaultDesc: 'Camera-ready full glam makeup for events, shoots, weddings, or special occasions.',
    defaultInclusions: ['Skin prep', 'Full face makeup', 'Lashes application', 'Setting spray'],
  },
  {
    id: 'wellness',
    name: 'Wellness',
    desc: 'Offer spa, massage, and wellness services.',
    icon: 'flower-outline',
    defaultTitle: 'Holistic Massage & Relaxation',
    defaultDesc: 'Full-body relaxation massage using organic essential oils to relieve stress and tension.',
    defaultInclusions: ['Aromatherapy', 'Deep tissue massage', 'Hot towel compress', 'Herbal tea'],
  },
  {
    id: 'custom',
    name: 'Custom Appointment',
    desc: 'Create a custom appointment type for legal, design, fitness, or other services.',
    icon: 'ellipsis-horizontal-circle-outline',
    defaultTitle: '1-on-1 Specialist Appointment',
    defaultDesc: 'Dedicated in-person or online appointment tailored to your exact needs and goals.',
    defaultInclusions: ['Initial assessment', 'Specialist treatment/session', 'Action plan', 'Follow-up tips'],
  },
];

export default function AppointmentFlow({
  colors,
  isDarkMode,
  t,
  onBack,
  onFinish,
  userProfilePic,
}) {
  // Step: 1 = Choose Category, 2 = Create Appointment, 3 = Set Details, 4 = Availability, 5 = Review, 6 = All Set
  const [step, setStep] = useState(1);

  const [selectedCategory, setSelectedCategory] = useState(APPOINTMENT_TYPES[0]);
  const [serviceName, setServiceName] = useState(APPOINTMENT_TYPES[0].defaultTitle);
  const [description, setDescription] = useState(APPOINTMENT_TYPES[0].defaultDesc);
  const [includedItems, setIncludedItems] = useState(
    APPOINTMENT_TYPES[0].defaultInclusions.map((text, idx) => ({ id: String(idx), text, checked: true })),
  );
  const [newInclusion, setNewInclusion] = useState('');

  const [sessionDuration, setSessionDuration] = useState('60 minutes');
  const [locationType, setLocationType] = useState('in_person'); // 'in_person' | 'online'
  const [address, setAddress] = useState('1750 Broadway, Suite 200, New York, NY 10019, USA');
  const [price, setPrice] = useState('150.00');

  const [selectedDays, setSelectedDays] = useState(['Mon', 'Wed', 'Fri']);
  const [timeSlots, setTimeSlots] = useState({
    Mon: ['10:00 AM – 12:00 PM', '2:00 PM – 6:00 PM'],
    Wed: ['10:00 AM – 12:00 PM', '2:00 PM – 6:00 PM'],
    Fri: ['10:00 AM – 12:00 PM', '2:00 PM – 6:00 PM'],
  });

  const handleSelectCategory = cat => {
    setSelectedCategory(cat);
    setServiceName(cat.defaultTitle);
    setDescription(cat.defaultDesc);
    setIncludedItems(cat.defaultInclusions.map((text, idx) => ({ id: String(idx), text, checked: true })));
  };

  const toggleDay = day => {
    setSelectedDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      }
      return [...prev, day];
    });
    if (!timeSlots[day]) {
      setTimeSlots(prev => ({ ...prev, [day]: ['10:00 AM – 12:00 PM', '2:00 PM – 6:00 PM'] }));
    }
  };

  const removeSlot = (day, slotIdx) => {
    setTimeSlots(prev => ({
      ...prev,
      [day]: (prev[day] || []).filter((_, idx) => idx !== slotIdx),
    }));
  };

  const addSlot = day => {
    setTimeSlots(prev => ({
      ...prev,
      [day]: [...(prev[day] || []), '1:00 PM – 4:00 PM'],
    }));
  };

  const handleConfirm = async () => {
    const serviceData = {
      id: `svc_appointment_${Date.now()}`,
      type: 'appointment',
      title: serviceName.trim() || 'Hydrafacial Treatment',
      subtitle: `${sessionDuration} • ${locationType === 'in_person' ? 'In Person' : 'Online'}`,
      category: selectedCategory.name,
      duration: sessionDuration,
      format: locationType,
      address: locationType === 'in_person' ? address : '',
      price: price || '150.00',
      availability: `${selectedDays.join(', ')} 10:00 AM – 6:00 PM`,
      included: includedItems.filter(i => i.checked).map(i => i.text),
      status: 'active',
      bookingsCount: 0,
      rating: 5.0,
      createdAt: new Date().toISOString(),
      icon: 'calendar-outline',
    };

    await saveService(serviceData);
    setStep(6);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Book ${serviceName} with me on Valens! https://valens.app/services/appointment`,
        title: serviceName,
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
                backgroundColor: i < curr ? colors.accent : (isDarkMode ? '#3A2755' : '#E9D7FD'),
              },
            ]}
          />
        ))}
      </View>
    </View>
  );

  // STEP 1: CHOOSE APPOINTMENT CATEGORY
  if (step === 1) {
    return (
      <View style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={[styles.headerBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="chevron-back" size={22} color={colors.title} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.title }]}>Choose Appointment</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={[styles.stepSubHeading, { color: colors.title }]}>
            What type of appointment would you like to offer?
          </Text>

          {APPOINTMENT_TYPES.map(cat => {
            const isSelected = selectedCategory.id === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => handleSelectCategory(cat)}
                activeOpacity={0.8}
                style={[
                  styles.categoryCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: isSelected ? colors.accent : colors.cardBorder,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
              >
                <View style={[styles.catIconWrap, { backgroundColor: isSelected ? colors.accent : colors.iconBg }]}>
                  <Ionicons name={cat.icon} size={22} color={isSelected ? '#FFFFFF' : colors.accent} />
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.catTitle, { color: colors.title }]}>{cat.name}</Text>
                  <Text style={[styles.catDesc, { color: colors.muted }]}>{cat.desc}</Text>
                </View>

                {isSelected ? (
                  <View style={[styles.selectedCircle, { backgroundColor: colors.accent }]}>
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                )}
              </TouchableOpacity>
            );
          })}
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

  // STEP 2: CREATE APPOINTMENT (Title, description, inclusions)
  if (step === 2) {
    return (
      <View style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(1)} style={[styles.headerBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="chevron-back" size={22} color={colors.title} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.title }]}>Create Appointment</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {renderProgressBar(1, 4)}

          <View style={styles.iconCircleWrap}>
            <View style={[styles.bigIconBubble, { backgroundColor: colors.iconBg }]}>
              <Ionicons name={selectedCategory.icon || 'sparkles'} size={32} color={colors.accent} />
            </View>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.title }]}>Service Name</Text>
          <TextInput
            value={serviceName}
            onChangeText={setServiceName}
            placeholder="e.g. Hydrafacial Treatment"
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
            placeholder="Describe the treatment or session..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={4}
            maxLength={500}
            style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.title }]}
          />

          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 18, marginBottom: 8 }]}>
            What's included?
          </Text>
          {includedItems.map(item => (
            <TouchableOpacity
              key={item.id}
              onPress={() => {
                setIncludedItems(prev =>
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
              placeholder="+ Add another item"
              placeholderTextColor={colors.muted}
              style={[styles.addInput, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.title }]}
            />
            {newInclusion.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setIncludedItems(prev => [...prev, { id: String(Date.now()), text: newInclusion.trim(), checked: true }]);
                  setNewInclusion('');
                }}
                style={[styles.addBtn, { backgroundColor: colors.accent }]}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
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

  // STEP 3: SET DETAILS (Duration, Location, Address, Price)
  if (step === 3) {
    return (
      <View style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(2)} style={[styles.headerBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="chevron-back" size={22} color={colors.title} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.title }]}>Set Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {renderProgressBar(2, 4)}

          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 12 }]}>Session Duration</Text>
          <View style={styles.pillsRow}>
            {['30 minutes', '45 minutes', '60 minutes', '90 minutes'].map(d => (
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

          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 18 }]}>Location</Text>
          <View style={[styles.toggleContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <TouchableOpacity
              onPress={() => setLocationType('in_person')}
              style={[styles.toggleBtn, locationType === 'in_person' && { backgroundColor: colors.accent }]}
            >
              <Ionicons
                name="location-outline"
                size={16}
                color={locationType === 'in_person' ? '#FFFFFF' : colors.muted}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.toggleText, { color: locationType === 'in_person' ? '#FFFFFF' : colors.muted }]}>
                In-Person
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setLocationType('online')}
              style={[styles.toggleBtn, locationType === 'online' && { backgroundColor: colors.accent }]}
            >
              <Ionicons
                name="globe-outline"
                size={16}
                color={locationType === 'online' ? '#FFFFFF' : colors.muted}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.toggleText, { color: locationType === 'online' ? '#FFFFFF' : colors.muted }]}>
                Online
              </Text>
            </TouchableOpacity>
          </View>

          {locationType === 'in_person' && (
            <View style={{ marginTop: 14 }}>
              <Text style={[styles.fieldLabel, { color: colors.title }]}>Address (In-Person)</Text>
              <View style={[styles.addressInputWrap, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Ionicons name="location" size={18} color={colors.accent} style={{ marginRight: 8 }} />
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Enter studio or salon address"
                  placeholderTextColor={colors.muted}
                  style={[styles.addressInput, { color: colors.title }]}
                />
              </View>
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

  // STEP 4: AVAILABILITY (Days & Time slots)
  if (step === 4) {
    return (
      <View style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(3)} style={[styles.headerBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="chevron-back" size={22} color={colors.title} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.title }]}>Availability</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {renderProgressBar(3, 4)}

          <Text style={[styles.sectionDescText, { color: colors.muted, marginVertical: 8 }]}>
            Choose the days and times when you're available for appointments.
          </Text>

          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 10 }]}>Select Days</Text>
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

          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 18, marginBottom: 10 }]}>
            Set Time for Each Selected Day
          </Text>
          {selectedDays.map(day => (
            <View key={day} style={[styles.daySlotsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.daySlotTitle, { color: colors.title }]}>
                {day === 'Mon' ? 'Monday' : day === 'Wed' ? 'Wednesday' : day === 'Fri' ? 'Friday' : day}
              </Text>
              {(timeSlots[day] || ['10:00 AM – 12:00 PM', '2:00 PM – 6:00 PM']).map((slot, sIdx) => (
                <View key={sIdx} style={[styles.slotItemRow, { backgroundColor: colors.surface }]}>
                  <Ionicons name="time-outline" size={16} color={colors.accent} style={{ marginRight: 8 }} />
                  <Text style={[styles.slotTimeText, { color: colors.title }]}>{slot}</Text>
                  <TouchableOpacity onPress={() => removeSlot(day, sIdx)} style={styles.slotDeleteBtn}>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity onPress={() => addSlot(day)} style={styles.addSlotBtn}>
                <Ionicons name="add" size={16} color={colors.accent} style={{ marginRight: 6 }} />
                <Text style={[styles.addSlotText, { color: colors.accent }]}>+ Add Time Slot</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        <View style={[styles.bottomBar, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => setStep(5)} activeOpacity={0.85} style={styles.primaryContinueBtn}>
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

  // STEP 5: REVIEW APPOINTMENT (Confirm button!)
  if (step === 5) {
    return (
      <View style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(4)} style={[styles.headerBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="chevron-back" size={22} color={colors.title} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.title }]}>Review Appointment</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {renderProgressBar(4, 4)}

          <View style={[styles.reviewHeroCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.reviewAvatarWrap}>
              {userProfilePic ? (
                <Image source={{ uri: userProfilePic }} style={styles.avatarImg} />
              ) : (
                <LinearGradient colors={colors.btnGradient} style={styles.avatarImg}>
                  <Ionicons name="sparkles" size={24} color="#FFFFFF" />
                </LinearGradient>
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.reviewTitle, { color: colors.title }]}>{serviceName}</Text>
              <Text style={[styles.reviewSub, { color: colors.muted }]}>
                {sessionDuration} • {locationType === 'in_person' ? 'In-Person' : 'Online'}
              </Text>
              <Text style={[styles.reviewPrice, { color: colors.accent }]}>${price}</Text>
            </View>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.summaryCardTitle, { color: colors.title }]}>Appointment Summary</Text>

            <View style={styles.summaryMetaRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.accent} style={{ marginRight: 8 }} />
              <Text style={[styles.metaLabel, { color: colors.muted }]}>Availability:</Text>
              <Text style={[styles.metaVal, { color: colors.title }]}>
                {selectedDays.join(', ')} 10:00 AM – 6:00 PM (EST)
              </Text>
            </View>

            {locationType === 'in_person' && (
              <View style={styles.summaryMetaRow}>
                <Ionicons name="location-outline" size={16} color={colors.accent} style={{ marginRight: 8 }} />
                <Text style={[styles.metaLabel, { color: colors.muted }]}>Location:</Text>
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

            <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />
            <Text style={[styles.summaryCardTitle, { color: colors.title, fontSize: 13, marginBottom: 8 }]}>
              What's included:
            </Text>
            {includedItems.filter(i => i.checked).map((item, idx) => (
              <View key={idx} style={styles.summaryItemRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.accent} style={{ marginRight: 8 }} />
                <Text style={[styles.summaryItemText, { color: colors.title }]}>{item.text}</Text>
              </View>
            ))}
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

  // STEP 6: YOU'RE ALL SET! LIVE CONFIRMATION
  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={[styles.headerBtn, { backgroundColor: colors.surface }]}>
          <Ionicons name="chevron-back" size={22} color={colors.title} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.title }]}>Appointment is Live</Text>
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
            Your appointment service is now live and ready to be booked.
          </Text>
        </View>

        <View style={[styles.livePreviewCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.liveCardHeaderRow}>
            <View style={styles.reviewAvatarWrap}>
              {userProfilePic ? (
                <Image source={{ uri: userProfilePic }} style={styles.avatarImg} />
              ) : (
                <LinearGradient colors={colors.btnGradient} style={styles.avatarImg}>
                  <Ionicons name="sparkles" size={24} color="#FFFFFF" />
                </LinearGradient>
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.liveCardTitle, { color: colors.title }]}>{serviceName}</Text>
              <Text style={[styles.liveCardSubtitle, { color: colors.muted }]}>
                {sessionDuration} • {locationType === 'in_person' ? 'In-Person' : 'Online'}
              </Text>
              <Text style={[styles.liveCardPrice, { color: colors.accent }]}>${price}</Text>
            </View>
          </View>

          <View style={[styles.liveInfoRow, { borderColor: colors.divider }]}>
            <Ionicons name="calendar-outline" size={18} color={colors.accent} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.liveInfoLabel, { color: colors.muted }]}>Availability</Text>
              <Text style={[styles.liveInfoValue, { color: colors.title }]}>
                {selectedDays.join(', ')}{'\n'}10:00 AM – 12:00 PM, 2:00 PM – 6:00 PM
              </Text>
            </View>
          </View>

          {locationType === 'in_person' && (
            <View style={[styles.liveInfoRow, { borderColor: colors.divider }]}>
              <Ionicons name="location-outline" size={18} color={colors.accent} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.liveInfoLabel, { color: colors.muted }]}>Location</Text>
                <Text style={[styles.liveInfoValue, { color: colors.title }]}>{address}</Text>
              </View>
            </View>
          )}

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
            We'll notify you when someone books an appointment.
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
  stepSubHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  catIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  catDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  selectedCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
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
    height: 90,
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
  daySlotsCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  daySlotTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  slotItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  slotTimeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  slotDeleteBtn: {
    padding: 4,
  },
  addSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 6,
  },
  addSlotText: {
    fontSize: 13,
    fontWeight: '600',
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
