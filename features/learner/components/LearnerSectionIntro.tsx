import { StyleSheet, Text, View } from 'react-native';
import { learnerPalette } from '@/features/learner/theme';

type LearnerSectionIntroProps = {
  label: string;
  text: string;
  title: string;
};

export function LearnerSectionIntro({ label, text, title }: LearnerSectionIntroProps) {
  return (
    <View style={styles.heroCard}>
      <Text style={styles.heroLabel}>{label}</Text>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroText}>{text}</Text>
    </View>
  );
}

export function LearnerSectionIntroo({ label, text, title }: LearnerSectionIntroProps) {
  return (
    <View style={styles.heroCardd}>
      <Text style={styles.heroLabel}>{label}</Text>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: 'transparent',
    paddingHorizontal: 37,
    paddingVertical: 20,
    marginHorizontal: -30,
    shadowColor: learnerPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 8,
    marginBottom: -18,
  },
    heroCardd: {
    backgroundColor: learnerPalette.surface,
    paddingHorizontal: 37,
    paddingVertical: 20,
    marginHorizontal: -30,
    shadowColor: learnerPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 8,
  },
  heroLabel: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
    letterSpacing: 0.6,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: learnerPalette.dark,
    fontFamily: 'SulphurPointBold',
    fontSize: 28,
    lineHeight: 28,
    marginBottom: 6,
  },
  heroText: {
    color: learnerPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 10,
  },
});
