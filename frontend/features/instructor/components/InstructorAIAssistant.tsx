import { GeminiAssistantModule } from '@/features/workspace/components/GeminiAssistantModule';
import type {
  AuthenticatedSession,
  WorkspaceAssistantPrompt,
  WorkspaceChatChannel,
} from '@/features/workspace/types';
import {
  buildAcademicAssistantContext,
  buildWorkspaceAssistantProjects,
} from '@/features/workspace/utils/academicAssistantContext';
// @ts-ignore
import { escucharContextoAcademicoUsuario, escucharGruposTrabajo, escucharProyectos } from '@/services/academic';
// @ts-ignore
import { escucharBitacoras } from '@/services/bitacoras';
// @ts-ignore
import { escucharTareasPasantePorInstructor } from '@/services/pasanteTasks';
import { useEffect, useMemo, useState } from 'react';
import { Text } from 'react-native';
import { assistantPrompts } from '../data';

type RecordItem = {
  id: string;
  [key: string]: any;
};

const instructorRealPrompts: WorkspaceAssistantPrompt[] = [
  {
    id: 'informe-ficha',
    title: 'Informe por ficha',
    detail: 'Genera un informe por ficha con proyectos, bitacoras pendientes, avance general, riesgos y acciones recomendadas.',
    icon: 'file-chart-outline',
  },
  {
    id: 'resumen-aprendices',
    title: 'Resumen aprendices',
    detail: 'Resume el estado de los aprendices visibles, sus bitacoras, pendientes y alertas principales.',
    icon: 'account-school-outline',
  },
  {
    id: 'resumen-pasantes',
    title: 'Resumen pasantes',
    detail: 'Resume las tareas de cada pasante, que falta por validar y que seguimiento conviene hacer.',
    icon: 'account-tie-outline',
  },
  {
    id: 'respuesta-tecnica',
    title: 'Responder duda',
    detail: 'Ayudame a responder una pregunta tecnica de un aprendiz sobre un proyecto, usando lenguaje claro y academico.',
    icon: 'message-question-outline',
  },
];

type Props = {
  chatChannel?: WorkspaceChatChannel;
  session: AuthenticatedSession;
  voiceEnabled?: boolean;
};

export function InstructorAIAssistant({ chatChannel = 'ai', session, voiceEnabled = true }: Props) {
  const [fichas, setFichas] = useState<RecordItem[]>([]);
  const [aprendices, setAprendices] = useState<RecordItem[]>([]);
  const [pasantes, setPasantes] = useState<RecordItem[]>([]);
  const [competencias, setCompetencias] = useState<RecordItem[]>([]);
  const [resultados, setResultados] = useState<RecordItem[]>([]);
  const [asignaciones, setAsignaciones] = useState<RecordItem[]>([]);
  const [proyectos, setProyectos] = useState<RecordItem[]>([]);
  const [grupos, setGrupos] = useState<RecordItem[]>([]);
  const [bitacoras, setBitacoras] = useState<RecordItem[]>([]);
  const [tareasPasante, setTareasPasante] = useState<RecordItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleError = (nextError: any) =>
      setError(nextError?.message || 'No pudimos cargar el contexto real para la IA.');

    const unsubscribeContext = escucharContextoAcademicoUsuario(
      session,
      (context: any) => {
        setFichas(context.fichas || []);
        setAprendices(context.aprendices || []);
        setPasantes(context.pasantes || []);
        setCompetencias(context.competencias || []);
        setResultados(context.resultados || []);
        setAsignaciones(context.asignaciones || []);
      },
      handleError
    );
    const unsubscribeProjects = escucharProyectos(
      (items: RecordItem[]) => setProyectos(items.filter((project) => project.instructorUid === session.uid)),
      handleError
    );
    const unsubscribeGroups = escucharGruposTrabajo(
      (items: RecordItem[]) => setGrupos(items.filter((group) => group.instructorUid === session.uid && group.estado !== 'Inactivo')),
      handleError
    );
    const unsubscribeBitacoras = escucharBitacoras(setBitacoras, handleError);
    const unsubscribeTasks = escucharTareasPasantePorInstructor(session.uid, setTareasPasante, handleError);

    return () => {
      unsubscribeContext?.();
      unsubscribeProjects?.();
      unsubscribeGroups?.();
      unsubscribeBitacoras?.();
      unsubscribeTasks?.();
    };
  }, [session]);

  const visibleProjectIds = useMemo(
    () => new Set(proyectos.map((project) => String(project.id)).filter(Boolean)),
    [proyectos]
  );
  const visibleSheetKeys = useMemo(
    () => new Set(fichas.flatMap((sheet) => [sheet.id, sheet.numero]).filter(Boolean).map(String)),
    [fichas]
  );
  const visibleBitacoras = useMemo(
    () => bitacoras.filter((bitacora) =>
      visibleProjectIds.has(String(bitacora.proyectoId || ''))
      || visibleSheetKeys.has(String(bitacora.fichaId || ''))
      || visibleSheetKeys.has(String(bitacora.fichaNumero || ''))
    ),
    [bitacoras, visibleProjectIds, visibleSheetKeys]
  );
  const activeProjects = useMemo(
    () => proyectos.filter((project) => project.activo !== false && project.estado !== 'Inactivo'),
    [proyectos]
  );
  const assistantProjects = useMemo(
    () => buildWorkspaceAssistantProjects(activeProjects, 'Resumen general del instructor'),
    [activeProjects]
  );
  const systemContext = useMemo(
    () => [
      'Eres BIOMIND IA para instructores de biotecnologia vegetal.',
      'Ayudas a responder dudas tecnicas, revisar proyectos, resumir fichas, analizar aprendices y pasantes, y generar informes academicos con informacion real de la app.',
      buildAcademicAssistantContext({
        asignaciones,
        aprendices,
        bitacoras: visibleBitacoras,
        competencias,
        fichas,
        grupos,
        instructores: [],
        pasantes,
        proyectos: activeProjects,
        resultados,
        roleLabel: 'instructor',
        session,
        tareasPasante,
      }),
    ].join('\n\n'),
    [
      activeProjects,
      aprendices,
      asignaciones,
      competencias,
      fichas,
      grupos,
      pasantes,
      resultados,
      session,
      tareasPasante,
      visibleBitacoras,
    ]
  );

  return (
    <>
      {error ? <Text>{error}</Text> : null}
      <GeminiAssistantModule
        composerPlaceholder="Pregunta por una ficha, aprendiz, pasante, proyecto, duda tecnica o pide un informe..."
        emptyStateLabel="Contexto academico real"
        projects={assistantProjects}
        prompts={[...instructorRealPrompts, ...assistantPrompts]}
        roleLabel="Instructor IA"
        session={session}
        subtitle="Consulta datos reales de tus fichas, proyectos, bitacoras y pasantes. Tambien puede redactar informes y respuestas tecnicas."
        systemContext={systemContext}
        title="Asistente IA del instructor"
        voiceEnabled={voiceEnabled}
        chatChannel={chatChannel}
        welcomeMessage="Hola. Soy BIOMIND IA para instructores. Puedo resumir fichas, revisar aprendices y pasantes, responder dudas tecnicas y ayudarte a generar informes con la informacion real visible para tu rol."
      />
    </>
  );
}
