import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    updateDoc,
    where,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from './firebase';

const BITACORAS_COLLECTION = 'bitacoras';

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

async function subirEvidencia({ uri, nombre, mimeType, aprendizUid }) {
    const response = await fetch(uri);
    const blob = await response.blob();

    const safeName = nombre || `evidencia-${Date.now()}.jpg`;
    const ruta = `bitacoras/${aprendizUid}/${Date.now()}-${safeName}`;
    const storageRef = ref(storage, ruta);

    await uploadBytes(storageRef, blob, {
        contentType: mimeType || 'image/jpeg',
    });

    const url = await getDownloadURL(storageRef);

    return {
        url,
        nombre: safeName,
        ruta,
    };
}

export function escucharBitacorasAprendiz(aprendizUid, onData, onError) {
    if (!aprendizUid) {
        onData([]);
        return () => { };
    }

    return onSnapshot(
        query(
            collection(db, BITACORAS_COLLECTION),
            where('aprendizUid', '==', aprendizUid),
            orderBy('fecha', 'desc')
        ),
        (snapshot) => onData(mapSnapshot(snapshot)),
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

export async function guardarBitacora(bitacora, evidenciasLocales = []) {
    const descripcion = cleanText(bitacora.descripcion);
    const fecha = cleanText(bitacora.fecha);
    const avance = cleanText(bitacora.avance);
    const dificultades = cleanText(bitacora.dificultades);

    if (!descripcion || !fecha || !avance) {
        throw new Error('Completa descripción, fecha y avance realizado.');
    }

    const evidenciasSubidas = [];

    for (const evidencia of evidenciasLocales) {
        const subida = await subirEvidencia({
            uri: evidencia.uri,
            nombre: evidencia.fileName || evidencia.nombre,
            mimeType: evidencia.mimeType,
            aprendizUid: bitacora.aprendizUid,
        });

        evidenciasSubidas.push(subida);
    }

    const payload = {
        aprendizUid: bitacora.aprendizUid,
        aprendizNombre: bitacora.aprendizNombre,
        proyectoId: bitacora.proyectoId,
        proyectoTitulo: bitacora.proyectoTitulo,
        fichaId: bitacora.fichaId,
        descripcion,
        fecha,
        avance,
        dificultades,
        evidencias: [
            ...(Array.isArray(bitacora.evidencias) ? bitacora.evidencias : []),
            ...evidenciasSubidas,
        ],
        estado: bitacora.estado || 'Enviada',
        observacion: bitacora.observacion || '',
        revisadoPorUid: bitacora.revisadoPorUid || null,
        revisadoPorNombre: bitacora.revisadoPorNombre || null,
        actualizadoEn: now(),
    };

    if (bitacora.id) {
        await updateDoc(doc(db, BITACORAS_COLLECTION, bitacora.id), payload);
        return;
    }

    await addDoc(collection(db, BITACORAS_COLLECTION), {
        ...payload,
        creadoEn: now(),
    });
}

export async function eliminarBitacora(bitacoraId) {
    await deleteDoc(doc(db, BITACORAS_COLLECTION, bitacoraId));
}

export async function revisarBitacora(bitacoraId, revision) {
    const estado = cleanText(revision.estado);
    const observacion = cleanText(revision.observacion);

    if (!['Aprobada', 'Rechazada', 'Correccion'].includes(estado)) {
        throw new Error('Selecciona aprobar, rechazar o marcar para corrección.');
    }

    if (!observacion) {
        throw new Error('Registra una observación para el aprendiz.');
    }

    await updateDoc(doc(db, BITACORAS_COLLECTION, bitacoraId), {
        estado,
        observacion,
        revisadoPorUid: revision.revisadoPorUid,
        revisadoPorNombre: revision.revisadoPorNombre,
        actualizadoEn: now(),
    });
}