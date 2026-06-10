import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { iniciarSesion, reenviarCorreoVerificacion } from '../../../services/auth';
import { verifyStyles } from '../styles/verifyForm.styles';
import type { VerifyEmailFormProps } from '../types';
import { mapAuthErrorToAlert } from '../utils/authFeedback';

const VERIFY_STEPS = [
  'Abre el correo que te enviamos desde Firebase Authentication.',
  'Pulsa el enlace para confirmar tu cuenta.',
  'Vuelve a Biomind y toca el botón para entrar.',
];

export function VerifyEmailForm({
  pendingVerification,
  onBack,
  onAuthenticated,
  onReadyToLogin,
  showAlert,
}: VerifyEmailFormProps) {
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);

  const canResend = useMemo(
    () => Boolean(pendingVerification?.correo && pendingVerification?.contrasena),
    [pendingVerification?.contrasena, pendingVerification?.correo]
  );

  const handleVerifiedLogin = async () => {
    if (!pendingVerification?.correo || !pendingVerification?.contrasena) {
      onBack();
      return;
    }

    setChecking(true);

    try {
      await iniciarSesion(pendingVerification.correo, pendingVerification.contrasena);
      showAlert({
        variant: 'success',
        title: 'Correo verificado',
        message: 'Tu perfil ya está listo.',
      });
      onAuthenticated();
    } catch (error: any) {
      if (error?.code === 'auth/email-not-verified') {
        showAlert({
          variant: 'warning',
          title: 'Aún falta verificar',
          message: 'Abre el enlace del correo y vuelve a tocar este botón.',
        });
        return;
      }

      showAlert(mapAuthErrorToAlert(error));
      onReadyToLogin(pendingVerification.correo);
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    if (!pendingVerification?.correo || !pendingVerification?.contrasena) {
      showAlert({
        variant: 'warning',
        title: 'Vuelve a iniciar sesión',
        message:
          'Para reenviar el correo de verificación necesitamos que ingreses otra vez con tu correo y contraseña.',
      });
      onBack();
      return;
    }

    setResending(true);

    try {
      await reenviarCorreoVerificacion(
        pendingVerification.correo,
        pendingVerification.contrasena
      );
      showAlert({
        variant: 'success',
        title: 'Correo reenviado',
        message:
          'Te enviamos un nuevo enlace de verificación. Revisa tu bandeja principal y también spam.',
      });
    } catch (error) {
      showAlert(mapAuthErrorToAlert(error));
    } finally {
      setResending(false);
    }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack} style={verifyStyles.backRow}>
        <Ionicons name="arrow-back-outline" size={20} color="#2FC4B1" />
        <Text style={verifyStyles.backText}>Volver</Text>
      </Pressable>

      <Text style={verifyStyles.title}>VERIFICA TU CORREO</Text>
      <Text style={verifyStyles.subtitle}>
        Tu cuenta todavía no está confirmada. Biomind ahora usa el correo de verificación gratuito
        de Firebase, así que solo necesitas abrir el enlace que llegó a tu correo.
      </Text>

      <View style={verifyStyles.emailPill}>
        <Ionicons name="mail-outline" size={16} color="#117C72" />
        <Text style={verifyStyles.emailText}>{pendingVerification?.correo || 'Sin correo'}</Text>
      </View>

      <View style={verifyStyles.stepsCard}>
        {VERIFY_STEPS.map((step, index) => (
          <View key={step} style={verifyStyles.stepRow}>
            <View style={verifyStyles.stepBadge}>
              <Text style={verifyStyles.stepBadgeText}>{index + 1}</Text>
            </View>
            <Text style={verifyStyles.stepText}>{step}</Text>
          </View>
        ))}
      </View>

      <Text style={verifyStyles.helperText}>
        Cuando ya lo hayas hecho, vuelve a Biomind y entra desde aquí. Si no encuentras el correo,
        puedes reenviarlo desde aquí.
      </Text>

      <TouchableOpacity
        style={verifyStyles.primaryButton}
        onPress={handleVerifiedLogin}
        activeOpacity={0.85}
        disabled={checking || resending}>
        {checking ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Ionicons name="log-in-outline" size={20} color="white" />
            <Text style={verifyStyles.primaryButtonText}>Ya verifiqué, entrar</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          verifyStyles.secondaryButton,
          !canResend && verifyStyles.secondaryButtonDisabled,
        ]}
        onPress={handleResend}
        activeOpacity={0.85}
        disabled={!canResend || resending || checking}>
        {resending ? (
          <ActivityIndicator color="#117C72" />
        ) : (
          <>
            <Ionicons name="mail-unread-outline" size={18} color="#117C72" />
            <Text style={verifyStyles.secondaryButtonText}>Reenviar correo</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
