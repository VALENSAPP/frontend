import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { getPaymentProfile } from '../../services/paymentProfile';
import { getPaymentProvider } from '../../utils/pixPayment';
import BrazilTipSupportModal from './BrazilTipSupportModal';
import LegacyTipSupportModal from './LegacyTipSupportModal';

export default function TipSupportModal(props) {
  const [provider, setProvider] = useState(null);

  useEffect(() => {
    let active = true;
    if (!props.visible) {
      setProvider(null);
      return undefined;
    }
    getPaymentProfile().then(user => {
      if (active) setProvider(getPaymentProvider(user));
    }).catch(() => {
      // A failed country lookup must not break the pre-existing Stripe checkout.
      if (active) setProvider('STRIPE');
    });
    return () => { active = false; };
  }, [props.visible]);

  if (provider === 'PAGBANK') return <BrazilTipSupportModal {...props} />;
  if (provider === 'STRIPE') return <LegacyTipSupportModal {...props} />;
  if (!props.visible) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={props.onClose}>
      <TouchableOpacity activeOpacity={1} onPress={props.onClose} style={styles.loading}>
        <View style={styles.indicator}><ActivityIndicator size="large" color="#5a2d82" /></View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(12,8,20,0.45)' },
  indicator: { padding: 24, borderRadius: 16, backgroundColor: '#ffffff' },
});
