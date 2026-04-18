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
import { reenviarCorreoVerificacion } from '../../../services/auth';
import { verifyStyles } from '../styles/verifyForm.styles';
import type { VerifyEmailFormProps } from '../types';
import { mapAuthErrorToAlert } from '../utils/authFeedback';

const VERIFY_STEPS = [
  'Abre el correo que te enviamos desde Firebase Authentication.',
  'Pulsa el enlace para confirmar tu cuenta.',
  'Vuelve a Biomind e inicia sesion con tu correo y contrasena.',
];

export function VerifyEmailForm({
  pendingVerification,
  onBack,
  onReadyToLogin,
  showAlert,
}: VerifyEmailFormProps) {
  const [resending, setResending] = useState(false);

  const canResend = useMemo(
    () => Boolean(pendingVerification?.correo && pendingVerification?.contrasena),
    [pendingVerification?.contrasena, pendingVerification?.correo]
  );

  const handleReturnToLogin = () => {
    if (!pendingVerification?.correo) {
      onBack();
      return;
    }

    showAlert({
      variant: 'info',
      title: 'Listo para entrar',
      message: 'Si ya abriste el enlace, vuelve a iniciar sesion para continuar.',
    });
    onReadyToLogin(pendingVerification.correo);
  };

  const handleResend = async () => {
    if (!pendingVerification?.correo || !pendingVerification?.contrasena) {
      showAlert({
        variant: 'warning',
        title: 'Vuelve a iniciar sesion',
        message:
          'Para reenviar el correo de verificacion necesitamos que ingreses otra vez con tu correo y contrasena.',
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
          'Te enviamos un nuevo enlace de verificacion. Revisa tu bandeja principal y tambien spam.',
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
        Tu cuenta todavia no esta confirmada. Biomind ahora usa el correo de verificacion gratuito
        de Firebase, asi que solo necesitas abrir el enlace que llego a tu correo.
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
        Cuando ya lo hayas hecho, vuelve al inicio de sesion. Si no encuentras el correo, puedes
        reenviarlo desde aqui.
      </Text>

      <TouchableOpacity
        style={verifyStyles.primaryButton}
        onPress={handleReturnToLogin}
        activeOpacity={0.85}>
        <Ionicons name="log-in-outline" size={20} color="white" />
        <Text style={verifyStyles.primaryButtonText}>Volver al inicio de sesion</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          verifyStyles.secondaryButton,
          !canResend && verifyStyles.secondaryButtonDisabled,
        ]}
        onPress={handleResend}
        activeOpacity={0.85}
        disabled={!canResend || resending}>
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
