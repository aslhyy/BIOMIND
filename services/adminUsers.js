import { collection, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const USUARIOS_COLLECTION = 'usuarios';

export function escucharUsuariosAdmin(onUsers, onError) {
  return onSnapshot(
    collection(db, USUARIOS_COLLECTION),
    (snapshot) => {
      const users = snapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data(),
        }))
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

  await deleteDoc(doc(db, USUARIOS_COLLECTION, uid));
}
