import type { ComponentProps } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { instructorPalette } from './theme';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type InstructorMetric = {
  id: string;
  label: string;
  value: string;
  valueStyle?: object;
  caption: string;
  icon: IconName;
  accent: string;
  soft: string;
};

export type ProjectSnapshot = {
  id: string;
  title: string;
  species: string;
  stage: string;
  progress: number;
  contamination: string;
  inventory: string;
  photos: number;
  accent: string;
  soft: string;
  icon: IconName;
};

export type ProjectGalleryItem = {
  id: string;
  learner: string;
  note: string;
  date: string;
};

export type ProjectQuestion = {
  id: string;
  learner: string;
  question: string;
  answer: string;
  status: 'Pendiente' | 'Respondida';
};

export type ProjectDetail = ProjectSnapshot & {
  guideName: string;
  iconOptions: IconName[];
  sharedSheets: string[];
  sharedLearners: string[];
  competencies: string[];
  gallery: ProjectGalleryItem[];
  questions: ProjectQuestion[];
};

export type AlertItem = {
  id: string;
  title: string;
  detail: string;
  severity: 'Alta' | 'Media' | 'Baja';
  accent: string;
  icon: IconName;
};

export type LearnerStatus = 'En riesgo' | 'Estable' | 'Destacado';

export type LearnerProgress = {
  id: string;
  name: string;
  sheet: string;
  project: string;
  progress: number;
  deliveries: number;
  status: LearnerStatus;
  lastActivity: string;
};

export type LearnerBitacoraPreview = {
  id: string;
  title: string;
  date: string;
  detail: string;
  status: 'Pendiente' | 'Aprobada';
};

export type LearnerQuestionPreview = {
  id: string;
  question: string;
  answer: string;
  date: string;
};

export type LearnerDetail = LearnerProgress & {
  trimester: string;
  competencies: string[];
  bitacoras: LearnerBitacoraPreview[];
  questions: LearnerQuestionPreview[];
  trend: number[];
};

export type SheetOverview = {
  id: string;
  code: string;
  program: string;
  trimester: string;
  learners: number;
  activeProjects: number;
  progress: number;
  competencies: string[];
};

export type AssistantPrompt = {
  id: string;
  title: string;
  detail: string;
  icon: IconName;
};

export type QuickAction = {
  id: string;
  title: string;
  detail: string;
  icon: IconName;
  accent: string;
  soft: string;
};

export const instructorMetrics: InstructorMetric[] = [
  {
    id: 'cultivos',
    label: 'Cultivos activos',
    value: '18',
    valueStyle: { color: instructorPalette.primary },
    caption: '6 requieren revisión hoy',
    icon: 'sprout',
    accent: instructorPalette.primary,
    soft: instructorPalette.mint,
  },
  {
    id: 'fichas',
    label: 'Fichas activas',
    value: '4',
    valueStyle: { color: instructorPalette.green },
    caption: '20 aprendices por ficha en promedio',
    icon: 'account-group',
    accent: instructorPalette.green,
    soft: instructorPalette.softGreen,
  },
  {
    id: 'dudas',
    label: 'Dudas abiertas',
    value: '3',
    valueStyle: { color: '#C97B63' },
    caption: 'Preguntas pendientes de responder',
    icon: 'comment-question-outline',
    accent: '#EAA189',
    soft: instructorPalette.peachSurface,
  },
];

export const projectSnapshots: ProjectSnapshot[] = [
  {
    id: 'orquideas',
    title: 'Propagacion in vitro',
    species: 'Orquideas',
    stage: 'Multiplicacion controlada',
    progress: 74,
    contamination: 'Riesgo bajo',
    inventory: '48 frascos disponibles',
    photos: 12,
    accent: instructorPalette.secondary,
    soft: instructorPalette.mint,
    icon: 'flower-tulip-outline',
  },
  {
    id: 'fresas',
    title: 'Propagacion in vitro',
    species: 'Fresas',
    stage: 'Aclimatacion',
    progress: 58,
    contamination: '2 alertas pendientes',
    inventory: '32 bandejas activas',
    photos: 9,
    accent: instructorPalette.secondary,
    soft: instructorPalette.softGreen,
    icon: 'fruit-cherries',
  },
  {
    id: 'arandanos',
    title: 'Micropropagacion',
    species: 'Arandanos',
    stage: 'Enraizamiento',
    progress: 86,
    contamination: 'Sin incidencias',
    inventory: '21 lotes monitoreados',
    photos: 15,
    accent: '#1dc66f',
    soft: '#EEF8E9',
    icon: 'leaf-circle-outline',
  },
];

export const projectDetails: ProjectDetail[] = [
  {
    ...projectSnapshots[0],
    guideName: 'Guía_Propagación_Orquídeas.pdf',
    iconOptions: ['flower-tulip-outline', 'sprout', 'leaf-circle-outline'],
    sharedSheets: ['Ficha 3203082', 'Ficha 3233810'],
    sharedLearners: ['Aslhy Casteblanco', 'Nicolas Rodriguez'],
    competencies: [
      'Registrar variables de crecimiento in vitro',
      'Controlar condiciones de esterilidad',
    ],
    gallery: [
      { id: 'gal1', learner: 'Aslhy Casteblanco', note: 'Semana 5 - frasco principal', date: 'Hoy' },
      { id: 'gal2', learner: 'Nicolas Rodriguez', note: 'Brotes secundarios', date: 'Ayer' },
    ],
    questions: [
      {
        id: 'pq1',
        learner: 'Aslhy Casteblanco',
        question: 'Debo registrar tambien el cambio de color en el borde del explante?',
        answer: 'Sí, describe color, ubicación y foto asociada.',
        status: 'Respondida',
      },
      {
        id: 'pq2',
        learner: 'Sarah Castro',
        question: '¿Puedo subir la evidencia mañana si hoy no tengo conectividad?',
        answer: '',
        status: 'Pendiente',
      },
    ],
  },
  {
    ...projectSnapshots[1],
    guideName: 'Guía_Propagación_Fresas.pdf',
    iconOptions: ['fruit-cherries', 'sprout', 'flask-outline'],
    sharedSheets: ['Ficha 3203082'],
    sharedLearners: ['Mafe Rojas', 'Sarah Castro'],
    competencies: ['Analizar contaminación y medidas preventivas'],
    gallery: [
      { id: 'gal3', learner: 'Mafe Rojas', note: 'Bandeja 3 - evidencia de contaminación', date: 'Hoy' },
    ],
    questions: [
      {
        id: 'pq3',
        learner: 'Mafe Rojas',
        question: '¿La evidencia de semana 4 la subo como foto o en la bitácora?',
        answer: 'Subela en ambos espacios para mantener trazabilidad.',
        status: 'Respondida',
      },
    ],
  },
  {
    ...projectSnapshots[2],
    guideName: 'Guía_Micropropagación_Arándanos.pdf',
    iconOptions: ['leaf-circle-outline', 'sprout', 'flower-pollen-outline'],
    sharedSheets: ['Ficha 3147272'],
    sharedLearners: ['Sarah Castro'],
    competencies: ['Documentar trazabilidad del cultivo'],
    gallery: [
      { id: 'gal4', learner: 'Sarah Castro', note: 'Enraizamiento estable', date: 'Hace 2 días' },
    ],
    questions: [],
  },
];

export const instructorAlerts: AlertItem[] = [
  {
    id: 'alerta1',
    title: 'pH fuera de rango en lote OQ-17',
    detail: 'Detectado hace 12 min. Recomendacion IA preparada.',
    severity: 'Alta',
    accent: '#EAA189',
    icon: 'flask-outline',
  },
  {
    id: 'alerta2',
    title: 'Faltan 3 evidencias fotográficas',
    detail: 'Ficha 3203082 sin registro visual de la semana 4.',
    severity: 'Media',
    accent: instructorPalette.secondary,
    icon: 'camera-outline',
  },
  {
    id: 'alerta3',
    title: 'Inventario de medio MS por debajo del umbral',
    detail: 'Quedan 2 unidades. Sugerido generar reposicion.',
    severity: 'Baja',
    accent: instructorPalette.primary,
    icon: 'archive-outline',
  },
];

export const learnerRoster: LearnerProgress[] = [
  {
    id: 'apr1',
    name: 'Nicolas Rodriguez',
    sheet: 'Ficha 3203082',
    project: 'Orquideas',
    progress: 84,
    deliveries: 6,
    status: 'Destacado',
    lastActivity: 'Sincronizo hace 8 min',
  },
  {
    id: 'apr2',
    name: 'Aslhy Casteblanco',
    sheet: 'Ficha 3203082',
    project: 'Fresas',
    progress: 63,
    deliveries: 5,
    status: 'Estable',
    lastActivity: 'Último registro por voz hace 25 min',
  },
  {
    id: 'apr3',
    name: 'Sarah Castro',
    sheet: 'Ficha 3233810',
    project: 'Arandanos',
    progress: 41,
    deliveries: 3,
    status: 'En riesgo',
    lastActivity: 'Pendiente de evidencia desde ayer',
  },
  {
    id: 'apr4',
    name: 'Mafe Rojas',
    sheet: 'Ficha 2996904',
    project: 'Orquideas',
    progress: 72,
    deliveries: 5,
    status: 'Estable',
    lastActivity: 'Requiere revisión del informe parcial',
  },
];

export const learnerDetails: LearnerDetail[] = [
  {
    ...learnerRoster[0],
    trimester: 'IV trimestre',
    competencies: [
      'Registrar variables de crecimiento',
      'Documentar trazabilidad del cultivo',
    ],
    bitacoras: [
      {
        id: 'lb1',
        title: 'Bitácora semana 5',
        date: '17 de enero de 2025',
        detail: 'Registro completo con fotos y observaciones del brote principal.',
        status: 'Aprobada',
      },
    ],
    questions: [
      {
        id: 'lq1',
        question: 'Puedo adjuntar 2 fotos por frasco?',
        answer: 'Sí, siempre que la evidencia se relacione con el cambio observado.',
        date: 'Hoy',
      },
    ],
    trend: [45, 58, 66, 74, 84],
  },
  {
    ...learnerRoster[1],
    trimester: 'IV trimestre',
    competencies: [
      'Analizar contaminación y medidas preventivas',
      'Redactar observaciones técnicas',
    ],
    bitacoras: [
      {
        id: 'lb2',
        title: 'Emergencia observada',
        date: '22 de enero de 2025',
        detail: 'Se notifico cambio de coloracion y se adjuntaron 2 imagenes.',
        status: 'Pendiente',
      },
    ],
    questions: [
      {
        id: 'lq2',
        question: '¿Debo seguir con preguntas automáticas activas?',
        answer: 'Puedes desactivarlas si solo quieres transcripcion.',
        date: 'Ayer',
      },
    ],
    trend: [32, 41, 49, 57, 63],
  },
  {
    ...learnerRoster[2],
    trimester: 'III trimestre',
    competencies: ['Documentar trazabilidad del cultivo'],
    bitacoras: [
      {
        id: 'lb3',
        title: 'Pendiente de evidencia',
        date: '24 de enero de 2025',
        detail: 'Aún no sube el soporte fotográfico solicitado.',
        status: 'Pendiente',
      },
    ],
    questions: [],
    trend: [22, 27, 31, 36, 41],
  },
  {
    ...learnerRoster[3],
    trimester: 'IV trimestre',
    competencies: ['Registrar variables de crecimiento'],
    bitacoras: [
      {
        id: 'lb4',
        title: 'Informe parcial',
        date: '23 de enero de 2025',
        detail: 'Bitácora con revisión pendiente del instructor.',
        status: 'Pendiente',
      },
    ],
    questions: [],
    trend: [40, 52, 61, 67, 72],
  },
];

export const sheetOverviews: SheetOverview[] = [
  {
    id: 'sheet1',
    code: '3203082',
    program: 'Biotecnología vegetal',
    trimester: 'IV trimestre',
    learners: 20,
    activeProjects: 3,
    progress: 68,
    competencies: [
      'Registrar variables de crecimiento in vitro',
      'Analizar contaminación y medidas preventivas',
    ],
  },
  {
    id: 'sheet2',
    code: '3233810',
    program: 'Biotecnología vegetal',
    trimester: 'III trimestre',
    learners: 18,
    activeProjects: 2,
    progress: 52,
    competencies: ['Documentar trazabilidad del cultivo'],
  },
];

export const assistantPrompts: AssistantPrompt[] = [
  {
    id: 'retro',
    title: 'Generar retroalimentacion',
    detail: 'Resume avances, corrige lenguaje técnico y detecta riesgos.',
    icon: 'robot-outline',
  },
  {
    id: 'indicadores',
    title: 'Analizar ficha',
    detail: 'Cruza crecimiento, contaminación e inventarios por ficha.',
    icon: 'chart-line',
  },
  {
    id: 'guia',
    title: 'Preparar guía',
    detail: 'Crea instrucciones claras para aprendices y pasantes.',
    icon: 'format-list-numbered',
  },
];

export const quickActions: QuickAction[] = [
  {
    id: 'ficha',
    title: 'Nueva ficha',
    detail: 'Registrar trimestre, programa y aprendices asociados.',
    icon: 'account-multiple-plus-outline',
    accent: instructorPalette.secondary,
    soft: instructorPalette.mint,
  },
  {
    id: 'proyecto',
    title: 'Nuevo proyecto',
    detail: 'Crear evidencia, icono, guía y asignación.',
    icon: 'clipboard-plus-outline',
    accent: instructorPalette.primary,
    soft: instructorPalette.softGreen,
  },
  {
    id: 'dudas',
    title: 'Responder dudas',
    detail: 'Atender preguntas abiertas de los aprendices.',
    icon: 'comment-text-multiple-outline',
    accent: '#EAA189',
    soft: instructorPalette.peachSurface,
  },
];

export const instructorProfile = {
  academyProgress: 0.78,
  reviewedPractices: 35,
  automatedReports: 16,
  guidedSessions: 11,
};
