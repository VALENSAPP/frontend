import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { battleByUserId, battlePoint, filtterBattle } from '../../services/battle';
import { useAppTheme } from '../../theme/useApptheme';
import { useThemeContext } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n';
import { sortBattlesLiveFirst } from '../../utils/battleCardUtils';
import {
  BATTLE_LEVELS,
  formatBattleLevelRequirement,
  getBattleLevelDragonflyIcon,
  resolveBattleLevel,
} from '../../utils/battleLevels';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient as SvgGradient,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

const mixWithWhite = (hex, amount = 0.88) => {
  const normalized = String(hex || '').replace('#', '');
  if (normalized.length !== 6) return '#f5f3ff';
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const mix = channel => Math.round(channel + (255 - channel) * amount);
  const toHex = channel => mix(channel).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const withAlpha = (hex, alpha = 0.12) => {
  const normalized = String(hex || '').replace('#', '');
  if (normalized.length !== 6) return `rgba(201,161,90,${alpha})`;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const nestedSurface = (isDarkMode, accent) =>
  isDarkMode ? withAlpha(accent, 0.14) : mixWithWhite(accent, 0.92);

const pickFirst = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

const normalizeBattleItem = (raw) => {
  const status = String(pickFirst(raw?.status, 'open')).toLowerCase();
  const options = Array.isArray(raw?.options) ? raw.options : [];
  const votes = Number(pickFirst(raw?._count?.participants, raw?.participantsCount, raw?.votes, 0));
  const stake = Number(pickFirst(raw?.stakeAmount, raw?.stake, raw?.pot, 0));
  const endTime = pickFirst(
    raw?.endTime,
    raw?.end_time,
    raw?.endsAt,
    raw?.ends_at,
    raw?.endDate,
    raw?.end_date,
    raw?.expiryTime,
    raw?.expiresAt,
    null,
  );
  const type = String(pickFirst(raw?.battleType, raw?.type, 'opinion')).toLowerCase();
  const category = String(pickFirst(raw?.category, raw?.predictionCategory, raw?.topic, '')).toLowerCase();
  const userVote = pickFirst(raw?.userVote, raw?.userVotedOptionId, raw?.myVote, raw?.votedOptionId, null);

  return {
    id: String(pickFirst(raw?.id, raw?._id, raw?.battleId, '')),
    title: pickFirst(raw?.title, raw?.question, 'Untitled battle'),
    status,
    format: String(pickFirst(raw?.format, 'POLL')).toUpperCase(),
    battleType: type,
    category,
    userVote,
    votes,
    stake,
    endTime,
    options: options.map((option, index) => {
      const optId = String(pickFirst(option?.id, option?._id, index));
      const isUserVoted = Boolean(
        option?.isUserVoted ||
        option?.userVoted ||
        (userVote && String(userVote) === optId) ||
        (index === 0 && (status.includes('live') || status.includes('progress')))
      );
      return {
        id: optId,
        label:
          typeof option === 'string'
            ? option
            : pickFirst(option?.label, option?.text, option?.value, `Option ${index + 1}`),
        isUserVoted,
      };
    }),
  };
};

const emptySummary = {
  level: 'Rookie',
  totals: {
    totalBattlesJoined: 0,
    totalBattlesWon: 0,
    totalPredictionsCorrect: 0,
    totalPredictionsWrong: 0,
    totalArgumentLikes: 0,
  },
  predictionAccuracyPercent: 0,
  credibilityScore: 0,
  liveCount: 0,
  points: 0,
};

const formatDate = (value) => {
  if (!value) return null;
  const parsed =
    typeof value === 'number'
      ? new Date(value < 10_000_000_000 ? value * 1000 : value)
      : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
  const day = `${parsed.getDate()}`.padStart(2, '0');
  const year = parsed.getFullYear();
  return `${month}/${day}/${year}`;
};

const isBattleExpired = (battle) => {
  const endTime = battle?.endTime;
  if (!endTime) return false;
  const parsed =
    typeof endTime === 'number'
      ? new Date(endTime < 10_000_000_000 ? endTime * 1000 : endTime)
      : new Date(endTime);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() <= Date.now();
};

const getStatusMeta = (battle) => {
  const status = String(battle?.status || '').toLowerCase();
  const expired = isBattleExpired(battle);

  if (status.includes('canceled') || status.includes('cancelled')) {
    return { labelKey: 'battleHub.statusCanceled', tone: '#DC2626' };
  }

  if (status.includes('pending_invite') || status.includes('pendinginvite')) {
    if (expired) return { labelKey: 'battleHub.statusClosed', tone: '#6B7280' };
    return { labelKey: 'battleHub.statusPendingInvite', tone: '#F59E0B' };
  }

  if (status.includes('live') || status.includes('progress') || status === 'open') {
    return { labelKey: 'battleHub.statusLive', tone: '#16A34A', isLive: true };
  }
  if (
    status.includes('closed') ||
    status.includes('finished') ||
    status.includes('resolved')
  ) {
    return { labelKey: 'battleHub.statusFinished', tone: '#6B7280' };
  }
  if (expired) {
    return { labelKey: 'battleHub.statusClosed', tone: '#6B7280' };
  }
  if (status.includes('result')) {
    return { labelKey: 'battleHub.statusResult', tone: '#8B5CF6' };
  }
  return { labelKey: 'battleHub.statusLive', tone: '#16A34A', isLive: true };
};

const renderCategoryIllustration = (battle, isBusiness = false) => {
  const text = `${battle.title} ${battle.category || ''} ${battle.battleType || ''}`.toLowerCase();

  // Sports keywords: soccer ball
  if (
    text.includes('u17') ||
    text.includes('match') ||
    text.includes(' vs ') ||
    text.includes('winner') ||
    text.includes('sport') ||
    text.includes('football') ||
    text.includes('soccer') ||
    text.includes('cup') ||
    text.includes('league')
  ) {
    return (
      <Svg width={36} height={36} viewBox="0 0 36 36" fill="none">
        <Defs>
          <RadialGradient id="ballShade" cx="30%" cy="30%" r="70%">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="75%" stopColor="#E2E8F0" />
            <Stop offset="100%" stopColor="#94A3B8" />
          </RadialGradient>
        </Defs>
        <Circle cx="18" cy="18" r="15" fill="url(#ballShade)" />
        <Polygon points="18,13 22,16 20.5,20.5 15.5,20.5 14,16" fill="#1E293B" />
        <Polygon points="18,13 18,6 22,8 22,16" fill="#334155" opacity="0.9" />
        <Polygon points="22,16 28.5,15 30,20 20.5,20.5" fill="#334155" opacity="0.9" />
        <Polygon points="15.5,20.5 15,27 10,25 14,16" fill="#334155" opacity="0.9" />
        <Polygon points="14,16 7.5,15 9,8 18,6" fill="#334155" opacity="0.9" />
        <Polygon points="20.5,20.5 21.5,27 15,27" fill="#334155" opacity="0.9" />
      </Svg>
    );
  }

  // Movie / Entertainment keywords: clapperboard
  if (
    text.includes('game') ||
    text.includes('movie') ||
    text.includes('film') ||
    text.includes('box office') ||
    text.includes('cinema') ||
    text.includes('reaping') ||
    text.includes('hunger') ||
    text.includes('series') ||
    text.includes('show') ||
    text.includes('entertainment')
  ) {
    const mainColor = isBusiness ? '#967026' : '#6B21A8';
    const darkColor = isBusiness ? '#664614' : '#4C1D95';
    const innerColor = isBusiness ? '#78531A' : '#581C87';
    return (
      <Svg width={36} height={36} viewBox="0 0 36 36" fill="none">
        <Rect x="5" y="14" width="26" height="18" rx="2.5" fill={mainColor} />
        <Rect x="7" y="16" width="22" height="14" rx="1.5" fill={innerColor} />
        <G transform="rotate(-7 6 12)">
          <Rect x="5" y="7" width="26" height="6.5" rx="1.5" fill={darkColor} />
          <Polygon points="9,7 12.5,7 10,13.5 6.5,13.5" fill="#FFFFFF" />
          <Polygon points="16,7 19.5,7 17,13.5 13.5,13.5" fill="#FFFFFF" />
          <Polygon points="23,7 26.5,7 24,13.5 20.5,13.5" fill="#FFFFFF" />
        </G>
      </Svg>
    );
  }

  // General default: Trophy badge
  const bgCircle = isBusiness ? '#FAF0D7' : '#E9D5FF';
  const trophyColor = isBusiness ? '#CBA257' : '#7C3AED';
  return (
    <Svg width={34} height={34} viewBox="0 0 34 34" fill="none">
      <Circle cx="17" cy="17" r="13" fill={bgCircle} />
      <Path d="M 11 11 L 23 11 C 23 17, 20.5 20.5, 17 20.5 C 13.5 20.5, 11 17, 11 11 Z" fill={trophyColor} />
      <Path d="M 17 20.5 L 17 24 M 13.5 24 L 20.5 24" stroke={trophyColor} strokeWidth="2.2" strokeLinecap="round" />
      <Path d="M 11 13 C 8.5 13, 8.5 16.5, 11 16.5 M 23 13 C 25.5 13, 25.5 16.5, 23 16.5" stroke={trophyColor} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
};

const BATTLE_TRACKING_FILTERS = {
  myBattle: 'battle_live',
  battleArena: 'battle_arena',
  pastBattle: 'battle_past',
};

const getRawBattlesFromResponse = (response, filterKey) => {
  const payload = response?.data?.data ?? response?.data ?? response ?? {};
  return Array.isArray(payload)
    ? payload
    : payload?.[filterKey] ||
    payload?.battles ||
    payload?.data?.battles ||
    payload?.data?.[filterKey] ||
    payload?.data ||
    payload?.items ||
    response?.battles ||
    [];
};

export default function ProfileBattleHub({
  viewedUserId,
  isOwner = false,
  openBattleRoute = 'OpenBattle',
  profile,
  returnTo = 'Home',
  isCompanyProfile,
}) {
  const navigation = useNavigation();
  const { accent, border, mutedText, isBusinessProfile } = useAppTheme(profile);
  const isBusiness = Boolean(
    isCompanyProfile ||
    isBusinessProfile ||
    profile === 'company' ||
    profile === 'business'
  );
  const { isDarkMode } = useThemeContext();
  const { t } = useLanguage();
  const labelColor = isDarkMode ? '#FFFFFF' : '#1F1135';

  const brandPrimary = isBusiness ? '#CBA257' : '#7C3AED';
  const brandDark = isBusiness ? '#6B4F1A' : '#2D1152';
  const brandActive = isBusiness ? '#967026' : '#4C1D95';
  const cardBorder = isDarkMode
    ? 'rgba(255,255,255,0.08)'
    : (isBusiness ? '#E8D9BD' : '#F0E8FA');
  const cardShadow = isBusiness ? '#CBA257' : '#431370';
  const tabsBg = isDarkMode
    ? 'rgba(255,255,255,0.06)'
    : (isBusiness ? '#F6F0E4' : '#F1EBF9');
  const tabsInactiveText = isBusiness ? '#967026' : '#6D28D9';
  const heroGradient = isBusiness
    ? ['#664614', '#967026', '#CBA257']
    : ['#3B0F6B', '#5A1694', '#7822BD'];
  const heroEyebrowColor = isBusiness ? '#FDE68A' : '#D8B4FE';
  const ctaGradient = isBusiness
    ? ['#967026', '#CBA257']
    : ['#7E22CE', '#C026D3'];
  const waveStops = isBusiness
    ? { stop1: '#FAF7F0', stop2: '#F5EEDB', stop3: '#E8D9BD' }
    : { stop1: '#F5EEFA', stop2: '#EDE2F8', stop3: '#E4D4F5' };

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [battles, setBattles] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [battlePointSummary, setBattlePointSummary] = useState(emptySummary);
  const [activeTab, setActiveTab] = useState('myBattle');
  const [levelsModalVisible, setLevelsModalVisible] = useState(false);

  const loadBattles = useCallback(async () => {
    if (!isOwner && !viewedUserId) {
      setBattles([]);
      return;
    }
    setLoading(true);
    try {
      const filterKey = BATTLE_TRACKING_FILTERS[activeTab] ?? 'battle_live';
      const response = isOwner
        ? await filtterBattle({ filter: filterKey })
        : await battleByUserId({ params: { userId: viewedUserId } });
      const rawBattles = getRawBattlesFromResponse(response, filterKey);
      const normalized = Array.isArray(rawBattles)
        ? rawBattles.map(normalizeBattleItem).filter((item) => item.id)
        : [];
      setBattles(normalized);
    } catch (_error) {
      setBattles([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, isOwner, viewedUserId]);

  const getBattlePoint = useCallback(async () => {
    if (!viewedUserId) {
      setBattlePointSummary(emptySummary);
      return;
    }
    try {
      const response = await battlePoint({ params: { userId: viewedUserId } });
      const rawData = response?.data?.data || response?.data || response || {};
      const totals = rawData?.totals || {};
      const rawItems = Array.isArray(rawData?.items) ? rawData.items : [];
      setBattlePointSummary({
        level: String(rawData?.level || 'Rookie'),
        totals: {
          totalBattlesJoined: Number(totals?.totalBattlesJoined || 0),
          totalBattlesWon: Number(totals?.totalBattlesWon || 0),
          totalPredictionsCorrect: Number(totals?.totalPredictionsCorrect || 0),
          totalPredictionsWrong: Number(totals?.totalPredictionsWrong || 0),
          totalArgumentLikes: Number(totals?.totalArgumentLikes || 0),
        },
        predictionAccuracyPercent: Number(rawData?.predictionAccuracyPercent || 0),
        credibilityScore: Number(rawData?.credibilityScore || 0),
        liveCount: rawItems.filter((item) =>
          String(item?.status || '').toUpperCase().includes('LIVE'),
        ).length,
        points: Number(totals?.totalBattlePoints || 0),
      });
    } catch (_err) {
      setBattlePointSummary(emptySummary);
    }
  }, [viewedUserId]);

  useEffect(() => {
    loadBattles();
    getBattlePoint();
  }, [loadBattles, getBattlePoint]);

  useFocusEffect(
    useCallback(() => {
      loadBattles();
      getBattlePoint();
    }, [getBattlePoint, loadBattles]),
  );

  const currentBattleLevel = useMemo(
    () =>
      resolveBattleLevel({
        level: battlePointSummary.level,
        points: battlePointSummary.points,
        battlesWon: battlePointSummary.totals.totalBattlesWon,
        credibility: battlePointSummary.credibilityScore,
        accuracy: battlePointSummary.predictionAccuracyPercent,
      }),
    [battlePointSummary],
  );

  const levelInfo = useMemo(
    () => ({
      tier: t(`battleHub.levels.${currentBattleLevel.id}`),
      levelText: t('battleHub.levelsModal.levelPill', { level: currentBattleLevel.level }),
      color: currentBattleLevel.color,
      Icon: getBattleLevelDragonflyIcon(currentBattleLevel.iconId, isDarkMode),
    }),
    [currentBattleLevel, isDarkMode, t],
  );

  const requirementLabels = useMemo(
    () => ({
      points: t('battleHub.levelsModal.points'),
      battlesWon: t('battleHub.levelsModal.battlesWon'),
      credibility: t('battleHub.levelsModal.credibility'),
      accuracy: t('battleHub.levelsModal.accuracy'),
    }),
    [t],
  );

  const openLevelsModal = useCallback(() => setLevelsModalVisible(true), []);
  const closeLevelsModal = useCallback(() => setLevelsModalVisible(false), []);

  const DragonflyIcon = levelInfo.Icon;

  const openBattle = useCallback(
    (battle) => {
      const params = { battleId: battle.id, battle, entryPoint: 'profile_battle_tab', profile };
      const parentNavigation = navigation.getParent?.();
      if (parentNavigation) {
        parentNavigation.navigate('ProfileMain', { screen: 'BattleInProgress', params });
        return;
      }
      navigation.navigate('BattleInProgress', params);
    },
    [navigation, profile],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadBattles();
      await getBattlePoint();
    } finally {
      setRefreshing(false);
    }
  }, [getBattlePoint, loadBattles]);

  const filteredBattles = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const matched = query
      ? battles.filter((battle) =>
        String(battle?.title || '').toLowerCase().includes(query),
      )
      : battles;
    return sortBattlesLiveFirst(matched);
  }, [battles, searchText]);

  return (
    <>
      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        enableOnAndroid
        extraScrollHeight={140}
        extraHeight={120}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Hero Banner: Battle Performance */}
        <LinearGradient
          colors={heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.heroLeft}>
            <Text style={[styles.heroEyebrow, { color: heroEyebrowColor }]}>
              {t('battleHub.heroEyebrow', 'BATTLE PERFORMANCE')}
            </Text>
            <Text style={styles.heroTitle}>
              {t('battleHub.heroTitle', 'Compete, predict,\nand build your\nValens reputation.')}
            </Text>
            <Text style={styles.heroSubtitle}>
              {t('battleHub.heroSubtitle', 'Opinion battles reward votes and\nengagement. Prediction battles\nreward accuracy first.')}
            </Text>
          </View>
          <View style={styles.heroTrophyWrap}>
            <Image
              source={
                isBusiness
                  ? require('../../assets/icons/pngicons/goldentrophy.png')
                  : require('../../assets/icons/pngicons/closettrophy.png')
              }
              style={styles.heroTrophyImage}
              resizeMode="contain"
            />
          </View>
        </LinearGradient>

        {/* Stats Card */}
        <View
          style={[
            styles.statsCard,
            {
              backgroundColor: isDarkMode ? (isBusiness ? '#241D12' : '#1E1233') : '#FFFFFF',
              borderColor: cardBorder,
              shadowColor: cardShadow,
            },
          ]}
        >
          {/* Row 1: Level & Battles Joined */}
          <View style={styles.statsRow1}>
            <TouchableOpacity
              style={styles.statCol2}
              onPress={openLevelsModal}
              activeOpacity={0.75}
            >
              <View style={styles.statIconWrap}>
                <DragonflyIcon width={28} height={28} />
              </View>
              <View style={styles.statTextWrap}>
                <Text style={[styles.statValueBold, { color: labelColor }]} numberOfLines={1}>
                  {t(`battleHub.levels.${currentBattleLevel.id}`)}
                </Text>
                <Text style={[styles.statLabelMuted, { color: mutedText }]}>
                  {t('battleHub.statLevel', 'Level')}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.statCol2}>
              <View style={styles.statIconWrap}>
                <Ionicons name="layers-outline" size={22} color={brandPrimary} />
              </View>
              <View style={styles.statTextWrap}>
                <Text style={[styles.statValueBold, { color: labelColor }]}>
                  {battlePointSummary.totals.totalBattlesJoined}
                </Text>
                <Text style={[styles.statLabelMuted, { color: mutedText }]}>
                  {t('battleHub.statJoined', 'Battles Joined')}
                </Text>
              </View>
            </View>
          </View>

          {/* Row 2: Battles Won, Accuracy, Points */}
          <View style={styles.statsRow2}>
            <View style={styles.statCol3}>
              <View style={styles.statIconWrapSmall}>
                <Ionicons name="trophy-outline" size={18} color={brandPrimary} />
              </View>
              <View style={styles.statTextWrap}>
                <Text style={[styles.statValueBold, { color: labelColor }]}>
                  {battlePointSummary.totals.totalBattlesWon}
                </Text>
                <Text style={[styles.statLabelMuted, { color: mutedText }]}>
                  {t('battleHub.statWon', 'Battles Won')}
                </Text>
              </View>
            </View>

            <View style={styles.statCol3}>
              <View style={styles.statIconWrapSmall}>
                <Ionicons name="disc-outline" size={18} color={brandPrimary} />
              </View>
              <View style={styles.statTextWrap}>
                <Text style={[styles.statValueBold, { color: labelColor }]}>
                  {battlePointSummary.predictionAccuracyPercent}%
                </Text>
                <Text style={[styles.statLabelMuted, { color: mutedText }]}>
                  {t('battleHub.statAccuracy', 'Accuracy')}
                </Text>
              </View>
            </View>

            <View style={styles.statCol3}>
              <View style={styles.statIconWrapSmall}>
                <Ionicons name="server-outline" size={18} color={brandPrimary} />
              </View>
              <View style={styles.statTextWrap}>
                <Text style={[styles.statValueBold, { color: labelColor }]}>
                  {battlePointSummary.points}
                </Text>
                <Text style={[styles.statLabelMuted, { color: mutedText }]}>
                  {t('battleHub.statPoints', 'Points')}
                </Text>
              </View>
            </View>
          </View>

          {/* Start a New Battle CTA */}
          {isOwner && (
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.startBattleWrap}
              onPress={() =>
                navigation.navigate(
                  openBattleRoute,
                  { returnTo, profile },
                  isBusiness && isBusiness,
                )
              }
            >
              <LinearGradient
                colors={ctaGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.startBattleBtn}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.startBattleBtnText}>
                  {t('battleHub.startNewBattle', 'Start a New Battle')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Search Bar */}
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: isDarkMode ? (isBusiness ? '#241D12' : '#1E1233') : '#FFFFFF',
              borderColor: cardBorder,
              shadowColor: cardShadow,
            },
          ]}
        >
          <Ionicons name="search-outline" size={18} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: labelColor }]}
            placeholder={t('battleHub.searchPlaceholder', 'Search battle question...')}
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearSearchBtn} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs Bar */}
        {isOwner ? (
          <View
            style={[
              styles.tabsContainer,
              { backgroundColor: tabsBg },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'myBattle' && [styles.activeTabButton, { backgroundColor: brandActive }],
              ]}
              onPress={() => setActiveTab('myBattle')}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'myBattle' ? '#FFFFFF' : tabsInactiveText },
                ]}
              >
                My Battles
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'battleArena' && [styles.activeTabButton, { backgroundColor: brandActive }],
              ]}
              onPress={() => setActiveTab('battleArena')}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'battleArena' ? '#FFFFFF' : tabsInactiveText },
                ]}
              >
                Battle Arena
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'pastBattle' && [styles.activeTabButton, { backgroundColor: brandActive }],
              ]}
              onPress={() => setActiveTab('pastBattle')}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'pastBattle' ? '#FFFFFF' : tabsInactiveText },
                ]}
              >
                Past Battles
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? '#FFFFFF' : brandDark }]}>
            {t('battleHub.recentBattles', 'Recent Battles')}
          </Text>
          <Text style={[styles.sectionSubtitle, { color: '#6B7280' }]}>
            {t('battleHub.recentBattlesSubtitle', 'Open any battle to continue the flow.')}
          </Text>
        </View>

        {/* Battle List */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={brandPrimary} />
          </View>
        ) : filteredBattles.length > 0 ? (
          filteredBattles.map((battle) => {
            const statusMeta = getStatusMeta(battle);
            const dateLabel = formatDate(battle.endTime) ?? t('battleHub.noEndDate', 'No end date');
            return (
              <TouchableOpacity
                key={battle.id}
                activeOpacity={0.88}
                style={[
                  styles.battleCard,
                  {
                    backgroundColor: isDarkMode ? (isBusiness ? '#241D12' : '#1E1233') : '#FFFFFF',
                    borderColor: cardBorder,
                    shadowColor: cardShadow,
                  },
                ]}
                onPress={() => openBattle(battle)}
              >
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.statusPill,
                      statusMeta.isLive
                        ? styles.statusPillLive
                        : { backgroundColor: `${statusMeta.tone}18` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        statusMeta.isLive ? styles.statusTextLive : { color: statusMeta.tone },
                      ]}
                    >
                      {statusMeta.isLive ? 'LIVE' : t(statusMeta.labelKey)}
                    </Text>
                  </View>
                  <Text style={[styles.cardMeta, { color: isDarkMode ? (isBusiness ? '#F5DEB3' : '#C4B5FD') : brandActive }]}>
                    {battle.battleType === 'prediction'
                      ? t('battleHub.typePrediction', 'Prediction')
                      : t('battleHub.typeOpinion', 'Opinion')}
                  </Text>
                </View>

                <Text style={[styles.cardTitle, { color: labelColor }]} numberOfLines={3}>
                  {battle.title}
                </Text>

                {!!battle.options.length && (
                  <View style={styles.optionRow}>
                    {battle.options.slice(0, 3).map((option) => {
                      const isSelected = option.isUserVoted;
                      return (
                        <View
                          key={`${battle.id}-${option.id}`}
                          style={[
                            styles.optionChip,
                            isSelected
                              ? [styles.optionChipActive, { backgroundColor: brandActive }]
                              : {
                                backgroundColor: isDarkMode
                                  ? 'rgba(255,255,255,0.08)'
                                  : (isBusiness ? '#FAF6EE' : '#F3F4F6'),
                              },
                          ]}
                        >
                          <Text
                            style={[
                              styles.optionText,
                              isSelected
                                ? styles.optionTextActive
                                : { color: isDarkMode ? '#E5E7EB' : (isBusiness ? '#4A3B22' : '#374151') },
                            ]}
                            numberOfLines={1}
                          >
                            {option.label}
                          </Text>
                          {isSelected && (
                            <Ionicons
                              name="checkmark-circle"
                              size={12}
                              color="#FFFFFF"
                              style={styles.optionCheckIcon}
                            />
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}

                <View style={styles.cardFooter}>
                  <View style={styles.footerDateWrap}>
                    <Ionicons
                      name="calendar-outline"
                      size={13}
                      color="#6B7280"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.footerText, { color: '#6B7280' }]}>{dateLabel}</Text>
                  </View>
                </View>

                {/* Right Bottom Corner Wave & Category 3D Illustration */}
                <View style={styles.cardCornerGraphic} pointerEvents="none">
                  <Svg width={115} height={75} viewBox="0 0 115 75" fill="none">
                    <Defs>
                      <SvgGradient id={`waveGrad-${battle.id}`} x1="0" y1="1" x2="1" y2="0">
                        <Stop offset="0%" stopColor={waveStops.stop1} stopOpacity="0.25" />
                        <Stop offset="55%" stopColor={waveStops.stop2} stopOpacity="0.8" />
                        <Stop offset="100%" stopColor={waveStops.stop3} stopOpacity="0.95" />
                      </SvgGradient>
                    </Defs>
                    <Path
                      d="M 0 75 C 42 62, 68 35, 115 12 L 115 75 Z"
                      fill={`url(#waveGrad-${battle.id})`}
                    />
                  </Svg>
                  <View style={styles.cardCornerIconWrap}>
                    {renderCategoryIllustration(battle, isBusiness)}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: isDarkMode ? '#1E1233' : '#FFFFFF',
                borderColor: border,
              },
            ]}
          >
            <Ionicons name="trophy-outline" size={28} color={mutedText} />
            <Text style={[styles.emptyTitle, { color: accent }]}>
              {searchText.trim() ? t('battleHub.noResultsFound') : t('battleHub.noBattlesYet')}
            </Text>
            <Text style={[styles.emptySubtitle, { color: mutedText }]}>
              {searchText.trim()
                ? t('battleHub.noResultsSubtitle')
                : t('battleHub.noBattlesSubtitle')}
            </Text>
          </View>
        )}
      </KeyboardAwareScrollView>

      {/* Levels Modal */}
      <Modal
        visible={levelsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeLevelsModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeLevelsModal}
          />
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: isDarkMode ? '#1E1233' : '#FFFFFF',
                borderColor: border,
              },
            ]}
          >
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.modalTitle, { color: labelColor }]}>
                {t('battleHub.levelsModal.title')}
              </Text>
              <Text style={[styles.modalSubtitle, { color: mutedText }]}>
                {t('battleHub.levelsModal.subtitle')}
              </Text>

              <View style={styles.levelsGrid}>
                {BATTLE_LEVELS.map((tier) => {
                  const isCurrent = tier.id === currentBattleLevel.id;
                  const requirements = formatBattleLevelRequirement(tier, requirementLabels);
                  const TierDragonflyIcon = getBattleLevelDragonflyIcon(tier.iconId, isDarkMode);
                  return (
                    <View
                      key={tier.id}
                      style={[
                        styles.levelCard,
                        {
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F9F8FD',
                          borderColor: isCurrent ? tier.color : border,
                        },
                        isCurrent && styles.levelCardCurrent,
                      ]}
                    >
                      {isCurrent ? (
                        <View style={[styles.currentBadge, { backgroundColor: tier.color }]}>
                          <Text style={styles.currentBadgeText}>
                            {t('battleHub.levelsModal.currentBadge')}
                          </Text>
                        </View>
                      ) : null}
                      <View style={[styles.levelPill, { backgroundColor: `${tier.color}22` }]}>
                        <Text style={[styles.levelPillText, { color: tier.color }]}>
                          {t('battleHub.levelsModal.levelPill', { level: tier.level })}
                        </Text>
                      </View>
                      <View style={styles.levelHexWrap}>
                        <Svg width={56} height={56}>
                          <Polygon
                            points="28,2 54,15 54,41 28,54 2,41 2,15"
                            stroke={tier.color}
                            strokeWidth="2"
                            fill="transparent"
                            strokeLinejoin="round"
                          />
                        </Svg>
                        <View style={styles.levelHexIcon}>
                          <TierDragonflyIcon width={24} height={24} />
                        </View>
                      </View>
                      <Text
                        style={[styles.levelTitle, { color: tier.color }]}
                        numberOfLines={2}
                      >
                        {t(`battleHub.levels.${tier.id}`)}
                      </Text>
                      {requirements.map((req) => (
                        <View key={`${tier.id}-${req.key}`} style={styles.reqRow}>
                          <Ionicons
                            name={
                              req.key === 'points'
                                ? 'star'
                                : req.key === 'wins'
                                  ? 'trophy'
                                  : req.key === 'credibility'
                                    ? 'shield-checkmark'
                                    : 'speedometer'
                            }
                            size={12}
                            color={mutedText}
                            style={styles.reqIcon}
                          />
                          <Text style={[styles.reqText, { color: mutedText }]} numberOfLines={1}>
                            {req.text}
                          </Text>
                        </View>
                      ))}
                    </View>
                  );
                })}
              </View>

              <Text style={[styles.modalFooter, { color: mutedText }]}>
                {t('battleHub.levelsModal.footer')}
              </Text>

              <TouchableOpacity
                style={[styles.modalCloseButton, { backgroundColor: accent }]}
                onPress={closeLevelsModal}
                activeOpacity={0.85}
              >
                <Text style={styles.modalCloseButtonText}>
                  {t('battleHub.levelsModal.gotIt')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: 40,
    paddingTop: 2,
  },

  /* Hero Banner */
  heroBanner: {
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 2,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 170,
  },
  heroLeft: {
    flex: 1,
    paddingRight: 10,
    justifyContent: 'center',
    padding: 20
  },
  heroEyebrow: {
    fontSize: 10.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#D8B4FE',
    marginBottom: 5,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 22,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.88)',
    lineHeight: 15.5,
  },
  heroTrophyWrap: {
    width: 105,
    height: 105,
    alignItems: 'center',
    justifyContent: 'center',
    right: 10
  },
  heroTrophyImage: {
    width: 105,
    height: 105,
  },

  /* Stats Card */
  statsCard: {
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#431370',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statsRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCol2: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCol3: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconWrap: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  statIconWrapSmall: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  statTextWrap: {
    flex: 1,
  },
  statValueBold: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  statLabelMuted: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },

  /* Start Battle Button */
  startBattleWrap: {
    marginTop: 2,
  },
  startBattleBtn: {
    height: 38,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBattleBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  /* Search Container */
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    height: 42,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#431370',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
    paddingVertical: 0,
  },
  clearSearchBtn: {
    marginLeft: 6,
  },

  /* Tabs */
  tabsContainer: {
    flexDirection: 'row',
    borderRadius: 22,
    padding: 3,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 18,
  },
  activeTabButton: {
    backgroundColor: '#4C1D95',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* Section Header */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },

  /* Battle Cards */
  loadingWrap: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  battleCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#431370',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  statusPillLive: {
    backgroundColor: '#DCFCE7',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusTextLive: {
    color: '#16A34A',
  },
  cardMeta: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: 10,
    paddingRight: 35,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
    paddingRight: 45,
  },
  optionChip: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionChipActive: {
    backgroundColor: '#4C1D95',
  },
  optionText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  optionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  optionCheckIcon: {
    marginLeft: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerDateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardCornerGraphic: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 115,
    height: 75,
  },
  cardCornerIconWrap: {
    position: 'absolute',
    right: 14,
    bottom: 8,
  },

  /* Empty State */
  emptyCard: {
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },

  /* Levels Modal */
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalContent: {
    maxHeight: '88%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 18,
  },
  levelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  levelCard: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  levelCardCurrent: {
    borderWidth: 2,
  },
  currentBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  currentBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  levelPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  levelPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  levelHexWrap: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  levelHexIcon: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelTitle: {
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 8,
    minHeight: 28,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 3,
  },
  reqIcon: {
    marginRight: 4,
  },
  reqText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
  },
  modalFooter: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 16,
  },
  modalCloseButton: {
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
});
