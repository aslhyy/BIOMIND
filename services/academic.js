import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';

const PROGRAMAS_COLLECTION = 'programas';
const FICHAS_COLLECTION = 'fichas';
const TRIMESTRES_COLLECTION = 'trimestres';
const USUARIOS_COLLECTION = 'usuarios';

function now() {
  return new Date();
}

function cleanText(value) {
  return String(value || '').trim();
}

function normalizeDate(value) {
  const normalized = cleanText(value);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error('Usa fechas en formato AAAA-MM-DD.');
  }

  return normalized;
}

function mapSnapshot(snapshot) {
  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

function isActive(record) {
  return record.activo !== false && record.estado !== 'Inactivo' && record.estado !== 'Inactiva';
}

export function calcularTrimestreActual(trimestres, referenceDate = new Date()) {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  return trimestres
    .filter(isActive)
    .find((trimester) => {
      const start = new Date(`${trimester.fechaInicio}T00:00:00`);
      const end = new Date(`${trimester.fechaFin}T23:59:59`);
      return start <= today && today <= end;
    }) || null;
}

export function escucharProgramas(onData, onError) {
  return onSnapshot(
    query(collection(db, PROGRAMAS_COLLECTION), orderBy('creadoEn', 'desc')),
    (snapshot) => onData(mapSnapshot(snapshot)),
    onError
  );
}

export function escucharFichas(onData, onError) {
  return onSnapshot(
    query(collection(db, FICHAS_COLLECTION), orderBy('creadoEn', 'desc')),
    (snapshot) => onData(mapSnapshot(snapshot)),
    onError
  );
}

export function escucharTrimestres(onData, onError) {
  return onSnapshot(
    query(collection(db, TRIMESTRES_COLLECTION), orderBy('fechaInicio', 'desc')),
    (snapshot) => onData(mapSnapshot(snapshot)),
    onError
  );
}

export async function obtenerProgramas() {
  const snapshot = await getDocs(query(collection(db, PROGRAMAS_COLLECTION), orderBy('nombre', 'asc')));
  return mapSnapshot(snapshot).filter(isActive);
}

export async function obtenerFichasPorPrograma(programaId) {
  if (!programaId) {
    return [];
  }

  const snapshot = await getDocs(
    query(collection(db, FICHAS_COLLECTION), where('programaId', '==', programaId))
  );

  return mapSnapshot(snapshot).filter(isActive);
}

export async function crearDatosAcademicosIniciales() {
  await setDoc(doc(db, PROGRAMAS_COLLECTION, 'ADSO'), {
    codigo: 'ADSO',
    nombre: 'Analisis y Desarrollo de Software',
    cantidadTrimestres: 4,
    activo: true,
    estado: 'Activo',
    creadoEn: now(),
    actualizadoEn: now(),
  }, { merge: true });

  await setDoc(doc(db, FICHAS_COLLECTION, '3203082'), {
    numero: '3203082',
    programaId: 'ADSO',
    programaNombre: 'Analisis y Desarrollo de Software',
    trimestreActual: 'IV trimestre',
    activo: true,
    estado: 'Activa',
    creadoEn: now(),
    actualizadoEn: now(),
  }, { merge: true });
}

export async function guardarPrograma(programa) {
  const nombre = cleanText(programa.nombre);
  const codigo = cleanText(programa.codigo).toUpperCase();
  const cantidadTrimestres = programa.cantidadTrimestres ? Number(programa.cantidadTrimestres) : undefined;

  if (!nombre || !codigo) {
    throw new Error('Completa nombre y codigo del programa.');
  }

  const payload = {
    nombre,
    codigo,
    ...(typeof cantidadTrimestres === 'number' ? { cantidadTrimestres } : {}),
    activo: programa.activo ?? true,
    estado: programa.estado || 'Activo',
    actualizadoEn: now(),
  };

  if (programa.id) {
    await updateDoc(doc(db, PROGRAMAS_COLLECTION, programa.id), payload);
    return;
  }

  await addDoc(collection(db, PROGRAMAS_COLLECTION), {
    ...payload,
    creadoEn: now(),
  });
}

export async function desactivarPrograma(id) {
  await updateDoc(doc(db, PROGRAMAS_COLLECTION, id), {
    activo: false,
    estado: 'Inactivo',
    actualizadoEn: now(),
  });
}

export async function guardarFicha(ficha) {
  const numero = cleanText(ficha.numero);
  const programaId = cleanText(ficha.programaId);
  const programaNombre = cleanText(ficha.programaNombre);

  if (!numero || !programaId) {
    throw new Error('Completa numero de ficha y programa.');
  }

  const existingQuery = query(
    collection(db, FICHAS_COLLECTION),
    where('numero', '==', numero),
    where('programaId', '==', programaId)
  );
  const existing = await getDocs(existingQuery);
  const conflict = existing.docs.find((item) => item.id !== ficha.id);

  if (conflict) {
    throw new Error('Ya existe una ficha con ese numero en el programa.');
  }

  const payload = {
    numero,
    programaId,
    programaNombre,
    activo: ficha.activo ?? true,
    estado: ficha.estado || 'Activa',
    actualizadoEn: now(),
  };

  if (ficha.id) {
    await updateDoc(doc(db, FICHAS_COLLECTION, ficha.id), payload);
    return;
  }

  await addDoc(collection(db, FICHAS_COLLECTION), {
    ...payload,
    creadoEn: now(),
  });
}

export async function desactivarFicha(id) {
  await updateDoc(doc(db, FICHAS_COLLECTION, id), {
    activo: false,
    estado: 'Inactiva',
    actualizadoEn: now(),
  });
}

export async function guardarTrimestre(trimestre) {
  const numero = Number(trimestre.numero);
  const programaId = cleanText(trimestre.programaId);
  const programaNombre = cleanText(trimestre.programaNombre);
  const fichaId = cleanText(trimestre.fichaId);
  const fichaNumero = cleanText(trimestre.fichaNumero);
  const fechaInicio = normalizeDate(trimestre.fechaInicio);
  const fechaFin = normalizeDate(trimestre.fechaFin);

  if (!numero || numero < 1 || !programaId || !fichaId) {
    throw new Error('Completa numero, programa y ficha del trimestre.');
  }

  if (new Date(`${fechaInicio}T00:00:00`) > new Date(`${fechaFin}T00:00:00`)) {
    throw new Error('La fecha de inicio no puede ser posterior a la fecha fin.');
  }

  const payload = {
    numero,
    fechaInicio,
    fechaFin,
    programaId,
    programaNombre,
    fichaId,
    fichaNumero,
    activo: trimestre.activo ?? true,
    estado: trimestre.estado || 'Activo',
    actualizadoEn: now(),
  };

  if (trimestre.id) {
    await updateDoc(doc(db, TRIMESTRES_COLLECTION, trimestre.id), payload);
    return;
  }

  await addDoc(collection(db, TRIMESTRES_COLLECTION), {
    ...payload,
    creadoEn: now(),
  });
}

export async function desactivarTrimestre(id) {
  await updateDoc(doc(db, TRIMESTRES_COLLECTION, id), {
    activo: false,
    estado: 'Inactivo',
    actualizadoEn: now(),
  });
}

export async function asignarAprendizAFicha({ aprendiz, ficha }) {
  if (!aprendiz?.id) {
    throw new Error('Selecciona un aprendiz valido.');
  }

  if (!ficha?.id) {
    throw new Error('Selecciona una ficha valida.');
  }

  if (aprendiz.fichaId) {
    throw new Error('Este aprendiz ya tiene una ficha asignada.');
  }

  if (!aprendiz.programaId) {
    throw new Error('El aprendiz no tiene programa seleccionado.');
  }

  if (ficha.programaId !== aprendiz.programaId) {
    throw new Error('La ficha no pertenece al programa seleccionado por el aprendiz.');
  }

  await updateDoc(doc(db, USUARIOS_COLLECTION, aprendiz.id), {
    fichaId: ficha.id,
    ficha: ficha.numero || ficha.id,
    trimestreActual: ficha.trimestreActual || null,
    actualizadoEn: now(),
  });
}

export async function assignInstructorToFicha(instructorUid, fichaId) {
  if (!instructorUid || !fichaId) {
    throw new Error('Instructor y ficha son requeridos.');
  }

  await updateDoc(doc(db, FICHAS_COLLECTION, fichaId), {
    instructorUids: arrayUnion(instructorUid),
    actualizadoEn: now(),
  });
}

export async function removeInstructorFromFicha(instructorUid, fichaId) {
  if (!instructorUid || !fichaId) {
    throw new Error('Instructor y ficha son requeridos.');
  }

  await updateDoc(doc(db, FICHAS_COLLECTION, fichaId), {
    instructorUids: arrayRemove(instructorUid),
    actualizadoEn: now(),
  });
}

export function subscribeInstructorFichas(instructorUid, onData, onError) {
  if (!instructorUid) {
    throw new Error('InstructorUid es requerido para suscribirse a fichas.');
  }

  return onSnapshot(
    query(collection(db, FICHAS_COLLECTION), where('instructorUids', 'array-contains', instructorUid), orderBy('creadoEn', 'desc')),
    (snapshot) => onData(mapSnapshot(snapshot)),
    onError
  );
}

export async function assignPasanteToFicha(pasanteUid, fichaId) {
  if (!pasanteUid || !fichaId) {
    throw new Error('Pasante y ficha son requeridos.');
  }

  await updateDoc(doc(db, USUARIOS_COLLECTION, pasanteUid), {
    fichasAsignadas: arrayUnion(fichaId),
    actualizadoEn: now(),
  });

  await updateDoc(doc(db, FICHAS_COLLECTION, fichaId), {
    pasantesUids: arrayUnion(pasanteUid),
    actualizadoEn: now(),
  });
}

export async function removePasanteFromFicha(pasanteUid, fichaId) {
  if (!pasanteUid || !fichaId) {
    throw new Error('Pasante y ficha son requeridos.');
  }

  await updateDoc(doc(db, USUARIOS_COLLECTION, pasanteUid), {
    fichasAsignadas: arrayRemove(fichaId),
    actualizadoEn: now(),
  });

  await updateDoc(doc(db, FICHAS_COLLECTION, fichaId), {
    pasantesUids: arrayRemove(pasanteUid),
    actualizadoEn: now(),
  });
}

export function subscribePasanteFichas(pasanteUid, onData, onError) {
  if (!pasanteUid) {
    throw new Error('PasanteUid es requerido para suscribirse a fichas.');
  }

  return onSnapshot(
    query(collection(db, FICHAS_COLLECTION), where('pasantesUids', 'array-contains', pasanteUid), orderBy('creadoEn', 'desc')),
    (snapshot) => onData(mapSnapshot(snapshot)),
    onError
  );
}

export async function assignPasanteToInstructor(instructorUid, pasanteUid) {
  if (!instructorUid || !pasanteUid) {
    throw new Error('Instructor y pasante son requeridos.');
  }

  const fichasQuery = query(collection(db, FICHAS_COLLECTION), where('instructorUids', 'array-contains', instructorUid));
  const snapshot = await getDocs(fichasQuery);
  const fichaIds = snapshot.docs.map((item) => item.id);
  const updates = { instructorUid, actualizadoEn: now() };

  if (fichaIds.length) {
    updates.fichasAsignadas = arrayUnion(...fichaIds);
  }

  await updateDoc(doc(db, USUARIOS_COLLECTION, pasanteUid), updates);
  await updateDoc(doc(db, USUARIOS_COLLECTION, instructorUid), {
    pasantesUids: arrayUnion(pasanteUid),
    actualizadoEn: now(),
  });

  for (const fichaId of fichaIds) {
    await updateDoc(doc(db, FICHAS_COLLECTION, fichaId), {
      pasantesUids: arrayUnion(pasanteUid),
      actualizadoEn: now(),
    });
  }
}
