import type {
  AuthenticatedSession,
  WorkspaceAssistantConversation,
  WorkspaceChatChannel,
  WorkspaceChatMessage,
} from '@/features/workspace/types';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const MENSAJES_COLLECTION = 'mensajes';

function normalizeSegment(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function buildProjectChatId({
  projectId,
  session,
  chatChannel,
}: {
  projectId: string;
  session: AuthenticatedSession;
  chatChannel?: WorkspaceChatChannel;
}) {
  const projectSegment = normalizeSegment(projectId || 'general');
  const channelSegment = normalizeSegment(String(chatChannel || ''));

  if (channelSegment && channelSegment !== 'ai') {
    return `${channelSegment}-${projectSegment}`;
  }

  const roleSegment = normalizeSegment(session.role || 'usuario');
  return `${normalizeSegment(session.uid)}-${roleSegment}-${projectSegment}`;
}

export function subscribeToProjectMessages(
  {
    projectId,
    session,
    chatChannel,
  }: {
    projectId: string;
    session: AuthenticatedSession;
    chatChannel?: WorkspaceChatChannel;
  },
  onChange: (payload: {
    activeConversationId?: string;
    assistantQuestionsEnabled?: boolean;
    conversations?: WorkspaceAssistantConversation[];
    messages: WorkspaceChatMessage[];
  } | null) => void
) {
  const chatRef = doc(
    db,
    MENSAJES_COLLECTION,
    buildProjectChatId({ projectId, session, chatChannel })
  );

  return onSnapshot(
    chatRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }

      const data = snapshot.data();
      const legacyMessages = Array.isArray(data.messages) ? data.messages : [];
      const conversations = Array.isArray(data.conversations) ? data.conversations : [];
      onChange({
        assistantQuestionsEnabled: Boolean(data.assistantQuestionsEnabled),
        activeConversationId: data.activeConversationId,
        conversations: conversations.length
          ? conversations
          : legacyMessages.length
            ? [{
              id: 'principal',
              title: 'Conversación principal',
              createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
              updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
              messageCount: legacyMessages.length,
              messages: legacyMessages,
            }]
            : [],
        messages: legacyMessages,
      });
    },
    () => onChange(null)
  );
}

export async function saveProjectMessages({
  assistantQuestionsEnabled,
  conversationId,
  conversationTitle,
  messages,
  projectId,
  projectTitle,
  session,
  chatChannel,
  existingConversations = [],
}: {
  assistantQuestionsEnabled: boolean;
  conversationId?: string;
  conversationTitle?: string;
  messages: WorkspaceChatMessage[];
  projectId: string;
  projectTitle: string;
  session: AuthenticatedSession;
  chatChannel?: WorkspaceChatChannel;
  existingConversations?: WorkspaceAssistantConversation[];
}) {
  const chatId = buildProjectChatId({ projectId, session, chatChannel });
  const chatRef = doc(db, MENSAJES_COLLECTION, chatId);
  const lastMessage = messages[messages.length - 1];
  const now = new Date();
  const nowIso = now.toISOString();
  const activeConversationId = conversationId || 'principal';
  const nextConversation: WorkspaceAssistantConversation = {
    id: activeConversationId,
    title: conversationTitle || 'Conversación nueva',
    createdAt: existingConversations.find((item) => item.id === activeConversationId)?.createdAt || nowIso,
    updatedAt: nowIso,
    messageCount: messages.length,
    messages,
  };
  const conversations = [
    nextConversation,
    ...existingConversations.filter((item) => item.id !== activeConversationId),
  ];

  await setDoc(
    chatRef,
    {
      chatId,
      channel: chatChannel || 'ai',
      ownerUid: session.uid,
      ownerName: session.name,
      ownerRole: session.role,
      ownerEmail: session.email,
      projectId,
      projectTitle,
      assistantQuestionsEnabled,
      activeConversationId,
      conversations,
      messageCount: messages.length,
      lastMessagePreview: lastMessage?.text || '',
      updatedAt: now,
      createdAt: now,
      messages,
    },
    { merge: true }
  );
}
