import { DrawerActions, useNavigation } from "@react-navigation/native";
import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { useAppTheme } from "../../theme/useApptheme";
import { useLanguage } from "../../i18n";
import { formatMembershipAmount } from "../../utils/membershipPricing";

const SubscriptionActivationPopup = ({
  visible,
  onClose,
  onConfirm,
  onCancel,
  returnToSettingsSub,
  isBusinessProfile = false,
  amount = 9.9,
  period = 'month',
  documentCountry = '',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const dismissResolverRef = useRef(null);
  const navigation = useNavigation();
  const { bgStyle, textStyle, card, text, accent, border } = useAppTheme(
    isBusinessProfile ? 'company' : undefined,
  );
  const { t } = useLanguage();
  const isYearly = period === 'year' || period === 'annual';
  const formattedAmount = formatMembershipAmount(amount, documentCountry);
  const chargeIntroKey = isYearly
    ? 'subscriptionActivation.chargeIntroYearly'
    : 'subscriptionActivation.chargeIntroMonthly';
  const maintenanceFeeKey = isYearly
    ? 'subscriptionActivation.maintenanceFeeYearly'
    : 'subscriptionActivation.maintenanceFeeMonthly';
  const billingAuthKey = isYearly
    ? 'subscriptionActivation.billingAuthDescYearly'
    : 'subscriptionActivation.billingAuthDescMonthly';

  const handleDismissed = () => {
    const resolve = dismissResolverRef.current;
    dismissResolverRef.current = null;
    resolve?.();
  };

  const waitUntilClosed = () => new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      dismissResolverRef.current = null;
      resolve();
    };
    dismissResolverRef.current = finish;
    onClose?.();
    // Android does not emit Modal.onDismiss. Don't open Stripe until this
    // modal is actually gone, or the screen freezes when payment returns.
    setTimeout(finish, 500);
  });

  const handleCancel = () => {
    // Always call onCancel first (parent handles navigation + drawer)
    if (typeof onCancel === 'function') {
      onCancel();
    } else {
      onClose?.();
    }
  };

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await waitUntilClosed();
      await onConfirm?.();
    } finally {
      setIsLoading(false);
    }
  };

  // Keep openGlobalDrawer for any legacy callers that don't pass onCancel
  const openGlobalDrawer = useCallback(() => {
    let parentNav = navigation;
    let attempts = 0;

    while (parentNav && attempts < 6) {
      const state = parentNav.getState?.();
      if (state?.type === 'drawer') {
        parentNav.dispatch(DrawerActions.openDrawer());
        return;
      }
      parentNav = parentNav.getParent?.();
      attempts += 1;
    }

    navigation.dispatch(DrawerActions.openDrawer());
  }, [navigation]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
      onDismiss={handleDismissed}
    >
      <View style={styles.overlay} pointerEvents="auto">
        <View style={[styles.box, bgStyle, { backgroundColor: card }]}>
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <Text style={[styles.title, textStyle]}>
                {t('subscriptionActivation.title')}
              </Text>
            </View>
            <Image
              source={require('../../assets/Valens Stickers/Valens Stickers/WEBP/Pack 3/lock.webp')}
              style={styles.mascotImage}
              resizeMode="contain"
            />
          </View>

          <Text style={[styles.introText, textStyle]}>
            {t(chargeIntroKey)}{' '}
            <Text style={styles.boldText}>
              {formattedAmount}
            </Text>{' '}
            {t('subscriptionActivation.chargeSuffix')}
          </Text>

          <Text style={[styles.sectionTitle, textStyle]}>
            {t('subscriptionActivation.platformFeesTitle')}
          </Text>

          <Text style={[styles.bullet, textStyle]}>
            {t(maintenanceFeeKey, { amount: formattedAmount })}
          </Text>
          <Text style={[styles.subText, textStyle]}>
            {t('subscriptionActivation.maintenanceFeeDesc')}
          </Text>

          <Text style={[styles.bullet, textStyle, { marginTop: 12 }]}>
            {t('subscriptionActivation.withdrawalFee')}
          </Text>
          <Text style={[styles.subText, textStyle]}>
            {t('subscriptionActivation.withdrawalFeeDesc')}
          </Text>

          <Text style={[styles.sectionTitle, textStyle]}>
            {t('subscriptionActivation.billingAuthTitle')}
          </Text>

          <Text style={[styles.descText, textStyle]}>
            {t(billingAuthKey)}
          </Text>

          <View style={styles.row}>
            <TouchableOpacity
              style={[
                styles.cancelBtn,
                { borderColor: border, backgroundColor: card },
                isLoading && styles.cancelBtnDisabled,
              ]}
              onPress={handleCancel}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelTxt, textStyle]}>
                {t('subscriptionActivation.cancelButton')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.acceptBtn,
                { backgroundColor: accent },
                isLoading && styles.acceptBtnDisabled,
              ]}
              onPress={handleAccept}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={[styles.acceptTxt, { color: '#ffffff' }]}>
                  {t('subscriptionActivation.acceptButton')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default SubscriptionActivationPopup;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  box: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 22,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 23,
    fontWeight: "700",
    lineHeight: 29,
    textAlign: "left",
  },
  mascotImage: {
    width: 110,
    height: 95,
  },
  introText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400",
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400",
  },
  boldText: {
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 18,
    marginBottom: 4,
  },
  bullet: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 6,
    lineHeight: 21,
  },
  subText: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 14,
    marginTop: 2,
    fontWeight: "400",
  },
  descText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    marginTop: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 26,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnDisabled: {
    opacity: 0.5,
  },
  acceptBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelTxt: {
    fontSize: 16,
    fontWeight: "700",
  },
  acceptTxt: {
    fontSize: 16,
    fontWeight: "700",
  },
  acceptBtnDisabled: {
    opacity: 0.7,
  },
});
