import {
  createUserWithEmailAndPassword,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  deleteField,
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

async function enviarCorreoVerificacionUsuario(user) {
  await reload(user);

  if (user.emailVerified) {
    return {
      alreadyVerified: true,
      email: user.email || null,
    };
  }

  // Refresh the token before requesting the email. This avoids stale sessions
  // after registration, profile updates, or a previous resend attempt.
  await user.getIdToken(true);
  await sendEmailVerification(user);

  return {
    alreadyVerified: false,
    email: user.email || null,
  };
}

function buildUserProfile({
  uid,
  nombre,
  identificacion,
  programaId,
  programa,
  fichaId = null,
  ficha = null,
  rol,
  correo,
  fotoUrl,
  correoVerificado = false,
}) {
  return {
    uid,
    nombre,
    identificacion,
    programaId,
    programa,
    fichaId,
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

async function guardarEstadoVerificacion(userRef, correoVerificado) {
  try {
    await updateDoc(userRef, {
      correoVerificado,
      correoVerificacionEnviadaEn: deleteField(),
      correoVerificacionConfirmadaEn: deleteField(),
      actualizadoEn: new Date(),
    });
  } catch {
    // Email delivery must not be reported as failed because Firestore rejected
    // this optional synchronization. Login will reconcile the value later.
  }
}

async function sincronizarCorreoVerificado(userRef, perfil, emailVerified) {
  const hasLegacyVerificationFields =
    'correoVerificacionEnviadaEn' in perfil || 'correoVerificacionConfirmadaEn' in perfil;

  if (perfil.correoVerificado === emailVerified && !hasLegacyVerificationFields) {
    return perfil;
  }

  const actualizadoEn = new Date();
  const updates = {
    correoVerificado: emailVerified,
    correoVerificacionEnviadaEn: deleteField(),
    correoVerificacionConfirmadaEn: deleteField(),
    actualizadoEn,
  };

  await updateDoc(userRef, updates);

  return {
    ...perfil,
    ...updates,
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

async function restaurarPerfilAuthExistente(form) {
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
      programaId: null,
      programa: null,
      fichaId: null,
      ficha: null,
      rol: rolInicial,
      correo,
      fotoUrl,
      correoVerificado: false,
    });

    await completarRegistroUsuario(cred.user, profileData, fotoUrl);

    const verificationDelivery = await enviarCorreoVerificacionUsuario(cred.user);
    await guardarEstadoVerificacion(userRef, verificationDelivery.alreadyVerified);

    return {
      correo,
      nombre,
      fotoUrl,
      rol: rolInicial,
      correoVerificacionEnviada: !verificationDelivery.alreadyVerified,
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
  let cred;
  let profileCreated = false;

  try {
    cred = await createUserWithEmailAndPassword(auth, correo, contrasena);
  } catch (error) {
    if (error?.code === 'auth/email-already-in-use') {
      return restaurarPerfilAuthExistente(form);
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
      programaId: null,
      programa: null,
      fichaId: null,
      ficha: null,
      rol: rolInicial,
      correo,
      fotoUrl,
    });

    await completarRegistroUsuario(cred.user, profileData, fotoUrl);
    profileCreated = true;
    const verificationDelivery = await enviarCorreoVerificacionUsuario(cred.user);
    await guardarEstadoVerificacion(userRef, verificationDelivery.alreadyVerified);

    try {
      await signOut(auth);
    } catch {
      // The verification request already succeeded; a sign-out failure must
      // not turn it into a false "email not sent" result.
    }

    return {
      correo,
      nombre,
      fotoUrl,
      rol: rolInicial,
      correoVerificacionEnviada: !verificationDelivery.alreadyVerified,
    };
  } catch (error) {
    if (profileCreated) {
      try {
        await signOut(auth);
      } catch {
        // Keep the account so verification can be resent.
      }

      if (error?.code) {
        error.correo = correo;
        throw error;
      }

      throw createFlowError(
        'auth/verification-email-not-sent',
        'La cuenta fue creada, pero Firebase no pudo enviar el correo. Inicia sesión y usa Reenviar correo.',
        { correo }
      );
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
    throw createFlowError(
      'auth/profile-not-found',
      'Tu cuenta existe, pero aun no tiene perfil en Biomind. Contacta al administrador.'
    );
  }

  const perfil = await sincronizarCorreoVerificado(
    userRef,
    snapshot.data(),
    cred.user.emailVerified
  );

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

    const verificationDelivery = await enviarCorreoVerificacionUsuario(cred.user);
    await guardarEstadoVerificacion(
      doc(db, USUARIOS_COLLECTION, cred.user.uid),
      verificationDelivery.alreadyVerified
    );

    return {
      correo: cred.user.email || correo,
      correoVerificacionEnviada: !verificationDelivery.alreadyVerified,
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
