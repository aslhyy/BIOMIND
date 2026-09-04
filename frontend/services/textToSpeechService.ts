import * as Speech from 'expo-speech';
import { configureHandsFreeAudioSession } from './speechRecognitionService';

type SpeakOptions = {
  language?: string;
  rate?: number;
};

let preferredVoicePromise: Promise<string | undefined> | null = null;

function getPreferredSpanishVoice() {
  if (!preferredVoicePromise) {
    preferredVoicePromise = Speech.getAvailableVoicesAsync()
      .then((voices) => {
        const spanishVoices = voices.filter((voice) => /^es([_-]|$)/i.test(voice.language || ''));
        const scored = spanishVoices
          .map((voice) => ({
            identifier: voice.identifier,
            score:
              (/enhanced|premium|natural|neural/i.test(`${voice.name} ${voice.identifier}`) ? 8 : 0)
              + (/es[-_]CO/i.test(voice.language || '') ? 5 : 0)
              + (/es[-_]419|es[-_]MX|es[-_]US/i.test(voice.language || '') ? 3 : 0),
          }))
          .sort((a, b) => b.score - a.score);
        return scored[0]?.identifier;
      })
      .catch(() => undefined);
  }
  return preferredVoicePromise;
}

function cleanTextForSpeech(value: string) {
  return String(value || '')
    .replace(/https?:\/\/\S+/gi, 'enlace adjunto')
    .replace(/[*_`#>-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function stopTextToSpeech() {
  await Promise.resolve(Speech.stop());
}

export async function speakText(text: string, options: SpeakOptions = {}) {
  const cleanText = cleanTextForSpeech(text);

  if (!cleanText) {
    return;
  }

  await stopTextToSpeech();
  configureHandsFreeAudioSession();
  const voice = await getPreferredSpanishVoice();

  await new Promise<void>((resolve) => {
    let settled = false;
    const settle = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };

    Speech.speak(cleanText, {
      language: options.language || 'es-CO',
      pitch: 1.03,
      rate: options.rate || 0.98,
      voice,
      onDone: settle,
      onError: settle,
      onStopped: settle,
    });
  });
}
