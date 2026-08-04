import type {
  AuthenticatedSession,
  WorkspaceAssistantProject,
} from '@/features/workspace/types';

type RecordItem = {
  id?: string;
  [key: string]: any;
};

type BuildAcademicAssistantContextParams = {
  aprendices?: RecordItem[];
  asignaciones?: RecordItem[];
  bitacoras?: RecordItem[];
  competencias?: RecordItem[];
  fichas?: RecordItem[];
  grupos?: RecordItem[];
  instructores?: RecordItem[];
  pasantes?: RecordItem[];
  proyectos?: RecordItem[];
  resultados?: RecordItem[];
  roleLabel: 'instructor' | 'pasante';
  session: AuthenticatedSession;
  tareasPasante?: RecordItem[];
};

const GENERAL_PROJECT: WorkspaceAssistantProject = {
  id: 'general',
  title: 'Vista general de la app',
};

function cleanText(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function getMillis(value: any) {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function listLines<T>(
  items: T[],
  mapper: (item: T, index: number) => string,
  limit = 8
) {
  const visibleItems = items.slice(0, limit);
  const lines = visibleItems.map(mapper).filter(Boolean);
  const hiddenCount = Math.max(0, items.length - visibleItems.length);

  if (hiddenCount) {
    lines.push(`- Hay ${hiddenCount} registro(s) mas no listados por limite de contexto.`);
  }

  return lines.length ? lines.join('\n') : '- Sin registros visibles.';
}

function getSheetKey(sheet: RecordItem) {
  return cleanText(sheet.id || sheet.numero);
}

function projectSheetMatches(project: RecordItem, sheet: RecordItem) {
  const sheetValues = [sheet.id, sheet.numero].map(cleanText).filter(Boolean);
  const projectValues = [project.fichaId, project.fichaNumero].map(cleanText).filter(Boolean);
  return projectValues.some((value) => sheetValues.includes(value));
}

function taskStatusCount(tasks: RecordItem[]) {
  const pending = tasks.filter((task) => cleanText(task.estado || 'Pendiente') === 'Pendiente').length;
  const done = tasks.filter((task) => cleanText(task.estado) === 'Hecho').length;
  const validated = tasks.filter((task) => cleanText(task.estado) === 'Validada').length;
  return `pendientes ${pending}, hechas ${done}, validadas ${validated}`;
}

function bitacoraStatusCount(bitacoras: RecordItem[]) {
  const pending = bitacoras.filter((item) => {
    const status = cleanText(item.estado || 'Pendiente');
    return !['Aprobada', 'Rechazada', 'Correccion'].includes(status);
  }).length;
  const approved = bitacoras.filter((item) => cleanText(item.estado) === 'Aprobada').length;
  return `pendientes ${pending}, aprobadas ${approved}, total ${bitacoras.length}`;
}

function getAssignmentRapIds(assignment: RecordItem) {
  return [
    assignment.resultadoId,
    ...(Array.isArray(assignment.resultadoIds) ? assignment.resultadoIds : []),
  ].map(cleanText).filter(Boolean);
}

function buildSheetSummaries({
  asignaciones,
  bitacoras,
  competencias,
  fichas,
  proyectos,
  resultados,
}: Required<Pick<
  BuildAcademicAssistantContextParams,
  'asignaciones' | 'bitacoras' | 'competencias' | 'fichas' | 'proyectos' | 'resultados'
>>) {
  return listLines(fichas, (sheet) => {
    const sheetProjects = proyectos.filter((project) => projectSheetMatches(project, sheet));
    const sheetAssignments = asignaciones.filter((assignment) => cleanText(assignment.fichaId) === cleanText(sheet.id));
    const sheetBitacoras = bitacoras.filter((bitacora) =>
      [bitacora.fichaId, bitacora.fichaNumero].map(cleanText).includes(getSheetKey(sheet))
      || sheetProjects.some((project) => cleanText(project.id) === cleanText(bitacora.proyectoId))
    );
    const competenceNames = sheetAssignments
      .map((assignment) => competencias.find((item) => cleanText(item.id) === cleanText(assignment.competenciaId)))
      .filter(Boolean)
      .map((item) => cleanText(item?.nombre || item?.codigo))
      .filter(Boolean);
    const rapCount = sheetAssignments.reduce((sum, assignment) => sum + getAssignmentRapIds(assignment).length, 0);
    const trimester = cleanText(sheet.trimestreActual) || 'sin trimestre';

    return [
      `- Ficha ${cleanText(sheet.numero || sheet.id)} (${cleanText(sheet.programaNombre) || 'programa sin registrar'}, ${trimester})`,
      `proyectos: ${sheetProjects.length}`,
      `bitacoras: ${bitacoraStatusCount(sheetBitacoras)}`,
      `competencias/RAP: ${Array.from(new Set(competenceNames)).slice(0, 3).join('; ') || 'sin competencias visibles'} (${rapCount} RAP asignados)`,
      `resultados visibles: ${resultados.filter((rap) => sheetAssignments.some((assignment) => getAssignmentRapIds(assignment).includes(cleanText(rap.id)))).length}`,
    ].join(' | ');
  }, 10);
}

function buildProjectSummaries({
  bitacoras,
  grupos,
  proyectos,
}: Required<Pick<BuildAcademicAssistantContextParams, 'bitacoras' | 'grupos' | 'proyectos'>>) {
  return listLines(proyectos, (project) => {
    const projectBitacoras = bitacoras.filter((bitacora) => cleanText(bitacora.proyectoId) === cleanText(project.id));
    const group = grupos.find((item) => cleanText(item.id) === cleanText(project.grupoId));
    const expectedLogs = cleanText(project.bitacorasEsperadas) || 'sin meta';

    return [
      `- ${cleanText(project.titulo) || 'Proyecto sin titulo'}`,
      `ficha ${cleanText(project.fichaNumero || project.fichaId) || 'sin ficha'}`,
      `estado ${cleanText(project.estado) || 'sin estado'}`,
      `tipo ${cleanText(project.asignacionTipo) || 'ficha'}`,
      group ? `grupo ${cleanText(group.nombre || group.id)}` : 'sin grupo',
      `competencia ${cleanText(project.competenciaNombre) || 'sin competencia'}`,
      `RAP ${cleanText(project.rapDescripcion) || cleanText(project.rapId) || 'sin RAP'}`,
      `bitacoras ${projectBitacoras.length}/${expectedLogs}`,
    ].join(' | ');
  }, 12);
}

function buildLearnerSummaries(aprendices: RecordItem[], bitacoras: RecordItem[]) {
  return listLines(aprendices, (learner) => {
    const learnerLogs = bitacoras.filter((bitacora) => cleanText(bitacora.aprendizUid) === cleanText(learner.id));
    const latest = [...learnerLogs].sort((a, b) =>
      (getMillis(b.actualizadoEn) || getMillis(b.creadoEn)) - (getMillis(a.actualizadoEn) || getMillis(a.creadoEn))
    )[0];

    return [
      `- ${cleanText(learner.nombre || learner.correo || learner.id)}`,
      `ficha ${cleanText(learner.ficha || learner.fichaId) || 'sin ficha'}`,
      `bitacoras ${bitacoraStatusCount(learnerLogs)}`,
      latest ? `ultima: ${cleanText(latest.proyectoTitulo || latest.descripcion || latest.fecha)}` : 'sin entregas visibles',
    ].join(' | ');
  }, 12);
}

function buildPasanteSummaries(pasantes: RecordItem[], tareasPasante: RecordItem[]) {
  return listLines(pasantes, (pasante) => {
    const tasks = tareasPasante.filter((task) => cleanText(task.pasanteUid) === cleanText(pasante.id));

    return [
      `- ${cleanText(pasante.nombre || pasante.correo || pasante.id)}`,
      `correo ${cleanText(pasante.correo) || 'sin correo'}`,
      `tareas ${taskStatusCount(tasks)}`,
    ].join(' | ');
  }, 10);
}

function buildTaskSummaries(tareasPasante: RecordItem[]) {
  return listLines(tareasPasante, (task) => [
    `- ${cleanText(task.titulo) || 'Tarea sin titulo'}`,
    `pasante ${cleanText(task.pasanteNombre || task.pasanteUid) || 'sin pasante'}`,
    `ficha ${cleanText(task.fichaNumero || task.fichaId) || 'sin ficha'}`,
    `proyecto ${cleanText(task.proyectoTitulo || task.proyectoId) || 'sin proyecto'}`,
    `estado ${cleanText(task.estado) || 'Pendiente'}`,
    cleanText(task.observacionInstructor) ? `observacion instructor: ${cleanText(task.observacionInstructor)}` : '',
    cleanText(task.observacionPasante) ? `respuesta pasante: ${cleanText(task.observacionPasante)}` : '',
  ].filter(Boolean).join(' | '), 12);
}

function buildRecentBitacoraSummaries(bitacoras: RecordItem[]) {
  const sorted = [...bitacoras].sort((a, b) =>
    (getMillis(b.actualizadoEn) || getMillis(b.creadoEn) || getMillis(b.fecha))
    - (getMillis(a.actualizadoEn) || getMillis(a.creadoEn) || getMillis(a.fecha))
  );

  return listLines(sorted, (bitacora) => [
    `- ${cleanText(bitacora.proyectoTitulo || bitacora.proyectoId) || 'Proyecto sin titulo'}`,
    `aprendiz ${cleanText(bitacora.aprendizNombre || bitacora.aprendizUid) || 'sin aprendiz'}`,
    `estado ${cleanText(bitacora.estado) || 'Pendiente'}`,
    `fecha ${cleanText(bitacora.fecha) || 'sin fecha'}`,
    cleanText(bitacora.observacion) ? `observacion: ${cleanText(bitacora.observacion)}` : '',
  ].filter(Boolean).join(' | '), 12);
}

export function buildWorkspaceAssistantProjects(
  proyectos: RecordItem[],
  fallbackLabel = 'Vista general de la app'
): WorkspaceAssistantProject[] {
  const realProjects = proyectos
    .filter((project) => cleanText(project.id))
    .map((project) => ({
      id: cleanText(project.id),
      title: [
        cleanText(project.titulo) || 'Proyecto sin titulo',
        cleanText(project.fichaNumero || project.fichaId) ? `Ficha ${cleanText(project.fichaNumero || project.fichaId)}` : '',
      ].filter(Boolean).join(' - '),
    }));

  return [
    { ...GENERAL_PROJECT, title: fallbackLabel },
    ...realProjects,
  ];
}

export function buildAcademicAssistantContext({
  asignaciones = [],
  aprendices = [],
  bitacoras = [],
  competencias = [],
  fichas = [],
  grupos = [],
  instructores = [],
  pasantes = [],
  proyectos = [],
  resultados = [],
  roleLabel,
  session,
  tareasPasante = [],
}: BuildAcademicAssistantContextParams) {
  const today = new Date().toISOString().slice(0, 10);
  const pendingLogs = bitacoras.filter((item) => {
    const status = cleanText(item.estado || 'Pendiente');
    return !['Aprobada', 'Rechazada', 'Correccion'].includes(status);
  }).length;
  const activeProjects = proyectos.filter((project) =>
    project.activo !== false && !['Inactivo', 'Inactiva'].includes(cleanText(project.estado))
  ).length;

  return [
    `Contexto real Biomind para ${roleLabel}. Fecha de contexto: ${today}.`,
    `Usuario: ${session.name} (${session.role}), correo ${session.email || 'sin correo'}.`,
    `Regla: responde solo con los datos reales listados aqui. Si el dato no aparece, dilo y pide revisar la seccion correspondiente de la app.`,
    `Puede ayudar con preguntas tecnicas, respuestas sobre proyectos, resumenes por ficha, aprendices y pasantes, e informes academicos en formato claro.`,
    '',
    'Totales visibles:',
    `- Fichas: ${fichas.length}`,
    `- Proyectos activos/visibles: ${activeProjects}/${proyectos.length}`,
    `- Aprendices: ${aprendices.length} visibles; ${pendingLogs} bitacoras pendientes.`,
    `- Pasantes: ${pasantes.length}`,
    `- Tareas de pasantes: ${tareasPasante.length} (${taskStatusCount(tareasPasante)}).`,
    '',
    'Fichas visibles:',
    buildSheetSummaries({ asignaciones, bitacoras, competencias, fichas, proyectos, resultados }),
    '',
    'Proyectos visibles:',
    buildProjectSummaries({ bitacoras, grupos, proyectos }),
    '',
    'Aprendices visibles:',
    buildLearnerSummaries(aprendices, bitacoras),
    '',
    roleLabel === 'instructor' ? 'Pasantes visibles:' : 'Instructores visibles:',
    roleLabel === 'instructor'
      ? buildPasanteSummaries(pasantes, tareasPasante)
      : listLines(instructores, (instructor) => `- ${cleanText(instructor.nombre || instructor.correo || instructor.id)} | correo ${cleanText(instructor.correo) || 'sin correo'}`, 8),
    '',
    'Tareas de pasantes:',
    buildTaskSummaries(tareasPasante),
    '',
    'Bitacoras recientes:',
    buildRecentBitacoraSummaries(bitacoras),
    '',
    'Formato recomendado para informes: titulo, alcance, resumen ejecutivo, datos usados, hallazgos, riesgos, acciones recomendadas y pendientes.',
    'Nunca inventes conteos, nombres, fichas, observaciones ni estados. Si el usuario pide un informe mas detallado, usa estos datos y aclara el alcance visible.',
  ].join('\n');
}
