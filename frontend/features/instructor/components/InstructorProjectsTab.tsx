import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  cambiarEstadoProyecto,
  escucharContextoAcademicoUsuario,
  escucharGruposTrabajo,
  escucharProyectos,
  guardarGrupoTrabajo,
  guardarProyectoAcademico,
  quitarIntegranteGrupo,
} from '@/services/academic';
import type { AuthenticatedSession } from '@/features/workspace/types';
import { instructorPalette } from '../theme';
import { IconLabel, ProgressBar, SectionHeading, StatusBadge } from './InstructorUI';
import { BitacorasReviewPanel } from '@/features/workspace/components/BitacorasReviewPanel';
// @ts-ignore
import { escucharBitacoras } from '@/services/bitacoras';

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
};

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
  estado?: 'Pendiente' | 'En proceso' | 'Aprobado' | 'Desaprobado';
  progreso?: number;
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

type ProjectState = 'Pendiente' | 'En proceso' | 'Aprobado' | 'Desaprobado';

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
};

const emptyGroupForm: GroupForm = {
  id: '',
  nombre: '',
  fichaId: '',
  aprendizIds: [],
};

const projectStates: ProjectState[] = ['Pendiente', 'En proceso', 'Aprobado', 'Desaprobado'];

export function InstructorProjectsTab({ session }: { session: AuthenticatedSession }) {
  const [sheets, setSheets] = useState<AcademicSheet[]>([]);
  const [learners, setLearners] = useState<AcademicUser[]>([]);
  const [competences, setCompetences] = useState<AcademicCompetence[]>([]);
  const [raps, setRaps] = useState<AcademicRap[]>([]);
  const [projects, setProjects] = useState<AcademicProject[]>([]);
  const [groups, setGroups] = useState<WorkGroup[]>([]);
  const [bitacoras, setBitacoras] = useState<AcademicBitacora[]>([]);
  const [projectForm, setProjectForm] = useState<ProjectForm>(emptyProjectForm);
  const [groupForm, setGroupForm] = useState<GroupForm>(emptyGroupForm);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedListSheetId, setSelectedListSheetId] = useState('');
  const [selectedLearnerId, setSelectedLearnerId] = useState('');
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribeContext = escucharContextoAcademicoUsuario(
      session,
      (context: any) => {
        setSheets(context.fichas || []);
        setLearners(context.aprendices || []);
        setCompetences(context.competencias || []);
        setRaps(context.resultados || []);
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
    const unsubscribeBitacoras = escucharBitacoras(
      setBitacoras,
      (bitacorasError: any) => setError(bitacorasError?.message || 'No pudimos cargar las bitácoras.')
    );

    return () => {
      unsubscribeContext?.();
      unsubscribeProjects?.();
      unsubscribeGroups?.();
      unsubscribeBitacoras?.();
    };
  }, [session]);

  useEffect(() => {
    setProjectForm((current) => ({
      ...current,
      fichaId: current.fichaId || sheets[0]?.id || '',
      competenciaId: current.competenciaId || competences[0]?.id || '',
    }));
    setGroupForm((current) => ({
      ...current,
      fichaId: current.fichaId || sheets[0]?.id || '',
    }));
    setSelectedListSheetId((current) => current || sheets[0]?.id || '');
  }, [competences, sheets]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || projects[0],
    [projects, selectedProjectId]
  );
  const selectedProjectFicha = useMemo(
    () => sheets.find((sheet) => sheet.id === projectForm.fichaId),
    [projectForm.fichaId, sheets]
  );
  const selectedProjectCompetence = useMemo(
    () => competences.find((competence) => competence.id === projectForm.competenciaId),
    [competences, projectForm.competenciaId]
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
    () => raps.filter((rap) => rap.competenciaId === projectForm.competenciaId),
    [projectForm.competenciaId, raps]
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
    () => projects.filter((project) => project.fichaId === selectedListSheetId),
    [projects, selectedListSheetId]
  );
  const filteredGroups = useMemo(
    () => groups.filter((group) => group.fichaId === selectedListSheetId),
    [groups, selectedListSheetId]
  );
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

    return new Set(
      selectedTrackingProject.asignacionTipo === 'grupo'
        ? selectedProjectGroup?.aprendizIds || []
        : selectedTrackingProject.aprendizIds || []
    );
  }, [selectedProjectGroup?.aprendizIds, selectedTrackingProject]);
  const trackingLearners = useMemo(
    () => learners.filter((learner) => learnerIdsForSelectedProject.has(learner.id)),
    [learnerIdsForSelectedProject, learners]
  );
  const allProjectBitacoras = useMemo(
    () => bitacoras.filter((bitacora) => bitacora.proyectoId === selectedTrackingProject?.id),
    [bitacoras, selectedTrackingProject?.id]
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

  const runAction = async (action: () => Promise<void>, successMessage: string) => {
    setSaving(true);
    setFeedback('');
    setError('');

    try {
      await action();
      setFeedback(successMessage);
    } catch (actionError: any) {
      setFeedback(actionError?.message || 'No pudimos completar la accion.');
    } finally {
      setSaving(false);
    }
  };

  const saveProject = () => runAction(async () => {
    const automaticLearnerIds = learnersForProjectSheet.map((learner) => learner.id);

    await guardarProyectoAcademico({
      ...projectForm,
      instructorUid: session.uid,
      fichaNumero: selectedProjectFicha?.numero || '',
      competenciaNombre: selectedProjectCompetence?.nombre || selectedProjectCompetence?.codigo || '',
      rapDescripcion: selectedProjectRap?.descripcion || selectedProjectRap?.codigo || '',
      aprendizIds: projectForm.asignacionTipo === 'aprendices' ? automaticLearnerIds : [],
      estado: 'Pendiente',
      progreso: 0,
    });
    setProjectForm({
      ...emptyProjectForm,
      fichaId: projectForm.fichaId,
      competenciaId: projectForm.competenciaId,
      rapId: projectForm.rapId,
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
      multiple: false,
      type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/*'],
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const file = result.assets[0];
    setProjectForm((current) => ({
      ...current,
      archivoNombre: file.name || 'Archivo adjunto',
      archivoUri: file.uri || '',
      archivoMimeType: file.mimeType || '',
    }));
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
    });
    setProjectFormOpen(true);
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

  const setProjectState = (project: AcademicProject, state: ProjectState) => runAction(
    () => cambiarEstadoProyecto(project.id, state),
    `Proyecto marcado como ${state.toLowerCase()}.`
  );

  const removeLearnerFromGroup = (groupId: string, learnerId: string) => runAction(
    () => quitarIntegranteGrupo(groupId, learnerId),
    'Integrante retirado del grupo.'
  );

  return (
    <>
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>GESTIÓN ACADÉMICA</Text>
        <Text style={styles.heroTitle}>Proyectos, grupos y seguimiento.</Text>
        <Text style={styles.heroText}>
          Administra proyectos y grupos, consulta avances y revisa las bitácoras de cada aprendiz por ficha y proyecto.
        </Text>
      </View>

      {error ? <FeedbackBox text={error} tone="error" /> : null}
      {feedback ? <FeedbackBox text={feedback} /> : null}

      <View style={styles.quickActions}>
        <ActionButtonOpen
          label="Crear proyecto"
          onPress={() => setProjectFormOpen(true)}
          tone="primary"
        />
        <ActionButtonOpen
          label="Crear grupo de trabajo"
          onPress={() => setGroupFormOpen(true)}
        />
      </View>

      {projectFormOpen ? (
        <View style={styles.formCard}>
          <Pressable onPress={() => setProjectFormOpen(false)} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={20} color={instructorPalette.primary} />
          </Pressable>
          <SectionHeading
            actionLabel={projectForm.id ? 'Editando' : 'Nuevo'}
            subtitle="Asocia el proyecto a ficha, competencia, RAP y destinatarios."
            title="Crear proyecto"
          />
          <Field label="Nombre del proyecto" value={projectForm.titulo} onChangeText={(titulo) => setProjectForm((current) => ({ ...current, titulo }))} placeholder="Propagacion in vitro de orquideas" />
          <Field label="Descripción" value={projectForm.descripcion} onChangeText={(descripcion) => setProjectForm((current) => ({ ...current, descripcion }))} placeholder="Objetivo, cultivo o evidencia esperada" multiline />

          <OptionPicker
            emptyLabel="Primero el administrador debe asignarte una ficha."
            label="Ficha"
            options={sheets.map((sheet) => ({ label: `Ficha ${sheet.numero || sheet.id} - ${sheet.programaNombre || 'Sin programa'}`, value: sheet.id }))}
            value={projectForm.fichaId}
            onChange={(fichaId) => setProjectForm((current) => ({ ...current, fichaId, grupoId: '' }))}
          />
          <OptionPicker
            emptyLabel="Primero deben asignarte competencias."
            label="Competencia"
            options={competences.map((competence) => ({ label: `${competence.codigo || 'Competencia'} - ${competence.nombre || ''}`, value: competence.id }))}
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
            fileName={projectForm.archivoNombre}
            onPick={pickProjectFile}
          />

          <View style={styles.actionRow}>
            <ActionButton disabled={saving} label={projectForm.id ? 'Actualizar proyecto' : 'Crear proyecto'} onPress={saveProject} tone="primary" />
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
        <View style={styles.formCard}>
          <Pressable onPress={() => setGroupFormOpen(false)} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={20} color={instructorPalette.primary} />
          </Pressable>
          <SectionHeading
            actionLabel={groupForm.id ? 'Editando' : 'Nuevo'}
            subtitle="Crea grupos dentro de una ficha para asignar proyectos colaborativos."
            title="Grupos de trabajo"
          />
          <Field label="Nombre del grupo" value={groupForm.nombre} onChangeText={(nombre) => setGroupForm((current) => ({ ...current, nombre }))} placeholder="Grupo Orquideas A" />
          <OptionPicker
            emptyLabel="Primero el administrador debe asignarte una ficha."
            label="Ficha del grupo"
            options={sheets.map((sheet) => ({ label: `Ficha ${sheet.numero || sheet.id}`, value: sheet.id }))}
            value={groupForm.fichaId}
            onChange={(fichaId) => setGroupForm((current) => ({ ...current, fichaId, aprendizIds: [] }))}
          />
          <MultiPicker
            emptyLabel="No hay aprendices en esta ficha."
            label="Integrantes"
            options={learnersForGroupSheet.map((learner) => ({ label: learner.nombre || learner.correo || learner.id, value: learner.id }))}
            values={groupForm.aprendizIds}
            onChange={(aprendizIds) => setGroupForm((current) => ({ ...current, aprendizIds }))}
          />
          <View style={styles.actionRow}>
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

      <SectionHeading
        actionLabel={selectedListSheet ? `Ficha ${selectedListSheet.numero || selectedListSheet.id}` : 'Sin ficha'}
        subtitle="Selecciona una ficha para ver solo sus proyectos y grupos."
        title="Filtrar por ficha"
      />

      <SheetSelector
        selectedSheetId={selectedListSheetId}
        sheets={sheets}
        onSelect={setSelectedListSheetId}
      />

      <SectionHeading
        actionLabel={`${filteredProjects.length} registrados`}
        subtitle="Solo se muestran los proyectos de la ficha seleccionada."
        title="Proyectos"
      />

      <View style={styles.stack}>
        {filteredProjects.length ? filteredProjects.map((project, index) => (
          <ProjectCard
            key={`${project.id}-${project.fichaId || 'sin-ficha'}-${index}`}
            groups={groups}
            learners={learners}
            project={project}
            selected={project.id === selectedProject?.id}
            onEdit={() => editProject(project)}
            onSelect={() => setSelectedProjectId(project.id)}
            onStateChange={(state) => setProjectState(project, state)}
          />
        )) : <EmptyCard text="Aún no hay proyectos creados para esta ficha." />}
      </View>

      <SectionHeading
        actionLabel={`${filteredGroups.length} activos`}
        subtitle="Solo se muestran los grupos de la ficha seleccionada."
        title="Grupos creados"
      />

      <View style={styles.stack}>
        {filteredGroups.length ? filteredGroups.map((group, index) => (
          <GroupCard
            group={group}
            key={`${group.id}-${group.fichaId || 'sin-ficha'}-${index}`}
            learners={learners}
            onEdit={() => editGroup(group)}
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

          <BitacorasReviewPanel bitacoras={projectBitacoras} session={session} />
        </>
      ) : (
        <EmptyCard text="Selecciona una ficha que tenga proyectos para consultar su seguimiento." />
      )}

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
  return (
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
      {learners.map((learner) => {
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
    </View>
  );
}

function ProjectCard({
  groups,
  learners,
  onEdit,
  onSelect,
  onStateChange,
  project,
  selected,
}: {
  groups: WorkGroup[];
  learners: AcademicUser[];
  onEdit: () => void;
  onSelect: () => void;
  onStateChange: (state: ProjectState) => void;
  project: AcademicProject;
  selected: boolean;
}) {
  const assignedGroup = groups.find((group) => group.id === project.grupoId);
  const assignedLearners = learners.filter((learner) => (project.aprendizIds || []).includes(learner.id));
  const stateTone = getStateTone(project.estado || 'Pendiente');

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
          <StatusBadge accent={stateTone.accent} label={project.estado || 'Pendiente'} soft={stateTone.soft} />
        </View>

        <ProgressBar accent={stateTone.accent} progress={Number(project.progreso || 0)} soft="#EFF3FA" />

        <View style={styles.meta}>
          <IconLabel icon="book-check-outline" text={project.competenciaNombre || 'Competencia pendiente'} />
          <IconLabel icon="format-list-checks" text={project.rapDescripcion || 'RAP pendiente'} />
          {project.archivoNombre ? (
            <IconLabel icon="file-document-outline" text={`Archivo: ${project.archivoNombre}`} />
          ) : null}
          <IconLabel
            icon={project.asignacionTipo === 'grupo' ? 'account-group-outline' : 'account-multiple-outline'}
            text={project.asignacionTipo === 'grupo'
              ? `Grupo: ${assignedGroup?.nombre || 'pendiente'}`
              : `Aprendices: ${assignedLearners.map((learner) => learner.nombre || learner.correo).filter(Boolean).join(', ') || 'pendientes'}`}
          />
        </View>

        <View style={styles.stateRow}>
          {projectStates.map((state) => (
            <Pressable key={state} onPress={() => onStateChange(state)} style={styles.stateButton}>
              <Text style={styles.stateButtonText}>{state}</Text>
            </Pressable>
          ))}
          <Pressable onPress={onEdit} style={[styles.stateButton, styles.editButton]}>
            <Text style={[styles.stateButtonText, styles.editButtonText]}>Editar</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

function GroupCard({
  group,
  learners,
  onEdit,
  onRemoveLearner,
}: {
  group: WorkGroup;
  learners: AcademicUser[];
  onEdit: () => void;
  onRemoveLearner: (learnerId: string) => void;
}) {
  const members = learners.filter((learner) => (group.aprendizIds || []).includes(learner.id));

  return (
    <View style={styles.groupCard}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: instructorPalette.mint }]}>
          <MaterialCommunityIcons name="account-group-outline" size={18} color={instructorPalette.primary} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{group.nombre || 'Grupo sin nombre'}</Text>
          <Text style={styles.subtitle}>Ficha {group.fichaNumero || group.fichaId || 'sin ficha'}</Text>
        </View>
        <Pressable onPress={onEdit} style={styles.editButton}>
          <Text style={styles.editButtonText}>Editar</Text>
        </Pressable>
      </View>

      <View style={styles.memberList}>
        {members.length ? members.map((learner) => (
          <View key={learner.id} style={styles.memberRow}>
            <Text style={styles.memberName}>{learner.nombre || learner.correo || learner.id}</Text>
            <Pressable onPress={() => onRemoveLearner(learner.id)}>
              <MaterialCommunityIcons name="close-circle-outline" size={20} color="#C97B63" />
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

function Field({
  label,
  multiline = false,
  onChangeText,
  placeholder,
  value,
}: {
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
  value,
}: {
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={styles.searchBox}>
      <MaterialCommunityIcons name="magnify" size={17} color={instructorPalette.textMuted} />
      <TextInput
        autoCapitalize="none"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={instructorPalette.textMuted}
        style={styles.searchInput}
        value={value}
      />
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
  return (
    <View style={styles.autoBox}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="account-multiple-check-outline" size={18} color={instructorPalette.primary} />
        <View style={styles.copy}>
          <Text style={styles.autoTitle}>Aprendices asignados automaticamente</Text>
          <Text style={styles.autoText}>
            Al seleccionar la ficha {sheetLabel}, el proyecto se asigna a todos sus aprendices.
          </Text>
        </View>
      </View>
      <Text style={styles.autoCount}>{learners.length} aprendiz/ces detectados</Text>
      {learners.length ? (
        <Text style={styles.autoText}>
          {learners.map((learner) => learner.nombre || learner.correo || learner.id).join(', ')}
        </Text>
      ) : (
        <Text style={styles.autoText}>Esta ficha aún no tiene aprendices asignados.</Text>
      )}
    </View>
  );
}

function FilePickerField({
  fileName,
  onPick,
}: {
  fileName: string;
  onPick: () => void;
}) {
  return (
    <View style={styles.fileBox}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="file-upload-outline" size={20} color={instructorPalette.primary} />
        <View style={styles.copy}>
          <Text style={styles.fieldLabel}>Archivo del proyecto</Text>
          <Text style={styles.autoText}>Adjunta PDF, Word o imagen como guia/evidencia inicial.</Text>
        </View>
      </View>
      {fileName ? <Text style={styles.fileName}>{fileName}</Text> : <Text style={styles.emptyText}>Aún no hay archivo seleccionado.</Text>}
      <ActionButton label={fileName ? 'Cambiar archivo' : 'Seleccionar archivo'} onPress={onPick} />
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

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: 'transparent',
    gap: 8,
    marginBottom: -8,
    marginHorizontal: -30,
    paddingHorizontal: 37,
    paddingVertical: 20,
  },
  heroLabel: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
    letterSpacing: 0.6,
    marginBottom: 6,
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
    backgroundColor: instructorPalette.surface,
    elevation: 3,
    gap: 12,
    marginHorizontal: -30,
    paddingHorizontal: 30,
    paddingVertical: 20,
    shadowColor: instructorPalette.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  closeButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: instructorPalette.mint,
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    marginBottom: -30,
    width: 34,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  fieldInput: {
    backgroundColor: '#fbfbfb',
    borderColor: '#d2d2d2',
    borderRadius: 20,
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
  segmented: {
    backgroundColor: instructorPalette.surfaceMuted,
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
  },
  sheetFilterCard: {
    backgroundColor: instructorPalette.surface,
    borderColor: instructorPalette.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  sheetFilterChip: {
    backgroundColor: instructorPalette.surfaceMuted,
    borderColor: instructorPalette.border,
    borderRadius: 18,
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
    paddingVertical: 9,
  },
  searchInput: {
    color: instructorPalette.text,
    flex: 1,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    padding: 0,
  },
  autoBox: {
    backgroundColor: instructorPalette.mint,
    borderColor: instructorPalette.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 9,
    padding: 14,
  },
  autoTitle: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  autoText: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  autoCount: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
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
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
    lineHeight: 18,
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
    minHeight: 56,
    borderRadius: 18,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,

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
    backgroundColor: instructorPalette.lavanderText,
    borderWidth: 1.5,
    borderColor: instructorPalette.lavanderText,
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
    fontSize: 12.5,
  },
  actionButtonOpenTextPrimary: {
    color: '#FFFFFF',
  },
  stack: {
    gap: 12,
  },
  projectCard: {
    borderRadius: 24,
  },
  projectInner: {
    backgroundColor: instructorPalette.surface,
    borderRadius: 24,
    elevation: 3,
    gap: 12,
    padding: 16,
    shadowColor: instructorPalette.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  projectInnerActive: {
    backgroundColor: '#FCFFFE',
    borderColor: instructorPalette.secondary,
    borderWidth: 1,
  },
  groupCard: {
    backgroundColor: instructorPalette.surface,
    borderRadius: 24,
    elevation: 3,
    gap: 12,
    padding: 16,
    shadowColor: instructorPalette.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
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
  stateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  editButton: {
    backgroundColor: instructorPalette.mint,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editButtonText: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  memberList: {
    gap: 8,
  },
  memberRow: {
    alignItems: 'center',
    backgroundColor: instructorPalette.surfaceMuted,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    padding: 10,
  },
  memberName: {
    color: instructorPalette.text,
    flex: 1,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
  },
  feedbackBox: {
    alignItems: 'center',
    backgroundColor: instructorPalette.mint,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
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
    borderRadius: 22,
    gap: 12,
    padding: 14,
  },
  trackingSearch: {
    alignItems: 'center',
    backgroundColor: instructorPalette.surfaceMuted,
    borderRadius: 14,
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
    gap: 2,
    padding: 12,
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
    gap: 10,
  },
  progressMetric: {
    backgroundColor: instructorPalette.surface,
    borderRadius: 20,
    flexBasis: '31%',
    flexGrow: 1,
    gap: 9,
    minWidth: 105,
    padding: 13,
  },
  progressMetricHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressMetricIcon: {
    alignItems: 'center',
    backgroundColor: instructorPalette.mint,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
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
  learnerFilter: {
    alignItems: 'center',
    backgroundColor: instructorPalette.surface,
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
