import type { ShowAuthAlertInput } from '../types';

export function validatePassword(password: string) {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);

  const isValid = hasMinLength && hasUppercase && hasLowercase && hasNumber;

  return {
    isValid,
    message:
      'La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número.',
  };
}

export function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function mapAuthErrorToAlert(error: any): ShowAuthAlertInput {
  const rawMessage = String(error?.message || '').toLowerCase();

  switch (error?.code) {
    case 'auth/email-already-in-use':
      return {
        variant: 'warning',
        title: 'Correo ya registrado',
        message: 'Ese correo ya tiene una cuenta en Biomind.',
      };
    case 'auth/orphan-auth-account':
      return {
        variant: 'warning',
        title: 'Correo aún en Auth',
        message:
          'Ese correo fue borrado de Firestore, pero sigue existiendo en Firebase Auth. Usa la contraseña anterior o elimina también la cuenta desde Authentication.',
      };
    case 'auth/invalid-email':
      return {
        variant: 'warning',
        title: 'Correo inválido',
        message: 'Escribe un correo con formato válido para continuar.',
      };
    case 'auth/missing-email':
      return {
        variant: 'warning',
        title: 'Falta el correo',
        message: 'Escribe tu correo para poder continuar.',
      };
    case 'auth/weak-password':
      return {
        variant: 'warning',
        title: 'Contraseña insegura',
        message:
          'La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número.',
      };
    case 'auth/invalid-credential':
      return {
        variant: 'error',
        title: 'Credenciales incorrectas',
        message: 'El correo o la contraseña no coinciden.',
      };
    case 'auth/user-not-found':
      return {
        variant: 'warning',
        title: 'Cuenta no encontrada',
        message: 'No existe una cuenta con ese correo.',
      };
    case 'auth/profile-not-found':
      return {
        variant: 'error',
        title: 'Perfil no encontrado',
        message: 'No encontramos la información del usuario en la base de datos.',
      };
    case 'auth/role-not-assigned':
      return {
        variant: 'info',
        title: 'Rol pendiente',
        message:
          'Tu cuenta está activa, pero aún no tiene un rol asignado. Espera la asignación del administrador para ingresar.',
      };
    case 'auth/email-not-verified':
      return {
        variant: 'info',
        title: 'Verifica tu correo',
        message:
          'Tu cuenta aún no ha sido verificada. Revisa el enlace que te enviamos y luego intenta iniciar sesión otra vez.',
      };
    case 'auth/verification-email-not-sent':
      return {
        variant: 'warning',
        title: 'Cuenta creada',
        message:
          'La cuenta se guardó, pero no pudimos enviar el correo. Inicia sesión y toca Reenviar correo de verificación.',
      };
    case 'auth/already-verified':
      return {
        variant: 'info',
        title: 'Cuenta verificada',
        message: 'Tu correo ya fue verificado. Ahora puedes iniciar sesión.',
      };
    case 'auth/network-request-failed':
      return {
        variant: 'error',
        title: 'Sin conexión',
        message: 'Revisa tu internet e intenta nuevamente.',
      };
    case 'auth/too-many-requests':
      return {
        variant: 'warning',
        title: 'Demasiados intentos',
        message: 'Espera un momento antes de volver a intentarlo.',
      };
    case 'permission-denied':
    case 'firestore/permission-denied':
      return {
        variant: 'error',
        title: 'Permisos insuficientes',
        message:
          'Firebase está bloqueando esta acción. Debes ajustar las reglas de Firestore para permitir crear y leer los documentos de la colección `usuarios`.',
      };
    case 'auth/operation-not-allowed':
      return {
        variant: 'error',
        title: 'Operación no permitida',
        message:
          'Esta opción no está habilitada en Firebase. Revisa Authentication y las reglas de tu proyecto.',
      };
    case 'storage/photo-too-large':
      return {
        variant: 'warning',
        title: 'Foto muy pesada',
        message: 'La imagen elegida ocupa demasiado. Prueba con una foto más liviana.',
      };
    default:
      if (rawMessage.includes('missing or insufficient permissions')) {
        return {
          variant: 'error',
          title: 'Permisos insuficientes',
          message:
            'Firebase no tiene permisos para completar esta acción. Lo más probable es que falten reglas en Firestore para la colección `usuarios`.',
        };
      }

      return {
        variant: 'error',
        title: 'Algo salió mal',
        message: error?.message || 'No pudimos completar la acción. Intenta nuevamente.',
      };
  }
}
