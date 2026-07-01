import { instructorPalette } from '@/features/instructor/theme';
import { UserAvatar } from '@/features/workspace/components/UserAvatar';
import type {
  AuthenticatedSession,
  WorkspaceAssistantProject,
  WorkspaceAssistantPrompt,
  WorkspaceChatChannel,
  WorkspaceChatMessage,
} from '@/features/workspace/types';
import { generateGeminiReply } from '@/services/gemini';
import { saveProjectMessages, subscribeToProjectMessages } from '@/services/messages';
import {
  createSpeechRecognitionSession,
  isSpeechRecognitionSupported,
} from '@/services/speechRecognition';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

type GeminiAssistantModuleProps = {
  assistantQuestionsEnabledDefault?: boolean;
  autoStartVoiceSignal?: number;
  composerPlaceholder: string;
  emptyStateLabel: string;
  preferredProjectId?: string;
  prompts: WorkspaceAssistantPrompt[];
  projects: WorkspaceAssistantProject[];
  roleLabel: string;
  session: AuthenticatedSession;
  subtitle: string;
  systemContext: string;
  tone?: Partial<GeminiAssistantTone>;
  title: string;
  voiceEnabled?: boolean;
  chatChannel?: WorkspaceChatChannel;
  welcomeMessage: string;
};

type GeminiAssistantTone = {
  background: string;
  border: string;
  chatCaption: string;
  composerBorder: string;
  composerHint: string;
  dark: string;
  greenText: string;
  lavanderText: string;
  mint: string;
  primary: string;
  projectChipBg: string;
  projectChipBorder: string;
  secondary: string;
  shadow: string;
  softGreen: string;
  surface: string;
  surfaceMuted: string;
  switchActive: string;
  text: string;
  textMuted: string;
};

const defaultAssistantTone: GeminiAssistantTone = {
  background: instructorPalette.background,
  border: instructorPalette.border,
  chatCaption: '#9d9d9d',
  composerBorder: '#E2E8EE',
  composerHint: '#8CA39E',
  dark: instructorPalette.dark,
  greenText: instructorPalette.greenText,
  lavanderText: instructorPalette.lavanderText,
  mint: instructorPalette.mint,
  primary: instructorPalette.primary,
  projectChipBg: '#F6FFFC',
  projectChipBorder: '#D8F1EA',
  secondary: instructorPalette.secondary,
  shadow: instructorPalette.shadow,
  softGreen: instructorPalette.softGreen,
  surface: instructorPalette.surface,
  surfaceMuted: instructorPalette.surfaceMuted,
  switchActive: '#73C088',
  text: instructorPalette.text,
  textMuted: instructorPalette.textMuted,
};

function buildMessageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getFirstName(name: string) {
  return name.split(' ').filter(Boolean)[0] || 'Usuario';
}

function mapGeminiError(error: unknown) {
  const typedError = error as { code?: string; message?: string };

  switch (typedError?.code) {
    case 'gemini/missing-api-key':
      return 'Agrega EXPO_PUBLIC_GEMINI_API_KEY para activar este chat con Gemini.';
    case 'gemini/empty-response':
      return 'Gemini respondió sin texto útil. Intenta reformular tu pregunta.';
    default:
      return typedError?.message || 'No pudimos obtener respuesta de Gemini.';
  }
}

export function GeminiAssistantModule({
  assistantQuestionsEnabledDefault = true,
  autoStartVoiceSignal = 0,
  composerPlaceholder,
  emptyStateLabel,
  preferredProjectId,
  prompts,
  projects,
  roleLabel,
  session,
  subtitle,
  systemContext,
  tone,
  title,
  voiceEnabled = true,
  chatChannel = 'ai',
  welcomeMessage,
}: GeminiAssistantModuleProps) {
  const assistantTone = { ...defaultAssistantTone, ...tone };
  const selectedDefaultProject = projects[0]?.id ?? 'general';
  const [draft, setDraft] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(selectedDefaultProject);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [messages, setMessages] = useState<WorkspaceChatMessage[]>([]);
  const chatChannelLabel = useMemo(() => {
    switch (chatChannel) {
      case 'admin':
        return 'Administrador';
      case 'pasante':
        return 'Pasante';
      case 'instructor':
        return 'Instructor';
      case 'general':
        return 'General';
      default:
        return 'IA';
    }
  }, [chatChannel]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [assistantQuestionsEnabled, setAssistantQuestionsEnabled] = useState(
    assistantQuestionsEnabledDefault
  );
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceSupportedMessage, setVoiceSupportedMessage] = useState('');

  const voiceSessionRef = useRef<ReturnType<typeof createSpeechRecognitionSession> | null>(null);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );
  const welcomeHistory = useMemo<WorkspaceChatMessage[]>(
    () => [
      {
        id: buildMessageId('welcome'),
        role: 'model',
        text: welcomeMessage,
        createdAt: new Date().toISOString(),
        inputMode: 'manual',
      },
    ],
    [welcomeMessage]
  );

  useEffect(() => {
    if (!preferredProjectId) {
      return;
    }

    const requestedProjectExists = projects.some((project) => project.id === preferredProjectId);

    if (requestedProjectExists) {
      setSelectedProjectId(preferredProjectId);
    }
  }, [preferredProjectId, projects]);

  useEffect(() => {
    setLoadingHistory(true);

    const unsubscribe = subscribeToProjectMessages(
      {
        projectId: selectedProjectId,
        session,
        chatChannel,
      },
      (payload) => {
        if (!payload || payload.messages.length === 0) {
          setMessages(welcomeHistory);
          setAssistantQuestionsEnabled(assistantQuestionsEnabledDefault);
          setLoadingHistory(false);
          return;
        }

        setMessages(payload.messages);
        setAssistantQuestionsEnabled(
          typeof payload.assistantQuestionsEnabled === 'boolean'
            ? payload.assistantQuestionsEnabled
            : assistantQuestionsEnabledDefault
        );
        setLoadingHistory(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [assistantQuestionsEnabledDefault, chatChannel, selectedProjectId, session, welcomeHistory]);

  useEffect(() => {
    return () => {
      voiceSessionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (!autoStartVoiceSignal || voiceListening) {
      return;
    }

    if (!voiceEnabled || !isSpeechRecognitionSupported()) {
      return;
    }

    voiceSessionRef.current = createSpeechRecognitionSession({
      onEnd: () => setVoiceListening(false),
      onError: (message) => {
        setVoiceListening(false);
        setVoiceSupportedMessage(message);
      },
      onResult: (transcript) => {
        setDraft(transcript);

        if (/\benviar[\s.!?,;:]*$/i.test(transcript)) {
          const cleanedDraft = transcript.replace(/\benviar[\s.!?,;:]*$/i, '').trim();
          setDraft(cleanedDraft);
          stopVoiceCapture();
          void sendPrompt(cleanedDraft, 'voice');
        }
      },
      onStart: () => setVoiceListening(true),
    });

    voiceSessionRef.current?.start();
  }, [autoStartVoiceSignal, voiceEnabled, voiceListening]);

  const persistThread = async (nextMessages: WorkspaceChatMessage[], nextQuestionsState = assistantQuestionsEnabled) => {
    if (!selectedProjectId) {
      return;
    }

    await saveProjectMessages({
      assistantQuestionsEnabled: nextQuestionsState,
      messages: nextMessages,
      projectId: selectedProjectId,
      projectTitle: selectedProject?.title || emptyStateLabel,
      session,
      chatChannel,
    });
  };

  const stopVoiceCapture = () => {
    voiceSessionRef.current?.stop();
    setVoiceListening(false);
  };

  const sendPrompt = async (promptText: string, inputMode: 'manual' | 'voice' = 'manual') => {
    const normalized = promptText.trim();

    if (!normalized || loading || !selectedProjectId) {
      return;
    }

    const userMessage: WorkspaceChatMessage = {
      id: buildMessageId('user'),
      role: 'user',
      text: normalized,
      authorName: session.name,
      authorRole: session.role,
      createdAt: new Date().toISOString(),
      inputMode,
    };

    const nextHistory = [...messages, userMessage];

    setMessages(nextHistory);
    setDraft('');
    setErrorMessage('');
    setLoading(true);

    try {
      await persistThread(nextHistory);

      const responseText = await generateGeminiReply({
        history: nextHistory,
        systemInstruction: [
          systemContext,
          `Usuario activo: ${session.name} (${session.role}).`,
          `Correo: ${session.email}.`,
          session.programa ? `Programa: ${session.programa}.` : 'Programa no registrado.',
          session.ficha ? `Ficha: ${session.ficha}.` : 'Ficha no registrada.',
          session.trimestreActual ? `Trimestre actual: ${session.trimestreActual}.` : 'Trimestre actual no definido.',
          selectedProject ? `Proyecto seleccionado: ${selectedProject.title}.` : 'No hay proyecto seleccionado.',
          assistantQuestionsEnabled
            ? 'La IA puede hacer preguntas guiadas para profundizar en el registro.'
            : 'La IA debe escuchar y transcribir sin insistir con preguntas adicionales.',
          'Responde siempre en español claro, útil, corto y con foco en biotecnología vegetal.',
          'Si faltan datos, dilo de forma honesta y propone el siguiente paso.',
        ].join('\n'),
      });

      const nextMessages = [
        ...nextHistory,
        {
          id: buildMessageId('model'),
          role: 'model' as const,
          text: responseText,
          authorName: 'Gemini',
          authorRole: 'model',
          createdAt: new Date().toISOString(),
          inputMode: 'manual' as const,
        },
      ];

      setMessages(nextMessages);
      await persistThread(nextMessages);
    } catch (error) {
      setErrorMessage(mapGeminiError(error));
    } finally {
      setLoading(false);
    }
  };

  const handlePromptSelect = (prompt: WorkspaceAssistantPrompt) => {
    setSelectedPromptId(prompt.id);
    setDraft(prompt.detail);
  };

  const handleVoiceToggle = () => {
    setVoiceSupportedMessage('');

    if (!voiceEnabled) {
      setVoiceSupportedMessage('Activa el registro por voz desde tu perfil para dictar observaciones.');
      return;
    }

    if (voiceListening) {
      stopVoiceCapture();
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      setVoiceSupportedMessage(
        'El dictado por voz quedó listo para navegadores compatibles. En Expo Go móvil hace falta integrar el proveedor nativo de reconocimiento.'
      );
      return;
    }

    voiceSessionRef.current = createSpeechRecognitionSession({
      onEnd: () => setVoiceListening(false),
      onError: (message) => {
        setVoiceListening(false);
        setVoiceSupportedMessage(message);
      },
      onResult: (transcript) => {
        setDraft(transcript);

        if (/\benviar[\s.!?,;:]*$/i.test(transcript)) {
          const cleanedDraft = transcript.replace(/\benviar[\s.!?,;:]*$/i, '').trim();
          setDraft(cleanedDraft);
          stopVoiceCapture();
          void sendPrompt(cleanedDraft, 'voice');
        }
      },
      onStart: () => setVoiceListening(true),
    });

    voiceSessionRef.current?.start();
  };

  const handleQuestionsToggle = async (value: boolean) => {
    setAssistantQuestionsEnabled(value);
    await persistThread(messages, value);
  };

  return (
    <View style={styles.module}>
      <View style={[styles.heroCard, { backgroundColor: assistantTone.surface, shadowColor: assistantTone.shadow }]}>
        <View style={[styles.heroBadge, { backgroundColor: assistantTone.secondary }]}>
          <MaterialCommunityIcons name="robot-outline" size={14} color={assistantTone.surface} />
          <Text style={[styles.heroBadgeText, { color: assistantTone.surface }]}>{roleLabel}</Text>
        </View>

        <Text style={[styles.heroTitle, { color: assistantTone.dark }]}>{title}</Text>
        <Text style={[styles.heroSubtitle, { color: assistantTone.text }]}>{subtitle}</Text>

        <View style={styles.heroFooter}>
          <Text style={[styles.heroFootnote, { color: assistantTone.secondary }]}>Sesion de {getFirstName(session.name)}</Text>
          <View style={[styles.heroDot, { backgroundColor: assistantTone.secondary }]} />
          <Text style={[styles.heroFootnote, { color: assistantTone.secondary }]}>{selectedProject?.title || emptyStateLabel}</Text>
          <View style={[styles.channelBadge, { backgroundColor: assistantTone.secondary + '22' }]}>
            <Text style={[styles.channelBadgeText, { color: assistantTone.secondary }]}>Canal: {chatChannelLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.selectorCard}>
        <Text style={[styles.selectorTitle, { color: assistantTone.dark }]}>Proyecto activo</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
          {projects.map((project) => {
            const isActive = project.id === selectedProjectId;

            return (
              <Pressable
                key={project.id}
                onPress={() => setSelectedProjectId(project.id)}
                style={[
                  styles.projectChip,
                  { backgroundColor: assistantTone.projectChipBg, borderColor: assistantTone.projectChipBorder },
                  isActive && { backgroundColor: assistantTone.primary, borderColor: assistantTone.primary },
                ]}>
                <Text style={[
                  styles.projectChipText,
                  { color: assistantTone.greenText },
                  isActive && { color: assistantTone.surface },
                ]}>
                  {project.title}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.toggleRow, { backgroundColor: assistantTone.softGreen }]}>
          <View style={styles.toggleCopy}>
            <Text style={[styles.toggleTitle, { color: assistantTone.text }]}>Preguntas automáticas</Text>
            <Text style={[styles.toggleSubtitle, { color: assistantTone.textMuted }]}>
              Si está activo, la IA profundiza en el registro del proyecto.
            </Text>
          </View>
          <Switch
            onValueChange={(value) => {
              void handleQuestionsToggle(value);
            }}
            thumbColor={assistantQuestionsEnabled ? '#FFFFFF' : '#F1F4F7'}
            trackColor={{ false: '#D8E6E2', true: assistantTone.switchActive }}
            value={assistantQuestionsEnabled}
          />
        </View>
      </View>

      <View style={[
        styles.chatCard,
        {
          backgroundColor: assistantTone.surfaceMuted,
          borderTopColor: assistantTone.border,
          shadowColor: assistantTone.dark,
        },
      ]}>
        <View style={[
          styles.selectorCardTwo,
          { backgroundColor: assistantTone.surface, shadowColor: assistantTone.shadow },
        ]}>
          <Text style={[styles.selectorTitleTwo, { color: assistantTone.primary }]}>Atajos para conversar</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
            {prompts.map((prompt) => {
              const isActive = prompt.id === selectedPromptId;

              return (
                <Pressable
                  key={prompt.id}
                  onPress={() => handlePromptSelect(prompt)}
                  style={[
                    styles.promptChip,
                    { backgroundColor: assistantTone.surface, borderColor: assistantTone.border },
                    isActive && { backgroundColor: assistantTone.secondary, borderColor: assistantTone.secondary },
                  ]}>
                  <MaterialCommunityIcons
                    name={prompt.icon}
                    size={16}
                    color={isActive ? assistantTone.surface : assistantTone.primary}
                  />
                  <Text style={[
                    styles.promptChipText,
                    { color: assistantTone.greenText },
                    isActive && { color: assistantTone.surface },
                  ]}>
                    {prompt.title}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={[styles.chatHeader, { borderBottomColor: assistantTone.border }]}>
          <Text style={[styles.chatTitle, { color: assistantTone.secondary }]}>Historial del chat</Text>
          <Text style={[styles.chatCaption, { color: assistantTone.chatCaption }]}>
            ¡Tus mensajes se guardan por proyecto!
          </Text>
        </View>


        <View style={styles.feed}>
          {loadingHistory ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={assistantTone.primary} />
              <Text style={[styles.loadingText, { color: assistantTone.textMuted }]}>Cargando historial del proyecto...</Text>
            </View>
          ) : null}

          {!loadingHistory &&
            messages.map((message) => {
              const isUser = message.role === 'user';

              return (
                <View
                  key={message.id}
                  style={[
                    styles.messageWrap,
                    isUser ? styles.messageWrapOutgoing : styles.messageWrapIncoming,
                  ]}>

                  {/* Avatar del asistente — ancla abajo-izquierda */}
                  {!isUser && (
                    <View style={[styles.messageAvatar, { backgroundColor: assistantTone.secondary }]}>
                      <MaterialCommunityIcons
                        name="robot-excited-outline"
                        size={18}
                        color={assistantTone.surface}
                      />
                    </View>
                  )}

                  {/* Burbuja */}
                  <View style={styles.messageBubble}>
                    <View
                      style={[
                        styles.messageBubble,
                        isUser
                          ? [
                            styles.messageBubbleOutgoing,
                            { backgroundColor: assistantTone.secondary, shadowColor: assistantTone.primary },
                          ]
                          : [
                            styles.messageBubbleIncoming,
                            {
                              backgroundColor: assistantTone.surface,
                              borderColor: assistantTone.border,
                              shadowColor: assistantTone.shadow,
                            },
                          ],
                      ]}>
                      {!isUser && (
                        <View style={styles.messageHeader}>
                          <Text style={[styles.messageSender, { color: assistantTone.primary }]}>Gemini</Text>
                          {message.inputMode === 'voice' && (
                            <MaterialCommunityIcons
                              name="microphone-outline"
                              size={12}
                              color={assistantTone.primary}
                            />
                          )}
                        </View>
                      )}

                      <Text style={[
                        styles.messageText,
                        { color: isUser ? assistantTone.surface : assistantTone.text },
                      ]}>
                        {message.text}
                      </Text>
                    </View>

                    {message.createdAt && (
                      <Text style={[
                        styles.messageTime,
                        { color: assistantTone.textMuted },
                        isUser && styles.messageTimeOutgoing,
                      ]}>
                        {new Date(message.createdAt).toLocaleTimeString('es-CO', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    )}
                  </View>
                  {isUser && (
                    <UserAvatar
                      name={session.name}
                      photoUrl={session.photoUrl}
                      size={34}
                    />
                  )}

                </View>
              );
            })}

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={assistantTone.primary} />
              <Text style={[styles.loadingText, { color: assistantTone.textMuted }]}>Gemini está redactando tu respuesta...</Text>
            </View>
          ) : null}

          {errorMessage ? (
            <View style={styles.errorCard}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#C75A3E" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {voiceSupportedMessage ? (
            <View style={[
              styles.infoCard,
              {
                backgroundColor: assistantTone.mint,
                borderColor: assistantTone.border,
                borderLeftColor: assistantTone.secondary,
              },
            ]}>
              <MaterialCommunityIcons name="microphone-message" size={18} color={assistantTone.secondary} />
              <Text style={[styles.infoText, { color: assistantTone.lavanderText }]}>{voiceSupportedMessage}</Text>
            </View>
          ) : null}
        </View>

        <View style={[
          styles.composerCard,
          {
            backgroundColor: assistantTone.surface,
            shadowColor: assistantTone.dark,
          },
        ]}>
          <TextInput
            multiline
            onChangeText={setDraft}
            placeholder={composerPlaceholder}
            placeholderTextColor={assistantTone.composerHint}
            style={[styles.composerInput, { color: assistantTone.dark }]}
            value={draft}
          />

          <View style={[styles.composerFooter, { borderTopColor: assistantTone.composerBorder }]}>
            <Text style={[styles.composerHint, { color: assistantTone.composerHint }]}>
              Di "enviar" al final del dictado para mandar el mensaje automáticamente.
            </Text>

            <View style={styles.actionsRow}>
              <Pressable
                onPress={handleVoiceToggle}
                style={[
                  styles.iconButton,
                  {
                    backgroundColor: assistantTone.surfaceMuted,
                    borderColor: assistantTone.border,
                  },
                  voiceListening && {
                    backgroundColor: assistantTone.secondary,
                    borderColor: assistantTone.secondary,
                  },
                  !voiceEnabled && styles.iconButtonDisabled,
                ]}>
                <MaterialCommunityIcons
                  name={voiceListening ? 'microphone' : 'microphone-outline'}
                  size={18}
                  color={voiceListening ? assistantTone.background : assistantTone.primary}
                />
              </Pressable>
              <Pressable
                onPress={() => {
                  void sendPrompt(draft);
                }}
                style={[
                  styles.sendButton,
                  { backgroundColor: assistantTone.primary, shadowColor: assistantTone.primary },
                  loading && styles.sendButtonDisabled,
                ]}
                disabled={loading}>
                <MaterialCommunityIcons name="arrow-up" size={18} color={assistantTone.surface} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  module: {
    gap: 18,
  },
  heroCard: {
    backgroundColor: instructorPalette.surface,
    paddingHorizontal: 37,
    paddingVertical: 20,
    marginHorizontal: -30,
    shadowColor: instructorPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 8,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: instructorPalette.secondary,
  },
  heroBadgeText: {
    color: instructorPalette.surface,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  heroTitle: {
    color: instructorPalette.dark,
    fontFamily: 'SulphurPointBold',
    fontSize: 28,
    lineHeight: 28,
  },
  heroSubtitle: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    lineHeight: 20,
    maxWidth: '89%',
    marginBottom: 10,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  heroFootnote: {
    color: instructorPalette.secondary,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
  },
  heroDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#9ADFD2',
  },
  channelBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  channelBadgeText: {
    fontFamily: 'PoppinsMedium',
    fontSize: 11,
  },
  selectorCard: {
    borderRadius: 26,
    paddingHorizontal: 5,
    paddingVertical: 10,
    backgroundColor: 'transparent',
    gap: 12,
  },
  selectorTitle: {
    color: instructorPalette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 18,
    lineHeight: 28,
  },
  selectorRow: {
    gap: 10,
    paddingRight: 8,
  },
  projectChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F6FFFC',
    borderWidth: 1,
    borderColor: '#D8F1EA',
  },
  projectChipActive: {
    backgroundColor: instructorPalette.primary,
    borderColor: instructorPalette.primary,
  },
  projectChipText: {
    color: '#5E7B73',
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
  },
  projectChipTextActive: {
    color: instructorPalette.surface,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: instructorPalette.softGreen,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  toggleCopy: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  toggleSubtitle: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  // ── CHAT CARD ─────────────────────────────────────────────
  chatCard: {
    backgroundColor: instructorPalette.surfaceMuted,
    paddingHorizontal: 32,
    paddingTop: 0,
    paddingBottom: 28,
    marginHorizontal: -30,
    shadowColor: instructorPalette.dark,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
    gap: 0,
    borderTopWidth: 1,
    borderTopColor: instructorPalette.border,
  },
  chatHeader: {
    paddingTop: 22,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: instructorPalette.border,
    marginBottom: 18,
    gap: 3,
  },
  chatTitle: {
    color: instructorPalette.secondary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.9,
  },
  chatCaption: {
    color: '#9d9d9d',
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    letterSpacing: 0.1,
  },

  // ── PROMPTS ───────────────────────────────────────────────
  selectorCardTwo: {
    backgroundColor: instructorPalette.surface,
    paddingHorizontal: 37,
    paddingVertical: 20,
    marginHorizontal: -30,
    shadowColor: instructorPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 8,
  },
  selectorTitleTwo: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: instructorPalette.surface,
    borderWidth: 1,
    borderColor: instructorPalette.border,
  },
  promptChipActive: {
    backgroundColor: instructorPalette.secondary,
    borderColor: instructorPalette.secondary,
  },
  promptChipText: {
    color: instructorPalette.greenText,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
  },
  promptChipTextActive: {
    color: instructorPalette.surface,
  },

  // ── FEED ──────────────────────────────────────────────────
  feed: {
    gap: 12,
    paddingTop: 4,
  },
  messageWrap: {
    width: '100%',
  },
  messageWrapIncoming: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 10,
  },
  messageWrapOutgoing: {
    alignItems: 'flex-end',        // ← clave para anclar avatar abajo
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 5,
  },
  messageBubbleIncoming: {
    maxWidth: '95%',
    backgroundColor: instructorPalette.surface,
    borderWidth: 1,
    borderColor: instructorPalette.border,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    shadowColor: instructorPalette.shadow,
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  messageBubbleOutgoing: {
    backgroundColor: instructorPalette.secondary,
    borderRadius: 20, 
    maxWidth: '95%',          
    borderBottomRightRadius: 4,
    shadowColor: instructorPalette.primary,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginLeft : 70, // se ancla al borde derecho
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  messageSender: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  messageText: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 14,
    lineHeight: 21,
  },

  messageBubbleWrap: {
    flex: 1,
    gap: 4,
    maxWidth: '95%',               // ← limita el ancho total incluyendo timestamp
  },

  // ── AVATAR del asistente ──────────────────────────────────
  messageAvatar: {
    width: 34,
    height: 34,
    marginRight: -14,
    marginBottom: 16,
    borderRadius: 17,
    backgroundColor: instructorPalette.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',      // se ancla abajo como en el CSS ref
    flexShrink: 0,
  },
  messageAvatarText: {
    color: instructorPalette.surface,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },

  // ── TIMESTAMP ─────────────────────────────────────────────
  messageTime: {
    fontSize: 11,
    color: instructorPalette.textMuted,
    marginTop: 3,
    fontFamily: 'PoppinsRegular',
  },
  messageTimeOutgoing: {
    textAlign: 'right',
  },

  // ── LOADING / ERROR / INFO ────────────────────────────────
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  loadingText: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    fontStyle: 'italic',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: instructorPalette.peachSurface,
    borderWidth: 1,
    borderColor: instructorPalette.coral,
    borderLeftWidth: 3,
    borderLeftColor: instructorPalette.coralText,
  },
  errorText: {
    flex: 1,
    color: instructorPalette.coralText,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: instructorPalette.mint,
    borderWidth: 1,
    borderColor: instructorPalette.border,
    borderLeftWidth: 3,
    borderLeftColor: instructorPalette.secondary,
  },
  infoText: {
    flex: 1,
    color: instructorPalette.lavanderText,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },

  // ── COMPOSER ──────────────────────────────────────────────
  composerCard: {
    backgroundColor: instructorPalette.surface,
    paddingHorizontal: 37,
    paddingVertical: 20,
    marginTop: 25,
    marginBottom: -30,
    marginHorizontal: -30,
    borderRadius: 40,
    borderBottomRightRadius: 0,
    borderBottomLeftRadius: 0,
    shadowColor: instructorPalette.dark,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 8,
  },
  composerInput: {
    minHeight: 45,
    maxWidth: '90%',
    color: instructorPalette.dark,
    fontFamily: 'PoppinsRegular',
    fontSize: 14,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  composerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8EE',
    paddingTop: 10,
  },
  composerHint: {
    flex: 1,
    color: '#8CA39E',
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 17,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: instructorPalette.surfaceMuted,
    borderWidth: 1,
    borderColor: instructorPalette.border,
  },
  iconButtonActive: {
    backgroundColor: instructorPalette.secondary,
    borderColor: instructorPalette.secondary,
  },
  iconButtonDisabled: {
    opacity: 0.45,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: instructorPalette.primary,
    shadowColor: instructorPalette.primary,
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  sendButtonDisabled: {
    opacity: 0.55,
    shadowOpacity: 0,
    elevation: 0,
  },
})
