import React, { useEffect, useId, useMemo, useRef } from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Rect,
  Circle,
  Line,
  Text as SvgText,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { format, startOfDay, startOfMonth, startOfWeek, subDays, subMonths, subWeeks } from 'date-fns';
import { formatDisplayCurrency } from '../../utils/displayLocale';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useLanguage } from '../../i18n';

const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const translateWeekdayLabel = (label, t) => {
  const key = String(label || '').trim().toLowerCase();
  if (WEEKDAY_KEYS.includes(key)) return t(`date.dayNames.${key}`);
  return label;
};

export const SUBSCRIPTION_CHART_LINE = '#7C3AED';
const CHART_POINT_GAP = 48;
const Y_AXIS_WIDTH = 40;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getChartPointGap = (interval, pointCount) => {
  if (interval === 'monthly') return pointCount > 10 ? 56 : 64;
  if (interval === 'weekly') return pointCount > 12 ? 48 : 54;
  return CHART_POINT_GAP;
};

/** Compute 5 clean Y-axis ticks starting at 0 (e.g. [0, 250, 500, 750, 1000]). */
const computeNiceYAxis = (maxVal) => {
  const safeMax = Number(maxVal) || 0;
  if (safeMax <= 0) return [0, 25, 50, 75, 100];

  const rawStep = (safeMax * 1.15) / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const frac = rawStep / pow;

  let niceFrac = 10;
  if (frac <= 1) niceFrac = 1;
  else if (frac <= 2) niceFrac = 2;
  else if (frac <= 2.5) niceFrac = 2.5;
  else if (frac <= 5) niceFrac = 5;

  const step = niceFrac * pow;
  return [0, step, step * 2, step * 3, step * 4];
};

const formatYAxisTick = (val) => {
  if (val >= 1000) return Math.round(val).toLocaleString('en-US');
  if (Number.isInteger(val)) return String(val);
  return val.toFixed(1);
};

/** Show every bucket label when sparse; sample crowded daily series. */
const buildLabelIndexes = (count, interval) => {
  if (count <= 0) return [];
  if (count === 1) return [0];
  if (count <= 8 || interval === 'monthly' || interval === 'weekly') {
    return Array.from({ length: count }, (_, i) => i);
  }
  const maxLabels = Math.min(7, count);
  const set = new Set([0, count - 1]);
  for (let k = 1; k < maxLabels - 1; k++) {
    set.add(Math.round((k / (maxLabels - 1)) * (count - 1)));
  }
  return [...set].sort((a, b) => a - b);
};

/** Bucket daily points into weekly / monthly when the API returns daily data. */
export const aggregatePointsByInterval = (points, interval) => {
  if (!Array.isArray(points) || points.length === 0 || interval === 'daily') {
    return points;
  }

  const buckets = new Map();

  points.forEach(({ timestamp, value }) => {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return;

    const bucketDate =
      interval === 'monthly'
        ? startOfMonth(date)
        : startOfWeek(date, { weekStartsOn: 1 });

    const key = bucketDate.getTime();
    buckets.set(key, (buckets.get(key) || 0) + (Number(value) || 0));
  });

  return [...buckets.entries()]
    .map(([timestamp, value]) => ({
      timestamp,
      value,
      label:
        interval === 'monthly'
          ? formatMonthlyChartLabel(timestamp)
          : format(timestamp, 'MMM d'),
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
};

const parseBucketDate = (rawDate) => {
  const value = String(rawDate).trim();
  if (!value) return null;

  if (/^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split('-').map(Number);
    const parsed = new Date(year, month - 1, 1);
    return isNaN(parsed.getTime()) ? null : parsed.getTime();
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    const parsed = new Date(year, month - 1, day);
    return isNaN(parsed.getTime()) ? null : parsed.getTime();
  }

  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed.getTime();
};

const resolveGraphTimestamp = (item, index, raw, interval) => {
  const dateStr =
    item?.month ??
    item?.weekStart ??
    item?.week ??
    item?.day ??
    item?.date ??
    item?.label ??
    item?.time ??
    item?.createdAt ??
    item?.timestamp;

  if (dateStr != null && String(dateStr).length > 0) {
    if (typeof dateStr === 'number' && Number.isFinite(dateStr)) {
      return dateStr;
    }
    const ts = parseBucketDate(dateStr);
    if (ts != null) return ts;
  }

  if (interval === 'daily' && item?.label && /^\d{1,2}:\d{2}$/.test(String(item.label))) {
    const [hour, minute] = String(item.label).split(':').map(Number);
    const fallback = startOfDay(new Date());
    fallback.setHours(Number(hour) || 0, Number(minute) || 0, 0, 0);
    return fallback.getTime();
  }

  const now = new Date();
  const offset = raw.length - 1 - index;

  if (interval === 'monthly') {
    return subMonths(startOfMonth(now), offset).getTime();
  }

  if (interval === 'weekly') {
    return subWeeks(startOfWeek(now, { weekStartsOn: 1 }), offset).getTime();
  }

  return subDays(startOfDay(now), offset).getTime();
};

const formatMonthlyChartLabel = (timestamp) => format(timestamp, 'MMM yy');

const resolveGraphLabel = (item, timestamp, interval) => {
  const bucket =
    item?.month ??
    item?.weekStart ??
    item?.week ??
    item?.day ??
    item?.date ??
    item?.label;

  if (bucket != null && String(bucket).trim()) {
    const bucketTs = parseBucketDate(bucket);
    if (bucketTs != null) {
      if (interval === 'monthly') return formatMonthlyChartLabel(bucketTs);
      return format(bucketTs, 'MMM d');
    }
  }

  if (interval === 'daily') {
    const dayName =
      String(item?.dayname ?? item?.dayName ?? item?.weekday ?? '').trim();
    if (dayName) return dayName;
    return format(timestamp, 'MMM d');
  }

  if (interval === 'monthly') return formatMonthlyChartLabel(timestamp);
  return format(timestamp, 'MMM d');
};

/** Parse `billing/subscription-earning/graph` -> points + summary */
export const parseSubscriptionGraphResponse = (response, requestedInterval = 'daily') => {
  const root = response?.data?.data ?? response?.data ?? response;
  const raw = Array.isArray(root?.points)
    ? root.points
    : Array.isArray(root)
      ? root
      : root?.graph ??
        root?.history ??
        root?.series ??
        root?.items ??
        (Array.isArray(root?.data) ? root.data : []);
  const responseInterval = root?.interval ?? null;
  const normalizedInterval = requestedInterval || responseInterval || 'daily';

  const points = (Array.isArray(raw) ? raw : [])
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

      const ts = resolveGraphTimestamp(item, index, raw, normalizedInterval);

      return {
        timestamp: ts,
        value: Number.isFinite(val) ? val : 0,
        label: resolveGraphLabel(item, ts, normalizedInterval),
      };
    })
    .filter((p) => !isNaN(p.timestamp) && Number.isFinite(p.value))
    .sort((a, b) => a.timestamp - b.timestamp);

  const totalAmount = Number(root?.totalAmount);
  const computedTotal = points.reduce((sum, p) => sum + p.value, 0);

  const shouldAggregate =
    normalizedInterval !== 'daily' &&
    (responseInterval === 'daily' || responseInterval == null);
  const displayPoints = shouldAggregate
    ? aggregatePointsByInterval(points, normalizedInterval)
    : points;

  return {
    points: displayPoints,
    totalAmount: Number.isFinite(totalAmount) ? totalAmount : computedTotal,
    interval: responseInterval,
  };
};

export const formatSupportUsd = (n) => formatDisplayCurrency(n);

export const seriesDelta = (points) => {
  if (!points || points.length < 2) return 0;
  const a = Number(points[0].value) || 0;
  const b = Number(points[points.length - 1].value) || 0;
  return b - a;
};

const computeDeltaPillData = (points, periodDeltaLabel) => {
  if (!points || points.length < 2) {
    return {
      isPositive: true,
      label: `0.0% ${periodDeltaLabel}`,
    };
  }
  const prev = Number(points[points.length - 2]?.value) || 0;
  const curr = Number(points[points.length - 1]?.value) || 0;
  const diff = curr - prev;

  if (prev > 0) {
    const pct = (diff / prev) * 100;
    return {
      isPositive: pct >= 0,
      label: `${pct >= 0 ? '+' : '-'}${Math.abs(pct).toFixed(1)}% ${periodDeltaLabel}`,
    };
  }

  return {
    isPositive: diff >= 0,
    label: `${diff >= 0 ? '+' : '-'}${formatSupportUsd(Math.abs(diff))} ${periodDeltaLabel}`,
  };
};

const buildSmoothSvgPath = (coords, minY, maxY) => {
  if (!coords || coords.length === 0) return '';
  if (coords.length === 1) {
    return `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  }

  let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i - 1] || coords[i];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = clamp(p1.y + (p2.y - p0.y) / 6, minY, maxY);
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = clamp(p2.y - (p3.y - p1.y) / 6, minY, maxY);

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
};

function SubscriptionTrendSvg({
  pairedSorted,
  yTicks,
  chartWidth,
  chartHeight,
  lineColor,
  dotFillColor,
  labelColor,
  gridColor,
  interval = 'daily',
  gradientId,
}) {
  const { t } = useLanguage();
  const padL = 14;
  const padR = 16;
  const padT = 30;
  const padB = 26;
  const innerW = Math.max(chartWidth - padL - padR, 1);
  const innerH = Math.max(chartHeight - padT - padB, 1);
  const n = pairedSorted.length;

  const xs = Array.from({ length: n }, (_, i) =>
    padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW),
  );

  const labelIndexes = useMemo(
    () => buildLabelIndexes(n, interval),
    [n, interval],
  );

  const yMax = yTicks[yTicks.length - 1] || 100;
  const coords = pairedSorted.map((item, index) => {
    const clampedV = Math.max(0, item.v);
    const ratio = yMax > 0 ? clampedV / yMax : 0;
    return {
      x: xs[index],
      y: padT + innerH - ratio * innerH,
      v: item.v,
    };
  });

  const linePath = buildSmoothSvgPath(coords, padT, padT + innerH);
  const baseY = padT + innerH;
  const areaPath =
    n > 0
      ? `${linePath} L ${coords[n - 1].x.toFixed(1)} ${baseY.toFixed(1)} L ${coords[0].x.toFixed(1)} ${baseY.toFixed(1)} Z`
      : '';

  const formatLabel = (ts) => {
    const date = new Date(ts);
    if (Number.isNaN(date.getTime())) return '';
    if (interval === 'monthly') return formatMonthlyChartLabel(date);
    return format(date, 'MMM d');
  };

  const lastCoord = coords[n - 1];
  const lastLabel = lastCoord ? formatSupportUsd(lastCoord.v) : '';
  const pillW = Math.max(54, lastLabel.length * 6.6 + 16);
  const pillH = 20;
  const pillX = lastCoord
    ? clamp(lastCoord.x - pillW / 2, 4, chartWidth - pillW - 4)
    : 0;
  const pillY = lastCoord ? Math.max(2, lastCoord.y - pillH - 10) : 2;

  return (
    <Svg width={chartWidth} height={chartHeight}>
      <Defs>
        <SvgLinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={lineColor} stopOpacity={0.28} />
          <Stop offset="1" stopColor={lineColor} stopOpacity={0.02} />
        </SvgLinearGradient>
      </Defs>

      {yTicks.map((tick) => {
        const y = padT + innerH - (yMax > 0 ? (tick / yMax) * innerH : 0);
        return (
          <Line
            key={`grid-${tick}`}
            x1={0}
            y1={y}
            x2={chartWidth}
            y2={y}
            stroke={gridColor}
            strokeWidth={1}
          />
        );
      })}

      {n > 0 ? (
        <>
          <Path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
          <Path
            d={linePath}
            stroke={lineColor}
            strokeWidth={2.2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {coords.map((c, idx) => {
            const isLast = idx === n - 1;
            if (isLast) {
              return (
                <React.Fragment key={`pt-${idx}`}>
                  <Circle cx={c.x} cy={c.y} r={8} fill={lineColor} opacity={0.2} />
                  <Circle
                    cx={c.x}
                    cy={c.y}
                    r={4.2}
                    fill={lineColor}
                    stroke={dotFillColor}
                    strokeWidth={2}
                  />
                </React.Fragment>
              );
            }
            return (
              <Circle
                key={`pt-${idx}`}
                cx={c.x}
                cy={c.y}
                r={3.2}
                fill={dotFillColor}
                stroke={lineColor}
                strokeWidth={2}
              />
            );
          })}

          {lastCoord ? (
            <>
              <Rect
                x={pillX}
                y={pillY}
                width={pillW}
                height={pillH}
                rx={10}
                fill={lineColor}
              />
              <SvgText
                x={pillX + pillW / 2}
                y={pillY + 13.5}
                fill="#FFFFFF"
                fontSize={10}
                fontWeight="700"
                textAnchor="middle"
              >
                {lastLabel}
              </SvgText>
            </>
          ) : null}
        </>
      ) : null}

      {labelIndexes.map((i) => {
        const item = pairedSorted[i];
        const ts = item.t;
        const displayLabel = translateWeekdayLabel(item.label || formatLabel(ts), t);
        if (!displayLabel) return null;
        return (
          <SvgText
            key={`lb-${ts}-${i}`}
            x={xs[i]}
            y={chartHeight - 5}
            fill={labelColor}
            fontSize={9.5}
            fontWeight="500"
            textAnchor="middle"
          >
            {displayLabel}
          </SvgText>
        );
      })}
    </Svg>
  );
}

export default function SubscriptionTrendChart({
  points,
  totalAmount,
  periodDeltaLabel,
  chartViewportWidth,
  chartHeight = 186,
  lineColor = SUBSCRIPTION_CHART_LINE,
  textColor = '#402090',
  mutedTextColor = '#7A7289',
  iconBgColor = '#F3EEFA',
  dotFillColor = '#FFFFFF',
  gridColor = 'rgba(128,128,128,0.12)',
  loading,
  emptyTitle,
  emptySubtitle,
  interval = 'daily',
}) {
  const scrollRef = useRef(null);
  const { t } = useLanguage();
  const reactId = useId();
  const gradId = useMemo(
    () => `subTrendGrad-${String(reactId).replace(/[^a-zA-Z0-9_-]/g, '')}`,
    [reactId],
  );

  const pairedSorted = useMemo(() => {
    return [...(Array.isArray(points) ? points : [])]
      .map((p) => ({
        t: Number(p.timestamp),
        v: Number(p.value) || 0,
        label: p.label,
      }))
      .filter((p) => Number.isFinite(p.t))
      .sort((a, b) => a.t - b.t);
  }, [points]);

  const hasData = pairedSorted.length > 0;
  const deltaPill = useMemo(
    () => computeDeltaPillData(points, periodDeltaLabel),
    [points, periodDeltaLabel],
  );

  const yTicks = useMemo(() => {
    const maxVal = pairedSorted.reduce((acc, p) => Math.max(acc, p.v), 0);
    return computeNiceYAxis(maxVal);
  }, [pairedSorted]);

  const plotViewportWidth = Math.max(chartViewportWidth - Y_AXIS_WIDTH, 160);
  const chartScrollWidth = useMemo(() => {
    const n = pairedSorted.length;
    if (n <= 7) return plotViewportWidth;
    const gap = getChartPointGap(interval, n);
    return Math.round(Math.max(plotViewportWidth, 32 + (n - 1) * gap));
  }, [plotViewportWidth, interval, pairedSorted.length]);

  useEffect(() => {
    if (!hasData || chartScrollWidth <= plotViewportWidth) return;
    const timer = setTimeout(() => {
      const scrollX = Math.max(chartScrollWidth - plotViewportWidth, 0);
      scrollRef.current?.scrollTo({ x: scrollX, animated: false });
    }, 0);
    return () => clearTimeout(timer);
  }, [hasData, chartScrollWidth, plotViewportWidth, interval, points]);

  const headerBlock = (
    <View style={styles.cardHeaderRow}>
      <View style={[styles.iconBadge, { backgroundColor: iconBgColor }]}>
        <Ionicons name="stats-chart-outline" size={18} color={textColor} />
      </View>
      <View style={styles.headerMetrics}>
        <Text style={[styles.headerTitle, { color: mutedTextColor }]}>
          {t('revenue.subscriptionEarnings')}
        </Text>
        <Text
          style={[styles.headerAmount, { color: textColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {formatSupportUsd(totalAmount)}
        </Text>
        {hasData ? (
          <View
            style={[
              styles.deltaPill,
              deltaPill.isPositive ? styles.deltaPositiveBg : styles.deltaNegativeBg,
            ]}
          >
            <Ionicons
              name={deltaPill.isPositive ? 'arrow-up' : 'arrow-down'}
              size={11}
              color={deltaPill.isPositive ? '#059669' : '#DC2626'}
            />
            <Text
              style={[
                styles.deltaText,
                deltaPill.isPositive ? styles.deltaPositiveText : styles.deltaNegativeText,
              ]}
              numberOfLines={1}
            >
              {deltaPill.label}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View>
        {headerBlock}
        <View style={styles.emptyChart}>
          <Ionicons name="hourglass-outline" size={40} color={textColor} />
          <Text style={[styles.emptyChartText, { color: textColor }]}>{emptyTitle}</Text>
        </View>
      </View>
    );
  }

  if (!hasData) {
    return (
      <View>
        {headerBlock}
        <View style={styles.emptyChart}>
          <Ionicons name="bar-chart-outline" size={40} color={mutedTextColor} />
          <Text style={[styles.emptyChartText, { color: textColor }]}>{emptyTitle}</Text>
          {emptySubtitle ? (
            <Text style={[styles.emptyChartSubtext, { color: mutedTextColor }]}>
              {emptySubtitle}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  const yMax = yTicks[yTicks.length - 1] || 100;
  const padT = 30;
  const padB = 26;
  const innerH = Math.max(chartHeight - padT - padB, 1);

  return (
    <View>
      {headerBlock}
      <View style={[styles.chartRow, { height: chartHeight }]}>
        <View style={[styles.yAxisCol, { height: chartHeight }]}>
          {yTicks.map((tick) => {
            const top = padT + innerH - (yMax > 0 ? (tick / yMax) * innerH : 0) - 6;
            return (
              <Text
                key={`ytick-${tick}`}
                style={[styles.yAxisLabel, { top, color: mutedTextColor }]}
              >
                {formatYAxisTick(tick)}
              </Text>
            );
          })}
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          style={styles.scrollViewport}
          contentContainerStyle={styles.scrollContent}
        >
          <SubscriptionTrendSvg
            pairedSorted={pairedSorted}
            yTicks={yTicks}
            chartWidth={chartScrollWidth}
            chartHeight={chartHeight}
            lineColor={lineColor}
            dotFillColor={dotFillColor}
            labelColor={mutedTextColor}
            gridColor={gridColor}
            interval={interval}
            gradientId={gradId}
          />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  headerMetrics: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  headerAmount: {
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  deltaPositiveBg: {
    backgroundColor: 'rgba(16,185,129,0.14)',
  },
  deltaNegativeBg: {
    backgroundColor: 'rgba(239,68,68,0.14)',
  },
  deltaPositiveText: {
    color: '#059669',
  },
  deltaNegativeText: {
    color: '#DC2626',
  },
  deltaText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  yAxisCol: {
    width: Y_AXIS_WIDTH,
    position: 'relative',
    paddingRight: 6,
  },
  yAxisLabel: {
    position: 'absolute',
    right: 6,
    fontSize: 10,
    fontWeight: '500',
  },
  scrollViewport: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'flex-start',
  },
  emptyChart: {
    height: 170,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
    marginTop: 10,
  },
  emptyChartSubtext: {
    fontSize: 12,
    opacity: 0.65,
    marginTop: 4,
    textAlign: 'center',
  },
});
