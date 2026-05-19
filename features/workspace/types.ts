import type { ComponentProps } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type AuthenticatedSession = {
  uid: string;
  name: string;
  email: string;
  role: string;
  photoUrl?: string | null;
  identificacion?: string;
  programa?: string | null;
  ficha?: string | null;
  fichasAsignadas?: string[];
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

export type WorkspaceChatRole = 'user' | 'model';

export type WorkspaceChatMessage = {
  id: string;
  role: WorkspaceChatRole;
  text: string;
  createdAt?: string;
  inputMode?: 'manual' | 'voice';
};
