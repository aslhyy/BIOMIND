import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import {
  instructorAlerts,
  instructorMetrics,
  projectSnapshots,
  quickActions,
  sheetOverviews,
  type AlertItem,
  type InstructorMetric,
  type ProjectSnapshot,
  type QuickAction,
} from '../data';
import { instructorPalette } from '../theme';
import { IconLabel, ProgressBar, SectionHeading, SectionTitle, StatusBadge } from './InstructorUI';
import { CurrentTrimesterSummary } from '@/features/workspace/components/CurrentTrimesterSummary';
import type { AuthenticatedSession } from '@/features/workspace/types';

export function InstructorHomeTab({ session }: { session: AuthenticatedSession }) {
  const validationItems = [
    {
      id: 'rap1',
      title: 'RAP: implementar trazabilidad del cultivo',
      detail: 'Ficha 3203082 - 14 aprendices en proceso, 6 listos para validar.',
      status: 'En revision',
      icon: 'clipboard-check-outline' as const,
      accent: instructorPalette.primary,
    },
    {
      id: 'rap2',
      title: 'Competencia: controlar condiciones de esterilidad',
      detail: 'Proyecto Fresas con evidencias fotograficas pendientes.',
      status: 'Pendiente',
      icon: 'shield-check-outline' as const,
      accent: '#EAA189',
    },
    {
      id: 'rap3',
      title: 'Proyecto Orquideas',
      detail: 'Aprobar o devolver entrega colaborativa del Equipo Alfa.',
      status: 'Aprobar',
      icon: 'briefcase-check-outline' as const,
      accent: instructorPalette.secondary,
    },
  ];

  return (
    <>
      <View style={styles.startCard}>
        <SectionTitle title="Resumen del laboratorio" />

        <View style={styles.metricsRow}>
          {instructorMetrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </View>
      </View>

      <CurrentTrimesterSummary
        colors={{
          accent: instructorPalette.primary,
          background: instructorPalette.surface,
          border: instructorPalette.border,
          iconBackground: instructorPalette.mint,
          muted: instructorPalette.textMuted,
          text: instructorPalette.text,
        }}
        session={session}
      />

      <SectionHeading
        actionLabel="Fichas"
        subtitle="Un panorama general de tus fichas a cargo y sus respectivos aprendices."
        title="Vista general de fichas"
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
              <StatusBadge accent={instructorPalette.secondary} label={`${sheet.learners} aprendices`} soft="#EAFBF7" />
            </View>
            <ProgressBar accent={instructorPalette.primary} progress={sheet.progress} soft="#EAF6F3" />
            <View style={styles.sheetFooter}>
              <IconLabel icon="briefcase-outline" text={`${sheet.activeProjects} proyectos activos`} />
              <IconLabel icon="book-check-outline" text={`${sheet.competencies.length} competencias`} />
            </View>
          </View>
        ))}
      </View>

      <SectionHeading
        actionLabel="Activos"
        subtitle="Seguimiento central de especies, crecimiento y trazabilidad."
        title="Proyectos activos"
      />
      <View style={styles.stack}>
        {projectSnapshots.map((project) => (
          <ProjectRow key={project.id} project={project} />
        ))}
      </View>

      <SectionHeading
        actionLabel=""
        subtitle="Atajos listos para conectar con backend despues."
        title="Acciones del instructor"
      />
      <View style={styles.quickActionsRow}>
        {quickActions.map((action) => (
          <QuickActionCard key={action.id} action={action} />
        ))}
      </View>

      <SectionHeading
        actionLabel="Validar"
        subtitle="Aprobacion de proyectos, RAP, competencias y evidencias."
        title="Validaciones académicas"
      />
      <View style={styles.stack}>
        {validationItems.map((item) => (
          <View key={item.id} style={styles.validationRow}>
            <View style={[styles.validationIcon, { backgroundColor: `${item.accent}22` }]}>
              <MaterialCommunityIcons name={item.icon} size={18} color={item.accent} />
            </View>
            <View style={styles.alertCopy}>
              <View style={styles.alertHeader}>
                <Text style={styles.alertTitle}>{item.title}</Text>
                <StatusBadge accent={item.accent} label={item.status} soft={`${item.accent}1F`} />
              </View>
              <Text style={styles.alertText}>{item.detail}</Text>
            </View>
          </View>
        ))}
      </View>

      <SectionHeading
        actionLabel="Alertas"
        subtitle="Incidencias para revisar antes del cierre del día."
        title="Prioridades"
      />
      <View style={styles.stack}>
        {instructorAlerts.map((alert) => (
          <AlertRow key={alert.id} alert={alert} />
        ))}
      </View>
    </>
  );
}

function MetricCard({ metric }: { metric: InstructorMetric }) {
  return (
    <View style={[styles.metricCard, { backgroundColor: metric.soft }]}>
      <View style={[styles.metricIcon, { backgroundColor: metric.accent }]}>
        <MaterialCommunityIcons name={metric.icon} size={18} color={instructorPalette.surface} />
      </View>
      <Text style={[styles.metricValue, metric.valueStyle]}>{metric.value}</Text>
      <Text style={styles.metricLabel}>{metric.label}</Text>
      <Text style={styles.metricCaption}>{metric.caption}</Text>
    </View>
  );
}

function ProjectRow({ project }: { project: ProjectSnapshot }) {
  return (
    <View style={styles.projectRow}>
      <View style={styles.projectHeader}>
        <View style={[styles.projectIcon, { backgroundColor: project.soft }]}>
          <MaterialCommunityIcons name={project.icon} size={18} color={project.accent} />
        </View>
        <View style={styles.projectCopy}>
          <Text style={styles.projectTitle}>
            {project.title} - {project.species}
          </Text>
          <Text style={styles.projectSubtitle}>{project.stage}</Text>
        </View>
        <Text style={styles.projectProgressValue}>{project.progress}%</Text>
      </View>

      <ProgressBar accent={project.accent} progress={project.progress} soft="#EAF6F3" />

      <View style={styles.projectMeta}>
        <IconLabel icon="alert-circle-outline" text={project.contamination} />
        <IconLabel icon="camera-outline" text={`${project.photos} fotos`} />
      </View>
    </View>
  );
}

function QuickActionCard({ action }: { action: QuickAction }) {
  return (
    <View style={[styles.quickActionCard, { backgroundColor: action.soft }]}>
      <View style={[styles.quickActionIcon, { backgroundColor: action.accent }]}>
        <MaterialCommunityIcons name={action.icon} size={18} color="#FFFFFF" />
      </View>
      <Text style={styles.quickActionTitle}>{action.title}</Text>
      <Text style={styles.quickActionText}>{action.detail}</Text>
    </View>
  );
}

function AlertRow({ alert }: { alert: AlertItem }) {
  return (
    <View style={styles.alertRow}>
      <View style={[styles.alertIcon, { backgroundColor: `${alert.accent}22` }]}>
        <MaterialCommunityIcons name={alert.icon} size={18} color={alert.accent} />
      </View>
      <View style={styles.alertCopy}>
        <View style={styles.alertHeader}>
          <Text style={styles.alertTitle}>{alert.title}</Text>
          <StatusBadge accent={alert.accent} label={alert.severity} />
        </View>
        <Text style={styles.alertText}>{alert.detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  startCard: {
    backgroundColor: instructorPalette.surface,
    marginHorizontal: -30,
    paddingVertical: 20,
    paddingHorizontal: 22,
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
    color: instructorPalette.secondary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 22,
    letterSpacing: -0.9,
  },
  metricLabel: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
  },
  metricCaption: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 16,
  },
  stack: {
    gap: 12,
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
    gap: 12,
    alignItems: 'center',
  },
  sheetCode: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 15,
  },
  sheetMeta: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
  },
  sheetFooter: {
    gap: 8,
  },
  projectRow: {
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
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  projectIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectCopy: {
    flex: 1,
    gap: 2,
  },
  projectTitle: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
  },
  projectSubtitle: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
  },
  projectProgressValue: {
    color: instructorPalette.secondary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  projectMeta: {
    gap: 8,
  },
  quickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    flexBasis: '31%',
    flexGrow: 1,
    minWidth: 104,
    borderRadius: 22,
    padding: 14,
    shadowColor: instructorPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 8,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionTitle: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  quickActionText: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 16,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: instructorPalette.surface,
    borderRadius: 22,
    padding: 16,
    shadowColor: instructorPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  validationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: instructorPalette.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: instructorPalette.border,
    shadowColor: instructorPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  validationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertCopy: {
    flex: 1,
    gap: 6,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  alertTitle: {
    flex: 1,
    color: instructorPalette.text,
    fontFamily: 'PoppinsMedium',
    fontSize: 13,
    lineHeight: 18,
  },
  alertText: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
});
