import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    onSnapshot,
    orderBy,
    query,
    setDoc,
    updateDoc,
    where,
} from 'firebase/firestore';
import { db } from './firebase';

const BITACORAS_COLLECTION = 'bitacoras';
const EVIDENCE_FILES_BUCKET = process.env.EXPO_PUBLIC_EVIDENCE_FILES_BUCKET
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
            'Falta configurar el almacenamiento externo de archivos. Agrega EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY para subir evidencias a Supabase.'
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

async function uploadEvidence(evidencia, bitacoraId, index) {
    const nombre = cleanText(evidencia.nombre) || `evidencia-${index + 1}`;
    const source = cleanText(evidencia.uri || evidencia.url || evidencia.base64);
    const mimeType = cleanText(evidencia.mimeType) || 'application/octet-stream';
    const ruta = cleanText(evidencia.ruta);
    const tipo = cleanText(evidencia.tipo) || (mimeType.startsWith('image/') ? 'imagen' : 'archivo');

    if (!source) {
        return null;
    }

    if (isPublicUrl(source)) {
        return {
            nombre,
            mimeType,
            ruta: ruta || null,
            tipo,
            url: source,
        };
    }

    const { supabaseAnonKey, supabaseUrl } = getExternalFilesStorageConfig();
    const blob = await readLocalFileAsBlob(source, nombre);
    const path = `bitacoras/${bitacoraId}/${Date.now()}-${index}-${safeFileName(nombre)}`;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${EVIDENCE_FILES_BUCKET}/${path}`;
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
            `No pudimos subir la evidencia a Supabase (${uploadResponse.status}). ${detail || 'Revisa el bucket y las políticas de Supabase.'}`
        );
    }

    return {
        nombre,
        mimeType,
        ruta: path,
        tipo,
        url: `${supabaseUrl}/storage/v1/object/public/${EVIDENCE_FILES_BUCKET}/${path}`,
    };
}

function readLocalFileAsBlob(uri, nombre) {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.onload = () => resolve(request.response);
        request.onerror = () => reject(
            new Error(`No pudimos leer la evidencia ${nombre}. Intenta seleccionarla nuevamente.`)
        );
        request.responseType = 'blob';
        request.open('GET', uri, true);
        request.send(null);
    });
}

function mapSnapshot(snapshot) {
    return snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
    }));
}

function buildObservation(revision, existing = {}) {
    return {
        id: existing.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        autorUid: revision.revisadoPorUid,
        autorNombre: revision.revisadoPorNombre,
        autorRol: revision.revisadoPorRol,
        texto: cleanText(revision.observacion),
        creadoEn: existing.creadoEn || now(),
        actualizadoEn: now(),
    };
}

async function upsertObservation(bitacoraId, revision) {
    const observacion = cleanText(revision.observacion);

    if (!observacion) {
        throw new Error('Registra una observación para el aprendiz.');
    }

    const bitacoraRef = doc(db, BITACORAS_COLLECTION, bitacoraId);
    const snapshot = await getDoc(bitacoraRef);
    const current = snapshot.exists() ? snapshot.data() : {};
    const observations = Array.isArray(current.observaciones) ? current.observaciones : [];
    const observationId = cleanText(revision.observacionId);
    const existing = observations.find((item) => item.id === observationId);
    const nextObservation = buildObservation(revision, existing);
    const nextObservations = existing
        ? observations.map((item) => item.id === observationId ? nextObservation : item)
        : [...observations, nextObservation];

    await updateDoc(bitacoraRef, {
        observaciones: nextObservations,
        actualizadoEn: now(),
    });

    return nextObservation;
}

export function escucharBitacoras(onData, onError) {
    return onSnapshot(
        collection(db, BITACORAS_COLLECTION),
        (snapshot) => onData(
            mapSnapshot(snapshot).sort((a, b) => cleanText(b.fecha).localeCompare(cleanText(a.fecha)))
        ),
        onError
    );
}

export function escucharBitacorasAprendiz(aprendizUid, onData, onError) {
    if (!aprendizUid) {
        onData([]);
        return () => { };
    }

    return onSnapshot(
        query(
            collection(db, BITACORAS_COLLECTION),
            where('aprendizUid', '==', aprendizUid)
        ),
        (snapshot) => onData(
            mapSnapshot(snapshot).sort((a, b) => cleanText(b.fecha).localeCompare(cleanText(a.fecha)))
        ),
        onError
    );
}

export function escucharBitacorasPorFicha(fichaId, onData, onError) {
    if (!fichaId) {
        onData([]);
        return () => { };
    }

    return onSnapshot(
        query(
            collection(db, BITACORAS_COLLECTION),
            where('fichaId', '==', fichaId),
            orderBy('fecha', 'desc')
        ),
        (snapshot) => onData(mapSnapshot(snapshot)),
        onError
    );
}

export function escucharBitacorasPorProyecto(proyectoId, onData, onError) {
    if (!proyectoId) {
        onData([]);
        return () => { };
    }

    return onSnapshot(
        query(
            collection(db, BITACORAS_COLLECTION),
            where('proyectoId', '==', proyectoId),
            orderBy('fecha', 'desc')
        ),
        (snapshot) => onData(mapSnapshot(snapshot)),
        onError
    );
}

export async function guardarBitacora(bitacora) {
    const nombre = cleanText(bitacora.nombre);
    const descripcion = cleanText(bitacora.descripcion);
    const fecha = cleanText(bitacora.fecha);
    const avance = cleanText(bitacora.avance);
    const dificultades = cleanText(bitacora.dificultades);

    if (!nombre || !descripcion || !fecha || !avance) {
        throw new Error('Completa nombre, descripción, fecha y avance realizado.');
    }

    const bitacoraRef = bitacora.id
        ? doc(db, BITACORAS_COLLECTION, bitacora.id)
        : doc(collection(db, BITACORAS_COLLECTION));
    const evidenciasBase = Array.isArray(bitacora.evidencias) ? bitacora.evidencias : [];
    const evidencias = (await Promise.all(
        evidenciasBase.map((evidencia, index) => uploadEvidence(evidencia, bitacoraRef.id, index))
    )).filter(Boolean);
    if (false && evidencias.length > 3) {
        throw new Error('Puedes guardar máximo 3 fotografías por bitácora.');
    }

    if (false) {
        throw new Error('Las fotografías ocupan demasiado espacio. Elimina una o selecciona imágenes más livianas.');
    }

    const learnerPayload = {
        nombre,
        aprendizUid: bitacora.aprendizUid,
        aprendizNombre: bitacora.aprendizNombre,
        proyectoId: bitacora.proyectoId,
        proyectoTitulo: bitacora.proyectoTitulo,
        fichaId: bitacora.fichaId,
        descripcion,
        fecha,
        avance,
        dificultades,
        evidencias,
        archivoNombre: cleanText(bitacora.archivoNombre),
        archivoUrl: cleanText(bitacora.archivoUrl),
        actualizadoEn: now(),
    };

    if (bitacora.id) {
        await updateDoc(bitacoraRef, learnerPayload);
        return;
    }

    await setDoc(bitacoraRef, {
        ...learnerPayload,
        estado: 'Enviada',
        observacion: '',
        observaciones: [],
        revisadoPorUid: null,
        revisadoPorNombre: null,
        revisadoPorRol: null,
        creadoEn: now(),
    });
}

export async function eliminarBitacora(bitacoraId) {
    await deleteDoc(doc(db, BITACORAS_COLLECTION, bitacoraId));
}

export async function revisarBitacora(bitacoraId, revision) {
    const estado = cleanText(revision.estado);
    const observation = await upsertObservation(bitacoraId, revision);

    if (!['Aprobada', 'Rechazada', 'Correccion'].includes(estado)) {
        throw new Error('Selecciona aprobar, rechazar o marcar para corrección.');
    }

    if (false) {
        throw new Error('Registra una observación para el aprendiz.');
    }

    await updateDoc(doc(db, BITACORAS_COLLECTION, bitacoraId), {
        estado,
        observacion: observation.texto,
        revisadoPorUid: revision.revisadoPorUid,
        revisadoPorNombre: revision.revisadoPorNombre,
        revisadoPorRol: revision.revisadoPorRol,
        actualizadoEn: now(),
    });
}

export async function observarBitacora(bitacoraId, revision) {
    await upsertObservation(bitacoraId, revision);
}

export async function eliminarObservacionBitacora(bitacoraId, observacionId) {
    const observationId = cleanText(observacionId);

    if (!observationId) {
        throw new Error('Selecciona una observación para eliminar.');
    }

    const bitacoraRef = doc(db, BITACORAS_COLLECTION, bitacoraId);
    const snapshot = await getDoc(bitacoraRef);
    const current = snapshot.exists() ? snapshot.data() : {};
    const observations = Array.isArray(current.observaciones) ? current.observaciones : [];

    await updateDoc(bitacoraRef, {
        observaciones: observations.filter((item) => item.id !== observationId),
        actualizadoEn: now(),
    });
}
