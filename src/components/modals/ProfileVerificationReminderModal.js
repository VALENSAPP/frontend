import React, { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppTheme } from '../../theme/useApptheme';
import { useLanguage } from '../../i18n';

export default function ProfileVerificationReminderModal({
  visible,
  locked = false,
  profileType = 'user',
  onDoNow,
  onLater,
  onDeny,
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { t } = useLanguage();

  const normalizedProfileType = String(profileType || '').toLowerCase();
  const themeProfileType =
    normalizedProfileType === 'company' || normalizedProfileType === 'business'
      ? 'company'
      : 'user';
  const { bg, text, card, mutedText, accent } = useAppTheme(themeProfileType);
  const verificationType = themeProfileType === 'company' ? 'KYB' : 'KYC';

  useEffect(() => {
    if (visible) {
      setShowConfirm(false);
    }
  }, [visible]);

  const handleLaterPress = () => {
    setShowConfirm(true);
  };

  const handleDenyPress = () => {
    if (typeof onDeny === 'function') {
      onDeny();
    } else if (typeof onLater === 'function') {
      onLater();
    }
  };

  const handleRequestClose = () => {
    if (locked) return;
    if (showConfirm) {
      setShowConfirm(false);
    } else {
      setShowConfirm(true);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleRequestClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: card }]}>
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: showConfirm ? '#DC2626' : accent },
            ]}
          >
            <Text style={styles.icon}>!</Text>
          </View>

          {showConfirm ? (
            <>
              <Text style={[styles.title, { color: text }]}>
                {t('profileVerificationReminder.confirmTitle', 'Verify your profile')}
              </Text>

              <Text style={[styles.message, { color: text, fontWeight: '600' }]}>
                {t(
                  'profileVerificationReminder.confirmMessage',
                  `If you do not verify your profile, you will not get access to your account. To continue using Valens, do your ${verificationType}.`,
                  { type: verificationType }
                )}
              </Text>

              <Text style={[styles.subMessage, { color: mutedText }]}>
                {t(
                  'profileVerificationReminder.confirmSubMessage',
                  'If you deny verification, you will be logged out of your account.'
                )}
              </Text>

              <View style={styles.actions}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleDenyPress}
                  style={[styles.button, styles.denyButton]}
                >
                  <Text style={styles.denyText}>
                    {t('profileVerificationReminder.deny', 'Deny')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={onDoNow}
                  style={[
                    styles.button,
                    styles.primaryButton,
                    { backgroundColor: accent },
                  ]}
                >
                  <Text style={styles.primaryText}>
                    {t('profileVerificationReminder.doKyc', `Do ${verificationType}`, {
                      type: verificationType,
                    })}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowConfirm(false)}
                style={styles.backButton}
              >
                <Text style={[styles.backText, { color: mutedText }]}>
                  {t('profileVerificationReminder.goBack', 'Go back')}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: text }]}>
                {locked
                  ? t('profileVerificationReminder.accountBlocked', 'Your account is blocked')
                  : t('profileVerificationReminder.title', 'Verify your profile')}
              </Text>

              <Text style={[styles.message, { color: mutedText }]}>
                {locked
                  ? t(
                      'profileVerificationReminder.blockedMessage',
                      `Complete your ${verificationType} to unlock your account.`,
                      { type: verificationType }
                    )
                  : t(
                      'profileVerificationReminder.message',
                      `Finish your ${verificationType}, to be able to be a verified profile. All Valens profiles are verified.`,
                      { type: verificationType }
                    )}
              </Text>

              <Text style={[styles.subMessage, { color: mutedText }]}>
                {locked
                  ? t(
                      'profileVerificationReminder.blockedSubMessage',
                      'Your account is blocked because profile verification was not completed within 3 days.'
                    )
                  : t(
                      'profileVerificationReminder.subMessage',
                      'If you do not complete it within 3 days, your profile will be locked until verification is finished.'
                    )}
              </Text>

              <View style={styles.actions}>
                {!locked && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleLaterPress}
                    style={[styles.button, styles.laterButton, { backgroundColor: bg }]}
                  >
                    <Text style={[styles.laterText, { color: text }]}>
                      {t('profileVerificationReminder.later', 'Later')}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={onDoNow}
                  style={[
                    styles.button,
                    styles.primaryButton,
                    { backgroundColor: accent },
                    locked && styles.primaryButtonFull,
                  ]}
                >
                  <Text style={styles.primaryText}>
                    {t('profileVerificationReminder.doItNow', 'Do it now')}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  modal: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    alignItems: 'center',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#5A2D82',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  icon: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 34,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    lineHeight: 21,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
  },
  subMessage: {
    fontSize: 13,
    lineHeight: 19,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 18,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  button: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  laterButton: {
    backgroundColor: '#F3F4F6',
  },
  laterText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '800',
  },
  denyButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  denyText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '800',
  },
  backButton: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  backText: {
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  primaryButton: {
    backgroundColor: '#5A2D82',
  },
  primaryButtonFull: {
    flex: 0,
    width: '100%',
  },
  primaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
});
