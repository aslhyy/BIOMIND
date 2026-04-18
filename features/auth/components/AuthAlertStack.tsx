import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { authAlertStyles } from '../styles/authAlert.styles';
import type { AuthAlert } from '../types';

const ALERT_THEME = {
  success: {
    backgroundColor: '#F1FCF7',
    borderColor: '#CBEFDE',
    shadowColor: '#86D8B3',
    iconColor: '#25956A',
    iconTint: '#DDF6EA',
    titleColor: '#1D8058',
    messageColor: '#4F7667',
    iconName: 'checkmark-circle-outline' as const,
  },
  warning: {
    backgroundColor: '#FFF7E9',
    borderColor: '#F3D89D',
    shadowColor: '#E5C270',
    iconColor: '#AE7B1F',
    iconTint: '#FCECC8',
    titleColor: '#94681A',
    messageColor: '#8E7441',
    iconName: 'warning-outline' as const,
  },
  info: {
    backgroundColor: '#ECF4FF',
    borderColor: '#C9DAFF',
    shadowColor: '#9CB8FF',
    iconColor: '#4E79D8',
    iconTint: '#DCE7FF',
    titleColor: '#4869BA',
    messageColor: '#5A74A8',
    iconName: 'information-circle-outline' as const,
  },
  error: {
    backgroundColor: '#FFF0E8',
    borderColor: '#F4C6B4',
    shadowColor: '#E6A791',
    iconColor: '#CC5B3F',
    iconTint: '#FFE3D8',
    titleColor: '#BA4B2F',
    messageColor: '#946255',
    iconName: 'alert-circle-outline' as const,
  },
};

interface AuthAlertStackProps {
  alerts: AuthAlert[];
  onDismiss: (id: string) => void;
}

export function AuthAlertStack({ alerts, onDismiss }: AuthAlertStackProps) {
  if (!alerts.length) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={authAlertStyles.stack}>
      {alerts.map((alert) => {
        const theme = ALERT_THEME[alert.variant];

        return (
          <View
            key={alert.id}
            style={[
              authAlertStyles.card,
              {
                backgroundColor: theme.backgroundColor,
                borderColor: theme.borderColor,
                shadowColor: theme.shadowColor,
              },
            ]}>
            <View style={[authAlertStyles.glow, { backgroundColor: theme.iconTint }]} />
            <View style={authAlertStyles.row}>
              <View style={[authAlertStyles.iconWrap, { backgroundColor: theme.iconTint }]}>
                <Ionicons name={theme.iconName} size={26} color={theme.iconColor} />
              </View>

              <View style={authAlertStyles.content}>
                <Text style={[authAlertStyles.title, { color: theme.titleColor }]}>{alert.title}</Text>
                <Text style={[authAlertStyles.message, { color: theme.messageColor }]}>{alert.message}</Text>
              </View>

              <TouchableOpacity
                onPress={() => onDismiss(alert.id)}
                style={[authAlertStyles.closeButton, { backgroundColor: theme.iconTint }]}>
                <Ionicons name="close" size={22} color={theme.iconColor} />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
}
