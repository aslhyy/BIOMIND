import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { AuthenticatedSession, WorkspaceChatMessage } from '@/features/workspace/types';

const MENSAJES_COLLECTION = 'mensajes';

function normalizeSegment(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function buildProjectChatId({
  projectId,
  session,
}: {
  projectId: string;
  session: AuthenticatedSession;
}) {
  const roleSegment = normalizeSegment(session.role || 'usuario');
  const projectSegment = normalizeSegment(projectId || 'general');
  return `${session.uid}-${roleSegment}-${projectSegment}`;
}

export function subscribeToProjectMessages(
  {
    projectId,
    session,
  }: {
    projectId: string;
    session: AuthenticatedSession;
  },
  onChange: (payload: { assistantQuestionsEnabled?: boolean; messages: WorkspaceChatMessage[] } | null) => void
) {
  const chatRef = doc(db, MENSAJES_COLLECTION, buildProjectChatId({ projectId, session }));

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
}: {
  assistantQuestionsEnabled: boolean;
  messages: WorkspaceChatMessage[];
  projectId: string;
  projectTitle: string;
  session: AuthenticatedSession;
}) {
  const chatId = buildProjectChatId({ projectId, session });
  const chatRef = doc(db, MENSAJES_COLLECTION, chatId);
  const lastMessage = messages[messages.length - 1];

  await setDoc(
    chatRef,
    {
      chatId,
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
