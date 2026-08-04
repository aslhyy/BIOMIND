import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';

const PROGRAMAS_COLLECTION = 'programas';
const FICHAS_COLLECTION = 'fichas';
const TRIMESTRES_COLLECTION = 'trimestres';
const USUARIOS_COLLECTION = 'usuarios';
const COMPETENCIAS_COLLECTION = 'competencias';
const RESULTADOS_COLLECTION = 'resultadosAprendizaje';
const ASIGNACIONES_COMPETENCIAS_COLLECTION = 'asignacionesCompetencias';
const PROYECTOS_COLLECTION = 'proyectos';
const GRUPOS_COLLECTION = 'gruposTrabajo';
const PROJECT_FILES_BUCKET = process.env.EXPO_PUBLIC_PROJECT_FILES_BUCKET || 'biomind-project-files';

function now() {
  return new Date();
}

function cleanText(value) {
  return String(value || '').trim();
}

function isPublicFileUri(uri) {
  return /^https:\/\//i.test(uri) || /^data:/i.test(uri);
}

function getExternalFilesStorageConfig() {
  const supabaseUrl = cleanText(process.env.EXPO_PUBLIC_SUPABASE_URL).replace(/\/+$/g, '');
  const supabaseAnonKey = cleanText(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Falta configurar el almacenamiento externo de archivos. Agrega EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY para subir archivos sin usar Firebase Storage.'
    );
  }

  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl)) {
    throw new Error('La URL de Supabase configurada no es valida. Revisa EXPO_PUBLIC_SUPABASE_URL en frontend/.env.');
  }

  return { supabaseAnonKey, supabaseUrl };
}

function safeFileName(name, fallback = 'archivo') {
  const normalized = cleanText(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || fallback;
}

async function uploadProjectAttachment(archivo, projectId, index) {
  const nombre = cleanText(archivo.nombre) || `Archivo ${index + 1}`;
  const uri = cleanText(archivo.uri || archivo.url);
  const mimeType = cleanText(archivo.mimeType) || 'application/octet-stream';
  const ruta = cleanText(archivo.ruta);

  if (!uri) {
    return null;
  }

  if (isPublicFileUri(uri)) {
    return {
      nombre,
      uri,
      url: uri,
      mimeType,
      ruta: ruta || null,
    };
  }

  const { supabaseAnonKey, supabaseUrl } = getExternalFilesStorageConfig();
  const blob = await readLocalFileAsBlob(uri, nombre);
  const path = `proyectos/${projectId}/${Date.now()}-${index}-${safeFileName(nombre)}`;
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${PROJECT_FILES_BUCKET}/${path}`;
  let uploadResponse;

  try {
    uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': mimeType,
      },
      body: blob,
    });
  } catch {
    throw new Error('No pudimos subir el archivo porque la URL de Supabase configurada no responde. Revisa EXPO_PUBLIC_SUPABASE_URL en frontend/.env.');
  }

  if (!uploadResponse.ok) {
    let detail = '';

    try {
      const responseBody = await uploadResponse.json();
      detail = responseBody.message || responseBody.error || '';
    } catch {
      detail = await uploadResponse.text();
    }

    throw new Error(
      `No pudimos subir el archivo al almacenamiento externo (${uploadResponse.status}). ${detail || 'Revisa el bucket y las políticas de Supabase.'}`
    );
  }

  const downloadUrl = `${supabaseUrl}/storage/v1/object/public/${PROJECT_FILES_BUCKET}/${path}`;

  return {
    nombre,
    uri: downloadUrl,
    url: downloadUrl,
    mimeType,
    ruta: path,
  };
}

function readLocalFileAsBlob(uri, nombre) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.onload = () => {
      resolve(request.response);
    };
    request.onerror = () => {
      reject(new Error(`No pudimos leer el archivo ${nombre}. Intenta seleccionarlo nuevamente.`));
    };
    request.responseType = 'blob';
    request.open('GET', uri, true);
    request.send(null);
  });
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

function getMillis(value) {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  return 0;
}

function sortByCreated(items) {
  return [...items].sort((a, b) => getMillis(b.creadoEn) - getMillis(a.creadoEn));
}

function isActive(record) {
  return record.activo !== false && record.estado !== 'Inactivo' && record.estado !== 'Inactiva';
}

function getAssignedSheetValues(session) {
  return [
    session.ficha,
    session.fichaId,
    ...(Array.isArray(session.fichasAsignadas) ? session.fichasAsignadas : []),
  ]
    .map((value) => cleanText(value))
    .filter(Boolean);
}

function sessionMatchesSheet(session, ficha) {
  const assignedValues = new Set(getAssignedSheetValues(session));
  const sheetValues = [ficha.id, ficha.numero].map((value) => cleanText(value)).filter(Boolean);

  return sheetValues.some((value) => assignedValues.has(value));
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

export function escucharCompetencias(onData, onError) {
  return onSnapshot(
    query(collection(db, COMPETENCIAS_COLLECTION), orderBy('creadoEn', 'desc')),
    (snapshot) => onData(mapSnapshot(snapshot)),
    onError
  );
}

export function escucharResultadosAprendizaje(onData, onError) {
  return onSnapshot(
    query(collection(db, RESULTADOS_COLLECTION), orderBy('creadoEn', 'desc')),
    (snapshot) => onData(mapSnapshot(snapshot)),
    onError
  );
}

export function escucharAsignacionesCompetencias(onData, onError) {
  return onSnapshot(
    query(collection(db, ASIGNACIONES_COMPETENCIAS_COLLECTION), orderBy('creadoEn', 'desc')),
    (snapshot) => onData(mapSnapshot(snapshot)),
    onError
  );
}

export function escucharProyectos(onData, onError) {
  return onSnapshot(
    query(collection(db, PROYECTOS_COLLECTION), orderBy('creadoEn', 'desc')),
    (snapshot) => onData(mapSnapshot(snapshot)),
    onError
  );
}

export function escucharGruposTrabajo(onData, onError) {
  return onSnapshot(
    query(collection(db, GRUPOS_COLLECTION), orderBy('creadoEn', 'desc')),
    (snapshot) => onData(mapSnapshot(snapshot)),
    onError
  );
}

export function escucharContextoAcademicoUsuario(session, onData, onError) {
  const state = {
    fichas: [],
    usuarios: [],
    competencias: [],
    resultados: [],
    asignaciones: [],
  };

  const emit = () => {
    const role = cleanText(session.role).toLowerCase();
    const liveUser = state.usuarios.find((user) => user.id === session.uid);
    const effectiveSession = liveUser
      ? {
        ...session,
        ficha: liveUser.ficha,
        fichaId: liveUser.fichaId,
        fichasAsignadas: liveUser.fichasAsignadas,
        instructorUid: liveUser.instructorUid,
      }
      : session;

    const fichas = state.fichas.filter((ficha) => {
      if (role === 'aprendiz') {
        return sessionMatchesSheet(effectiveSession, ficha);
      }

      if (role === 'instructor') {
        return sessionMatchesSheet(effectiveSession, ficha) || (ficha.instructorUids || []).includes(session?.uid);
      }

      if (role === 'pasante') {
        return sessionMatchesSheet(effectiveSession, ficha)
          || (ficha.pasantesUids || []).includes(session.uid)
          || (effectiveSession.instructorUid && (ficha.instructorUids || []).includes(effectiveSession.instructorUid));
      }

      return false;
    });
    const fichaIds = new Set(fichas.map((ficha) => ficha.id));
    const asignaciones = state.asignaciones.filter((assignment) => fichaIds.has(assignment.fichaId) && isActive(assignment));
    const competenciaIds = new Set(asignaciones.map((assignment) => assignment.competenciaId));
    const instructorIds = new Set(asignaciones.map((assignment) => assignment.instructorUid));
    fichas.forEach((ficha) => (ficha.instructorUids || []).forEach((uid) => instructorIds.add(uid)));
    if (session?.instructorUid) {
      instructorIds.add(session.instructorUid);
    }

    onData({
      fichas,
      asignaciones,
      competencias: state.competencias.filter((competencia) => competenciaIds.has(competencia.id) && isActive(competencia)),
      resultados: state.resultados.filter((resultado) => competenciaIds.has(resultado.competenciaId) && isActive(resultado)),
      instructores: state.usuarios.filter((user) => instructorIds.has(user.id)),
      aprendices: state.usuarios.filter((user) => fichaIds.has(user.fichaId) && cleanText(user.rol).toLowerCase() === 'aprendiz'),
      solicitudesFicha: state.usuarios.filter((user) => fichaIds.has(user.fichaSolicitudId) && cleanText(user.rol).toLowerCase() === 'aprendiz'),
      pasantes: state.usuarios.filter((user) => user.instructorUid === session.uid && cleanText(user.rol).toLowerCase() === 'pasante'),
    });
  };

  const subscribe = (collectionName, stateKey) =>
    onSnapshot(
      collection(db, collectionName),
      (snapshot) => {
        state[stateKey] = mapSnapshot(snapshot);
        emit();
      },
      onError
    );

  const unsubscribers = [
    subscribe(FICHAS_COLLECTION, 'fichas'),
    subscribe(USUARIOS_COLLECTION, 'usuarios'),
    subscribe(COMPETENCIAS_COLLECTION, 'competencias'),
    subscribe(RESULTADOS_COLLECTION, 'resultados'),
    subscribe(ASIGNACIONES_COMPETENCIAS_COLLECTION, 'asignaciones'),
  ];

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
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
  const tipoFormacion = cleanText(programa.tipoFormacion);
  const cantidadTrimestres = programa.cantidadTrimestres ? Number(programa.cantidadTrimestres) : undefined;

  if (!nombre || !codigo) {
    throw new Error('Completa nombre y código del programa.');
  }

  const payload = {
    nombre,
    codigo,
    tipoFormacion: tipoFormacion || 'Tecnólogo',
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

export async function activarPrograma(id) {
  await updateDoc(doc(db, PROGRAMAS_COLLECTION, id), {
    activo: true,
    estado: 'Activo',
    actualizadoEn: now(),
  });
}

export async function guardarFicha(ficha) {
  const numero = cleanText(ficha.numero);
  const programaId = cleanText(ficha.programaId);
  const programaNombre = cleanText(ficha.programaNombre);

  if (!numero || !programaId) {
    throw new Error('Completa número de ficha y programa.');
  }

  if (!/^\d+$/.test(numero)) {
    throw new Error('El número de ficha solo debe contener dígitos.');
  }

  const existingQuery = query(
    collection(db, FICHAS_COLLECTION),
    where('numero', '==', numero),
    where('programaId', '==', programaId)
  );
  const existing = await getDocs(existingQuery);
  const conflict = existing.docs.find((item) => item.id !== ficha.id);

  if (conflict) {
    throw new Error('Ya existe una ficha con ese número en el programa.');
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

export async function activarFicha(id) {
  await updateDoc(doc(db, FICHAS_COLLECTION, id), {
    activo: true,
    estado: 'Activa',
    actualizadoEn: now(),
  });
}

export async function guardarTrimestre(trimestre) {
  const numero = trimestre.numero ? Number(trimestre.numero) : null;
  const fechaInicio = normalizeDate(trimestre.fechaInicio);
  const fechaFin = normalizeDate(trimestre.fechaFin);

  if (trimestre.numero && (!numero || numero < 1)) {
    throw new Error('Completa el número del trimestre.');
  }

  if (new Date(`${fechaInicio}T00:00:00`) > new Date(`${fechaFin}T00:00:00`)) {
    throw new Error('La fecha de inicio no puede ser posterior a la fecha fin.');
  }

  const payload = {
    numero,
    fechaInicio,
    fechaFin,
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

export async function activarTrimestre(id) {
  await updateDoc(doc(db, TRIMESTRES_COLLECTION, id), {
    activo: true,
    estado: 'Activo',
    actualizadoEn: now(),
  });
}

export async function asignarTrimestreAFicha({ fichaId, trimestre }) {
  if (!fichaId || !trimestre?.id) {
    throw new Error('Selecciona una ficha y un trimestre.');
  }

  const trimesterLabel = `Trimestre ${trimestre.numero || ''}`.trim();
  const trimesterPayload = {
    trimestreId: trimestre.id,
    trimestreActual: trimesterLabel,
    trimestreNumero: trimestre.numero || null,
    trimestreFechaInicio: trimestre.fechaInicio || null,
    trimestreFechaFin: trimestre.fechaFin || null,
    actualizadoEn: now(),
  };

  const batch = writeBatch(db);
  batch.update(doc(db, FICHAS_COLLECTION, fichaId), trimesterPayload);

  const learnersSnapshot = await getDocs(query(collection(db, USUARIOS_COLLECTION), where('fichaId', '==', fichaId)));
  learnersSnapshot.docs.forEach((item) => {
    batch.update(doc(db, USUARIOS_COLLECTION, item.id), trimesterPayload);
  });

  const assignedUsersSnapshot = await getDocs(query(collection(db, USUARIOS_COLLECTION), where('fichasAsignadas', 'array-contains', fichaId)));
  assignedUsersSnapshot.docs.forEach((item) => {
    batch.update(doc(db, USUARIOS_COLLECTION, item.id), trimesterPayload);
  });

  await batch.commit();
}

export async function asignarAprendizAFicha({ aprendiz, ficha }) {
  if (!aprendiz?.id) {
    throw new Error('Selecciona un aprendiz valido.');
  }

  if (!ficha?.id) {
    throw new Error('Selecciona una ficha valida.');
  }

  const previousFichaId = cleanText(aprendiz.fichaId);
  const nextFichaId = cleanText(ficha.id);
  const batch = writeBatch(db);

  if (previousFichaId && previousFichaId !== nextFichaId) {
    const previousProjectsSnapshot = await getDocs(
      query(
        collection(db, PROYECTOS_COLLECTION),
        where('fichaId', '==', previousFichaId),
        where('aprendizIds', 'array-contains', aprendiz.id)
      )
    );
    previousProjectsSnapshot.docs.forEach((item) => {
      batch.update(item.ref, {
        aprendizIds: arrayRemove(aprendiz.id),
        actualizadoEn: now(),
      });
    });

    const previousGroupsSnapshot = await getDocs(
      query(
        collection(db, GRUPOS_COLLECTION),
        where('fichaId', '==', previousFichaId),
        where('aprendizIds', 'array-contains', aprendiz.id)
      )
    );
    previousGroupsSnapshot.docs.forEach((item) => {
      batch.update(item.ref, {
        aprendizIds: arrayRemove(aprendiz.id),
        actualizadoEn: now(),
      });
    });

    const previousBitacorasSnapshot = await getDocs(
      query(
        collection(db, 'bitacoras'),
        where('aprendizUid', '==', aprendiz.id),
        where('fichaId', '==', previousFichaId)
      )
    );
    previousBitacorasSnapshot.docs.forEach((item) => {
      batch.delete(item.ref);
    });
  }

  batch.update(doc(db, USUARIOS_COLLECTION, aprendiz.id), {
    fichaId: ficha.id,
    ficha: ficha.numero || ficha.id,
    programaId: ficha.programaId || null,
    programa: ficha.programaNombre || null,
    fichaSolicitudId: deleteField(),
    fichaSolicitudNumero: deleteField(),
    fichaSolicitudPrograma: deleteField(),
    fichaSolicitudEstado: deleteField(),
    trimestreActual: ficha.trimestreActual || null,
    trimestreId: ficha.trimestreId || null,
    trimestreNumero: ficha.trimestreNumero || null,
    trimestreFechaInicio: ficha.trimestreFechaInicio || null,
    trimestreFechaFin: ficha.trimestreFechaFin || null,
    actualizadoEn: now(),
  });

  await batch.commit();
}

export async function solicitarFichaAprendiz({ aprendizUid, ficha }) {
  if (!aprendizUid) {
    throw new Error('No encontramos el aprendiz activo.');
  }

  if (!ficha.id) {
    throw new Error('Selecciona una ficha válida.');
  }

  await updateDoc(doc(db, USUARIOS_COLLECTION, aprendizUid), {
    fichaSolicitudId: ficha.id,
    fichaSolicitudNumero: ficha.numero || ficha.id,
    fichaSolicitudPrograma: ficha.programaNombre || null,
    fichaSolicitudEstado: 'Pendiente',
    actualizadoEn: now(),
  });
}

export async function rechazarSolicitudFicha(aprendizUid) {
  if (!aprendizUid) {
    throw new Error('Selecciona un aprendiz válido.');
  }

  await updateDoc(doc(db, USUARIOS_COLLECTION, aprendizUid), {
    fichaSolicitudId: deleteField(),
    fichaSolicitudNumero: deleteField(),
    fichaSolicitudPrograma: deleteField(),
    fichaSolicitudEstado: 'Rechazada',
    actualizadoEn: now(),
  });
}

export async function quitarAprendizDeFicha(aprendizUid) {
  if (!aprendizUid) {
    throw new Error('Selecciona un aprendiz valido.');
  }

  await updateDoc(doc(db, USUARIOS_COLLECTION, aprendizUid), {
    fichaId: null,
    ficha: null,
    programaId: null,
    programa: null,
    trimestreActual: null,
    trimestreId: null,
    trimestreNumero: null,
    trimestreFechaInicio: null,
    trimestreFechaFin: null,
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

  await updateDoc(doc(db, USUARIOS_COLLECTION, instructorUid), {
    fichasAsignadas: arrayUnion(fichaId),
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

  await updateDoc(doc(db, USUARIOS_COLLECTION, instructorUid), {
    fichasAsignadas: arrayRemove(fichaId),
    actualizadoEn: now(),
  });
}

export function subscribeInstructorFichas(instructorUid, onData, onError) {
  if (!instructorUid) {
    throw new Error('InstructorUid es requerido para suscribirse a fichas.');
  }

  return onSnapshot(
    query(collection(db, FICHAS_COLLECTION), where('instructorUids', 'array-contains', instructorUid)),
    (snapshot) => onData(sortByCreated(mapSnapshot(snapshot))),
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

export async function removePasanteFromInstructor(instructorUid, pasanteUid) {
  if (!instructorUid || !pasanteUid) {
    throw new Error('Instructor y pasante son requeridos.');
  }

  const fichasQuery = query(collection(db, FICHAS_COLLECTION), where('instructorUids', 'array-contains', instructorUid));
  const snapshot = await getDocs(fichasQuery);
  const fichaIds = snapshot.docs.map((item) => item.id);
  const batch = writeBatch(db);

  batch.update(doc(db, USUARIOS_COLLECTION, pasanteUid), {
    instructorUid: deleteField(),
    fichasAsignadas: [],
    actualizadoEn: now(),
  });
  batch.update(doc(db, USUARIOS_COLLECTION, instructorUid), {
    pasantesUids: arrayRemove(pasanteUid),
    actualizadoEn: now(),
  });

  fichaIds.forEach((fichaId) => {
    batch.update(doc(db, FICHAS_COLLECTION, fichaId), {
      pasantesUids: arrayRemove(pasanteUid),
      actualizadoEn: now(),
    });
  });

  await batch.commit();
}

export async function asignarTrimestreDirectoAFicha({ fichaId, numero, fechaInicio, fechaFin }) {
  if (!fichaId) {
    throw new Error('Selecciona una ficha.');
  }

  const trimesterNumber = Number(numero);
  const normalizedStart = normalizeDate(fechaInicio);
  const normalizedEnd = normalizeDate(fechaFin);

  if (!trimesterNumber || trimesterNumber < 1) {
    throw new Error('Ingresa un número de trimestre válido.');
  }

  if (new Date(`${normalizedStart}T00:00:00`) > new Date(`${normalizedEnd}T00:00:00`)) {
    throw new Error('La fecha de inicio no puede ser posterior a la fecha fin.');
  }

  const trimesterPayload = {
    trimestreId: null,
    trimestreActual: `Trimestre ${trimesterNumber}`,
    trimestreNumero: trimesterNumber,
    trimestreFechaInicio: normalizedStart,
    trimestreFechaFin: normalizedEnd,
    actualizadoEn: now(),
  };

  const batch = writeBatch(db);
  batch.update(doc(db, FICHAS_COLLECTION, fichaId), trimesterPayload);

  const learnersSnapshot = await getDocs(query(collection(db, USUARIOS_COLLECTION), where('fichaId', '==', fichaId)));
  learnersSnapshot.docs.forEach((item) => {
    batch.update(doc(db, USUARIOS_COLLECTION, item.id), trimesterPayload);
  });

  const assignedUsersSnapshot = await getDocs(query(collection(db, USUARIOS_COLLECTION), where('fichasAsignadas', 'array-contains', fichaId)));
  assignedUsersSnapshot.docs.forEach((item) => {
    batch.update(doc(db, USUARIOS_COLLECTION, item.id), trimesterPayload);
  });

  await batch.commit();
}

export async function quitarTrimestreDeFicha(fichaId) {
  if (!fichaId) {
    throw new Error('Selecciona una ficha.');
  }

  const trimesterPayload = {
    trimestreId: null,
    trimestreActual: null,
    trimestreNumero: null,
    trimestreFechaInicio: null,
    trimestreFechaFin: null,
    actualizadoEn: now(),
  };

  const batch = writeBatch(db);
  batch.update(doc(db, FICHAS_COLLECTION, fichaId), trimesterPayload);

  const learnersSnapshot = await getDocs(query(collection(db, USUARIOS_COLLECTION), where('fichaId', '==', fichaId)));
  learnersSnapshot.docs.forEach((item) => {
    batch.update(doc(db, USUARIOS_COLLECTION, item.id), trimesterPayload);
  });

  const assignedUsersSnapshot = await getDocs(query(collection(db, USUARIOS_COLLECTION), where('fichasAsignadas', 'array-contains', fichaId)));
  assignedUsersSnapshot.docs.forEach((item) => {
    batch.update(doc(db, USUARIOS_COLLECTION, item.id), trimesterPayload);
  });

  await batch.commit();
}

export function subscribePasanteFichas(pasanteUid, onData, onError) {
  if (!pasanteUid) {
    throw new Error('PasanteUid es requerido para suscribirse a fichas.');
  }

  return onSnapshot(
    query(collection(db, FICHAS_COLLECTION), where('pasantesUids', 'array-contains', pasanteUid)),
    (snapshot) => onData(sortByCreated(mapSnapshot(snapshot))),
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

export async function guardarCompetencia(competencia) {
  const codigo = cleanText(competencia.codigo).toUpperCase();
  const nombre = cleanText(competencia.nombre);
  const descripcion = cleanText(competencia.descripcion);

  if (!codigo || !nombre) {
    throw new Error('Completa código y nombre de la competencia.');
  }

  const payload = {
    codigo,
    nombre,
    descripcion,
    activo: competencia.activo ?? true,
    estado: competencia.estado || 'Activa',
    actualizadoEn: now(),
  };

  if (competencia.id) {
    await updateDoc(doc(db, COMPETENCIAS_COLLECTION, competencia.id), payload);
    return;
  }

  await addDoc(collection(db, COMPETENCIAS_COLLECTION), {
    ...payload,
    creadoEn: now(),
  });
}

export async function desactivarCompetencia(id) {
  await updateDoc(doc(db, COMPETENCIAS_COLLECTION, id), {
    activo: false,
    estado: 'Inactiva',
    actualizadoEn: now(),
  });
}

export async function activarCompetencia(id) {
  await updateDoc(doc(db, COMPETENCIAS_COLLECTION, id), {
    activo: true,
    estado: 'Activa',
    actualizadoEn: now(),
  });
}

export async function guardarResultadoAprendizaje(resultado) {
  const competenciaId = cleanText(resultado.competenciaId);
  const codigo = cleanText(resultado.codigo).toUpperCase();
  const descripcion = cleanText(resultado.descripcion);

  if (!competenciaId || !codigo || !descripcion) {
    throw new Error('Selecciona competencia y completa código y descripción del RAP.');
  }

  const payload = {
    competenciaId,
    codigo,
    descripcion,
    activo: resultado.activo ?? true,
    estado: resultado.estado || 'Activo',
    actualizadoEn: now(),
  };

  if (resultado.id) {
    await updateDoc(doc(db, RESULTADOS_COLLECTION, resultado.id), payload);
    return;
  }

  await addDoc(collection(db, RESULTADOS_COLLECTION), {
    ...payload,
    creadoEn: now(),
  });
}

export async function desactivarResultadoAprendizaje(id) {
  await updateDoc(doc(db, RESULTADOS_COLLECTION, id), {
    activo: false,
    estado: 'Inactivo',
    actualizadoEn: now(),
  });
}

export async function activarResultadoAprendizaje(id) {
  await updateDoc(doc(db, RESULTADOS_COLLECTION, id), {
    activo: true,
    estado: 'Activo',
    actualizadoEn: now(),
  });
}

export async function asignarCompetenciaInstructor({ instructorUid, fichaId, competenciaId, resultadoId }) {
  if (!instructorUid || !fichaId || !competenciaId || !resultadoId) {
    throw new Error('Selecciona instructor, ficha, competencia y RAP.');
  }

  const rapSnapshot = await getDocs(
    query(collection(db, RESULTADOS_COLLECTION), where('competenciaId', '==', competenciaId))
  );
  const activeRap = mapSnapshot(rapSnapshot).filter(isActive);
  const selectedRap = activeRap.find((rap) => rap.id === resultadoId);

  if (!selectedRap) {
    throw new Error('Selecciona un RAP activo de esta competencia.');
  }

  const existingSnapshot = await getDocs(
    query(
      collection(db, ASIGNACIONES_COMPETENCIAS_COLLECTION),
      where('fichaId', '==', fichaId),
      where('resultadoId', '==', resultadoId)
    )
  );
  const legacyExistingSnapshot = await getDocs(
    query(
      collection(db, ASIGNACIONES_COMPETENCIAS_COLLECTION),
      where('fichaId', '==', fichaId),
      where('resultadoIds', 'array-contains', resultadoId)
    )
  );
  const repeatedRap = [...mapSnapshot(existingSnapshot), ...mapSnapshot(legacyExistingSnapshot)].find(isActive);

  if (repeatedRap) {
    throw new Error('Este RAP ya está asignado para esta ficha. Puedes asignar la misma competencia solo si eliges un RAP diferente.');
  }

  await addDoc(collection(db, ASIGNACIONES_COMPETENCIAS_COLLECTION), {
    instructorUid,
    fichaId,
    competenciaId,
    resultadoId,
    resultadoIds: [resultadoId],
    activo: true,
    estado: 'Activa',
    creadoEn: now(),
    actualizadoEn: now(),
  });

  await updateDoc(doc(db, FICHAS_COLLECTION, fichaId), {
    instructorUids: arrayUnion(instructorUid),
    actualizadoEn: now(),
  });

  await updateDoc(doc(db, USUARIOS_COLLECTION, instructorUid), {
    fichasAsignadas: arrayUnion(fichaId),
    actualizadoEn: now(),
  });
}

export async function desactivarAsignacionCompetencia(id) {
  if (!id) {
    throw new Error('Selecciona una asignacion valida.');
  }

  await updateDoc(doc(db, ASIGNACIONES_COMPETENCIAS_COLLECTION, id), {
    activo: false,
    estado: 'Inactiva',
    actualizadoEn: now(),
  });
}

export async function guardarGrupoTrabajo(grupo) {
  const nombre = cleanText(grupo.nombre);
  const fichaId = cleanText(grupo.fichaId);
  const fichaNumero = cleanText(grupo.fichaNumero);
  const instructorUid = cleanText(grupo.instructorUid);
  const aprendizIds = Array.isArray(grupo.aprendizIds) ? grupo.aprendizIds.filter(Boolean) : [];

  if (!nombre) {
    throw new Error('Falta el nombre del grupo.');
  }

  if (!fichaId) {
    throw new Error('Selecciona una ficha para el grupo.');
  }

  if (!instructorUid) {
    throw new Error('No encontramos el instructor responsable.');
  }

  const payload = {
    nombre,
    fichaId,
    fichaNumero,
    instructorUid,
    aprendizIds,
    activo: grupo.activo ?? true,
    estado: grupo.estado || 'Activo',
    actualizadoEn: now(),
  };

  if (grupo.id) {
    await updateDoc(doc(db, GRUPOS_COLLECTION, grupo.id), payload);
    return;
  }

  await addDoc(collection(db, GRUPOS_COLLECTION), {
    ...payload,
    creadoEn: now(),
  });
}

export async function quitarIntegranteGrupo(grupoId, aprendizUid) {
  if (!grupoId || !aprendizUid) {
    throw new Error('Selecciona un grupo y un aprendiz.');
  }

  await updateDoc(doc(db, GRUPOS_COLLECTION, grupoId), {
    aprendizIds: arrayRemove(aprendizUid),
    actualizadoEn: now(),
  });
}

export async function guardarProyectoAcademico(proyecto) {
  const titulo = cleanText(proyecto.titulo);
  const descripcion = cleanText(proyecto.descripcion);
  const fichaId = cleanText(proyecto.fichaId);
  const fichaNumero = cleanText(proyecto.fichaNumero);
  const competenciaId = cleanText(proyecto.competenciaId);
  const competenciaNombre = cleanText(proyecto.competenciaNombre);
  const rapId = cleanText(proyecto.rapId);
  const rapDescripcion = cleanText(proyecto.rapDescripcion);
  const instructorUid = cleanText(proyecto.instructorUid);
  const asignacionTipo = proyecto.asignacionTipo === 'grupo' ? 'grupo' : 'aprendices';
  const aprendizIds = Array.isArray(proyecto.aprendizIds) ? proyecto.aprendizIds.filter(Boolean) : [];
  const grupoId = cleanText(proyecto.grupoId);
  const projectRef = proyecto.id
    ? doc(db, PROYECTOS_COLLECTION, proyecto.id)
    : doc(collection(db, PROYECTOS_COLLECTION));
  const archivoNombre = cleanText(proyecto.archivoNombre);
  const archivoUri = cleanText(proyecto.archivoUri);
  const archivoMimeType = cleanText(proyecto.archivoMimeType);
  const bitacorasEsperadas = Number(proyecto.bitacorasEsperadas || 0);
  const archivosBase = Array.isArray(proyecto.archivos)
    ? proyecto.archivos
      .map((archivo) => ({
        nombre: cleanText(archivo.nombre),
        uri: cleanText(archivo.uri || archivo.url),
        url: cleanText(archivo.url || archivo.uri),
        mimeType: cleanText(archivo.mimeType),
        ruta: cleanText(archivo.ruta),
      }))
      .filter((archivo) => archivo.nombre || archivo.uri)
    : [];
  if (!titulo) {
    throw new Error('Falta el nombre del proyecto.');
  }

  if (!fichaId || !competenciaId || !rapId) {
    throw new Error('Selecciona ficha, competencia y RAP.');
  }

  if (!instructorUid) {
    throw new Error('No encontramos el instructor responsable.');
  }

  if (asignacionTipo === 'grupo' && !grupoId) {
    throw new Error('Selecciona el grupo de trabajo.');
  }

  if (asignacionTipo === 'aprendices' && !aprendizIds.length) {
    throw new Error('Selecciona al menos un aprendiz.');
  }

  const archivos = (await Promise.all(
    archivosBase.map((archivo, index) => uploadProjectAttachment(archivo, projectRef.id, index))
  )).filter(Boolean);
  const firstFile = archivos[0];

  const payload = {
    titulo,
    descripcion,
    fichaId,
    fichaNumero,
    competenciaId,
    competenciaNombre,
    rapId,
    rapDescripcion,
    instructorUid,
    asignacionTipo,
    aprendizIds: asignacionTipo === 'aprendices' ? aprendizIds : [],
    grupoId: asignacionTipo === 'grupo' ? grupoId : null,
    archivoNombre: firstFile?.nombre || archivoNombre || null,
    archivoUri: firstFile?.uri || archivoUri || null,
    archivoMimeType: firstFile?.mimeType || archivoMimeType || null,
    archivos,
    bitacorasEsperadas: Number.isFinite(bitacorasEsperadas) && bitacorasEsperadas > 0 ? bitacorasEsperadas : null,
    estado: proyecto.estado || 'Pendiente',
    progreso: Number(proyecto.progreso || 0),
    activo: proyecto.activo ?? true,
    actualizadoEn: now(),
  };

  if (proyecto.id) {
    await updateDoc(projectRef, payload);
    return;
  }

  await setDoc(projectRef, {
    ...payload,
    creadoEn: now(),
  });
}

export async function cambiarEstadoProyecto(proyectoId, estado) {
  const normalizedState = cleanText(estado);
  const allowedStates = ['Pendiente', 'En proceso', 'Aprobado', 'Desaprobado'];

  if (!proyectoId || !allowedStates.includes(normalizedState)) {
    throw new Error('Selecciona un proyecto y un estado valido.');
  }

  const payload = {
    estado: normalizedState,
    progreso: normalizedState === 'Aprobado' ? 100 : normalizedState === 'En proceso' ? 50 : 0,
    actualizadoEn: now(),
  };

  await updateDoc(doc(db, PROYECTOS_COLLECTION, proyectoId), payload);
}

