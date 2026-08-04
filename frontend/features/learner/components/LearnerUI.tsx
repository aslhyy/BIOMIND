import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { IconName } from '../../instructor/data';
import { learnerPalette } from '../theme';

export function SectionHeading({
  actionLabel,
  subtitle,
  title,
}: {
  actionLabel: string;
  subtitle: string;
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.sectionAction}>{actionLabel}</Text>
    </View>
  );
}

export function SectionTitle({
  title,
}: {
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
    </View>
  );
}

export function ProgressBar({
  accent,
  progress,
  soft,
}: {
  accent: string;
  progress: number;
  soft: string;
}) {
  return (
    <View style={[styles.progressTrack, { backgroundColor: soft }]}>
      <View style={[styles.progressFill, { backgroundColor: accent, width: `${Math.min(progress, 100)}%` }]} />
    </View>
  );
}

export function StatusBadge({
  accent,
  label,
  soft,
}: {
  accent: string;
  label: string;
  soft?: string;
}) {
  return (
    <View style={[styles.statusBadge, { backgroundColor: soft || `${accent}1F` }]}>
      <Text style={[styles.statusBadgeText, { color: accent }]}>{label}</Text>
    </View>
  );
}

export function IconLabel({
  icon,
  text,
}: {
  icon: IconName;
  text: string;
}) {
  return (
    <View style={styles.iconLabel}>
      <MaterialCommunityIcons name={icon} size={14} color={learnerPalette.textMuted} />
      <Text style={styles.iconLabelText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 14,
  },
  sectionCopy: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    color: learnerPalette.learner,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.7,
  },
  sectionSubtitle: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsLight',
    fontStyle: 'italic',
    fontSize: 13,
    maxWidth: 300,
    lineHeight: 18,
  },
  sectionAction: {
    color: learnerPalette.greenText,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
    lineHeight: 18,
  },
  progressTrack: {
    width: '100%',
    height: 11,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadgeText: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  iconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconLabelText: {
    flex: 1,
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
});
