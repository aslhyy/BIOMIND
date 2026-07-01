import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';

const TASKS_COLLECTION = 'tareasPasante';

function now() {
  return new Date();
}

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

function sortByCreation(items) {
  return [...items].sort((a, b) => getMillis(b.creadoEn) - getMillis(a.creadoEn));
}

export function escucharTareasPasantePorInstructor(instructorUid, onData, onError) {
  if (!instructorUid) {
    onData([]);
    return () => {};
  }

  return onSnapshot(
    query(
      collection(db, TASKS_COLLECTION),
      where('instructorUid', '==', instructorUid)
    ),
    (snapshot) => onData(sortByCreation(mapSnapshot(snapshot))),
    onError
  );
}

export function escucharTareasPasanteAsignadas(pasanteUid, onData, onError) {
  if (!pasanteUid) {
    onData([]);
    return () => {};
  }

  return onSnapshot(
    query(
      collection(db, TASKS_COLLECTION),
      where('pasanteUid', '==', pasanteUid)
    ),
    (snapshot) => onData(sortByCreation(mapSnapshot(snapshot))),
    onError
  );
}

export async function guardarTareaPasante(task) {
  const titulo = cleanText(task.titulo);
  const descripcion = cleanText(task.descripcion);
  const pasanteUid = cleanText(task.pasanteUid);
  const instructorUid = cleanText(task.instructorUid);

  if (!titulo || !pasanteUid || !instructorUid) {
    throw new Error('Selecciona un pasante y escribe el título de la tarea.');
  }

  const payload = {
    titulo,
    descripcion,
    fichaId: cleanText(task.fichaId),
    fichaNumero: cleanText(task.fichaNumero),
    proyectoId: cleanText(task.proyectoId),
    proyectoTitulo: cleanText(task.proyectoTitulo),
    pasanteUid,
    pasanteNombre: cleanText(task.pasanteNombre),
    instructorUid,
    instructorNombre: cleanText(task.instructorNombre),
    observacionInstructor: cleanText(task.observacionInstructor),
    observacionPasante: cleanText(task.observacionPasante),
    actualizadoEn: now(),
  };

  if (task.id) {
    await updateDoc(doc(db, TASKS_COLLECTION, task.id), payload);
    return;
  }

  await addDoc(collection(db, TASKS_COLLECTION), {
    ...payload,
    estado: 'Pendiente',
    validadaPorInstructor: false,
    creadoEn: now(),
  });
}

export async function actualizarTareaPasante(id, updates) {
  if (!id) {
    throw new Error('Selecciona una tarea válida.');
  }

  await updateDoc(doc(db, TASKS_COLLECTION, id), {
    ...updates,
    actualizadoEn: now(),
  });
}

export async function marcarTareaPasanteHecha(id, observacionPasante = '') {
  await actualizarTareaPasante(id, {
    estado: 'Hecho',
    validadaPorInstructor: false,
    observacionPasante: cleanText(observacionPasante),
  });
}

export async function marcarTareaPasantePendiente(id, observacionPasante = '') {
  await actualizarTareaPasante(id, {
    estado: 'Pendiente',
    validadaPorInstructor: false,
    observacionPasante: cleanText(observacionPasante),
  });
}

export async function validarTareaPasante(id) {
  await actualizarTareaPasante(id, {
    estado: 'Validada',
    validadaPorInstructor: true,
  });
}

export async function eliminarTareaPasante(id) {
  if (!id) {
    throw new Error('Selecciona una tarea válida.');
  }

  await deleteDoc(doc(db, TASKS_COLLECTION, id));
}
