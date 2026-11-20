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
        ? (isDarkMode ? '#D4B06A' : '#CBA257')
        : (isDarkMode ? '#A855F7' : '#402090');
    const cardBg = isDarkMode
        ? (isBusinessProfile ? '#1F1A13' : '#1A1226')
        : (isBusinessProfile ? '#FFFFFF' : '#FFFFFF');
    const cardBorderColor = isDarkMode
        ? (isBusinessProfile ? 'rgba(212, 176, 106, 0.28)' : 'rgba(255,255,255,0.08)')
        : (isBusinessProfile ? '#E8D9BD' : '#EAE4F5');
    const statBoxBg = isDarkMode
        ? (isBusinessProfile ? 'rgba(212, 176, 106, 0.12)' : 'rgba(255,255,255,0.06)')
        : (isBusinessProfile ? '#FAF7F0' : '#F6F0FD');
    const statBoxBorderColor = isBusinessProfile
        ? (isDarkMode ? 'rgba(212, 176, 106, 0.25)' : '#E8D9BD')
        : 'transparent';
    const statLabelColor = isBusinessProfile
        ? (isDarkMode ? '#F3E2B8' : '#8C6510')
        : (isDarkMode ? '#D8B4FE' : '#402090');
    const statValueColor = isBusinessProfile
        ? (isDarkMode ? '#FFFFFF' : '#8C6510')
        : (isDarkMode ? '#F5F3FF' : '#402090');
    const iconBadgeBg = isDarkMode
        ? (isBusinessProfile ? 'rgba(212, 176, 106, 0.22)' : 'rgba(64,32,144,0.25)')
        : (isBusinessProfile ? '#FAF7F0' : '#F3EEFB');
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
                {/* 1. Profile Bar matching image6.png */}
                <View style={styles.profileRow}>
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
                    <HexAvatar
                        uri={avatarUri}
                        size={48}
                        borderWidth={2}
                        borderColor={brandColor}
                    />
                </View>

                {/* 2. Unified Hero & Mission Credits Card matching image6.png */}
                <View style={[styles.unifiedMissionCard, { backgroundColor: brandColor }]}>
                    <View style={styles.unifiedCardRow}>
                        {/* Left: Mascot Bug & Rocket Illustration */}
                        <View style={styles.unifiedRocketWrap}>
                            <Image
                                source={rocketImage}
                                style={styles.unifiedRocket}
                                resizeMode="contain"
                            />
                        </View>

                        {/* Translucent Vertical Divider */}
                        <View style={styles.unifiedDivider} />

                        {/* Right: Mission Posts & Credits */}
                        <View style={styles.unifiedRightCol}>
                            <Text style={styles.unifiedCardTitle}>
                                {t('walletScreen.missionPostsTitle', 'Mission Posts')}
                            </Text>

                            <View style={styles.unifiedBoxesRow}>
                                <View style={styles.unifiedStatBox}>
                                    <Text style={[styles.unifiedStatLabel, { color: brandColor }]}>
                                        {t('walletScreen.subscriptionCreditsShort', 'Subscription\ncredits')}
                                    </Text>
                                    <Text style={[styles.unifiedStatValue, { color: brandColor }]}>
                                        {subscriptionHitsLeft}
                                    </Text>
                                </View>

                                <View style={styles.unifiedStatBox}>
                                    <Text style={[styles.unifiedStatLabel, { color: brandColor }]}>
                                        {t('walletScreen.purchasedCreditsShort', 'Purchased\ncredits')}
                                    </Text>
                                    <Text style={[styles.unifiedStatValue, { color: brandColor }]}>
                                        {purchasedHitsLeft}
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.unifiedBuyBtn,
                                    (!canBuyHits || purchasedHitsLeft >= maxPurchasedHits) && styles.buyButtonDisabled,
                                ]}
                                onPress={handleBuyCredits}
                                disabled={!canBuyHits || purchasedHitsLeft >= maxPurchasedHits}
                                activeOpacity={0.88}
                            >
                                <Text style={[styles.unifiedBuyBtnText, { color: brandColor }]}>
                                    {t('walletScreen.getMissionPostBtn', {
                                        price: missionPostPrice,
                                        defaultValue: `Get Mission Post (${missionPostPrice} each)`,
                                    })}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* 4. Card 2: What is Mission Post? */}
                <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorderColor, shadowColor: cardShadowColor }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconBadgeCircle, { backgroundColor: iconBadgeBg }]}>
                            <Ionicons name="information" size={15} color={brandColor} />
                        </View>
                        <Text style={[styles.cardTitle, { color: cardTitleColor }]}>
                            {t('walletScreen.missionPostTitle', 'What is Mission Post?')}
                        </Text>
                    </View>
                    <Text style={[styles.bodyDescription, { color: bodyDescColor }]}>
                        {t('walletScreen.missionPostDescriptionLong', 'Mission Posts turn your audience into backers. Set a goal, share your vision, and let your community fund what matters. Built-in crowdfunding, zero friction.')}
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
                                <MaterialCommunityIcons name="crown-outline" size={18} color={brandColor} />
                            </View>
                            <View style={styles.ruleContent}>
                                <Text style={[styles.ruleTitle, { color: ruleTitleColor }]}>
                                    {t('walletScreen.monthlyMembersTitle', 'Monthly Members')}
                                </Text>
                                <Text style={[styles.ruleDesc, { color: ruleDescColor }]}>
                                    {t('walletScreen.monthlyMembersDescription', 'Your Valens membership includes 5 Mission Posts per month at no additional cost.')}
                                </Text>
                            </View>
                        </View>

                        <View style={[styles.ruleDivider, { backgroundColor: ruleDividerColor }]} />

                        {/* Non-Members */}
                        <View style={styles.ruleItem}>
                            <View style={[styles.ruleIconBadge, { backgroundColor: iconBadgeBg }]}>
                                <MaterialCommunityIcons name="tag-outline" size={17} color={brandColor} />
                            </View>
                            <View style={styles.ruleContent}>
                                <Text style={[styles.ruleTitle, { color: ruleTitleColor }]}>
                                    {t('walletScreen.nonMembersTitle', 'Non-Members')}
                                </Text>
                                <Text style={[styles.ruleDesc, { color: ruleDescColor }]}>
                                    {t('walletScreen.nonMembersDescription', {
                                        price: missionPostPrice,
                                        defaultValue: `Mission Posts are ${missionPostPrice} each, with a maximum of 5 Mission Posts per month.`,
                                    })}
                                </Text>
                            </View>
                        </View>

                        <View style={[styles.ruleDivider, { backgroundColor: ruleDividerColor }]} />

                        {/* Monthly Limit */}
                        <View style={styles.ruleItem}>
                            <View style={[styles.ruleIconBadge, { backgroundColor: iconBadgeBg }]}>
                                <Ionicons name="calendar-outline" size={17} color={brandColor} />
                            </View>
                            <View style={styles.ruleContent}>
                                <Text style={[styles.ruleTitle, { color: ruleTitleColor }]}>
                                    {t('walletScreen.monthlyLimitTitle', 'Monthly Limit')}
                                </Text>
                                <Text style={[styles.ruleDesc, { color: ruleDescColor }]}>
                                    {t('walletScreen.monthlyLimitDescription', 'Everyone can create up to 5 Mission Posts per month. Unused Mission Posts do not roll over. At the start of each new month, your limit resets to 5.')}
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
        paddingTop: 4,
        paddingBottom: 16,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        marginBottom: 2,
    },
    profileTextWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    profileName: {
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    unifiedMissionCard: {
        borderRadius: 18,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginTop: 4,
        marginBottom: 8,
        shadowColor: '#402090',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.16,
        shadowRadius: 10,
        elevation: 4,
    },
    unifiedCardRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    unifiedRocketWrap: {
        width: 85,
        height: 98,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unifiedRocket: {
        width: '100%',
        height: '100%',
    },
    unifiedDivider: {
        width: 1,
        height: 85,
        backgroundColor: 'rgba(255, 255, 255, 0.28)',
        marginHorizontal: 8,
    },
    unifiedRightCol: {
        flex: 1,
        justifyContent: 'center',
    },
    unifiedCardTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#FFFFFF',
        marginBottom: 5,
        letterSpacing: -0.2,
    },
    unifiedBoxesRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 6,
    },
    unifiedStatBox: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        paddingVertical: 4,
        paddingHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unifiedStatLabel: {
        fontSize: 9.5,
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: 11,
    },
    unifiedStatValue: {
        fontSize: 17,
        fontWeight: '900',
        marginTop: 1,
    },
    unifiedBuyBtn: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 7,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    unifiedBuyBtnText: {
        fontSize: 11.5,
        fontWeight: '800',
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
        borderRadius: 14,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginBottom: 7,
        borderWidth: 1,
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    iconBadge: {
        width: 24,
        height: 24,
        borderRadius: 7,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconBadgeCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '800',
        marginLeft: 8,
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
        fontSize: 11.5,
        lineHeight: 16,
        marginTop: 4,
        fontWeight: '400',
    },
    rulesList: {
        marginTop: 4,
    },
    ruleItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 2,
    },
    ruleIconBadge: {
        width: 26,
        height: 26,
        borderRadius: 7,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
        marginTop: 1,
    },
    ruleContent: {
        flex: 1,
    },
    ruleTitle: {
        fontSize: 12.5,
        fontWeight: '800',
    },
    ruleDesc: {
        fontSize: 11,
        lineHeight: 15,
        marginTop: 1,
        fontWeight: '400',
    },
    ruleDivider: {
        height: 1,
        width: '100%',
        marginVertical: 4,
    },
});
