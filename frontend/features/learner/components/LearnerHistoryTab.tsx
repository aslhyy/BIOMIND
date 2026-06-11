import { useMemo, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  learnerBitacoras,
  learnerObservations,
  learnerProjects,
  learnerQuestionThreads,
  type LearnerBitacora,
} from '../data';
import { learnerPalette } from '@/features/learner/theme';
import { SectionHeading, StatusBadge } from '@/features/learner/components/LearnerUI';
import { LearnerSectionIntro } from './LearnerSectionIntro';

export function LearnerHistoryTab() {
  const [bitacoras, setBitacoras] = useState(learnerBitacoras);
  const [editingBitacoraId, setEditingBitacoraId] = useState('');
  const [draftTitle, setDraftTitle] = useState('Nueva bitácora manual');
  const [draftBody, setDraftBody] = useState('');
  const [draftImageLabel, setDraftImageLabel] = useState('Foto_cultivo_semana_5.jpg');
  const activeProject = learnerProjects[0];

  const editingBitacora = useMemo(
    () => bitacoras.find((entry) => entry.id === editingBitacoraId) || null,
    [bitacoras, editingBitacoraId]
  );

  const handleCreateBitacora = () => {
    const newBitacora: LearnerBitacora = {
      id: `bit-${Date.now()}`,
      projectId: activeProject.id,
      title: draftTitle || 'Nueva bitácora manual',
      detail: draftBody || 'Bitácora pendiente de completar.',
      date: 'Hoy',
      images: draftImageLabel ? 1 : 0,
      status: 'Borrador',
    };

    setBitacoras((current) => [newBitacora, ...current]);
    setEditingBitacoraId(newBitacora.id);
  };

  const handleUpdateBitacora = () => {
    if (!editingBitacora) {
      return;
    }

    setBitacoras((current) =>
      current.map((entry) =>
        entry.id === editingBitacora.id
          ? {
            ...entry,
            title: draftTitle || entry.title,
            detail: draftBody || entry.detail,
            images: draftImageLabel ? 1 : entry.images,
          }
          : entry
      )
    );
  };

  const handleDeleteBitacora = () => {
    if (!editingBitacora) {
      return;
    }

    const nextEntries = bitacoras.filter((entry) => entry.id !== editingBitacora.id);
    setBitacoras(nextEntries);
    setEditingBitacoraId(nextEntries[0]?.id || '');
  };

  return (
    <>
      <LearnerSectionIntro
        label="Bitácora y evidencias"
        text="Escribe avances manuales, adjunta referencias de imagen y revisa las observaciones que deja el instructor."
        title="Registros, avances y observaciones."
      />

      <View style={styles.editorCard}>
        <SectionHeading
          actionLabel=" "
          subtitle="Crea o edita bitácoras manuales para luego compartir con tu instructor."
          title="Crear o editar bitácora manual"
        />
        <Field label="Titulo" value={draftTitle} onChangeText={setDraftTitle} />
        <Field label="Referencia de imagen" value={draftImageLabel} onChangeText={setDraftImageLabel} />
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Contenido</Text>
          <TextInput
            multiline
            onChangeText={setDraftBody}
            placeholder="Escribe aquí la bitácora manual del proyecto..."
            placeholderTextColor="#97AEA7"
            style={styles.textArea}
            value={draftBody}
          />
        </View>

        <View style={styles.actionRow}>
          <ActionPill label="Crear" onPress={handleCreateBitacora} tone="primary" />
          <ActionPill label="Editar" onPress={handleUpdateBitacora} />
          <ActionPill label="Eliminar" onPress={handleDeleteBitacora} tone="danger" />
        </View>
      </View>

      <SectionHeading
        actionLabel="Historial"
        subtitle="Bitácoras guardadas, listas para conectarse al backend."
        title="Registros del proyecto"
      />

      <View style={styles.stack}>
        {bitacoras.map((entry) => (
          <Pressable key={entry.id} onPress={() => setEditingBitacoraId(entry.id)} style={styles.card}>
            <View style={[styles.cardInner, entry.id === editingBitacoraId && styles.cardInnerActive]}>
              <View style={styles.header}>
                <View style={styles.copy}>
                  <Text style={styles.title}>{entry.title}</Text>
                  <Text style={styles.date}>{entry.date}</Text>
                </View>
                <StatusBadge
                  accent={
                    entry.status === 'Aprobada'
                      ? learnerPalette.aqua
                      : entry.status === 'Enviada'
                        ? learnerPalette.progress
                        : '#EAA189'
                  }
                  label={entry.status}
                  soft={
                    entry.status === 'Aprobada'
                      ? '#EAFBF7'
                      : entry.status === 'Enviada'
                        ? '#E7F8E6'
                        : '#FFF1EB'
                  }
                />
              </View>
              <Text style={styles.detail}>{entry.detail}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.imageMeta}>{entry.images} imagen(es) adjuntas</Text>
                <View style={styles.entryActions}>
                  <Pressable
                    accessibilityLabel="Editar bitacora"
                    onPress={() => {
                      setEditingBitacoraId(entry.id);
                      setDraftTitle(entry.title);
                      setDraftBody(entry.detail);
                    }}
                    style={[styles.entryActionButton, styles.entryEditButton]}>
                    <MaterialCommunityIcons name="pencil-outline" size={19} color="#D5D5D5" />
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Eliminar bitacora"
                    onPress={() => {
                      const nextEntries = bitacoras.filter((item) => item.id !== entry.id);
                      setBitacoras(nextEntries);
                      setEditingBitacoraId(nextEntries[0]?.id || '');
                    }}
                    style={[styles.entryActionButton, styles.entryDeleteButton]}>
                    <MaterialCommunityIcons name="trash-can-outline" size={19} color="#F09C84" />
                  </Pressable>
                </View>
              </View>
            </View>
          </Pressable>
        ))}
      </View>

      <SectionHeading
        actionLabel="Notas"
        subtitle="Observaciones generales y comentarios del instructor."
        title="Observaciones generales"
      />

      <View style={styles.stack}>
        {learnerObservations.map((observation) => (
          <View key={observation.id} style={styles.cardInner}>
            <View style={styles.header}>
              <View style={styles.copy}>
                <Text style={styles.title}>{observation.title}</Text>
                <Text style={styles.date}>{observation.date}</Text>
              </View>
              <StatusBadge
                accent={observation.status === 'Aprobado' ? learnerPalette.aqua : '#EAA189'}
                label={observation.status}
                soft={observation.status === 'Aprobado' ? '#EAFBF7' : '#FFF1EB'}
              />
            </View>
            <Text style={styles.detail}>{observation.detail}</Text>
          </View>
        ))}
      </View>

      <View style={styles.qaCard}>

        <View style={styles.stack}>

          <SectionHeading
            actionLabel="Q&A"
            subtitle="Preguntas y respuestas directas entre instructor y aprendiz."
            title="Dudas respondidas"
          />

          {learnerQuestionThreads.map((thread) => (
            <View key={thread.id}>
              <Text style={styles.qaInstructor}>{thread.instructor}</Text>
              <View style={styles.qaqa}>
                <Text style={styles.qaLabel}>Pregunta</Text>
                <Text style={styles.qaText}>{thread.question}</Text>
                <View style={styles.qaSeparator} />
                <Text style={styles.qaLabel}>Respuesta</Text>
                <Text style={styles.qaAnswer}>{thread.answer}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </>
  );
}

function Field({
  label,
  onChangeText,
  value,
}: {
  label: string;
  onChangeText: (value: string) => void;
  value: string;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.fieldBlock}>
      <Text style={[styles.fieldLabel, isFocused && { color: learnerPalette.primary }]}>{label}</Text>
      <TextInput
        onChangeText={onChangeText}
        onBlur={() => setIsFocused(false)}
        onFocus={() => setIsFocused(true)}
        placeholderTextColor="#97AEA7"
        style={[styles.fieldInput, isFocused && styles.fieldInputActive]}
        value={value}
      />
    </View>
  );
}

function ActionPill({
  label,
  onPress,
  tone = 'default',
}: {
  label: string;
  onPress: () => void;
  tone?: 'default' | 'primary' | 'danger';
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.actionPill,
        tone === 'primary' && styles.actionPillPrimary,
        tone === 'danger' && styles.actionPillDanger,
      ]}>
      <Text
        style={[
          styles.actionPillText,
          tone === 'primary' && styles.actionPillTextPrimary,
          tone === 'danger' && styles.actionPillTextDanger,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  editorCard: {
    backgroundColor: learnerPalette.surface,
    paddingHorizontal: 37,
    paddingVertical: 20,
    marginHorizontal: -30,
    shadowColor: learnerPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 8,
    marginBottom: 20,
  },
  fieldBlock: {
    gap: 9,
  },
  fieldLabel: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
    marginTop: 6,
  },
  fieldInput: {
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#d2d2d2',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: learnerPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    backgroundColor: '#fbfbfb',
    shadowColor: learnerPalette.text,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },
  fieldInputActive: {
    borderColor: learnerPalette.secondary,
    backgroundColor: '#FFFFFF',
    shadowColor: learnerPalette.primary,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },
  textArea: {
    minHeight: 120,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#d2d2d2',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: learnerPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    backgroundColor: '#fbfbfb',
    shadowColor: learnerPalette.text,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  actionPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: learnerPalette.surfaceMuted,
  },
  actionPillPrimary: {
    backgroundColor: learnerPalette.progress,
  },
  actionPillDanger: {
    backgroundColor: '#FFF1EB',
  },
  actionPillText: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  actionPillTextPrimary: {
    color: '#FFFFFF',
  },
  actionPillTextDanger: {
    color: '#C97B63',
  },
  stack: {
    gap: 15,
  },
  card: {
    borderRadius: 24,
  },
  cardInner: {
    backgroundColor: learnerPalette.surface,
    borderRadius: 24,
    padding: 16,
    shadowColor: learnerPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 10,
  },
  cardInnerActive: {
    borderWidth: 1,
    borderColor: learnerPalette.secondary,
    backgroundColor: '#FCFFFE',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: learnerPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
  },
  date: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
  },
  detail: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  imageMeta: {
    color: learnerPalette.greenText,
    fontFamily: 'PoppinsMedium',
    fontSize: 11,
  },
  cardFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  entryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  entryActionButton: {
    alignItems: 'center',
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  entryEditButton: {
    backgroundColor: '#F5F5F5',
  },
  entryDeleteButton: {
    backgroundColor: '#FFE4DA',
  },
  qaCard: {
    backgroundColor: learnerPalette.surface,
    paddingHorizontal: 37,
    paddingVertical: 20,
    marginHorizontal: -30,
    shadowColor: learnerPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 8,
    marginBottom: 20,
  },
  qaInstructor: {
    color: learnerPalette.dark,
    fontFamily: 'PoppinsRegular',
    fontSize: 15,
    marginBottom: 8,
    marginTop: 12,
  },
  qaLabel: {
    color: learnerPalette.greenText,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  qaText: {
    color: learnerPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
    maxWidth: 300,
  },
  qaAnswer: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
    maxWidth: 300,
  },

  qaSeparator: {
    height: 1,
    backgroundColor: '#D3E7DF',
    borderRadius: 1,
    marginVertical: 5,
  },
  qaqa: {
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 20,
    backgroundColor: learnerPalette.mint,
    borderRadius: 30,
    marginTop: 10,
    shadowColor: learnerPalette.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  }
});
