import { ProgressBar, StatusBadge } from '@/features/instructor/components/InstructorUI';
import { useAssignedSheetLabels } from '@/features/workspace/components/RealAcademicContext';
import { GeminiAssistantModule } from '@/features/workspace/components/GeminiAssistantModule';
import { ProjectConversations } from '@/features/workspace/components/ProjectConversations';
import { BitacorasReviewPanel } from '@/features/workspace/components/BitacorasReviewPanel';
import { UserAvatar } from '@/features/workspace/components/UserAvatar';
import { WorkspaceBottomBar, type BottomBarTab } from '@/features/workspace/components/WorkspaceBottomBar';
import type { AuthenticatedSession, WorkspaceAssistantPrompt } from '@/features/workspace/types';
import {
  buildAcademicAssistantContext,
  buildWorkspaceAssistantProjects,
} from '@/features/workspace/utils/academicAssistantContext';
import { actualizarPerfilUsuario } from '@/services/auth';
// @ts-ignore
import { escucharBitacoras } from '@/services/bitacoras';
// @ts-ignore
import { escucharContextoAcademicoUsuario, escucharGruposTrabajo, escucharProyectos } from '@/services/academic';
// @ts-ignore
import { escucharTareasPasanteAsignadas, marcarTareaPasanteHecha, marcarTareaPasantePendiente } from '@/services/pasanteTasks';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  pasanteAssignedLearners,
  pasanteMetrics,
  pasanteProjects,
  pasanteTasks,
  type PasanteAssignedLearner,
  type PasanteMetric,
  type PasanteProject,
  type PasanteTask,
} from '../data';
import { pasantePalette } from '../theme';

type PasanteTab = 'inicio' | 'seguimiento' | 'asistente' | 'proyectos' | 'perfil';

const tabs: BottomBarTab[] = [
  { id: 'inicio', icon: 'home-variant-outline' },
  { id: 'seguimiento', icon: 'clipboard-check-outline' },
  { id: 'proyectos', icon: 'message-text-outline' },
  { id: 'perfil', icon: 'account-circle-outline' },
];

const assistantPrompts: WorkspaceAssistantPrompt[] = [
  {
    id: 'resumen',
    title: 'Resumen técnico',
    detail: 'Ayúdame a redactar un resumen técnico corto del proyecto seleccionado.',
    icon: 'clipboard-text-outline',
  },
  {
    id: 'evidencia',
    title: 'Ordenar evidencia',
    detail: 'Convierte estas notas en una evidencia clara con hallazgo, soporte y siguiente paso.',
    icon: 'camera-outline',
  },
  {
    id: 'alerta',
    title: 'Analizar alerta',
    detail: 'Revisa esta alerta del cultivo y sugiere qué debería validar con el instructor.',
    icon: 'alert-circle-outline',
  },
];

const pasanteRealPrompts: WorkspaceAssistantPrompt[] = [
  {
    id: 'resumen-ficha-real',
    title: 'Resumen por ficha',
    detail: 'Genera un resumen de las fichas que acompano, proyectos activos, bitacoras recientes y alertas para escalar al instructor.',
    icon: 'school-outline',
  },
  {
    id: 'informe-tareas-real',
    title: 'Informe tareas',
    detail: 'Haz un informe de mis tareas asignadas con estado, pendientes, evidencias y acciones recomendadas.',
    icon: 'clipboard-check-outline',
  },
  {
    id: 'responder-aprendiz-real',
    title: 'Responder aprendiz',
    detail: 'Ayudame a responder una pregunta de un aprendiz usando el contexto real del proyecto y una explicacion tecnica clara.',
    icon: 'message-reply-text-outline',
  },
  {
    id: 'duda-tecnica-real',
    title: 'Duda tecnica',
    detail: 'Responde una duda tecnica de laboratorio y dime si debo escalarla al instructor.',
    icon: 'flask-outline',
  },
];

const demoPasanteQuestions = [
  {
    id: 'q1',
    learner: 'Nicolas Rodriguez',
    projectId: 'orquideas',
    question: 'La humedad bajo despues del cambio de medio. Debo repetir registro fotografico?',
    answer: 'Si. Toma foto comparativa y reporta el valor antes de mover el frasco.',
    status: 'Respondida',
  },
  {
    id: 'q2',
    learner: 'Mafe Rojas',
    projectId: 'fresas',
    question: 'Veo borde amarillento en dos explantes. Lo marco como alerta?',
    answer: 'Pendiente de revisar con el instructor en la validacion de la tarde.',
    status: 'Pendiente',
  },
];

const demoPasanteObservations = [
  {
    id: 'obs1',
    title: 'Observacion de contaminacion',
    detail: 'Lote de fresas con dos frascos aislados y evidencia fotografica solicitada.',
    target: 'Ficha 2693202 - Sarah Martinez',
    status: 'Por validar',
  },
  {
    id: 'obs2',
    title: 'Resumen tecnico enviado',
    detail: 'Arandanos mantiene enraizamiento estable; se recomienda conservar rutina de humedad.',
    target: 'Ficha 2693203 - Mafe Pineda',
    status: 'Compartida',
  },
];

const demoInstructorMessages = [
  {
    id: 'msg1',
    title: 'Reporte al instructor',
    detail: 'Solicitar revision del lote F-03 por coloracion irregular y baja humedad.',
    channel: 'Sarah Martinez',
  },
  {
    id: 'msg2',
    title: 'Novedad de practica',
    detail: 'Aprendices de la ficha 2693201 completaron evidencias de semana 5.',
    channel: 'Leonardo Rojas',
  },
];

const bottomBarTone = {
  activeIcon: '#D97862',
  activePill: '#EFA384',
  centerGradient: ['#FFE8DF', '#F2B39A', '#D97862', '#B76552'] as [string, string, string, string],
  centerShadow: '#EFA384',
  inactiveIcon: '#A59F98',
};

const assistantTone = {
  background: pasantePalette.background,
  border: pasantePalette.border,
  chatCaption: pasantePalette.textMuted,
  composerBorder: pasantePalette.border,
  composerHint: pasantePalette.textMuted,
  dark: pasantePalette.dark,
  greenText: pasantePalette.primary,
  lavanderText: pasantePalette.primary,
  mint: pasantePalette.surfaceMuted,
  primary: pasantePalette.primary,
  projectChipBg: pasantePalette.surfaceMuted,
  projectChipBorder: pasantePalette.border,
  secondary: pasantePalette.secondary,
  shadow: pasantePalette.shadow,
  softGreen: pasantePalette.softGreen,
  surface: pasantePalette.surface,
  surfaceMuted: pasantePalette.aquaSoft,
  switchActive: pasantePalette.primary,
  text: pasantePalette.text,
  textMuted: pasantePalette.textMuted,
};

type PasanteWorkspaceProps = {
  session: AuthenticatedSession;
  onSignOut: () => Promise<void> | void;
};

type RealProject = {
  id: string;
  titulo?: string;
  descripcion?: string;
  fichaId?: string;
  fichaNumero?: string;
  competenciaNombre?: string;
  rapDescripcion?: string;
  instructorUid?: string;
  aprendizIds?: string[];
  grupoId?: string | null;
  estado?: string;
  progreso?: number;
  activo?: boolean;
};

type RealLearner = {
  id: string;
  nombre?: string;
  correo?: string;
  photoUrl?: string | null;
  fichaId?: string | null;
};

type RealInstructor = {
  id: string;
  nombre?: string;
  correo?: string;
  photoUrl?: string | null;
};

type RealGroup = {
  id: string;
  fichaId?: string;
  fichaNumero?: string;
  aprendizIds?: string[];
  instructorUid?: string;
};

type RealSheet = {
  id: string;
  numero?: string;
  programaNombre?: string;
  instructorUids?: string[];
  trimestreActual?: string;
};

type RealBitacora = {
  id: string;
  aprendizUid?: string;
  aprendizNombre?: string;
  proyectoId?: string;
  proyectoTitulo?: string;
  fichaId?: string;
  fecha?: string;
  descripcion?: string;
  estado?: string;
  observacion?: string;
  creadoEn?: any;
  actualizadoEn?: any;
};

type PasanteAssignedTask = {
  id: string;
  titulo?: string;
  descripcion?: string;
  archivos: {
    nombre: string;
    mimeType: string;
    uri: string;
    url: string;
  }[];
  fichaId: string;
  fichaNumero?: string;
  proyectoId: string;
  proyectoTitulo: string;
  observacionInstructor?: string;
  observacionPasante: string;
  estado: 'Pendiente' | 'Hecho' | 'Validada';
  validadaPorInstructor: boolean;
  creadoEn?: any;
  actualizadoEn?: any;
};

export function PasanteWorkspace({ onSignOut, session }: PasanteWorkspaceProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<PasanteTab>('inicio');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [autoSummaryEnabled, setAutoSummaryEnabled] = useState(true);
  const [evidenceGuideEnabled, setEvidenceGuideEnabled] = useState(true);
  const [assistantProjectId, setAssistantProjectId] = useState(pasanteProjects[0]?.id || 'general');
  const [realProjects, setRealProjects] = useState<RealProject[]>([]);
  const [realSheets, setRealSheets] = useState<RealSheet[]>([]);
  const [realLearners, setRealLearners] = useState<RealLearner[]>([]);
  const [realInstructors, setRealInstructors] = useState<RealInstructor[]>([]);
  const [realCompetencias, setRealCompetencias] = useState<Record<string, any>[]>([]);
  const [realResultados, setRealResultados] = useState<Record<string, any>[]>([]);
  const [realAsignaciones, setRealAsignaciones] = useState<Record<string, any>[]>([]);
  const [realGroups, setRealGroups] = useState<RealGroup[]>([]);
  const [realBitacoras, setRealBitacoras] = useState<RealBitacora[]>([]);
  const [realTasks, setRealTasks] = useState<PasanteAssignedTask[]>([]);
  const [realFeedback, setRealFeedback] = useState('');
  const assignedFichas = Array.isArray(session.fichasAsignadas) ? session.fichasAsignadas : [];
  const assignedFichaSet = new Set(assignedFichas.map(String));
  const loadedSheetAliases = new Set(realSheets.flatMap((sheet) =>
    [sheet.id, sheet.numero].filter(Boolean).map(String)
  ));
  const assignedSheetsNotLoaded = new Set(
    assignedFichas.map(String).filter((value) => !loadedSheetAliases.has(value))
  );
  const assignedSheetCount = realSheets.length + assignedSheetsNotLoaded.size;
  const assignedProjectsFromSession = assignedFichaSet.size
    ? pasanteProjects.filter((project) => assignedFichaSet.has(project.ficha))
    : [];
  const assignedProjects = assignedProjectsFromSession.length ? assignedProjectsFromSession : pasanteProjects;
  const assignedTasks = assignedProjects.length
    ? pasanteTasks.filter((task) => assignedProjects.some((project) => project.id === task.projectId))
    : [];
  const assignedLearners = pasanteAssignedLearners.filter((learner) =>
    assignedProjects.some((project) => project.id === learner.projectId)
  );

  useEffect(() => {
    const handleError = (error: any) => setRealFeedback(error?.message || 'No pudimos cargar la información del pasante.');
    const unsubscribeContext = escucharContextoAcademicoUsuario(
      session,
      (context: any) => {
        setRealSheets(context.fichas || []);
        setRealLearners(context.aprendices || []);
        setRealInstructors(context.instructores || []);
        setRealCompetencias(context.competencias || []);
        setRealResultados(context.resultados || []);
        setRealAsignaciones(context.asignaciones || []);
      },
      handleError
    );
    const unsubscribeProjects = escucharProyectos(
      (items: RealProject[]) => setRealProjects(items),
      handleError
    );
    const unsubscribeGroups = escucharGruposTrabajo(
      (items: RealGroup[]) => setRealGroups(items),
      handleError
    );
    const unsubscribeBitacoras = escucharBitacoras(setRealBitacoras, handleError);
    const unsubscribeTasks = escucharTareasPasanteAsignadas(session.uid, setRealTasks, handleError);

    return () => {
      unsubscribeContext?.();
      unsubscribeProjects?.();
      unsubscribeGroups?.();
      unsubscribeBitacoras?.();
      unsubscribeTasks?.();
    };
  }, [session]);

  const inheritedFichaSet = new Set([
    ...Array.from(assignedFichaSet),
    ...realSheets.flatMap((sheet) => [sheet.id, sheet.numero].filter(Boolean).map(String)),
  ]);
  const assignedRealProjects = realProjects.filter((project) => {
    const sheetValues = [project.fichaId, project.fichaNumero].filter(Boolean).map(String);
    return project.activo !== false
      && project.estado !== 'Inactivo'
      && (
        project.instructorUid === session.instructorUid
        || sheetValues.some((value) => inheritedFichaSet.has(value))
      );
  });
  const realProjectIds = new Set(assignedRealProjects.map((project) => project.id));
  const realProjectGroups = realGroups.filter((group) =>
    assignedRealProjects.some((project) => project.grupoId === group.id)
  );
  const realBitacorasForProjects = realBitacoras.filter((bitacora) => realProjectIds.has(bitacora.proyectoId || ''));
  const realMetrics: PasanteMetric[] = [
    {
      id: 'fichas-reales',
      label: 'Fichas asignadas',
      value: String(assignedSheetCount),
      caption: 'Propias y del instructor',
      icon: 'school-outline',
      accent: pasantePalette.primary,
      soft: pasantePalette.aquaSoft,
    },
    {
      id: 'proyectos-reales',
      label: 'Proyectos activos',
      value: String(assignedRealProjects.length),
      caption: 'Con seguimiento técnico',
      icon: 'sprout-outline',
      accent: pasantePalette.green,
      soft: pasantePalette.softGreen,
    },
    {
      id: 'bitacoras-reales',
      label: 'Bitácoras',
      value: String(realBitacorasForProjects.length),
      caption: 'Disponibles para observar',
      icon: 'notebook-check-outline',
      accent: pasantePalette.secondary,
      soft: '#FFF1EB',
    },
    {
      id: 'tareas-reales',
      label: 'Tareas pendientes',
      value: String(realTasks.filter((task) => task.estado !== 'Validada').length),
      caption: 'Asignadas por instructor',
      icon: 'clipboard-check-outline',
      accent: pasantePalette.primary,
      soft: pasantePalette.surfaceMuted,
    },
  ];
  const realAssistantProjects = useMemo(
    () => buildWorkspaceAssistantProjects(assignedRealProjects, 'Resumen general del pasante'),
    [assignedRealProjects]
  );
  const pasanteSystemContext = useMemo(
    () => [
      'Eres BIOMIND IA para pasantes de biotecnologia vegetal.',
      'Ayudas a responder preguntas tecnicas, preparar respuestas para aprendices, resumir fichas, revisar proyectos, organizar tareas y generar informes con informacion real visible para el pasante.',
      autoSummaryEnabled
        ? 'Si el pasante pide una respuesta extensa, entrega primero un resumen tecnico breve y luego acciones concretas.'
        : 'No generes resumenes automaticos largos; responde de forma puntual y solo resume si el usuario lo pide explicitamente.',
      evidenceGuideEnabled
        ? 'Cuando haya fotos, hallazgos o evidencias, ordena la informacion en hallazgo, soporte y siguiente paso.'
        : 'No fuerces estructura de evidencias; prioriza una respuesta conversacional y directa.',
      buildAcademicAssistantContext({
        asignaciones: realAsignaciones,
        aprendices: realLearners,
        bitacoras: realBitacorasForProjects,
        competencias: realCompetencias,
        fichas: realSheets,
        grupos: realProjectGroups,
        instructores: realInstructors,
        pasantes: [],
        proyectos: assignedRealProjects,
        resultados: realResultados,
        roleLabel: 'pasante',
        session,
        tareasPasante: realTasks,
      }),
    ].join('\n\n'),
    [
      assignedRealProjects,
      autoSummaryEnabled,
      evidenceGuideEnabled,
      realAsignaciones,
      realBitacorasForProjects,
      realCompetencias,
      realInstructors,
      realLearners,
      realProjectGroups,
      realResultados,
      realSheets,
      realTasks,
      session,
    ]
  );

  const [fontsLoaded] = useFonts({
    PoppinsRegular: require('../../../assets/fonts/Poppins-Regular.ttf'),
    PoppinsMedium: require('../../../assets/fonts/Poppins/Poppins-Medium.ttf'),
    PoppinsSemiBold: require('../../../assets/fonts/Poppins/Poppins-SemiBold.ttf'),
    SulphurPointBold: require('../../../assets/fonts/SulphurPoint-Bold.ttf'),
  });
  const pasanteAssistantPrompts = useMemo(() => {
    const prompts = [
      ...pasanteRealPrompts.filter((prompt) => autoSummaryEnabled || !['resumen-ficha-real', 'informe-tareas-real'].includes(prompt.id)),
      ...assistantPrompts.filter((prompt) => evidenceGuideEnabled || prompt.id !== 'evidencia'),
    ];

    return prompts.length ? prompts : pasanteRealPrompts.filter((prompt) => prompt.id === 'responder-aprendiz-real');
  }, [autoSummaryEnabled, evidenceGuideEnabled]);

  if (!fontsLoaded) {
    return null;
  }

  // Bloqueo: si el pasante no tiene instructor asignado o no tiene fichas, mostrar mensaje claro
  const hasInstructor = Boolean(session.instructorUid);
  const hasFichas = assignedFichas.length > 0 || realSheets.length > 0;

  if (!hasInstructor || !hasFichas) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.screen}>
          <View style={styles.centerBlock}>
            <MaterialCommunityIcons name="alert-circle-outline" size={48} color={pasantePalette.primary} />
            <Text style={styles.blockTitle}>Acceso restringido</Text>
            <Text style={styles.blockText}>
              {!hasInstructor
                ? 'Aún no tienes un instructor asignado.'
                : 'No tienes fichas asignadas. Pide al instructor que te asigne fichas para acceder a la aplicación.'
              }
            </Text>
            <Pressable onPress={onSignOut} style={styles.signOutButton}>
              <MaterialCommunityIcons name="logout" size={18} color="#FFFFFF" />
              <Text style={styles.signOutText}>Cerrar sesión</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const openAssistantForProject = (projectId: string) => {
    setAssistantProjectId(projectId);
    setActiveTab('asistente');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        style={styles.screen}>
        <ScrollView
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 124 }]}>
          {activeTab === 'inicio' ? <HeaderCard session={session} /> : null}
          {activeTab === 'inicio' && (
            <>
              <PasanteHomeTab
                metrics={realMetrics}
                projects={assignedProjects}
                realBitacoras={realBitacorasForProjects}
                realInstructors={realInstructors}
                realLearners={realLearners}
                realProjects={assignedRealProjects}
                realSheets={realSheets}
                session={session}
                tasks={assignedTasks}
                realTasks={realTasks}
                onOpenAssistant={openAssistantForProject}
                onOpenNews={() => setActiveTab('seguimiento')}
              />
              {realFeedback ? <Text style={styles.feedbackText}>{realFeedback}</Text> : null}
            </>
          )}
          {activeTab === 'seguimiento' && (
            <PasanteTrackingTab
              bitacoras={realBitacorasForProjects}
              groups={realProjectGroups}
              learners={assignedLearners}
              realLearners={realLearners}
              realProjects={assignedRealProjects}
              realTasks={realTasks}
              projects={assignedProjects}
              tasks={assignedTasks}
              onOpenAssistant={openAssistantForProject}
              session={session}
            />
          )}
          {activeTab === 'asistente' && (
            <GeminiAssistantModule
              assistantQuestionsEnabledDefault
              composerPlaceholder="Escribe tus notas de práctica, dudas técnicas o hallazgos para convertirlos en evidencia..."
              chatChannel="pasante"
              emptyStateLabel="Apoyo técnico del pasante"
              preferredProjectId={assistantProjectId}
              projects={realAssistantProjects}
              prompts={pasanteAssistantPrompts}
              roleLabel="Pasante IA"
              session={session}
              subtitle="Organiza evidencias, prepara resúmenes técnicos y valida observaciones antes de enviarlas al instructor."
              systemContext={pasanteSystemContext}
              title="Asistente técnico de práctica"
              tone={assistantTone}
              voiceEnabled={voiceEnabled}
              welcomeMessage="Hola. Soy tu asistente de Biomind para pasantes. Puedo ayudarte a convertir notas de laboratorio en evidencias claras, preparar resúmenes técnicos y ordenar dudas para el instructor."
            />
          )}
          {activeTab === 'proyectos' && (
            <ProjectConversations
              session={session}
              tone={{
                accent: pasantePalette.primary,
                background: pasantePalette.background,
                border: pasantePalette.border,
                incoming: pasantePalette.surface,
                muted: pasantePalette.textMuted,
                outgoing: pasantePalette.aquaSoft,
                surface: pasantePalette.surface,
                text: pasantePalette.text,
              }}
            />
          )}
          {activeTab === 'perfil' && (
            <PasanteProfileTab
              autoSummaryEnabled={autoSummaryEnabled}
              evidenceGuideEnabled={evidenceGuideEnabled}
              session={session}
              voiceEnabled={voiceEnabled}
              onAutoSummaryChange={setAutoSummaryEnabled}
              onEvidenceGuideChange={setEvidenceGuideEnabled}
              onSignOut={onSignOut}
              onVoiceChange={setVoiceEnabled}
            />
          )}
        </ScrollView>

        <WorkspaceBottomBar
          activeTab={activeTab}
          bottomInset={insets.bottom}
          centerIcon="star-four-points"
          centerTabId="asistente"
          tabs={tabs}
          tone={bottomBarTone}
          onCenterPress={() => setActiveTab('asistente')}
          onTabPress={(tabId) => setActiveTab(tabId as PasanteTab)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function HeaderCard({ session }: { session: AuthenticatedSession }) {
  return (
    <View style={styles.headerCard}>
      <View style={styles.headerTopRow}>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>BIOMIND</Text>
        </View>
        <View style={styles.rolePill}>
          <MaterialCommunityIcons name="account-tie-outline" size={14} color={pasantePalette.primary} />
          <Text style={styles.rolePillText}>{session.role}</Text>
        </View>
      </View>

      <View style={styles.headerMainRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Hola, {getFirstName(session.name)}</Text>
          <Text style={styles.headerSubtitle}>
            Apoya prácticas, evidencias, cultivos y validaciones con tu equipo Biomind.
          </Text>
        </View>
        <UserAvatar name={session.name} photoUrl={session.photoUrl} size={82} />
      </View>
    </View>
  );
}

function SectionHeading({
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

function SectionTitle({ title, titleStyle }: { title: string; titleStyle?: any }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionCopy}>
        <Text style={[styles.sectionTitle, titleStyle]}>{title}</Text>
      </View>
    </View>
  );
}

function PasanteHomeTab({
  metrics,
  projects,
  realBitacoras,
  realInstructors,
  realLearners,
  realProjects,
  realSheets,
  realTasks,
  session,
  tasks,
  onOpenAssistant,
  onOpenNews,
}: {
  metrics: PasanteMetric[];
  projects: PasanteProject[];
  realBitacoras: RealBitacora[];
  realInstructors: RealInstructor[];
  realLearners: RealLearner[];
  realProjects: RealProject[];
  realSheets: RealSheet[];
  realTasks: PasanteAssignedTask[];
  session: AuthenticatedSession;
  tasks: PasanteTask[];
  onOpenAssistant: (projectId: string) => void;
  onOpenNews: () => void;
}) {
  const [sheetModalOpen, setSheetModalOpen] = useState(false);
  const [selectedInstructorId, setSelectedInstructorId] = useState('');
  const [selectedSheetId, setSelectedSheetId] = useState('');
  const [learnerSearch, setLearnerSearch] = useState('');
  const [learnersOpen, setLearnersOpen] = useState(false);
  const visibleMetrics = metrics.length ? metrics : pasanteMetrics;
  const projectById = useMemo(
    () => new Map(realProjects.map((project) => [project.id, project])),
    [realProjects]
  );
  const instructorOptions = useMemo(() => {
    const options = realInstructors.map((instructor) => ({
      id: instructor.id,
      name: instructor.nombre || instructor.correo || 'Instructor',
      subtitle: instructor.correo || 'Instructor asignado',
      photoUrl: instructor.photoUrl || null,
    }));

    if (session.instructorUid && !options.some((item) => item.id === session.instructorUid)) {
      options.push({
        id: session.instructorUid,
        name: 'Instructor asignado',
        subtitle: 'Asignado a tu acompañamiento',
        photoUrl: null,
      });
    }

    return options;
  }, [realInstructors, session.instructorUid]);
  const newsItems = useMemo(() => {
    const taskNews = realTasks.map((task) => ({
      id: `task-${task.id}`,
      accent: task.estado === 'Validada' ? pasantePalette.green : task.estado === 'Hecho' ? pasantePalette.secondary : pasantePalette.primary,
      detail: task.proyectoTitulo || `Ficha ${task.fichaNumero || task.fichaId || 'general'}`,
      icon: 'clipboard-text-outline' as const,
      timestamp: getMillis(task.actualizadoEn) || getMillis(task.creadoEn),
      title: task.titulo || 'Tarea asignada',
      type: task.estado === 'Validada' ? 'Tarea validada' : task.estado === 'Hecho' ? 'Tarea enviada' : 'Tarea pendiente',
    }));
    const bitacoraNews = realBitacoras.map((bitacora) => {
      const project = projectById.get(bitacora.proyectoId || '');
      return {
        id: `bitacora-${bitacora.id}`,
        accent: bitacora.estado === 'Aprobada' ? pasantePalette.green : pasantePalette.secondary,
        detail: `${project?.titulo || bitacora.proyectoTitulo || 'Proyecto'} - ${bitacora.aprendizNombre || 'Aprendiz'}`,
        icon: bitacora.observacion ? 'comment-check-outline' as const : 'notebook-check-outline' as const,
        timestamp: getMillis(bitacora.actualizadoEn) || getMillis(bitacora.creadoEn) || getDateMillis(bitacora.fecha || ''),
        title: bitacora.observacion ? 'Bitácora observada' : 'Bitácora nueva',
        type: bitacora.estado || 'Por revisar',
      };
    });

    return [...taskNews, ...bitacoraNews]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 8);
  }, [projectById, realBitacoras, realTasks]);

  useEffect(() => {
    if (!selectedInstructorId || !instructorOptions.some((option) => option.id === selectedInstructorId)) {
      setSelectedInstructorId(instructorOptions[0]?.id || '');
      setSelectedSheetId('');
      setLearnersOpen(false);
      setLearnerSearch('');
    }
  }, [instructorOptions, selectedInstructorId]);

  return (
    <>
      <View style={styles.summarySection}>
        <SectionTitle title="Resumen de práctica" titleStyle={styles.summarySectionTitle} />
        <View style={styles.metricsRow}>
          {visibleMetrics.map((metric) => (
            <MetricCard
              key={metric.id}
              metric={metric}
              onPress={metric.id === 'fichas-reales' ? () => setSheetModalOpen(true) : undefined}
            />
          ))}
        </View>
      </View>

      <PasanteSheetsModal
        instructorOptions={instructorOptions}
        learners={realLearners}
        learnersOpen={learnersOpen}
        learnerSearch={learnerSearch}
        projects={realProjects}
        selectedInstructorId={selectedInstructorId}
        selectedSheetId={selectedSheetId}
        sheets={realSheets}
        visible={sheetModalOpen}
        onClose={() => setSheetModalOpen(false)}
        onInstructorChange={(instructorId) => {
          setSelectedInstructorId(instructorId);
          setSelectedSheetId('');
          setLearnersOpen(false);
          setLearnerSearch('');
        }}
        onLearnerSearch={setLearnerSearch}
        onSelectSheet={(sheetId) => {
          setSelectedSheetId(sheetId);
          setLearnersOpen(false);
          setLearnerSearch('');
        }}
        onToggleLearners={() => setLearnersOpen((current) => !current)}
      />

      <SectionHeading
        actionLabel={`${newsItems.length} recientes`}
        subtitle="Actualizaciones de tareas, bitácoras y observaciones asignadas."
        title="Novedades"
      />
      {newsItems.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.newsCarouselContent}>
          {newsItems.map((item) => (
            <PasanteNewsCard key={item.id} item={item} onPress={onOpenNews} />
          ))}
        </ScrollView>
      ) : (
        <EmptyAssignedState />
      )}

      <SectionHeading
        actionLabel="Hoy"
        subtitle="Actividades y validaciones que acompañas en laboratorio."
        title="Agenda técnica"
      />
      <View style={styles.stack}>
        {realTasks.length ? (
          realTasks.slice(0, 3).map((task) => (
            <DashboardPasanteTaskCard key={task.id} task={task} />
          ))
        ) : tasks.length ? (
          tasks.slice(0, 2).map((task) => (
            <TaskCard key={task.id} projects={projects} task={task} onOpenAssistant={onOpenAssistant} />
          ))
        ) : (
          <EmptyAssignedState />
        )}
      </View>

    </>
  );
}

function PasanteSheetsModal({
  instructorOptions,
  learners,
  learnersOpen,
  learnerSearch,
  projects,
  selectedInstructorId,
  selectedSheetId,
  sheets,
  visible,
  onClose,
  onInstructorChange,
  onLearnerSearch,
  onSelectSheet,
  onToggleLearners,
}: {
  instructorOptions: { id: string; name: string; subtitle: string; photoUrl: string | null }[];
  learners: RealLearner[];
  learnersOpen: boolean;
  learnerSearch: string;
  projects: RealProject[];
  selectedInstructorId: string;
  selectedSheetId: string;
  sheets: RealSheet[];
  visible: boolean;
  onClose: () => void;
  onInstructorChange: (instructorId: string) => void;
  onLearnerSearch: (value: string) => void;
  onSelectSheet: (sheetId: string) => void;
  onToggleLearners: () => void;
}) {
  const selectedInstructor = instructorOptions.find((item) => item.id === selectedInstructorId);
  const sheetsForInstructor = sheets.filter((sheet) => {
    const sheetInstructorUids = Array.isArray(sheet.instructorUids) ? sheet.instructorUids : [];
    const hasProjectWithInstructor = projects.some((project) =>
      project.instructorUid === selectedInstructorId
      && (project.fichaId === sheet.id || project.fichaNumero === sheet.numero)
    );

    return !selectedInstructorId || sheetInstructorUids.includes(selectedInstructorId) || hasProjectWithInstructor;
  });
  const visibleSheets = sheetsForInstructor.length || !selectedInstructorId ? sheetsForInstructor : sheets;
  const selectedSheet = visibleSheets.find((sheet) => sheet.id === selectedSheetId);
  const sheetProjects = selectedSheet
    ? projects.filter((project) =>
      (project.fichaId === selectedSheet.id || project.fichaNumero === selectedSheet.numero)
      && (!selectedInstructorId || project.instructorUid === selectedInstructorId || !project.instructorUid)
    )
    : [];
  const sheetLearners = selectedSheet
    ? learners.filter((learner) => learner.fichaId === selectedSheet.id)
    : [];
  const filteredLearners = sheetLearners.filter((learner) =>
    `${learner.nombre || ''} ${learner.correo || ''}`.toLowerCase().includes(learnerSearch.trim().toLowerCase())
  );

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.pasanteSheetModal}>
          <View style={styles.modalHeader}>
            <View style={styles.cardCopy}>
              <Text style={styles.modalEyebrow}>Fichas asignadas</Text>
              <Text style={styles.modalTitle}>
                {selectedSheet ? `Ficha ${selectedSheet.numero || selectedSheet.id}` : 'Vista por instructor'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {selectedInstructor ? selectedInstructor.name : 'Selecciona el instructor para ver sus fichas.'}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.modalClose}>
              <MaterialCommunityIcons name="close" size={20} color={pasantePalette.primary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalSectionTitle}>Instructor</Text>
            <View style={styles.selectorList}>
              {instructorOptions.length ? instructorOptions.map((instructor) => {
                const active = instructor.id === selectedInstructorId;
                return (
                  <Pressable
                    key={instructor.id}
                    onPress={() => onInstructorChange(instructor.id)}
                    style={[styles.selectorCard, active && styles.selectorCardActive]}>
                    <UserAvatar name={instructor.name} photoUrl={instructor.photoUrl} size={38} />
                    <View style={styles.cardCopy}>
                      <Text style={[styles.selectorTitle, active && styles.selectorTitleActive]}>{instructor.name}</Text>
                      <Text style={styles.selectorSubtitle}>{instructor.subtitle}</Text>
                    </View>
                    {active ? <MaterialCommunityIcons name="check-circle" size={18} color={pasantePalette.primary} /> : null}
                  </Pressable>
                );
              }) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No encontramos instructores asociados.</Text>
                </View>
              )}
            </View>

            <Text style={styles.modalSectionTitle}>Ficha</Text>
            <View style={styles.selectorList}>
              {visibleSheets.length ? visibleSheets.map((sheet) => {
                const active = sheet.id === selectedSheetId;
                const sheetProjectCount = projects.filter((project) =>
                  project.fichaId === sheet.id || project.fichaNumero === sheet.numero
                ).length;
                return (
                  <Pressable
                    key={sheet.id}
                    onPress={() => onSelectSheet(sheet.id)}
                    style={[styles.selectorCard, active && styles.selectorCardActive]}>
                    <View style={styles.sheetSelectorIcon}>
                      <MaterialCommunityIcons name="school-outline" size={19} color={pasantePalette.primary} />
                    </View>
                    <View style={styles.cardCopy}>
                      <Text style={[styles.selectorTitle, active && styles.selectorTitleActive]}>
                        Ficha {sheet.numero || sheet.id}
                      </Text>
                      <Text style={styles.selectorSubtitle}>
                        {sheet.programaNombre || 'Programa pendiente'} - {sheetProjectCount} proyecto(s)
                      </Text>
                    </View>
                  </Pressable>
                );
              }) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>Este instructor no tiene fichas visibles para tu usuario.</Text>
                </View>
              )}
            </View>

            {selectedSheet ? (
              <>
                <View style={styles.modalStatsRow}>
                  <ModalInfoStat icon="account-multiple-outline" label="Aprendices" value={String(sheetLearners.length)} />
                  <ModalInfoStat icon="briefcase-outline" label="Proyectos" value={String(sheetProjects.length)} />
                  <ModalInfoStat icon="calendar-outline" label="Trimestre" value={selectedSheet.trimestreActual || 'S/T'} />
                </View>

                <Text style={styles.modalSectionTitle}>Información de la ficha</Text>
                <View style={styles.modalInfoCard}>
                  <Text style={styles.cardTitle}>{selectedSheet.programaNombre || 'Programa pendiente'}</Text>
                  <Text style={styles.cardText}>
                    Instructor: {selectedInstructor?.name || 'Instructor asignado'}
                  </Text>
                  <Text style={styles.cardText}>
                    Proyectos activos: {sheetProjects.length || 0}
                  </Text>
                </View>

                <Pressable onPress={onToggleLearners} style={styles.learnersToggle}>
                  <Text style={styles.learnersToggleText}>{learnersOpen ? 'Ocultar aprendices' : 'Ver aprendices'}</Text>
                  <MaterialCommunityIcons name={learnersOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#FFFFFF" />
                </Pressable>

                {learnersOpen ? (
                  <View style={styles.learnersPanel}>
                    <View style={styles.searchBox}>
                      <MaterialCommunityIcons name="magnify" size={18} color={pasantePalette.textMuted} />
                      <TextInput
                        placeholder="Buscar aprendiz..."
                        placeholderTextColor={pasantePalette.textMuted}
                        value={learnerSearch}
                        onChangeText={onLearnerSearch}
                        style={styles.searchInput}
                      />
                    </View>
                    {filteredLearners.length ? filteredLearners.map((learner) => (
                      <View key={learner.id} style={styles.learnerRow}>
                        <UserAvatar name={learner.nombre || learner.correo || 'Aprendiz'} photoUrl={learner.photoUrl || null} size={38} />
                        <View style={styles.cardCopy}>
                          <Text style={styles.cardTitle}>{learner.nombre || 'Aprendiz'}</Text>
                          <Text style={styles.cardMeta}>{learner.correo || 'Sin correo'}</Text>
                        </View>
                      </View>
                    )) : <Text style={styles.emptyText}>No hay aprendices con esa búsqueda.</Text>}
                  </View>
                ) : null}
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ModalInfoStat({
  icon,
  label,
  value,
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.modalStat}>
      <MaterialCommunityIcons name={icon} size={18} color={pasantePalette.primary} />
      <Text style={styles.modalStatValue}>{value}</Text>
      <Text style={styles.modalStatLabel}>{label}</Text>
    </View>
  );
}

function PasanteNewsCard({
  item,
  onPress,
}: {
  item: {
    accent: string;
    detail: string;
    icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
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

function PasanteTrackingTab({
  bitacoras,
  groups,
  learners,
  projects,
  realLearners,
  realProjects,
  realTasks,
  session,
  tasks,
  onOpenAssistant,
}: {
  bitacoras: RealBitacora[];
  groups: RealGroup[];
  learners: PasanteAssignedLearner[];
  projects: PasanteProject[];
  realLearners: RealLearner[];
  realProjects: RealProject[];
  realTasks: PasanteAssignedTask[];
  session: AuthenticatedSession;
  tasks: PasanteTask[];
  onOpenAssistant: (projectId: string) => void;
}) {
  if (realProjects.length) {
    return (
      <PasanteTechnicalTracking
        bitacoras={bitacoras}
        groups={groups}
        learners={realLearners}
        projects={realProjects}
        session={session}
        tasks={realTasks}
      />
    );
  }

  return (
    <>
      <IntroCard
        label="Seguimiento técnico"
        text="Revisa tareas asignadas, prepara evidencias y deja cada observación lista para validación."
        title="Validaciones, tareas y práctica."
      />

      <SectionHeading
        actionLabel={`${learners.length} activos`}
        subtitle="Aprendices y fichas que el pasante puede consultar y acompañar."
        title="Aprendices asignados"
      />
      <View style={styles.stack}>
        {learners.length ? (
          learners.map((learner) => (
            <AssignedLearnerCard key={learner.id} learner={learner} onOpenAssistant={onOpenAssistant} />
          ))
        ) : (
          <EmptyAssignedState />
        )}
      </View>

      <SectionHeading
        actionLabel="Tareas"
        subtitle="Elementos que puedes documentar o consultar con la IA."
        title="Pendientes"
      />
      <View style={styles.stack}>
        {tasks.length ? (
          tasks.map((task) => (
            <TaskCard key={task.id} projects={projects} task={task} onOpenAssistant={onOpenAssistant} />
          ))
        ) : (
          <EmptyAssignedState />
        )}
      </View>

      <SectionHeading
        actionLabel="Preguntas"
        subtitle="Consultas de aprendices asignados y respuestas de apoyo."
        title="Preguntas y respuestas"
      />
      <View style={styles.stack}>
        {demoPasanteQuestions.map((thread) => (
          <QuestionCard key={thread.id} thread={thread} />
        ))}
      </View>

      <SectionHeading
        actionLabel="Observaciones"
        subtitle="Notas tecnicas listas para revision o seguimiento."
        title="Observaciones registradas"
      />
      <View style={styles.stack}>
        {demoPasanteObservations.map((observation) => (
          <ObservationCard key={observation.id} observation={observation} />
        ))}
      </View>

      <SectionHeading
        actionLabel="Instructor"
        subtitle="Novedades y preguntas que el pasante eleva al instructor."
        title="Comunicacion"
      />
      <View style={styles.stack}>
        {demoInstructorMessages.map((message) => (
          <InstructorMessageCard key={message.id} message={message} />
        ))}
      </View>
    </>
  );
}

function PasanteTechnicalTracking({
  bitacoras,
  groups,
  learners,
  projects,
  session,
}: {
  bitacoras: RealBitacora[];
  groups: RealGroup[];
  learners: RealLearner[];
  projects: RealProject[];
  session: AuthenticatedSession;
  tasks: PasanteAssignedTask[];
}) {
  const [selectedSheet, setSelectedSheet] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedLearnerId, setSelectedLearnerId] = useState('');
  const [feedback] = useState('');

  const sheets = Array.from(new Map(projects.map((project) => [
    project.fichaId || project.fichaNumero || '',
    {
      id: project.fichaId || project.fichaNumero || '',
      label: `Ficha ${project.fichaNumero || project.fichaId || 'sin ficha'}`,
    },
  ])).values()).filter((sheet) => sheet.id);

  useEffect(() => {
    if (!selectedSheet || !sheets.some((sheet) => sheet.id === selectedSheet)) {
      setSelectedSheet(sheets[0]?.id || '');
      setSelectedProjectId('');
      setSelectedLearnerId('');
    }
  }, [selectedSheet, sheets]);

  const sheetProjects = projects.filter((project) => (project.fichaId || project.fichaNumero || '') === selectedSheet);
  const selectedProject = sheetProjects.find((project) => project.id === selectedProjectId) || sheetProjects[0];
  const selectedGroup = groups.find((group) => group.id === selectedProject?.grupoId);
  const learnerIds = new Set<string>();
  (selectedProject?.aprendizIds || []).forEach((id) => learnerIds.add(id));
  (selectedGroup?.aprendizIds || []).forEach((id) => learnerIds.add(id));
  const projectLearners = learners.filter((learner) => learnerIds.has(learner.id));
  const projectBitacoras = bitacoras
    .filter((bitacora) => bitacora.proyectoId === selectedProject?.id)
    .filter((bitacora) => !selectedLearnerId || bitacora.aprendizUid === selectedLearnerId);
  const reviewed = bitacoras.filter((bitacora) => bitacora.proyectoId === selectedProject?.id && bitacora.observacion).length;
  const approved = bitacoras.filter((bitacora) => bitacora.proyectoId === selectedProject?.id && bitacora.estado === 'Aprobada').length;
  const total = bitacoras.filter((bitacora) => bitacora.proyectoId === selectedProject?.id).length;
  const selectedSheetLabel = sheets.find((sheet) => sheet.id === selectedSheet)?.label || 'Ficha sin seleccionar';
  const projectProgress = Number(selectedProject?.progreso || 0);
  const reviewProgress = total ? Math.round((reviewed / total) * 100) : 0;
  const approvalProgress = total ? Math.round((approved / total) * 100) : 0;

  return (
    <>
      <IntroCard
        label="Seguimiento técnico"
        text="Consulta proyectos por ficha, revisa aprendices y deja observaciones en bitácoras sin modificar estados."
        title="Acompañamiento real por ficha."
      />

      <View style={styles.trackingPanel}>
        <View style={styles.trackingPanelHeader}>
          <View style={styles.cardCopy}>
            <Text style={styles.trackingEyebrow}>{selectedSheetLabel}</Text>
            <Text style={styles.trackingTitle}>{selectedProject?.titulo || 'Proyecto sin seleccionar'}</Text>
            <Text style={styles.trackingText}>
              {selectedProject?.competenciaNombre || 'Sin competencia'} - {selectedProject?.rapDescripcion || 'RAP pendiente'}
            </Text>
          </View>
          <StatusBadge
            accent={selectedProject?.estado === 'Aprobado' ? pasantePalette.green : pasantePalette.primary}
            label={selectedProject?.estado || 'Pendiente'}
            soft={selectedProject?.estado === 'Aprobado' ? pasantePalette.softGreen : pasantePalette.aquaSoft}
          />
        </View>

        <View style={styles.trackingProgressBlock}>
          <View style={styles.trackingProgressHeader}>
            <Text style={styles.trackingProgressLabel}>Avance del proyecto</Text>
            <Text style={styles.trackingProgressValue}>{projectProgress}%</Text>
          </View>
          <ProgressBar accent={pasantePalette.green} progress={projectProgress} soft={pasantePalette.softGreen} />
        </View>

        <View style={styles.trackingFiltersGrid}>
          <PasanteSearchableSelector
            label="Ficha"
            options={sheets.map((sheet, index) => ({ label: `${index + 1}. ${sheet.label}`, value: sheet.id }))}
            value={selectedSheet}
            onChange={(sheetId) => {
              setSelectedSheet(sheetId);
              setSelectedProjectId('');
              setSelectedLearnerId('');
            }}
          />
          <PasanteSearchableSelector
            label="Proyecto"
            options={sheetProjects.map((project, index) => ({
              label: `${index + 1}. ${project.titulo || 'Proyecto'}`,
              subtitle: project.competenciaNombre || 'Sin competencia',
              value: project.id,
            }))}
            value={selectedProject?.id || ''}
            onChange={(projectId) => {
              setSelectedProjectId(projectId);
              setSelectedLearnerId('');
            }}
          />
          <PasanteSearchableSelector
            label="Aprendiz"
            options={[
              { label: 'Todos', subtitle: 'Ver bitacoras de todo el proyecto', value: '' },
              ...projectLearners.map((learner, index) => ({
                label: `${index + 1}. ${learner.nombre || learner.correo || 'Aprendiz'}`,
                subtitle: learner.correo || '',
                value: learner.id,
              })),
            ]}
            value={selectedLearnerId}
            onChange={setSelectedLearnerId}
          />
        </View>

        <View style={styles.trackingMetricsRow}>
          <MetricCard compact metric={{ id: 'rev', label: 'Observadas', value: `${reviewed}/${total}`, caption: `${reviewProgress}% con feedback`, icon: 'eye-check-outline', accent: pasantePalette.primary, soft: pasantePalette.aquaSoft }} />
          <MetricCard compact metric={{ id: 'apr', label: 'Aprobadas', value: `${approved}`, caption: `${approvalProgress}% validadas`, icon: 'check-decagram-outline', accent: pasantePalette.green, soft: pasantePalette.softGreen }} />
        </View>
      </View>

      <SectionHeading actionLabel={`${projectBitacoras.length} registros`} subtitle="El pasante solo puede registrar observaciones." title="Bitácoras" />
      <BitacorasReviewPanel bitacoras={projectBitacoras as any} mode="observation" session={session} />
      {feedback ? <Text style={styles.feedbackText}>{feedback}</Text> : null}
    </>
  );
}
function PasanteProjectsTab({
  projects,
  onOpenAssistant,
}: {
  projects: PasanteProject[];
  onOpenAssistant: (projectId: string) => void;
}) {
  return (
    <>
      <IntroCard
        label="Gestión de cultivos"
        text="Consulta el avance de los cultivos, las evidencias reunidas y el siguiente paso técnico."
        title="Proyectos en práctica."
      />

      <SectionHeading
        actionLabel="Activos"
        subtitle="Cada proyecto conserva su contexto para abrir el asistente correcto."
        title="Cultivos asignados"
      />
      <View style={styles.stack}>
        {projects.length ? (
          projects.map((project) => (
            <ProjectCard key={project.id} project={project} onOpenAssistant={onOpenAssistant} />
          ))
        ) : (
          <EmptyAssignedState />
        )}
      </View>
    </>
  );
}

function PasanteProfileTab({
  autoSummaryEnabled,
  evidenceGuideEnabled,
  session,
  voiceEnabled,
  onAutoSummaryChange,
  onEvidenceGuideChange,
  onSignOut,
  onVoiceChange,
}: {
  autoSummaryEnabled: boolean;
  evidenceGuideEnabled: boolean;
  session: AuthenticatedSession;
  voiceEnabled: boolean;
  onAutoSummaryChange: (value: boolean) => void;
  onEvidenceGuideChange: (value: boolean) => void;
  onSignOut: () => Promise<void> | void;
  onVoiceChange: (value: boolean) => void;
}) {
  const [name, setName] = useState(session.name);
  const [email, setEmail] = useState(session.email);
  const [photoUri, setPhotoUri] = useState(session.photoUrl || '');
  const [photoBase64, setPhotoBase64] = useState('');
  const [photoMimeType, setPhotoMimeType] = useState('image/jpeg');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const assignedSheetLabels = useAssignedSheetLabels(session);
  const assignedSheetsText = assignedSheetLabels.length
    ? assignedSheetLabels.join(', ')
    : 'Pendiente de asignación por instructor';

  useEffect(() => {
    setName(session.name);
    setEmail(session.email);
    setPhotoUri(session.photoUrl || '');
  }, [session.email, session.name, session.photoUrl]);

  const pickProfilePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setFeedback('Necesitamos permiso para abrir tu galería y cambiar la foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.35,
      base64: true,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];

    if (!asset.base64) {
      setFeedback('No pudimos preparar la foto para guardarla. Intenta con otra imagen.');
      return;
    }

    setPhotoUri(asset.uri);
    setPhotoBase64(asset.base64);
    setPhotoMimeType(asset.mimeType || 'image/jpeg');
    setFeedback('Foto lista para guardarse en tu perfil.');
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setFeedback('Falta el nombre. Ingresa tu nombre antes de guardar el perfil.');
      return;
    }
    if (!email.trim()) {
      setFeedback('Ingresa un correo válido antes de guardar.');
      return;
    }

    setSaving(true);
    setFeedback('');

    try {
      const updatedProfile = await actualizarPerfilUsuario({
        correo: email,
        nombre: name,
        fotoPerfilBase64: photoBase64 || undefined,
        fotoPerfilMimeType: photoBase64 ? photoMimeType : undefined,
      });
      setPhotoBase64('');
      if (updatedProfile?.fotoUrl) {
        setPhotoUri(updatedProfile.fotoUrl);
      }
      setFeedback('Perfil actualizado correctamente.');
    } catch (error) {
      const typedError = error as { message?: string };
      setFeedback(typedError?.message || 'No pudimos actualizar tu perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>

      <View style={styles.profileCard}>
        <Pressable onPress={pickProfilePhoto} style={styles.avatarWrap}>
          <UserAvatar name={name} photoUrl={photoUri || session.photoUrl} size={100} />
          <View style={styles.cameraBadge}>
            <Text style={styles.cameraBadgeText}>Cambiar foto</Text>
          </View>
        </Pressable>

        <View style={styles.formStack}>
          <Field label="Nombre" value={name} onChangeText={setName} />
          <Field label="Correo" value={email} onChangeText={setEmail} />
          <Field label="Rol" value={session.role} editable={false} />
        </View>

        <View style={styles.pasanteFichasCard}>
          <Text style={styles.pasanteFichasTitle}>Fichas asignadas</Text>
          {assignedSheetLabels.length ? assignedSheetLabels.map((label) => (
            <Text key={label} style={styles.pasanteFichaItem}>
              {label}
            </Text>
          )) : <Text style={styles.pasanteFichaItem}>Aún no tienes fichas asignadas.</Text>}
        </View>

        <View style={styles.profileActions}>
          <Pressable onPress={handleSaveProfile} style={styles.primaryButton}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Guardar perfil</Text>}
          </Pressable>

          <Pressable onPress={onSignOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Cerrar sesión</Text>
          </Pressable>
        </View>

        {feedback ? <Text style={styles.feedbackText}>{feedback}</Text> : null}
      </View>

      <SectionHeading
        actionLabel="Preferencias"
        subtitle="Ajustes para dictado, evidencias y resúmenes técnicos."
        title="Asistente Biomind"
      />
      <View style={styles.stack}>
        <ToggleRow title="Dictado de voz" description="Activa notas habladas durante la práctica." value={voiceEnabled} onValueChange={onVoiceChange} />
        <ToggleRow title="Resumen automático" description="Prepara síntesis técnicas antes de validar." value={autoSummaryEnabled} onValueChange={onAutoSummaryChange} />
        <ToggleRow title="Guía de evidencias" description="Ordena fotos, hallazgos y siguientes pasos." value={evidenceGuideEnabled} onValueChange={onEvidenceGuideChange} />
      </View>
    </>
  );
}

function RealProjectCard({ project }: { project: RealProject }) {
  return (
    <View style={styles.projectCard}>
      <View style={styles.cardHeader}>
        <View style={styles.projectIcon}>
          <MaterialCommunityIcons name="sprout-outline" size={18} color={pasantePalette.green} />
        </View>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{project.titulo || 'Proyecto sin nombre'}</Text>
          <Text style={styles.cardMeta}>Ficha {project.fichaNumero || project.fichaId || 'sin ficha'}</Text>
        </View>
        <Text style={styles.percent}>{Number(project.progreso || 0)}%</Text>
      </View>
      <ProgressBar accent={pasantePalette.green} progress={Number(project.progreso || 0)} soft={pasantePalette.softGreen} />
      <View style={styles.badgeRow}>
        <StatusBadge accent={pasantePalette.primary} label={project.estado || 'Pendiente'} soft={pasantePalette.aquaSoft} />
      </View>
      <Text style={styles.cardText}>
        {project.competenciaNombre || 'Sin competencia'} · {project.rapDescripcion || 'RAP pendiente'}
      </Text>
    </View>
  );
}

function AssignedPasanteTaskCard({ task }: { task: PasanteAssignedTask }) {
  const accent = task.estado === 'Validada' ? pasantePalette.green : task.estado === 'Hecho' ? pasantePalette.secondary : pasantePalette.primary;

  return (
    <View style={styles.taskCard}>
      <AssignedPasanteTaskContent task={task} accent={accent} />
    </View>
  );
}

function AssignedPasanteTaskContent({ accent, task }: { accent: string; task: PasanteAssignedTask }) {
  return (
    <>
      <View style={styles.cardHeader}>
        <View style={[styles.taskIcon, { backgroundColor: `${accent}22` }]}>
          <MaterialCommunityIcons name="clipboard-check-outline" size={18} color={accent} />
        </View>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{task.titulo || 'Tarea asignada'}</Text>
          <Text style={styles.cardMeta}>{task.proyectoTitulo || `Ficha ${task.fichaNumero || task.fichaId || 'general'}`}</Text>
        </View>
        <StatusBadge accent={accent} label={task.estado || 'Pendiente'} soft={`${accent}1F`} />
      </View>
      {task.descripcion ? <Text style={styles.cardText}>{task.descripcion}</Text> : null}
      <PasanteTaskAttachments archivos={task.archivos || []} />
      {task.observacionInstructor ? <Text style={styles.qaLabel}>Instructor: {task.observacionInstructor}</Text> : null}
      {task.observacionPasante ? <Text style={styles.qaLabel}>Pasante: {task.observacionPasante}</Text> : null}
    </>
  );
}

function PasanteTaskAttachments({ archivos }: { archivos: NonNullable<PasanteAssignedTask['archivos']> }) {
  if (!archivos.length) {
    return null;
  }

  return (
    <View style={styles.taskAttachmentList}>
      {archivos.map((file, index) => {
        const fileUrl = file.url || file.uri || '';
        return (
          <Pressable
            key={`${fileUrl || file.nombre}-${index}`}
            disabled={!fileUrl}
            onPress={() => fileUrl && Linking.openURL(fileUrl)}
            style={styles.taskAttachmentItem}>
            <MaterialCommunityIcons name={file.mimeType.startsWith('image/') ? 'image-outline' : 'file-document-outline'} size={17} color={pasantePalette.primary} />
            <Text numberOfLines={1} style={styles.taskAttachmentText}>{file.nombre || 'Adjunto'}</Text>
            <MaterialCommunityIcons name="open-in-new" size={15} color={pasantePalette.primary} />
          </Pressable>
        );
      })}
    </View>
  );
}

function DashboardPasanteTaskCard({ task }: { task: PasanteAssignedTask }) {
  const [observation, setObservation] = useState(task.observacionPasante || '');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    setObservation(task.observacionPasante || '');
  }, [task.observacionPasante]);

  const confirmDone = () => {
    Alert.alert(
      'Marcar tarea como hecha',
      `¿Confirmas que terminaste "${task.titulo || 'esta tarea'}"`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar',
          onPress: async () => {
            try {
              await marcarTareaPasanteHecha(task.id, observation);
              setFeedback('Tarea marcada como hecha. El instructor debe validarla.');
            } catch (error) {
              const typedError = error as { message: string };
              setFeedback(typedError.message || 'No pudimos actualizar la tarea.');
            }
          },
        },
      ]
    );
  };

  const confirmPending = () => {
    Alert.alert(
      'Volver a pendiente',
      `¿Quieres volver a dejar "${task.titulo || 'esta tarea'}" como pendiente para corregirla`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar',
          onPress: async () => {
            try {
              await marcarTareaPasantePendiente(task.id, observation);
              setFeedback('Tarea marcada nuevamente como pendiente.');
            } catch (error) {
              const typedError = error as { message: string };
              setFeedback(typedError.message || 'No pudimos actualizar la tarea.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.taskCard}>
      <AssignedPasanteTaskContent
        accent={task.estado === 'Validada' ? pasantePalette.green : task.estado === 'Hecho' ? pasantePalette.secondary : pasantePalette.primary}
        task={task}
      />
      {task.estado !== 'Validada' ? (
        <>
          <Field label="Observación del pasante" value={observation} onChangeText={setObservation} />
          {task.estado === 'Hecho' ? (
            <View style={styles.badgeRow}>
              <Pressable onPress={confirmPending} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Volver a pendiente</Text>
              </Pressable>
              <Pressable onPress={confirmDone} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Actualizar entrega</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={confirmDone} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Marcar como hecho</Text>
            </Pressable>
          )}
        </>
      ) : null}
      {feedback ? <Text style={styles.feedbackText}>{feedback}</Text> : null}
    </View>
  );
}

function MetricCard({
  compact = false,
  metric,
  onPress,
}: {
  compact?: boolean;
  metric: PasanteMetric;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View style={[styles.metricIcon, { backgroundColor: metric.accent }]}>
        <MaterialCommunityIcons name={metric.icon} size={18} color={pasantePalette.surface} />
      </View>
      <Text style={[styles.metricValue, { color: metric.accent }]}>{metric.value}</Text>
      <Text style={styles.metricLabel}>{metric.label}</Text>
      <Text style={styles.metricCaption}>{metric.caption}</Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={[styles.metricCard, compact && styles.metricCardCompact, { backgroundColor: metric.soft }]}>
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[styles.metricCard, compact && styles.metricCardCompact, { backgroundColor: metric.soft }]}>
      {content}
    </View>
  );
}

function ProjectCard({ project, onOpenAssistant }: { project: PasanteProject; onOpenAssistant: (projectId: string) => void }) {
  const statusAccent = project.status === 'Por validar' ? pasantePalette.secondary : project.status === 'Documentado' ? pasantePalette.green : pasantePalette.green;

  return (
    <View style={styles.projectCard}>
      <View style={styles.cardHeader}>
        <View style={styles.projectIcon}>
          <MaterialCommunityIcons name="sprout-outline" size={18} color={pasantePalette.green} />
        </View>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{project.title} - {project.species}</Text>
          <Text style={styles.cardMeta}>{project.stage}</Text>
        </View>
        <Text style={styles.percent}>{project.progress}%</Text>
      </View>

      <ProgressBar accent={pasantePalette.green} progress={project.progress} soft={pasantePalette.softGreen} />
      <View style={styles.badgeRow}>
        <StatusBadge accent={statusAccent} label={project.status} soft={project.status === 'Por validar' ? '#FFF1EB' : pasantePalette.softGreen} />
        <StatusBadge accent={pasantePalette.green} label={`${project.evidenceCount} evidencias`} soft={pasantePalette.softGreen} />
      </View>
      <Text style={styles.cardText}>{project.nextStep}</Text>
      <Pressable onPress={() => onOpenAssistant(project.id)} style={[styles.secondaryButton, styles.projectActionButton]}>
        <Text style={styles.secondaryButtonText}>Abrir asistente</Text>
      </Pressable>
    </View>
  );
}

function TaskCard({
  projects,
  task,
  onOpenAssistant,
}: {
  projects: PasanteProject[];
  task: PasanteTask;
  onOpenAssistant: (projectId: string) => void;
}) {
  const project = projects.find((item) => item.id === task.projectId);
  const accent = task.status === 'Completada' ? pasantePalette.green : task.status === 'En revisión' ? pasantePalette.secondary : pasantePalette.primary;

  return (
    <View style={styles.taskCard}>
      <View style={styles.cardHeader}>
        <View style={[styles.taskIcon, { backgroundColor: `${accent}22` }]}>
          <MaterialCommunityIcons name="clipboard-check-outline" size={18} color={accent} />
        </View>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{task.title}</Text>
          <Text style={styles.cardMeta}>{project?.species || 'Proyecto'} - {task.due}</Text>
        </View>
        <StatusBadge accent={accent} label={task.status} soft={`${accent}1F`} />
      </View>
      <Text style={styles.cardText}>{task.detail}</Text>
      <Pressable onPress={() => onOpenAssistant(task.projectId)} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>Preparar evidencia</Text>
      </Pressable>
    </View>
  );
}

function AssignedLearnerCard({
  learner,
  onOpenAssistant,
}: {
  learner: PasanteAssignedLearner;
  onOpenAssistant: (projectId: string) => void;
}) {
  return (
    <View style={styles.learnerCard}>
      <View style={styles.cardHeader}>
        <View style={[styles.taskIcon, { backgroundColor: pasantePalette.softGreen }]}>
          <MaterialCommunityIcons name="account-school-outline" size={18} color={pasantePalette.green} />
        </View>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{learner.name}</Text>
          <Text style={styles.cardMeta}>Ficha {learner.ficha} - {learner.project}</Text>
        </View>
        <Text style={styles.percent}>{learner.progress}%</Text>
      </View>
      <ProgressBar accent={pasantePalette.green} progress={learner.progress} soft={pasantePalette.softGreen} />
      <View style={styles.badgeRow}>
        <StatusBadge accent={pasantePalette.primary} label={`${learner.pendingQuestions} preguntas`} soft={pasantePalette.aquaSoft} />
        <StatusBadge accent={pasantePalette.secondary} label="Observación lista" soft="#FFF1EB" />
      </View>
      <Text style={styles.cardText}>{learner.lastObservation}</Text>
      <Pressable onPress={() => onOpenAssistant(learner.projectId)} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>Responder o reportar</Text>
      </Pressable>
    </View>
  );
}

function QuestionCard({ thread }: { thread: (typeof demoPasanteQuestions)[number] }) {
  const accent = thread.status === 'Respondida' ? pasantePalette.green : pasantePalette.secondary;

  return (
    <View style={styles.questionCard}>
      <View style={styles.cardHeader}>
        <View style={[styles.taskIcon, { backgroundColor: `${accent}22` }]}>
          <MaterialCommunityIcons name="comment-question-outline" size={18} color={accent} />
        </View>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{thread.learner}</Text>
          <Text style={styles.cardMeta}>{thread.status}</Text>
        </View>
        <StatusBadge accent={accent} label={thread.status} soft={`${accent}1F`} />
      </View>
      <Text style={styles.qaLabel}>Pregunta</Text>
      <Text style={styles.cardText}>{thread.question}</Text>
      <Text style={styles.qaLabel}>Respuesta</Text>
      <Text style={styles.cardText}>{thread.answer}</Text>
      <View style={styles.badgeRow}>
        <StatusBadge accent={pasantePalette.primary} label="Responder pregunta" soft={pasantePalette.aquaSoft} />
        <StatusBadge accent={pasantePalette.secondary} label="Escalar al instructor" soft="#FFF1EB" />
      </View>
    </View>
  );
}

function ObservationCard({ observation }: { observation: (typeof demoPasanteObservations)[number] }) {
  const accent = observation.status === 'Compartida' ? pasantePalette.green : pasantePalette.primary;

  return (
    <View style={styles.taskCard}>
      <View style={styles.cardHeader}>
        <View style={[styles.taskIcon, { backgroundColor: `${accent}22` }]}>
          <MaterialCommunityIcons name="note-edit-outline" size={18} color={accent} />
        </View>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{observation.title}</Text>
          <Text style={styles.cardMeta}>{observation.target}</Text>
        </View>
      </View>
      <Text style={styles.cardText}>{observation.detail}</Text>
      <View style={styles.badgeRow}>
        <StatusBadge accent={accent} label={observation.status} soft={`${accent}1F`} />
      </View>
    </View>
  );
}

function InstructorMessageCard({ message }: { message: (typeof demoInstructorMessages)[number] }) {
  return (
    <View style={styles.taskCard}>
      <View style={styles.cardHeader}>
        <View style={[styles.taskIcon, { backgroundColor: pasantePalette.surfaceMuted }]}>
          <MaterialCommunityIcons name="account-voice" size={18} color={pasantePalette.primary} />
        </View>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{message.title}</Text>
          <Text style={styles.cardMeta}>Para {message.channel}</Text>
        </View>
      </View>
      <Text style={styles.cardText}>{message.detail}</Text>
    </View>
  );
}

function EmptyAssignedState() {
  return (
    <View style={styles.emptyCard}>
      <MaterialCommunityIcons name="lock-outline" size={20} color={pasantePalette.primary} />
      <Text style={styles.emptyTitle}>Demo sin fichas reales</Text>
      <Text style={styles.emptyText}>
        Cuando el instructor asigne fichas a este pasante, aquí aparecerán sus aprendices, proyectos y tareas.
      </Text>
    </View>
  );
}

function IntroCard({ label, text, title }: { label: string; text: string; title: string }) {
  return (
    <View style={styles.introCard}>
      <Text style={styles.introLabel}>{label}</Text>
      <Text style={styles.introTitle}>{title}</Text>
      <Text style={styles.introText}>{text}</Text>
    </View>
  );
}

function PasanteSearchableSelector({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: { label: string; subtitle?: string; value: string }[];
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((option) => option.value === value) || options[0];
  const filteredOptions = options.filter((option) =>
    `${option.label} ${option.subtitle || ''}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <View style={styles.dropdownBlock}>
      <Text style={styles.dropdownLabel}>{label}</Text>
      <Pressable onPress={() => setOpen((current) => !current)} style={styles.dropdownTrigger}>
        <Text numberOfLines={1} style={styles.dropdownTriggerText}>{selected?.label || 'Selecciona una opción'}</Text>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={22} color={pasantePalette.secondary} />
      </Pressable>
      {open ? (
        <View style={styles.dropdownPanel}>
          <View style={styles.dropdownSearch}>
            <MaterialCommunityIcons name="magnify" size={18} color={pasantePalette.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar..."
              placeholderTextColor={pasantePalette.textMuted}
              style={styles.dropdownSearchInput}
            />
          </View>
          {filteredOptions.map((option) => {
            const active = option.value === value;
            return (
              <Pressable
                key={`${label}-${option.value || 'todos'}`}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                  setQuery('');
                }}
                style={[styles.dropdownOption, active && styles.dropdownOptionActive]}>
                {active ? <MaterialCommunityIcons name="check-circle" size={19} color={pasantePalette.primary} /> : null}
                <View style={styles.cardCopy}>
                  <Text numberOfLines={1} style={[styles.dropdownOptionText, active && styles.dropdownOptionTextActive]}>
                    {option.label}
                  </Text>
                  {option.subtitle ? <Text numberOfLines={1} style={styles.dropdownOptionSubtext}>{option.subtitle}</Text> : null}
                </View>
              </Pressable>
            );
          })}
          {!filteredOptions.length ? <Text style={styles.emptyText}>No hay resultados.</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

function Field({
  editable = true,
  label,
  onChangeText,
  value,
}: {
  editable?: boolean;
  label: string;
  onChangeText?: (value: string) => void;
  value: string;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.fieldBlock}>
      <Text style={[styles.fieldLabel, isFocused && editable && { color: pasantePalette.primary }]}>{label}</Text>
      <TextInput
        editable={editable}
        onBlur={() => setIsFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        placeholderTextColor="#8BA49A"
        style={[
          styles.fieldInput,
          isFocused && editable && styles.fieldInputActive,
          !editable && styles.fieldInputDisabled,
        ]}
        value={value}
      />
    </View>
  );
}

function ToggleRow({
  description,
  title,
  value,
  onValueChange,
}: {
  description: string;
  title: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleText}>{description}</Text>
      </View>
      <Switch
        onValueChange={onValueChange}
        thumbColor={value ? '#FFFFFF' : '#F1F4F7'}
        trackColor={{ false: '#D4DCE7', true: pasantePalette.green }}
        value={value}
      />
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

function getFirstName(name: string) {
  return name.split(' ').filter(Boolean)[0] || 'Pasante';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: pasantePalette.background,
  },
  screen: {
    flex: 1,
    backgroundColor: pasantePalette.background,
    paddingHorizontal: 3,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 24,
  },
  headerCard: {
    paddingTop: 20,
    marginHorizontal: -20,
    paddingHorizontal: 28,
    paddingBottom: 22,
    backgroundColor: pasantePalette.background,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: pasantePalette.primary,
  },
  headerBadgeText: {
    color: pasantePalette.surface,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: pasantePalette.surfaceMuted,
    borderColor: pasantePalette.border,
    borderWidth: 1,
  },
  rolePillText: {
    color: pasantePalette.primary,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
  },
  headerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerCopy: {
    flex: 1,
    gap: 8,
  },
  headerTitle: {
    color: pasantePalette.dark,
    fontFamily: 'SulphurPointBold',
    fontSize: 32,
    lineHeight: 34,
    marginTop: 16,
  },
  headerSubtitle: {
    color: pasantePalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    lineHeight: 20,
  },
  startCard: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    elevation: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    gap: 16,
    shadowOpacity: 0,
  },
  summarySection: {
    backgroundColor: pasantePalette.surface,
    gap: 16,
    marginHorizontal: -30,
    paddingHorizontal: 32,
    paddingVertical: 20,
  },
  summarySectionTitle: {
    fontFamily: 'SulphurPointBold',
    fontSize: 25,
  },
  dropdownBlock: { gap: 7 },
  dropdownLabel: {
    color: pasantePalette.secondary,
    fontFamily: 'PoppinsLight',
    fontWeight: 700,
    fontSize: 14,
    marginBottom: 5, 
  },
  dropdownTrigger: {
    alignItems: 'center',
    backgroundColor: pasantePalette.muted,
    borderColor: pasantePalette.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 42,
    paddingHorizontal: 12,
  },
  dropdownTriggerText: {
    color: pasantePalette.text,
    flex: 1,
    fontFamily: 'PoppinsLight',
    fontWeight: 600,
    fontSize: 13,
  },
  dropdownPanel: {
    backgroundColor: pasantePalette.surface,
    borderColor: pasantePalette.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  dropdownSearch: {
    alignItems: 'center',
    backgroundColor: pasantePalette.background,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    minHeight: 38,
    paddingHorizontal: 11,
  },
  dropdownSearchInput: {
    color: pasantePalette.text,
    flex: 1,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    minHeight: 38,
  },
  dropdownOption: {
    alignItems: 'center',
    backgroundColor: pasantePalette.aquaSoft,
    borderColor: pasantePalette.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dropdownOptionActive: {
    backgroundColor: pasantePalette.surfaceMuted,
    borderColor: pasantePalette.primary,
  },
  dropdownOptionText: {
    color: pasantePalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  dropdownOptionTextActive: {
    color: pasantePalette.primary,
  },
  dropdownOptionSubtext: {
    color: pasantePalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 10,
  },
  sectionHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
  },
  sectionCopy: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    color: pasantePalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 20,
    lineHeight: 28,
  },
  sectionSubtitle: {
    color: pasantePalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 300,
  },
  sectionAction: {
    color: pasantePalette.text,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
    lineHeight: 18,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 8,
  },
  homeMetricsContent: {
    gap: 10,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  metricCard: {
    flex: 1,
    minHeight: 118,
    minWidth: 50,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 6,
  },
  metricCardCompact: {
    flex: 1,
    minHeight: 96,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metricIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 18,
  },
  metricLabel: {
    color: pasantePalette.text,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
    lineHeight: 14,
  },
  metricCaption: {
    color: pasantePalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 10,
    lineHeight: 12,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: pasantePalette.surface,
    borderRadius: 16,
    borderWidth: 0,
    gap: 8,
    padding: 18,
  },
  emptyTitle: {
    color: pasantePalette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  emptyText: {
    color: pasantePalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  introCard: {
    backgroundColor: 'transparent',
    paddingHorizontal: 37,
    paddingVertical: 20,
    marginHorizontal: -30,
    marginBottom: -22,
    gap: 8,
  },
  introLabel: {
    color: pasantePalette.primary,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
    letterSpacing: 0.6,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  introTitle: {
    color: pasantePalette.dark,
    fontFamily: 'SulphurPointBold',
    fontSize: 28,
    lineHeight: 28,
    marginBottom: 6,
  },
  introText: {
    color: pasantePalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 10,
  },
  stack: {
    gap: 12,
  },
  trackingPanel: {
    backgroundColor: pasantePalette.surface,
    elevation: 1,
    gap: 16,
    padding: 23,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    marginHorizontal: -18,
  },
  trackingPanelHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  trackingEyebrow: {
    color: pasantePalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  
  },
  trackingTitle: {
    color: pasantePalette.dark,
    fontFamily: 'SulphurPointBold',
    fontSize: 26,
    lineHeight: 28,
  },
  trackingText: {
    color: pasantePalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  trackingProgressBlock: {
    backgroundColor: pasantePalette.muted,
    borderColor: pasantePalette.mutedMuted, 
    borderWidth: 0.5,
    borderRadius: 16,
    gap: 10,
    padding: 14,
  },
  trackingProgressHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trackingProgressLabel: {
    color: pasantePalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  trackingProgressValue: {
    color: pasantePalette.green,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 16,
  },
  trackingFiltersGrid: {
    gap: 12,
  },
  trackingMetricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  newsCarouselContent: {
    gap: 12,
    paddingHorizontal: 2,
    paddingVertical: 3,
  },
  newsCard: {
    backgroundColor: pasantePalette.surface,
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
    color: pasantePalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  newsTitle: {
    color: pasantePalette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
    lineHeight: 19,
  },
  newsText: {
    color: pasantePalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 17,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(38, 30, 25, 0.32)',
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  pasanteSheetModal: {
    backgroundColor: pasantePalette.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingHorizontal: 20,
    paddingTop: 20,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  modalEyebrow: {
    color: pasantePalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  modalTitle: {
    color: pasantePalette.dark,
    fontFamily: 'SulphurPointBold',
    fontSize: 27,
    lineHeight: 29,
  },
  modalSubtitle: {
    color: pasantePalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 17,
  },
  modalClose: {
    alignItems: 'center',
    backgroundColor: pasantePalette.surfaceMuted,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  modalContent: {
    gap: 14,
    paddingBottom: 26,
  },
  modalSectionTitle: {
    color: pasantePalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  selectorList: {
    gap: 9,
  },
  selectorCard: {
    alignItems: 'center',
    backgroundColor: pasantePalette.aquaSoft,
    borderColor: pasantePalette.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectorCardActive: {
    backgroundColor: pasantePalette.surfaceMuted,
    borderColor: pasantePalette.primary,
  },
  sheetSelectorIcon: {
    alignItems: 'center',
    backgroundColor: pasantePalette.surfaceMuted,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  selectorTitle: {
    color: pasantePalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  selectorTitleActive: {
    color: pasantePalette.primary,
  },
  selectorSubtitle: {
    color: pasantePalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 16,
  },
  modalStatsRow: {
    flexDirection: 'row',
    gap: 9,
  },
  modalStat: {
    alignItems: 'center',
    backgroundColor: pasantePalette.aquaSoft,
    borderRadius: 18,
    flex: 1,
    gap: 4,
    padding: 12,
  },
  modalStatValue: {
    color: pasantePalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 15,
  },
  modalStatLabel: {
    color: pasantePalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 10,
    textAlign: 'center',
  },
  modalInfoCard: {
    backgroundColor: pasantePalette.surfaceMuted,
    borderColor: pasantePalette.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  learnersToggle: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: pasantePalette.primary,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 15,
  },
  learnersToggleText: {
    color: '#FFFFFF',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  learnersPanel: {
    backgroundColor: pasantePalette.aquaSoft,
    borderColor: pasantePalette.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: pasantePalette.background,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  searchInput: {
    color: pasantePalette.text,
    flex: 1,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
  },
  learnerRow: {
    alignItems: 'center',
    borderBottomColor: pasantePalette.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 9,
  },
  projectCard: {
    backgroundColor: pasantePalette.surface,
    borderRadius: 16,
    borderWidth: 0,
    padding: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
    gap: 12,
  },
  learnerCard: {
    backgroundColor: pasantePalette.surface,
    borderRadius: 16,
    borderWidth: 0,
    elevation: 1,
    gap: 10,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  taskCard: {
    backgroundColor: pasantePalette.surface,
    borderRadius: 16,
    borderWidth: 0,
    padding: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
    gap: 10,
  },
  taskAttachmentList: {
    gap: 7,
  },
  taskAttachmentItem: {
    alignItems: 'center',
    backgroundColor: pasantePalette.surfaceMuted,
    borderColor: pasantePalette.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 38,
    paddingHorizontal: 10,
  },
  taskAttachmentText: {
    color: pasantePalette.text,
    flex: 1,
    fontFamily: 'PoppinsMedium',
    fontSize: 11,
  },
  questionCard: {
    backgroundColor: pasantePalette.surface,
    borderRadius: 16,
    borderWidth: 0,
    padding: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  projectIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: pasantePalette.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    color: pasantePalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
    lineHeight: 20,
  },
  cardMeta: {
    color: pasantePalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
  },
  percent: {
    color: pasantePalette.green,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    backgroundColor: pasantePalette.surface,
    borderColor: pasantePalette.border,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterChipActive: {
    backgroundColor: pasantePalette.aquaSoft,
    borderColor: pasantePalette.primary,
  },
  filterChipText: {
    color: pasantePalette.textMuted,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  filterChipTextActive: {
    color: pasantePalette.primary,
  },
  cardText: {
    color: pasantePalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  qaLabel: {
    color: pasantePalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
    marginTop: 2,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: pasantePalette.aqua,
  },
  projectActionButton: {
    alignSelf: 'flex-end',
  },
  secondaryButtonText: {
    color: pasantePalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  profileCard: {
    backgroundColor: pasantePalette.surface,
    paddingHorizontal: 36,
    paddingVertical: 24,
    paddingTop: 28,
    marginHorizontal: -30,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
    gap: 12,
  },
  avatarWrap: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: 8,
  },
  cameraBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: pasantePalette.surfaceMuted,
  },
  cameraBadgeText: {
    color: pasantePalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  formStack: {
    gap: 10,
  },
  fieldBlock: {
    gap: 9,
  },
  fieldLabel: {
    color: pasantePalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  fieldInput: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: pasantePalette.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: pasantePalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    backgroundColor: pasantePalette.aquaSoft,
  },
  fieldInputActive: {
    borderColor: pasantePalette.primary,
    backgroundColor: '#FFFFFF',
  },
  fieldInputDisabled: {
    backgroundColor: '#EFEAE6',
    color: pasantePalette.textMuted,
  },
  pasanteFichasCard: {
    backgroundColor: pasantePalette.aquaSoft,
    borderColor: pasantePalette.secondary,
    borderRadius: 20,
    borderWidth: 0.2,
    gap: 4,
    marginBottom: 8,
    marginTop: 12,
    padding: 14,
    shadowColor: pasantePalette.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  pasanteFichasTitle: {
    color: pasantePalette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  pasanteFichaItem: {
    color: pasantePalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
  },
  profileActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  primaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: pasantePalette.primary,
  },
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 14,
  },
  blockTitle: {
    color: pasantePalette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 18,
    marginTop: 8,
  },
  blockText: {
    color: pasantePalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  signOutButton: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: pasantePalette.coral,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  signOutText: {
    color: pasantePalette.coralText,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  feedbackText: {
    color: pasantePalette.primary,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  toggleRow: {
    backgroundColor: pasantePalette.surface,
    borderRadius: 16,
    borderWidth: 0,
    padding: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleCopy: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    color: pasantePalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  toggleText: {
    color: pasantePalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 17,
  },
});
