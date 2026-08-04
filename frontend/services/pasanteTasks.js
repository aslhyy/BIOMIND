import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';

const TASKS_COLLECTION = 'tareasPasante';
const TASK_FILES_BUCKET = process.env.EXPO_PUBLIC_EVIDENCE_FILES_BUCKET
  || process.env.EXPO_PUBLIC_PROJECT_FILES_BUCKET
  || 'biomind-project-files';

function now() {
  return new Date();
}

function cleanText(value) {
  return String(value || '').trim();
}

function getExternalFilesStorageConfig() {
  const supabaseUrl = cleanText(process.env.EXPO_PUBLIC_SUPABASE_URL).replace(/\/+$/g, '');
  const supabaseAnonKey = cleanText(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Falta configurar el almacenamiento externo de archivos. Agrega EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY para subir adjuntos de tareas.'
    );
  }

  return { supabaseAnonKey, supabaseUrl };
}

function isPublicUrl(uri) {
  return /^https:\/\//i.test(uri);
}

function safeFileName(name, fallback = 'archivo') {
  const normalized = cleanText(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || fallback;
}

async function uploadTaskAttachment(archivo, taskId, index) {
  const nombre = cleanText(archivo.nombre) || `adjunto-${index + 1}`;
  const source = cleanText(archivo.uri || archivo.url);
  const mimeType = cleanText(archivo.mimeType) || 'application/octet-stream';
  const ruta = cleanText(archivo.ruta);

  if (!source) {
    return null;
  }

  if (isPublicUrl(source)) {
    return {
      nombre,
      mimeType,
      ruta: ruta || null,
      uri: source,
      url: source,
    };
  }

  const response = await fetch(source);

  if (!response.ok) {
    throw new Error(`No pudimos leer el adjunto ${nombre}. Intenta seleccionarlo nuevamente.`);
  }

  const { supabaseAnonKey, supabaseUrl } = getExternalFilesStorageConfig();
  const blob = await response.blob();
  const path = `tareas-pasante/${taskId}/${Date.now()}-${index}-${safeFileName(nombre)}`;
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${TASK_FILES_BUCKET}/${path}`;
  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      'Content-Type': mimeType,
    },
    body: blob,
  });

  if (!uploadResponse.ok) {
    let detail = '';

    try {
      const responseBody = await uploadResponse.json();
      detail = responseBody.message || responseBody.error || '';
    } catch {
      detail = await uploadResponse.text();
    }

    throw new Error(
      `No pudimos subir el adjunto de la tarea a Supabase (${uploadResponse.status}). ${detail || 'Revisa el bucket y las políticas de Supabase.'}`
    );
  }

  const url = `${supabaseUrl}/storage/v1/object/public/${TASK_FILES_BUCKET}/${path}`;

  return {
    nombre,
    mimeType,
    ruta: path,
    uri: url,
    url,
  };
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

  const taskRef = task.id ? doc(db, TASKS_COLLECTION, task.id) : doc(collection(db, TASKS_COLLECTION));
  const archivosBase = Array.isArray(task.archivos) ? task.archivos.filter(Boolean) : [];
  const archivos = (await Promise.all(
    archivosBase.map((archivo, index) => uploadTaskAttachment(archivo, taskRef.id, index))
  )).filter(Boolean);

  const payload = {
    titulo,
    descripcion,
    archivos,
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
    await updateDoc(taskRef, payload);
    return;
  }

  await setDoc(taskRef, {
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
