import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';

const CONVERSATIONS_COLLECTION = 'conversacionesProyecto';

function cleanText(value) {
  return String(value || '').trim();
}

function mapSnapshot(snapshot) {
  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

function getMillis(value) {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  return 0;
}

export function escucharResumenConversaciones(onData, onError) {
  return onSnapshot(
    collection(db, CONVERSATIONS_COLLECTION),
    (snapshot) => onData(
      mapSnapshot(snapshot).sort((a, b) => getMillis(b.actualizadoEn) - getMillis(a.actualizadoEn))
    ),
    onError
  );
}

export function escucharMensajesProyecto(projectId, onData, onError) {
  if (!projectId) {
    onData([]);
    return () => {};
  }

  return onSnapshot(
    query(
      collection(db, CONVERSATIONS_COLLECTION, projectId, 'mensajes'),
      orderBy('creadoEn', 'asc')
    ),
    (snapshot) => onData(mapSnapshot(snapshot)),
    onError
  );
}

export async function enviarMensajeProyecto({ project, session, text }) {
  const message = cleanText(text);

  if (!project?.id) {
    throw new Error('Selecciona un proyecto para enviar el mensaje.');
  }

  if (!message) {
    throw new Error('Escribe un mensaje antes de enviarlo.');
  }

  const conversationRef = doc(db, CONVERSATIONS_COLLECTION, project.id);
  const selectedProjectId = cleanText(project.proyectoId) || project.id;
  const selectedProjectTitle = cleanText(project.proyectoTitulo) || cleanText(project.titulo) || 'Proyecto';
  const messagePayload = {
    conversacionId: project.id,
    proyectoId: selectedProjectId,
    proyectoTitulo: selectedProjectTitle,
    fichaId: cleanText(project.fichaId),
    fichaNumero: cleanText(project.fichaNumero),
    grupoId: cleanText(project.grupoId),
    participanteUids: Array.isArray(project.participanteUids) ? project.participanteUids.filter(Boolean) : [],
    destinatarioUid: cleanText(project.targetUid),
    remitenteUid: session.uid,
    remitenteFichaId: cleanText(session.fichaId),
    remitenteFichaNumero: cleanText(session.ficha),
    remitenteNombre: session.name,
    remitenteRol: session.role,
    texto: message,
    creadoEn: serverTimestamp(),
  };

  await setDoc(
    conversationRef,
    {
      conversacionId: project.id,
      proyectoId: selectedProjectId,
      proyectoTitulo: messagePayload.proyectoTitulo,
      fichaId: messagePayload.fichaId,
      fichaNumero: messagePayload.fichaNumero,
      grupoId: messagePayload.grupoId,
      participanteUids: messagePayload.participanteUids,
      instructorUid: cleanText(project.instructorUid),
      destinatarioUid: messagePayload.destinatarioUid,
      ultimoMensaje: message,
      ultimoRemitenteUid: session.uid,
      ultimoRemitenteNombre: session.name,
      ultimoRemitenteRol: session.role,
      actualizadoEn: serverTimestamp(),
      creadoEn: serverTimestamp(),
    },
    { merge: true }
  );

  await addDoc(
    collection(db, CONVERSATIONS_COLLECTION, project.id, 'mensajes'),
    messagePayload
  );
}
