import {
  createUserWithEmailAndPassword,
  deleteUser,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from './firebase';

const USUARIOS_COLLECTION = 'usuarios';

function createFlowError(code, message, extra = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, extra);
  return error;
}

async function prepareProfilePhoto(base64, mimeType = 'image/jpeg') {
  if (!base64) {
    return null;
  }

  const normalizedMimeType = mimeType || 'image/jpeg';
  const dataUrl = `data:${normalizedMimeType};base64,${base64}`;

  if (dataUrl.length > 900000) {
    throw createFlowError(
      'storage/photo-too-large',
      'La foto de perfil es demasiado pesada para guardarse. Elige una imagen mas liviana.'
    );
  }

  return dataUrl;
}

export async function registrar(form) {
  const {
    correo,
    contrasena,
    nombre,
    identificacion,
    programa,
    ficha,
    rol,
    fotoPerfilBase64,
    fotoPerfilMimeType,
  } = form;

  const cred = await createUserWithEmailAndPassword(auth, correo, contrasena);
  const userRef = doc(db, USUARIOS_COLLECTION, cred.user.uid);

  try {
    const fotoUrl = await prepareProfilePhoto(fotoPerfilBase64, fotoPerfilMimeType);

    await updateProfile(cred.user, { displayName: nombre });

    await setDoc(userRef, {
      uid: cred.user.uid,
      nombre,
      identificacion,
      programa,
      ficha,
      rol,
      correo,
      fotoUrl,
      correoVerificado: false,
      creadoEn: new Date(),
      actualizadoEn: new Date(),
    });

    await sendEmailVerification(cred.user);
    await signOut(auth);

    return {
      correo,
      nombre,
      fotoUrl,
    };
  } catch (error) {
    try {
      await deleteDoc(userRef);
    } catch {
      // ignore cleanup failures; deleting the auth user is the priority
    }

    try {
      await deleteUser(cred.user);
    } catch {
      // ignore cleanup failures; the original error is more useful to surface
    }

    throw error;
  }
}

export async function iniciarSesion(correo, contrasena) {
  const cred = await signInWithEmailAndPassword(auth, correo, contrasena);

  await reload(cred.user);

  if (!cred.user.emailVerified) {
    await signOut(auth);
    throw createFlowError(
      'auth/email-not-verified',
      'Tu cuenta aun no ha sido verificada.',
      { correo }
    );
  }

  const userRef = doc(db, USUARIOS_COLLECTION, cred.user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    await signOut(auth);
    throw createFlowError('auth/profile-not-found', 'No encontramos el perfil de este usuario.');
  }

  const perfil = snapshot.data();

  if (!perfil.correoVerificado) {
    try {
      await updateDoc(userRef, {
        correoVerificado: true,
        actualizadoEn: new Date(),
      });
    } catch {
      // ignore profile sync failures so verified users can continue to the app
    }
  }

  return {
    user: cred.user,
    profile: perfil,
  };
}

export async function reenviarCorreoVerificacion(correo, contrasena) {
  const cred = await signInWithEmailAndPassword(auth, correo, contrasena);

  try {
    await reload(cred.user);

    if (cred.user.emailVerified) {
      throw createFlowError(
        'auth/already-verified',
        'La cuenta ya fue verificada. Ahora solo debes iniciar sesion.'
      );
    }

    await sendEmailVerification(cred.user);

    return {
      correo: cred.user.email || correo,
    };
  } finally {
    try {
      await signOut(auth);
    } catch {
      // ignore sign-out failures after resending the verification email
    }
  }
}

export async function enviarRecuperacionContrasena(correo) {
  await sendPasswordResetEmail(auth, correo);
}

export async function cerrarSesion() {
  await signOut(auth);
}
