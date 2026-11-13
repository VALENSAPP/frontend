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

const EVENT_TYPES = [
  { id: 'birthday', name: 'Birthday Party', desc: "Celebrate life's special moments.", icon: 'gift-outline' },
  { id: 'bachelorette', name: 'Bachelorette Party', desc: 'Fun, unforgettable celebrations.', icon: 'wine-outline' },
  { id: 'corporate', name: 'Corporate Event', desc: 'Conferences, meetups & networking.', icon: 'business-outline' },
  { id: 'theater', name: 'Theater / Show', desc: 'Live performances & plays.', icon: 'film-outline' },
  { id: 'nightclub', name: 'Nightclub Entry', desc: 'Party & exclusive admission.', icon: 'musical-notes-outline' },
  { id: 'concert', name: 'Concert / Festival', desc: 'Live music & festivals.', icon: 'headset-outline' },
  { id: 'workshop', name: 'Workshop / Class', desc: 'Learning & interactive events.', icon: 'school-outline' },
  { id: 'other', name: 'Other Event', desc: 'Custom event type.', icon: 'ellipsis-horizontal-circle-outline' },
];

export default function EventFlow({
  colors,
  isDarkMode,
  t,
  onBack,
  onFinish,
  userProfilePic,
}) {
  // Step: 1 = Choose Event Type, 2 = Create Event, 3 = Set Details, 4 = Tickets & Pricing, 5 = Review, 6 = All Set
  const [step, setStep] = useState(1);

  const [selectedType, setSelectedType] = useState(EVENT_TYPES[0]);
  const [eventTitle, setEventTitle] = useState('Glow Birthday Party');
  const [description, setDescription] = useState(
    "Let's celebrate my birthday with good vibes, music and unforgettable memories!",
  );
  const [location, setLocation] = useState('Luminous Lounge, 123 Party Street, Miami, FL 33101, USA');
  const [date, setDate] = useState('Saturday, June 15, 2024');
  const [startTime, setStartTime] = useState('9:00 PM');
  const [endTime, setEndTime] = useState('2:00 AM');
  const [ageRestriction, setAgeRestriction] = useState('21+');
  const [dressCode, setDressCode] = useState('Dress to impress');

  const [tickets, setTickets] = useState([
    { id: '1', type: 'Early Bird', subtitle: 'Limited time offer', price: '25.00', count: 100 },
    { id: '2', type: 'General Admission', subtitle: 'Standard entry', price: '40.00', count: 200 },
    { id: '3', type: 'VIP Access', subtitle: 'Skip the line + VIP area', price: '80.00', count: 50 },
  ]);
  const [salesStart, setSalesStart] = useState('May 1, 2024 at 10:00 AM');
  const [salesEnd, setSalesEnd] = useState('June 15, 2024 at 9:00 PM');

  const updateTicketCount = (id, delta) => {
    setTickets(prev =>
      prev.map(tk => (tk.id === id ? { ...tk, count: Math.max(10, tk.count + delta) } : tk)),
    );
  };

  const addTicketType = () => {
    const newTk = {
      id: String(Date.now()),
      type: 'VIP Table Experience',
      subtitle: 'Reserved bottle service',
      price: '150.00',
      count: 20,
    };
    setTickets(prev => [...prev, newTk]);
  };

  const handleConfirm = async () => {
    const serviceData = {
      id: `svc_event_${Date.now()}`,
      type: 'event',
      title: eventTitle.trim() || 'Glow Birthday Party',
      subtitle: `${date} • ${startTime} – ${endTime}`,
      category: selectedType.name,
      location,
      date,
      time: `${startTime} – ${endTime}`,
      ageRestriction,
      dressCode,
      tickets: tickets.map(tk => ({ type: tk.type, price: tk.price, count: tk.count, sold: 0 })),
      price: tickets[0]?.price || '40.00',
      status: 'active',
      totalSold: 0,
      createdAt: new Date().toISOString(),
      icon: 'ticket-outline',
    };

    await saveService(serviceData);
    setStep(6);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join me at ${eventTitle}! Get tickets on Valens: https://valens.app/events/glow`,
        title: eventTitle,
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
                backgroundColor: i < curr ? colors.accent : (isDarkMode ? colors.cardBorder : (colors.divider || (colors.isBusiness ? '#F0E2C8' : '#E9D7FD'))),
              },
            ]}
          />
        ))}
      </View>
    </View>
  );

  // STEP 1: CHOOSE EVENT TYPE
  if (step === 1) {
    return (
      <View style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={[styles.headerBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="chevron-back" size={22} color={colors.title} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.title }]}>Choose Event Type</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={[styles.stepSubHeading, { color: colors.title }]}>
            What type of event are you creating?
          </Text>

          <View style={styles.gridWrap}>
            {EVENT_TYPES.map(cat => {
              const isSelected = selectedType.id === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedType(cat)}
                  activeOpacity={0.8}
                  style={[
                    styles.gridItem,
                    {
                      backgroundColor: colors.card,
                      borderColor: isSelected ? colors.accent : colors.cardBorder,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  <View style={[styles.gridIconWrap, { backgroundColor: isSelected ? colors.accent : colors.iconBg }]}>
                    <Ionicons name={cat.icon} size={22} color={isSelected ? '#FFFFFF' : colors.accent} />
                  </View>
                  <Text style={[styles.gridTitle, { color: colors.title }]}>{cat.name}</Text>
                  <Text style={[styles.gridDesc, { color: colors.muted }]} numberOfLines={2}>
                    {cat.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
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

  // STEP 2: CREATE EVENT (Title, description, category, photo)
  if (step === 2) {
    return (
      <View style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(1)} style={[styles.headerBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="chevron-back" size={22} color={colors.title} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.title }]}>Create Event</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {renderProgressBar(1, 4)}

          <View style={styles.iconCircleWrap}>
            <View style={[styles.bigIconBubble, { backgroundColor: colors.iconBg }]}>
              <Ionicons name="calendar" size={32} color={colors.accent} />
            </View>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.title }]}>Event Title</Text>
          <TextInput
            value={eventTitle}
            onChangeText={setEventTitle}
            placeholder="e.g. Glow Birthday Party"
            placeholderTextColor={colors.muted}
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.title }]}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
            <Text style={[styles.fieldLabel, { color: colors.title }]}>Short Description</Text>
            <Text style={[styles.counterText, { color: colors.muted }]}>{description.length}/300</Text>
          </View>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Tell guests about your event..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={4}
            maxLength={300}
            style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.title }]}
          />

          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 16 }]}>Event Category</Text>
          <View style={[styles.readOnlyField, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.readOnlyText, { color: colors.title }]}>{selectedType.name}</Text>
            <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 16 }]}>Event Image</Text>
          <View style={[styles.imagePickerCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <LinearGradient colors={colors.btnGradient} style={styles.imagePlaceholder}>
              <Ionicons name="sparkles" size={32} color="#FFFFFF" />
              <Text style={styles.imagePlaceholderText}>Party Banner Image</Text>
            </LinearGradient>
            <TouchableOpacity style={[styles.changeImgBtn, { backgroundColor: colors.surface }]}>
              <Ionicons name="camera-outline" size={18} color={colors.title} />
              <Text style={[styles.changeImgText, { color: colors.title }]}>Change Image</Text>
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

  // STEP 3: SET DETAILS (Location, Date, Time, Age restriction, Dress code)
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

          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 12 }]}>Location</Text>
          <View style={[styles.addressInputWrap, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="location" size={18} color={colors.accent} style={{ marginRight: 8 }} />
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Venue address"
              placeholderTextColor={colors.muted}
              style={[styles.addressInput, { color: colors.title }]}
            />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 16 }]}>Date</Text>
          <View style={[styles.addressInputWrap, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="calendar-outline" size={18} color={colors.accent} style={{ marginRight: 8 }} />
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="e.g. Saturday, June 15, 2024"
              placeholderTextColor={colors.muted}
              style={[styles.addressInput, { color: colors.title }]}
            />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 16 }]}>Time</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={[styles.addressInputWrap, { flex: 1, backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Ionicons name="time-outline" size={16} color={colors.accent} style={{ marginRight: 6 }} />
              <TextInput
                value={startTime}
                onChangeText={setStartTime}
                placeholder="Start"
                placeholderTextColor={colors.muted}
                style={[styles.addressInput, { color: colors.title }]}
              />
            </View>
            <View style={{ justifyContent: 'center' }}>
              <Text style={{ color: colors.muted, fontWeight: '700' }}>to</Text>
            </View>
            <View style={[styles.addressInputWrap, { flex: 1, backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Ionicons name="time-outline" size={16} color={colors.accent} style={{ marginRight: 6 }} />
              <TextInput
                value={endTime}
                onChangeText={setEndTime}
                placeholder="End"
                placeholderTextColor={colors.muted}
                style={[styles.addressInput, { color: colors.title }]}
              />
            </View>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 16 }]}>Age Restriction</Text>
          <View style={styles.pillsRow}>
            {['All Ages', '18+', '21+'].map(a => (
              <TouchableOpacity
                key={a}
                onPress={() => setAgeRestriction(a)}
                style={[
                  styles.pillOption,
                  {
                    backgroundColor: ageRestriction === a ? colors.accent : colors.card,
                    borderColor: ageRestriction === a ? colors.accent : colors.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.pillOptionText, { color: ageRestriction === a ? '#FFFFFF' : colors.title }]}>
                  {a}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 16 }]}>Dress Code (Optional)</Text>
          <TextInput
            value={dressCode}
            onChangeText={setDressCode}
            placeholder="e.g. Dress to impress, All White, Casual"
            placeholderTextColor={colors.muted}
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.title }]}
          />
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

  // STEP 4: TICKETS & PRICING
  if (step === 4) {
    return (
      <View style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(3)} style={[styles.headerBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="chevron-back" size={22} color={colors.title} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.title }]}>Tickets & Pricing</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {renderProgressBar(3, 4)}

          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 12, marginBottom: 10 }]}>
            Ticket Types
          </Text>

          {tickets.map(tk => (
            <View key={tk.id} style={[styles.ticketTierCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.ticketTypeTitle, { color: colors.title }]}>{tk.type}</Text>
                <Text style={[styles.ticketSubtitle, { color: colors.muted }]}>{tk.subtitle}</Text>
                <Text style={[styles.ticketPrice, { color: colors.accent }]}>${tk.price}</Text>
              </View>

              {/* Quantity Counter */}
              <View style={[styles.ticketCounterWrap, { backgroundColor: colors.surface }]}>
                <TouchableOpacity onPress={() => updateTicketCount(tk.id, -25)} style={styles.counterBtn}>
                  <Text style={[styles.counterSymbol, { color: colors.title }]}>−</Text>
                </TouchableOpacity>
                <Text style={[styles.counterVal, { color: colors.title }]}>{tk.count}</Text>
                <TouchableOpacity onPress={() => updateTicketCount(tk.id, 25)} style={styles.counterBtn}>
                  <Text style={[styles.counterSymbol, { color: colors.title }]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity onPress={addTicketType} style={styles.addTicketRow}>
            <Ionicons name="add-circle-outline" size={20} color={colors.accent} style={{ marginRight: 6 }} />
            <Text style={[styles.addTicketText, { color: colors.accent }]}>+ Add Another Ticket Type</Text>
          </TouchableOpacity>

          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 20 }]}>Sales Start</Text>
          <View style={[styles.addressInputWrap, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="calendar-outline" size={18} color={colors.accent} style={{ marginRight: 8 }} />
            <TextInput
              value={salesStart}
              onChangeText={setSalesStart}
              style={[styles.addressInput, { color: colors.title }]}
            />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.title, marginTop: 14 }]}>Sales End</Text>
          <View style={[styles.addressInputWrap, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="calendar-outline" size={18} color={colors.accent} style={{ marginRight: 8 }} />
            <TextInput
              value={salesEnd}
              onChangeText={setSalesEnd}
              style={[styles.addressInput, { color: colors.title }]}
            />
          </View>
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

  // STEP 5: REVIEW EVENT (Confirm button!)
  if (step === 5) {
    return (
      <View style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(4)} style={[styles.headerBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="chevron-back" size={22} color={colors.title} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.title }]}>Review Event</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {renderProgressBar(4, 4)}

          <View style={[styles.reviewHeroCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, flexDirection: 'column', alignItems: 'flex-start' }]}>
            <LinearGradient colors={colors.btnGradient} style={styles.reviewEventBanner}>
              <Ionicons name="sparkles" size={32} color="#FFFFFF" />
              <Text style={styles.bannerEventTag}>{selectedType.name}</Text>
            </LinearGradient>

            <View style={{ width: '100%', marginTop: 12 }}>
              <Text style={[styles.reviewTitle, { color: colors.title, fontSize: 18 }]}>{eventTitle}</Text>
              <Text style={[styles.reviewSub, { color: colors.muted }]}>
                {date} • {startTime} – {endTime}
              </Text>
            </View>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.summaryMetaRow}>
              <Ionicons name="location-outline" size={18} color={colors.accent} style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.metaLabel, { color: colors.muted }]}>Location</Text>
                <Text style={[styles.metaVal, { color: colors.title }]}>{location}</Text>
              </View>
            </View>

            <View style={styles.summaryDivider, { backgroundColor: colors.divider }} />

            <Text style={[styles.summaryCardTitle, { color: colors.title, fontSize: 13, marginBottom: 8 }]}>
              Tickets & Admission
            </Text>
            {tickets.map((tk, idx) => (
              <View key={idx} style={styles.ticketSummaryLine}>
                <Text style={[styles.summaryItemText, { color: colors.title }]}>{tk.type}</Text>
                <Text style={[styles.summaryItemText, { color: colors.accent, fontWeight: '700' }]}>
                  ${tk.price} ({tk.count} tickets)
                </Text>
              </View>
            ))}

            <View style={styles.summaryDivider, { backgroundColor: colors.divider }} />

            <View style={styles.summaryMetaRow}>
              <Ionicons name="shield-outline" size={18} color={colors.accent} style={{ marginRight: 8 }} />
              <Text style={[styles.metaLabel, { color: colors.muted }]}>Age Restriction:</Text>
              <Text style={[styles.metaVal, { color: colors.title }]}>{ageRestriction}</Text>
            </View>

            <View style={styles.summaryMetaRow}>
              <Ionicons name="shirt-outline" size={18} color={colors.accent} style={{ marginRight: 8 }} />
              <Text style={[styles.metaLabel, { color: colors.muted }]}>Dress Code:</Text>
              <Text style={[styles.metaVal, { color: colors.title }]}>{dressCode}</Text>
            </View>

            <View style={styles.summaryMetaRow}>
              <Ionicons name="person-outline" size={18} color={colors.accent} style={{ marginRight: 8 }} />
              <Text style={[styles.metaLabel, { color: colors.muted }]}>Organizer:</Text>
              <Text style={[styles.metaVal, { color: colors.accent }]}>@yourprofile</Text>
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

  // STEP 6: YOU'RE ALL SET! LIVE CONFIRMATION
  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={[styles.headerBtn, { backgroundColor: colors.surface }]}>
          <Ionicons name="chevron-back" size={22} color={colors.title} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.title }]}>Event is Live</Text>
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

          <Text style={[styles.allSetTitle, { color: colors.title }]}>You're all set!</Text>
          <Text style={[styles.allSetSubtitle, { color: colors.muted }]}>
            Your event is live and ready to sell tickets.
          </Text>
        </View>

        <View style={[styles.livePreviewCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <LinearGradient colors={colors.btnGradient} style={styles.liveEventBanner}>
            <Ionicons name="sparkles" size={36} color="#FFFFFF" />
            <Text style={styles.liveEventBannerTitle}>{eventTitle}</Text>
          </LinearGradient>

          <View style={{ padding: 14 }}>
            <Text style={[styles.liveCardTitle, { color: colors.title, fontSize: 16 }]}>{eventTitle}</Text>
            <Text style={[styles.liveCardSubtitle, { color: colors.muted }]}>
              {date} • {startTime} – {endTime}
            </Text>
            <Text style={[styles.liveInfoValue, { color: colors.title, marginTop: 6 }]}>{location}</Text>
            <Text style={[styles.liveCardPrice, { color: colors.accent, marginTop: 8 }]}>
              Tickets from ${tickets[0]?.price}
            </Text>
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
              <Text style={styles.viewMyServicesText}>View My Events</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleShare} activeOpacity={0.85} style={[styles.shareServiceBtn, { borderColor: colors.cardBorder }]}>
            <Ionicons name="share-social-outline" size={18} color={colors.accent} style={{ marginRight: 8 }} />
            <Text style={[styles.shareServiceText, { color: colors.accent }]}>Share Event</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.lockRow}>
          <Ionicons name="notifications-outline" size={14} color={colors.muted} />
          <Text style={[styles.lockText, { color: colors.muted }]}>
            We'll notify you when someone buys a ticket.
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
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItem: {
    width: '48%',
    padding: 12,
    borderRadius: 14,
  },
  gridIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gridTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  gridDesc: {
    fontSize: 11,
    marginTop: 2,
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
    height: 80,
    textAlignVertical: 'top',
  },
  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  readOnlyText: {
    fontSize: 14,
    fontWeight: '700',
  },
  imagePickerCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  imagePlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  changeImgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 10,
  },
  changeImgText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  pillOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  ticketTierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  ticketTypeTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  ticketSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  ticketPrice: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  ticketCounterWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 10,
  },
  counterBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  counterSymbol: {
    fontSize: 16,
    fontWeight: '700',
  },
  counterVal: {
    fontSize: 13,
    fontWeight: '700',
    marginHorizontal: 8,
  },
  addTicketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  addTicketText: {
    fontSize: 13,
    fontWeight: '700',
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
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 14,
    marginBottom: 16,
  },
  reviewEventBanner: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerEventTag: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  reviewSub: {
    fontSize: 12,
    marginTop: 2,
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
  ticketSummaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  summaryItemText: {
    fontSize: 13,
  },
  summaryDivider: {
    height: 1,
    marginVertical: 12,
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
    overflow: 'hidden',
    marginBottom: 20,
  },
  liveEventBanner: {
    width: '100%',
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveEventBannerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
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
