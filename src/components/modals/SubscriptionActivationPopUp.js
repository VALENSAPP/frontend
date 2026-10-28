import { DrawerActions, useNavigation } from "@react-navigation/native";
import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useAppTheme } from "../../theme/useApptheme";
import { useLanguage } from "../../i18n";
import { formatMembershipAmount } from "../../utils/membershipPricing";

const SubscriptionActivationPopup = ({
  visible,
  onClose,
  onConfirm,
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

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await waitUntilClosed();
      await onConfirm?.();
    } finally {
      setIsLoading(false);
    }
  };

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
      onRequestClose={onClose}
      onDismiss={handleDismissed}
    >
      <View style={styles.overlay} pointerEvents="auto">
        <View style={[styles.box, bgStyle, { backgroundColor: card }]}>

          <Text style={[styles.title, textStyle]}>
            {t('subscriptionActivation.title')}
          </Text>

          <Text style={[styles.text, textStyle]}>
            {t(chargeIntroKey)}{' '}
            <Text style={{ fontWeight: 'bold' }}>
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

          <Text style={[styles.bullet, textStyle]}>
            {t('subscriptionActivation.withdrawalFee')}
          </Text>
          <Text style={[styles.subText, textStyle]}>
            {t('subscriptionActivation.withdrawalFeeDesc')}
          </Text>

          <Text style={[styles.sectionTitle, textStyle]}>
            {t('subscriptionActivation.billingAuthTitle')}
          </Text>

          <Text style={[styles.text, textStyle]}>
            {t(billingAuthKey)}
          </Text>

          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: border }, isLoading && styles.cancelBtnDisabled]}
              onPress={() => {
                onClose();
                {!returnToSettingsSub &&
                  navigation.navigate('MainApp', {
                    screen: 'wallet',
                    params: { screen: 'Dashboard' },
                  });
                }
              }}
              disabled={isLoading}
            >
              <Text style={[styles.cancelTxt, textStyle]}>
                {t('subscriptionActivation.cancelButton')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.acceptBtn, { backgroundColor: accent }, isLoading && styles.acceptBtnDisabled]}
              onPress={handleAccept}
              disabled={isLoading}
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
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  box: {
    width: "100%",
    borderRadius: 12,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 15,
  },
  bullet: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 10,
  },
  text: {
    fontSize: 14,
    marginTop: 10,
  },
  subText: {
    fontSize: 14,
    marginLeft: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 25,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 10,
    alignItems: "center",
  },
  cancelBtnDisabled: {
    opacity: 0.5,
  },
  acceptBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    marginLeft: 10,
    alignItems: "center",
  },
  cancelTxt: {
    fontSize: 16,
    fontWeight: "600",
  },
  acceptTxt: {
    fontSize: 16,
    fontWeight: "600",
  },
  acceptBtnDisabled: {
    opacity: 0.7,
  },
});
