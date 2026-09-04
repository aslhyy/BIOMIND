import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AuthenticatedSession } from '@/features/workspace/types';
// @ts-ignore
import { escucharContextoAcademicoUsuario, escucharGruposTrabajo, escucharProyectos } from '@/services/academic';
// @ts-ignore
import {
  enviarMensajeProyecto,
  escucharMensajesProyecto,
  escucharResumenConversaciones,
} from '@/services/projectConversations';

type Project = {
  id: string;
  titulo?: string;
  fichaId?: string;
  fichaNumero?: string;
  competenciaNombre?: string;
  instructorUid?: string;
  asignacionTipo: 'aprendices' | 'grupo';
  aprendizIds?: string[];
  grupoId: string | null;
  estado?: string;
  activo?: boolean;
};

type Group = {
  id: string;
  nombre?: string;
  activo?: boolean;
  estado?: string;
  fichaId?: string;
  fichaNumero?: string;
  aprendizIds?: string[];
  instructorUid?: string;
};

type Learner = {
  id: string;
  nombre?: string;
  correo?: string;
  photoUrl?: string | null;
  fichaId?: string | null;
  ficha?: string | null;
};

type SupportUser = {
  id: string;
  nombre?: string;
  correo?: string;
  photoUrl?: string | null;
};

type Sheet = {
  id: string;
  numero: string;
  programaNombre?: string;
  instructorUids?: string[];
};

type Message = {
  id: string;
  fichaId?: string;
  fichaNumero?: string;
  remitenteUid?: string;
  remitenteFichaId?: string | null;
  remitenteFichaNumero?: string | null;
  remitenteNombre?: string;
  remitenteRol?: string;
  texto: string;
  tipo: 'texto' | 'imagen' | 'documento' | 'pdf' | 'word' | 'excel' | 'audio' | 'video' | 'enlace' | 'observacion' | 'actualizacion' | 'sistema';
  titulo?: string;
  contexto?: string;
  archivoNombre?: string;
  aprendizNombre?: string;
  bitacoraNumero?: string | number;
  estado?: string;
  creadoEn: any;
};

type Summary = {
  id: string;
  ultimoMensaje: string;
  ultimoRemitenteUid: string;
  actualizadoEn: any;
};

type Tone = {
  accent: string;
  background: string;
  border: string;
  incoming: string;
  muted: string;
  outgoing: string;
  surface: string;
  text: string;
};

type ChatTarget = {
  id: string;
  titulo: string;
  proyectoId?: string;
  proyectoTitulo?: string;
  fichaId?: string;
  fichaNumero?: string;
  instructorUid?: string;
  targetUid?: string;
  grupoId?: string | null;
  participanteUids?: string[];
  preview: string;
};

type ChatMode = 'ficha' | 'aprendiz' | 'grupo' | 'instructor' | 'pasante';

const defaultTone: Tone = {
  accent: '#117C72',
  background: '#F4F7F5',
  border: '#DDE9E4',
  incoming: '#FFFFFF',
  muted: '#7A8B84',
  outgoing: '#DDF7F1',
  surface: '#FFFFFF',
  text: '#29453D',
};

export function ProjectConversations({
  legacyHeader = false,
  preferredConversationId,
  session,
  tone = defaultTone,
}: {
  legacyHeader?: boolean;
  preferredConversationId?: string;
  session: AuthenticatedSession;
  tone: Tone;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [instructors, setInstructors] = useState<SupportUser[]>([]);
  const [pasantes, setPasantes] = useState<SupportUser[]>([]);
  const [contextSheets, setContextSheets] = useState<Sheet[]>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedSheetKey, setSelectedSheetKey] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [mode, setMode] = useState<ChatMode>('ficha');
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [openedIds, setOpenedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState('');
  const normalizedRole = session.role.trim().toLowerCase();

  useEffect(() => {
    const handleError = (error: any) => setFeedback(error?.message || 'No pudimos cargar las conversaciones.');
    const unsubscribeProjects = escucharProyectos(setProjects, handleError);
    const unsubscribeGroups = escucharGruposTrabajo(setGroups, handleError);
    const unsubscribeContext = escucharContextoAcademicoUsuario(
      session,
      (context: any) => {
        setLearners(context.aprendices || []);
        setInstructors(context.instructores || []);
        setContextSheets(context.fichas || []);
        setPasantes(context.pasantes || []);
      },
      handleError
    );
    const unsubscribeSummaries = escucharResumenConversaciones(setSummaries, handleError);

    return () => {
      unsubscribeProjects?.();
      unsubscribeGroups?.();
      unsubscribeContext?.();
      unsubscribeSummaries?.();
    };
  }, [session]);

  const roleProjects = useMemo(() => {
    const role = normalizedRole;
    const assignedSheetValues = role === 'aprendiz' && contextSheets.length
      ? contextSheets.flatMap((sheet) => [sheet.id, sheet.numero])
      : [
        session.fichaId,
        session.ficha,
        ...(session.fichasAsignadas || []),
        ...contextSheets.flatMap((sheet) => [sheet.id, sheet.numero]),
      ];
    const assignedSheets = new Set(assignedSheetValues.filter(Boolean).map(String));
    const learnerGroupIds = new Set(groups
      .filter((group) =>
        (group.aprendizIds || []).includes(session.uid)
        && (assignedSheets.has(String(group.fichaId || '')) || assignedSheets.has(String(group.fichaNumero || '')))
      )
      .map((group) => group.id));

    return projects
      .filter((project) => project.activo !== false && project.estado !== 'Inactivo')
      .filter((project) => {
        if (role === 'instructor') return project.instructorUid === session.uid;
        if (role === 'pasante') {
          return project.instructorUid === session.instructorUid
            || assignedSheets.has(String(project.fichaId || ''))
            || assignedSheets.has(String(project.fichaNumero || ''));
        }

        const projectBelongsToAssignedSheet =
          assignedSheets.has(String(project.fichaId || ''))
          || assignedSheets.has(String(project.fichaNumero || ''));
        if (!projectBelongsToAssignedSheet) {
          return false;
        }

        if (project.asignacionTipo === 'grupo' || project.grupoId) {
          return Boolean(project.grupoId && learnerGroupIds.has(project.grupoId));
        }

        return true;
      });
  }, [contextSheets, groups, normalizedRole, projects, session]);

  const modeOptions = useMemo(() => {
    if (normalizedRole === 'aprendiz') {
      return [
        { value: 'instructor' as ChatMode, label: 'Instructores' },
        { value: 'ficha' as ChatMode, label: 'Ficha' },
        { value: 'grupo' as ChatMode, label: 'Mis grupos' },
      ];
    }

    if (normalizedRole === 'pasante') {
      return [
        { value: 'instructor' as ChatMode, label: 'Instructor' },
        { value: 'ficha' as ChatMode, label: 'Fichas' },
        { value: 'aprendiz' as ChatMode, label: 'Aprendices' },
        { value: 'grupo' as ChatMode, label: 'Grupos' },
      ];
    }

    return [
      { value: 'pasante' as ChatMode, label: normalizedRole === 'administrador' ? 'Instructores' : 'Pasantes' },
      { value: 'ficha' as ChatMode, label: 'Fichas' },
      { value: 'aprendiz' as ChatMode, label: 'Aprendices' },
      { value: 'grupo' as ChatMode, label: 'Grupos' },
    ];
  }, [normalizedRole]);

  useEffect(() => {
    if (!modeOptions.some((option) => option.value === mode)) {
      setMode(modeOptions[0]?.value || 'ficha');
      setSelectedTargetId('');
    }
  }, [mode, modeOptions]);

  useEffect(() => {
    if (!preferredConversationId || !summaries.length) return;
    const summary = summaries.find((item) => item.id === preferredConversationId) as (Summary & {
      fichaId?: string;
      fichaNumero?: string;
      proyectoId?: string;
    }) | undefined;
    if (!summary) return;
    if (preferredConversationId.startsWith('grupo-')) setMode('grupo');
    else if (preferredConversationId.startsWith('ficha-')) setMode('ficha');
    else if (preferredConversationId.startsWith('aprendiz-instructor-')) setMode(normalizedRole === 'aprendiz' ? 'instructor' : 'aprendiz');
    else if (preferredConversationId.startsWith('pasante-instructor-')) setMode(normalizedRole === 'pasante' ? 'instructor' : 'pasante');
    setSelectedSheetKey(summary.fichaId || summary.fichaNumero || '');
    setSelectedProjectId(summary.proyectoId || '');
    setSelectedTargetId(preferredConversationId);
  }, [normalizedRole, preferredConversationId, summaries]);

  const sheets = useMemo(() => {
    const sheetMap = new Map<string, { key: string; label: string; subtitle: string }>();
    const assignedSessionSheetKeys = new Set([
      session.fichaId,
      session.ficha,
      ...(session.fichasAsignadas || []),
    ].filter(Boolean).map(String));
    const visibleContextSheets = normalizedRole === 'instructor'
      ? contextSheets.filter((sheet) => {
        const sheetKeys = [sheet.id, sheet.numero].filter(Boolean).map(String);
        return sheetKeys.some((key) => assignedSessionSheetKeys.has(key))
          || (sheet.instructorUids || []).includes(session.uid);
      })
      : contextSheets;

    visibleContextSheets.forEach((sheet) => {
      const key = sheet.id || sheet.numero || '';
      if (key) {
        sheetMap.set(key, {
          key,
          label: `Ficha ${sheet.numero || sheet.id}`,
          subtitle: sheet.programaNombre || 'Ficha asignada',
        });
      }
    });
    if (normalizedRole !== 'instructor') roleProjects.forEach((project) => {
      const key = project.fichaId || project.fichaNumero || '';
      if (key && !sheetMap.has(key)) {
        sheetMap.set(key, {
          key,
          label: `Ficha ${project.fichaNumero || project.fichaId || key}`,
          subtitle: project.titulo || 'Con proyectos asignados',
        });
      }
    });
    return Array.from(sheetMap.values()).sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }, [contextSheets, normalizedRole, roleProjects, session.ficha, session.fichaId, session.fichasAsignadas, session.uid]);

  useEffect(() => {
    const liveSheet = contextSheets[0];
    if (normalizedRole === 'aprendiz' && liveSheet) {
      const liveSheetKey = liveSheet.id || liveSheet.numero || '';
      if (liveSheetKey && selectedSheetKey !== liveSheetKey) {
        setSelectedSheetKey(liveSheetKey);
        setSelectedProjectId('');
        setSelectedTargetId('');
        return;
      }
    }

    if (!sheets.some((sheet) => sheet.key === selectedSheetKey)) {
      setSelectedSheetKey(sheets[0]?.key || '');
      setSelectedProjectId('');
      setSelectedTargetId('');
    }
  }, [contextSheets, normalizedRole, selectedSheetKey, sheets]);

  const selectedSheetKeys = useMemo(() => {
    const selectedSheet = sheets.find((sheet) => sheet.key === selectedSheetKey);
    return [selectedSheetKey, selectedSheet?.label?.replace('Ficha ', '')]
      .filter(Boolean)
      .map(String);
  }, [selectedSheetKey, sheets]);
  const sheetProjects = useMemo(
    () => roleProjects.filter((project) =>
      selectedSheetKeys.includes(String(project.fichaId || ''))
      || selectedSheetKeys.includes(String(project.fichaNumero || ''))
    ),
    [roleProjects, selectedSheetKeys]
  );
  const allSheetProjects = useMemo(
    () => projects
      .filter((project) => project.activo !== false && project.estado !== 'Inactivo')
      .filter((project) => (project.fichaId || project.fichaNumero || '') === selectedSheetKey)
      .filter((project) =>
        normalizedRole !== 'aprendiz'
        || !(project.asignacionTipo === 'grupo' || project.grupoId)
        || Boolean(project.grupoId && groups.some((group) =>
          group.id === project.grupoId
          && (group.aprendizIds || []).includes(session.uid)
          && String(group.fichaId || group.fichaNumero || '') === selectedSheetKey
        ))
      ),
    [groups, normalizedRole, projects, selectedSheetKey, session.uid]
  );
  const selectableSheetProjects = normalizedRole === 'aprendiz' && mode === 'instructor' ? allSheetProjects : sheetProjects;
  const contextSheetProjects = useMemo(
    () => mode === 'grupo'
      ? selectableSheetProjects.filter(isGroupProject)
      : selectableSheetProjects.filter((project) => !isGroupProject(project)),
    [mode, selectableSheetProjects]
  );
  const selectedProject = contextSheetProjects.find((project) => project.id === selectedProjectId);
  const projectsForTarget = selectedProject ? [selectedProject] : contextSheetProjects;

  const targets = useMemo<ChatTarget[]>(() => {
    const projectSuffix = selectedProject ? `-proyecto-${selectedProject.id}` : '';
    const firstProject = sheetProjects[0];
    const selectedSheet = sheets.find((sheet) => sheet.key === selectedSheetKey);

    if (mode === 'ficha') {
      return firstProject || selectedSheet ? [{
        id: `ficha-${selectedSheetKey}${projectSuffix}`,
        titulo: `Toda la ficha ${firstProject?.fichaNumero || selectedSheet?.label?.replace('Ficha ', '') || selectedSheetKey}`,
        fichaId: firstProject?.fichaId || selectedSheetKey,
        fichaNumero: firstProject?.fichaNumero || selectedSheet?.label?.replace('Ficha ', ''),
        instructorUid: firstProject?.instructorUid || session.instructorUid || undefined,
        preview: selectedProject ? selectedProject.titulo || 'Proyecto seleccionado' : 'Chat general de la ficha',
      }] : [];
    }

    if (mode === 'instructor') {
      if (normalizedRole === 'aprendiz') {
        const selectedProjectGroup = selectedProject?.grupoId
          ? groups.find((group) => group.id === selectedProject.grupoId)
          : undefined;

        if (selectedProject && (selectedProject.asignacionTipo === 'grupo' || selectedProject?.grupoId) && selectedProjectGroup) {
          const instructor = instructors.find((item) => item.id === selectedProject?.instructorUid);

          return [{
            id: `grupo-${selectedProjectGroup.id}${projectSuffix}`,
            titulo: instructor?.nombre || instructor?.correo || 'Instructor asignado',
            fichaId: selectedProject.fichaId || selectedProjectGroup.fichaId || selectedSheetKey,
            fichaNumero: selectedProject.fichaNumero || selectedProjectGroup.fichaNumero || selectedSheet?.label?.replace('Ficha ', ''),
            instructorUid: selectedProject.instructorUid,
            grupoId: selectedProjectGroup.id,
            participanteUids: [
              ...(selectedProjectGroup.aprendizIds || []),
              selectedProject.instructorUid,
              ...pasantes.map((pasante) => pasante.id),
            ].filter((uid): uid is string => Boolean(uid)),
            preview: `${selectedProjectGroup.nombre || 'Grupo'} · ${selectedProject.titulo || 'Proyecto seleccionado'}`,
          }];
        }

        const instructorIds = new Set<string>();
        if (selectedProject?.instructorUid) {
          instructorIds.add(selectedProject.instructorUid);
        } else {
          instructors.forEach((instructor) => instructorIds.add(instructor.id));
          allSheetProjects.forEach((project) => {
            if (project.instructorUid) instructorIds.add(project.instructorUid);
          });
        }

        return Array.from(instructorIds).map((instructorUid) => {
          const instructor = instructors.find((item) => item.id === instructorUid);
          const instructorProject = allSheetProjects.find((project) => project.instructorUid === instructorUid);
          return {
            id: `aprendiz-instructor-${session.uid}-${instructorUid}${projectSuffix}`,
            titulo: instructor?.nombre || instructor?.correo || 'Instructor asignado',
            fichaId: instructorProject?.fichaId || selectedSheetKey,
            fichaNumero: instructorProject?.fichaNumero || selectedSheet?.label?.replace('Ficha ', ''),
            instructorUid,
            preview: selectedProject
              ? selectedProject.titulo || 'Proyecto seleccionado'
              : 'Chat académico con tu instructor y sus pasantes',
          };
        });
      }

      if (normalizedRole === 'pasante') {
        const instructorIds = new Set<string>();
        if (session.instructorUid) {
          instructorIds.add(session.instructorUid);
        }
        instructors.forEach((instructor) => instructorIds.add(instructor.id));
        sheetProjects.forEach((project) => {
          if (project.instructorUid) instructorIds.add(project.instructorUid);
        });

        return Array.from(instructorIds).map((instructorUid) => {
          const instructor = instructors.find((item) => item.id === instructorUid);
          return {
            id: `pasante-instructor-${session.uid}-${instructorUid}${projectSuffix}`,
            titulo: instructor?.nombre || instructor?.correo || 'Instructor asignado',
            proyectoId: selectedProject?.id,
            proyectoTitulo: selectedProject?.titulo,
            fichaId: selectedProject?.fichaId || firstProject?.fichaId || selectedSheetKey,
            fichaNumero: selectedProject?.fichaNumero || firstProject?.fichaNumero || selectedSheet?.label?.replace('Ficha ', ''),
            instructorUid,
            targetUid: instructorUid,
            preview: selectedProject ? selectedProject.titulo || 'Proyecto seleccionado' : 'Chat directo con instructor',
          };
        });
      }

      return firstProject || selectedSheet ? [{
        id: `apoyo-${selectedSheetKey}${projectSuffix}`,
        titulo: 'Instructor y pasante',
        fichaId: firstProject?.fichaId || selectedSheetKey,
        fichaNumero: firstProject?.fichaNumero || selectedSheet?.label?.replace('Ficha ', ''),
        instructorUid: firstProject?.instructorUid || session.instructorUid || session.uid || undefined,
        preview: selectedProject ? selectedProject.titulo || 'Proyecto seleccionado' : 'Chat de apoyo académico',
      }] : [];
    }

    if (mode === 'pasante') {
      return pasantes.map((pasante) => ({
        id: `pasante-instructor-${pasante.id}-${session.uid}${projectSuffix}`,
        titulo: pasante.nombre || pasante.correo || 'Pasante',
        proyectoId: selectedProject?.id,
        proyectoTitulo: selectedProject?.titulo,
        fichaId: selectedProject?.fichaId || firstProject?.fichaId || selectedSheetKey,
        fichaNumero: selectedProject?.fichaNumero || firstProject?.fichaNumero || selectedSheet?.label?.replace('Ficha ', ''),
        instructorUid: session.uid,
        targetUid: pasante.id,
        preview: selectedProject ? selectedProject.titulo || 'Proyecto seleccionado' : 'Chat directo con pasante',
      }));
    }

    if (mode === 'grupo') {
      const selectedGroupId = selectedProject?.grupoId;
      return groups
        .filter((group) => group.activo !== false && group.estado !== 'Inactivo')
        .filter((group) =>
          selectedSheetKeys.includes(String(group.fichaId || ''))
          || selectedSheetKeys.includes(String(group.fichaNumero || ''))
        )
        .filter((group) => !selectedGroupId || group.id === selectedGroupId)
        .filter((group) =>
          normalizedRole !== 'aprendiz'
          || (group.aprendizIds || []).includes(session.uid)
        )
        .map((group) => ({
          id: `grupo-${group.id}${projectSuffix}`,
          titulo: group.nombre || 'Grupo sin nombre',
          fichaId: group.fichaId,
          fichaNumero: group.fichaNumero,
          instructorUid: group.instructorUid || selectedProject?.instructorUid || session.instructorUid || session.uid,
          grupoId: group.id,
          participanteUids: [
            ...(group.aprendizIds || []),
            group.instructorUid || selectedProject?.instructorUid || session.instructorUid || session.uid,
            ...pasantes.map((pasante) => pasante.id),
          ].filter((uid): uid is string => Boolean(uid)),
          preview: selectedProject ? selectedProject.titulo || 'Proyecto seleccionado' : `${group.aprendizIds?.length || 0} integrantes`,
        }));
    }

    const learnerIds = new Set<string>();
    if (selectedProject) {
      projectsForTarget.forEach((project) => {
        if (isGroupProject(project)) {
          const group = groups.find((item) => item.id === project.grupoId);
          (group?.aprendizIds || []).forEach((id) => learnerIds.add(id));
          return;
        }

        const projectSheetKeys = [project.fichaId, project.fichaNumero, selectedSheetKey]
          .filter(Boolean)
          .map(String);
        learners
          .filter((learner) => learnerMatchesAnySheet(learner, projectSheetKeys))
          .forEach((learner) => learnerIds.add(learner.id));
        (project.aprendizIds || []).forEach((id) => learnerIds.add(id));
      });
    } else {
      learners
        .filter((learner) => learnerMatchesAnySheet(learner, [selectedSheetKey]))
        .forEach((learner) => learnerIds.add(learner.id));
    }

    return learners
      .filter((learner) => learnerIds.has(learner.id))
      .map((learner) => ({
        id: `aprendiz-instructor-${learner.id}-${session.uid}${projectSuffix}`,
        titulo: learner.nombre || learner.correo || 'Aprendiz',
        fichaId: learner.fichaId || undefined,
        preview: selectedProject ? selectedProject.titulo || 'Proyecto seleccionado' : 'Chat aprendiz, instructor y pasante',
      }));
  }, [allSheetProjects, groups, instructors, learners, mode, normalizedRole, pasantes, projectsForTarget, selectedProject, selectedSheetKey, selectedSheetKeys, session.instructorUid, session.uid, sheets, sheetProjects]);

  const usesPersonFirstFlow =
    (normalizedRole === 'pasante' && mode === 'instructor')
    || (normalizedRole === 'instructor' && mode === 'pasante');

  const filteredTargets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return targets
      .filter((target) =>
        usesPersonFirstFlow || `${target.titulo} ${target.preview}`.toLowerCase().includes(normalizedSearch)
      )
      .sort((a, b) => {
        const summaryA = summaries.find((summary) => summary.id === a.id);
        const summaryB = summaries.find((summary) => summary.id === b.id);
        return getMillis(summaryB?.actualizadoEn) - getMillis(summaryA?.actualizadoEn)
          || a.titulo.localeCompare(b.titulo, 'es');
      });
  }, [search, summaries, targets, usesPersonFirstFlow]);
  const learnerById = useMemo(
    () => new Map(learners.map((learner) => [learner.id, learner])),
    [learners]
  );
  const userById = useMemo(() => {
    const map = new Map<string, { nombre: string; correo: string; photoUrl: string | null }>();
    [...learners, ...instructors, ...pasantes].forEach((user) => {
      map.set(user.id, { nombre: user.nombre || 'Usuario', correo: user.correo || '', photoUrl: user.photoUrl || null });
    });
    map.set(session.uid, {
      nombre: session.name,
      correo: '',
      photoUrl: session.photoUrl || null,
    });
    return map;
  }, [instructors, learners, pasantes, session.name, session.photoUrl, session.uid]);

  useEffect(() => {
    if (!filteredTargets.some((target) => target.id === selectedTargetId)) {
      setSelectedTargetId(filteredTargets.some((target) => target.id === preferredConversationId) ? preferredConversationId || '' : filteredTargets[0]?.id || '');
    }
  }, [filteredTargets, preferredConversationId, selectedTargetId]);

  const selectedTarget = filteredTargets.find((target) => target.id === selectedTargetId);
  const projectOptions = useMemo(() => {
    if (mode === 'grupo') {
      return contextSheetProjects;
    }

    if (normalizedRole === 'pasante' && mode === 'instructor' && selectedTarget?.instructorUid) {
      return contextSheetProjects.filter((project) => project.instructorUid === selectedTarget.instructorUid);
    }

    if (normalizedRole === 'aprendiz' && mode === 'instructor' && selectedTarget?.instructorUid) {
      return allSheetProjects.filter((project) =>
        project.instructorUid === selectedTarget.instructorUid && !isGroupProject(project)
      );
    }

    if (normalizedRole === 'aprendiz' && mode === 'instructor') {
      return allSheetProjects.filter((project) => !isGroupProject(project));
    }

    return contextSheetProjects;
  }, [allSheetProjects, contextSheetProjects, mode, normalizedRole, selectedTarget?.instructorUid]);

  useEffect(() => {
    if (selectedProjectId && !projectOptions.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId('');
    }
  }, [projectOptions, selectedProjectId]);

  useEffect(() => {
    if (!selectedTargetId) {
      setMessages([]);
      return undefined;
    }

    setOpenedIds((current) => current.includes(selectedTargetId) ? current : [...current, selectedTargetId]);

    return escucharMensajesProyecto(
      selectedTargetId,
      setMessages,
      (error: any) => setFeedback(error.message || 'No pudimos cargar los mensajes.')
    );
  }, [selectedTargetId]);

  const sendMessage = async () => {
    if (!selectedTarget || !draft.trim()) {
      setFeedback('Escribe un mensaje antes de enviarlo.');
      return;
    }

    setSending(true);
    setFeedback('');

    try {
      await enviarMensajeProyecto({ project: selectedTarget, session, text: draft });
      setDraft('');
    } catch (error) {
      const typedError = error as { message: string };
      setFeedback(typedError.message || 'No pudimos enviar el mensaje.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <View style={[styles.hero, legacyHeader && styles.legacyHero, legacyHeader && { backgroundColor: tone.surface, shadowColor: tone.muted }]}>
        <Text style={[styles.heroLabel, { color: tone.accent }]}>MENSAJES</Text>
        <Text style={[styles.heroTitle, { color: legacyHeader ? '#2F4736' : tone.text }]}>Chats académicos</Text>
        <Text style={[styles.heroText, { color: legacyHeader ? '#4E5F52' : tone.muted }]}>
          Elige el contexto superior, selecciona la ficha o destinatario y conversa sin mezclar temas académicos.
        </Text>
      </View>

      <View style={styles.layout}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.contextTabs}>
          {modeOptions.map((option) => {
            const active = option.value === mode;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  setMode(option.value);
                  setSearch('');
                  setSelectedProjectId('');
                  setSelectedTargetId('');
                }}
                style={[styles.contextTab, { borderColor: tone.border, backgroundColor: active ? tone.accent : tone.surface }]}>
                <Text style={[styles.contextTabText, { color: active ? '#FFFFFF' : tone.text }]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={[styles.selectorPanel, { backgroundColor: tone.surface, borderColor: tone.border }]}>
          {usesPersonFirstFlow ? (
            <SearchableSelector
              accent={tone.accent}
              border={tone.border}
              label={normalizedRole === 'pasante' ? 'Instructor' : 'Pasante'}
              muted={tone.muted}
              options={filteredTargets.map((target, index) => ({
                label: `${index + 1}. ${target.titulo}`,
                subtitle: target.preview,
                value: target.id,
              }))}
              surface={tone.surface}
              text={tone.text}
              value={selectedTargetId}
              onChange={(targetId) => {
                const nextTarget = filteredTargets.find((target) => target.id === targetId);
                const targetPrefix = nextTarget?.targetUid
                  ? normalizedRole === 'pasante' && mode === 'instructor'
                    ? `pasante-instructor-${session.uid}-${nextTarget.targetUid}`
                    : `pasante-instructor-${nextTarget.targetUid}-${session.uid}`
                  : targetId;
                setSelectedTargetId(targetPrefix);
                setSelectedProjectId('');
              }}
            />
          ) : null}
          {normalizedRole === 'aprendiz' ? (
            <View style={[styles.fixedSelectionCard, { borderColor: tone.border, backgroundColor: tone.outgoing }]}>
              <Text style={[styles.fixedSelectionLabel, { color: tone.accent }]}>Ficha asignada</Text>
              <Text style={[styles.fixedSelectionValue, { color: tone.text }]}>
                {sheets.find((sheet) => sheet.key === selectedSheetKey)?.label || 'Tu ficha'}
              </Text>
            </View>
          ) : (
            <SearchableSelector
              accent={tone.accent}
              border={tone.border}
              label="Ficha"
              muted={tone.muted}
              options={sheets.map((sheet, index) => ({
                label: `${index + 1}. ${sheet.label}`,
                subtitle: sheet.subtitle,
                value: sheet.key,
              }))}
              surface={tone.surface}
              text={tone.text}
              value={selectedSheetKey}
              onChange={(key) => {
                setSelectedSheetKey(key);
                setSelectedProjectId('');
                if (!usesPersonFirstFlow) {
                  setSelectedTargetId('');
                }
              }}
            />
          )}

          <SearchableSelector
            accent={tone.accent}
            border={tone.border}
            label="Proyecto"
            muted={tone.muted}
            options={[
              { label: 'General', subtitle: 'Sin proyecto específico', value: '' },
              ...projectOptions.map((project, index) => ({
                label: `${index + 1}. ${project.titulo || 'Proyecto'}`,
                subtitle: project.competenciaNombre || 'Proyecto asignado',
                value: project.id,
              })),
            ]}
            surface={tone.surface}
            text={tone.text}
            value={selectedProjectId}
            onChange={(projectId) => {
              const currentInstructorUid = selectedTarget?.instructorUid;
              const nextProject = projectOptions.find((project) => project.id === projectId);
              const nextProjectGroupId = nextProject?.grupoId;
              setSelectedProjectId(projectId);
              if (normalizedRole === 'aprendiz' && mode === 'instructor' && nextProject && (nextProject.asignacionTipo === 'grupo' || nextProjectGroupId)) {
                setSelectedTargetId(nextProjectGroupId ? `grupo-${nextProjectGroupId}-proyecto-${nextProject.id}` : '');
              } else if (normalizedRole === 'aprendiz' && mode === 'instructor' && currentInstructorUid) {
                setSelectedTargetId(`aprendiz-instructor-${session.uid}-${currentInstructorUid}${projectId ? `-proyecto-${projectId}` : ''}`);
              } else if (usesPersonFirstFlow && selectedTarget?.targetUid) {
                const targetPrefix = normalizedRole === 'pasante' && mode === 'instructor'
                  ? `pasante-instructor-${session.uid}-${selectedTarget.targetUid}`
                  : `pasante-instructor-${selectedTarget.targetUid}-${session.uid}`;
                setSelectedTargetId(`${targetPrefix}${projectId ? `-proyecto-${projectId}` : ''}`);
              } else {
                setSelectedTargetId('');
              }
            }}
          />

          {!usesPersonFirstFlow ? (
            <View style={[styles.searchBox, { backgroundColor: tone.background, borderColor: tone.border }]}>
              <MaterialCommunityIcons name="magnify" size={19} color={tone.muted} />
              <TextInput placeholder="Buscar destinatario..." placeholderTextColor={tone.muted} value={search} onChangeText={setSearch} style={[styles.searchInput, { color: tone.text }]} />
            </View>
          ) : null}
        </View>

        {!usesPersonFirstFlow ? (
          <ScrollView horizontal nestedScrollEnabled contentContainerStyle={styles.projectListContent} showsHorizontalScrollIndicator={false}>
            {filteredTargets.map((target) => {
              const summary = summaries.find((item) => item.id === target.id);
              const unread = Boolean(summary?.ultimoRemitenteUid && summary.ultimoRemitenteUid !== session.uid && !openedIds.includes(target.id));

              return (
                <Pressable
                  key={target.id}
                  onPress={() => setSelectedTargetId(target.id)}
                  style={[styles.conversationItem, styles.surfaceShadow, { backgroundColor: tone.surface, borderColor: tone.border }, selectedTargetId === target.id && { backgroundColor: tone.outgoing, borderColor: tone.accent }]}>
                  <View style={[styles.avatar, { backgroundColor: tone.outgoing }]}>
                    <MaterialCommunityIcons name={getModeIcon(mode)} size={19} color={tone.accent} />
                  </View>
                  <View style={styles.conversationCopy}>
                    <Text numberOfLines={1} style={[styles.conversationTitle, { color: tone.text }]}>{target.titulo}</Text>
                    <Text numberOfLines={1} style={[styles.conversationPreview, { color: tone.muted }]}>{summary?.ultimoMensaje || `${target.preview} · Sin mensajes`}</Text>
                  </View>
                  {unread ? <View style={[styles.unreadDot, { backgroundColor: tone.accent }]} /> : null}
                </Pressable>
              );
            })}
            {!filteredTargets.length ? (
              <View style={[styles.noProjectsCard, { backgroundColor: tone.surface }]}>
                <MaterialCommunityIcons name="message-off-outline" size={25} color={tone.accent} />
                <Text style={[styles.emptyText, { color: tone.muted }]}>No hay destinatarios para esta selección.</Text>
              </View>
            ) : null}
          </ScrollView>
        ) : null}

        {selectedTarget ? (
          <View style={[styles.chatCard, styles.surfaceShadow, { backgroundColor: tone.surface }]}>
            <View style={[styles.chatHeader, { borderBottomColor: tone.border }]}>
              <View style={[styles.avatar, { backgroundColor: tone.outgoing }]}>
                <MaterialCommunityIcons name="message-text-outline" size={20} color={tone.accent} />
              </View>
              <View style={styles.chatHeaderCopy}>
                <Text style={[styles.chatTitle, { color: tone.text }]}>{selectedTarget.titulo}</Text>
                <Text style={[styles.chatSubtitle, { color: tone.muted }]}>{selectedTarget.preview}</Text>
              </View>
            </View>

            <ScrollView nestedScrollEnabled contentContainerStyle={styles.messagesContent} style={styles.messages}>
              {messages.map((message) => {
                const own = message.remitenteUid === session.uid;
                const outOfSheet = isLearnerMessageFromPreviousSheet(message, learnerById);
                const sender = message.remitenteUid ? userById.get(message.remitenteUid) : undefined;
                const senderName = sender?.nombre || sender?.correo || message.remitenteNombre || 'Usuario';
                const liveGroup = selectedTarget.grupoId ? groups.find((group) => group.id === selectedTarget.grupoId) : undefined;
                const removedGroupMember = Boolean(
                  liveGroup
                  && String(message.remitenteRol || '').toLowerCase() === 'aprendiz'
                  && message.remitenteUid
                  && !(liveGroup.aprendizIds || []).includes(message.remitenteUid)
                );
                return (
                  <View key={message.id} style={[styles.messageRow, own ? styles.ownMessageRow : styles.incomingMessageRow]}>
                    {!own ? <MessageAvatar name={senderName} photoUrl={sender?.photoUrl || null} tone={tone} /> : null}
                    <View style={[styles.messageBubble, own ? styles.ownMessage : styles.incomingMessage, isSpecialMessage(message) && styles.specialMessage, { backgroundColor: getMessageBackground(message, own, tone) }]}>
                      {!own ? (
                        <Text style={[styles.sender, { color: outOfSheet || removedGroupMember ? '#C45C43' : tone.accent }]}>
                          {message.remitenteNombre || 'Usuario'} · {message.remitenteRol || 'Equipo'}{removedGroupMember ? ' · Ya no pertenece al grupo' : outOfSheet ? ' · No pertenece a esta ficha' : ''}
                        </Text>
                      ) : null}
                      {isSpecialMessage(message) ? (
                        <View style={styles.specialHeader}>
                          <MaterialCommunityIcons name={getMessageIcon(message)} size={18} color={tone.accent} />
                          <Text style={[styles.specialTitle, { color: tone.accent }]}>{getMessageTitle(message)}</Text>
                        </View>
                      ) : null}
                      {message.contexto ? <Text style={[styles.messageMeta, { color: tone.muted }]}>{message.contexto}</Text> : null}
                      {message.aprendizNombre || message.bitacoraNumero ? (
                        <Text style={[styles.messageMeta, { color: tone.muted }]}>
                          {[message.aprendizNombre, message.bitacoraNumero ? `Bitácora #${message.bitacoraNumero}` : ''].filter(Boolean).join(' · ')}
                        </Text>
                      ) : null}
                      <Text style={[styles.messageText, { color: tone.text }]}>{message.texto}</Text>
                      {message.archivoNombre ? <Text style={[styles.messageMeta, { color: tone.accent }]}>{message.archivoNombre}</Text> : null}
                      <Text style={[styles.messageTime, { color: tone.muted }]}>{formatTime(message.creadoEn)}</Text>
                    </View>
                    {own ? <MessageAvatar name={senderName} photoUrl={sender?.photoUrl || null} tone={tone} /> : null}
                  </View>
                );
              })}
              {!messages.length ? (
                <View style={styles.chatEmpty}>
                  <MaterialCommunityIcons name="message-text-outline" size={31} color={tone.accent} />
                  <Text style={[styles.emptyTitle, { color: tone.text }]}>Inicia la conversación</Text>
                  <Text style={[styles.emptyText, { color: tone.muted }]}>Este hilo queda guardado solo para esta ficha, destinatario y proyecto si aplica.</Text>
                </View>
              ) : null}
            </ScrollView>

            <View style={[styles.composer, { borderTopColor: tone.border }]}>
              <TextInput multiline placeholder="Escribe un mensaje..." placeholderTextColor={tone.muted} value={draft} onChangeText={setDraft} style={[styles.composerInput, { backgroundColor: tone.background, color: tone.text }]} />
              <Pressable disabled={sending} onPress={sendMessage} style={[styles.sendButton, { backgroundColor: tone.accent }]}>
                <MaterialCommunityIcons name="send" size={19} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      {feedback ? <Text style={[styles.feedback, { color: tone.accent }]}>{feedback}</Text> : null}
    </>
  );
}

function getMillis(value: any) {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  return 0;
}

function formatTime(value: any) {
  const date = typeof value?.toDate === 'function' ? value.toDate() : value instanceof Date ? value : null;
  if (!date) return 'Enviando...';
  return new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' }).format(date);
}

function getModeIcon(mode: ChatMode) {
  if (mode === 'aprendiz') return 'account-outline';
  if (mode === 'grupo') return 'account-group-outline';
  if (mode === 'pasante') return 'account-tie-outline';
  if (mode === 'instructor') return 'account-tie-outline';
  return 'school-outline';
}

function isGroupProject(project: Project) {
  return project.asignacionTipo === 'grupo' || Boolean(project.grupoId);
}

function learnerMatchesAnySheet(learner: Learner, sheetKeys: string[]) {
  const learnerSheetKeys = [learner.fichaId, learner.ficha].filter(Boolean).map(String);
  return sheetKeys.some((sheetKey) => learnerSheetKeys.includes(String(sheetKey)));
}

function MessageAvatar({ name, photoUrl, tone }: { name: string; photoUrl: string | null; tone: Tone }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'BM';

  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={styles.messageAvatarImage} contentFit="cover" />;
  }

  return (
    <View style={[styles.messageAvatarFallback, { backgroundColor: tone.outgoing, borderColor: tone.surface }]}>
      <Text style={[styles.messageAvatarInitials, { color: tone.accent }]}>{initials}</Text>
    </View>
  );
}

function isSpecialMessage(message: Message) {
  return ['observacion', 'actualizacion', 'documento', 'pdf', 'word', 'excel', 'audio', 'video', 'imagen', 'sistema'].includes(message.tipo || '');
}

function isLearnerMessageFromPreviousSheet(message: Message, learnerById: Map<string, Learner>) {
  if ((message.remitenteRol || '').trim().toLowerCase() !== 'aprendiz' || !message.remitenteUid) {
    return false;
  }

  const learner = learnerById.get(message.remitenteUid);
  const currentSheetKeys = [learner?.fichaId, learner?.ficha].filter(Boolean).map(String);
  const messageSheetKeys = [message.remitenteFichaId, message.remitenteFichaNumero, message.fichaId, message.fichaNumero]
    .filter(Boolean)
    .map(String);

  if (!currentSheetKeys.length || !messageSheetKeys.length) {
    return false;
  }

  return !messageSheetKeys.some((key) => currentSheetKeys.includes(key));
}

function getMessageTitle(message: Message) {
  if (message.titulo) return message.titulo;
  if (message.tipo === 'observacion') return (message.remitenteRol || '').toLowerCase() === 'instructor' ? 'Observación del instructor' : 'Observación';
  if (message.tipo === 'actualizacion') return 'Actualización del proyecto';
  if (message.tipo === 'sistema') return 'Sistema';
  return 'Archivo compartido';
}

function getMessageIcon(message: Message) {
  if (message.tipo === 'observacion') return 'note-edit-outline';
  if (message.tipo === 'actualizacion') return 'bell-ring-outline';
  if (message.tipo === 'audio') return 'microphone-outline';
  if (message.tipo === 'video') return 'video-outline';
  if (message.tipo === 'imagen') return 'image-outline';
  if (message.tipo === 'sistema') return 'information-outline';
  return 'file-document-outline';
}

function getMessageBackground(message: Message, own: boolean, tone: Tone) {
  if (message.tipo === 'observacion') return '#FFF8E5';
  if (message.tipo === 'actualizacion') return '#EAFBF7';
  if (isSpecialMessage(message)) return '#F4F7F5';
  return own ? tone.outgoing : tone.incoming;
}

function SearchableSelector({
  accent,
  border,
  label,
  muted,
  onChange,
  options,
  surface,
  text,
  value,
}: {
  accent: string;
  border: string;
  label: string;
  muted: string;
  onChange: (value: string) => void;
  options: { label: string; subtitle: string; value: string }[];
  surface: string;
  text: string;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((option) => option.value === value) || options[0];
  const filteredOptions = options.filter((option) =>
    `${option.label} ${option.subtitle || ''}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <View style={styles.selectorBlock}>
      <Text style={[styles.selectorLabel, { color: accent }]}>{label}</Text>
      <Pressable
        onPress={() => {
          if (options.length) {
            setOpen((current) => !current);
          }
        }}
        style={[styles.selectorTrigger, { backgroundColor: surface, borderColor: border }]}>
        <Text numberOfLines={1} style={[styles.selectorTriggerText, { color: text }]}>
          {selected?.label || 'Selecciona una opción'}
        </Text>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={22} color={accent} />
      </Pressable>

      {open ? (
        <View style={[styles.selectorDropdown, { backgroundColor: surface, borderColor: border }]}>
          <View style={[styles.selectorSearch, { borderColor: border }]}>
            <MaterialCommunityIcons name="magnify" size={18} color={muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar..."
              placeholderTextColor={muted}
              style={[styles.selectorSearchInput, { color: text }]}
            />
          </View>
          {filteredOptions.map((option) => {
            const active = option.value === value;
            return (
              <Pressable
                key={`${label}-${option.value || 'general'}`}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                  setQuery('');
                }}
                style={[styles.selectorOption, active && { borderColor: accent }]}>
                {active ? <MaterialCommunityIcons name="check-circle" size={19} color={accent} /> : null}
                <View style={styles.selectorOptionCopy}>
                  <Text numberOfLines={1} style={[styles.selectorOptionText, { color: active ? accent : text }]}>
                    {option.label}
                  </Text>
                  {option.subtitle ? (
                    <Text numberOfLines={1} style={[styles.selectorOptionSubtext, { color: muted }]}>
                      {option.subtitle}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
          {!filteredOptions.length ? <Text style={[styles.emptyText, { color: muted }]}>No hay resultados.</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 8, paddingHorizontal: 7, paddingVertical: 6 },
  legacyHero: {
    elevation: 3,
    borderRadius: 28,
    marginHorizontal: -4,
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  heroLabel: { fontFamily: 'PoppinsSemiBold', fontSize: 11, letterSpacing: 0.5 },
  heroTitle: { fontFamily: 'SulphurPointBold', fontSize: 28, lineHeight: 30 },
  heroText: { fontFamily: 'PoppinsRegular', fontSize: 13, lineHeight: 20 },
  layout: { gap: 14 },
  contextTabs: {
    gap: 9,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  contextTab: {
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  contextTabText: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  selectorPanel: {
    borderRadius: 22,
    gap: 10,
    marginHorizontal: -30,
    paddingHorizontal: 35,
    paddingVertical: 25,
    shadowColor: '#6C8177',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
  },
  sectionTitle: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  selectorBlock: { gap: 7 },
  selectorLabel: { fontFamily: 'PoppinsSemiBold', fontSize: 12 },
  selectorTrigger: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  selectorTriggerText: { flex: 1, fontFamily: 'PoppinsSemiBold', fontSize: 12 },
  selectorDropdown: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 10,
  },
  selectorSearch: {
    alignItems: 'center',
    backgroundColor: '#F5F8F6',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 38,
    paddingHorizontal: 11,
  },
  selectorSearchInput: {
    flex: 1,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    minHeight: 38,
  },
  selectorOption: {
    alignItems: 'center',
    backgroundColor: '#F8FAF9',
    borderColor: '#DDE9E4',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectorOptionCopy: { flex: 1 },
  selectorOptionText: { fontFamily: 'PoppinsSemiBold', fontSize: 12 },
  selectorOptionSubtext: { fontFamily: 'PoppinsRegular', fontSize: 10 },
  fixedSelectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fixedSelectionLabel: { fontFamily: 'PoppinsSemiBold', fontSize: 11, textTransform: 'uppercase' },
  fixedSelectionValue: { fontFamily: 'PoppinsSemiBold', fontSize: 14 },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  chip: {
    borderRadius: 18,
    borderWidth: 1,
    flexGrow: 1,
    flexBasis: '47%',
    minHeight: 58,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  chipTitle: { fontFamily: 'PoppinsSemiBold', fontSize: 13 },
  chipSubtitle: { fontFamily: 'PoppinsRegular', fontSize: 10 },
  smallChip: {
    borderRadius: 999,
    borderWidth: 1,
    flexGrow: 1,
    flexBasis: '30%',
    maxWidth: 220,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallChipText: { fontFamily: 'PoppinsSemiBold', fontSize: 11 },
  scopeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scopeButton: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  scopeButtonText: { fontFamily: 'PoppinsSemiBold', fontSize: 11 },
  searchBox: {
    alignItems: 'center',
    borderColor: '#DDE9E4',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontFamily: 'PoppinsRegular', fontSize: 12, minHeight: 38 },
  projectListContent: { gap: 10, paddingBottom: 5, paddingHorizontal: 2 },
  conversationItem: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 76,
    paddingHorizontal: 13,
    paddingVertical: 11,
    width: 235,
  },
  avatar: { alignItems: 'center', borderRadius: 999, height: 39, justifyContent: 'center', width: 39 },
  conversationCopy: { flex: 1 },
  conversationTitle: { fontFamily: 'PoppinsSemiBold', fontSize: 13 },
  conversationPreview: { fontFamily: 'PoppinsRegular', fontSize: 11 },
  unreadDot: { borderRadius: 999, height: 9, width: 9 },
  chatCard: { borderRadius: 22, marginHorizontal: -30, overflow: 'hidden' },
  chatHeader: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', gap: 10, paddingHorizontal: 30, paddingVertical: 16 },
  chatHeaderCopy: { flex: 1 },
  chatTitle: { fontFamily: 'PoppinsSemiBold', fontSize: 14 },
  chatSubtitle: { fontFamily: 'PoppinsRegular', fontSize: 10 },
  messages: { maxHeight: 430, minHeight: 220 },
  messagesContent: { flexGrow: 1, gap: 8, paddingHorizontal: 30, paddingVertical: 14 },
  messageRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
    maxWidth: '100%',
  },
  incomingMessageRow: { alignSelf: 'flex-start' },
  ownMessageRow: { alignSelf: 'flex-end' },
  messageAvatarImage: {
    borderRadius: 16,
    height: 32,
    width: 32,
  },
  messageAvatarFallback: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  messageAvatarInitials: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 10,
  },
  messageBubble: { borderRadius: 17, maxWidth: '86%', paddingHorizontal: 13, paddingVertical: 10 },
  ownMessage: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  incomingMessage: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  specialMessage: {
    borderLeftWidth: 4,
    borderLeftColor: '#117C72',
    maxWidth: '92%',
  },
  specialHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    marginBottom: 4,
  },
  specialTitle: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  sender: { fontFamily: 'PoppinsSemiBold', fontSize: 9, marginBottom: 3 },
  messageMeta: {
    fontFamily: 'PoppinsMedium',
    fontSize: 10,
    lineHeight: 15,
    marginBottom: 3,
  },
  messageText: { fontFamily: 'PoppinsRegular', fontSize: 12, lineHeight: 18 },
  messageTime: { alignSelf: 'flex-end', fontFamily: 'PoppinsRegular', fontSize: 8, marginTop: 3 },
  chatEmpty: { alignItems: 'center', gap: 7, justifyContent: 'center', minHeight: 200, padding: 18 },
  emptyTitle: { fontFamily: 'PoppinsSemiBold', fontSize: 14 },
  emptyText: { fontFamily: 'PoppinsRegular', fontSize: 11, lineHeight: 17, padding: 14, textAlign: 'center' },
  composer: { alignItems: 'flex-end', borderTopWidth: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 30, paddingVertical: 12 },
  composerInput: {
    borderRadius: 17,
    flex: 1,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    maxHeight: 100,
    minHeight: 44,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  sendButton: { alignItems: 'center', borderRadius: 999, height: 44, justifyContent: 'center', width: 44 },
  feedback: { fontFamily: 'PoppinsMedium', fontSize: 11 },
  surfaceShadow: {
    elevation: 3,
    shadowColor: '#6C8177',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  noProjectsCard: {
    alignItems: 'center',
    borderRadius: 22,
    gap: 7,
    justifyContent: 'center',
    minHeight: 110,
    padding: 18,
    width: 280,
  },
});
