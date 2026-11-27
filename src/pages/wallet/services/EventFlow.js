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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  createServiceDraft,
  updateService,
  uploadServiceCover,
  setTicketTypes,
  getServiceDetails,
  publishService,
  getServiceMetaTypes,
} from '../../../services/proServices';
import {
  formatPriceWithUnit,
  getDeviceTimezone,
  mapReadinessToStep,
} from '../../../services/proServices/helpers';

const FALLBACK_CATEGORIES = [
  { id: 'Birthday Party', name: 'Birthday Party', desc: "Celebrate life's special moments.", icon: 'gift-outline' },
  { id: 'Bachelorette Party', name: 'Bachelorette Party', desc: 'Fun, unforgettable celebrations.', icon: 'wine-outline' },
  { id: 'Corporate Event', name: 'Corporate Event', desc: 'Conferences, meetups & networking.', icon: 'business-outline' },
  { id: 'Theater / Show', name: 'Theater / Show', desc: 'Live performances & plays.', icon: 'film-outline' },
  { id: 'Nightclub Entry', name: 'Nightclub Entry', desc: 'Party & exclusive admission.', icon: 'musical-notes-outline' },
  { id: 'Concert / Festival', name: 'Concert / Festival', desc: 'Live music & festivals.', icon: 'headset-outline' },
  { id: 'Workshop / Class', name: 'Workshop / Class', desc: 'Learning & interactive events.', icon: 'school-outline' },
  { id: 'Other Event', name: 'Other Event', desc: 'Custom event type.', icon: 'ellipsis-horizontal-circle-outline' },
];

export default function EventFlow({
  colors,
  isDarkMode,
  t,
  onBack,
  onFinish,
  userProfilePic,
  initialServiceId = null,
}) {
  // Step: 1 = Choose Category, 2 = Create Event, 3 = Set Details, 4 = Tickets & Pricing, 5 = Review, 6 = All Set
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

  // Meta categories
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState(FALLBACK_CATEGORIES[0].name);

  // Step 2: Basic info
  const [eventTitle, setEventTitle] = useState('Glow Birthday Party');
  const [description, setDescription] = useState(
    "Let's celebrate my birthday with good vibes, music and unforgettable memories!",
  );
  const [coverUri, setCoverUri] = useState(null);

  // Step 3: Venue & Times
  const [venueName, setVenueName] = useState('Luminous Lounge');
  const [venueAddress, setVenueAddress] = useState('123 Party Street, Miami, FL 33101, USA');
  const [eventDate, setEventDate] = useState('2027-06-15');
  const [startTime, setStartTime] = useState('21:00');
  const [endTime, setEndTime] = useState('02:00');
  const [ageRestriction, setAgeRestriction] = useState('21');
  const [dressCode, setDressCode] = useState('Dress to impress');

  // Step 4: Tickets & Sales Window
  const [tickets, setTickets] = useState([
    { name: 'Early Bird', description: 'Limited time offer', price: 25, quantity: 100 },
    { name: 'General Admission', description: 'Standard entry', price: 40, quantity: 200 },
    { name: 'VIP Access', description: 'Skip the line + VIP area', price: 80, quantity: 50 },
  ]);
  const [salesStartAt, setSalesStartAt] = useState('2027-05-01T10:00:00');
  const [salesEndAt, setSalesEndAt] = useState('2027-06-15T18:00:00');

  // Step 5: Review
  const [serviceDetails, setServiceDetails] = useState(null);
  const [readinessProblems, setReadinessProblems] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const typesRes = await getServiceMetaTypes();
        if (typesRes.success && typesRes.data?.eventCategories) {
          const list = typesRes.data.eventCategories.map(name => ({
            id: name,
            name,
            desc: `${name} experience and gathering.`,
            icon: 'ticket-outline',
          }));
          setCategories(list);
          if (list[0]) setSelectedCategory(list[0].name);
        }
      } catch (_) {}
    })();
  }, []);

  const updateTicketField = (index, field, value) => {
    const updated = [...tickets];
    updated[index] = { ...updated[index], [field]: value };
    setTickets(updated);
  };

  const addTicketType = () => {
    if (tickets.length >= 10) {
      Alert.alert('Limit Reached', 'Up to 10 ticket types allowed.');
      return;
    }
    setTickets([
      ...tickets,
      {
        name: 'VIP Table Experience',
        description: 'Reserved table & premium admission',
        price: 150,
        quantity: 20,
      },
    ]);
  };

  const removeTicketType = index => {
    if (tickets.length <= 1) {
      Alert.alert('Required', 'An event requires at least one ticket type.');
      return;
    }
    setTickets(tickets.filter((_, i) => i !== index));
  };

  // STEP 1 -> STEP 2
  const handleSelectCategory = catName => {
    setSelectedCategory(catName);
    setStep(2);
  };

  // STEP 2 -> STEP 3 (Create event draft)
  const handleStep2Continue = async () => {
    if (!eventTitle.trim()) {
      Alert.alert('Required', 'Please enter an event title.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        type: 'EVENT',
        category: selectedCategory,
        title: eventTitle.trim(),
        description: description.trim(),
        format: 'IN_PERSON',
      };

      let id = serviceId;
      if (!id) {
        const res = await createServiceDraft(payload);
        if (res.success && res.data?.id) {
          id = res.data.id;
          setServiceId(id);
        } else {
          Alert.alert('Error', res.message || 'Failed to create event draft.');
          setLoading(false);
          return;
        }
      } else {
        const res = await updateService(id, payload);
        if (!res.success) {
          Alert.alert('Error', res.message || 'Failed to update event draft.');
          setLoading(false);
          return;
        }
      }

      // If cover image was selected
      if (coverUri && id) {
        try {
          await uploadServiceCover(id, coverUri);
        } catch (_) {}
      }

      setStep(3);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save event.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 3 -> STEP 4 (Set venue & dates)
  const handleStep3Continue = async () => {
    if (!serviceId) return;
    if (!venueName.trim() || !venueAddress.trim()) {
      Alert.alert('Required', 'Please enter venue name and address.');
      return;
    }

    setLoading(true);
    try {
      // Build ISO date strings
      // Handle overnight end time
      let endDateStr = eventDate;
      const startH = parseInt(startTime.split(':')[0], 10);
      const endH = parseInt(endTime.split(':')[0], 10);
      if (endH < startH) {
        // End time is next morning
        const d = new Date(eventDate);
        d.setDate(d.getDate() + 1);
        endDateStr = d.toISOString().split('T')[0];
      }

      const startIso = `${eventDate}T${startTime}:00Z`;
      const endIso = `${endDateStr}T${endTime}:00Z`;

      const ageNum = parseInt(ageRestriction.replace(/[^0-9]/g, ''), 10) || 0;

      const eventPayload = {
        event: {
          venueName: venueName.trim(),
          venueAddress: venueAddress.trim(),
          startAt: startIso,
          endAt: endIso,
          ageRestriction: ageNum,
          dressCode: dressCode.trim(),
        },
      };

      const res = await updateService(serviceId, eventPayload);
      if (res.success) {
        setStep(4);
      } else {
        Alert.alert('Error', res.message || 'Failed to save event details.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save event details.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 4 -> STEP 5 (Set tickets & sales window, then check review)
  const handleStep4Continue = async () => {
    if (!serviceId) return;
    if (tickets.length === 0) {
      Alert.alert('Required', 'Please add at least one ticket type.');
      return;
    }

    setLoading(true);
    try {
      // 1. PUT ticket-types
      const formattedTickets = tickets.map(tk => ({
        ...(tk.id ? { id: tk.id } : {}),
        name: tk.name.trim(),
        description: tk.description?.trim() || '',
        price: Number(tk.price) || 0,
        quantity: parseInt(tk.quantity, 10) || 1,
      }));

      const ticketRes = await setTicketTypes(serviceId, formattedTickets);
      if (!ticketRes.success) {
        Alert.alert('Error', ticketRes.message || 'Failed to save tickets.');
        setLoading(false);
        return;
      }

      // 2. Sales window PATCH
      const salesPayload = {
        event: {
          salesStartAt: salesStartAt.includes('Z') ? salesStartAt : `${salesStartAt}Z`,
          salesEndAt: salesEndAt.includes('Z') ? salesEndAt : `${salesEndAt}Z`,
        },
      };
      await updateService(serviceId, salesPayload);

      // 3. Load review details
      const reviewRes = await getServiceDetails(serviceId);
      if (reviewRes.success && reviewRes.data) {
        setServiceDetails(reviewRes.data);
        setReadinessProblems(reviewRes.data.readiness?.problems || []);
      }

      setStep(5);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save ticket pricing.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 5 -> PUBLISH
  const handlePublish = async () => {
    if (!serviceId) return;
    setPublishLoading(true);
    try {
      const res = await publishService(serviceId);
      if (res.success) {
        setStep(6);
      } else {
        Alert.alert(
          'Cannot Publish Event',
          res.message || 'Please complete all required fields and ensure dates are in the future.',
        );
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to publish event.');
    } finally {
      setPublishLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join me at ${eventTitle}! Book your tickets on Valens: ${venueName}`,
      });
    } catch (_) {}
  };

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: CHOOSE CATEGORY
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <View style={[styles.root, { backgroundColor: cardBg }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Choose Event Type</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.stepIndicator, { color: brandAccent }]}>STEP 1 OF 4</Text>
          <Text style={[styles.screenTitle, { color: textColor }]}>Select Event Category</Text>
          <Text style={[styles.screenSub, { color: mutedColor }]}>
            Pick the format that best fits your gathering or live experience.
          </Text>

          {categories.map(cat => {
            const isSelected = selectedCategory === cat.name;
            return (
              <TouchableOpacity
                key={cat.id || cat.name}
                activeOpacity={0.88}
                onPress={() => handleSelectCategory(cat.name)}
                style={[
                  styles.categoryCard,
                  {
                    borderColor: isSelected ? brandAccent : border,
                    backgroundColor: isSelected ? (isDarkMode ? 'rgba(124, 58, 237, 0.12)' : 'rgba(124, 58, 237, 0.06)') : inputBg,
                  },
                ]}
              >
                <View style={[styles.catIconWrap, { backgroundColor: brandAccent }]}>
                  <Ionicons name={cat.icon || 'ticket-outline'} size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.catName, { color: textColor }]}>{cat.name}</Text>
                  <Text style={[styles.catDesc, { color: mutedColor }]}>{cat.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={mutedColor} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2: CREATE EVENT
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <View style={[styles.root, { backgroundColor: cardBg }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Create Event</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.stepIndicator, { color: brandAccent }]}>STEP 2 OF 4</Text>
          <Text style={[styles.screenTitle, { color: textColor }]}>Event Basics</Text>
          <Text style={[styles.screenSub, { color: mutedColor }]}>
            Category: <Text style={{ color: brandAccent, fontWeight: '700' }}>{selectedCategory}</Text>
          </Text>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: textColor }]}>Event Title *</Text>
            <TextInput
              value={eventTitle}
              onChangeText={setEventTitle}
              placeholder="e.g. Glow Birthday Party"
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
              placeholder="Tell guests what to expect, highlights, music, and vibe..."
              placeholderTextColor={mutedColor}
              multiline
              numberOfLines={4}
              maxLength={5000}
              style={[styles.textArea, { color: textColor, borderColor: border, backgroundColor: inputBg }]}
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.88}
            disabled={loading}
            onPress={handleStep2Continue}
            style={[styles.continueBtn, { backgroundColor: brandAccent, marginTop: 12 }]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.continueBtnText}>Continue to Date & Location</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3: SET DETAILS (VENUE, TIME, AGE, DRESS CODE)
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 3) {
    return (
      <View style={[styles.root, { backgroundColor: cardBg }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(2)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Date & Venue</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.stepIndicator, { color: brandAccent }]}>STEP 3 OF 4</Text>
          <Text style={[styles.screenTitle, { color: textColor }]}>Where & When</Text>
          <Text style={[styles.screenSub, { color: mutedColor }]}>
            Set the venue, event timing in 24-hour format, and guest guidelines.
          </Text>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: textColor }]}>Venue Name *</Text>
            <TextInput
              value={venueName}
              onChangeText={setVenueName}
              placeholder="e.g. Luminous Lounge"
              placeholderTextColor={mutedColor}
              style={[styles.input, { color: textColor, borderColor: border, backgroundColor: inputBg }]}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: textColor }]}>Venue Full Address *</Text>
            <TextInput
              value={venueAddress}
              onChangeText={setVenueAddress}
              placeholder="123 Party Street, Miami, FL 33101, USA"
              placeholderTextColor={mutedColor}
              style={[styles.input, { color: textColor, borderColor: border, backgroundColor: inputBg }]}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: textColor }]}>Event Date (YYYY-MM-DD) *</Text>
            <TextInput
              value={eventDate}
              onChangeText={setEventDate}
              placeholder="2027-06-15"
              placeholderTextColor={mutedColor}
              style={[styles.input, { color: textColor, borderColor: border, backgroundColor: inputBg }]}
            />
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.label, { color: textColor }]}>Start Time (24h)</Text>
              <TextInput
                value={startTime}
                onChangeText={setStartTime}
                placeholder="21:00"
                placeholderTextColor={mutedColor}
                style={[styles.input, { color: textColor, borderColor: border, backgroundColor: inputBg }]}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: textColor }]}>End Time (24h)</Text>
              <TextInput
                value={endTime}
                onChangeText={setEndTime}
                placeholder="02:00"
                placeholderTextColor={mutedColor}
                style={[styles.input, { color: textColor, borderColor: border, backgroundColor: inputBg }]}
              />
            </View>
          </View>

          <View style={[styles.row, { marginTop: 12 }]}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.label, { color: textColor }]}>Min Age</Text>
              <TextInput
                value={ageRestriction}
                onChangeText={setAgeRestriction}
                placeholder="21"
                keyboardType="numeric"
                placeholderTextColor={mutedColor}
                style={[styles.input, { color: textColor, borderColor: border, backgroundColor: inputBg }]}
              />
            </View>

            <View style={{ flex: 1.5 }}>
              <Text style={[styles.label, { color: textColor }]}>Dress Code</Text>
              <TextInput
                value={dressCode}
                onChangeText={setDressCode}
                placeholder="Dress to impress"
                placeholderTextColor={mutedColor}
                style={[styles.input, { color: textColor, borderColor: border, backgroundColor: inputBg }]}
              />
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.88}
            disabled={loading}
            onPress={handleStep3Continue}
            style={[styles.continueBtn, { backgroundColor: brandAccent, marginTop: 20 }]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.continueBtnText}>Continue to Tickets & Pricing</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 4: TICKETS & PRICING
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 4) {
    return (
      <View style={[styles.root, { backgroundColor: cardBg }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(3)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Tickets & Pricing</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.stepIndicator, { color: brandAccent }]}>STEP 4 OF 4</Text>
          <Text style={[styles.screenTitle, { color: textColor }]}>Ticket Tiers & Capacity</Text>
          <Text style={[styles.screenSub, { color: mutedColor }]}>
            Set up ticket tiers (price 0 = free ticket). Fee for events is 6.99%.
          </Text>

          {tickets.map((tk, idx) => (
            <View key={idx} style={[styles.ticketCard, { borderColor: border, backgroundColor: inputBg }]}>
              <View style={styles.rowBetween}>
                <Text style={[styles.ticketNumber, { color: brandAccent }]}>TIER #{idx + 1}</Text>
                {tickets.length > 1 && (
                  <TouchableOpacity onPress={() => removeTicketType(idx)}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>

              <TextInput
                value={tk.name}
                onChangeText={v => updateTicketField(idx, 'name', v)}
                placeholder="Tier name (e.g. Early Bird)"
                placeholderTextColor={mutedColor}
                style={[styles.input, { color: textColor, borderColor: border, backgroundColor: cardBg, marginTop: 6 }]}
              />

              <TextInput
                value={tk.description}
                onChangeText={v => updateTicketField(idx, 'description', v)}
                placeholder="Description / perks"
                placeholderTextColor={mutedColor}
                style={[styles.input, { color: textColor, borderColor: border, backgroundColor: cardBg, marginTop: 6 }]}
              />

              <View style={[styles.row, { marginTop: 6 }]}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Text style={[styles.subHint, { color: mutedColor }]}>Price ($)</Text>
                  <TextInput
                    value={String(tk.price)}
                    onChangeText={v => updateTicketField(idx, 'price', v.replace(/[^0-9.]/g, ''))}
                    keyboardType="decimal-pad"
                    placeholder="25"
                    placeholderTextColor={mutedColor}
                    style={[styles.input, { color: textColor, borderColor: border, backgroundColor: cardBg }]}
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Text style={[styles.subHint, { color: mutedColor }]}>Quantity</Text>
                  <TextInput
                    value={String(tk.quantity)}
                    onChangeText={v => updateTicketField(idx, 'quantity', v.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    placeholder="100"
                    placeholderTextColor={mutedColor}
                    style={[styles.input, { color: textColor, borderColor: border, backgroundColor: cardBg }]}
                  />
                </View>
              </View>
            </View>
          ))}

          {tickets.length < 10 && (
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={addTicketType}
              style={[styles.addTierBtn, { borderColor: brandAccent }]}
            >
              <Ionicons name="add" size={18} color={brandAccent} style={{ marginRight: 6 }} />
              <Text style={[styles.addTierText, { color: brandAccent }]}>Add Ticket Tier</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.88}
            disabled={loading}
            onPress={handleStep4Continue}
            style={[styles.continueBtn, { backgroundColor: brandAccent, marginTop: 24 }]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.continueBtnText}>Review Event</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 5: REVIEW EVENT & READINESS
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 5) {
    const minTicketPrice = tickets.reduce(
      (min, tk) => (Number(tk.price) < min ? Number(tk.price) : min),
      tickets[0]?.price || 0,
    );
    const canPublish = readinessProblems.length === 0;

    return (
      <View style={[styles.root, { backgroundColor: cardBg }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(4)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Review Event</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.stepIndicator, { color: brandAccent }]}>STEP 5 OF 5</Text>
          <Text style={[styles.screenTitle, { color: textColor }]}>Ready to Publish?</Text>
          <Text style={[styles.screenSub, { color: mutedColor }]}>
            Review ticket tiers, date and venue details before publishing to your profile.
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

          {/* Event Review Card */}
          <View style={[styles.reviewCard, { borderColor: border, backgroundColor: inputBg }]}>
            <View style={styles.reviewHeaderRow}>
              <View style={[styles.typeBadge, { backgroundColor: brandAccent }]}>
                <Text style={styles.typeBadgeText}>EVENT</Text>
              </View>
              <Text style={[styles.catName, { color: brandAccent }]}>{selectedCategory}</Text>
            </View>

            <Text style={[styles.reviewTitle, { color: textColor }]}>{eventTitle}</Text>
            <Text style={[styles.reviewDesc, { color: mutedColor }]}>{description}</Text>

            <View style={[styles.divider, { backgroundColor: border }]} />

            <View style={styles.rowBetween}>
              <Text style={[styles.reviewMetricLabel, { color: mutedColor }]}>Venue</Text>
              <Text style={[styles.reviewMetricVal, { color: textColor }]}>{venueName}</Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={[styles.reviewMetricLabel, { color: mutedColor }]}>Address</Text>
              <Text style={[styles.reviewMetricVal, { color: textColor, flex: 1, textAlign: 'right', marginLeft: 8 }]}>
                {venueAddress}
              </Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={[styles.reviewMetricLabel, { color: mutedColor }]}>Date & Time</Text>
              <Text style={[styles.reviewMetricVal, { color: textColor }]}>
                {eventDate} • {startTime} – {endTime}
              </Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={[styles.reviewMetricLabel, { color: mutedColor }]}>Guidelines</Text>
              <Text style={[styles.reviewMetricVal, { color: textColor }]}>
                {ageRestriction}+ • {dressCode}
              </Text>
            </View>

            <View style={[styles.rowBetween, { marginTop: 8 }]}>
              <Text style={[styles.reviewMetricLabel, { color: textColor, fontWeight: '800' }]}>
                Tickets From
              </Text>
              <Text style={[styles.reviewTotalPrice, { color: brandAccent }]}>
                ${minTicketPrice}
              </Text>
            </View>
          </View>

          {/* Ticket Tiers */}
          <View style={[styles.reviewCard, { borderColor: border, backgroundColor: inputBg, marginTop: 14 }]}>
            <Text style={[styles.label, { color: textColor, marginBottom: 8 }]}>Ticket Tiers ({tickets.length})</Text>
            {tickets.map((tk, idx) => (
              <View key={idx} style={styles.ticketTierRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ticketTierName, { color: textColor }]}>{tk.name}</Text>
                  <Text style={[styles.subHint, { color: mutedColor }]}>
                    {tk.description || 'General Admission'} • {tk.quantity} tickets
                  </Text>
                </View>
                <Text style={[styles.ticketTierPrice, { color: brandAccent }]}>${tk.price}</Text>
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
                {canPublish ? 'Publish Event' : 'Publish (Resolve Issues First)'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 6: ALL SET
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: cardBg, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
      <Ionicons name="checkmark-circle" size={80} color="#10B981" />
      <Text style={[styles.successTitle, { color: textColor }]}>Event Published!</Text>
      <Text style={[styles.successSub, { color: mutedColor }]}>
        Your event has been successfully published and tickets are now live for purchase.
      </Text>

      <TouchableOpacity
        activeOpacity={0.88}
        onPress={handleShare}
        style={[styles.shareBtn, { borderColor: brandAccent }]}
      >
        <Ionicons name="share-outline" size={18} color={brandAccent} style={{ marginRight: 6 }} />
        <Text style={[styles.shareBtnText, { color: brandAccent }]}>Share Event Link</Text>
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
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  catIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  catName: { fontSize: 14, fontWeight: '700' },
  catDesc: { fontSize: 12, marginTop: 2 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  subHint: { fontSize: 11, marginTop: 2 },
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
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  continueBtn: {
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  ticketCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  ticketNumber: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  addTierBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    marginTop: 8,
  },
  addTierText: { fontSize: 13, fontWeight: '700' },
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
  reviewTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  reviewDesc: { fontSize: 12, lineHeight: 16 },
  divider: { height: 1, marginVertical: 12 },
  reviewMetricLabel: { fontSize: 12 },
  reviewMetricVal: { fontSize: 12, fontWeight: '700' },
  reviewTotalPrice: { fontSize: 18, fontWeight: '800' },
  ticketTierRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  ticketTierName: { fontSize: 13, fontWeight: '700' },
  ticketTierPrice: { fontSize: 14, fontWeight: '800' },
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
