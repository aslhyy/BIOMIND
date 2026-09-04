import { ProjectConversations } from '@/features/workspace/components/ProjectConversations';
import { UserAvatar } from '@/features/workspace/components/UserAvatar';
import { type BottomBarTab, WorkspaceBottomBar } from '@/features/workspace/components/WorkspaceBottomBar';
import type {
  AuthenticatedSession,
  WorkspaceChatChannel,
} from '@/features/workspace/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { instructorPalette } from '../theme';
import { InstructorAIAssistant } from './InstructorAIAssistant';
import { InstructorHomeTab } from './InstructorHomeTab';
import { InstructorProfileTab } from './InstructorProfileTab';
import { InstructorProjectsTab } from './InstructorProjectsTab';

type InstructorTab = 'inicio' | 'aprendices' | 'asistente' | 'proyectos' | 'perfil';

const tabs: BottomBarTab[] = [
  { id: 'inicio', icon: 'home-variant-outline' },
  { id: 'aprendices', icon: 'school-outline' },
  { id: 'proyectos', icon: 'message-text-outline' },
  { id: 'perfil', icon: 'account-circle-outline' },
];

type InstructorWorkspaceProps = {
  session: AuthenticatedSession;
  onSignOut: () => Promise<void> | void;
};

export function InstructorWorkspace({ onSignOut, session }: InstructorWorkspaceProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<InstructorTab>('inicio');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showHomeNews, setShowHomeNews] = useState(true);
  const [showHomeProjects, setShowHomeProjects] = useState(true);
  const [assistantChatChannel, setAssistantChatChannel] = useState<WorkspaceChatChannel>('ai');
  const [newsTarget, setNewsTarget] = useState<{ projectId?: string; bitacoraId?: string; conversationId?: string }>({});

  const [fontsLoaded] = useFonts({
    PoppinsRegular: require('../../../assets/fonts/Poppins-Regular.ttf'),
    PoppinsMedium: require('../../../assets/fonts/Poppins/Poppins-Medium.ttf'),
    PoppinsSemiBold: require('../../../assets/fonts/Poppins/Poppins-SemiBold.ttf'),
    SulphurPointBold: require('../../../assets/fonts/SulphurPoint-Bold.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
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
            <InstructorHomeTab
              session={session}
              showNews={showHomeNews}
              showRecentProjects={showHomeProjects}
              onOpenNews={(target) => {
                setNewsTarget(target);
                setActiveTab(target.action === 'chat' ? 'proyectos' : 'aprendices');
              }}
              onOpenChatChannel={(channel) => {
                setAssistantChatChannel(channel);
                setActiveTab('asistente');
              }}
            />
          )}
          {activeTab === 'aprendices' && (
            <InstructorProjectsTab session={session} focus={newsTarget} />
          )}
          {activeTab === 'asistente' && (
            <InstructorAIAssistant
              chatChannel={assistantChatChannel}
              session={session}
              voiceEnabled={voiceEnabled}
            />
          )}
          {activeTab === 'proyectos' && (
            <ProjectConversations
              preferredConversationId={newsTarget.conversationId}
              session={session}
              tone={{
                accent: instructorPalette.primary,
                background: instructorPalette.background,
                border: instructorPalette.border,
                incoming: instructorPalette.surface,
                muted: instructorPalette.textMuted,
                outgoing: instructorPalette.mint,
                surface: instructorPalette.surface,
                text: instructorPalette.text,
              }}
            />
          )}
          {activeTab === 'perfil' && (
            <InstructorProfileTab
              session={session}
              showHomeNews={showHomeNews}
              showHomeProjects={showHomeProjects}
              voiceEnabled={voiceEnabled}
              onShowHomeNewsChange={setShowHomeNews}
              onShowHomeProjectsChange={setShowHomeProjects}
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
    gap: 24,
  },
  headerCard: {
    paddingTop: 20,
    marginHorizontal: -20,
    paddingHorizontal: 28,
    paddingBottom: 22,
    backgroundColor: instructorPalette.background,
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
    paddingVertical: 7,
    borderRadius: 999,
    borderColor: instructorPalette.border,
    borderWidth: 1,
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
    fontSize: 32,
    lineHeight: 34,
    marginTop: 16,
  },

  headerSubtitle: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    lineHeight: 20,
  },
});
