import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

export type AuthenticatedSession = {
  uid: string;
  name: string;
  email: string;
  role: string;
  photoUrl?: string | null;
  identificacion?: string;
  programa?: string | null;
  fichaId?: string | null;
  ficha?: string | null;
  fichasAsignadas?: string[];
  instructorUid?: string | null;
  trimestreActual?: string | null;
};

export type WorkspaceAssistantIcon = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type WorkspaceAssistantPrompt = {
  id: string;
  title: string;
  detail: string;
  icon: WorkspaceAssistantIcon;
};

export type WorkspaceAssistantProject = {
  id: string;
  title: string;
};

export type WorkspaceChatChannel =
  | 'ai'
  | 'instructor'
  | 'pasante'
  | 'admin'
  | 'administrador'
  | 'general'
  | string;

export type WorkspaceChatRole = 'user' | 'model';

export type WorkspaceChatMessage = {
  id: string;
  role: WorkspaceChatRole;
  text: string;
  authorName?: string;
  authorRole?: string;
  createdAt?: string;
  inputMode?: 'manual' | 'voice';
};
