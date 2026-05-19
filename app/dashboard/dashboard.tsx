import { Redirect, Stack } from 'expo-router';
import { Component, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { InstructorWorkspace } from '@/features/instructor/components/InstructorWorkspace';
import { LearnerWorkspace } from '@/features/learner/components/LearnerWorkspace';
import { PasanteWorkspace } from '@/features/pasante/components/PasanteWorkspace';
import { cerrarSesion } from '@/services/auth';
import { useAuth } from '@/hooks/useAuth';
import type { AuthenticatedSession } from '@/features/workspace/types';

type DashboardAuthState = {
  loading: boolean;
  user: {
    uid: string;
    displayName?: string | null;
    email?: string | null;
    photoURL?: string | null;
  } | null;
  profile: {
    nombre?: string;
    correo?: string;
    rol?: string;
    fotoUrl?: string | null;
    identificacion?: string;
    programa?: string | null;
    ficha?: string | null;
    fichasAsignadas?: string[];
    trimestreActual?: string | null;
  } | null;
};

function normalizeAssignedSheets(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }

  return [];
}

class WorkspaceCrashGuard extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.loadingScreen}>
          <Text style={styles.loadingText}>Tu sesión está activa.</Text>
          <Text style={styles.helperText}>
            No pudimos cargar esta vista completa. Cierra sesión e intenta entrar de nuevo.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function DashboardScreen() {
  const { loading, profile, user } = useAuth() as DashboardAuthState;

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="large" color="#117C72" />
          <Text style={styles.loadingText}>Cargando tu espacio...</Text>
        </View>
      </>
    );
  }

  if (!user) {
    return <Redirect href="/" />;
  }

  if (!profile) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="large" color="#117C72" />
          <Text style={styles.loadingText}>Cargando tu perfil...</Text>
        </View>
      </>
    );
  }

  const session: AuthenticatedSession = {
    uid: user.uid,
    name: profile.nombre || user.displayName || 'Usuario Biomind',
    email: profile.correo || user.email || '',
    role: profile.rol || 'Usuario autenticado',
    photoUrl: profile.fotoUrl || user.photoURL || null,
    identificacion: profile.identificacion || '',
    programa: profile.programa || null,
    ficha: profile.ficha || null,
    fichasAsignadas: normalizeAssignedSheets(profile.fichasAsignadas),
    trimestreActual: profile.trimestreActual || null,
  };

  const normalizedRole = (profile.rol || '').trim().toLowerCase();
  const isInstructor = normalizedRole === 'instructor';
  const isPasante = normalizedRole === 'pasante';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {isInstructor ? (
        <InstructorWorkspace session={session} onSignOut={cerrarSesion} />
      ) : isPasante ? (
        <WorkspaceCrashGuard>
          <PasanteWorkspace session={session} onSignOut={cerrarSesion} />
        </WorkspaceCrashGuard>
      ) : (
        <LearnerWorkspace session={session} onSignOut={cerrarSesion} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: '#F7FFFC',
  },
  loadingText: {
    color: '#117C72',
    fontSize: 16,
  },
  helperText: {
    color: '#405A50',
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 280,
    textAlign: 'center',
  },
});
