import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  learnerCompetencies,
  learnerProjects,
  learnerQuestionThreads,
  type LearnerProject,
} from '../data';

import { learnerPalette } from '@/features/learner/theme';
import {
  IconLabel,
  ProgressBar,
  SectionHeading,
  SectionTitle,
  StatusBadge,
} from '@/features/learner/components/LearnerUI';

import { LearnerTrendChart } from './LearnerTrendChart';

export function LearnerHomeTab({
  onOpenAssistant,
}: {
  onOpenAssistant: (projectId: string, autoStartVoice?: boolean) => void;
}) {
  const highlightedProject = learnerProjects[0];
  const totalEvidence = learnerProjects.reduce((total, project) => total + project.evidenceCount, 0);
  const averageProgress = Math.round(
    learnerProjects.reduce((total, project) => total + project.progress, 0) / learnerProjects.length,
  );
  const summaryMetrics = [
    {
      id: 'projects',
      icon: 'briefcase-outline' as const,
      value: learnerProjects.length,
      label: 'Proyectos',
      caption: 'Activos en ficha',
      accent: learnerPalette.blueText,
      soft: learnerPalette.blue,
    },
    {
      id: 'evidence',
      icon: 'camera-outline' as const,
      value: totalEvidence,
      label: 'Evidencias',
      caption: 'Subidas al historial',
      accent: learnerPalette.goldText,
      soft: learnerPalette.gold,
    },
    {
      id: 'progress',
      icon: 'chart-line' as const,
      value: `${averageProgress}%`,
      label: 'Avance',
      caption: 'Promedio actual',
      accent: '#EAA189',
      soft: learnerPalette.peachSurface,
    },
  ];

  return (
    <>
      <View style={styles.startCard}>
        <SectionTitle title="Resumen del aprendizaje" />

        <View style={styles.metricsRow}>
          {summaryMetrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </View>
      </View>

      <SectionHeading
        actionLabel="Hoy"
        subtitle="Resumen rápido del proyecto que estás observando."
        title="Último proyecto en observación"
      />

      <View style={styles.highlightCard}>
        <View style={styles.highlightHeader}>
          <View style={styles.highlightIcon}>
            <MaterialCommunityIcons
              name="sprout-outline"
              size={22}
              color={learnerPalette.brown}
            />
          </View>

          <View style={styles.highlightCopy}>
            <Text style={styles.projectName}>
              {highlightedProject.title} - {highlightedProject.species}
            </Text>

            <Text style={styles.projectMeta}>
              {highlightedProject.ficha} - {highlightedProject.trimester}
            </Text>

            <Text style={styles.projectMeta}>
              Instructor: {highlightedProject.instructor}
            </Text>
          </View>
        </View>

        <View style={styles.chartWrap}>
          <LearnerTrendChart values={highlightedProject.trend} />
        </View>

        <View style={styles.highlightFooterOne}>
          <StatusBadge
            accent={learnerPalette.primary}
            label={`${highlightedProject.progress}%`}
            soft="#ebebeb99"
          />

          <StatusBadge
            accent={learnerPalette.learner}
            label={highlightedProject.assistantMode}
            soft="#ebebeb99"
          />
        </View>
      </View>

      <SectionHeading
        actionLabel="Activos"
        subtitle="El microfono te lleva al chat IA y activa el dictado del proyecto."
        title="Proyectos activos"
      />

      <View style={styles.projectGrid}>
        {learnerProjects.slice(0, 3).map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onOpenAssistant={onOpenAssistant}
          />
        ))}
      </View>

      <SectionHeading
        actionLabel="Competencias"
        subtitle="Esto es lo que tus instructores están evaluando actualmente."
        title="Evaluación activa"
      />

      <View style={styles.stack}>
        {learnerCompetencies.map((competency) => (
          <View key={competency.id} style={styles.competencyCard}>
            <Text style={styles.competencyTitle}>
              {competency.competency}
            </Text>

            <Text style={styles.competencyMeta}>
              {competency.instructor} - {competency.evidence}
            </Text>

            <View style={styles.highlightFooter}>
              <StatusBadge
                accent={
                  competency.status === 'Activa'
                    ? learnerPalette.blueText
                    : '#EAA189'
                }
                label={competency.status}
                soft={
                  competency.status === 'Activa'
                    ? '#DDF7F1'
                    : '#FFF1EB'
                }
              />
            </View>
          </View>
        ))}
      </View>

      <SectionHeading
        actionLabel="Instructor"
        subtitle="Preguntas recientes que debes responder o complementar."
        title="Observaciones generales"
      />

      <View style={styles.stack}>
        {learnerQuestionThreads.map((thread) => (
          <View key={thread.id} style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <View style={styles.questionIcon}>
                <MaterialCommunityIcons
                  name="message-text-outline"
                  size={20}
                  color={learnerPalette.brown}
                />
              </View>

              <Text style={styles.questionInstructor}>
                {thread.instructor}
              </Text>
            </View>

            <Text style={styles.questionText}>
              {thread.question}
            </Text>

            <Text style={styles.answerText}>
              {thread.answer}
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}

function ProjectCard({
  onOpenAssistant,
  project,
}: {
  onOpenAssistant: (
    projectId: string,
    autoStartVoice?: boolean,
  ) => void;
  project: LearnerProject;
}) {
  return (
    <View style={styles.projectCard}>
      <View style={styles.projectHeader}>
        <View style={styles.projectIcon}>
          <MaterialCommunityIcons name="sprout-outline" size={18} color={learnerPalette.primary} />
        </View>

        <View style={styles.projectCopy}>
          <Text style={styles.projectTitle}>
            {project.title} - {project.species}
          </Text>
          <Text style={styles.projectSubtitle}>{project.status}</Text>
        </View>

        <Pressable onPress={() => onOpenAssistant(project.id, true)} style={styles.projectMic}>
          <MaterialCommunityIcons name="microphone-outline" size={16} color="#ffffff" />
        </Pressable>
      </View>

      <ProgressBar accent={learnerPalette.progress} progress={project.progress} soft="#d3ded3ae" />

      <View style={styles.highlightFooter}>
        <StatusBadge accent={learnerPalette.blueText} label={`${project.progress}%`} soft="#DDF7F1" />
        <StatusBadge accent={learnerPalette.text} label={project.assistantMode} soft="#f0f0f0" />
      </View>

      <View style={styles.projectMetaStack}>
        <IconLabel icon="clock-outline" text={`Último registro: ${project.lastRecord}`} />
        <IconLabel icon="file-document-outline" text={`Guía: ${project.guideName}`} />
      </View>
    </View>
  );
}

function MetricCard({
  metric,
}: {
  metric: {
    accent: string;
    caption: string;
    icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
    label: string;
    soft: string;
    value: number | string;
  };
}) {
  return (
    <View style={[styles.metricCard, { backgroundColor: metric.soft }]}>
      <View style={[styles.metricIcon, { backgroundColor: metric.accent }]}>
        <MaterialCommunityIcons name={metric.icon} size={18} color={learnerPalette.surface} />
      </View>
      <Text style={[styles.metricValue, { color: metric.accent }]}>{metric.value}</Text>
      <Text style={styles.metricLabel}>{metric.label}</Text>
      <Text style={styles.metricCaption}>{metric.caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  startCard: {
    backgroundColor: learnerPalette.surface,
    marginHorizontal: -30,
    paddingVertical: 20,
    paddingHorizontal: 26,
    gap: 16,
  },

  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },

  metricCard: {
    flexBasis: '31%',
    flexGrow: 1,
    minWidth: 102,
    borderRadius: 22,
    padding: 14,
    gap: 8,
  },

  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  metricValue: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 22,
  },

  metricLabel: {
    color: learnerPalette.text,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
  },

  metricCaption: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 16,
  },

  highlightCard: {
    backgroundColor: learnerPalette.surface,
    borderRadius: 24,
    padding: 18,
    shadowColor: learnerPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 16,
  },

  highlightHeader: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },

  highlightIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: learnerPalette.brownSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  highlightCopy: {
    flex: 1,
    gap: 2,
  },

  projectName: {
    color: learnerPalette.brown,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 16,
    lineHeight: 22,
  },

  projectMeta: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },

  chartWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },

  highlightFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  highlightFooterOne: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  projectGrid: {
    gap: 12,
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

  projectMic: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: learnerPalette.secondary,
  },

  projectMetaStack: {
    gap: 8,
  },

  stack: {
    gap: 12,
  },

  competencyCard: {
    backgroundColor: learnerPalette.surface,
    borderRadius: 24,
    padding: 16,
    shadowColor: learnerPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 8,
  },

  competencyTitle: {
    color: learnerPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
    lineHeight: 20,
  },

  competencyMeta: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },

  questionCard: {
    backgroundColor: learnerPalette.surface,
    borderRadius: 24,
    padding: 16,
    shadowColor: learnerPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 10,
  },

  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  questionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: learnerPalette.brownSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  questionInstructor: {
    color: learnerPalette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },

  questionText: {
    color: learnerPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },

  answerText: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
});
