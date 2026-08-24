import * as Speech from 'expo-speech';

/** Audible and accessible microphone cue using a module already bundled in Biomind. */
export async function playVoiceCue(kind: 'open' | 'close') {
  await new Promise<void>((resolve) => {
    let settled = false;
    const settle = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };

    Speech.speak(kind === 'open' ? 'Puedes hablar.' : 'Micrófono cerrado.', {
      language: 'es-CO',
      pitch: kind === 'open' ? 1.15 : 0.85,
      rate: 1.25,
      volume: 0.75,
      onDone: settle,
      onError: settle,
      onStopped: settle,
    });
  });
}
