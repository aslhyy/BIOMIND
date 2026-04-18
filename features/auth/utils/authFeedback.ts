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
      'La contrasena debe tener minimo 8 caracteres, una mayuscula, una minuscula y un numero.',
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
    case 'auth/invalid-email':
      return {
        variant: 'warning',
        title: 'Correo invalido',
        message: 'Escribe un correo con formato valido para continuar.',
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
        title: 'Contrasena insegura',
        message:
          'La contrasena debe tener minimo 8 caracteres, una mayuscula, una minuscula y un numero.',
      };
    case 'auth/invalid-credential':
      return {
        variant: 'error',
        title: 'Credenciales incorrectas',
        message: 'El correo o la contrasena no coinciden.',
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
        message: 'No encontramos la informacion del usuario en la base de datos.',
      };
    case 'auth/email-not-verified':
      return {
        variant: 'info',
        title: 'Verifica tu correo',
        message:
          'Tu cuenta aun no ha sido verificada. Revisa el enlace que te enviamos y luego intenta iniciar sesion otra vez.',
      };
    case 'auth/already-verified':
      return {
        variant: 'info',
        title: 'Cuenta verificada',
        message: 'Tu correo ya fue verificado. Ahora puedes iniciar sesion.',
      };
    case 'auth/network-request-failed':
      return {
        variant: 'error',
        title: 'Sin conexion',
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
          'Firebase esta bloqueando esta accion. Debes ajustar las reglas de Firestore para permitir crear y leer los documentos de la coleccion `usuarios`.',
      };
    case 'auth/operation-not-allowed':
      return {
        variant: 'error',
        title: 'Operacion no permitida',
        message:
          'Esta opcion no esta habilitada en Firebase. Revisa Authentication y las reglas de tu proyecto.',
      };
    case 'storage/photo-too-large':
      return {
        variant: 'warning',
        title: 'Foto muy pesada',
        message: 'La imagen elegida ocupa demasiado. Prueba con una foto mas liviana.',
      };
    default:
      if (rawMessage.includes('missing or insufficient permissions')) {
        return {
          variant: 'error',
          title: 'Permisos insuficientes',
          message:
            'Firebase no tiene permisos para completar esta accion. Lo mas probable es que falten reglas en Firestore para la coleccion `usuarios`.',
        };
      }

      return {
        variant: 'error',
        title: 'Algo salio mal',
        message: error?.message || 'No pudimos completar la accion. Intenta nuevamente.',
      };
  }
}
