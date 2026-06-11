import type { AuthenticatedSession } from '@/features/workspace/types';
import { escucharContextoAcademicoUsuario } from '@/services/academic';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type RecordItem = { id: string; [key: string]: any };
type AcademicContext = {
  fichas: RecordItem[];
  asignaciones: RecordItem[];
  competencias: RecordItem[];
  resultados: RecordItem[];
  instructores: RecordItem[];
  aprendices: RecordItem[];
  pasantes: RecordItem[];
};

const emptyContext: AcademicContext = {
  fichas: [],
  asignaciones: [],
  competencias: [],
  resultados: [],
  instructores: [],
  aprendices: [],
  pasantes: [],
};

export function RealAcademicContext({ session }: { session: AuthenticatedSession }) {
  const [context, setContext] = useState<AcademicContext>(emptyContext);
  const [error, setError] = useState('');

  useEffect(() => {
    return escucharContextoAcademicoUsuario(
      session,
      (nextContext: AcademicContext) => {
        setContext(nextContext);
        setError('');
      },
      (nextError: any) => setError(nextError?.message || 'No pudimos cargar la información académica.')
    );
  }, [session.ficha, session.fichasAsignadas, session.role, session.uid]);

  if (error) {
    return <Text style={styles.error}>{error}</Text>;
  }

  if (!context.fichas.length) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.eyebrow}>INFORMACION ASIGNADA</Text>
      <Text style={styles.title}>Datos académicos reales</Text>

      {context.fichas.map((ficha) => {
        const assignments = context.asignaciones.filter((item) => item.fichaId === ficha.id);
        const instructors = context.instructores.filter((instructor) =>
          assignments.some((assignment) => assignment.instructorUid === instructor.id)
        );

        return (
          <View key={ficha.id} style={styles.card}>
            <View style={styles.header}>
              <View style={styles.icon}>
                <MaterialCommunityIcons name="school-outline" size={20} color="#279C8E" />
              </View>
              <View style={styles.copy}>
                <Text style={styles.cardTitle}>Ficha {ficha.numero || ficha.id}</Text>
                <Text style={styles.meta}>{ficha.programaNombre || session.programa || 'Programa pendiente'}</Text>
              </View>
              <Text style={styles.pill}>{ficha.trimestreActual || 'Sin trimestre'}</Text>
            </View>

            <InfoLine
              icon="account-school-outline"
              label="Instructor"
              value={instructors.map((item) => item.nombre || item.correo).filter(Boolean).join(', ') || 'Sin instructor asignado'}
            />
            {session.role.toLowerCase() !== 'aprendiz' ? (
              <InfoLine
                icon="account-group-outline"
                label="Aprendices"
                value={context.aprendices.filter((item) => item.fichaId === ficha.id).map((item) => item.nombre || item.correo).filter(Boolean).join(', ') || 'Sin aprendices asignados'}
              />
            ) : null}
            {session.role.toLowerCase() === 'instructor' ? (
              <InfoLine
                icon="account-tie-outline"
                label="Pasantes"
                value={context.pasantes.map((item) => item.nombre || item.correo).filter(Boolean).join(', ') || 'Sin pasantes asignados'}
              />
            ) : null}

            {assignments.map((assignment) => {
              const competence = context.competencias.find((item) => item.id === assignment.competenciaId);
              const results = context.resultados.filter((item) => item.competenciaId === assignment.competenciaId);

              return (
                <View key={assignment.id} style={styles.competence}>
                  <Text style={styles.competenceTitle}>
                    {competence?.codigo || 'COMP'} - {competence?.nombre || 'Competencia'}
                  </Text>
                  {results.map((result) => (
                    <Text key={result.id} style={styles.result}>
                      {result.codigo || 'RAP'}: {result.descripcion}
                    </Text>
                  ))}
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

export function useAssignedSheetLabels(session: AuthenticatedSession) {
  const [labels, setLabels] = useState<string[]>([]);

  useEffect(() => {
    return escucharContextoAcademicoUsuario(
      session,
      (nextContext: AcademicContext) => {
        setLabels(
          nextContext.fichas.map((ficha) =>
            `Ficha ${ficha.numero || ficha.id}${ficha.trimestreActual ? ` - ${ficha.trimestreActual}` : ''}`
          )
        );
      },
      () => setLabels([])
    );
  }, [session.ficha, session.fichasAsignadas, session.role, session.uid]);

  return labels;
}

function InfoLine({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <MaterialCommunityIcons name={icon} size={17} color="#71B7A4" />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  eyebrow: { color: '#E79273', fontFamily: 'PoppinsSemiBold', fontSize: 10 },
  title: { color: '#304B3A', fontFamily: 'SulphurPointBold', fontSize: 23 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, gap: 11, padding: 15 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  icon: { alignItems: 'center', backgroundColor: '#DDF7F1', borderRadius: 14, height: 38, justifyContent: 'center', width: 38 },
  copy: { flex: 1 },
  cardTitle: { color: '#304B3A', fontFamily: 'PoppinsSemiBold', fontSize: 14 },
  meta: { color: '#8FA59A', fontFamily: 'PoppinsRegular', fontSize: 10 },
  pill: { backgroundColor: '#E8F8DF', borderRadius: 999, color: '#65AB72', fontFamily: 'PoppinsSemiBold', fontSize: 9, paddingHorizontal: 9, paddingVertical: 5 },
  infoLine: { alignItems: 'flex-start', flexDirection: 'row', gap: 7 },
  infoLabel: { color: '#7D9589', fontFamily: 'PoppinsSemiBold', fontSize: 10 },
  infoValue: { color: '#536B5D', flex: 1, fontFamily: 'PoppinsRegular', fontSize: 10 },
  competence: { backgroundColor: '#F5FAF7', borderRadius: 12, gap: 5, padding: 11 },
  competenceTitle: { color: '#279C8E', fontFamily: 'PoppinsSemiBold', fontSize: 11 },
  result: { color: '#6E8378', fontFamily: 'PoppinsRegular', fontSize: 9, lineHeight: 14 },
  error: { color: '#D36B58', fontFamily: 'PoppinsRegular', fontSize: 11 },
});
