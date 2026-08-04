import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createSpeechRecognitionSession,
  isSpeechRecognitionSupported,
  requestSpeechRecognitionPermissions,
} from '@/services/speechRecognitionService';
import { speakText, stopTextToSpeech } from '@/services/textToSpeechService';
import { extractSendCommand } from '@/services/voiceCommands';

export type VoiceConversationStatus =
  | 'idle'
  | 'requesting-permission'
  | 'listening'
  | 'processing'
  | 'waiting-ai'
  | 'speaking'
  | 'error';

type UseVoiceConversationOptions = {
  canStart?: boolean;
  language?: string;
  onSendMessage: (text: string) => Promise<string | void>;
  silenceMs?: number;
  speechEnabled?: boolean;
};

const DEFAULT_SILENCE_MS = 1500;
const RESTART_DELAY_MS = 450;

function cleanTranscript(value: string) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function useVoiceConversation({
  canStart = true,
  language = 'es-CO',
  onSendMessage,
  silenceMs = DEFAULT_SILENCE_MS,
  speechEnabled = true,
}: UseVoiceConversationOptions) {
  const [status, setStatus] = useState<VoiceConversationStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [error, setError] = useState('');
  const [isConversationActive, setIsConversationActive] = useState(false);

  const activeRef = useRef(false);
  const canStartRef = useRef(canStart);
  const lastSentTranscriptRef = useRef('');
  const latestTranscriptRef = useRef('');
  const listeningRef = useRef(false);
  const onSendMessageRef = useRef(onSendMessage);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendInProgressRef = useRef(false);
  const sessionRef = useRef<ReturnType<typeof createSpeechRecognitionSession> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechEnabledRef = useRef(speechEnabled);

  const finishTranscriptRef = useRef<(value: string) => void>(() => {});
  const startListeningRef = useRef<() => void>(() => {});

  useEffect(() => {
    canStartRef.current = canStart;
  }, [canStart]);

  useEffect(() => {
    onSendMessageRef.current = onSendMessage;
  }, [onSendMessage]);

  useEffect(() => {
    speechEnabledRef.current = speechEnabled;
  }, [speechEnabled]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const scheduleListeningRestart = useCallback((delay = RESTART_DELAY_MS) => {
    clearRestartTimer();

    if (!activeRef.current) {
      return;
    }

    restartTimerRef.current = setTimeout(() => {
      if (activeRef.current && !listeningRef.current && !sendInProgressRef.current) {
        startListeningRef.current();
      }
    }, delay);
  }, [clearRestartTimer]);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    sessionRef.current?.stop();
    sessionRef.current = null;
    listeningRef.current = false;
  }, [clearSilenceTimer]);

  const startListening = useCallback(() => {
    if (!activeRef.current || !canStartRef.current || listeningRef.current || sendInProgressRef.current) {
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      setStatus('error');
      setError('El reconocimiento de voz requiere una development build de Biomind instalada en el iPhone.');
      return;
    }

    clearSilenceTimer();
    clearRestartTimer();
    latestTranscriptRef.current = '';
    setPartialTranscript('');
    setError('');
    void stopTextToSpeech();

    const session = createSpeechRecognitionSession({
      language,
      onEnd: () => {
        listeningRef.current = false;

        if (activeRef.current && !sendInProgressRef.current) {
          scheduleListeningRestart();
        }
      },
      onError: (message) => {
        listeningRef.current = false;
        setStatus('error');
        setError(message);
      },
      onResult: (nextTranscript, isFinal) => {
        const cleanText = cleanTranscript(nextTranscript);
        const sendCommand = extractSendCommand(cleanText);
        const visibleText = sendCommand.text || cleanText;
        latestTranscriptRef.current = visibleText;
        setPartialTranscript(visibleText);

        clearSilenceTimer();

        if (!cleanText) {
          return;
        }

        if (sendCommand.shouldSend) {
          if (sendCommand.text) {
            finishTranscriptRef.current(sendCommand.text);
          }
          return;
        }

        if (isFinal) {
          finishTranscriptRef.current(cleanText);
          return;
        }

        silenceTimerRef.current = setTimeout(() => {
          finishTranscriptRef.current(latestTranscriptRef.current);
        }, silenceMs);
      },
      onStart: () => {
        listeningRef.current = true;
        setStatus('listening');
      },
    });

    if (!session) {
      setStatus('error');
      setError('El reconocimiento de voz no esta disponible en este dispositivo.');
      return;
    }

    sessionRef.current = session;
    void Promise.resolve(session.start());
  }, [clearRestartTimer, clearSilenceTimer, language, scheduleListeningRestart, silenceMs]);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const restartListeningAfterSpeech = useCallback(() => {
    scheduleListeningRestart();
  }, [scheduleListeningRestart]);

  const finishTranscript = useCallback(async (rawTranscript: string) => {
    const cleanText = cleanTranscript(rawTranscript);

    if (!activeRef.current || !cleanText || sendInProgressRef.current) {
      return;
    }

    if (cleanText === lastSentTranscriptRef.current) {
      return;
    }

    sendInProgressRef.current = true;
    lastSentTranscriptRef.current = cleanText;
    clearSilenceTimer();
    stopListening();
    setTranscript(cleanText);
    setPartialTranscript('');
    setStatus('processing');

    try {
      setStatus('waiting-ai');
      const responseText = cleanTranscript(String(await onSendMessageRef.current(cleanText) || ''));

      if (!activeRef.current) {
        return;
      }

      if (responseText) {
        setStatus('speaking');

        if (speechEnabledRef.current) {
          await speakText(responseText, { language, rate: 0.95 });
        }
      }

      if (activeRef.current) {
        restartListeningAfterSpeech();
      }
    } catch (nextError) {
      const typedError = nextError as { message?: string };
      setStatus('error');
      setError(typedError?.message || 'Ocurrio un error durante la conversacion por voz.');
    } finally {
      sendInProgressRef.current = false;
    }
  }, [clearSilenceTimer, language, restartListeningAfterSpeech, stopListening]);

  useEffect(() => {
    finishTranscriptRef.current = finishTranscript;
  }, [finishTranscript]);

  const startConversation = useCallback(async () => {
    if (!canStartRef.current) {
      setStatus('error');
      setError('Selecciona un proyecto antes de iniciar la conversacion.');
      return;
    }

    activeRef.current = true;
    setIsConversationActive(true);
    setError('');
    setStatus('requesting-permission');

    const permission = await requestSpeechRecognitionPermissions();

    if (!activeRef.current) {
      return;
    }

    if (!permission.granted) {
      activeRef.current = false;
      setIsConversationActive(false);
      setStatus('error');
      setError(permission.message || 'No se concedieron permisos de voz.');
      return;
    }

    startListeningRef.current();
  }, []);

  const stopConversation = useCallback(() => {
    activeRef.current = false;
    setIsConversationActive(false);
    sendInProgressRef.current = false;
    clearRestartTimer();
    clearSilenceTimer();
    stopListening();
    void stopTextToSpeech();
    latestTranscriptRef.current = '';
    setPartialTranscript('');
    setStatus('idle');
  }, [clearRestartTimer, clearSilenceTimer, stopListening]);

  useEffect(() => stopConversation, [stopConversation]);

  return {
    error,
    isConversationActive,
    partialTranscript,
    startConversation,
    startListening,
    status,
    stopConversation,
    stopListening,
    transcript,
  };
}
