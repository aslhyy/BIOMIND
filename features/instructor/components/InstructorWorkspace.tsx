import { GeminiAssistantModule } from '@/features/workspace/components/GeminiAssistantModule';
import { UserAvatar } from '@/features/workspace/components/UserAvatar';
import { type BottomBarTab, WorkspaceBottomBar } from '@/features/workspace/components/WorkspaceBottomBar';
import type {
  AuthenticatedSession,
  WorkspaceChatChannel,
} from '@/features/workspace/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { assistantPrompts, learnerRoster, projectSnapshots } from '../data';
import { instructorPalette } from '../theme';
import { InstructorHomeTab } from './InstructorHomeTab';
import { InstructorLearnersTab, type LearnerFilter } from './InstructorLearnersTab';
import { InstructorProfileTab } from './InstructorProfileTab';
import { InstructorProjectsTab } from './InstructorProjectsTab';

type InstructorTab = 'inicio' | 'aprendices' | 'asistente' | 'proyectos' | 'perfil';

const tabs: BottomBarTab[] = [
  { id: 'inicio', icon: 'home-variant-outline' },
  { id: 'aprendices', icon: 'account-group-outline' },
  { id: 'proyectos', icon: 'clipboard-text-outline' },
  { id: 'perfil', icon: 'account-circle-outline' },
];

type InstructorWorkspaceProps = {
  session: AuthenticatedSession;
  onSignOut: () => Promise<void> | void;
};

export function InstructorWorkspace({ onSignOut, session }: InstructorWorkspaceProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<InstructorTab>('inicio');
  const [activeFilter, setActiveFilter] = useState<LearnerFilter>('Todos');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [autoFeedbackEnabled, setAutoFeedbackEnabled] = useState(true);
  const [offlineEnabled, setOfflineEnabled] = useState(true);
  const [dualAssistantEnabled, setDualAssistantEnabled] = useState(true);
  const [assistantChatChannel, setAssistantChatChannel] = useState<WorkspaceChatChannel>('ai');

  const [fontsLoaded] = useFonts({
    PoppinsRegular: require('../../../assets/fonts/Poppins-Regular.ttf'),
    PoppinsMedium: require('../../../assets/fonts/Poppins/Poppins-Medium.ttf'),
    PoppinsSemiBold: require('../../../assets/fonts/Poppins/Poppins-SemiBold.ttf'),
    SulphurPointBold: require('../../../assets/fonts/SulphurPoint-Bold.ttf'),
  });

  const roster = useMemo(() => {
    if (activeFilter === 'Todos') {
      return learnerRoster;
    }

    return learnerRoster.filter((learner) => learner.status === activeFilter);
  }, [activeFilter]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.screen}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 124 }]}>
          {activeTab === 'inicio' ? <HeaderCard session={session} /> : null}

          {activeTab === 'inicio' && <InstructorHomeTab session={session} onOpenChatChannel={(channel) => {
            setAssistantChatChannel(channel);
            setActiveTab('asistente');
          }} />}
          {activeTab === 'aprendices' && (
            <InstructorLearnersTab activeFilter={activeFilter} onFilterChange={setActiveFilter} roster={roster} />
          )}
          {activeTab === 'asistente' && (
            <GeminiAssistantModule
              composerPlaceholder="Escribe acá tu mensaje"
              emptyStateLabel="Modo laboratorio guiado"
              projects={projectSnapshots.map((project) => ({
                id: project.id,
                title: `${project.title} - ${project.species}`,
              }))}
              prompts={assistantPrompts}
              roleLabel="Instructor IA"
              session={session}
              subtitle="Historial por proyecto, guardado en Firestore y listo para que el backend evolucione el flujo."
              systemContext="Eres Biomind IA para instructores de biotecnología vegetal. Ayudas a revisar lotes, redactar retroalimentación, resumir observaciones, responder dudas y orientar decisiones de laboratorio."
              title="Asistente IA del laboratorio"
              voiceEnabled={voiceEnabled}
              chatChannel={assistantChatChannel}
              welcomeMessage="Hola. Soy tu asistente de Biomind con Gemini. Puedo ayudarte a analizar un lote, redactar retroalimentación para aprendices o resumir observaciones técnicas con claridad."
            />
          )}
          {activeTab === 'proyectos' && <InstructorProjectsTab />}
          {activeTab === 'perfil' && (
            <InstructorProfileTab
              autoFeedbackEnabled={autoFeedbackEnabled}
              dualAssistantEnabled={dualAssistantEnabled}
              offlineEnabled={offlineEnabled}
              session={session}
              voiceEnabled={voiceEnabled}
              onAutoFeedbackChange={setAutoFeedbackEnabled}
              onDualAssistantChange={setDualAssistantEnabled}
              onOfflineChange={setOfflineEnabled}
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
          onCenterPress={() => setActiveTab('asistente')}
          onTabPress={(tabId) => setActiveTab(tabId as InstructorTab)}
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
          <MaterialCommunityIcons name="shield-account-outline" size={14} color={instructorPalette.secondary} />
          <Text style={styles.rolePillText}>{session.role}</Text>
        </View>
      </View>

      <View style={styles.headerMainRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Hola, {getFirstName(session.name)}</Text>
          <Text style={styles.headerSubtitle}>
            Supervisa fichas, competencias, evidencias y observaciones Biomind.
          </Text>
        </View>

        <UserAvatar name={session.name} photoUrl={session.photoUrl} size={82} />
      </View>
    </View>
  );
}

function getFirstName(name: string) {
  return name.split(' ').filter(Boolean)[0] || 'Instructor';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: instructorPalette.background,
  },
  screen: {
    flex: 1,
    backgroundColor: instructorPalette.background,
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
    backgroundColor: instructorPalette.background,
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
    backgroundColor: '#2FC4B1',
  },
  headerBadgeText: {
    color: instructorPalette.surface,
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

    backgroundColor: instructorPalette.surfaceMuted,
  },

  rolePillText: {
    color: instructorPalette.secondary,
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
    color: instructorPalette.dark,
    fontFamily: 'SulphurPointBold',
    fontSize: 34,
    lineHeight: 34,
    marginTop: 15,
  },

  headerSubtitle: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    lineHeight: 20,
  },
});
