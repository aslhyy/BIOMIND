import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from './firebase';

const PROGRAMAS_COLLECTION = 'programas';
const FICHAS_COLLECTION = 'fichas';
const TRIMESTRES_COLLECTION = 'trimestres';

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

export function calcularTrimestreActual(trimestres, referenceDate = new Date()) {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  const current = trimestres
    .filter((trimester) => trimester.estado !== 'Inactivo')
    .find((trimester) => {
      const start = new Date(`${trimester.fechaInicio}T00:00:00`);
      const end = new Date(`${trimester.fechaFin}T23:59:59`);
      return start <= today && today <= end;
    });

  return current || null;
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

  // Validación: número único por programa
  if (numero && programaId) {
    const existingQuery = query(
      collection(db, FICHAS_COLLECTION),
      where('numero', '==', numero),
      where('programaId', '==', programaId)
    );
    const existing = await getDocs(existingQuery);
    const conflict = existing.docs.find((d) => d.id !== ficha.id);
    if (conflict) {
      throw new Error('Ya existe una ficha con ese número en el programa.');
    }
  }

  const payload = {
    numero,
    programaId,
    programaNombre,
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
    estado: 'Inactivo',
    actualizadoEn: now(),
  });
}

// Asignaciones: instructores <-> fichas
export async function assignInstructorToFicha(instructorUid, fichaId) {
  if (!instructorUid || !fichaId) {
    throw new Error('Instructor y ficha son requeridos.');
  }

  // Añade el instructor al arreglo `instructorUids` de la ficha
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

// Asignaciones: pasantes <-> fichas
export async function assignPasanteToFicha(pasanteUid, fichaId) {
  if (!pasanteUid || !fichaId) {
    throw new Error('Pasante y ficha son requeridos.');
  }

  // Actualiza la lista de fichas asignadas en el usuario
  await updateDoc(doc(db, 'usuarios', pasanteUid), {
    fichasAsignadas: arrayUnion(fichaId),
    actualizadoEn: now(),
  });

  // Actualiza la lista de pasantes en la ficha
  await updateDoc(doc(db, FICHAS_COLLECTION, fichaId), {
    pasantesUids: arrayUnion(pasanteUid),
    actualizadoEn: now(),
  });
}

export async function removePasanteFromFicha(pasanteUid, fichaId) {
  if (!pasanteUid || !fichaId) {
    throw new Error('Pasante y ficha son requeridos.');
  }

  await updateDoc(doc(db, 'usuarios', pasanteUid), {
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

// Asigna un pasante a un instructor y hereda las fichas del instructor al pasante
export async function assignPasanteToInstructor(instructorUid, pasanteUid) {
  if (!instructorUid || !pasanteUid) {
    throw new Error('Instructor y pasante son requeridos.');
  }

  // Primero obtener fichas del instructor
  const fichasQuery = query(collection(db, FICHAS_COLLECTION), where('instructorUids', 'array-contains', instructorUid));
  const snapshot = await getDocs(fichasQuery);
  const fichaIds = snapshot.docs.map((d) => d.id);

  // Actualiza el usuario pasante con instructorUid y las fichas heredadas
  const pasanteRef = doc(db, 'usuarios', pasanteUid);
  const updates = { instructorUid, actualizadoEn: now() };

  if (fichaIds.length) {
    // añadir todas las fichas al arreglo fichasAsignadas
    updates.fichasAsignadas = arrayUnion(...fichaIds);
  }

  await updateDoc(pasanteRef, updates);

  // Añadir pasante al listado de pasantes del instructor (si existe documento instructor)
  try {
    await updateDoc(doc(db, 'usuarios', instructorUid), {
      pasantesUids: arrayUnion(pasanteUid),
      actualizadoEn: now(),
    });
  } catch (err) {
    // Si falla (por ejemplo no existe el doc del instructor), no interrumpe
  }

  // Actualizar cada ficha para incluir al pasante en pasantesUids
  for (const fichaId of fichaIds) {
    await updateDoc(doc(db, FICHAS_COLLECTION, fichaId), {
      pasantesUids: arrayUnion(pasanteUid),
      actualizadoEn: now(),
    });
  }
}
