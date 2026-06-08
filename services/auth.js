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
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
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
      'La foto de perfil es demasiado pesada para guardarse. Elige una imagen más liviana.'
    );
  }

  return dataUrl;
}

function canUseAsAuthPhotoUrl(photoUrl) {
  return typeof photoUrl === 'string' && /^https?:\/\//i.test(photoUrl);
}

function buildUserProfile({
  uid,
  nombre,
  identificacion,
  programa,
  ficha,
  rol,
  correo,
  fotoUrl,
  correoVerificado = false,
}) {
  return {
    uid,
    nombre,
    identificacion,
    programa,
    ficha,
    fichasAsignadas: [],
    rol,
    correo,
    fotoUrl,
    trimestreActual: null,
    correoVerificado,
    creadoEn: new Date(),
    actualizadoEn: new Date(),
  };
}

async function sincronizarCorreoVerificado(userRef, perfil, emailVerified) {
  if (perfil.correoVerificado === emailVerified) {
    return perfil;
  }

  const actualizadoEn = new Date();

  await updateDoc(userRef, {
    correoVerificado: emailVerified,
    actualizadoEn,
  });

  return {
    ...perfil,
    correoVerificado: emailVerified,
    actualizadoEn,
  };
}

async function completarRegistroUsuario(user, profileData, fotoUrl) {
  await updateProfile(user, {
    displayName: profileData.nombre,
    ...(canUseAsAuthPhotoUrl(fotoUrl) ? { photoURL: fotoUrl } : {}),
  });

  await setDoc(doc(db, USUARIOS_COLLECTION, user.uid), profileData);
}

async function resolverRolInicial() {
  try {
    const firstUserQuery = query(collection(db, USUARIOS_COLLECTION), limit(1));
    const snapshot = await getDocs(firstUserQuery);

    return snapshot.empty ? 'Administrador' : null;
  } catch {
    return null;
  }
}

async function restaurarPerfilAuthExistente(form, normalizedPrograma, normalizedFicha) {
  const {
    correo,
    contrasena,
    nombre,
    identificacion,
    fotoPerfilBase64,
    fotoPerfilMimeType,
  } = form;

  let cred;

  try {
    cred = await signInWithEmailAndPassword(auth, correo, contrasena);
  } catch {
    throw createFlowError(
      'auth/orphan-auth-account',
      'Ese correo ya existe en Authentication. Usa la misma contraseña anterior o elimina también la cuenta desde Firebase Auth.'
    );
  }

  try {
    const userRef = doc(db, USUARIOS_COLLECTION, cred.user.uid);
    const snapshot = await getDoc(userRef);

    if (snapshot.exists()) {
      throw createFlowError('auth/email-already-in-use', 'Ese correo ya tiene una cuenta en Biomind.');
    }

    const fotoUrl = await prepareProfilePhoto(fotoPerfilBase64, fotoPerfilMimeType);
    const rolInicial = await resolverRolInicial();
    const profileData = buildUserProfile({
      uid: cred.user.uid,
      nombre,
      identificacion,
      programa: normalizedPrograma,
      ficha: normalizedFicha,
      rol: rolInicial,
      correo,
      fotoUrl,
      correoVerificado: cred.user.emailVerified,
    });

    await completarRegistroUsuario(cred.user, profileData, fotoUrl);

    if (!cred.user.emailVerified) {
      await sendEmailVerification(cred.user);
    }

    return {
      correo,
      nombre,
      fotoUrl,
      rol: rolInicial,
    };
  } finally {
    try {
      await signOut(auth);
    } catch {
      // ignore sign-out failures after repairing the profile
    }
  }
}

export async function registrar(form) {
  const {
    correo,
    contrasena,
    nombre,
    identificacion,
    fotoPerfilBase64,
    fotoPerfilMimeType,
  } = form;
  const normalizedPrograma = null;
  const normalizedFicha = null;

  let cred;

  try {
    cred = await createUserWithEmailAndPassword(auth, correo, contrasena);
  } catch (error) {
    if (error?.code === 'auth/email-already-in-use') {
      return restaurarPerfilAuthExistente(form, normalizedPrograma, normalizedFicha);
    }

    throw error;
  }

  const userRef = doc(db, USUARIOS_COLLECTION, cred.user.uid);

  try {
    const fotoUrl = await prepareProfilePhoto(fotoPerfilBase64, fotoPerfilMimeType);
    const rolInicial = await resolverRolInicial();
    const profileData = buildUserProfile({
      uid: cred.user.uid,
      nombre,
      identificacion,
      programa: normalizedPrograma,
      ficha: normalizedFicha,
      rol: rolInicial,
      correo,
      fotoUrl,
    });

    await completarRegistroUsuario(cred.user, profileData, fotoUrl);
    await sendEmailVerification(cred.user);
    await signOut(auth);

    return {
      correo,
      nombre,
      fotoUrl,
      rol: rolInicial,
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
      'Tu cuenta aún no ha sido verificada.',
      { correo }
    );
  }

  const userRef = doc(db, USUARIOS_COLLECTION, cred.user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    await signOut(auth);
    throw createFlowError(
      'auth/profile-not-found',
      'Tu cuenta existe, pero aÃºn no tiene perfil en Biomind. Contacta al administrador.'
    );
  }

  const perfil = await sincronizarCorreoVerificado(
    userRef,
    snapshot.data(),
    cred.user.emailVerified
  );

  if (!String(perfil.rol || '').trim()) {
    await signOut(auth);
    throw createFlowError(
      'auth/role-not-assigned',
      'Tu cuenta estÃ¡ pendiente de asignaciÃ³n de rol por parte del administrador.'
    );
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
        'La cuenta ya fue verificada. Ahora solo debes iniciar sesión.'
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
  await sendPasswordResetEmail(auth, correo, {
    handleCodeInApp: false,
    url: `https://${auth.app.options.authDomain}`,
  });
}

export async function cerrarSesion() {
  await signOut(auth);
}

export async function actualizarPerfilUsuario(changes) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw createFlowError('auth/no-current-user', 'No hay una sesión activa para actualizar.');
  }

  const {
    nombre,
    programa,
    ficha,
    fotoPerfilBase64,
    fotoPerfilMimeType,
  } = changes;

  const userRef = doc(db, USUARIOS_COLLECTION, currentUser.uid);
  const nextPhotoUrl =
    typeof fotoPerfilBase64 === 'string'
      ? await prepareProfilePhoto(fotoPerfilBase64, fotoPerfilMimeType)
      : undefined;

  const profileUpdates = {
    actualizadoEn: new Date(),
  };

  if (typeof nombre === 'string') {
    profileUpdates.nombre = nombre.trim();
  }

  if (typeof programa !== 'undefined') {
    profileUpdates.programa = programa ? programa.trim() : null;
  }

  if (typeof ficha !== 'undefined') {
    profileUpdates.ficha = ficha ? ficha.trim() : null;
  }

  if (typeof nextPhotoUrl !== 'undefined') {
    profileUpdates.fotoUrl = nextPhotoUrl;
  }

  await updateProfile(currentUser, {
    displayName:
      typeof nombre === 'string' && nombre.trim()
        ? nombre.trim()
        : currentUser.displayName || null,
    ...(typeof nextPhotoUrl !== 'undefined' && canUseAsAuthPhotoUrl(nextPhotoUrl)
      ? { photoURL: nextPhotoUrl }
      : {}),
  });

  await updateDoc(userRef, profileUpdates);
  await reload(currentUser);

  const snapshot = await getDoc(userRef);
  return snapshot.exists() ? snapshot.data() : null;
}
