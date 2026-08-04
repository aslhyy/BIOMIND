import { UserAvatar } from '@/features/workspace/components/UserAvatar';
import { type BottomBarTab, WorkspaceBottomBar } from '@/features/workspace/components/WorkspaceBottomBar';
import type { AuthenticatedSession } from '@/features/workspace/types';
import {
  activarCompetencia,
  activarFicha,
  activarPrograma,
  activarResultadoAprendizaje,
  asignarTrimestreAFicha,
  asignarAprendizAFicha,
  asignarCompetenciaInstructor,
  assignInstructorToFicha,
  assignPasanteToInstructor,
  desactivarAsignacionCompetencia,
  desactivarCompetencia,
  desactivarFicha,
  desactivarPrograma,
  desactivarResultadoAprendizaje,
  escucharAsignacionesCompetencias,
  escucharCompetencias,
  escucharFichas,
  escucharProgramas,
  escucharResultadosAprendizaje,
  escucharTrimestres,
  guardarCompetencia,
  guardarFicha,
  guardarPrograma,
  guardarResultadoAprendizaje,
  guardarTrimestre,
  quitarAprendizDeFicha,
  quitarTrimestreDeFicha,
  removeInstructorFromFicha,
  removePasanteFromFicha,
  removePasanteFromInstructor,
} from '@/services/academic';
import { asignarRolUsuario, eliminarUsuarioAdmin, escucharUsuariosAdmin, suspenderUsuarioAdmin } from '@/services/adminUsers';
import { actualizarPerfilUsuario } from '@/services/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import type { ComponentProps, ReactNode } from 'react';
import { Children, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type AdminTab = 'inicio' | 'usuarios' | 'academico' | 'trimestres' | 'perfil';
type AdminIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
type AcademicSectionId =
  | 'programas'
  | 'fichas'
  | 'pasantes'
  | 'resumen'
  | 'competencias'
  | 'asignar-competencia';

const palette = {
  background: '#F5F3EE',
  shadow: '#D8C8AB',
  border: '#ECE3D0',
  dark: '#2F4736',
  ink: '#5B554A',
  muted: '#9A9386',
  primary: '#B38B4D',
  secondary: '#D5BB87',
  soft: '#FFF9EF',
  surface: '#FFFFFF',
  warning: '#C77B65',
  blue: '#7FB9AA',
  violet: '#CBB47A',
  green: '#82B98A',
  danger: '#B86658',
  mint: '#E6F4EF',
  mintText: '#3B937F',
  yellow: '#FFF6E6',
  yellowText: '#B38B4D',
  greenSoft: '#EDF7EA',
  greenText: '#669B6B',
  salmon: '#FBE3DA',
  salmonText: '#B86658',
  // nuevos, solo para Académico:
  academicInk: '#1F3A2E',
  academicLine: '#E5DCC9',
  academicChipBg: '#FFF9EF',
};

const tabs: BottomBarTab[] = [
  { id: 'inicio', icon: 'view-dashboard-outline' },
  { id: 'trimestres', icon: 'calendar-sync-outline' },
  { id: 'academico', icon: 'school-outline' },
  { id: 'perfil', icon: 'account-circle-outline' },
];

const bottomBarTone = {
  activeIcon: '#E9A85F',
  activePill: '#E9A85F',
  centerGradient: ['#FFF0CF', '#F7C977', '#E9A85F', '#D98A45'] as [string, string, string, string],
  centerShadow: '#F4C47F',
  inactiveIcon: '#A1A197',
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
  estado?: string;
  fichasAsignadas?: string[];
  instructorUid?: string | null;
  pasantesUids?: string[];
  trimestreActual?: string | null;
};

type AcademicProgram = {
  id: string;
  codigo?: string;
  nombre?: string;
  tipoFormacion?: string;
  activo?: boolean;
  estado?: string;
};

type AcademicSheet = {
  id: string;
  numero?: string;
  programaId?: string;
  programaNombre?: string;
  activo?: boolean;
  instructorUids?: string[];
  pasantesUids?: string[];
  trimestreId?: string | null;
  trimestreActual?: string | null;
  trimestreNumero?: number | null;
  trimestreFechaInicio?: string | null;
  trimestreFechaFin?: string | null;
  estado?: string;
};

type AcademicTrimester = {
  id: string;
  numero?: number;
  fechaInicio?: string;
  fechaFin?: string;
  activo?: boolean;
  estado?: string;
};

type AcademicCompetence = {
  id: string;
  codigo?: string;
  nombre?: string;
  descripcion?: string;
  activo?: boolean;
  estado?: string;
};

type LearningResult = {
  id: string;
  competenciaId?: string;
  codigo?: string;
  descripcion?: string;
  activo?: boolean;
  estado?: string;
};

type CompetenceAssignment = {
  id: string;
  competenciaId?: string;
  resultadoId: string;
  resultadoIds: string[];
  fichaId: string;
  instructorUid: string;
  estado: string;
};

const formationSheets: { id: string; program: string; startDate: string; trimester: string; learners: number; instructors: string[]; interns: string[]; status: string }[] = [];

const demoPrograms: AcademicProgram[] = [];

const demoAcademicSheets: AcademicSheet[] = [];

const demoTrimesters: AcademicTrimester[] = [];

function isDemoRecord(id?: string) {
  return String(id || '').startsWith('demo-');
}

function isActiveRecord(record: { activo?: boolean; estado?: string }) {
  return record.activo !== false && record.estado !== 'Inactivo' && record.estado !== 'Inactiva';
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function parseDateMillis(value?: string | null) {
  if (!value) return 0;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function countSheetsNeedingTrimesterReview(sheets: AcademicSheet[], trimesters: AcademicTrimester[]) {
  const activeSheets = sheets.filter(isActiveRecord);
  const trimestersById = new Map(trimesters.map((trimester) => [trimester.id, trimester]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const reviewWindowMs = 15 * 24 * 60 * 60 * 1000;

  return activeSheets.filter((sheet) => {
    const hasTrimester = Boolean(sheet.trimestreId || sheet.trimestreActual || sheet.trimestreNumero);
    if (!hasTrimester) return true;

    const linkedTrimester = sheet.trimestreId ? trimestersById.get(sheet.trimestreId) : undefined;
    const endDateMillis = parseDateMillis(sheet.trimestreFechaFin || linkedTrimester?.fechaFin);
    if (!endDateMillis) return true;

    return endDateMillis - today.getTime() <= reviewWindowMs;
  }).length;
}

function hasVerifiedEmail(user: AdminUser) {
  return user.correoVerificado === true;
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
const formationTypeOptions = ['Tecnólogo', 'Técnico', 'Curso corto'];

const academicSectionOptions: { id: AcademicSectionId; label: string; icon: AdminIconName }[] = [
  { id: 'resumen', label: 'Resumen', icon: 'format-list-bulleted' },
  { id: 'programas', label: 'Programas', icon: 'book-education-outline' },
  { id: 'fichas', label: 'Fichas', icon: 'folder-cog-outline' },
  { id: 'competencias', label: 'Competencias y RAP', icon: 'certificate-outline' },
  { id: 'asignar-competencia', label: 'Asignar RAP', icon: 'source-branch' },
  { id: 'pasantes', label: 'Pasantes', icon: 'account-tie-outline' },
];

type AdminWorkspaceProps = {
  session: AuthenticatedSession;
  onSignOut: () => Promise<void> | void;
};

export function AdminWorkspace({ onSignOut, session }: AdminWorkspaceProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<AdminTab>('inicio');
  const [activeAcademicSection, setActiveAcademicSection] = useState<AcademicSectionId>('resumen');
  const [selectedRole, setSelectedRole] = useState('Aprendiz');
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [assigningUid, setAssigningUid] = useState<string | null>(null);
  const [programs, setPrograms] = useState<AcademicProgram[]>([]);
  const [sheets, setSheets] = useState<AcademicSheet[]>([]);
  const [trimesters, setTrimesters] = useState<AcademicTrimester[]>([]);
  const [competences, setCompetences] = useState<AcademicCompetence[]>([]);
  const [learningResults, setLearningResults] = useState<LearningResult[]>([]);
  const [competenceAssignments, setCompetenceAssignments] = useState<CompetenceAssignment[]>([]);
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
      pendingUsers: adminUsers.filter((user) => hasVerifiedEmail(user) && !String(user.rol || '').trim()).length,
      activeSheets: sheets.filter(isActiveRecord).length,
      learners: adminUsers.filter((user) => String(user.rol || '').toLowerCase() === 'aprendiz').length,
      trimesterUpdates: countSheetsNeedingTrimesterReview(sheets, trimesters),
      programs: programs.filter(isActiveRecord).length,
      instructors: adminUsers.filter((user) => String(user.rol || '').toLowerCase() === 'instructor').length,
      pasantes: adminUsers.filter((user) => String(user.rol || '').toLowerCase() === 'pasante').length,
      assignedLearners: adminUsers.filter((user) => String(user.rol || '').toLowerCase() === 'aprendiz' && user.fichaId).length,
      competenceAssignments: competenceAssignments.filter(isActiveRecord).length,
      totalUsers: adminUsers.length,
    }),
    [adminUsers, competenceAssignments, programs, sheets, trimesters]
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
      escucharCompetencias(
        (nextCompetences: AcademicCompetence[]) => {
          setCompetences(nextCompetences);
          setAcademicError('');
          setAcademicLoading(false);
        },
        (error: any) => {
          setAcademicError(error?.message || 'No pudimos cargar competencias.');
          setAcademicLoading(false);
        }
      ),
      escucharResultadosAprendizaje(
        (nextResults: LearningResult[]) => {
          setLearningResults(nextResults);
          setAcademicError('');
          setAcademicLoading(false);
        },
        (error: any) => {
          setAcademicError(error?.message || 'No pudimos cargar RAP.');
          setAcademicLoading(false);
        }
      ),
      escucharAsignacionesCompetencias(
        (nextAssignments: CompetenceAssignment[]) => {
          setCompetenceAssignments(nextAssignments);
          setAcademicError('');
          setAcademicLoading(false);
        },
        (error: any) => {
          setAcademicError(error?.message || 'No pudimos cargar asignaciones de competencias.');
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

  const handleOpenAdminNews = (target: { tab: AdminTab; section?: AcademicSectionId; roleFilter?: string }) => {
    if (target.roleFilter !== undefined) {
      setSelectedRole(target.roleFilter);
    }

    if (target.section) {
      setActiveAcademicSection(target.section);
    }

    setActiveTab(target.tab);
  };

  if (!fontsLoaded) {
    return null;
  }
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        style={styles.screen}>
        <ScrollView
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 160 }]}>
          {activeTab === 'inicio' ? <HeaderCard session={session} /> : null}
          {activeTab === 'inicio' && <AdminHome counts={counts} onOpenNews={handleOpenAdminNews} />}
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
              assignments={competenceAssignments}
              activeAcademicSection={activeAcademicSection}
              competences={competences}
              learningResults={learningResults}
              programs={programs.length ? programs : demoPrograms}
              sheets={sheets.length ? sheets : demoAcademicSheets}
              users={adminUsers}
              onAcademicSectionChange={setActiveAcademicSection}
            />
          )}
          {activeTab === 'trimestres' && (
            <TrimesterTab
              error={academicError}
              loading={academicLoading}
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
      </KeyboardAvoidingView>
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
            Controla usuarios, roles, fichas, asignaciones académicas, pasantes y trimestres.
          </Text>
        </View>
        <UserAvatar name={session.name} photoUrl={session.photoUrl} size={82} />
      </View>
    </View>
  );
}

function AdminHome({
  counts,
  onOpenNews,
}: {
  counts: {
    pendingUsers: number;
    activeSheets: number;
    learners: number;
    trimesterUpdates: number;
    programs: number;
    instructors: number;
    pasantes: number;
    assignedLearners: number;
    competenceAssignments: number;
    totalUsers: number;
  };
  onOpenNews: (target: { tab: AdminTab; section?: AcademicSectionId; roleFilter?: string }) => void;
}) {
  const newsItems: {
    id: string;
    title: string;
    detail: string;
    value: string;
    icon: AdminIconName;
    accent: string;
    target: { tab: AdminTab; section?: AcademicSectionId; roleFilter?: string };
  }[] = [
    {
      id: 'pending-users',
      title: 'Usuarios pendientes de rol',
      detail: counts.pendingUsers ?
         'Hay cuentas nuevas esperando validación del administrador.'
        : 'No hay cuentas pendientes por clasificar.',
      value: String(counts.pendingUsers),
      icon: 'account-alert-outline',
      accent: palette.mintText,
      target: { tab: 'usuarios', roleFilter: '' },
    },
    {
      id: 'trimester-updates',
      title: 'Trimestres por revisar',
      detail: counts.trimesterUpdates ?
         'Hay fichas sin trimestre o con cierre cercano que necesitan actualización.'
        : 'No hay fichas sin trimestre ni cierres próximos.',
      value: String(counts.trimesterUpdates),
      icon: 'calendar-clock-outline',
      accent: palette.greenText,
      target: { tab: 'trimestres' },
    },
    {
      id: 'competence-assignments',
      title: 'Asignaciones académicas',
      detail: `${counts.competenceAssignments} asignaciones de competencias y RAP registradas.`,
      value: String(counts.competenceAssignments),
      icon: 'source-branch',
      accent: palette.yellowText,
      target: { tab: 'academico', section: 'asignar-competencia' },
    },
    {
      id: 'active-sheets',
      title: 'Fichas activas',
      detail: `${counts.assignedLearners} aprendices ya están vinculados a una ficha.`,
      value: String(counts.activeSheets),
      icon: 'folder-cog-outline',
      accent: palette.salmonText,
      target: { tab: 'academico', section: 'fichas' },
    },
  ];

  return (
    <>
      <View style={styles.metricsRow}>
        <MetricCard
          accent={palette.mintText}
          icon="account-group-outline"
          label="Usuarios totales"
          value={String(counts.totalUsers)}
        />
        <MetricCard
          accent={palette.yellowText}
          icon="account-school-outline"
          label="Instructores"
          value={String(counts.instructors)}
        />
        <MetricCard
          accent={palette.greenText}
          icon="book-education-outline"
          label="Programas"
          value={String(counts.programs)}
        />
        <MetricCard
          accent={palette.salmonText}
          icon="account-tie-outline"
          label="Pasantes"
          value={String(counts.pasantes)}
        />
      </View>

      <Section title="Novedades" subtitle="Actualizaciones recientes y accesos rápidos para administrar Biomind">
        <View style={styles.adminNewsList}>
          {newsItems.map((item) => (
            <Pressable key={item.id} onPress={() => onOpenNews(item.target)} style={styles.adminNewsCard}>
              <View style={[styles.adminNewsIcon, { backgroundColor: `${item.accent}1F` }]}>
                <MaterialCommunityIcons name={item.icon} size={20} color={item.accent} />
              </View>
              <View style={styles.adminNewsCopy}>
                <Text style={styles.adminNewsTitle}>{item.title}</Text>
                <Text style={styles.adminNewsText}>{item.detail}</Text>
              </View>
              <View style={styles.adminNewsValueWrap}>
                <Text style={[styles.adminNewsValue, { color: item.accent }]}>{item.value}</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={palette.muted} />
              </View>
            </Pressable>
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
  const [userSearch, setUserSearch] = useState('');
  const normalizeUser = (user: AdminUser) =>
    `${user.nombre || ''} ${user.correo || ''} ${user.identificacion || ''} ${user.rol || ''}`.toLowerCase();
  const sortUsers = (nextUsers: AdminUser[]) =>
    [...nextUsers].sort((a, b) =>
      (a.nombre || a.correo || '').localeCompare(b.nombre || b.correo || '', 'es', {
        numeric: true,
        sensitivity: 'base',
      })
    );
  const selectedRoleKey = selectedRole.trim().toLowerCase();
  const filteredUsers = users
    .filter((user) => normalizeUser(user).includes(userSearch.trim().toLowerCase()))
    .filter((user) => {
      if (!selectedRoleKey) return true;
      return String(user.rol || '').trim().toLowerCase() === selectedRoleKey;
    });
  const verifiedUsers = sortUsers(filteredUsers.filter(hasVerifiedEmail));
  const unverifiedUsers = sortUsers(filteredUsers.filter((user) => !hasVerifiedEmail(user)));

  return (
    <>
      <PageTitle
        icon="account-cog-outline"
        subtitle="Alta de cuentas, consulta, edicion, desactivacion y rol"
        title="Usuarios"
      />

      <Section title="Gestión de usuarios" subtitle="Filtra por rol y edita cada usuario desde su tarjeta"
      >
        <SearchField
          placeholder="Buscar por nombre, correo, identificación o rol..."
          value={userSearch}
          onChangeText={setUserSearch}
        />

        <View style={styles.segmented}>
          <Pressable
            onPress={() => onRoleChange('')}
            style={[styles.segment, !selectedRole && styles.segmentActive]}>
            <Text style={[styles.segmentText, !selectedRole && styles.segmentTextActive]}>
              Todos
            </Text>
          </Pressable>
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
            </View>
          ))
        ) : (
          <FeedbackBox
            icon="account-clock-outline"
            text="No hay usuarios verificados para este filtro."
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

    </>
  );
}

function AcademicTab({
  activeAcademicSection,
  assignments,
  competences,
  error,
  learningResults,
  loading,
  onAcademicSectionChange,
  programs,
  sheets,
  users,
}: {
  activeAcademicSection: AcademicSectionId;
  assignments: CompetenceAssignment[];
  competences: AcademicCompetence[];
  error: string;
  learningResults: LearningResult[];
  loading: boolean;
  onAcademicSectionChange: (section: AcademicSectionId) => void;
  programs: AcademicProgram[];
  sheets: AcademicSheet[];
  users: AdminUser[];
}) {
  const activePrograms = programs.filter(isActiveRecord);
  const activeSheets = sheets.filter(isActiveRecord);
  const learners = users.filter((user) => String(user.rol || '').toLowerCase() === 'aprendiz' && user.estado !== 'suspendido');
  const instructors = users.filter((user) => String(user.rol || '').toLowerCase() === 'instructor' && user.estado !== 'suspendido');
  const pasantes = users.filter((user) => String(user.rol || '').toLowerCase() === 'pasante' && user.estado !== 'suspendido');
  const activeCompetences = competences.filter(isActiveRecord);
  const firstProgramId = activePrograms[0]?.id || '';
  const [programForm, setProgramForm] = useState({ id: '', codigo: '', nombre: '', tipoFormacion: formationTypeOptions[0], activo: true, estado: 'Activo' });
  const [sheetForm, setSheetForm] = useState({ id: '', numero: '', programaId: firstProgramId, activo: true, estado: 'Activa' });
  const [competenceForm, setCompetenceForm] = useState({ id: '', codigo: '', nombre: '', descripcion: '' });
  const [rapForm, setRapForm] = useState({ id: '', competenciaId: '', codigo: '', descripcion: '' });
  const [learnerFicha, setLearnerFicha] = useState({ learnerUid: '', fichaId: '' });
  const [instructorFicha, setInstructorFicha] = useState({ instructorUid: '', fichaId: '' });
  const [pasanteInstructor, setPasanteInstructor] = useState({ pasanteUid: '', instructorUid: '' });
  const [competenceAssignment, setCompetenceAssignment] = useState({ instructorUid: '', fichaId: '', competenciaId: '', resultadoId: '' });
  const [summarySheetId, setSummarySheetId] = useState('');
  const [programSearch, setProgramSearch] = useState('');
  const [sheetSearch, setSheetSearch] = useState('');
  const [pasanteSearch, setPasanteSearch] = useState('');
  const [competenceSearch, setCompetenceSearch] = useState('');
  const [rapSearch, setRapSearch] = useState('');
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (!sheetForm.programaId && firstProgramId) {
      setSheetForm((current) => ({ ...current, programaId: firstProgramId }));
    }
  }, [firstProgramId, sheetForm.programaId]);

  useEffect(() => {
    const firstInstructorId = instructors[0]?.id || '';
    const firstLearnerId = learners[0]?.id || '';
    const firstPasanteId = pasantes[0]?.id || '';
    const firstSheetId = activeSheets[0]?.id || '';
    const firstCompetenceId = activeCompetences[0]?.id || '';
    const firstRapId = learningResults.find((rap) => rap.competenciaId === firstCompetenceId && isActiveRecord(rap))?.id || '';

    setLearnerFicha((current) => {
      const next = {
        learnerUid: current.learnerUid || firstLearnerId,
        fichaId: current.fichaId || firstSheetId,
      };
      return next.learnerUid === current.learnerUid && next.fichaId === current.fichaId ? current : next;
    });
    setInstructorFicha((current) => {
      const next = {
        instructorUid: current.instructorUid || firstInstructorId,
        fichaId: current.fichaId || firstSheetId,
      };
      return next.instructorUid === current.instructorUid && next.fichaId === current.fichaId ? current : next;
    });
    setPasanteInstructor((current) => {
      const next = {
        pasanteUid: current.pasanteUid || firstPasanteId,
        instructorUid: current.instructorUid || firstInstructorId,
      };
      return next.pasanteUid === current.pasanteUid && next.instructorUid === current.instructorUid ? current : next;
    });
    setCompetenceAssignment((current) => {
      const next = {
        instructorUid: current.instructorUid || firstInstructorId,
        fichaId: current.fichaId || firstSheetId,
        competenciaId: current.competenciaId || firstCompetenceId,
        resultadoId: current.resultadoId || firstRapId,
      };
      return next.instructorUid === current.instructorUid
        && next.fichaId === current.fichaId
        && next.competenciaId === current.competenciaId
        && next.resultadoId === current.resultadoId ? current : next;
    });
    setRapForm((current) => {
      const nextCompetenciaId = current.competenciaId || firstCompetenceId;
      return nextCompetenciaId === current.competenciaId ? current : { ...current, competenciaId: nextCompetenciaId };
    });
    setSummarySheetId((current) => current || firstSheetId);
  }, [activeSheets[0]?.id, activeCompetences[0]?.id, instructors[0]?.id, learners[0]?.id, learningResults.length, pasantes[0]?.id]);

  const selectedProgram = activePrograms.find((program) => program.id === sheetForm.programaId) || activePrograms[0];
  const selectedLearner = learners.find((user) => user.id === learnerFicha.learnerUid);
  const selectedLearnerSheet = activeSheets.find((sheet) => sheet.id === learnerFicha.fichaId);
  const selectedSummarySheet = activeSheets.find((sheet) => sheet.id === summarySheetId);
  const canSaveSheet = Boolean(selectedProgram) && !isDemoRecord(selectedProgram?.id);
  const normalizeSearch = (value: string) => value.trim().toLowerCase();
  const filterByText = <T,>(items: T[], query: string, getText: (item: T) => string) => {
    const normalizedQuery = normalizeSearch(query);
    return items.filter((item) => getText(item).toLowerCase().includes(normalizedQuery));
  };
  const filteredPrograms = filterByText(programs, programSearch, (program) =>
    `${program.codigo || ''} ${program.nombre || ''} ${program.tipoFormacion || ''} ${program.estado || ''}`
  ).sort((a, b) => String(a.nombre || a.codigo || '').localeCompare(String(b.nombre || b.codigo || ''), 'es', { numeric: true, sensitivity: 'base' }));
  const filteredSheets = filterByText(sheets, sheetSearch, (sheet) =>
    `${sheet.numero || ''} ${sheet.programaNombre || ''} ${sheet.trimestreActual || ''} ${sheet.estado || ''}`
  ).sort((a, b) => String(a.numero || '').localeCompare(String(b.numero || ''), 'es', { numeric: true, sensitivity: 'base' }));
  const filteredPasantes = filterByText(pasantes, pasanteSearch, (pasante) => {
    const instructor = instructors.find((user) => user.id === pasante.instructorUid);
    return `${pasante.nombre || ''} ${pasante.correo || ''} ${instructor?.nombre || ''} ${instructor?.correo || ''}`;
  }).sort((a, b) => String(a.nombre || a.correo || '').localeCompare(String(b.nombre || b.correo || ''), 'es', { sensitivity: 'base' }));
  const filteredCompetences = filterByText(competences, competenceSearch, (competence) =>
    `${competence.codigo || ''} ${competence.nombre || ''} ${competence.descripcion || ''} ${competence.estado || ''}`
  ).sort((a, b) => String(a.codigo || a.nombre || '').localeCompare(String(b.codigo || b.nombre || ''), 'es', { numeric: true, sensitivity: 'base' }));
  const filteredLearningResults = filterByText(learningResults, rapSearch, (rap) => {
    const competence = competences.find((item) => item.id === rap.competenciaId);
    return `${rap.codigo || ''} ${rap.descripcion || ''} ${competence?.codigo || ''} ${competence?.nombre || ''} ${rap.estado || ''}`;
  }).sort((a, b) => String(a.codigo || '').localeCompare(String(b.codigo || ''), 'es', { numeric: true, sensitivity: 'base' }));
  const filteredAssignments = filterByText(assignments, assignmentSearch, (assignment) => {
    const instructor = users.find((user) => user.id === assignment.instructorUid);
    const sheet = sheets.find((item) => item.id === assignment.fichaId);
    const competence = competences.find((item) => item.id === assignment.competenciaId);
    const rap = learningResults.find((item) => item.id === assignment.resultadoId || (assignment.resultadoIds || []).includes(item.id));
    return `${instructor?.nombre || ''} ${instructor?.correo || ''} ${sheet?.numero || ''} ${competence?.codigo || ''} ${competence?.nombre || ''} ${rap?.codigo || ''} ${rap?.descripcion || ''} ${assignment.estado || ''}`;
  });
  const assignableRaps = learningResults.filter((rap) =>
    rap.competenciaId === competenceAssignment.competenciaId && isActiveRecord(rap)
  );

  const runAcademicAction = async (action: () => Promise<void>, successMessage: string) => {
    setSaving(true);
    setFeedback('');

    try {
      await action();
      setFeedback(successMessage);
    } catch (submitError: any) {
      setFeedback(submitError?.message || 'No pudimos completar la accion.');
    } finally {
      setSaving(false);
    }
  };

  const submitProgram = async () => {
    setSaving(true);
    setFeedback('');

    try {
      if (!programForm.codigo.trim()) {
        throw new Error('Falta el código del programa.');
      }

      if (!programForm.nombre.trim()) {
        throw new Error('Falta el nombre del programa.');
      }

      await guardarPrograma(programForm);
      setProgramForm({ id: '', codigo: '', nombre: '', tipoFormacion: formationTypeOptions[0], activo: true, estado: 'Activo' });
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

      if (!sheetForm.numero.trim()) {
        throw new Error('Falta el número de ficha.');
      }

      if (!/^\d+$/.test(sheetForm.numero.trim())) {
        throw new Error('El número de ficha solo debe contener números.');
      }

      await guardarFicha({
        ...sheetForm,
        programaId: selectedProgram?.id || '',
        programaNombre: selectedProgram?.nombre || selectedProgram?.codigo || '',
      });
      setSheetForm({ id: '', numero: '', programaId: selectedProgram?.id || '', activo: true, estado: 'Activa' });
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
        subtitle="Gestión de fichas, asignaciones, competencias, RAP, proyectos y grupos"
        title="Académico"
      />
      <AcademicSectionNav activeSection={activeAcademicSection} onChange={onAcademicSectionChange} />

      {activeAcademicSection === 'programas' ? (
        <Section title="Programas" subtitle="Crear, listar, editar y desactivar programas">
          {error ? <FeedbackBox icon="alert-circle-outline" text={error} tone="error" /> : null}
          {feedback ? <FeedbackBox icon="check-circle-outline" text={feedback} tone="info" /> : null}
          <View style={styles.formCard}>
            <AdminField label="Código" value={programForm.codigo} onChangeText={(codigo) => setProgramForm((current) => ({ ...current, codigo }))} />
            <AdminField label="Nombre del programa" value={programForm.nombre} onChangeText={(nombre) => setProgramForm((current) => ({ ...current, nombre }))} />
            <OptionPicker
              emptyLabel="Selecciona el tipo de formación"
              options={formationTypeOptions.map((tipo) => ({ label: tipo, value: tipo }))}
              value={programForm.tipoFormacion}
              onChange={(tipoFormacion) => setProgramForm((current) => ({ ...current, tipoFormacion }))}
            />
            <Pressable disabled={saving} onPress={submitProgram} style={[styles.formButton, saving && styles.smallButtonDisabled]}>
              {saving ? <ActivityIndicator color={palette.surface} /> : <Text style={styles.formButtonText}>{programForm.id ? 'Actualizar programa' : 'Crear programa'}</Text>}
            </Pressable>
          </View>

          {loading ? <LoadingRow text="Cargando programas..." /> : null}
          <ScrollableAdminList
            emptyText="No encontramos programas con esa búsqueda."
            placeholder="Buscar programa por código, nombre o tipo..."
            search={programSearch}
            onSearchChange={setProgramSearch}>
            {filteredPrograms.map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                onActivate={() => activarPrograma(program.id)}
                onDeactivate={() => desactivarPrograma(program.id)}
                onEdit={() => setProgramForm({
                  id: program.id,
                  codigo: program.codigo || '',
                  nombre: program.nombre || '',
                  tipoFormacion: program.tipoFormacion || formationTypeOptions[0],
                  activo: program.activo !== false,
                  estado: program.estado || (program.activo === false ? 'Inactivo' : 'Activo'),
                })}
              />
            ))}
          </ScrollableAdminList>
        </Section>
      ) : null}

      {activeAcademicSection === 'fichas' ? (
        <Section title="Fichas de formación" subtitle="Crear ficha, asociarla a programa, editar y desactivar">
          <View style={styles.formCard}>
            <AdminField
              keyboardType="numeric"
              label="Número de ficha"
              numericOnly
              value={sheetForm.numero}
              onInvalidInput={() => setFeedback('El número de ficha solo debe contener números.')}
              onChangeText={(numero) => setSheetForm((current) => ({ ...current, numero }))}
            />
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
          <ScrollableAdminList
            emptyText="No encontramos fichas con esa búsqueda."
            placeholder="Buscar ficha por número, programa o trimestre..."
            search={sheetSearch}
            onSearchChange={setSheetSearch}>
            {filteredSheets.map((sheet, index) => (
              <SheetCard
                index={index}
                key={sheet.id}
                sheet={sheet}
                onActivate={() => activarFicha(sheet.id)}
                onDeactivate={() => desactivarFicha(sheet.id)}
                onEdit={() => setSheetForm({
                  id: sheet.id,
                  numero: sheet.numero || '',
                  programaId: sheet.programaId || activePrograms[0]?.id || '',
                  activo: sheet.activo !== false,
                  estado: sheet.estado || (sheet.activo === false ? 'Inactiva' : 'Activa'),
                })}
              />
            ))}
          </ScrollableAdminList>
        </Section>
      ) : null}

      {activeAcademicSection === 'pasantes' ? (
        <Section title="Instructores y pasantes" subtitle="Asigna fichas a instructores y pasantes al instructor responsable">
          <View style={styles.formCard}>
            <Text style={styles.formHint}>Instructor a ficha</Text>
            <AssignmentStep number="1" text="Selecciona el instructor" />
            <OptionPicker
              emptyLabel="Primero asigna usuarios instructor"
              options={instructors.map((user) => ({
                label: `${user.nombre || user.correo || user.id} - ${(user.fichasAsignadas || []).length || 0} ficha(s)`,
                value: user.id,
              }))}
              value={instructorFicha.instructorUid}
              onChange={(instructorUid) => setInstructorFicha((current) => ({ ...current, instructorUid }))}
            />
            <AssignmentStep number="2" text="Selecciona la ficha que orientará" />
            <OptionPicker
              emptyLabel="Primero crea una ficha"
              options={activeSheets.map((sheet) => ({ label: `Ficha ${sheet.numero} - ${sheet.programaNombre || 'Sin programa'}`, value: sheet.id }))}
              value={instructorFicha.fichaId}
              onChange={(fichaId) => setInstructorFicha((current) => ({ ...current, fichaId }))}
            />
            <AssignmentSummary
              text={`${instructors.find((user) => user.id === instructorFicha.instructorUid)?.nombre || 'Instructor pendiente'} -> Ficha ${activeSheets.find((sheet) => sheet.id === instructorFicha.fichaId)?.numero || 'pendiente'}`}
            />
            <Pressable
              disabled={saving}
              onPress={() => runAcademicAction(
                () => assignInstructorToFicha(instructorFicha.instructorUid, instructorFicha.fichaId),
                'Instructor asignado a la ficha.'
              )}
              style={[styles.formButton, saving && styles.smallButtonDisabled]}>
              <Text style={styles.formButtonText}>Asignar instructor</Text>
            </Pressable>
          </View>
          <View style={styles.formCard}>
            <Text style={styles.formHint}>Pasante a instructor</Text>
            <AssignmentStep number="1" text="Selecciona el pasante" />
            <OptionPicker
              emptyLabel="Primero asigna usuarios pasante"
              options={pasantes.map((user) => ({ label: user.nombre || user.correo || user.id, value: user.id }))}
              value={pasanteInstructor.pasanteUid}
              onChange={(pasanteUid) => setPasanteInstructor((current) => ({ ...current, pasanteUid }))}
            />
            <AssignmentStep number="2" text="Selecciona el instructor responsable" />
            <OptionPicker
              emptyLabel="Primero asigna usuarios instructor"
              options={instructors.map((user) => ({ label: user.nombre || user.correo || user.id, value: user.id }))}
              value={pasanteInstructor.instructorUid}
              onChange={(instructorUid) => setPasanteInstructor((current) => ({ ...current, instructorUid }))}
            />
            <AssignmentSummary
              text={`${pasantes.find((user) => user.id === pasanteInstructor.pasanteUid)?.nombre || 'Pasante pendiente'} → ${instructors.find((user) => user.id === pasanteInstructor.instructorUid)?.nombre || 'Instructor pendiente'}`}
            />
            <Pressable
              disabled={saving}
              onPress={() => runAcademicAction(
                () => assignPasanteToInstructor(pasanteInstructor.instructorUid, pasanteInstructor.pasanteUid),
                'Pasante asignado al instructor y sus fichas.'
              )}
              style={[styles.formButton, saving && styles.smallButtonDisabled]}>
              <Text style={styles.formButtonText}>Asignar pasante</Text>
            </Pressable>
          </View>
          <ScrollableAdminList
            emptyText="No encontramos pasantes con esa búsqueda."
            placeholder="Buscar pasante o instructor..."
            search={pasanteSearch}
            onSearchChange={setPasanteSearch}>
            {filteredPasantes.map((pasante) => {
              const instructor = instructors.find((user) => user.id === pasante.instructorUid);

              return (
                <SimpleAdminCard
                  key={`pasante-${pasante.id}`}
                  title={pasante.nombre || pasante.correo || 'Pasante'}
                  subtitle={instructor ? `Instructor: ${instructor.nombre || instructor.correo}` : 'Sin instructor asignado'}
                  onDeactivate={instructor ? () => runAcademicAction(
                    () => removePasanteFromInstructor(instructor.id, pasante.id),
                    'Relación pasante-instructor retirada.'
                  ) : undefined}
                />
              );
            })}
          </ScrollableAdminList>
        </Section>
      ) : null}

      {activeAcademicSection === 'resumen' ? (
        <Section title="Resumen por ficha" subtitle="Revisa rápidamente las asignaciones guardadas">
          <OptionPicker
            emptyLabel="Primero crea una ficha"
            options={activeSheets.map((sheet) => ({
              label: `Ficha ${sheet.numero || sheet.id} - ${sheet.programaNombre || 'Sin programa'} - ${sheet.trimestreActual || 'Sin trimestre'}`,
              value: sheet.id,
            }))}
            value={summarySheetId}
            onChange={setSummarySheetId}
          />
          {(selectedSummarySheet ? [selectedSummarySheet] : []).map((sheet) => {
            const sheetLearners = learners.filter((user) => user.fichaId === sheet.id);
            const sheetInstructors = instructors.filter((user) =>
              (sheet.instructorUids || []).includes(user.id) || (user.fichasAsignadas || []).includes(sheet.id)
            );
            const sheetInstructorIds = new Set(sheetInstructors.map((user) => user.id));
            const sheetPasantes = uniqueById(pasantes.filter((user) =>
              (sheet.pasantesUids || []).includes(user.id)
              || (user.fichasAsignadas || []).includes(sheet.id)
              || (user.instructorUid ? sheetInstructorIds.has(user.instructorUid) : false)
            ));
            const sheetAssignments = assignments.filter((assignment) =>
              assignment.fichaId === sheet.id && isActiveRecord(assignment)
            );
            const sheetAssignmentRows = sheetAssignments.map((assignment) => {
              const instructor = users.find((user) => user.id === assignment.instructorUid);
              const competence = competences.find((item) => item.id === assignment.competenciaId);
              const rapIds = [
                assignment.resultadoId,
                ...(Array.isArray(assignment.resultadoIds) ? assignment.resultadoIds : []),
              ].filter(Boolean);
              const assignedRaps = uniqueById(learningResults.filter((rap) => rapIds.includes(rap.id) && isActiveRecord(rap)));

              return {
                id: assignment.id,
                competence,
                instructor,
                raps: assignedRaps,
              };
            });
            const totalAssignedRaps = sheetAssignmentRows.reduce(
              (total, row) => total + (row.raps?.length || 0),
              0
            );

            return (
              <View key={`summary-${sheet.id}`} style={styles.summaryCard}>
                <View style={styles.sheetHeader}>
                  <View style={styles.userCopy}>
                    <Text style={styles.sheetTitle}>
                      Ficha {sheet.numero || sheet.id} - {sheet.trimestreActual || 'Sin trimestre'}
                    </Text>
                    <Text style={styles.sheetProgram}>{sheet.programaNombre || 'Sin programa'}</Text>
                  </View>
                </View>
                <View style={styles.summaryStatsRow}>
                  <MiniStat label="Aprendices" value={String(sheetLearners.length)} />
                  <MiniStat label="Instructores" value={String(sheetInstructors.length)} />
                  <MiniStat label="Pasantes" value={String(sheetPasantes.length)} />
                  <MiniStat label="RAP" value={String(totalAssignedRaps)} />
                </View>

                <RelationGroup
                  emptyText="Sin aprendices asignados"
                  items={sheetLearners}
                  title="Aprendices"
                  onRemove={(user) => runAcademicAction(
                    () => quitarAprendizDeFicha(user.id),
                    'Aprendiz retirado de la ficha.'
                  )}
                />
                <RelationGroup
                  emptyText="Sin instructores asignados"
                  items={sheetInstructors}
                  title="Instructores"
                  onRemove={(user) => runAcademicAction(
                    () => removeInstructorFromFicha(user.id, sheet.id),
                    'Instructor retirado de la ficha.'
                  )}
                />
                <RelationGroup
                  emptyText="Sin pasantes asignados"
                  items={sheetPasantes}
                  title="Pasantes"
                  onRemove={(user) => runAcademicAction(
                    () => removePasanteFromFicha(user.id, sheet.id),
                    'Pasante retirado de la ficha.'
                  )}
                />
                <AssignmentSummaryGroup
                  emptyText="Sin competencias ni RAP asignados a esta ficha"
                  rows={sheetAssignmentRows.filter((row) => row.competence && row.instructor) as { id: string; competence: AcademicCompetence; instructor: AdminUser; raps: LearningResult[] }[]}
                />
              </View>
            );
          })}
        </Section>
      ) : null}

      {activeAcademicSection === 'competencias' ? (
        <Section title="Competencias y RAP" subtitle="El instructor solo puede recibir competencias que ya tengan resultados">
          <View style={styles.formCard}>
            <AdminField label="Código competencia" value={competenceForm.codigo} onChangeText={(codigo) => setCompetenceForm((current) => ({ ...current, codigo }))} />
            <AdminField label="Nombre competencia" value={competenceForm.nombre} onChangeText={(nombre) => setCompetenceForm((current) => ({ ...current, nombre }))} />
            <AdminField label="Descripción" value={competenceForm.descripcion} onChangeText={(descripcion) => setCompetenceForm((current) => ({ ...current, descripcion }))} />
            <Pressable
              disabled={saving}
              onPress={() => runAcademicAction(async () => {
                await guardarCompetencia(competenceForm);
                setCompetenceForm({ id: '', codigo: '', nombre: '', descripcion: '' });
              }, 'Competencia guardada correctamente.')}
              style={[styles.formButton, saving && styles.smallButtonDisabled]}>
              <Text style={styles.formButtonText}>{competenceForm.id ? 'Actualizar competencia' : 'Crear competencia'}</Text>
            </Pressable>
          </View>
          <ScrollableAdminList
            emptyText="No encontramos competencias con esa búsqueda."
            placeholder="Buscar competencia por código, nombre o descripción..."
            search={competenceSearch}
            onSearchChange={setCompetenceSearch}>
            {filteredCompetences.map((competence) => (
              <SimpleAdminCard
                key={competence.id}
                title={`${competence.codigo || 'COMP'} - ${competence.nombre || 'Competencia'}`}
                subtitle={competence.descripcion || 'Sin descripción'}
                inactive={!isActiveRecord(competence)}
                onActivate={() => activarCompetencia(competence.id)}
                onDeactivate={() => desactivarCompetencia(competence.id)}
                onEdit={() => setCompetenceForm({
                  id: competence.id,
                  codigo: competence.codigo || '',
                  nombre: competence.nombre || '',
                  descripcion: competence.descripcion || '',
                })}
              />
            ))}
          </ScrollableAdminList>

          <View style={styles.formCard}>
            <View style={styles.rapFormHeader}>
              <Text style={styles.rapFormEyebrow}>Formulario independiente</Text>
              <Text style={styles.rapFormTitle}>Resultado de aprendizaje</Text>
            </View>
            <OptionPicker
              emptyLabel="Primero crea una competencia"
              options={competences.map((competence) => ({ label: `${competence.codigo || 'COMP'} - ${competence.nombre || ''}`, value: competence.id }))}
              value={rapForm.competenciaId}
              onChange={(competenciaId) => setRapForm((current) => ({ ...current, competenciaId }))}
            />
            <AdminField label="Código RAP" value={rapForm.codigo} onChangeText={(codigo) => setRapForm((current) => ({ ...current, codigo }))} />
            <AdminField label="Descripción RAP" value={rapForm.descripcion} onChangeText={(descripcion) => setRapForm((current) => ({ ...current, descripcion }))} />
            <Pressable
              disabled={saving}
              onPress={() => runAcademicAction(async () => {
                await guardarResultadoAprendizaje(rapForm);
                setRapForm({ id: '', competenciaId: rapForm.competenciaId, codigo: '', descripcion: '' });
              }, 'RAP guardado correctamente.')}
              style={[styles.formButton, saving && styles.smallButtonDisabled]}>
              <Text style={styles.formButtonText}>{rapForm.id ? 'Actualizar RAP' : 'Crear RAP'}</Text>
            </Pressable>
          </View>
          <ScrollableAdminList
            emptyText="No encontramos RAP con esa búsqueda."
            placeholder="Buscar RAP por código, descripción o competencia..."
            search={rapSearch}
            onSearchChange={setRapSearch}>
            {filteredLearningResults.map((rap) => {
              const competence = competences.find((item) => item.id === rap.competenciaId);
              return (
                <SimpleAdminCard
                  key={rap.id}
                  title={`${rap.codigo || 'RAP'} - ${competence?.nombre || 'Competencia'}`}
                  subtitle={rap.descripcion || 'Sin descripción'}
                  inactive={!isActiveRecord(rap)}
                  onActivate={() => activarResultadoAprendizaje(rap.id)}
                  onDeactivate={() => desactivarResultadoAprendizaje(rap.id)}
                  onEdit={() => setRapForm({
                    id: rap.id,
                    competenciaId: rap.competenciaId || activeCompetences[0].id || '',
                    codigo: rap.codigo || '',
                    descripcion: rap.descripcion || '',
                  })}
                />
              );
            })}
          </ScrollableAdminList>
        </Section>
      ) : null}

      {activeAcademicSection === 'asignar-competencia' ? (
        <Section title="Asignar RAP" subtitle="Instructor, ficha, competencia y resultado de aprendizaje específico">
          <View style={styles.formCard}>
            <AssignmentStep number="1" text="Selecciona el instructor" />
            <OptionPicker
              emptyLabel="Primero asigna usuarios instructor"
              options={instructors.map((user) => ({ label: user.nombre || user.correo || user.id, value: user.id }))}
              value={competenceAssignment.instructorUid}
              onChange={(instructorUid) => setCompetenceAssignment((current) => ({ ...current, instructorUid }))}
            />
            <AssignmentStep number="2" text="Selecciona la ficha" />
            <OptionPicker
              emptyLabel="Primero crea una ficha"
              options={activeSheets.map((sheet) => ({ label: `Ficha ${sheet.numero} - ${sheet.programaNombre || 'Sin programa'}`, value: sheet.id }))}
              value={competenceAssignment.fichaId}
              onChange={(fichaId) => setCompetenceAssignment((current) => ({ ...current, fichaId }))}
            />
            <AssignmentStep number="3" text="Selecciona la competencia" />
            <OptionPicker
              emptyLabel="Primero crea una competencia"
              options={activeCompetences.map((competence) => ({ label: `${competence.codigo || 'COMP'} - ${competence.nombre || ''}`, value: competence.id }))}
              value={competenceAssignment.competenciaId}
              onChange={(competenciaId) => {
                const nextRapId = learningResults.find((rap) => rap.competenciaId === competenciaId && isActiveRecord(rap))?.id || '';
                setCompetenceAssignment((current) => ({ ...current, competenciaId, resultadoId: nextRapId }));
              }}
            />
            <AssignmentStep number="4" text="Selecciona el RAP específico" />
            <OptionPicker
              emptyLabel="Esta competencia no tiene RAP activos"
              options={assignableRaps.map((rap) => ({ label: `${rap.codigo || 'RAP'} - ${rap.descripcion || ''}`, value: rap.id }))}
              value={competenceAssignment.resultadoId}
              onChange={(resultadoId) => setCompetenceAssignment((current) => ({ ...current, resultadoId }))}
            />
            <AssignmentSummary
              text={`${instructors.find((user) => user.id === competenceAssignment.instructorUid)?.nombre || 'Instructor'} → Ficha ${activeSheets.find((sheet) => sheet.id === competenceAssignment.fichaId)?.numero || 'pendiente'} → ${activeCompetences.find((item) => item.id === competenceAssignment.competenciaId)?.nombre || 'Competencia pendiente'} → ${assignableRaps.find((item) => item.id === competenceAssignment.resultadoId)?.codigo || 'RAP pendiente'}`}
            />
            <Pressable
              disabled={saving || !competenceAssignment.resultadoId}
              onPress={() => runAcademicAction(
                () => asignarCompetenciaInstructor(competenceAssignment),
                'RAP asignado al instructor para la ficha.'
              )}
              style={[styles.formButton, (saving || !competenceAssignment.resultadoId) && styles.smallButtonDisabled]}>
              <Text style={styles.formButtonText}>Asignar RAP</Text>
            </Pressable>
          </View>
          <ScrollableAdminList
            emptyText="No encontramos asignaciones con esa búsqueda."
            placeholder="Buscar por instructor, ficha o competencia..."
            search={assignmentSearch}
            onSearchChange={setAssignmentSearch}>
            {filteredAssignments.map((assignment) => {
              const instructor = users.find((user) => user.id === assignment.instructorUid);
              const sheet = sheets.find((item) => item.id === assignment.fichaId);
              const competence = competences.find((item) => item.id === assignment.competenciaId);
              const rap = learningResults.find((item) => item.id === assignment.resultadoId || (assignment.resultadoIds || []).includes(item.id));
              return (
                <SimpleAdminCard
                  variant="loose"
                  key={assignment.id}
                  title={`${rap?.codigo || 'RAP'} - ${rap?.descripcion || 'Resultado de aprendizaje'}`}
                  subtitle={`${competence?.codigo || 'COMP'} - ${competence?.nombre || 'Competencia'} / ${instructor?.nombre || 'Instructor'} / Ficha ${sheet?.numero || 'sin ficha'}`}
                  inactive={!isActiveRecord(assignment)}
                  onDeactivate={isActiveRecord(assignment) ? () => runAcademicAction(
                    () => desactivarAsignacionCompetencia(assignment.id),
                    'Asignación de competencia retirada.'
                  ) : undefined}
                />
              );
            })}
          </ScrollableAdminList>
        </Section>
      ) : null}
    </>
  );
}

function TrimesterTab({
  error,
  loading,
  sheets,
  trimesters,
}: {
  error: string;
  loading: boolean;
  sheets: AcademicSheet[];
  trimesters: AcademicTrimester[];
}) {
  const activeSheets = sheets.filter(isActiveRecord);
  const activeTrimesters = trimesters.filter(isActiveRecord);
  const firstTrimesterId = activeTrimesters[0].id || '';
  const [sheetSearch, setSheetSearch] = useState('');
  const [dateForm, setDateForm] = useState({ id: '', fechaInicio: '', fechaFin: '' });
  const [form, setForm] = useState({
    trimestreId: firstTrimesterId,
    numero: '1',
    fichaIds: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (!form.trimestreId && firstTrimesterId) {
      setForm((current) => ({ ...current, trimestreId: firstTrimesterId }));
    }
  }, [firstTrimesterId, form.trimestreId]);

  const selectedTrimester = activeTrimesters.find((trimester) => trimester.id === form.trimestreId);
  const filteredSheets = activeSheets
    .filter((sheet) => {
      const queryText = `${sheet.numero || ''} ${sheet.programaNombre || ''} ${sheet.trimestreActual || ''}`.toLowerCase();
      return queryText.includes(sheetSearch.trim().toLowerCase());
    })
    .sort((a, b) => String(a.numero || '').localeCompare(String(b.numero || ''), 'es', { numeric: true }));
  const selectedSheets = activeSheets.filter((sheet) => form.fichaIds.includes(sheet.id));

  const toggleSheet = (sheetId: string) => {
    setForm((current) => ({
      ...current,
      fichaIds: current.fichaIds.includes(sheetId) ?
         current.fichaIds.filter((id) => id !== sheetId)
        : [...current.fichaIds, sheetId],
    }));
  };

  const submitTrimesterDates = async () => {
    setSaving(true);
    setFeedback('');

    try {
      if (!dateForm.fechaInicio.trim()) {
        throw new Error('Falta la fecha de inicio.');
      }

      if (!dateForm.fechaFin.trim()) {
        throw new Error('Falta la fecha fin.');
      }

      await guardarTrimestre({
        ...dateForm,
        activo: true,
        estado: 'Activo',
      });
      setDateForm({ id: '', fechaInicio: '', fechaFin: '' });
      setFeedback('Fechas de trimestre creadas correctamente.');
    } catch (submitError: any) {
      setFeedback(submitError.message || 'No pudimos crear las fechas.');
    } finally {
      setSaving(false);
    }
  };

  const submitSheetTrimester = async () => {
    setSaving(true);
    setFeedback('');

    try {
      if (!selectedTrimester) {
        throw new Error('Selecciona una fecha de trimestre.');
      }

      if (!selectedSheets.length) {
        throw new Error('Selecciona una o varias fichas.');
      }

      if (!form.numero.trim()) {
        throw new Error('Falta el número de trimestre.');
      }

      if (!/^\d+$/.test(form.numero.trim())) {
        throw new Error('El número de trimestre solo debe contener números.');
      }

      const trimesterToAssign = {
        ...selectedTrimester,
        numero: Number(form.numero),
      };

      await Promise.all(selectedSheets.map((sheet) =>
        asignarTrimestreAFicha({ fichaId: sheet.id, trimestre: trimesterToAssign })
      ));
      setFeedback(`Trimestre ${form.numero} asignado a ${selectedSheets.length} ficha(s).`);
    } catch (submitError: any) {
      setFeedback(submitError?.message || 'No pudimos asignar el trimestre.');
    } finally {
      setSaving(false);
    }
  };

  const editSheetTrimester = (sheet: AcademicSheet) => {
    setForm({
      trimestreId: sheet.trimestreId || firstTrimesterId,
      numero: String(sheet.trimestreNumero || '').trim() || '1',
      fichaIds: [sheet.id],
    });
    setFeedback(`Editando trimestre de la ficha ${sheet.numero || sheet.id}.`);
  };

  const removeSheetTrimester = async (sheet: AcademicSheet) => {
    setSaving(true);
    setFeedback('');

    try {
      await quitarTrimestreDeFicha(sheet.id);
      setFeedback(`Trimestre retirado de la ficha ${sheet.numero || sheet.id}.`);
      setForm((current) => ({ ...current, fichaIds: current.fichaIds.filter((id) => id !== sheet.id) }));
    } catch (submitError: any) {
      setFeedback(submitError?.message || 'No pudimos quitar el trimestre de la ficha.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageTitle
        icon="calendar-sync-outline"
        subtitle="Crea fechas y luego asígnalas a una o varias fichas"
        title="Trimestres"
      />

      <Section title="Crear fechas de trimestre" subtitle="Primero registra el rango de fechas que luego usarás en las fichas">
        {error ? <FeedbackBox icon="alert-circle-outline" text={error} tone="error" /> : null}
        {feedback ? <FeedbackBox icon="check-circle-outline" text={feedback} tone="info" /> : null}

        <View style={styles.formCard}>
          <DateField label="Fecha inicio" value={dateForm.fechaInicio} onChange={(fechaInicio) => setDateForm((current) => ({ ...current, fechaInicio }))} />
          <DateField label="Fecha fin" value={dateForm.fechaFin} onChange={(fechaFin) => setDateForm((current) => ({ ...current, fechaFin }))} />
          <Pressable disabled={saving} onPress={submitTrimesterDates} style={[styles.formButton, saving && styles.smallButtonDisabled]}>
            {saving ? <ActivityIndicator color={palette.surface} /> : <Text style={styles.formButtonText}>Crear fechas</Text>}
          </Pressable>
        </View>
      </Section>

      <Section title="Asignar trimestre a fichas" subtitle="Selecciona una fecha creada, define el número y elige una o varias fichas">
        <View style={styles.formCard}>
          <AssignmentStep number="1" text="Selecciona una fecha creada" />
          <OptionPicker
            emptyLabel="Primero crea fechas de trimestre"
            options={activeTrimesters.map((trimester) => ({
              label: `${trimester.fechaInicio || 'Inicio pendiente'} a ${trimester.fechaFin || 'Fin pendiente'}`,
              value: trimester.id,
            }))}
            value={form.trimestreId}
            onChange={(trimestreId) => setForm((current) => ({ ...current, trimestreId }))}
          />

          <AssignmentStep number="2" text="Ingresa el número de trimestre" />
          <AdminField
            label="Número de trimestre"
            keyboardType="numeric"
            numericOnly
            value={form.numero}
            onInvalidInput={() => setFeedback('El número de trimestre solo debe contener números.')}
            onChangeText={(numero) => setForm((current) => ({ ...current, numero }))}
          />

          <AssignmentStep number="3" text="Busca y selecciona una o varias fichas" />
          <SearchField
            placeholder="Buscar ficha por número, programa o trimestre..."
            value={sheetSearch}
            onChangeText={setSheetSearch}
          />
          <View style={styles.multiSelectGrid}>
            {filteredSheets.length ? filteredSheets.map((sheet) => {
              const selected = form.fichaIds.includes(sheet.id);

              return (
                <Pressable
                  key={`assign-${sheet.id}`}
                  onPress={() => toggleSheet(sheet.id)}
                  style={[styles.multiSelectChip, selected && styles.multiSelectChipActive]}>
                  <Text style={[styles.multiSelectText, selected && styles.multiSelectTextActive]}>
                    Ficha {sheet.numero || sheet.id}
                  </Text>
                  <Text style={[styles.multiSelectMeta, selected && styles.multiSelectTextActive]}>
                    {sheet.programaNombre || 'Sin programa'} ?
                  </Text>
                </Pressable>
              );
            }) : <Text style={styles.optionEmptyText}>No hay fichas con esa búsqueda.</Text>}
          </View>

          <AssignmentSummary
            text={`${selectedSheets.length || 0} ficha(s) → Trimestre ${form.numero || 'pendiente'} (${selectedTrimester?.fechaInicio || 'inicio'} a ${selectedTrimester?.fechaFin || 'fin'})`}
          />
          <Pressable disabled={saving || !selectedTrimester || !selectedSheets.length} onPress={submitSheetTrimester} style={[styles.formButton, (saving || !selectedTrimester || !selectedSheets.length) && styles.smallButtonDisabled]}>
            {saving ? <ActivityIndicator color={palette.surface} /> : <Text style={styles.formButtonText}>Asignar trimestre a fichas</Text>}
          </Pressable>
        </View>
      </Section>

      <Section title="Fichas con trimestre" subtitle="Busca una ficha para editar o quitar la asignación de trimestre">
        <SearchField
          placeholder="Buscar ficha por número, programa o trimestre..."
          value={sheetSearch}
          onChangeText={setSheetSearch}
        />
        {loading ? <LoadingRow text="Cargando fichas..." /> : null}
        {filteredSheets.length ? filteredSheets.map((sheet, index) => (
          <TrimesterSheetCard
            key={`${sheet.id}-${sheet.numero || 'sin-numero'}-${sheet.trimestreNumero || 'sin-trimestre'}-${index}`}
            sheet={sheet}
            onEdit={() => editSheetTrimester(sheet)}
            onRemove={() => removeSheetTrimester(sheet)}
          />
        )) : <FeedbackBox icon="magnify-close" text="No encontramos fichas con esa búsqueda." tone="info" />}
      </Section>
    </>
  );
}
function ProfileTab({ onSignOut, session }: AdminWorkspaceProps) {
  const [name, setName] = useState(session.name);
  const [email, setEmail] = useState(session.email);
  const [photoUri, setPhotoUri] = useState(session.photoUrl || '');
  const [photoBase64, setPhotoBase64] = useState('');
  const [photoMimeType, setPhotoMimeType] = useState('image/jpeg');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    setName(session.name);
    setEmail(session.email);
    setPhotoUri(session.photoUrl || '');
  }, [session.email, session.name, session.photoUrl]);

  const pickProfilePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setFeedback('Necesitamos permiso para abrir tu galería y cambiar la foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.35,
      base64: true,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];

    if (!asset.base64) {
      setFeedback('No pudimos preparar la foto para guardarla. Intenta con otra imagen.');
      return;
    }

    setPhotoUri(asset.uri);
    setPhotoBase64(asset.base64);
    setPhotoMimeType(asset.mimeType || 'image/jpeg');
    setFeedback('Foto lista para guardarse en tu perfil.');
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setFeedback('Falta el nombre. Ingresa tu nombre antes de guardar el perfil.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setFeedback('Ingresa un correo válido antes de guardar el perfil.');
      return;
    }

    setSaving(true);
    setFeedback('');

    try {
      const updatedProfile = await actualizarPerfilUsuario({
        correo: email,
        nombre: name,
        fotoPerfilBase64: photoBase64 || undefined,
        fotoPerfilMimeType: photoBase64 ? photoMimeType : undefined,
      });
      setPhotoBase64('');
      if (updatedProfile?.fotoUrl) {
        setPhotoUri(updatedProfile.fotoUrl);
      }
      setFeedback('Perfil actualizado correctamente.');
    } catch (error) {
      const typedError = error as { message?: string };
      setFeedback(typedError?.message || 'No pudimos actualizar tu perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <View style={styles.adminProfileCard}>
        <Pressable onPress={pickProfilePhoto} style={styles.adminAvatarWrap}>
          <UserAvatar name={name} photoUrl={photoUri || session.photoUrl} size={100} />
          <View style={styles.changePhotoButton}>
            <Text style={styles.changePhotoText}>Cambiar foto</Text>
          </View>
        </Pressable>

        <View style={styles.adminForm}>
          <ProfileField label="Nombre" value={name} onChangeText={setName} />
          <ProfileField label="Correo" value={email} onChangeText={setEmail} />
          <ProfileField label="Rol" value={session.role} editable={false} />
        </View>

        <View style={styles.profileButtonRow}>
          <Pressable disabled={saving} style={[styles.saveProfileButton, saving && styles.smallButtonDisabled]} onPress={handleSaveProfile}>
            {saving ? (
              <ActivityIndicator color={palette.surface} />
            ) : (
              <Text style={styles.saveProfileText}>Guardar perfil</Text>
            )}
          </Pressable>
          <Pressable onPress={onSignOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Cerrar sesión</Text>
          </Pressable>
        </View>

        {feedback ? <Text style={styles.profileFeedbackText}>{feedback}</Text> : null}
      </View>
    </>
  );
}

function ProfileField({
  editable = true,
  label,
  muted = false,
  onChangeText,
  value,
}: {
  editable?: boolean;
  label: string;
  muted?: boolean;
  onChangeText?: (value: string) => void;
  value: string;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.profileFieldBlock}>
      <Text style={[styles.profileFieldLabel, isFocused && editable && { color: palette.primary }]}>
        {label}
      </Text>
      <TextInput
        editable={editable}
        onBlur={() => setIsFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        placeholderTextColor={palette.muted}
        style={[
          styles.profileInput,
          isFocused && editable && styles.profileInputActive,
          (!editable || muted) && styles.profileInputMuted,
        ]}
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
  const isEmpty = value === '0';

  return (
    <View style={[styles.metricCard, isEmpty ? styles.metricCardEmpty : { backgroundColor: `${accent}28` }]}>
      <View style={[styles.metricIcon, { backgroundColor: isEmpty ? '#E4E4E0' : accent }]}>
        <MaterialCommunityIcons name={icon} size={18} color={isEmpty ? palette.muted : palette.surface} />
      </View>
      <Text style={[styles.metricValue, isEmpty && styles.metricValueEmpty]}>{value}</Text>
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
    Académico: { accent: palette.yellowText, soft: palette.yellow },
    Trimestres: { accent: palette.greenText, soft: palette.greenSoft },
    Seguimiento: { accent: palette.salmonText, soft: palette.salmon },
  };
  const tone = toneByLabel[label] || { accent: palette.primary, soft: palette.soft };

  return (
    <Pressable onPress={onPress} style={[styles.quickAction, { backgroundColor: tone.soft }]}>
      <View style={[styles.quickIcon, { backgroundColor: tone.accent }]}>
        <MaterialCommunityIcons name={icon} size={18} color={palette.surface} />
      </View>
      <View style={styles.quickCopy}>
        <Text style={[styles.quickTitle, { color: tone.accent }]} numberOfLines={1}>{label}</Text>
        <Text style={styles.quickText} numberOfLines={2}>{text}</Text>
      </View>
    </Pressable>
  );
}

function UserRow({
  assigning,
  onDelete,
  onAssignRole,
  onSuspend,
  user,
}: {
  assigning: boolean;
  onDelete: () => void;
  onAssignRole: (uid: string, role: string) => void;
  onSuspend: () => void;
  user: AdminUser;
}) {
  const currentRole = String(user.rol || '').trim();
  const isPending = !currentRole;
  const [draftRole, setDraftRole] = useState(currentRole || roleOptions[0]);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const actionLabel = rolePickerOpen ? 'Aceptar' : isPending ? 'Seleccionar rol' : 'Editar';
  const accent = getRoleAccent(currentRole);

  return (
    <View style={styles.userCard}>
      <View style={styles.userMainRow}>
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
            onPress={() => {
              if (!rolePickerOpen) {
                setDraftRole(currentRole || roleOptions[0]);
                setRolePickerOpen(true);
                return;
              }
              onAssignRole(user.id, draftRole);
              setRolePickerOpen(false);
            }}
            style={[styles.smallButton, assigning && styles.smallButtonDisabled]}>
            {assigning ? (
              <ActivityIndicator color={palette.surface} size="small" />
            ) : (
              <Text style={styles.smallButtonText}>{actionLabel}</Text>
            )}
          </Pressable>
          <View style={styles.userRoundActions}>
            <Pressable accessibilityLabel="Suspender usuario" onPress={onSuspend} style={styles.iconButton}>
              <MaterialCommunityIcons name="account-minus-outline" size={18} color={palette.salmonText} />
            </Pressable>
            <Pressable accessibilityLabel="Eliminar usuario" onPress={onDelete} style={styles.iconButton}>
              <MaterialCommunityIcons name="account-remove-outline" size={18} color={palette.salmonText} />
            </Pressable>
          </View>
        </View>
      </View>
      {rolePickerOpen ? (
        <View style={styles.inlineRolePicker}>
          <OptionPicker
            emptyLabel="Selecciona rol"
            options={roleOptions.map((role) => ({ label: role, value: role }))}
            value={draftRole}
            onChange={setDraftRole}
          />
        </View>
      ) : null}
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
        <Text style={styles.cardMeta}>Esperando verificación de correo</Text>
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

function SearchField({
  onChangeText,
  placeholder,
  value,
}: {
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={styles.searchBox}>
      <MaterialCommunityIcons name="magnify" size={18} color={palette.muted} />
      <TextInput
        autoCapitalize="none"
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

function AcademicSectionNav({
  activeSection,
  onChange,
}: {
  activeSection: AcademicSectionId;
  onChange: (section: AcademicSectionId) => void;
}) {
  return (
    <View style={styles.tabBarWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBarContent}>
        {academicSectionOptions.map((section) => {
          const active = activeSection === section.id;

          return (
            <Pressable
              key={section.id}
              onPress={() => onChange(section.id)}
              style={styles.tabItem}>
              <View style={[styles.tabIconWrap, active && styles.tabIconWrapActive]}>
                <MaterialCommunityIcons
                  name={section.icon}
                  size={16}
                  color={active ? palette.surface : palette.academicInk}
                />
              </View>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {section.label}
              </Text>
              <View style={[styles.tabUnderline, active && styles.tabUnderlineActive]} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function TrimesterSheetCard({
  onEdit,
  onRemove,
  sheet,
}: {
  onEdit: () => void;
  onRemove: () => void;
  sheet: AcademicSheet;
}) {
  const hasTrimester = Boolean(sheet.trimestreNumero || sheet.trimestreActual);

  return (
    <View style={styles.trimesterCard}>
      <View style={styles.trimesterTop}>
        <View style={styles.trimesterTitleRow}>
          <View style={styles.sheetNumberBadge}>
            <Text style={styles.sheetNumberText}>{sheet.trimestreNumero || '?'}</Text>
          </View>
          <View style={styles.trimesterCopy}>
            <Text style={styles.sheetTitle}>Ficha {sheet.numero || sheet.id}</Text>
            <Text style={styles.sheetProgram}>{sheet.programaNombre || 'Sin programa'}</Text>
          </View>
        </View>
        <View style={styles.trimesterStatusWrap}>
          <StatusPill label={hasTrimester ? 'Asignado' : 'Sin asignar'} tone={hasTrimester ? 'success' : 'danger'} />
        </View>
      </View>

      <View style={styles.timeline}>
        <TimelineDot active label="Trimestre" value={sheet.trimestreActual || 'Pendiente'} />
        <TimelineDot active label="Inicio" value={sheet.trimestreFechaInicio || 'Pendiente'} />
        <TimelineDot label="Fin" value={sheet.trimestreFechaFin || 'Pendiente'} />
      </View>

      <View style={styles.timelineActions}>
        <Pressable onPress={onEdit} style={styles.ghostButton}>
          <MaterialCommunityIcons name="pencil-outline" size={16} color={palette.primary} />
          <Text style={styles.ghostButtonText}>{hasTrimester ? 'Editar' : 'Asignar'}</Text>
        </Pressable>
        {hasTrimester ? (
          <Pressable onPress={onRemove} style={styles.dangerButton}>
            <MaterialCommunityIcons name="calendar-remove-outline" size={16} color={palette.danger} />
            <Text style={styles.dangerButtonText}>Quitar</Text>
          </Pressable>
        ) : null}
      </View>
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
  onActivate,
  onDeactivate,
  onEdit,
  program,
}: {
  onActivate: () => void;
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
          <View style={styles.sheetTitleCopy}>
            <Text style={styles.sheetTitle}>{program.codigo || 'Programa'}</Text>
            <Text style={styles.sheetProgram}>{program.nombre || 'Sin nombre'}</Text>
            <Text style={styles.cardMeta}>{program.tipoFormacion || 'Tipo de formación pendiente'}</Text>
          </View>
        </View>
        <View style={styles.sheetStatusSlot}>
          <StatusPill label={inactive ? 'Inactivo' : 'Activo'} tone={inactive ? 'danger' : 'success'} />
        </View>
      </View>
      {demo ? (
        <Text style={styles.demoHint}>Dato demo: crea un programa para administrarlo.</Text>
      ) : (
        <View style={styles.textAlignedActions}>
          <Pressable onPress={onEdit} style={styles.ghostButton}>
            <MaterialCommunityIcons name="pencil-outline" size={16} color={palette.primary} />
            <Text style={styles.ghostButtonText}>Editar</Text>
          </Pressable>
          {inactive ? (
            <Pressable onPress={onActivate} style={styles.ghostButton}>
              <MaterialCommunityIcons name="check-circle-outline" size={16} color={palette.mintText} />
              <Text style={styles.ghostButtonText}>Activar</Text>
            </Pressable>
          ) : (
            <Pressable onPress={onDeactivate} style={styles.dangerButton}>
              <MaterialCommunityIcons name="cancel" size={16} color={palette.danger} />
              <Text style={styles.dangerButtonText}>Desactivar</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

function SheetCard({
  index,
  onActivate,
  onDeactivate,
  onEdit,
  sheet,
}: {
  index: number;
  onActivate: () => void;
  onDeactivate: () => void;
  onEdit: () => void;
  sheet: AcademicSheet;
}) {
  const inactive = sheet.estado === 'Inactiva';
  const demo = isDemoRecord(sheet.id);

  return (
    <View style={styles.sheetCardLoose}>
      <View style={styles.sheetHeader}>
        <View style={styles.sheetTitleRow}>
          <View style={styles.sheetNumberBadge}>
            <Text style={styles.sheetNumberText}>F{index + 1}</Text>
          </View>
          <View style={styles.sheetTitleCopy}>
            <Text style={styles.sheetTitle}>Ficha {sheet.numero || sheet.id}</Text>
            <Text style={styles.sheetProgram}>{sheet.programaNombre || 'Sin programa asociado'}</Text>
          </View>
        </View>
        <View style={styles.sheetStatusSlot}>
          <StatusPill label={inactive ? 'Inactiva' : 'Activa'} tone={inactive ? 'danger' : 'success'} />
        </View>
      </View>
      <View style={styles.assignmentBox}>
        <AssignmentLine icon="book-education-outline" label="Programa" value={sheet.programaNombre || 'Pendiente'} />
        <AssignmentLine icon="link-variant" label="Relación" value={`${sheet.programaNombre || 'Programa'} / Ficha ${sheet.numero || ''}`} />
        <AssignmentLine icon="calendar-check-outline" label="Trimestre" value={sheet.trimestreActual || 'Sin asignar'} />
      </View>
      {demo ? (
        <Text style={styles.demoHint}>Dato demo: crea una ficha real para administrarla.</Text>
      ) : (
        <View style={styles.textAlignedActions}>
          <Pressable onPress={onEdit} style={styles.ghostButton}>
            <MaterialCommunityIcons name="pencil-outline" size={16} color={palette.primary} />
            <Text style={styles.ghostButtonText}>Editar</Text>
          </Pressable>
          {inactive ? (
            <Pressable onPress={onActivate} style={styles.ghostButton}>
              <MaterialCommunityIcons name="check-circle-outline" size={16} color={palette.mintText} />
              <Text style={styles.ghostButtonText}>Activar</Text>
            </Pressable>
          ) : (
            <Pressable onPress={onDeactivate} style={styles.dangerButton}>
              <MaterialCommunityIcons name="cancel" size={16} color={palette.danger} />
              <Text style={styles.dangerButtonText}>Desactivar</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

function TrimesterCard({
  onActivate,
  onDeactivate,
  onEdit,
  trimester,
}: {
  onActivate: () => void;
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
            <Text style={styles.sheetTitle}>Trimestre {trimester.numero || '?'}</Text>
            <Text style={styles.sheetProgram}>Disponible para asignar a fichas</Text>
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
          {inactive ? (
            <Pressable onPress={onActivate} style={styles.ghostButton}>
              <MaterialCommunityIcons name="check-circle-outline" size={16} color={palette.mintText} />
              <Text style={styles.ghostButtonText}>Activar</Text>
            </Pressable>
          ) : (
            <Pressable onPress={onDeactivate} style={styles.dangerButton}>
              <MaterialCommunityIcons name="cancel" size={16} color={palette.danger} />
              <Text style={styles.dangerButtonText}>Desactivar</Text>
            </Pressable>
          )}
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
          Disponible para las fichas que lo necesiten
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

function SimpleAdminCard({
  inactive = false,
  onActivate,
  onDeactivate,
  onEdit,
  subtitle,
  title,
  variant = 'default',
}: {
  inactive?: boolean;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onEdit?: () => void;
  subtitle: string;
  title: string;
  variant?: 'default' | 'loose';
}) {
  return (
    <View style={[styles.sheetCard, variant === 'loose' && styles.sheetCardLoose]}>
      <View style={styles.sheetHeader}>
        <View style={styles.userCopy}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <Text style={styles.sheetProgram}>{subtitle}</Text>
        </View>
        {onActivate || onDeactivate ? <StatusPill label={inactive ? 'Inactivo' : 'Activo'} tone={inactive ? 'danger' : 'success'} /> : null}
      </View>
      {onActivate || onDeactivate || onEdit ? (
        <View style={styles.cardActions}>
          {onEdit ? (
            <Pressable onPress={onEdit} style={styles.ghostButton}>
              <MaterialCommunityIcons name="pencil-outline" size={16} color={palette.primary} />
              <Text style={styles.ghostButtonText}>Editar</Text>
            </Pressable>
          ) : null}
          {inactive && onActivate ? (
            <Pressable onPress={onActivate} style={styles.ghostButton}>
              <MaterialCommunityIcons name="check-circle-outline" size={16} color={palette.mintText} />
              <Text style={styles.ghostButtonText}>Activar</Text>
            </Pressable>
          ) : null}
          {!inactive && onDeactivate ? (
            <Pressable onPress={onDeactivate} style={styles.dangerButton}>
              <MaterialCommunityIcons name="cancel" size={16} color={palette.danger} />
              <Text style={styles.dangerButtonText}>Desactivar</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function ScrollableAdminList({
  children,
  emptyText,
  onSearchChange,
  placeholder,
  search,
}: {
  children: ReactNode;
  emptyText: string;
  onSearchChange: (value: string) => void;
  placeholder: string;
  search: string;
}) {
  const items = Children.toArray(children)
    .filter(Boolean)
    .map((child) =>
      typeof child === 'string' || typeof child === 'number'
        ? <Text style={styles.cardText}>{child}</Text>
        : child
    );

  return (
    <View style={styles.adminListBlock}>
      <SearchField placeholder={placeholder} value={search} onChangeText={onSearchChange} />
      {items.length ? (
        <ScrollView nestedScrollEnabled contentContainerStyle={styles.adminListContent} style={items.length > 3 ? styles.adminListScroll : undefined}>
          {items.map((item, index) => (
            <View key={`admin-list-item-${index}`}>
              <SafeNode node={item} />
            </View>
          ))}
        </ScrollView>
      ) : (
        <FeedbackBox icon="magnify-close" text={emptyText} tone="info" />
      )}
    </View>
  );
}

function RelationGroup({
  emptyText,
  items,
  onRemove,
  title,
}: {
  emptyText: string;
  items: AdminUser[];
  onRemove: (user: AdminUser) => void;
  title: string;
}) {
  const [query, setQuery] = useState('');
  const filteredItems = items.filter((user) =>
    `${user.nombre || ''} ${user.correo || ''} ${user.identificacion || ''}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <View style={styles.relationGroup}>
      <Text style={styles.relationGroupTitle}>{title}</Text>
      <SearchField
        placeholder={`Buscar en ${title.toLowerCase()}...`}
        value={query}
        onChangeText={setQuery}
      />
      {items.length ? (
        <ScrollView nestedScrollEnabled style={styles.relationScroll} contentContainerStyle={styles.relationScrollContent}>
          {filteredItems.length ? filteredItems.map((user) => (
            <View key={`${title}-${user.id}`} style={styles.relationRow}>
              <View style={styles.userCopy}>
                <Text style={styles.cardMeta}>{user.nombre || user.correo || user.id}</Text>
                <Text style={styles.cardText}>{user.correo || 'Sin correo'}</Text>
              </View>
              <Pressable onPress={() => onRemove(user)} style={styles.dangerButton}>
                <MaterialCommunityIcons name="link-variant-off" size={16} color={palette.danger} />
                <Text style={styles.dangerButtonText}>Quitar</Text>
              </Pressable>
            </View>
          )) : <Text style={styles.cardText}>No hay resultados para esa búsqueda.</Text>}
        </ScrollView>
      ) : <Text style={styles.cardText}>{emptyText}</Text>}
    </View>
  );
}

function AssignmentSummaryGroup({
  emptyText,
  rows,
}: {
  emptyText: string;
  rows: {
    id: string;
    competence: AcademicCompetence;
    instructor: AdminUser;
    raps: LearningResult[];
  }[];
}) {
  return (
    <View style={styles.relationGroup}>
      <Text style={styles.relationGroupTitle}>Competencias y RAP asignados</Text>
      {rows.length ? (
        <View style={styles.summaryAssignmentList}>
          {rows.map((row) => (
            <View key={`summary-assignment-${row.id}`} style={styles.summaryAssignmentCard}>
              <Text style={styles.cardMeta}>
                {row.competence.codigo ? `${row.competence.codigo} - ` : ''}{row.competence.nombre || 'Competencia sin nombre'}
              </Text>
              <Text style={styles.cardText}>
                Instructor: {row.instructor.nombre || row.instructor.correo || 'Sin instructor'}
              </Text>
              {row.raps?.length ? row.raps.map((rap) => (
                <Text key={`${row.id}-${rap.id}`} style={styles.summaryRapText}>
                  {rap.codigo ? `${rap.codigo}: ` : ''}{rap.descripcion || 'Resultado de aprendizaje'}
                </Text>
              )) : (
                <Text style={styles.cardText}>Sin RAP activo asociado.</Text>
              )}
            </View>
          ))}
        </View>
      ) : <Text style={styles.cardText}>{emptyText}</Text>}
    </View>
  );
}

function AssignmentStep({ number, text }: { number: string; text: string }) {
  return (
    <View style={styles.assignmentStep}>
      <Text style={styles.assignmentStepNumber}>{number}</Text>
      <Text style={styles.assignmentStepText}>{text}</Text>
    </View>
  );
}

function AssignmentSummary({ text }: { text: string }) {
  return (
    <View style={styles.assignmentSummary}>
      <MaterialCommunityIcons name="check-decagram-outline" size={18} color={palette.mintText} />
      <Text style={styles.assignmentSummaryText}>{text}</Text>
    </View>
  );
}
function AdminField({
  keyboardType = 'default',
  label,
  onChangeText,
  onInvalidInput,
  numericOnly = false,
  value,
}: {
  keyboardType?: 'default' | 'numeric';
  label: string;
  onChangeText: (value: string) => void;
  onInvalidInput?: () => void;
  numericOnly?: boolean;
  value: string;
}) {
  const handleChangeText = (nextValue: string) => {
    if (numericOnly && /[^0-9]/.test(nextValue)) {
      onInvalidInput?.();
      onChangeText(nextValue.replace(/\D/g, ''));
      return;
    }

    onChangeText(nextValue);
  };

  return (
    <View style={styles.adminField}>
      <Text style={styles.profileFieldLabel}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        onChangeText={handleChangeText}
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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const sortedOptions = useMemo(
    () => [...options].sort((a, b) => a.label.localeCompare(b.label, 'es', { numeric: true, sensitivity: 'base' })),
    [options]
  );
  const filteredOptions = sortedOptions.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase())
  );
  const selectedOption = options.find((option) => option.value === value);

  if (!options.length) {
    return <FeedbackBox icon="information-outline" text={emptyLabel} tone="info" />;
  }

  return (
    <View style={styles.optionSelect}>
      <Pressable onPress={() => setOpen((current) => !current)} style={styles.optionSelectButton}>
        <Text style={[styles.optionSelectText, !selectedOption && styles.optionSelectPlaceholder]}>
          {selectedOption?.label || 'Seleccionar opcion'}
        </Text>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={palette.primary} />
      </Pressable>

      {open ? (
        <View style={styles.optionDropdown}>
          <View style={styles.optionSearchBox}>
            <MaterialCommunityIcons name="magnify" size={17} color={palette.muted} />
            <TextInput
              autoCapitalize="none"
              placeholder="Buscar..."
              placeholderTextColor={palette.muted}
              style={styles.optionSearchInput}
              value={query}
              onChangeText={setQuery}
            />
          </View>

          {filteredOptions.length ? filteredOptions.map((option, index) => (
            <Pressable
              key={`${option.value}-${option.label}-${index}`}
              onPress={() => {
                onChange(option.value);
                setOpen(false);
                setQuery('');
              }}
              style={[styles.optionChip, value === option.value && styles.optionChipActive]}>
              {value === option.value ? (
                <MaterialCommunityIcons name="check-circle" size={16} color={palette.dark} />
              ) : null}
              <Text numberOfLines={1} style={[styles.optionChipText, value === option.value && styles.optionChipTextActive]}>
                {index + 1}. {option.label}
              </Text>
            </Pressable>
          )) : <Text style={styles.optionEmptyText}>No hay resultados para esa búsqueda.</Text>}
        </View>
      ) : null}
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
        <Text style={styles.pageLabel}>{title === 'Usuarios' ? 'GESTIÓN DE USUARIOS' : title === 'Académico' ? 'GESTIÓN ACADÉMICA' : 'GESTIÓN DE TRIMESTRES'}</Text>
        <Text style={styles.pageMainTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function Section({ children, subtitle, title }: { children: ReactNode; subtitle: string; title: string }) {
  const safeChildren = Children.toArray(children).map((child) =>
    typeof child === 'string' || typeof child === 'number'
      ? <Text style={styles.cardText}>{child}</Text>
      : child
  );

  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.stack}>
        {safeChildren.map((child, index) => (
          <View key={`section-child-${index}`}>
            <SafeNode node={child} />
          </View>
        ))}
      </View>
    </View>
  );
}

function SafeNode({ node }: { node: ReactNode }) {
  if (typeof node === 'string' || typeof node === 'number') {
    return <Text style={styles.cardText}>{node}</Text>;
  }

  return <>{node}</>;
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
    gap: 4,
    paddingHorizontal: 20,
  },
  headerCard: {
    backgroundColor: palette.background,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginHorizontal: -20,
    paddingBottom: 22,
    paddingHorizontal: 28,
    paddingTop: 20,
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
    borderColor: palette.border,
    borderRadius: 999,
    borderWidth: 1,
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
    gap: 10,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  metricCard: {
    backgroundColor: palette.surface,
    borderRadius: 16,
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
    backgroundColor: '#F8F6F1',
    gap: 16,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingVertical: 20,
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
    borderColor: palette.border,
    borderRadius: 16,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 72,
    padding: 12,
  },
  quickIcon: {
    alignItems: 'center',
    backgroundColor: palette.soft,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  quickCopy: {
    flex: 1,
    gap: 2,
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
  adminNewsList: {
    gap: 10,
  },
  adminNewsCard: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  adminNewsIcon: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  adminNewsCopy: {
    flex: 1,
    gap: 3,
  },
  adminNewsTitle: {
    color: palette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
    lineHeight: 17,
  },
  adminNewsText: {
    color: palette.muted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 15,
  },
  adminNewsValueWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  adminNewsValue: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 18,
    lineHeight: 22,
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
    borderRadius: 16,
    borderWidth: 1,
    flexBasis: '31%',
    flexGrow: 1,
    gap: 6,
    minHeight: 72,
    padding: 12,
  },
  flowCardEmpty: {
    backgroundColor: '#FAFAF8',
    borderColor: '#EDEDE9',
  },
  flowNumberEmpty: {
    color: palette.muted,
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
    backgroundColor: '#EEE8DC',
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
    borderRadius: 16,
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
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  userMainRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
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
    gap: 12,
    width: 116,
  },
  inlineRolePicker: {
    backgroundColor: palette.soft,
    borderRadius: 14,
    padding: 4,
    width: '100%',
  },
  userRoundActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
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
    paddingVertical: 5,
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
    justifyContent: 'center',
    minHeight: 34,
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  smallButtonDisabled: {
    opacity: 0.72,
  },
  smallButtonText: {
    color: palette.surface,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: palette.salmon,
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  permissionRow: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
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
    borderRadius: 18,
    gap: 13,
    marginHorizontal: 12,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  sheetCardLoose: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    elevation: 1,
    gap: 14,
    marginHorizontal: 12,
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
  },
  summaryCard: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sheetHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  sheetTitleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 13,
    minWidth: 0,
  },
  sheetTitleCopy: {
    flex: 1,
    minWidth: 0,
  },
  sheetStatusSlot: {
    alignItems: 'flex-end',
    flexShrink: 0,
    maxWidth: 88,
  },
  sheetNumberBadge: {
    alignItems: 'center',
    backgroundColor: palette.soft,
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 40,
  },
  sheetNumberText: {
    color: palette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
    lineHeight: 18,
    maxWidth: 40,
  },
  sheetTitle: {
    color: palette.dark,
    flexShrink: 1,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 15,
    lineHeight: 20,
    maxWidth: '100%',
  },
  sheetProgram: {
    color: '#9FB3A0',
    flexShrink: 1,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 17,
    maxWidth: '100%',
  },
  sheetStats: {
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 49,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
  },
  miniStat: {
    alignItems: 'center',
    backgroundColor: palette.soft,
    borderRadius: 14,
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minHeight: 58,
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  miniStatValue: {
    color: palette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 16,
    lineHeight: 18,
    textAlign: 'center',
  },
  miniStatLabel: {
    color: palette.muted,
    fontFamily: 'PoppinsMedium',
    fontSize: 9,
    lineHeight: 12,
    textAlign: 'center',
  },
  textAlignedActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingLeft: 53,
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
    borderColor: palette.border,
    borderRadius: 16,
    borderWidth: 1,
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
    borderRadius: 18,
    gap: 12,
    marginHorizontal: -20,
    padding: 28,
  },
  formHint: {
    color: palette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  rapFormHeader: {
    borderLeftColor: palette.primary,
    borderLeftWidth: 3,
    gap: 2,
    marginBottom: 2,
    paddingLeft: 12,
    paddingVertical: 2,
  },
  rapFormEyebrow: {
    color: palette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  rapFormTitle: {
    color: palette.dark,
    fontFamily: 'SulphurPointBold',
    fontSize: 27,
    lineHeight: 28,
  },
  assignmentStep: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  assignmentStepNumber: {
    backgroundColor: palette.primary,
    borderRadius: 999,
    color: palette.surface,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 10,
    minWidth: 24,
    paddingHorizontal: 7,
    paddingVertical: 4,
    textAlign: 'center',
  },
  assignmentStepText: {
    color: palette.dark,
    flex: 1,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  assignmentSummary: {
    alignItems: 'center',
    backgroundColor: palette.mint,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    padding: 11,
  },
  assignmentSummaryText: {
    color: palette.mintText,
    flex: 1,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 10,
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
  optionSelect: {
    gap: 8,
  },
  optionSelectButton: {
    alignItems: 'center',
    backgroundColor: palette.soft,
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  optionSelectText: {
    color: palette.ink,
    flex: 1,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  optionSelectPlaceholder: {
    color: palette.muted,
    fontFamily: 'PoppinsRegular',
  },
  optionDropdown: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    maxHeight: 320,
    padding: 10,
  },
  optionSearchBox: {
    alignItems: 'center',
    backgroundColor: palette.soft,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionSearchInput: {
    color: palette.ink,
    flex: 1,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    padding: 0,
  },
  optionEmptyText: {
    color: palette.muted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 17,
    padding: 8,
  },
  multiSelectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  multiSelectChip: {
    backgroundColor: palette.soft,
    borderColor: palette.border,
    borderRadius: 16,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    gap: 3,
    minHeight: 58,
    padding: 12,
  },
  multiSelectChipActive: {
    backgroundColor: palette.greenSoft,
    borderColor: palette.greenText,
  },
  multiSelectText: {
    color: palette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  multiSelectMeta: {
    color: palette.muted,
    fontFamily: 'PoppinsRegular',
    fontSize: 10,
    lineHeight: 14,
  },
  multiSelectTextActive: {
    color: palette.greenText,
  },
  optionChip: {
    alignItems: 'center',
    backgroundColor: palette.soft,
    borderColor: palette.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionChipActive: {
    backgroundColor: palette.surface,
    borderColor: palette.primary,
  },
  optionChipText: {
    color: palette.ink,
    flex: 1,
    fontFamily: 'PoppinsMedium',
    fontSize: 11,
    lineHeight: 15,
  },
  optionChipTextActive: {
    color: palette.dark,
    fontFamily: 'PoppinsSemiBold',
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    color: palette.ink,
    flex: 1,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    padding: 0,
  },
  sectionNavGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionNavChip: {
    alignItems: 'center',
    backgroundColor: palette.soft,
    borderColor: palette.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionNavChipActive: {
    backgroundColor: palette.greenSoft,
    borderColor: palette.green,
  },
  sectionNavIcon: {
    alignItems: 'center',
    backgroundColor: '#EEF8E9',
    borderRadius: 999,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  sectionNavIconActive: {
    backgroundColor: palette.green,
  },
  sectionNavText: {
    color: palette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  sectionNavTextActive: {
    color: palette.greenText,
  },
  sectionNavNumber: {
    color: palette.greenText,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  relationGroup: {
    backgroundColor: '#F8F6F1',
    borderRadius: 14,
    gap: 8,
    padding: 12,
  },
  relationGroupTitle: {
    color: palette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  adminListBlock: {
    gap: 10,
  },
  adminListScroll: {
    maxHeight: 420,
  },
  adminListContent: {
    gap: 12,
    paddingBottom: 2,
  },
  relationScroll: {
    maxHeight: 220,
  },
  relationScrollContent: {
    gap: 8,
    paddingBottom: 2,
  },
  relationRow: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    padding: 10,
  },
  summaryAssignmentList: {
    gap: 8,
  },
  summaryAssignmentCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
    padding: 10,
  },
  summaryRapText: {
    color: palette.ink,
    fontFamily: 'PoppinsRegular',
    fontSize: 10,
    lineHeight: 15,
  },
  statusPill: {
    borderRadius: 999,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 10,
    lineHeight: 13,
    maxWidth: 86,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    textAlign: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ghostButton: {
    alignItems: 'center',
    backgroundColor: palette.soft,
    borderRadius: 16,
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
    borderRadius: 16,
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
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  actionRow: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
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
    borderRadius: 18,
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  trimesterTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  trimesterTitleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 13,
    minWidth: 0,
  },
  trimesterCopy: {
    flex: 1,
    minWidth: 0,
  },
  trimesterStatusWrap: {
    alignItems: 'flex-end',
    flexShrink: 0,
    maxWidth: 104,
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
    flexWrap: 'wrap',
    gap: 9,
    paddingLeft: 49,
  },
  timelineActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingLeft: 49,
  },
  timelineItem: {
    alignItems: 'center',
    backgroundColor: palette.soft,
    borderRadius: 999,
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 92,
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
    textAlign: 'center',
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 20,
  },
  adminProfileCard: {
    backgroundColor: palette.surface,
    elevation: 3,
    gap: 8,
    marginHorizontal: -30,
    paddingHorizontal: 40,
    paddingTop: 30,
    paddingVertical: 20,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  profileShell: {
    backgroundColor: palette.surface,
    gap: 8,
    marginHorizontal: -30,
    paddingHorizontal: 40,
    paddingTop: 30,
    paddingVertical: 20,
  },
  profileTopBand: {
    backgroundColor: '#EEE8DC',
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
    backgroundColor: '#F5F3EE',
    height: 128,
  },
  adminAvatarWrap: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: 10,
  },
  changePhotoButton: {
    backgroundColor: palette.soft,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  changePhotoText: {
    color: palette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  adminForm: {
    gap: 10,
    maxWidth: 420,
    width: '100%',
  },
  profileFieldBlock: {
    gap: 6,
  },
  profileFieldLabel: {
    color: palette.ink,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  profileInput: {
    backgroundColor: '#fbfbfb',
    borderColor: '#d2d2d2',
    borderRadius: 100,
    borderWidth: 1,
    color: palette.ink,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  profileInputActive: {
    backgroundColor: palette.surface,
    borderColor: palette.primary,
    shadowColor: palette.primary,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  profileInputMuted: {
    backgroundColor: '#ececec',
    color: palette.muted,
  },
  profileButtonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginTop: 10,
  },
  saveProfileButton: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: 999,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  saveProfileText: {
    color: palette.surface,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  profileFeedbackText: {
    color: palette.primary,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  adminProfileInfoCard: {
    backgroundColor: palette.soft,
    borderColor: palette.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
    marginTop: 8,
    padding: 14,
    width: '100%',
  },
  fichasTitle: {
    color: palette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  fichaItem: {
    color: palette.ink,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 17,
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
    justifyContent: 'center',
    paddingHorizontal: 16,
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
  academicHeader: {
    backgroundColor: palette.surface,
    gap: 6,
    marginHorizontal: -20,
    paddingHorizontal: 28,
    paddingTop: 30,
    paddingBottom: 18,
  },
  academicEyebrow: {
    color: palette.primary,
    fontFamily: 'PoppinsMedium',
    fontSize: 10,
    letterSpacing: 1.4,
  },
  academicTitle: {
    color: palette.academicInk,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 30,
    lineHeight: 34,
  },
  academicSubtitle: {
    color: palette.muted,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    lineHeight: 19,
  },
  tabBarWrap: {
    backgroundColor: palette.surface,
    marginHorizontal: -20,
    marginTop: -3,
    paddingTop: 4,
  },
  tabBarContent: {
    gap: 18,
    paddingHorizontal: 28,
    paddingTop: 2,
  },
  tabItem: {
    alignItems: 'center',
    gap: 6,
    paddingBottom: 12,
    paddingTop: 6,
    width: 84,
  },
  tabIconWrap: {
    alignItems: 'center',
    backgroundColor: palette.academicChipBg,
    borderRadius: 999,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  tabIconWrapActive: {
    backgroundColor: palette.primary,
  },
  tabLabel: {
    color: palette.muted,
    fontFamily: 'PoppinsMedium',
    fontSize: 11,
    lineHeight: 14,
    height: 28,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: palette.academicInk,
    fontFamily: 'PoppinsSemiBold',
  },
  tabUnderline: {
    backgroundColor: 'transparent',
    borderRadius: 2,
    height: 1,
    width: 24,
  },
  tabUnderlineActive: {
    backgroundColor: `${palette.primary}3D`,
  },
  metricCardEmpty: {
    backgroundColor: '#EFEFEC',
  },
  metricValueEmpty: {
    color: palette.muted,
  },
});
