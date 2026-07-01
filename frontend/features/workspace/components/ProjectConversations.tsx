import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  aprendizIds?: string[];
  grupoId?: string | null;
  estado?: string;
  activo?: boolean;
};

type Group = {
  id: string;
  nombre?: string;
  fichaId?: string;
  fichaNumero?: string;
  aprendizIds?: string[];
  instructorUid?: string;
};

type Learner = {
  id: string;
  nombre?: string;
  correo?: string;
  fichaId?: string | null;
};

type SupportUser = {
  id: string;
  nombre?: string;
  correo?: string;
};

type Sheet = {
  id: string;
  numero?: string;
  programaNombre?: string;
};

type Message = {
  id: string;
  remitenteUid?: string;
  remitenteNombre?: string;
  remitenteRol?: string;
  texto?: string;
  creadoEn?: any;
};

type Summary = {
  id: string;
  ultimoMensaje?: string;
  ultimoRemitenteUid?: string;
  actualizadoEn?: any;
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
  fichaId?: string;
  fichaNumero?: string;
  instructorUid?: string;
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
  session,
  tone = defaultTone,
}: {
  legacyHeader?: boolean;
  session: AuthenticatedSession;
  tone?: Tone;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
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
    const assignedSheets = new Set(
      [session.fichaId, session.ficha, ...(session.fichasAsignadas || [])].filter(Boolean).map(String)
    );
    const learnerGroupIds = new Set(groups.filter((group) => (group.aprendizIds || []).includes(session.uid)).map((group) => group.id));

    return projects
      .filter((project) => project.activo !== false && project.estado !== 'Inactivo')
      .filter((project) => {
        if (role === 'instructor') return project.instructorUid === session.uid;
        if (role === 'pasante') {
          return project.instructorUid === session.instructorUid
            || assignedSheets.has(String(project.fichaId || ''))
            || assignedSheets.has(String(project.fichaNumero || ''));
        }
        return (project.aprendizIds || []).includes(session.uid)
          || Boolean(project.grupoId && learnerGroupIds.has(project.grupoId));
      });
  }, [groups, normalizedRole, projects, session]);

  const modeOptions = useMemo(() => {
    if (normalizedRole === 'aprendiz') {
      return [
        { value: 'ficha' as ChatMode, label: 'Toda la ficha' },
        { value: 'instructor' as ChatMode, label: 'Instructor y pasante' },
        { value: 'grupo' as ChatMode, label: 'Mi grupo' },
      ];
    }

    if (normalizedRole === 'pasante') {
      return [
        { value: 'ficha' as ChatMode, label: 'Toda la ficha' },
        { value: 'aprendiz' as ChatMode, label: 'Aprendiz' },
        { value: 'instructor' as ChatMode, label: 'Instructor' },
        { value: 'grupo' as ChatMode, label: 'Grupo' },
      ];
    }

    return [
      { value: 'ficha' as ChatMode, label: 'Toda la ficha' },
      { value: 'pasante' as ChatMode, label: 'Pasante directo' },
      { value: 'aprendiz' as ChatMode, label: 'Aprendiz' },
      { value: 'grupo' as ChatMode, label: 'Grupo' },
    ];
  }, [normalizedRole]);

  useEffect(() => {
    if (!modeOptions.some((option) => option.value === mode)) {
      setMode(modeOptions[0]?.value || 'ficha');
      setSelectedTargetId('');
    }
  }, [mode, modeOptions]);

  const sheets = useMemo(() => {
    const sheetMap = new Map<string, { key: string; label: string; subtitle: string }>();
    contextSheets.forEach((sheet) => {
      const key = sheet.id || sheet.numero || '';
      if (key) {
        sheetMap.set(key, {
          key,
          label: `Ficha ${sheet.numero || sheet.id}`,
          subtitle: sheet.programaNombre || 'Ficha asignada',
        });
      }
    });
    roleProjects.forEach((project) => {
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
  }, [contextSheets, roleProjects]);

  useEffect(() => {
    if (!sheets.some((sheet) => sheet.key === selectedSheetKey)) {
      setSelectedSheetKey(sheets[0]?.key || '');
      setSelectedProjectId('');
      setSelectedTargetId('');
    }
  }, [selectedSheetKey, sheets]);

  const sheetProjects = useMemo(
    () => roleProjects.filter((project) => (project.fichaId || project.fichaNumero || '') === selectedSheetKey),
    [roleProjects, selectedSheetKey]
  );
  const selectedProject = sheetProjects.find((project) => project.id === selectedProjectId);
  const projectsForTarget = selectedProject ? [selectedProject] : sheetProjects;

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
        return firstProject || selectedSheet ? [{
          id: `aprendiz-apoyo-${session.uid}${projectSuffix}`,
          titulo: 'Instructor y pasante',
          fichaId: firstProject?.fichaId || selectedSheetKey,
          fichaNumero: firstProject?.fichaNumero || selectedSheet?.label?.replace('Ficha ', ''),
          instructorUid: firstProject?.instructorUid || session.instructorUid || undefined,
          preview: selectedProject
            ? selectedProject.titulo || 'Proyecto seleccionado'
            : 'Chat de apoyo académico con tu instructor y pasante',
        }] : [];
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
        id: `pasante-${pasante.id}${projectSuffix}`,
        titulo: pasante.nombre || pasante.correo || 'Pasante',
        fichaId: firstProject?.fichaId || selectedSheetKey,
        fichaNumero: firstProject?.fichaNumero || selectedSheet?.label?.replace('Ficha ', ''),
        instructorUid: session.uid,
        preview: selectedProject ? selectedProject.titulo || 'Proyecto seleccionado' : 'Chat directo con pasante',
      }));
    }

    if (mode === 'grupo') {
      const groupIds = new Set(projectsForTarget.map((project) => project.grupoId).filter(Boolean));
      return groups
        .filter((group) => groupIds.has(group.id))
        .filter((group) => normalizedRole !== 'aprendiz' || (group.aprendizIds || []).includes(session.uid))
        .map((group) => ({
          id: `grupo-${group.id}${projectSuffix}`,
          titulo: group.nombre || 'Grupo sin nombre',
          fichaId: group.fichaId,
          fichaNumero: group.fichaNumero,
          preview: selectedProject ? selectedProject.titulo || 'Proyecto seleccionado' : `${group.aprendizIds?.length || 0} integrantes`,
        }));
    }

    const learnerIds = new Set<string>();
    projectsForTarget.forEach((project) => {
      (project.aprendizIds || []).forEach((id) => learnerIds.add(id));
      const group = groups.find((item) => item.id === project.grupoId);
      (group?.aprendizIds || []).forEach((id) => learnerIds.add(id));
    });

    return learners
      .filter((learner) => learnerIds.has(learner.id))
      .map((learner) => ({
        id: `aprendiz-apoyo-${learner.id}${projectSuffix}`,
        titulo: learner.nombre || learner.correo || 'Aprendiz',
        fichaId: learner.fichaId || undefined,
        preview: selectedProject ? selectedProject.titulo || 'Proyecto seleccionado' : 'Chat aprendiz, instructor y pasante',
      }));
  }, [groups, learners, mode, pasantes, projectsForTarget, selectedProject, selectedSheetKey, session.instructorUid, session.uid, sheets, sheetProjects]);

  const filteredTargets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return targets
      .filter((target) => `${target.titulo} ${target.preview}`.toLowerCase().includes(normalizedSearch))
      .sort((a, b) => {
        const summaryA = summaries.find((summary) => summary.id === a.id);
        const summaryB = summaries.find((summary) => summary.id === b.id);
        return getMillis(summaryB?.actualizadoEn) - getMillis(summaryA?.actualizadoEn)
          || a.titulo.localeCompare(b.titulo, 'es');
      });
  }, [search, summaries, targets]);

  useEffect(() => {
    if (!filteredTargets.some((target) => target.id === selectedTargetId)) {
      setSelectedTargetId(filteredTargets[0]?.id || '');
    }
  }, [filteredTargets, selectedTargetId]);

  const selectedTarget = filteredTargets.find((target) => target.id === selectedTargetId);

  useEffect(() => {
    if (!selectedTargetId) {
      setMessages([]);
      return undefined;
    }

    setOpenedIds((current) => current.includes(selectedTargetId) ? current : [...current, selectedTargetId]);

    return escucharMensajesProyecto(
      selectedTargetId,
      setMessages,
      (error: any) => setFeedback(error?.message || 'No pudimos cargar los mensajes.')
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
      const typedError = error as { message?: string };
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
          Primero elige la ficha; luego decide si escribes a toda la ficha, a un aprendiz, al instructor/pasante o a un grupo.
        </Text>
      </View>

      <View style={styles.layout}>
        <View style={[styles.selectorPanel, { backgroundColor: tone.surface, borderColor: tone.border }]}>
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
              setSelectedTargetId('');
            }}
          />
        )}

        <SearchableSelector
          accent={tone.accent}
          border={tone.border}
          label="Proyecto opcional"
          muted={tone.muted}
          options={[
            { label: 'General', subtitle: 'Sin proyecto específico', value: '' },
            ...sheetProjects.map((project, index) => ({
              label: `${index + 1}. ${project.titulo || 'Proyecto'}`,
              subtitle: project.competenciaNombre || 'Proyecto asignado',
              value: project.id,
            })),
          ]}
          surface={tone.surface}
          text={tone.text}
          value={selectedProjectId}
          onChange={(projectId) => {
            setSelectedProjectId(projectId);
            setSelectedTargetId('');
          }}
        />

        <SearchableSelector
          accent={tone.accent}
          border={tone.border}
          label="Tipo de chat"
          muted={tone.muted}
          options={modeOptions.map((option, index) => ({
            label: `${index + 1}. ${option.label}`,
            subtitle: 'Selecciona el alcance del mensaje',
            value: option.value,
          }))}
          surface={tone.surface}
          text={tone.text}
          value={mode}
          onChange={(nextMode) => {
            setMode(nextMode as ChatMode);
            setSelectedTargetId('');
          }}
        />

        <View style={[styles.searchBox, { backgroundColor: tone.background, borderColor: tone.border }]}>
          <MaterialCommunityIcons name="magnify" size={19} color={tone.muted} />
          <TextInput placeholder="Buscar destinatario..." placeholderTextColor={tone.muted} value={search} onChangeText={setSearch} style={[styles.searchInput, { color: tone.text }]} />
        </View>
        </View>

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
                return (
                  <View key={message.id} style={[styles.messageBubble, own ? styles.ownMessage : styles.incomingMessage, { backgroundColor: own ? tone.outgoing : tone.incoming }]}>
                    {!own ? <Text style={[styles.sender, { color: tone.accent }]}>{message.remitenteNombre || 'Usuario'} · {message.remitenteRol || 'Equipo'}</Text> : null}
                    <Text style={[styles.messageText, { color: tone.text }]}>{message.texto}</Text>
                    <Text style={[styles.messageTime, { color: tone.muted }]}>{formatTime(message.creadoEn)}</Text>
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
  options: { label: string; subtitle?: string; value: string }[];
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
        onPress={() => setOpen((current) => !current)}
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
  selectorPanel: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 12,
    padding: 15,
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
  selectorBlock: { gap: 9 },
  selectorLabel: { fontFamily: 'PoppinsSemiBold', fontSize: 13 },
  selectorTrigger: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectorTriggerText: { flex: 1, fontFamily: 'PoppinsSemiBold', fontSize: 13 },
  selectorDropdown: {
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  selectorSearch: {
    alignItems: 'center',
    backgroundColor: '#F5F8F6',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  selectorSearchInput: {
    flex: 1,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    minHeight: 42,
  },
  selectorOption: {
    alignItems: 'center',
    backgroundColor: '#F8FAF9',
    borderColor: '#DDE9E4',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    minHeight: 50,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  selectorOptionCopy: { flex: 1 },
  selectorOptionText: { fontFamily: 'PoppinsSemiBold', fontSize: 12 },
  selectorOptionSubtext: { fontFamily: 'PoppinsRegular', fontSize: 10 },
  fixedSelectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 4,
    padding: 14,
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
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontFamily: 'PoppinsRegular', fontSize: 12, minHeight: 42 },
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
  chatCard: { borderRadius: 24, overflow: 'hidden' },
  chatHeader: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', gap: 10, padding: 16 },
  chatHeaderCopy: { flex: 1 },
  chatTitle: { fontFamily: 'PoppinsSemiBold', fontSize: 14 },
  chatSubtitle: { fontFamily: 'PoppinsRegular', fontSize: 10 },
  messages: { maxHeight: 430, minHeight: 220 },
  messagesContent: { flexGrow: 1, gap: 8, padding: 12 },
  messageBubble: { borderRadius: 17, maxWidth: '86%', paddingHorizontal: 13, paddingVertical: 10 },
  ownMessage: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  incomingMessage: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  sender: { fontFamily: 'PoppinsSemiBold', fontSize: 9, marginBottom: 3 },
  messageText: { fontFamily: 'PoppinsRegular', fontSize: 12, lineHeight: 18 },
  messageTime: { alignSelf: 'flex-end', fontFamily: 'PoppinsRegular', fontSize: 8, marginTop: 3 },
  chatEmpty: { alignItems: 'center', gap: 7, justifyContent: 'center', minHeight: 200, padding: 18 },
  emptyTitle: { fontFamily: 'PoppinsSemiBold', fontSize: 14 },
  emptyText: { fontFamily: 'PoppinsRegular', fontSize: 11, lineHeight: 17, padding: 14, textAlign: 'center' },
  composer: { alignItems: 'flex-end', borderTopWidth: 1, flexDirection: 'row', gap: 8, padding: 12 },
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
