import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Image,
    ScrollView,
    Keyboard,
    Platform,
    useWindowDimensions,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { getUserCredentials } from "../../services/post";
import { hideLoader, showLoader } from "../../redux/actions/LoaderAction";
import { showToastMessage } from "../../components/displaytoastmessage";
import { useToast } from "react-native-toast-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RBSheet from "react-native-raw-bottom-sheet";
import TokenPurchaseModal from "../../components/modals/TokenPurchaseModal";
import { getCreditsLeft } from "../../services/wallet";
import TokenSellModal from "../../components/modals/TokenSellModal";
import CreditPurchaseModal from "../../components/modals/PurchaseCreditsModal";
import { ensureKycApprovedForPayment } from "../../utils/kycPaymentGuard";
import { useBusinessProfileTheme } from "../../theme/useBusinessProfileTheme";
import { useThemeContext } from "../../theme/ThemeContext";
import HexAvatar from "../../components/home/story.js/HexAvatar";
import { useLanguage } from "../../i18n";
import { getDragonflyIcon } from "../../components/profile/ProfilePersonalData";
import { BASE_URL } from "../../config/urls";
import {
    getActivePaymentProvider,
    hydratePaymentProvider,
    persistPaymentProvider,
    persistUserCountry,
    readPaymentProvider,
    readUserCountry,
    formatProviderAmount,
} from "../../utils/paymentCurrency";

export default function WalletComponent() {
    const [userData, setUserData] = useState();
    const [subscriptionHitsLeft, setSubscriptionHitsLeft] = useState(0);
    const [purchasedHitsLeft, setPurchasedHitsLeft] = useState(0);
    const [maxPurchasedHits, setMaxPurchasedHits] = useState(5);
    const [canBuyHits, setCanBuyHits] = useState(true);
    const [showCreditModal, setShowCreditModal] = useState(false);
    const [paymentProvider, setPaymentProvider] = useState(getActivePaymentProvider);

    const navigation = useNavigation();
    const dispatch = useDispatch();
    const toast = useToast();
    const purchaseSheetRef = useRef(null);
    const sellSheetRef = useRef(null);
    const profileImage = useSelector(state => state.profileImage?.profileImg);
    const { isBusinessProfile, bgStyle, textStyle, accent } = useBusinessProfileTheme();
    const { isDarkMode } = useThemeContext();
    const { width: screenWidth } = useWindowDimensions();
    const { t } = useLanguage();

    const missionPostPrice = formatProviderAmount(1.99, paymentProvider);

    const userVerificationStatus = useMemo(() => {
        const verified = userData?.kyc === true;
        return {
            verified,
            level: verified
                ? t('walletScreen.dragonflyVerified')
                : t('walletScreen.profileNotVerified'),
        };
    }, [t, userData?.kyc]);

    const DragonflyIcon = useMemo(() => {
        const followerCount = Number(
            userData?.totalFollowers ??
            userData?.followers ??
            userData?.followerCount ??
            0
        );
        return getDragonflyIcon(followerCount, isBusinessProfile, isDarkMode);
    }, [userData?.followerCount, userData?.followers, userData?.totalFollowers, isDarkMode, isBusinessProfile]);

    useEffect(() => {
        let cancelled = false;
        hydratePaymentProvider().then((provider) => {
            if (!cancelled && provider) setPaymentProvider(provider);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const fetchUserCreds = useCallback(async () => {
        const id = await AsyncStorage.getItem('userId');
        try {
            dispatch(showLoader());
            const response = await getUserCredentials(id);
            if (response?.statusCode === 200) {
                let userDataToSet;
                if (response.data && response.data.user) {
                    userDataToSet = response.data.user;
                } else if (response.data) {
                    userDataToSet = response.data;
                } else {
                    userDataToSet = response;
                }
                if (userDataToSet?.image) {
                    let formattedImageUrl = userDataToSet.image.trim();
                    if (!formattedImageUrl.startsWith('http://') && !formattedImageUrl.startsWith('https://')) {
                        formattedImageUrl = formattedImageUrl.startsWith('/')
                            ? `${BASE_URL}${formattedImageUrl}`
                            : `${BASE_URL}/${formattedImageUrl}`;
                    }
                    userDataToSet.image = formattedImageUrl;
                }
                setUserData(userDataToSet);
                const profileProvider = readPaymentProvider(userDataToSet);
                if (profileProvider !== undefined) {
                    const savedProvider = await persistPaymentProvider(profileProvider);
                    setPaymentProvider(savedProvider);
                }
                const profileCountry = readUserCountry(userDataToSet);
                if (profileCountry !== undefined) {
                    await persistUserCountry(profileCountry);
                }
            }
        } catch (error) {
            // silent
        } finally {
            dispatch(hideLoader());
        }
    }, [dispatch]);

    const fetchCreditsLeft = useCallback(async () => {
        try {
            dispatch(showLoader());
            const response = await getCreditsLeft();
            if (response?.statusCode === 200) {
                const toCount = (value, fallback = 0) => {
                    const parsed = Number(value);
                    return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
                };
                const data = response?.data || {};
                setSubscriptionHitsLeft(toCount(data.subscriptionHitsLeft));
                setPurchasedHitsLeft(toCount(data.purchasedHitsLeft));
                setMaxPurchasedHits(toCount(data.maxPurchasedHits, 5) || 5);
                setCanBuyHits(data.canBuyHits !== false);
            }
        } catch (error) {
            // silent
        } finally {
            dispatch(hideLoader());
        }
    }, [dispatch]);

    useFocusEffect(
        useCallback(() => {
            fetchUserCreds();
            fetchCreditsLeft();
        }, [fetchCreditsLeft, fetchUserCreds])
    );

    const handleBuyCredits = async () => {
        if (!canBuyHits || purchasedHitsLeft >= maxPurchasedHits) {
            showToastMessage(toast, 'danger', t('walletScreen.maxCreditsReached', 'You already have maximum credits.'));
            return;
        }
        const isKycApproved = await ensureKycApprovedForPayment({
            navigation,
            toast,
            t,
        });
        if (!isKycApproved) {
            return;
        }
        setShowCreditModal(true);
    };

    // Dynamic color & theme definitions based on profile mode (Persona / Business)
    const brandColor = isBusinessProfile
        ? (isDarkMode ? '#D4B06A' : '#C9A15A')
        : (isDarkMode ? '#A855F7' : '#6B21A8');
    const cardBg = isDarkMode
        ? (isBusinessProfile ? '#1F1A13' : '#1A1226')
        : (isBusinessProfile ? '#FFFDF9' : '#FFFFFF');
    const cardBorderColor = isDarkMode
        ? (isBusinessProfile ? 'rgba(212, 176, 106, 0.28)' : 'rgba(255,255,255,0.08)')
        : (isBusinessProfile ? '#EEDCB8' : '#EDE9FE');
    const statBoxBg = isDarkMode
        ? (isBusinessProfile ? 'rgba(212, 176, 106, 0.12)' : 'rgba(255,255,255,0.06)')
        : (isBusinessProfile ? '#FBF6EA' : '#F6F0FD');
    const statBoxBorderColor = isBusinessProfile
        ? (isDarkMode ? 'rgba(212, 176, 106, 0.25)' : '#E8D5A5')
        : 'transparent';
    const statLabelColor = isBusinessProfile
        ? (isDarkMode ? '#F3E2B8' : '#8C6510')
        : (isDarkMode ? '#D8B4FE' : '#4C1D95');
    const statValueColor = isBusinessProfile
        ? (isDarkMode ? '#FFFFFF' : '#8C6510')
        : (isDarkMode ? '#F5F3FF' : '#4C1D95');
    const iconBadgeBg = isDarkMode
        ? (isBusinessProfile ? 'rgba(212, 176, 106, 0.22)' : 'rgba(107,33,168,0.25)')
        : (isBusinessProfile ? '#FBF6EA' : '#F3E8FF');
    const heroTitleColor = isBusinessProfile
        ? (isDarkMode ? '#F5E6C4' : '#8C6510')
        : (isDarkMode ? '#FFFFFF' : '#111827');
    const heroSubtitleColor = isBusinessProfile
        ? (isDarkMode ? '#D4B06A' : '#A37A24')
        : (isDarkMode ? '#9CA3AF' : '#4B5563');
    const cardTitleColor = isBusinessProfile
        ? (isDarkMode ? '#F3E2B8' : '#8C6510')
        : (isDarkMode ? '#FFFFFF' : '#111827');
    const bodyDescColor = isBusinessProfile
        ? (isDarkMode ? '#E5D6B8' : '#6E5218')
        : (isDarkMode ? '#9CA3AF' : '#4B5563');
    const ruleTitleColor = isBusinessProfile
        ? (isDarkMode ? '#F3E2B8' : '#8C6510')
        : (isDarkMode ? '#FFFFFF' : '#111827');
    const ruleDescColor = isBusinessProfile
        ? (isDarkMode ? '#D4B06A' : '#7A5B18')
        : (isDarkMode ? '#9CA3AF' : '#4B5563');
    const ruleDividerColor = isBusinessProfile
        ? (isDarkMode ? 'rgba(212, 176, 106, 0.18)' : '#F3E8CC')
        : cardBorderColor;
    const profileNameColor = isBusinessProfile
        ? (isDarkMode ? '#F3E2B8' : '#8C6510')
        : (isDarkMode ? '#FFFFFF' : '#111827');
    const swordIconColor = isBusinessProfile
        ? brandColor
        : (isDarkMode ? '#9CA3AF' : '#6B7280');
    const cardShadowColor = isBusinessProfile ? (isDarkMode ? '#000000' : '#C9A15A') : '#7C3AED';
    const buttonBg = isDarkMode
        ? (isBusinessProfile ? '#D4B06A' : '#7C3AED')
        : (isBusinessProfile ? '#C9A15A' : '#5E2490');

    // Dynamic Rocket Asset: gold rocket illustration for business profile, purple for personal
    const rocketImage = isBusinessProfile
        ? require('../../assets/Valens Stickers/Valens Stickers/PNG/rocket_gold.png')
        : require('../../assets/Valens Stickers/Valens Stickers/PNG/rocket.png');

    const displayName = userData?.displayName || userData?.name || userData?.username || 'Graziela Barrette';
    const avatarUri = profileImage || userData?.image;

    return (
        <SafeAreaView style={[styles.container, bgStyle]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* 1. Profile Bar */}
                <View style={styles.profileRow}>
                    <HexAvatar
                        uri={avatarUri}
                        size={44}
                        borderWidth={2}
                        borderColor={brandColor}
                    />
                    <View style={styles.profileTextWrapper}>
                        <Text style={[styles.profileName, { color: profileNameColor }]} numberOfLines={1}>
                            {displayName}
                        </Text>
                        <MaterialCommunityIcons
                            name="sword-cross"
                            size={16}
                            color={swordIconColor}
                            style={styles.swordIcon}
                        />
                        <DragonflyIcon width={18} height={18} style={styles.dragonflyIcon} />
                    </View>
                </View>
                <View style={[styles.divider, { backgroundColor: ruleDividerColor }]} />

                {/* 2. Hero Section */}
                <View style={styles.heroSection}>
                    <View style={styles.heroLeft}>
                        <Text style={[styles.heroTitle, { color: heroTitleColor }]}>
                            {t('walletScreen.heroTitle', 'Give your mission a lift.')}
                        </Text>
                        <Text style={[styles.heroSubtitle, { color: heroSubtitleColor }]}>
                            {t('walletScreen.heroSubtitle', 'Turn your community into backers.')}
                        </Text>
                    </View>
                    <Image
                        source={rocketImage}
                        style={styles.heroRocket}
                        resizeMode="contain"
                    />
                </View>

                {/* 3. Card 1: Your Mission Credits */}
                <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorderColor, shadowColor: cardShadowColor }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconBadge, { backgroundColor: iconBadgeBg }]}>
                            <MaterialCommunityIcons
                                name="credit-card-outline"
                                size={16}
                                color={brandColor}
                            />
                        </View>
                        <Text style={[styles.cardTitle, { color: cardTitleColor }]}>
                            {t('walletScreen.yourMissionCredits', 'Your Mission Credits')}
                        </Text>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={[styles.statBox, { backgroundColor: statBoxBg, borderColor: statBoxBorderColor, borderWidth: isBusinessProfile ? 1 : 0 }]}>
                            <Text style={[styles.statLabel, { color: statLabelColor }]} numberOfLines={1}>
                                {t('walletScreen.membershipCredits', 'Membership credits')}
                            </Text>
                            <Text style={[styles.statValue, { color: statValueColor }]}>
                                {subscriptionHitsLeft}
                            </Text>
                        </View>

                        <View style={[styles.statBox, { backgroundColor: statBoxBg, borderColor: statBoxBorderColor, borderWidth: isBusinessProfile ? 1 : 0 }]}>
                            <Text style={[styles.statLabel, { color: statLabelColor }]} numberOfLines={1}>
                                {t('walletScreen.purchasedCredits', 'Purchased credits')}
                            </Text>
                            <Text style={[styles.statValue, { color: statValueColor }]}>
                                {purchasedHitsLeft}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.buyButton,
                            { backgroundColor: buttonBg },
                            (!canBuyHits || purchasedHitsLeft >= maxPurchasedHits) && styles.buyButtonDisabled,
                        ]}
                        onPress={handleBuyCredits}
                        disabled={!canBuyHits || purchasedHitsLeft >= maxPurchasedHits}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.buyButtonText}>
                            {t('walletScreen.buyMissionPostBtn', {
                                price: missionPostPrice,
                                defaultValue: `Buy Mission Post • ${missionPostPrice}`,
                            })}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* 4. Card 2: What is a Mission Post? */}
                <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorderColor, shadowColor: cardShadowColor }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconBadgeCircle, { backgroundColor: iconBadgeBg }]}>
                            <Ionicons name="information" size={16} color={brandColor} />
                        </View>
                        <Text style={[styles.cardTitle, { color: cardTitleColor }]}>
                        {t('walletScreen.whatIsMissionPost', 'What is a Mission Post?')}
                        </Text>
                    </View>
                    <Text style={[styles.bodyDescription, { color: bodyDescColor }]}>
                        {t('walletScreen.missionPostDescription', 'Set a goal, share your vision, and let your community help fund what matters.')}
                    </Text>
                </View>

                {/* 5. Card 3: Mission Post Rules */}
                <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorderColor, shadowColor: cardShadowColor }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconBadge, { backgroundColor: iconBadgeBg }]}>
                            <Ionicons name="document-text-outline" size={16} color={brandColor} />
                        </View>
                        <Text style={[styles.cardTitle, { color: cardTitleColor }]}>
                        {t('walletScreen.missionRulesTitle', 'Mission Post Rules')}
                        </Text>
                    </View>

                    <View style={styles.rulesList}>
                        {/* Monthly Members */}
                        <View style={styles.ruleItem}>
                            <View style={[styles.ruleIconBadge, { backgroundColor: iconBadgeBg }]}>
                                <MaterialCommunityIcons name="crown-outline" size={22} color={brandColor} />
                            </View>
                            <View style={styles.ruleContent}>
                                <Text style={[styles.ruleTitle, { color: ruleTitleColor }]}>
                                    {t('walletScreen.monthlyMembersTitle', 'Monthly Members')}
                                </Text>
                                <Text style={[styles.ruleDesc, { color: ruleDescColor }]}>
                                    {t('walletScreen.monthlyMembersDesc', '5 Mission Posts included each month.')}
                                </Text>
                            </View>
                        </View>

                        <View style={[styles.ruleDivider, { backgroundColor: ruleDividerColor }]} />

                        {/* Non-Members */}
                        <View style={styles.ruleItem}>
                            <View style={[styles.ruleIconBadge, { backgroundColor: iconBadgeBg }]}>
                                <MaterialCommunityIcons name="tag-outline" size={20} color={brandColor} />
                            </View>
                            <View style={styles.ruleContent}>
                                <Text style={[styles.ruleTitle, { color: ruleTitleColor }]}>
                                    {t('walletScreen.nonMembersTitle', 'Non-Members')}
                                </Text>
                                <Text style={[styles.ruleDesc, { color: ruleDescColor }]}>
                                    {t('walletScreen.nonMembersDesc', {
                                        price: missionPostPrice,
                                        defaultValue: `${missionPostPrice} per Mission Post. Up to 5 per month.`,
                                    })}
                                </Text>
                            </View>
                        </View>

                        <View style={[styles.ruleDivider, { backgroundColor: ruleDividerColor }]} />

                        {/* Monthly Limit */}
                        <View style={styles.ruleItem}>
                            <View style={[styles.ruleIconBadge, { backgroundColor: iconBadgeBg }]}>
                                <Ionicons name="calendar-outline" size={20} color={brandColor} />
                            </View>
                            <View style={styles.ruleContent}>
                                <Text style={[styles.ruleTitle, { color: ruleTitleColor }]}>
                                    {t('walletScreen.monthlyLimitTitle', 'Monthly Limit')}
                                </Text>
                                <Text style={[styles.ruleDesc, { color: ruleDescColor }]}>
                                    {t('walletScreen.monthlyLimitDesc', 'Up to 5 posts per month. Unused credits do not roll over. Your limit resets each month.')}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Token Purchase Modal (kept for functional compatibility) */}
            <RBSheet
                ref={purchaseSheetRef}
                height={500}
                openDuration={250}
                draggable={true}
                closeOnPressMask={true}
                customStyles={{
                    container: [{ borderTopLeftRadius: 30, borderTopRightRadius: 30, bottom: -30 }, bgStyle],
                    draggableIcon: { backgroundColor: '#ccc', width: 60 },
                }}
            >
                <TokenPurchaseModal
                    onClose={() => purchaseSheetRef.current?.close?.()}
                    onPurchase={() => purchaseSheetRef.current?.close?.()}
                    hasFollowing={true}
                    autoFocus={false}
                    vendorid=""
                />
            </RBSheet>

            {/* Token Sell Modal (kept for functional compatibility) */}
            <RBSheet
                ref={sellSheetRef}
                height={550}
                openDuration={250}
                draggable={true}
                closeOnPressMask={true}
                customStyles={{
                    container: [{ borderTopLeftRadius: 30, borderTopRightRadius: 30, bottom: -30 }, bgStyle],
                    draggableIcon: { backgroundColor: '#ccc', width: 60 },
                }}
            >
                <TokenSellModal
                    onSell={() => sellSheetRef.current?.close?.()}
                    userId=""
                    tokenAddress={null}
                />
            </RBSheet>

            <CreditPurchaseModal
                visible={showCreditModal}
                navigation={navigation}
                onClose={() => setShowCreditModal(false)}
                onPurchaseComplete={() => {
                    fetchCreditsLeft();
                    setShowCreditModal(false);
                }}
                currentCredits={purchasedHitsLeft}
                maxPurchasable={Math.max(0, maxPurchasedHits - purchasedHitsLeft)}
                isBusinessProfile={isBusinessProfile}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: Platform.OS === 'ios' ? 40 : 30,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    profileTextWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 12,
        flex: 1,
    },
    profileName: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    swordIcon: {
        marginLeft: 8,
    },
    dragonflyIcon: {
        marginLeft: 6,
    },
    divider: {
        height: 1,
        width: '100%',
        marginTop: 8,
        marginBottom: 8,
    },
    heroSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 2,
        marginBottom: 6,
    },
    heroLeft: {
        flex: 1,
        paddingRight: 10,
    },
    heroTitle: {
        fontSize: 24,
        fontWeight: '800',
        lineHeight: 30,
        letterSpacing: -0.4,
    },
    heroSubtitle: {
        fontSize: 14,
        fontWeight: '400',
        lineHeight: 20,
        marginTop: 6,
    },
    heroRocket: {
        width: 130,
        height: 140,
        flexShrink: 0,
    },
    card: {
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBadge: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconBadgeCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 10,
        letterSpacing: -0.2,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 14,
        marginBottom: 14,
    },
    statBox: {
        flex: 1,
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statLabel: {
        fontSize: 12.5,
        fontWeight: '600',
        textAlign: 'center',
    },
    statValue: {
        fontSize: 26,
        fontWeight: '800',
        marginTop: 4,
        textAlign: 'center',
    },
    buyButton: {
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    buyButtonDisabled: {
        opacity: 0.45,
    },
    buyButtonText: {
        color: '#FFFFFF',
        fontSize: 15.5,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    bodyDescription: {
        fontSize: 13.5,
        lineHeight: 20,
        marginTop: 10,
        fontWeight: '400',
    },
    rulesList: {
        marginTop: 12,
    },
    ruleItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    ruleIconBadge: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        marginTop: 2,
    },
    ruleContent: {
        flex: 1,
    },
    ruleTitle: {
        fontSize: 14.5,
        fontWeight: '700',
    },
    ruleDesc: {
        fontSize: 13,
        lineHeight: 18,
        marginTop: 2,
        fontWeight: '400',
    },
    ruleDivider: {
        height: 1,
        width: '100%',
        marginVertical: 12,
    },
});
