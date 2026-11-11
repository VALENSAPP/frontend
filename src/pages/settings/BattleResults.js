import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  BackHandler,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { getUserCredentials } from '../../services/post';
import { useAppTheme } from '../../theme/useApptheme';
import { useThemeContext } from '../../theme/ThemeContext';
import { normalizeProfileType } from '../../utils/supportEligibility';
import { battleWinner } from '../../services/battle';
import HexAvatar from '../../components/home/story.js/HexAvatar';
import trophyPng from '../../assets/icons/pngicons/trophy.png';
import { useLanguage } from '../../i18n';

const withAlpha = (hex, alpha) => {
  if (typeof hex === 'string' && /^#[0-9A-Fa-f]{6}$/.test(hex)) {
    return `${hex}${alpha}`;
  }
  return hex;
};

const normalizeCountKey = value => String(value || '').trim().toLowerCase();

const findCountByFlexibleKey = (countsMap, rawLabel) => {
  const normalizedLabel = normalizeCountKey(rawLabel);

  if (!normalizedLabel) {
    return undefined;
  }

  if (countsMap?.[normalizedLabel] !== undefined) {
    return countsMap[normalizedLabel];
  }

  const entries = Object.entries(countsMap || {});
  const partialMatch = entries.find(([key]) => {
    return (
      key.includes(normalizedLabel) ||
      normalizedLabel.includes(key)
    );
  });

  return partialMatch ? partialMatch[1] : undefined;
};

const formatStakeAmount = value => {
  const parsed = Number(value);
  const safeValue = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  return safeValue.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
};

export default function BattleResults({ navigation }) {
  const route = useRoute();
  const { t } = useLanguage();
  const resolvedProfileType = normalizeProfileType(route?.params?.profile);
  const { bgStyle, accent, card, border, mutedText } = useAppTheme(resolvedProfileType);
  const { isDarkMode } = useThemeContext();
  const labelColor = isDarkMode ? '#ffffff' : '#111827';
  const { battle = {} } = route.params || {};
  const [winnerData, setWinnerData] = useState(route?.params?.winnerData || null);
  const [winnerLookupComplete, setWinnerLookupComplete] = useState(Boolean(route?.params?.winnerData));
  const predictionCounts = useMemo(
    () => route?.params?.predictionCounts || battle?.predictionCounts || {},
    [battle?.predictionCounts, route?.params?.predictionCounts],
  );

  // The winner endpoint is the source of truth. A resolved battle can have no
  // winner yet, in which case it returns `winnerUserId: null`.
  const winnerUserId = winnerData?.winnerUserId || '';
  const winningSide =
    winnerData?.winningSide || route?.params?.winningSide || battle?.winningSide || '';
  const matchResult = winnerData?.matchResult || null;
  const isSportsPredictionResult =
    winnerData?.battleType === 'PREDICTION' &&
    winnerData?.category === 'SPORTS' &&
    winnerData?.isPrediction === true &&
    Boolean(matchResult);
  const optionVoteCount = useMemo(
    () =>
      route?.params?.optionVoteCount ||
      route?.params?.voteCounts ||
      battle?.optionVoteCount ||
      battle?.voteCounts ||
      {},
    [
      battle?.optionVoteCount,
      battle?.voteCounts,
      route?.params?.optionVoteCount,
      route?.params?.voteCounts,
    ],
  );
  const [winnerProfile, setWinnerProfile] = useState(null);
  const [winnerLoading, setWinnerLoading] = useState(false);
  const livePulseAnim = useState(() => new Animated.Value(1))[0];
  const battleId = battle?.id || battle?.battleId || route?.params?.battleId || '';
  const title = battle.title || 'Battle';
  const description = battle.question || '';
  const endedAt = battle.endTime || '';
  const totalVotes = battle.totalVotes || 0;

  const totalComments = battle.totalComments || 0;
  const stake = battle.stake || 0;
  const options = useMemo(
    () => battle.options || [],
    [battle.options],
  );
  const status = winnerData?.status || battle.status || 'LIVE';
  const normalizedStatus = String(status || '').trim().toUpperCase();
  const isLiveStatus =
    normalizedStatus.includes('LIVE') || normalizedStatus.includes('PROGRESS');
  const isFinishedStatus =
    normalizedStatus.includes('FINISH') ||
    normalizedStatus.includes('CLOSED') ||
    normalizedStatus.includes('RESULT');
  const isResolvedStatus =
    normalizedStatus === 'RESOLVED' || normalizedStatus.includes('RESOLVED');
  const hasDeclaredWinner = winnerLookupComplete && Boolean(winnerUserId);
  // Deliberately strict: do not show this state for a failed request or an
  // incomplete response. The API must explicitly report `winnerUserId: null`.
  const hasNoWinnerFromApi =
    winnerLookupComplete && winnerData?.winnerUserId === null;
  const endedByTime = useMemo(() => {
    if (!endedAt) {
      return false;
    }
    const parsed = new Date(endedAt);
    return !Number.isNaN(parsed.getTime()) && parsed.getTime() <= Date.now();
  }, [endedAt]);
  const heroStatus = useMemo(() => {
    if (isResolvedStatus) {
      return {
        badgeLabel: t('battleInProgress.statusResult'),
        badgeTone: '#FFD184',
        headline: hasDeclaredWinner
          ? t('battleResults.winnerDeclared')
          : t('battleResults.battleClosed'),
      };
    }
    if (isLiveStatus) {
      return {
        badgeLabel: t('battleInProgress.statusLive'),
        badgeTone: '#86EFAC',
        headline: t('battleResults.battleOngoing'),
      };
    }
    if (isFinishedStatus || endedByTime) {
      return {
        badgeLabel: t('battleInProgress.statusFinished'),
        badgeTone: '#F5F0E6',
        headline: t('battleResults.battleClosed'),
      };
    }
    return {
      badgeLabel: t('battleInProgress.statusOpen'),
      badgeTone: '#FFF3D0',
      headline: t('battleResults.battleOpen'),
    };
  }, [
    endedByTime,
    hasDeclaredWinner,
    isFinishedStatus,
    isLiveStatus,
    isResolvedStatus,
    t,
  ]);
  const battleFormat = String(battle.format || '').toUpperCase().trim();
  const isPollFormat = battleFormat === 'POLL';
  const participants = battle.primaryCount || 0;
  const normalizedPredictionCounts = useMemo(() => {
    return Object.entries(predictionCounts || {}).reduce((acc, [key, value]) => {
      acc[normalizeCountKey(key)] = Number(value) || 0;
      return acc;
    }, {});
  }, [predictionCounts]);
  const normalizedOptionVoteCount = useMemo(() => {
    return Object.entries(optionVoteCount || {}).reduce((acc, [key, value]) => {
      acc[normalizeCountKey(key)] = Number(value) || 0;
      return acc;
    }, {});
  }, [optionVoteCount]);
  const getOptionVotes = useCallback(item => {
    const predictionMappedVotes = findCountByFlexibleKey(
      normalizedPredictionCounts,
      item?.label,
    );

    if (predictionMappedVotes !== undefined && predictionMappedVotes !== null) {
      return Number(predictionMappedVotes) || 0;
    }

    const mappedVotes = findCountByFlexibleKey(
      normalizedOptionVoteCount,
      item?.label,
    );

    if (mappedVotes !== undefined && mappedVotes !== null) {
      return Number(mappedVotes) || 0;
    }

    return Number(item?.votes || 0);
  }, [normalizedOptionVoteCount, normalizedPredictionCounts]);
  const derivedPredictionTotal = useMemo(
    () =>
      Object.values(predictionCounts || {}).reduce(
        (sum, value) => sum + (Number(value) || 0),
        0,
      ),
    [predictionCounts],
  );
  const derivedOptionVoteTotal = useMemo(
    () => options.reduce((sum, item) => sum + getOptionVotes(item), 0),
    [options, getOptionVotes],
  );
  const resolvedTotalVotes = Math.max(
    Number(totalVotes) || 0,
    derivedPredictionTotal,
    derivedOptionVoteTotal,
  );
  const getPercent = votes => {
    if (!resolvedTotalVotes) return 0;
    return Math.round((votes / resolvedTotalVotes) * 100);
  };
  const getMatchTeam = useCallback(item => {
    if (!isSportsPredictionResult) return null;

    const optionNames = [item?.label, item?.side]
      .map(normalizeCountKey)
      .filter(Boolean);
    if (!optionNames.length) return null;

    if (
      optionNames.includes(normalizeCountKey(matchResult?.homeTeam)) ||
      optionNames.includes('home')
    ) {
      return {
        logo: matchResult?.homeLogo,
        score: matchResult?.homeScore,
      };
    }

    if (
      optionNames.includes(normalizeCountKey(matchResult?.awayTeam)) ||
      optionNames.includes('away')
    ) {
      return {
        logo: matchResult?.awayLogo,
        score: matchResult?.awayScore,
      };
    }

    return null;
  }, [isSportsPredictionResult, matchResult]);

  const openBattleDetails = useCallback(
    ({ mode = 'votes', selectedSide = '', selectedSideLabel = '' } = {}) => {
      navigation.navigate('BattleVoteDetails', {
        battleId,
        battle,
        profile: resolvedProfileType,
        mode,
        selectedSide,
        selectedSideLabel,
      });
    },
    [battle, battleId, navigation, resolvedProfileType],
  );

  const palette = useMemo(() => {
    const primary = accent || '#5a2d82';
    const secondary =
      primary.toLowerCase() === '#c9a15a' ? '#b8924f' : '#8f54f7';

    return {
      primary,
      secondary,
      surface: card || (isDarkMode ? '#1E182A' : '#FFFFFF'),
      background: isDarkMode ? '#120E1C' : '#FAF7FD',
      muted: mutedText || withAlpha(primary, 'A6'),
      subtle: isDarkMode ? 'rgba(255,255,255,0.6)' : '#796B94',
      soft: isDarkMode ? withAlpha(primary, '24') : withAlpha(primary, '0D'),
      softBorder: border || (isDarkMode ? '#2D263D' : '#EFE8F6'),
      whiteSoft: 'rgba(255,255,255,0.16)',
      warm: '#FFD166',
      track: isDarkMode ? 'rgba(255,255,255,0.08)' : withAlpha(primary, '14'),
    };
  }, [accent, border, card, isDarkMode, mutedText]);

  useEffect(() => {
    if (!isLiveStatus) {
      livePulseAnim.setValue(1);
      return undefined;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulseAnim, {
          toValue: 0.35,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(livePulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    return () => pulse.stop();
  }, [isLiveStatus, livePulseAnim]);

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      setWinnerLookupComplete(false);
      setWinnerData(null);

      if (!battleId) {
        if (active) {
          setWinnerData(route?.params?.winnerData || null);
          setWinnerLookupComplete(true);
        }
        return;
      }

      try {
        const winnerRes = await battleWinner(battleId);
        // Supports both the API envelope and an axios response object.
        const result = winnerRes?.data?.data || winnerRes?.data || winnerRes;

        if (active) {
          setWinnerData(result);
        }
      } catch (err) {
      } finally {
        if (active) setWinnerLookupComplete(true);
      }
    };

    fetchData();

    return () => {
      active = false;
    };
  }, [battleId]);

  useEffect(() => {
    let active = true;

    const loadWinnerProfile = async () => {
      if (!winnerUserId) {
        if (active) setWinnerProfile(null);
        return;
      }

      setWinnerLoading(true);
      try {
        const response = await getUserCredentials(winnerUserId);
        const user =
          response?.data?.user || response?.data?.data || response?.data || {};

        if (active) {
          setWinnerProfile({
            name: user?.name || user?.fullName || user?.displayName ||
              user?.userName || user?.username || t('battleResults.winningUser'),
            image: user?.image || user?.avatar || user?.profilePic ||
              user?.profilePicture || '',
          });
        }
      } catch (_error) {
        if (active) setWinnerProfile(null);
      } finally {
        if (active) setWinnerLoading(false);
      }
    };

    loadWinnerProfile();
    return () => { active = false; };
  }, [t, winnerUserId]);

  const handleBackPress = useCallback(() => {
    const returnTo = route?.params?.returnTo;
    const entryPoint = route?.params?.entryPoint;

    if (
      entryPoint === 'search' ||
      entryPoint === 'battleExplore' ||
      returnTo === 'Search' ||
      returnTo === 'SearchHome' ||
      returnTo?.tab === 'Search' ||
      returnTo?.screen === 'SearchHome'
    ) {
      navigation.navigate('Search', {
        screen: 'SearchHome',
        params: (typeof returnTo === 'object' ? returnTo?.params : route?.params?.returnParams) || {},
      });
      return;
    }

    if (entryPoint === 'notifications') {
      navigation.navigate('HomeMain', { screen: 'HeartNotification' });
      return;
    }

    if (typeof returnTo === 'object' && returnTo?.tab) {
      navigation.navigate(returnTo.tab, returnTo.screen ? { screen: returnTo.screen, params: returnTo.params } : undefined);
      return;
    }

    if (typeof returnTo === 'string' && returnTo) {
      navigation.navigate(returnTo, route?.params?.returnParams);
      return;
    }

    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('HomeMain', { screen: 'HeartNotification' });
  }, [navigation, route?.params?.returnTo, route?.params?.entryPoint, route?.params?.returnParams]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleBackPress();
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [handleBackPress])
  );

  return (
    <SafeAreaView style={[styles.safeArea, bgStyle, { backgroundColor: palette.background }]}>
      <ScrollView
        style={[styles.scrollView, bgStyle, { backgroundColor: palette.background }]}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Modern Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBackPress}
            style={[
              styles.headerIconBtn,
              {
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(90,45,130,0.07)',
                borderColor: palette.softBorder,
              },
            ]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={20} color={labelColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: labelColor }]}>
            {t('battleResults.headerTitle')}
          </Text>
          <View style={styles.headerIconBtnPlaceholder} />
        </View>

        {/* Status / Ended Pill */}
        <View style={styles.metaRow}>
          <View
            style={[
              styles.metaBadge,
              {
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#F2ECF9',
                borderColor: palette.softBorder,
              },
            ]}
          >
            <Ionicons name="time-outline" size={13} color={palette.muted} style={{ marginRight: 5 }} />
            <Text style={[styles.metaTextPill, { color: palette.muted }]}>
              {endedByTime || isFinishedStatus || isResolvedStatus
                ? t('battleResults.metaEnded')
                : t('battleResults.metaEnds')}{' '}
              <Text style={{ fontWeight: '700', color: labelColor }}>
                {endedAt
                  ? new Date(endedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : t('battleResults.metaNotAvailable')}
              </Text>
            </Text>
          </View>
        </View>

        <Text style={[styles.title, { color: labelColor }]}>{title}</Text>
        {!!description && (
          <Text style={[styles.desc, { color: palette.subtle }]}>
            {description}
          </Text>
        )}

        {/* Creator row */}
        {!!battle.creator && (
          <TouchableOpacity
            activeOpacity={0.75}
            style={[
              styles.creatorRow,
              {
                backgroundColor: palette.surface,
                borderColor: palette.softBorder,
              },
            ]}
            onPress={() => {
              const creatorId = battle.creatorId || battle.creator?.id || '';
              if (!creatorId) return;
              navigation.navigate('HomeMain', {
                screen: 'UsersProfile',
                params: { userId: creatorId },
              });
            }}
          >
            <HexAvatar
              uri={battle.creator?.avatar || battle.creator?.image || ''}
              size={32}
              borderWidth={2}
              borderColor={accent}
            />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[styles.creatorName, { color: labelColor }]} numberOfLines={1}>
                {battle.creator?.name || battle.creator?.displayName || battle.creator?.userName || ''}
              </Text>
              {!!(battle.creator?.handle || battle.creator?.userName) && (
                <Text style={[styles.creatorHandle, { color: palette.muted }]} numberOfLines={1}>
                  @{battle.creator?.handle || battle.creator?.userName}
                </Text>
              )}
            </View>
            <View style={[styles.creatorPill, { backgroundColor: palette.soft }]}>
              <Text style={[styles.creatorPillText, { color: palette.primary }]}>Creator</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Winner Profile Card */}
        {isResolvedStatus && hasDeclaredWinner && (
          <View
            style={[
              styles.winnerProfileCard,
              {
                backgroundColor: palette.surface,
                borderColor: '#FBBF24',
                shadowColor: '#F59E0B',
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(251, 191, 36, 0.15)', 'rgba(251, 191, 36, 0.02)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.winnerProfileRow}>
              {winnerLoading ? (
                <View
                  style={[
                    styles.winnerAvatarFallback,
                    { backgroundColor: palette.soft },
                  ]}
                >
                  <ActivityIndicator size="small" color={palette.primary} />
                </View>
              ) : (
                <HexAvatar
                  uri={winnerProfile?.image || require('../../assets/icons/pngicons/user.png')}
                  size={60}
                  borderWidth={2}
                  borderColor="#F59E0B"
                />
              )}

              <View style={styles.winnerProfileTextWrap}>
                <View style={styles.winnerChampionBadge}>
                  <Text style={styles.winnerChampionText}>🏆 {t('battleResults.winningUser')}</Text>
                </View>
                <Text style={[styles.winnerProfileName, { color: labelColor }]} numberOfLines={1}>
                  {winnerProfile?.name || t('battleResults.winningUser')}
                </Text>

                {!!winningSide && (
                  <Text
                    style={[styles.winnerProfileMeta, { color: palette.muted }]}
                  >
                    {t('battleResults.sideLabel')}: <Text style={{ fontWeight: '700', color: labelColor }}>{winningSide}</Text>
                  </Text>
                )}
                <View
                  style={[
                    styles.pointsContainer,
                    {
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#FFFBEB',
                      borderColor: '#FDE68A',
                    },
                  ]}
                >
                  <Text style={[styles.pointsLabel, { color: '#B45309' }]}>
                    {t('battleResults.pointsEarned')}:
                  </Text>
                  <Text style={[styles.pointsValue, { color: '#D97706' }]}>
                    +{winnerData?.points || 0}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.trophyWrap} pointerEvents="none">
              <Image
                source={trophyPng}
                style={styles.trophyPng}
                resizeMode="contain"
              />
            </View>
          </View>
        )}

        {/* Hero Banner */}
        <LinearGradient
          colors={accent?.toLowerCase() === '#c9a15a' ? ['#A16207', '#854D0E', '#422006'] : ['#6B21A8', '#581C87', '#3B0764']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {/* Ambient Glows */}
          <View style={styles.heroGlowTop} />
          <View style={styles.heroGlowBottom} />

          <View style={styles.heroTopRow}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="trophy-outline" size={26} color="#FFD166" />
            </View>

            <View style={styles.metaPillsRow}>
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: withAlpha(heroStatus.badgeTone, '2A'),
                    borderColor: withAlpha(heroStatus.badgeTone, '55'),
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.statusDot,
                    {
                      opacity: isLiveStatus ? livePulseAnim : 1,
                      backgroundColor: heroStatus.badgeTone,
                    },
                  ]}
                />
                <Text style={[styles.statusPillText, { color: heroStatus.badgeTone }]}>
                  {heroStatus.badgeLabel}
                </Text>
              </View>

              <View style={styles.stakePill}>
                <Ionicons name="flash" size={12} color="#FFD166" />
                <Text style={styles.stakeText}>
                  {t('battleResults.stakesLabel')}{' '}
                  <Text style={styles.stakeAmount}>{formatStakeAmount(stake)}</Text>
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.heroHeadline}>{heroStatus.headline}</Text>
          <View style={styles.participantsRow}>
            <Ionicons name="people-outline" size={14} color="rgba(255,255,255,0.75)" style={{ marginRight: 5 }} />
            <Text style={styles.heroSubline}>
              {participants.toLocaleString()} {t('battleResults.participants')}
              {isPollFormat ? ` · ${t('battleInProgress.formatPoll')}` : ''}
            </Text>
          </View>

          {isResolvedStatus && hasNoWinnerFromApi && (
            <View style={styles.heroAlertBadge}>
              <Ionicons name="information-circle-outline" size={14} color="#FECACA" style={{ marginRight: 5 }} />
              <Text style={styles.heroAlertText}>
                {t('battleResults.youLostBattle')}
              </Text>
            </View>
          )}

          {isResolvedStatus && hasDeclaredWinner && !!winningSide && (
            <View style={styles.heroWinnerSideBadge}>
              <Ionicons name="ribbon-outline" size={14} color="#FDE047" style={{ marginRight: 5 }} />
              <Text style={styles.heroWinnerSideText}>
                {t('battleResults.winningSideLabel')} {winningSide}
              </Text>
            </View>
          )}

          {/* Frosted Side-by-side Stats Boxes */}
          <View style={styles.statsRow}>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => openBattleDetails({ mode: 'votes' })}
              style={styles.statBox}
            >
              <View style={styles.statBoxHeader}>
                <View style={styles.statBoxLabelRow}>
                  <Ionicons name="stats-chart-outline" size={12} color="rgba(255,255,255,0.75)" style={{ marginRight: 4 }} />
                  <Text style={styles.statLabel}>{t('battleResults.statsVotes')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.45)" />
              </View>
              <Text style={styles.statValue}>
                {resolvedTotalVotes.toLocaleString()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => openBattleDetails({ mode: 'comments' })}
              style={styles.statBox}
            >
              <View style={styles.statBoxHeader}>
                <View style={styles.statBoxLabelRow}>
                  <Ionicons name="chatbubble-ellipses-outline" size={12} color="rgba(255,255,255,0.75)" style={{ marginRight: 4 }} />
                  <Text style={styles.statLabel}>{t('battleResults.statsComments')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.45)" />
              </View>
              <Text style={styles.statValue}>
                {Number(totalComments).toLocaleString()}
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Battle Options Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: palette.surface,
              borderColor: palette.softBorder,
              shadowColor: palette.primary,
            },
          ]}
        >
          {/* Section Header */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <View style={[styles.sectionIconWrap, { backgroundColor: palette.soft }]}>
                <Ionicons name="layers-outline" size={18} color={palette.primary} />
              </View>
              <Text style={[styles.section, { color: labelColor }]}>
                {t('battleResults.battleOptions')}
              </Text>
            </View>
            {options.length > 0 && (
              <View style={[styles.optionCountBadge, { backgroundColor: palette.soft, borderColor: palette.softBorder }]}>
                <Text style={[styles.optionCountText, { color: palette.primary }]}>
                  {options.length} {options.length === 1 ? 'Option' : 'Options'}
                </Text>
              </View>
            )}
          </View>

          {/* Sports Prediction Scoreboard */}
          {isSportsPredictionResult && !!matchResult?.scoreSummary && (
            <View
              style={[
                styles.scoreboardCard,
                {
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#F7F3FB',
                  borderColor: palette.softBorder,
                },
              ]}
            >
              <View style={styles.scoreboardTopRow}>
                <View style={styles.matchStatusBadge}>
                  <Text style={styles.matchStatusBadgeText}>
                    ⚽ {matchResult?.matchStatus || t('battleInProgress.statusFinished')}
                  </Text>
                </View>
              </View>
              <Text style={[styles.scoreboardTitle, { color: labelColor }]}>
                {matchResult.scoreSummary}
              </Text>
            </View>
          )}

          {/* Empty state when no options */}
          {options.length === 0 && (
            <View style={styles.emptyOptionsWrap}>
              <View style={[styles.emptyOptionsIconWrap, { backgroundColor: palette.soft }]}>
                <Ionicons name="pie-chart-outline" size={28} color={palette.primary} />
              </View>
              <Text style={[styles.emptyOptionsTitle, { color: labelColor }]}>
                {t('battleResults.noOptionsAvailable')}
              </Text>
              <Text style={[styles.emptyOptionsSubtitle, { color: palette.muted }]}>
                No additional voting options are recorded for this battle.
              </Text>
            </View>
          )}

          {/* Options List */}
          {options.map(item => (
            <TouchableOpacity
              activeOpacity={0.88}
              key={item.id}
              onPress={() =>
                openBattleDetails({
                  mode: 'votes',
                  selectedSide: item?.side || item?.label || '',
                  selectedSideLabel: item?.label || item?.side || '',
                })
              }
              style={[
                styles.option,
                {
                  backgroundColor: isDarkMode ? '#241D32' : '#F9F7FD',
                  borderColor: palette.softBorder,
                },
              ]}
            >
              {(() => {
                const voteTotal = getOptionVotes(item);
                const percent = getPercent(voteTotal);
                const matchTeam = getMatchTeam(item);

                return (
                  <>
                    <View style={styles.optionRow}>
                      <View style={styles.optionTeam}>
                        {matchTeam?.logo && (
                          <Image
                            source={{ uri: matchTeam.logo }}
                            style={styles.teamLogo}
                            resizeMode="contain"
                          />
                        )}
                        <Text style={[styles.optionTitle, { color: labelColor }]}>
                          {item.label}
                        </Text>
                      </View>
                      <View style={[styles.percentBadge, { backgroundColor: withAlpha(palette.primary, '15') }]}>
                        <Text style={[styles.optionPercent, { color: palette.primary }]}>
                          {percent}%
                        </Text>
                      </View>
                    </View>

                    {matchTeam && (
                      <Text style={[styles.scoreText, { color: labelColor }]}>
                        SCORE: {matchTeam.score ?? '-'}
                      </Text>
                    )}
                    <View style={styles.optionVotesRow}>
                      <Ionicons name="checkmark-circle-outline" size={13} color={palette.muted} style={{ marginRight: 4 }} />
                      <Text style={[styles.metaText, { color: palette.muted }]}>
                        {voteTotal.toLocaleString()} {t('battleResults.votesLabel')}
                      </Text>
                    </View>

                    <View
                      style={[styles.progressBg, { backgroundColor: palette.track }]}
                    >
                      <View
                        style={[
                          styles.progressFill,
                          {
                            backgroundColor: palette.primary,
                            width: `${Math.min(
                              Math.max(percent, voteTotal > 0 ? 8 : 0),
                              100,
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                  </>
                );
              })()}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 6 : 0,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerIconBtnPlaceholder: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderWidth: 1,
  },
  metaTextPill: {
    fontSize: 12,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 36,
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  desc: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 10,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  creatorName: {
    fontSize: 13,
    fontWeight: '800',
  },
  creatorHandle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  creatorPill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  creatorPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  winnerProfileCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 14,
    overflow: 'hidden',
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  winnerProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  winnerAvatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  winnerProfileTextWrap: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 60,
  },
  winnerChampionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  winnerChampionText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  winnerProfileName: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 1,
  },
  winnerProfileMeta: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 6,
    gap: 4,
  },
  pointsLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  pointsValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  trophyWrap: {
    position: 'absolute',
    right: -4,
    top: 6,
    elevation: 8,
  },
  trophyPng: {
    width: 95,
    height: 95,
  },
  hero: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#581C87',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  heroGlowTop: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroGlowBottom: {
    position: 'absolute',
    bottom: -40,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(124,58,237,0.3)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaPillsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 8,
    marginLeft: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
    borderWidth: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  stakePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  stakeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.88)',
  },
  stakeAmount: {
    fontWeight: '800',
    color: '#FFF3D0',
  },
  heroHeadline: {
    fontSize: 24,
    lineHeight: 30,
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  heroSubline: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
  },
  heroAlertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginTop: 6,
    marginBottom: 4,
  },
  heroAlertText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FEE2E2',
  },
  heroWinnerSideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251,191,36,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.4)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginTop: 6,
    marginBottom: 4,
  },
  heroWinnerSideText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FEF08A',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  statBox: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  statBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statBoxLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 6,
  },
  card: {
    padding: 18,
    borderRadius: 22,
    marginBottom: 16,
    borderWidth: 1,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  section: {
    fontSize: 18,
    fontWeight: '800',
  },
  optionCountBadge: {
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
  },
  optionCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scoreboardCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
  },
  scoreboardTopRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  matchStatusBadge: {
    backgroundColor: 'rgba(90,45,130,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  matchStatusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#5a2d82',
    textTransform: 'uppercase',
  },
  scoreboardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyOptionsWrap: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  emptyOptionsIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyOptionsTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptyOptionsSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  option: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionTeam: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  teamLogo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 9,
  },
  optionTitle: {
    flexShrink: 1,
    fontWeight: '800',
    fontSize: 15,
  },
  percentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  optionPercent: {
    fontSize: 15,
    fontWeight: '900',
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  optionVotesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBg: {
    height: 8,
    borderRadius: 999,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
});
