import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  RefreshControl,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useToast } from 'react-native-toast-notifications';
import { useBusinessProfileTheme } from '../../theme/useBusinessProfileTheme';
import { useThemeContext } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n';
import { useStripeCustomer } from '../../hooks/useStripeCustomer';
import { showToastMessage } from '../../components/displaytoastmessage';
import StripePaymentMethodModal from '../../components/modals/StripePaymentMethodModal';

export default function BillingPaymentsScreen() {
  const navigation = useNavigation();
  const toast = useToast();
  const { t } = useLanguage();
  const { isDarkMode } = useThemeContext();
  const {
    bgStyle,
    text,
    accent,
    card,
    border,
    mutedText,
    isBusinessProfile,
  } = useBusinessProfileTheme();

  const handleOpenDrawer = () => {
    try {
      navigation.dispatch(DrawerActions.openDrawer());
    } catch (_e) {
      navigation.getParent()?.getParent()?.openDrawer?.();
    }
  };

  return (
    <SafeAreaView style={[{ flex: 1 }, bgStyle]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: border }]}>
        <TouchableOpacity
          onPress={handleOpenDrawer}
          style={styles.headerLeftBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="menu" size={26} color={text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: text }]}>
          {t('drawerNav.billingPayments', 'Billing & Payments')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.constructionContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated Mascot / Sticker */}
        <View style={styles.mascotWrap}>
          <Image
            source={require('../../assets/Valens Stickers/Valens Stickers/PNG/analyzing.png')}
            style={styles.mascotImage}
            resizeMode="contain"
          />
        </View>

        {/* Work in Progress Badge */}
        <View
          style={[
            styles.badgePill,
            {
              backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.18)' : '#FEF3C7',
              borderColor: isDarkMode ? '#78350F' : '#FDE68A',
            },
          ]}
        >
          <MaterialCommunityIcons name="tools" size={15} color="#D97706" style={{ marginRight: 6 }} />
          <Text style={[styles.badgeText, { color: isDarkMode ? '#FBBF24' : '#B45309' }]}>
            {t('billingPayments.workInProgress', 'WORK IN PROGRESS')}
          </Text>
        </View>

        {/* Headline & Description */}
        <Text style={[styles.constructionTitle, { color: text }]}>
          {t('billingPayments.underConstructionTitle', 'Under Construction')}
        </Text>
        <Text style={[styles.constructionSubtitle, { color: mutedText }]}>
          {t(
            'billingPayments.underConstructionDesc',
            'We are actively developing the Billing & Payments hub. Soon you will be able to manage payment methods, membership billing, and payouts seamlessly in one place.',
          )}
        </Text>

        {/* Feature Preview Cards */}
        <View style={[styles.previewCard, { backgroundColor: card, borderColor: border }]}>
          <Text style={[styles.previewCardHeading, { color: text }]}>
            {t('billingPayments.whatToExpect', 'What to Expect:')}
          </Text>

          <View style={styles.featureItem}>
            <View style={[styles.featureIconWrap, { backgroundColor: isDarkMode ? '#2d1b4e' : '#F3E8FF' }]}>
              <MaterialCommunityIcons name="credit-card-outline" size={20} color={accent} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.featureTitle, { color: text }]}>
                {t('billingPayments.featureCards', 'Payment Methods')}
              </Text>
              <Text style={[styles.featureDesc, { color: mutedText }]}>
                {t('billingPayments.featureCardsDesc', 'Secure cards, Apple Pay, Google Pay, and Stripe support.')}
              </Text>
            </View>
          </View>

          <View style={[styles.featureDivider, { backgroundColor: border }]} />

          <View style={styles.featureItem}>
            <View style={[styles.featureIconWrap, { backgroundColor: isDarkMode ? '#2d1b4e' : '#F3E8FF' }]}>
              <MaterialCommunityIcons name="crown-outline" size={20} color={accent} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.featureTitle, { color: text }]}>
                {t('billingPayments.featureMembership', 'Membership & Invoices')}
              </Text>
              <Text style={[styles.featureDesc, { color: mutedText }]}>
                {t('billingPayments.featureMembershipDesc', 'Easy subscription management, monthly renewal, and invoices.')}
              </Text>
            </View>
          </View>

          <View style={[styles.featureDivider, { backgroundColor: border }]} />

          <View style={styles.featureItem}>
            <View style={[styles.featureIconWrap, { backgroundColor: isDarkMode ? '#2d1b4e' : '#F3E8FF' }]}>
              <MaterialCommunityIcons name="cash-fast" size={20} color={accent} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.featureTitle, { color: text }]}>
                {t('billingPayments.featurePayouts', 'Creator Payouts')}
              </Text>
              <Text style={[styles.featureDesc, { color: mutedText }]}>
                {t('billingPayments.featurePayoutsDesc', 'Fast and direct cashouts to your connected bank account.')}
              </Text>
            </View>
          </View>
        </View>

        {/* Back to Dashboard Button */}
        <TouchableOpacity
          style={[styles.returnButton, { backgroundColor: accent }]}
          onPress={() => navigation.navigate('Dashboard')}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.returnButtonText}>
            {t('billingPayments.backToDashboard', 'Back to Dashboard')}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* =========================================================================
       * ACTIVE IMPLEMENTATION (Preserved below for when ready to go live)
       * =========================================================================
       *
       * <ScrollView contentContainerStyle={styles.scrollContent}>
       *   <View style={styles.sectionHeader}>
       *     <Text style={[styles.sectionTitle, { color: text }]}>Payment Method</Text>
       *   </View>
       *   <LinearGradient colors={['#581C87', '#3B0764']} style={styles.cardGradient}>
       *     <View style={styles.cardTopRow}>
       *       <MaterialCommunityIcons name="integrated-circuit-chip" size={32} color="#E9D5FF" />
       *       <Text style={styles.statusText}>Active</Text>
       *     </View>
       *     <Text style={styles.cardNumberMasked}>•••• •••• •••• 4242</Text>
       *     <Text style={styles.cardHolderName}>Stripe Connected</Text>
       *   </LinearGradient>
       *   <TouchableOpacity style={styles.actionBtn} onPress={handleManageCard}>
       *     <Text>Update Payment Method</Text>
       *   </TouchableOpacity>
       *   ...
       * </ScrollView>
       * ========================================================================= */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeftBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  constructionContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  mascotWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  mascotImage: {
    width: 150,
    height: 140,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  constructionTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  constructionSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  previewCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  previewCardHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  featureDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  returnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 50,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  returnButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
