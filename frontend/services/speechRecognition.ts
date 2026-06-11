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

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export function isSpeechRecognitionSupported() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }

  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function createSpeechRecognitionSession({
  language = 'es-CO',
  onEnd,
  onError,
  onResult,
  onStart,
}: {
  language?: string;
  onEnd?: () => void;
  onError?: (message: string) => void;
  onResult: (transcript: string, isFinal: boolean) => void;
  onStart?: () => void;
}) {
  if (!isSpeechRecognitionSupported()) {
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
