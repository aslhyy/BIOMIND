import { CurrentTrimesterSummary } from '@/features/workspace/components/CurrentTrimesterSummary';
import type { AuthenticatedSession } from '@/features/workspace/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
// @ts-ignore
import { escucharContextoAcademicoUsuario, escucharProyectos } from '@/services/academic';
// @ts-ignore
import { escucharBitacoras } from '@/services/bitacoras';

type RealSheet = {
  id: string;
  numero?: string;
  programaNombre?: string;
  trimestreActual?: string;
};

type RealLearner = {
  id: string;
  fichaId?: string | null;
};

type RealProject = {
  id: string;
  titulo?: string;
  fichaId?: string;
  fichaNumero?: string;
  competenciaNombre?: string;
  estado?: string;
  progreso?: number;
  instructorUid?: string;
};

type RealBitacora = {
  id: string;
  proyectoId?: string;
  estado?: string;
};

export function InstructorHomeTab({
  session,
  onOpenChatChannel,
}: {
  session: AuthenticatedSession;
  onOpenChatChannel: (channel: 'admin' | 'pasante') => void;
}) {
  const [realSheets, setRealSheets] = useState<RealSheet[]>([]);
  const [realLearners, setRealLearners] = useState<RealLearner[]>([]);
  const [realProjects, setRealProjects] = useState<RealProject[]>([]);
  const [realBitacoras, setRealBitacoras] = useState<RealBitacora[]>([]);
  const [realError, setRealError] = useState('');

  useEffect(() => {
    const handleError = (error: any) =>
      setRealError(error?.message || 'No pudimos cargar el resumen real.');
    const unsubscribeContext = escucharContextoAcademicoUsuario(
      session,
      (context: any) => {
        setRealSheets(context.fichas || []);
        setRealLearners(context.aprendices || []);
      },
      handleError
    );
    const unsubscribeProjects = escucharProyectos(
      (items: RealProject[]) => setRealProjects(items.filter((project) => project.instructorUid === session.uid)),
      handleError
    );
    const unsubscribeBitacoras = escucharBitacoras(setRealBitacoras, handleError);

    return () => {
      unsubscribeContext?.();
      unsubscribeProjects?.();
      unsubscribeBitacoras?.();
    };
  }, [session]);

  const realProjectIds = useMemo(() => new Set(realProjects.map((project) => project.id)), [realProjects]);
  const instructorBitacoras = useMemo(
    () => realBitacoras.filter((bitacora) => realProjectIds.has(bitacora.proyectoId || '')),
    [realBitacoras, realProjectIds]
  );
  const pendingBitacoras = instructorBitacoras.filter((bitacora) =>
    !['Aprobada', 'Rechazada', 'Correccion'].includes(bitacora.estado || '')
  ).length;
  const approvedProjects = realProjects.filter((project) => project.estado === 'Aprobado').length;
  const averageProgress = realProjects.length
    ? Math.round(realProjects.reduce((sum, project) => sum + Number(project.progreso || 0), 0) / realProjects.length)
    : 0;
  const realMetrics: InstructorMetric[] = realSheets.length || realProjects.length || instructorBitacoras.length
    ? [
      {
        id: 'real-sheets',
        label: 'Fichas asignadas',
        value: String(realSheets.length),
        caption: `${realLearners.length} aprendices vinculados`,
        icon: 'school-outline',
        accent: instructorPalette.primary,
        soft: instructorPalette.mint,
      },
      {
        id: 'real-projects',
        label: 'Proyectos activos',
        value: String(realProjects.length),
        caption: `${approvedProjects} aprobados`,
        icon: 'briefcase-check-outline',
        accent: instructorPalette.green,
        soft: instructorPalette.softGreen,
      },
      {
        id: 'real-bitacoras',
        label: 'Bitácoras pendientes',
        value: String(pendingBitacoras),
        caption: `${averageProgress}% avance promedio`,
        icon: 'notebook-check-outline',
        accent: '#EAA189',
        soft: instructorPalette.peachSurface,
      },
    ]
    : instructorMetrics;
  const realSheetOverviews = realSheets.length
    ? realSheets.map((sheet) => {
      const sheetProjects = realProjects.filter((project) => project.fichaId === sheet.id);
      const sheetLearners = realLearners.filter((learner) => learner.fichaId === sheet.id);
      const progress = sheetProjects.length
        ? Math.round(sheetProjects.reduce((sum, project) => sum + Number(project.progreso || 0), 0) / sheetProjects.length)
        : 0;

      return {
        id: sheet.id,
        code: sheet.numero || sheet.id,
        program: sheet.programaNombre || 'Sin programa',
        trimester: sheet.trimestreActual || 'Sin trimestre',
        learners: sheetLearners.length,
        activeProjects: sheetProjects.length,
        competencies: Array.from(new Set(sheetProjects.map((project) => project.competenciaNombre).filter(Boolean))),
        progress,
      };
    })
    : sheetOverviews;
  const realProjectSnapshots: ProjectSnapshot[] = realProjects.length
    ? realProjects.slice(0, 4).map((project) => {
      const logs = instructorBitacoras.filter((bitacora) => bitacora.proyectoId === project.id);

      return {
        id: project.id,
        title: project.titulo || 'Proyecto sin nombre',
        species: project.fichaNumero ? `Ficha ${project.fichaNumero}` : 'Sin ficha',
        stage: project.competenciaNombre || project.estado || 'Seguimiento académico',
        progress: Number(project.progreso || 0),
        contamination: logs.length ? `${logs.length} bitácoras registradas` : 'Sin bitácoras',
        photos: logs.length,
        inventory: project.estado || 'Pendiente',
        icon: 'sprout-outline',
        accent: project.estado === 'Aprobado' ? instructorPalette.primary : instructorPalette.secondary,
        soft: project.estado === 'Aprobado' ? instructorPalette.mint : instructorPalette.softGreen,
      };
    })
    : projectSnapshots;
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
  const rapSummary = [
    { id: 'approved', label: 'RAP aprobados', value: 8, progress: 72, accent: instructorPalette.primary, soft: instructorPalette.mint },
    { id: 'process', label: 'RAP en proceso', value: 5, progress: 45, accent: instructorPalette.secondary, soft: instructorPalette.softGreen },
    { id: 'pending', label: 'RAP pendientes', value: 3, progress: 25, accent: '#EAA189', soft: instructorPalette.peachSurface },
  ];
  const communicationChannels = [
    {
      id: 'admin',
      title: 'Administrador',
      detail: 'Solicita ajustes de fichas, asignaciones, permisos o novedades institucionales.',
      icon: 'shield-account-outline' as const,
      accent: instructorPalette.primary,
      status: 'Canal separado',
    },
    {
      id: 'pasante',
      title: 'Pasante',
      detail: 'Coordina observaciones de laboratorio, preguntas escaladas y reportes de práctica.',
      icon: 'account-tie-outline' as const,
      accent: instructorPalette.secondary,
      status: 'Canal separado',
    },
  ];

  return (
    <>
      <View style={styles.startCard}>
        <View style={styles.dashboardHeroTop}>
          <View style={styles.dashboardIcon}>
            <MaterialCommunityIcons name="leaf-circle-outline" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.dashboardCopy}>
            <Text style={styles.dashboardEyebrow}>Panel del instructor</Text>
            <Text style={styles.dashboardTitle}>Seguimiento académico</Text>
            <Text style={styles.dashboardText}>Fichas, proyectos y bitácoras listos para revisar.</Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          {realMetrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </View>
        {realError ? <Text style={styles.errorText}>{realError}</Text> : null}
      </View>

      <View style={styles.compactPanel}>
        <SectionHeading
          actionLabel={`${realSheetOverviews.length} fichas`}
          subtitle="Cada ficha muestra su trimestre, aprendices y avance."
          title="Fichas a cargo"
        />
        <View style={styles.sheetGrid}>
          {realSheetOverviews.slice(0, 4).map((sheet) => (
            <View key={sheet.id} style={styles.sheetCardCompact}>
              <Text style={styles.sheetCode}>Ficha {sheet.code}</Text>
              <Text style={styles.sheetMeta}>{sheet.program}</Text>
              <Text style={styles.sheetTrimester}>{sheet.trimester}</Text>
              <ProgressBar accent={instructorPalette.primary} progress={sheet.progress} soft="#EAF6F3" />
              <View style={styles.compactMetaRow}>
                <IconLabel icon="account-multiple-outline" text={`${sheet.learners} aprendices`} />
                <IconLabel icon="briefcase-outline" text={`${sheet.activeProjects} proyectos`} />
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.compactPanel}>
        <SectionHeading
          actionLabel={`${realProjects.length} total`}
          subtitle="Resumen rápido; el detalle está en Gestión académica."
          title="Proyectos recientes"
        />
        <View style={styles.stack}>
          {realProjectSnapshots.slice(0, 3).map((project) => (
            <ProjectRow key={project.id} project={project} />
          ))}
        </View>
      </View>

      <View style={styles.dashboardHidden}>
      <CurrentTrimesterSummary
        colors={{
          accent: instructorPalette.primary,
          background: instructorPalette.surface,
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
        {realSheetOverviews.map((sheet) => (
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
        {realProjectSnapshots.map((project) => (
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
      <View style={styles.rapGrid}>
        {rapSummary.map((item) => (
          <View key={item.id} style={[styles.rapCard, { backgroundColor: item.soft }]}>
            <View style={styles.rapHeader}>
              <Text style={[styles.rapValue, { color: item.accent }]}>{item.value}</Text>
              <StatusBadge accent={item.accent} label={`${item.progress}%`} soft="#FFFFFFAA" />
            </View>
            <Text style={styles.rapLabel}>{item.label}</Text>
            <ProgressBar accent={item.accent} progress={item.progress} soft="#FFFFFF" />
          </View>
        ))}
      </View>
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
        actionLabel="Mensajes"
        subtitle="Comunicación diferenciada para no mezclar gestión académica y acompañamiento técnico."
        title="Canales del instructor"
      />
      <View style={styles.stack}>
        {communicationChannels.map((channel) => (
          <Pressable
            key={channel.id}
            onPress={() => onOpenChatChannel(channel.id as 'admin' | 'pasante')}
            style={styles.channelCard}
          >
            <View style={[styles.channelIcon, { backgroundColor: `${channel.accent}22` }]}>
              <MaterialCommunityIcons name={channel.icon} size={19} color={channel.accent} />
            </View>
            <View style={styles.alertCopy}>
              <View style={styles.alertHeader}>
                <Text style={styles.alertTitle}>Hablar con {channel.title}</Text>
                <StatusBadge accent={channel.accent} label={channel.status} soft={`${channel.accent}1F`} />
              </View>
              <Text style={styles.alertText}>{channel.detail}</Text>
            </View>
          </Pressable>
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
      </View>
    </>
  );
}

function MetricCard({ metric }: { metric: InstructorMetric }) {
  return (
    <View style={[styles.metricCard, { backgroundColor: metric.soft }]}>
      <View style={[styles.metricIcon, { backgroundColor: metric.accent }]}>
        <MaterialCommunityIcons name={metric.icon} size={18} color={instructorPalette.surfaceHover} />
      </View>
      <Text style={[styles.metricValue, { color: metric.accent }, metric.valueStyle]}>{metric.value}</Text>
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
    gap: 15,
    marginHorizontal: -30,
    paddingBottom: 22,
    paddingHorizontal: 31,
    paddingTop: 28,
  },
  dashboardHeroTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 13,
  },
  dashboardIcon: {
    alignItems: 'center',
    backgroundColor: instructorPalette.primary,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  dashboardCopy: {
    flex: 1,
    gap: 2,
  },
  dashboardEyebrow: {
    color: instructorPalette.secondary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dashboardTitle: {
    color: instructorPalette.dark,
    fontFamily: 'SulphurPointBold',
    fontSize: 27,
    lineHeight: 28,
  },
  dashboardText: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
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
  dashboardHidden: {
    display: 'none',
  },
  compactPanel: {
    backgroundColor: 'transparent',
    gap: 14,
    paddingVertical: 2,
  },
  compactHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  compactHeaderCopy: {
    flex: 1,
    gap: 3,
  },
  compactTitle: {
    color: instructorPalette.primary,
    fontFamily: 'SulphurPointBold',
    fontSize: 25,
    lineHeight: 27,
  },
  compactSubtitle: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    lineHeight: 19,
  },
  sheetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sheetCardCompact: {
    backgroundColor: instructorPalette.surface,
    borderRadius: 28,
    elevation: 3,
    flexBasis: '47%',
    flexGrow: 1,
    gap: 10,
    minWidth: 150,
    padding: 25,
    shadowColor: instructorPalette.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  sheetTrimester: {
    color: instructorPalette.secondary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  compactMetaRow: {
    gap: 7,
  },
  sheetCard: {
    backgroundColor: instructorPalette.surface,
    borderRadius: 34,
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
    fontSize: 11,
  },
  sheetFooter: {
    gap: 8,
  },
  projectRow: {
    backgroundColor: instructorPalette.surface,
    borderRadius: 26,
    padding: 20,
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
  rapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  rapCard: {
    borderRadius: 22,
    flexBasis: '31%',
    flexGrow: 1,
    gap: 9,
    minWidth: 106,
    padding: 14,
  },
  rapHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  rapValue: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 22,
  },
  rapLabel: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsMedium',
    fontSize: 11,
    lineHeight: 16,
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
  channelCard: {
    alignItems: 'flex-start',
    backgroundColor: instructorPalette.surface,
    borderColor: instructorPalette.border,
    borderRadius: 22,
    borderWidth: 1,
    elevation: 3,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    shadowColor: instructorPalette.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  channelIcon: {
    alignItems: 'center',
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
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
  errorText: {
    color: '#C97B63',
    fontFamily: 'PoppinsMedium',
    fontSize: 11,
    lineHeight: 16,
  },
});
