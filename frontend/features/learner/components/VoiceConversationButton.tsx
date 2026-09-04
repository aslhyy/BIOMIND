import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';
import { learnerPalette } from '@/features/learner/theme';
import type { VoiceConversationStatus } from '@/hooks/useVoiceConversation';

type Props = {
  disabled?: boolean;
  isActive: boolean;
  onPress: () => void;
  status: VoiceConversationStatus;
};

export function VoiceConversationButton({ disabled = false, isActive, onPress, status }: Props) {
  const busy = status === 'requesting-permission' || status === 'processing' || status === 'waiting-ai';
  const blocked = disabled || (!isActive && busy);
  const label = isActive ? 'Finalizar Manos Libres' : 'Iniciar Manos Libres';

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={blocked}
      onPress={onPress}
      style={[styles.button, isActive && styles.buttonActive, blocked && styles.buttonDisabled]}>
      <MaterialCommunityIcons
        name={isActive ? 'phone-hangup' : 'microphone-message'}
        size={20}
        color="#FFFFFF"
      />
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: learnerPalette.primary,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
  },
  buttonActive: {
    backgroundColor: '#B84A62',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
});
