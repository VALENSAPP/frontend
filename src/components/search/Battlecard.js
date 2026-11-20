/**
 * BattleCard — React Native component (i18n updated)
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Modal,
    Pressable,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    Animated,
    ScrollView,
    Dimensions,
    Platform,
    PanResponder,
    Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Svg, { Line, Circle, G } from 'react-native-svg';
import HexAvatar from '../../components/home/story.js/HexAvatar';
import { useLanguage } from '../../i18n';
import { useBusinessProfileTheme } from '../../theme/useBusinessProfileTheme';
import { useThemeContext } from '../../theme/ThemeContext';
import { BASE_URL } from '../../config/urls';

const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeImageUrl = url => {
    if (!url || typeof url !== 'string') return null;
    const t = url.trim();
    if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('data:') || t.startsWith('file://')) return t;
    if (t.startsWith('/')) return `${BASE_URL}${t}`;
    return `${BASE_URL}/${t}`;
};

const formatAmount = value => {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0
        ? n.toLocaleString(undefined, { maximumFractionDigits: 2 })
        : '0';
};

const formatBattleDate = value => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const formatBattleCountdown = (value, t) => {
    if (!value) return t('battleCard.ended');
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return t('battleCard.ended');
    const diffMs = parsed.getTime() - Date.now();
    if (diffMs <= 0) return t('battleCard.ended');
    const diffDays = Math.floor(diffMs / 86400000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor(diffMs / 60000);
    if (diffDays > 0) return t('battleCard.endsInDays', { days: diffDays });
    if (diffHours > 0) return t('battleCard.endsInHours', { hours: diffHours });
    return t('battleCard.endsInMins', { mins: diffMins });
};

const formatBattleCount = value => {
    const n = Number(value || 0);
    if (!Number.isFinite(n) || n <= 0) return '0';
    if (n >= 1000000) return `${(n / 1000000).toFixed(n >= 10000000 ? 0 : 1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
    return `${n}`;
};

const normalizeCountKey = value => String(value || '').trim().toLowerCase();

const buildNormalizedCountMap = (counts = {}) => {
    if (!counts || typeof counts !== 'object') return {};
    return Object.entries(counts).reduce((acc, [key, value]) => {
        const normalized = normalizeCountKey(key);
        if (!normalized) return acc;
        const numericValue = Number(value);
        acc[normalized] = Number.isFinite(numericValue) ? numericValue : 0;
        return acc;
    }, {});
};

const computePercentages = (labels = [], rawCounts = {}) => {
    const normalizedCounts = buildNormalizedCountMap(rawCounts);
    const counts = labels.map(label => {
        const key = normalizeCountKey(label);
        const value = normalizedCounts[key];
        return Number.isFinite(value) && value > 0 ? value : 0;
    });
    const total = counts.reduce((sum, value) => sum + value, 0);
    if (!total) return labels.map(() => 0);
    const exact = counts.map(value => (value / total) * 100);
    const floors = exact.map(value => Math.floor(value));
    let remainder = 100 - floors.reduce((sum, value) => sum + value, 0);
    const order = exact
        .map((value, index) => ({ index, frac: value - floors[index] }))
        .sort((a, b) => b.frac - a.frac);
    const result = [...floors];
    for (let i = 0; i < order.length && remainder > 0; i += 1) {
        result[order[i].index] += 1;
        remainder -= 1;
    }
    return result;
};

const isEmptyOpponent = user2 => {
    if (!user2) return true;
    const name = (user2.name || '').trim().toLowerCase();
    const handle = (user2.userName || '').trim();
    const avatar = (user2.avatar || '').trim();
    const isPlaceholder = !name || name === 'opponent' || name === 'user 2' || name === 'null';
    return isPlaceholder && !handle && !avatar;
};

const useBattleAccent = () => {
    const {
        primary,
        accent,
        isBusinessProfile,
        card,
        border,
        text,
        mutedText,
        screenBackground,
    } = useBusinessProfileTheme();
    const { isDarkMode } = useThemeContext();

    const brandAccent = accent || (isBusinessProfile ? '#CBA257' : '#402090');
    const brandCard = isDarkMode ? '#1E1729' : (card || '#FFFFFF');
    const brandBorder = isDarkMode ? '#382A4C' : (isBusinessProfile ? '#E8D9BD' : (border || '#EAE4F5'));

    const accentLight = isBusinessProfile
        ? (isDarkMode ? 'rgba(203,162,87,0.22)' : 'rgba(203,162,87,0.12)')
        : (isDarkMode ? 'rgba(64,32,144,0.25)' : '#F0EAFF');

    const accentSoftText = isDarkMode
        ? (isBusinessProfile ? '#F0E0B8' : '#E8DEFF')
        : brandAccent;

    return {
        accent: brandAccent,
        accentLight,
        accentDark: brandAccent,
        accentSoftText,
        isDarkMode,
        card: brandCard,
        border: brandBorder,
        text: brandAccent,
        mutedText: isDarkMode ? '#A59DB5' : (isBusinessProfile ? '#8C8270' : (mutedText || '#7A7289')),
        isBusinessProfile,
        background: isDarkMode ? '#121212' : (isBusinessProfile ? '#FAF7F0' : (screenBackground || '#FAF7FD')),
    };
};

// ─── LiveDot ──────────────────────────────────────────────────────────────────

const LiveDot = () => {
    const pulse = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 2, duration: 800, useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
            ]),
        );
        anim.start();
        return () => anim.stop();
    }, [pulse]);

    return (
        <View style={styles.liveDotWrapper}>
            <Animated.View style={[styles.liveDotRing, { transform: [{ scale: pulse }] }]} />
            <View style={styles.liveDotCore} />
        </View>
    );
};


// ─── Fireworks Decorative Element ──────────────────────────────────────────────
const FireworksDecoration = memo(() => (
    <View style={styles.fireworksContainer} pointerEvents="none">
        <Svg width={116} height={66} viewBox="0 0 116 66" fill="none">
            {/* Center Golden Radiance */}
            <G transform="translate(68, 28)">
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(angle => (
                    <Line
                        key={'gold-' + angle}
                        x1="0"
                        y1="0"
                        x2={16 * Math.cos((angle * Math.PI) / 180)}
                        y2={16 * Math.sin((angle * Math.PI) / 180)}
                        stroke="#F59E0B"
                        strokeWidth="1.2"
                        strokeDasharray="2,3"
                        strokeLinecap="round"
                        opacity={0.8}
                    />
                ))}
                <Circle cx="0" cy="0" r="1.5" fill="#F59E0B" opacity={0.85} />
            </G>

            {/* Left Soft Lavender Burst */}
            <G transform="translate(24, 25)">
                {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
                    <Line
                        key={'purp-left-' + angle}
                        x1="0"
                        y1="0"
                        x2={13 * Math.cos((angle * Math.PI) / 180)}
                        y2={13 * Math.sin((angle * Math.PI) / 180)}
                        stroke="#A78BFA"
                        strokeWidth="1.1"
                        strokeDasharray="1.5,2.5"
                        strokeLinecap="round"
                        opacity={0.7}
                    />
                ))}
                <Circle cx="0" cy="0" r="1.2" fill="#A78BFA" opacity={0.75} />
            </G>

            {/* Right Purple Sparkler */}
            <G transform="translate(98, 36)">
                {[15, 60, 105, 150, 195, 240, 285, 330].map(angle => (
                    <Line
                        key={'purp-right-' + angle}
                        x1="0"
                        y1="0"
                        x2={10 * Math.cos((angle * Math.PI) / 180)}
                        y2={10 * Math.sin((angle * Math.PI) / 180)}
                        stroke="#8B5CF6"
                        strokeWidth="1"
                        strokeDasharray="1.5,2"
                        strokeLinecap="round"
                        opacity={0.65}
                    />
                ))}
                <Circle cx="0" cy="0" r="1" fill="#8B5CF6" opacity={0.65} />
            </G>
        </Svg>
    </View>
));

// ─── Sub-components ───────────────────────────────────────────────────────────

const TimerBadge = ({ endTime, ended, t }) => {
    const { mutedText } = useBattleAccent();
    return (
        <View style={styles.timerBadge}>
            <Icon name="time-outline" size={10} color={ended ? '#A32D2D' : mutedText} style={{ marginRight: 3 }} />
            <Text style={[styles.timerText, { color: mutedText }, ended && styles.timerTextEnded]}>
                {formatBattleCountdown(endTime, t)}
            </Text>
        </View>
    );
};

const ModeBadge = ({ format, ended, isLive, t }) => {
    const { isDarkMode, isBusinessProfile } = useBattleAccent();
    return (
        <View
            style={[
                styles.modeBadge,
                {
                    backgroundColor: isDarkMode ? '#2B2338' : '#FFFFFF',
                    borderColor: isDarkMode ? '#3E3250' : (isBusinessProfile ? '#E8D9BD' : '#ECE8F6'),
                },
                ended && styles.modeBadgeEnded,
            ]}
        >
            {!ended && <View style={styles.modeBadgeDotGreen} />}
            <Text
                style={[
                    styles.modeBadgeText,
                    { color: isDarkMode ? '#E2D9F3' : (isBusinessProfile ? '#CBA257' : '#321D50') },
                    ended && styles.modeBadgeTextEnded,
                ]}
                numberOfLines={1}
            >
                {format === 'POLL'
                    ? t('battleCard.poll', 'POLL')
                    : format === 'PREDICTION'
                        ? t('battleCard.prediction', 'PREDICTION')
                        : t('battleCard.battleMode', 'BATTLE')}
            </Text>
        </View>
    );
};

const ParticipantAvatar = ({ avatarUrl, name, handle, isEmpty, onPress, onPressIn, t }) => {
    const { accent, accentLight, text, mutedText } = useBattleAccent();
    if (isEmpty) {
        return (
            <View style={styles.participantSlot}>
                <View style={styles.participantContent}>
                    <View style={[styles.emptySlot, { borderColor: accent, backgroundColor: accentLight }]}>
                        <Icon name="person-add-outline" size={15} color={accent} />
                    </View>
                    <Text style={[styles.waitingLabel, { color: accent }]}>{t('battleCard.waiting')}</Text>
                    <Text style={[styles.waitingSub, { color: mutedText }]}>{t('battleCard.openSlot')}</Text>
                </View>
            </View>
        );
    }
    return (
        <View style={styles.participantSlot}>
            <TouchableOpacity
                style={styles.participantContent}
                activeOpacity={0.75}
                onPress={onPress}
                onPressIn={onPressIn}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
                <HexAvatar
                    uri={normalizeImageUrl(avatarUrl) || DEFAULT_AVATAR}
                    size={28}
                    borderWidth={2}
                    borderColor={accent}
                />
                <Text style={[styles.participantName, { color: text }]} numberOfLines={1}>{name}</Text>
                {!!handle && <Text style={[styles.participantHandle, { color: mutedText }]} numberOfLines={1}>@{handle}</Text>}
            </TouchableOpacity>
        </View>
    );
};

const StakePill = ({ amount, t }) => {
    const { accentLight, accentSoftText } = useBattleAccent();
    return (
        <View style={[styles.stakePill, { backgroundColor: accentLight }]}>
            <Icon name="flash" size={11} color={accentSoftText} />
            <Text style={[styles.stakeText, { color: accentSoftText }]}>
                {t('battleCard.stakes')} <Text style={[styles.stakeAmount, { color: accentSoftText }]}>{formatAmount(amount)}</Text>
            </Text>
        </View>
    );
};

const OptionChip = ({
    option,
    index = 0,
    isSelected,
    onPress,
    disabled,
    avatarUrl,
    imageUrl,
    teamLogoUrl,
    percent,
    onImagePress,
}) => {
    const { accent, border, mutedText, isDarkMode, isBusinessProfile } = useBattleAccent();
    const safePercent = Number.isFinite(percent)
        ? Math.max(0, Math.min(100, Math.round(percent)))
        : 0;
    const label = option?.label || option;
    const optionLetter = String.fromCharCode(65 + (index % 26));

    const resolvedImage = normalizeImageUrl(
        imageUrl || option?.image || option?.imageUrl || option?.picture || (avatarUrl !== DEFAULT_AVATAR ? avatarUrl : null)
    );

    const handleImagePress = (e) => {
        e?.stopPropagation?.();
        if (resolvedImage) {
            onImagePress?.(resolvedImage, label);
        }
    };

    // --- CASE 1: OPTION WITH IMAGE (Landscape card with bottom overlay) ---
    if (resolvedImage) {
        return (
            <TouchableOpacity
                activeOpacity={0.88}
                disabled={disabled}
                onPress={onPress}
                style={[
                    styles.optionImageCard,
                    {
                        borderColor: isSelected
                            ? (isDarkMode ? '#C084FC' : (isBusinessProfile ? '#B88728' : accent))
                            : (isDarkMode ? '#382A4C' : (isBusinessProfile ? '#E8D9BD' : border)),
                        borderWidth: isSelected ? 2 : 1,
                    },
                    disabled && styles.optionDisabled,
                ]}
            >
                <View style={styles.optionLandscapeImageWrap}>
                    <Image
                        source={{ uri: resolvedImage }}
                        style={styles.optionLandscapeImage}
                        resizeMode="cover"
                    />
                    <View style={styles.optionImageOverlay}>
                        <View style={[styles.letterPill, { backgroundColor: isBusinessProfile ? '#B88728' : accent }]}>
                            <Text style={styles.letterPillText}>{optionLetter}</Text>
                        </View>
                        <Text style={styles.optionOverlayLabel} numberOfLines={1}>
                            {label}
                        </Text>
                    </View>
                </View>

                {/* Percentage & Progress Bar below Image */}
                <View style={styles.optionImageBottomWrap}>
                    <Text style={[styles.optionBottomPercent, { color: isBusinessProfile ? '#5C3E08' : (isDarkMode ? '#EDE7F6' : accent) }]}>
                        {safePercent}%
                    </Text>
                    <View style={[styles.optionProgressTrack, { backgroundColor: isDarkMode ? '#352B44' : (isBusinessProfile ? '#EDE6D6' : '#FAF7F0') }]}>
                        <View
                            style={[
                                styles.optionProgressFill,
                                {
                                    width: `${safePercent}%`,
                                    backgroundColor: isDarkMode ? '#A855F7' : (isBusinessProfile ? '#B88728' : accent),
                                },
                            ]}
                        />
                    </View>
                </View>
            </TouchableOpacity>
        );
    }

    // --- CASE 2: OPTION WITHOUT IMAGE (Card with Letter Pill, Title, Percent, Progress Bar) ---
    return (
        <TouchableOpacity
            activeOpacity={0.88}
            disabled={disabled}
            onPress={onPress}
            style={[
                styles.optionChip,
                {
                    backgroundColor: isDarkMode ? '#241D30' : (isBusinessProfile ? '#FDFCF9' : '#FFFFFF'),
                    borderColor: isSelected
                        ? (isDarkMode ? '#C084FC' : (isBusinessProfile ? '#B88728' : accent))
                        : (isDarkMode ? '#382A4C' : (isBusinessProfile ? '#E8D9BD' : border)),
                    borderWidth: isSelected ? 1.5 : 1,
                },
                disabled && styles.optionDisabled,
            ]}
        >
            <View style={styles.optionContentRow}>
                {/* Letter Pill */}
                <View style={[styles.letterPill, { backgroundColor: isBusinessProfile ? '#B88728' : accent }]}>
                    <Text style={styles.letterPillText}>{optionLetter}</Text>
                </View>

                {/* Label */}
                <View style={styles.optionTextContainer}>
                    <Text
                        style={[
                            styles.optionChipLabel,
                            { color: isSelected ? (isDarkMode ? '#F5F0FF' : accent) : (isBusinessProfile ? '#5C3E08' : labelColor) },
                        ]}
                        numberOfLines={1}
                    >
                        {label}
                    </Text>
                </View>

                {/* Percent */}
                <Text
                    style={[
                        styles.optionPercentInline,
                        { color: isSelected ? (isDarkMode ? '#C084FC' : accent) : (isBusinessProfile ? '#5C3E08' : mutedText) },
                    ]}
                >
                    {safePercent}%
                </Text>
            </View>

            {/* Progress Bar at Bottom */}
            <View
                style={[
                    styles.optionProgressTrack,
                    { backgroundColor: isDarkMode ? '#352B44' : (isBusinessProfile ? '#EDE6D6' : '#FAF7F0') },
                ]}
            >
                <View
                    style={[
                        styles.optionProgressFill,
                        {
                            width: `${safePercent}%`,
                            backgroundColor: isDarkMode ? '#A855F7' : (isBusinessProfile ? '#B88728' : accent),
                        },
                    ]}
                />
            </View>
        </TouchableOpacity>
    );
};

const StatRow = ({ totalParticipants, totalLikes, totalComments }) => {
    const { mutedText, border } = useBattleAccent();
    return (
        <View style={styles.statsRow}>
            <View style={styles.statItem}>
                <Icon name="people-outline" size={12} color={mutedText} />
                <Text style={[styles.statText, { color: mutedText }]}>{formatBattleCount(totalParticipants)}</Text>
            </View>
            <View style={[styles.statDot, { backgroundColor: border }]} />
            <View style={styles.statItem}>
                <View style={{ marginTop: 2 }}>
                    <Icon name="chatbox-ellipses-outline" size={12} color={mutedText} />
                </View>
                <Text style={[styles.statText, { color: mutedText }]}>{formatBattleCount(totalComments)}</Text>
            </View>
        </View>
    );
};

// ─── BattleCard ───────────────────────────────────────────────────────────────

const BattleCard = memo(({ item, selectedOption, onCardPress, onOptionSelect, onUserPress, fullWidth, bottomMargin = 8 }) => {
    const { t } = useLanguage();
    const [enlargedImage, setEnlargedImage] = useState(null);
    const {
        accent,
        accentLight,
        card,
        text: themeText,
        border,
        mutedText,
        isDarkMode,
        isBusinessProfile,
    } = useBattleAccent();
    const cardThemeStyle = { backgroundColor: card, borderColor: border };
    const primaryTextStyle = { color: themeText };
    const mutedTextStyle = { color: mutedText };
    const ended = formatBattleCountdown(item.endTime, t) === t('battleCard.ended');
    const isPoll = item.format === 'POLL';
    const soloOpponent = !isPoll && !item.opponent && isEmptyOpponent(item.user2);

    const suppressCardPressRef = useRef({ active: false, timer: null });
    const suppressNextCardPress = useCallback(() => {
        suppressCardPressRef.current.active = true;
        if (suppressCardPressRef.current.timer) clearTimeout(suppressCardPressRef.current.timer);
        suppressCardPressRef.current.timer = setTimeout(() => {
            suppressCardPressRef.current.active = false;
            suppressCardPressRef.current.timer = null;
        }, 350);
    }, []);

    const handleCardPress = useCallback(() => {
        if (suppressCardPressRef.current.active) {
            suppressCardPressRef.current.active = false;
            if (suppressCardPressRef.current.timer) clearTimeout(suppressCardPressRef.current.timer);
            suppressCardPressRef.current.timer = null;
            return;
        }
        onCardPress?.(item, selectedOption);
    }, [item, onCardPress, selectedOption]);

    const handleUserPress = useCallback((user, event) => {
        event?.stopPropagation?.();
        suppressNextCardPress();
        onUserPress?.(user);
    }, [onUserPress, suppressNextCardPress]);

    useEffect(() => () => {
        if (suppressCardPressRef.current.timer) clearTimeout(suppressCardPressRef.current.timer);
    }, []);

    const optionImages = Array.isArray(item?.optionImages) ? item.optionImages : [];

    const handleOption = useCallback(
        label => {
            if (!ended) {
                onOptionSelect?.(item.id, label);
            }
            onCardPress?.(item, label);
        },
        [ended, item, onOptionSelect, onCardPress],
    );

    const optionLabels = useMemo(
        () => (Array.isArray(item?.options) ? item.options : []).map(opt => String(opt?.label || opt || '')),
        [item?.options],
    );
    const getTeamLogoForOption = option => {
        const normalizedOption = String(option?.label || option || '').trim().toLowerCase();
        const teams =
            item?.raw?.externalPrediction?.raw?.teams ||
            item?.raw?.externalPrediction?.teams ||
            item?.raw?.externalPrediction?.raw?.raw?.teams ||
            item?.raw?.teams;
        const team = [teams?.home, teams?.away].find(candidate =>
            candidate?.name && String(candidate.name).trim().toLowerCase() === normalizedOption,
        );
        return team?.flag || team?.logo || team?.image || null;
    };
    const optionPercents = useMemo(() => {
        const countsSource = item?.voteCounts && Object.keys(item.voteCounts).length > 0
            ? item.voteCounts
            : (isPoll && item?.predictionCounts && Object.keys(item.predictionCounts).length > 0
                ? item.predictionCounts
                : item?.voteCounts);
        return computePercentages(optionLabels, countsSource || {});
    }, [isPoll, item?.predictionCounts, item?.voteCounts, optionLabels]);

    const formattedEndDate = formatBattleDate(item.endTime);

    if (isPoll) {
        return (
            <>
                <TouchableOpacity
                    activeOpacity={0.88}
                    style={[
                        styles.card,
                        styles.pollCard,
                        {
                            backgroundColor: card,
                            borderColor: border,
                        },
                        ended && styles.cardEnded,
                        fullWidth && styles.cardFullWidth,
                        { marginBottom: bottomMargin },
                    ]}
                    onPress={handleCardPress}
                    renderToHardwareTextureAndroid
                >
                    {/* Festive fireworks celebration illustration in top right */}
                    <FireworksDecoration />

                    {/* Top Creator Row with inline timer as in mockup */}
                    <View style={styles.cardTopRow}>
                        <View style={styles.pollCreatorRowContainer}>
                            <HexAvatar
                                uri={normalizeImageUrl(item.creator?.avatar) || DEFAULT_AVATAR}
                                size={36}
                                borderWidth={2}
                                borderColor={isBusinessProfile ? '#B88728' : accent}
                                fadeDuration={0}
                            />
                            <View style={styles.pollCreatorTextWrap}>
                                <View style={styles.pollCreatorNameRow}>
                                    <Text style={[styles.pollCreatorName, { color: isDarkMode ? '#EDE7F6' : (isBusinessProfile ? '#5C3E08' : '#402090') }]} numberOfLines={1}>
                                        {item.creator?.name || t('battleCard.creator', 'Creator')}
                                    </Text>
                                    <Text style={styles.swordsBadge}>⚔️</Text>
                                </View>
                                <View style={styles.pollCreatorSubRow}>
                                    <Text style={[styles.pollCreatorHandle, { color: isBusinessProfile ? '#8C7A55' : mutedText }]} numberOfLines={1}>
                                        @{item.creator?.userName || 'user'}
                                    </Text>
                                    {!!item.endTime && (
                                        <>
                                            <Text style={[styles.pollDot, { color: isBusinessProfile ? '#8C7A55' : mutedText }]}> • </Text>
                                            <Icon name="time-outline" size={10} color={isBusinessProfile ? '#8C7A55' : mutedText} style={{ marginRight: 2 }} />
                                            <Text style={[styles.pollTimerText, { color: isBusinessProfile ? '#8C7A55' : mutedText }]}>
                                                {formatBattleCountdown(item.endTime, t)}
                                            </Text>
                                        </>
                                    )}
                                </View>
                            </View>
                        </View>
                        <ModeBadge
                            format={item.raw?.battleType === 'PREDICTION' ? 'PREDICTION' : 'POLL'}
                            ended={ended}
                            isLive={item.isLive}
                            t={t}
                        />
                    </View>

                    {/* Question / Title */}
                    <Text style={[styles.question, { color: isDarkMode ? '#EDE7F6' : (isBusinessProfile ? '#5C3E08' : '#402090') }]} numberOfLines={3}>
                        {item.title}
                    </Text>

                    {/* Options Side-by-Side */}
                    {item.options?.length > 0 && (
                        <View style={styles.pollOptions}>
                            {item.options.slice(0, 4).map((option, idx) => {
                                const optionImageUrl = optionImages[idx];
                                const label = option?.label || option;
                                const isSelected = selectedOption === label;
                                return (
                                    <OptionChip
                                        key={`${item.id}-${option?.id || label}`}
                                        option={option}
                                        index={idx}
                                        isSelected={isSelected}
                                        disabled={ended}
                                        imageUrl={optionImageUrl || option?.image || option?.imageUrl}
                                        avatarUrl={optionImageUrl || option?.image || DEFAULT_AVATAR}
                                        teamLogoUrl={getTeamLogoForOption(option)}
                                        onPress={() => handleOption(label)}
                                        onImagePress={(url, title) => setEnlargedImage({ url, title })}
                                        percent={optionPercents[idx]}
                                    />
                                );
                            })}
                        </View>
                    )}

                    {/* Card Footer matching Image 2 mockup */}
                    <View style={styles.pollFooterRow}>
                        {/* Stakes Pill */}
                        <View style={[styles.footerStakePill, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : (isBusinessProfile ? '#FBF8F0' : accentLight) }]}>
                            <Icon name="flash" size={11} color={isBusinessProfile ? '#8C6010' : accent} style={{ marginRight: 4 }} />
                            <Text style={[styles.footerStakeText, { color: isBusinessProfile ? '#8C6010' : accent }]}>
                                {t('battleCard.stakes', 'Stakes')}: <Text style={[styles.footerStakeAmount, { color: isBusinessProfile ? '#8C6010' : accent }]}>{formatAmount(item.stakeAmount || 0)}</Text>
                            </Text>
                        </View>

                        {/* Participants & Comments inline */}
                        <View style={styles.footerStatsRowInline}>
                            <View style={styles.footerStatItem}>
                                <Icon name="people-outline" size={14} color={isBusinessProfile ? '#8C7A55' : mutedText} />
                                <Text style={[styles.footerStatText, { color: isDarkMode ? '#EDE7F6' : (isBusinessProfile ? '#8C7A55' : '#402090') }]}>
                                    {formatBattleCount(item.totalParticipants || 0)}
                                </Text>
                            </View>
                            <Text style={[styles.footerDot, { color: isBusinessProfile ? '#8C7A55' : mutedText }]}>•</Text>
                            <View style={styles.footerStatItem}>
                                <Icon name="chatbubble-outline" size={12} color={isBusinessProfile ? '#8C7A55' : mutedText} />
                                <Text style={[styles.footerStatText, { color: isDarkMode ? '#EDE7F6' : (isBusinessProfile ? '#8C7A55' : '#402090') }]}>
                                    {formatBattleCount(item.totalComments || 0)}
                                </Text>
                            </View>
                        </View>

                        {/* Vote Now ➔ Button */}
                        <TouchableOpacity
                            style={[styles.voteNowBtn, { backgroundColor: isBusinessProfile ? '#B88728' : accent }]}
                            onPress={() => onCardPress(item)}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.voteNowBtnText}>Vote Now ➔</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>

                {/* Enlarged Image Preview Modal */}
                <Modal
                    visible={Boolean(enlargedImage?.url)}
                    transparent
                    animationType="fade"
                    statusBarTranslucent
                    onRequestClose={() => setEnlargedImage(null)}
                >
                    <View style={styles.imageModalOverlay}>
                        <TouchableOpacity
                            style={styles.imageModalBackdrop}
                            activeOpacity={1}
                            onPress={() => setEnlargedImage(null)}
                        />
                        <View style={styles.imageModalContent}>
                            <View style={styles.imageModalHeader}>
                                <Text style={styles.imageModalTitle} numberOfLines={1}>
                                    {enlargedImage?.title || 'Preview'}
                                </Text>
                                <TouchableOpacity
                                    style={styles.imageModalCloseBtn}
                                    onPress={() => setEnlargedImage(null)}
                                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                >
                                    <Icon name="close" size={20} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                            {Boolean(enlargedImage?.url) && (
                                <Image
                                    source={{ uri: enlargedImage.url }}
                                    style={styles.enlargedImage}
                                    resizeMode="contain"
                                />
                            )}
                        </View>
                    </View>
                </Modal>
            </>
        );
    }

    // HEAD_TO_HEAD
    return (
        <>
        <TouchableOpacity
            activeOpacity={0.88}
            style={[styles.card, cardThemeStyle, ended && styles.cardEnded, fullWidth && styles.cardFullWidth, { marginBottom: 10 }]}
            onPress={handleCardPress}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            renderToHardwareTextureAndroid
        >
            <View style={styles.cardTopRow}>
                <View style={styles.pollCreatorRowContainer}>
                    {onUserPress ? (
                        <TouchableOpacity
                            style={styles.pollCreatorPressable}
                            activeOpacity={0.75}
                            onPressIn={suppressNextCardPress}
                            onPress={event => handleUserPress(
                                { id: item.creator?.id, userName: item.creator?.userName, image: item.creator?.avatar, displayName: item.creator?.name },
                                event
                            )}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                            <HexAvatar
                                uri={normalizeImageUrl(item.creator?.avatar) || DEFAULT_AVATAR}
                                size={20}
                                borderWidth={2}
                                borderColor={accent}
                                fadeDuration={0}
                            />
                            <View style={styles.pollCreatorTextWrap}>
                                <Text style={[styles.pollCreatorName, primaryTextStyle]} numberOfLines={1}>
                                    {item.creator?.name}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.pollCreatorPressable}>
                            <HexAvatar
                                uri={normalizeImageUrl(item.creator?.avatar) || DEFAULT_AVATAR}
                                size={20}
                                borderWidth={2}
                                borderColor={accent}
                                fadeDuration={0}
                            />
                            <View style={styles.pollCreatorTextWrap}>
                                <Text style={[styles.pollCreatorName, primaryTextStyle]} numberOfLines={1}>
                                    {item.creator?.name}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
                <ModeBadge format={item.format} ended={ended} isLive={item.isLive} t={t} />
            </View>
            <TimerBadge endTime={item.endTime} ended={ended} t={t} />

            <View style={styles.versusRow}>
                <ParticipantAvatar
                    avatarUrl={item.user1.avatar}
                    name={item.user1.name}
                    handle={item.user1.userName}
                    isEmpty={false}
                    onPressIn={suppressNextCardPress}
                    onPress={event => handleUserPress({ id: item.creator?.id, userName: item.user1.userName, image: item.user1.avatar, displayName: item.user1.name }, event)}
                    t={t}
                />
                <Text style={styles.vsIcon}>⚔️</Text>
                {item.opponent ? (
                    <ParticipantAvatar
                        avatarUrl={item.opponent.avatar}
                        name={item.user2.name}
                        handle={item.opponent.userName}
                        isEmpty={false}
                        onPressIn={suppressNextCardPress}
                        onPress={event => handleUserPress({ id: item.opponent?.id, userName: item.opponent.userName, image: item.opponent.avatar, displayName: item.user2.name }, event)}
                        t={t}
                    />
                ) : (
                    <ParticipantAvatar
                        avatarUrl={item.user2?.avatar}
                        name={item.user2?.name}
                        handle={item.user2?.userName}
                        isEmpty={soloOpponent}
                        onPressIn={soloOpponent ? undefined : suppressNextCardPress}
                        onPress={soloOpponent ? undefined : event => handleUserPress({ id: item.user2?.id, userName: item.user2?.userName, image: item.user2?.avatar, displayName: item.user2?.name }, event)}
                        t={t}
                    />
                )}
            </View>

            <Text style={[styles.question, primaryTextStyle]} numberOfLines={2}>{item.title}</Text>
            <StakePill amount={item.stakeAmount || 0} t={t} />

            {!soloOpponent && item.options?.length > 0 && (
                <View style={styles.pollOptions}>
                    {item.options.slice(0, 2).map((option, idx) => {
                        const optionImageUrl = optionImages[idx];
                        const label = option?.label || option;
                        const isSelected = selectedOption === label;
                        return (
                            <OptionChip
                                        key={`${item.id}-${option?.id || label}`}
                                        option={option}
                                        index={idx}
                                isSelected={isSelected}
                                disabled={ended}
                                imageUrl={optionImageUrl || option?.image || option?.imageUrl}
                                avatarUrl={optionImageUrl || option?.image || DEFAULT_AVATAR}
                                teamLogoUrl={getTeamLogoForOption(option)}
                                onPress={() => handleOption(label)}
                                onImagePress={(url, title) => setEnlargedImage({ url, title })}
                                percent={optionPercents[idx]}
                            />
                        );
                    })}
                </View>
            )}
            {soloOpponent && (
                <TouchableOpacity style={[styles.acceptBtn, { backgroundColor: accent }]} onPress={() => onCardPress(item)} activeOpacity={0.85}>
                    <Icon name="add-circle-outline" size={13} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.acceptBtnText}>{t('battleCard.acceptChallenge')}</Text>
                </TouchableOpacity>
            )}

            <View style={[styles.divider, { backgroundColor: border }]} />
            <StatRow totalParticipants={item.totalParticipants} totalLikes={item.totalLikes} totalComments={item.totalComments} />
        </TouchableOpacity>

        {/* Enlarged Image Preview Modal for Head-to-Head */}
        <Modal
            visible={Boolean(enlargedImage?.url)}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={() => setEnlargedImage(null)}
        >
            <View style={styles.imageModalOverlay}>
                <TouchableOpacity
                    style={styles.imageModalBackdrop}
                    activeOpacity={1}
                    onPress={() => setEnlargedImage(null)}
                />
                <View style={styles.imageModalContent}>
                    <View style={styles.imageModalHeader}>
                        <Text style={styles.imageModalTitle} numberOfLines={1}>
                            {enlargedImage?.title || 'Preview'}
                        </Text>
                        <TouchableOpacity
                            style={styles.imageModalCloseBtn}
                            onPress={() => setEnlargedImage(null)}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                            <Icon name="close" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                    {Boolean(enlargedImage?.url) && (
                        <Image
                            source={{ uri: enlargedImage.url }}
                            style={styles.enlargedImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </View>
        </Modal>
        </>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.item?.id === nextProps.item?.id &&
        prevProps.selectedOption === nextProps.selectedOption &&
        prevProps.item?.isLive === nextProps.item?.isLive &&
        prevProps.item?.status === nextProps.item?.status &&
        prevProps.onCardPress === nextProps.onCardPress &&
        prevProps.onOptionSelect === nextProps.onOptionSelect &&
        prevProps.onUserPress === nextProps.onUserPress &&
        JSON.stringify(prevProps.item?.voteCounts) === JSON.stringify(nextProps.item?.voteCounts) &&
        JSON.stringify(prevProps.item?.predictionCounts) === JSON.stringify(nextProps.item?.predictionCounts) &&
        JSON.stringify(prevProps.item?.optionImages) === JSON.stringify(nextProps.item?.optionImages) &&
        JSON.stringify(prevProps.item?.opponent) === JSON.stringify(nextProps.item?.opponent)
    );
});

export default BattleCard;

// ─── Constants ────────────────────────────────────────────────────────────────

const CARD_WIDTH = 220;
const CARD_GAP = 8;
const RESUME_DELAY_MS = 1000;
const AUTO_SCROLL_SPEED_PX_PER_MS = 0.04;
const START_DELAY_MS = 300;
const ROW_PADDING_LEFT = 10;

const AndroidBattleRow = ({ children, style, cardWidth = CARD_WIDTH, cardGap = CARD_GAP, rowPaddingLeft = ROW_PADDING_LEFT, autoScroll = true }) => {
    const allChildren = React.Children.toArray(children);

    const loopedChildren = [...allChildren, ...allChildren, ...allChildren];
    const totalWidth = allChildren.length * (cardWidth + cardGap);
    const isCarouselEnabled = autoScroll && allChildren.length > 1;

    const translateX = useRef(new Animated.Value(-totalWidth)).current;
    const animRef = useRef(null);
    const animOffsetRef = useRef(-totalWidth);
    const isDraggingRef = useRef(false);
    const dragStartOffsetRef = useRef(0);
    const resumeTimerRef = useRef(null);

    const normalizeLoopOffset = useCallback((offset) => {
        let normalizedOffset = offset;
        while (normalizedOffset <= -totalWidth) normalizedOffset += totalWidth;
        while (normalizedOffset > 0) normalizedOffset -= totalWidth;
        return normalizedOffset;
    }, [totalWidth]);

    useEffect(() => {
        animOffsetRef.current = -totalWidth;
        translateX.setValue(-totalWidth);
        const id = translateX.addListener(({ value }) => {
            animOffsetRef.current = value;
        });
        return () => translateX.removeListener(id);
    }, [translateX, totalWidth]);

    // continuously scroll using Easing.linear
    const startContinuousScroll = useCallback((fromX = 0) => {
        if (isDraggingRef.current) return;
        animRef.current?.stop();

        // Keep the position in the duplicated middle range before continuing.
        const wrappedFrom = normalizeLoopOffset(fromX);

        translateX.setValue(wrappedFrom);
        animOffsetRef.current = wrappedFrom;

        const targetX = -totalWidth * 2;
        const distance = Math.abs(targetX - wrappedFrom);
        const duration = distance / AUTO_SCROLL_SPEED_PX_PER_MS;

        animRef.current = Animated.timing(translateX, {
            toValue: targetX,
            duration: duration,
            easing: Easing.linear,
            useNativeDriver: true,
            isInteraction: false,
        });

        animRef.current.start(({ finished }) => {
            if (!finished || isDraggingRef.current) return;
            // loop back seamlessly
            startContinuousScroll(animOffsetRef.current);
        });
    }, [totalWidth, translateX, normalizeLoopOffset]);

    useEffect(() => {
        if (!isCarouselEnabled) return undefined;
        const timer = setTimeout(() => startContinuousScroll(animOffsetRef.current), START_DELAY_MS);
        return () => {
            clearTimeout(timer);
            animRef.current?.stop();
            if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
        };
    }, [isCarouselEnabled, startContinuousScroll]);

    const resumeAutoScroll = useCallback((offset = animOffsetRef.current) => {
        if (!isCarouselEnabled) return;
        if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = setTimeout(() => {
            startContinuousScroll(offset);
        }, RESUME_DELAY_MS);
    }, [isCarouselEnabled, startContinuousScroll]);

    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
            const { dx, dy } = gestureState;
            return Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5;
        },
        onMoveShouldSetPanResponderCapture: () => false,
        onPanResponderTerminationRequest: () => false,

        onPanResponderGrant: () => {
            isDraggingRef.current = true;
            animRef.current?.stop();
            translateX.stopAnimation(); // just halts it, no need to wait for the callback
            if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);

            // synchronous read — no bridge round-trip, no stale baseline
            dragStartOffsetRef.current = animOffsetRef.current;
            translateX.setValue(animOffsetRef.current);
        },

        onPanResponderMove: (_, gestureState) => {
            let next = dragStartOffsetRef.current + gestureState.dx;
            if (next > totalWidth) next = totalWidth;
            if (next < -totalWidth * 2) next = -totalWidth * 2;
            translateX.setValue(next);
            animOffsetRef.current = next;
        },

        onPanResponderRelease: (_, gestureState) => {
            isDraggingRef.current = false;

            const velocity = gestureState.vx; // px/ms, RN's native unit for this
            const startOffset = animOffsetRef.current;

            // Project extra travel distance from the release velocity, so a fast
            // flick keeps gliding instead of stopping dead where the finger lifted.
            const FLING_MULTIPLIER = 220;              // tune: higher = glides further
            const MAX_FLING_DISTANCE = cardWidth * 2.5; // safety cap
            let flingDistance = velocity * FLING_MULTIPLIER;
            flingDistance = Math.max(-MAX_FLING_DISTANCE, Math.min(MAX_FLING_DISTANCE, flingDistance));

            let target = startOffset + flingDistance;
            // keep within the tripled loop range so we never scroll into empty space
            target = Math.max(-totalWidth * 2, Math.min(totalWidth, target));

            const distance = Math.abs(target - startOffset);
            const duration = Math.max(150, Math.min(600, distance / 0.6));

            if (Math.abs(velocity) > 0.12 && distance > 4) {
                animRef.current?.stop();
                animRef.current = Animated.timing(translateX, {
                    toValue: target,
                    duration,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                    isInteraction: false,
                });
                animRef.current.start(({ finished }) => {
                    const finalOffset = normalizeLoopOffset(animOffsetRef.current);
                    animOffsetRef.current = finalOffset;
                    translateX.setValue(finalOffset);
                    resumeAutoScroll(finalOffset);
                });
            } else {
                // slow drag / tap-release — keep existing snap-in-place behavior
                const finalOffset = normalizeLoopOffset(animOffsetRef.current);
                animOffsetRef.current = finalOffset;
                translateX.setValue(finalOffset);
                resumeAutoScroll(finalOffset);
            }
        },

        onPanResponderTerminate: () => {
            isDraggingRef.current = false;
            const finalOffset = normalizeLoopOffset(animOffsetRef.current);
            animOffsetRef.current = finalOffset;
            translateX.setValue(finalOffset);
            resumeAutoScroll(finalOffset);
        },
    }), [normalizeLoopOffset, resumeAutoScroll, totalWidth, translateX]);

    useEffect(() => () => {
        animRef.current?.stop();
        if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    }, []);

    if (allChildren.length === 0) return null;

    if (!isCarouselEnabled) {
        return (
            <View style={[{ overflow: 'hidden', paddingLeft: rowPaddingLeft }, style]} collapsable={false}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    bounces={false}
                    decelerationRate="fast"
                    contentContainerStyle={{ flexDirection: 'row' }}
                >
                    {allChildren}
                </ScrollView>
            </View>
        );
    }

    return (
        <View
            style={[{ overflow: 'hidden', paddingLeft: rowPaddingLeft }, style]}
            collapsable={false}
            onTouchStart={() => {
                animRef.current?.stop();
                translateX.stopAnimation();
                if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
            }}
            onTouchEnd={() => {
                if (isDraggingRef.current) return;
                resumeAutoScroll();
            }}
            onTouchCancel={() => {
                if (isDraggingRef.current) return;
                resumeAutoScroll();
            }}
            {...panResponder.panHandlers}
        >
            <Animated.View
                style={{
                    flexDirection: 'row',
                    gap: cardGap,
                    transform: [{ translateX }],
                }}
            >
                {loopedChildren.map((child, i) => (
                    <View
                        key={`android-card-${i}`}
                        style={{ width: cardWidth }}
                        renderToHardwareTextureAndroid
                        collapsable={false}
                    >
                        {React.cloneElement(child, { key: `android-inner-${i}` })}
                    </View>
                ))}
            </Animated.View>
        </View>
    );
};

// ─── iOS: original ScrollView implementation (untouched) ──────────────────────

const IOSBattleRow = ({ children, style, cardWidth = CARD_WIDTH, cardGap = CARD_GAP, rowPaddingLeft = ROW_PADDING_LEFT }) => {
    const scrollViewRef = useRef(null);
    const autoScrollFrameRef = useRef(null);
    const resumeTimeoutRef = useRef(null);
    const pausedRef = useRef(false);
    const offsetRef = useRef(0);
    const lastFrameTsRef = useRef(0);
    const halfWidthRef = useRef(0);
    const [contentWidth, setContentWidth] = useState(0);
    const allChildren = React.Children.toArray(children);
    const isCarouselEnabled = allChildren.length > 1;

    useEffect(() => {
        halfWidthRef.current = contentWidth / 2;
    }, [contentWidth]);

    const clearResumeTimer = useCallback(() => {
        if (resumeTimeoutRef.current) {
            clearTimeout(resumeTimeoutRef.current);
            resumeTimeoutRef.current = null;
        }
    }, []);

    const stopAutoScroll = useCallback(() => {
        if (autoScrollFrameRef.current) {
            cancelAnimationFrame(autoScrollFrameRef.current);
            autoScrollFrameRef.current = null;
        }
        lastFrameTsRef.current = 0;
    }, []);

    const startAutoScroll = useCallback(() => {
        if (!isCarouselEnabled || pausedRef.current) return;
        stopAutoScroll();
        const tick = (timestamp) => {
            if (pausedRef.current || !isCarouselEnabled) {
                stopAutoScroll();
                return;
            }
            if (!lastFrameTsRef.current) lastFrameTsRef.current = timestamp;
            const deltaMs = timestamp - lastFrameTsRef.current;
            lastFrameTsRef.current = timestamp;
            let next = offsetRef.current + deltaMs * AUTO_SCROLL_SPEED_PX_PER_MS;
            const half = halfWidthRef.current;
            if (half > 0 && next >= half) {
                next = next - half;
                scrollViewRef.current?.scrollTo({ x: next, animated: false });
                offsetRef.current = next;
            } else {
                scrollViewRef.current?.scrollTo({ x: next, animated: false });
                offsetRef.current = next;
            }
            autoScrollFrameRef.current = requestAnimationFrame(tick);
        };
        autoScrollFrameRef.current = requestAnimationFrame(tick);
    }, [isCarouselEnabled, stopAutoScroll]);

    useEffect(() => {
        if (!isCarouselEnabled) return undefined;
        const timer = setTimeout(() => startAutoScroll(), START_DELAY_MS);
        return () => {
            clearTimeout(timer);
            clearResumeTimer();
            stopAutoScroll();
        };
    }, [isCarouselEnabled, startAutoScroll, clearResumeTimer, stopAutoScroll]);

    useEffect(() => () => {
        clearResumeTimer();
        stopAutoScroll();
    }, [clearResumeTimer, stopAutoScroll]);

    const handleInteractionStart = useCallback(() => {
        clearResumeTimer();
        pausedRef.current = true;
        stopAutoScroll();
    }, [clearResumeTimer, stopAutoScroll]);

    const handleInteractionEnd = useCallback(() => {
        clearResumeTimer();
        if (!isCarouselEnabled) {
            pausedRef.current = false;
            return;
        }
        resumeTimeoutRef.current = setTimeout(() => {
            pausedRef.current = false;
            startAutoScroll();
        }, RESUME_DELAY_MS);
    }, [isCarouselEnabled, clearResumeTimer, startAutoScroll]);

    if (!isCarouselEnabled) {
        return (
            <View style={[{ flexDirection: 'row', gap: cardGap, paddingHorizontal: rowPaddingLeft }, style]}>
                {allChildren}
            </View>
        );
    }

    return (
        <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEnabled={true}
            bounces={false}
            alwaysBounceHorizontal={false}
            overScrollMode="never"
            keyboardShouldPersistTaps="handled"
            delayContentTouches={false}
            scrollEventThrottle={16}
            onContentSizeChange={(width) => setContentWidth(width)}
            onScroll={(event) => {
                offsetRef.current = event?.nativeEvent?.contentOffset?.x ?? 0;
            }}
            onTouchStart={handleInteractionStart}
            onScrollBeginDrag={handleInteractionStart}
            onScrollEndDrag={handleInteractionEnd}
            onMomentumScrollEnd={handleInteractionEnd}
            onTouchEnd={handleInteractionEnd}
            contentContainerStyle={[
                { flexDirection: 'row', gap: cardGap, paddingLeft: rowPaddingLeft },
            ]}
        >
            {[
                ...allChildren.map((child, i) => React.cloneElement(child, { key: `ios-child1-${i}` })),
                ...allChildren.map((child, i) => React.cloneElement(child, { key: `ios-child2-${i}` }))
            ]}
        </ScrollView>
    );
};

// ✅ Use Animated.timing (AndroidBattleRow) for both platforms to prevent iOS UIScrollView from blocking global touches during continuous scroll.
export const AutoScrollBattleRow = AndroidBattleRow;

// ─── Styles ───────────────────────────────────────────────────────────────────

const PURPLE = '#7F77DD';
const PURPLE_LIGHT = '#EEEDFE';
const PURPLE_DARK = '#3C3489';
const GRAY_MID = '#888780';
const GRAY_BG = '#F1EFE8';
const TEXT = '#2C2C2A';
const BORDER = '#D3D1C7';
const GREEN = '#22C55E';

const styles = StyleSheet.create({
    optionImageCard: {
        flex: 1,
        minWidth: 120,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        marginBottom: 4,
    },
    optionLandscapeImageWrap: {
        width: '100%',
        height: 90,
        position: 'relative',
        backgroundColor: '#EDE8F5',
    },
    optionLandscapeImage: {
        width: '100%',
        height: '100%',
    },
    optionImageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.48)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 5,
        gap: 6,
    },
    optionOverlayLabel: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        flex: 1,
    },
    optionImageBottomWrap: {
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    optionBottomPercent: {
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 3,
    },
    letterPill: {
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 6,
    },
    letterPillText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '800',
    },
    pollCreatorSubRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    pollDot: {
        fontSize: 11,
    },
    pollTimerText: {
        fontSize: 11,
        fontWeight: '500',
    },
    footerStatsRowInline: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    voteNowBtn: {
        borderRadius: 20,
        paddingHorizontal: 13,
        paddingVertical: 6,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    voteNowBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },

    card: {
        width: CARD_WIDTH,
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 0.5,
        borderColor: BORDER,
        padding: 4,
        marginBottom: 8,
        overflow: 'hidden',
    },
    cardEnded: { opacity: 0.7 },
    cardFullWidth: { width: '100%', marginRight: 0 },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 3,
    },
    modeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PURPLE_LIGHT,
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 3,
        gap: 4,
        flexShrink: 0,
    },
    modeBadgeEnded: { backgroundColor: GRAY_BG },
    modeBadgeDotOrange: {
        width: 6, height: 6, borderRadius: 3,
        backgroundColor: '#F97316',
    },
    modeBadgeText: {
        fontSize: 9, fontWeight: '700',
        color: PURPLE_DARK, letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
    modeBadgeTextEnded: { color: GRAY_MID },
    liveDotWrapper: { width: 12, height: 12, alignItems: 'center', justifyContent: 'center' },
    liveDotRing: {
        position: 'absolute',
        width: 12, height: 12, borderRadius: 6,
        backgroundColor: GREEN, opacity: 0.3,
    },
    liveDotCore: { width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN },
    timerBadge: { flexDirection: 'row', alignItems: 'center' },
    timerText: { fontSize: 10, color: GRAY_MID, fontWeight: '500' },
    timerTextEnded: { color: '#A32D2D' },
    versusRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 2, gap: 1,
    },
    participantSlot: { flex: 1, alignItems: 'center', minWidth: 0 },
    participantContent: { alignItems: 'center', gap: 2, maxWidth: 72 },
    participantName: { fontSize: 10, fontWeight: '500', color: TEXT, textAlign: 'center', maxWidth: 64 },
    participantHandle: { fontSize: 10, color: GRAY_MID, textAlign: 'center' },
    vsIcon: { fontSize: 16, flexShrink: 0 },
    emptySlot: {
        width: 40, height: 40,
        borderRadius: 8,
        borderWidth: 2, borderColor: '#C4B5FD', borderStyle: 'dashed',
        backgroundColor: PURPLE_LIGHT,
        alignItems: 'center', justifyContent: 'center',
    },
    waitingLabel: { fontSize: 10, fontWeight: '600', color: PURPLE, textAlign: 'center' },
    waitingSub: { fontSize: 9, color: GRAY_MID, textAlign: 'center' },
    question: {
        fontSize: 17,
        fontWeight: '800',
        lineHeight: 22,
        marginTop: 4,
        marginBottom: 10,
    },
    stakePill: {
        flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
        backgroundColor: PURPLE_LIGHT, borderRadius: 20,
        paddingVertical: 2, paddingHorizontal: 8, marginBottom: 3, gap: 4,
    },
    stakeText: { fontSize: 11, color: PURPLE_DARK },
    stakeAmount: { fontWeight: '700', color: PURPLE_DARK },
    pollOptions: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 10,
    },
    optionChip: {
        flex: 1,
        minWidth: 120,
        borderRadius: 14,
        paddingVertical: 7,
        paddingHorizontal: 8,
        marginVertical: 4,
        backgroundColor: '#fff',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
    },
    optionContentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        minHeight: 26,
    },
    optionThumbnailWrap: {
        width: 22,
        height: 22,
        borderRadius: 11,
        overflow: 'hidden',
        marginRight: 6,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.03)',
    },
    optionThumbnail: {
        width: '100%',
        height: '100%',
    },
    optionTextContainer: {
        flex: 1,
        minWidth: 0,
        marginRight: 4,
    },
    optionPercentInline: {
        fontSize: 12,
        fontWeight: '800',
    },
    optionChipSelectedBusiness: {
        borderColor: '#CBA257',
        backgroundColor: '#FFFFFF',
    },
    footerStatsRowCentered: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingTop: 6,
    },
    optionChipSelected: { borderColor: PURPLE, backgroundColor: PURPLE_LIGHT },
    optionChipTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minWidth: 0,
    },
    teamLogo: { width: 22, height: 22 },
    optionChipTextWrap: { flex: 1, minWidth: 0 },
    optionChipLabel: { flex: 1, fontSize: 11, fontWeight: '600', color: TEXT, minWidth: 0 },
    optionChipLabelSelected: { color: PURPLE_DARK },
    optionChipPercentInline: { fontSize: 11, fontWeight: '700', },
    optionChipPercent: { marginTop: 1, fontSize: 9, fontWeight: '700', color: GRAY_MID },
    optionProgressTrack: {
        width: '100%',
        height: 4,
        borderRadius: 999,
        backgroundColor: '#ECEAF8',
        overflow: 'hidden',
    },
    optionProgressFill: {
        height: '100%',
        borderRadius: 999,
        backgroundColor: PURPLE,
    },
    radioCircle: {
        width: 13, height: 13, borderRadius: 6.5,
        borderWidth: 1.5, borderColor: BORDER,
        alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
    },
    radioCircleSelected: { borderColor: PURPLE },
    radioInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: PURPLE },
    optionDisabled: { opacity: 0.45 },
    acceptBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: PURPLE, borderRadius: 20,
        paddingVertical: 6, paddingHorizontal: 12, marginBottom: 6,
    },
    acceptBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
    pollCreatorRowContainer: { flex: 1, marginRight: 8, minWidth: 0 },
    pollCreatorPressable: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', minWidth: 0 },
    pollCreatorTextWrap: { marginLeft: 6, flexShrink: 1, minWidth: 0 },
    pollCreatorName: { fontSize: 12, fontWeight: '500', color: TEXT, flexShrink: 1 },
    pollCreatorHandle: { fontSize: 10, color: GRAY_MID },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
    metaText: { fontSize: 10, color: GRAY_MID },
    divider: { height: 0.5, backgroundColor: BORDER, marginBottom: 3 },
    statsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center' },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statText: { fontSize: 11, color: GRAY_MID },
    statDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: BORDER },
    creatorByline: {
        fontSize: 12,
        color: "#000",
        fontWeight: '700',
        marginTop: 2,
        marginLeft: 2,
    },
    fireworksContainer: {
        position: 'absolute',
        top: 2,
        right: 8,
        width: 116,
        height: 66,
        zIndex: 0,
    },
    pollCard: {
        borderRadius: 22,
        borderWidth: 1.2,
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 12,
        shadowColor: '#402090',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 14,
        elevation: 3,
        overflow: 'hidden',
    },
    modeBadgeDotGreen: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#22C55E',
    },
    pollCreatorNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    swordsBadge: {
        fontSize: 12,
    },
    timerRow: {
        marginTop: 4,
        marginBottom: 2,
    },
    optionImageWrapper: {
        width: 96,
        height: 52,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#EDE8F5',
        position: 'relative',
    },
    optionImage: {
        width: '100%',
        height: '100%',
    },
    imageEnlargeBadge: {
        position: 'absolute',
        right: 3,
        bottom: 3,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        borderRadius: 4,
        padding: 2,
    },
    optionImagePlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionVerticalDivider: {
        width: 1,
        height: 38,
        marginHorizontal: 8,
    },
    optionRightContent: {
        flex: 1,
        justifyContent: 'center',
        gap: 6,
    },
    optionTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    optionPercentAndRadio: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    optionPercentText: {
        fontSize: 14,
        fontWeight: '800',
    },
    optionChipSelected: {
        borderColor: '#402090',
        backgroundColor: '#FFFFFF',
    },
    optionChipSelectedDark: {
        borderColor: '#A855F7',
        backgroundColor: '#292036',
    },
    pollFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 0.5,
    },
    footerStakePill: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    footerStakeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    footerStakeAmount: {
        fontWeight: '800',
    },
    footerVerticalDivider: {
        width: 1,
        height: 16,
    },
    footerStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    footerStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    footerStatText: {
        fontSize: 12,
        fontWeight: '700',
    },
    footerDot: {
        fontSize: 12,
    },
    footerDateRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    footerDateLabel: {
        fontSize: 11,
        fontWeight: '500',
    },
    footerDateVal: {
        fontSize: 11,
        fontWeight: '700',
    },
    imageModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(10, 6, 20, 0.88)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    imageModalBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    imageModalContent: {
        width: '100%',
        maxWidth: 420,
        backgroundColor: '#1E162B',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    imageModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    },
    imageModalTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        marginRight: 12,
    },
    imageModalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    enlargedImage: {
        width: '100%',
        height: Dimensions.get('window').height * 0.45,
        backgroundColor: '#000000',
    },
});
