import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AuthenticatedSession } from '@/features/workspace/types';
import { calcularTrimestreActual, escucharTrimestres } from '@/services/academic';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type Trimester = {
  id: string;
  numero?: number;
  fechaInicio?: string;
  fechaFin?: string;
  fichaNumero?: string;
  programaNombre?: string;
  estado?: string;
};

type CurrentTrimesterSummaryProps = {
  session: AuthenticatedSession;
  title?: string;
  colors: {
    accent: string;
    background: string;
    border?: string;
    iconBackground: string;
    text: string;
    muted: string;
  };
  icon?: IconName;
};

export function CurrentTrimesterSummary({
  colors,
  icon = 'calendar-check-outline',
  session,
  title = 'Trimestre actual',
}: CurrentTrimesterSummaryProps) {
  const [trimesters, setTrimesters] = useState<Trimester[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = escucharTrimestres(
      (nextTrimesters: Trimester[]) => {
        setTrimesters(nextTrimesters);
        setError('');
      },
      (nextError: any) => setError(nextError?.message || 'No pudimos cargar el trimestre actual.')
    );

    return unsubscribe;
  }, []);

  const assignedSheets = useMemo(() => {
    const values = [session.ficha, ...(session.fichasAsignadas || [])].filter(Boolean);
    return new Set(values.map(String));
  }, [session.ficha, session.fichasAsignadas]);

  const trimester = useMemo(() => {
    const scopedTrimesters = assignedSheets.size
      ? trimesters.filter((item) => item.fichaNumero && assignedSheets.has(String(item.fichaNumero)))
      : trimesters;

    return calcularTrimestreActual(scopedTrimesters);
  }, [assignedSheets, trimesters]);

  const fallbackLabel = session.trimestreActual || 'Pendiente de calendario';
  const mainLabel = trimester ? `Trimestre ${trimester.numero}` : fallbackLabel;
  const detail = trimester
    ? `Ficha ${trimester.fichaNumero || 'sin ficha'} - ${trimester.programaNombre || 'sin programa'}`
    : error || 'El administrador debe crear fechas para tu ficha.';
  const dates = trimester ? `${trimester.fechaInicio} a ${trimester.fechaFin}` : '';

  return (
    <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border || colors.iconBackground }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.iconBackground }]}>
        <MaterialCommunityIcons name={icon} size={20} color={colors.accent} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.label, { color: colors.accent }]}>{title}</Text>
        <Text style={[styles.title, { color: colors.text }]}>{mainLabel}</Text>
        <Text style={[styles.detail, { color: colors.muted }]}>{detail}</Text>
        {dates ? <Text style={[styles.detail, { color: colors.muted }]}>{dates}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 15,
    lineHeight: 20,
  },
  detail: {
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 17,
  },
});
