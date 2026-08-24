import { CurrentTrimesterSummary } from '@/features/workspace/components/CurrentTrimesterSummary';
import type { AuthenticatedSession } from '@/features/workspace/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
// @ts-ignore
import { escucharResumenConversaciones } from '@/services/projectConversations';

type RealSheet = {
  id: string;
  numero?: string;
  programaNombre?: string;
  trimestreActual?: string;
};

type RealLearner = {
  id: string;
  nombre?: string;
  correo?: string;
  photoUrl?: string | null;
  fichaId?: string | null;
  fichaSolicitudId?: string;
  fichaSolicitudNumero?: string;
  fichaSolicitudPrograma?: string;
};

type RealCompetence = {
  id: string;
  codigo?: string;
  nombre?: string;
};

type RealRap = {
  id: string;
  codigo?: string;
  descripcion?: string;
  competenciaId?: string;
};

type RealAssignment = {
  id: string;
  fichaId?: string;
  instructorUid?: string;
  competenciaId?: string;
  resultadoId?: string;
  resultadoIds?: string[];
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
  creadoEn?: any;
  actualizadoEn?: any;
};

type RealBitacora = {
  id: string;
  proyectoId?: string;
  proyectoTitulo?: string;
  aprendizUid?: string;
  aprendizNombre?: string;
  creadoEn: any;
  actualizadoEn?: any;
  fecha?: string;
  estado?: string;
};

type ConversationSummary = {
  id: string;
  proyectoId?: string;
  fichaId?: string;
  fichaNumero?: string;
  grupoId?: string;
  participanteUids?: string[];
  destinatarioUid?: string;
  instructorUid?: string;
  ultimoMensaje: string;
  ultimoRemitenteUid: string;
  ultimoRemitenteNombre: string;
  ultimoRemitenteRol: string;
  actualizadoEn: any;
};

type InstructorNewsAction = 'chat' | 'tracking';

export function InstructorHomeTab({
  onOpenNews,
  session,
  showNews = true,
  showRecentProjects = true,
  onOpenChatChannel,
}: {
  onOpenNews: (target: InstructorNewsAction) => void;
  session: AuthenticatedSession;
  showNews?: boolean;
  showRecentProjects?: boolean;
  onOpenChatChannel: (channel: 'admin' | 'pasante') => void;
}) {
  const [realSheets, setRealSheets] = useState<RealSheet[]>([]);
  const [realLearners, setRealLearners] = useState<RealLearner[]>([]);
  const [realCompetences, setRealCompetences] = useState<RealCompetence[]>([]);
  const [realRaps, setRealRaps] = useState<RealRap[]>([]);
  const [realAssignments, setRealAssignments] = useState<RealAssignment[]>([]);
  const [realProjects, setRealProjects] = useState<RealProject[]>([]);
  const [realBitacoras, setRealBitacoras] = useState<RealBitacora[]>([]);
  const [conversationSummaries, setConversationSummaries] = useState<ConversationSummary[]>([]);
  const [sheetModalOpen, setSheetModalOpen] = useState(false);
  const [selectedSheetId, setSelectedSheetId] = useState('');
  const [sheetLearnerSearch, setSheetLearnerSearch] = useState('');
  const [learnersOpen, setLearnersOpen] = useState(false);
  const [graphProject, setGraphProject] = useState<ProjectSnapshot | null>(null);
  const [realError, setRealError] = useState('');

  useEffect(() => {
    const handleError = (error: any) =>
      setRealError(error.message || 'No pudimos cargar el resumen real.');
    const unsubscribeContext = escucharContextoAcademicoUsuario(
      session,
      (context: any) => {
        setRealSheets(context.fichas || []);
        setRealLearners(context.aprendices || []);
        setRealCompetences(context.competencias || []);
        setRealRaps(context.resultados || []);
        setRealAssignments(context.asignaciones || []);
      },
      handleError
    );
    const unsubscribeProjects = escucharProyectos(
      (items: RealProject[]) => setRealProjects(items.filter((project) => project.instructorUid === session.uid)),
      handleError
    );
    const unsubscribeBitacoras = escucharBitacoras(setRealBitacoras, handleError);
    const unsubscribeSummaries = escucharResumenConversaciones(setConversationSummaries, handleError);

    return () => {
      unsubscribeContext?.();
      unsubscribeProjects?.();
      unsubscribeBitacoras?.();
      unsubscribeSummaries?.();
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
    ? [...realProjects].sort((a, b) => getMillis((b as any).creadoEn) - getMillis((a as any).creadoEn)).slice(0, 6).map((project) => {
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
  const selectedSheet = realSheets.find((sheet) => sheet.id === selectedSheetId);
  const selectedSheetProjects = realProjects.filter((project) => project.fichaId === selectedSheetId);
  const selectedSheetLearners = realLearners.filter((learner) => learner.fichaId === selectedSheetId);
  const selectedSheetAssignments = realAssignments.filter((assignment) =>
    assignment.fichaId === selectedSheetId && assignment.instructorUid === session.uid
  );
  const selectedSheetCompetenceRows = selectedSheetAssignments.map((assignment) => {
    const competence = realCompetences.find((item) => item.id === assignment.competenciaId);
    const rapIds = [
      assignment.resultadoId,
      ...(Array.isArray(assignment.resultadoIds) ? assignment.resultadoIds : []),
    ].filter(Boolean);
    const raps = realRaps.filter((rap) => rapIds.includes(rap.id));

    return {
      id: assignment.id,
      competence,
      raps,
    };
  });
  const filteredSheetLearners = selectedSheetLearners.filter((learner) =>
    `${learner.nombre || ''} ${learner.correo || ''}`.toLowerCase().includes(sheetLearnerSearch.trim().toLowerCase())
  );
  const realSheetKeys = useMemo(
    () => new Set(realSheets.flatMap((sheet) => [sheet.id, sheet.numero]).filter(Boolean).map(String)),
    [realSheets]
  );
  const learnerById = useMemo(() => new Map(realLearners.map((learner) => [learner.id, learner])), [realLearners]);
  const projectById = useMemo(() => new Map(realProjects.map((project) => [project.id, project])), [realProjects]);
  const newsItems = useMemo(() => {
    const bitacoraNews = instructorBitacoras
      .map((bitacora) => {
        const project = projectById.get(bitacora.proyectoId || '');
        const learner = learnerById.get(bitacora.aprendizUid || '');
        return {
          id: `bitacora-${bitacora.id}`,
          accent: instructorPalette.secondary,
          action: 'tracking' as const,
          icon: 'notebook-check-outline' as const,
          type: 'Bitácora subida',
          title: learner?.nombre || bitacora.aprendizNombre || 'Aprendiz',
          detail: project?.titulo || bitacora.proyectoTitulo || 'Proyecto asignado',
          photoUrl: learner?.photoUrl || null,
          timestamp: getMillis(bitacora.actualizadoEn) || getMillis(bitacora.creadoEn) || getDateMillis(bitacora.fecha || ''),
        };
      });
    const messageNews = conversationSummaries
      .filter((summary) =>
        summary.ultimoRemitenteUid
        && summary.ultimoRemitenteUid !== session.uid
        && (
          summary.instructorUid === session.uid
          || realProjectIds.has(summary.proyectoId || '')
          || (summary.participanteUids || []).includes(session.uid)
          || summary.destinatarioUid === session.uid
          || realSheetKeys.has(String(summary.fichaId || ''))
          || realSheetKeys.has(String(summary.fichaNumero || ''))
        )
      )
      .map((summary) => {
        const user = learnerById.get(summary.ultimoRemitenteUid || '');
        return {
          id: `mensaje-${summary.id}`,
          accent: instructorPalette.primary,
          action: 'chat' as const,
          icon: 'message-text-outline' as const,
          type: 'Mensaje nuevo',
          title: user?.nombre || summary.ultimoRemitenteNombre || 'Usuario',
          detail: summary.ultimoMensaje || 'Nuevo mensaje académico',
          photoUrl: user?.photoUrl || null,
          timestamp: getMillis(summary.actualizadoEn),
        };
      });

    return [...messageNews, ...bitacoraNews]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
  }, [conversationSummaries, instructorBitacoras, learnerById, projectById, realProjectIds, realSheetKeys, session.uid]);
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
            <MetricCard
              key={metric.id}
              metric={metric}
              onPress={metric.id === 'real-sheets' ? () => {
                setSheetModalOpen(true);
                setSelectedSheetId('');
                setLearnersOpen(false);
                setSheetLearnerSearch('');
              } : undefined}
            />
          ))}
        </View>
        {realError ? <Text style={styles.errorText}>{realError}</Text> : null}
      </View>

      {showNews ? <View style={styles.compactPanel}>
        <SectionHeading
          actionLabel={`${newsItems.length} novedades`}
          subtitle="Mensajes recientes y bitacoras nuevas de tus fichas."
          title="Novedades"
        />
        {newsItems.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.newsCarouselContent}>
            {newsItems.map((item) => (
              <InstructorNewsCard key={item.id} item={item} onPress={() => onOpenNews(item.action)} />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyRequestCard}>
            <Text style={styles.alertText}>No hay novedades recientes.</Text>
          </View>
        )}
      </View> : null}

      {showRecentProjects ? <View style={styles.compactPanel}>
        <SectionHeading
          actionLabel={`${realProjects.length} total`}
          subtitle="Resumen rápido; el detalle está en Gestión académica."
          title="Proyectos recientes"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.projectCarousel}>
          {realProjectSnapshots.map((project) => (
            <View key={project.id} style={styles.projectSlide}>
              <ProjectRow project={project} advanced onOpenGraph={() => setGraphProject(project)} />
            </View>
          ))}
        </ScrollView>
      </View> : null}

      <GraphInfoModal project={graphProject} onClose={() => setGraphProject(null)} />

      <SheetDetailModal
        competenceRows={selectedSheetCompetenceRows.filter((row) => row.competence) as { id: string; competence: RealCompetence; raps: RealRap[] }[]}
        learners={filteredSheetLearners}
        learnersOpen={learnersOpen}
        learnerSearch={sheetLearnerSearch}
        onClose={() => {
          setSheetModalOpen(false);
          setSelectedSheetId('');
        }}
        onLearnerSearch={setSheetLearnerSearch}
        onSelectSheet={(sheetId) => {
          setSelectedSheetId(sheetId);
          setLearnersOpen(false);
          setSheetLearnerSearch('');
        }}
        onToggleLearners={() => setLearnersOpen((current) => !current)}
        projects={selectedSheetProjects}
        sheet={selectedSheet}
        sheetOverviews={realSheetOverviews}
        visible={sheetModalOpen}
      />

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
              <IconLabel icon="book-check-outline" text={`${sheet.competencies?.length || 0} competencias`} />
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

function MetricCard({ metric, onPress }: { metric: InstructorMetric; onPress?: () => void }) {
  const MetricContent = () => (
    <>
      <View style={[styles.metricIcon, { backgroundColor: metric.accent }]}>
        <MaterialCommunityIcons name={metric.icon} size={18} color={instructorPalette.surfaceHover} />
      </View>
      <Text style={[styles.metricValue, { color: metric.accent }, metric.valueStyle]}>{metric.value}</Text>
      <Text style={styles.metricLabel}>{metric.label}</Text>
      <Text style={styles.metricCaption}>{metric.caption}</Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={[styles.metricCard, { backgroundColor: metric.soft }]}>
        <MetricContent />
      </Pressable>
    );
  }

  return (
    <View style={[styles.metricCard, { backgroundColor: metric.soft }]}>
      <MetricContent />
    </View>
  );
}

function ProjectRow({ advanced = false, onOpenGraph, project }: { advanced?: boolean; onOpenGraph?: () => void; project: ProjectSnapshot }) {
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
      {advanced ? (
        <Pressable onPress={onOpenGraph} style={styles.advancedGraph}>
          <View style={styles.graphHeader}>
            <Text style={styles.graphTitle}>Gráfica avanzada</Text>
            <Text style={styles.graphValue}>{project.progress}%</Text>
          </View>
          <View style={styles.graphBars}>
            {[project.progress, Math.max(18, 100 - project.progress), Math.min(92, project.progress + 14)].map((value, index) => (
              <View key={`${project.id}-bar-${index}`} style={styles.graphBarTrack}>
                <View style={[styles.graphBarFill, { height: `${Math.max(12, value)}%`, backgroundColor: index === 1 ? instructorPalette.secondary : project.accent }]} />
              </View>
            ))}
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

function InstructorNewsCard({
  item,
  onPress,
}: {
  item: {
    accent: string;
    detail: string;
    icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
    photoUrl: string | null;
    title: string;
    type: string;
  };
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.newsCard}>
      <View style={[styles.newsIcon, { backgroundColor: `${item.accent}22` }]}>
        <MaterialCommunityIcons name={item.icon} size={20} color={item.accent} />
      </View>
      <View style={styles.newsCopy}>
        <Text numberOfLines={1} style={styles.newsType}>{item.type}</Text>
        <Text numberOfLines={2} style={styles.newsTitle}>{item.title}</Text>
        <Text numberOfLines={3} style={styles.newsText}>{item.detail}</Text>
      </View>
    </Pressable>
  );
}

function GraphInfoModal({ onClose, project }: { onClose: () => void; project: ProjectSnapshot | null }) {
  const progress = project?.progress || 0;
  const paceLabel = progress >= 75 ? 'avance alto' : progress >= 45 ? 'avance estable' : 'avance por reforzar';
  const evidenceLabel = project?.photos
    ? `${project.photos} evidencias registradas`
    : 'sin evidencias registradas';
  const riskLabel = progress < 45
    ? 'La IA detecta que conviene revisar acompanamiento y proximas entregas.'
    : progress < 75
      ? 'La IA ve un desarrollo activo, pero aun requiere seguimiento cercano.'
      : 'La IA identifica buen ritmo y condiciones favorables para validacion.';

  return (
    <Modal animationType="fade" transparent visible={Boolean(project)} onRequestClose={onClose}>
      <View style={styles.graphModalBackdrop}>
        <View style={styles.graphModalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.alertCopy}>
              <Text style={styles.dashboardEyebrow}>Grafica avanzada</Text>
              <Text style={styles.modalTitle}>{project?.title || 'Proyecto'}</Text>
              <Text style={styles.sheetMeta}>
                La IA analizo el avance, las bitacoras, las evidencias y el estado actual para explicar esta grafica.
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.modalClose}>
              <MaterialCommunityIcons name="close" size={21} color={instructorPalette.primary} />
            </Pressable>
          </View>
          <View style={styles.graphExplanationBox}>
            <Text style={styles.graphExplanationTitle}>Analisis IA del proyecto</Text>
            <Text style={styles.graphExplanationText}>
              El proyecto muestra {paceLabel}: {progress}% de progreso, estado {project?.inventory || 'pendiente'} y {evidenceLabel}. {riskLabel}
            </Text>
            <View style={styles.graphInsightGrid}>
              <GraphInsight label="Barra 1" value="Avance real reportado del proyecto." />
              <GraphInsight label="Barra 2" value="Trabajo pendiente o brecha de seguimiento." />
              <GraphInsight label="Barra 3" value="Proyeccion IA si el ritmo actual se mantiene." />
            </View>
            <Text style={styles.graphExplanationText}>
              Esta lectura no reemplaza tu criterio como instructor; resume señales para decidir si observar, reforzar o validar.
            </Text>
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

function NewsAvatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'IN';

  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={styles.newsAvatarImage} contentFit="cover" />;
  }

  return (
    <View style={styles.newsAvatarFallback}>
      <Text style={styles.newsAvatarText}>{initials}</Text>
    </View>
  );
}

function SheetDetailModal({
  competenceRows,
  learners,
  learnersOpen,
  learnerSearch,
  onClose,
  onLearnerSearch,
  onSelectSheet,
  onToggleLearners,
  projects,
  sheet,
  sheetOverviews,
  visible,
}: {
  competenceRows: { id: string; competence: RealCompetence; raps: RealRap[] }[];
  learners: RealLearner[];
  learnersOpen: boolean;
  learnerSearch: string;
  onClose: () => void;
  onLearnerSearch: (value: string) => void;
  onSelectSheet: (sheetId: string) => void;
  onToggleLearners: () => void;
  projects: RealProject[];
  sheet?: RealSheet;
  sheetOverviews: {
    id: string;
    code: string;
    program: string;
    trimester: string;
    learners: number;
    activeProjects: number;
    progress: number;
  }[];
  visible: boolean;
}) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.sheetModal}>
          <View style={styles.modalHeader}>
            <View style={styles.alertCopy}>
              <Text style={styles.dashboardEyebrow}>Ficha asignada</Text>
              <Text style={styles.modalTitle}>{sheet ? `Ficha ${sheet.numero || sheet.id}` : 'Fichas asignadas'}</Text>
              <Text style={styles.sheetMeta}>
                {sheet ?
                   `${sheet.programaNombre || 'Sin programa'} · ${sheet.trimestreActual || 'Sin trimestre'}`
                  : 'Selecciona una ficha para ver competencias, RAP y aprendices.'}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.modalClose}>
              <MaterialCommunityIcons name="close" size={21} color={instructorPalette.primary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
            {!sheet ? (
              <>
                <Text style={styles.modalSectionTitle}>Selecciona una ficha</Text>
                <View style={styles.stack}>
                  {sheetOverviews.length ? sheetOverviews.map((item) => (
                    <Pressable key={item.id} onPress={() => onSelectSheet(item.id)} style={styles.competenceCard}>
                      <Text style={styles.alertTitle}>Ficha {item.code}</Text>
                      <Text style={styles.alertText}>{item.program} · {item.trimester}</Text>
                      <View style={styles.compactMetaRow}>
                        <IconLabel icon="account-multiple-outline" text={`${item.learners} aprendices`} />
                        <IconLabel icon="briefcase-outline" text={`${item.activeProjects} proyectos`} />
                      </View>
                    </Pressable>
                  )) : (
                    <View style={styles.emptyRequestCard}>
                      <Text style={styles.alertText}>No tienes fichas asignadas.</Text>
                    </View>
                  )}
                </View>
              </>
            ) : (
            <>
            <View style={styles.modalStatsRow}>
              <ModalStat icon="account-multiple-outline" label="Aprendices" value={String(learners.length)} />
              <ModalStat icon="briefcase-outline" label="Proyectos" value={String(projects.length)} />
              <ModalStat icon="book-check-outline" label="RAP" value={String(competenceRows.reduce((total, row) => total + (row.raps?.length || 0), 0))} />
            </View>

            <Text style={styles.modalSectionTitle}>Competencias y RAP a cargo</Text>
            <View style={styles.stack}>
              {competenceRows.length ? competenceRows.map((row) => (
                <View key={row.id} style={styles.competenceCard}>
                  <Text style={styles.alertTitle}>
                    {row.competence.codigo ? `${row.competence.codigo} · ` : ''}{row.competence.nombre || 'Competencia'}
                  </Text>
                  {row.raps?.length ? row.raps.map((rap) => (
                    <Text key={rap.id} style={styles.alertText}>
                      {rap.codigo ? `${rap.codigo}: ` : ''}{rap.descripcion || 'Resultado de aprendizaje'}
                    </Text>
                  )) : <Text style={styles.alertText}>Sin RAP específico registrado.</Text>}
                </View>
              )) : (
                <View style={styles.emptyRequestCard}>
                  <Text style={styles.alertText}>No hay competencias asignadas para esta ficha.</Text>
                </View>
              )}
            </View>

            <Pressable onPress={onToggleLearners} style={styles.learnersToggle}>
              <Text style={styles.acceptButtonText}>{learnersOpen ? 'Ocultar aprendices' : 'Ver aprendices'}</Text>
              <MaterialCommunityIcons name={learnersOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#FFFFFF" />
            </Pressable>

            {learnersOpen ? (
              <View style={styles.learnersPanel}>
                <View style={styles.searchBox}>
                  <MaterialCommunityIcons name="magnify" size={18} color={instructorPalette.textMuted} />
                  <TextInput
                    placeholder="Buscar aprendiz..."
                    placeholderTextColor={instructorPalette.textMuted}
                    value={learnerSearch}
                    onChangeText={onLearnerSearch}
                    style={styles.searchInput}
                  />
                </View>
                {learners.length ? learners.map((learner) => (
                  <View key={learner.id} style={styles.learnerRow}>
                    <NewsAvatar name={learner.nombre || learner.correo || 'Aprendiz'} photoUrl={learner.photoUrl || null} />
                    <View style={styles.alertCopy}>
                      <Text style={styles.alertTitle}>{learner.nombre || 'Aprendiz'}</Text>
                      <Text style={styles.alertText}>{learner.correo || 'Sin correo'}</Text>
                    </View>
                  </View>
                )) : <Text style={styles.alertText}>No hay aprendices con esa búsqueda.</Text>}
              </View>
            ) : null}
            </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ModalStat({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.modalStat}>
      <MaterialCommunityIcons name={icon} size={18} color={instructorPalette.primary} />
      <Text style={styles.modalStatValue}>{value}</Text>
      <Text style={styles.modalStatLabel}>{label}</Text>
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

function getMillis(value: any) {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  return 0;
}

function getDateMillis(value: string) {
  if (!value) return 0;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
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
  newsCarouselContent: {
    gap: 12,
    paddingHorizontal: 2,
    paddingVertical: 3,
  },
  newsCard: {
    backgroundColor: instructorPalette.surface,
    borderRadius: 16,
    elevation: 1,
    gap: 8,
    minHeight: 150,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    width: 230,
  },
  newsIcon: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  newsCopy: {
    gap: 2,
    minWidth: 0,
  },
  newsType: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  newsTitle: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
    lineHeight: 19,
  },
  newsText: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 17,
  },
  newsAvatarImage: {
    borderRadius: 22,
    height: 44,
    width: 44,
  },
  newsAvatarFallback: {
    alignItems: 'center',
    backgroundColor: instructorPalette.mint,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  newsAvatarText: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  projectCarousel: {
    gap: 12,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  projectSlide: {
    width: 300,
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
  requestCard: {
    alignItems: 'flex-start',
    backgroundColor: instructorPalette.surface,
    borderColor: instructorPalette.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  requestIcon: {
    alignItems: 'center',
    backgroundColor: instructorPalette.mint,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  requestActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  acceptButton: {
    backgroundColor: instructorPalette.primary,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  rejectButton: {
    backgroundColor: instructorPalette.peachSurface,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  rejectButtonText: {
    color: '#C97B63',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  emptyRequestCard: {
    backgroundColor: instructorPalette.surface,
    borderRadius: 18,
    padding: 14,
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
  advancedGraph: {
    backgroundColor: '#F6FBF8',
    borderColor: instructorPalette.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    marginTop: 2,
    padding: 12,
  },
  graphHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  graphTitle: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  graphValue: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  graphBars: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
    height: 64,
  },
  graphBarTrack: {
    backgroundColor: '#E6F0EB',
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
  graphModalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(21, 42, 35, 0.34)',
    flex: 1,
    justifyContent: 'center',
    padding: 18,
  },
  graphModalCard: {
    backgroundColor: instructorPalette.surface,
    borderRadius: 24,
    gap: 16,
    maxWidth: 420,
    padding: 18,
    width: '100%',
  },
  graphExplanationBox: {
    backgroundColor: instructorPalette.mint,
    borderRadius: 18,
    gap: 8,
    padding: 14,
  },
  graphExplanationTitle: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  graphExplanationText: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  graphInsightGrid: {
    gap: 7,
  },
  graphInsightRow: {
    backgroundColor: instructorPalette.surface,
    borderRadius: 14,
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  graphInsightLabel: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  graphInsightText: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 16,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(21, 42, 35, 0.34)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetModal: {
    backgroundColor: instructorPalette.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '88%',
    padding: 18,
  },
  modalHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  modalTitle: {
    color: instructorPalette.dark,
    fontFamily: 'SulphurPointBold',
    fontSize: 26,
    lineHeight: 28,
  },
  modalClose: {
    alignItems: 'center',
    backgroundColor: instructorPalette.mint,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  modalContent: {
    gap: 15,
    paddingBottom: 20,
    paddingTop: 15,
  },
  modalStatsRow: {
    flexDirection: 'row',
    gap: 9,
  },
  modalStat: {
    alignItems: 'center',
    backgroundColor: instructorPalette.mint,
    borderRadius: 16,
    flex: 1,
    gap: 3,
    justifyContent: 'center',
    minHeight: 78,
    padding: 8,
  },
  modalStatValue: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 17,
  },
  modalStatLabel: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 10,
  },
  modalSectionTitle: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
  },
  competenceCard: {
    backgroundColor: '#F7FBF8',
    borderColor: instructorPalette.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    padding: 12,
  },
  learnersToggle: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: instructorPalette.primary,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 14,
  },
  learnersPanel: {
    gap: 10,
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: '#F7FBF8',
    borderColor: instructorPalette.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  searchInput: {
    color: instructorPalette.text,
    flex: 1,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
  },
  learnerRow: {
    alignItems: 'center',
    backgroundColor: instructorPalette.surface,
    borderColor: instructorPalette.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 10,
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
