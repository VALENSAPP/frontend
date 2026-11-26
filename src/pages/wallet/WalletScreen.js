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
import LinearGradient from "react-native-linear-gradient";
import Svg, { Path } from "react-native-svg";
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
        : (isDarkMode ? '#FFFFFF' : '#160B24');
    const heroSubtitleColor = isBusinessProfile
        ? (isDarkMode ? '#D4B06A' : '#A37A24')
        : (isDarkMode ? '#C4A8E2' : '#6B4791');
    const heroGradient = isBusinessProfile
        ? (isDarkMode ? ['#2D2316', '#1E170C'] : ['#FCF9F2', '#F3E8CE'])
        : (isDarkMode ? ['#26193E', '#1B112D'] : ['#FAF6FF', '#EBE0F8']);
    const heroBorderColor = isBusinessProfile
        ? (isDarkMode ? 'rgba(212, 176, 106, 0.22)' : '#EBDCB9')
        : (isDarkMode ? 'rgba(168, 85, 247, 0.18)' : '#EAE0F5');
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
        ? require('../../assets/Valens Stickers/Valens Stickers/PNG/launchG.png')
        : require('../../assets/Valens Stickers/Valens Stickers/PNG/launchnew.png');

    const displayName = userData?.displayName || userData?.name || userData?.username || 'Graziela Barrette';
    const avatarUri = profileImage || userData?.image;

    return (
        <SafeAreaView style={[styles.container, bgStyle]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* 1. Profile Bar matching mockup */}
                <View style={styles.profileRow}>
                    <HexAvatar
                        uri={avatarUri}
                        size={42}
                        borderWidth={2}
                        borderColor={brandColor}
                        pointyTop
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
                        <DragonflyIcon width={17} height={17} style={styles.dragonflyIcon} />
                    </View>
                </View>

                <View style={[styles.divider, { backgroundColor: ruleDividerColor }]} />

                {/* 2. Hero Section with 2-color gradient background matching mockup */}
                <View style={[styles.heroCard, { borderColor: heroBorderColor }]}>
                    <LinearGradient
                        colors={heroGradient}
                        start={{ x: 0, y: 0.15 }}
                        end={{ x: 1, y: 0.85 }}
                        style={StyleSheet.absoluteFill}
                    />

                    {/* Subtle curved background wave */}
                    <View style={styles.heroWaveWrap} pointerEvents="none">
                        <Svg width="100%" height="100%" viewBox="0 0 340 120" preserveAspectRatio="none">
                            <Path
                                d="M0,60 C90,90 170,40 240,65 C285,80 315,62 340,50 L340,120 L0,120 Z"
                                fill={isDarkMode ? 'rgba(255, 255, 255, 0.04)' : (isBusinessProfile ? 'rgba(212, 176, 106, 0.14)' : 'rgba(186, 154, 238, 0.22)')}
                            />
                        </Svg>
                    </View>

                    <View style={styles.heroRow}>
                        <View style={styles.heroLeft}>
                            <Text style={[styles.heroTitle, { color: heroTitleColor }]}>
                                Give your{'\n'}mission a lift.
                            </Text>
                            <Text style={[styles.heroSubtitle, { color: heroSubtitleColor }]}>
                                Turn your community{'\n'}into backers.
                            </Text>
                        </View>
                        <Image
                            source={rocketImage}
                            style={styles.heroRocket}
                            resizeMode="contain"
                        />
                    </View>
                </View>

                {/* 3. Card 1: Your Mission Credits matching mockup */}
                <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorderColor, shadowColor: cardShadowColor }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconBadge, { backgroundColor: iconBadgeBg }]}>
                            <Ionicons name="card-outline" size={15} color={brandColor} />
                        </View>
                        <Text style={[styles.cardTitle, { color: cardTitleColor }]}>
                            {t('walletScreen.yourMissionCredits', 'Your Mission Credits')}
                        </Text>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={[styles.statBox, { backgroundColor: statBoxBg, borderColor: statBoxBorderColor, borderWidth: isBusinessProfile ? 1 : 0 }]}>
                            <Text style={[styles.statLabel, { color: statLabelColor }]}>
                                {t('walletScreen.membershipCredits', 'Membership\ncredits')}
                            </Text>
                            <Text style={[styles.statValue, { color: statValueColor }]}>
                                {subscriptionHitsLeft}
                            </Text>
                        </View>

                        <View style={[styles.statBox, { backgroundColor: statBoxBg, borderColor: statBoxBorderColor, borderWidth: isBusinessProfile ? 1 : 0 }]}>
                            <Text style={[styles.statLabel, { color: statLabelColor }]}>
                                {t('walletScreen.purchasedCredits', 'Purchased\ncredits')}
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
                        activeOpacity={0.88}
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
                    <View style={[styles.cardHeader, { marginBottom: 4 }]}>
                        <View style={[styles.iconBadgeCircle, { backgroundColor: iconBadgeBg }]}>
                            <MaterialCommunityIcons name="information-variant" size={14} color={brandColor} />
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
                            <Ionicons name="document-text-outline" size={14} color={brandColor} />
                        </View>
                        <Text style={[styles.cardTitle, { color: cardTitleColor }]}>
                            {t('walletScreen.missionRulesTitle', 'Mission Post Rules')}
                        </Text>
                    </View>

                    <View style={styles.rulesList}>
                        {/* Monthly Members */}
                        <View style={styles.ruleItem}>
                            <View style={[styles.ruleIconBadge, { backgroundColor: iconBadgeBg }]}>
                                <MaterialCommunityIcons name="crown-outline" size={15} color={brandColor} />
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
                                <MaterialCommunityIcons name="tag-outline" size={14} color={brandColor} />
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
                                <Ionicons name="calendar-outline" size={14} color={brandColor} />
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
        paddingTop: 4,
        paddingBottom: 12,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 3,
    },
    profileTextWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 12,
        flex: 1,
    },
    profileName: {
        fontSize: 16.5,
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
        marginTop: 5,
        marginBottom: 7,
    },
    heroCard: {
        borderRadius: 18,
        overflow: 'hidden',
        position: 'relative',
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: 8,
        borderWidth: 1,
    },
    heroWaveWrap: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    heroRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        zIndex: 1,
    },
    heroLeft: {
        flex: 1,
        paddingRight: 8,
        justifyContent: 'center',
    },
    heroTitle: {
        fontSize: 22,
        fontWeight: '800',
        lineHeight: 27,
        letterSpacing: -0.3,
    },
    heroSubtitle: {
        fontSize: 13.5,
        fontWeight: '500',
        lineHeight: 18,
        marginTop: 6,
    },
    heroRocket: {
        width: 105,
        height: 116,
        flexShrink: 0,
    },
    card: {
        borderRadius: 16,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: 8,
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
        marginBottom: 8,
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
        fontSize: 15,
        fontWeight: '700',
        marginLeft: 9,
        letterSpacing: -0.2,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
    },
    statBox: {
        flex: 1,
        borderRadius: 11,
        paddingVertical: 9,
        paddingHorizontal: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 15,
    },
    statValue: {
        fontSize: 23,
        fontWeight: '800',
        marginTop: 2,
        textAlign: 'center',
    },
    buyButton: {
        borderRadius: 12,
        paddingVertical: 11,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    buyButtonDisabled: {
        opacity: 0.5,
    },
    buyButtonText: {
        color: '#FFFFFF',
        fontSize: 14.5,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    bodyDescription: {
        fontSize: 12.5,
        lineHeight: 17,
        fontWeight: '400',
    },
    rulesList: {
        marginTop: 2,
    },
    ruleItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 3,
    },
    ruleIconBadge: {
        width: 24,
        height: 24,
        borderRadius: 7,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 9,
        marginTop: 1,
    },
    ruleContent: {
        flex: 1,
    },
    ruleTitle: {
        fontSize: 13,
        fontWeight: '700',
    },
    ruleDesc: {
        fontSize: 11.5,
        lineHeight: 15,
        marginTop: 1,
        fontWeight: '400',
    },
    ruleDivider: {
        height: 1,
        width: '100%',
        marginVertical: 5,
    },
});
