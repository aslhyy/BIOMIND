import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

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
  start: (options: Record<string, unknown>) => void;
  stop: () => void;
};

type SpeechSessionOptions = {
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

  return isWebSpeechRecognitionSupported();
}

export async function requestSpeechRecognitionPermissions(): Promise<SpeechPermissionResult> {
  const nativeSpeech = getNativeSpeechModule();

  if (!nativeSpeech) {
    return {
      granted: isWebSpeechRecognitionSupported(),
      message: 'El reconocimiento nativo de voz requiere abrir Biomind desde una development build, no desde Expo Go.',
    };
  }

  if (cachedSpeechPermission?.granted) {
    return cachedSpeechPermission;
  }

  try {
    const permission = await nativeSpeech.requestPermissionsAsync();
    cachedSpeechPermission = permission.granted
      ? { granted: true }
      : {
        granted: false,
        message: 'Activa los permisos de microfono y reconocimiento de voz desde Ajustes del iPhone.',
      };

    return cachedSpeechPermission;
  } catch (error) {
    const typedError = error as { message?: string };
    cachedSpeechPermission = {
      granted: false,
      message: typedError?.message || 'No pudimos solicitar permisos de voz.',
    };
    return cachedSpeechPermission;
  }
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
      onEnd?.();
      onError?.(event?.message || 'No pudimos procesar el dictado por voz.');
      cleanup();
    }),
    nativeSpeech.addListener('result', (event) => {
      const transcript = event?.results?.[0]?.transcript || '';
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

      nativeSpeech.start({
        addsPunctuation: true,
        continuous: true,
        interimResults: true,
        lang: language,
      });
    },
    stop: () => {
      nativeSpeech.stop();
      cleanup();
    },
  };
}

export function createSpeechRecognitionSession({
  language = 'es-CO',
  onEnd,
  onError,
  onResult,
  onStart,
}: SpeechSessionOptions) {
  const options = { language, onEnd, onError, onResult, onStart };
  return createNativeSpeechRecognitionSession(options) || createWebSpeechRecognitionSession(options);
}
