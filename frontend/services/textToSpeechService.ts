import * as Speech from 'expo-speech';

type SpeakOptions = {
  language?: string;
  rate?: number;
};

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
      rate: options.rate || 0.95,
      onDone: settle,
      onError: settle,
      onStopped: settle,
    });
  });
}
