import React, { memo, useId, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import Svg, { Path, Rect, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  formatEarningsPercent,
  formatEarningsUsd,
} from '../../utils/earningsGraph';
import { useAppTheme } from '../../theme/useApptheme';

const DEFAULT_CHART_WIDTH = 132;
const CHART_HEIGHT = 30;
const CHART_PAD_X = 4;
const CHART_PAD_Y = 4;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const buildSmoothSvgPath = coords => {
  if (!coords || coords.length === 0) return '';
  if (coords.length === 1) {
    return `M${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  }

  let d = `M${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  const minY = CHART_PAD_Y;
  const maxY = CHART_HEIGHT - CHART_PAD_Y;

  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i - 1] || coords[i];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = clamp(p1.y + (p2.y - p0.y) / 6, minY, maxY);
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = clamp(p2.y - (p3.y - p1.y) / 6, minY, maxY);

    d += ` C${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return d;
};

const MiniBarChart = ({ points = [], color = '#7C3AED', width = DEFAULT_CHART_WIDTH }) => {
  const values = points.map(p => Number(p.value) || 0);
  const max = Math.max(...values, 1);
  const barCount = Math.max(values.length, 1);
  const gap = 3;
  const barWidth = Math.max(4, (width - gap * (barCount - 1)) / barCount);

  return (
    <Svg width={width} height={CHART_HEIGHT}>
      {values.map((value, index) => {
        const h = Math.max(3, (value / max) * (CHART_HEIGHT - 4));
        const x = index * (barWidth + gap);
        const y = CHART_HEIGHT - h;
        return (
          <Rect
            key={`bar-${index}`}
            x={x}
            y={y}
            width={barWidth}
            height={h}
            rx={2}
            fill={color}
            opacity={0.35 + (0.65 * (index + 1)) / barCount}
          />
        );
      })}
    </Svg>
  );
};

const MiniSparklineChart = ({
  points = [],
  color = '#7C3AED',
  filled = true,
  width = DEFAULT_CHART_WIDTH,
  gradientId = 'sparkFill',
}) => {
  const values = points.map(p => Math.max(0, Number(p.value) || 0));
  const usableW = Math.max(20, width - CHART_PAD_X * 2);
  const maxVal = values.length > 0 ? Math.max(...values) : 0;

  // Flat zero state (matches Wallet to Wallet $0.00 style: straight line + 5 dots)
  if (values.length === 0 || maxVal === 0) {
    const midY = CHART_HEIGHT * 0.56;
    const dotCount = 5;
    const step = usableW / (dotCount - 1);
    const dotCoords = Array.from({ length: dotCount }, (_, i) => ({
      x: CHART_PAD_X + i * step,
      y: midY,
    }));
    const flatPath = `M${CHART_PAD_X} ${midY} L${(width - CHART_PAD_X).toFixed(1)} ${midY}`;

    return (
      <Svg width={width} height={CHART_HEIGHT}>
        <Path
          d={flatPath}
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          opacity={0.85}
        />
        {dotCoords.map((c, idx) => (
          <Circle key={`zero-pt-${idx}`} cx={c.x} cy={c.y} r={2.6} fill={color} />
        ))}
      </Svg>
    );
  }

  const normalizedValues = values.length === 1 ? [0, values[0] * 0.45, values[0]] : values;
  const max = Math.max(...normalizedValues, 1);
  const min = Math.min(...normalizedValues, 0);
  const range = Math.max(max - min, 1e-6);
  const stepX = usableW / (normalizedValues.length - 1);

  const coords = normalizedValues.map((value, index) => {
    const x = CHART_PAD_X + index * stepX;
    const y =
      CHART_HEIGHT -
      CHART_PAD_Y -
      ((value - min) / range) * (CHART_HEIGHT - CHART_PAD_Y * 2);
    return { x, y };
  });

  const linePath = buildSmoothSvgPath(coords);
  const firstCoord = coords[0];
  const lastCoord = coords[coords.length - 1];
  const areaPath = filled
    ? `${linePath} L${lastCoord.x.toFixed(1)} ${CHART_HEIGHT} L${firstCoord.x.toFixed(1)} ${CHART_HEIGHT} Z`
    : null;

  return (
    <Svg width={width} height={CHART_HEIGHT}>
      {filled ? (
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.34" />
            <Stop offset="1" stopColor={color} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
      ) : null}
      {areaPath ? <Path d={areaPath} fill={`url(#${gradientId})`} /> : null}
      <Path
        d={linePath}
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={lastCoord.x} cy={lastCoord.y} r={3} fill={color} />
    </Svg>
  );
};

const EarningsSourceCard = memo(({
  title,
  icon,
  accentColor = '#7C3AED',
  chartType = 'area',
  amount = 0,
  percentage = 0,
  points = [],
  loading = false,
  onPress,
  width,
}) => {
  const { text, cardStyle, borderColor, textSecondary, accentLight, isDarkMode } = useAppTheme();
  const mutedText = textSecondary || `${text}99`;
  const reactId = useId();
  const safeGradId = useMemo(
    () => `areaFill-${String(reactId).replace(/[^a-zA-Z0-9_-]/g, '')}`,
    [reactId],
  );

  const cardInnerWidth = width ? Math.max(88, width - 26) : DEFAULT_CHART_WIDTH;

  const chartPoints = useMemo(() => {
    if (Array.isArray(points) && points.length > 0) return points;
    return Array.from({ length: 7 }, (_, i) => ({ value: 0, timestamp: i }));
  }, [points]);

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.88 : 1}
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.card,
        cardStyle,
        isDarkMode ? styles.cardShadowDark : styles.cardShadowLight,
        {
          width,
          borderColor: borderColor || `${text}18`,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: accentLight || `${text}12` },
          ]}
        >
          <Ionicons name={icon} size={19} color={text} />
        </View>
        <Text
          style={[styles.title, { color: text }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
        >
          {title}
        </Text>
      </View>

      <View style={styles.metricsWrap}>
        <Text
          style={[styles.amount, { color: text }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {formatEarningsUsd(amount)}
        </Text>
        <Text style={[styles.percent, { color: mutedText }]} numberOfLines={1}>
          {formatEarningsPercent(percentage)}
        </Text>
      </View>

      <View style={[styles.chartWrap, { width: cardInnerWidth }]}>
        {loading ? (
          <ActivityIndicator size="small" color={accentColor} />
        ) : chartType === 'bars' ? (
          <MiniBarChart
            points={chartPoints}
            color={accentColor}
            width={cardInnerWidth}
          />
        ) : (
          <MiniSparklineChart
            points={chartPoints}
            color={accentColor}
            filled={chartType !== 'line'}
            width={cardInnerWidth}
            gradientId={safeGradId}
          />
        )}
      </View>
    </TouchableOpacity>
  );
});

EarningsSourceCard.displayName = 'EarningsSourceCard';

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 13,
    paddingTop: 10,
    paddingBottom: 9,
    minHeight: 128,
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardShadowLight: {
    shadowColor: '#402090',
  },
  cardShadowDark: {
    shadowColor: '#000',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
  },
  metricsWrap: {
    marginBottom: 6,
  },
  amount: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 1,
  },
  percent: {
    fontSize: 11,
    fontWeight: '500',
  },
  chartWrap: {
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default EarningsSourceCard;
