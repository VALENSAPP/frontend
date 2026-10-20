import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import QRCode from 'react-native-qrcode-svg';
import { getTransactionDetails } from '../../services/wallet';
import { formatPixAmount, getPixPaymentState } from '../../utils/pixPayment';
import { useAppTheme } from '../../theme/useApptheme';
import { useLanguage } from '../../i18n';

export default function PixPaymentModal({ visible, checkout, onClose, onPaid }) {
  const { text, card, mutedText, accent } = useAppTheme();
  const { t, currentLanguage } = useLanguage();
  const [status, setStatus] = useState('PENDING');
  const [checking, setChecking] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());
  const refreshRef = useRef(null);

  useEffect(() => {
    if (!visible || !checkout?.paymentId) return undefined;
    let active = true;
    let pending = false;
    let completed = false;
    setStatus('PENDING');
    setCopied(false);
    setCheckFailed(false);
    setNow(Date.now());
    const refresh = async () => {
      // Only the matching backend payment record can confirm PIX, including late webhooks.
      if (!active || pending || completed) return;
      pending = true;
      setChecking(true);
      try {
        const response = await getTransactionDetails(checkout.paymentId);
        if (!active) return;
        const next = getPixPaymentState(response, checkout.paymentId);
        setStatus(next);
        setCheckFailed(next === 'UNKNOWN');
        if (next === 'PAID') {
          completed = true;
          onPaid?.(checkout.paymentId);
        }
      } catch (error) {
        if (active) setCheckFailed(true);
      } finally {
        pending = false;
        if (active) {
          setChecking(false);
          setNow(Date.now());
        }
      }
    };
    refreshRef.current = refresh;
    refresh();
    const timer = setInterval(() => {
      setNow(Date.now());
      if (AppState.currentState === 'active') refresh();
    }, 5000);
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') refresh();
    });
    return () => {
      active = false;
      clearInterval(timer);
      subscription.remove();
      refreshRef.current = null;
    };
  }, [visible, checkout?.paymentId, onPaid]);

  if (!checkout) return null;
  const expired = status !== 'PAID' && (status === 'EXPIRED' || now >= Date.parse(checkout.expiresAt));
  const unavailable = expired || status === 'FAILED';
  const statusKey = status === 'PAID' ? 'paid' : expired ? 'expired' : status === 'FAILED' ? 'failed' : 'pending';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <ScrollView style={[styles.sheet, { backgroundColor: card }]} contentContainerStyle={styles.content}>
          <Text accessibilityRole="header" style={[styles.title, { color: text }]}>{t('pixPayment.title')}</Text>
          <Text style={[styles.amount, { color: text }]}>{formatPixAmount(checkout.amountMinor)}</Text>
          <Text style={[styles.description, { color: mutedText }]}>{t('pixPayment.instructions')}</Text>
          {!unavailable && (
            <>
              <View style={styles.qr} accessible accessibilityLabel={t('pixPayment.qrLabel')}>
                <QRCode value={checkout.pixCopyPaste} size={210} color="#000000" backgroundColor="#ffffff" />
              </View>
              <Text selectable numberOfLines={3} style={[styles.code, { color: text }]}>{checkout.pixCopyPaste}</Text>
              <TouchableOpacity testID="pix-copy" accessibilityRole="button" style={[styles.button, { backgroundColor: accent || '#5a2d82' }]}
                onPress={() => { Clipboard.setString(checkout.pixCopyPaste); setCopied(true); }}>
                <Text style={styles.buttonText}>{t(copied ? 'pixPayment.copied' : 'pixPayment.copy')}</Text>
              </TouchableOpacity>
            </>
          )}
          <Text style={[styles.description, { color: mutedText }]}>
            {t('pixPayment.expires', {
              date: new Date(checkout.expiresAt).toLocaleString(currentLanguage === 'pt' ? 'pt-BR' : currentLanguage || undefined),
            })}
          </Text>
          <Text accessibilityLiveRegion="polite" style={[styles.status, { color: text }]}>{t(`pixPayment.${statusKey}`)}</Text>
          {checkFailed && <Text style={[styles.description, { color: text }]}>{t('pixPayment.checkFailed')}</Text>}
          <TouchableOpacity testID="pix-check" accessibilityRole="button" disabled={checking} onPress={() => refreshRef.current?.()} style={styles.secondary}>
            {checking ? <ActivityIndicator color={text} /> : <Text style={{ color: text }}>{t('pixPayment.check')}</Text>}
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.secondary}>
            <Text style={{ color: text }}>{t('pixPayment.close')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.55)', padding: 20 },
  sheet: { flexGrow: 0, maxHeight: '95%', borderRadius: 20 },
  content: { alignItems: 'center', padding: 24, gap: 16 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  amount: { fontSize: 28, fontWeight: '700' },
  description: { textAlign: 'center', fontSize: 14 },
  qr: { padding: 16, backgroundColor: '#ffffff' },
  code: { fontSize: 12, width: '100%' },
  status: { textAlign: 'center', fontWeight: '600' },
  button: { width: '100%', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#ffffff', fontWeight: '700' },
  secondary: { padding: 12, minWidth: 160, alignItems: 'center' },
});
