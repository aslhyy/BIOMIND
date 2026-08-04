import {
  arrayRemove,
  collection,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';

const USUARIOS_COLLECTION = 'usuarios';
const BITACORAS_COLLECTION = 'bitacoras';
const FICHAS_COLLECTION = 'fichas';
const GRUPOS_COLLECTION = 'gruposTrabajo';
const MENSAJES_COLLECTION = 'mensajes';
const PASANTE_TASKS_COLLECTION = 'tareasPasante';
const PROJECTS_COLLECTION = 'proyectos';
const PROJECT_CONVERSATIONS_COLLECTION = 'conversacionesProyecto';
const RAP_ASSIGNMENTS_COLLECTION = 'asignacionesCompetencias';

export function escucharUsuariosAdmin(onUsers, onError) {
  return onSnapshot(
    collection(db, USUARIOS_COLLECTION),
    (snapshot) => {
      const legacyVerificationUsers = snapshot.docs.filter((item) => {
        const data = item.data();
        return 'correoVerificacionEnviadaEn' in data || 'correoVerificacionConfirmadaEn' in data;
      });

      legacyVerificationUsers.forEach((item) => {
        updateDoc(doc(db, USUARIOS_COLLECTION, item.id), {
          correoVerificado: false,
          correoVerificacionEnviadaEn: deleteField(),
          correoVerificacionConfirmadaEn: deleteField(),
          actualizadoEn: new Date(),
        }).catch(() => {
          // The UI still treats only boolean true as verified.
        });
      });

      const users = snapshot.docs
        .map((item) => {
          const data = item.data();

          return {
            id: item.id,
            ...data,
            correoVerificado:
              data.correoVerificado === true &&
              !('correoVerificacionEnviadaEn' in data) &&
              !('correoVerificacionConfirmadaEn' in data),
          };
        })
        .sort((a, b) => {
          const aDate = a.creadoEn?.toMillis?.() || 0;
          const bDate = b.creadoEn?.toMillis?.() || 0;
          return bDate - aDate;
        });

      onUsers(users);
    },
    onError
  );
}

export async function asignarRolUsuario(uid, rol) {
  const normalizedRole = String(rol || '').trim();

  if (!uid || !normalizedRole) {
    throw new Error('Selecciona un usuario y un rol valido.');
  }

  await updateDoc(doc(db, USUARIOS_COLLECTION, uid), {
    rol: normalizedRole,
    actualizadoEn: new Date(),
  });
}

export async function suspenderUsuarioAdmin(uid) {
  if (!uid) {
    throw new Error('Selecciona un usuario para suspender.');
  }

  await updateDoc(doc(db, USUARIOS_COLLECTION, uid), {
    estado: 'suspendido',
    actualizadoEn: new Date(),
  });
}

export async function eliminarUsuarioAdmin(uid) {
  if (!uid) {
    throw new Error('Selecciona un usuario para eliminar.');
  }

  const batch = writeBatch(db);
  const deleteWhere = async (collectionName, fieldName) => {
    const snapshot = await getDocs(query(collection(db, collectionName), where(fieldName, '==', uid)));
    snapshot.docs.forEach((item) => batch.delete(item.ref));
  };
  const removeFromArrayWhere = async (collectionName, fieldName, arrayField) => {
    const snapshot = await getDocs(query(collection(db, collectionName), where(fieldName, 'array-contains', uid)));
    snapshot.docs.forEach((item) => batch.update(item.ref, { [arrayField]: arrayRemove(uid), actualizadoEn: new Date() }));
  };

  await Promise.all([
    deleteWhere(BITACORAS_COLLECTION, 'aprendizUid'),
    deleteWhere(PASANTE_TASKS_COLLECTION, 'pasanteUid'),
    deleteWhere(PASANTE_TASKS_COLLECTION, 'instructorUid'),
    deleteWhere(RAP_ASSIGNMENTS_COLLECTION, 'instructorUid'),
    deleteWhere(MENSAJES_COLLECTION, 'ownerUid'),
    deleteWhere(PROJECT_CONVERSATIONS_COLLECTION, 'ultimoRemitenteUid'),
    removeFromArrayWhere(FICHAS_COLLECTION, 'instructorUids', 'instructorUids'),
    removeFromArrayWhere(FICHAS_COLLECTION, 'pasantesUids', 'pasantesUids'),
    removeFromArrayWhere(GRUPOS_COLLECTION, 'aprendizIds', 'aprendizIds'),
    removeFromArrayWhere(PROJECTS_COLLECTION, 'aprendizIds', 'aprendizIds'),
  ]);

  const userProjects = await getDocs(query(collection(db, PROJECTS_COLLECTION), where('instructorUid', '==', uid)));
  const userProjectIds = userProjects.docs.map((item) => item.id);
  const projectBitacoraSnapshots = await Promise.all(
    userProjectIds.map((projectId) => getDocs(query(collection(db, BITACORAS_COLLECTION), where('proyectoId', '==', projectId))))
  );
  projectBitacoraSnapshots.forEach((snapshot) => {
    snapshot.docs.forEach((item) => batch.delete(item.ref));
  });
  userProjects.docs.forEach((item) => batch.delete(item.ref));

  const userGroups = await getDocs(query(collection(db, GRUPOS_COLLECTION), where('instructorUid', '==', uid)));
  userGroups.docs.forEach((item) => batch.delete(item.ref));

  const assignedUsers = await getDocs(query(collection(db, USUARIOS_COLLECTION), where('instructorUid', '==', uid)));
  assignedUsers.docs.forEach((item) => batch.update(item.ref, {
    instructorUid: deleteField(),
    fichasAsignadas: [],
    actualizadoEn: new Date(),
  }));

  batch.delete(doc(db, USUARIOS_COLLECTION, uid));
  await batch.commit();
}
