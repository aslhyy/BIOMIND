import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { learnerPalette } from '@/features/learner/theme';
import { ProgressBar, SectionHeading } from '@/features/learner/components/LearnerUI';
import { CurrentTrimesterSummary } from '@/features/workspace/components/CurrentTrimesterSummary';
import type { AuthenticatedSession } from '@/features/workspace/types';
// @ts-ignore
import { escucharContextoAcademicoUsuario, escucharGruposTrabajo, escucharProyectos } from '@/services/academic';
// @ts-ignore
import { escucharBitacorasAprendiz } from '@/services/bitacoras';

type RecordItem = { id: string; [key: string]: any };

type AcademicContext = {
  fichas: RecordItem[];
  asignaciones: RecordItem[];
  competencias: RecordItem[];
  resultados: RecordItem[];
  instructores: RecordItem[];
};

type Project = {
  id: string;
  titulo?: string;
  descripcion?: string;
  fichaId?: string;
  fichaNumero?: string;
  competenciaId?: string;
  competenciaNombre?: string;
  rapDescripcion?: string;
  instructorUid?: string;
  aprendizIds?: string[];
  grupoId?: string | null;
  estado?: string;
  progreso?: number;
  archivoNombre?: string | null;
  activo?: boolean;
  actualizadoEn?: any;
  creadoEn?: any;
};

type WorkGroup = {
  id: string;
  aprendizIds?: string[];
};

type Bitacora = {
  id: string;
  proyectoId?: string;
  fecha?: string;
  estado?: string;
  evidencias?: unknown[];
  observacion?: string;
  revisadoPorNombre?: string;
  revisadoPorRol?: string;
};

const emptyContext: AcademicContext = {
  fichas: [],
  asignaciones: [],
  competencias: [],
  resultados: [],
  instructores: [],
};

export function LearnerHomeTab({
  onOpenAssistant,
  session,
}: {
  onOpenAssistant: (projectId: string, autoStartVoice?: boolean) => void;
  session: AuthenticatedSession;
}) {
  const [context, setContext] = useState<AcademicContext>(emptyContext);
  const [projects, setProjects] = useState<Project[]>([]);
  const [groups, setGroups] = useState<WorkGroup[]>([]);
  const [bitacoras, setBitacoras] = useState<Bitacora[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleError = (nextError: any) =>
      setError(nextError?.message || 'No pudimos cargar el resumen del aprendiz.');

    const unsubscribeContext = escucharContextoAcademicoUsuario(
      session,
      (nextContext: AcademicContext) => {
        setContext(nextContext);
        setError('');
      },
      handleError
    );
    const unsubscribeProjects = escucharProyectos(setProjects, handleError);
    const unsubscribeGroups = escucharGruposTrabajo(setGroups, handleError);
    const unsubscribeBitacoras = escucharBitacorasAprendiz(session.uid, setBitacoras, handleError);

    return () => {
      unsubscribeContext?.();
      unsubscribeProjects?.();
      unsubscribeGroups?.();
      unsubscribeBitacoras?.();
    };
  }, [session]);

  const learnerGroupIds = useMemo(
    () => new Set(groups.filter((group) => (group.aprendizIds || []).includes(session.uid)).map((group) => group.id)),
    [groups, session.uid]
  );

  const assignedProjects = useMemo(
    () =>
      projects
        .filter((project) => {
          if (project.activo === false || project.estado === 'Inactivo') {
            return false;
          }
          return (project.aprendizIds || []).includes(session.uid)
            || Boolean(project.grupoId && learnerGroupIds.has(project.grupoId));
        })
        .sort((a, b) => getTimestamp(b) - getTimestamp(a)),
    [learnerGroupIds, projects, session.uid]
  );

  const instructorById = useMemo(
    () => new Map(context.instructores.map((instructor) => [instructor.id, instructor])),
    [context.instructores]
  );

  const bitacorasByProject = useMemo(() => {
    const grouped = new Map<string, Bitacora[]>();
    bitacoras.forEach((bitacora) => {
      if (!bitacora.proyectoId) return;
      grouped.set(bitacora.proyectoId, [...(grouped.get(bitacora.proyectoId) || []), bitacora]);
    });
    return grouped;
  }, [bitacoras]);

  const totalEvidence = useMemo(
    () => bitacoras.reduce((total, bitacora) => total + (bitacora.evidencias?.length || 0), 0),
    [bitacoras]
  );

  const averageProgress = assignedProjects.length
    ? Math.round(
        assignedProjects.reduce((total, project) => total + normalizeProgress(project), 0)
        / assignedProjects.length
      )
    : 0;

  const reviewedBitacoras = bitacoras.filter((bitacora) =>
    ['Aprobada', 'Rechazada', 'Desaprobada', 'Correccion'].includes(bitacora.estado || '')
  );
  const highlightedProject = assignedProjects[0];
  const activeCompetencies = uniqueBy(
    assignedProjects.filter((project) => project.competenciaId),
    (project) => project.competenciaId || project.competenciaNombre || project.id
  );
  const recentObservations = bitacoras
    .filter((bitacora) => Boolean(bitacora.observacion))
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
    .slice(0, 3);

  const summaryMetrics = [
    {
      id: 'projects',
      icon: 'briefcase-outline' as const,
      value: assignedProjects.length,
      label: 'Proyectos',
      caption: 'Asignados actualmente',
      accent: learnerPalette.blueText,
      soft: learnerPalette.blue,
    },
    {
      id: 'evidence',
      icon: 'camera-outline' as const,
      value: totalEvidence,
      label: 'Evidencias',
      caption: `${bitacoras.length} bitácora(s)`,
      accent: learnerPalette.goldText,
      soft: learnerPalette.gold,
    },
    {
      id: 'reviewed',
      icon: 'clipboard-check-outline' as const,
      value: reviewedBitacoras.length,
      label: 'Revisadas',
      caption: `${averageProgress}% de avance`,
      accent: '#EAA189',
      soft: learnerPalette.peachSurface,
    },
  ];

  return (
    <>
      <View style={styles.panoramaCard}>
        <View style={styles.panoramaHeader}>
          <View>
            <Text style={styles.panoramaEyebrow}>TU PANORAMA</Text>
            <Text style={styles.panoramaTitle}>Resumen académico</Text>
          </View>
          <View style={styles.panoramaIcon}>
            <MaterialCommunityIcons name="chart-donut" size={23} color={learnerPalette.primary} />
          </View>
        </View>

        <AcademicIdentity context={context} session={session} />

        <View style={styles.metricsRow}>
          {summaryMetrics.map((metric) => <MetricCard key={metric.id} metric={metric} />)}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <CurrentTrimesterSummary
        colors={{
          accent: learnerPalette.primary,
          background: learnerPalette.surface,
          border: learnerPalette.border,
          iconBackground: learnerPalette.softGreen,
          muted: learnerPalette.textMuted,
          text: learnerPalette.text,
        }}
        session={session}
      />

      {highlightedProject ? (
        <View style={styles.highlightCard}>
          <View style={styles.featureHeader}>
            <View>
              <Text style={styles.featureEyebrow}>PROYECTO DESTACADO</Text>
              <Text style={styles.featureTitle}>Continúa tu avance</Text>
            </View>
            <ProjectStatus status={highlightedProject.estado} />
          </View>
          <ProjectHeader
            instructorName={getInstructorName(highlightedProject, instructorById)}
            project={highlightedProject}
          />
          <Text style={styles.projectDescription}>
            {highlightedProject.descripcion || 'El instructor no agregó una descripción.'}
          </Text>
          <ProgressBar
            accent={learnerPalette.progress}
            progress={normalizeProgress(highlightedProject)}
            soft="#DDE8DD"
          />
          <View style={styles.statusRow}>
            <Text style={styles.progressLabel}>{normalizeProgress(highlightedProject)}% completado</Text>
            <Text style={styles.smallMeta}>
              {bitacorasByProject.get(highlightedProject.id)?.length || 0} bitácora(s)
            </Text>
          </View>
        </View>
      ) : (
        <EmptyCard
          icon="briefcase-outline"
          title="No tienes proyectos asignados"
          text="Cuando un instructor te asigne un proyecto individual o grupal, aparecerá aquí."
        />
      )}

      <SectionHeading
        actionLabel={`${assignedProjects.length} activos`}
        subtitle="Acceso rápido a tus proyectos asignados."
        title="En curso"
      />

      <View style={styles.stack}>
        {assignedProjects.slice(0, 3).map((project) => (
          <ProjectCard
            key={project.id}
            instructorName={getInstructorName(project, instructorById)}
            project={project}
            bitacoraCount={bitacorasByProject.get(project.id)?.length || 0}
            onOpenAssistant={onOpenAssistant}
          />
        ))}
        {assignedProjects.length > 3 ? (
          <Text style={styles.moreText}>Hay {assignedProjects.length - 3} proyecto(s) más disponibles.</Text>
        ) : null}
      </View>

      <SectionHeading
        actionLabel="Actualizado"
        subtitle="Competencias y retroalimentación reunidas en un solo lugar."
        title="Actividad académica"
      />

      <AcademicActivity
        competencies={activeCompetencies}
        observations={recentObservations}
      />
    </>
  );
}

function AcademicIdentity({ context, session }: { context: AcademicContext; session: AuthenticatedSession }) {
  const ficha = context.fichas[0];
  const instructorNames = context.instructores
    .map((instructor) => instructor.nombre || instructor.correo)
    .filter(Boolean)
    .join(', ');

  return (
    <View style={styles.identityCard}>
      <View style={styles.identityIcon}>
        <MaterialCommunityIcons name="school-outline" size={21} color={learnerPalette.primary} />
      </View>
      <View style={styles.identityCopy}>
        <Text style={styles.identityTitle}>Ficha {ficha?.numero || session.ficha || 'sin asignar'}</Text>
        <Text style={styles.identityMeta}>{ficha?.programaNombre || session.programa || 'Programa pendiente'}</Text>
        <Text style={styles.identityMeta}>
          {instructorNames ? `Instructores: ${instructorNames}` : 'Sin instructor asignado'}
        </Text>
      </View>
    </View>
  );
}

function AcademicActivity({
  competencies,
  observations,
}: {
  competencies: Project[];
  observations: Bitacora[];
}) {
  return (
    <View style={styles.activityStack}>
      <View style={styles.activityCard}>
        <View style={styles.activityHeader}>
          <View style={[styles.activityIcon, { backgroundColor: learnerPalette.mint }]}>
            <MaterialCommunityIcons name="book-check-outline" size={19} color={learnerPalette.primary} />
          </View>
          <View style={styles.activityHeaderCopy}>
            <Text style={styles.activityTitle}>Competencias</Text>
            <Text style={styles.activityCount}>{competencies.length} relacionadas</Text>
          </View>
        </View>

        <View style={styles.activityList}>
          {competencies.slice(0, 3).map((project) => (
            <View key={project.competenciaId || project.id} style={styles.activityRow}>
              <View style={styles.activityDot} />
              <View style={styles.activityRowCopy}>
                <Text numberOfLines={1} style={styles.activityRowTitle}>
                  {project.competenciaNombre || 'Competencia sin nombre'}
                </Text>
                <Text numberOfLines={1} style={styles.activityRowMeta}>
                  {project.titulo || 'Proyecto'}
                </Text>
              </View>
            </View>
          ))}
          {!competencies.length ? (
            <Text style={styles.activityEmpty}>Aún no tienes competencias relacionadas.</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.activityCard}>
        <View style={styles.activityHeader}>
          <View style={[styles.activityIcon, { backgroundColor: learnerPalette.brownSoft }]}>
            <MaterialCommunityIcons name="message-text-outline" size={19} color={learnerPalette.brown} />
          </View>
          <View style={styles.activityHeaderCopy}>
            <Text style={styles.activityTitle}>Retroalimentación</Text>
            <Text style={styles.activityCount}>{observations.length} recientes</Text>
          </View>
        </View>

        <View style={styles.activityList}>
          {observations.slice(0, 2).map((bitacora) => (
            <View key={bitacora.id} style={styles.feedbackRow}>
              <View style={styles.feedbackTop}>
                <Text numberOfLines={1} style={styles.observationAuthor}>
                  {bitacora.revisadoPorNombre || 'Instructor o pasante'}
                </Text>
                <ProjectStatus status={bitacora.estado} compact />
              </View>
              <Text numberOfLines={2} style={styles.observationText}>{bitacora.observacion}</Text>
            </View>
          ))}
          {!observations.length ? (
            <Text style={styles.activityEmpty}>Todavía no tienes observaciones.</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function ProjectCard({
  bitacoraCount,
  instructorName,
  onOpenAssistant,
  project,
}: {
  bitacoraCount: number;
  instructorName: string;
  onOpenAssistant: (projectId: string, autoStartVoice?: boolean) => void;
  project: Project;
}) {
  const progress = normalizeProgress(project);

  return (
    <View style={styles.projectCard}>
      <ProjectHeader instructorName={instructorName} project={project} />
      <ProgressBar accent={learnerPalette.progress} progress={progress} soft="#DDE8DD" />
      <View style={styles.statusRow}>
        <ProjectStatus status={project.estado} />
        <Text style={styles.smallMeta}>{progress}% · {bitacoraCount} bitácora(s)</Text>
      </View>
      <View style={styles.projectFooter}>
        <Text style={styles.projectFooterText}>
          {project.competenciaNombre || 'Competencia pendiente'}
        </Text>
        <Pressable onPress={() => onOpenAssistant(project.id, true)} style={styles.projectMic}>
          <MaterialCommunityIcons name="microphone-outline" size={17} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

function ProjectHeader({ instructorName, project }: { instructorName: string; project: Project }) {
  return (
    <View style={styles.projectHeader}>
      <View style={styles.projectIcon}>
        <MaterialCommunityIcons name="briefcase-outline" size={20} color={learnerPalette.primary} />
      </View>
      <View style={styles.projectCopy}>
        <Text style={styles.projectTitle}>{project.titulo || 'Proyecto sin nombre'}</Text>
        <Text style={styles.projectSubtitle}>Ficha {project.fichaNumero || 'sin número'} · {instructorName}</Text>
      </View>
    </View>
  );
}

function ProjectStatus({ compact = false, status }: { compact?: boolean; status?: string }) {
  const normalized = status || 'Pendiente';
  const approved = normalized === 'Aprobado' || normalized === 'Aprobada';
  const rejected = ['Desaprobado', 'Desaprobada', 'Rechazada'].includes(normalized);
  const background = approved ? '#EAFBF7' : rejected ? '#FFF1EB' : '#FFF8E5';
  const color = approved ? '#0E8F72' : rejected ? '#C45C43' : '#A66A00';

  return (
    <View style={[styles.statusBadge, compact && styles.statusBadgeCompact, { backgroundColor: background }]}>
      <Text style={[styles.statusText, { color }]}>{normalized === 'Enviada' ? 'Pendiente' : normalized}</Text>
    </View>
  );
}

function EmptyCard({
  icon,
  text,
  title,
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  text: string;
  title: string;
}) {
  return (
    <View style={styles.emptyCard}>
      <MaterialCommunityIcons name={icon} size={28} color={learnerPalette.primary} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
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

function normalizeProgress(project: Project) {
  if (project.estado === 'Aprobado') return 100;
  const progress = Number(project.progreso || 0);
  return Math.max(0, Math.min(100, Number.isFinite(progress) ? progress : 0));
}

function getInstructorName(project: Project, instructorById: Map<string, RecordItem>) {
  if (!project.instructorUid) return 'Sin instructor';
  const instructor = instructorById.get(project.instructorUid);
  return instructor?.nombre || instructor?.correo || 'Instructor asignado';
}

function getTimestamp(project: Project) {
  const value = project.actualizadoEn || project.creadoEn;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return 0;
}

function uniqueBy<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const styles = StyleSheet.create({
  panoramaCard: {
    backgroundColor: learnerPalette.surface,
    gap: 15,
    marginHorizontal: -30,
    paddingBottom: 22,
    paddingHorizontal: 28,
    paddingTop: 18,
  },
  panoramaHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  panoramaEyebrow: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  panoramaTitle: {
    color: learnerPalette.dark,
    fontFamily: 'SulphurPointBold',
    fontSize: 25,
    lineHeight: 28,
  },
  panoramaIcon: {
    alignItems: 'center',
    backgroundColor: learnerPalette.softGreen,
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  startCard: {
    backgroundColor: learnerPalette.surface,
    gap: 16,
    marginHorizontal: -30,
    paddingHorizontal: 26,
    paddingVertical: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    borderRadius: 18,
    flexBasis: '31%',
    flexGrow: 1,
    gap: 5,
    minWidth: 102,
    padding: 12,
  },
  metricIcon: {
    alignItems: 'center',
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    width: 34,
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
  error: {
    color: '#C45C43',
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
  },
  identityCard: {
    alignItems: 'center',
    backgroundColor: learnerPalette.surfaceMuted,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 12,
    padding: 13,
  },
  identityIcon: {
    alignItems: 'center',
    backgroundColor: learnerPalette.mint,
    borderRadius: 20,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  identityCopy: {
    flex: 1,
    gap: 2,
  },
  identityTitle: {
    color: learnerPalette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
  },
  identityMeta: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 17,
  },
  highlightCard: {
    backgroundColor: learnerPalette.surface,
    borderRadius: 24,
    elevation: 3,
    gap: 14,
    padding: 18,
    shadowColor: learnerPalette.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  featureHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  featureEyebrow: {
    color: learnerPalette.brown,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 9,
    letterSpacing: 0.7,
  },
  featureTitle: {
    color: learnerPalette.dark,
    fontFamily: 'SulphurPointBold',
    fontSize: 21,
  },
  progressLabel: {
    color: learnerPalette.progress,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  projectDescription: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  stack: {
    gap: 12,
  },
  projectCard: {
    backgroundColor: learnerPalette.surface,
    borderRadius: 24,
    elevation: 3,
    gap: 12,
    padding: 16,
    shadowColor: learnerPalette.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  projectHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  projectIcon: {
    alignItems: 'center',
    backgroundColor: learnerPalette.mint,
    borderRadius: 20,
    height: 42,
    justifyContent: 'center',
    width: 42,
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
    fontSize: 11,
  },
  projectFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  projectFooterText: {
    color: learnerPalette.textMuted,
    flex: 1,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
  },
  projectMic: {
    alignItems: 'center',
    backgroundColor: learnerPalette.secondary,
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusText: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 10,
  },
  smallMeta: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
  },
  moreText: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsMedium',
    fontSize: 11,
    textAlign: 'center',
  },
  competencyCard: {
    backgroundColor: learnerPalette.surface,
    borderRadius: 22,
    gap: 5,
    padding: 16,
  },
  competencyTitle: {
    color: learnerPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
  },
  competencyMeta: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 17,
  },
  observationCard: {
    backgroundColor: learnerPalette.surface,
    borderRadius: 22,
    gap: 9,
    padding: 16,
  },
  observationHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  observationCopy: {
    flex: 1,
  },
  observationAuthor: {
    color: learnerPalette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  observationDate: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 10,
  },
  observationText: {
    color: learnerPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 10,
    lineHeight: 16,
  },
  activityStack: {
    gap: 12,
  },
  activityCard: {
    backgroundColor: learnerPalette.surface,
    borderRadius: 22,
    gap: 13,
    padding: 16,
  },
  activityHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  activityIcon: {
    alignItems: 'center',
    borderRadius: 18,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  activityHeaderCopy: {
    flex: 1,
  },
  activityTitle: {
    color: learnerPalette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  activityCount: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 10,
  },
  activityList: {
    gap: 9,
  },
  activityRow: {
    alignItems: 'center',
    backgroundColor: learnerPalette.surfaceMuted,
    borderRadius: 13,
    flexDirection: 'row',
    gap: 9,
    padding: 10,
  },
  activityDot: {
    backgroundColor: learnerPalette.primary,
    borderRadius: 999,
    height: 7,
    width: 7,
  },
  activityRowCopy: {
    flex: 1,
  },
  activityRowTitle: {
    color: learnerPalette.text,
    fontFamily: 'PoppinsMedium',
    fontSize: 11,
  },
  activityRowMeta: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 9,
  },
  feedbackRow: {
    backgroundColor: learnerPalette.peachSurface,
    borderRadius: 13,
    gap: 5,
    padding: 10,
  },
  feedbackTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  activityEmpty: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    paddingVertical: 8,
    textAlign: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: learnerPalette.surface,
    borderRadius: 22,
    gap: 7,
    padding: 20,
  },
  emptyTitle: {
    color: learnerPalette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
  },
  emptyText: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
  },
});
