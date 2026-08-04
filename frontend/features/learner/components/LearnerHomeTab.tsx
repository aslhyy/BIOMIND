import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { learnerPalette } from '@/features/learner/theme';
import { ProgressBar, SectionHeading } from '@/features/learner/components/LearnerUI';
import type { AuthenticatedSession } from '@/features/workspace/types';
// @ts-ignore
import { escucharContextoAcademicoUsuario, escucharGruposTrabajo, escucharProyectos } from '@/services/academic';
// @ts-ignore
import { escucharBitacoras } from '@/services/bitacoras';
// @ts-ignore
import { escucharResumenConversaciones } from '@/services/projectConversations';

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
  asignacionTipo: 'aprendices' | 'grupo';
  aprendizIds?: string[];
  grupoId: string | null;
  estado?: string;
  progreso?: number;
  bitacorasEsperadas: number | null;
  archivoNombre: string | null;
  activo: boolean;
  actualizadoEn?: any;
  creadoEn?: any;
};

type WorkGroup = {
  id: string;
  fichaId?: string;
  fichaNumero: string;
  aprendizIds: string[];
};

type Bitacora = {
  id: string;
  proyectoId: string;
  fichaId?: string;
  aprendizUid?: string;
  fecha: string;
  estado?: string;
  evidencias?: unknown[] | null;
  observacion: string;
  observaciones?: { texto: string; autorNombre: string; creadoEn: any; fecha: string }[] | null;
  revisadoPorNombre: string;
  revisadoPorRol?: string;
  actualizadoEn: any;
  creadoEn: any;
};

type ConversationSummary = {
  id: string;
  fichaId?: string;
  fichaNumero?: string;
  grupoId?: string;
  proyectoId: string;
  proyectoTitulo: string;
  participanteUids: string[];
  destinatarioUid: string;
  ultimoMensaje: string;
  ultimoRemitenteUid: string;
  ultimoRemitenteNombre: string;
  ultimoRemitenteRol: string;
  actualizadoEn: any;
};

const emptyContext: AcademicContext = {
  fichas: [],
  asignaciones: [],
  competencias: [],
  resultados: [],
  instructores: [],
};

export function LearnerHomeTab({
  onOpenNews,
  onOpenAssistant,
  session,
}: {
  onOpenAssistant: (projectId: string, autoStartVoice?: boolean) => void;
  onOpenNews: (target: 'historial' | 'proyectos') => void;
  session: AuthenticatedSession;
}) {
  const [context, setContext] = useState<AcademicContext>(emptyContext);
  const [projects, setProjects] = useState<Project[]>([]);
  const [groups, setGroups] = useState<WorkGroup[]>([]);
  const [bitacoras, setBitacoras] = useState<Bitacora[]>([]);
  const [conversationSummaries, setConversationSummaries] = useState<ConversationSummary[]>([]);
  const [error, setError] = useState('');
  const [graphProject, setGraphProject] = useState<{
    bitacoraCount: number;
    evidenceCount: number;
    instructorName: string;
    project: Project;
  } | null>(null);

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
    const unsubscribeBitacoras = escucharBitacoras(setBitacoras, handleError);
    const unsubscribeSummaries = escucharResumenConversaciones(setConversationSummaries, handleError);

    return () => {
      unsubscribeContext?.();
      unsubscribeProjects?.();
      unsubscribeGroups?.();
      unsubscribeBitacoras?.();
      unsubscribeSummaries?.();
    };
  }, [session]);

  const learnerSheetKeys = useMemo(
    () => {
      const liveSheet = context.fichas[0];
      const keys = liveSheet
        ? [liveSheet.id, liveSheet.numero]
        : [session.fichaId, session.ficha];

      return new Set(keys.filter(Boolean).map(String));
    },
    [context.fichas, session.ficha, session.fichaId]
  );
  const learnerGroupIds = useMemo(
    () => new Set(groups
      .filter((group) =>
        (group.aprendizIds || []).includes(session.uid)
        && (learnerSheetKeys.has(String(group.fichaId || '')) || learnerSheetKeys.has(String(group.fichaNumero || '')))
      )
      .map((group) => group.id)),
    [groups, learnerSheetKeys, session.uid]
  );

  const assignedProjects = useMemo(
    () =>
      projects
        .filter((project) => {
          if (project.activo === false || project.estado === 'Inactivo') {
            return false;
          }

          const projectBelongsToLearnerSheet =
            learnerSheetKeys.has(String(project.fichaId || ''))
            || learnerSheetKeys.has(String(project.fichaNumero || ''));
          if (!projectBelongsToLearnerSheet) {
            return false;
          }

          if (project.asignacionTipo === 'grupo' || project.grupoId) {
            return Boolean(project.grupoId && learnerGroupIds.has(project.grupoId));
          }

          return true;
        })
        .sort((a, b) => getTimestamp(b) - getTimestamp(a)),
    [learnerGroupIds, learnerSheetKeys, projects, session.uid]
  );

  const assignedProjectIds = useMemo(
    () => new Set(assignedProjects.map((project) => project.id)),
    [assignedProjects]
  );
  const assignedProjectById = useMemo(
    () => new Map(assignedProjects.map((project) => [project.id, project])),
    [assignedProjects]
  );

  const learnerBitacoras = useMemo(
    () => bitacoras.filter((bitacora) => {
      const project = assignedProjectById.get(bitacora.proyectoId);
      if (!project) return false;

      if (project.asignacionTipo === 'grupo' || project.grupoId) {
        return Boolean(project.grupoId && learnerGroupIds.has(project.grupoId));
      }

      return bitacora.aprendizUid === session.uid;
    }),
    [assignedProjectById, bitacoras, learnerGroupIds, session.uid]
  );

  const instructorById = useMemo(
    () => new Map(context.instructores.map((instructor) => [instructor.id, instructor])),
    [context.instructores]
  );

  const bitacorasByProject = useMemo(() => {
    const grouped = new Map<string, Bitacora[]>();
    learnerBitacoras.forEach((bitacora) => {
      if (!bitacora.proyectoId) return;
      grouped.set(bitacora.proyectoId, [...(grouped.get(bitacora.proyectoId) || []), bitacora]);
    });
    return grouped;
  }, [learnerBitacoras]);

  const totalEvidence = useMemo(
    () => learnerBitacoras.reduce((total, bitacora) => total + (bitacora.evidencias?.length || 0), 0),
    [learnerBitacoras]
  );

  const averageProgress = assignedProjects.length
    ? Math.round(
        assignedProjects.reduce((total, project) => total + getProjectLogProgress(project, bitacorasByProject.get(project.id)?.length || 0), 0)
        / assignedProjects.length
      )
    : 0;

  const reviewedBitacoras = learnerBitacoras.filter((bitacora) =>
    ['Aprobada', 'Rechazada', 'Desaprobada', 'Correccion'].includes(bitacora.estado || '')
  );
  const newsItems = useMemo(() => {
    const bitacoraNews = learnerBitacoras.flatMap((bitacora) => {
      const project = assignedProjects.find((item) => item.id === bitacora.proyectoId);
      const baseTitle = project?.titulo || 'Proyecto';
      const items = [];

      if (bitacora.observacion || bitacora.observaciones?.length) {
        items.push({
          id: `observacion-${bitacora.id}`,
          icon: 'comment-alert-outline' as const,
          title: 'Nueva observación',
          detail: `${bitacora.revisadoPorNombre || 'Instructor o pasante'} comentó en ${baseTitle}.`,
          action: 'historial' as const,
          timestamp: getAnyTimestamp(bitacora.actualizadoEn) || getAnyTimestamp(bitacora.creadoEn) || getDateTimestamp(bitacora.fecha),
          tone: learnerPalette.peachSurface,
          accent: '#C45C43',
        });
      }

      if (['Aprobada', 'Aprobado'].includes(bitacora.estado || '')) {
        items.push({
          id: `aprobada-${bitacora.id}`,
          icon: 'check-decagram-outline' as const,
          title: 'Bitácora aprobada',
          detail: `${baseTitle} fue revisado y aprobado.`,
          action: 'historial' as const,
          timestamp: getAnyTimestamp(bitacora.actualizadoEn) || getDateTimestamp(bitacora.fecha),
          tone: learnerPalette.mint,
          accent: learnerPalette.primary,
        });
      }

      if (['Rechazada', 'Desaprobada', 'Correccion'].includes(bitacora.estado || '')) {
        items.push({
          id: `correccion-${bitacora.id}`,
          icon: 'clipboard-alert-outline' as const,
          title: 'Revisión pendiente',
          detail: `${baseTitle} necesita ajuste o corrección.`,
          action: 'historial' as const,
          timestamp: getAnyTimestamp(bitacora.actualizadoEn) || getDateTimestamp(bitacora.fecha),
          tone: learnerPalette.gold,
          accent: learnerPalette.goldText,
        });
      }

      return items;
    });

    const messageNews = conversationSummaries
      .filter((summary) =>
        summary.ultimoRemitenteUid
        && summary.ultimoRemitenteUid !== session.uid
        && (
          assignedProjectIds.has(summary.id)
          || assignedProjectIds.has(summary.proyectoId || '')
          || (summary.grupoId && learnerGroupIds.has(String(summary.grupoId)))
          || learnerSheetKeys.has(String(summary.fichaId || ''))
          || learnerSheetKeys.has(String(summary.fichaNumero || ''))
          || (summary.participanteUids || []).includes(session.uid)
          || summary.destinatarioUid === session.uid
        )
      )
      .map((summary) => ({
        id: `mensaje-${summary.id}`,
        icon: 'message-text-outline' as const,
        title: 'Mensaje nuevo',
        detail: `${summary.ultimoRemitenteNombre || 'Alguien'}: ${summary.ultimoMensaje || 'Nuevo mensaje académico'}`,
        action: 'proyectos' as const,
        timestamp: getAnyTimestamp(summary.actualizadoEn),
        tone: learnerPalette.softGreen,
        accent: learnerPalette.secondary,
      }));

    return [...messageNews, ...bitacoraNews]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
  }, [assignedProjectIds, assignedProjects, conversationSummaries, learnerBitacoras, learnerGroupIds, learnerSheetKeys, session.uid]);

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
      caption: `${learnerBitacoras.length} bitácora(s)`,
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

      <SectionHeading
        actionLabel={`${newsItems.length} nuevas`}
        subtitle="Observaciones, aprobaciones, correcciones y mensajes académicos."
        title="Novedades"
      />

      <View style={styles.stack}>
        {newsItems.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.newsCarouselContent}>
            {newsItems.map((item) => (
              <LearnerNewsCard key={item.id} item={item} onPress={() => onOpenNews(item.action)} />
            ))}
          </ScrollView>
        ) : (
          <EmptyCard
            icon="bell-outline"
            title="Sin novedades recientes"
            text="Cuando tengas observaciones, aprobaciones o mensajes nuevos aparecerán aquí."
          />
        )}
      </View>

      <SectionHeading
        actionLabel={`${assignedProjects.length} proyectos`}
        subtitle="Últimos proyectos asignados y avance por bitácoras entregadas."
        title="Proyectos y avances"
      />

      {assignedProjects.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.projectCarousel}>
          {assignedProjects.slice(0, 6).map((project) => {
            const count = bitacorasByProject.get(project.id)?.length || 0;
            const evidenceCount = bitacorasByProject.get(project.id)?.reduce((total, bitacora) => total + (bitacora.evidencias?.length || 0), 0) || 0;
            const instructorName = getInstructorName(project, instructorById);
            return (
              <ProjectProgressSlide
                key={project.id}
                bitacoraCount={count}
                evidenceCount={evidenceCount}
                instructorName={instructorName}
                onOpenAssistant={onOpenAssistant}
                onOpenGraph={() => setGraphProject({ bitacoraCount: count, evidenceCount, instructorName, project })}
                project={project}
              />
            );
          })}
        </ScrollView>
      ) : (
        <EmptyCard
          icon="briefcase-outline"
          title="No tienes proyectos asignados"
          text="Cuando un instructor te asigne un proyecto individual o grupal, aparecerá aquí."
        />
      )}

      <LearnerGraphInfoModal item={graphProject} onClose={() => setGraphProject(null)} />

    </>
  );
}

function LearnerNewsCard({
  item,
  onPress,
}: {
  item: {
    accent: string;
    action: 'historial' | 'proyectos';
    detail: string;
    icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
    title: string;
    tone: string;
  };
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.newsCard}>
      <View style={[styles.newsIcon, { backgroundColor: item.tone }]}>
        <MaterialCommunityIcons name={item.icon} size={20} color={item.accent} />
      </View>
      <View style={styles.newsCopy}>
        <Text numberOfLines={1} style={styles.newsType}>Novedad académica</Text>
        <Text numberOfLines={2} style={styles.newsTitle}>{item.title}</Text>
        <Text numberOfLines={3} style={styles.newsText}>{item.detail}</Text>
      </View>
    </Pressable>
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
        <Text style={styles.identityMeta}>
          {ficha?.programaNombre || session.programa || 'Programa pendiente'} · {ficha?.trimestreActual || (session as any).trimestreActual || 'Sin trimestre'}
        </Text>
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
                <ProjectStatus status={bitacora.estado || 'Pendiente'} compact />
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

function ProjectProgressSlide({
  bitacoraCount,
  evidenceCount,
  instructorName,
  onOpenAssistant,
  onOpenGraph,
  project,
}: {
  bitacoraCount: number;
  evidenceCount: number;
  instructorName: string;
  onOpenAssistant: (projectId: string, autoStartVoice: boolean) => void;
  onOpenGraph: () => void;
  project: Project;
}) {
  const expected = Number(project.bitacorasEsperadas || 0);
  const progress = getProjectLogProgress(project, bitacoraCount);
  const remaining = expected ? Math.max(0, expected - bitacoraCount) : null;
  const bars = [
    progress,
    Math.max(14, Math.min(100, bitacoraCount * 18)),
    remaining === null ? 35 : Math.max(12, Math.min(100, remaining * 18)),
  ];

  return (
    <View style={styles.projectSlide}>
      <View style={styles.featureHeader}>
        <View style={styles.projectSlideTitleWrap}>
          <Text style={styles.featureEyebrow}>AVANCE DEL PROYECTO</Text>
          <Text numberOfLines={2} style={styles.projectTitle}>{project.titulo || 'Proyecto sin nombre'}</Text>
        </View>
        <ProjectStatus status={project.estado || 'Pendiente'} />
      </View>

      <ProjectHeader instructorName={instructorName} project={project} />

      <Pressable onPress={onOpenGraph} style={styles.advancedGraph}>
        <View style={styles.graphHeader}>
          <Text style={styles.graphTitle}>Gráfica avanzada</Text>
          <Text style={styles.graphValue}>{progress}%</Text>
        </View>
        <View style={styles.graphBars}>
          {bars.map((value, index) => (
            <View key={`${project.id}-graph-${index}`} style={styles.graphBarTrack}>
              <View
                style={[
                  styles.graphBarFill,
                  {
                    height: `${Math.max(8, value)}%`,
                    backgroundColor: index === 0 ? learnerPalette.progress : index === 1 ? learnerPalette.primary : learnerPalette.goldText,
                  },
                ]}
              />
            </View>
          ))}
        </View>
        <View style={styles.graphFooter}>
          <Text style={styles.graphFooterText}>Análisis IA · {evidenceCount} evidencia(s)</Text>
          <MaterialCommunityIcons name="information-outline" size={14} color={learnerPalette.primary} />
        </View>
      </Pressable>

      <ProgressBar accent={learnerPalette.progress} progress={progress} soft="#DDE8DD" />
      <View style={styles.statusRow}>
        <Text style={styles.progressLabel}>{bitacoraCount} entregada(s)</Text>
        <Text style={styles.smallMeta}>
          {expected ? `${remaining} faltante(s) de ${expected}` : 'Meta de bitácoras pendiente'}
        </Text>
      </View>
      <Pressable onPress={() => onOpenAssistant(project.id, true)} style={styles.projectAction}>
        <MaterialCommunityIcons name="microphone-outline" size={17} color="#FFFFFF" />
        <Text style={styles.projectActionText}>Hablar con la IA</Text>
      </Pressable>
    </View>
  );
}

function LearnerGraphInfoModal({
  item,
  onClose,
}: {
  item: {
    bitacoraCount: number;
    evidenceCount: number;
    instructorName: string;
    project: Project;
  } | null;
  onClose: () => void;
}) {
  const project = item?.project;
  const progress = project ? getProjectLogProgress(project, item.bitacoraCount) : 0;
  const expected = Number(project?.bitacorasEsperadas || 0);
  const remaining = expected ? Math.max(0, expected - (item?.bitacoraCount || 0)) : 0;
  const paceLabel = progress >= 75 ? 'avance sólido' : progress >= 45 ? 'avance estable' : 'avance por fortalecer';
  const evidenceLabel = item?.evidenceCount
    ? `${item.evidenceCount} evidencia(s) asociada(s)`
    : 'sin evidencias adjuntas todavía';
  const recommendation = progress < 45
    ? 'La IA recomienda priorizar una nueva bitácora y pedir retroalimentación temprana.'
    : progress < 75
      ? 'La IA identifica buen movimiento, pero conviene sostener entregas constantes.'
      : 'La IA detecta un ritmo favorable para consolidar evidencias y preparar revisión.';

  return (
    <Modal animationType="fade" transparent visible={Boolean(item)} onRequestClose={onClose}>
      <View style={styles.graphModalBackdrop}>
        <View style={styles.graphModalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.modalCopy}>
              <Text style={styles.modalEyebrow}>Análisis IA</Text>
              <Text style={styles.modalTitle}>{project?.titulo || 'Proyecto'}</Text>
              <Text style={styles.modalSubtitle}>
                La IA interpreta esta gráfica con tus bitácoras, evidencias y la meta registrada del proyecto.
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.modalClose}>
              <MaterialCommunityIcons name="close" size={21} color={learnerPalette.primary} />
            </Pressable>
          </View>

          <View style={styles.graphExplanationBox}>
            <Text style={styles.graphExplanationTitle}>Lectura generada</Text>
            <Text style={styles.graphExplanationText}>
              Este proyecto tiene {paceLabel}: {progress}% de avance, {item?.bitacoraCount || 0} bitácora(s) entregada(s), {evidenceLabel}
              {expected ? ` y ${remaining} entrega(s) pendiente(s) frente a la meta.` : '.'} {recommendation}
            </Text>
            <View style={styles.graphInsightGrid}>
              <GraphInsight label="Barra 1" value="Avance calculado según bitácoras entregadas." />
              <GraphInsight label="Barra 2" value="Actividad reciente y evidencia registrada." />
              <GraphInsight label="Barra 3" value="Brecha pendiente para completar la meta." />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function GraphInsight({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.graphInsightRow}>
      <Text style={styles.graphInsightLabel}>{label}</Text>
      <Text style={styles.graphInsightText}>{value}</Text>
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
  onOpenAssistant: (projectId: string, autoStartVoice: boolean) => void;
  project: Project;
}) {
  const progress = normalizeProgress(project);

  return (
    <View style={styles.projectCard}>
      <ProjectHeader instructorName={instructorName} project={project} />
      <ProgressBar accent={learnerPalette.progress} progress={progress} soft="#DDE8DD" />
      <View style={styles.statusRow}>
        <ProjectStatus status={project.estado || 'Pendiente'} />
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

function getProjectLogProgress(project: Project, bitacoraCount: number) {
  if (project.estado === 'Aprobado') return 100;
  const expected = Number(project.bitacorasEsperadas || 0);
  if (Number.isFinite(expected) && expected > 0) {
    return Math.max(0, Math.min(100, Math.round((bitacoraCount / expected) * 100)));
  }
  return normalizeProgress(project);
}

function getInstructorName(project: Project, instructorById: Map<string, RecordItem>) {
  if (!project.instructorUid) return 'Sin instructor';
  const instructor = instructorById.get(project.instructorUid);
  return instructor?.nombre || instructor?.correo || 'Instructor asignado';
}

function getTimestamp(project: Project) {
  const value = project.actualizadoEn || project.creadoEn;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  return 0;
}

function getAnyTimestamp(value: any) {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  return 0;
}

function getDateTimestamp(value: string) {
  if (!value) return 0;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
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
    paddingHorizontal: 31,
    paddingTop: 28,
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
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsNeueBold',
    fontSize: 11,
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
  newsCard: {
    backgroundColor: learnerPalette.surface,
    borderColor: learnerPalette.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    minHeight: 154,
    padding: 15,
    width: 242,
  },
  newsIcon: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  newsCopy: {
    flex: 1,
    gap: 3,
  },
  newsType: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  newsTitle: {
    color: learnerPalette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  newsText: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 16,
  },
  newsCarouselContent: {
    gap: 12,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  projectCarousel: {
    gap: 12,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  projectSlide: {
    backgroundColor: learnerPalette.surface,
    borderRadius: 24,
    elevation: 3,
    gap: 13,
    padding: 16,
    shadowColor: learnerPalette.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    width: 310,
  },
  projectSlideTitleWrap: {
    flex: 1,
    gap: 3,
  },
  advancedGraph: {
    backgroundColor: learnerPalette.surfaceMuted,
    borderColor: learnerPalette.border,
    borderRadius: 17,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  graphHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  graphTitle: {
    color: learnerPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  graphValue: {
    color: learnerPalette.progress,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
  },
  graphBars: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
    height: 70,
  },
  graphBarTrack: {
    backgroundColor: '#E4EEE8',
    borderRadius: 999,
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  graphBarFill: {
    borderRadius: 999,
    minHeight: 8,
  },
  graphFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'flex-end',
  },
  graphFooterText: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 10,
  },
  graphModalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(18, 35, 29, 0.32)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  graphModalCard: {
    backgroundColor: learnerPalette.surface,
    borderRadius: 24,
    gap: 16,
    maxWidth: 430,
    padding: 20,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  modalCopy: {
    flex: 1,
    gap: 4,
  },
  modalEyebrow: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  modalTitle: {
    color: learnerPalette.dark,
    fontFamily: 'SulphurPointBold',
    fontSize: 25,
    lineHeight: 28,
  },
  modalSubtitle: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  modalClose: {
    alignItems: 'center',
    backgroundColor: learnerPalette.mint,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  graphExplanationBox: {
    backgroundColor: learnerPalette.surfaceMuted,
    borderColor: learnerPalette.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 15,
  },
  graphExplanationTitle: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  graphExplanationText: {
    color: learnerPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 19,
  },
  graphInsightGrid: {
    gap: 8,
  },
  graphInsightRow: {
    backgroundColor: learnerPalette.surface,
    borderRadius: 14,
    gap: 3,
    padding: 11,
  },
  graphInsightLabel: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  graphInsightText: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 16,
  },
  projectAction: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: learnerPalette.secondary,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 7,
    minHeight: 38,
    paddingHorizontal: 13,
  },
  projectActionText: {
    color: '#FFFFFF',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
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
