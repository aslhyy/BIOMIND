import { ProgressBar, StatusBadge } from '@/features/instructor/components/InstructorUI';
import { CurrentTrimesterSummary } from '@/features/workspace/components/CurrentTrimesterSummary';
import { RealAcademicContext, useAssignedSheetLabels } from '@/features/workspace/components/RealAcademicContext';
import { GeminiAssistantModule } from '@/features/workspace/components/GeminiAssistantModule';
import { UserAvatar } from '@/features/workspace/components/UserAvatar';
import { WorkspaceBottomBar, type BottomBarTab } from '@/features/workspace/components/WorkspaceBottomBar';
import type { AuthenticatedSession, WorkspaceAssistantPrompt } from '@/features/workspace/types';
import { actualizarPerfilUsuario } from '@/services/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { pasanteMetrics, pasanteProjects, pasanteTasks, type PasanteMetric, type PasanteProject, type PasanteTask } from '../data';
import { pasantePalette } from '../theme';

type PasanteTab = 'inicio' | 'seguimiento' | 'asistente' | 'proyectos' | 'perfil';

const tabs: BottomBarTab[] = [
  { id: 'inicio', icon: 'home-variant-outline' },
  { id: 'seguimiento', icon: 'clipboard-check-outline' },
  { id: 'proyectos', icon: 'flask-outline' },
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
  activeIcon: pasantePalette.primary,
  activePill: pasantePalette.secondary,
  centerGradient: ['#FFE8DF', '#F2B39A', '#D97862', '#B76552'] as [string, string, string, string],
  centerShadow: pasantePalette.secondary,
  inactiveIcon: pasantePalette.textMuted,
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

export function PasanteWorkspace({ onSignOut, session }: PasanteWorkspaceProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<PasanteTab>('inicio');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [autoSummaryEnabled, setAutoSummaryEnabled] = useState(true);
  const [evidenceGuideEnabled, setEvidenceGuideEnabled] = useState(true);
  const [assistantProjectId, setAssistantProjectId] = useState(pasanteProjects[0]?.id ?? 'general');
  const assignedFichas = Array.isArray(session.fichasAsignadas) ? session.fichasAsignadas : [];
  const assignedFichaSet = new Set(assignedFichas.map(String));
  const assignedProjectsFromSession = assignedFichaSet.size
    ? pasanteProjects.filter((project) => assignedFichaSet.has(project.ficha))
    : [];
  const assignedProjects = assignedProjectsFromSession.length ? assignedProjectsFromSession : pasanteProjects;
  const assignedTasks = assignedProjects.length
    ? pasanteTasks.filter((task) => assignedProjects.some((project) => project.id === task.projectId))
    : [];

  const [fontsLoaded] = useFonts({
    PoppinsRegular: require('../../../assets/fonts/Poppins-Regular.ttf'),
    PoppinsMedium: require('../../../assets/fonts/Poppins/Poppins-Medium.ttf'),
    PoppinsSemiBold: require('../../../assets/fonts/Poppins/Poppins-SemiBold.ttf'),
    SulphurPointBold: require('../../../assets/fonts/SulphurPoint-Bold.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  // Bloqueo: si el pasante no tiene instructor asignado o no tiene fichas, mostrar mensaje claro
  const hasInstructor = Boolean(session.instructorUid);
  const hasFichas = assignedFichas.length > 0;

  if (!hasInstructor || !hasFichas) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.screen}>
          <View style={styles.centerBlock}>
            <MaterialCommunityIcons name="alert-circle-outline" size={48} color={pasantePalette.primary} />
            <Text style={styles.blockTitle}>Acceso restringido</Text>
            <Text style={styles.blockText}>
              { !hasInstructor
                ? 'Aún no tienes un instructor asignado. Contacta al administrador para completar la asignación.'
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
      <View style={styles.screen}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 124 }]}>
          {activeTab === 'inicio' ? <HeaderCard session={session} /> : null}
          {activeTab === 'inicio' && (
            <>
              <PasanteHomeTab
                projects={assignedProjects}
                session={session}
                tasks={assignedTasks}
                onOpenAssistant={openAssistantForProject}
              />
              <RealAcademicContext session={session} />
            </>
          )}
          {activeTab === 'seguimiento' && (
            <PasanteTrackingTab
              projects={assignedProjects}
              tasks={assignedTasks}
              onOpenAssistant={openAssistantForProject}
            />
          )}
          {activeTab === 'asistente' && (
            <GeminiAssistantModule
              assistantQuestionsEnabledDefault
              composerPlaceholder="Escribe tus notas de práctica, dudas técnicas o hallazgos para convertirlos en evidencia..."
              emptyStateLabel="Apoyo técnico del pasante"
              preferredProjectId={assistantProjectId}
              projects={assignedProjects.map((project) => ({
                id: project.id,
                title: `${project.title} - ${project.species}`,
              }))}
              prompts={assistantPrompts}
              roleLabel="Pasante IA"
              session={session}
              subtitle="Organiza evidencias, prepara resúmenes técnicos y valida observaciones antes de enviarlas al instructor."
              systemContext="Eres Biomind IA para pasantes de biotecnología vegetal. Ayudas a documentar evidencias, resumir avances técnicos, preparar preguntas para instructores y ordenar observaciones de laboratorio."
              title="Asistente técnico de práctica"
              tone={assistantTone}
              voiceEnabled={voiceEnabled}
              welcomeMessage="Hola. Soy tu asistente de Biomind para pasantes. Puedo ayudarte a convertir notas de laboratorio en evidencias claras, preparar resúmenes técnicos y ordenar dudas para el instructor."
            />
          )}
          {activeTab === 'proyectos' && (
            <PasanteProjectsTab projects={assignedProjects} onOpenAssistant={openAssistantForProject} />
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
      </View>
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

function SectionTitle({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
    </View>
  );
}

function PasanteHomeTab({
  projects,
  session,
  tasks,
  onOpenAssistant,
}: {
  projects: PasanteProject[];
  session: AuthenticatedSession;
  tasks: PasanteTask[];
  onOpenAssistant: (projectId: string) => void;
}) {
  return (
    <>
      <View style={styles.startCard}>
        <SectionTitle title="Resumen de práctica" />
        <View style={styles.metricsRow}>
          {pasanteMetrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </View>
      </View>

      <CurrentTrimesterSummary
        colors={{
          accent: pasantePalette.primary,
          background: pasantePalette.surface,
          border: pasantePalette.border,
          iconBackground: pasantePalette.surfaceMuted,
          muted: pasantePalette.textMuted,
          text: pasantePalette.text,
        }}
        session={session}
      />

      <SectionHeading
        actionLabel="Hoy"
        subtitle="Actividades y validaciones que acompañas en laboratorio."
        title="Agenda técnica"
      />
      <View style={styles.stack}>
        {tasks.length ? (
          tasks.slice(0, 2).map((task) => (
            <TaskCard key={task.id} projects={projects} task={task} onOpenAssistant={onOpenAssistant} />
          ))
        ) : (
          <EmptyAssignedState />
        )}
      </View>

      <SectionHeading
        actionLabel="Cultivos"
        subtitle="Proyectos donde estás apoyando registro, evidencia y trazabilidad."
        title="Proyectos asignados"
      />
      <View style={styles.stack}>
        {projects.slice(0, 2).map((project) => (
          <ProjectCard key={project.id} project={project} onOpenAssistant={onOpenAssistant} />
        ))}
      </View>
    </>
  );
}

function PasanteTrackingTab({
  projects,
  tasks,
  onOpenAssistant,
}: {
  projects: PasanteProject[];
  tasks: PasanteTask[];
  onOpenAssistant: (projectId: string) => void;
}) {
  return (
    <>
      <IntroCard
        label="Seguimiento técnico"
        text="Revisa tareas asignadas, prepara evidencias y deja cada observación lista para validación."
        title="Validaciones, tareas y práctica."
      />

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
    setPhotoUri(session.photoUrl || '');
  }, [session.name, session.photoUrl]);

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

    setSaving(true);
    setFeedback('');

    try {
      const updatedProfile = await actualizarPerfilUsuario({
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
          <Field label="Correo" value={session.email} editable={false} />
          <Field label="Rol" value={session.role} editable={false} />
          <Field label="Fichas asignadas" value={assignedSheetsText} editable={false} />
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

function MetricCard({ metric }: { metric: PasanteMetric }) {
  return (
    <View style={[styles.metricCard, { backgroundColor: metric.soft }]}>
      <View style={[styles.metricIcon, { backgroundColor: metric.accent }]}>
        <MaterialCommunityIcons name={metric.icon} size={18} color={pasantePalette.surface} />
      </View>
      <Text style={[styles.metricValue, { color: metric.accent }]}>{metric.value}</Text>
      <Text style={styles.metricLabel}>{metric.label}</Text>
      <Text style={styles.metricCaption}>{metric.caption}</Text>
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
    gap: 22,
  },
  headerCard: {
    paddingTop: 18,
    marginHorizontal: -20,
    paddingHorizontal: 28,
    paddingBottom: 18,
    backgroundColor: pasantePalette.background,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: pasantePalette.surfaceMuted,
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
    fontSize: 34,
    lineHeight: 34,
    marginTop: 15,
  },
  headerSubtitle: {
    color: pasantePalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    lineHeight: 20,
  },
  startCard: {
    backgroundColor: pasantePalette.surface,
    marginHorizontal: -30,
    paddingVertical: 20,
    paddingHorizontal: 22,
    gap: 16,
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
    color: pasantePalette.text,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
  },
  metricCaption: {
    color: pasantePalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 16,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: pasantePalette.surface,
    borderColor: pasantePalette.border,
    borderRadius: 18,
    borderWidth: 1,
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
  projectCard: {
    backgroundColor: pasantePalette.surface,
    borderRadius: 24,
    padding: 16,
    shadowColor: pasantePalette.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 12,
  },
  taskCard: {
    backgroundColor: pasantePalette.surface,
    borderRadius: 22,
    padding: 16,
    shadowColor: pasantePalette.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 10,
  },
  questionCard: {
    backgroundColor: pasantePalette.surface,
    borderRadius: 22,
    padding: 16,
    shadowColor: pasantePalette.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
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
    paddingVertical: 10,
    borderRadius: 999,
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
    paddingHorizontal: 40,
    paddingVertical: 20,
    paddingTop: 30,
    marginHorizontal: -30,
    shadowColor: pasantePalette.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 8,
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
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#d2d2d2',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: pasantePalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    backgroundColor: '#fbfbfb',
    shadowColor: pasantePalette.text,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  fieldInputActive: {
    borderColor: pasantePalette.secondary,
    backgroundColor: '#FFFFFF',
    shadowColor: pasantePalette.primary,
    shadowOpacity: 0.12,
  },
  fieldInputDisabled: {
    backgroundColor: '#ECECEC',
    color: pasantePalette.textMuted,
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
    borderRadius: 999,
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
    borderRadius: 22,
    padding: 16,
    shadowColor: pasantePalette.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
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
