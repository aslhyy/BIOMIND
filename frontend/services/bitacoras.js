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
import { db } from './firebase';

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
    const descripcion = cleanText(bitacora.descripcion);
    const fecha = cleanText(bitacora.fecha);
    const avance = cleanText(bitacora.avance);
    const dificultades = cleanText(bitacora.dificultades);

    if (!descripcion || !fecha || !avance) {
        throw new Error('Completa descripción, fecha y avance realizado.');
    }

    const evidencias = Array.isArray(bitacora.evidencias) ? bitacora.evidencias : [];
    const totalEvidenceCharacters = evidencias.reduce(
        (total, evidencia) => total + cleanText(evidencia.base64).length,
        0
    );

    if (evidencias.length > 3) {
        throw new Error('Puedes guardar máximo 3 fotografías por bitácora.');
    }

    if (totalEvidenceCharacters > 700000) {
        throw new Error('Las fotografías ocupan demasiado espacio. Elimina una o selecciona imágenes más livianas.');
    }

    const learnerPayload = {
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
        await updateDoc(doc(db, BITACORAS_COLLECTION, bitacora.id), learnerPayload);
        return;
    }

    await addDoc(collection(db, BITACORAS_COLLECTION), {
        ...learnerPayload,
        estado: 'Enviada',
        observacion: '',
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
        revisadoPorRol: revision.revisadoPorRol,
        actualizadoEn: now(),
    });
}
