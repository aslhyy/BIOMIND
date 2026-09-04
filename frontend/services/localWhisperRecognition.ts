import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';

type LocalWhisperCallbacks = {
  initialPrompt?: string;
  onEnd?: () => void;
  onError?: (message: string) => void;
  onResult: (transcript: string, isFinal: boolean) => void;
  onStart?: () => void;
};

type WhisperContext = Awaited<ReturnType<typeof import('whisper.rn/index')['initWhisper']>>;
type WhisperVadContext = Awaited<ReturnType<typeof import('whisper.rn/index')['initWhisperVad']>>;

let whisperContextPromise: Promise<WhisperContext> | null = null;
let vadContextPromise: Promise<WhisperVadContext> | null = null;
let localWhisperFailed = false;

export function isLocalWhisperSupported() {
  if (Platform.OS === 'web') return false;
  return !localWhisperFailed && Boolean(NativeModules.RNWhisper || TurboModuleRegistry.get('RNWhisper'));
}

async function loadContexts() {
  const { initWhisper, initWhisperVad } = await import('whisper.rn/index');

  whisperContextPromise ||= initWhisper({
    filePath: require('../assets/models/ggml-small-q5_1.bin'),
    useFlashAttn: true,
    useGpu: true,
  });
  vadContextPromise ||= initWhisperVad({
    filePath: require('../assets/models/ggml-silero-v6.2.0.bin'),
    useGpu: true,
  });

  try {
    return await Promise.all([whisperContextPromise, vadContextPromise]);
  } catch (error) {
    whisperContextPromise = null;
    vadContextPromise = null;
    throw error;
  }
}

export function createLocalWhisperSession({
  initialPrompt = '',
  onEnd,
  onError,
  onResult,
  onStart,
}: LocalWhisperCallbacks) {
  let stopped = false;
  let transcriber: InstanceType<typeof import('whisper.rn/realtime-transcription/')['RealtimeTranscriber']> | null = null;
  let audioStream: InstanceType<typeof import('whisper.rn/realtime-transcription/adapters/AudioPcmStreamAdapter')['AudioPcmStreamAdapter']> | null = null;

  return {
    start: async () => {
      try {
        const [[whisperContext, vadContext], realtime, adapters] = await Promise.all([
          loadContexts(),
          import('whisper.rn/realtime-transcription/'),
          import('whisper.rn/realtime-transcription/adapters/AudioPcmStreamAdapter'),
        ]);
        if (stopped) return;

        audioStream = new adapters.AudioPcmStreamAdapter();
        const ringVad = new realtime.RingBufferVad(vadContext, {
          inferenceIntervalMs: 300,
          preRecordingBufferMs: 900,
          vadOptions: {
            threshold: 0.48,
            minSpeechDurationMs: 250,
            minSilenceDurationMs: 1100,
            maxSpeechDurationS: 28,
            speechPadMs: 250,
            samplesOverlap: 0.1,
          },
        });
        transcriber = new realtime.RealtimeTranscriber(
          { whisperContext, vadContext: ringVad, audioStream },
          {
            audioMinSec: 0.7,
            audioSliceSec: 28,
            initialPrompt,
            promptPreviousSlices: true,
            transcribeOptions: {
              language: 'es',
              beamSize: 5,
              bestOf: 5,
              maxThreads: 4,
              temperature: 0,
            },
          },
          {
            onError: (message) => onError?.(message),
            onSliceTranscriptionStabilized: (text) => {
              const cleaned = String(text || '').replace(/\[[^\]]+\]/g, '').trim();
              if (cleaned) onResult(cleaned, true);
            },
          }
        );
        await transcriber.start();
        if (!stopped) onStart?.();
      } catch (error) {
        localWhisperFailed = true;
        const message = error instanceof Error ? error.message : 'No se pudo iniciar Whisper local.';
        onError?.(message);
      }
    },
    stop: async () => {
      if (stopped) return;
      stopped = true;
      try {
        await transcriber?.stop();
        await audioStream?.release();
      } finally {
        onEnd?.();
      }
    },
  };
}
