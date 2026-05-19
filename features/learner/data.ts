export type LearnerProject = {
  id: string;
  title: string;
  species: string;
  instructor: string;
  ficha: string;
  trimester: string;
  lastRecord: string;
  status: string;
  progress: number;
  weekLabel: string;
  trend: number[];
  evidenceCount: number;
  guideName: string;
  assistantMode: 'Guiado' | 'Escucha libre';
};

export type LearnerObservation = {
  id: string;
  title: string;
  detail: string;
  date: string;
  status: 'Aprobado' | 'Pendiente';
};

export type LearnerBitacora = {
  id: string;
  projectId: string;
  title: string;
  detail: string;
  date: string;
  images: number;
  status: 'Borrador' | 'Enviada' | 'Aprobada';
};

export type LearnerQuestionThread = {
  id: string;
  instructor: string;
  projectId: string;
  question: string;
  answer: string;
  date: string;
};

export type LearnerCompetency = {
  id: string;
  instructor: string;
  ficha: string;
  competency: string;
  evidence: string;
  status: 'Activa' | 'En revisión';
};

export const learnerProjects: LearnerProject[] = [
  {
    id: 'orquideas',
    title: 'Propagacion in vitro',
    species: 'Orquideas',
    instructor: 'Leonardo Rojas',
    ficha: '3203082',
    trimester: 'IV trimestre',
    lastRecord: 'Hace 3 horas',
    status: 'En observación',
    progress: 62,
    weekLabel: 'Semana 5',
    trend: [5, 7, 10, 13, 16],
    evidenceCount: 12,
    guideName: 'Guía_de_Aprendizaje_Orquídeas.pdf',
    assistantMode: 'Guiado',
  },
  {
    id: 'fresas',
    title: 'Propagacion in vitro',
    species: 'Fresas',
    instructor: 'Sarah Martinez',
    ficha: '3203082',
    trimester: 'IV trimestre',
    lastRecord: 'Hace 3 horas',
    status: 'Emergencia observada',
    progress: 58,
    weekLabel: 'Semana 5',
    trend: [4, 6, 9, 12, 14],
    evidenceCount: 9,
    guideName: 'Guía_de_Aprendizaje_Fresas.pdf',
    assistantMode: 'Escucha libre',
  },
  {
    id: 'arandanos',
    title: 'Micropropagacion',
    species: 'Arandanos',
    instructor: 'Mafe Pineda',
    ficha: '3203082',
    trimester: 'IV trimestre',
    lastRecord: 'Hace 1 día',
    status: 'Estable',
    progress: 73,
    weekLabel: 'Semana 6',
    trend: [3, 5, 7, 8, 10],
    evidenceCount: 15,
    guideName: 'Guía_de_Aprendizaje_Arándanos.pdf',
    assistantMode: 'Guiado',
  },
];

export const learnerObservations: LearnerObservation[] = [
  {
    id: 'obs1',
    title: 'Propagacion in vitro - Orquideas',
    detail: 'Se observó brote uniforme y humedad estable en la cámara.',
    date: '17 de enero de 2025',
    status: 'Aprobado',
  },
  {
    id: 'obs2',
    title: 'Propagacion in vitro - Orquideas',
    detail: 'Se registro cambio leve en coloracion del follaje y se notifico al instructor.',
    date: '22 de enero de 2025',
    status: 'Pendiente',
  },
  {
    id: 'obs3',
    title: 'Propagacion in vitro - Fresas',
    detail: 'El lote presenta variación de temperatura y requiere seguimiento en próxima sesión.',
    date: '24 de enero de 2025',
    status: 'Aprobado',
  },
];

export const learnerBitacoras: LearnerBitacora[] = [
  {
    id: 'bit1',
    projectId: 'orquideas',
    title: 'Bitácora semana 5',
    detail: 'Registro de altura, pH y coloracion general. Se anexaron 3 imagenes del cultivo.',
    date: '17 de enero de 2025',
    images: 3,
    status: 'Aprobada',
  },
  {
    id: 'bit2',
    projectId: 'fresas',
    title: 'Emergencia observada',
    detail: 'Se describió contaminación puntual y se notificó al instructor con evidencia fotográfica.',
    date: '22 de enero de 2025',
    images: 2,
    status: 'Enviada',
  },
  {
    id: 'bit3',
    projectId: 'arandanos',
    title: 'Seguimiento de enraizamiento',
    detail: 'Se agregaron notas de temperatura, humedad y respuesta del explante.',
    date: '24 de enero de 2025',
    images: 1,
    status: 'Borrador',
  },
];

export const learnerQuestionThreads: LearnerQuestionThread[] = [
  {
    id: 'qa1',
    instructor: 'Leonardo Rojas',
    projectId: 'orquideas',
    question: 'Recuerda medir el pH del sustrato y reportar el valor exacto.',
    answer: 'Listo, lo registre en 5.8 y subi foto del frasco principal.',
    date: 'Hoy',
  },
  {
    id: 'qa2',
    instructor: 'Sarah Martinez',
    projectId: 'fresas',
    question: 'Describe mejor la evidencia de contaminación antes de cerrar la bitácora.',
    answer: 'Actualice la nota y anadi la descripcion del borde amarillento.',
    date: 'Ayer',
  },
];

export const learnerCompetencies: LearnerCompetency[] = [
  {
    id: 'comp1',
    instructor: 'Leonardo Rojas',
    ficha: '3203082',
    competency: 'Registrar variables de crecimiento in vitro',
    evidence: 'Proyecto Orquideas',
    status: 'Activa',
  },
  {
    id: 'comp2',
    instructor: 'Sarah Martinez',
    ficha: '3203082',
    competency: 'Analizar contaminación y medidas preventivas',
    evidence: 'Proyecto Fresas',
    status: 'En revisión',
  },
  {
    id: 'comp3',
    instructor: 'Mafe Pineda',
    ficha: '3203082',
    competency: 'Documentar trazabilidad del cultivo',
    evidence: 'Proyecto Arandanos',
    status: 'Activa',
  },
];

export const learnerAssistantQuestions = [
  'Cual fue la altura observada en el cultivo hoy?',
  '¿Detectaste cambios de color, humedad o contaminación?',
  'Que recomendacion o novedad importante deberia quedar guardada?',
];
