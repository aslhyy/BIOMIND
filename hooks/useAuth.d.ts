declare module '@/hooks/useAuth' {
  export interface AuthUser {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
    emailVerified: boolean;
  }

  export interface UserProfile {
    uid: string;
    nombre?: string;
    correo?: string;
    rol?: string;
    fotoUrl?: string | null;
    identificacion?: string;
    programa?: string | null;
    ficha?: string | null;
    fichasAsignadas?: string[];
    trimestreActual?: string | null;
    correoVerificado?: boolean;
    creadoEn?: Date;
    actualizadoEn?: Date;
  }

  export interface UseAuthReturn {
    user: AuthUser | null;
    profile: UserProfile | null;
    loading: boolean;
    isAuthenticated: boolean;
  }

  export function useAuth(): UseAuthReturn;
}
