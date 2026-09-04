declare module 'whisper.rn/index' {
  export type WhisperContext = {
    transcribeData: (data: ArrayBuffer, options: Record<string, unknown>) => {
      stop: () => Promise<void>;
      promise: Promise<{ result: string }>;
    };
  };

  export type WhisperVadContext = {
    detectSpeechData: (data: ArrayBuffer, options?: Record<string, unknown>) => Promise<Array<{ t0: number; t1: number }>>;
  };

  export function initWhisper(options: Record<string, unknown>): Promise<WhisperContext>;
  export function initWhisperVad(options: Record<string, unknown>): Promise<WhisperVadContext>;
}

declare module 'whisper.rn/realtime-transcription/' {
  export class RingBufferVad {
    constructor(context: unknown, options?: Record<string, unknown>);
  }

  export class RealtimeTranscriber {
    constructor(
      dependencies: Record<string, unknown>,
      options?: Record<string, unknown>,
      callbacks?: {
        onError?: (message: string) => void;
        onSliceTranscriptionStabilized?: (text: string) => void;
      }
    );
    start(): Promise<void>;
    stop(): Promise<void>;
  }
}

declare module 'whisper.rn/realtime-transcription/adapters/AudioPcmStreamAdapter' {
  export class AudioPcmStreamAdapter {
    release(): Promise<void>;
  }
}
