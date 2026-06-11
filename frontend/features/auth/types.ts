import type { Animated } from 'react-native';

export type AuthView = 'bienvenida' | 'login' | 'register' | 'verify';
export type AuthAlertVariant = 'success' | 'warning' | 'info' | 'error';

export interface PendingVerification {
  correo: string;
  contrasena: string;
}

export interface AuthAlert {
  id: string;
  title: string;
  message: string;
  variant: AuthAlertVariant;
}

export interface ShowAuthAlertInput {
  title: string;
  message: string;
  variant: AuthAlertVariant;
  durationMs?: number;
}

export type ShowAuthAlert = (input: ShowAuthAlertInput) => void;

export interface WelcomeViewProps {
  onGoLogin: () => void;
  onGoRegister: () => void;
  onLogoLayout?: (y: number) => void;
  showLogo?: boolean;
  logoOpacity?: Animated.Value | Animated.AnimatedInterpolation<number> | number;
}

export interface LoginFormProps {
  onBack: () => void;
  onGoRegister: () => void;
  onAuthenticated: () => void;
  onRequiresVerification: (pending: PendingVerification) => void;
  showAlert: ShowAuthAlert;
  initialEmail?: string;
}

export interface RegisterFormProps {
  onBack: () => void;
  onGoLogin: () => void;
  onRegistered: (pending: PendingVerification) => void;
  showAlert: ShowAuthAlert;
}

export interface VerifyEmailFormProps {
  pendingVerification: PendingVerification | null;
  onBack: () => void;
  onAuthenticated: () => void;
  onReadyToLogin: (correo: string) => void;
  showAlert: ShowAuthAlert;
}
