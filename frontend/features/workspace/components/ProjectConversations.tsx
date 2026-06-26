import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AuthenticatedSession } from '@/features/workspace/types';
// @ts-ignore
import { escucharGruposTrabajo, escucharProyectos } from '@/services/academic';
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
  instructorUid?: string;
  aprendizIds?: string[];
  grupoId?: string | null;
  estado?: string;
  activo?: boolean;
};

type Group = {
  id: string;
  aprendizIds?: string[];
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
  ultimoRemitenteNombre?: string;
  ultimoRemitenteRol?: string;
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
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [openedProjectIds, setOpenedProjectIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const handleError = (error: any) =>
      setFeedback(error?.message || 'No pudimos cargar las conversaciones.');
    const unsubscribeProjects = escucharProyectos(setProjects, handleError);
    const unsubscribeGroups = escucharGruposTrabajo(setGroups, handleError);
    const unsubscribeSummaries = escucharResumenConversaciones(setSummaries, handleError);

    return () => {
      unsubscribeProjects?.();
      unsubscribeGroups?.();
      unsubscribeSummaries?.();
    };
  }, [session]);

  const availableProjects = useMemo(() => {
    const role = session.role.trim().toLowerCase();
    const assignedSheets = new Set(
      [session.fichaId, session.ficha, ...(session.fichasAsignadas || [])]
        .filter(Boolean)
        .map(String)
    );
    const learnerGroupIds = new Set(
      groups
        .filter((group) => (group.aprendizIds || []).includes(session.uid))
        .map((group) => group.id)
    );
    const normalizedSearch = search.trim().toLowerCase();

    return projects
      .filter((project) => project.activo !== false && project.estado !== 'Inactivo')
      .filter((project) => {
        if (role === 'instructor') {
          return project.instructorUid === session.uid;
        }

        if (role === 'pasante') {
          return project.instructorUid === session.instructorUid
            || assignedSheets.has(String(project.fichaId || ''))
            || assignedSheets.has(String(project.fichaNumero || ''));
        }

        return (project.aprendizIds || []).includes(session.uid)
          || Boolean(project.grupoId && learnerGroupIds.has(project.grupoId));
      })
      .filter((project) =>
        `${project.titulo || ''} ${project.fichaNumero || ''}`
          .toLowerCase()
          .includes(normalizedSearch)
      )
      .sort((a, b) => {
        const summaryA = summaries.find((summary) => summary.id === a.id);
        const summaryB = summaries.find((summary) => summary.id === b.id);
        return getMillis(summaryB?.actualizadoEn) - getMillis(summaryA?.actualizadoEn)
          || (a.titulo || '').localeCompare(b.titulo || '', 'es');
      });
  }, [groups, projects, search, session, summaries]);

  const selectedProject = availableProjects.find((project) => project.id === selectedProjectId);

  useEffect(() => {
    if (!availableProjects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(availableProjects[0]?.id || '');
    }
  }, [availableProjects, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setMessages([]);
      return undefined;
    }

    setOpenedProjectIds((current) =>
      current.includes(selectedProjectId) ? current : [...current, selectedProjectId]
    );

    return escucharMensajesProyecto(
      selectedProjectId,
      setMessages,
      (error: any) => setFeedback(error?.message || 'No pudimos cargar los mensajes.')
    );
  }, [selectedProjectId]);

  const sendMessage = async () => {
    if (!selectedProject || !draft.trim()) {
      setFeedback('Escribe un mensaje antes de enviarlo.');
      return;
    }

    setSending(true);
    setFeedback('');

    try {
      await enviarMensajeProyecto({ project: selectedProject, session, text: draft });
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
      <View
        style={[
          styles.hero,
          legacyHeader && styles.legacyHero,
          legacyHeader && { backgroundColor: tone.surface, shadowColor: tone.muted },
        ]}>
        <Text
          style={[
            styles.heroLabel,
            legacyHeader && styles.legacyHeroLabel,
            { color: tone.accent },
          ]}>
          MENSAJES DEL PROYECTO
        </Text>
        <Text
          style={[
            styles.heroTitle,
            legacyHeader && styles.legacyHeroTitle,
            { color: legacyHeader ? '#2F4736' : tone.text },
          ]}>
          Conversaciones académicas
        </Text>
        <Text
          style={[
            styles.heroText,
            legacyHeader && styles.legacyHeroText,
            { color: legacyHeader ? '#4E5F52' : tone.muted },
          ]}>
          Comunícate con aprendices, instructores y pasantes dentro del proyecto correspondiente.
        </Text>
      </View>

      <View style={styles.layout}>
        <View style={styles.sectionHeading}>
          <View style={styles.sectionCopy}>
            <Text style={[styles.sectionTitle, { color: tone.accent }]}>Selecciona un proyecto</Text>
            <Text style={[styles.sectionSubtitle, { color: tone.muted }]}>
              Cada proyecto conserva su propia conversación.
            </Text>
          </View>
          <Text style={[styles.sectionCount, { color: tone.accent }]}>{availableProjects.length}</Text>
        </View>

        <View style={[styles.searchBox, styles.surfaceShadow, { backgroundColor: tone.surface }]}>
            <MaterialCommunityIcons name="magnify" size={19} color={tone.muted} />
            <TextInput
              placeholder="Buscar proyecto..."
              placeholderTextColor={tone.muted}
              value={search}
              onChangeText={setSearch}
              style={[styles.searchInput, { color: tone.text }]}
            />
        </View>

          <ScrollView
            horizontal
            nestedScrollEnabled
            contentContainerStyle={styles.projectListContent}
            showsHorizontalScrollIndicator={false}
            style={styles.projectList}>
            {availableProjects.map((project) => {
              const summary = summaries.find((item) => item.id === project.id);
              const unread = Boolean(
                summary?.ultimoRemitenteUid
                && summary.ultimoRemitenteUid !== session.uid
                && !openedProjectIds.includes(project.id)
              );

              return (
                <Pressable
                  key={project.id}
                  onPress={() => setSelectedProjectId(project.id)}
                  style={[
                    styles.conversationItem,
                    styles.surfaceShadow,
                    { backgroundColor: tone.surface, borderColor: tone.border },
                    selectedProjectId === project.id && {
                      backgroundColor: tone.outgoing,
                      borderColor: tone.accent,
                    },
                  ]}>
                  <View style={[styles.avatar, { backgroundColor: tone.outgoing }]}>
                    <MaterialCommunityIcons name="briefcase-outline" size={19} color={tone.accent} />
                  </View>
                  <View style={styles.conversationCopy}>
                    <Text numberOfLines={1} style={[styles.conversationTitle, { color: tone.text }]}>
                      {project.titulo || 'Proyecto sin nombre'}
                    </Text>
                    <Text numberOfLines={1} style={[styles.conversationPreview, { color: tone.muted }]}>
                      {summary?.ultimoMensaje || `Ficha ${project.fichaNumero || 'sin número'} · Sin mensajes`}
                    </Text>
                  </View>
                  {unread ? <View style={[styles.unreadDot, { backgroundColor: tone.accent }]} /> : null}
                </Pressable>
              );
            })}
            {!availableProjects.length ? (
              <View style={[styles.noProjectsCard, { backgroundColor: tone.surface }]}>
                <MaterialCommunityIcons name="message-off-outline" size={25} color={tone.accent} />
                <Text style={[styles.emptyText, { color: tone.muted }]}>
                  No hay proyectos disponibles para conversar.
                </Text>
              </View>
            ) : null}
          </ScrollView>

        {selectedProject ? (
          <>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionCopy}>
                <Text style={[styles.sectionTitle, { color: tone.accent }]}>Conversación</Text>
                <Text style={[styles.sectionSubtitle, { color: tone.muted }]}>
                  Dudas, novedades y acuerdos del equipo.
                </Text>
              </View>
            </View>

          <View style={[styles.chatCard, styles.surfaceShadow, { backgroundColor: tone.surface }]}>
            <View style={[styles.chatHeader, { borderBottomColor: tone.border }]}>
              <View style={[styles.avatar, { backgroundColor: tone.outgoing }]}>
                <MaterialCommunityIcons name="account-group-outline" size={20} color={tone.accent} />
              </View>
              <View style={styles.chatHeaderCopy}>
                <Text style={[styles.chatTitle, { color: tone.text }]}>
                  {selectedProject.titulo || 'Proyecto'}
                </Text>
                <Text style={[styles.chatSubtitle, { color: tone.muted }]}>
                  Ficha {selectedProject.fichaNumero || 'sin número'} · conversación del equipo
                </Text>
              </View>
            </View>

            <ScrollView
              nestedScrollEnabled
              contentContainerStyle={styles.messagesContent}
              style={styles.messages}>
              {messages.map((message) => {
                const own = message.remitenteUid === session.uid;
                return (
                  <View
                    key={message.id}
                    style={[
                      styles.messageBubble,
                      own ? styles.ownMessage : styles.incomingMessage,
                      { backgroundColor: own ? tone.outgoing : tone.incoming, borderColor: tone.border },
                    ]}>
                    {!own ? (
                      <Text style={[styles.sender, { color: tone.accent }]}>
                        {message.remitenteNombre || 'Usuario'} · {message.remitenteRol || 'Equipo'}
                      </Text>
                    ) : null}
                    <Text style={[styles.messageText, { color: tone.text }]}>{message.texto}</Text>
                    <Text style={[styles.messageTime, { color: tone.muted }]}>
                      {formatTime(message.creadoEn)}
                    </Text>
                  </View>
                );
              })}
              {!messages.length ? (
                <View style={styles.chatEmpty}>
                  <MaterialCommunityIcons name="message-text-outline" size={31} color={tone.accent} />
                  <Text style={[styles.emptyTitle, { color: tone.text }]}>Inicia la conversación</Text>
                  <Text style={[styles.emptyText, { color: tone.muted }]}>
                    Usa este espacio para dudas, novedades y acuerdos relacionados con el proyecto.
                  </Text>
                </View>
              ) : null}
            </ScrollView>

            <View style={[styles.composer, { borderTopColor: tone.border }]}>
              <TextInput
                multiline
                placeholder="Escribe un mensaje al equipo..."
                placeholderTextColor={tone.muted}
                value={draft}
                onChangeText={setDraft}
                style={[styles.composerInput, { backgroundColor: tone.background, color: tone.text }]}
              />
              <Pressable
                disabled={sending}
                onPress={sendMessage}
                style={[styles.sendButton, { backgroundColor: tone.accent }]}>
                <MaterialCommunityIcons name="send" size={19} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
          </>
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

const styles = StyleSheet.create({
  hero: {
    gap: 8,
    paddingHorizontal: 7,
    paddingVertical: 6,
  },
  legacyHero: {
    elevation: 3,
    marginHorizontal: -30,
    paddingHorizontal: 37,
    paddingVertical: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  legacyHeroLabel: {
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  legacyHeroTitle: {
    fontSize: 28,
    lineHeight: 28,
    marginBottom: 6,
  },
  legacyHeroText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 10,
  },
  heroLabel: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontFamily: 'SulphurPointBold',
    fontSize: 28,
    lineHeight: 30,
  },
  heroText: {
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    lineHeight: 20,
  },
  layout: {
    gap: 16,
  },
  sectionHeading: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  sectionCopy: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 20,
    letterSpacing: -0.5,
    lineHeight: 27,
  },
  sectionSubtitle: {
    fontFamily: 'PoppinsLight',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  sectionCount: {
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
  },
  searchBox: {
    alignItems: 'center',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 13,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    minHeight: 45,
  },
  projectList: {
    marginHorizontal: -2,
  },
  projectListContent: {
    gap: 10,
    paddingBottom: 5,
    paddingHorizontal: 2,
  },
  conversationItem: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 76,
    paddingHorizontal: 13,
    paddingVertical: 11,
    width: 245,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 999,
    height: 39,
    justifyContent: 'center',
    width: 39,
  },
  conversationCopy: {
    flex: 1,
  },
  conversationTitle: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  conversationPreview: {
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
  },
  unreadDot: {
    borderRadius: 999,
    height: 9,
    width: 9,
  },
  chatCard: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  chatHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 16,
  },
  chatHeaderCopy: {
    flex: 1,
  },
  chatTitle: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
  },
  chatSubtitle: {
    fontFamily: 'PoppinsRegular',
    fontSize: 10,
  },
  messages: {
    maxHeight: 430,
    minHeight: 220,
  },
  messagesContent: {
    flexGrow: 1,
    gap: 8,
    padding: 12,
  },
  messageBubble: {
    borderRadius: 17,
    borderWidth: 0,
    maxWidth: '86%',
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  incomingMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  sender: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 9,
    marginBottom: 3,
  },
  messageText: {
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  messageTime: {
    alignSelf: 'flex-end',
    fontFamily: 'PoppinsRegular',
    fontSize: 8,
    marginTop: 3,
  },
  chatEmpty: {
    alignItems: 'center',
    gap: 7,
    justifyContent: 'center',
    minHeight: 200,
    padding: 18,
  },
  emptyTitle: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
  },
  emptyText: {
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 17,
    padding: 14,
    textAlign: 'center',
  },
  composer: {
    alignItems: 'flex-end',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
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
  sendButton: {
    alignItems: 'center',
    borderRadius: 999,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  feedback: {
    fontFamily: 'PoppinsMedium',
    fontSize: 11,
  },
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
