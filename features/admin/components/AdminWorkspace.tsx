import { UserAvatar } from '@/features/workspace/components/UserAvatar';
import { type BottomBarTab, WorkspaceBottomBar } from '@/features/workspace/components/WorkspaceBottomBar';
import type { AuthenticatedSession } from '@/features/workspace/types';
import {
  asignarAprendizAFicha,
  calcularTrimestreActual,
  desactivarFicha,
  desactivarPrograma,
  desactivarTrimestre,
  escucharFichas,
  escucharProgramas,
  escucharTrimestres,
  guardarFicha,
  guardarPrograma,
  guardarTrimestre,
  obtenerFichasPorPrograma,
} from '@/services/academic';
import { asignarRolUsuario, eliminarUsuarioAdmin, escucharUsuariosAdmin, suspenderUsuarioAdmin } from '@/services/adminUsers';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type AdminTab = 'inicio' | 'usuarios' | 'academico' | 'trimestres' | 'perfil';
type AdminIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const palette = {
  background: '#F4F4F4',
  border: '#EFE7DC',
  dark: '#2F4736',
  ink: '#5D5A51',
  muted: '#A1A197',
  primary: '#E9A85F',
  secondary: '#F4C47F',
  soft: '#FFF4E6',
  surface: '#FFFFFF',
  warning: '#F08A6A',
  blue: '#7FC7B1',
  violet: '#E6C16B',
  green: '#9DD89F',
  danger: '#D36B58',
  mint: '#DDF7F1',
  mintText: '#21A58F',
  yellow: '#FFF1D9',
  yellowText: '#E3A55E',
  greenSoft: '#E8F8DF',
  greenText: '#7BC57D',
  salmon: '#FFE1D6',
  salmonText: '#F08A6A',
};

const tabs: BottomBarTab[] = [
  { id: 'inicio', icon: 'view-dashboard-outline' },
  { id: 'trimestres', icon: 'calendar-sync-outline' },
  { id: 'academico', icon: 'school-outline' },
  { id: 'perfil', icon: 'account-circle-outline' },
];

const bottomBarTone = {
  activeIcon: palette.primary,
  activePill: palette.primary,
  centerGradient: ['#FFF0CF', '#F7C977', '#E9A85F', '#D98A45'] as [string, string, string, string],
  centerShadow: palette.secondary,
  inactiveIcon: palette.muted,
};

type AdminUser = {
  id: string;
  nombre?: string;
  correo?: string;
  identificacion?: string;
  rol?: string | null;
  correoVerificado?: boolean,
  programaId?: string | null;
  programa?: string | null;
  fichaId?: string | null;
  ficha?: string | null;
  trimestreActual?: string | null;
};

type AcademicProgram = {
  id: string;
  codigo?: string;
  nombre?: string;
  estado?: string;
};

type AcademicSheet = {
  id: string;
  numero?: string;
  programaId?: string;
  programaNombre?: string;
  estado?: string;
};

type AcademicTrimester = {
  id: string;
  numero?: number;
  fechaInicio?: string;
  fechaFin?: string;
  programaId?: string;
  programaNombre?: string;
  fichaId?: string;
  fichaNumero?: string;
  estado?: string;
};

const formationSheets: { id: string; program: string; startDate: string; trimester: string; learners: number; instructors: string[]; interns: string[]; status: string }[] = [];

const demoPrograms: AcademicProgram[] = [];

const demoAcademicSheets: AcademicSheet[] = [];

const demoTrimesters: AcademicTrimester[] = [];

function isDemoRecord(id?: string) {
  return String(id || '').startsWith('demo-');
}

const academicBlocks = [
  { title: 'Competencia', value: 'Competencia principal del programa', icon: 'certificate-outline', accent: palette.mintText },
  { title: 'RAP', value: 'Resultado de aprendizaje esperado', icon: 'clipboard-check-outline', accent: palette.yellowText },
  { title: 'Proyecto', value: 'Proyecto asociado al programa', icon: 'lightbulb-on-outline', accent: palette.greenText },
  { title: 'Grupo', value: 'Descripción general del grupo', icon: 'account-group-outline', accent: palette.salmonText },
] as { title: string; value: string; icon: AdminIconName; accent: string }[];

const adminFlows = [
  { label: 'Alta y baja de cuentas', icon: 'account-switch-outline', done: 7 },
  { label: 'Roles por usuario', icon: 'shield-account-outline', done: 4 },
  { label: 'Aprendices por ficha', icon: 'account-multiple-plus-outline', done: 28 },
  { label: 'Instructores por ficha', icon: 'account-school-outline', done: 5 },
  { label: 'Pasantes por instructor', icon: 'account-tie-outline', done: 3 },
  { label: 'Competencias, RAP y proyectos', icon: 'source-branch', done: 14 },
] as { label: string; icon: AdminIconName; done: number }[];

const roleOptions = ['Aprendiz', 'Instructor', 'Pasante', 'Administrador'];

type AdminWorkspaceProps = {
  session: AuthenticatedSession;
  onSignOut: () => Promise<void> | void;
};

export function AdminWorkspace({ onSignOut, session }: AdminWorkspaceProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<AdminTab>('inicio');
  const [selectedRole, setSelectedRole] = useState('Aprendiz');
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [assigningUid, setAssigningUid] = useState<string | null>(null);
  const [programs, setPrograms] = useState<AcademicProgram[]>([]);
  const [sheets, setSheets] = useState<AcademicSheet[]>([]);
  const [trimesters, setTrimesters] = useState<AcademicTrimester[]>([]);
  const [academicLoading, setAcademicLoading] = useState(true);
  const [academicError, setAcademicError] = useState('');
  const [fontsLoaded] = useFonts({
    PoppinsRegular: require('../../../assets/fonts/Poppins-Regular.ttf'),
    PoppinsMedium: require('../../../assets/fonts/Poppins/Poppins-Medium.ttf'),
    PoppinsSemiBold: require('../../../assets/fonts/Poppins/Poppins-SemiBold.ttf'),
    SulphurPointBold: require('../../../assets/fonts/SulphurPoint-Bold.ttf'),
  });

  const counts = useMemo(
    () => ({
      pendingUsers: adminUsers.filter((user) => user.correoVerificado && !String(user.rol || '').trim()).length,
      activeSheets: (sheets.length ? sheets : demoAcademicSheets).filter((sheet) => sheet.estado !== 'Inactiva').length,
      learners: formationSheets.reduce((total, sheet) => total + sheet.learners, 0),
      trimesterUpdates: (trimesters.length ? trimesters : demoTrimesters).filter(
        (trimester) => trimester.estado !== 'Inactivo'
      ).length,
    }),
    [adminUsers, sheets, trimesters]
  );

  useEffect(() => {
    setUsersLoading(true);
    const unsubscribe = escucharUsuariosAdmin(
      (nextUsers: AdminUser[]) => {
        setAdminUsers(nextUsers);
        setUsersError('');
        setUsersLoading(false);
      },
      (error: any) => {
        setUsersError(error?.message || 'No pudimos cargar usuarios.');
        setUsersLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    setAcademicLoading(true);

    const unsubscribers = [
      escucharProgramas(
        (nextPrograms: AcademicProgram[]) => {
          setPrograms(nextPrograms);
          setAcademicError('');
          setAcademicLoading(false);
        },
        (error: any) => {
          setAcademicError(error?.message || 'No pudimos cargar programas.');
          setAcademicLoading(false);
        }
      ),
      escucharFichas(
        (nextSheets: AcademicSheet[]) => {
          setSheets(nextSheets);
          setAcademicError('');
          setAcademicLoading(false);
        },
        (error: any) => {
          setAcademicError(error?.message || 'No pudimos cargar fichas.');
          setAcademicLoading(false);
        }
      ),
      escucharTrimestres(
        (nextTrimesters: AcademicTrimester[]) => {
          setTrimesters(nextTrimesters);
          setAcademicError('');
          setAcademicLoading(false);
        },
        (error: any) => {
          setAcademicError(error?.message || 'No pudimos cargar trimestres.');
          setAcademicLoading(false);
        }
      ),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe?.());
    };
  }, []);

  const handleAssignRole = async (uid: string, role: string) => {
    setAssigningUid(uid);

    try {
      await asignarRolUsuario(uid, role);
      setUsersError('');
    } catch (error: any) {
      setUsersError(error?.message || 'No pudimos asignar el rol.');
    } finally {
      setAssigningUid(null);
    }
  };

  if (!fontsLoaded) {
    return null;
  }
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.screen}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 124 }]}>
          {activeTab === 'inicio' ? <HeaderCard session={session} /> : null}
          {activeTab === 'inicio' && <AdminHome counts={counts} onOpenTab={setActiveTab} />}
          {activeTab === 'usuarios' && (
            <UsersTab
              assigningUid={assigningUid}
              error={usersError}
              loading={usersLoading}
              selectedRole={selectedRole}
              users={adminUsers}
              onAssignRole={handleAssignRole}
              onRoleChange={setSelectedRole}
            />
          )}
          {activeTab === 'academico' && (
            <AcademicTab
              error={academicError}
              loading={academicLoading}
              programs={programs.length ? programs : demoPrograms}
              sheets={sheets.length ? sheets : demoAcademicSheets}
            />
          )}
          {activeTab === 'trimestres' && (
            <TrimesterTab
              error={academicError}
              loading={academicLoading}
              programs={programs.length ? programs : demoPrograms}
              sheets={sheets.length ? sheets : demoAcademicSheets}
              trimesters={trimesters.length ? trimesters : demoTrimesters}
            />
          )}
          {activeTab === 'perfil' && <ProfileTab session={session} onSignOut={onSignOut} />}
        </ScrollView>

        <WorkspaceBottomBar
          activeTab={activeTab}
          bottomInset={insets.bottom}
          centerIcon="account-cog-outline"
          centerTabId="usuarios"
          tabs={tabs}
          tone={bottomBarTone}
          onCenterPress={() => setActiveTab('usuarios')}
          onTabPress={(tabId) => setActiveTab(tabId as AdminTab)}
        />
      </View>
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
          <MaterialCommunityIcons name="shield-crown-outline" size={14} color={palette.primary} />
          <Text style={styles.rolePillText}>{session.role}</Text>
        </View>
      </View>
      <View style={styles.headerMainRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Hola, {getFirstName(session.name)}</Text>
          <Text style={styles.headerSubtitle}>
            Controla usuarios, roles, fichas, asignaciones academicas, pasantes y trimestres.
          </Text>
        </View>
        <UserAvatar name={session.name} photoUrl={session.photoUrl} size={82} />
      </View>
    </View>
  );
}

function AdminHome({
  counts,
  onOpenTab,
}: {
  counts: { pendingUsers: number; activeSheets: number; learners: number; trimesterUpdates: number };
  onOpenTab: (tab: AdminTab) => void;
}) {
  return (
    <>
      <View style={styles.metricsRow}>
        <MetricCard
          accent={palette.mintText}
          icon="account-alert-outline"
          label="Pendientes de rol"
          value={String(counts.pendingUsers)}
        />
        <MetricCard
          accent={palette.yellowText}
          icon="folder-cog-outline"
          label="Fichas activas"
          value={String(counts.activeSheets)}
        />
        <MetricCard
          accent={palette.greenText}
          icon="calendar-clock-outline"
          label="Trimestres"
          value={String(counts.trimesterUpdates)}
        />
        <MetricCard
          accent={palette.salmonText}
          icon="account-school-outline"
          label="Aprendices"
          value={String(counts.learners)}
        />
      </View>

      <Section title="Centro de control" subtitle="Accesos rapidos para administrar Biomind">
        <View style={styles.quickGrid}>
          <QuickAction
            icon="account-plus-outline"
            label="Usuarios"
            text="Crear, editar, desactivar y asignar rol"
            onPress={() => onOpenTab('usuarios')}
          />
          <QuickAction
            icon="book-education-outline"
            label="Academico"
            text="Fichas, competencias, RAP, grupos y proyectos"
            onPress={() => onOpenTab('academico')}
          />
          <QuickAction
            icon="calendar-sync-outline"
            label="Trimestres"
            text="Fechas por ficha y actualizacion visible"
            onPress={() => onOpenTab('trimestres')}
          />
          <QuickAction
            icon="chart-box-outline"
            label="Seguimiento"
            text="Avances por aprendiz, ficha y proyecto"
            onPress={() => onOpenTab('academico')}
          />
        </View>
      </Section>

      <Section title="Flujos cubiertos" subtitle="Operaciones que sostienen los permisos por rol">
        <View style={styles.flowGrid}>
          {adminFlows.map((flow) => (
            <View key={flow.label} style={styles.flowCard}>
              <MaterialCommunityIcons name={flow.icon} size={20} color={palette.primary} />
              <Text style={styles.flowNumber}>{flow.done}</Text>
              <Text style={styles.flowText}>{flow.label}</Text>
            </View>
          ))}
        </View>
      </Section>
    </>
  );
}

function UsersTab({
  assigningUid,
  error,
  loading,
  selectedRole,
  users,
  onAssignRole,
  onRoleChange,
}: {
  assigningUid: string | null;
  error: string;
  loading: boolean;
  selectedRole: string;
  users: AdminUser[];
  onAssignRole: (uid: string, role: string) => void;
  onRoleChange: (role: string) => void;
}) {
  const verifiedUsers = users.filter((user) => user.correoVerificado);
  const unverifiedUsers = users.filter((user) => !user.correoVerificado);

  return (
    <>
      <PageTitle
        icon="account-cog-outline"
        subtitle="Alta de cuentas, consulta, edicion, desactivacion y rol"
        title="Usuarios"
      />

      <Section title="Asignar rol" subtitle="Solo aparecen para asignacion los usuarios con correo verificado">
        <View style={styles.segmented}>
          {roleOptions.map((role) => (
            <Pressable
              key={role}
              onPress={() => onRoleChange(role)}
              style={[styles.segment, selectedRole === role && styles.segmentActive]}>
              <Text style={[styles.segmentText, selectedRole === role && styles.segmentTextActive]}>
                {role}
              </Text>
            </Pressable>
          ))}
        </View>

        {error ? <FeedbackBox icon="alert-circle-outline" text={error} tone="error" /> : null}

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={palette.primary} />
            <Text style={styles.cardText}>Cargando usuarios registrados...</Text>
          </View>
        ) : verifiedUsers.length ? (
          verifiedUsers.map((user) => (
            <View key={user.id}>
              <UserRow
                assigning={assigningUid === user.id}
                selectedRole={selectedRole}
                user={user}
                onAssignRole={onAssignRole}
                onDelete={async () => {
                  try {
                    await eliminarUsuarioAdmin(user.id);
                    alert('Usuario eliminado correctamente.');
                  } catch (error: any) {
                    alert(error?.message || 'No pudimos eliminar el usuario.');
                  }
                }}
                onSuspend={async () => {
                  try {
                    await suspenderUsuarioAdmin(user.id);
                    alert('Usuario suspendido correctamente.');
                  } catch (error: any) {
                    alert(error?.message || 'No pudimos suspender el usuario.');
                  }
                }}
              />

              {String(user.rol || '').toLowerCase() === 'aprendiz' && !user.fichaId ? (
                <Pressable
                  style={styles.assignButton}
                  onPress={async () => {
                    try {
                      const fichas = await obtenerFichasPorPrograma(user.programaId);

                      if (!fichas.length) {
                        alert('No hay fichas para el programa de este aprendiz.');
                        return;
                      }

                      await asignarAprendizAFicha({
                        aprendiz: user,
                        ficha: fichas[0],
                      });

                      alert('Ficha asignada correctamente.');
                    } catch (error: any) {
                      alert(error?.message || 'No pudimos asignar la ficha.');
                    }
                  }}>
                  <Text style={styles.assignButtonText}>Asignar primera ficha disponible</Text>
                </Pressable>
              ) : null}
            </View>
          ))
        ) : (
          <FeedbackBox
            icon="account-clock-outline"
            text="Aun no hay usuarios con correo verificado esperando rol."
            tone="info"
          />
        )}
      </Section>

      {unverifiedUsers.length ? (
        <Section title="Pendientes de verificar" subtitle="Cuando confirmen el correo podras asignarles rol">
          {unverifiedUsers.map((user) => (
            <UnverifiedUserRow key={user.id} user={user} />
          ))}
        </Section>
      ) : null}

      <Section title="Permisos por rol" subtitle="Acceso esperado despues de aprobar la cuenta">
        <PermissionRow icon="leaf" role="Aprendiz" text="Bitacoras, evidencias, proyectos, preguntas, IA y graficas propias." />
        <PermissionRow icon="account-school-outline" role="Instructor" text="Fichas, competencias, RAP, proyectos, grupos, evidencias e informes con IA." />
        <PermissionRow icon="account-tie-outline" role="Pasante" text="Fichas asignadas, preguntas, observaciones, reportes al instructor e IA." />
      </Section>
    </>
  );
}

function AcademicTab({
  error,
  loading,
  programs,
  sheets,
}: {
  error: string;
  loading: boolean;
  programs: AcademicProgram[];
  sheets: AcademicSheet[];
}) {
  const activePrograms = programs.filter((program) => program.estado !== 'Inactivo');
  const firstProgramId = activePrograms[0]?.id || '';
  const [programForm, setProgramForm] = useState({ id: '', codigo: '', nombre: '' });
  const [sheetForm, setSheetForm] = useState({ id: '', numero: '', programaId: firstProgramId });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (!sheetForm.programaId && firstProgramId) {
      setSheetForm((current) => ({ ...current, programaId: firstProgramId }));
    }
  }, [firstProgramId, sheetForm.programaId]);

  const selectedProgram = activePrograms.find((program) => program.id === sheetForm.programaId) || activePrograms[0];
  const canSaveSheet = Boolean(selectedProgram) && !isDemoRecord(selectedProgram?.id);

  const submitProgram = async () => {
    setSaving(true);
    setFeedback('');

    try {
      await guardarPrograma(programForm);
      setProgramForm({ id: '', codigo: '', nombre: '' });
      setFeedback('Programa guardado correctamente.');
    } catch (submitError: any) {
      setFeedback(submitError?.message || 'No pudimos guardar el programa.');
    } finally {
      setSaving(false);
    }
  };

  const submitSheet = async () => {
    setSaving(true);
    setFeedback('');

    try {
      if (!canSaveSheet) {
        throw new Error('Crea primero un programa real para asociar la ficha.');
      }

      await guardarFicha({
        ...sheetForm,
        programaId: selectedProgram?.id || '',
        programaNombre: selectedProgram?.nombre || selectedProgram?.codigo || '',
      });
      setSheetForm({ id: '', numero: '', programaId: selectedProgram?.id || '' });
      setFeedback('Ficha guardada correctamente.');
    } catch (submitError: any) {
      setFeedback(submitError?.message || 'No pudimos guardar la ficha.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageTitle
        icon="school-outline"
        subtitle="Gestion de fichas, asignaciones, competencias, RAP, proyectos y grupos"
        title="Academico"
      />
      <Section title="Programas" subtitle="Crear, listar, editar y desactivar programas">
        {error ? <FeedbackBox icon="alert-circle-outline" text={error} tone="error" /> : null}
        {feedback ? <FeedbackBox icon="check-circle-outline" text={feedback} tone="info" /> : null}
        <View style={styles.formCard}>
          <AdminField label="Codigo" value={programForm.codigo} onChangeText={(codigo) => setProgramForm((current) => ({ ...current, codigo }))} />
          <AdminField label="Nombre del programa" value={programForm.nombre} onChangeText={(nombre) => setProgramForm((current) => ({ ...current, nombre }))} />
          <Pressable disabled={saving} onPress={submitProgram} style={[styles.formButton, saving && styles.smallButtonDisabled]}>
            {saving ? <ActivityIndicator color={palette.surface} /> : <Text style={styles.formButtonText}>{programForm.id ? 'Actualizar programa' : 'Crear programa'}</Text>}
          </Pressable>
        </View>

        {loading ? <LoadingRow text="Cargando programas..." /> : null}
        {programs.map((program) => (
          <ProgramCard
            key={program.id}
            program={program}
            onDeactivate={() => desactivarPrograma(program.id)}
            onEdit={() => setProgramForm({ id: program.id, codigo: program.codigo || '', nombre: program.nombre || '' })}
          />
        ))}
      </Section>

      <Section title="Fichas de formacion" subtitle="Crear ficha, asociarla a programa, editar y desactivar">
        <View style={styles.formCard}>
          <AdminField label="Numero de ficha" value={sheetForm.numero} onChangeText={(numero) => setSheetForm((current) => ({ ...current, numero }))} />
          <OptionPicker
            emptyLabel="Primero crea un programa"
            options={activePrograms.map((program) => ({ label: `${program.codigo || 'Programa'} - ${program.nombre || ''}`, value: program.id }))}
            value={sheetForm.programaId}
            onChange={(programaId) => setSheetForm((current) => ({ ...current, programaId }))}
          />
          <Pressable disabled={saving || !canSaveSheet} onPress={submitSheet} style={[styles.formButton, (saving || !canSaveSheet) && styles.smallButtonDisabled]}>
            {saving ? <ActivityIndicator color={palette.surface} /> : <Text style={styles.formButtonText}>{sheetForm.id ? 'Actualizar ficha' : 'Crear ficha'}</Text>}
          </Pressable>
        </View>

        {sheets.map((sheet, index) => (
          <SheetCard
            index={index}
            key={sheet.id}
            sheet={sheet}
            onDeactivate={() => desactivarFicha(sheet.id)}
            onEdit={() => setSheetForm({ id: sheet.id, numero: sheet.numero || '', programaId: sheet.programaId || activePrograms[0]?.id || '' })}
          />
        ))}
      </Section>

      <Section title="Competencias, RAP y proyectos" subtitle="Estructura de seguimiento para instructor y aprendiz">
        <View style={styles.academicGrid}>
          {academicBlocks.map((item) => (
            <AcademicCard key={item.title} item={item} />
          ))}
        </View>
      </Section>

      <Section title="Asignaciones" subtitle="Vinculos entre fichas, aprendices, instructores y pasantes">
        <ActionRow icon="account-multiple-plus-outline" text="Asociar aprendices a ficha, competencia o RAP" onPress={() => setFeedback('Para aprendices: usa el boton de asignar ficha en Gestion de usuarios.')} />
        <ActionRow icon="account-school-outline" text="Asignar instructores a una o varias fichas" onPress={() => setFeedback('Asignacion de instructores lista en servicio academico; falta seleccionar instructor en esta pantalla.')} />
        <ActionRow icon="account-tie-outline" text="Asignar pasantes a instructores y fichas" onPress={() => setFeedback('Asignacion de pasantes lista en servicio academico; falta seleccionar pasante e instructor en esta pantalla.')} />
        <ActionRow icon="briefcase-check-outline" text="Asignar proyectos a aprendices o grupos de trabajo" onPress={() => setFeedback('Proyectos queda preparado para la siguiente fase funcional.')} />
      </Section>
    </>
  );
}

function TrimesterTab({
  error,
  loading,
  programs,
  sheets,
  trimesters,
}: {
  error: string;
  loading: boolean;
  programs: AcademicProgram[];
  sheets: AcademicSheet[];
  trimesters: AcademicTrimester[];
}) {
  const activePrograms = programs.filter((program) => program.estado !== 'Inactivo');
  const activeSheets = sheets.filter((sheet) => sheet.estado !== 'Inactiva');
  const firstProgramId = activePrograms[0]?.id || '';
  const firstSheetId = activeSheets[0]?.id || '';
  const [form, setForm] = useState({
    id: '',
    numero: '1',
    fechaInicio: '',
    fechaFin: '',
    programaId: firstProgramId,
    fichaId: firstSheetId,
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const currentTrimester = calcularTrimestreActual(trimesters);

  useEffect(() => {
    setForm((current) => {
      const nextProgramId = current.programaId || firstProgramId;
      const nextSheetId = current.fichaId || firstSheetId;

      if (nextProgramId === current.programaId && nextSheetId === current.fichaId) {
        return current;
      }

      return {
        ...current,
        programaId: nextProgramId,
        fichaId: nextSheetId,
      };
    });
  }, [firstProgramId, firstSheetId]);

  const selectedProgram = activePrograms.find((program) => program.id === form.programaId) || activePrograms[0];
  const selectedSheet = activeSheets.find((sheet) => sheet.id === form.fichaId) || activeSheets[0];
  const canSaveTrimester =
    Boolean(selectedProgram && selectedSheet) && !isDemoRecord(selectedProgram?.id) && !isDemoRecord(selectedSheet?.id);

  const submitTrimester = async () => {
    setSaving(true);
    setFeedback('');

    try {
      if (!canSaveTrimester) {
        throw new Error('Crea primero un programa y una ficha reales para asociar el trimestre.');
      }

      await guardarTrimestre({
        ...form,
        programaId: selectedProgram?.id || '',
        programaNombre: selectedProgram?.nombre || selectedProgram?.codigo || '',
        fichaId: selectedSheet?.id || '',
        fichaNumero: selectedSheet?.numero || '',
      });
      setForm({
        id: '',
        numero: '1',
        fechaInicio: '',
        fechaFin: '',
        programaId: selectedProgram?.id || '',
        fichaId: selectedSheet?.id || '',
      });
      setFeedback('Trimestre guardado correctamente.');
    } catch (submitError: any) {
      setFeedback(submitError?.message || 'No pudimos guardar el trimestre.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageTitle
        icon="calendar-sync-outline"
        subtitle="Fechas de inicio, calendario por ficha y trimestre visible en perfiles"
        title="Trimestres"
      />

      <Section title="Crear trimestre" subtitle="Numero, fechas, programa y ficha asociada">
        {error ? <FeedbackBox icon="alert-circle-outline" text={error} tone="error" /> : null}
        {feedback ? <FeedbackBox icon="check-circle-outline" text={feedback} tone="info" /> : null}
        <View style={styles.formCard}>
          <AdminField label="Numero" keyboardType="numeric" value={form.numero} onChangeText={(numero) => setForm((current) => ({ ...current, numero }))} />
          <DateField label="Fecha inicio" value={form.fechaInicio} onChange={(fechaInicio) => setForm((current) => ({ ...current, fechaInicio }))} />
          <DateField label="Fecha fin" value={form.fechaFin} onChange={(fechaFin) => setForm((current) => ({ ...current, fechaFin }))} />
          <OptionPicker
            emptyLabel="Primero crea un programa"
            options={activePrograms.map((program) => ({ label: `${program.codigo || 'Programa'} - ${program.nombre || ''}`, value: program.id }))}
            value={form.programaId}
            onChange={(programaId) => setForm((current) => ({ ...current, programaId }))}
          />
          <OptionPicker
            emptyLabel="Primero crea una ficha"
            options={activeSheets.map((sheet) => ({ label: `Ficha ${sheet.numero} - ${sheet.programaNombre || 'Sin programa'}`, value: sheet.id }))}
            value={form.fichaId}
            onChange={(fichaId) => setForm((current) => ({ ...current, fichaId }))}
          />
          <Pressable disabled={saving || !canSaveTrimester} onPress={submitTrimester} style={[styles.formButton, (saving || !canSaveTrimester) && styles.smallButtonDisabled]}>
            {saving ? <ActivityIndicator color={palette.surface} /> : <Text style={styles.formButtonText}>{form.id ? 'Actualizar trimestre' : 'Crear trimestre'}</Text>}
          </Pressable>
        </View>
      </Section>

      <Section title="Trimestre actual" subtitle="Calculado automaticamente segun las fechas configuradas">
        {currentTrimester ? (
          <CurrentTrimesterCard trimester={currentTrimester} />
        ) : (
          <FeedbackBox icon="calendar-alert" text="No hay trimestre activo para la fecha actual." tone="info" />
        )}
      </Section>

      <Section title="Calendario por ficha" subtitle="El sistema calcula el trimestre desde la fecha configurada">
        {loading ? <LoadingRow text="Cargando trimestres..." /> : null}
        {trimesters.map((trimester) => (
          <TrimesterCard
            key={trimester.id}
            trimester={trimester}
            onDeactivate={() => desactivarTrimestre(trimester.id)}
            onEdit={() =>
              setForm({
                id: trimester.id,
                numero: String(trimester.numero || ''),
                fechaInicio: trimester.fechaInicio || '',
                fechaFin: trimester.fechaFin || '',
                programaId: trimester.programaId || activePrograms[0]?.id || '',
                fichaId: trimester.fichaId || activeSheets[0]?.id || '',
              })
            }
          />
        ))}
      </Section>

      <Section title="Actualizacion automatica" subtitle="Aplicar el trimestre en perfiles y reportes academicos">
        <ActionRow icon="calendar-plus-outline" text="Configurar fecha de inicio de ficha" onPress={() => setFeedback('Usa el formulario de Crear trimestre para registrar inicio y fin.')} />
        <ActionRow icon="autorenew" text="Actualizar trimestre visible para aprendices, instructores y pasantes" onPress={() => setFeedback('El trimestre actual se calcula automaticamente segun las fechas configuradas.')} />
        <ActionRow icon="bell-check-outline" text="Preparar alertas cuando una ficha cambie de trimestre" onPress={() => setFeedback('Alertas preparadas como flujo; las notificaciones se conectan en una fase posterior.')} />
      </Section>
    </>
  );
}

function ProfileTab({ onSignOut, session }: AdminWorkspaceProps) {
  return (
    <>
      <View style={styles.profileShell}>
        <View style={styles.adminProfilePanel}>
          <View style={styles.adminAvatarWrap}>
            <UserAvatar name={session.name} photoUrl={session.photoUrl} size={104} />
            <Pressable style={styles.changePhotoButton} onPress={() => alert('Cambio de foto disponible desde los perfiles de usuario. En admin queda preparado visualmente.')}>
              <Text style={styles.changePhotoText}>Cambiar foto</Text>
            </Pressable>
          </View>

          <View style={styles.adminForm}>
            <ProfileField label="Nombre" value={session.name} />
            <ProfileField label="Correo" value={session.email} muted />
          </View>

          <View style={styles.profileButtonRow}>
            <Pressable style={styles.saveProfileButton} onPress={() => alert('Perfil de administrador listo. Los datos vienen de la sesion actual.')}>
              <Text style={styles.saveProfileText}>Guardar Perfil</Text>
            </Pressable>
            <Pressable onPress={onSignOut} style={styles.signOutButton}>
              <Text style={styles.signOutText}>Cerrar Sesion</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.profileBottomBand} />
      </View>
    </>
  );
}

function ProfileField({ label, muted = false, value }: { label: string; muted?: boolean; value: string }) {
  return (
    <View style={styles.profileFieldBlock}>
      <Text style={styles.profileFieldLabel}>{label}</Text>
      <TextInput
        editable={false}
        style={[styles.profileInput, muted && styles.profileInputMuted]}
        value={value}
      />
    </View>
  );
}

function MetricCard({
  accent,
  icon,
  label,
  value,
}: {
  accent: string;
  icon: AdminIconName;
  label: string;
  value: string;
}) {
  return (
    <View style={[styles.metricCard, { backgroundColor: `${accent}28` }]}>
      <View style={[styles.metricIcon, { backgroundColor: accent }]}>
        <MaterialCommunityIcons name={icon} size={20} color={palette.surface} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
  text,
}: {
  icon: AdminIconName;
  label: string;
  onPress: () => void;
  text: string;
}) {
  const toneByLabel: Record<string, { accent: string; soft: string }> = {
    Usuarios: { accent: palette.mintText, soft: palette.mint },
    Academico: { accent: palette.yellowText, soft: palette.yellow },
    Trimestres: { accent: palette.greenText, soft: palette.greenSoft },
    Seguimiento: { accent: palette.salmonText, soft: palette.salmon },
  };
  const tone = toneByLabel[label] || { accent: palette.primary, soft: palette.soft };

  return (
    <Pressable onPress={onPress} style={[styles.quickAction, { backgroundColor: tone.soft }]}>
      <View style={[styles.quickIcon, { backgroundColor: tone.accent }]}>
        <MaterialCommunityIcons name={icon} size={21} color={palette.surface} />
      </View>
      <Text style={[styles.quickTitle, { color: tone.accent }]}>{label}</Text>
      <Text style={styles.quickText}>{text}</Text>
    </Pressable>
  );
}

function UserRow({
  assigning,
  onDelete,
  onAssignRole,
  onSuspend,
  selectedRole,
  user,
}: {
  assigning: boolean;
  onDelete: () => void;
  onAssignRole: (uid: string, role: string) => void;
  onSuspend: () => void;
  selectedRole: string;
  user: AdminUser;
}) {
  const currentRole = String(user.rol || '').trim();
  const isPending = !currentRole;
  const actionLabel = isPending ? selectedRole : 'Editar';
  const accent = getRoleAccent(currentRole);

  return (
    <View style={styles.userCard}>
      <View style={[styles.userIcon, { backgroundColor: `${accent}18` }]}>
        <MaterialCommunityIcons name="account-outline" size={20} color={accent} />
      </View>
      <View style={styles.userCopy}>
        <Text style={styles.cardTitle}>{user.nombre || 'Usuario Biomind'}</Text>
        <Text style={styles.cardText}>{user.correo || 'Sin correo'}</Text>
        <Text style={styles.cardMeta}>ID {user.identificacion || 'Sin identificacion'}</Text>
        <View style={styles.chipRow}>
          <Text style={[styles.badge, isPending && styles.warningBadge]}>
            {currentRole || 'Sin rol'}
          </Text>
          <Text style={[styles.badge, styles.verifiedBadge]}>Correo verificado</Text>
        </View>
      </View>
      <View style={styles.userActions}>
        <Pressable
          disabled={assigning}
          onPress={() => onAssignRole(user.id, selectedRole)}
          style={[styles.smallButton, assigning && styles.smallButtonDisabled]}>
          {assigning ? (
            <ActivityIndicator color={palette.surface} size="small" />
          ) : (
            <Text style={styles.smallButtonText}>{actionLabel}</Text>
          )}
        </Pressable>
        <View style={styles.userRoundActions}>
          <Pressable accessibilityLabel="Suspender usuario" onPress={onSuspend} style={styles.iconButton}>
            <MaterialCommunityIcons name="account-minus-outline" size={22} color={palette.salmonText} />
          </Pressable>
          <Pressable accessibilityLabel="Eliminar usuario" onPress={onDelete} style={styles.iconButton}>
            <MaterialCommunityIcons name="account-remove-outline" size={22} color={palette.salmonText} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function UnverifiedUserRow({ user }: { user: AdminUser }) {
  return (
    <View style={styles.permissionRow}>
      <View style={styles.permissionIcon}>
        <MaterialCommunityIcons name="email-alert-outline" size={19} color={palette.warning} />
      </View>
      <View style={styles.userCopy}>
        <Text style={styles.cardTitle}>{user.nombre || 'Usuario Biomind'}</Text>
        <Text style={styles.cardText}>{user.correo || 'Sin correo'}</Text>
        <Text style={styles.cardMeta}>Esperando verificacion de correo</Text>
      </View>
    </View>
  );
}

function FeedbackBox({
  icon,
  text,
  tone,
}: {
  icon: AdminIconName;
  text: string;
  tone: 'error' | 'info';
}) {
  const color = tone === 'error' ? palette.danger : palette.primary;

  return (
    <View style={styles.feedbackBox}>
      <MaterialCommunityIcons name={icon} size={19} color={color} />
      <Text style={[styles.feedbackText, { color }]}>{text}</Text>
    </View>
  );
}

function PermissionRow({ icon, role, text }: { icon: AdminIconName; role: string; text: string }) {
  return (
    <View style={styles.permissionRow}>
      <View style={styles.permissionIcon}>
        <MaterialCommunityIcons name={icon} size={19} color={palette.primary} />
      </View>
      <View style={styles.userCopy}>
        <Text style={styles.cardTitle}>{role}</Text>
        <Text style={styles.cardText}>{text}</Text>
      </View>
    </View>
  );
}

function ProgramCard({
  onDeactivate,
  onEdit,
  program,
}: {
  onDeactivate: () => void;
  onEdit: () => void;
  program: AcademicProgram;
}) {
  const inactive = program.estado === 'Inactivo';
  const demo = isDemoRecord(program.id);
  return (
    <View style={styles.sheetCard}>
      <View style={styles.sheetHeader}>
        <View style={styles.sheetTitleRow}>
          <View style={styles.sheetNumberBadge}>
            <MaterialCommunityIcons name="school-outline" size={18} color={palette.primary} />
          </View>
          <View>
            <Text style={styles.sheetTitle}>{program.codigo || 'Programa'}</Text>
            <Text style={styles.sheetProgram}>{program.nombre || 'Sin nombre'}</Text>
          </View>
        </View>
        <StatusPill label={inactive ? 'Inactivo' : 'Activo'} tone={inactive ? 'danger' : 'success'} />
      </View>
      {demo ? (
        <Text style={styles.demoHint}>Dato demo: crea un programa para administrarlo.</Text>
      ) : (
        <View style={styles.cardActions}>
          <Pressable onPress={onEdit} style={styles.ghostButton}>
            <MaterialCommunityIcons name="pencil-outline" size={16} color={palette.primary} />
            <Text style={styles.ghostButtonText}>Editar</Text>
          </Pressable>
          {!inactive ? (
            <Pressable onPress={onDeactivate} style={styles.dangerButton}>
              <MaterialCommunityIcons name="cancel" size={16} color={palette.danger} />
              <Text style={styles.dangerButtonText}>Desactivar</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

function SheetCard({
  index,
  onDeactivate,
  onEdit,
  sheet,
}: {
  index: number;
  onDeactivate: () => void;
  onEdit: () => void;
  sheet: AcademicSheet;
}) {
  const inactive = sheet.estado === 'Inactiva';
  const demo = isDemoRecord(sheet.id);

  return (
    <View style={styles.sheetCard}>
      <View style={styles.sheetHeader}>
        <View style={styles.sheetTitleRow}>
          <View style={styles.sheetNumberBadge}>
            <Text style={styles.sheetNumberText}>F{index + 1}</Text>
          </View>
          <View>
            <Text style={styles.sheetTitle}>Ficha {sheet.numero || sheet.id}</Text>
            <Text style={styles.sheetProgram}>{sheet.programaNombre || 'Sin programa asociado'}</Text>
          </View>
        </View>
        <StatusPill label={inactive ? 'Inactiva' : 'Activa'} tone={inactive ? 'danger' : 'success'} />
      </View>
      <View style={styles.assignmentBox}>
        <AssignmentLine icon="book-education-outline" label="Programa" value={sheet.programaNombre || 'Pendiente'} />
        <AssignmentLine icon="link-variant" label="Relacion" value={`${sheet.programaNombre || 'Programa'} / Ficha ${sheet.numero || ''}`} />
      </View>
      {demo ? (
        <Text style={styles.demoHint}>Dato demo: crea una ficha real para administrarla.</Text>
      ) : (
        <View style={styles.cardActions}>
          <Pressable onPress={onEdit} style={styles.ghostButton}>
            <MaterialCommunityIcons name="pencil-outline" size={16} color={palette.primary} />
            <Text style={styles.ghostButtonText}>Editar</Text>
          </Pressable>
          {!inactive ? (
            <Pressable onPress={onDeactivate} style={styles.dangerButton}>
              <MaterialCommunityIcons name="cancel" size={16} color={palette.danger} />
              <Text style={styles.dangerButtonText}>Desactivar</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

function TrimesterCard({
  onDeactivate,
  onEdit,
  trimester,
}: {
  onDeactivate: () => void;
  onEdit: () => void;
  trimester: AcademicTrimester;
}) {
  const inactive = trimester.estado === 'Inactivo';
  const demo = isDemoRecord(trimester.id);

  return (
    <View style={styles.trimesterCard}>
      <View style={styles.trimesterTop}>
        <View style={styles.sheetTitleRow}>
          <View style={styles.sheetNumberBadge}>
            <Text style={styles.sheetNumberText}>T{trimester.numero || '?'}</Text>
          </View>
          <View>
            <Text style={styles.sheetTitle}>Ficha {trimester.fichaNumero || 'Sin ficha'}</Text>
            <Text style={styles.sheetProgram}>{trimester.programaNombre || 'Sin programa'}</Text>
          </View>
        </View>
        <StatusPill label={inactive ? 'Inactivo' : 'Activo'} tone={inactive ? 'danger' : 'success'} />
      </View>
      <View style={styles.timeline}>
        <TimelineDot active label="Inicio" value={trimester.fechaInicio || 'Pendiente'} />
        <TimelineDot active label="Fin" value={trimester.fechaFin || 'Pendiente'} />
        <TimelineDot label="Actual" value={`T${trimester.numero || '?'}`} />
      </View>
      {demo ? (
        <Text style={styles.demoHint}>Dato demo: crea un trimestre real para administrarlo.</Text>
      ) : (
        <View style={styles.cardActions}>
          <Pressable onPress={onEdit} style={styles.ghostButton}>
            <MaterialCommunityIcons name="pencil-outline" size={16} color={palette.primary} />
            <Text style={styles.ghostButtonText}>Editar</Text>
          </Pressable>
          {!inactive ? (
            <Pressable onPress={onDeactivate} style={styles.dangerButton}>
              <MaterialCommunityIcons name="cancel" size={16} color={palette.danger} />
              <Text style={styles.dangerButtonText}>Desactivar</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

function CurrentTrimesterCard({ trimester }: { trimester: AcademicTrimester }) {
  return (
    <View style={styles.currentTrimesterCard}>
      <MaterialCommunityIcons name="calendar-check-outline" size={24} color={palette.mintText} />
      <View style={styles.userCopy}>
        <Text style={styles.cardTitle}>Trimestre {trimester.numero}</Text>
        <Text style={styles.cardText}>
          Ficha {trimester.fichaNumero} - {trimester.programaNombre}
        </Text>
        <Text style={styles.cardMeta}>
          {trimester.fechaInicio} a {trimester.fechaFin}
        </Text>
      </View>
    </View>
  );
}

function StatusPill({ label, tone }: { label: string; tone: 'success' | 'danger' }) {
  const color = tone === 'success' ? palette.mintText : palette.danger;
  const backgroundColor = tone === 'success' ? palette.mint : palette.salmon;

  return <Text style={[styles.statusPill, { backgroundColor, color }]}>{label}</Text>;
}

function AdminField({
  keyboardType = 'default',
  label,
  onChangeText,
  value,
}: {
  keyboardType?: 'default' | 'numeric';
  label: string;
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <View style={styles.adminField}>
      <Text style={styles.profileFieldLabel}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholderTextColor={palette.muted}
        style={styles.profileInput}
        value={value}
      />
    </View>
  );
}

function DateField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseDateValue(value);
  const [visibleMonth, setVisibleMonth] = useState(
    selectedDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarCells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  const moveMonth = (offset: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  return (
    <View style={styles.adminField}>
      <Text style={styles.profileFieldLabel}>{label}</Text>
      <Pressable onPress={() => setOpen((current) => !current)} style={styles.dateInputButton}>
        <MaterialCommunityIcons name="calendar-month-outline" size={18} color={palette.primary} />
        <Text style={[styles.dateInputText, !value && styles.dateInputPlaceholder]}>
          {value || 'Seleccionar fecha'}
        </Text>
      </Pressable>
      {open ? (
        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Pressable onPress={() => moveMonth(-1)} style={styles.calendarNavButton}>
              <MaterialCommunityIcons name="chevron-left" size={20} color={palette.primary} />
            </Pressable>
            <Text style={styles.calendarTitle}>
              {getMonthLabel(visibleMonth)}
            </Text>
            <Pressable onPress={() => moveMonth(1)} style={styles.calendarNavButton}>
              <MaterialCommunityIcons name="chevron-right" size={20} color={palette.primary} />
            </Pressable>
          </View>
          <View style={styles.weekRow}>
            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, index) => (
              <Text key={`${day}-${index}`} style={styles.weekDayText}>{day}</Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {calendarCells.map((day, index) => {
              const dateValue = day ? formatDateValue(new Date(year, month, day)) : '';
              const isSelected = Boolean(day && dateValue === value);

              return (
                <Pressable
                  disabled={!day}
                  key={`${day || 'empty'}-${index}`}
                  onPress={() => {
                    onChange(dateValue);
                    setOpen(false);
                  }}
                  style={[styles.calendarDay, isSelected && styles.calendarDaySelected]}>
                  <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextSelected]}>
                    {day || ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function parseDateValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthLabel(date: Date) {
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function OptionPicker({
  emptyLabel,
  onChange,
  options,
  value,
}: {
  emptyLabel: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
}) {
  if (!options.length) {
    return <FeedbackBox icon="information-outline" text={emptyLabel} tone="info" />;
  }

  return (
    <View style={styles.optionWrap}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          onPress={() => onChange(option.value)}
          style={[styles.optionChip, value === option.value && styles.optionChipActive]}>
          <Text style={[styles.optionChipText, value === option.value && styles.optionChipTextActive]}>
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function LoadingRow({ text }: { text: string }) {
  return (
    <View style={styles.loadingCard}>
      <ActivityIndicator color={palette.primary} />
      <Text style={styles.cardText}>{text}</Text>
    </View>
  );
}

function AcademicCard({
  item,
}: {
  item: { title: string; value: string; icon: AdminIconName; accent: string };
}) {
  return (
    <View style={[styles.academicCard, { backgroundColor: `${item.accent}22` }]}>
      <View style={[styles.academicIcon, { backgroundColor: `${item.accent}18` }]}>
        <MaterialCommunityIcons name={item.icon} size={19} color={item.accent} />
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardText}>{item.value}</Text>
    </View>
  );
}

function AssignmentLine({ icon, label, value }: { icon: AdminIconName; label: string; value: string }) {
  return (
    <View style={styles.assignmentLine}>
      <MaterialCommunityIcons name={icon} size={18} color="#B9B9B9" />
      <Text style={styles.assignmentLabel}>{label}</Text>
      <Text style={styles.assignmentValue}>{value}</Text>
    </View>
  );
}

function TimelineDot({ active = false, label, value }: { active?: boolean; label: string; value: string }) {
  const tone =
    label === 'Actual'
      ? { backgroundColor: palette.mint, color: palette.mintText }
      : label === 'Proximo'
        ? { backgroundColor: palette.salmon, color: palette.salmonText }
        : { backgroundColor: palette.greenSoft, color: palette.greenText };

  return (
    <View style={[styles.timelineItem, { backgroundColor: tone.backgroundColor }]}>
      <Text style={[styles.timelineLabel, { color: tone.color }]}>{label}</Text>
      <Text style={styles.timelineValue}>{value}</Text>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  const tone =
    label === 'Instructores'
      ? { backgroundColor: palette.mint, color: palette.mintText }
      : label === 'Pasantes'
        ? { backgroundColor: palette.salmon, color: palette.salmonText }
        : { backgroundColor: palette.greenSoft, color: palette.greenText };

  return (
    <View style={[styles.miniStat, { backgroundColor: tone.backgroundColor }]}>
      <Text style={[styles.miniStatValue, { color: tone.color }]}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

function PageTitle({ icon, subtitle, title }: { icon: AdminIconName; subtitle: string; title: string }) {
  return (
    <View style={styles.pageWrap}>
      <View style={styles.pageTitle}>
        <Text style={styles.pageLabel}>{title === 'Usuarios' ? 'GESTION DE USUARIOS' : title === 'Academico' ? 'GESTION DE ACADEMICA' : 'GESTION DE TRIMESTRES'}</Text>
        <Text style={styles.pageMainTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function Section({ children, subtitle, title }: { children: ReactNode; subtitle: string; title: string }) {
  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.stack}>{children}</View>
    </View>
  );
}

function ActionRow({ icon, onPress, text }: { icon: AdminIconName; onPress?: () => void; text: string }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={styles.actionRow}>
      <MaterialCommunityIcons name={icon} size={20} color={palette.primary} />
      <Text style={styles.actionText}>{text}</Text>
      <MaterialCommunityIcons name="chevron-right" size={20} color={palette.muted} />
    </Pressable>
  );
}

function getFirstName(name: string) {
  return name.split(' ').filter(Boolean)[0] || 'Admin';
}

function getRoleAccent(role: string) {
  const normalizedRole = role.trim().toLowerCase();

  if (normalizedRole === 'aprendiz') {
    return palette.green;
  }

  if (normalizedRole === 'instructor') {
    return palette.blue;
  }

  if (normalizedRole === 'pasante') {
    return palette.violet;
  }

  if (normalizedRole === 'administrador' || normalizedRole === 'admin') {
    return palette.primary;
  }

  return palette.warning;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  screen: {
    flex: 1,
    backgroundColor: palette.background,
    paddingHorizontal: 3,
  },
  scrollContent: {
    gap: 0,
    paddingHorizontal: 20,
  },
  headerCard: {
    backgroundColor: palette.background,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginHorizontal: -20,
    paddingBottom: 20,
    paddingHorizontal: 28,
    paddingTop: 60,
  },
  headerTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  headerBadge: {
    backgroundColor: palette.primary,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  headerBadgeText: {
    color: palette.surface,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 10,
  },
  rolePill: {
    alignItems: 'center',
    backgroundColor: palette.soft,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  rolePillText: {
    color: palette.primary,
    fontFamily: 'PoppinsMedium',
    fontSize: 10,
  },
  headerMainRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  headerCopy: {
    flex: 1,
    gap: 8,
  },
  headerTitle: {
    color: palette.dark,
    fontFamily: 'SulphurPointBold',
    fontSize: 32,
    lineHeight: 34,
    marginTop: 24,
  },
  headerSubtitle: {
    color: palette.muted,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    lineHeight: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  metricCard: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    flex: 1,
    gap: 6,
    minHeight: 94,
    padding: 12,
  },
  metricIcon: {
    alignItems: 'center',
    borderRadius: 18,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  metricValue: {
    color: palette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 24,
    lineHeight: 26,
  },
  metricLabel: {
    color: palette.muted,
    fontFamily: 'PoppinsMedium',
    fontSize: 10,
    lineHeight: 13,
  },
  sectionBlock: {
    backgroundColor: '#EEEEEE',
    gap: 12,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  sectionHeader: {
    gap: 2,
  },
  sectionTitle: {
    color: palette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 20,
    lineHeight: 25,
  },
  sectionSubtitle: {
    color: palette.muted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 17,
  },
  stack: {
    gap: 12,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickAction: {
    backgroundColor: palette.soft,
    borderColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    gap: 8,
    minHeight: 112,
    padding: 14,
  },
  quickIcon: {
    alignItems: 'center',
    backgroundColor: palette.soft,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  quickTitle: {
    color: palette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
    lineHeight: 16,
  },
  quickText: {
    color: palette.muted,
    fontFamily: 'PoppinsRegular',
    fontSize: 10,
    lineHeight: 14,
  },
  flowGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  flowCard: {
    alignItems: 'flex-start',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 12,
    borderWidth: 1,
    flexBasis: '31%',
    flexGrow: 1,
    gap: 6,
    minHeight: 72,
    padding: 12,
  },
  flowNumber: {
    color: palette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 18,
    lineHeight: 21,
  },
  flowText: {
    color: palette.muted,
    fontFamily: 'PoppinsRegular',
    fontSize: 10,
    lineHeight: 13,
  },
  pageWrap: {
    marginHorizontal: -20,
  },
  pageTopBand: {
    backgroundColor: '#ECECEC',
    height: 48,
  },
  pageTitle: {
    backgroundColor: palette.surface,
    gap: 4,
    paddingBottom: 18,
    paddingHorizontal: 28,
    paddingTop: 30,
  },
  pageLabel: {
    color: palette.primary,
    fontFamily: 'PoppinsMedium',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  pageMainTitle: {
    color: palette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 28,
    lineHeight: 32,
  },
  pageIcon: {
    alignItems: 'center',
    backgroundColor: palette.soft,
    borderRadius: 20,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  segmented: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 0,
  },
  segment: {
    alignItems: 'center',
    backgroundColor: palette.soft,
    borderRadius: 999,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  segmentActive: {
    backgroundColor: palette.primary,
  },
  segmentText: {
    color: palette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  segmentTextActive: {
    color: palette.surface,
  },
  userCard: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 20,
    borderWidth: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 15,
  },
  userIcon: {
    alignItems: 'center',
    borderRadius: 18,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  userCopy: {
    flex: 1,
    gap: 3,
  },
  userActions: {
    alignItems: 'center',
    gap: 8,
  },
  userRoundActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cardTitle: {
    color: palette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
    lineHeight: 19,
  },
  cardText: {
    color: palette.muted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 16,
  },
  cardMeta: {
    color: palette.ink,
    fontFamily: 'PoppinsMedium',
    fontSize: 11,
    lineHeight: 15,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: palette.soft,
    borderRadius: 999,
    color: palette.primary,
    fontFamily: 'PoppinsMedium',
    fontSize: 11,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  warningBadge: {
    backgroundColor: '#FFF0E8',
    color: palette.warning,
  },
  verifiedBadge: {
    backgroundColor: palette.greenSoft,
    color: palette.greenText,
  },
  smallButton: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: 999,
    minWidth: 72,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  smallButtonDisabled: {
    opacity: 0.72,
  },
  smallButtonText: {
    color: palette.surface,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: palette.salmon,
    borderRadius: 999,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  permissionRow: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 20,
    borderWidth: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  feedbackBox: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  feedbackText: {
    flex: 1,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
    lineHeight: 18,
  },
  permissionIcon: {
    alignItems: 'center',
    backgroundColor: palette.soft,
    borderRadius: 19,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  sheetCard: {
    backgroundColor: palette.surface,
    borderRadius: 24,
    borderWidth: 0,
    gap: 13,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  sheetHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  sheetTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 13,
  },
  sheetNumberBadge: {
    alignItems: 'center',
    backgroundColor: palette.soft,
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  sheetNumberText: {
    color: palette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
    lineHeight: 18,
  },
  sheetTitle: {
    color: palette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 15,
    lineHeight: 20,
  },
  sheetProgram: {
    color: '#9FB3A0',
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 17,
  },
  sheetStats: {
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 49,
  },
  miniStat: {
    alignItems: 'center',
    backgroundColor: palette.soft,
    borderRadius: 999,
    flex: 0,
    flexDirection: 'row',
    gap: 7,
    minHeight: 30,
    minWidth: 84,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  miniStatValue: {
    color: palette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
    lineHeight: 14,
  },
  miniStatLabel: {
    color: palette.muted,
    fontFamily: 'PoppinsMedium',
    fontSize: 10,
    lineHeight: 13,
  },
  assignmentBox: {
    gap: 7,
    paddingLeft: 49,
  },
  assignmentLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  assignmentLabel: {
    color: '#AFAFAF',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
    lineHeight: 17,
    minWidth: 82,
  },
  assignmentValue: {
    color: '#B7B7B7',
    flex: 1,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 17,
  },
  academicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  academicCard: {
    backgroundColor: palette.surface,
    borderRadius: 14,
    borderWidth: 0,
    flexBasis: '47%',
    flexGrow: 1,
    gap: 9,
    minHeight: 116,
    padding: 14,
  },
  academicIcon: {
    alignItems: 'center',
    borderRadius: 16,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  formCard: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    gap: 12,
    padding: 16,
  },
  adminField: {
    gap: 6,
  },
  formButton: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  formButtonText: {
    color: palette.surface,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  dateInputButton: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: '#CFCFCF',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  dateInputText: {
    color: palette.ink,
    flex: 1,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
  },
  dateInputPlaceholder: {
    color: palette.muted,
  },
  calendarCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  calendarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarNavButton: {
    alignItems: 'center',
    backgroundColor: palette.soft,
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  calendarTitle: {
    color: palette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekDayText: {
    color: palette.primary,
    flex: 1,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    alignItems: 'center',
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    width: `${100 / 7}%`,
  },
  calendarDaySelected: {
    backgroundColor: palette.primary,
  },
  calendarDayText: {
    color: palette.ink,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
  },
  calendarDayTextSelected: {
    color: palette.surface,
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    backgroundColor: palette.soft,
    borderColor: 'transparent',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  optionChipActive: {
    backgroundColor: palette.primary,
  },
  optionChipText: {
    color: palette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  optionChipTextActive: {
    color: palette.surface,
  },
  statusPill: {
    borderRadius: 999,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 10,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingLeft: 49,
  },
  ghostButton: {
    alignItems: 'center',
    backgroundColor: palette.soft,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ghostButtonText: {
    color: palette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  dangerButton: {
    alignItems: 'center',
    backgroundColor: palette.salmon,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dangerButtonText: {
    color: palette.danger,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  demoHint: {
    color: palette.muted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 16,
    paddingLeft: 49,
  },
  currentTrimesterCard: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.mint,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  actionRow: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 22,
    borderWidth: 0,
    flexDirection: 'row',
    gap: 12,
    minHeight: 62,
    padding: 16,
  },
  actionText: {
    color: palette.dark,
    flex: 1,
    fontFamily: 'PoppinsMedium',
    fontSize: 13,
    lineHeight: 18,
  },
  trimesterCard: {
    backgroundColor: palette.surface,
    borderRadius: 24,
    borderWidth: 0,
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  trimesterTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  trimesterBadge: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: 18,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  trimesterBadgeText: {
    color: palette.surface,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
  },
  timeline: {
    flexDirection: 'row',
    gap: 9,
    paddingLeft: 49,
  },
  timelineItem: {
    alignItems: 'center',
    backgroundColor: palette.soft,
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 86,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  timelineLabel: {
    color: palette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
    lineHeight: 15,
  },
  timelineValue: {
    color: palette.muted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 14,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    padding: 20,
  },
  profileShell: {
    backgroundColor: '#F3F3F3',
    marginHorizontal: -20,
    minHeight: 650,
  },
  profileTopBand: {
    backgroundColor: '#ECECEC',
    height: 48,
  },
  adminProfilePanel: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    gap: 26,
    minHeight: 430,
    paddingHorizontal: 34,
    paddingBottom: 34,
    paddingTop: 34,
  },
  profileBottomBand: {
    backgroundColor: '#F3F3F3',
    height: 128,
  },
  adminAvatarWrap: {
    alignItems: 'center',
    gap: 10,
  },
  changePhotoButton: {
    backgroundColor: palette.soft,
    borderRadius: 999,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  changePhotoText: {
    color: palette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  adminForm: {
    gap: 14,
    maxWidth: 330,
    width: '100%',
  },
  profileFieldBlock: {
    gap: 6,
  },
  profileFieldLabel: {
    color: palette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  profileInput: {
    backgroundColor: palette.surface,
    borderColor: '#CFCFCF',
    borderRadius: 999,
    borderWidth: 1,
    color: palette.ink,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    height: 36,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  profileInputMuted: {
    backgroundColor: '#E7E7E7',
    color: palette.muted,
  },
  profileButtonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 3,
  },
  saveProfileButton: {
    backgroundColor: palette.primary,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  saveProfileText: {
    color: palette.surface,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  profileStats: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  signOutButton: {
    alignItems: 'center',
    backgroundColor: '#FFE1D6',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  signOutText: {
    color: palette.danger,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  assignButton: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: palette.mint,
    alignSelf: 'flex-start',
  },
  assignButtonText: {
    color: palette.mintText,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
});


