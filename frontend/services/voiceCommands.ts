export type SendCommandResult = {
  shouldSend: boolean;
  text: string;
};

function stripAccents(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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
