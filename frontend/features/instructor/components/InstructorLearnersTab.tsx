import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  learnerDetails,
  learnerRoster,
  sheetOverviews,
  type LearnerDetail,
  type LearnerProgress,
  type LearnerStatus,
} from '../data';
import { instructorPalette } from '../theme';
import { IconLabel, ProgressBar, SectionHeading, StatusBadge } from './InstructorUI';
import { LearnerTrendChart } from '@/features/learner/components/LearnerTrendChart';

export type LearnerFilter = 'Todos' | LearnerStatus;

const learnerFilters: LearnerFilter[] = ['Todos', 'En riesgo', 'Estable', 'Destacado'];

export function InstructorLearnersTab({
  activeFilter,
  onFilterChange,
  roster,
}: {
  activeFilter: LearnerFilter;
  onFilterChange: (filter: LearnerFilter) => void;
  roster: LearnerProgress[];
}) {
  const [selectedLearnerId, setSelectedLearnerId] = useState(learnerDetails[0]?.id || '');
  const highlightedCount = learnerRoster.filter((learner) => learner.status === 'Destacado').length;
  const riskCount = learnerRoster.filter((learner) => learner.status === 'En riesgo').length;

  const selectedLearner = useMemo(
    () => learnerDetails.find((learner) => learner.id === selectedLearnerId) || learnerDetails[0],
    [selectedLearnerId]
  );

  return (
    <>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Gestión académica</Text>
        <Text style={styles.summaryTitle}>Aprendices, fichas y entregas.</Text>
        <Text style={styles.summaryText}>
          Desde aquí podrás visualizar el progreso individual, el avance general de cada ficha y las bitácoras por aprendiz.
        </Text>
        <View style={styles.summaryStats}>
          <MiniStat title="Destacados" value={String(highlightedCount)} />
          <MiniStatDanger title="En riesgo" value={String(riskCount)} />
          <MiniStatNormal title="Entregas hoy" value="14" />
        </View>
      </View>

      <SectionHeading
        actionLabel="Filtros"
        subtitle="Cambia rápidamente la vista según el estado del aprendiz."
        title="Seguimiento"
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {learnerFilters.map((filter) => {
          const isActive = filter === activeFilter;

          return (
            <Pressable
              key={filter}
              onPress={() => onFilterChange(filter)}
              style={[styles.filterChip, isActive && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{filter}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.stack}>
        {roster.map((learner) => (
          <Pressable key={learner.id} onPress={() => setSelectedLearnerId(learner.id)} style={styles.card}>
            <LearnerCard learner={learner} isActive={learner.id === selectedLearnerId} />
          </Pressable>
        ))}
      </View>

      {selectedLearner ? <LearnerDetailCard learner={selectedLearner} /> : null}

      <SectionHeading
        actionLabel="Fichas"
        subtitle="Resumen general por grupo ficha, trimestre y competencias activas."
        title="Avance por ficha"
      />
      <View style={styles.stack}>
        {sheetOverviews.map((sheet) => (
          <View key={sheet.id} style={styles.sheetCard}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetCode}>Ficha {sheet.code}</Text>
                <Text style={styles.sheetMeta}>
                  {sheet.program} - {sheet.trimester}
                </Text>
              </View>
              <Text style={styles.sheetValue}>{sheet.progress}%</Text>
            </View>
            <ProgressBar accent={instructorPalette.primary} progress={sheet.progress} soft="#EAF6F3" />
            <View style={styles.sheetFooter}>
              <IconLabel icon="account-group-outline" text={`${sheet.learners} aprendices`} />
              <IconLabel icon="book-check-outline" text={`${sheet.competencies.length} competencias`} />
            </View>
            <View style={styles.actionRow}>
              <ActionPill label="Crear" />
              <ActionPill label="Editar" />
              <ActionPill label="Eliminar" tone="danger" />
              <ActionPill label="Ver" />
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

function LearnerCard({ isActive, learner }: { isActive: boolean; learner: LearnerProgress }) {
  const statusColors: Record<LearnerStatus, { accent: string; soft: string }> = {
    Destacado: { accent: instructorPalette.green, soft: '#EEF8E9' },
    Estable: { accent: instructorPalette.primary, soft: '#EAFBF7' },
    'En riesgo': { accent: '#EAA189', soft: '#FFF1EB' },
  };

  const colors = statusColors[learner.status];

  return (
    <View style={[styles.innerCard, isActive && styles.innerCardActive]}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{learner.name.slice(0, 2).toUpperCase()}</Text>
        </View>

        <View style={styles.cardCopy}>
          <Text style={styles.name}>{learner.name}</Text>
          <Text style={styles.meta}>
            {learner.sheet} - {learner.project}
          </Text>
        </View>

        <StatusBadge accent={colors.accent} label={learner.status} soft={colors.soft} />
      </View>

      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>Avance del proyecto</Text>
        <Text style={styles.progressValue}>{learner.progress}%</Text>
      </View>
      <ProgressBar accent={colors.accent} progress={learner.progress} soft={colors.soft} />

      <View style={styles.metaList}>
        <IconLabel icon="check-decagram-outline" text={`${learner.deliveries} entregas`} />
        <IconLabel icon="clock-time-four-outline" text={learner.lastActivity} />
      </View>
    </View>
  );
}

function LearnerDetailCard({ learner }: { learner: LearnerDetail }) {
  return (
    <View style={styles.detailCard}>
      <View style={styles.detailHeader}>
        <View>
          <Text style={styles.detailTitle}>{learner.name}</Text>
          <Text style={styles.detailSubtitle}>
            {learner.sheet} - {learner.trimester}
          </Text>
        </View>
        <StatusBadge accent={instructorPalette.secondary} label={`${learner.deliveries} entregas`} soft="#EAFBF7" />
      </View>

      <View style={styles.chartWrap}>
        <LearnerTrendChart values={learner.trend} />
      </View>

      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>Competencias asignadas</Text>
        {learner.competencies.map((competency) => (
          <IconLabel key={competency} icon="book-check-outline" text={competency} />
        ))}
      </View>

      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>Bitácoras recientes</Text>
        {learner.bitacoras.map((bitacora) => (
          <View key={bitacora.id} style={styles.bitacoraCard}>
            <View style={styles.bitacoraHeader}>
              <Text style={styles.bitacoraTitle}>{bitacora.title}</Text>
              <StatusBadge
                accent={bitacora.status === 'Aprobada' ? instructorPalette.primary : '#EAA189'}
                label={bitacora.status}
                soft={bitacora.status === 'Aprobada' ? '#EAFBF7' : '#FFF1EB'}
              />
            </View>
            <Text style={styles.bitacoraDate}>{bitacora.date}</Text>
            <Text style={styles.bitacoraText}>{bitacora.detail}</Text>
          </View>
        ))}
      </View>

      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>Dudas y respuestas</Text>
        {learner.questions.map((question) => (
          <View key={question.id} style={styles.questionCard}>
            <Text style={styles.questionLabel}>Pregunta</Text>
            <Text style={styles.questionText}>{question.question}</Text>
            <Text style={styles.questionLabel}>Respuesta</Text>
            <Text style={styles.answerText}>{question.answer}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MiniStat({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniTitle}>{title}</Text>
    </View>
  );
}

function MiniStatDanger({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.miniDanger}>
      <Text style={styles.miniValueDanger}>{value}</Text>
      <Text style={styles.miniTitleDanger}>{title}</Text>
    </View>
  );
}

function MiniStatNormal({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.miniNormal}>
      <Text style={styles.miniValueNormal}>{value}</Text>
      <Text style={styles.miniTitleNormal}>{title}</Text>
    </View>
  );
}

function ActionPill({ label, tone = 'default' }: { label: string; tone?: 'default' | 'danger' }) {
  return (
    <View style={[styles.actionPill, tone === 'danger' && styles.actionPillDanger]}>
      <Text style={[styles.actionPillText, tone === 'danger' && styles.actionPillTextDanger]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: instructorPalette.surface,
    paddingHorizontal: 37,
    paddingVertical: 20,
    marginHorizontal: -30,
    shadowColor: instructorPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 8,
  },
  summaryLabel: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  summaryTitle: {
    color: instructorPalette.dark,
    fontFamily: 'SulphurPointBold',
    fontSize: 28,
    lineHeight: 28,
    marginBottom: 6,
  },
  summaryText: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 10,
  },
  summaryStats: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  miniStat: {
    minWidth: 88,
    backgroundColor: instructorPalette.surfaceMuted,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  miniDanger: {
    minWidth: 88,
    backgroundColor: instructorPalette.coral,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  miniNormal: {
    minWidth: 88,
    backgroundColor: instructorPalette.softGreen,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  miniValue: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 20,
  },
  miniTitle: {
    marginTop: 3,
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
  },
  miniValueDanger: {
    color: instructorPalette.coralText,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 20,
  },
  miniTitleDanger: {
    marginTop: 3,
    color: instructorPalette.coralText,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
  },

  miniValueNormal: {
    color: instructorPalette.green,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 20,
  },
  miniTitleNormal: {
    marginTop: 3,
    color: instructorPalette.green,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
  },
  filters: {
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: instructorPalette.surfaceMuted,
  },
  filterChipActive: {
    backgroundColor: instructorPalette.primary,
  },
  filterChipText: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
  },
  filterChipTextActive: {
    color: instructorPalette.surface,
  },
  stack: {
    gap: 12,
  },
  card: {
    borderRadius: 24,
  },
  innerCard: {
    backgroundColor: instructorPalette.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: instructorPalette.border,
    shadowColor: instructorPalette.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    gap: 12,
  },
  innerCardActive: {
    borderColor: instructorPalette.secondary,
    backgroundColor: '#FCFFFE',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: instructorPalette.secondary,
  },
  avatarText: {
    color: instructorPalette.surface,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
  },
  cardCopy: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
  },
  meta: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
  },
  progressValue: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  metaList: {
    gap: 8,
  },
  detailCard: {
    backgroundColor: instructorPalette.surface,
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: instructorPalette.border,
    shadowColor: instructorPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  detailTitle: {
    color: instructorPalette.primary,
    fontFamily: 'SulphurPointBold',
    fontSize: 30,
    lineHeight: 30,
  },
  detailSubtitle: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
  },
  chartWrap: {
    alignItems: 'center',
  },
  detailSection: {
    gap: 10,
  },
  detailSectionTitle: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  bitacoraCard: {
    backgroundColor: instructorPalette.surfaceMuted,
    borderRadius: 18,
    padding: 14,
    gap: 4,
  },
  bitacoraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
  },
  bitacoraTitle: {
    flex: 1,
    color: instructorPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  bitacoraDate: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
  },
  bitacoraText: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  questionCard: {
    backgroundColor: '#F4FBF9',
    borderRadius: 18,
    padding: 14,
    gap: 4,
  },
  questionLabel: {
    color: instructorPalette.secondary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  questionText: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  answerText: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  sheetCard: {
    backgroundColor: instructorPalette.surface,
    borderRadius: 24,
    padding: 16,
    shadowColor: instructorPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  sheetCode: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
  },
  sheetMeta: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
  },
  sheetValue: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  sheetFooter: {
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: instructorPalette.surfaceMuted,
  },
  actionPillDanger: {
    backgroundColor: '#FFF1EB',
  },
  actionPillText: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
  },
  actionPillTextDanger: {
    color: '#C97B63',
  },
});