import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import { createLocalWhisperSession, isLocalWhisperSupported } from '@/services/localWhisperRecognition';

type SpeechRecognitionAlternative = {
  transcript: string;
};

type SpeechRecognitionResultItem = {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultItem>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: null | (() => void);
  onerror: null | ((event: { error?: string }) => void);
  onresult: null | ((event: SpeechRecognitionEventLike) => void);
  onstart: null | (() => void);
  start: () => void;
  stop: () => void;
};

type NativeSpeechModule = {
  abort: () => void;
  addListener: (eventName: string, listener: (event: any) => void) => { remove: () => void };
  isRecognitionAvailable: () => boolean;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  setAudioSessionActiveIOS?: (active: boolean, options?: { notifyOthersOnDeactivation: boolean }) => void;
  setCategoryIOS?: (options: {
    category: 'playAndRecord';
    categoryOptions: ('defaultToSpeaker' | 'allowBluetooth')[];
    mode: 'default' | 'measurement';
  }) => void;
  start: (options: Record<string, unknown>) => void;
  stop: () => void;
};

const HANDS_FREE_IOS_CATEGORY = {
  category: 'playAndRecord' as const,
  categoryOptions: ['defaultToSpeaker', 'allowBluetooth'] as ('defaultToSpeaker' | 'allowBluetooth')[],
  mode: 'default' as const,
};

type SpeechSessionOptions = {
  contextualStrings?: string[];
  language?: string;
  onEnd?: () => void;
  onError?: (message: string) => void;
  onResult: (transcript: string, isFinal: boolean) => void;
  onStart?: () => void;
};

type SpeechPermissionResult = {
  granted: boolean;
  message?: string;
};

let cachedSpeechPermission: SpeechPermissionResult | null = null;

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

function getNativeSpeechModule(): NativeSpeechModule | null {
  if (Platform.OS === 'web') {
    return null;
  }

  return requireOptionalNativeModule<NativeSpeechModule>('ExpoSpeechRecognition');
}

function isWebSpeechRecognitionSupported() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }

  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function isSpeechRecognitionSupported() {
  const nativeSpeech = getNativeSpeechModule();

  if (nativeSpeech) {
    try {
      return nativeSpeech.isRecognitionAvailable();
    } catch {
      return true;
    }
  }

  if (isLocalWhisperSupported()) {
    return true;
  }

  return isWebSpeechRecognitionSupported();
}

/** Keeps voice replies on the loudspeaker while preserving microphone access on iOS. */
export function configureHandsFreeAudioSession() {
  if (Platform.OS !== 'ios') {
    return;
  }

  const nativeSpeech = getNativeSpeechModule();
  nativeSpeech?.setCategoryIOS?.(HANDS_FREE_IOS_CATEGORY);
  nativeSpeech?.setAudioSessionActiveIOS?.(true, { notifyOthersOnDeactivation: false });
}

export async function requestSpeechRecognitionPermissions(): Promise<SpeechPermissionResult> {
  const nativeSpeech = getNativeSpeechModule();

  if (nativeSpeech) {
    if (cachedSpeechPermission?.granted) return cachedSpeechPermission;
    try {
      const permission = await nativeSpeech.requestPermissionsAsync();
      cachedSpeechPermission = permission.granted
        ? { granted: true }
        : { granted: false, message: 'Activa los permisos de micrófono y reconocimiento de voz desde Ajustes del iPhone.' };
      return cachedSpeechPermission;
    } catch (error) {
      const typedError = error as { message?: string };
      return { granted: false, message: typedError?.message || 'No pudimos solicitar permisos de voz.' };
    }
  }

  if (isLocalWhisperSupported()) {
    try {
      const { requestRecordingPermissionsAsync } = await import('expo-audio');
      const permission = await requestRecordingPermissionsAsync();
      return permission.granted
        ? { granted: true }
        : { granted: false, message: 'Activa el permiso de micrófono para BIOMIND desde Ajustes.' };
    } catch (error) {
      const typedError = error as { message?: string };
      return { granted: false, message: typedError?.message || 'No pudimos solicitar el permiso de micrófono.' };
    }
  }

  return {
    granted: isWebSpeechRecognitionSupported(),
    message: 'El reconocimiento de voz requiere una development build de Biomind, no Expo Go.',
  };
}

function createWebSpeechRecognitionSession({
  language,
  onEnd,
  onError,
  onResult,
  onStart,
}: Required<Pick<SpeechSessionOptions, 'language' | 'onResult'>> & Omit<SpeechSessionOptions, 'language' | 'onResult'>) {
  if (!isWebSpeechRecognitionSupported()) {
    return null;
  }

  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognitionCtor) {
    return null;
  }

  const recognition = new SpeechRecognitionCtor();
  recognition.lang = language;
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = () => {
    onStart?.();
  };

  recognition.onend = () => {
    onEnd?.();
  };

  recognition.onerror = (event) => {
    onError?.(event?.error || 'No pudimos procesar el dictado por voz.');
  };

  recognition.onresult = (event) => {
    let combined = '';
    let isFinal = false;

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      combined += `${result?.[0]?.transcript || ''} `;
      isFinal = Boolean(result?.isFinal) || isFinal;
    }

    onResult(combined.trim(), isFinal);
  };

  return {
    start: () => recognition.start(),
    stop: () => recognition.stop(),
  };
}

function createNativeSpeechRecognitionSession({
  contextualStrings,
  language,
  onEnd,
  onError,
  onResult,
  onStart,
}: Required<Pick<SpeechSessionOptions, 'language' | 'onResult'>> & Omit<SpeechSessionOptions, 'language' | 'onResult'>) {
  const nativeSpeech = getNativeSpeechModule();

  if (!nativeSpeech) {
    return null;
  }

  let cleanedUp = false;
  let stopped = false;
  let subscriptions: { remove: () => void }[] = [];
  const cleanup = () => {
    if (cleanedUp) {
      return;
    }

    cleanedUp = true;
    subscriptions.forEach((subscription) => subscription.remove());
  };

  subscriptions = [
    nativeSpeech.addListener('start', () => {
      onStart?.();
    }),
    nativeSpeech.addListener('end', () => {
      onEnd?.();
      cleanup();
    }),
    nativeSpeech.addListener('error', (event) => {
      onError?.(event?.message || 'No pudimos procesar el dictado por voz.');
      cleanup();
    }),
    nativeSpeech.addListener('result', (event) => {
      const alternatives = Array.isArray(event?.results) ? event.results : [];
      const transcript = alternatives
        .slice()
        .sort((a: { confidence?: number }, b: { confidence?: number }) => (b.confidence || 0) - (a.confidence || 0))[0]
        ?.transcript || '';
      onResult(transcript.trim(), Boolean(event?.isFinal));
    }),
  ];

  return {
    start: async () => {
      const permission = await requestSpeechRecognitionPermissions();

      if (!permission.granted) {
        onError?.(permission.message || 'Necesitamos permiso de microfono y reconocimiento de voz para dictar la bitacora.');
        return;
      }

      if (stopped) {
        return;
      }

      nativeSpeech.start({
        addsPunctuation: true,
        continuous: true,
        contextualStrings,
        interimResults: true,
        iosTaskHint: 'dictation',
        lang: language,
        maxAlternatives: 3,
        iosCategory: HANDS_FREE_IOS_CATEGORY,
      });
    },
    stop: () => {
      stopped = true;
      nativeSpeech.stop();
      cleanup();
    },
  };
}

export function createSpeechRecognitionSession({
  contextualStrings = [],
  language = 'es-CO',
  onEnd,
  onError,
  onResult,
  onStart,
}: SpeechSessionOptions) {
  const options = { contextualStrings, language, onEnd, onError, onResult, onStart };
  const nativeSession = createNativeSpeechRecognitionSession(options);
  if (nativeSession) return nativeSession;

  if (isLocalWhisperSupported()) {
    return createLocalWhisperSession({
      initialPrompt: [
        'Conversación de laboratorio de biotecnología vegetal en español de Colombia.',
        'Transcribe literalmente, conservando cantidades, negaciones y preguntas.',
        contextualStrings.join(', '),
      ].join(' '),
      onEnd,
      onError,
      onResult,
      onStart,
    });
  }
  return createWebSpeechRecognitionSession(options);
}
