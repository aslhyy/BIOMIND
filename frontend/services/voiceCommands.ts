export type SendCommandResult = {
  shouldSend: boolean;
  text: string;
};

export type LabVoiceIntent =
  | { type: 'choose-companion'; mode: 'automatic' | 'on-demand' }
  | { type: 'create-bitacora' }
  | { type: 'save-bitacora' }
  | { type: 'read-summary' }
  | { type: 'finish-session' }
  | { type: 'cancel-last' }
  | { type: 'technical-question' }
  | { type: 'practice-note'; text: string };

function stripAccents(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeCommand(value: string) {
  return stripAccents(String(value || ''))
    .toLocaleLowerCase('es')
    .replace(/[^a-z0-9ñ%\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Maps natural laboratory phrases to a small, memorable command set. */
export function parseLabVoiceIntent(value: string): LabVoiceIntent {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  const normalized = normalizeCommand(text);

  if (/\b(automatico|acompanamiento automatico|preguntas automaticas|modo guiado)\b/.test(normalized)) {
    return { type: 'choose-companion', mode: 'automatic' };
  }
  if (/\b(solo cuando|cuando te necesite|cuando necesite|bajo demanda|sin preguntas)\b/.test(normalized)) {
    return { type: 'choose-companion', mode: 'on-demand' };
  }
  if (/\b(guardar|guarda|registrar|registra)\b.*\b(bitacora|registro)\b/.test(normalized)) {
    return { type: 'save-bitacora' };
  }
  if (/\b(crear|crea|preparar|prepara|generar|genera|hacer|haz)\b.*\b(bitacora|registro)\b/.test(normalized)) {
    return { type: 'create-bitacora' };
  }
  if (/\b(leer|lee|leeme|mostrar|muestra|muestrame|dime|dame|resumir|resume)\b.*\b(resumen|bitacora|registro)\b/.test(normalized)) {
    return { type: 'read-summary' };
  }
  if (/\b(finalizar|terminar|cerrar|salir)\b.*\b(sesion|conversacion|manos libres|practica)\b/.test(normalized)) {
    return { type: 'finish-session' };
  }
  if (/\b(cancela|cancelar|elimina|eliminar|borra|borrar)\b.*\b(ultimo|ultima|anotacion|registro)\b/.test(normalized)) {
    return { type: 'cancel-last' };
  }
  // Speech recognition often omits question marks and can prepend filler such
  // as "la pregunta que te hice". Detect the purpose, not just the first word.
  const isTechnicalQuestion = text.includes('?')
    || /^(que|como|cual|cuanto|por que|puedo|debo|explicame|consulta|respondeme|dime)\b/.test(normalized)
    || /\b(?:pregunta|preguntando|pregunte|duda|consulta)\b/.test(normalized)
    || /\b(?:que|como|cual|cuanto|por que)\s+(?:debo|puedo|hago|hacer|se hace|ocurre|pasaria|evito|soluciono)\b/.test(normalized)
    || /\b(?:puede|pueden|significa|confirma|conviene|recomiendas|seria)\b.*\b(?:contamin|riesgo|afectar|causar|provocar|necesari|segur|correct|normal)\w*/.test(normalized)
    || /^(?:y|entonces)\s+(?:que|como|por que|cual)\b/.test(normalized)
    || /\b(?:necesito|quiero)\s+saber\b/.test(normalized);
  if (isTechnicalQuestion) {
    return { type: 'technical-question' };
  }
  return { type: 'practice-note', text };
}

/** Fixes recurring recognizer substitutions that are unambiguous in plant biotechnology context. */
export function correctBiotechnologyTranscript(value: string) {
  const corrected = String(value || '')
    .replace(/\b(?:exfoliantes|explayes|ex plantes|im plantes|implantes|desplantes|expedientes|excelentes)\b/gi, 'explantes')
    .replace(/\bexplantes\s+(?:demora|demore|de more)\b/gi, 'explantes de mora')
    .replace(/\bciclo\s+hipoclorito\b/gi, 'hipoclorito')
    .replace(/\bhipo\s*clorito\b/gi, 'hipoclorito')
    .replace(/\b(?:que|qué)\s+va\s+a\s+hacer\b/gi, 'qué debo hacer')
    .replace(/\bse\s+estrell[oó]\s+y\s+el\s+recipiente\b/gi, 'se abrió el recipiente')
    .replace(/\b(?:ome|o me)\s+te\s+pregunt[eé]\b/gi, 'te pregunté')
    .replace(/\bdesinfecci[oó]n\s+explantes\b/gi, 'desinfección de explantes')
    .replace(/\bprimero\s+le\s+vamos\s+los\s+explantes\b/gi, 'primero lavamos los explantes')
    .replace(/\bsalir\s+del\s+medio\s+mariachi\s+y\s+escoja\b/gi, 'sales del medio Murashige y Skoog')
    .replace(/\bsales?\s+del\s+medio\s+mariachi(?:\s+y\s+escoja)?\b/gi, 'sales del medio Murashige y Skoog')
    .replace(/\bmedio\s+mar[ií]a\s+sigue\s+gesco\b/gi, 'medio Murashige y Skoog')
    .replace(/\bsalir\s+del\s+medio\s+mariachi\s+y\s+escoger\b/gi, 'sales del medio Murashige y Skoog')
    .replace(/\b(?:y\s+la\s+gar|el\s+agar)\b/gi, 'agar')
    .replace(/\b(dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|varios|\d+)\s+explante\b/gi, '$1 explantes')
    .replace(/\bfrescos\b/gi, 'frascos')
    .replace(/\bpor\s+qu[eé]\s+si\s+te\s+voy\s+a\s+ajustar\b/gi, 'por qué se debe ajustar')
    .replace(/\bcausar\s*[-–]\s*con\s+agar\b/gi, 'causar que un medio con agar')
    .replace(/\boscurecer\s+si\s+uno\b/gi, 'oscurecer y uno')
    .replace(/\b(cinco|seis|siete|ocho|nueve|diez|once|doce|\d+)\s+frascos\s+y\s+solidificaron\b/gi, '$1 frascos se solidificaron')
    .replace(/\bpara\s+explante\s+de\b/gi, 'para explantes de')
    .replace(/\bescurrimiento\s+del\s+explante\b/gi, 'oscurecimiento del explante')
    .replace(/\bin\s+vitro\b/gi, 'in vitro')
    .replace(/\b([a-záéíóúñ]{3,})\s+\1\b/gi, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  const words = corrected.split(' ');
  if (words.length >= 6 && words.length % 2 === 0) {
    const middle = words.length / 2;
    if (words.slice(0, middle).join(' ').toLocaleLowerCase('es') === words.slice(middle).join(' ').toLocaleLowerCase('es')) {
      return words.slice(0, middle).join(' ');
    }
  }
  return corrected;
}

export function extractSendCommand(value: string): SendCommandResult {
  const text = String(value || '').replace(/\s+/g, ' ').trim();

  if (!text) {
    return { shouldSend: false, text: '' };
  }

  const normalized = stripAccents(text).toLowerCase();
  const hasSendCommand = /\b(enviar|envia)\b[\s.!?]*$/.test(normalized);

  if (!hasSendCommand) {
    return { shouldSend: false, text };
  }

  return {
    shouldSend: true,
    text: text.replace(/\s*\b(enviar|envia|env\u00eda)\b[\s.!?]*$/i, '').trim(),
  };
}
