import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  RefreshControl,
  Linking,
  Alert,
  Modal,
  Pressable,
  Platform,
  Keyboard,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import ImageZoom from 'react-native-image-pan-zoom';
import { hideLoader, showLoader } from '../../redux/actions/LoaderAction';
import { useDispatch, useSelector } from 'react-redux';
import { getLatestTransactions, getRecentActivities, getTokenHistory, getTopCreators, getTotalTokenPurchase } from '../../services/tokens';
import { useFocusEffect } from '@react-navigation/native';
import { showToastMessage } from '../../components/displaytoastmessage';
import { useToast } from 'react-native-toast-notifications';
import { getCreditsLeft, totalMission, totalSupport, totalamount, metaMaskRecived, totalPoints, getTotalFollowers, subscriptionEarningGraph } from '../../services/wallet';
import { parseTotalPlatformPointsPayload } from '../../utils/platformPoints';
import { getUserCredentials, getUserDashboard } from '../../services/post';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RBSheet from 'react-native-raw-bottom-sheet';
import TokenPurchaseModal from '../../components/modals/TokenPurchaseModal';
import TokenSellModal from '../../components/modals/TokenSellModal';
import { useAppTheme } from '../../theme/useApptheme';
import { useThemeContext } from '../../theme/ThemeContext';
import { getWalletScreenGradient, getWalletGradientText, getWalletGradientIconWrapStyle } from '../../utils/walletDarkTheme';
import HexAvatar from '../../components/home/story.js/HexAvatar';
import { useWalletConnectSupport } from '../../context/WalletConnectSupportContext';
import { appKit } from '../../config/AppKitConfig';
import { getDragonflyIcon } from '../../components/profile/ProfilePersonalData';
import { getTipPayoutSetup } from '../../utils/tipPayoutStorage';
import MIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  WhiteDragonfly,
  BlueDragonfly,
  SoftGrayDragonfly,
  LilacDragonfly,
  GoldDragonfly,
  GoldLavenderDragonfly,
  LavenderDragonfly,
  Metamask,
} from '../../assets/icons';
import Svg, { Polygon, Path, Text as SvgText, Defs, LinearGradient as SvgLinearGradient, Stop, Circle, Rect, Line } from 'react-native-svg';
import { useLanguage } from '../../i18n';
import { formatDisplayCurrency, formatDisplayNumber, formatDisplayTime } from '../../utils/displayLocale';
import { hydratePaymentProvider, isPagbankProvider, persistPaymentProvider, persistUserCountry, readPaymentProvider, readUserCountry } from '../../utils/paymentCurrency';
const { width, height } = Dimensions.get('window');
const KPI_GRID_GAP = 8;
const AVATAR_PREVIEW_SIZE = Math.min(width * 0.9, 340);
const FALLBACK_AVATAR =
  'https://cdn-icons-png.flaticon.com/512/149/149071.png';
const FOLLOWER_AVATARS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
];
const DEFAULT_REWARD_POINTS = {
  totalPlatformPoints: 0,
  totalBattlePoints: 0,
  marketplaceBattlePoints: 0,
  referPoints: 0,
  shopPlatformPoints: 0,
  used: 0,
};

const WALLET_ICON_BY_TYPE = {
  metamask: require('../../assets/icons/pngicons/Emeta.png'),
  coinbase: require('../../assets/icons/pngicons/coin.png'),
  walletconnect: require('../../assets/icons/pngicons/EWallet.png'),
  wallet: require('../../assets/icons/pngicons/EWallet.png'),
};

const DRAGONFLY_TIERS = (t) => [
  {
    id: 'white',
    Icon: WhiteDragonfly,
    title: t('walletDashboard.dragonflyTiers.white.title'),
    range: t('walletDashboard.dragonflyTiers.white.range'),
    note: t('walletDashboard.dragonflyTiers.white.note'),
    color: '#ffffff',
  },
  {
    id: 'black',
    Icon: BlueDragonfly,
    title: t('walletDashboard.dragonflyTiers.black.title'),
    range: t('walletDashboard.dragonflyTiers.black.range'),
    note: t('walletDashboard.dragonflyTiers.black.note'),
    color: '#000000',
  },
  {
    id: 'silver',
    Icon: SoftGrayDragonfly,
    title: t('walletDashboard.dragonflyTiers.silver.title'),
    range: t('walletDashboard.dragonflyTiers.silver.range'),
    note: t('walletDashboard.dragonflyTiers.silver.note'),
    color: '#c0c0c0',
  },
  {
    id: 'gold',
    Icon: GoldDragonfly,
    title: t('walletDashboard.dragonflyTiers.gold.title'),
    range: t('walletDashboard.dragonflyTiers.gold.range'),
    note: t('walletDashboard.dragonflyTiers.gold.note'),
    color: '#ffd700',
  },
  {
    id: 'purple',
    Icon: LavenderDragonfly,
    title: t('walletDashboard.dragonflyTiers.purple.title'),
    range: t('walletDashboard.dragonflyTiers.purple.range'),
    note: t('walletDashboard.dragonflyTiers.purple.note'),
    color: '#800080',
  },
];

/** UI label -> API `range` query (Swagger: daily | weekly). */
const FOLLOWERS_RANGE_BY_PERIOD = {
  Daily: 'daily',
  Weekly: 'weekly',
};

function formatActivityDayLabel(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { weekday: 'short' });
}

function formatActivityWeekLabel(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatActivityHourLabel(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return formatDisplayTime(date);
}

const formatActivityBucketLabel = (timestamp, range) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  if (range === 'daily') {
    return formatActivityHourLabel(date);
  }
  return formatActivityWeekLabel(date);
};

/** Keep axis labels short even when the API returns ISO dates or long weekdays. */
const shortenActivityAxisLabel = (label, timestamp, range) => {
  const raw = String(label || '').trim();
  const dateFromTs = Number.isFinite(Number(timestamp)) ? new Date(Number(timestamp)) : null;
  const dateFromIso = /^\d{4}-\d{2}-\d{2}/.test(raw) ? new Date(raw.slice(0, 10)) : null;
  const date =
    dateFromTs && !Number.isNaN(dateFromTs.getTime())
      ? dateFromTs
      : dateFromIso && !Number.isNaN(dateFromIso.getTime())
        ? dateFromIso
        : null;

  if (/monday|tuesday|wednesday|thursday|friday|saturday|sunday/i.test(raw)) {
    const dayKey = raw.trim().toLowerCase();
    if (['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].includes(dayKey)) {
      return raw.trim();
    }
    return date ? formatActivityDayLabel(date) : raw.slice(0, 3);
  }

  if (date) {
    if (range === 'daily') return formatActivityHourLabel(date);
    return formatActivityWeekLabel(date);
  }

  if (raw.length > 8) return `${raw.slice(0, 7)}…`;
  return raw;
};

const normalizeActivityTimestamp = (timestamp, range) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return NaN;
  if (range === 'daily') {
    date.setMinutes(0, 0, 0);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date.getTime();
};

const parseApiTimestamp = (value) => {
  if (value == null || String(value).length === 0) return NaN;
  if (typeof value === 'number') return value;
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-').map(Number);
    return new Date(year, month - 1, day).getTime();
  }
  return new Date(raw).getTime();
};

const resolveActivityTimestamp = (item, index, raw, range) => {
  const dateStr =
    item?.timestamp ??
    item?.createdAt ??
    item?.time ??
    item?.date ??
    item?.day ??
    item?.weekStart ??
    item?.month;
  if (dateStr != null && String(dateStr).length > 0) {
    const ts = parseApiTimestamp(dateStr);
    if (Number.isFinite(ts)) return normalizeActivityTimestamp(ts, range);
  }

  if (range === 'daily' && item?.label && /^\d{1,2}:\d{2}$/.test(String(item.label))) {
    const [hour, minute] = String(item.label).split(':').map(Number);
    const fallback = new Date();
    fallback.setHours(Number(hour) || 0, Number(minute) || 0, 0, 0);
    return fallback.getTime();
  }

  return Date.now() - (raw.length - 1 - index) * (range === 'daily' ? 3600000 : 86400000);
};

const resolveActivityLabel = (item, timestamp, range) => {
  const label = String(item?.label || '').trim();
  if (range === 'daily') {
    const dayName = String(item?.dayname ?? item?.dayName ?? item?.weekday ?? '').trim();
    if (dayName) return shortenActivityAxisLabel(dayName, timestamp, range);

    if (label && /^\d{1,2}:\d{2}/.test(label)) {
      return shortenActivityAxisLabel(label, timestamp, range);
    }

    const dateFromDay = item?.day ?? item?.date ?? item?.timestamp ?? item?.createdAt ?? item?.time;
    if (dateFromDay != null && String(dateFromDay).trim()) {
      const parsed = parseApiTimestamp(dateFromDay);
      if (Number.isFinite(parsed)) {
        return shortenActivityAxisLabel('', parsed, range);
      }
    }

    return shortenActivityAxisLabel('', timestamp, range);
  }

  if (label) return shortenActivityAxisLabel(label, timestamp, range);
  return formatActivityBucketLabel(timestamp, range);
};


const HexStarIcon = ({ size = 36, starSize = 16, starColor = '#ffffff', bgColor = '#5a2d82' }) => {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;

  const points = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Polygon points={points} fill={bgColor} />
      </Svg>
      <Ionicons name="star" size={starSize} color={starColor} style={{ zIndex: 1 }} />
    </View>
  );
};

const DiamondSparkleIcon = ({ size = 20, color = '#FFFFFF' }) => {
  const s = size;
  const center = s / 2;
  const arm = center * 0.78;
  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <Path
        d={`M ${center} 1 Q ${center} ${arm} 1 ${center} Q ${center} ${s - arm} ${center} ${s - 1} Q ${center} ${s - arm} ${s - 1} ${center} Q ${center} ${arm} ${center} 1 Z`}
        fill={color}
      />
      <Circle cx={s * 0.88} cy={s * 0.84} r={s * 0.08} fill={color} opacity={0.9} />
    </Svg>
  );
};

/** Subscription / support earnings graph → `{ timestamp, value }[]` */
const mapSubscriptionGraphPoints = (response, range = 'weekly') => {
  const root = response?.data?.data ?? response?.data ?? response;
  const raw = Array.isArray(root?.points)
    ? root.points
    : Array.isArray(root)
      ? root
      : root?.graph ??
      root?.history ??
      root?.series ??
      root?.items ??
      (Array.isArray(root?.data) ? root.data : null);

  if (!Array.isArray(raw) || raw.length === 0) return [];

  return raw
    .map((item, index) => {
      const val = Number(
        item?.amount ??
        item?.earning ??
        item?.revenue ??
        item?.totalAmount ??
        item?.value ??
        item?.count ??
        0,
      );
      const ts = resolveActivityTimestamp(item, index, raw, range);
      return {
        timestamp: ts,
        value: Number.isFinite(val) ? val : 0,
        label: resolveActivityLabel(item, ts, range),
      };
    })
    .filter((p) => !isNaN(p.timestamp) && Number.isFinite(p.value))
    .sort((a, b) => a.timestamp - b.timestamp);
};

/**
 * Parse `user/followers-graph`: follower totals/counts plus optional unfollow series
 * (`unfollowers`, `unfollowCount`, etc.) when the API provides them.
 */
const parseFollowersGraphSeries = (response, range = 'weekly') => {
  const root = response?.data?.data ?? response?.data ?? response;
  const raw = Array.isArray(root?.points)
    ? root.points
    : Array.isArray(root)
      ? root
      : root?.graph ??
      root?.history ??
      root?.series ??
      root?.items ??
      (Array.isArray(root?.data) ? root.data : null);

  if (!Array.isArray(raw) || raw.length === 0) {
    return { followers: [], unfollowers: [] };
  }

  const pair = raw
    .map((item, index) => {
      const fVal = Number(
        item?.followers ??
        item?.followerCount ??
        item?.count ??
        item?.newFollowers ??
        item?.total ??
        item?.value ??
        0,
      );
      const uVal = Number(
        item?.unfollowers ??
        item?.unfollowCount ??
        item?.unfollowed ??
        item?.lostFollowers ??
        item?.lost ??
        item?.unfollows ??
        0,
      );
      const ts = resolveActivityTimestamp(item, index, raw, range);
      return {
        timestamp: ts,
        label: resolveActivityLabel(item, ts, range),
        follower: Number.isFinite(fVal) ? fVal : 0,
        unfollow: Number.isFinite(uVal) ? uVal : 0,
      };
    })
    .filter((p) => !isNaN(p.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp);

  return {
    followers: pair.map((p) => ({ timestamp: p.timestamp, value: p.follower, label: p.label })),
    unfollowers: pair.map((p) => ({ timestamp: p.timestamp, value: p.unfollow, label: p.label })),
  };
};

function alignThreeActivitySeries(followers, unfollowers, support, range = 'weekly') {
  const allTs = [
    ...new Set([
      ...followers.map((p) => p.timestamp),
      ...unfollowers.map((p) => p.timestamp),
      ...support.map((p) => p.timestamp),
    ]),
  ].sort((a, b) => a - b);

  if (allTs.length === 0) {
    return { followers: [], unfollowers: [], support: [], timestamps: [], labels: [] };
  }

  const labelsByTs = new Map();
  [...followers, ...unfollowers, ...support].forEach((point) => {
    if (!labelsByTs.has(point.timestamp) && point.label) {
      labelsByTs.set(point.timestamp, point.label);
    }
  });

  const align = (arr, carryForward) => {
    const m = new Map(arr.map((p) => [p.timestamp, p.value]));
    let carry = 0;
    let seeded = false;
    return allTs.map((ts) => {
      if (m.has(ts)) {
        carry = Number(m.get(ts)) || 0;
        seeded = true;
        return { timestamp: ts, value: carry };
      }
      return { timestamp: ts, value: carryForward && seeded ? carry : 0 };
    });
  };

  return {
    timestamps: allTs,
    labels: allTs.map(ts => labelsByTs.get(ts) || formatActivityBucketLabel(ts, range)),
    followers: align(followers, true),
    unfollowers: align(unfollowers, true),
    support: align(support, false),
  };
}

const seriesEndpointValue = (points) => {
  if (!points || points.length === 0) return 0;
  return Number(points[points.length - 1].value) || 0;
};

const seriesDelta = (points) => {
  if (!points || points.length < 2) return 0;
  const a = Number(points[0].value) || 0;
  const b = Number(points[points.length - 1].value) || 0;
  return b - a;
};

const formatKpiUsd = (n) => formatDisplayCurrency(n);

const formatKpiCount = (n) => formatDisplayNumber(n);

/** Split display name into lines; last line is paired with the verified dragonfly icon. */
const splitHeaderNameLines = (label, maxCharsPerLine) => {
  const trimmed = String(label || '').trim();
  if (!trimmed) return [''];
  if (trimmed.length <= maxCharsPerLine) return [trimmed];

  const words = trimmed.split(/\s+/);
  const lines = [];
  let current = '';

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);

  if (lines.length <= 2) return lines;

  const mergedLast = lines.slice(1).join(' ');
  const lastLine =
    mergedLast.length > maxCharsPerLine
      ? `${mergedLast.slice(0, maxCharsPerLine - 1)}…`
      : mergedLast;
  return [lines[0], lastLine];
};

const ACTIVITY_UNFOLLOW_PINK = '#db2777';
/** Min horizontal space per segment; chart widens (scroll) when points would crowd */
const ACTIVITY_CHART_POINT_GAP = 58;
/** Minimum px between visible x-axis labels */
const ACTIVITY_CHART_LABEL_GAP = 56;

/** Multi-series trend (each line scaled to its own min/max so shapes are visible together). */
function ActivityTrendSvg({
  timestamps = [],
  labels = [],
  followersValues = [],
  unfollowersValues = [],
  supportValues = [],
  chartWidth,
  chartHeight = 220,
  colorFollowers = '#581C87',
  colorUnfollowers = '#E11D48',
  colorSupport = '#A855F7',
  range = 'daily',
}) {
  const { t } = useLanguage();

  // Clean and map data points for all three series
  const rawData = useMemo(() => {
    const len = timestamps.length;
    if (len >= 2) {
      const rows = [];
      for (let i = 0; i < len; i++) {
        const ts = Number(timestamps[i]);
        rows.push({
          t: Number.isFinite(ts) ? ts : i,
          label: labels[i] || '',
          fv: Number(followersValues[i]) || 0,
          uv: Number(unfollowersValues[i]) || 0,
          sv: Number(supportValues[i]) || 0,
        });
      }
      rows.sort((a, b) => a.t - b.t);
      return rows;
    }

    // Default 5-day reference mockup pattern when data is empty
    const mockDates = ['Nov 4', 'Nov 6', 'Nov 7', 'Nov 9', 'Nov 10'];
    const mockFv = [10, 10, 10, 10, 11];
    const mockSv = [10, 10, 20, 10, 11];
    const mockUv = [0, 0, 0, 0, 0];
    return mockDates.map((date, i) => ({
      t: i,
      label: date,
      fv: followersValues.length > 0 && followersValues[i] !== undefined ? Number(followersValues[i]) || 0 : mockFv[i],
      sv: supportValues.length > 0 && supportValues[i] !== undefined ? Number(supportValues[i]) || 0 : mockSv[i],
      uv: unfollowersValues.length > 0 && unfollowersValues[i] !== undefined ? Number(unfollowersValues[i]) || 0 : mockUv[i],
    }));
  }, [timestamps, labels, followersValues, unfollowersValues, supportValues]);

  const padL = 34; // room for Y-axis numbers (0, 5, 10, 15, 20)
  const padR = 48; // room for endpoint badges on the right
  const padT = 18;
  const padB = 30;
  const innerW = Math.max(chartWidth - padL - padR, 100);
  const innerH = Math.max(chartHeight - padT - padB, 80);
  const n = rawData.length;

  const xs = Array.from({ length: n }, (_, i) =>
    padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  );

  // Independent multi-series normalization so all 3 lines are visible together
  const toYs = (vals, defaultFloor = 0, defaultCeil = 20) => {
    const nums = vals.map((v) => Number(v) || 0);
    let min = Math.min(...nums);
    let max = Math.max(...nums);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return nums.map(() => padT + innerH / 2);
    }
    if (max === min) {
      if (max === 0) {
        min = 0;
        max = defaultCeil;
      } else {
        min = Math.max(0, min - 2);
        max = max + 2;
      }
    } else {
      const span = max - min;
      min = Math.max(0, min - span * 0.12);
      max = max + span * 0.12;
    }
    return nums.map((v) => {
      const clamped = Math.max(min, Math.min(max, v));
      return padT + innerH - ((clamped - min) / (max - min)) * innerH;
    });
  };

  const yF = toYs(rawData.map((r) => r.fv));
  const yS = toYs(rawData.map((r) => r.sv));
  const yU = toYs(rawData.map((r) => r.uv));

  // Cubic Bezier spline generator with bounded control points (no spikes or overflow)
  const smoothLinePath = (ys) => {
    if (n === 0) return '';
    if (n === 1) return `M ${xs[0]} ${ys[0]} L ${xs[0] + 1} ${ys[0]}`;
    if (n === 2) return `M ${xs[0]} ${ys[0]} L ${xs[1]} ${ys[1]}`;
    let d = `M ${xs[0]} ${ys[0]}`;
    for (let i = 0; i < n - 1; i++) {
      const p0 = i > 0 ? { x: xs[i - 1], y: ys[i - 1] } : { x: xs[i], y: ys[i] };
      const p1 = { x: xs[i], y: ys[i] };
      const p2 = { x: xs[i + 1], y: ys[i + 1] };
      const p3 = i < n - 2 ? { x: xs[i + 2], y: ys[i + 2] } : p2;

      let cp1x = p1.x + (p2.x - p0.x) / 5;
      let cp1y = p1.y + (p2.y - p0.y) / 5;
      let cp2x = p2.x - (p3.x - p1.x) / 5;
      let cp2y = p2.y - (p3.y - p1.y) / 5;

      // Bound control points safely inside chart canvas
      cp1y = Math.max(padT + 4, Math.min(padT + innerH, cp1y));
      cp2y = Math.max(padT + 4, Math.min(padT + innerH, cp2y));

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  };

  const smoothAreaPath = (ys) => {
    if (n === 0) return '';
    const base = padT + innerH;
    const line = smoothLinePath(ys);
    return `${line} L ${xs[n - 1]} ${base} L ${xs[0]} ${base} Z`;
  };

  const lastFollowers = Math.round(rawData[n - 1].fv);
  const lastUnfollowers = Math.round(rawData[n - 1].uv);

  return (
    <Svg width={chartWidth} height={chartHeight}>
      <Defs>
        <SvgLinearGradient id="gradPurpleArea" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#A855F7" stopOpacity={0.35} />
          <Stop offset="0.7" stopColor="#C084FC" stopOpacity={0.12} />
          <Stop offset="1" stopColor="#E9D5FF" stopOpacity={0.01} />
        </SvgLinearGradient>
      </Defs>

      {/* Horizontal dashed grid lines & Y-axis numbers (0, 5, 10, 15, 20) */}
      {[0, 5, 10, 15, 20].map((val) => {
        const y = padT + innerH - (val / 20) * innerH;
        return (
          <React.Fragment key={`grid-${val}`}>
            <Line
              x1={padL}
              y1={y}
              x2={chartWidth - padR + 6}
              y2={y}
              stroke="#E5E7EB"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <SvgText
              x={padL - 8}
              y={y + 3.5}
              fill="#9CA3AF"
              fontSize={10}
              fontWeight="500"
              textAnchor="end"
            >
              {val}
            </SvgText>
          </React.Fragment>
        );
      })}

      {/* Area gradient under Support trend curve */}
      <Path d={smoothAreaPath(yS)} fill="url(#gradPurpleArea)" stroke="none" />

      {/* Pink line (Unfollowers) */}
      <Path d={smoothLinePath(yU)} stroke="#E11D48" strokeWidth={2.2} fill="none" />

      {/* Followers curve (dark purple) */}
      <Path d={smoothLinePath(yF)} stroke="#581C87" strokeWidth={2.5} fill="none" />

      {/* Support trend curve (light purple) */}
      <Path d={smoothLinePath(yS)} stroke="#A855F7" strokeWidth={2.8} fill="none" />

      {/* Dots along Unfollowers line */}
      {xs.map((x, i) => (
        <Circle
          key={`dot-u-${i}`}
          cx={x}
          cy={yU[i]}
          r={3.5}
          fill="#E11D48"
          stroke="#FFFFFF"
          strokeWidth={1.5}
        />
      ))}

      {/* Dots along Followers curve */}
      {xs.map((x, i) => (
        <Circle
          key={`dot-f-${i}`}
          cx={x}
          cy={yF[i]}
          r={3.8}
          fill="#581C87"
          stroke="#FFFFFF"
          strokeWidth={1.5}
        />
      ))}

      {/* Dots along Support trend curve */}
      {xs.map((x, i) => (
        <Circle
          key={`dot-s-${i}`}
          cx={x}
          cy={yS[i]}
          r={4.5}
          fill={i === 2 ? '#A855F7' : '#FFFFFF'}
          stroke="#A855F7"
          strokeWidth={2}
        />
      ))}

      {/* Endpoint badge - Followers */}
      <Rect
        x={xs[n - 1] + 8}
        y={yF[n - 1] - 10}
        width={28}
        height={20}
        rx={10}
        fill="#6B21A8"
      />
      <SvgText
        x={xs[n - 1] + 22}
        y={yF[n - 1] + 4}
        fill="#FFFFFF"
        fontSize={11}
        fontWeight="800"
        textAnchor="middle"
      >
        {lastFollowers}
      </SvgText>

      {/* Endpoint badge - Unfollowers */}
      <Rect
        x={xs[n - 1] + 8}
        y={Math.min(yU[n - 1] - 10, chartHeight - padB - 14)}
        width={28}
        height={20}
        rx={10}
        fill="#E11D48"
      />
      <SvgText
        x={xs[n - 1] + 22}
        y={Math.min(yU[n - 1] + 4, chartHeight - padB)}
        fill="#FFFFFF"
        fontSize={11}
        fontWeight="800"
        textAnchor="middle"
      >
        {lastUnfollowers}
      </SvgText>

      {/* X-axis date labels */}
      {rawData.map((r, i) => (
        <SvgText
          key={`date-${i}`}
          x={xs[i]}
          y={chartHeight - 8}
          fill="#6B7280"
          fontSize={10.5}
          fontWeight="500"
          textAnchor="middle"
        >
          {r.label}
        </SvgText>
      ))}
    </Svg>
  );
}

export const WalletDashboardScreen = ({ navigation }) => {
  const { t } = useLanguage();

  const [activityPeriod, setActivityPeriod] = useState('Daily'); // Daily | Weekly (matches API range)
  const [walletTransactions, setWalletTransactions] = useState(0);
  const [activityTimestamps, setActivityTimestamps] = useState([]);
  const [activityBucketLabels, setActivityBucketLabels] = useState([]);
  const [activityFollowersSeries, setActivityFollowersSeries] = useState([]);
  const [activityUnfollowersSeries, setActivityUnfollowersSeries] = useState([]);
  const [activitySupportSeries, setActivitySupportSeries] = useState([]);
  const [followingCount, setFollowingCount] = useState(0);
  const [supportReceivedUsd, setSupportReceivedUsd] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [recentActivities, setRecentActivities] = useState(0);
  const [topCreators, setTopCreators] = useState([]);
  const [purchaseAutoFocus, setPurchaseAutoFocus] = useState(false);
  const [pendingFollowUserId, setPendingFollowUserId] = useState(null);
  const [kyc, setKyc] = useState(null);
  const [tokenAddress, setTokenAddress] = useState(null);
  const [isBusinessProfile, setIsBusinessProfile] = useState(false);
  const [missionDonationTotal, setMissionDonationTotal] = useState(0);
  const [missionActiveCount, setMissionActiveCount] = useState(0);
  const [missionLoaded, setMissionLoaded] = useState(false);
  const [supportLoaded, setSupportLoaded] = useState(false);
  const [earningLoaded, setEarningLoaded] = useState(false);
  const [metaMaskAmount, setMetaMaskAmount] = useState(0);
  const [metaMaskLoaded, setMetaMaskLoaded] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState('');
  const [totalEarningAmount, setTotalEarningAmount] = useState(0);
  const [rewardSummary, setRewardSummary] = useState(DEFAULT_REWARD_POINTS);
  const [kpiData, setKpiData] = useState([
    { id: 'Total Earning', title: t('walletDashboard.kpi.totalEarning'), value: '-', icon: 'wallet' },
    { id: 'support', title: t('walletDashboard.kpi.subscriptionEarning'), value: '-', icon: 'pie-chart' },
    { id: 'followers', title: t('walletDashboard.kpi.followers'), value: '-', icon: 'people' },
    { id: 'credits', title: t('walletDashboard.kpi.creditsLeft'), value: '-', icon: 'flash', currentCredits: 5 },
    { id: 'Mission Post', title: t('walletDashboard.kpi.missionPost'), value: '-', icon: 'ribbon' },
    { id: 'referralPoints', title: t('walletDashboard.kpi.valensPoint'), value: '-', icon: 'gift' },
    { id: 'metamask', title: t('walletDashboard.kpi.metamaskWallet'), value: '-', icon: 'logo-usd' },
    { id: 'tipPayout', title: t('walletDashboard.tipPayout.title'), value: '', icon: 'cash' },
    // { id: 'ebook', title: t('walletDashboard.ebook.title'), value: '', icon: 'book' },
  ]);
  const [tipPayoutSetup, setTipPayoutSetup] = useState(null);
  const dispatch = useDispatch();
  const toast = useToast();
  const {
    openWalletConnect,
    isConnected: isWalletConnected,
    address: connectedWalletAddress,
  } = useWalletConnectSupport();
  const purchaseSheetRef = useRef(null);
  const sellSheetRef = useRef(null);
  const activityChartScrollRef = useRef(null);
  const { bgStyle, textStyle, text, card, cardStyle, bg, mutedText, accent, icon, border } = useAppTheme(
    isBusinessProfile ? 'company' : undefined,
  );
  const activitySupportLine = accent;
  const { isDarkMode } = useThemeContext();
  const [userWalletData, setUserWalletData] = useState({
    stripeCustomerId: '',
    walletAddress: '',
  });
  const [userProfile, setUserProfile] = useState({
    name: t('walletDashboard.headerDefaultUser'),
    image: FALLBACK_AVATAR,
  });
  const [followersCount, setFollowersCount] = useState(0);
  const [userId, setUserId] = useState(null);
  const [connectedWalletType, setConnectedWalletType] = useState(null);
  // const isBusinessProfilee = userData?.profile === 'company';
  const butterflyIcon = isBusinessProfile
    ? require('../../assets/icons/pngicons/buttflypieceG.png')
    : require('../../assets/icons/pngicons/butterflypiece.png');

  const butterflyWallet = isBusinessProfile
    ? require('../../assets/icons/pngicons/ButterflyWalletG.png')
    : require('../../assets/icons/pngicons/butterWallet.png');

  const butterflyTip = isBusinessProfile
    ? require('../../assets/icons/pngicons/ButterflyPointG.png')
    : require('../../assets/icons/pngicons/butterPoint.png');

  const butterflyPoints = isBusinessProfile
    ? require('../../assets/icons/pngicons/ButterflyWaveG.png')
    : require('../../assets/icons/pngicons/wave.png');

  const activityChartW = width - 64;
  const activityChartH = 200;
  const moneyPeriodLabel = activityPeriod === 'Weekly'
    ? t('formats.vsLastWeek')
    : t('formats.vsPriorDay');
  const countPeriodLabel = activityPeriod === 'Weekly'
    ? t('formats.sinceLastWeek')
    : t('formats.vsPriorDay');

  const followersTrendDelta = seriesDelta(activityFollowersSeries);
  const unfollowersTrendDelta = seriesDelta(activityUnfollowersSeries);
  const supportTrendDelta = seriesDelta(activitySupportSeries);
  const unfollowersDisplay = Math.round(seriesEndpointValue(activityUnfollowersSeries));

  const hasActivityChartData = activityTimestamps.length > 0;

  const activityChartScrollWidth = useMemo(() => {
    const n = activityTimestamps.length;
    if (n <= 1) return activityChartW;
    const contentWidth = 40 + (n - 1) * ACTIVITY_CHART_POINT_GAP;
    return Math.round(Math.max(activityChartW, contentWidth));
  }, [activityChartW, activityTimestamps.length]);

  const scrollActivityChartToEnd = useCallback(() => {
    if (!hasActivityChartData || activityChartScrollWidth <= activityChartW) return;
    activityChartScrollRef.current?.scrollTo({
      x: Math.max(activityChartScrollWidth - activityChartW, 0),
      animated: false,
    });
  }, [activityChartScrollWidth, activityChartW, hasActivityChartData]);

  useEffect(() => {
    if (!hasActivityChartData || activityChartScrollWidth <= activityChartW) return;
    const timer = setTimeout(scrollActivityChartToEnd, 0);
    return () => clearTimeout(timer);
  }, [scrollActivityChartToEnd, activityChartScrollWidth, activityChartW, hasActivityChartData, activityTimestamps]);

  const [selectedTimeframe, setSelectedTimeframe] = useState('Last 7 Days');
  const [timeframeModalVisible, setTimeframeModalVisible] = useState(false);
  const [dragonflyModalVisible, setDragonflyModalVisible] = useState(false);
  const [avatarPreviewVisible, setAvatarPreviewVisible] = useState(false);
  const [referPointsInfoVisible, setReferPointsInfoVisible] = useState(false);
  const profileImage = useSelector(state => state.profileImage?.profileImg);

  const openDragonflyModal = () => setDragonflyModalVisible(true);
  const closeDragonflyModal = () => setDragonflyModalVisible(false);
  const openAvatarPreview = () => setAvatarPreviewVisible(true);
  const closeAvatarPreview = () => setAvatarPreviewVisible(false);
  const openReferPointsInfo = () => setReferPointsInfoVisible(true);
  const closeReferPointsInfo = () => setReferPointsInfoVisible(false);

  const formatPointValue = (value) => {
    const numericValue = Number(value) || 0;
    return formatDisplayNumber(numericValue);
  };

  const rewardPointCards = useMemo(
    () => [
      {
        id: 'battlePoints',
        title: t('walletDashboard.battlePoints.battlePoints'),
        value: rewardSummary.totalBattlePoints,
        icon: 'trophy-outline',
        iconBackground: 'rgba(250, 204, 21, 0.16)',
        iconColor: '#facc15',
      },
      {
        id: 'referPoints',
        title: t('walletDashboard.battlePoints.referPoints'),
        value: rewardSummary.referPoints,
        icon: 'gift-outline',
        iconBackground: 'rgba(34, 211, 238, 0.16)',
        iconColor: '#67e8f9',
      },
      {
        id: 'usedPoints',
        title: t('walletDashboard.battlePoints.usedPoints'),
        value: rewardSummary.used,
        icon: 'remove-circle-outline',
        iconBackground: 'rgba(248, 113, 113, 0.16)',
        iconColor: '#fca5a5',
      },
    ],
    [rewardSummary, t]
  );

  const rewardPoints = async () => {
    try {
      const response = await totalPoints();
      const statusCode =
        response?.statusCode ??
        response?.data?.statusCode ??
        response?.status;
      const ok =
        statusCode == null ||
        Number(statusCode) === 200 ||
        response?.success === true;

      if (!ok) {
        setRewardSummary(DEFAULT_REWARD_POINTS);
        return;
      }

      const parsed = parseTotalPlatformPointsPayload(response);
      setRewardSummary({
        totalPlatformPoints: parsed.totalPlatformPoints,
        totalBattlePoints: parsed.totalBattlePoints,
        marketplaceBattlePoints: parsed.marketplaceBattlePoints,
        referPoints: parsed.referPoints,
        shopPlatformPoints: parsed.shopPlatformPoints,
        used: parsed.used,
      });

      // Dashboard Valens Point KPI: total platform points.
      setKpiData(prevKpiData =>
        prevKpiData.map(item =>
          item.id === 'referralPoints'
            ? { ...item, value: `${formatPointValue(parsed.totalPlatformPoints)} pts` }
            : item,
        ),
      );
    } catch (err) {
      setRewardSummary(DEFAULT_REWARD_POINTS);
    }
  };

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem('profile').then((stored) => {
      if (!cancelled && stored) {
        const normalized = String(stored).toLowerCase();
        setIsBusinessProfile(normalized !== 'user' && normalized !== 'normal');
      }
    });
    hydratePaymentProvider().then((provider) => {
      if (!cancelled && provider) setPaymentProvider(provider);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const getUserDetail = async () => {
    try {
      dispatch(showLoader());
      const id = await AsyncStorage.getItem('userId');

      if (!id) {
        return;
      }
      setUserId(id);

      const response = await getUserCredentials(id);

      const storedProfile = await AsyncStorage.getItem('profile');
      const accountType = String(
        response?.data?.profile || storedProfile || 'user',
      ).toLowerCase();
      setIsBusinessProfile(accountType !== 'user' && accountType !== 'normal');
      setKyc(response?.data?.kyc || null);
      const profileProvider = readPaymentProvider(response?.data?.user || response?.data);
      if (profileProvider !== undefined) {
        const savedProvider = await persistPaymentProvider(profileProvider);
        setPaymentProvider(savedProvider);
      }
      const profileCountry = readUserCountry(response?.data?.user || response?.data);
      if (profileCountry !== undefined) {
        await persistUserCountry(profileCountry);
      }
      console.log(response, 'data in this apiaia for resposne ')
      // 🔥 Adjust keys based on your API response
      const stripeCustomerId =
        response?.data?.stripeAccountId ||
        response?.data?.stripeCustomerId ||
        '';

      const walletAddress =
        response?.data?.walletAddress ||
        response?.data?.walletAddress ||
        '';

      setUserWalletData({
        stripeCustomerId,
        walletAddress,
      });

      const profileName =
        response?.data?.userName ||
        response?.data?.username ||
        response?.data?.name ||
        t('walletDashboard.headerDefaultUser');

      const profileImage =
        response?.data?.image ||
        response?.data?.userImage ||
        FALLBACK_AVATAR;

      setUserProfile({
        name: profileName,
        image: profileImage || FALLBACK_AVATAR,
      });

    } catch (error) {
    } finally {
      dispatch(hideLoader());
    }
  };
  const stripeAccountId = 'Not connected';
  const walletAddress = 'Not available';
  const visibleKpiData = useMemo(() => {
    // User requested to remove Stripe ('tipPayout') and only keep wallet
    const withoutStripe = kpiData.filter(item => item.id !== 'tipPayout');
    if (isBusinessProfile) {
      return withoutStripe.filter(item => item.id !== 'support');
    }
    return withoutStripe;
  }, [kpiData, isBusinessProfile]);

  const kpiGridData = useMemo(() => {
    const fullWidthIds = new Set(['metamask', 'tipPayout', 'ebook']);
    const fullWidthItems = visibleKpiData.filter(item => fullWidthIds.has(item.id));
    const gridItems = visibleKpiData.filter(item => !fullWidthIds.has(item.id));
    const list = [...gridItems];

    if (list.length % 2 !== 0) {
      list.push({ id: 'kpi-placeholder', isPlaceholder: true });
    }

    return [...list, ...fullWidthItems];
  }, [visibleKpiData]);

  /** Profile header, KPI grid, Battle Points — same gradient */
  const walletScreenGradient = useMemo(
    () => getWalletScreenGradient(isBusinessProfile, isDarkMode, accent, card),
    [isBusinessProfile, isDarkMode, accent, card],
  );
  const bannerGradient = useMemo(() => {
    if (isDarkMode) {
      return isBusinessProfile
        ? ['#3D3428', '#251E14']
        : ['#351468', '#4A1D85', '#5E249E'];
    }
    return isBusinessProfile
      ? ['#8C6D37', '#A07D41', '#B8924F']
      : ['#3B0764', '#581C87', '#7C3AED', '#8B5CF6'];
  }, [isBusinessProfile, isDarkMode]);
  const themePalette = useMemo(() => {
    if (isBusinessProfile) {
      return {
        accent: accent || (isDarkMode ? '#C9A15A' : '#8C6D37'),
        cardBorder: isDarkMode ? 'rgba(255,255,255,0.08)' : '#F2E8D5',
        cardShadow: '#8C6D37',
        iconWrapBg: isDarkMode ? 'rgba(201, 161, 90, 0.22)' : '#FBF6EA',
        textPrimary: isDarkMode ? '#FFFFFF' : '#3D2F14',
        textValue: isDarkMode ? '#FFFFFF' : '#2A2011',
        subText: isDarkMode ? '#DEC8A4' : '#5C4723',
        infoIconColor: isDarkMode ? '#D4B87E' : '#9E8552',
        waveOuter: isDarkMode ? 'rgba(184, 146, 79, 0.15)' : '#F7EED9',
        waveInner: isDarkMode ? 'rgba(184, 146, 79, 0.25)' : '#EEDCB7',
        chartBar: isDarkMode ? 'rgba(184, 146, 79, 0.35)' : '#DEC38B',
        badgeBg: isDarkMode ? 'rgba(184, 146, 79, 0.25)' : '#F7EED9',
        badgeText: isDarkMode ? '#EEDCB7' : '#8C6D37',
        buttonBg: '#8C6D37',
        pillBg: '#8C6D37',
        coinDiscBg: '#C49B4B',
        coinDiscBorder: '#E5CB95',
        coinDiscFront: '#A07D41',
        coinDiscFrontBorder: '#FBF6EA',
        arrowIconColor: '#8C6D37',
      };
    }
    return {
      accent: accent || '#5B259F',
      cardBorder: isDarkMode ? 'rgba(255,255,255,0.08)' : '#EDE4F8',
      cardShadow: '#5B259F',
      iconWrapBg: isDarkMode ? 'rgba(124, 58, 237, 0.25)' : '#F0E6FB',
      textPrimary: isDarkMode ? '#FFFFFF' : '#1C0838',
      textValue: isDarkMode ? '#FFFFFF' : '#280A54',
      subText: isDarkMode ? '#C4B5FD' : '#2D1054',
      infoIconColor: isDarkMode ? '#A78BFA' : '#7A6890',
      waveOuter: isDarkMode ? 'rgba(124, 58, 237, 0.12)' : '#F2E8FD',
      waveInner: isDarkMode ? 'rgba(124, 58, 237, 0.20)' : '#E8D5FB',
      chartBar: isDarkMode ? 'rgba(167, 139, 250, 0.35)' : '#D0B4F8',
      badgeBg: isDarkMode ? 'rgba(124, 58, 237, 0.25)' : '#EFE5FB',
      badgeText: isDarkMode ? '#DDD6FE' : '#5B259F',
      buttonBg: '#7832BD',
      pillBg: '#5C249C',
      coinDiscBg: '#8B4FD6',
      coinDiscBorder: '#B78EF2',
      coinDiscFront: '#7832BD',
      coinDiscFrontBorder: '#EDE4F8',
      arrowIconColor: '#5C249C',
    };
  }, [isBusinessProfile, isDarkMode, accent]);
  const gradientText = getWalletGradientText(isBusinessProfile, isDarkMode, text);
  const kpiIconWrapStyle = getWalletGradientIconWrapStyle(isBusinessProfile, isDarkMode, accent);
  const platformPointsHexBg = text;
  const pointsDividerColor = isDarkMode
    ? 'rgba(255,255,255,0.28)'
    : isBusinessProfile
      ? 'rgba(160,125,65,0.24)'
      : 'rgba(90,45,130,0.16)';
  const activityMetricCardBg = isDarkMode ? '#2A2A2A' : '#fafafa';
  const activityFollowersIconColor = isDarkMode ? accent : text;
  const activityFollowersIconBg = isDarkMode ? `${accent}28` : `${text}18`;
  const activityFollowersBorder = isDarkMode ? `${accent}33` : `${text}22`;

  const connectedWallet = useMemo(
    () =>
      String(
        connectedWalletAddress || userWalletData?.walletAddress || '',
      ).trim(),
    [connectedWalletAddress, userWalletData?.walletAddress],
  );
  const isMetaMaskConnected = isWalletConnected || !!connectedWallet;
  const DragonflyIcon = useMemo(
    () => getDragonflyIcon(followersCount, isBusinessProfile, isDarkMode),
    [followersCount, isBusinessProfile, isDarkMode],
  );
  const headerNameLabel = useMemo(() => {
    const name = String(userProfile.name || t('walletDashboard.headerDefaultUser')).trim();
    return `@${name}`;
  }, [t, userProfile.name]);
  const headerNameLines = useMemo(() => {
    const maxChars = Math.max(12, Math.floor((width - 168) / 9));
    return splitHeaderNameLines(headerNameLabel, maxChars);
  }, [headerNameLabel]);

  useEffect(() => {
    let timeout;

    const onKeyboardHide = () => {
      timeout = setTimeout(() => {
        purchaseSheetRef.current?.updateLayout?.({ height: 500 });
      }, 300);
    };

    const hideSub = Keyboard.addListener('keyboardDidHide', onKeyboardHide);

    return () => {
      hideSub.remove();
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  const tipPayoutReady = !!tipPayoutSetup?.connected;

  const fetchTipPayoutStatus = async () => {
    try {
      const saved = await getTipPayoutSetup();
      setTipPayoutSetup(saved);
    } catch {
      setTipPayoutSetup(null);
    }
  };

  const handleTipPayoutPress = async () => {
    const saved = tipPayoutSetup || (await getTipPayoutSetup());
    if (saved?.connected) {
      navigation.navigate('TipPayoutSetup', { initialStep: 'success', saved });
      return;
    }
    navigation.navigate('TipPayoutSetup');
  };

  const handleEbookPress = () => {
    navigation.push('EbookPublisher', { type: 'private', format: 'ebook' });
  };

  const handleOpenTotalEarnings = useCallback(() => {
    const params = {
      totalAmount: totalEarningAmount,
      profileType: isBusinessProfile ? 'company' : 'user',
      returnTo: { tab: 'wallet', screen: 'Dashboard' },
    };
    // Prefer nested tab navigation so the route resolves even if the
    // current navigation object is the parent drawer/tab navigator.
    try {
      navigation.navigate('wallet', {
        screen: 'TotalEarnings',
        params,
      });
    } catch (error) {
      navigation.navigate('TotalEarnings', params);
    }
  }, [navigation, totalEarningAmount, isBusinessProfile]);

  const handleOpenReferralPoints = useCallback(() => {
    const total = Number(rewardSummary.totalPlatformPoints) || 0;
    const battle = Number(rewardSummary.totalBattlePoints) || 0;
    const shop = Number(rewardSummary.marketplaceBattlePoints) || 0;
    const refer = Number(rewardSummary.referPoints) || 0;
    const shopPlatform = Number(rewardSummary.shopPlatformPoints) || 0;
    const used = Number(rewardSummary.used) || 0;
    const params = {
      totalPoints: total,
      availablePoints: total,
      battlePoints: battle,
      shopPoints: shop,
      referPoints: refer,
      shopPlatformPoints: shopPlatform,
      ShopPlatformPonits: shopPlatform,
      used,
      profileType: isBusinessProfile ? 'company' : 'user',
    };
    try {
      navigation.navigate('wallet', {
        screen: 'ReferralPoints',
        params,
      });
    } catch (error) {
      navigation.navigate('ReferralPoints', params);
    }
  }, [navigation, rewardSummary, isBusinessProfile]);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        try {
          dispatch(showLoader());

          const storedWalletType = await AsyncStorage.getItem('walletType');
          setConnectedWalletType(storedWalletType);

          await Promise.allSettled([
            getUserDetail(),
            fetchCreditsLeft(),
            rewardPoints(),
            fetchFollowers(),
            fetchTotalSupport(),
            fetchTotalEarning(),
            fetchMetaMaskReceived(),
            totalMissonDonation(),
            fetchTopCreators(),
            fetchTipPayoutStatus(),
          ]);
        } catch (error) {
          console.error('Error fetching dashboard data:', error);
        } finally {
          dispatch(hideLoader());
        }
      };

      fetchData();

      return () => {
        // Cleanup if needed
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      dispatch(showLoader());

      await Promise.allSettled([
        getUserDetail(),
        // fetchDashboardData(),
        fetchActivityOverviewCharts(),
        fetchCreditsLeft(),
        rewardPoints(),
        fetchFollowers(),
        fetchTotalSupport(),
        fetchTotalEarning(),
        fetchMetaMaskReceived(),
        fetchTopCreators(),
        fetchTipPayoutStatus(),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      dispatch(hideLoader());
      setRefreshing(false);
    }
  };

  const handleDisconnectWallet = useCallback(async () => {
    try {
      await appKit?.disconnect?.();
      await AsyncStorage.multiRemove(['walletAddress', 'walletChainId', 'walletType']);
      setUserWalletData((prev) => ({ ...prev, walletAddress: '' }));
      setConnectedWalletType(null);
      showToastMessage(toast, 'success', t('walletDashboard.metamask.walletDisconnected'));
    } catch (error) {
      showToastMessage(toast, 'danger', t('walletDashboard.metamask.walletDisconnectError'));
    }
  }, [toast, t]);

  const handleMetaMaskCardPress = useCallback(() => {
    if (isMetaMaskConnected) {
      Alert.alert(
        t('walletDashboard.metamask.disconnectAlertTitle'),
        t('walletDashboard.metamask.disconnectAlertMessage'),
        [
          { text: t('walletDashboard.metamask.disconnectAlertCancel'), style: 'cancel' },
          {
            text: t('walletDashboard.metamask.disconnectAlertConfirm'),
            style: 'destructive',
            onPress: handleDisconnectWallet,
          },
        ],
      );
      return;
    }
    openWalletConnect();
  }, [handleDisconnectWallet, isMetaMaskConnected, openWalletConnect, t]);

  // Helper function to format activity type
  const getActivityType = (activity) => {
    if (activity.purchase) return 'buy';
    if (activity.sell) return 'sell';
    if (activity.following) return 'follow';
    return 'mint';
  };

  const formatActivityAction = (activity) => {
    if (activity.purchase && activity.purchase.length > 0) {
      const purchase = activity.purchase[0];
      return `Bought ${purchase.purchaseTokenPrice?.toFixed(2) || 'N/A'} tokens`;
    }
    if (activity.sell && activity.sell.length > 0) {
      const sell = activity.sell[0];
      return `Sold ${sell.purchaseTokenPrice?.toFixed(2) || 'N/A'} tokens`;
    }
    if (activity.following && activity.following.length > 0) {
      return `@${activity.following[0].username || 'user'} followed you`;
    }
    return 'Activity recorded';
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffMs = now - activityTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const fetchCreditsLeft = async () => {
    try {
      const response = await getCreditsLeft();
      if (response?.statusCode === 200) {
        const hitLeftRaw = response?.data?.hitLeft;
        const hitLeft = Number(hitLeftRaw);
        const safeHitLeft = Number.isFinite(hitLeft) ? Math.min(Math.max(hitLeft, 0), 5) : 0;
        setKpiData(prevKpiData => {
          const newKpiData = [...prevKpiData];
          newKpiData[3] = {
            ...newKpiData[3],
            value: `${hitLeft} / 5`,
            currentCredits: hitLeft
          };
          return newKpiData;
        });
      } else {
        showToastMessage(toast, 'danger', response.data.message);
      }
    } catch (error) {
      console.error('Error in fetchCreditsLeft:', error);
    }
  };
  const fetchActivityOverviewCharts = useCallback(async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      const range = FOLLOWERS_RANGE_BY_PERIOD[activityPeriod] ?? 'weekly';

      const [followersRes, supportRes] = await Promise.all([
        userId ? getTotalFollowers({ userId, range }) : Promise.resolve(null),
        subscriptionEarningGraph({ interval: range }),
      ]);
      const { followers: fp, unfollowers: up } = parseFollowersGraphSeries(followersRes, range);
      const sp = mapSubscriptionGraphPoints(supportRes, range);
      const aligned = alignThreeActivitySeries(fp, up, sp, range);

      setActivityTimestamps(aligned.timestamps);
      setActivityBucketLabels(aligned.labels);
      setActivityFollowersSeries(aligned.followers);
      setActivityUnfollowersSeries(aligned.unfollowers);
      setActivitySupportSeries(aligned.support);
    } catch (error) {
      console.error('error in activity overview charts', error);
      setActivityTimestamps([]);
      setActivityBucketLabels([]);
      setActivityFollowersSeries([]);
      setActivityUnfollowersSeries([]);
      setActivitySupportSeries([]);
    }
  }, [activityPeriod]);

  useEffect(() => {
    fetchActivityOverviewCharts();
  }, [fetchActivityOverviewCharts]);

  const fetchFollowers = async () => {
    const id = await AsyncStorage.getItem('userId');
    try {
      const response = await getUserDashboard(id);
      if (response?.statusCode === 200) {
        const dash = response.data.dashboardData ?? {};
        const totalFollowers = Number(dash.totalFollowers) || 0;
        const totalFollowing = Number(dash.totalFollowing) || 0;
        setFollowersCount(totalFollowers);
        setFollowingCount(totalFollowing);
        setKpiData(prevKpiData => {
          return prevKpiData.map(item => {
            if (item.id === 'followers') {
              return {
                ...item,
                value: formatKpiCount(totalFollowers),
              };
            }
            return item;
          });
        });
      } else {
        showToastMessage(toast, 'danger', response.data.message);
      }
    } catch (error) {
      console.error('Error in fetchFollowers:', error);
    }
  };

  const fetchTotalSupport = async () => {
    try {
      const response = await totalSupport();
      const rawValue =
        response?.data?.totalAmount ??
        response?.data?.data?.totalAmount ??
        response?.data?.totalSupportReceived ??
        response?.data?.totalSupport ??
        response?.data?.supportedAmount ??
        response?.data?.amount ??
        0;
      const supportAmount = Number(rawValue) || 0;
      setSupportReceivedUsd(supportAmount);
      setSupportLoaded(true);

      setKpiData(prevKpiData =>
        prevKpiData.map(item =>
          item.id === 'support'
            ? { ...item, value: formatKpiUsd(supportAmount) }
            : item
        )
      );
    } catch (error) {
      console.error('Error in fetchTotalSupport:', error);
    }
  };
  const fetchTotalEarning = async () => {
    try {
      const response = await totalamount();
      const rawValue =
        response?.data?.totalAmount ??
        response?.data?.data?.totalAmount ??
        response?.data?.totalReceived ??
        response?.data?.data?.totalReceived ??
        response?.data?.amount ??
        response?.data?.data?.amount ??
        0;
      const totalValue = Number(rawValue) || 0;
      setTotalEarningAmount(totalValue);
      setEarningLoaded(true);

      setKpiData(prevKpiData =>
        prevKpiData.map(item =>
          item.id === 'Total Earning'
            ? { ...item, value: formatKpiUsd(totalValue) }
            : item
        )
      );
    } catch (error) {
      console.error('Error in fetchTotalEarning:', error);
    }
  };
  const fetchMetaMaskReceived = async () => {
    try {
      const response = await metaMaskRecived();
      const rawValue =
        response?.data?.totalAmount ??
        response?.data?.data?.totalAmount ??
        response?.data?.amount ??
        response?.data?.data?.amount ??
        0;
      const totalValue = Number(rawValue) || 0;
      setMetaMaskAmount(totalValue);
      setMetaMaskLoaded(true);

      setKpiData(prevKpiData =>
        prevKpiData.map(item =>
          item.id === 'metamask'
            ? { ...item, value: formatKpiUsd(totalValue) }
            : item
        )
      );
    } catch (error) {
      console.error('Error in fetchMetaMaskReceived:', error);
    }
  };
  const totalMissonDonation = async () => {
    try {
      const response = await totalMission();
      const totalAmount = Number(response?.data?.totalAmount || 0);

      const activePostCount =
        response?.data?.activePostCount ??
        response?.data?.data?.activePostCount ??
        0;
      const postCount = Number(activePostCount) || 0;

      setMissionDonationTotal(totalAmount);
      setMissionActiveCount(postCount);
      setMissionLoaded(true);

      setKpiData(prevKpiData =>
        prevKpiData.map(item =>
          item.id === 'Mission Post'
            ? {
              ...item,
              value: `${formatKpiUsd(totalAmount)} \n${t('walletDashboard.kpi.missionActive', { count: postCount || 0 })}`,
            }
            : item
        )
      );

    } catch (error) {
    }
  };


  const fetchTopCreators = async () => {
    try {
      const response = await getTopCreators();
      if (response?.statusCode === 200) {

        const formattedCreators = response.data.map((creator, index) => ({
          id: index + 1,
          name: `@${creator.username || 'unknown'}`,
          vendorId: creator.vendorId,
          followers: `${creator.followerCount || '0'} Followers`,
          tokenStatus: creator.currentTokenStatus,
        }));
        setTopCreators(formattedCreators.slice(0, 5));
      } else {
        showToastMessage(toast, 'danger', response.data.message);
      }
    } catch (error) {
      console.error('Error in fetchTopCreators:', error);
    }
  };

  const handleTokenModalClose = () => {
    purchaseSheetRef.current?.close?.();
    setPendingFollowUserId(null);
  };

  const handleTokenPurchase = async () => { };

  const handleTokenSell = () => {
    // sellSheetRef.current?.close();
    showToastMessage(toast, 'success', 'Tokens sold successfully!');
    onRefresh();
  };

  const formatProviderMoney = (amount) => formatDisplayCurrency(amount, undefined, paymentProvider);

  const resolveKpiValue = (item) => {
    if (item.id === 'Total Earning' && earningLoaded) {
      return formatProviderMoney(totalEarningAmount);
    }
    if (item.id === 'support' && supportLoaded) {
      return formatProviderMoney(supportReceivedUsd);
    }
    if (item.id === 'Mission Post' && missionLoaded) {
      return `${formatProviderMoney(missionDonationTotal)} \n${t('walletDashboard.kpi.missionActive', { count: missionActiveCount || 0 })}`;
    }
    if (item.id === 'metamask' && metaMaskLoaded) {
      return formatProviderMoney(metaMaskAmount);
    }
    return item.value;
  };

  const renderKPICard = (item) => {
    const isMetaMaskCard = item.id === 'metamask';
    const isTipPayoutCard = item.id === 'tipPayout';
    // const isEbookCard = item.id === 'ebook';
    const cellStyle = [
      styles.kpiCardCell,
      (isMetaMaskCard || isTipPayoutCard) && styles.kpiCardCellFull,
    ];

    if (item?.isPlaceholder) {
      return <View key={item.id} style={cellStyle} />;
    }

    const isCreditsCard = item.id === 'credits';
    const isMissionPostCard = item.id === 'Mission Post';
    const isSupportCard = item.id === 'support';
    const metaStatusText = isMetaMaskConnected
      ? t('walletDashboard.metamask.connected')
      : t('walletDashboard.metamask.disconnected');
    const metaActionText = isMetaMaskConnected
      ? t('walletDashboard.metamask.tapToDisconnect')
      : t('walletDashboard.metamask.tapToConnect');
    const supportCardTitle = isSupportCard && typeof item.title === 'string'
      ? item.title.replace(/\s+/, '\n')
      : item.title;
    const kpiValueText = resolveKpiValue(item);

    if (isMetaMaskCard) {
      return (
        <View key={item.id} style={styles.walletBannerCell}>
          <TouchableOpacity
            style={styles.walletBannerTouchable}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('ValensWallet')}
          >
            <View style={styles.walletBannerCard}>
              <LinearGradient
                colors={bannerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0.8 }}
                style={StyleSheet.absoluteFill}
              />

              <View style={styles.walletBannerLeft}>
                <View style={styles.walletBannerIconWrap}>
                  <Ionicons
                    name="wallet"
                    size={24}
                    color="#FFFFFF"
                  />
                </View>

                <View style={styles.walletBannerDivider} />

                <View style={styles.walletBannerTextWrap}>
                  <Text style={styles.walletBannerTitle}>
                    {t('walletDashboard.Wallet', 'Wallet')}
                  </Text>

                  <Text
                    style={styles.walletBannerSubtitle}
                    numberOfLines={3}
                    ellipsizeMode="tail"
                  >
                    {t(
                      'walletDashboard.walletBannerDesc',
                      'Manage your balance, withdrawals and transactions.'
                    )}
                  </Text>
                </View>
              </View>

              <View style={styles.walletBannerArrowBtn}>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={themePalette.arrowIconColor}
                />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    if (isTipPayoutCard) {
      const isPagbankTip = isPagbankProvider(paymentProvider);
      const tipProviderMark = isPagbankTip ? 'P' : 'S';
      const tipProviderName = isPagbankTip ? 'PagBank' : 'Stripe';
      const tipStatusText = tipPayoutReady
        ? t('walletDashboard.tipPayout.connected')
        : t('walletDashboard.tipPayout.setupRequired');
      const tipActionText = tipPayoutReady
        ? t('walletDashboard.tipPayout.viewDetails')
        : t('walletDashboard.tipPayout.tapToConnect');

      return (
        <View key={item.id} style={cellStyle}>
          <TouchableOpacity
            style={styles.kpiCardTouchable}
            activeOpacity={0.86}
            onPress={handleTipPayoutPress}
          >
            <LinearGradient
              colors={walletScreenGradient}
              start={{ x: -5, y: -5 }}
              end={{ x: 1, y: 1 }}
              style={[styles.kpiCard, styles.kpiCardMetaMask, { shadowColor: text }]}
            >
              <View style={styles.kpiMetaMaskRow}>
                <View style={styles.kpiMetaMaskLeft}>
                  <View style={[styles.kpiTipIconWrap, { backgroundColor: isPagbankTip ? '#1FAF5A' : '#635BFF' }]}>
                    <Text style={styles.kpiTipIconText}>{tipProviderMark}</Text>
                  </View>
                  <View style={[styles.kpiMetaMaskText, styles.kpiTipText]}>
                    <Text style={[styles.kpiTitle, styles.kpiIllustratedTitle, { color: text }]} numberOfLines={1}>
                      {tipProviderName}
                    </Text>
                    <Text style={[styles.kpiTipDescription, { color: text }]}>
                      {t('walletDashboard.tipPayout.description')}
                    </Text>
                    <View style={styles.kpiMetaMaskStatusRow}>
                      <View
                        style={[
                          styles.kpiStatusDot,
                          { backgroundColor: tipPayoutReady ? '#16a34a' : '#b45309' },
                        ]}
                      />
                      <Text
                        style={[
                          styles.kpiMetaMaskStatusText,
                          { color: tipPayoutReady ? '#16a34a' : '#b45309' },
                        ]}
                        numberOfLines={1}
                      >
                        {tipStatusText}
                      </Text>
                      <Text style={[styles.kpiMetaMaskHint, { color: text }]} numberOfLines={2}>
                        {tipActionText}
                      </Text>
                    </View>
                  </View>
                </View>
                <Image
                  source={isPagbankTip ? butterflyTip : butterflyIcon}
                  style={[
                    styles.kpiCardMascot,
                    styles.kpiTipMascot,
                    { width: Math.min(120, width * 0.26), height: Math.min(124, width * 0.28) },
                  ]}
                  resizeMode="contain"
                  pointerEvents="none"
                  accessible={false}
                />
                <Ionicons name="chevron-forward" size={18} color={text} style={styles.kpiIllustratedChevron} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }

    // if (isEbookCard) {
    //   return (
    //     <View key={item.id} style={cellStyle}>
    //       <TouchableOpacity
    //         style={styles.kpiCardTouchable}
    //         activeOpacity={0.86}
    //         onPress={handleEbookPress}
    //       >
    //         <LinearGradient
    //           colors={walletScreenGradient}
    //           start={{ x: -5, y: -5 }}
    //           end={{ x: 1, y: 1 }}
    //           style={[styles.kpiCard, styles.kpiCardMetaMask, { shadowColor: text }]}
    //         >
    //           <View style={styles.kpiMetaMaskRow}>
    //             <View style={styles.kpiMetaMaskLeft}>
    //               <View style={[styles.kpiTipIconWrap, { backgroundColor: '#EDE4FF' }]}>
    //                 <Ionicons name="book" size={22} color={text} />
    //               </View>
    //               <View style={styles.kpiMetaMaskText}>
    //                 <Text style={[styles.kpiTitle, { color: text }]} numberOfLines={1}>
    //                   {item.title}
    //                 </Text>
    //                 <Text style={[styles.kpiTipDescription, { color: text }]} numberOfLines={2}>
    //                   {t('walletDashboard.ebook.description')}
    //                 </Text>
    //               </View>
    //             </View>
    //             <Ionicons name="chevron-forward" size={18} color={text} style={styles.kpiChevron} />
    //           </View>
    //         </LinearGradient>
    //       </TouchableOpacity>
    //     </View>
    //   );
    // }

    const isTotalEarning = item.id === 'Total Earning';
    const isReferralPoints = item.id === 'referralPoints';
    const isFollowers = item.id === 'followers';

    const cardContent = (
      <View
        style={[
          styles.kpiCard,
          {
            backgroundColor: isDarkMode ? (card || '#1F172B') : '#FFFFFF',
            borderColor: themePalette.cardBorder,
            shadowColor: themePalette.cardShadow,
          },
        ]}
      >
        <View style={styles.kpiHeader}>
          <View style={styles.kpiHeaderLeft}>
            <View style={[styles.kpiIconWrap, { backgroundColor: themePalette.iconWrapBg }]}>
              <Ionicons
                name={item.icon || 'wallet'}
                size={17}
                color={themePalette.accent}
              />
            </View>

            <Text
              style={[
                styles.kpiTitle,
                { color: themePalette.textPrimary },
              ]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {item.title}
            </Text>

          </View>
          {isTotalEarning && (
            <TouchableOpacity
              onPress={handleOpenTotalEarnings}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="information-circle-outline" size={17} color={themePalette.infoIconColor} />
            </TouchableOpacity>
          )}
          {isFollowers && (
            <TouchableOpacity
              style={styles.dragonflyInfoButton}
              onPress={openDragonflyModal}
              activeOpacity={0.75}
            >
              <DragonflyIcon width={20} height={16} />
            </TouchableOpacity>
          )}
          {isReferralPoints && (
            <TouchableOpacity
              onPress={openReferPointsInfo}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="information-circle-outline" size={17} color={themePalette.infoIconColor} />
            </TouchableOpacity>
          )}
        </View>

        {isTotalEarning && (
          <View style={styles.cardWaveContainer} pointerEvents="none">
            <View style={[styles.cardWaveShape, { backgroundColor: themePalette.waveOuter }]} />
            <View style={[styles.cardWaveShapeInner, { backgroundColor: themePalette.waveInner }]} />
          </View>
        )}

        <View style={styles.kpiValueWrap}>
          <Text
            style={[
              styles.kpiValue,
              { color: themePalette.textValue },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {isMissionPostCard
              ? formatProviderMoney(missionDonationTotal)
              : isReferralPoints
                ? `${formatPointValue(rewardSummary.totalPlatformPoints || 0)} pts`
                : (kpiValueText ?? '-').split('\n')[0].trim()}
          </Text>
        </View>

        {isSupportCard && (
          <View style={styles.chartBarsWrap} pointerEvents="none">
            {[7, 11, 15, 19, 25].map((h, i) => (
              <View
                key={i}
                style={[
                  styles.chartBarItem,
                  {
                    height: h,
                    backgroundColor: themePalette.chartBar,
                  },
                ]}
              />
            ))}
          </View>
        )}

        {isFollowers && (
          <View style={styles.followerAvatarsRow}>
            {FOLLOWER_AVATARS.map((uri, idx) => (
              <Image
                key={idx}
                source={{ uri }}
                style={[styles.followerAvatarImg, idx > 0 && { marginLeft: -7 }]}
              />
            ))}
            <View style={[styles.followerMoreBadge, { backgroundColor: themePalette.badgeBg }]}>
              <Text style={[styles.followerMoreText, { color: themePalette.badgeText }]}>
                {`+${followersCount > 3 ? followersCount - 3 : 8}`}
              </Text>
            </View>
          </View>
        )}

        {isCreditsCard && (
          <View style={styles.creditsActionRow}>
            <Text style={[styles.creditsActionText, { color: themePalette.subText }]}>
              {t('walletDashboard.kpi.tapToBuyCredits', 'Tap to buy credits')}
            </Text>
            <View style={[styles.creditsArrowBtn, { backgroundColor: themePalette.buttonBg }]}>
              <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
            </View>
          </View>
        )}

        {isMissionPostCard && (
          <View style={[styles.missionActivePill, { backgroundColor: themePalette.pillBg }]}>
            <Text style={styles.missionActivePillText}>
              {`Active: ${missionActiveCount || 0}`}
            </Text>
          </View>
        )}

        {isReferralPoints && (
          <View style={styles.coinStackWrap} pointerEvents="none">
            <View style={[styles.coinDisc, styles.coinDisc3, { backgroundColor: themePalette.coinDiscBg, borderColor: themePalette.coinDiscBorder }]} />
            <View style={[styles.coinDisc, styles.coinDisc2, { backgroundColor: themePalette.coinDiscBg, borderColor: themePalette.coinDiscBorder }]} />
            <View style={[styles.coinDisc, styles.coinDisc1, { backgroundColor: themePalette.coinDiscFront, borderColor: themePalette.coinDiscFrontBorder }]}>
              <Ionicons name="checkmark" size={11} color="#FFFFFF" />
            </View>
          </View>
        )}
      </View>
    );

    if (isCreditsCard) {
      return (
        <View key={item.id} style={cellStyle}>
          <TouchableOpacity
            style={styles.kpiCardTouchable}
            activeOpacity={0.86}
            onPress={() => navigation.navigate('WalletMain')}
          >
            {cardContent}
          </TouchableOpacity>
        </View>
      );
    }

    if (isMissionPostCard) {
      return (
        <View key={item.id} style={cellStyle}>
          <TouchableOpacity
            style={styles.kpiCardTouchable}
            activeOpacity={0.86}
            onPress={() => navigation.navigate('ViewMissionPost', { isBusinessProfile: isBusinessProfile })}
          >
            {cardContent}
          </TouchableOpacity>
        </View>
      );
    }

    if (isSupportCard) {
      return (
        <View key={item.id} style={cellStyle}>
          <TouchableOpacity
            style={styles.kpiCardTouchable}
            activeOpacity={0.86}
            onPress={() => navigation.navigate('RevenueFromSubscriptions')}
          >
            {cardContent}
          </TouchableOpacity>
        </View>
      );
    }

    if (item.id === 'followers') {
      return (
        <View key={item.id} style={cellStyle}>
          <TouchableOpacity
            style={styles.kpiCardTouchable}
            activeOpacity={0.86}
            onPress={() => {
              navigation.navigate('ProfileMain', {
                screen: 'FollowersFollowingScreen',
                params: {
                  tab: 'followers',
                  userName: userProfile.name,
                  userId: userId,
                  returnTo: 'Dashboard',
                },
              });
            }}
          >
            {cardContent}
          </TouchableOpacity>
        </View>
      );
    }

    if (item.id === 'Total Earning') {
      return (
        <View key={item.id} style={cellStyle}>
          <TouchableOpacity
            style={styles.kpiCardTouchable}
            activeOpacity={0.86}
            onPress={handleOpenTotalEarnings}
          >
            {cardContent}
          </TouchableOpacity>
        </View>
      );
    }

    if (item.id === 'referralPoints') {
      return (
        <View key={item.id} style={cellStyle}>
          <TouchableOpacity
            style={styles.kpiCardTouchable}
            activeOpacity={0.86}
            onPress={handleOpenReferralPoints}
          >
            {cardContent}
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View key={item.id} style={cellStyle}>
        {cardContent}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, bgStyle]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[text]}
            tintColor={text}
            title={t('walletDashboard.pullToRefresh')}
            titleColor={text}
          />
        }
      >
        {/* Header — Profile Banner */}
        <View style={styles.header}>
          <LinearGradient
            colors={bannerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.8 }}
            style={styles.headerCard}
          >
            <View style={styles.headerGlow} />

            <View style={styles.headerRow}>
              {/* Avatar */}
              <View style={styles.headerAvatarWrap}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={openAvatarPreview}
                >
                  <HexAvatar
                    uri={profileImage || userProfile.image || FALLBACK_AVATAR}
                    size={Math.min(Math.max(width * 0.185, 70), 80)}
                    borderWidth={3}
                    borderColor="#FFFFFF"
                    pointyTop
                  />
                </TouchableOpacity>
              </View>

              {/* User information */}
              <View style={styles.headerText}>
                <View style={styles.headerUsernameRow}>
                  <Text
                    style={styles.headerName}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {headerNameLabel}
                  </Text>
                  <View style={styles.headerCheckmarkBadge}>
                    <Svg width={18} height={18} viewBox="0 0 18 18">
                      <Circle cx={9} cy={9} r={9} fill="#C084FC" />
                      <Path
                        d="M5.2 9.2 L7.8 11.8 L12.8 6.5"
                        stroke="#FFFFFF"
                        strokeWidth={2.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </Svg>
                  </View>
                </View>

                <Text style={styles.headerStatusText}>
                  {t('walletDashboard.headerVerified', 'Verified')}
                </Text>
              </View>

              {/* Mascot */}
              <Image
                source={butterflyIcon}
                style={styles.headerButterfly}
                resizeMode="contain"
              />
            </View>
          </LinearGradient>
        </View>

        {/* KPI Cards: Total Earning, Subscription Earning, Followers, Credits Left, Mission Post, Valens Point, and full-width Wallet banner */}
        <View style={styles.section}>
          <View style={styles.kpiGrid}>
            {kpiGridData.map((item) => renderKPICard(item))}
          </View>
        </View>

        {/* 1. Hero Card: Total Platform Points with Waving Mascot */}
        <TouchableOpacity
          style={styles.heroSection}
          activeOpacity={0.88}
          onPress={handleOpenReferralPoints}
        >
          <View style={styles.heroCardOuter}>
            {/* Inner clipped card for background and waves on both iOS & Android */}
            <View style={styles.heroCardInner}>
              <LinearGradient
                colors={bannerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0.85 }}
                style={StyleSheet.absoluteFill}
              />

              {/* Bottom decorative waves */}
              <View style={styles.heroWavesWrap} pointerEvents="none">
                <Svg width="100%" height={44} viewBox="0 0 400 44" preserveAspectRatio="none">
                  <Path
                    d="M0,22 C90,8 180,30 270,16 C330,8 370,22 400,16 L400,44 L0,44 Z"
                    fill={isDarkMode ? 'rgba(0, 0, 0, 0.28)' : (isBusinessProfile ? 'rgba(60, 40, 10, 0.35)' : 'rgba(59, 7, 100, 0.35)')}
                  />
                  <Path
                    d="M0,30 C110,16 200,36 290,24 C340,16 375,28 400,22 L400,44 L0,44 Z"
                    fill={isDarkMode ? 'rgba(0, 0, 0, 0.45)' : (isBusinessProfile ? 'rgba(40, 25, 5, 0.55)' : 'rgba(46, 16, 101, 0.55)')}
                  />
                </Svg>
              </View>

              {/* Left Content */}
              <View style={styles.heroBannerLeft}>
                <View style={styles.heroBadgeRow}>
                  <HexStarIcon size={24} starSize={12} starColor="#FFFFFF" bgColor="rgba(255,255,255,0.28)" />
                  <Text style={styles.heroBadgeText} numberOfLines={1}>
                    {t('walletDashboard.battlePoints.totalPlatformPoints', 'Total Platform Points')}
                  </Text>
                </View>

                <View style={styles.heroPointsRow}>
                  <Text
                    style={styles.heroPointsText}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {`${formatPointValue(rewardSummary.totalPlatformPoints)} pts`}
                  </Text>
                  <View style={styles.heroSparklesIconWrap}>
                    <DiamondSparkleIcon size={22} color="#FFFFFF" />
                  </View>
                </View>
              </View>
            </View>

            {/* Mascot Wrapper: Overflows card top edge cleanly without breaking card corner radii */}
            <View style={styles.heroMascotWrap} pointerEvents="none">
              {/* Soft circular halo glow behind bee's head */}
              <View style={styles.heroMascotGlow} />

              {/* 3 Yellow radiant bursts above bee's waving hand */}
              <View style={styles.heroHandBursts}>
                <View style={[styles.heroHandBurstRay, { transform: [{ rotate: '-32deg' }], height: 6 }]} />
                <View style={[styles.heroHandBurstRay, { transform: [{ rotate: '0deg' }], height: 8, marginTop: -2 }]} />
                <View style={[styles.heroHandBurstRay, { transform: [{ rotate: '32deg' }], height: 6 }]} />
              </View>

              {/* Profile-aware waving bee/butterfly mascot */}
              <Image
                source={butterflyPoints}
                style={styles.heroMascotImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </TouchableOpacity>

        {/* 2. Row of 3 Stat Cards: Battle Points, Refer Points, Used Points */}
        <View style={styles.threePointsRow}>
          {/* Battle Points */}
          <View
            style={[
              styles.pointStatCard,
              {
                backgroundColor: isDarkMode ? card : (isBusinessProfile ? '#FDFBF7' : '#FFFDF5'),
                borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : (isBusinessProfile ? '#F2E8D5' : '#FDE68A'),
              },
            ]}
          >
            <Ionicons name="trophy" size={24} color="#F59E0B" />
            <Text style={[styles.pointStatValue, { color: isDarkMode ? '#FFFFFF' : (isBusinessProfile ? '#3D2F14' : '#3B0764') }]}>
              {formatPointValue(rewardSummary.totalBattlePoints)}
            </Text>
            <Text style={[styles.pointStatLabel, { color: isDarkMode ? (isBusinessProfile ? '#E5C98A' : '#DDD6FE') : (isBusinessProfile ? '#8C6D37' : '#4C1D95') }]}>
              {'Battle\nPoints'}
            </Text>
          </View>

          {/* Refer Points */}
          <TouchableOpacity
            style={[
              styles.pointStatCard,
              {
                backgroundColor: isDarkMode ? card : (isBusinessProfile ? '#FAF8F2' : '#F0F9FF'),
                borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : (isBusinessProfile ? '#EFE2C8' : '#BAE6FD'),
              },
            ]}
            activeOpacity={0.8}
            onPress={openReferPointsInfo}
          >
            <Ionicons name="gift" size={24} color={isBusinessProfile ? '#C9A15A' : '#0EA5E9'} />
            <Text style={[styles.pointStatValue, { color: isDarkMode ? '#FFFFFF' : (isBusinessProfile ? '#3D2F14' : '#3B0764') }]}>
              {formatPointValue(rewardSummary.referPoints)}
            </Text>
            <Text style={[styles.pointStatLabel, { color: isDarkMode ? (isBusinessProfile ? '#E5C98A' : '#DDD6FE') : (isBusinessProfile ? '#8C6D37' : '#4C1D95') }]}>
              {'Refer\nPoints'}
            </Text>
          </TouchableOpacity>

          {/* Used Points */}
          <View
            style={[
              styles.pointStatCard,
              {
                backgroundColor: isDarkMode ? card : (isBusinessProfile ? '#FBF9F4' : '#FDF4FF'),
                borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : (isBusinessProfile ? '#EFE5D2' : '#F5D0FE'),
              },
            ]}
          >
            <Ionicons name="layers" size={24} color={isBusinessProfile ? '#A07D41' : '#C026D3'} />
            <Text style={[styles.pointStatValue, { color: isDarkMode ? '#FFFFFF' : (isBusinessProfile ? '#3D2F14' : '#3B0764') }]}>
              {formatPointValue(rewardSummary.used)}
            </Text>
            <Text style={[styles.pointStatLabel, { color: isDarkMode ? (isBusinessProfile ? '#E5C98A' : '#DDD6FE') : (isBusinessProfile ? '#8C6D37' : '#4C1D95') }]}>
              {'Used\nPoints'}
            </Text>
          </View>
        </View>

        {/* 3. Activity Overview Section */}
        <View style={styles.activitySectionContainer}>
          <View style={styles.activityHeaderRow}>
            <Text style={[styles.activitySectionTitle, { color: isDarkMode ? '#FFFFFF' : (isBusinessProfile ? '#3D2F14' : '#1E1B4B') }]}>
              {t('walletDashboard.activityOverview.sectionTitle', 'Activity Overview')}
            </Text>

            <TouchableOpacity
              style={[
                styles.timeframeButton,
                {
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : (isBusinessProfile ? '#E8DCC6' : '#DDD6FE'),
                  backgroundColor: card,
                },
              ]}
              onPress={() => setTimeframeModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={14} color={isBusinessProfile ? accent : '#7C3AED'} style={{ marginRight: 6 }} />
              <Text style={[styles.timeframeButtonText, { color: isDarkMode ? '#FFFFFF' : (isBusinessProfile ? '#3D2F14' : '#1E1B4B') }]}>
                {selectedTimeframe}
              </Text>
              <Ionicons name="chevron-down" size={13} color={isBusinessProfile ? accent : '#7C3AED'} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          {/* Segmented Period Tabs: Daily | Weekly | Monthly */}
          <View
            style={[
              styles.periodSelectorPill,
              {
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : (isBusinessProfile ? '#EFE4CD' : '#EDE9FE'),
              },
            ]}
          >
            {[
              { key: 'Daily', label: t('walletDashboard.activityOverview.periodDaily', 'Daily') },
              { key: 'Weekly', label: t('walletDashboard.activityOverview.periodWeekly', 'Weekly') },
              { key: 'Monthly', label: t('walletDashboard.activityOverview.periodMonthly', 'Monthly') },
            ].map(({ key, label }) => {
              const isActive = activityPeriod === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={styles.periodTabButton}
                  onPress={() => setActivityPeriod(key)}
                  activeOpacity={0.85}
                >
                  {isActive ? (
                    <LinearGradient
                      colors={isBusinessProfile ? [accent, accent] : ['#581C87', '#7C3AED']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.periodTabActiveGradient}
                    >
                      <Text style={[styles.periodTabText, styles.periodTabTextActive]}>
                        {label}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.periodTabInactive}>
                      <Text
                        style={[
                          styles.periodTabText,
                          { color: isDarkMode ? (isBusinessProfile ? '#E5C98A' : '#DDD6FE') : (isBusinessProfile ? '#5C4723' : '#374151') },
                        ]}
                      >
                        {label}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 3 Metric Cards Row (OUTSIDE the chart card!) */}
          <View style={styles.exactMetricsRow}>
            {/* Followers */}
            <View style={[styles.exactMetricCard, { backgroundColor: card, borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : (isBusinessProfile ? '#F2E8D5' : 'rgba(237, 233, 254, 0.85)') }]}>
              <View style={[styles.exactIconWrap, { backgroundColor: isDarkMode ? (isBusinessProfile ? 'rgba(201, 161, 90, 0.22)' : 'rgba(124, 58, 237, 0.25)') : (isBusinessProfile ? '#FBF6EA' : '#EDE9FE') }]}>
                <Ionicons name="people" size={15} color={isBusinessProfile ? accent : '#7C3AED'} />
              </View>
              <Text style={[styles.exactMetricValue, { color: isDarkMode ? '#FFFFFF' : (isBusinessProfile ? '#3D2F14' : '#1E1B4B') }]}>
                {formatDisplayNumber(Math.round(followersCount || 11))}
              </Text>
              <Text style={[styles.exactMetricLabel, { color: isDarkMode ? '#FFFFFF' : (isBusinessProfile ? '#3D2F14' : '#1E1B4B') }]}>
                Followers
              </Text>
              <Text style={[styles.exactMetricSub, { color: isDarkMode ? (isBusinessProfile ? '#D4B87E' : '#9CA3AF') : (isBusinessProfile ? '#5C4723' : '#4B5563') }]} numberOfLines={1}>
                Following {formatDisplayNumber(Math.round(followingCount || 18))}
              </Text>
              <View style={styles.exactGreenBadge}>
                <Ionicons name="arrow-up" size={10} color="#16A34A" style={{ marginRight: 2 }} />
                <Text style={styles.exactGreenBadgeText}>
                  +0 since last week
                </Text>
              </View>
            </View>

            {/* Total support */}
            <View style={[styles.exactMetricCard, { backgroundColor: card, borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : (isBusinessProfile ? '#F2E8D5' : 'rgba(237, 233, 254, 0.85)') }]}>
              <View style={[styles.exactIconWrap, { backgroundColor: isDarkMode ? (isBusinessProfile ? 'rgba(201, 161, 90, 0.22)' : 'rgba(124, 58, 237, 0.25)') : (isBusinessProfile ? '#FAF4E6' : '#F3E8FF') }]}>
                <Ionicons name="wallet" size={15} color={isBusinessProfile ? '#B8860B' : '#9333EA'} />
              </View>
              <Text style={[styles.exactMetricValue, { color: isDarkMode ? '#FFFFFF' : (isBusinessProfile ? '#3D2F14' : '#1E1B4B') }]}>
                {formatDisplayCurrency(supportReceivedUsd || 795, undefined, paymentProvider)}
              </Text>
              <Text style={[styles.exactMetricLabel, { color: isDarkMode ? '#FFFFFF' : (isBusinessProfile ? '#3D2F14' : '#1E1B4B') }]}>
                Total support
              </Text>
              <Text style={[styles.exactMetricSub, { color: isDarkMode ? (isBusinessProfile ? '#D4B87E' : '#9CA3AF') : (isBusinessProfile ? '#5C4723' : '#4B5563') }]} numberOfLines={1}>
                Subscriptions & tips
              </Text>
              <View style={styles.exactGreenBadge}>
                <Ionicons name="arrow-up" size={10} color="#16A34A" style={{ marginRight: 2 }} />
                <Text style={styles.exactGreenBadgeText}>
                  +$0.00 vs last week
                </Text>
              </View>
            </View>

            {/* Unfollowers */}
            <View style={[styles.exactMetricCard, { backgroundColor: card, borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : (isBusinessProfile ? '#F2E8D5' : 'rgba(237, 233, 254, 0.85)') }]}>
              <View style={[styles.exactIconWrap, { backgroundColor: '#FCE7F3' }]}>
                <Ionicons name="person-remove-outline" size={15} color="#E11D48" />
              </View>
              <Text style={[styles.exactMetricValue, { color: isDarkMode ? '#FFFFFF' : (isBusinessProfile ? '#3D2F14' : '#1E1B4B') }]}>
                {formatDisplayNumber(unfollowersDisplay || 0)}
              </Text>
              <Text style={[styles.exactMetricLabel, { color: isDarkMode ? '#FFFFFF' : (isBusinessProfile ? '#3D2F14' : '#1E1B4B') }]}>
                Unfollowers
              </Text>
              <Text style={[styles.exactMetricSub, { color: isDarkMode ? (isBusinessProfile ? '#D4B87E' : '#9CA3AF') : (isBusinessProfile ? '#5C4723' : '#4B5563') }]} numberOfLines={1}>
                Lost over this range
              </Text>
              <View style={styles.exactGreenBadge}>
                <Ionicons name="arrow-down" size={10} color="#16A34A" style={{ marginRight: 2 }} />
                <Text style={styles.exactGreenBadgeText}>
                  +0 since last week
                </Text>
              </View>
            </View>
          </View>

          {/* Chart Card (CONTAINING ONLY THE CHART, LEGEND, FOOTNOTE!) */}
          <View style={[styles.chartContainerCard, { backgroundColor: card, borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : (isBusinessProfile ? '#F2E8D5' : 'rgba(237, 233, 254, 0.85)') }]}>
            {/* Legend */}
            <View style={styles.activityLegendRow}>
              <View style={styles.activityLegendItem}>
                <View style={[styles.activityLegendDot, { backgroundColor: isBusinessProfile ? '#8C6D37' : '#581C87' }]} />
                <Text style={[styles.activityLegendText, { color: isDarkMode ? '#FFFFFF' : (isBusinessProfile ? '#3D2F14' : '#1E1B4B') }]}>Followers</Text>
              </View>
              <View style={styles.activityLegendItem}>
                <View style={[styles.activityLegendDot, { backgroundColor: isBusinessProfile ? '#C9A15A' : '#A855F7' }]} />
                <Text style={[styles.activityLegendText, { color: isDarkMode ? '#FFFFFF' : (isBusinessProfile ? '#3D2F14' : '#1E1B4B') }]}>Support trend</Text>
              </View>
              <View style={styles.activityLegendItem}>
                <View style={[styles.activityLegendDot, { backgroundColor: '#E11D48' }]} />
                <Text style={[styles.activityLegendText, { color: isDarkMode ? '#FFFFFF' : (isBusinessProfile ? '#3D2F14' : '#1E1B4B') }]}>Unfollowers</Text>
              </View>
            </View>

            {/* SVG Chart with horizontal scroll capability */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.activityChartScrollContent}
              style={styles.activityChartScrollViewport}
            >
              <ActivityTrendSvg
                timestamps={activityTimestamps}
                labels={activityBucketLabels}
                followersValues={activityFollowersSeries.map((p) => p.value)}
                unfollowersValues={activityUnfollowersSeries.map((p) => p.value)}
                supportValues={activitySupportSeries.map((p) => p.value)}
                chartWidth={activityChartScrollWidth}
                chartHeight={200}
                colorFollowers={isBusinessProfile ? '#8C6D37' : '#581C87'}
                colorUnfollowers="#E11D48"
                colorSupport={isBusinessProfile ? '#C9A15A' : '#A855F7'}
                range={FOLLOWERS_RANGE_BY_PERIOD[activityPeriod] ?? 'daily'}
              />
            </ScrollView>

            {/* Footnote Box with (i) icon */}
            <View style={[styles.chartInfoBox, { backgroundColor: isDarkMode ? (isBusinessProfile ? 'rgba(201,161,90,0.12)' : 'rgba(168,85,247,0.12)') : (isBusinessProfile ? '#FAF6ED' : '#F5F3FF') }]}>
              <Ionicons name="information-circle-outline" size={18} color={isBusinessProfile ? accent : '#7C3AED'} style={{ marginRight: 8, marginTop: 1 }} />
              <Text style={[styles.chartInfoText, { color: isDarkMode ? (isBusinessProfile ? '#E5C98A' : '#DDD6FE') : (isBusinessProfile ? '#8C6D37' : '#4C1D95') }]}>
                {t('walletDashboard.activityOverview.chartFootnote', 'Lines use separate scales. Swipe the chart sideways when points are crowded.')}
              </Text>
            </View>
          </View>
        </View>

        <Modal
          visible={avatarPreviewVisible}
          transparent
          animationType="fade"
          onRequestClose={closeAvatarPreview}
        >
          <Pressable style={styles.avatarPreviewOverlay} onPress={closeAvatarPreview}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={closeAvatarPreview}
              style={styles.avatarPreviewCloseBtn}
            >
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </TouchableOpacity>

            <Pressable
              style={styles.avatarPreviewZoomHost}
              onPress={(e) => e?.stopPropagation?.()}
            >
              <ImageZoom
                cropWidth={width}
                cropHeight={height}
                imageWidth={AVATAR_PREVIEW_SIZE}
                imageHeight={AVATAR_PREVIEW_SIZE}
                enableCenterFocus
              >
                <View style={styles.avatarPreviewHexWrap}>
                  <HexAvatar
                    uri={profileImage || userProfile.image || FALLBACK_AVATAR}
                    size={AVATAR_PREVIEW_SIZE}
                    borderWidth={2}
                    borderColor="rgba(255,255,255,0.6)"
                  />
                </View>
              </ImageZoom>
            </Pressable>
          </Pressable>
        </Modal>
        <Modal
          visible={dragonflyModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeDragonflyModal}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={closeDragonflyModal}
            />
            <View style={[styles.modalContent, bgStyle]}>
              <ScrollView
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.modalHeaderRow}>
                  <View style={styles.modalTitleBlock}>
                    <Text style={[styles.modalTitle, textStyle]}>
                      {t('walletDashboard.dralensModal.title')}
                    </Text>
                  </View>
                  <View style={styles.modalIconWrap}>
                    {isBusinessProfile ? (
                      <GoldDragonfly width={60} height={60} />
                    ) : (
                      <BlueDragonfly width={60} height={60} />
                    )}
                  </View>
                </View>
                <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
                  <Text style={[styles.modalParagraph, textStyle]}>
                    {t('walletDashboard.dralensModal.paragraph1')}
                  </Text>
                  <Text style={[styles.modalParagraph, textStyle]}>
                    {t('walletDashboard.dralensModal.paragraph2')}
                  </Text>
                  <Text style={[styles.modalParagraph, textStyle]}>
                    {t('walletDashboard.dralensModal.paragraph3')}
                  </Text>

                  <Text style={[styles.modalSectionHeading, textStyle]}>
                    {t('walletDashboard.dralensModal.onValensHeading')}
                  </Text>
                  <View style={styles.modalBulletList}>
                    {[
                      t('walletDashboard.dralensModal.bullet1'),
                      t('walletDashboard.dralensModal.bullet2'),
                      t('walletDashboard.dralensModal.bullet3'),
                      t('walletDashboard.dralensModal.bullet4'),
                    ].map((item) => (
                      <View key={item} style={styles.modalBulletItem}>
                        <View style={styles.modalBulletPoint} />
                        <Text style={[styles.modalBulletText, textStyle]}>{item}</Text>
                      </View>
                    ))}
                  </View>

                  <Text style={[styles.modalParagraph, textStyle]}>
                    {t('walletDashboard.dralensModal.paragraph4')}
                  </Text>

                  <View style={styles.modalGrid}>
                    {DRAGONFLY_TIERS(t).map(({ id, Icon, title, range, note, color }, index) => {
                      const isLastRow =
                        DRAGONFLY_TIERS(t).length % 3 !== 0 &&
                        index >= DRAGONFLY_TIERS(t).length - (DRAGONFLY_TIERS(t).length % 3);

                      return (
                        <View
                          key={id}
                          style={[
                            styles.modalCard,
                            isLastRow && styles.lastRowCard,
                          ]}
                        >
                          <Icon width={42} height={42} />
                          <Text style={[styles.modalCardTitle, textStyle]}>{title}</Text>
                          <Text
                            style={[
                              styles.modalCardRange,
                              textStyle,
                              {
                                backgroundColor: color,
                                color: color === '#ffffff' ? '#000000' : '#ffffff',
                              },
                            ]}
                          >
                            {range}
                          </Text>
                          <Text style={[styles.modalCardNote, textStyle]}>{note}</Text>
                        </View>
                      );
                    })}
                  </View>

                  <TouchableOpacity
                    style={[styles.modalCloseButton, { backgroundColor: accent }]}
                    onPress={closeDragonflyModal}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.modalCloseButtonText}>
                      {t('walletDashboard.dralensModal.gotIt')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={referPointsInfoVisible}
          transparent
          animationType="fade"
          onRequestClose={closeReferPointsInfo}
        >
          <View style={styles.referPointsInfoOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={closeReferPointsInfo}
            />
            <View
              style={[
                styles.referPointsInfoCard,
                { backgroundColor: card, borderColor: border },
              ]}
            >
              <Text style={[styles.referPointsInfoTitle, textStyle]}>
                {t('walletDashboard.battlePoints.referPointsInfoTitle')}
              </Text>
              <Text style={[styles.referPointsInfoText, textStyle]}>
                {t('walletDashboard.battlePoints.referPointsInfoBody1')}
              </Text>
              <Text style={[styles.referPointsInfoText, textStyle]}>
                {t('walletDashboard.battlePoints.referPointsInfoBody2', { points: '1,000' })}
              </Text>

              <TouchableOpacity
                style={[styles.referPointsInfoCta, { backgroundColor: accent }]}
                onPress={closeReferPointsInfo}
                activeOpacity={0.85}
              >
                <Text style={styles.referPointsInfoCtaText}>
                  {t('walletDashboard.battlePoints.referPointsInfoCta')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.referPointsInfoSecondaryCta,
                  { borderColor: accent, backgroundColor: card },
                ]}
                onPress={() => {
                  closeReferPointsInfo();
                  const shareParams = {
                    userData: {
                      userName: userProfile?.name || '',
                      username: userProfile?.name || '',
                      image: profileImage || userProfile?.image,
                      id: userId,
                      userId: userId,
                    },
                  };
                  try {
                    navigation.navigate('ShareProfile', shareParams);
                  } catch {
                    navigation.navigate('ProfileMain', {
                      screen: 'ShareProfile',
                      params: shareParams,
                    });
                  }
                }}
                activeOpacity={0.85}
              >
                <Text style={[styles.referPointsInfoSecondaryCtaText, { color: accent }]}>
                  {t('walletDashboard.battlePoints.referPointsInfoInvite')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Token Purchase Modal */}
        <RBSheet
          ref={purchaseSheetRef}
          height={500}
          openDuration={250}
          draggable={true}
          closeOnPressMask={true}
          customModalProps={{ statusBarTranslucent: true }}
          onOpen={() => setPurchaseAutoFocus(true)}
          onClose={() => {
            Keyboard.dismiss();
            setPurchaseAutoFocus(false);
            setPendingFollowUserId(null);
          }}
          customStyles={{
            container: [{
              borderTopLeftRadius: 30,
              borderTopRightRadius: 30,
              bottom: -30,
            }, bgStyle],
            draggableIcon: {
              backgroundColor: '#ccc',
              width: 60,
            },
          }}
        >
          <TokenPurchaseModal
            onClose={handleTokenModalClose}
            onPurchase={handleTokenPurchase}
            hasFollowing={true}
            autoFocus={purchaseAutoFocus}
            vendorid={pendingFollowUserId}
          />
        </RBSheet>

        {/* Token Sell Modal */}
        <RBSheet
          ref={sellSheetRef}
          height={550}
          openDuration={250}
          draggable={true}
          closeOnPressMask={true}
          customModalProps={{ statusBarTranslucent: true }}
          onOpen={() => setPurchaseAutoFocus(true)}
          onClose={() => {
            Keyboard.dismiss();
            setPurchaseAutoFocus(false);
            setPendingFollowUserId(null);
          }}
          customStyles={{
            container: [{
              borderTopLeftRadius: 30,
              borderTopRightRadius: 30,
              bottom: -30,
            }, bgStyle],
            draggableIcon: {
              backgroundColor: '#ccc',
              width: 60,
            },
          }}
        >
          <TokenSellModal
            onSell={handleTokenSell}
            userId={pendingFollowUserId}
            tokenAddress={tokenAddress}
          />
        </RBSheet>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  exactMetricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    marginBottom: 12,
  },
  exactMetricCard: {
    flex: 1,
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    alignItems: 'flex-start',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  exactIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  exactMetricValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  exactMetricLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 2,
  },
  exactMetricSub: {
    fontSize: 10.5,
    marginTop: 1,
  },
  exactGreenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  exactGreenBadgeText: {
    color: '#16A34A',
    fontSize: 9.5,
    fontWeight: '600',
  },

  /* --- Mockup Dashboard Styles --- */
  heroSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 6,
    overflow: 'visible',
  },
  heroCardOuter: {
    borderRadius: 24,
    position: 'relative',
    overflow: 'visible',
    shadowColor: '#581C87',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
    backgroundColor: 'transparent',
  },
  heroCardInner: {
    borderRadius: 24,
    overflow: 'hidden',
    minHeight: 124,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  heroWavesWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 44,
  },
  heroBannerLeft: {
    flex: 1,
    paddingRight: 110,
    zIndex: 2,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: 0.1,
  },
  heroPointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroPointsText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroSparklesIconWrap: {
    marginLeft: 8,
    marginTop: 2,
  },
  heroMascotWrap: {
    position: 'absolute',
    right: -4,
    top: -24,
    width: 142,
    height: 142,
    zIndex: 10,
  },
  heroMascotGlow: {
    position: 'absolute',
    top: 14,
    right: 18,
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  heroHandBursts: {
    position: 'absolute',
    top: 18,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
    zIndex: 12,
  },
  heroHandBurstRay: {
    width: 2.4,
    backgroundColor: '#FBBF24',
    borderRadius: 2,
  },
  heroMascotImage: {
    width: 142,
    height: 142,
    transform: [{ scaleX: -1 }],
  },
  threePointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  pointStatCard: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  pointStatValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 6,
    letterSpacing: -0.2,
  },
  pointStatLabel: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 3,
    textAlign: 'center',
  },
  walletBannerSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  activitySectionContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  activityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activitySectionTitle: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  timeframeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timeframeButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  periodSelectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    padding: 3,
    marginTop: 12,
    marginBottom: 12,
    height: 42,
  },
  periodTabButton: {
    flex: 1,
    height: '100%',
  },
  periodTabActiveGradient: {
    flex: 1,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6B21A8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 2,
  },
  periodTabInactive: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  periodTabText: {
    fontSize: 13.5,
    fontWeight: '500',
  },
  periodTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chartContainerCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  activityLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
  activityLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activityLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activityLegendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
  },
  chartInfoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  timeframeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  timeframeModalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  timeframeModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
  },
  timeframeOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginVertical: 2,
  },
  timeframeOptionText: {
    fontSize: 15,
  },

  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 150 : 110,
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 10 : 4,
    paddingBottom: 4,
    marginBottom: 12,
  },

  headerCard: {
    borderRadius: 22,
    // paddingHorizontal: 5,
    // paddingVertical: 5,
    minHeight: 110,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    // marginTop:10
  },

  headerGlow: {
    position: 'absolute',
    width: 180,
    height: 120,
    borderRadius: 80,
    top: -20,
    right: -40,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 76,
    position: 'relative',
    paddingHorizontal:15
  },

  headerAvatarWrap: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  headerText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 84,
    justifyContent: 'center',
  },

  headerUsernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 25,
    letterSpacing: -0.3,
    flexShrink: 1,
  },

  headerCheckmarkBadge: {
    width: 18,
    height: 18,
    marginLeft: 6,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerCheckmark: {
    marginLeft: 4,
  },

  headerStatusText: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: 14.5,
    fontWeight: '400',
    marginTop: 4,
    letterSpacing: 0.1,
  },

  headerButterfly: {
    position: 'absolute',
    right: 2,
    bottom: -4,
    width: 96,
    height: 96,
  },

  headerBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  battlePointsSection: {
    marginTop: 14,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  pointsSectionTitle: {
    marginBottom: 12,
  },
  battleMissionRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  battleCard: {
    width: '48%',
    minHeight: 210,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    padding: 14,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  missionCard: {
    width: '48%',
    minHeight: 210,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    padding: 14,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b1a4f',
  },
  livePill: {
    backgroundColor: '#f5e1f7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  livePillSmall: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    marginLeft: 6,
  },
  livePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },
  battleBanner: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  battleBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  battleBannerTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  battleBannerSub: {
    color: '#f3e8ff',
    fontSize: 12,
    marginTop: 4,
  },
  battleAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  battleAmount: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  battleDelta: {
    color: '#86efac',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  battleBannerFoot: {
    color: '#e9d5ff',
    fontSize: 11,
    marginTop: 2,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b5a84',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2a1b3d',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValueGreen: {
    color: '#22c55e',
  },
  monthPill: {
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  monthPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },
  missionMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  missionMainValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2a1b3d',
  },
  missionSub: {
    fontSize: 12,
    color: '#6b5a84',
    marginTop: 2,
  },
  missionRight: {
    alignItems: 'flex-end',
  },
  missionAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2a1b3d',
  },
  missionDelta: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22c55e',
    marginTop: 2,
  },
  primaryButton: {
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  pointsCard: {
    position: 'relative',
    borderRadius: 24,
    padding: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  pointsGlow: {
    position: 'absolute',
    width: 180,
    height: 120,
    borderRadius: 80,
    top: -24,
    right: -40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  pointsMascot: {
    position: 'absolute',
    top: 0,
    right: 14,
    width: 100,
    height: 70,
    zIndex: 1,
  },
  pointsFourColRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 50,
    paddingBottom: 20,
    zIndex: 2,
  },
  pointsDivider: {
    width: 1,
    height: 46,
    backgroundColor: 'rgba(90,45,130,0.16)',
    marginHorizontal: 5,
  },
  pointsMainCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1.8,
    minWidth: 0,
  },
  pointsMainIconWrap: {
    // width: 20,
    // height: 20,
    // borderRadius: 10,
    // backgroundColor: '#5a2d82',
    // alignItems: 'center',
    // justifyContent: 'center',
    marginRight: 4,
  },
  pointsMainText: {
    // flex: 1,
    minWidth: 0,
  },
  pointsMainLabel: {
    fontSize: 8,
    fontWeight: '500',
    opacity: 0.82,
  },
  pointsMainValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  pointsCol: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    paddingLeft: 4,
  },
  pointsColValue: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '900',
  },
  pointsColIconSlot: {
    width: '100%',
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsColLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '500',
    opacity: 0.75,
    textAlign: 'center',
    alignSelf: 'stretch',
    width: '100%',
  },
  pointsInfoButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    paddingHorizontal: 2,
    paddingVertical: 2,
    borderRadius: 10,
    opacity: 0.9,
  },
  pointsInfoIcon: {
    marginTop: 1,
  },
  referPointsInfoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  referPointsInfoCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
  },
  referPointsInfoTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  referPointsInfoText: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.9,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 10,
  },
  referPointsInfoCta: {
    marginTop: 6,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referPointsInfoCtaText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  referPointsInfoSecondaryCta: {
    marginTop: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referPointsInfoSecondaryCtaText: {
    fontSize: 13,
    fontWeight: '800',
  },

  pointsOverline: {
    fontSize: 12,
    color: '#ddd6fe',
    marginBottom: 4,
    fontWeight: '600',
  },
  pointsUserName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  pointsLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pointsLiveText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '700',
    color: '#fef3c7',
  },
  pointsLabel: {
    fontSize: 13,
    color: '#e9d5ff',
    marginBottom: 4,
    fontWeight: '500',
    paddingHorizontal: 16,
    marginTop: 16
  },
  pointsValue: {
    fontSize: 40,
    fontWeight: '800',
    color: '#fff',
    paddingHorizontal: 16,
  },
  pointsSubtext: {
    marginTop: 6,
    marginBottom: 18,
    fontSize: 13,
    lineHeight: 18,
    color: '#f3e8ff',
  },
  pointsBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 4,
    paddingHorizontal: 16,
    marginBottom: 16
  },
  pointsBreakdownCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 14,
    marginBottom: 0,
    alignItems: 'center',
  },
  pointsBreakdownCardUser: {
    backgroundColor: 'rgba(90,45,130,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(90,45,130,0.18)',
  },
  pointsBreakdownCardBiz: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(42,27,61,0.1)',
  },
  pointsBreakdownIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pointsBreakdownValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  pointsBreakdownLabel: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  // KPI Cards

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -(KPI_GRID_GAP / 2),
    alignItems: 'stretch',
  },

  kpiCardCell: {
    width: '50%',
    paddingHorizontal: KPI_GRID_GAP / 2,
    marginBottom: 10,
    minWidth: 0,
  },

  kpiCardCellFull: {
    width: '100%',
  },

  kpiCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    width: '100%',
    minHeight: 150,
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#5B259F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },

  kpiCardTouchable: {
    width: '100%',
    flexGrow: 1,
    alignItems: 'stretch',
    alignSelf: 'stretch',
    minWidth: 0,
    borderRadius: 22,
    overflow: 'hidden',
  },

  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 38,
    marginBottom: 8,
  },

  kpiHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: 6,
  },

  kpiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  kpiTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 9,
    flex: 1,
    flexShrink: 1,
    textTransform: 'capitalize',
    lineHeight: 18,
    includeFontPadding: false,
  },

  kpiValueWrap: {
    width: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
    marginVertical: 5,
    zIndex: 2,
    elevation: 2,
  },

  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    width: '100%',
    flexShrink: 1,
    letterSpacing: -0.4,
    includeFontPadding: false,
  },

  kpiValueSubline: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 21,
    marginTop: 2,
    width: '100%',
  },

  kpiHeaderChevron: {
    marginLeft: 4,
    opacity: 0.75,
  },
  kpiValueMultiline: {
    fontSize: 18,
    lineHeight: 22,
    marginTop: 2,
  },
  kpiValueMetaMask: {
    fontSize: 24,
    paddingLeft: 0,
    paddingTop: 6,
    paddingBottom: 0,
    marginBottom: 0,
  },
  cardWaveContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 80,
    height: 36,
    overflow: 'hidden',
    zIndex: 0,
    elevation: 0,
  },
  cardWaveShape: {
    position: 'absolute',
    bottom: -16,
    right: -8,
    width: 88,
    height: 44,
    borderRadius: 26,
    transform: [{ rotate: '-12deg' }],
  },
  cardWaveShapeInner: {
    position: 'absolute',
    bottom: -20,
    right: -3,
    width: 65,
    height: 35,
    borderRadius: 20,
    transform: [{ rotate: '-8deg' }],
  },
  chartBarsWrap: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2.5,
  },
  chartBarItem: {
    width: 5,
    borderRadius: 2.5,
  },

  followerAvatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },

  followerAvatarImg: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  followerMoreBadge: {
    marginLeft: -5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  creditsActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    minHeight: 28,
  },

  creditsActionText: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
    marginRight: 6,
  },

  creditsArrowBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#7832BD',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  missionActivePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#5C249C',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 5,
  },

  missionActivePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  coinStackWrap: {
    position: 'absolute',
    right: 8,
    bottom: 6,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinDisc: {
    position: 'absolute',
    width: 20,
    height: 8,
    borderRadius: 10,
    backgroundColor: '#8B4FD6',
    borderWidth: 1,
    borderColor: '#B78EF2',
  },
  coinDisc3: {
    bottom: 3,
    right: 3,
  },
  coinDisc2: {
    bottom: 7,
    right: 3,
  },
  coinDisc1: {
    bottom: 3,
    left: 2,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#7832BD',
    borderWidth: 1.2,
    borderColor: '#EDE4F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletBannerCell: {
    width: '100%',
    paddingHorizontal: KPI_GRID_GAP / 2,
    marginTop: 4,
    marginBottom: 14,
  },

  walletBannerTouchable: {
    width: '100%',
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#581C87',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },

  walletBannerCard: {
    width: '100%',
    minHeight: 104,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
  },

  walletBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: 16,
  },

  walletBannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  walletBannerDivider: {
    width: 1.5,
    height: 38,
    backgroundColor: 'rgba(255,255,255,0.28)',
    marginHorizontal: 12,
    flexShrink: 0,
  },

  walletBannerTextWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },

  walletBannerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 20,
  },

  walletBannerSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    flexShrink: 1,
  },

  walletBannerArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  kpiHintWrap: {
    width: '100%',
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginTop: 6,
  },
  kpiMetaSingleLine: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    opacity: 0.85,
    paddingLeft: 0,
    paddingBottom: 0,
  },
  kpiMetaConnected: {
    color: '#16a34a',
  },
  kpiMetaDisconnected: {
    color: '#b45309',
  },
  kpiMetaBuyCredits: {
    opacity: 0.75,
    marginTop: 0,
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  kpiChevronInline: {
    position: 'absolute',
    top: Platform.OS == "android" ? 16 : 15,
    right: Platform.OS == "android" ? 0 : 22,
    opacity: 0.75,
  },
  kpiChevron: {
    opacity: 0.8,
  },
  kpiMetaMaskRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 112,
  },
  kpiCardMascot: {
    flexShrink: 0,
    alignSelf: 'center',
    right: 10,
  },
  kpiIllustratedChevron: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 2,
    opacity: 0.8,
  },
  kpiMetaMaskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  kpiMetaMaskIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  kpiTipIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  kpiTipIconText: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
  },
  kpiTipDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 6,
    opacity: 0.9,
  },
  kpiWalletIcon: {
    width: 28,
    height: 28,
  },
  kpiMetaMaskText: {
    flex: 1,
    minWidth: 0,
  },
  kpiMetaMaskStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  kpiStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  kpiMetaMaskStatusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  kpiMetaMaskHint: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.75,
    marginLeft: 2,
  },
  kpiChange: {
    fontSize: 12,
    color: '#10b981',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',

  },
  modalContent: {
    borderRadius: 24,
    padding: 0,
    overflow: 'hidden',
    maxHeight: '90%',
    zIndex: 1,
    backgroundColor: '#d1e5f5'
  },
  modalScrollContent: {
    // padding: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  modalTitleBlock: {
    flex: 1,
    marginRight: 12,
  },
  modalBadge: {
    width: 32,
    height: 32,
    borderRadius: 14,
    backgroundColor: '#fde68a',
    alignItems: 'center',
    // justifyContent: 'center',
    marginBottom: 10,
  },
  modalIconWrap: {
    width: 72,
    height: 72,
    alignItems: 'center',
    // justifyContent: 'center',
    paddingRight: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    paddingLeft: 20,
    marginTop: '6%',
  },
  modalSectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 10,
  },
  modalParagraph: {
    fontSize: 14,
    lineHeight: 22,
    color: '#4b5563',
    marginBottom: 10,
  },
  modalBulletList: {
    marginBottom: 14,
  },
  modalBulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  modalBulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7c3aed',
    marginTop: 8,
    marginRight: 10,
  },
  modalBulletText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4b5563',
    flex: 1,
  },
  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalCard: {
    width: '30%',
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  modalCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
  },
  modalCardRange: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    borderRadius: 20,
    paddingHorizontal: 6,
    // paddingVertical: 4,
    marginHorizontal: 1,
    fontWeight: '600',
  },
  modalCardNote: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  modalCloseButton: {
    marginTop: 16,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    width: '40%',
    alignSelf: 'center',
  },
  modalCloseButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  lastRowCard: {
    flexGrow: 1,
    maxWidth: '45%',
    marginTop: -10
  },
  // Activities
  activitiesContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
  },
  // Wallets
  walletsContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  walletItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  walletChain: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  walletAddress: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
  },
  walletRight: {
    alignItems: 'flex-end',
  },
  walletBalance: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 4,
  },
  kycBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  kycText: {
    fontSize: 12,
    fontWeight: '600',
  },
  walletTip: {
    fontSize: 12,
    color: '#666',
    padding: 16,
    fontStyle: 'italic',
  },
  // Creators
  creatorsContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  creatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  creatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  creatorInfo: {
    flex: 1,
  },
  creatorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  creatorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginRight: 4,
  },
  creatorPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  creatorChange: {
    fontSize: 14,
    color: '#10b981',
    textAlign: 'right',
  },
  activityMetricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 12,
  },
  activityMetricCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  activityMetricCardCompact: {
    flex: 1,
    minWidth: 0,
  },
  activityMetricIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  activityMetricIconWrapCompact: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginBottom: 4,
  },
  activityMetricValue: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 1,
  },
  activityMetricValueCompact: {
    fontSize: 13,
  },
  activityMetricLabel: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 1,
  },
  activityMetricLabelCompact: {
    fontSize: 10,
    marginBottom: 0,
  },
  activityMetricSub: {
    fontSize: 9,
    color: '#94a3b8',
    marginBottom: 1,
  },
  activityMetricSubCompact: {
    fontSize: 9,
    marginBottom: 0,
  },
  activityFollowingHint: {
    fontSize: 9,
    fontWeight: '600',
    opacity: 0.85,
    marginBottom: 2,
  },
  activityDeltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 999,
    maxWidth: '100%',
    overflow: 'hidden',
  },
  activityDeltaPillCompact: {
    paddingHorizontal: 5,
    paddingVertical: 3,
    marginTop: 2,
  },
  activityDeltaText: {
    fontSize: 8,
    fontWeight: '600',
    flexShrink: 1,
  },
  activityDeltaTextCompact: {
    fontSize: 8,
  },
  activityLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 10,
  },
  activityLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activityLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activityLegendText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  activityChartFootnote: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 10,
    lineHeight: 15,
  },
  activityChartScrollViewport: {
    marginTop: 4,
    alignSelf: 'stretch',
  },
  activityChartScrollContent: {
    alignItems: 'flex-start',
  },
  // Chart Container
  chartContainer: {
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chartPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  chartLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  tooltipContainer: {
    padding: 8,
    borderRadius: 8,
  },
  tooltipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyChart: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 12,
  },
  emptyChartSubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 4,
  },
  // Period Selector
  sectionHeader: {
    marginBottom: 5,
  },
  walletInfoBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },

  walletLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },

  walletValue: {
    fontSize: 14,
    color: '#0f0a0a',
    fontWeight: '600',
  },

  periodSelector: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
    width: '100%',
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  periodButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  periodText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  periodTextActive: {
    color: '#fff',
  },
  emptyState: {
    padding: 10
  },
  emptyStateText: {
    fontSize: 18,
    color: '#000'
  },
  avatarPreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.86)',
  },
  avatarPreviewCloseBtn: {
    position: 'absolute',
    top: 44,
    right: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    zIndex: 10,
  },
  avatarPreviewZoomHost: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPreviewHexWrap: {
    width: AVATAR_PREVIEW_SIZE,
    height: AVATAR_PREVIEW_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default WalletDashboardScreen;
