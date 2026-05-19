import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { assistantPrompts, type AssistantPrompt } from '../data';
import { instructorPalette } from '../theme';
import { SectionHeading } from './InstructorUI';

export function InstructorAssistantTab({
  assistantDraft,
  onDraftChange,
  onSelectPrompt,
  selectedPromptId,
}: {
  assistantDraft: string;
  onDraftChange: (value: string) => void;
  onSelectPrompt: (prompt: AssistantPrompt) => void;
  selectedPromptId: string;
}) {
  return (
    <>
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Asistente dual</Text>
        <Text style={styles.heroTitle}>Apoyo rápido para instructor y laboratorio.</Text>
        <Text style={styles.heroText}>
          Resuelve dudas, analiza datos y genera retroalimentacion sin cambiar de contexto.
        </Text>
      </View>

      <SectionHeading
        actionLabel="Prompts"
        subtitle="Atajos listos para orientar tus consultas."
        title="Sugerencias"
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promptRow}>
        {assistantPrompts.map((prompt) => {
          const isSelected = selectedPromptId === prompt.id;

          return (
            <Pressable
              key={prompt.id}
              onPress={() => onSelectPrompt(prompt)}
              style={[styles.promptChip, isSelected && styles.promptChipActive]}>
              <MaterialCommunityIcons
                name={prompt.icon}
                size={16}
                color={isSelected ? instructorPalette.surface : instructorPalette.secondary}
              />
              <Text style={[styles.promptChipText, isSelected && styles.promptChipTextActive]}>{prompt.title}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <SectionHeading
        actionLabel="Vista"
        subtitle="Ejemplo simple del flujo de conversacion."
        title="Chat"
      />

      <View style={styles.chatCard}>
        <MessageBubble
          sender="Instructor"
          text="Analiza el lote OQ-17 y prepara una retroalimentacion clara para el aprendiz."
          tone="outgoing"
        />
        <MessageBubble
          sender="BIOMIND"
          text="Detecté una alerta de pH y falta de evidencia fotográfica. Sugiero revisar el medio y pedir un registro comparativo en la siguiente práctica."
          tone="incoming"
        />

        <View style={styles.composer}>
          <TextInput
            multiline
            onChangeText={onDraftChange}
            placeholder="Escribe una instruccion o usa registro por voz..."
            placeholderTextColor="#89A6A0"
            style={styles.composerInput}
            value={assistantDraft}
          />

          <View style={styles.composerActions}>
            <Pressable style={styles.secondaryAction}>
              <MaterialCommunityIcons name="microphone-outline" size={18} color={instructorPalette.secondary} />
            </Pressable>
            <Pressable style={styles.primaryAction}>
              <MaterialCommunityIcons name="arrow-up" size={18} color={instructorPalette.surface} />
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}

function MessageBubble({
  sender,
  text,
  tone,
}: {
  sender: string;
  text: string;
  tone: 'incoming' | 'outgoing';
}) {
  return (
    <View style={[styles.messageBubble, tone === 'outgoing' ? styles.outgoingBubble : styles.incomingBubble]}>
      <Text style={styles.messageSender}>{sender}</Text>
      <Text style={styles.messageText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: instructorPalette.surface,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: instructorPalette.border,
    gap: 8,
  },
  heroLabel: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroTitle: {
    color: instructorPalette.secondary,
    fontFamily: 'SulphurPointBold',
    fontSize: 28,
    lineHeight: 28,
  },
  heroText: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    lineHeight: 20,
  },
  promptRow: {
    gap: 10,
    paddingRight: 8,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: instructorPalette.surfaceMuted,
  },
  promptChipActive: {
    backgroundColor: instructorPalette.secondary,
  },
  promptChipText: {
    color: instructorPalette.secondary,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
  },
  promptChipTextActive: {
    color: instructorPalette.surface,
  },
  chatCard: {
    backgroundColor: instructorPalette.surface,
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    borderColor: instructorPalette.border,
    gap: 10,
  },
  messageBubble: {
    borderRadius: 20,
    padding: 14,
    gap: 4,
  },
  incomingBubble: {
    backgroundColor: '#F4FBF9',
  },
  outgoingBubble: {
    backgroundColor: '#EAFBF7',
  },
  messageSender: {
    color: instructorPalette.secondary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  messageText: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    lineHeight: 19,
  },
  composer: {
    marginTop: 6,
    gap: 10,
    padding: 14,
    borderRadius: 22,
    backgroundColor: '#FCFFFE',
    borderWidth: 1,
    borderColor: instructorPalette.border,
  },
  composerInput: {
    minHeight: 88,
    color: instructorPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 14,
    textAlignVertical: 'top',
  },
  composerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  secondaryAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: instructorPalette.surfaceMuted,
  },
  primaryAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: instructorPalette.primary,
  },
});
