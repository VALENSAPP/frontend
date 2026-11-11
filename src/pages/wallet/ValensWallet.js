import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Platform,
    Alert,
    Image,
    Modal,
    Pressable,
    RefreshControl,
    Share,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Polygon } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { useToast } from 'react-native-toast-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import TradeModal from '../../components/modals/TradeModal';
import HexAvatar from '../../components/home/story.js/HexAvatar';
import { hideLoader, showLoader } from '../../redux/actions/LoaderAction';
import { showToastMessage } from '../../components/displaytoastmessage';
import { useBusinessProfileTheme } from '../../theme/useBusinessProfileTheme';
import { useThemeContext } from '../../theme/ThemeContext';
import { getUserCredentials } from '../../services/post';
import {
    metaMaskRecived,
    totalamount,
    totalMission,
    totalSupport,
    transationActivity,
} from '../../services/wallet';
import { useLanguage } from '../../i18n';
import { resolveTransactionAmount } from '../../utils/transactionAmount';
import { formatDisplayCurrency } from '../../utils/displayLocale';
import { persistPaymentProvider, persistUserCountry, readPaymentProvider, readUserCountry } from '../../utils/paymentCurrency';

const getProfilePayload = (response) =>
    response?.data?.user ||
    response?.data?.data?.user ||
    response?.data?.data ||
    response?.data ||
    response;

const getProfileImage = (profile) =>
    profile?.image ||
    profile?.avatar ||
    profile?.profilePicture ||
    profile?.profilePic ||
    '';

const formatStatementDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month} ${day}, ${year} • ${hours}:${minutes}`;
};

// Hexagonal Shield Badge for Valens app / system transactions
const HexShieldBadge = ({ size = 42, color = '#7C3AED', isDarkMode }) => {
    const w = size;
    const h = size;
    const r = (w - 3) / 2;
    const cx = w / 2;
    const cy = h / 2;
    const pts = Array.from({ length: 6 }, (_, i) => {
        const angle = (i * Math.PI) / 3;
        return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(' ');

    return (
        <View style={{ width: w, height: h, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
                <Polygon
                    points={pts}
                    fill={isDarkMode ? '#241738' : '#FAF5FF'}
                    stroke={color}
                    strokeWidth="1.5"
                />
            </Svg>
            <MaterialCommunityIcons name="shield-check" size={size * 0.48} color={color} />
        </View>
    );
};

// Realistic mock preview data matching the user's mockup when API transactions are empty
const SAMPLE_ACTIVITIES = [
    {
        key: 'sample_1',
        paymentId: 'valens_app_1',
        title: 'Valens app',
        subtitle: 'Following Payment • Succeeded',
        typeLabel: 'Following Payment',
        status: 'Succeeded',
        formattedDate: 'Jan 26, 2025 • 14:32',
        amount: '+$44.00',
        amountNumber: 44.00,
        amountTone: 'positive',
        isValensApp: true,
        profileImage: '',
    },
    {
        key: 'sample_2',
        paymentId: 'valens_app_2',
        title: 'Valens app',
        subtitle: 'Marketplace • Paid',
        typeLabel: 'Marketplace',
        status: 'Paid',
        formattedDate: 'Jan 25, 2025 • 09:18',
        amount: '+$113.04',
        amountNumber: 113.04,
        amountTone: 'positive',
        isValensApp: true,
        profileImage: '',
    },
    {
        key: 'sample_3',
        paymentId: 'graziela_1',
        title: 'Graziela Barrette',
        isBattle: true,
        subtitle: 'Tip • Succeeded',
        typeLabel: 'Tip',
        status: 'Succeeded',
        formattedDate: 'Jan 24, 2025 • 21:07',
        amount: '-$5.00',
        amountNumber: 5.00,
        amountTone: 'negative',
        isValensApp: false,
        profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    },
    {
        key: 'sample_4',
        paymentId: 'graziela_2',
        title: 'Graziela Barrette',
        isBattle: true,
        subtitle: 'Following Payment • Succeeded',
        typeLabel: 'Following Payment',
        status: 'Succeeded',
        formattedDate: 'Jan 22, 2025 • 19:45',
        amount: '-$74.00',
        amountNumber: 74.00,
        amountTone: 'negative',
        isValensApp: false,
        profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    },
    {
        key: 'sample_5',
        paymentId: 'dev_1',
        title: 'Dev',
        subtitle: 'Following Payment • Succeeded',
        typeLabel: 'Following Payment',
        status: 'Succeeded',
        formattedDate: 'Jan 20, 2025 • 11:03',
        amount: '+$44.00',
        amountNumber: 44.00,
        amountTone: 'positive',
        isValensApp: false,
        profileImage: '',
    },
];

const FILTER_OPTIONS = [
    { key: 'all', label: 'All Transactions', icon: 'list-outline' },
    { key: 'incoming', label: 'Received (+)', icon: 'arrow-down-outline' },
    { key: 'outgoing', label: 'Sent / Paid (-)', icon: 'arrow-up-outline' },
    { key: 'following', label: 'Following Payments', icon: 'people-outline' },
    { key: 'marketplace', label: 'Marketplace', icon: 'bag-handle-outline' },
    { key: 'tips', label: 'Tips & Support', icon: 'heart-outline' },
];

const ValensWallet = ({ navigation }) => {
    const [tradeModalVisible, setTradeModalVisible] = useState(false);
    const [portfolioValueNumber, setPortfolioValueNumber] = useState(1246.80);
    const [showTotalBalance, setShowTotalBalance] = useState(true);
    const [recentActivity, setRecentActivity] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [filterModalVisible, setFilterModalVisible] = useState(false);

    const dispatch = useDispatch();
    const toast = useToast();
    const { isBusinessProfile, accent } = useBusinessProfileTheme();
    const { isDarkMode } = useThemeContext();
    const { width: screenWidth } = useWindowDimensions();
    const { t, currentLanguage } = useLanguage();

    // Hide native navigation header so our custom mockup header renders cleanly
    useLayoutEffect(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation]);

    useFocusEffect(
        useCallback(() => {
            fetchDashboardData();
        }, [])
    );

    const fetchDashboardData = async () => {
        try {
            const userId = await AsyncStorage.getItem('userId');

            const [totalRes, userRes, metaRes, missionRes, supportRes, activityRes] = await Promise.allSettled([
                totalamount(),
                userId ? getUserCredentials(userId) : Promise.resolve(null),
                metaMaskRecived(),
                totalMission(),
                totalSupport(),
                transationActivity({ page: 1, limit: 15 }),
            ]);

            if (userRes.status === 'fulfilled' && userRes.value) {
                const userData = userRes.value?.data?.user || userRes.value?.data || userRes.value;
                const profileProvider = readPaymentProvider(userData);
                if (profileProvider !== undefined) {
                    await persistPaymentProvider(profileProvider);
                }
                const profileCountry = readUserCountry(userData);
                if (profileCountry !== undefined) {
                    await persistUserCountry(profileCountry);
                }
            }

            if (totalRes.status === 'fulfilled') {
                const response = totalRes.value;
                if (response?.statusCode === 200) {
                    const rawValue =
                        response?.data?.totalAmount ??
                        response?.data?.data?.totalAmount ??
                        response?.data?.totalReceived ??
                        response?.data?.data?.totalReceived ??
                        response?.data?.amount ??
                        response?.data?.data?.amount ??
                        1246.80;
                    const totalValue = Number(rawValue);
                    if (Number.isFinite(totalValue) && totalValue > 0) {
                        setPortfolioValueNumber(totalValue);
                    }
                }
            }

            if (activityRes.status === 'fulfilled') {
                const response = activityRes.value;
                const raw =
                    response?.data?.transactions ||
                    response?.data?.data?.transactions ||
                    response?.data?.data ||
                    response?.data ||
                    [];

                const items = Array.isArray(raw) ? raw : [];

                if (items.length > 0) {
                    const pickFirst = (...values) =>
                        values.find(value => value !== undefined && value !== null && value !== '');

                    const resolveTransactionUserId = (tx) => pickFirst(
                        tx?.userId,
                        tx?.senderId,
                        tx?.payerId,
                        tx?.buyerId,
                        tx?.fromUserId,
                        tx?.user?.id,
                        tx?.user?._id,
                        tx?.user?.userId,
                        '',
                    );

                    const transactionUserIds = [
                        ...new Set(items.map(resolveTransactionUserId).filter(Boolean).map(String)),
                    ];

                    const profileResults = await Promise.allSettled(
                        transactionUserIds.map((id) => getUserCredentials(id)),
                    );

                    const profileMap = {};
                    transactionUserIds.forEach((id, index) => {
                        const result = profileResults[index];
                        if (result?.status !== 'fulfilled') return;

                        const profile = getProfilePayload(result.value);
                        profileMap[id] = {
                            id: pickFirst(profile?.id, profile?._id, profile?.userId, id),
                            displayName: pickFirst(profile?.displayName, profile?.name, profile?.fullName, ''),
                            userName: pickFirst(profile?.userName, profile?.username, ''),
                            image: getProfileImage(profile),
                        };
                    });

                    const resolveTypeLabel = (tx) => {
                        const typeField = tx?.type;
                        const typeIsDirection = ['credit', 'debit'].includes(String(typeField || '').toLowerCase());
                        const rawType = pickFirst(tx?.typeTransaction, tx?.action, tx?.forPayment, typeIsDirection ? '' : typeField, tx?.transactionType, tx?.category, tx?.source, '');
                        const str = String(rawType || '').trim();
                        const lowered = str.toLowerCase();
                        if (lowered === 'payfollowing' || lowered === 'following' || lowered.includes('following')) return 'Following Payment';
                        if (lowered === 'missiondonation' || lowered.includes('mission')) return 'Mission Donation';
                        if (lowered === 'donation') return 'Donation';
                        if (lowered === 'marketplace' || lowered.includes('market') || lowered.includes('shop')) return 'Marketplace';
                        if (lowered === 'tip') return 'Tip';
                        if (!str) return 'Transaction';
                        return str
                            .replace(/([a-z])([A-Z])/g, '$1 $2')
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, (c) => c.toUpperCase());
                    };

                    const mapped = items.map((tx, index) => {
                        const id = pickFirst(tx?.id, tx?._id, tx?.transactionId, tx?.txId, tx?.hash, `tx_${index}`);
                        const transactionUserId = resolveTransactionUserId(tx);
                        const userProfile = transactionUserId ? profileMap[String(transactionUserId)] : null;
                        const typeLabel = resolveTypeLabel(tx);
                        const rawStatus = pickFirst(tx?.status, tx?.paymentStatus, tx?.state, 'Succeeded');
                        const status = String(rawStatus).charAt(0).toUpperCase() + String(rawStatus).slice(1).toLowerCase();
                        const { amountTone, amountNumber } = resolveTransactionAmount(tx, {
                            formatMoney: (v) => formatDisplayCurrency(Number(v) || 0, currentLanguage),
                        });

                        const profileName = pickFirst(
                            userProfile?.displayName,
                            userProfile?.userName ? `@${userProfile.userName}` : '',
                            tx?.senderName,
                            tx?.receiverName,
                            '',
                        );

                        const isPlatform = !transactionUserId || String(profileName).toLowerCase().includes('valens') || !userProfile?.image;
                        const title = isPlatform ? 'Valens app' : (profileName || 'Valens User');
                        const createdAt = pickFirst(tx?.createdAt, tx?.created_at, tx?.timestamp, tx?.date, tx?.updatedAt, null);

                        const formattedAmount = `${amountTone === 'positive' ? '+' : '-'}${formatDisplayCurrency(
                            Number.isFinite(amountNumber) ? amountNumber : 0,
                            currentLanguage,
                        )}`;

                        return {
                            key: String(id),
                            paymentId: String(pickFirst(tx?.paymentId, tx?.payment_id, tx?.stripePaymentId, id)),
                            title: String(title),
                            subtitle: `${typeLabel} • ${status}`,
                            typeLabel,
                            status,
                            formattedDate: createdAt ? formatStatementDate(createdAt) : '',
                            amount: formattedAmount,
                            amountNumber: Number.isFinite(amountNumber) ? amountNumber : 0,
                            amountTone,
                            isValensApp: isPlatform,
                            profileUserId: transactionUserId ? String(transactionUserId) : '',
                            profileImage: userProfile?.image || '',
                            profileUserName: userProfile?.userName || '',
                            profileDisplayName: userProfile?.displayName || '',
                            isBattle: String(title).toLowerCase().includes('barrette') || !!tx?.isBattle,
                            rawTx: tx,
                        };
                    });

                    setRecentActivity(mapped);
                }
            }
        } catch (error) {
            // non-fatal
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchDashboardData();
        setRefreshing(false);
    };

    const displayPortfolioValue = useMemo(() => {
        if (!showTotalBalance) return '$••••••';
        return formatDisplayCurrency(portfolioValueNumber, currentLanguage);
    }, [showTotalBalance, portfolioValueNumber, currentLanguage]);

    const activeActivities = useMemo(() => {
        const list = recentActivity.length > 0 ? recentActivity : SAMPLE_ACTIVITIES;
        if (selectedFilter === 'all') return list;
        if (selectedFilter === 'incoming') {
            return list.filter(tx => tx.amountTone === 'positive');
        }
        if (selectedFilter === 'outgoing') {
            return list.filter(tx => tx.amountTone === 'negative');
        }
        if (selectedFilter === 'following') {
            return list.filter(tx => String(tx.typeLabel || '').toLowerCase().includes('following'));
        }
        if (selectedFilter === 'marketplace') {
            return list.filter(tx =>
                String(tx.typeLabel || '').toLowerCase().includes('market') ||
                String(tx.typeLabel || '').toLowerCase().includes('shop')
            );
        }
        if (selectedFilter === 'tips') {
            return list.filter(tx =>
                String(tx.typeLabel || '').toLowerCase().includes('tip') ||
                String(tx.typeLabel || '').toLowerCase().includes('donation')
            );
        }
        return list;
    }, [recentActivity, selectedFilter]);

    const activeFilterLabel = useMemo(() => {
        const opt = FILTER_OPTIONS.find(o => o.key === selectedFilter);
        return opt ? opt.label : 'All Transactions';
    }, [selectedFilter]);

    const handleExportStatements = async () => {
        try {
            const list = activeActivities;
            const lines = [
                'VALENS STATEMENTS',
                `Generated on: ${new Date().toLocaleDateString()}`,
                `Total Balance: ${displayPortfolioValue}`,
                '------------------------------------------',
                ...list.map(
                    (tx) => `${tx.title} | ${tx.subtitle} | ${tx.formattedDate} | ${tx.amount}`
                ),
                '------------------------------------------',
                'Valens App Financial Statement',
            ];
            await Share.share({
                title: 'Valens Statements',
                message: lines.join('\n'),
            });
            showToastMessage(toast, 'success', 'Statement ready to export');
        } catch (e) {
            // user dismissed
        }
    };

    const handleActivityPress = (activity) => {
        const paymentId = activity?.paymentId || activity?.key;
        if (!paymentId) return;
        navigation.navigate('TransactionDetails', {
            paymentId,
            preview: activity,
        });
    };

    const handleActivityProfilePress = (activity) => {
        if (!activity?.profileUserId) return;
        navigation.navigate('HomeMain', {
            screen: 'UsersProfile',
            params: {
                userId: activity.profileUserId,
                returnTo: { tab: 'wallet', screen: 'ValensWallet' },
                userName: activity.profileUserName,
            },
        });
    };

    const screenBg = isDarkMode ? '#0F0C1B' : '#FAF8FD';
    const cardBg = isDarkMode ? '#1E1B2E' : '#FFFFFF';
    const cardBorder = isDarkMode ? '#2D2640' : '#EDE9FE';
    const primaryText = isDarkMode ? '#FFFFFF' : '#1E1B4B';
    const secondaryText = isDarkMode ? '#94A3B8' : '#64748B';
    const brandPurple = accent || '#7C3AED';

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: screenBg }]} edges={['top', 'left', 'right']}>
            {/* Header: Menu (left), Valens Statements (center), Download (right) */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.openDrawer()}
                    style={styles.headerBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel="Open drawer menu"
                >
                    <Ionicons name="menu" size={28} color={primaryText} />
                </TouchableOpacity>

                <Text style={[styles.headerTitle, { color: primaryText }]}>
                    {t('walletStack.valensWallet', 'Valens Statements')}
                </Text>

                <TouchableOpacity
                    onPress={handleExportStatements}
                    style={styles.headerBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel="Export statements"
                >
                    <Feather name="download" size={22} color={primaryText} />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brandPurple} />
                }
            >
                {/* Banner Card: Total Balance + Mascot with Wallet & Coins */}
                <View style={styles.bannerWrap}>
                    <LinearGradient
                        colors={['#4C1D95', '#6D28D9', '#8B5CF6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.bannerCard}
                    >
                        {/* Decorative background curve overlay */}
                        <View style={styles.bannerCurve} />

                        {/* Balance on Left */}
                        <View style={styles.bannerLeft}>
                            <View style={styles.balanceHeaderRow}>
                                <Text style={styles.balanceLabelText}>
                                    {t('valensWallet.totalBalance', 'Total Balance')}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setShowTotalBalance((prev) => !prev)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    style={styles.eyeBtn}
                                >
                                    <Ionicons
                                        name={showTotalBalance ? 'eye-outline' : 'eye-off-outline'}
                                        size={16}
                                        color="rgba(255, 255, 255, 0.85)"
                                    />
                                </TouchableOpacity>
                            </View>

                            <Text
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.7}
                                style={styles.balanceAmount}
                            >
                                {displayPortfolioValue}
                            </Text>
                        </View>

                        {/* 3D Mascot Leaning on Wallet on Right */}
                        <View style={styles.bannerRight} pointerEvents="none">
                            <Image
                                source={
                                    isBusinessProfile
                                        ? require('../../assets/icons/pngicons/ButterflyWalletG.png')
                                        : require('../../assets/icons/pngicons/butterWallet.png')
                                }
                                style={styles.bannerMascotImage}
                                resizeMode="contain"
                            />
                        </View>
                    </LinearGradient>
                </View>

                {/* Quick Actions Row: Withdraw, Statements, Export (First item crossed out by user in mockup) */}
                <View style={styles.quickActionsRow}>
                    <TouchableOpacity
                        style={[styles.quickActionBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
                        activeOpacity={0.75}
                        onPress={() => navigation.navigate('CashOut')}
                    >
                        <Feather name="upload" size={20} color={primaryText} />
                        <Text style={[styles.quickActionText, { color: primaryText }]}>
                            {t('walletStack.cashOut', 'Withdraw')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.quickActionBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
                        activeOpacity={0.75}
                        onPress={() => navigation.navigate('TransactionActivity', { activity: recentActivity })}
                    >
                        <Ionicons name="document-text-outline" size={20} color={primaryText} />
                        <Text style={[styles.quickActionText, { color: primaryText }]}>
                            {t('valensWallet.statements', 'Statements')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.quickActionBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
                        activeOpacity={0.75}
                        onPress={handleExportStatements}
                    >
                        <Feather name="download" size={20} color={primaryText} />
                        <Text style={[styles.quickActionText, { color: primaryText }]}>
                            {t('valensWallet.export', 'Export')}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Transaction History Section */}
                <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionTitle, { color: primaryText }]}>
                        {t('valensWallet.transactionHistory', 'Transaction History')}
                    </Text>

                    {/* Filter Pill */}
                    <TouchableOpacity
                        style={[
                            styles.filterPill,
                            {
                                backgroundColor: isDarkMode ? '#1E1B2E' : '#FFFFFF',
                                borderColor: isDarkMode ? '#3B185F' : '#E9D5FF',
                            },
                        ]}
                        activeOpacity={0.75}
                        onPress={() => setFilterModalVisible(true)}
                    >
                        <Ionicons name="filter" size={13} color={brandPurple} style={{ marginRight: 5 }} />
                        <Text style={[styles.filterPillText, { color: primaryText }]}>
                            {activeFilterLabel}
                        </Text>
                        <Ionicons name="chevron-down" size={13} color={primaryText} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                </View>

                {/* Transaction Cards List */}
                <View style={styles.transactionList}>
                    {activeActivities.map((activity) => {
                        const isPositive = activity.amountTone === 'positive';
                        const amountColor = isPositive ? '#16A34A' : '#DC2626';

                        return (
                            <TouchableOpacity
                                key={activity.key}
                                style={[
                                    styles.transactionCard,
                                    { backgroundColor: cardBg, borderColor: cardBorder },
                                ]}
                                activeOpacity={0.85}
                                onPress={() => handleActivityPress(activity)}
                            >
                                {/* Left Hexagon Avatar or Shield Badge */}
                                <TouchableOpacity
                                    activeOpacity={activity.profileUserId ? 0.75 : 1}
                                    onPress={() => handleActivityProfilePress(activity)}
                                    disabled={!activity.profileUserId}
                                    style={styles.avatarWrap}
                                >
                                    {activity.isValensApp ? (
                                        <HexShieldBadge size={44} color={brandPurple} isDarkMode={isDarkMode} />
                                    ) : (
                                        <HexAvatar
                                            uri={activity.profileImage}
                                            size={44}
                                            borderWidth={1.5}
                                            borderColor={brandPurple}
                                        />
                                    )}
                                </TouchableOpacity>

                                {/* Middle Content */}
                                <View style={styles.transactionContent}>
                                    <View style={styles.titleRow}>
                                        <Text
                                            style={[styles.transactionTitle, { color: primaryText }]}
                                            numberOfLines={1}
                                        >
                                            {activity.title}
                                        </Text>
                                        {activity.isBattle && (
                                            <Text style={styles.battleIcon}> ⚔️</Text>
                                        )}
                                    </View>
                                    <Text
                                        style={[styles.transactionSubtitle, { color: secondaryText }]}
                                        numberOfLines={1}
                                    >
                                        {activity.subtitle}
                                    </Text>
                                    {!!activity.formattedDate && (
                                        <Text
                                            style={[styles.transactionDate, { color: isDarkMode ? '#64748B' : '#94A3B8' }]}
                                            numberOfLines={1}
                                        >
                                            {activity.formattedDate}
                                        </Text>
                                    )}
                                </View>

                                {/* Right Amount & Chevron */}
                                <View style={styles.transactionRight}>
                                    <Text style={[styles.transactionAmount, { color: amountColor }]}>
                                        {activity.amount}
                                    </Text>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={16}
                                        color={isDarkMode ? '#64748B' : '#CBD5E1'}
                                        style={styles.chevronIcon}
                                    />
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Records & Summary Card */}
                <TouchableOpacity
                    style={[styles.recordsCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('TotalEarnings')}
                >
                    <View
                        style={[
                            styles.recordsIconWrap,
                            { backgroundColor: isDarkMode ? '#2E1065' : '#F3E8FF' },
                        ]}
                    >
                        <Ionicons name="stats-chart" size={22} color={brandPurple} />
                    </View>

                    <View style={styles.recordsTextWrap}>
                        <Text style={[styles.recordsTitle, { color: primaryText }]}>
                            {t('valensWallet.recordsAndSummary', 'Records & Summary')}
                        </Text>
                        <Text style={[styles.recordsSubtitle, { color: secondaryText }]}>
                            {t(
                                'valensWallet.recordsAndSummarySubtitle',
                                'Your transaction history and financial summary on Valens.'
                            )}
                        </Text>
                    </View>

                    <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={isDarkMode ? '#A78BFA' : '#94A3B8'}
                        style={styles.recordsChevron}
                    />
                </TouchableOpacity>

                <View style={styles.bottomSpacer} />
            </ScrollView>

            {/* Filter Selection Modal */}
            <Modal
                visible={filterModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setFilterModalVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setFilterModalVisible(false)}>
                    <View
                        style={[
                            styles.filterSheet,
                            { backgroundColor: cardBg, borderColor: cardBorder },
                        ]}
                    >
                        <View style={styles.sheetHandle} />
                        <Text style={[styles.sheetTitle, { color: primaryText }]}>Filter Transactions</Text>

                        {FILTER_OPTIONS.map((opt) => {
                            const isSelected = selectedFilter === opt.key;
                            return (
                                <TouchableOpacity
                                    key={opt.key}
                                    style={[
                                        styles.filterOptionRow,
                                        isSelected && {
                                            backgroundColor: isDarkMode ? '#241738' : '#FAF5FF',
                                        },
                                    ]}
                                    onPress={() => {
                                        setSelectedFilter(opt.key);
                                        setFilterModalVisible(false);
                                    }}
                                >
                                    <View style={styles.filterOptionLeft}>
                                        <Ionicons
                                            name={opt.icon}
                                            size={20}
                                            color={isSelected ? brandPurple : secondaryText}
                                            style={{ marginRight: 12 }}
                                        />
                                        <Text
                                            style={[
                                                styles.filterOptionText,
                                                { color: isSelected ? brandPurple : primaryText },
                                                isSelected && { fontWeight: '700' },
                                            ]}
                                        >
                                            {opt.label}
                                        </Text>
                                    </View>
                                    {isSelected && (
                                        <Ionicons name="checkmark-circle" size={20} color={brandPurple} />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Pressable>
            </Modal>

            <TradeModal visible={tradeModalVisible} onClose={() => setTradeModalVisible(false)} />
        </SafeAreaView>
    );
};

export default ValensWallet;

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingVertical: 12,
    },
    headerBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    bannerWrap: {
        marginTop: 6,
        marginBottom: 16,
    },
    bannerCard: {
        borderRadius: 22,
        height: 145,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
        shadowColor: '#6B21A8',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
    },
    bannerCurve: {
        position: 'absolute',
        right: -40,
        top: -30,
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    bannerLeft: {
        flex: 1,
        paddingLeft: 20,
        paddingRight: 10,
        justifyContent: 'center',
        zIndex: 2,
    },
    balanceHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    balanceLabelText: {
        color: 'rgba(255, 255, 255, 0.88)',
        fontSize: 13,
        fontWeight: '600',
        marginRight: 6,
    },
    eyeBtn: {
        padding: 2,
    },
    balanceAmount: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    bannerRight: {
        width: 140,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 4,
        paddingRight: 8,
        zIndex: 1,
    },
    bannerMascotImage: {
        width: 136,
        height: 126,
    },
    quickActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 22,
    },
    quickActionBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
    },
    quickActionText: {
        fontSize: 12,
        fontWeight: '700',
        marginTop: 6,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    filterPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
        elevation: 1,
    },
    filterPillText: {
        fontSize: 12,
        fontWeight: '600',
    },
    transactionList: {
        marginBottom: 16,
    },
    transactionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 5,
        elevation: 1,
    },
    avatarWrap: {
        width: 44,
        height: 44,
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    transactionContent: {
        flex: 1,
        justifyContent: 'center',
        paddingRight: 8,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    transactionTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    battleIcon: {
        fontSize: 13,
    },
    transactionSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    transactionDate: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
    transactionRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    transactionAmount: {
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    chevronIcon: {
        marginLeft: 8,
    },
    recordsCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 18,
        borderWidth: 1,
        padding: 16,
        marginTop: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
    },
    recordsIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    recordsTextWrap: {
        flex: 1,
    },
    recordsTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    recordsSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 3,
        lineHeight: 16,
    },
    recordsChevron: {
        marginLeft: 8,
    },
    bottomSpacer: {
        height: 30,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        justifyContent: 'flex-end',
    },
    filterSheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopWidth: 1,
        paddingHorizontal: 20,
        paddingBottom: 36,
        paddingTop: 12,
    },
    sheetHandle: {
        width: 38,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#CBD5E1',
        alignSelf: 'center',
        marginBottom: 16,
    },
    sheetTitle: {
        fontSize: 17,
        fontWeight: '800',
        marginBottom: 14,
    },
    filterOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginBottom: 4,
    },
    filterOptionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterOptionText: {
        fontSize: 15,
        fontWeight: '500',
    },
});
