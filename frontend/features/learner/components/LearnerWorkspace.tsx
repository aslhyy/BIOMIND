import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { learnerPalette } from '@/features/learner/theme';
import { UserAvatar } from '@/features/workspace/components/UserAvatar';
import { type BottomBarTab, WorkspaceBottomBar } from '@/features/workspace/components/WorkspaceBottomBar';
import type { AuthenticatedSession } from '@/features/workspace/types';
import { LearnerAIBitacoraAssistant } from './LearnerAIBitacoraAssistant';
import { LearnerHomeTab } from './LearnerHomeTab';
import { LearnerProfileTab } from './LearnerProfileTab';
import { LearnerBitacorasTab } from './LearnerBitacorasTab';
import { ProjectConversations } from '@/features/workspace/components/ProjectConversations';

type LearnerTab = 'inicio' | 'historial' | 'asistente' | 'proyectos' | 'perfil';

const tabs: BottomBarTab[] = [
  { id: 'inicio', icon: 'home-variant-outline' },
  { id: 'historial', icon: 'notebook-edit-outline' },
  { id: 'proyectos', icon: 'message-text-outline' },
  { id: 'perfil', icon: 'account-circle-outline' },
];

const learnerBottomBarTone = {
  activeIcon: learnerPalette.primary,
  activePill: learnerPalette.primary,
  centerGradient: ['#E4F8DE', '#A7DCA5', '#73C088', '#3D7F52'] as [string, string, string, string],
  centerShadow: learnerPalette.primary,
  inactiveIcon: learnerPalette.textMuted,
};

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
  const [assistantProjectId, setAssistantProjectId] = useState('general');
  const [assistantAutoVoiceSignal, setAssistantAutoVoiceSignal] = useState(0);
  const [newsTarget, setNewsTarget] = useState<{ bitacoraId?: string; projectId?: string; conversationId?: string }>({});

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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        style={styles.screen}>
        <ScrollView
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + (activeTab === 'asistente' ? 210 : 124) },
          ]}>
          {activeTab === 'inicio' ? <HeaderCard session={session} /> : null}

          {activeTab === 'inicio' ? (
            <LearnerHomeTab
              session={session}
              onOpenAssistant={openAssistantForProject}
              onOpenNews={(target) => {
                setNewsTarget(target);
                setActiveTab(target.action);
              }}
            />
          ) : null}
          {activeTab === 'historial' ? (
            <LearnerBitacorasTab session={session} focus={newsTarget} />
          ) : null}
          {activeTab === 'asistente' ? (
            <LearnerAIBitacoraAssistant
              autoSaveEnabled={autoSaveEnabled}
              autoStartVoiceSignal={assistantAutoVoiceSignal}
              preferredProjectId={assistantProjectId}
              session={session}
              voiceSuggestionsEnabled={voiceSuggestionsEnabled}
              voiceEnabled={voiceEnabled}
            />
          ) : null}
          {activeTab === 'proyectos' ? (
            <ProjectConversations
              preferredConversationId={newsTarget.conversationId}
              session={session}
              tone={{
                accent: learnerPalette.primary,
                background: learnerPalette.background,
                border: learnerPalette.border,
                incoming: learnerPalette.surface,
                muted: learnerPalette.textMuted,
                outgoing: learnerPalette.mint,
                surface: learnerPalette.surface,
                text: learnerPalette.text,
              }}
            />
          ) : null}
          {activeTab === 'perfil' ? (
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
          ) : null}
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
    gap: 24,
  },
  headerCard: {
    paddingTop: 20,
    marginHorizontal: -20,
    paddingHorizontal: 28,
    paddingBottom: 22,
    backgroundColor: learnerPalette.background,
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
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: learnerPalette.surfaceMuted,
    borderColor: learnerPalette.border,
    borderWidth: 1,
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
    fontSize: 32,
    lineHeight: 34,
    marginTop: 16,
  },
  headerSubtitle: {
    color: learnerPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 270,
  },
});
