import { Redirect, Stack } from 'expo-router';
import { Component, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { AdminWorkspace } from '@/features/admin/components/AdminWorkspace';
import { InstructorWorkspace } from '@/features/instructor/components/InstructorWorkspace';
import { LearnerWorkspace } from '@/features/learner/components/LearnerWorkspace';
import { PasanteWorkspace } from '@/features/pasante/components/PasanteWorkspace';
// @ts-ignore: No declaration file for auth module
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
    estado?: string;
    correoVerificado?: boolean;
    fotoUrl?: string | null;
    identificacion?: string;
    programa?: string | null;
    programaId?: string | null;
    fichaId?: string | null;
    ficha?: string | null;
    fichasAsignadas?: string[];
    instructorUid?: string | null;
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
    programa: profile.programa || profile.programaId || null,
    fichaId: profile.fichaId || null,
    ficha: profile.ficha || null,
    fichasAsignadas: normalizeAssignedSheets(profile.fichasAsignadas),
    instructorUid: profile.instructorUid || null,
    trimestreActual: profile.trimestreActual || null,
  };

  const normalizedRole = (profile.rol || '').trim().toLowerCase();
  const isAdmin = ['administrador', 'admin'].includes(normalizedRole);
  const isInstructor = normalizedRole === 'instructor';
  const isPasante = normalizedRole === 'pasante';
  const isLearner = normalizedRole === 'aprendiz';
  const isSuspended = String(profile.estado || '').trim().toLowerCase() === 'suspendido';

  if (profile.correoVerificado === false) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingScreen}>
          <Text style={styles.loadingText}>Tu correo aún no está verificado.</Text>
          <Text style={styles.helperText}>
            Revisa el enlace que enviamos a tu correo. Luego vuelve a iniciar sesión.
          </Text>
          <Pressable onPress={cerrarSesion} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Cerrar sesión</Text>
          </Pressable>
        </View>
      </>
    );
  }

  if (isSuspended) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingScreen}>
          <Text style={styles.loadingText}>Tu cuenta esta suspendida.</Text>
          <Text style={styles.helperText}>
            Pide al administrador revisar el estado de tu cuenta para volver a ingresar.
          </Text>
          <Pressable onPress={cerrarSesion} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Cerrar sesión</Text>
          </Pressable>
        </View>
      </>
    );
  }

  if (!normalizedRole) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingScreen}>
          <Text style={styles.loadingText}>Tu cuenta esta pendiente de rol.</Text>
          <Text style={styles.helperText}>
            Un administrador debe asignarte Aprendiz, Instructor, Pasante o Administrador para ingresar.
          </Text>
          <Pressable onPress={cerrarSesion} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Cerrar sesión</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {isAdmin ? (
        <AdminWorkspace session={session} onSignOut={cerrarSesion} />
      ) : isInstructor ? (
        <InstructorWorkspace session={session} onSignOut={cerrarSesion} />
      ) : isPasante ? (
        <WorkspaceCrashGuard>
          <PasanteWorkspace session={session} onSignOut={cerrarSesion} />
        </WorkspaceCrashGuard>
      ) : isLearner ? (
        <LearnerWorkspace session={session} onSignOut={cerrarSesion} />
      ) : (
        <View style={styles.loadingScreen}>
          <Text style={styles.loadingText}>Rol no reconocido.</Text>
          <Text style={styles.helperText}>Pide al administrador revisar el rol asignado a tu cuenta.</Text>
          <Pressable onPress={cerrarSesion} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Cerrar sesión</Text>
          </Pressable>
        </View>
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
  signOutButton: {
    backgroundColor: '#117C72',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  signOutText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
