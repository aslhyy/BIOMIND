import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { learnerBitacoras, learnerCompetencies, learnerProjects } from '../data';
import { learnerPalette } from '@/features/learner/theme';
import { IconLabel, ProgressBar, SectionHeading, StatusBadge } from '@/features/learner/components/LearnerUI';
import { LearnerTrendChart } from './LearnerTrendChart';
import { LearnerSectionIntroo } from './LearnerSectionIntro';

export function LearnerProjectsTab({
  onOpenAssistant,
}: {
  onOpenAssistant: (projectId: string, autoStartVoice?: boolean) => void;
}) {
  const [selectedProjectId, setSelectedProjectId] = useState(learnerProjects[0]?.id || '');
  const currentProject = useMemo(
    () => learnerProjects.find((project) => project.id === selectedProjectId) || learnerProjects[0],
    [selectedProjectId]
  );

  const relatedBitacoras = learnerBitacoras.filter((entry) => entry.projectId === currentProject.id);

  return (
    <>
      <LearnerSectionIntroo
        label="Gestión de cultivos"
        text="Consulta el estado de cada cultivo, registra avances por voz y abre el chat IA del proyecto seleccionado."
        title="Seguimiento de proyectos y evidencias."
      />

      <SectionHeading
        actionLabel="Proyecto"
        subtitle="Detalle actual del cultivo, progreso y evidencias."
        title="Historial de proyectos"
      />

      <View style={styles.selectorRow}>
        {learnerProjects.map((project) => (
          <Pressable
            key={project.id}
            onPress={() => setSelectedProjectId(project.id)}
            style={[styles.selectorChip, project.id === currentProject.id && styles.selectorChipActive]}>
            <Text
              style={[
                styles.selectorChipText,
                project.id === currentProject.id && styles.selectorChipTextActive,
              ]}>
              {project.species}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.projectCard}>
        <View style={styles.projectHeader}>
          <View style={styles.projectIcon}>
            <MaterialCommunityIcons name="sprout-outline" size={18} color={learnerPalette.primary} />
          </View>
          <View style={styles.projectCopy}>
            <Text style={styles.projectTitle}>
              {currentProject.title} - {currentProject.species}
            </Text>
            <Text style={styles.projectSubtitle}>{currentProject.status}</Text>
          </View>
          <Text style={styles.percent}>{currentProject.progress}%</Text>
        </View>

        <ProgressBar accent={learnerPalette.primary} progress={currentProject.progress} soft="#EAF6F3" />

        <View style={styles.chartWrap}>
          <LearnerTrendChart values={currentProject.trend} />
        </View>

        <View style={styles.statusRow}>
          <StatusBadge accent={learnerPalette.aqua} label={currentProject.status} soft="#eaeaea" />
          <StatusBadge accent={learnerPalette.blueText} label={`${currentProject.evidenceCount} evidencias`} soft="#eaeaea" />
        </View>

        <View style={styles.metaStack}>
          <IconLabel icon="calendar-clock-outline" text={currentProject.weekLabel} />
          <IconLabel icon="account-tie-outline" text={`Instructor ${currentProject.instructor}`} />
          <IconLabel icon="file-document-outline" text={`Guía: ${currentProject.guideName}`} />
        </View>

        <View style={styles.projectActionRow}>
          <Pressable onPress={() => onOpenAssistant(currentProject.id, true)} style={styles.primaryAction}>
            <Text style={styles.primaryActionText}>Registrar por voz</Text>
          </Pressable>
          <Pressable onPress={() => onOpenAssistant(currentProject.id)} style={styles.secondaryAction}>
            <Text style={styles.secondaryActionText}>Abrir chat IA</Text>
          </Pressable>
        </View>
      </View>

      <SectionHeading
        actionLabel="Bitácoras"
        subtitle="Historial de bitácoras y avances del proyecto."
        title="Registros"
      />

      <View style={styles.stack}>
        {relatedBitacoras.map((item) => (
          <View key={item.id} style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <View style={styles.historyCopy}>
                <Text style={styles.historyTitle}>{item.title}</Text>
                <Text style={styles.historyDate}>{item.date}</Text>
              </View>
              <StatusBadge
                accent={
                  item.status === 'Aprobada'
                    ? learnerPalette.aqua
                    : item.status === 'Enviada'
                      ? learnerPalette.progress
                      : '#EAA189'
                }
                label={item.status}
                soft={
                  item.status === 'Aprobada'
                    ? '#EAFBF7'
                    : item.status === 'Enviada'
                      ? '#E7F8E6'
                      : '#FFF1EB'
                }
              />
            </View>
            <Text style={styles.historyText}>{item.detail}</Text>
          </View>
        ))}
      </View>

      <SectionHeading
        actionLabel="RAP"
        subtitle="Competencias y resultados asociados a tus proyectos."
        title="Avance académico"
      />

      <View style={styles.stack}>
        {learnerCompetencies.map((competency, index) => (
          <View key={competency.id} style={styles.academicCard}>
            <View style={styles.academicHeader}>
              <View style={styles.academicIcon}>
                <MaterialCommunityIcons name="book-check-outline" size={18} color={learnerPalette.primary} />
              </View>
              <View style={styles.academicCopy}>
                <Text style={styles.historyTitle}>{competency.competency}</Text>
                <Text style={styles.historyDate}>{competency.evidence} - {competency.ficha}</Text>
              </View>
              <StatusBadge
                accent={index === 0 ? learnerPalette.aqua : competency.status === 'Activa' ? learnerPalette.progress : '#EAA189'}
                label={index === 0 ? 'Aprobado' : competency.status}
                soft={index === 0 ? '#EAFBF7' : competency.status === 'Activa' ? '#E7F8E6' : '#FFF1EB'}
              />
            </View>
            <ProgressBar
              accent={index === 0 ? learnerPalette.aqua : learnerPalette.primary}
              progress={index === 0 ? 100 : index === 1 ? 64 : 78}
              soft="#EAF6F3"
            />
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  selectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  selectorChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: learnerPalette.mint,
  },
  selectorChipActive: {
    backgroundColor: learnerPalette.greenText,
  },
  selectorChipText: {
    color: learnerPalette.progress,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
  },
  selectorChipTextActive: {
    color: learnerPalette.surface,
  },
  projectCard: {
    backgroundColor: learnerPalette.surface,
    borderRadius: 24,
    padding: 16,
    shadowColor: learnerPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 12,
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  projectIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: learnerPalette.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectCopy: {
    flex: 1,
    gap: 2,
  },
  projectTitle: {
    color: learnerPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
    lineHeight: 20,
  },
  projectSubtitle: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
  },
  percent: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  chartWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: 6,
  },
  metaStack: {
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  projectActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  primaryAction: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: learnerPalette.primary,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  secondaryAction: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: learnerPalette.surfaceMuted,
  },
  secondaryActionText: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  stack: {
    gap: 12,
  },
  historyCard: {
    backgroundColor: learnerPalette.surface,
    borderRadius: 22,
    padding: 16,
    shadowColor: learnerPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 6,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  historyCopy: {
    flex: 1,
    gap: 2,
  },
  historyTitle: {
    color: learnerPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  historyDate: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsMedium',
    fontSize: 11,
  },
  historyText: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  academicCard: {
    backgroundColor: learnerPalette.surface,
    borderRadius: 22,
    padding: 16,
    shadowColor: learnerPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 12,
  },
  academicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  academicIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: learnerPalette.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  academicCopy: {
    flex: 1,
    gap: 2,
  },
});
