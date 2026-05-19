import { StyleSheet, Text, View } from 'react-native';
import { instructorPalette } from '@/features/instructor/theme';

type LearnerTrendChartProps = {
  values: number[];
};

const chartWidth = 220;
const chartHeight = 104;
const paddingX = 10;
const paddingY = 10;

export function LearnerTrendChart({ values }: LearnerTrendChartProps) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingY * 2;

  const points = values.map((value, index) => {
    const x = paddingX + (usableWidth / Math.max(values.length - 1, 1)) * index;
    const normalized = (value - min) / Math.max(max - min, 1);
    const y = chartHeight - paddingY - normalized * usableHeight;

    return { x, y };
  });

  return (
    <View style={styles.chartWrap}>
      {[0, 1, 2, 3].map((line) => (
        <View
          key={line}
          style={[styles.gridLine, { top: paddingY + (usableHeight / 3) * line }]}
        />
      ))}

      {points.slice(0, -1).map((point, index) => {
        const nextPoint = points[index + 1];
        const deltaX = nextPoint.x - point.x;
        const deltaY = nextPoint.y - point.y;
        const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = `${Math.atan2(deltaY, deltaX)}rad`;

        return (
          <View
            key={`segment-${index}`}
            style={[
              styles.segment,
              {
                left: point.x + deltaX / 2,
                top: point.y + deltaY / 2,
                width: length,
                transform: [{ translateX: -length / 2 }, { rotate: angle }],
              },
            ]}
          />
        );
      })}

      {points.map((point, index) => (
        <View key={`point-${index}`} style={[styles.point, { left: point.x - 4, top: point.y - 4 }]} />
      ))}

      <View style={styles.labelsRow}>
        {values.map((_, index) => (
          <Text key={`label-${index}`} style={styles.label}>
            S{index + 1}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrap: {
    width: chartWidth,
    height: chartHeight + 16,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: paddingX,
    right: paddingX,
    height: 1,
    backgroundColor: '#DDE3F3',
  },
  segment: {
    position: 'absolute',
    height: 2,
    borderRadius: 999,
    backgroundColor: instructorPalette.primary,
  },
  point: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: instructorPalette.secondary,
  },
  labelsRow: {
    position: 'absolute',
    bottom: 0,
    left: 4,
    right: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 10,
  },
});
