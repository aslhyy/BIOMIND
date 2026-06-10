import {
    collection,
    doc,
    getDocs,
    orderBy,
    query,
    updateDoc,
    where,
} from 'firebase/firestore';
import { db } from './firebase';

export async function crearDatosAcademicosIniciales() {
    await setDoc(doc(db, 'programas', 'ADSO'), {
        nombre: 'Análisis y Desarrollo de Software',
        activo: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
    });

    await setDoc(doc(db, 'fichas', '3203082'), {
        numero: '3203082',
        programaId: 'ADSO',
        trimestreActual: 'IV trimestre',
        activo: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
    });
}

const PROGRAMAS_COLLECTION = 'programas';
const FICHAS_COLLECTION = 'fichas';
const USUARIOS_COLLECTION = 'usuarios';

export async function obtenerProgramas() {
    const snapshot = await getDocs(
        query(collection(db, PROGRAMAS_COLLECTION), orderBy('nombre', 'asc'))
    );

    return snapshot.docs
        .map((item) => ({
            id: item.id,
            ...item.data(),
        }))
        .filter((programa) => programa.activo !== false);
}

export async function obtenerFichasPorPrograma(programaId) {
    if (!programaId) {
        return [];
    }

    const snapshot = await getDocs(
        query(
            collection(db, FICHAS_COLLECTION),
            where('programaId', '==', programaId)
        )
    );

    return snapshot.docs
        .map((item) => ({
            id: item.id,
            ...item.data(),
        }))
        .filter((ficha) => ficha.activo !== false);
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
        actualizadoEn: new Date(),
    });
}
