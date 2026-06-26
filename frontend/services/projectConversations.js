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

export function escucharResumenConversaciones(onData, onError) {
  return onSnapshot(
    collection(db, CONVERSATIONS_COLLECTION),
    (snapshot) => onData(mapSnapshot(snapshot)),
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
  const messagePayload = {
    proyectoId: project.id,
    proyectoTitulo: cleanText(project.titulo) || 'Proyecto',
    fichaId: cleanText(project.fichaId),
    fichaNumero: cleanText(project.fichaNumero),
    remitenteUid: session.uid,
    remitenteNombre: session.name,
    remitenteRol: session.role,
    texto: message,
    creadoEn: serverTimestamp(),
  };

  await setDoc(
    conversationRef,
    {
      proyectoId: project.id,
      proyectoTitulo: messagePayload.proyectoTitulo,
      fichaId: messagePayload.fichaId,
      fichaNumero: messagePayload.fichaNumero,
      instructorUid: cleanText(project.instructorUid),
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
