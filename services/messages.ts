import type {
    AuthenticatedSession,
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
  onChange: (payload: { assistantQuestionsEnabled?: boolean; messages: WorkspaceChatMessage[] } | null) => void
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
      onChange({
        assistantQuestionsEnabled: Boolean(data.assistantQuestionsEnabled),
        messages: Array.isArray(data.messages) ? data.messages : [],
      });
    },
    () => onChange(null)
  );
}

export async function saveProjectMessages({
  assistantQuestionsEnabled,
  messages,
  projectId,
  projectTitle,
  session,
  chatChannel,
}: {
  assistantQuestionsEnabled: boolean;
  messages: WorkspaceChatMessage[];
  projectId: string;
  projectTitle: string;
  session: AuthenticatedSession;
  chatChannel?: WorkspaceChatChannel;
}) {
  const chatId = buildProjectChatId({ projectId, session, chatChannel });
  const chatRef = doc(db, MENSAJES_COLLECTION, chatId);
  const lastMessage = messages[messages.length - 1];

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
      messageCount: messages.length,
      lastMessagePreview: lastMessage?.text || '',
      updatedAt: new Date(),
      createdAt: new Date(),
      messages,
    },
    { merge: true }
  );
}
