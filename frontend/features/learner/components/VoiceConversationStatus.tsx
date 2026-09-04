import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { learnerPalette } from '@/features/learner/theme';
import type { VoiceConversationStatus as Status } from '@/hooks/useVoiceConversation';

type Props = {
  error?: string;
  isActive: boolean;
  partialTranscript?: string;
  pendingConfirmation?: string;
  status: Status;
};

const statusCopy: Record<Status, string> = {
  confirming: 'Confirma antes de enviar',
  error: 'Ocurrió un error',
  idle: 'Listo para conversar',
  listening: 'Escuchando...',
  processing: 'Procesando tu mensaje...',
  'requesting-permission': 'Solicitando permisos...',
  speaking: 'La IA está hablando...',
  'waiting-ai': 'Esperando respuesta...',
};

export function VoiceConversationStatus({ error, isActive, partialTranscript, pendingConfirmation, status }: Props) {
  const iconName = status === 'speaking'
    ? 'volume-high'
    : status === 'listening'
      ? 'microphone'
      : status === 'error'
        ? 'alert-circle-outline'
        : 'dots-horizontal-circle-outline';

  return (
    <View style={[
      styles.card,
      isActive && styles.cardActive,
      status === 'listening' && styles.cardListening,
      (status === 'processing' || status === 'waiting-ai') && styles.cardProcessing,
      status === 'speaking' && styles.cardSpeaking,
      status === 'error' && styles.cardError,
    ]}>
      <View style={styles.statusRow}>
        <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
          <MaterialCommunityIcons name={iconName} size={18} color={isActive ? '#FFFFFF' : learnerPalette.primary} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{statusCopy[status]}</Text>
          <Text style={styles.text}>
            {isActive
              ? pendingConfirmation
                ? 'Di “sí” para enviar o “no” para volver a dictar el mensaje.'
                : 'Habla con naturalidad. La sesión seguirá activa hasta que la finalices.'
              : 'Toca iniciar para comenzar una sesión de laboratorio.'}
          </Text>
        </View>
      </View>

      {partialTranscript || pendingConfirmation ? (
        <Text style={styles.partialText}>
          {partialTranscript || `Pendiente: “${pendingConfirmation}”`}
        </Text>
      ) : null}

      {status === 'error' && error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: learnerPalette.surface,
    borderColor: learnerPalette.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  cardActive: {
    backgroundColor: learnerPalette.mint,
    borderColor: learnerPalette.primary,
  },
  cardListening: {
    backgroundColor: '#EAF8F1',
    borderColor: '#62A982',
  },
  cardProcessing: {
    backgroundColor: '#FFF7DE',
    borderColor: '#D7A93E',
  },
  cardSpeaking: {
    backgroundColor: '#E9F2FF',
    borderColor: '#5D8FC9',
  },
  cardError: {
    backgroundColor: '#FFF0F2',
    borderColor: '#B84A62',
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: learnerPalette.mint,
    borderRadius: 999,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  iconWrapActive: {
    backgroundColor: learnerPalette.primary,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: learnerPalette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  text: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 16,
  },
  partialText: {
    backgroundColor: learnerPalette.surface,
    borderRadius: 14,
    color: learnerPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
    padding: 11,
  },
  errorText: {
    color: '#B84A62',
    fontFamily: 'PoppinsMedium',
    fontSize: 11,
    lineHeight: 16,
  },
});
