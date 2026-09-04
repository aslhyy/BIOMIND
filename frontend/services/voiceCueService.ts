export type VoiceCueKind = 'open' | 'close' | 'success' | 'error';

type AudioPlayer = {
  play: () => void;
  remove: () => void;
  volume: number;
};

type ExpoAudioModule = {
  createAudioPlayer: (source: string, options?: { keepAudioSessionActive?: boolean }) => AudioPlayer;
};

function getExpoAudio(): ExpoAudioModule | null {
  if (!requireOptionalNativeModule('ExpoAudio')) return null;

  try {
    // Lazy loading keeps the app usable on an older development build. Audio
    // cues become available automatically after rebuilding the native app.
    return require('expo-audio') as ExpoAudioModule;
  } catch {
    return null;
  }
}

const cueFrequency: Record<VoiceCueKind, number> = { open: 880, close: 520, success: 1040, error: 260 };

function writeAscii(bytes: Uint8Array, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) bytes[offset + index] = value.charCodeAt(index);
}

function writeUint16(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = value & 255;
  bytes[offset + 1] = (value >> 8) & 255;
}

function writeUint32(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = value & 255;
  bytes[offset + 1] = (value >> 8) & 255;
  bytes[offset + 2] = (value >> 16) & 255;
  bytes[offset + 3] = (value >> 24) & 255;
}

function createToneUri(frequency: number) {
  const sampleRate = 8000;
  const sampleCount = 560;
  const bytes = new Uint8Array(44 + sampleCount * 2);
  writeAscii(bytes, 0, 'RIFF');
  writeUint32(bytes, 4, 36 + sampleCount * 2);
  writeAscii(bytes, 8, 'WAVEfmt ');
  writeUint32(bytes, 16, 16);
  writeUint16(bytes, 20, 1);
  writeUint16(bytes, 22, 1);
  writeUint32(bytes, 24, sampleRate);
  writeUint32(bytes, 28, sampleRate * 2);
  writeUint16(bytes, 32, 2);
  writeUint16(bytes, 34, 16);
  writeAscii(bytes, 36, 'data');
  writeUint32(bytes, 40, sampleCount * 2);
  for (let index = 0; index < sampleCount; index += 1) {
    const envelope = Math.sin(Math.PI * index / sampleCount);
    const sample = Math.round(Math.sin(2 * Math.PI * frequency * index / sampleRate) * envelope * 7000);
    writeUint16(bytes, 44 + index * 2, sample < 0 ? sample + 65536 : sample);
  }
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return `data:audio/wav;base64,${globalThis.btoa(binary)}`;
}

const cueUris = Object.fromEntries(
  Object.entries(cueFrequency).map(([kind, frequency]) => [kind, createToneUri(frequency)])
) as Record<VoiceCueKind, string>;

/** Plays a short non-verbal cue tied to the real microphone state. */
export async function playVoiceCue(kind: VoiceCueKind) {
  const expoAudio = getExpoAudio();
  if (!expoAudio) return;

  let player: AudioPlayer;
  try {
    player = expoAudio.createAudioPlayer(cueUris[kind], { keepAudioSessionActive: true });
  } catch {
    return;
  }
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      player.remove();
      resolve();
    }, 180);
    try {
      player.volume = kind === 'error' ? 0.55 : 0.38;
      player.play();
    } catch {
      clearTimeout(timeout);
      player.remove();
      resolve();
    }
  });
}
import { requireOptionalNativeModule } from 'expo';
