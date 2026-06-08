import type { ComponentProps } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { pasantePalette } from './theme';

export type PasanteIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type PasanteMetric = {
  id: string;
  icon: PasanteIconName;
  value: string;
  label: string;
  caption: string;
  accent: string;
  soft: string;
};

export type PasanteProject = {
  id: string;
  ficha: string;
  title: string;
  species: string;
  mentor: string;
  area: string;
  stage: string;
  progress: number;
  evidenceCount: number;
  nextStep: string;
  status: 'En apoyo' | 'Por validar' | 'Documentado';
};

export type PasanteTask = {
  id: string;
  title: string;
  detail: string;
  projectId: string;
  due: string;
  status: 'Pendiente' | 'En revisión' | 'Completada';
};

export const pasanteMetrics: PasanteMetric[] = [
  {
    id: 'projects',
    icon: 'flask-outline',
    value: '4',
    label: 'Cultivos',
    caption: 'En apoyo técnico',
    accent: pasantePalette.green,
    soft: pasantePalette.softGreen,
  },
  {
    id: 'evidence',
    icon: 'camera-outline',
    value: '18',
    label: 'Evidencias',
    caption: 'Por documentar',
    accent: pasantePalette.green,
    soft: pasantePalette.softGreen,
  },
  {
    id: 'reviews',
    icon: 'clipboard-check-outline',
    value: '6',
    label: 'Validaciones',
    caption: 'Con instructor',
    accent: '#E4A45A',
    soft: pasantePalette.aqua,
  },
];

export const pasanteProjects: PasanteProject[] = [
  {
    id: 'orquideas',
    ficha: '2693201',
    title: 'Propagación in vitro',
    species: 'Orquídeas',
    mentor: 'Leonardo Rojas',
    area: 'Laboratorio vegetal',
    stage: 'Multiplicación controlada',
    progress: 68,
    evidenceCount: 7,
    nextStep: 'Validar registro de humedad y anexar foto comparativa.',
    status: 'En apoyo',
  },
  {
    id: 'fresas',
    ficha: '2693202',
    title: 'Propagación in vitro',
    species: 'Fresas',
    mentor: 'Sarah Martínez',
    area: 'Cámara de crecimiento',
    stage: 'Seguimiento de contaminación',
    progress: 54,
    evidenceCount: 5,
    nextStep: 'Revisar lote marcado y preparar nota para el instructor.',
    status: 'Por validar',
  },
  {
    id: 'arandanos',
    ficha: '2693203',
    title: 'Micropropagación',
    species: 'Arándanos',
    mentor: 'Mafe Pineda',
    area: 'Banco de enraizamiento',
    stage: 'Documentación de trazabilidad',
    progress: 76,
    evidenceCount: 6,
    nextStep: 'Organizar bitácora técnica de la semana.',
    status: 'Documentado',
  },
];

export const pasanteTasks: PasanteTask[] = [
  {
    id: 'task-1',
    title: 'Consolidar evidencias',
    detail: 'Agrupa fotos, notas y observaciones del lote de orquídeas.',
    projectId: 'orquideas',
    due: 'Hoy',
    status: 'Pendiente',
  },
  {
    id: 'task-2',
    title: 'Revisar alerta de contaminación',
    detail: 'Describe la coloración observada y deja recomendación inicial.',
    projectId: 'fresas',
    due: 'Mañana',
    status: 'En revisión',
  },
  {
    id: 'task-3',
    title: 'Preparar resumen técnico',
    detail: 'Sintetiza avances de arándanos para revisión del instructor.',
    projectId: 'arandanos',
    due: 'Viernes',
    status: 'Completada',
  },
];
