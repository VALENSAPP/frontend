import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getServiceMetaTypes } from '../../../services/proServices';

const TYPE_ICONS = {
  MENTORSHIP: 'school-outline',
  CONSULTATION: 'chatbubble-ellipses-outline',
  APPOINTMENT: 'calendar-outline',
  EVENT: 'ticket-outline',
  MONTHLY_PACKAGE: 'gift-outline',
};

const DEFAULT_TYPES = [
  { type: 'MENTORSHIP', label: 'Mentorships', feePercent: 0.15, description: '1:1 or group recurring mentoring sessions' },
  { type: 'CONSULTATION', label: 'Consultations', feePercent: 0.15, description: 'One-off personalized expert advisory session' },
  { type: 'APPOINTMENT', label: 'Appointments', feePercent: 0.15, description: 'Dedicated in-person or virtual bookable slots' },
  { type: 'EVENT', label: 'Events', feePercent: 0.0699, description: 'Host parties, workshops, and ticketed events' },
  { type: 'MONTHLY_PACKAGE', label: 'Monthly Packages', feePercent: 0.15, description: 'Subscription plans with private circle & booking' },
];

export default function ChooseServiceTypeModal({
  visible,
  onClose,
  onSelectType,
  isBusinessProfile = false,
  isDarkMode = false,
  t,
}) {
  const [types, setTypes] = useState(DEFAULT_TYPES);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);

  const brandAccent = isBusinessProfile ? '#CBA257' : '#7C3AED';
  const bg = isDarkMode ? '#1E1828' : '#FFFFFF';
  const border = isDarkMode ? 'rgba(255,255,255,0.1)' : '#EDE7F6';
  const textColor = isDarkMode ? '#F3F4F6' : '#1F2937';
  const mutedColor = isDarkMode ? '#9CA3AF' : '#6B7280';

  useEffect(() => {
    if (!visible) return;
    let isMounted = true;
    (async () => {
      setLoading(true);
      try {
        const response = await getServiceMetaTypes();
        const data = response?.data || response;
        if (isMounted && data && Array.isArray(data.types)) {
          setMeta(data);
          setTypes(data.types);
        }
      } catch (_) {
        // Fallback to default types if network fails
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: bg, borderColor: border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: textColor }]}>
                {t ? t('services.chooseTypeTitle', 'Choose Service Type') : 'Choose Service Type'}
              </Text>
              <Text style={[styles.subtitle, { color: mutedColor }]}>
                {t ? t('services.chooseTypeSub', 'Select the format of the service you want to offer') : 'Select the format of the service you want to offer'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle-outline" size={26} color={mutedColor} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator color={brandAccent} size="large" />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
              {types.map(item => {
                const iconName = TYPE_ICONS[item.type] || 'briefcase-outline';
                const feeText = item.feePercent ? `${(item.feePercent * 100).toFixed(1).replace('.0', '')}% platform fee` : 'No platform fee';
                const fallbackDesc = DEFAULT_TYPES.find(d => d.type === item.type)?.description || '';

                return (
                  <TouchableOpacity
                    key={item.type}
                    activeOpacity={0.85}
                    onPress={() => onSelectType(item.type, meta)}
                    style={[
                      styles.typeCard,
                      {
                        backgroundColor: isDarkMode ? '#281F36' : '#FAF8FD',
                        borderColor: border,
                      },
                    ]}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#EDE7F6' }]}>
                      <Ionicons name={iconName} size={24} color={brandAccent} />
                    </View>
                    <View style={styles.cardBody}>
                      <View style={styles.cardTitleRow}>
                        <Text style={[styles.cardTitle, { color: textColor }]}>{item.label || item.type}</Text>
                        <View style={[styles.feePill, { backgroundColor: isDarkMode ? 'rgba(203,162,87,0.15)' : '#F3E8FF' }]}>
                          <Text style={[styles.feeText, { color: brandAccent }]}>{feeText}</Text>
                        </View>
                      </View>
                      <Text style={[styles.cardDesc, { color: mutedColor }]} numberOfLines={2}>
                        {item.description || fallbackDesc}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={mutedColor} style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: '85%',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 2 },
  loaderWrap: { paddingVertical: 40, alignItems: 'center' },
  list: { paddingBottom: 16, gap: 12 },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBody: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  feePill: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  feeText: { fontSize: 10, fontWeight: '700' },
  cardDesc: { fontSize: 12, lineHeight: 16 },
});
