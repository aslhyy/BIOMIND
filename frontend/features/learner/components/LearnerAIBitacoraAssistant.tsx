import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { learnerPalette } from '@/features/learner/theme';
import { FormattedMarkdownText } from '@/features/workspace/components/FormattedMarkdownText';
import { ImagePreviewModal } from '@/features/workspace/components/ImagePreviewModal';
import { UserAvatar } from '@/features/workspace/components/UserAvatar';
import type { AuthenticatedSession, WorkspaceChatMessage } from '@/features/workspace/types';
import { useVoiceConversation } from '@/hooks/useVoiceConversation';
// @ts-ignore
import { escucharContextoAcademicoUsuario, escucharGruposTrabajo, escucharProyectos } from '@/services/academic';
// @ts-ignore
import { escucharBitacorasAprendiz, guardarBitacora } from '@/services/bitacoras';
import { generateGeminiReply } from '@/services/gemini';
import { correctBiotechnologyTranscript, extractSendCommand, parseLabVoiceIntent } from '@/services/voiceCommands';
import { playVoiceCue } from '@/services/voiceCueService';
import { speakText, stopTextToSpeech } from '@/services/textToSpeechService';
import { VoiceConversationButton } from './VoiceConversationButton';
import { VoiceConversationStatus } from './VoiceConversationStatus';

type RecordItem = { id: string; [key: string]: any };

type Project = {
  id: string;
  titulo?: string;
  descripcion?: string;
  fichaId?: string;
  fichaNumero?: string;
  competenciaNombre?: string;
  rapDescripcion?: string;
  instructorUid?: string;
  asignacionTipo?: 'aprendices' | 'grupo';
  aprendizIds?: string[];
  grupoId?: string | null;
  estado?: string;
  activo?: boolean;
};

type WorkGroup = {
  id: string;
  fichaId?: string;
  fichaNumero?: string;
  aprendizIds?: string[];
};

type AssistantMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  mode?: 'manual' | 'voice';
};

type AssistantConversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  messages: AssistantMessage[];
  titleGenerated?: boolean;
};

type FieldKey = 'nombre' | 'fecha' | 'descripcion' | 'avance' | 'dificultades' | 'archivoUrl';

type Evidence = {
  nombre: string;
  mimeType?: string;
  tipo: 'imagen' | 'archivo';
  uri: string;
};

type FormState = {
  nombre: string;
  archivoNombre: string;
  archivoUrl: string;
  avance: string;
  descripcion: string;
  dificultades: string;
  evidencias: Evidence[];
  fecha: string;
};

type ExtraAnswer = {
  answer: string;
  question: string;
};

type PracticeMemory = {
  actividad: string;
  procedimiento: string;
  materiales: string;
  resultados: string;
  dificultades: string;
};

const emptyPracticeMemory: PracticeMemory = {
  actividad: '',
  procedimiento: '',
  materiales: '',
  resultados: '',
  dificultades: '',
};

const biotechnologyVocabulary = [
  'explante', 'explantes', 'cultivo in vitro', 'micropropagación', 'hipoclorito de sodio',
  'desinfección', 'contaminación cruzada', 'medio de cultivo', 'Murashige y Skoog',
  'meristemo', 'meristemos', 'callogénesis', 'organogénesis', 'aclimatación', 'fitohormona',
  'auxina', 'citoquinina', 'autoclave', 'cabina de flujo laminar', 'inóculo', 'siembra',
];

type Props = {
  autoSaveEnabled?: boolean;
  autoStartVoiceSignal?: number;
  preferredProjectId?: string;
  session: AuthenticatedSession;
  voiceEnabled?: boolean;
  voiceSuggestionsEnabled?: boolean;
};

const emptyContext = {
  fichas: [] as RecordItem[],
  instructores: [] as RecordItem[],
};

const fieldLabels: Record<FieldKey, string> = {
  nombre: 'Nombre de la bitácora',
  fecha: 'Fecha',
  descripcion: 'Actividad realizada',
  avance: 'Avance alcanzado',
  dificultades: 'Dificultades o novedades',
  archivoUrl: 'Documento externo opcional',
};

const guidedOrder: FieldKey[] = ['nombre', 'fecha', 'descripcion', 'avance', 'dificultades'];

const today = () => new Date().toISOString().slice(0, 10);

function buildMessageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildConversationId() {
  return buildMessageId('conversation');
}

function getConversationTitle(messages: AssistantMessage[], fallback = 'Conversación nueva') {
  const firstUserMessage = messages.find((message) => message.role === 'user' && message.text.trim());
  const title = firstUserMessage?.text.trim() || fallback;
  return title.length > 44 ? `${title.slice(0, 41)}...` : title;
}

function normalizeText(value: unknown) {
  return String(value || '').trim();
}

function getFirstName(name: string) {
  return name.split(' ').filter(Boolean)[0] || 'Aprendiz';
}

function cleanSpeechText(value: string) {
  return value
    .replace(/https?:\/\/\S+/gi, 'enlace adjunto')
    .replace(/[*_`#>-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isYes(value: string) {
  const normalized = value.trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return /^(si|claro|confirmo|de acuerdo|guardala|guardalo|hazlo|dale)(\b|$)/.test(normalized);
}

function isStopSessionCommand(value: string) {
  const normalized = value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return /\b(finalizar|terminar|detener|pausar|cerrar|salir)\b.*\b(sesion|conversacion|escucha|microfono|manos libres|practica)\b/.test(normalized);
}

function splitEmbeddedVoiceCommand(value: string) {
  const text = value.trim();
  const command = text.match(/\b(?:l[eé]eme|dame|muestra(?:me)?|crear|crea|guardar|guarda|finalizar|terminar|cerrar)\b.*\b(?:resumen|bit[aá]cora|conversaci[oó]n|sesi[oó]n)\b/i);
  if (!command || typeof command.index !== 'number' || command.index < 8) return [text];
  return [text.slice(0, command.index).trim(), text.slice(command.index).trim()].filter(Boolean);
}

function getTechnicalSafetyFallback(question: string) {
  const normalized = question.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (/\bph\b/.test(normalized)) {
    return 'El pH influye en la disponibilidad de nutrientes y en la gelificación del medio. Ajústalo antes de esterilizar según el protocolo del laboratorio, porque el calentamiento puede modificarlo.';
  }
  if (/condens/.test(normalized)) {
    return 'La condensación no confirma contaminación, pero el exceso de humedad puede favorecerla y dificultar la observación. Revisa turbidez, cambios de color, crecimiento extraño y el cierre del frasco sin abrirlo; si hay sospecha, aíslalo y avisa al instructor.';
  }
  if (/oscurec|marron|necros/.test(normalized)) {
    return 'El oscurecimiento no significa necesariamente contaminación: también puede deberse a oxidación o estrés del tejido. Revisa si hay turbidez, micelio, colonias u olor anormal y confirma el manejo con tu instructor.';
  }
  if (/turbidez|turbio/.test(normalized)) {
    return 'La turbidez es una señal compatible con contaminación microbiana, aunque debe confirmarse junto con otros cambios visibles. No abras el frasco: aíslalo, identifícalo y notifícalo al instructor.';
  }
  if (/agar|solidific|gelific/.test(normalized)) {
    return 'Un medio con agar puede no solidificar por una concentración insuficiente, pH inadecuado, calentamiento incorrecto o errores de preparación. Mantén el frasco cerrado y revisa cantidades, pH y ciclo aplicado con el instructor.';
  }
  if (/contamin|frasco|recipiente/.test(normalized)) {
    return 'No abras el recipiente sospechoso. Aíslalo, identifícalo y avisa al instructor; revisen el protocolo del laboratorio para decidir su descarte o tratamiento seguro.';
  }
  if (/autoclave|esteriliz/.test(normalized)) {
    return 'Verifica el protocolo, la compatibilidad del material y los indicadores del ciclo antes de usarlo. No improvises tiempos ni temperaturas: confirma esos parámetros con el instructor responsable.';
  }

  return 'Por seguridad, conserva el material cerrado y consulta el protocolo específico del laboratorio con tu instructor. Puedes reformular la duda indicando el material, el cambio observado y la etapa del procedimiento.';
}

function getSessionWelcome(projectTitle: string) {
  return `Sesión lista para ${projectTitle}. ¿Quieres acompañamiento automático o prefieres hablarme solo cuando me necesites?`;
}

function isNo(value: string) {
  const normalized = value.trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return /^(no|cancelar|cancela|corregir|corrige|todavia no)(\b|$)/.test(normalized);
}

function extractDate(value: string) {
  const normalized = value.trim();
  const isoDate = normalized.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
  if (isoDate) return isoDate;

  if (/\bhoy\b/i.test(normalized)) return today();

  return '';
}

function extractUrl(value: string) {
  return value.match(/https?:\/\/\S+/i)?.[0]?.replace(/[),.;]+$/g, '') || '';
}

function getFieldQuestion(field: FieldKey, projectTitle: string, currentDate: string) {
  switch (field) {
    case 'nombre':
      return '¿Qué nombre quieres ponerle a esta bitácora?';
    case 'fecha':
      return `Empecemos la bitácora de ${projectTitle}. La fecha está como ${currentDate}. Si es otra, dime la fecha en formato AAAA-MM-DD.`;
    case 'descripcion':
      return 'Cuéntame la actividad realizada. ¿Qué hiciste en el laboratorio o durante el seguimiento del proyecto?';
    case 'avance':
      return 'Ahora dime el avance alcanzado. ¿Qué resultado obtuviste o qué cambió en el proyecto?';
    case 'dificultades':
      return '¿Hubo dificultades, dudas, novedades o riesgos? Si no hubo, puedes decir "sin dificultades".';
    case 'archivoUrl':
      return '¿Quieres agregar un enlace externo de evidencia o documento? Si tienes uno, pégalo o díctalo; si no, responde "no".';
    default:
      return 'Cuéntame el siguiente dato de la bitácora.';
  }
}

function applyFieldValue(field: FieldKey, value: string, current: FormState): FormState {
  const text = value.trim();

  if (field === 'fecha') {
    return { ...current, fecha: extractDate(text) || current.fecha || today() };
  }

  if (field === 'archivoUrl') {
    const url = extractUrl(text);
    if (!url || isNo(text)) {
      return current;
    }

    return {
      ...current,
      archivoNombre: current.archivoNombre || 'Evidencia externa',
      archivoUrl: url,
    };
  }

  if (field === 'dificultades' && isNo(text)) {
    return { ...current, dificultades: current.dificultades || 'Sin dificultades registradas.' };
  }

  return {
    ...current,
    [field]: current[field] ? `${current[field]}\n${text}` : text,
  };
}

function buildExtraNotes(extraAnswers: ExtraAnswer[]) {
  if (!extraAnswers.length) return '';

  return [
    'Preguntas complementarias de BIOMIND IA:',
    ...extraAnswers.map((item, index) => `${index + 1}. ${item.question}\nRespuesta: ${item.answer}`),
  ].join('\n');
}

function getNextMemoryQuestion(memory: PracticeMemory) {
  if (!memory.actividad) return '¿Qué actividad realizaron durante la práctica?';
  if (!memory.procedimiento) return '¿Qué procedimiento realizaron?';
  if (!memory.resultados) return '¿Qué resultado observable obtuvieron?';
  if (!memory.dificultades) return '¿Se presentó alguna dificultad o riesgo? Puedes decir “sin dificultades”.';
  return '';
}

function cleanPracticeStatement(value: string) {
  const cleaned = correctBiotechnologyTranscript(value)
    .replace(/^\s*(?:registra|registrar|anota|anotar|guarda|guardar)(?:\s+que)?\s+/i, '')
    .replace(/^\s*como\s+actividad\s+/i, '')
    .replace(/^\s*(?:a[nñ]ade|a[nñ]adir|agrega|agregar)(?:\s+que)?(?:\s+como\s+dificultad)?\s+/i, '')
    .replace(/\bdecid[ií]\s+decidimos\b/gi, 'decidimos')
    .replace(/\bexplante\s+es\b/gi, 'explantes')
    .replace(/\s+([,.;:])/g, '$1')
    .trim();
  if (!cleaned) return '';
  return `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}`.replace(/[.]+$/g, '');
}

function buildPracticeTitle(activity: string, projectTitle: string) {
  const normalized = cleanPracticeStatement(activity)
    .replace(/^(?:hoy\s+)?(?:iniciamos|realizamos|hicimos|se realizó|se realizo)\s+(?:la|el|una|un)?\s*/i, '')
    .trim();
  const title = normalized || `Bitácora de ${projectTitle}`;
  return `${title.charAt(0).toUpperCase()}${title.slice(1)}`.slice(0, 80);
}

function asSentence(value: string) {
  const clean = cleanPracticeStatement(value);
  return clean ? `${clean}.` : '';
}

function memoryToForm(memory: PracticeMemory, current: FormState, projectTitle: string): FormState {
  const description = [memory.actividad, memory.procedimiento, memory.materiales]
    .map(asSentence)
    .filter(Boolean)
    .join('\n\n');
  return {
    ...current,
    nombre: memory.actividad ? buildPracticeTitle(memory.actividad, projectTitle) : current.nombre,
    descripcion: description || current.descripcion,
    avance: asSentence(memory.resultados) || current.avance,
    dificultades: asSentence(memory.dificultades) || current.dificultades,
  };
}

function getUpdatedMemoryLabel(previous: PracticeMemory, next: PracticeMemory) {
  if (next.dificultades !== previous.dificultades) return 'Dificultad registrada.';
  if (next.resultados !== previous.resultados) return 'Resultado registrado.';
  if (next.procedimiento !== previous.procedimiento || next.materiales !== previous.materiales) return 'Procedimiento registrado.';
  if (next.actividad !== previous.actividad) return 'Actividad registrada.';
  return 'Anotación registrada.';
}

function applyLocalMemoryUpdate(memory: PracticeMemory, note: string): PracticeMemory {
  const cleanedNote = cleanPracticeStatement(note);
  const normalized = cleanedNote.toLocaleLowerCase('es');
  const appendUnique = (current: string, value: string) => {
    if (!current) return value;
    if (current.toLocaleLowerCase('es').includes(value.toLocaleLowerCase('es'))) return current;
    return `${current}. ${value}`;
  };

  // Corrections such as "no te dije X, dije Y" must replace the mistaken
  // fragment instead of becoming a new result or difficulty.
  const rawCorrection = correctBiotechnologyTranscript(note)
    .replace(/^(?:quiero|necesito)\s+que\s+corrijas\s+/i, 'corrige ')
    .replace(/^(?:por\s+favor\s+)?corrige\s+(?:la\s+|el\s+)?/i, 'corrige ');
  const explicitCorrection = rawCorrection.match(/^corrige\s+(resultado|procedimiento|actividad|dificultad(?:es)?|novedad(?:es)?|material(?:es)?|[uú]ltimo\s+dato|mensaje\s+anterior)\s*[:,]?\s*(.+)$/i);
  const spokenCorrection = cleanedNote.match(/(?:no\s+(?:te\s+)?dije|quise\s+decir).*?\bdije\s+(.+)$/i)?.[1];
  const correction = explicitCorrection?.[2] || spokenCorrection;
  const correctionTarget = explicitCorrection?.[1]?.toLocaleLowerCase('es') || '';
  const effectiveNote = correction ? cleanPracticeStatement(correction) : cleanedNote;
  const effectiveNormalized = effectiveNote.toLocaleLowerCase('es');

  if (/actividad/.test(correctionTarget)) return { ...memory, actividad: effectiveNote };
  if (/procedimiento/.test(correctionTarget)) return { ...memory, procedimiento: effectiveNote };
  if (/material/.test(correctionTarget)) return { ...memory, materiales: effectiveNote };
  if (/dificultad/.test(correctionTarget)) return { ...memory, dificultades: effectiveNote };
  if (/novedad/.test(correctionTarget)) return { ...memory, dificultades: effectiveNote };
  if (/resultado/.test(correctionTarget)) return { ...memory, resultados: effectiveNote };
  if (/mensaje anterior|ultimo dato|último dato/.test(correctionTarget)) {
    const withoutPreamble = effectiveNote
      .replace(/^(?:el\s+mensaje\s+anterior\s+)?(?:te\s+voy\s+a\s+decir\s+)?/i, '')
      .replace(/^(?:registra|anota)(?:\s+que)?\s+/i, '');
    return applyLocalMemoryUpdate(memory, withoutPreamble);
  }

  if (/^(?:hoy\s+)?(?:iniciamos|realizamos|hicimos|se\s+realiz[oó])\b/.test(effectiveNormalized)) {
    return { ...memory, actividad: effectiveNote };
  }

  const procedureAndResult = effectiveNote.match(/^(.+?)\s+(?:al\s+finalizar|como\s+resultado)\s*[:,]?\s*(.+)$/i);
  if (procedureAndResult) {
    return {
      ...memory,
      procedimiento: appendUnique(memory.procedimiento, cleanPracticeStatement(procedureAndResult[1])),
      resultados: correction ? cleanPracticeStatement(procedureAndResult[2]) : appendUnique(memory.resultados, cleanPracticeStatement(procedureAndResult[2])),
    };
  }

  const resultAndDifficulty = effectiveNote.match(/^(.+?)\s+((?:uno|alguno)\s+de\s+los\s+frascos\s+(?:present[oó]|mostr[oó]).*)$/i);
  if (resultAndDifficulty) {
    return {
      ...memory,
      resultados: appendUnique(memory.resultados, cleanPracticeStatement(resultAndDifficulty[1])),
      dificultades: appendUnique(memory.dificultades, cleanPracticeStatement(resultAndDifficulty[2])),
    };
  }

  const compoundResult = effectiveNote.match(/^(.+?)\s+(?:adem[aá]s|y)\s+(observamos|obtuvimos|los?\s+explantes?|el\s+medio)\b(.+)$/i);
  if (compoundResult) {
    const procedure = cleanPracticeStatement(compoundResult[1]);
    const result = cleanPracticeStatement(`${compoundResult[2]}${compoundResult[3]}`);
    return {
      ...memory,
      procedimiento: correction ? procedure : appendUnique(memory.procedimiento, procedure),
      resultados: appendUnique(memory.resultados, result),
    };
  }

  if (/^(?:como\s+)?(?:dificultad|novedad)|riesgo|accident|condens|sin dificultades|present[oó]\s+turbidez/.test(effectiveNormalized)) {
    return { ...memory, dificultades: appendUnique(memory.dificultades, effectiveNote) };
  }
  if (/resultado|quedaron|qued[oó]|obtuve|obtuvimos|observamos|presentaron|crecieron|germin|coloraci[oó]n|oscurec|solidific/.test(effectiveNormalized)) {
    return { ...memory, resultados: correction ? effectiveNote : appendUnique(memory.resultados, effectiveNote) };
  }
  if (/^(?:utilizamos|usamos|empleamos|materiales?)\b/.test(effectiveNormalized)) {
    return { ...memory, materiales: correction ? effectiveNote : appendUnique(memory.materiales, effectiveNote) };
  }
  if (/lav|aplic|mezcl|durante|procedimiento|hipoclorito|ajust|a[nñ]ad|esteriliz|trabajamos|transferimos|sembramos/.test(effectiveNormalized)) {
    return { ...memory, procedimiento: correction ? effectiveNote : appendUnique(memory.procedimiento, effectiveNote) };
  }
  return { ...memory, actividad: memory.actividad || effectiveNote };
}

function buildPracticeSummary(memory: PracticeMemory) {
  const safe = removeQuestionsFromMemory(memory);
  const sections = [
    safe.actividad && `Actividad realizada: ${asSentence(buildPracticeTitle(safe.actividad, 'Práctica'))}`,
    safe.procedimiento && `Procedimiento: ${asSentence(safe.procedimiento)}`,
    safe.materiales && `Materiales: ${asSentence(safe.materiales)}`,
    safe.resultados && `Resultados observados: ${asSentence(safe.resultados)}`,
    safe.dificultades && `Dificultades o novedades: ${asSentence(safe.dificultades)}`,
  ].filter(Boolean);
  return sections.length
    ? sections.join('\n')
    : 'Todavía no hay información registrada. Cuéntame la práctica o di “crear bitácora”.';
}

function removeQuestionsFromMemory(memory: PracticeMemory): PracticeMemory {
  const keepNote = (value: string) => {
    if (!value) return '';
    return value
      .split(/\.\s+(?=[A-ZÁÉÍÓÚÑ])/)
      .map((part) => cleanPracticeStatement(part))
      .filter((part) => {
        if (!part) return false;
        if (parseLabVoiceIntent(part).type !== 'practice-note') return false;
        return !/^(?:corrige|eso\s+no\s+era|no\s+era|qu[eé]\s+no\s+es)\b/i.test(part);
      })
      .join('. ');
  };
  return {
    actividad: keepNote(memory.actividad),
    procedimiento: keepNote(memory.procedimiento),
    materiales: keepNote(memory.materiales),
    resultados: keepNote(memory.resultados),
    dificultades: keepNote(memory.dificultades),
  };
}

function mapGeminiError(error: unknown) {
  const typedError = error as { code?: string; message?: string };

  if (typedError?.code === 'gemini/missing-api-key') {
    return 'Gemini no está configurado. La transcripción y creación de bitácora siguen disponibles.';
  }

  return typedError?.message || 'No pudimos obtener respuesta de la IA.';
}

export function LearnerAIBitacoraAssistant({
  autoSaveEnabled = false,
  autoStartVoiceSignal = 0,
  preferredProjectId,
  session,
  voiceEnabled = true,
  voiceSuggestionsEnabled = false,
}: Props) {
  const [context, setContext] = useState(emptyContext);
  const [projects, setProjects] = useState<Project[]>([]);
  const [groups, setGroups] = useState<WorkGroup[]>([]);
  const [learnerBitacoras, setLearnerBitacoras] = useState<RecordItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [assistantQuestionsEnabled, setAssistantQuestionsEnabled] = useState(false);
  const [companionMode, setCompanionMode] = useState<'automatic' | 'on-demand' | null>(null);
  const [activeField, setActiveField] = useState<FieldKey>('fecha');
  const [draft, setDraft] = useState('');
  const [activeConversationId, setActiveConversationId] = useState(buildConversationId);
  const [conversations, setConversations] = useState<AssistantConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [extraAnswers, setExtraAnswers] = useState<ExtraAnswer[]>([]);
  const [currentExtraQuestion, setCurrentExtraQuestion] = useState('');
  const [awaitingExtraConsent, setAwaitingExtraConsent] = useState(false);
  const [awaitingRequiredField, setAwaitingRequiredField] = useState<FieldKey | null>(null);
  const [awaitingSaveConfirmation, setAwaitingSaveConfirmation] = useState(false);
  const [form, setForm] = useState<FormState>({
    nombre: '',
    archivoNombre: '',
    archivoUrl: '',
    avance: '',
    descripcion: '',
    dificultades: '',
    evidencias: [],
    fecha: today(),
  });
  const [practiceMemory, setPracticeMemory] = useState<PracticeMemory>(emptyPracticeMemory);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(voiceSuggestionsEnabled);
  const [speakingMessageId, setSpeakingMessageId] = useState('');
  const [showBitacoraDetails, setShowBitacoraDetails] = useState(false);
  const [showFullConversation, setShowFullConversation] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState('');
  const lastAutoSendDraftRef = useRef('');
  const composerInputRef = useRef<TextInput | null>(null);
  const hydratedPracticeKeyRef = useRef('');
  const titleRequestsRef = useRef(new Set<string>());
  const practiceMemoryRef = useRef<PracticeMemory>(emptyPracticeMemory);

  useEffect(() => {
    practiceMemoryRef.current = practiceMemory;
  }, [practiceMemory]);

  useEffect(() => {
    const handleError = (error: any) =>
      setFeedback(error?.message || 'No pudimos cargar tus proyectos para la bitácora asistida.');
    const unsubscribeContext = escucharContextoAcademicoUsuario(
      session,
      (nextContext: any) => {
        setContext({
          fichas: nextContext.fichas || [],
          instructores: nextContext.instructores || [],
        });
      },
      handleError
    );
    const unsubscribeProjects = escucharProyectos(setProjects, handleError);
    const unsubscribeGroups = escucharGruposTrabajo(setGroups, handleError);
    const unsubscribeBitacoras = escucharBitacorasAprendiz(session.uid, setLearnerBitacoras, handleError);

    return () => {
      unsubscribeContext?.();
      unsubscribeProjects?.();
      unsubscribeGroups?.();
      unsubscribeBitacoras?.();
      void stopTextToSpeech();
    };
  }, [session]);

  const learnerSheetKeys = useMemo(() => {
    const liveSheet = context.fichas[0];
    const keys = liveSheet ? [liveSheet.id, liveSheet.numero] : [session.fichaId, session.ficha];
    return new Set(keys.filter(Boolean).map(String));
  }, [context.fichas, session.ficha, session.fichaId]);

  const learnerGroupIds = useMemo(
    () => new Set(groups
      .filter((group) =>
        (group.aprendizIds || []).includes(session.uid)
        && (learnerSheetKeys.has(String(group.fichaId || '')) || learnerSheetKeys.has(String(group.fichaNumero || '')))
      )
      .map((group) => group.id)),
    [groups, learnerSheetKeys, session.uid]
  );

  const assignedProjects = useMemo(
    () => projects
      .filter((project) => {
        if (!project.id || project.activo === false || project.estado === 'Inactivo') return false;

        const belongsToSheet =
          learnerSheetKeys.has(String(project.fichaId || ''))
          || learnerSheetKeys.has(String(project.fichaNumero || ''));
        if (!belongsToSheet) return false;

        if (project.asignacionTipo === 'grupo' || project.grupoId) {
          return Boolean(project.grupoId && learnerGroupIds.has(project.grupoId));
        }

        return true;
      })
      .sort((a, b) => (a.titulo || '').localeCompare(b.titulo || '', 'es')),
    [learnerGroupIds, learnerSheetKeys, projects]
  );

  const selectedProject = useMemo(
    () => assignedProjects.find((project) => project.id === selectedProjectId) || null,
    [assignedProjects, selectedProjectId]
  );
  const previousProjectBitacoras = useMemo(
    () => learnerBitacoras
      .filter((bitacora) => bitacora.proyectoId === selectedProject?.id)
      .slice(0, 5),
    [learnerBitacoras, selectedProject?.id]
  );
  const speechVocabulary = useMemo(() => Array.from(new Set([
    ...biotechnologyVocabulary,
    selectedProject?.titulo || '',
    selectedProject?.competenciaNombre || '',
    selectedProject?.rapDescripcion || '',
    ...String(selectedProject?.descripcion || '').split(/[,.;:\n]/g),
  ].map((item) => item.trim()).filter((item) => item.length >= 3))).slice(0, 80), [selectedProject]);
  const conversationStorageKey = useMemo(
    () => selectedProject ? `biomind:learner-ai:v3:${session.uid}:${selectedProject.id}` : '',
    [selectedProject?.id, session.uid]
  );
  const practiceStorageKey = useMemo(
    () => selectedProject ? `biomind:hands-free-session:v3:${session.uid}:${selectedProject.id}` : '',
    [selectedProject?.id, session.uid]
  );
  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) || null,
    [activeConversationId, conversations]
  );
  const conversationTitle = useMemo(
    () => activeConversation?.titleGenerated
      ? activeConversation.title
      : getConversationTitle(messages, activeConversation?.title || 'Conversación nueva'),
    [activeConversation?.title, activeConversation?.titleGenerated, messages]
  );
  const visibleConversations = useMemo(() => {
    if (conversations.some((conversation) => conversation.id === activeConversationId)) {
      return conversations;
    }

    return [{
      id: activeConversationId,
      title: conversationTitle,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: messages.length,
      messages,
    }, ...conversations];
  }, [activeConversationId, conversationTitle, conversations, messages]);

  const speakAssistantText = async (text: string, messageId = '', force = false) => {
    const cleanText = cleanSpeechText(text);

    if ((!speechEnabled && !force) || !cleanText) {
      return;
    }

    setSpeakingMessageId(messageId);
    await speakText(cleanText, { language: 'es-CO', rate: 0.98 });
    setSpeakingMessageId('');
  };

  const toggleSpeech = (enabled: boolean) => {
    setSpeechEnabled(enabled);

    if (!enabled) {
      void stopTextToSpeech();
      setSpeakingMessageId('');
      return;
    }

    const lastAssistantMessage = [...messages].reverse().find((message) => message.role === 'assistant');
    if (lastAssistantMessage) {
      void speakAssistantText(lastAssistantMessage.text, lastAssistantMessage.id, true);
    }
  };

  useEffect(() => {
    setSpeechEnabled(voiceSuggestionsEnabled);
    if (!voiceSuggestionsEnabled) {
      void stopTextToSpeech();
      setSpeakingMessageId('');
    }
  }, [voiceSuggestionsEnabled]);

  useEffect(() => {
    if (preferredProjectId && assignedProjects.some((project) => project.id === preferredProjectId)) {
      setSelectedProjectId(preferredProjectId);
      return;
    }

    if (!selectedProjectId || !assignedProjects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(assignedProjects[0]?.id || '');
    }
  }, [assignedProjects, preferredProjectId, selectedProjectId]);

  useEffect(() => {
    if (!selectedProject || !conversationStorageKey) return;

    let cancelled = false;
    const firstDate = today();
    const firstMessage = {
      id: buildMessageId('assistant'),
      role: 'assistant' as const,
      text: getSessionWelcome(selectedProject.titulo || 'este proyecto'),
    };
    const resetForm = {
      nombre: '',
      archivoNombre: '',
      archivoUrl: '',
      avance: '',
      descripcion: '',
      dificultades: '',
      evidencias: [],
      fecha: firstDate,
    };

    setLoadingConversations(true);
    setActiveField('fecha');
    setDraft('');
    setFeedback('');
    setExtraAnswers([]);
    setCurrentExtraQuestion('');
    setAwaitingExtraConsent(false);
    setShowFullConversation(false);
    setCompanionMode(null);
    setAssistantQuestionsEnabled(false);
    setPracticeMemory(emptyPracticeMemory);
    practiceMemoryRef.current = emptyPracticeMemory;
    setForm(resetForm);

    AsyncStorage.getItem(conversationStorageKey)
      .then((storedValue) => {
        if (cancelled) return;

        const parsed = storedValue ? JSON.parse(storedValue) : [];
        const storedConversations: AssistantConversation[] = Array.isArray(parsed)
          ? parsed.map((conversation: AssistantConversation) => ({
            ...conversation,
            messages: (conversation.messages || []).map((message, index) =>
              index === 0 && message.role === 'assistant' && /fecha está como|formato AAAA/i.test(message.text)
                ? { ...message, text: firstMessage.text }
                : message
            ),
          }))
          : [];

        if (storedConversations.length) {
          const firstConversation = storedConversations[0];
          setConversations(storedConversations);
          setActiveConversationId(firstConversation.id);
          setMessages(firstConversation.messages?.length ? firstConversation.messages : [firstMessage]);
          return;
        }

        const initialConversation: AssistantConversation = {
          id: buildConversationId(),
          title: 'Conversación nueva',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messageCount: 1,
          messages: [firstMessage],
        };

        setConversations([initialConversation]);
        setActiveConversationId(initialConversation.id);
        setMessages(initialConversation.messages);
        void speakAssistantText(firstMessage.text, firstMessage.id);
        void AsyncStorage.setItem(conversationStorageKey, JSON.stringify([initialConversation]));
      })
      .catch(() => {
        if (cancelled) return;
        setConversations([]);
        setActiveConversationId(buildConversationId());
        setMessages([firstMessage]);
        void speakAssistantText(firstMessage.text, firstMessage.id);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingConversations(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [conversationStorageKey, selectedProject?.id]);

  useEffect(() => {
    if (!practiceStorageKey) return;
    let cancelled = false;
    hydratedPracticeKeyRef.current = '';
    AsyncStorage.getItem(practiceStorageKey)
      .then((storedValue) => {
        if (cancelled || !storedValue) return;
        const stored = JSON.parse(storedValue) as {
          form?: Partial<FormState>;
          assistantQuestionsEnabled?: boolean;
          companionMode?: 'automatic' | 'on-demand' | null;
          practiceMemory?: Partial<PracticeMemory>;
        };
        if (stored.form) setForm((current) => ({ ...current, ...stored.form, evidencias: stored.form?.evidencias || current.evidencias }));
        if (typeof stored.assistantQuestionsEnabled === 'boolean') setAssistantQuestionsEnabled(stored.assistantQuestionsEnabled);
        if (stored.companionMode === 'automatic' || stored.companionMode === 'on-demand') setCompanionMode(stored.companionMode);
        if (stored.practiceMemory) setPracticeMemory({ ...emptyPracticeMemory, ...stored.practiceMemory });
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) hydratedPracticeKeyRef.current = practiceStorageKey;
      });
    return () => { cancelled = true; };
  }, [practiceStorageKey]);

  useEffect(() => {
    if (!practiceStorageKey || hydratedPracticeKeyRef.current !== practiceStorageKey) return;
    void AsyncStorage.setItem(practiceStorageKey, JSON.stringify({
      assistantQuestionsEnabled,
      companionMode,
      form,
      practiceMemory,
      updatedAt: new Date().toISOString(),
    }));
  }, [assistantQuestionsEnabled, companionMode, form, practiceMemory, practiceStorageKey]);

  const persistConversationMessages = (nextMessages: AssistantMessage[]) => {
    if (!conversationStorageKey || !activeConversationId) return;

    const now = new Date().toISOString();
    const currentConversation = conversations.find((conversation) => conversation.id === activeConversationId);
    const nextConversation: AssistantConversation = {
      id: activeConversationId,
      title: currentConversation?.titleGenerated
        ? currentConversation.title
        : getConversationTitle(nextMessages, currentConversation?.title || 'Conversación nueva'),
      createdAt: currentConversation?.createdAt || now,
      updatedAt: now,
      messageCount: nextMessages.length,
      messages: nextMessages,
      titleGenerated: currentConversation?.titleGenerated,
    };
    const nextConversations = [
      nextConversation,
      ...conversations.filter((conversation) => conversation.id !== activeConversationId),
    ];

    setConversations(nextConversations);
    void AsyncStorage.setItem(conversationStorageKey, JSON.stringify(nextConversations));
  };

  const generateConversationTitle = async (conversationId: string, nextMessages: AssistantMessage[]) => {
    if (!conversationStorageKey || titleRequestsRef.current.has(conversationId)) return;
    titleRequestsRef.current.add(conversationId);

    const fallback = getConversationTitle(nextMessages);
    let generatedTitle = fallback;
    try {
      const result = await generateGeminiReply({
        history: nextMessages.slice(-6).map((message): WorkspaceChatMessage => ({
          id: message.id,
          role: message.role === 'assistant' ? 'model' : 'user',
          text: message.text,
        })),
        systemInstruction: 'Crea un título de máximo cinco palabras para esta conversación. Devuelve únicamente el título, sin comillas ni puntuación final.',
      });
      generatedTitle = result.replace(/[*_`#>"“”.'\n]/g, '').replace(/\s+/g, ' ').trim().slice(0, 42) || fallback;
    } catch {
      // The local fallback still produces a useful title when Gemini is unavailable.
    }

    setConversations((current) => {
      const updated = current.map((conversation) => conversation.id === conversationId
        ? { ...conversation, title: generatedTitle, titleGenerated: true }
        : conversation);
      void AsyncStorage.setItem(conversationStorageKey, JSON.stringify(updated));
      return updated;
    });
  };

  const pushMessage = (message: Omit<AssistantMessage, 'id'>, options: { speak?: boolean } = {}) => {
    const shouldSpeak = options.speak ?? true;
    const nextMessage = {
      ...message,
      id: buildMessageId(message.role),
    };

    setMessages((current) => {
      const nextMessages = [...current, nextMessage];
      persistConversationMessages(nextMessages);
      const currentConversation = conversations.find((conversation) => conversation.id === activeConversationId);
      if (nextMessage.role === 'user' && !currentConversation?.titleGenerated) {
        void generateConversationTitle(activeConversationId, nextMessages);
      }
      return nextMessages;
    });

    if (nextMessage.role === 'assistant' && shouldSpeak) {
      void speakAssistantText(nextMessage.text, nextMessage.id);
    }

    return nextMessage;
  };

  const startNewConversation = () => {
    if (!selectedProject || !conversationStorageKey) return;

    const firstDate = today();
    const firstMessage = {
      id: buildMessageId('assistant'),
      role: 'assistant' as const,
      text: getSessionWelcome(selectedProject.titulo || 'este proyecto'),
    };
    const nextConversation: AssistantConversation = {
      id: buildConversationId(),
      title: 'Conversación nueva',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 1,
      messages: [firstMessage],
    };
    const nextConversations = [nextConversation, ...conversations];

    setActiveConversationId(nextConversation.id);
    setConversations(nextConversations);
    setMessages(nextConversation.messages);
    setActiveField('fecha');
    setDraft('');
    setFeedback('');
    setExtraAnswers([]);
    setCurrentExtraQuestion('');
    setAwaitingExtraConsent(false);
    setShowFullConversation(false);
    setCompanionMode(null);
    setAssistantQuestionsEnabled(false);
    setPracticeMemory(emptyPracticeMemory);
    practiceMemoryRef.current = emptyPracticeMemory;
    setForm({
      nombre: '',
      archivoNombre: '',
      archivoUrl: '',
      avance: '',
      descripcion: '',
      dificultades: '',
      evidencias: [],
      fecha: firstDate,
    });
    void speakAssistantText(firstMessage.text, firstMessage.id);
    void AsyncStorage.setItem(conversationStorageKey, JSON.stringify(nextConversations));
  };

  const openConversation = (conversation: AssistantConversation) => {
    setActiveConversationId(conversation.id);
    setMessages(conversation.messages?.length ? conversation.messages : []);
    setDraft('');
    setFeedback('');
    setShowFullConversation(false);
  };

  const deleteConversation = (conversation: AssistantConversation) => {
    Alert.alert(
      'Eliminar conversación',
      `¿Quieres eliminar “${conversation.title || 'Conversación'}”? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            let remaining = conversations.filter((item) => item.id !== conversation.id);
            if (!remaining.length && selectedProject) {
              const firstMessage: AssistantMessage = {
                id: buildMessageId('assistant'),
                role: 'assistant',
                text: getSessionWelcome(selectedProject.titulo || 'este proyecto'),
              };
              remaining = [{
                id: buildConversationId(),
                title: 'Conversación nueva',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                messageCount: 1,
                messages: [firstMessage],
              }];
            }
            setConversations(remaining);
            if (conversation.id === activeConversationId) {
              setActiveConversationId(remaining[0]?.id || '');
              setMessages(remaining[0]?.messages || []);
            }
            void AsyncStorage.setItem(conversationStorageKey, JSON.stringify(remaining));
          },
        },
      ]
    );
  };

  const askNextField = (nextField: FieldKey, options: { speak?: boolean } = {}) => {
    if (!selectedProject) return '';
    const text = getFieldQuestion(nextField, selectedProject.titulo || 'este proyecto', form.fecha);
    setActiveField(nextField);
    pushMessage({ role: 'assistant', text }, options);
    return text;
  };

  const completeRequiredFlow = (
    completedForm: FormState,
    options: { speak?: boolean } = {}
  ) => {
    if (assistantQuestionsEnabled) {
      setAwaitingExtraConsent(false);
      return askGeminiFollowUp(options, completedForm, []);
    }

    const text = 'Listo. Revisa el resumen y toca “Crear bitácora”, o di “guardar bitácora”.';
    pushMessage({ role: 'assistant', text }, options);
    return text;
  };

  const advanceGuidedFlow = (field: FieldKey, answer: string, options: { speak?: boolean } = {}) => {
    const currentIndex = guidedOrder.indexOf(field);
    const nextField = guidedOrder[currentIndex + 1];

    const completedForm = applyFieldValue(field, answer, form);
    setForm(completedForm);

    if (nextField) {
      return askNextField(nextField, options);
    }

    return completeRequiredFlow(completedForm, options);
  };

  const askGeminiFollowUp = async (
    options: { speak?: boolean } = {},
    formSnapshot = form,
    answerSnapshot = extraAnswers
  ) => {
    if (!selectedProject) return '';

    setLoading(true);
    setFeedback('');

    try {
      const question = await generateGeminiReply({
        history: [
          {
            id: 'context',
            role: 'user',
            text: [
              `Proyecto: ${selectedProject.titulo || 'Proyecto'}`,
              `Descripción del proyecto: ${selectedProject.descripcion || 'No registrada'}`,
              `Competencia: ${selectedProject.competenciaNombre || 'No registrada'}`,
              `RAP: ${selectedProject.rapDescripcion || 'No registrado'}`,
              `Actividad realizada: ${formSnapshot.descripcion || 'Pendiente'}`,
              `Avance alcanzado: ${formSnapshot.avance || 'Pendiente'}`,
              `Dificultades: ${formSnapshot.dificultades || 'No registradas'}`,
              `Preguntas ya hechas: ${answerSnapshot.map((item) => item.question).join(' | ') || 'Ninguna'}`,
            ].join('\n'),
          },
        ],
        systemInstruction:
          'Eres BIOMIND IA para aprendices de biotecnología vegetal. Haz una sola pregunta breve, clara y útil para completar mejor una bitácora académica. No expliques, no saludes, no uses formato de lista.',
      });

      const cleanQuestion = question.split('\n').find(Boolean)?.trim() || fallbackFollowUpQuestion(answerSnapshot.length);
      setCurrentExtraQuestion(cleanQuestion);
      setAwaitingExtraConsent(false);
      pushMessage({ role: 'assistant', text: cleanQuestion }, options);
      return cleanQuestion;
    } catch (error) {
      const fallback = fallbackFollowUpQuestion(answerSnapshot.length);
      setCurrentExtraQuestion(fallback);
      setAwaitingExtraConsent(false);
      setFeedback('');
      pushMessage({ role: 'assistant', text: fallback }, options);
      return fallback;
    } finally {
      setLoading(false);
    }
  };

  const answerExtraQuestion = (answer: string, options: { speak?: boolean } = {}) => {
    const question = currentExtraQuestion || 'Pregunta complementaria';
    const nextAnswers = [...extraAnswers, { question, answer }];
    setExtraAnswers(nextAnswers);
    setCurrentExtraQuestion('');
    setAwaitingExtraConsent(false);

    if (nextAnswers.length < 2) {
      return askGeminiFollowUp(options, form, nextAnswers);
    }

    const text = 'Perfecto. La información está completa. Di “guardar bitácora” o usa el botón Crear bitácora.';
    pushMessage({ role: 'assistant', text }, options);
    return text;
  };

  const askProjectQuestion = async (question: string, options: { speak?: boolean } = {}) => {
    if (!selectedProject) return '';

    setLoading(true);
    setFeedback('');

    try {
      const priorTechnicalHistory: WorkspaceChatMessage[] = messages
        .slice(-10)
        .filter((message) => message.role === 'assistant' || parseLabVoiceIntent(message.text).type === 'technical-question')
        .map((message) => ({ id: message.id, role: message.role === 'assistant' ? 'model' as const : 'user' as const, text: message.text }));
      const history: WorkspaceChatMessage[] = [
        ...priorTechnicalHistory,
        {
          id: 'project-question',
          role: 'user',
          text: question,
        },
      ];
      const answer = await generateGeminiReply({
        history,
        systemInstruction: [
          'Eres BIOMIND IA para aprendices de biotecnología vegetal.',
          'Responde dudas sobre el proyecto seleccionado con orientación académica, clara y breve.',
          'Interpreta errores fonéticos evidentes del reconocimiento de voz según el contexto antes de responder.',
          'Responde en máximo dos frases salvo que el aprendiz pida más detalle.',
          'Distingue la información del proyecto del conocimiento general. Si el dato no está confirmado en el proyecto, dilo.',
          'No inventes concentraciones, tiempos, sustancias ni protocolos; ante riesgo, indica que debe confirmarlo con el instructor.',
          `Proyecto: ${selectedProject.titulo || 'Proyecto'}.`,
          `Descripción: ${selectedProject.descripcion || 'No registrada'}.`,
          `Competencia: ${selectedProject.competenciaNombre || 'No registrada'}.`,
          `RAP: ${selectedProject.rapDescripcion || 'No registrado'}.`,
          `Bitácoras anteriores del aprendiz: ${previousProjectBitacoras.length
            ? previousProjectBitacoras.map((item) => `${item.nombre || item.fecha || 'Sin nombre'}: ${item.descripcion || 'sin descripción'}; avance ${item.avance || 'no registrado'}`).join(' | ')
            : 'No hay bitácoras anteriores para este proyecto'}.`,
        ].join(' '),
      });

      pushMessage({ role: 'assistant', text: answer }, options);
      return answer;
    } catch (error) {
      setFeedback('');
      const previousQuestion = [...messages]
        .reverse()
        .find((message) => message.role === 'user' && parseLabVoiceIntent(message.text).type === 'technical-question')?.text || '';
      const isEllipticalFollowUp = /^(?:y|entonces|eso|esa|ese|por que|por qué)\b/i.test(question.trim()) && question.trim().split(/\s+/).length < 10;
      const fallback = getTechnicalSafetyFallback(isEllipticalFollowUp ? `${question} ${previousQuestion}` : question);
      pushMessage({
        role: 'assistant',
        text: fallback,
      }, options);
      return fallback;
    } finally {
      setLoading(false);
    }
  };

  const registerPracticeNote = async (note: string, options: { speak?: boolean } = {}) => {
    if (!selectedProject) return '';
    setLoading(true);
    setFeedback('Interpretando la anotación...');
    const safeMemory = removeQuestionsFromMemory(practiceMemoryRef.current);
    const deterministicMemory = applyLocalMemoryUpdate(safeMemory, note);
    const nextMemory = removeQuestionsFromMemory(deterministicMemory);
    setLoading(false);

    setPracticeMemory(nextMemory);
    practiceMemoryRef.current = nextMemory;
    setForm((current) => memoryToForm(nextMemory, current, selectedProject.titulo || 'Práctica'));
    const confirmation = getUpdatedMemoryLabel(safeMemory, nextMemory);
    const nextQuestion = assistantQuestionsEnabled ? getNextMemoryQuestion(nextMemory) : '';
    const responseText = [confirmation, nextQuestion].filter(Boolean).join(' ');
    setFeedback('');
    pushMessage({ role: 'assistant', text: responseText }, options);
    return responseText;
  };

  const prepareBitacoraFromConversation = async (options: { speak?: boolean } = {}) => {
    if (!selectedProject) return '';
    const safeMemory = removeQuestionsFromMemory(practiceMemoryRef.current);
    if (JSON.stringify(safeMemory) !== JSON.stringify(practiceMemoryRef.current)) {
      setPracticeMemory(safeMemory);
      practiceMemoryRef.current = safeMemory;
    }
    const memoryForm = memoryToForm(safeMemory, form, selectedProject.titulo || 'Práctica');
    const nextForm: FormState = memoryForm;
    setForm(nextForm);
    setShowBitacoraDetails(true);

    const missingField = (['nombre', 'descripcion', 'avance', 'dificultades'] as FieldKey[])
      .find((field) => !normalizeText(nextForm[field]));
    if (missingField) {
      setAwaitingRequiredField(missingField);
      setActiveField(missingField);
      const question = getFieldQuestion(missingField, selectedProject.titulo || 'este proyecto', nextForm.fecha);
      pushMessage({ role: 'assistant', text: question }, options);
      return question;
    }

    setAwaitingSaveConfirmation(true);
    const summary = `Preparé “${nextForm.nombre}”. Registré la actividad, el avance${nextForm.dificultades ? ' y las dificultades' : ''}. ¿La guardo?`;
    pushMessage({ role: 'assistant', text: summary }, options);
    return summary;
  };

  const handleSend = async (
    inputMode: 'manual' | 'voice' = 'manual',
    textOverride?: string,
    options: { speak?: boolean } = {}
  ) => {
    const text = (textOverride ?? draft).trim();
    if (!text || !selectedProject) return '';

    const labIntent = parseLabVoiceIntent(text);
    if (labIntent.type === 'cancel-last') {
      const removableIndex = [...messages]
        .map((message, index) => ({ index, message }))
        .reverse()
        .find(({ message }) => message.role === 'user' && parseLabVoiceIntent(message.text).type === 'practice-note')?.index;
      if (typeof removableIndex !== 'number') {
        const responseText = 'No hay una anotación anterior para eliminar.';
        pushMessage({ role: 'assistant', text: responseText }, options);
        return responseText;
      }
      const nextMessages = messages.filter((_, index) => index !== removableIndex);
      setMessages(nextMessages);
      persistConversationMessages(nextMessages);
      const responseText = 'Eliminé la última anotación.';
      pushMessage({ role: 'assistant', text: responseText }, options);
      return responseText;
    }

    pushMessage({ role: 'user', text, mode: inputMode });
    setDraft('');

    if (labIntent.type === 'finish-session') {
      const responseText = 'Conversación finalizada. Tus anotaciones permanecen disponibles para preparar la bitácora.';
      pushMessage({ role: 'assistant', text: responseText }, options);
      setTimeout(() => voiceConversation.stopConversation(), 300);
      return responseText;
    }

    if (labIntent.type === 'choose-companion') {
      const automatic = labIntent.mode === 'automatic';
      setCompanionMode(labIntent.mode);
      setAssistantQuestionsEnabled(automatic);
      const responseText = automatic
        ? 'Acompañamiento automático activado. Cuéntame cuando inicies una actividad.'
        : 'Modo bajo demanda activado. Te escucharé sin interrumpir.';
      pushMessage({ role: 'assistant', text: responseText }, options);
      return responseText;
    }

    if (inputMode === 'voice' && !companionMode) {
      const responseText = 'Antes de continuar, dime “acompañamiento automático” o “solo cuando te necesite”.';
      pushMessage({ role: 'assistant', text: responseText }, options);
      return responseText;
    }

    if (labIntent.type === 'technical-question') {
      return askProjectQuestion(text, options);
    }

    if (labIntent.type === 'read-summary') {
      const safeMemory = removeQuestionsFromMemory(practiceMemoryRef.current);
      if (JSON.stringify(safeMemory) !== JSON.stringify(practiceMemoryRef.current)) {
        setPracticeMemory(safeMemory);
        practiceMemoryRef.current = safeMemory;
      }
      const responseText = buildPracticeSummary(safeMemory);
      pushMessage({ role: 'assistant', text: responseText }, options);
      return responseText;
    }

    if (labIntent.type === 'create-bitacora') {
      setAwaitingExtraConsent(false);
      setCurrentExtraQuestion('');
      return prepareBitacoraFromConversation(options);
    }

    if (labIntent.type === 'save-bitacora') {
      if (!form.nombre.trim() || !form.descripcion.trim() || !form.avance.trim() || !form.dificultades.trim()) {
        return prepareBitacoraFromConversation(options);
      }
      setAwaitingSaveConfirmation(true);
      const responseText = `¿Confirmas que quieres guardar “${form.nombre}”?`;
      pushMessage({ role: 'assistant', text: responseText }, options);
      return responseText;
    }

    if (awaitingSaveConfirmation) {
      if (isYes(text)) {
        setAwaitingSaveConfirmation(false);
        return saveBitacora(options);
      }
      if (isNo(text)) {
        setAwaitingSaveConfirmation(false);
        const responseText = 'De acuerdo. Dime qué quieres corregir y lo registraré antes de volver a preparar la bitácora.';
        pushMessage({ role: 'assistant', text: responseText }, options);
        return responseText;
      }
    }

    if (awaitingRequiredField) {
      const nextForm = applyFieldValue(awaitingRequiredField, text, form);
      setForm(nextForm);
      setAwaitingRequiredField(null);
      const nextMissing = (['nombre', 'descripcion', 'avance', 'dificultades'] as FieldKey[])
        .find((field) => !normalizeText(nextForm[field]));
      if (nextMissing) {
        setAwaitingRequiredField(nextMissing);
        setActiveField(nextMissing);
        return askNextField(nextMissing, options);
      }
      setAwaitingSaveConfirmation(true);
      const responseText = `Ya está completa “${nextForm.nombre}”. ¿La guardo?`;
      pushMessage({ role: 'assistant', text: responseText }, options);
      return responseText;
    }

    if (awaitingExtraConsent) {
      if (isYes(text)) {
        return askGeminiFollowUp(options);
      }

      if (isNo(text)) {
        setAwaitingExtraConsent(false);
        const responseText = 'Listo. Di “crear bitácora” para organizar la información y confirmar antes de guardarla.';
        pushMessage({
          role: 'assistant',
          text: responseText,
        }, options);
        return responseText;
      }

      const responseText = 'Respóndeme con "sí" si quieres preguntas adicionales o con "no" si ya quieres guardar la bitácora.';
      pushMessage({
        role: 'assistant',
        text: responseText,
      }, options);
      return responseText;
    }

    if (currentExtraQuestion) {
      return answerExtraQuestion(text, options);
    }

    if (inputMode === 'voice') {
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      if (wordCount <= 2 && !/^(?:sin dificultades|sin novedad(?:es)?)$/i.test(text)) {
        const responseText = 'No alcancé a entender esa anotación. Repítela con una frase completa para no guardar un dato incorrecto.';
        pushMessage({ role: 'assistant', text: responseText }, options);
        return responseText;
      }
      return registerPracticeNote(text, options);
    }

    if (assistantQuestionsEnabled) {
      return registerPracticeNote(text, options);
    }

    return askProjectQuestion(text, options);
  };

  const handleDraftChange = (value: string) => {
    const sendCommand = extractSendCommand(value);

    if (!sendCommand.shouldSend) {
      lastAutoSendDraftRef.current = '';
      setDraft(value);
      return;
    }

    setDraft(sendCommand.text);

    if (!sendCommand.text || loading || !selectedProject || lastAutoSendDraftRef.current === value) {
      return;
    }

    lastAutoSendDraftRef.current = value;
    setTimeout(() => {
      void handleSend('manual', sendCommand.text);
      lastAutoSendDraftRef.current = '';
    }, 0);
  };

  const voiceConversation = useVoiceConversation({
    canStart: Boolean(selectedProject),
    confirmBeforeSend: false,
    contextualStrings: speechVocabulary,
    language: 'es-CO',
    onSendMessage: (text) => {
      const correctedText = correctBiotechnologyTranscript(text);
      const turns = splitEmbeddedVoiceCommand(correctedText);
      return turns.reduce<Promise<string>>(async (previous, turn) => {
        await previous;
        return handleSend('voice', turn, { speak: false });
      }, Promise.resolve(''));
    },
    silenceMs: 2300,
    speechEnabled,
  });

  useEffect(() => {
    if (!autoStartVoiceSignal || !selectedProject || voiceConversation.isConversationActive) return;
    setCompanionMode(null);
    setAssistantQuestionsEnabled(false);
    setSpeechEnabled(true);
    void voiceConversation.startConversation(getSessionWelcome(selectedProject.titulo || 'este proyecto'));
  }, [autoStartVoiceSignal, selectedProject?.id, voiceConversation.isConversationActive]);

  const toggleGuidedMode = (enabled: boolean) => {
    setAssistantQuestionsEnabled(enabled);
    setCompanionMode(enabled ? 'automatic' : 'on-demand');
    setAwaitingExtraConsent(false);
    setCurrentExtraQuestion('');
    setFeedback('');

    if (enabled) {
      pushMessage({
        role: 'assistant',
        text: 'Acompañamiento automático activado. Cuéntame cuando inicies una actividad.',
      }, { speak: true });
      return;
    }

    if (activeField === 'fecha') {
      setActiveField('descripcion');
    }

    pushMessage({
      role: 'assistant',
      text: 'Preguntas automáticas desactivadas. Puedes escribir una duda del proyecto o dictar una respuesta para el campo que elijas.',
    }, { speak: false });
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFeedback('Necesitamos permiso para seleccionar evidencias fotográficas.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];
    if (!asset.uri) {
      setFeedback('No pudimos leer la fotografía. Selecciona otra imagen.');
      return;
    }

    setForm((current) => ({
      ...current,
      evidencias: [
        ...current.evidencias,
        {
          mimeType: asset.mimeType || 'image/jpeg',
          nombre: asset.fileName || `evidencia-${Date.now()}.jpg`,
          tipo: 'imagen',
          uri: asset.uri,
        },
      ],
    }));
  };

  const pickEvidenceFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: true,
      type: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/*',
      ],
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const pickedFiles: Evidence[] = result.assets
      .filter((file) => file.uri)
      .map((file) => ({
        mimeType: file.mimeType || 'application/octet-stream',
        nombre: file.name || `archivo-${Date.now()}`,
        tipo: (file.mimeType || '').startsWith('image/') ? 'imagen' : 'archivo',
        uri: file.uri,
      }));

    setForm((current) => ({
      ...current,
      evidencias: [...current.evidencias, ...pickedFiles].filter((file, index, all) =>
        all.findIndex((candidate) => candidate.uri === file.uri) === index
      ),
    }));
  };

  const removeEvidence = (indexToRemove: number) => {
    setForm((current) => ({
      ...current,
      evidencias: current.evidencias.filter((_, index) => index !== indexToRemove),
    }));
  };

  const saveBitacora = async (options: { speak?: boolean } = {}) => {
    if (!selectedProject) {
      const message = 'Selecciona un proyecto antes de guardar la bitácora.';
      setFeedback(message);
      return message;
    }

    if (!form.nombre.trim()) {
      const message = 'Aún falta el nombre de la bitácora.';
      setFeedback(message);
      return message;
    }

    if (!form.descripcion.trim()) {
      const message = 'Aún falta la actividad realizada antes de guardar.';
      setFeedback(message);
      return message;
    }

    if (!form.avance.trim()) {
      const message = 'Aún falta el avance alcanzado antes de guardar.';
      setFeedback(message);
      return message;
    }

    if (form.archivoUrl.trim() && !/^https:\/\/\S+/i.test(form.archivoUrl.trim())) {
      const message = 'El enlace externo debe comenzar por https://.';
      setFeedback(message);
      return message;
    }

    const extraNotes = buildExtraNotes(extraAnswers);
    const dificultades = [form.dificultades, extraNotes].filter(Boolean).join('\n\n');

    setSaving(true);
    setFeedback('');

    try {
      await guardarBitacora({
        nombre: form.nombre,
        aprendizUid: session.uid,
        aprendizNombre: session.name,
        archivoNombre: form.archivoNombre,
        archivoUrl: form.archivoUrl,
        avance: form.avance,
        descripcion: form.descripcion,
        dificultades,
        estado: 'Enviada',
        evidencias: form.evidencias,
        fecha: form.fecha || today(),
        fichaId: selectedProject.fichaId || session.fichaId || session.ficha || '',
        proyectoId: selectedProject.id,
        proyectoTitulo: selectedProject.titulo || 'Proyecto',
      });

      const successMessage = 'Bitácora guardada correctamente. Puedes verla en Bitácoras y evidencias.';
      void playVoiceCue('success');
      setFeedback(successMessage);
      pushMessage({
        role: 'assistant',
        text: successMessage,
      }, options);
      setExtraAnswers([]);
      setCurrentExtraQuestion('');
      setAwaitingExtraConsent(false);
      setAwaitingRequiredField(null);
      setAwaitingSaveConfirmation(false);
      const cleanForm: FormState = {
        nombre: '',
        archivoNombre: '',
        archivoUrl: '',
        avance: '',
        descripcion: '',
        dificultades: '',
        evidencias: [],
        fecha: today(),
      };
      setForm(cleanForm);
      setPracticeMemory(emptyPracticeMemory);
      practiceMemoryRef.current = emptyPracticeMemory;
      if (practiceStorageKey) {
        void AsyncStorage.setItem(practiceStorageKey, JSON.stringify({
          assistantQuestionsEnabled,
          companionMode,
          form: cleanForm,
          practiceMemory: emptyPracticeMemory,
          updatedAt: new Date().toISOString(),
        }));
      }
      return successMessage;
    } catch (error) {
      const typedError = error as { message?: string };
      const errorMessage = typedError?.message || 'No pudimos guardar la bitácora.';
      void playVoiceCue('error');
      setFeedback(errorMessage);
      return errorMessage;
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.module}>
      <View style={styles.heroCard}>
        <View style={styles.heroBadge}>
          <MaterialCommunityIcons name="robot-outline" size={14} color="#FFFFFF" />
          <Text style={styles.heroBadgeText}>Manos Libres · Nueva IA</Text>
        </View>

        <Text style={styles.heroTitle}>Asistente IA del aprendiz</Text>
        <Text style={styles.heroText}>
          Conversa con BIOMIND IA, responde por voz o texto y crea tu bitácora del proyecto sin salir del flujo académico.
        </Text>

        <View style={styles.heroFooter}>
          <Text style={styles.heroFootnote}>Sesión de {getFirstName(session.name)}</Text>
          <View style={styles.heroDot} />
          <Text numberOfLines={1} style={styles.heroFootnote}>
            {selectedProject?.titulo || 'Selecciona un proyecto'}
          </Text>
          <View style={styles.channelBadge}>
            <Text style={styles.channelBadgeText}>Canal: Bitácoras</Text>
          </View>
        </View>
      </View>

      <View style={styles.selectorCard}>
        <Text style={styles.selectorTitle}>Proyecto activo</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.projectRail}>
          {assignedProjects.map((project) => {
            const active = project.id === selectedProjectId;
            return (
              <Pressable
                key={project.id}
                onPress={() => setSelectedProjectId(project.id)}
                style={[styles.projectChip, active && styles.projectChipActive]}>
                <Text numberOfLines={1} style={[styles.projectChipTitle, active && styles.projectChipTitleActive]}>
                  {project.titulo || 'Proyecto'}
                </Text>
                <Text numberOfLines={1} style={[styles.projectChipMeta, active && styles.projectChipTitleActive]}>
                  Ficha {project.fichaNumero || project.fichaId || 'sin ficha'}
                </Text>
              </Pressable>
            );
          })}
          {!assignedProjects.length ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No tienes proyectos activos para crear bitácoras.</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>

      {selectedProject ? (
        <>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: assistantQuestionsEnabled }}
            onPress={() => toggleGuidedMode(!assistantQuestionsEnabled)}
            style={[styles.toggleCard, assistantQuestionsEnabled && styles.toggleCardActive]}>
            <View style={styles.toggleCopy}>
              <Text style={styles.toggleTitle}>Preguntas automáticas</Text>
              <Text style={styles.toggleText}>
                Actívalas para que la IA te guíe campo por campo y haga preguntas complementarias.
              </Text>
            </View>
            <View style={[styles.toggleStateBadge, assistantQuestionsEnabled && styles.toggleStateBadgeActive, !assistantQuestionsEnabled && styles.toggleStateBadgeOff]}>
              <Text style={[styles.toggleStateText, !assistantQuestionsEnabled && styles.toggleStateTextOff]}>
                {assistantQuestionsEnabled ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
            <View pointerEvents="none">
              <Switch
                thumbColor={assistantQuestionsEnabled ? '#FFFFFF' : '#F1F4F7'}
                trackColor={{ false: '#DDE9E4', true: learnerPalette.primary }}
                value={assistantQuestionsEnabled}
                onValueChange={toggleGuidedMode}
              />
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: speechEnabled }}
            onPress={() => toggleSpeech(!speechEnabled)}
            style={styles.speechCard}>
            <View style={styles.speechIcon}>
              <MaterialCommunityIcons name={speechEnabled ? 'volume-high' : 'volume-off'} size={20} color={learnerPalette.primary} />
            </View>
            <View style={styles.toggleCopy}>
              <Text style={styles.toggleTitle}>Voz de BIOMIND IA</Text>
              <Text style={styles.toggleText}>La IA leerá en voz alta sus preguntas, respuestas y confirmaciones.</Text>
            </View>
            <View style={[styles.toggleStateBadge, !speechEnabled && styles.toggleStateBadgeOff]}>
              <Text style={[styles.toggleStateText, !speechEnabled && styles.toggleStateTextOff]}>
                {speechEnabled ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
            <View pointerEvents="none">
              <Switch
                thumbColor={speechEnabled ? '#FFFFFF' : '#F1F4F7'}
                trackColor={{ false: '#DDE9E4', true: learnerPalette.primary }}
                value={speechEnabled}
                onValueChange={toggleSpeech}
              />
            </View>
          </Pressable>

          <View style={styles.voiceConversationCard}>
            <VoiceConversationButton
              disabled={!selectedProject}
              isActive={voiceConversation.isConversationActive}
              status={voiceConversation.status}
              onPress={
                voiceConversation.isConversationActive
                  ? voiceConversation.stopConversation
                  : () => {
                    setCompanionMode(null);
                    setAssistantQuestionsEnabled(false);
                    setSpeechEnabled(true);
                    void voiceConversation.startConversation(getSessionWelcome(selectedProject.titulo || 'este proyecto'));
                  }
              }
            />
            {voiceConversation.isConversationActive || voiceConversation.status === 'error' || voiceConversation.partialTranscript ? (
              <VoiceConversationStatus
                error={voiceConversation.error}
                isActive={voiceConversation.isConversationActive}
                partialTranscript={voiceConversation.partialTranscript}
                pendingConfirmation={voiceConversation.pendingConfirmation}
                status={voiceConversation.status}
              />
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => setShowBitacoraDetails((current) => !current)}
            style={styles.sectionToggle}>
            <View style={styles.sectionToggleCopy}>
              <Text style={styles.sectionToggleTitle}>Resumen y evidencias</Text>
              <Text style={styles.sectionToggleText}>
                {showBitacoraDetails ? 'Ocultar campos de la bitácora' : 'Revisar campos, adjuntos y guardar'}
              </Text>
            </View>
            <MaterialCommunityIcons
              name={showBitacoraDetails ? 'chevron-up' : 'chevron-down'}
              size={22}
              color={learnerPalette.primary}
            />
          </Pressable>

          {showBitacoraDetails ? <>
          <View style={styles.formPreview}>
            <FieldPreview active={activeField === 'nombre'} label="Nombre" value={form.nombre} onPress={() => setActiveField('nombre')} />
            <FieldPreview active={activeField === 'fecha'} label="Fecha" value={form.fecha} onPress={() => setActiveField('fecha')} />
            <FieldPreview active={activeField === 'descripcion'} label="Actividad realizada" value={form.descripcion} onPress={() => setActiveField('descripcion')} />
            <FieldPreview active={activeField === 'avance'} label="Avance alcanzado" value={form.avance} onPress={() => setActiveField('avance')} />
            <FieldPreview active={activeField === 'dificultades'} label="Dificultades o novedades" value={form.dificultades} onPress={() => setActiveField('dificultades')} />
            <FieldPreview active={activeField === 'archivoUrl'} label="Documento externo" value={form.archivoUrl || 'Opcional'} onPress={() => setActiveField('archivoUrl')} />
          </View>

          <View style={styles.evidenceCard}>
            <View style={styles.evidenceHeader}>
              <View>
                <Text style={styles.cardLabel}>Evidencias</Text>
                <Text style={styles.helperText}>Fotos, documentos o enlaces se guardan con la bitácora en Supabase.</Text>
              </View>
              <Text style={styles.evidenceCount}>{form.evidencias.length}</Text>
            </View>

            <View style={styles.attachmentActions}>
              <Pressable onPress={pickPhoto} style={styles.attachmentButton}>
                <MaterialCommunityIcons name="image-plus" size={18} color={learnerPalette.primary} />
                <Text style={styles.attachmentButtonText}>Foto</Text>
              </Pressable>
              <Pressable onPress={pickEvidenceFile} style={styles.attachmentButton}>
                <MaterialCommunityIcons name="file-upload-outline" size={18} color={learnerPalette.primary} />
                <Text style={styles.attachmentButtonText}>Archivo</Text>
              </Pressable>
            </View>

            {form.evidencias.length ? (
              <View style={styles.attachmentList}>
                {form.evidencias.map((evidence, index) => (
                  <Pressable
                    disabled={evidence.tipo !== 'imagen'}
                    key={`${evidence.uri}-${index}`}
                    onPress={() => setPreviewImageUri(evidence.uri)}
                    style={styles.attachmentItem}>
                    {evidence.tipo === 'imagen' ? (
                      <Image source={{ uri: evidence.uri }} style={styles.attachmentThumbnail} />
                    ) : (
                      <MaterialCommunityIcons name="file-document-outline" size={18} color={learnerPalette.primary} />
                    )}
                    <View style={styles.attachmentCopy}>
                      <Text numberOfLines={1} style={styles.attachmentTitle}>{evidence.nombre}</Text>
                      <Text style={styles.attachmentMeta}>{evidence.tipo === 'imagen' ? 'Imagen' : 'Documento'}</Text>
                    </View>
                    <Pressable
                      onPress={(event) => {
                        event.stopPropagation();
                        removeEvidence(index);
                      }}
                      style={styles.removeEvidenceButton}>
                      <MaterialCommunityIcons name="close" size={16} color={learnerPalette.textMuted} />
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyEvidenceText}>Aún no has adjuntado evidencias.</Text>
            )}

            <View style={styles.linkFields}>
              <TextInput
                placeholder="Nombre del enlace externo"
                placeholderTextColor={learnerPalette.textMuted}
                value={form.archivoNombre}
                onChangeText={(value) => setForm((current) => ({ ...current, archivoNombre: value }))}
                style={styles.linkInput}
              />
              <TextInput
                autoCapitalize="none"
                keyboardType="url"
                placeholder="https://drive.google.com/..."
                placeholderTextColor={learnerPalette.textMuted}
                value={form.archivoUrl}
                onChangeText={(value) => setForm((current) => ({ ...current, archivoUrl: value }))}
                style={styles.linkInput}
              />
            </View>
          </View>

          <View style={styles.saveCard}>
            <View style={styles.saveCopy}>
              <Text style={styles.saveTitle}>Resumen listo para guardar</Text>
              <Text style={styles.saveText}>
                Se guardará como bitácora enviada para {selectedProject.titulo || 'el proyecto seleccionado'}.
              </Text>
            </View>
            <Pressable disabled={saving} onPress={() => void saveBitacora()} style={styles.saveButton}>
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="notebook-check-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Crear bitácora</Text>
                </>
              )}
            </Pressable>
          </View>
          </> : null}

          <View style={styles.chatCard}>
            {showFullConversation ? <View style={styles.conversationPanel}>
              <View style={styles.conversationHeader}>
                <View style={styles.conversationCopy}>
                  <Text style={styles.conversationLabel}>Conversaciones</Text>
                </View>
                <Pressable onPress={startNewConversation} style={styles.newConversationButton}>
                  <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
                  <Text style={styles.newConversationText}>Nueva</Text>
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.conversationRail}>
                {visibleConversations.map((conversation) => {
                  const active = conversation.id === activeConversationId;

                  return (
                    <View key={conversation.id} style={[styles.conversationChip, active && styles.conversationChipActive]}>
                      <Pressable onPress={() => openConversation(conversation)} style={styles.conversationChipMain}>
                        <Text numberOfLines={1} style={[styles.conversationChipTitle, active && styles.conversationChipTitleActive]}>
                          {conversation.title || 'Conversación'}
                        </Text>
                        <Text style={[styles.conversationChipMeta, active && styles.conversationChipMetaActive]}>
                          {Math.max(0, conversation.messageCount - 1)} mensajes
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityLabel={`Eliminar ${conversation.title || 'conversación'}`}
                        onPress={() => deleteConversation(conversation)}
                        style={styles.deleteConversationButton}>
                        <MaterialCommunityIcons
                          name="trash-can-outline"
                          size={16}
                          color={active ? '#FFFFFF' : learnerPalette.textMuted}
                        />
                      </Pressable>
                    </View>
                  );
                })}
              </ScrollView>
            </View> : null}
            <View style={styles.chatHeader}>
              <View style={styles.chatHeaderCopy}>
                <Text style={styles.chatTitle}>Conversación actual</Text>
                <Text numberOfLines={1} style={styles.chatSubtitle}>{conversationTitle}</Text>
              </View>
              <Pressable onPress={() => setShowFullConversation((current) => !current)} style={styles.historyButton}>
                <MaterialCommunityIcons name={showFullConversation ? 'close' : 'history'} size={16} color={learnerPalette.primary} />
                <Text style={styles.historyToggleText}>{showFullConversation ? 'Cerrar' : 'Historial'}</Text>
              </Pressable>
            </View>
            <View style={styles.messageList}>
              {loadingConversations ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={learnerPalette.primary} />
                  <Text style={styles.loadingText}>Cargando conversaciones...</Text>
                </View>
              ) : null}
              {(showFullConversation ? messages : messages.slice(-6)).map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.messageRow,
                    message.role === 'user' ? styles.messageRowUser : styles.messageRowAssistant,
                  ]}>
                  {message.role === 'assistant' ? (
                    <View style={styles.assistantAvatar}>
                      <MaterialCommunityIcons name="robot-excited-outline" size={18} color="#FFFFFF" />
                    </View>
                  ) : null}
                  <View style={[
                    styles.messageBubble,
                    message.role === 'user' ? styles.messageUser : styles.messageAssistant,
                  ]}>
                    {message.role === 'assistant' ? (
                      <View style={styles.messageHeaderRow}>
                        <Text style={styles.messageSender}>BIOMIND IA</Text>
                        {message.mode === 'voice' ? (
                          <MaterialCommunityIcons name="microphone-outline" size={12} color={learnerPalette.primary} />
                        ) : null}
                      </View>
                    ) : null}
                    {message.role === 'user' ? (
                      <Text style={[styles.messageText, styles.messageTextUser]}>
                        {message.text}
                      </Text>
                    ) : (
                      <FormattedMarkdownText
                        color={learnerPalette.text}
                        text={message.text}
                        textStyle={styles.messageText}
                      />
                    )}
                    {message.role === 'assistant' ? (
                      <Pressable onPress={() => void speakAssistantText(message.text, message.id, true)} style={styles.replayButton}>
                        <MaterialCommunityIcons
                          name={speakingMessageId === message.id ? 'volume-high' : 'volume-medium'}
                          size={15}
                          color={learnerPalette.primary}
                        />
                        <Text style={styles.replayButtonText}>
                          {speakingMessageId === message.id ? 'Hablando' : 'Repetir'}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                  {message.role === 'user' ? (
                    <UserAvatar name={session.name} photoUrl={session.photoUrl} size={32} />
                  ) : null}
                </View>
              ))}
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={learnerPalette.primary} />
                  <Text style={styles.loadingText}>BIOMIND IA está pensando...</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.composerCard}>
            <TextInput
              ref={composerInputRef}
              multiline
              placeholder={
                voiceConversation.isConversationActive
                  ? 'Te escucho durante toda la sesión...'
                  : assistantQuestionsEnabled
                    ? 'Responde a la pregunta de BIOMIND IA...'
                    : 'Escribe una duda del proyecto o inicia la conversación por voz...'
              }
              placeholderTextColor={learnerPalette.textMuted}
              value={draft}
              onChangeText={handleDraftChange}
              style={styles.composerInput}
            />
            <View style={styles.composerFooter}>
              <Text style={styles.composerHint}>
                Di “crear bitácora”, “guardar bitácora” o “finalizar sesión”.
              </Text>
              <View style={styles.actionsRow}>
                <Pressable
                  disabled={!draft.trim() || loading}
                  onPress={() => handleSend('manual')}
                  style={[styles.sendButton, (!draft.trim() || loading) && styles.sendButtonDisabled]}>
                  <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          </View>
        </>
      ) : null}

      {feedback ? <Text style={styles.feedbackText}>{feedback}</Text> : null}
      <ImagePreviewModal onClose={() => setPreviewImageUri('')} uri={previewImageUri} />
    </View>
  );
}

function FieldPreview({
  active,
  label,
  onPress,
  value,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  value: string;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.fieldPreview, active && styles.fieldPreviewActive]}>
      <Text style={[styles.fieldPreviewLabel, active && styles.fieldPreviewLabelActive]}>{label}</Text>
      <Text numberOfLines={2} style={styles.fieldPreviewText}>
        {value || 'Pendiente'}
      </Text>
    </Pressable>
  );
}

function fallbackFollowUpQuestion(index: number) {
  const questions = [
    '¿Qué evidencia observable confirma ese avance?',
    '¿Hay algún riesgo de contaminación, estrés o pérdida del material vegetal?',
    '¿Qué debería validar tu instructor antes de continuar?',
  ];

  return questions[index % questions.length];
}

const styles = StyleSheet.create({
  module: {
    gap: 18,
  },
  heroCard: {
    backgroundColor: learnerPalette.surface,
    elevation: 3,
    gap: 8,
    marginHorizontal: -30,
    paddingHorizontal: 37,
    paddingVertical: 20,
    shadowColor: learnerPalette.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  heroBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: learnerPalette.primary,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 7,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroBadgeText: {
    color: learnerPalette.surface,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  heroTitle: {
    color: learnerPalette.dark,
    fontFamily: 'SulphurPointBold',
    fontSize: 28,
    lineHeight: 28,
  },
  heroText: {
    color: learnerPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 10,
    maxWidth: '89%',
  },
  heroFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroFootnote: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
    maxWidth: 185,
  },
  heroDot: {
    backgroundColor: learnerPalette.secondary,
    borderRadius: 3,
    height: 5,
    width: 5,
  },
  channelBadge: {
    backgroundColor: learnerPalette.mint,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  channelBadgeText: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsMedium',
    fontSize: 11,
  },
  selectorCard: {
    backgroundColor: 'transparent',
    borderRadius: 26,
    gap: 12,
    paddingHorizontal: 5,
    paddingVertical: 10,
  },
  selectorTitle: {
    color: learnerPalette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 18,
    lineHeight: 28,
  },
  cardLabel: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  projectRail: {
    gap: 10,
    paddingVertical: 2,
  },
  projectChip: {
    backgroundColor: learnerPalette.surface,
    borderColor: learnerPalette.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 9,
    width: 190,
  },
  projectChipActive: {
    backgroundColor: learnerPalette.primary,
    borderColor: learnerPalette.primary,
  },
  projectChipTitle: {
    color: learnerPalette.greenText,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
  },
  projectChipTitleActive: {
    color: learnerPalette.surface,
  },
  projectChipMeta: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 10,
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: learnerPalette.surfaceMuted,
    borderRadius: 18,
    padding: 14,
  },
  emptyText: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
  },
  toggleCard: {
    alignItems: 'center',
    backgroundColor: learnerPalette.surface,
    borderColor: learnerPalette.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  toggleCardActive: {
    backgroundColor: '#F4FAF7',
    borderColor: learnerPalette.primary,
    borderWidth: 2,
  },
  toggleCopy: {
    flex: 1,
    gap: 3,
  },
  toggleTitle: {
    color: learnerPalette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  toggleText: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 16,
  },
  toggleStateBadge: {
    backgroundColor: learnerPalette.mint,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  toggleStateBadgeOff: {
    backgroundColor: learnerPalette.surfaceMuted,
  },
  toggleStateBadgeActive: {
    backgroundColor: '#FFFFFF',
  },
  toggleStateText: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 10,
  },
  toggleStateTextOff: {
    color: learnerPalette.textMuted,
  },
  speechCard: {
    alignItems: 'center',
    backgroundColor: learnerPalette.surface,
    borderColor: learnerPalette.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  speechIcon: {
    alignItems: 'center',
    backgroundColor: learnerPalette.mint,
    borderRadius: 999,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  voiceConversationCard: {
    gap: 10,
  },
  sectionToggle: {
    alignItems: 'center',
    backgroundColor: learnerPalette.surface,
    borderColor: learnerPalette.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  sectionToggleCopy: {
    flex: 1,
    gap: 2,
  },
  sectionToggleTitle: {
    color: learnerPalette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  sectionToggleText: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
  },
  formPreview: {
    gap: 9,
  },
  fieldPreview: {
    backgroundColor: learnerPalette.surface,
    borderColor: learnerPalette.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 5,
    padding: 13,
  },
  fieldPreviewActive: {
    backgroundColor: learnerPalette.mint,
    borderColor: learnerPalette.primary,
    borderWidth: 2,
  },
  fieldPreviewLabel: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  fieldPreviewLabelActive: {
    color: learnerPalette.progress,
  },
  fieldPreviewText: {
    color: learnerPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 17,
  },
  evidenceCard: {
    backgroundColor: learnerPalette.surface,
    borderColor: learnerPalette.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 15,
  },
  evidenceHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  helperText: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 16,
    maxWidth: 250,
  },
  evidenceCount: {
    backgroundColor: learnerPalette.mint,
    borderRadius: 999,
    color: learnerPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
    minWidth: 30,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 6,
    textAlign: 'center',
  },
  attachmentActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  attachmentButton: {
    alignItems: 'center',
    backgroundColor: learnerPalette.mint,
    borderColor: learnerPalette.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: 38,
    paddingHorizontal: 13,
  },
  attachmentButtonText: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  attachmentList: {
    gap: 8,
  },
  attachmentItem: {
    alignItems: 'center',
    backgroundColor: learnerPalette.surfaceMuted,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 10,
    minHeight: 48,
    padding: 10,
  },
  attachmentThumbnail: {
    borderRadius: 9,
    height: 38,
    width: 38,
  },
  attachmentCopy: {
    flex: 1,
    gap: 1,
  },
  attachmentTitle: {
    color: learnerPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  attachmentMeta: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 10,
  },
  removeEvidenceButton: {
    alignItems: 'center',
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  emptyEvidenceText: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
  },
  linkFields: {
    gap: 9,
  },
  linkInput: {
    backgroundColor: learnerPalette.surfaceMuted,
    borderColor: learnerPalette.border,
    borderRadius: 16,
    borderWidth: 1,
    color: learnerPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    minHeight: 44,
    paddingHorizontal: 13,
  },
  chatCard: {
    backgroundColor: learnerPalette.surface,
    borderColor: learnerPalette.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: 14,
    padding: 14,
  },
  conversationPanel: {
    backgroundColor: learnerPalette.surface,
    borderColor: learnerPalette.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  conversationHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  conversationCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  conversationLabel: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  conversationHelp: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 16,
  },
  newConversationButton: {
    alignItems: 'center',
    backgroundColor: learnerPalette.primary,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    minHeight: 34,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  newConversationText: {
    color: '#FFFFFF',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  conversationRail: {
    gap: 8,
    paddingRight: 10,
  },
  conversationChip: {
    alignItems: 'center',
    backgroundColor: learnerPalette.surfaceMuted,
    borderColor: learnerPalette.border,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    maxWidth: 176,
    minWidth: 126,
    overflow: 'hidden',
  },
  conversationChipMain: {
    flex: 1,
    gap: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  deleteConversationButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  conversationChipActive: {
    backgroundColor: learnerPalette.primary,
    borderColor: learnerPalette.primary,
  },
  conversationChipTitle: {
    color: learnerPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  conversationChipTitleActive: {
    color: '#FFFFFF',
  },
  conversationChipMeta: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 10,
  },
  conversationChipMetaActive: {
    color: '#FFFFFF',
  },
  chatHeader: {
    alignItems: 'center',
    borderBottomColor: learnerPalette.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  chatHeaderCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  chatTitle: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 17,
    lineHeight: 23,
  },
  chatSubtitle: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
  },
  historyButton: {
    alignItems: 'center',
    backgroundColor: learnerPalette.mint,
    borderRadius: 999,
    flexDirection: 'row',
    flexShrink: 0,
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chatMeta: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
  },
  historyToggleText: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  messageList: {
    gap: 12,
  },
  messageRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
    maxWidth: '100%',
  },
  messageRowAssistant: {
    alignSelf: 'flex-start',
  },
  messageRowUser: {
    alignSelf: 'flex-end',
  },
  messageBubble: {
    borderRadius: 18,
    maxWidth: '88%',
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  messageAssistant: {
    backgroundColor: learnerPalette.surface,
    borderBottomLeftRadius: 4,
    borderColor: learnerPalette.border,
    borderWidth: 1,
  },
  messageUser: {
    borderBottomRightRadius: 4,
    backgroundColor: learnerPalette.primary,
    shadowColor: learnerPalette.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
  assistantAvatar: {
    alignItems: 'center',
    backgroundColor: learnerPalette.primary,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    marginBottom: 10,
    width: 32,
  },
  messageHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 5,
  },
  messageSender: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 10,
  },
  messageText: {
    color: learnerPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    lineHeight: 19,
  },
  messageTextUser: {
    color: '#FFFFFF',
  },
  replayButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: learnerPalette.mint,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    marginTop: 8,
    minHeight: 28,
    paddingHorizontal: 9,
  },
  replayButtonText: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 10,
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  loadingText: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
  },
  infoCard: {
    alignItems: 'center',
    backgroundColor: learnerPalette.gold,
    borderColor: learnerPalette.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    padding: 12,
  },
  infoText: {
    color: learnerPalette.text,
    flex: 1,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 17,
  },
  composerCard: {
    backgroundColor: learnerPalette.surface,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderRadius: 28,
    elevation: 3,
    gap: 8,
    marginBottom: 0,
    marginHorizontal: -30,
    marginTop: 16,
    paddingHorizontal: 30,
    paddingVertical: 16,
    shadowColor: learnerPalette.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  composerInput: {
    color: learnerPalette.dark,
    fontFamily: 'PoppinsRegular',
    fontSize: 14,
    lineHeight: 22,
    maxWidth: '100%',
    minHeight: 40,
    textAlignVertical: 'top',
  },
  composerFooter: {
    alignItems: 'center',
    borderTopColor: learnerPalette.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingTop: 9,
  },
  composerHint: {
    color: learnerPalette.textMuted,
    flex: 1,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 16,
  },
  actionsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: learnerPalette.primary,
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    shadowColor: learnerPalette.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    width: 42,
    elevation: 4,
  },
  sendButtonDisabled: {
    opacity: 0.55,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveCard: {
    backgroundColor: learnerPalette.surface,
    borderColor: learnerPalette.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 15,
  },
  saveCopy: {
    gap: 4,
  },
  saveTitle: {
    color: learnerPalette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
  },
  saveText: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 17,
  },
  saveButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: learnerPalette.primary,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    minHeight: 43,
    paddingHorizontal: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  feedbackText: {
    color: learnerPalette.progress,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
    lineHeight: 18,
  },
});
