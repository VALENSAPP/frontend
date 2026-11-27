import React, { useState, useEffect, useMemo, useCallback, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, TouchableOpacity, FlatList, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllMissionPost } from '../../services/wallet';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppTheme } from '../../theme/useApptheme';
import { useThemeContext } from '../../theme/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../../i18n';

export default function ViewMissioPost({ navigation, route }) {
    const { isDarkMode } = useThemeContext();
    const themeResult = useAppTheme(
        route.params?.isBusinessProfile ? 'company' : undefined,
    );
    const { textStyle, text, cardStyle, accent, mutedText, border, card } = themeResult;
    const isBusiness = route.params?.isBusinessProfile ?? themeResult.isBusinessProfile;
    const { t } = useLanguage();

    const [missions, setMissions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filterLoading, setFilterLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [showBalance, setShowBalance] = useState(true);
    const [error, setError] = useState(null);
    const PLATFORM_FEE_PERCENT = 5;
    const CREATOR_SHARE_PERCENT = 100 - PLATFORM_FEE_PERCENT;

    const pageBg = isDarkMode
        ? (isBusiness ? '#12100C' : '#0F0C1B')
        : (isBusiness ? '#FAF7F0' : '#FAF5FE');

    const bannerGradientColors = isDarkMode
        ? (isBusiness ? ['#241705', '#3B2609', '#54370E'] : ['#210938', '#340F57', '#48157A'])
        : (isBusiness ? ['#4D320C', '#6E4814', '#996720'] : ['#431370', '#5A1A96', '#7525C2']);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: t('viewMissionPost.missionCampaigns') || 'Mission Campaigns',
            headerTitleAlign: 'center',
            headerStyle: {
                backgroundColor: pageBg,
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 0,
            },
            headerTitleStyle: {
                fontSize: 18,
                fontWeight: '800',
                color: isBusiness ? '#8A6B1C' : '#3B1768',
            },
            headerTintColor: isBusiness ? '#8A6B1C' : '#3B1768',
        });
    }, [navigation, t, pageBg, isBusiness]);

    const formatMoney = useCallback((value) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return '0.00';
        const [whole, decimal] = numeric.toFixed(2).split('.');
        return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${decimal}`;
    }, []);

    const fetchMissions = useCallback(async (filter = 'all', isFilterChange = false) => {
        try {
            if (isFilterChange) setFilterLoading(true);
            else setLoading(true);
            setError(null);
            const params = filter !== 'all' ? { status: filter } : {};
            const response = await getAllMissionPost(params);

            if (response?.statusCode === 200) {
                const raw = response.data?.data || response.data || [];
                const data = Array.isArray(raw) ? raw.map(item => ({
                    id: item.id,
                    title: item.caption || item.text || item.type || 'Mission Post',
                    status: item.end_time && new Date(item.end_time) < new Date()
                        ? 'Completed'
                        : item.start_time && new Date(item.start_time) > new Date()
                            ? 'Upcoming'
                            : 'Active',
                    period: item.start_time && item.end_time
                        ? `${new Date(item.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${new Date(item.end_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : t('viewMissionPost.noPeriodSet'),
                    endTime: item.end_time,
                    startTime: item.start_time,
                    requests: item.earning?.requestusers ?? item.requestusers ?? item.commentCount ?? 0,
                    earned: Number(item.earning?.total ?? 0),
                    creatorShare: Number(item.earning?.total ?? 0) * (CREATOR_SHARE_PERCENT / 100),
                    platformFee: Number(item.earning?.total ?? 0) * (PLATFORM_FEE_PERCENT / 100),
                    splitPercent: CREATOR_SHARE_PERCENT,
                    valensFeePercent: PLATFORM_FEE_PERCENT,
                    total: item.tokenBalance ?? 0,
                    goal: Number(item.raiseAmount ?? item.raise_amount ?? 0),
                    type: item.type,
                    userImage: item.userImage,
                    userName: item.userName,
                    thumbnail: item.thumbnails?.[0] || item.images?.[0] || null,
                })) : [];
                setMissions(data);
            } else {
                setMissions([]);
            }
        } catch (err) {
            console.error('Error fetching missions:', err);
            setError(t('viewMissionPost.failedToLoad'));
            setMissions([]);
        } finally {
            setLoading(false);
            setFilterLoading(false);
        }
    }, [t]);

    const handleFilterChange = (tab) => {
        setStatusFilter(tab);
        fetchMissions(tab, true);
    };

    useFocusEffect(
        useCallback(() => {
            fetchMissions(statusFilter);
        }, [fetchMissions])
    );

    const totalEarned = useMemo(() =>
        missions.reduce((sum, m) => sum + (parseFloat(m.earned) || 0), 0).toFixed(2),
        [missions]
    );

    const activeCount = useMemo(() =>
        missions.filter(m => (m.status || '').toLowerCase() === 'active').length,
        [missions]
    );

    const getStatusStyle = (status) => {
        const s = (status || '').toLowerCase();
        if (s === 'active') return { bg: '#DCFCE7', color: '#16A34A' };
        if (s === 'completed') return { bg: '#FEF3C7', color: '#B45309' };
        return { bg: '#DBEAFE', color: '#1E40AF' };
    };

    const getTimeLabel = (item) => {
        const s = (item.status || '').toLowerCase();
        if (s === 'completed' && item.endTime) {
            return {
                icon: 'checkmark-circle',
                color: '#16A34A',
                bg: '#DCFCE7',
                label: t('viewMissionPost.completedOn', {
                    date: new Date(item.endTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                }),
            };
        }
        if (s === 'active' && item.endTime) {
            const diff = new Date(item.endTime) - new Date();
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            return {
                icon: 'time-outline',
                color: '#D97706',
                bg: '#FEF3C7',
                label: t('viewMissionPost.endsIn', { days, hours }),
            };
        }
        if (s === 'upcoming' && item.startTime) {
            const diff = new Date(item.startTime) - new Date();
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            return {
                icon: 'time-outline',
                color: '#2563EB',
                bg: '#DBEAFE',
                label: t('viewMissionPost.startsIn', { days }),
            };
        }
        return null;
    };

    const filterTabs = [
        { key: 'all',       label: t('viewMissionPost.filterAll') || 'All' },
        { key: 'active',    label: t('viewMissionPost.filterActive') || 'Active' },
        { key: 'completed', label: t('viewMissionPost.filterCompleted') || 'Completed' },
    ];

    if (loading) {
        return (
            <SafeAreaView style={[{ flex: 1, backgroundColor: pageBg }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={isBusiness ? '#8A6B1C' : accent} />
                    <Text style={[styles.loadingText, { color: text }]}>
                        {t('viewMissionPost.loadingMissions')}
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={[{ flex: 1, backgroundColor: pageBg }]}>
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                    <Text style={[styles.errorText, { color: text }]}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => fetchMissions(statusFilter)}>
                        <Text style={styles.retryText}>{t('viewMissionPost.retry')}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[{ flex: 1, backgroundColor: pageBg }]}>
            <ScrollView
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Banner */}
                <View style={styles.bannerCard}>
                    <LinearGradient
                        colors={bannerGradientColors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.bannerGradient}
                    >
                        <View style={styles.bannerTextCol}>
                            <View style={styles.bannerHeaderRow}>
                                <Text style={styles.bannerTitle}>
                                    {t('viewMissionPost.totalEarned') || 'Total Earned'}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setShowBalance(prev => !prev)}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    style={styles.eyeBtn}
                                    activeOpacity={0.7}
                                    accessibilityLabel="Toggle balance visibility"
                                >
                                    <Ionicons
                                        name={showBalance ? 'eye-outline' : 'eye-off-outline'}
                                        size={16}
                                        color="rgba(255, 255, 255, 0.85)"
                                    />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.bannerAmount}>
                                {showBalance ? `$${formatMoney(totalEarned)}` : '$••••••'}
                            </Text>

                            <Text style={styles.bannerSubtitle}>
                                {t('viewMissionPost.activeCampaigns') || 'Active Campaigns'}: {activeCount}
                            </Text>
                        </View>

                        <Image
                            source={
                                isBusiness
                                    ? require('../../assets/icons/pngicons/MissionpostG.png')
                                    : require('../../assets/icons/pngicons/Missionpost.png')
                            }
                            style={styles.bannerMascot}
                            resizeMode="contain"
                            pointerEvents="none"
                        />
                    </LinearGradient>
                </View>

                {/* Section Title */}
                <Text style={[styles.sectionTitle, { color: isBusiness ? '#8A6B1C' : '#2D1152' }]}>
                    {t('viewMissionPost.campaigns') || 'Campaigns'}
                </Text>

                {/* Status Filter Tabs (Capsule Bar) */}
                <View
                    style={[
                        styles.filterTabsTrack,
                        {
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                            borderColor: isDarkMode ? border : '#E8DEF8',
                        },
                    ]}
                >
                    {filterTabs.map(({ key, label }) => {
                        const isActive = statusFilter === key;
                        return (
                            <TouchableOpacity
                                key={key}
                                style={[
                                    styles.filterTab,
                                    isActive && {
                                        backgroundColor: isBusiness ? '#8A6B1C' : '#431370',
                                        shadowColor: '#431370',
                                        shadowOpacity: 0.15,
                                        shadowRadius: 4,
                                        elevation: 2,
                                    },
                                ]}
                                onPress={() => handleFilterChange(key)}
                                activeOpacity={0.8}
                            >
                                <Text
                                    style={[
                                        styles.filterTabText,
                                        { color: isDarkMode ? '#9CA3AF' : '#6B5B82' },
                                        isActive && { color: '#FFFFFF', fontWeight: '700' },
                                    ]}
                                >
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Inline Filter Loader */}
                {filterLoading && (
                    <View style={styles.filterLoaderContainer}>
                        <ActivityIndicator size="small" color={isBusiness ? '#8A6B1C' : accent} />
                        <Text style={[styles.filterLoaderText, { color: text }]}>
                            {t('viewMissionPost.updating')}
                        </Text>
                    </View>
                )}

                {!filterLoading && missions.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="ribbon-outline" size={48} color="#aaa" />
                        <Text style={[styles.emptyText, { color: text }]}>
                            {t('viewMissionPost.noMissionsFound')}
                        </Text>
                        <Text style={[styles.emptySubtext, { color: text }]}>
                            {statusFilter !== 'all'
                                ? t('viewMissionPost.noMissionsFilteredSub', { status: statusFilter })
                                : t('viewMissionPost.noMissionsDefaultSub')}
                        </Text>
                    </View>
                ) : !filterLoading ? (
                    <FlatList
                        data={missions}
                        scrollEnabled={false}
                        showsVerticalScrollIndicator={false}
                        keyExtractor={(item) => item.id?.toString()}
                        contentContainerStyle={{ gap: 12 }}
                        renderItem={({ item: c }) => {
                            const statusStyle = getStatusStyle(c.status);
                            const timeLabel = getTimeLabel(c);
                            return (
                                <View
                                    style={[
                                        styles.campaignCard,
                                        {
                                            backgroundColor: isDarkMode ? card : '#FFFFFF',
                                            borderColor: isDarkMode ? border : '#EFE8F8',
                                        },
                                    ]}
                                >
                                    {/* Top Row: Thumbnail + Info */}
                                    <View style={styles.cardTopRow}>
                                        {c.thumbnail ? (
                                            <Image
                                                source={{ uri: c.thumbnail }}
                                                style={styles.thumbnail}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                                                <Ionicons name="image-outline" size={26} color="#B8A7D9" />
                                            </View>
                                        )}

                                        <View style={{ flex: 1 }}>
                                            <View style={styles.titleRow}>
                                                <Text
                                                    style={[styles.campaignTitle, { color: isDarkMode ? text : '#2D1152' }]}
                                                    numberOfLines={1}
                                                >
                                                    {c.title?.charAt(0).toUpperCase() + c.title?.slice(1)}
                                                </Text>
                                                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                                                    <Text style={[styles.statusBadgeText, { color: statusStyle.color }]}>
                                                        {c.status}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.periodRow}>
                                                <Ionicons name="calendar-outline" size={13} color="#6B7280" />
                                                <Text style={styles.campaignPeriod} numberOfLines={1}>
                                                    {' '}{c.period}
                                                </Text>
                                            </View>
                                            {timeLabel && (
                                                <View style={[styles.timeLabelRow, { backgroundColor: timeLabel.bg }]}>
                                                    <Ionicons name={timeLabel.icon} size={12} color={timeLabel.color} />
                                                    <Text style={[styles.timeLabelText, { color: timeLabel.color }]}>
                                                        {' '}{timeLabel.label}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    {/* Stats Row */}
                                    <View style={[styles.statsRow, { borderTopColor: isDarkMode ? border : '#F3EEF9' }]}>
                                        <View style={styles.statCol}>
                                            <Ionicons
                                                name="people-outline"
                                                size={22}
                                                color={isBusiness ? '#8A6B1C' : '#431370'}
                                                style={styles.statIcon}
                                            />
                                            <View>
                                                <Text style={styles.statLabel}>
                                                    {t('viewMissionPost.totalRequests') || 'Total Donors'}
                                                </Text>
                                                <Text style={[styles.statValue, { color: isDarkMode ? text : '#2D1152' }]}>
                                                    {c.requests}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={[styles.statDivider, { backgroundColor: isDarkMode ? border : '#EFE8F8' }]} />

                                        <View style={styles.statCol}>
                                            <Ionicons
                                                name="layers-outline"
                                                size={22}
                                                color={isBusiness ? '#8A6B1C' : '#431370'}
                                                style={styles.statIcon}
                                            />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.statLabel}>
                                                    {t('viewMissionPost.totalEarnedLabel') || 'Total Earned'}
                                                </Text>
                                                <Text
                                                    style={[styles.statValueAccent, { color: isDarkMode ? text : '#2D1152' }]}
                                                    numberOfLines={1}
                                                >
                                                    {c.goal > 0
                                                        ? `Raised: $${formatMoney(c.earned)} of $${formatMoney(c.goal)}`
                                                        : `$${formatMoney(c.earned)}`}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Earnings Split */}
                                    <View
                                        style={[
                                            styles.splitContainer,
                                            { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F7F3FB' },
                                        ]}
                                    >
                                        <Text style={styles.splitLabel} numberOfLines={1}>
                                            {t('viewMissionPost.earningsSplitLabel') || 'Earnings Split (per post total)'}
                                        </Text>
                                        <View style={styles.splitValuesRow}>
                                            <View style={styles.splitItem}>
                                                <Text style={styles.splitItemLabel}>
                                                    {t('viewMissionPost.youPercent', { percent: CREATOR_SHARE_PERCENT }) || `You (${CREATOR_SHARE_PERCENT}%)`}
                                                </Text>
                                                <Text style={[styles.splitItemValue, { color: '#16A34A' }]}>
                                                    ${formatMoney(c.creatorShare)}
                                                </Text>
                                            </View>
                                            <View style={[styles.splitDivider, { backgroundColor: isDarkMode ? border : '#E0D7EC' }]} />
                                            <View style={styles.splitItem}>
                                                <Text style={styles.splitItemLabel}>
                                                    {t('viewMissionPost.platformFee', { percent: PLATFORM_FEE_PERCENT }) || `Platform Fee (${PLATFORM_FEE_PERCENT}%)`}
                                                </Text>
                                                <Text style={[styles.splitItemValue, { color: isBusiness ? '#8A6B1C' : '#2D1152' }]}>
                                                    ${formatMoney(c.platformFee)}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            );
                        }}
                    />
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        paddingBottom: 60,
    },
    bannerCard: {
        borderRadius: 20,
        overflow: 'hidden',
        minHeight: 140,
        shadowColor: '#431370',
        shadowOpacity: 0.12,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    bannerGradient: {
        minHeight: 140,
        borderRadius: 20,
        position: 'relative',
        justifyContent: 'center',
    },
    bannerTextCol: {
        paddingLeft: 18,
        paddingTop: 18,
        paddingBottom: 18,
        justifyContent: 'center',
        maxWidth: '56%',
        zIndex: 2,
    },
    bannerHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 6,
    },
    bannerTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.9)',
    },
    eyeBtn: {
        padding: 2,
    },
    bannerAmount: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.3,
        marginBottom: 4,
    },
    bannerSubtitle: {
        fontSize: 12.5,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.85)',
    },
    bannerMascot: {
        position: 'absolute',
        right: -4,
        bottom: -2,
        width: 170,
        height: 135,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginTop: 14,
        marginBottom: 10,
    },
    filterTabsTrack: {
        flexDirection: 'row',
        borderRadius: 24,
        padding: 3,
        borderWidth: 1,
        marginBottom: 14,
    },
    filterTab: {
        flex: 1,
        paddingVertical: 7,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterTabText: {
        fontSize: 13.5,
        fontWeight: '600',
    },
    filterLoaderContainer: {
        alignItems: 'center',
        paddingVertical: 20,
        gap: 8,
    },
    filterLoaderText: {
        fontSize: 13,
        opacity: 0.6,
    },
    campaignCard: {
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        shadowColor: '#431370',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    cardTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    thumbnail: {
        width: 66,
        height: 66,
        borderRadius: 12,
        marginRight: 12,
    },
    thumbnailPlaceholder: {
        backgroundColor: '#F3EDFA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 3,
        gap: 6,
    },
    campaignTitle: {
        fontSize: 15,
        fontWeight: '800',
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 9,
        paddingVertical: 2.5,
        borderRadius: 10,
    },
    statusBadgeText: {
        fontSize: 10.5,
        fontWeight: '700',
    },
    periodRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    campaignPeriod: {
        fontSize: 11.5,
        color: '#6B7280',
    },
    timeLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 2.5,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    timeLabelText: {
        fontSize: 11,
        fontWeight: '700',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        paddingTop: 10,
        marginBottom: 10,
    },
    statCol: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    statIcon: {
        marginRight: 8,
    },
    statDivider: {
        width: 1,
        height: 32,
        marginHorizontal: 4,
    },
    statLabel: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '500',
        marginBottom: 1,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '800',
    },
    statValueAccent: {
        fontSize: 12.5,
        fontWeight: '800',
    },
    splitContainer: {
        borderRadius: 12,
        paddingVertical: 9,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    splitLabel: {
        fontSize: 10.5,
        color: '#6B7280',
        fontWeight: '500',
        flexShrink: 1,
        marginRight: 8,
    },
    splitValuesRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    splitItem: {
        alignItems: 'center',
    },
    splitDivider: {
        width: 1,
        height: 22,
        marginHorizontal: 10,
    },
    splitItemLabel: {
        fontSize: 9.5,
        color: '#6B7280',
        marginBottom: 1,
        textAlign: 'center',
    },
    splitItemValue: {
        fontSize: 12.5,
        fontWeight: '800',
        textAlign: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    errorText: {
        marginTop: 12,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 16,
    },
    retryBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#431370',
        borderRadius: 8,
    },
    retryText: {
        color: '#fff',
        fontWeight: '600',
    },
    emptyContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 4,
    },
    emptySubtext: {
        fontSize: 14,
        opacity: 0.7,
    },
});
