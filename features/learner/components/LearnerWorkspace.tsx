import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { learnerAssistantQuestions, learnerProjects } from '../data';
import { learnerPalette } from '@/features/learner/theme';
import { GeminiAssistantModule } from '@/features/workspace/components/GeminiAssistantModule';
import { UserAvatar } from '@/features/workspace/components/UserAvatar';
import { RealAcademicContext } from '@/features/workspace/components/RealAcademicContext';
import { type BottomBarTab, WorkspaceBottomBar } from '@/features/workspace/components/WorkspaceBottomBar';
import type { AuthenticatedSession, WorkspaceAssistantPrompt } from '@/features/workspace/types';
import { LearnerHistoryTab } from './LearnerHistoryTab';
import { LearnerHomeTab } from './LearnerHomeTab';
import { LearnerProfileTab } from './LearnerProfileTab';
import { LearnerProjectsTab } from './LearnerProjectsTab';

type LearnerTab = 'inicio' | 'historial' | 'asistente' | 'proyectos' | 'perfil';

const tabs: BottomBarTab[] = [
  { id: 'inicio', icon: 'home-variant-outline' },
  { id: 'historial', icon: 'notebook-edit-outline' },
  { id: 'proyectos', icon: 'briefcase-outline' },
  { id: 'perfil', icon: 'account-circle-outline' },
];

const learnerBottomBarTone = {
  activeIcon: learnerPalette.primary,
  activePill: learnerPalette.primary,
  centerGradient: ['#E4F8DE', '#A7DCA5', '#73C088', '#3D7F52'] as [string, string, string, string],
  centerShadow: learnerPalette.primary,
  inactiveIcon: learnerPalette.textMuted,
};

const learnerAssistantTone = {
  background: learnerPalette.background,
  border: learnerPalette.border,
  chatCaption: learnerPalette.textMuted,
  composerBorder: learnerPalette.border,
  composerHint: learnerPalette.textMuted,
  dark: learnerPalette.dark,
  greenText: learnerPalette.greenText,
  lavanderText: learnerPalette.lavanderText,
  mint: learnerPalette.mint,
  primary: learnerPalette.progress,
  projectChipBg: learnerPalette.surfaceMuted,
  projectChipBorder: learnerPalette.border,
  secondary: learnerPalette.primary,
  shadow: learnerPalette.shadow,
  softGreen: learnerPalette.softGreen,
  surface: learnerPalette.surface,
  surfaceMuted: learnerPalette.surfaceMuted,
  switchActive: learnerPalette.primary,
  text: learnerPalette.text,
  textMuted: learnerPalette.textMuted,
};

const learnerAssistantPrompts: WorkspaceAssistantPrompt[] = [
  {
    id: 'registro',
    title: 'Registrar observación',
    detail: 'Ayúdame a redactar una observación clara, técnica y útil del proyecto seleccionado.',
    icon: 'notebook-edit-outline',
  },
  {
    id: 'dudas',
    title: 'Resolver duda',
    detail: 'Explícame este procedimiento como una guía corta para aprendiz.',
    icon: 'help-circle-outline',
  },
  {
    id: 'bitacora',
    title: 'Convertir a bitácora',
    detail: 'Convierte este dictado en una bitácora ordenada con hallazgos, riesgos y siguiente paso.',
    icon: 'text-box-check-outline',
  },
];

type LearnerWorkspaceProps = {
  session: AuthenticatedSession;
  onSignOut: () => Promise<void> | void;
};

export function LearnerWorkspace({ onSignOut, session }: LearnerWorkspaceProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<LearnerTab>('inicio');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [voiceSuggestionsEnabled, setVoiceSuggestionsEnabled] = useState(false);
  const [assistantProjectId, setAssistantProjectId] = useState(learnerProjects[0]?.id ?? 'general');
  const [assistantAutoVoiceSignal, setAssistantAutoVoiceSignal] = useState(0);

  const [fontsLoaded] = useFonts({
    PoppinsRegular: require('../../../assets/fonts/Poppins-Regular.ttf'),
    PoppinsMedium: require('../../../assets/fonts/Poppins/Poppins-Medium.ttf'),
    PoppinsSemiBold: require('../../../assets/fonts/Poppins/Poppins-SemiBold.ttf'),
    SulphurPointBold: require('../../../assets/fonts/SulphurPoint-Bold.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  const openAssistantForProject = (projectId: string, autoStartVoice = false) => {
    setAssistantProjectId(projectId);
    setActiveTab('asistente');

    if (autoStartVoice) {
      setAssistantAutoVoiceSignal((current) => current + 1);
    }
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
              <LearnerHomeTab session={session} onOpenAssistant={openAssistantForProject} />
              <RealAcademicContext session={session} />
            </>
          )}
          {activeTab === 'historial' && <LearnerHistoryTab />}
          {activeTab === 'asistente' && (
            <GeminiAssistantModule
              assistantQuestionsEnabledDefault
              autoStartVoiceSignal={assistantAutoVoiceSignal}
              composerPlaceholder="Cuéntale a BIOMIND IA lo que observaste, dicta tus avances o pregunta por tu proyecto..."
              emptyStateLabel="Apoyo guiado para aprendiz"
              preferredProjectId={assistantProjectId}
              projects={learnerProjects.map((project) => ({
                id: project.id,
                title: `${project.title} - ${project.species}`,
              }))}
              prompts={learnerAssistantPrompts}
              roleLabel="Aprendiz IA"
              session={session}
              subtitle="Cada proyecto conserva su propio historial para que luego tus compañeras conecten el backend sin rehacer la interfaz."
              systemContext={`Eres Biomind IA para aprendices de biotecnología vegetal. Ayudas a comprender procedimientos, redactar observaciones, responder dudas, convertir voz a bitácora y mejorar registros. Usa este contexto de preguntas sugeridas: ${learnerAssistantQuestions.join(' | ')}`}
              title="Chat y registro asistido"
              tone={learnerAssistantTone}
              voiceEnabled={voiceEnabled}
              welcomeMessage="Hola. Soy tu asistente de Biomind con Gemini. Puedo escucharte, ayudarte a registrar observaciones, convertirlas en bitácora y resolver dudas del proyecto seleccionado."
            />
          )}
          {activeTab === 'proyectos' && (
            <LearnerProjectsTab onOpenAssistant={openAssistantForProject} />
          )}
          {activeTab === 'perfil' && (
            <LearnerProfileTab
              autoSaveEnabled={autoSaveEnabled}
              session={session}
              voiceEnabled={voiceEnabled}
              voiceSuggestionsEnabled={voiceSuggestionsEnabled}
              onAutoSaveChange={setAutoSaveEnabled}
              onSignOut={onSignOut}
              onVoiceChange={setVoiceEnabled}
              onVoiceSuggestionsChange={setVoiceSuggestionsEnabled}
            />
          )}
        </ScrollView>

        <WorkspaceBottomBar
          activeTab={activeTab}
          bottomInset={insets.bottom}
          centerIcon="star-four-points"
          centerTabId="asistente"
          tabs={tabs}
          tone={learnerBottomBarTone}
          onCenterPress={() => setActiveTab('asistente')}
          onTabPress={(tabId) => setActiveTab(tabId as LearnerTab)}
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
          <MaterialCommunityIcons name="account-school-outline" size={14} color={learnerPalette.green} />
          <Text style={styles.rolePillText}>{session.role}</Text>
        </View>
      </View>

      <View style={styles.headerMainRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Hola, {getFirstName(session.name)}</Text>
          <Text style={styles.headerSubtitle}>
            Sigue tus proyectos, bitácoras, evidencias y observaciones con Biomind.
          </Text>
        </View>

        <UserAvatar name={session.name} photoUrl={session.photoUrl} size={85} />
      </View>
    </View>
  );
}

function getFirstName(name: string) {
  return name.split(' ').filter(Boolean)[0] || 'Aprendiz';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: learnerPalette.background,
  },
  screen: {
    flex: 1,
    backgroundColor: learnerPalette.background,
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
    backgroundColor: learnerPalette.background,
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
    backgroundColor: learnerPalette.learner,
  },
  headerBadgeText: {
    color: learnerPalette.surface,
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
    backgroundColor: learnerPalette.surfaceMuted,
    marginBottom: 4,
  },
  rolePillText: {
    color: learnerPalette.greenText,
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
    color: learnerPalette.dark,
    fontFamily: 'SulphurPointBold',
    fontSize: 34,
    lineHeight: 34,
    marginTop: 15,
  },
  headerSubtitle: {
    color: learnerPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 270,
  },
});
