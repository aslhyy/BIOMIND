import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  asignarAprendizAFicha,
  cambiarEstadoProyecto,
  eliminarGrupoTrabajo,
  eliminarProyectoAcademico,
  escucharContextoAcademicoUsuario,
  escucharGruposTrabajo,
  escucharProyectos,
  escucharTrimestres,
  guardarGrupoTrabajo,
  guardarProyectoAcademico,
  quitarIntegranteGrupo,
  rechazarSolicitudFicha,
} from '@/services/academic';
import type { AuthenticatedSession } from '@/features/workspace/types';
import { instructorPalette } from '../theme';
import { IconLabel, ProgressBar, SectionHeading, StatusBadge } from './InstructorUI';
import { BitacorasReviewPanel } from '@/features/workspace/components/BitacorasReviewPanel';
import { ImagePreviewModal } from '@/features/workspace/components/ImagePreviewModal';
// @ts-ignore
import { escucharBitacoras } from '@/services/bitacoras';
// @ts-ignore
import {
  eliminarTareaPasante,
  escucharTareasPasantePorInstructor,
  guardarTareaPasante,
  guardarObservacionInstructorTarea,
  validarTareaPasante,
} from '@/services/pasanteTasks';

type AcademicSheet = {
  id: string;
  numero?: string;
  programaNombre?: string;
};

type AcademicUser = {
  id: string;
  nombre?: string;
  correo?: string;
  fichaId?: string | null;
  fichaSolicitudId?: string;
  fichaSolicitudNumero?: string;
  fichasAsignadas?: string[];
  instructorUid?: string;
};

type AcademicSection = 'altas' | 'crear-proyectos' | 'ver-proyectos' | 'crear-grupos' | 'ver-grupos' | 'crear-tareas' | 'ver-tareas';

type AcademicCompetence = {
  id: string;
  codigo?: string;
  nombre?: string;
};

type AcademicRap = {
  id: string;
  competenciaId?: string;
  codigo?: string;
  descripcion?: string;
};

type CompetenceAssignment = {
  id: string;
  fichaId?: string;
  instructorUid?: string;
  competenciaId?: string;
  resultadoId?: string;
  resultadoIds?: string[];
  activo?: boolean;
  estado?: string;
};

type WorkGroup = {
  id: string;
  nombre?: string;
  fichaId?: string;
  fichaNumero?: string;
  instructorUid?: string;
  aprendizIds?: string[];
  estado?: string;
};

type AcademicProject = {
  id: string;
  titulo?: string;
  descripcion?: string;
  fichaId?: string;
  fichaNumero?: string;
  competenciaId?: string;
  competenciaNombre?: string;
  rapId?: string;
  rapDescripcion?: string;
  instructorUid?: string;
  asignacionTipo?: 'aprendices' | 'grupo';
  aprendizIds?: string[];
  grupoId?: string | null;
  archivoNombre?: string | null;
  archivoUri?: string | null;
  archivoMimeType?: string | null;
  archivos?: ProjectAttachment[];
  estado?: 'Pendiente' | 'En proceso' | 'Aprobado' | 'Desaprobado';
  progreso?: number;
  bitacorasEsperadas?: number;
};

type ProjectAttachment = {
  nombre: string;
  uri: string;
  url?: string;
  mimeType: string;
  ruta?: string;
};

type Trimester = {
  id: string;
  fichaId?: string;
  fichaNumero?: string;
  fechaFin?: string;
  estado?: string;
};

type AcademicBitacora = {
  id: string;
  aprendizUid?: string;
  aprendizNombre?: string;
  proyectoId?: string;
  proyectoTitulo?: string;
  fichaId?: string;
  descripcion?: string;
  fecha?: string;
  avance?: string;
  dificultades?: string;
  evidencias?: {
    nombre?: string;
    mimeType?: string;
    base64?: string;
    url?: string;
  }[];
  archivoNombre?: string;
  archivoUrl?: string;
  estado?: string;
  observacion?: string;
  revisadoPorUid?: string;
  revisadoPorNombre?: string;
  revisadoPorRol?: string;
};

type PasanteTaskRecord = {
  id: string;
  titulo?: string;
  descripcion?: string;
  archivos?: ProjectAttachment[];
  archivosPasante?: ProjectAttachment[];
  observaciones?: TaskObservation[];
  fichaId?: string;
  fichaNumero?: string;
  proyectoId?: string;
  proyectoTitulo?: string;
  pasanteUid?: string;
  pasanteNombre?: string;
  instructorUid?: string;
  instructorNombre?: string;
  observacionInstructor?: string;
  observacionPasante?: string;
  estado?: 'Pendiente' | 'Hecho' | 'Validada';
  validadaPorInstructor?: boolean;
};

type TaskObservation = { id?: string; autorNombre?: string; autorRol?: string; texto?: string; creadoEn?: any };

type ProjectState = 'Pendiente' | 'En proceso' | 'Aprobado' | 'Desaprobado';

function getMillis(value: any) {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  return 0;
}

type ProjectForm = {
  id: string;
  titulo: string;
  descripcion: string;
  fichaId: string;
  competenciaId: string;
  rapId: string;
  asignacionTipo: 'aprendices' | 'grupo';
  aprendizIds: string[];
  grupoId: string;
  archivoNombre: string;
  archivoUri: string;
  archivoMimeType: string;
  archivos: ProjectAttachment[];
  bitacorasEsperadas: string;
};

type GroupForm = {
  id: string;
  nombre: string;
  fichaId: string;
  aprendizIds: string[];
};

const emptyProjectForm: ProjectForm = {
  id: '',
  titulo: '',
  descripcion: '',
  fichaId: '',
  competenciaId: '',
  rapId: '',
  asignacionTipo: 'aprendices',
  aprendizIds: [],
  grupoId: '',
  archivoNombre: '',
  archivoUri: '',
  archivoMimeType: '',
  archivos: [],
  bitacorasEsperadas: '',
};

const emptyGroupForm: GroupForm = {
  id: '',
  nombre: '',
  fichaId: '',
  aprendizIds: [],
};

const emptyTaskForm = {
  id: '',
  titulo: '',
  descripcion: '',
  archivos: [] as ProjectAttachment[],
  fichaId: '',
  proyectoId: '',
  pasanteUid: '',
  observacionInstructor: '',
};

export function InstructorProjectsTab({ focus, session }: { focus?: { projectId?: string; bitacoraId?: string }; session: AuthenticatedSession }) {
  const [sheets, setSheets] = useState<AcademicSheet[]>([]);
  const [learners, setLearners] = useState<AcademicUser[]>([]);
  const [sheetRequests, setSheetRequests] = useState<AcademicUser[]>([]);
  const [pasantes, setPasantes] = useState<AcademicUser[]>([]);
  const [competences, setCompetences] = useState<AcademicCompetence[]>([]);
  const [raps, setRaps] = useState<AcademicRap[]>([]);
  const [competenceAssignments, setCompetenceAssignments] = useState<CompetenceAssignment[]>([]);
  const [projects, setProjects] = useState<AcademicProject[]>([]);
  const [groups, setGroups] = useState<WorkGroup[]>([]);
  const [trimesters, setTrimesters] = useState<Trimester[]>([]);
  const [bitacoras, setBitacoras] = useState<AcademicBitacora[]>([]);
  const [pasanteTasks, setPasanteTasks] = useState<PasanteTaskRecord[]>([]);
  const [projectForm, setProjectForm] = useState<ProjectForm>(emptyProjectForm);
  const [groupForm, setGroupForm] = useState<GroupForm>(emptyGroupForm);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedListSheetId, setSelectedListSheetId] = useState('');
  const [selectedLearnerId, setSelectedLearnerId] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [groupsVisible, setGroupsVisible] = useState(false);
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<AcademicSection>('ver-proyectos');
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribeContext = escucharContextoAcademicoUsuario(
      session,
      (context: any) => {
        setSheets(context.fichas || []);
        setLearners(context.aprendices || []);
        setSheetRequests(context.solicitudesFicha || []);
        setPasantes(context.pasantes || []);
        setCompetences(context.competencias || []);
        setRaps(context.resultados || []);
        setCompetenceAssignments(context.asignaciones || []);
      },
      (contextError: any) => setError(contextError?.message || 'No pudimos cargar el contexto academico.')
    );
    const unsubscribeProjects = escucharProyectos(
      (items: AcademicProject[]) => setProjects(items.filter((project) => project.instructorUid === session.uid)),
      (projectsError: any) => setError(projectsError?.message || 'No pudimos cargar proyectos.')
    );
    const unsubscribeGroups = escucharGruposTrabajo(
      (items: WorkGroup[]) => setGroups(items.filter((group) => group.instructorUid === session.uid && group.estado !== 'Inactivo')),
      (groupsError: any) => setError(groupsError?.message || 'No pudimos cargar grupos.')
    );
    const unsubscribeTrimesters = escucharTrimestres(
      setTrimesters,
      (trimestersError: any) => setError(trimestersError?.message || 'No pudimos cargar trimestres.')
    );
    const unsubscribeBitacoras = escucharBitacoras(
      setBitacoras,
      (bitacorasError: any) => setError(bitacorasError?.message || 'No pudimos cargar las bitácoras.')
    );
    const unsubscribeTasks = escucharTareasPasantePorInstructor(
      session.uid,
      setPasanteTasks,
      (tasksError: any) => setError(tasksError.message || 'No pudimos cargar las tareas de pasantes.')
    );

    return () => {
      unsubscribeContext?.();
      unsubscribeProjects?.();
      unsubscribeGroups?.();
      unsubscribeTrimesters?.();
      unsubscribeBitacoras?.();
      unsubscribeTasks?.();
    };
  }, [session]);

  useEffect(() => {
    setProjectForm((current) => ({
      ...current,
      fichaId: current.fichaId || sheets[0]?.id || '',
    }));
    setGroupForm((current) => ({
      ...current,
      fichaId: current.fichaId || sheets[0]?.id || '',
    }));
    setSelectedListSheetId((current) => current || sheets[0]?.id || '');
    setTaskForm((current) => ({
      ...current,
      pasanteUid: current.pasanteUid || pasantes[0]?.id || '',
    }));
  }, [pasantes, sheets]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || projects[0],
    [projects, selectedProjectId]
  );
  const selectedProjectFicha = useMemo(
    () => sheets.find((sheet) => sheet.id === projectForm.fichaId),
    [projectForm.fichaId, sheets]
  );
  const projectSheetAssignments = useMemo(
    () => competenceAssignments.filter((assignment) =>
      assignment.fichaId === projectForm.fichaId
      && assignment.instructorUid === session.uid
      && assignment.activo !== false
      && assignment.estado !== 'Inactiva'
    ),
    [competenceAssignments, projectForm.fichaId, session.uid]
  );
  const availableProjectCompetences = useMemo(() => {
    const assignedCompetenceIds = new Set(projectSheetAssignments.map((assignment) => assignment.competenciaId).filter(Boolean));
    return competences.filter((competence) => assignedCompetenceIds.has(competence.id));
  }, [competences, projectSheetAssignments]);
  const availableRapIdsForProject = useMemo(() => {
    const ids = new Set<string>();
    projectSheetAssignments
      .filter((assignment) => assignment.competenciaId === projectForm.competenciaId)
      .forEach((assignment) => {
        if (assignment.resultadoId) ids.add(assignment.resultadoId);
        (assignment.resultadoIds || []).forEach((id) => ids.add(id));
      });
    return ids;
  }, [projectForm.competenciaId, projectSheetAssignments]);
  const selectedProjectCompetence = useMemo(
    () => availableProjectCompetences.find((competence) => competence.id === projectForm.competenciaId),
    [availableProjectCompetences, projectForm.competenciaId]
  );
  const selectedProjectRap = useMemo(
    () => raps.find((rap) => rap.id === projectForm.rapId),
    [projectForm.rapId, raps]
  );
  const selectedGroupFicha = useMemo(
    () => sheets.find((sheet) => sheet.id === groupForm.fichaId),
    [groupForm.fichaId, sheets]
  );
  const learnersForProjectSheet = useMemo(
    () => learners.filter((learner) => learner.fichaId === projectForm.fichaId),
    [learners, projectForm.fichaId]
  );
  const learnersForGroupSheet = useMemo(
    () => learners.filter((learner) => learner.fichaId === groupForm.fichaId),
    [groupForm.fichaId, learners]
  );
  const rapsForCompetence = useMemo(
    () => raps.filter((rap) => rap.competenciaId === projectForm.competenciaId && availableRapIdsForProject.has(rap.id)),
    [availableRapIdsForProject, projectForm.competenciaId, raps]
  );
  const groupsForProjectSheet = useMemo(
    () => groups.filter((group) => group.fichaId === projectForm.fichaId),
    [groups, projectForm.fichaId]
  );
  const selectedListSheet = useMemo(
    () => sheets.find((sheet) => sheet.id === selectedListSheetId),
    [selectedListSheetId, sheets]
  );
  const filteredProjects = useMemo(
    () => {
      const normalizedSearch = projectSearch.trim().toLowerCase();
      return projects
        .filter((project) => project.fichaId === selectedListSheetId)
        .filter((project) =>
          `${project.titulo || ''} ${project.competenciaNombre || ''} ${project.rapDescripcion || ''} ${project.estado || ''}`
            .toLowerCase()
            .includes(normalizedSearch)
        );
    },
    [projects, projectSearch, selectedListSheetId]
  );
  const filteredGroups = useMemo(
    () => groups.filter((group) => group.fichaId === selectedListSheetId),
    [groups, selectedListSheetId]
  );
  const taskProjectsForSheet = useMemo(
    () => projects.filter((project) => !taskForm.fichaId || project.fichaId === taskForm.fichaId),
    [projects, taskForm.fichaId]
  );
  const visibleProjects = useMemo(() => filteredProjects.slice(0, 8), [filteredProjects]);
  const visibleGroups = useMemo(() => filteredGroups.slice(0, 6), [filteredGroups]);
  const selectedTrackingProject = useMemo(
    () => filteredProjects.find((project) => project.id === selectedProjectId) || filteredProjects[0],
    [filteredProjects, selectedProjectId]
  );
  const selectedProjectGroup = useMemo(
    () => groups.find((group) => group.id === selectedTrackingProject?.grupoId),
    [groups, selectedTrackingProject?.grupoId]
  );
  const learnerIdsForSelectedProject = useMemo(() => {
    if (!selectedTrackingProject) {
      return new Set<string>();
    }

    const learnerIds = new Set(
      selectedTrackingProject.asignacionTipo === 'grupo'
        ? selectedProjectGroup?.aprendizIds || []
        : selectedTrackingProject.aprendizIds || []
    );
    bitacoras
      .filter((bitacora) => bitacora.proyectoId === selectedTrackingProject.id)
      .forEach((bitacora) => {
        if (bitacora.aprendizUid) learnerIds.add(bitacora.aprendizUid);
      });
    return learnerIds;
  }, [bitacoras, selectedProjectGroup?.aprendizIds, selectedTrackingProject]);
  const trackingLearners = useMemo(
    () => learners.filter((learner) =>
      learnerIdsForSelectedProject.has(learner.id)
      && (!selectedTrackingProject?.fichaId || learner.fichaId === selectedTrackingProject.fichaId)
    ),
    [learnerIdsForSelectedProject, learners, selectedTrackingProject?.fichaId]
  );
  const selectedProjectGroupMemberNames = useMemo(
    () => trackingLearners.map((learner) => learner.nombre || learner.correo || 'Integrante'),
    [trackingLearners]
  );
  const allProjectBitacoras = useMemo(
    () => selectedTrackingProject ? bitacoras.filter((bitacora) =>
      bitacora.proyectoId === selectedTrackingProject.id
      && (!selectedTrackingProject.fichaId || !bitacora.fichaId || bitacora.fichaId === selectedTrackingProject.fichaId)
    ) : [],
    [bitacoras, selectedTrackingProject?.fichaId, selectedTrackingProject?.id]
  );
  const projectBitacoras = useMemo(
    () => allProjectBitacoras.filter((bitacora) =>
      !selectedLearnerId || bitacora.aprendizUid === selectedLearnerId
    ),
    [allProjectBitacoras, selectedLearnerId]
  );
  const reviewedCount = allProjectBitacoras.filter((bitacora) =>
    ['Aprobada', 'Rechazada', 'Correccion'].includes(bitacora.estado || '')
  ).length;
  const approvedCount = allProjectBitacoras.filter((bitacora) => bitacora.estado === 'Aprobada').length;
  const reviewProgress = allProjectBitacoras.length
    ? Math.round((reviewedCount / allProjectBitacoras.length) * 100)
    : 0;
  const approvalProgress = allProjectBitacoras.length
    ? Math.round((approvedCount / allProjectBitacoras.length) * 100)
    : 0;
  const selectedSheetAutomaticState = useMemo(() => {
      const activeTrimester = trimesters.find((trimester) =>
        trimester.estado !== 'Inactivo'
      && (trimester.fichaId === selectedListSheetId || trimester.fichaNumero === selectedListSheet?.numero)
      && isWithinLastWeek(trimester.fechaFin || '')
    );
    const allSheetProjectsApproved = filteredProjects.length > 0
      && filteredProjects.every((project) => project.estado === 'Aprobado');

    return activeTrimester && allSheetProjectsApproved ? 'Aprobado' : 'Pendiente';
  }, [filteredProjects, selectedListSheet?.numero, selectedListSheetId, trimesters]);

  useEffect(() => {
    setProjectForm((current) => {
      const competenceBelongsToSheet = availableProjectCompetences.some((competence) => competence.id === current.competenciaId);
      const nextCompetenceId = availableProjectCompetences[0]?.id || '';

      if (competenceBelongsToSheet || current.competenciaId === nextCompetenceId) {
        return current;
      }

      return { ...current, competenciaId: nextCompetenceId, rapId: '' };
    });
  }, [availableProjectCompetences]);

  useEffect(() => {
    setProjectForm((current) => {
      const rapBelongsToCompetence = rapsForCompetence.some((rap) => rap.id === current.rapId);
      const nextRapId = rapsForCompetence[0]?.id || '';

      if (rapBelongsToCompetence || current.rapId === nextRapId) {
        return current;
      }

      return { ...current, rapId: nextRapId };
    });
  }, [projectForm.competenciaId, rapsForCompetence]);

  useEffect(() => {
    if (!filteredProjects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(filteredProjects[0]?.id || '');
    }
    setSelectedLearnerId('');
  }, [filteredProjects, selectedListSheetId, selectedProjectId]);

  useEffect(() => {
    if (!focus?.projectId || !projects.length) return;
    const project = projects.find((item) => item.id === focus.projectId);
    if (!project) return;
    setSelectedListSheetId(project.fichaId || '');
    setSelectedProjectId(project.id);
    setActiveSection('ver-proyectos');
    setProjectFormOpen(false);
  }, [focus?.bitacoraId, focus?.projectId, projects]);

  const runAction = async (action: () => Promise<void>, successMessage: string) => {
    setSaving(true);
    setFeedback('');
    setError('');

    try {
      await action();
      setFeedback(successMessage);
    } catch (actionError: any) {
      setFeedback(actionError.message || 'No pudimos completar la accion.');
    } finally {
      setSaving(false);
    }
  };

  const saveProject = () => runAction(async () => {
    if (!selectedProjectFicha || !selectedProjectCompetence || !selectedProjectRap) {
      throw new Error('Selecciona una ficha con competencia y RAP asignados a tu usuario.');
    }

    const automaticLearnerIds = learnersForProjectSheet.map((learner) => learner.id);

    await guardarProyectoAcademico({
      ...projectForm,
      instructorUid: session.uid,
      fichaNumero: selectedProjectFicha?.numero || '',
      competenciaNombre: selectedProjectCompetence.nombre || selectedProjectCompetence.codigo || '',
      rapDescripcion: selectedProjectRap.descripcion || selectedProjectRap.codigo || '',
      aprendizIds: projectForm.asignacionTipo === 'aprendices' ? automaticLearnerIds : [],
      estado: 'Pendiente',
      progreso: 0,
      bitacorasEsperadas: projectForm.bitacorasEsperadas ? Number(projectForm.bitacorasEsperadas) : null,
    });
    setProjectForm({
      ...emptyProjectForm,
      fichaId: projectForm.fichaId,
      competenciaId: projectForm.competenciaId,
      rapId: projectForm.rapId,
      bitacorasEsperadas: projectForm.bitacorasEsperadas,
    });
    setProjectFormOpen(false);
  }, projectForm.id ? 'Proyecto actualizado correctamente.' : 'Proyecto creado correctamente.');

  const saveGroup = () => runAction(async () => {
    await guardarGrupoTrabajo({
      ...groupForm,
      instructorUid: session.uid,
      fichaNumero: selectedGroupFicha?.numero || '',
    });
    setGroupForm({
      ...emptyGroupForm,
      fichaId: groupForm.fichaId,
    });
    setGroupFormOpen(false);
  }, groupForm.id ? 'Grupo actualizado correctamente.' : 'Grupo creado correctamente.');

  const pickProjectFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: true,
      type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/*'],
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const pickedFiles = result.assets.map((file) => ({
      nombre: file.name || 'Archivo adjunto',
      uri: file.uri || '',
      mimeType: file.mimeType || '',
    }));
    const firstFile = pickedFiles[0];
    setProjectForm((current) => ({
      ...current,
      archivoNombre: current.archivoNombre || firstFile.nombre || '',
      archivoUri: current.archivoUri || firstFile.uri || '',
      archivoMimeType: current.archivoMimeType || firstFile.mimeType || '',
      archivos: [...current.archivos, ...pickedFiles].filter((file, index, all) =>
        file.uri && all.findIndex((candidate) => candidate.uri === file.uri) === index
      ),
    }));
  };

  const removeProjectFile = (fileUri: string) => {
    setProjectForm((current) => {
      const nextFiles = current.archivos.filter((file) => file.uri !== fileUri);
      const firstFile = nextFiles[0];
      return {
        ...current,
        archivos: nextFiles,
        archivoNombre: firstFile?.nombre || '',
        archivoUri: firstFile?.uri || firstFile?.url || '',
        archivoMimeType: firstFile?.mimeType || '',
      };
    });
  };

  const editProject = (project: AcademicProject) => {
    setSelectedProjectId(project.id);
    setProjectForm({
      id: project.id,
      titulo: project.titulo || '',
      descripcion: project.descripcion || '',
      fichaId: project.fichaId || '',
      competenciaId: project.competenciaId || '',
      rapId: project.rapId || '',
      asignacionTipo: project.asignacionTipo || 'aprendices',
      aprendizIds: project.aprendizIds || [],
      grupoId: project.grupoId || '',
      archivoNombre: project.archivoNombre || '',
      archivoUri: project.archivoUri || '',
      archivoMimeType: project.archivoMimeType || '',
      bitacorasEsperadas: project.bitacorasEsperadas ? String(project.bitacorasEsperadas) : '',
      archivos: (project.archivos || []).length
        ? project.archivos || []
        : project.archivoUri
          ? [{ nombre: project.archivoNombre || 'Archivo adjunto', uri: project.archivoUri, url: project.archivoUri, mimeType: project.archivoMimeType || '' }]
          : [],
    });
    setActiveSection('crear-proyectos');
    setProjectFormOpen(true);
    setGroupFormOpen(false);
    setGroupsVisible(false);
    setTasksOpen(false);
    setFeedback(`Editando proyecto ${project.titulo || project.id}.`);
  };

  const editGroup = (group: WorkGroup) => {
    setGroupForm({
      id: group.id,
      nombre: group.nombre || '',
      fichaId: group.fichaId || '',
      aprendizIds: group.aprendizIds || [],
    });
    setGroupFormOpen(true);
    setFeedback(`Editando grupo ${group.nombre || group.id}.`);
  };

  const setProjectState = (project: AcademicProject, state: ProjectState) => {
    if ((project.estado || 'Pendiente') === state) {
      setFeedback(`El proyecto ya está en estado ${state.toLowerCase()}.`);
      return;
    }

    Alert.alert(
      'Confirmar cambio de estado',
      `¿Seguro que deseas marcar "${project.titulo || 'este proyecto'}" como ${state.toLowerCase()}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar',
          onPress: () => runAction(
            () => cambiarEstadoProyecto(project.id, state),
            `Proyecto marcado como ${state.toLowerCase()}.`
          ),
        },
      ]
    );
  };

  const removeLearnerFromGroup = (groupId: string, learnerId: string) => {
    Alert.alert(
      'Quitar integrante',
      '¿Seguro que deseas quitar este aprendiz del grupo',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar',
          style: 'destructive',
          onPress: () => runAction(
            () => quitarIntegranteGrupo(groupId, learnerId),
            'Integrante retirado del grupo.'
          ),
        },
      ]
    );
  };

  const savePasanteTask = () => runAction(async () => {
    const selectedPasante = pasantes.find((pasante) => pasante.id === taskForm.pasanteUid);
    const selectedTaskSheet = sheets.find((sheet) => sheet.id === taskForm.fichaId);
    const selectedTaskProject = projects.find((project) => project.id === taskForm.proyectoId);

    await guardarTareaPasante({
      ...taskForm,
      instructorUid: session.uid,
      instructorNombre: session.name,
      pasanteNombre: selectedPasante?.nombre || selectedPasante?.correo || '',
      fichaNumero: selectedTaskSheet?.numero || '',
      proyectoTitulo: selectedTaskProject?.titulo || '',
    });

    setTaskForm({
      ...emptyTaskForm,
      fichaId: taskForm.fichaId,
      pasanteUid: taskForm.pasanteUid,
    });
  }, taskForm.id ? 'Tarea actualizada correctamente.' : 'Tarea asignada al pasante.');

  const editPasanteTask = (task: PasanteTaskRecord) => {
    setTaskForm({
      id: task.id,
      titulo: task.titulo || '',
      descripcion: task.descripcion || '',
      archivos: task.archivos || [],
      fichaId: task.fichaId || '',
      proyectoId: task.proyectoId || '',
      pasanteUid: task.pasanteUid || '',
      observacionInstructor: task.observacionInstructor || '',
    });
  };

  const confirmValidateTask = (task: PasanteTaskRecord) => {
    Alert.alert(
      'Validar tarea',
      `¿Confirmas que "${task.titulo || 'esta tarea'}" fue cumplida correctamente`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Aceptar', onPress: () => runAction(() => validarTareaPasante(task.id), 'Tarea validada por el instructor.') },
      ]
    );
  };

  const confirmDeleteTask = (task: PasanteTaskRecord) => {
    Alert.alert(
      'Eliminar tarea',
      `¿Seguro que deseas eliminar "${task.titulo || 'esta tarea'}"`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => runAction(() => eliminarTareaPasante(task.id), 'Tarea eliminada.') },
      ]
    );
  };

  const confirmDeleteProject = (project: AcademicProject) => {
    Alert.alert('Eliminar proyecto', `¿Seguro que deseas eliminar "${project.titulo || 'este proyecto'}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => runAction(() => eliminarProyectoAcademico(project.id), 'Proyecto eliminado.') },
    ]);
  };

  const confirmDeleteGroup = (group: WorkGroup) => {
    Alert.alert('Eliminar grupo', `¿Seguro que deseas eliminar "${group.nombre || 'este grupo'}"? Los proyectos vinculados dejarán de estar activos.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => runAction(() => eliminarGrupoTrabajo(group.id), 'Grupo eliminado.') },
    ]);
  };

  const saveTaskObservation = (task: PasanteTaskRecord, observacionInstructor: string) =>
    runAction(
      () => guardarObservacionInstructorTarea(task.id, observacionInstructor, session.name),
      'Observación de la tarea guardada.'
    );

  const openProjectFile = async (file: { ruta?: string | null; uri?: string | null; url?: string | null }) => {
    const fileUrl = getProjectPublicFileUrl(file) || normalizeFileUrl(file.url || file.uri);

    if (!fileUrl) {
      setFeedback('Este proyecto no tiene archivo adjunto.');
      return;
    }

    if (!/^https?:\/\//i.test(fileUrl)) {
      setFeedback('Este adjunto quedó guardado como archivo local. Vuelve a adjuntarlo para generar un enlace permanente.');
      return;
    }

    try {
      await Linking.openURL(fileUrl);
    } catch (fileError: any) {
      setFeedback('No pudimos abrir el archivo adjunto.');
    }
  };

  return (
    <>
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>GESTIÓN ACADÉMICA</Text>
        <Text style={styles.heroTitle}>Proyectos, grupos y seguimiento.</Text>
        <Text style={styles.heroText}>
          Administra proyectos y grupos, consulta avances y revisa las bitácoras de cada aprendiz por ficha y proyecto.
        </Text>
        <AcademicSectionMenu
          activeSection={activeSection}
          onSelect={(section) => {
            setActiveSection(section);
            setProjectFormOpen(section === 'crear-proyectos');
            setGroupFormOpen(section === 'crear-grupos');
            setGroupsVisible(section === 'ver-grupos');
            setTasksOpen(section === 'crear-tareas' || section === 'ver-tareas');
          }}
        />
      </View>

      {error ? <FeedbackBox text={error} tone="error" /> : null}
      {feedback ? <FeedbackBox text={feedback} /> : null}

      {activeSection === 'altas' ? (
        <LearnerApprovalPanel
          learners={sheetRequests}
          sheets={sheets}
          onAccept={(learner, sheet) => runAction(() => asignarAprendizAFicha({ aprendiz: learner, ficha: sheet }), 'Aprendiz dado de alta correctamente.')}
          onReject={(learnerId) => runAction(() => rechazarSolicitudFicha(learnerId), 'Solicitud rechazada.')}
        />
      ) : null}

      {tasksOpen ? (
        <PasanteTaskManager
        form={taskForm}
        mode={activeSection === 'crear-tareas' ? 'create' : activeSection === 'ver-tareas' ? 'list' : 'all'}
        pasantes={pasantes}
        projects={taskProjectsForSheet}
        saving={saving}
        sheets={sheets}
        tasks={pasanteTasks}
        onChange={setTaskForm}
        onDelete={confirmDeleteTask}
        onEdit={editPasanteTask}
        onSave={savePasanteTask}
        onSaveObservation={saveTaskObservation}
        onValidate={confirmValidateTask}
      />
      ) : null}

      {projectFormOpen ? (
        <View style={[styles.formCard, styles.projectCreateCard]}>
         
          <View style={styles.projectFormSection}>
            <ProjectFormDivider title="Información del proyecto" />
            <Field label="Nombre del proyecto" value={projectForm.titulo} onChangeText={(titulo) => setProjectForm((current) => ({ ...current, titulo }))} placeholder="Propagacion in vitro de orquideas" />
            <Field
              keyboardType="number-pad"
              label="Bitácoras esperadas"
              value={projectForm.bitacorasEsperadas}
              onChangeText={(bitacorasEsperadas) => setProjectForm((current) => ({ ...current, bitacorasEsperadas: bitacorasEsperadas.replace(/[^0-9]/g, '') }))}
              placeholder="Ejemplo: 6"
            />
            <Field label="Descripción" value={projectForm.descripcion} onChangeText={(descripcion) => setProjectForm((current) => ({ ...current, descripcion }))} placeholder="Objetivo, cultivo o evidencia esperada" multiline />
          </View>

          <View style={styles.projectFormSection}>
            <ProjectFormDivider title="Contexto académico" />
            <OptionPicker
              emptyLabel="Primero el administrador debe asignarte una ficha."
              label="Ficha"
              options={sheets.map((sheet) => ({ label: `Ficha ${sheet.numero || sheet.id} - ${sheet.programaNombre || 'Sin programa'}`, value: sheet.id }))}
              value={projectForm.fichaId}
              onChange={(fichaId) => setProjectForm((current) => ({ ...current, fichaId, grupoId: '' }))}
            />
            <OptionPicker
              emptyLabel="No tienes competencias/RAP asignados para esta ficha."
              label="Competencia"
              options={availableProjectCompetences.map((competence) => ({ label: `${competence.codigo || 'Competencia'} - ${competence.nombre || ''}`, value: competence.id }))}
              value={projectForm.competenciaId}
              onChange={(competenciaId) => setProjectForm((current) => ({ ...current, competenciaId, rapId: '' }))}
            />
            <OptionPicker
              emptyLabel="Esta competencia aún no tiene RAP."
              label="RAP"
              options={rapsForCompetence.map((rap) => ({ label: `${rap.codigo || 'RAP'} - ${rap.descripcion || ''}`, value: rap.id }))}
              value={projectForm.rapId}
              onChange={(rapId) => setProjectForm((current) => ({ ...current, rapId }))}
            />
          </View>

          <View style={styles.projectFormSection}>
            <ProjectFormDivider title="Asignación y evidencias" />
            <View style={styles.segmented}>
              {(['aprendices', 'grupo'] as const).map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setProjectForm((current) => ({ ...current, asignacionTipo: type, aprendizIds: [], grupoId: '' }))}
                  style={[styles.segmentButton, projectForm.asignacionTipo === type && styles.segmentButtonActive]}>
                  <Text style={[styles.segmentText, projectForm.asignacionTipo === type && styles.segmentTextActive]}>
                    {type === 'aprendices' ? 'Aprendices' : 'Grupo'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {projectForm.asignacionTipo === 'aprendices' ? (
              <AutoAssignedLearners
                learners={learnersForProjectSheet}
                sheetLabel={selectedProjectFicha?.numero || selectedProjectFicha?.id || 'pendiente'}
              />
            ) : (
              <OptionPicker
                emptyLabel="Primero crea un grupo para esta ficha."
                label="Grupo asignado"
                options={groupsForProjectSheet.map((group) => ({ label: group.nombre || group.id, value: group.id }))}
                value={projectForm.grupoId}
                onChange={(grupoId) => setProjectForm((current) => ({ ...current, grupoId }))}
              />
            )}

            <FilePickerField
              files={projectForm.archivos}
              onPick={pickProjectFile}
              onRemove={removeProjectFile}
            />
          </View>

          <View style={styles.actionRow}>
            <ActionButton disabled={saving || !selectedProjectCompetence || !selectedProjectRap} label={projectForm.id ? 'Actualizar proyecto' : 'Crear proyecto'} onPress={saveProject} tone="primary" />
            {projectForm.id ? (
              <ActionButton
                label="Cancelar edicion"
                onPress={() => setProjectForm({
                  ...emptyProjectForm,
                  fichaId: sheets[0]?.id || '',
                  competenciaId: competences[0]?.id || '',
                  rapId: raps.find((rap) => rap.competenciaId === competences[0]?.id)?.id || '',
                })}
              />
            ) : null}
          </View>
        </View>
      ) : null}

      {groupFormOpen ? (
        <View style={[styles.formCard, styles.groupCreateCard]}>
          <ProjectFormDivider title="Grupos de trabajo" />
          <Text style={styles.groupIntroText}>
            Crea equipos por ficha para organizar proyectos colaborativos y hacer seguimiento por integrantes.
          </Text>

          <View style={styles.groupFormSection}>
            <Field label="Nombre del grupo" value={groupForm.nombre} onChangeText={(nombre) => setGroupForm((current) => ({ ...current, nombre }))} placeholder="Grupo Orquideas A" />
            <OptionPicker
              emptyLabel="Primero el administrador debe asignarte una ficha."
              label="Ficha del grupo"
              options={sheets.map((sheet) => ({ label: `Ficha ${sheet.numero || sheet.id}`, value: sheet.id }))}
              value={groupForm.fichaId}
              onChange={(fichaId) => setGroupForm((current) => ({ ...current, fichaId, aprendizIds: [] }))}
            />
          </View>

          <View style={styles.groupMembersPanel}>
            <View style={styles.groupMembersHeader}>
              <View style={styles.groupMembersIcon}>
                <MaterialCommunityIcons name="account-multiple-check-outline" size={19} color={instructorPalette.primary} />
              </View>
              <View style={styles.groupMembersCopy}>
                <Text style={styles.groupMembersTitle}>Integrantes del grupo</Text>
                <Text style={styles.groupMembersText}>
                  {selectedGroupFicha
                    ? `${learnersForGroupSheet.length} aprendices disponibles en la ficha ${selectedGroupFicha.numero || selectedGroupFicha.id}.`
                    : 'Selecciona una ficha para ver sus aprendices.'}
                </Text>
              </View>
              <View style={styles.groupMembersBadge}>
                <Text style={styles.groupMembersBadgeText}>{groupForm.aprendizIds.length}</Text>
              </View>
            </View>
            <MultiPicker
              emptyLabel="No hay aprendices en esta ficha."
              label="Seleccionar aprendices"
              options={learnersForGroupSheet.map((learner) => ({ label: learner.nombre || learner.correo || learner.id, value: learner.id }))}
              values={groupForm.aprendizIds}
              onChange={(aprendizIds) => setGroupForm((current) => ({ ...current, aprendizIds }))}
            />
          </View>

          <View style={styles.groupActionRow}>
            <ActionButton disabled={saving} label={groupForm.id ? 'Actualizar grupo' : 'Crear grupo'} onPress={saveGroup} tone="primary" />
            {groupForm.id ? (
              <ActionButton
                label="Cancelar edicion"
                onPress={() => setGroupForm({
                  ...emptyGroupForm,
                  fichaId: sheets[0]?.id || '',
                })}
              />
            ) : null}
          </View>
        </View>
      ) : null}

      {activeSection === 'ver-grupos' ? (
      <>
      <SectionHeading
        actionLabel={`${filteredGroups.length} activos`}
        subtitle="Consulta los equipos creados por ficha y administra sus integrantes."
        title="Grupos"
      />

      <ProjectSheetMenu
        selectedSheetId={selectedListSheetId}
        sheets={sheets}
        onSelect={setSelectedListSheetId}
      />
      </>
      ) : null}

      {activeSection === 'ver-grupos' && groupsVisible ? (
        <View style={styles.groupsPanel}>
          <View style={styles.panelHeader}>
            <View style={styles.copy}>
              <Text style={styles.panelTitle}>Grupos de la ficha</Text>
              <Text style={styles.panelText}>
                {selectedListSheet ? `Ficha ${selectedListSheet.numero || selectedListSheet.id} · ${filteredGroups.length} grupos registrados` : 'Selecciona una ficha para ver sus grupos.'}
              </Text>
            </View>
            <View style={styles.groupsPanelIcon}>
              <MaterialCommunityIcons name="account-group-outline" size={20} color={instructorPalette.primary} />
            </View>
          </View>
          <View style={styles.stack}>
            {filteredGroups.length ? visibleGroups.map((group, index) => (
              <GroupCard
                group={group}
                key={`${group.id}-${group.fichaId || 'sin-ficha'}-${index}`}
                learners={learners}
                onEdit={() => editGroup(group)}
                onDelete={() => confirmDeleteGroup(group)}
                onRemoveLearner={(learnerId) => removeLearnerFromGroup(group.id, learnerId)}
              />
            )) : <EmptyCard text="Aún no hay grupos creados para esta ficha." />}
          </View>
        </View>
      ) : null}

      {activeSection === 'ver-proyectos' ? (
      <>
      <SectionHeading
        actionLabel={`${filteredProjects.length} registrados`}
        subtitle="Solo se muestran los proyectos de la ficha seleccionada."
        title="Proyectos"
      />

      <ProjectSheetMenu
        selectedSheetId={selectedListSheetId}
        sheets={sheets}
        onSelect={setSelectedListSheetId}
      />

      <SearchBox
        value={projectSearch}
        onChangeText={setProjectSearch}
        placeholder="Buscar proyecto, competencia, RAP o estado"
        variant="projects"
      />

      <View style={styles.stack}>
        {filteredProjects.length ? visibleProjects.map((project, index) => (
          <ProjectCard
            key={`${project.id}-${project.fichaId || 'sin-ficha'}-${index}`}
            groups={groups}
            learners={learners}
            project={{ ...project, estado: selectedSheetAutomaticState }}
            selected={project.id === selectedProject?.id}
            onEdit={() => editProject(project)}
            onDelete={() => confirmDeleteProject(project)}
            onOpenFile={(file) => openProjectFile(file)}
            onSelect={() => setSelectedProjectId(project.id)}
          />
        )) : <EmptyCard text="Aún no hay proyectos creados para esta ficha." />}
      </View>

      {selectedTrackingProject ? (
        <View style={styles.detailPanel}>
          <View style={styles.detailPanelHeader}>
            <View style={styles.copy}>
              <Text style={styles.detailPanelTitle}>{selectedTrackingProject.titulo || 'Proyecto seleccionado'}</Text>
              <Text style={styles.detailPanelText}>
                {selectedTrackingProject.competenciaNombre || 'Sin competencia'} · {selectedTrackingProject.rapDescripcion || 'RAP pendiente'}
              </Text>
            </View>
            <StatusBadge
              accent={getStateTone(selectedTrackingProject.estado || 'Pendiente').accent}
              label={selectedTrackingProject.estado || 'Pendiente'}
              soft={getStateTone(selectedTrackingProject.estado || 'Pendiente').soft}
            />
          </View>
          <View style={styles.progressDashboard}>
            <ProgressMetric icon="chart-line" label="Avance" progress={Number(selectedTrackingProject.progreso || 0)} value={`${Number(selectedTrackingProject.progreso || 0)}%`} />
            <ProgressMetric icon="clipboard-check-outline" label="Revisadas" progress={reviewProgress} value={`${reviewedCount}/${allProjectBitacoras.length}`} />
            <ProgressMetric icon="check-decagram-outline" label="Aprobadas" progress={approvalProgress} value={`${approvalProgress}%`} />
          </View>
          <Text style={styles.subBlockTitle}>Aprendices y bitácoras</Text>
          <LearnerTrackingFilter learners={trackingLearners} selectedLearnerId={selectedLearnerId} bitacoras={allProjectBitacoras} onSelect={setSelectedLearnerId} />
          <BitacorasReviewPanel
            bitacoras={projectBitacoras}
            groupMemberNames={selectedProjectGroupMemberNames}
            isGroupProject={selectedTrackingProject.asignacionTipo === 'grupo'}
            session={session}
          />
        </View>
      ) : null}
      </>
      ) : null}

      <View style={styles.hidden}>
      <SectionHeading
        actionLabel={`${filteredGroups.length} activos`}
        subtitle="Solo se muestran los grupos de la ficha seleccionada."
        title="Grupos creados"
      />

      <ActionButton
        label={groupsVisible ? 'Ocultar grupos creados' : 'Ver grupos creados'}
        onPress={() => setGroupsVisible((current) => !current)}
      />

      <View style={[styles.stack, !groupsVisible && styles.hidden]}>
        {groupsVisible && filteredGroups.length ? visibleGroups.map((group, index) => (
          <GroupCard
            group={group}
            key={`${group.id}-${group.fichaId || 'sin-ficha'}-${index}`}
            learners={learners}
            onEdit={() => editGroup(group)}
            onDelete={() => confirmDeleteGroup(group)}
            onRemoveLearner={(learnerId) => removeLearnerFromGroup(group.id, learnerId)}
          />
        )) : <EmptyCard text="Aún no hay grupos creados para esta ficha." />}
      </View>

      <SectionHeading
        actionLabel={selectedTrackingProject ? selectedTrackingProject.estado || 'Pendiente' : 'Sin proyecto'}
        subtitle="Selecciona un proyecto para consultar sus aprendices, avances y bitácoras."
        title="Seguimiento del proyecto"
      />

      <ProjectTrackingSelector
        projects={filteredProjects}
        selectedProjectId={selectedTrackingProject?.id || ''}
        onSelect={(projectId) => {
          setSelectedProjectId(projectId);
          setSelectedLearnerId('');
        }}
      />

      {selectedTrackingProject ? (
        <>
          <View style={styles.progressDashboard}>
            <ProgressMetric
              icon="chart-line"
              label="Avance del proyecto"
              progress={Number(selectedTrackingProject.progreso || 0)}
              value={`${Number(selectedTrackingProject.progreso || 0)}%`}
            />
            <ProgressMetric
              icon="clipboard-check-outline"
              label="Bitácoras revisadas"
              progress={reviewProgress}
              value={`${reviewedCount}/${allProjectBitacoras.length}`}
            />
            <ProgressMetric
              icon="check-decagram-outline"
              label="Bitácoras aprobadas"
              progress={approvalProgress}
              value={`${approvalProgress}%`}
            />
          </View>

          <SectionHeading
            actionLabel={`${trackingLearners.length} aprendices`}
            subtitle="Filtra las bitácoras del proyecto por aprendiz."
            title="Aprendices asignados"
          />

          <LearnerTrackingFilter
            learners={trackingLearners}
            selectedLearnerId={selectedLearnerId}
            bitacoras={allProjectBitacoras}
            onSelect={setSelectedLearnerId}
          />

          <SectionHeading
            actionLabel={`${projectBitacoras.length} registros`}
            subtitle="Selecciona una bitácora para abrir toda la información y revisar la entrega."
            title="Bitácoras del proyecto"
          />

          <BitacorasReviewPanel
            bitacoras={projectBitacoras}
            groupMemberNames={selectedProjectGroupMemberNames}
            isGroupProject={selectedTrackingProject.asignacionTipo === 'grupo'}
            session={session}
          />
        </>
      ) : (
        <EmptyCard text="Selecciona una ficha que tenga proyectos para consultar su seguimiento." />
      )}

      </View>

      {saving ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={instructorPalette.primary} />
          <Text style={styles.loadingText}>Guardando cambios...</Text>
        </View>
      ) : null}
    </>
  );
}

function ProjectTrackingSelector({
  onSelect,
  projects,
  selectedProjectId,
}: {
  onSelect: (projectId: string) => void;
  projects: AcademicProject[];
  selectedProjectId: string;
}) {
  const [query, setQuery] = useState('');
  const filtered = projects.filter((project) =>
    `${project.titulo || ''} ${project.competenciaNombre || ''}`
      .toLowerCase()
      .includes(query.trim().toLowerCase())
  );

  return (
    <View style={styles.trackingSelectorCard}>
      <View style={styles.trackingSearch}>
        <MaterialCommunityIcons name="magnify" size={19} color={instructorPalette.textMuted} />
        <TextInput
          placeholder="Buscar proyecto..."
          placeholderTextColor={instructorPalette.textMuted}
          value={query}
          onChangeText={setQuery}
          style={styles.trackingSearchInput}
        />
      </View>
      <View style={styles.trackingOptions}>
        {filtered.map((project) => (
          <Pressable
            key={project.id}
            onPress={() => onSelect(project.id)}
            style={[
              styles.trackingProjectButton,
              project.id === selectedProjectId && styles.trackingProjectButtonActive,
            ]}>
            <Text
              style={[
                styles.trackingProjectText,
                project.id === selectedProjectId && styles.trackingProjectTextActive,
              ]}>
              {project.titulo || 'Proyecto sin nombre'}
            </Text>
            <Text
              style={[
                styles.trackingProjectMeta,
                project.id === selectedProjectId && styles.trackingProjectTextActive,
              ]}>
              {project.competenciaNombre || 'Sin competencia'}
            </Text>
          </Pressable>
        ))}
        {!filtered.length ? <Text style={styles.emptyText}>No hay proyectos para esta ficha.</Text> : null}
      </View>
    </View>
  );
}

const academicSections: { id: AcademicSection; label: string; icon: string }[] = [
  { id: 'altas', label: 'Altas', icon: 'account-check-outline' },
  { id: 'crear-proyectos', label: 'Crear proyectos', icon: 'briefcase-plus-outline' },
  { id: 'ver-proyectos', label: 'Ver proyectos', icon: 'briefcase-eye-outline' },
  { id: 'crear-grupos', label: 'Crear grupos', icon: 'account-multiple-plus-outline' },
  { id: 'ver-grupos', label: 'Ver grupos', icon: 'account-group-outline' },
  { id: 'crear-tareas', label: 'Crear tareas', icon: 'clipboard-plus-outline' },
  { id: 'ver-tareas', label: 'Tareas', icon: 'clipboard-check-outline' },
];

function AcademicSectionMenu({
  activeSection,
  onSelect,
}: {
  activeSection: AcademicSection;
  onSelect: (section: AcademicSection) => void;
}) {
  return (
    <View style={styles.academicMenuWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.academicMenu}>
        {academicSections.map((section) => {
          const active = section.id === activeSection;
          return (
            <Pressable
              key={section.id}
              onPress={() => onSelect(section.id)}
              style={styles.academicMenuItem}>
              <View style={[styles.academicMenuIconWrap, active && styles.academicMenuIconWrapActive]}>
                <MaterialCommunityIcons name={section.icon as any} size={16} color={active ? '#FFFFFF' : instructorPalette.primary} />
              </View>
              <Text style={[styles.academicMenuText, active && styles.academicMenuTextActive]}>{section.label}</Text>
              <View style={[styles.academicMenuUnderline, active && styles.academicMenuUnderlineActive]} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function LearnerApprovalPanel({
  learners,
  onAccept,
  onReject,
  sheets,
}: {
  learners: AcademicUser[];
  onAccept: (learner: AcademicUser, sheet: AcademicSheet) => void;
  onReject: (learnerId: string) => void;
  sheets: AcademicSheet[];
}) {
  const [query, setQuery] = useState('');
  const filteredLearners = learners.filter((learner) =>
    `${learner.nombre || ''} ${learner.correo || ''} ${learner.fichaSolicitudNumero || ''}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <View style={styles.approvalPanel}>
      <SectionHeading
        actionLabel={`${learners.length} solicitudes`}
        subtitle="Aprendices que seleccionaron una ficha y esperan alta del instructor."
        title="Altas de aprendices"
      />
      <SearchBox
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar por nombre, correo o ficha"
        variant="approval"
      />
      <View style={styles.approvalList}>
        {filteredLearners.length ? filteredLearners.map((learner) => {
          const requestedSheet = sheets.find((sheet) => sheet.id === learner.fichaSolicitudId);
          return (
            <View key={learner.id} style={styles.approvalCard}>
              <View style={styles.approvalHeader}>
                <View style={styles.approvalAvatar}>
                  <MaterialCommunityIcons name="account-school-outline" size={19} color={instructorPalette.primary} />
                </View>
                <View style={styles.approvalCopy}>
                  <Text style={styles.approvalName}>{learner.nombre || learner.correo || 'Aprendiz'}</Text>
                  <Text style={styles.approvalMeta}>{learner.correo || 'Correo no registrado'}</Text>
                </View>
              </View>
              <View style={styles.approvalSheetBox}>
                <MaterialCommunityIcons name="card-account-details-outline" size={16} color={instructorPalette.primary} />
                <View style={styles.approvalSheetCopy}>
                  <Text style={styles.approvalSheetLabel}>Ficha solicitada</Text>
                  <Text style={styles.approvalSheetText}>
                    {requestedSheet?.numero || learner.fichaSolicitudNumero || learner.fichaSolicitudId || 'Pendiente'}
                  </Text>
                </View>
              </View>
              <View style={styles.approvalActions}>
                <Pressable
                  disabled={!requestedSheet}
                  onPress={() => requestedSheet && onAccept(learner, requestedSheet)}
                  style={[styles.approvalButton, styles.approvalButtonPrimary, !requestedSheet && styles.approvalButtonDisabled]}>
                  <Text style={[styles.approvalButtonText, styles.approvalButtonTextPrimary]}>Dar de alta</Text>
                </Pressable>
                <Pressable onPress={() => onReject(learner.id)} style={styles.approvalButton}>
                  <Text style={styles.approvalButtonText}>Rechazar</Text>
                </Pressable>
              </View>
            </View>
          );
        }) : (
          <View style={styles.approvalEmpty}>
            <View style={styles.approvalEmptyIcon}>
              <MaterialCommunityIcons name="account-check-outline" size={22} color={instructorPalette.primary} />
            </View>
            <Text style={styles.approvalEmptyTitle}>Sin solicitudes pendientes</Text>
            <Text style={styles.approvalEmptyText}>Cuando un aprendiz seleccione una ficha asignada, aparecerá aquí para aprobarlo.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function PasanteTaskManager({
  form,
  mode = 'all',
  onChange,
  onDelete,
  onEdit,
  onSave,
  onSaveObservation,
  onValidate,
  pasantes,
  projects,
  saving,
  sheets,
  tasks,
}: {
  form: typeof emptyTaskForm;
  mode: 'all' | 'create' | 'list';
  onChange: (form: typeof emptyTaskForm) => void;
  onDelete: (task: PasanteTaskRecord) => void;
  onEdit: (task: PasanteTaskRecord) => void;
  onSave: () => void;
  onSaveObservation: (task: PasanteTaskRecord, observacionInstructor: string) => Promise<void>;
  onValidate: (task: PasanteTaskRecord) => void;
  pasantes: AcademicUser[];
  projects: AcademicProject[];
  saving: boolean;
  sheets: AcademicSheet[];
  tasks: PasanteTaskRecord[];
}) {
  const [selectedPasanteFilter, setSelectedPasanteFilter] = useState('');
  const filteredTasksByPasante = selectedPasanteFilter
    ? tasks.filter((task) => task.pasanteUid === selectedPasanteFilter)
    : tasks;
  const pendingTasks = filteredTasksByPasante.filter((task) => task.estado !== 'Validada');
  const orderedTasks = pendingTasks.concat(filteredTasksByPasante.filter((task) => task.estado === 'Validada'));
  const visibleTasks = orderedTasks.slice(0, 6);
  const [createdTasksVisible, setCreatedTasksVisible] = useState(mode === 'list');
  const pickTaskAttachments = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: true,
      type: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const nextFiles = result.assets
      .filter((file) => file.uri)
      .map((file) => ({
        nombre: file.name || `adjunto-${Date.now()}`,
        uri: file.uri,
        url: file.uri,
        mimeType: file.mimeType || 'application/octet-stream',
      }));

    onChange({
      ...form,
      archivos: [...form.archivos, ...nextFiles].filter((file, index, all) =>
        all.findIndex((candidate) => (candidate.uri || candidate.url) === (file.uri || file.url)) === index
      ),
    });
  };

  const pickTaskPhotos = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.9 });
    if (result.canceled) return;
    const photos = result.assets.filter((asset) => asset.uri).map((asset, index) => ({
      nombre: asset.fileName || `foto-${Date.now()}-${index + 1}.jpg`,
      uri: asset.uri,
      url: asset.uri,
      mimeType: asset.mimeType || 'image/jpeg',
    }));
    onChange({ ...form, archivos: [...form.archivos, ...photos] });
  };

  const removeTaskAttachment = (indexToRemove: number) => {
    onChange({
      ...form,
      archivos: form.archivos.filter((_, index) => index !== indexToRemove),
    });
  };

  return (
    <View style={[styles.formCard, mode === 'create' && styles.taskCreateCard]}>
      {mode !== 'list' ? (
      <View style={styles.taskCreateContent}>
        <ProjectFormDivider title="Asignación de tarea" />
        <View style={styles.taskFormSection}>
          <OptionPicker
            emptyLabel="Primero asigna pasantes a este instructor desde administración."
            label="Pasante"
            options={pasantes.map((pasante) => ({ label: pasante.nombre || pasante.correo || pasante.id, value: pasante.id }))}
            value={form.pasanteUid}
            onChange={(pasanteUid) => onChange({ ...form, pasanteUid })}
          />
          <OptionPicker
            emptyLabel="Primero necesitas fichas asignadas."
            label="Ficha relacionada"
            options={[
              { label: 'Sin ficha relacionada', value: '' },
              ...sheets.map((sheet) => ({ label: `Ficha ${sheet.numero || sheet.id}`, value: sheet.id })),
            ]}
            value={form.fichaId}
            onChange={(fichaId) => onChange({ ...form, fichaId, proyectoId: '' })}
          />
          <OptionPicker
            emptyLabel="Puedes guardar la tarea sin proyecto específico."
            label="Proyecto opcional"
            options={[
              { label: 'General de la ficha', value: '' },
              ...projects.map((project) => ({ label: project.titulo || project.id, value: project.id })),
            ]}
            value={form.proyectoId}
            onChange={(proyectoId) => onChange({ ...form, proyectoId })}
          />
        </View>

        <ProjectFormDivider title="Detalle para el pasante" />
        <View style={styles.taskFormSection}>
          <Field
            label="Título de la tarea"
            placeholder="Revisar evidencias de la semana"
            value={form.titulo}
            onChangeText={(titulo) => onChange({ ...form, titulo })}
          />
          <Field
            label="Descripción"
            multiline
            placeholder="Indica qué debe consultar, observar o reportar el pasante."
            value={form.descripcion}
            onChangeText={(descripcion) => onChange({ ...form, descripcion })}
          />
        </View>

        <View style={styles.taskAttachmentPanel}>
          <View style={styles.taskAttachmentHeader}>
            <View style={styles.taskAttachmentIcon}>
              <MaterialCommunityIcons name="paperclip" size={18} color={instructorPalette.primary} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.taskAttachmentTitle}>Imágenes o archivos</Text>
              <Text style={styles.taskAttachmentText}>Adjunta guías, fotos, PDF, Word o Excel para que el pasante tenga el contexto completo.</Text>
            </View>
            <View style={styles.attachmentPickerActions}>
              <Pressable onPress={pickTaskPhotos} style={styles.attachmentPickerButton}>
                <MaterialCommunityIcons name="image-multiple-outline" size={19} color={instructorPalette.primary} />
                <Text style={styles.attachmentPickerText}>Fotos</Text>
              </Pressable>
              <Pressable onPress={pickTaskAttachments} style={styles.attachmentPickerButton}>
                <MaterialCommunityIcons name="file-upload-outline" size={19} color={instructorPalette.primary} />
                <Text style={styles.attachmentPickerText}>Archivos</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.attachmentList}>
            {form.archivos.map((file, index) => (
              <View key={`${file.uri || file.url || file.nombre}-${index}`} style={styles.taskAttachmentItem}>
                <View style={styles.taskAttachmentFileIcon}>
                  <MaterialCommunityIcons name={file.mimeType.startsWith('image/') ? 'image-outline' : 'file-document-outline'} size={16} color={instructorPalette.primary} />
                </View>
                <Text numberOfLines={1} style={styles.attachmentText}>{file.nombre || 'Adjunto'}</Text>
                <Pressable onPress={() => removeTaskAttachment(index)} style={styles.taskAttachmentRemove}>
                  <MaterialCommunityIcons name="close" size={13} color="#C45C43" />
                </Pressable>
              </View>
            ))}
            {!form.archivos.length ? (
              <View style={styles.taskAttachmentEmpty}>
                <Text style={styles.helperText}>Sin adjuntos por ahora.</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.taskActionRow}>
          <ActionButton disabled={saving} label={form.id ? 'Actualizar tarea' : 'Asignar tarea'} onPress={onSave} tone="primary" />
          {form.id ? (
            <ActionButton label="Cancelar edición" onPress={() => onChange({ ...emptyTaskForm, fichaId: form.fichaId, pasanteUid: form.pasanteUid })} />
          ) : null}
        </View>
      </View>
      ) : null}

      {mode === 'all' ? (
      <ActionButton
        label={createdTasksVisible ? 'Ocultar tareas creadas' : `Ver tareas creadas (${tasks.length})`}
        onPress={() => setCreatedTasksVisible((current) => !current)}
      />
      ) : null}

      {createdTasksVisible || mode === 'list' ? (
      <View style={styles.taskListPanel}>
        {mode === 'list' ? (
          <View style={styles.taskListFilterCard}>
            <View style={styles.taskListFilterHeader}>
              <View style={styles.taskAttachmentIcon}>
                <MaterialCommunityIcons name="account-filter-outline" size={18} color={instructorPalette.primary} />
              </View>
              <View style={styles.copy}>
                <Text style={styles.taskAttachmentTitle}>Filtrar por pasante</Text>
                <Text style={styles.taskAttachmentText}>Revisa pendientes, respuestas y validaciones por persona.</Text>
              </View>
            </View>
            <OptionPicker
              emptyLabel="No hay pasantes asignados a este instructor."
              label="Pasante"
              options={[
                { label: 'Todos los pasantes', value: '' },
                ...pasantes.map((pasante) => ({
                  label: pasante.nombre || pasante.correo || pasante.id,
                  value: pasante.id,
                })),
              ]}
              value={selectedPasanteFilter}
              onChange={setSelectedPasanteFilter}
            />
          </View>
        ) : null}
        <View style={styles.taskListHeader}>
          <View>
            <Text style={styles.panelTitle}>Tareas asignadas</Text>
            <Text style={styles.panelText}>
              {filteredTasksByPasante.length} registros · {pendingTasks.length} pendientes
            </Text>
          </View>
          <View style={styles.groupsPanelIcon}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={20} color={instructorPalette.primary} />
          </View>
        </View>
        <View style={styles.stack}>
          {filteredTasksByPasante.length ? visibleTasks.map((task) => (
            <PasanteTaskCard
              key={task.id}
              task={task}
              onDelete={() => onDelete(task)}
              onEdit={() => onEdit(task)}
              onSaveObservation={(text) => onSaveObservation(task, text)}
              onValidate={() => onValidate(task)}
            />
          )) : <EmptyCard text={selectedPasanteFilter ? 'Este pasante no tiene tareas asignadas.' : 'Aun no hay tareas asignadas a pasantes.'} />}
        </View>
      </View>
      ) : null}
    </View>
  );
}

function ProgressMetric({
  icon,
  label,
  progress,
  value,
}: {
  icon: 'chart-line' | 'clipboard-check-outline' | 'check-decagram-outline';
  label: string;
  progress: number;
  value: string;
}) {
  const normalizedProgress = Math.max(0, Math.min(100, progress));

  return (
    <View style={styles.progressMetric}>
      <View style={styles.progressMetricHeader}>
        <View style={styles.progressMetricIcon}>
          <MaterialCommunityIcons name={icon} size={18} color={instructorPalette.primary} />
        </View>
        <Text style={styles.progressMetricValue}>{value}</Text>
      </View>
      <Text style={styles.progressMetricLabel}>{label}</Text>
      <ProgressBar
        accent={instructorPalette.primary}
        progress={normalizedProgress}
        soft={instructorPalette.mint}
      />
    </View>
  );
}

function PasanteTaskCard({
  onDelete,
  onEdit,
  onSaveObservation,
  onValidate,
  task,
}: {
  onDelete: () => void;
  onEdit: () => void;
  onSaveObservation: (text: string) => Promise<void>;
  onValidate: () => void;
  task: PasanteTaskRecord;
}) {
  const [observation, setObservation] = useState('');
  const observations = [...(task.observaciones || [])].sort((a, b) => getMillis(a.creadoEn) - getMillis(b.creadoEn));

  return (
    <View style={styles.pasanteTaskCard}>
      <View style={styles.taskCardHeader}>
        <View style={[styles.taskCardIcon, { backgroundColor: getTaskTone(task.estado).soft }]}>
          <MaterialCommunityIcons name="clipboard-check-outline" size={18} color={getTaskTone(task.estado).accent} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{task.titulo || 'Tarea sin título'}</Text>
          <Text style={styles.subtitle}>
            {task.pasanteNombre || 'Pasante'} · Ficha {task.fichaNumero || task.fichaId || 'general'}
          </Text>
        </View>
        <StatusBadge accent={getTaskTone(task.estado).accent} label={task.estado || 'Pendiente'} soft={getTaskTone(task.estado).soft} />
      </View>
      {task.descripcion ? (
        <View style={styles.taskDescriptionBox}>
          <Text style={styles.taskDescriptionLabel}>Indicaciones</Text>
          <Text style={styles.autoText}>{task.descripcion}</Text>
        </View>
      ) : null}
      <TaskAttachmentList archivos={task.archivos || []} title="Adjuntos del instructor" />
      <TaskAttachmentList archivos={task.archivosPasante || []} title="Entrega del pasante" />
      {observations.length ? observations.map((item, index) => (
        <View key={item.id || `${item.autorRol}-${index}`} style={styles.taskNote}>
          <MaterialCommunityIcons name="message-reply-text-outline" size={16} color={instructorPalette.primary} />
          <View style={styles.copy}>
            <Text style={styles.taskNoteLabel}>{item.autorRol || 'Usuario'} · {item.autorNombre || ''}</Text>
            <Text style={styles.taskNoteText}>{item.texto}</Text>
          </View>
        </View>
      )) : task.observacionPasante ? (
        <View style={styles.taskNote}>
          <MaterialCommunityIcons name="message-reply-text-outline" size={16} color={instructorPalette.primary} />
          <View style={styles.copy}>
            <Text style={styles.taskNoteLabel}>Respuesta del pasante</Text>
            <Text style={styles.taskNoteText}>{task.observacionPasante}</Text>
          </View>
        </View>
      ) : null}
      <View style={styles.taskObservationBox}>
        <Text style={styles.fieldLabel}>Observación del instructor</Text>
        <View style={styles.taskObservationComposer}>
          <TextInput
            multiline
            placeholder="Escribe una observación para esta tarea..."
            placeholderTextColor={instructorPalette.textMuted}
            style={styles.taskObservationInput}
            value={observation}
            onChangeText={setObservation}
          />
          <Pressable
            accessibilityLabel="Enviar observación"
            disabled={!observation.trim()}
            onPress={async () => {
              await onSaveObservation(observation);
              setObservation('');
            }}
            style={[styles.taskObservationSend, !observation.trim() && styles.taskObservationSendDisabled]}>
            <MaterialCommunityIcons name="arrow-up" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
      <View style={styles.taskCardActions}>
        <ActionButton label="Editar" onPress={onEdit} />
        <ActionButton label="Eliminar" onPress={onDelete} />
        {task.estado === 'Hecho' && !task.validadaPorInstructor ? (
          <ActionButton label="Validar" onPress={onValidate} tone="primary" />
        ) : null}
      </View>
    </View>
  );
}

function TaskAttachmentList({ archivos, title }: { archivos: ProjectAttachment[]; title?: string }) {
  const [previewImageUri, setPreviewImageUri] = useState('');
  if (!archivos.length) {
    return null;
  }

  const openAttachment = async (file: ProjectAttachment) => {
    const fileUrl = getProjectPublicFileUrl(file) || normalizeFileUrl(file.url || file.uri);

    if (!fileUrl || !/^https?:\/\//i.test(fileUrl)) {
      Alert.alert('No pudimos abrir el archivo', 'Este adjunto quedó guardado como archivo local. Vuelve a adjuntarlo para generar un enlace permanente.');
      return;
    }

    try {
      await Linking.openURL(fileUrl);
    } catch (error) {
      Alert.alert('No pudimos abrir el archivo', 'No pudimos abrir el adjunto.');
    }
  };

  return (
    <View style={styles.taskAttachmentList}>
      {title ? <Text style={styles.taskAttachmentGroupTitle}>{title}</Text> : null}
      {archivos.map((file, index) => {
        const fileUrl = getProjectPublicFileUrl(file) || normalizeFileUrl(file.url || file.uri) || '';
        const isImage = /^image\//i.test(file.mimeType || '') || /\.(jpe?g|png|gif|webp|heic)(\?|$)/i.test(fileUrl);
        return isImage && fileUrl ? (
          <Pressable key={`${fileUrl}-${index}`} onPress={() => setPreviewImageUri(fileUrl)} style={styles.taskImageButton}>
            <Image source={{ uri: fileUrl }} style={styles.taskImagePreview} />
            <View style={styles.taskImageOverlay}>
              <MaterialCommunityIcons name="arrow-expand" size={17} color="#FFFFFF" />
            </View>
          </Pressable>
        ) : (
          <Pressable
            key={`${file.url || file.uri || file.nombre}-${index}`}
            onPress={() => openAttachment(file)}
            style={styles.taskAttachmentItem}>
            <View style={styles.taskAttachmentFileIcon}>
              <MaterialCommunityIcons name="file-document-outline" size={16} color={instructorPalette.primary} />
            </View>
            <Text numberOfLines={1} style={styles.attachmentText}>{file.nombre || 'Adjunto'}</Text>
            <MaterialCommunityIcons name="open-in-new" size={16} color={instructorPalette.primary} />
          </Pressable>
        );
      })}
      <ImagePreviewModal onClose={() => setPreviewImageUri('')} uri={previewImageUri} />
    </View>
  );
}

function LearnerTrackingFilter({
  bitacoras,
  learners,
  onSelect,
  selectedLearnerId,
}: {
  bitacoras: AcademicBitacora[];
  learners: AcademicUser[];
  onSelect: (learnerId: string) => void;
  selectedLearnerId: string;
}) {
  const [query, setQuery] = useState('');
  const filteredLearners = learners.filter((learner) =>
    `${learner.nombre || ''} ${learner.correo || ''}`
      .toLowerCase()
      .includes(query.trim().toLowerCase())
  );

  return (
    <View style={styles.learnerFilterCard}>
      <SearchBox value={query} onChangeText={setQuery} placeholder="Buscar aprendiz..." />
      <View style={styles.learnerFilterWrap}>
      <Pressable
        onPress={() => onSelect('')}
        style={[styles.learnerFilter, !selectedLearnerId && styles.learnerFilterActive]}>
        <Text style={[styles.learnerFilterText, !selectedLearnerId && styles.learnerFilterTextActive]}>
          Todos
        </Text>
        <Text style={[styles.learnerFilterCount, !selectedLearnerId && styles.learnerFilterTextActive]}>
          {bitacoras.length}
        </Text>
      </Pressable>
      {filteredLearners.slice(0, 10).map((learner) => {
        const active = selectedLearnerId === learner.id;
        const count = bitacoras.filter((bitacora) => bitacora.aprendizUid === learner.id).length;
        return (
          <Pressable
            key={learner.id}
            onPress={() => onSelect(learner.id)}
            style={[styles.learnerFilter, active && styles.learnerFilterActive]}>
            <Text numberOfLines={1} style={[styles.learnerFilterText, active && styles.learnerFilterTextActive]}>
              {learner.nombre || learner.correo || 'Aprendiz'}
            </Text>
            <Text style={[styles.learnerFilterCount, active && styles.learnerFilterTextActive]}>{count}</Text>
          </Pressable>
        );
      })}
      {!filteredLearners.length ? <Text style={styles.emptyText}>No hay aprendices con esa búsqueda.</Text> : null}
      {filteredLearners.length > 10 ? <Text style={styles.listHint}>Mostrando 10 aprendices. Usa el buscador para filtrar mejor.</Text> : null}
      </View>
    </View>
  );
}

function ProjectCard({
  groups,
  learners,
  onEdit,
  onDelete,
  onOpenFile,
  onSelect,
  project,
  selected,
}: {
  groups: WorkGroup[];
  learners: AcademicUser[];
  onEdit: () => void;
  onDelete: () => void;
  onOpenFile: (file: { uri?: string | null; url?: string | null }) => void;
  onSelect: () => void;
  project: AcademicProject;
  selected: boolean;
}) {
  const assignedGroup = groups.find((group) => group.id === project.grupoId);
  const assignedLearners = learners.filter((learner) =>
    (project.aprendizIds || []).includes(learner.id)
    && (!project.fichaId || learner.fichaId === project.fichaId)
  );
  const automaticState = project.estado === 'Aprobado' ? 'Aprobado' : 'Pendiente';
  const stateTone = getStateTone(automaticState);

  return (
    <Pressable onPress={onSelect} style={styles.projectCard}>
      <View style={[styles.projectInner, selected && styles.projectInnerActive]}>
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: stateTone.soft }]}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={18} color={stateTone.accent} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>{project.titulo || 'Proyecto sin nombre'}</Text>
            <Text style={styles.subtitle}>Ficha {project.fichaNumero || project.fichaId || 'sin ficha'}</Text>
          </View>
          <StatusBadge accent={stateTone.accent} label={automaticState} soft={stateTone.soft} />
        </View>

        <ProgressBar accent={stateTone.accent} progress={Number(project.progreso || 0)} soft="#EFF3FA" />

        <View style={styles.projectMetaPanel}>
          <IconLabel icon="book-check-outline" text={project.competenciaNombre || 'Competencia pendiente'} />
          <IconLabel icon="format-list-checks" text={project.rapDescripcion || 'RAP pendiente'} />
          <IconLabel
            icon={project.asignacionTipo === 'grupo' ? 'account-group-outline' : 'account-multiple-outline'}
            text={project.asignacionTipo === 'grupo'
              ? `Grupo: ${assignedGroup?.nombre || 'pendiente'}`
              : `Aprendices: ${assignedLearners.map((learner) => learner.nombre || learner.correo).filter(Boolean).join(', ') || 'pendientes'}`}
          />
        </View>

        <View style={styles.projectFooter}>
          <View style={styles.projectFiles}>
          {((project.archivos || []).length ? project.archivos || [] : project.archivoNombre ? [{ nombre: project.archivoNombre, uri: project.archivoUri || '', url: project.archivoUri || '', mimeType: project.archivoMimeType || '' }] : []).map((file, index) => (
            <Pressable key={`${file.uri || file.nombre}-${index}`} onPress={() => onOpenFile(file)} style={styles.fileLink}>
              <MaterialCommunityIcons name="file-document-outline" size={16} color={instructorPalette.primary} />
              <Text numberOfLines={1} style={styles.fileLinkText}>{file.nombre}</Text>
              <MaterialCommunityIcons name="open-in-new" size={14} color={instructorPalette.primary} />
            </Pressable>
          ))}
          </View>
          <View style={styles.stateRow}>
            <Text style={styles.autoStateText}>Aprobación automática al cierre del trimestre.</Text>
            <Pressable onPress={onEdit} style={[styles.stateButton, styles.editButton]}>
              <Text style={[styles.stateButtonText, styles.editButtonText]}>Editar</Text>
            </Pressable>
            <Pressable onPress={onDelete} style={[styles.stateButton, styles.deleteButton]}>
              <Text style={styles.deleteButtonText}>Eliminar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function GroupCard({
  group,
  learners,
  onEdit,
  onDelete,
  onRemoveLearner,
}: {
  group: WorkGroup;
  learners: AcademicUser[];
  onEdit: () => void;
  onDelete: () => void;
  onRemoveLearner: (learnerId: string) => void;
}) {
  const members = learners.filter((learner) =>
    (group.aprendizIds || []).includes(learner.id)
    && (!group.fichaId || learner.fichaId === group.fichaId)
  );

  return (
    <View style={styles.groupCard}>
      <View style={styles.groupCardHeader}>
        <View style={styles.groupCardIcon}>
          <MaterialCommunityIcons name="account-group-outline" size={18} color={instructorPalette.primary} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{group.nombre || 'Grupo sin nombre'}</Text>
          <Text style={styles.subtitle}>Ficha {group.fichaNumero || group.fichaId || 'sin ficha'}</Text>
        </View>
        <View style={styles.groupHeaderActions}>
          <View style={styles.groupCountPill}>
            <Text style={styles.groupCountText}>{members.length}</Text>
          </View>
          <Pressable onPress={onEdit} style={styles.editButton}>
            <Text style={styles.editButtonText}>Editar</Text>
          </Pressable>
          <Pressable onPress={onDelete} style={styles.memberRemoveButton}>
            <MaterialCommunityIcons name="trash-can-outline" size={15} color="#C97B63" />
          </Pressable>
        </View>
      </View>

      <View style={styles.memberSectionHeader}>
        <Text style={styles.memberSectionTitle}>Integrantes</Text>
        <Text style={styles.memberSectionMeta}>{members.length ? `${members.length} seleccionados` : 'Sin integrantes'}</Text>
      </View>
      <View style={styles.memberList}>
        {members.length ? members.map((learner) => (
          <View key={learner.id} style={styles.memberRow}>
            <View style={styles.memberAvatar}>
              <MaterialCommunityIcons name="account-outline" size={15} color={instructorPalette.primary} />
            </View>
            <Text style={styles.memberName}>{learner.nombre || learner.correo || learner.id}</Text>
            <Pressable onPress={() => onRemoveLearner(learner.id)} style={styles.memberRemoveButton}>
              <MaterialCommunityIcons name="close" size={13} color="#C97B63" />
            </Pressable>
          </View>
        )) : <Text style={styles.emptyText}>Este grupo aún no tiene integrantes.</Text>}
      </View>
    </View>
  );
}

function SheetSelector({
  onSelect,
  selectedSheetId,
  sheets,
}: {
  onSelect: (sheetId: string) => void;
  selectedSheetId: string;
  sheets: AcademicSheet[];
}) {
  const [query, setQuery] = useState('');
  const filteredSheets = useMemo(
    () => sheets.filter((sheet) =>
      `${sheet.numero || ''} ${sheet.programaNombre || ''} ${sheet.id}`.toLowerCase().includes(query.trim().toLowerCase())
    ),
    [query, sheets]
  );

  if (!sheets.length) {
    return <EmptyCard text="Aún no tienes fichas asignadas para filtrar proyectos o grupos." />;
  }

  return (
    <View style={styles.sheetFilterCard}>
      <SearchBox value={query} onChangeText={setQuery} placeholder="Buscar ficha..." />
      <View style={styles.multiGrid}>
        {filteredSheets.length ? filteredSheets.map((sheet, index) => {
          const active = sheet.id === selectedSheetId;

          return (
            <Pressable key={`${sheet.id}-${sheet.numero || 'sin-numero'}-${index}`} onPress={() => onSelect(sheet.id)} style={[styles.sheetFilterChip, active && styles.sheetFilterChipActive]}>
              <Text style={[styles.sheetFilterText, active && styles.sheetFilterTextActive]}>
                Ficha {sheet.numero || sheet.id}
              </Text>
              <Text style={[styles.sheetFilterSubtext, active && styles.sheetFilterTextActive]}>
                {sheet.programaNombre || 'Sin programa'}
              </Text>
            </Pressable>
          );
        }) : <Text style={styles.emptyText}>No hay fichas con esa búsqueda.</Text>}
      </View>
    </View>
  );
}

function ProjectSheetMenu({
  onSelect,
  selectedSheetId,
  sheets,
}: {
  onSelect: (sheetId: string) => void;
  selectedSheetId: string;
  sheets: AcademicSheet[];
}) {
  if (!sheets.length) {
    return <EmptyCard text="Aún no tienes fichas asignadas para filtrar proyectos." compact />;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.projectSheetMenu}>
      {sheets.map((sheet, index) => {
        const active = sheet.id === selectedSheetId;

        return (
          <Pressable
            key={`${sheet.id}-${sheet.numero || 'sin-numero'}-${index}`}
            onPress={() => onSelect(sheet.id)}
            style={[styles.projectSheetPill, active && styles.projectSheetPillActive]}>
            <Text style={[styles.projectSheetPillText, active && styles.projectSheetPillTextActive]}>
              Ficha {sheet.numero || sheet.id}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function Field({
  keyboardType = 'default',
  label,
  multiline = false,
  onChangeText,
  placeholder,
  value,
}: {
  keyboardType?: 'default' | 'number-pad';
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.fieldBlock}>
      <Text style={[styles.fieldLabel, isFocused && { color: instructorPalette.primary }]}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        multiline={multiline}
        onBlur={() => setIsFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        placeholder={placeholder}
        placeholderTextColor="#97AEA7"
        style={[styles.fieldInput, multiline && styles.fieldInputMultiline, isFocused && styles.fieldInputActive]}
        value={value}
      />
    </View>
  );
}

function ProjectFormDivider({ title }: { title: string }) {
  return (
    <View style={styles.projectFormDivider}>
      <View style={styles.projectFormDividerLine} />
      <View style={styles.projectFormDividerCopy}>
        <Text style={styles.projectFormDividerEyebrow}>Formulario independiente</Text>
        <Text style={styles.projectFormDividerTitle}>{title}</Text>
      </View>
    </View>
  );
}

function OptionPicker({
  emptyLabel,
  label,
  onChange,
  options,
  value,
}: {
  emptyLabel: string;
  label: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filteredOptions = useMemo(
    () => options.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase())),
    [options, query]
  );
  const selectedOption = options.find((option) => option.value === value);

  if (!options.length) {
    return emptyLabel ? <EmptyCard text={emptyLabel} compact /> : null;
  }

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable onPress={() => setOpen((current) => !current)} style={styles.selectorTrigger}>
        <Text numberOfLines={1} style={styles.selectorTriggerText}>
          {selectedOption?.label || 'Selecciona una opción'}
        </Text>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={12} color={instructorPalette.secondary} />
      </Pressable>
      {open ? (
        <View style={styles.selectorDropdown}>
          <SearchBox value={query} onChangeText={setQuery} placeholder={`Buscar ${label.toLowerCase()}...`} />
          <View style={styles.selectorOptions}>
            {filteredOptions.length ? filteredOptions.map((option, index) => {
              const active = option.value === value;

              return (
                <Pressable
                  key={`${option.value}-${option.label}-${index}`}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                    setQuery('');
                  }}
                  style={[styles.selectorOption, active && styles.selectorOptionActive]}>
                  {active ? <MaterialCommunityIcons name="check-circle" size={20} color={instructorPalette.primary} /> : null}
                  <Text numberOfLines={2} style={[styles.selectorOptionText, active && styles.selectorOptionTextActive]}>
                    {`${index + 1}. ${option.label}`}
                  </Text>
                </Pressable>
              );
            }) : <Text style={styles.emptyText}>No hay resultados para esa búsqueda.</Text>}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function LegacyOptionPicker({
  emptyLabel,
  label,
  onChange,
  options,
  value,
}: {
  emptyLabel: string;
  label: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
}) {
  const [query, setQuery] = useState('');
  const filteredOptions = useMemo(
    () => options.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase())),
    [options, query]
  );

  if (!options.length) {
    return emptyLabel ? <EmptyCard text={emptyLabel} compact /> : null;
  }

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <SearchBox value={query} onChangeText={setQuery} placeholder={`Buscar ${label.toLowerCase()}...`} />
      <View style={styles.multiGrid}>
        {filteredOptions.length ? filteredOptions.map((option, index) => {
          const active = option.value === value;

          return (
            <Pressable key={`${option.value}-${option.label}-${index}`} onPress={() => onChange(option.value)} style={[styles.optionChip, active && styles.optionChipActive]}>
              <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>{option.label}</Text>
            </Pressable>
          );
        }) : <Text style={styles.emptyText}>No hay resultados para esa búsqueda.</Text>}
      </View>
    </View>
  );
}

function MultiPicker({
  emptyLabel,
  label,
  onChange,
  options,
  values,
}: {
  emptyLabel: string;
  label: string;
  onChange: (values: string[]) => void;
  options: { label: string; value: string }[];
  values: string[];
}) {
  const [query, setQuery] = useState('');
  const filteredOptions = useMemo(
    () => options.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase())),
    [options, query]
  );

  if (!options.length) {
    return <EmptyCard text={emptyLabel} compact />;
  }

  const toggleValue = (value: string) => {
    onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <SearchBox value={query} onChangeText={setQuery} placeholder={`Buscar ${label.toLowerCase()}...`} />
      <View style={styles.multiGrid}>
        {filteredOptions.length ? filteredOptions.map((option, index) => {
          const active = values.includes(option.value);

          return (
            <Pressable key={`${option.value}-${option.label}-${index}`} onPress={() => toggleValue(option.value)} style={[styles.optionChip, active && styles.optionChipActive]}>
              <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>{option.label}</Text>
            </Pressable>
          );
        }) : <Text style={styles.emptyText}>No hay resultados para esa búsqueda.</Text>}
      </View>
    </View>
  );
}

function SearchBox({
  onChangeText,
  placeholder,
  variant = 'default',
  value,
}: {
  onChangeText: (value: string) => void;
  placeholder: string;
  variant?: 'default' | 'approval' | 'projects';
  value: string;
}) {
  const isApproval = variant === 'approval';
  const isProjects = variant === 'projects';

  return (
    <View style={[styles.searchBox, isApproval && styles.approvalSearchBox, isProjects && styles.projectSearchBox]}>
      <View style={isApproval ? styles.approvalSearchIcon : isProjects ? styles.projectSearchIcon : undefined}>
        <MaterialCommunityIcons
          name="magnify"
          size={isApproval || isProjects ? 16 : 17}
          color={isApproval || isProjects ? instructorPalette.primary : instructorPalette.textMuted}
        />
      </View>
      <TextInput
        autoCapitalize="none"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={instructorPalette.textMuted}
        style={[styles.searchInput, isApproval && styles.approvalSearchInput, isProjects && styles.projectSearchInput]}
        value={value}
      />
      {(isApproval || isProjects) && value ? (
        <Pressable onPress={() => onChangeText('')} style={isProjects ? styles.projectSearchClear : styles.approvalSearchClear}>
          <MaterialCommunityIcons name="close" size={14} color={instructorPalette.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function AutoAssignedLearners({
  learners,
  sheetLabel,
}: {
  learners: AcademicUser[];
  sheetLabel: string;
}) {
  const detectedLabel = learners.length === 1 ? 'aprendiz detectado' : 'aprendices detectados';
  const learnerNames = learners.map((learner) => learner.nombre || learner.correo || learner.id);

  return (
    <View style={styles.autoBox}>
      <View style={styles.autoHeader}>
        <View style={styles.autoIcon}>
          <MaterialCommunityIcons name="account-multiple-check-outline" size={17} color={instructorPalette.primary} />
        </View>
        <View style={styles.autoCopy}>
          <Text style={styles.autoTitle}>Aprendices asignados automaticamente</Text>
          <Text style={styles.autoText}>
            Al seleccionar la ficha {sheetLabel}, el proyecto se asigna a todos sus aprendices.
          </Text>
        </View>
        <View style={styles.autoDetectedBadge}>
          <Text style={styles.autoCount}>{learners.length}</Text>
        </View>
      </View>
      <View style={styles.autoLearnerList}>
        <View style={styles.autoLearnerListHeader}>
          <MaterialCommunityIcons name="account-search-outline" size={14} color={instructorPalette.primary} />
          <Text style={styles.autoLearnerListTitle}>{detectedLabel}</Text>
        </View>
        {learners.length ? (
          <View style={styles.autoLearnerChips}>
            {learnerNames.map((name) => (
              <View key={name} style={styles.autoLearnerChip}>
                <Text numberOfLines={1} style={styles.autoLearnerChipText}>{name}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.autoText}>Esta ficha aún no tiene aprendices asignados.</Text>
        )}
      </View>
    </View>
  );
}

function FilePickerField({
  files,
  onPick,
  onRemove,
}: {
  files: ProjectAttachment[];
  onPick: () => void;
  onRemove: (uri: string) => void;
}) {
  return (
    <View style={styles.fileBox}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="file-upload-outline" size={20} color={instructorPalette.primary} />
        <View style={styles.copy}>
          <Text style={styles.fieldLabel}>Archivos del proyecto</Text>
          <Text style={styles.autoText}>Adjunta uno o más PDF, Word o imágenes como guía/evidencia inicial.</Text>
        </View>
      </View>
      {files.length ? (
        <View style={styles.fileList}>
          {files.map((file) => (
            <View key={file.uri || file.nombre} style={styles.fileListItem}>
              <MaterialCommunityIcons name="file-document-outline" size={16} color={instructorPalette.primary} />
              <Text numberOfLines={1} style={styles.fileName}>{file.nombre}</Text>
              <Pressable onPress={() => onRemove(file.uri)} style={styles.removeFileButton}>
                <MaterialCommunityIcons name="close" size={15} color="#C97B63" />
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>Aún no hay archivos seleccionados.</Text>
      )}
      <ActionButton label={files.length ? 'Agregar más archivos' : 'Seleccionar archivos'} onPress={onPick} />
    </View>
  );
}

function ActionButton({
  disabled = false,
  label,
  onPress,
  tone = 'default',
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  tone?: 'default' | 'primary';
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.actionButton, tone === 'primary' && styles.actionButtonPrimary, disabled && styles.actionButtonDisabled]}>
      <Text style={[styles.actionButtonText, tone === 'primary' && styles.actionButtonTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

function ActionButtonOpen({
  disabled = false,
  label,
  onPress,
  tone = 'default',
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  tone?: 'default' | 'primary';
}) {
  const icon = label.toLowerCase().includes('grupo')
    ? 'account-group-outline'
    : 'clipboard-plus-outline';
  const isPrimary = tone === 'primary';

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButtonOpen,
        isPrimary ? styles.actionButtonOpenPrimary : styles.actionButtonOpenSecondary,
        pressed && !disabled && styles.actionButtonOpenPressed,
        disabled && styles.actionButtonOpenDisabled,
      ]}
    >
      <View style={[styles.actionButtonOpenIconWrap, isPrimary && styles.actionButtonOpenIconWrapPrimary]}>
        <MaterialCommunityIcons
          name={icon}
          size={18}
          color={isPrimary ? '#FFFFFF' : '#FFFFFF'}
        />
      </View>

      <Text style={[styles.actionButtonOpenText, isPrimary && styles.actionButtonOpenTextPrimary]}>
        {label}
      </Text>
    </Pressable>
  );
}

function FeedbackBox({ text, tone = 'info' }: { text: string; tone?: 'info' | 'error' }) {
  return (
    <View style={[styles.feedbackBox, tone === 'error' && styles.feedbackBoxError]}>
      <MaterialCommunityIcons name={tone === 'error' ? 'alert-circle-outline' : 'check-circle-outline'} size={18} color={tone === 'error' ? '#C97B63' : instructorPalette.primary} />
      <Text style={styles.feedbackText}>{text}</Text>
    </View>
  );
}

function EmptyCard({ compact = false, text }: { compact?: boolean; text: string }) {
  return (
    <View style={[styles.emptyCard, compact && styles.emptyCardCompact]}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function isWithinLastWeek(fechaFin: string) {
  if (!fechaFin) {
    return false;
  }

  const end = new Date(`${fechaFin}T23:59:59`);
  if (Number.isNaN(end.getTime())) {
    return false;
  }

  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return diffMs >= 0 && diffMs <= sevenDaysMs;
}

function normalizeFileUrl(url?: string | null) {
  let cleanUrl = String(url || '').trim();

  if (!cleanUrl) {
    return '';
  }

  cleanUrl = cleanUrl
    .replace(/^https?:\/(?!\/)/i, (match) => `${match}/`)
    .replace(/^https?:\/\/https?:\/\//i, 'https://');

  if (/^\/\//.test(cleanUrl)) {
    return `https:${cleanUrl}`;
  }

  if (/^https?:\/\//i.test(cleanUrl)) {
    return cleanUrl;
  }

  if (/supabase\.co/i.test(cleanUrl)) {
    return `https://${cleanUrl}`;
  }

  return cleanUrl;
}

function getProjectPublicFileUrl(file: { ruta?: string | null }) {
  const path = String(file.ruta || '').trim().replace(/^\/+/g, '');
  const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/g, '');
  const bucket = String(process.env.EXPO_PUBLIC_PROJECT_FILES_BUCKET || 'biomind-project-files').trim();

  if (!path || !supabaseUrl || !bucket) {
    return '';
  }

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

function getStateTone(state: string) {
  if (state === 'Aprobado') {
    return { accent: instructorPalette.primary, soft: instructorPalette.mint };
  }

  if (state === 'Desaprobado') {
    return { accent: '#C97B63', soft: instructorPalette.peachSurface };
  }

  if (state === 'En proceso') {
    return { accent: instructorPalette.secondary, soft: instructorPalette.softGreen };
  }

  return { accent: instructorPalette.textMuted, soft: '#EFF3FA' };
}

function getTaskTone(state?: string) {
  if (state === 'Validada') {
    return { accent: instructorPalette.primary, soft: instructorPalette.mint };
  }

  if (state === 'Hecho') {
    return { accent: instructorPalette.secondary, soft: instructorPalette.softGreen };
  }

  return { accent: instructorPalette.textMuted, soft: '#EFF3FA' };
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: instructorPalette.surface,
    gap: 15,
    marginHorizontal: -30,
    paddingBottom: 22,
    paddingHorizontal: 39,
    paddingTop: 28,
  },
  heroLabel: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
    letterSpacing: 0.6,
    marginBottom: -5,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: instructorPalette.dark,
    fontFamily: 'SulphurPointBold',
    fontSize: 28,
    lineHeight: 28,
  },
  heroText: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: instructorPalette.backgroundTwo,
    elevation: 3,
    marginHorizontal: -30,
    marginTop: -20,
    paddingHorizontal: 30,
    paddingVertical: 20,
    shadowColor: instructorPalette.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  projectCreateCard: {
    gap: 16,
    paddingHorizontal: 30,
  },
  groupCreateCard: {
    gap: 16,
    paddingHorizontal: 30,
    paddingTop: 22,
  },
  groupIntroText: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    lineHeight: 20,
    marginTop: -6,
  },
  groupFormSection: {
    gap: 12,
  },
  groupMembersPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    gap: 14,
    padding: 16,
    shadowColor: instructorPalette.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  groupMembersHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
  },
  groupMembersIcon: {
    alignItems: 'center',
    backgroundColor: instructorPalette.mint,
    borderRadius: 999,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  groupMembersCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  groupMembersTitle: {
    color: instructorPalette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
    lineHeight: 19,
  },
  groupMembersText: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 16,
  },
  groupMembersBadge: {
    alignItems: 'center',
    backgroundColor: instructorPalette.primary,
    borderRadius: 999,
    height: 30,
    justifyContent: 'center',
    minWidth: 30,
    paddingHorizontal: 9,
  },
  groupMembersBadgeText: {
    color: '#FFFFFF',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  groupActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    paddingTop: 2,
  },
  taskCreateCard: {
    gap: 16,
    paddingHorizontal: 30,
  },
  taskCreateContent: {
    gap: 16,
  },
  taskFormSection: {
    gap: 12,
  },
  taskAttachmentPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    gap: 14,
    padding: 16,
    shadowColor: instructorPalette.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  taskAttachmentHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
  },
  taskAttachmentIcon: {
    alignItems: 'center',
    backgroundColor: instructorPalette.mint,
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  taskAttachmentTitle: {
    color: instructorPalette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
    lineHeight: 19,
  },
  taskAttachmentText: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 16,
  },
  taskAttachmentItem: {
    alignItems: 'center',
    backgroundColor: instructorPalette.surfaceMuted,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 9,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  taskAttachmentFileIcon: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  taskAttachmentRemove: {
    alignItems: 'center',
    backgroundColor: instructorPalette.peachSurface,
    borderRadius: 999,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  taskAttachmentEmpty: {
    backgroundColor: instructorPalette.surfaceMuted,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  taskActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    paddingTop: 2,
  },
  projectFormSection: {
    gap: 12,
    paddingVertical: 7
  },
  projectFormDivider: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 2,
  },
  projectFormDividerLine: {
    backgroundColor: instructorPalette.secondary,
    borderRadius: 999,
    height: 53,
    width: 4,
  },
  projectFormDividerCopy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  projectFormDividerEyebrow: {
    color: instructorPalette.secondary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  projectFormDividerTitle: {
    color: instructorPalette.dark,
    fontFamily: 'SulphurPointBold',
    fontSize: 25,
    lineHeight: 30,
  },
  formCardCompact: {
    backgroundColor: instructorPalette.surface,
    borderRadius: 26,
    gap: 12,
    padding: 10,
    marginTop: 3,
  },
  approvalPanel: {
    gap: 12,
    paddingTop: 16,
  },
  approvalList: {
    gap: 10,
  },
  approvalCard: {
    backgroundColor: instructorPalette.surface,
    borderColor: instructorPalette.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  approvalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
  },
  approvalAvatar: {
    alignItems: 'center',
    backgroundColor: instructorPalette.mint,
    borderRadius: 999,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  approvalCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  approvalName: {
    color: instructorPalette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
    lineHeight: 19,
  },
  approvalMeta: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 16,
  },
  approvalSheetBox: {
    alignItems: 'center',
    backgroundColor: instructorPalette.surfaceMuted,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  approvalSheetCopy: {
    flex: 1,
    gap: 1,
  },
  approvalSheetLabel: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsMedium',
    fontSize: 10,
  },
  approvalSheetText: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  approvalActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  approvalButton: {
    alignItems: 'center',
    backgroundColor: instructorPalette.peachSurface,
    borderRadius: 999,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  approvalButtonPrimary: {
    backgroundColor: instructorPalette.primary,
  },
  approvalButtonDisabled: {
    opacity: 0.5,
  },
  approvalButtonText: {
    color: '#C97B63',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  approvalButtonTextPrimary: {
    color: '#FFFFFF',
  },
  approvalEmpty: {
    alignItems: 'center',
    backgroundColor: instructorPalette.surface,
    borderColor: instructorPalette.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  approvalEmptyIcon: {
    alignItems: 'center',
    backgroundColor: instructorPalette.mint,
    borderRadius: 999,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  approvalEmptyTitle: {
    color: instructorPalette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
    marginTop: 3,
  },
  approvalEmptyText: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
    maxWidth: 280,
    textAlign: 'center',
  },
  academicMenuWrap: {
    backgroundColor: instructorPalette.surface,
    borderBottomColor: instructorPalette.border,
    borderBottomWidth: 1,
    marginBottom: -22,
    marginHorizontal: -31,
    marginTop: 2,
  },
  academicMenu: {
    gap: 18,
    paddingHorizontal: 28,
  },
  academicMenuItem: {
    alignItems: 'center',
    gap: 6,
    paddingBottom: 12,
    paddingTop: 6,
    width: 92,
  },
  academicMenuIconWrap: {
    alignItems: 'center',
    backgroundColor: instructorPalette.mint,
    borderRadius: 999,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  academicMenuIconWrapActive: {
    backgroundColor: instructorPalette.primary,
  },
  academicMenuText: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsMedium',
    fontSize: 11,
    height: 28,
    lineHeight: 14,
    textAlign: 'center',
  },
  academicMenuTextActive: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsSemiBold',
  },
  academicMenuUnderline: {
    backgroundColor: 'transparent',
    borderRadius: 2,
    height: 3,
    width: '100%',
  },
  academicMenuUnderlineActive: {
    backgroundColor: instructorPalette.primary,
  },
  attachmentPanel: {
    backgroundColor: instructorPalette.background,
    borderColor: instructorPalette.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  formLabel: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  helperText: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 17,
  },
  attachmentList: {
    gap: 8,
  },
  attachmentItem: {
    alignItems: 'center',
    backgroundColor: instructorPalette.surface,
    borderColor: instructorPalette.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 38,
    paddingHorizontal: 10,
  },
  attachmentText: {
    color: instructorPalette.text,
    flex: 1,
    fontFamily: 'PoppinsMedium',
    fontSize: 11,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  tasksPanel: {
    backgroundColor: '#F7FBF9',
    borderColor: instructorPalette.border,
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    padding: 14,
  },
  taskListPanel: {
    gap: 14,
  },
  taskListFilterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    gap: 12,
    padding: 16,
    shadowColor: instructorPalette.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  taskListFilterHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
  },
  taskListHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pasanteTaskCard: {
    backgroundColor: instructorPalette.surface,
    borderColor: instructorPalette.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    padding: 18,
    shadowColor: instructorPalette.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  taskCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  taskCardIcon: {
    alignItems: 'center',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  taskDescriptionBox: {
    backgroundColor: instructorPalette.surfaceMuted,
    borderRadius: 14,
    gap: 5,
    padding: 12,
  },
  taskDescriptionLabel: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  taskNote: {
    alignItems: 'flex-start',
    backgroundColor: instructorPalette.surfaceMuted,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 9,
    padding: 12,
  },
  taskNoteLabel: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  taskNoteText: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 17,
  },
  taskObservationBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    gap: 8,
  },
  taskObservationComposer: {
    alignItems: 'flex-end',
    backgroundColor: instructorPalette.surfaceMuted,
    borderColor: instructorPalette.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 7,
    paddingLeft: 14,
  },
  taskObservationInput: {
    color: instructorPalette.text,
    flex: 1,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    maxHeight: 100,
    minHeight: 32,
    paddingVertical: 6,
  },
  taskObservationSend: {
    alignItems: 'center',
    backgroundColor: instructorPalette.primary,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  taskObservationSendDisabled: {
    opacity: 0.35,
  },
  taskCardActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    justifyContent: 'center',
  },
  taskAttachmentList: {
    gap: 8,
  },
  taskAttachmentGroupTitle: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
    marginTop: 3,
  },
  taskImageButton: {
    borderRadius: 14,
    height: 180,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  taskImagePreview: {
    height: '100%',
    width: '100%',
  },
  taskImageOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.48)',
    borderRadius: 15,
    bottom: 9,
    height: 30,
    justifyContent: 'center',
    position: 'absolute',
    right: 9,
    width: 30,
  },
  attachmentPickerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attachmentPickerButton: {
    alignItems: 'center',
    backgroundColor: instructorPalette.surfaceMuted,
    borderColor: instructorPalette.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  attachmentPickerText: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsLight',
    fontWeight: 700,
    fontSize: 13,
  },
  fieldInput: {
    backgroundColor: '#FFFFFF',
    borderColor: instructorPalette.textMutedTwo,
    borderRadius: 16,
    borderWidth: 1,
    color: instructorPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fieldInputMultiline: {
    minHeight: 86,
    textAlignVertical: 'top',
  },
  fieldInputActive: {
    backgroundColor: '#FFFFFF',
    borderColor: instructorPalette.secondary,
  },
  selectorTrigger: {
    alignItems: 'center',
    backgroundColor: instructorPalette.surface,
    borderColor: instructorPalette.textMutedTwo,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    minHeight: 46,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  selectorTriggerText: {
    color: instructorPalette.text,
    flex: 1,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  selectorDropdown: {
    backgroundColor: instructorPalette.surface,
    borderColor: instructorPalette.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 10,
  },
  selectorOptions: {
    gap: 9,
    maxHeight: 260,
  },
  selectorOption: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: instructorPalette.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  selectorOptionActive: {
    backgroundColor: '#FFFFFF',
    borderColor: instructorPalette.primary,
    borderWidth: 2,
  },
  selectorOptionText: {
    color: instructorPalette.text,
    flex: 1,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
    lineHeight: 17,
  },
  selectorOptionTextActive: {
    color: instructorPalette.primary,
  },
  segmented: {
    backgroundColor: instructorPalette.secondaryTwo,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    padding: 5,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 999,
    flex: 1,
    paddingVertical: 9,
  },
  segmentButtonActive: {
    backgroundColor: instructorPalette.primary,
  },
  segmentText: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  multiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    maxHeight: 230,
  },
  sheetFilterCard: {
    backgroundColor: instructorPalette.surface,
    borderColor: instructorPalette.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  sheetFilterChip: {
    backgroundColor: instructorPalette.surfaceMuted,
    borderColor: instructorPalette.border,
    borderRadius: 16,
    borderWidth: 1,
    flexGrow: 1,
    flexBasis: '45%',
    gap: 2,
    minHeight: 64,
    padding: 12,
  },
  sheetFilterChipActive: {
    backgroundColor: instructorPalette.mint,
    borderColor: instructorPalette.primary,
  },
  sheetFilterText: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  sheetFilterSubtext: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 10,
    lineHeight: 14,
  },
  sheetFilterTextActive: {
    color: instructorPalette.primary,
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: instructorPalette.surfaceMuted,
    borderColor: instructorPalette.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    marginTop: 7,
    paddingVertical: 9,
  },
  approvalSearchBox: {
    backgroundColor: instructorPalette.surface,
    borderColor: instructorPalette.textMutedTwo,
    borderRadius: 100,
    gap: 9,
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  projectSearchBox: {
    backgroundColor: instructorPalette.surface,
    borderColor: instructorPalette.textMutedTwo,
    borderRadius: 100,
    gap: 9,
    marginTop: 2,
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  approvalSearchIcon: {
    alignItems: 'center',
    backgroundColor: instructorPalette.mint,
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  projectSearchIcon: {
    alignItems: 'center',
    backgroundColor: instructorPalette.surfaceMuted,
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  searchInput: {
    color: instructorPalette.text,
    flex: 1,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    padding: 0,
  },
  approvalSearchInput: {
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
    minHeight: 32,
  },
  projectSearchInput: {
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
    minHeight: 32,
  },
  approvalSearchClear: {
    alignItems: 'center',
    backgroundColor: instructorPalette.surfaceMuted,
    borderRadius: 999,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  projectSearchClear: {
    alignItems: 'center',
    backgroundColor: instructorPalette.surfaceMuted,
    borderRadius: 999,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  listHint: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsMedium',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  autoBox: {
    backgroundColor: instructorPalette.surface,
    borderColor: instructorPalette.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  autoHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 9,
  },
  autoIcon: {
    alignItems: 'center',
    backgroundColor: instructorPalette.surfaceMuted,
    borderColor: instructorPalette.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  autoCopy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  autoTitle: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  autoText: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 17,
  },
  autoDetectedBadge: {
    alignItems: 'center',
    backgroundColor: instructorPalette.mint,
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    minWidth: 28,
    paddingHorizontal: 9,
  },
  autoCount: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  autoLearnerList: {
    backgroundColor: instructorPalette.surfaceMuted,
    borderRadius: 12,
    gap: 8,
    padding: 10,
  },
  autoLearnerListHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  autoLearnerListTitle: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  autoLearnerChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  autoLearnerChip: {
    backgroundColor: instructorPalette.surface,
    borderRadius: 999,
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  autoLearnerChipText: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsMedium',
    fontSize: 11,
  },
  fileBox: {
    backgroundColor: '#FCFFFE',
    borderColor: instructorPalette.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  fileName: {
    color: instructorPalette.primary,
    flex: 1,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
    lineHeight: 18,
  },
  fileList: {
    gap: 8,
  },
  fileListItem: {
    alignItems: 'center',
    backgroundColor: instructorPalette.mint,
    borderRadius: 13,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  removeFileButton: {
    alignItems: 'center',
    backgroundColor: instructorPalette.peachSurface,
    borderRadius: 999,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  fileLink: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: instructorPalette.mint,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 7,
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  fileLinkText: {
    color: instructorPalette.primary,
    flexShrink: 1,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  optionChip: {
    backgroundColor: instructorPalette.surfaceMuted,
    borderColor: instructorPalette.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  optionChipActive: {
    backgroundColor: instructorPalette.mint,
    borderColor: instructorPalette.primary,
  },
  optionChipText: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsMedium',
    fontSize: 11,
  },
  optionChipTextActive: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
  },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginTop: 6,
  },
  actionButton: {
    backgroundColor: instructorPalette.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionButtonPrimary: {
    backgroundColor: instructorPalette.primary,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  actionButtonTextPrimary: {
    color: '#FFFFFF',
  },

  actionButtonOpen: {
    minHeight: 54,
    borderRadius: 22,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexBasis: '47%',
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,

    elevation: 2,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  actionButtonOpenPrimary: {
    backgroundColor: instructorPalette.primary,
    shadowColor: instructorPalette.primary,
  },
  actionButtonOpenSecondary: {
    backgroundColor: '#5F9C8F',
    borderWidth: 1,
    borderColor: '#5F9C8F',
    shadowColor: instructorPalette.primary,
  },
  actionButtonOpenPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  actionButtonOpenDisabled: {
    opacity: 0.5,
  },
  actionButtonOpenIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  actionButtonOpenIconWrapPrimary: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  actionButtonOpenText: {
    color: instructorPalette.background,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
    flexShrink: 1,
    textAlign: 'center',
  },
  actionButtonOpenTextPrimary: {
    color: '#FFFFFF',
  },
  stack: {
    gap: 12,
  },
  hidden: {
    display: 'none',
  },
  detailPanel: {
    backgroundColor: instructorPalette.surface,
    borderColor: instructorPalette.textMutedTwo,
    borderRadius: 18,
    borderWidth: 1,
    gap: 16,
    padding: 22,
  },
  detailPanelHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  detailPanelTitle: {
    color: instructorPalette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 17,
    lineHeight: 22,
  },
  detailPanelText: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  subBlockTitle: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  projectCard: {
    borderRadius: 18,
  },
  projectInner: {
    backgroundColor: instructorPalette.surface,
    borderColor: instructorPalette.textMutedTwo,
    borderRadius: 18,
    borderWidth: 1,
    elevation: 2,
    gap: 14,
    overflow: 'hidden',
    padding: 24,
    shadowColor: instructorPalette.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 7,
  },
  projectInnerActive: {
    backgroundColor: '#FCFFFE',
    borderColor: instructorPalette.primary,
  },
  projectSheetMenu: {
    gap: 10,
    paddingVertical: 4,
  },
  projectSheetPill: {
    alignItems: 'center',
    backgroundColor: instructorPalette.surface,
    borderColor: instructorPalette.border,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 124,
    paddingHorizontal: 18,
  },
  projectSheetPillActive: {
    backgroundColor: instructorPalette.primary,
    borderColor: instructorPalette.primary,
  },
  projectSheetPillText: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  projectSheetPillTextActive: {
    color: '#FFFFFF',
  },
  groupCard: {
    backgroundColor: instructorPalette.surface,
    borderColor: instructorPalette.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    padding: 18,
    shadowColor: instructorPalette.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  groupCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  groupCardIcon: {
    alignItems: 'center',
    backgroundColor: instructorPalette.mint,
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  groupHeaderActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  groupCountPill: {
    alignItems: 'center',
    backgroundColor: instructorPalette.surfaceMuted,
    borderRadius: 999,
    height: 30,
    justifyContent: 'center',
    minWidth: 30,
    paddingHorizontal: 8,
  },
  groupCountText: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
    lineHeight: 19,
  },
  subtitle: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 17,
  },
  meta: {
    gap: 8,
  },
  projectMetaPanel: {
    backgroundColor: instructorPalette.surfaceMuted,
    borderRadius: 14,
    gap: 8,
    padding: 16,
  },
  projectFooter: {
    gap: 9,
  },
  projectFiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  stateButton: {
    backgroundColor: instructorPalette.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  stateButtonText: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 10,
  },
  autoStateText: {
    color: instructorPalette.textMuted,
    flex: 1,
    fontFamily: 'PoppinsRegular',
    fontSize: 10,
    lineHeight: 15,
    minWidth: 160,
  },
  editButton: {
    backgroundColor: instructorPalette.mint,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  editButtonText: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  deleteButton: {
    backgroundColor: '#FCE8E3',
  },
  deleteButtonText: {
    color: '#B65343',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 10,
  },
  memberList: {
    gap: 8,
  },
  memberSectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: -4,
  },
  memberSectionTitle: {
    color: instructorPalette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  memberSectionMeta: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
  },
  memberRow: {
    alignItems: 'center',
    backgroundColor: instructorPalette.surfaceMuted,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 9,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  memberAvatar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  memberName: {
    color: instructorPalette.text,
    flex: 1,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
  },
  memberRemoveButton: {
    alignItems: 'center',
    backgroundColor: instructorPalette.peachSurface,
    borderRadius: 999,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  feedbackBox: {
    alignItems: 'center',
    backgroundColor: instructorPalette.mint,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 2,
    padding: 14,
  },
  feedbackBoxError: {
    backgroundColor: instructorPalette.peachSurface,
  },
  feedbackText: {
    color: instructorPalette.text,
    flex: 1,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
    lineHeight: 18,
  },
  groupsPanel: {
    gap: 14,
    paddingTop: 2,
  },
  panelHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  panelTitle: {
    color: instructorPalette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 16,
  },
  panelText: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  groupsPanelIcon: {
    alignItems: 'center',
    backgroundColor: instructorPalette.mint,
    borderRadius: 999,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  emptyCard: {
    backgroundColor: instructorPalette.surface,
    borderColor: instructorPalette.border,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  emptyCardCompact: {
    backgroundColor: instructorPalette.surfaceMuted,
    padding: 12,
  },
  emptyText: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  loadingOverlay: {
    alignItems: 'center',
    backgroundColor: instructorPalette.surface,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    padding: 14,
  },
  loadingText: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  trackingSelectorCard: {
    backgroundColor: instructorPalette.surface,
    borderColor: instructorPalette.textMutedTwo,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  trackingSearch: {
    alignItems: 'center',
    backgroundColor: instructorPalette.surfaceMuted,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 13,
  },
  trackingSearchInput: {
    color: instructorPalette.text,
    flex: 1,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    minHeight: 44,
  },
  trackingOptions: {
    gap: 8,
  },
  trackingProjectButton: {
    backgroundColor: instructorPalette.surfaceMuted,
    borderColor: 'transparent',
    borderRadius: 15,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  trackingProjectButtonActive: {
    backgroundColor: instructorPalette.mint,
    borderColor: instructorPalette.primary,
  },
  trackingProjectText: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  trackingProjectMeta: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 10,
  },
  trackingProjectTextActive: {
    color: instructorPalette.primary,
  },
  progressDashboard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  progressMetric: {
    backgroundColor: instructorPalette.surface,
    borderColor: instructorPalette.textMutedTwo,
    borderRadius: 16,
    borderWidth: 1,
    flexBasis: '31%',
    flexGrow: 1,
    gap: 8,
    minWidth: 105,
    padding: 11,
  },
  progressMetricHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressMetricIcon: {
    alignItems: 'center',
    backgroundColor: instructorPalette.surfaceMuted,
    borderRadius: 999,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  progressMetricValue: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 15,
  },
  progressMetricLabel: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsMedium',
    fontSize: 10,
    lineHeight: 15,
  },
  learnerFilterWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  learnerFilterCard: {
    backgroundColor: instructorPalette.surface,
    borderColor: instructorPalette.textMutedTwo,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  learnerFilter: {
    alignItems: 'center',
    backgroundColor: instructorPalette.surfaceMuted,
    borderColor: instructorPalette.border,
    borderWidth: 1,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 7,
    maxWidth: '100%',
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  learnerFilterActive: {
    backgroundColor: instructorPalette.primary,
  },
  learnerFilterText: {
    color: instructorPalette.text,
    flexShrink: 1,
    fontFamily: 'PoppinsMedium',
    fontSize: 11,
  },
  learnerFilterTextActive: {
    color: '#FFFFFF',
  },
  learnerFilterCount: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 10,
  },
});
