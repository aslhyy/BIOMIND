import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { instructorPalette } from '@/features/instructor/theme';

export type ObservationProjectOption = {
  id: string;
  title: string;
};

type ObservationAssistantSheetProps = {
  bottomOffset: number;
  draft: string;
  projects: ObservationProjectOption[];
  questions: string[];
  roleLabel: string;
  selectedProjectId: string;
  subtitle: string;
  title: string;
  onClose: () => void;
  onDraftChange: (value: string) => void;
  onProjectSelect: (id: string) => void;
};

export function ObservationAssistantSheet({
  bottomOffset,
  draft,
  projects,
  questions,
  roleLabel,
  selectedProjectId,
  subtitle,
  title,
  onClose,
  onDraftChange,
  onProjectSelect,
}: ObservationAssistantSheetProps) {
  return (
    <View style={[styles.sheet, { bottom: bottomOffset }]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <MaterialCommunityIcons name="close" size={18} color={instructorPalette.dark} />
        </Pressable>
      </View>

      <View style={styles.rolePill}>
        <MaterialCommunityIcons name="star-outline" size={14} color={instructorPalette.secondary} />
        <Text style={styles.rolePillText}>{roleLabel}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.projectRow}>
        {projects.map((project) => {
          const isActive = project.id === selectedProjectId;

          return (
            <Pressable
              key={project.id}
              onPress={() => onProjectSelect(project.id)}
              style={[styles.projectPill, isActive && styles.projectPillActive]}>
              <Text style={[styles.projectPillText, isActive && styles.projectPillTextActive]}>{project.title}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.messageCard}>
        <Text style={styles.messageTitle}>Bienvenido al registro guiado</Text>
        <Text style={styles.messageText}>
          Puedo hacer preguntas automáticas, escuchar respuestas y ayudarte a guardar observaciones manuales.
        </Text>
      </View>

      <View style={styles.questionCard}>
        <Text style={styles.questionTitle}>Preguntas sugeridas para este proyecto</Text>
        <View style={styles.questionList}>
          {questions.map((question, index) => (
            <Text key={question} style={styles.questionText}>
              {index + 1}. {question}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.composer}>
        <TextInput
          multiline
          onChangeText={onDraftChange}
          placeholder="Escribe o dicta tu observación aquí..."
          placeholderTextColor="#91A0B4"
          style={styles.input}
          value={draft}
        />

        <View style={styles.actions}>
          <Pressable style={styles.secondaryAction}>
            <MaterialCommunityIcons name="camera-outline" size={18} color={instructorPalette.secondary} />
          </Pressable>
          <Pressable style={styles.secondaryAction}>
            <MaterialCommunityIcons name="microphone-outline" size={18} color={instructorPalette.secondary} />
          </Pressable>
          <Pressable style={styles.primaryAction}>
            <MaterialCommunityIcons name="arrow-up" size={18} color={instructorPalette.surface} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 18,
    right: 18,
    backgroundColor: 'rgba(255,255,255,0.99)',
    borderRadius: 30,
    padding: 18,
    borderWidth: 1,
    borderColor: instructorPalette.border,
    shadowColor: instructorPalette.shadow,
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: instructorPalette.dark,
    fontFamily: 'SulphurPointBold',
    fontSize: 28,
    lineHeight: 28,
  },
  subtitle: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: instructorPalette.surfaceMuted,
  },
  rolePill: {
    alignSelf: 'flex-start',
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: instructorPalette.lavender,
  },
  rolePillText: {
    color: instructorPalette.secondary,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
  },
  projectRow: {
    gap: 10,
    marginTop: 14,
    paddingRight: 8,
  },
  projectPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: instructorPalette.surfaceMuted,
  },
  projectPillActive: {
    backgroundColor: instructorPalette.secondary,
  },
  projectPillText: {
    color: instructorPalette.secondary,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
  },
  projectPillTextActive: {
    color: instructorPalette.surface,
  },
  messageCard: {
    marginTop: 14,
    borderRadius: 24,
    backgroundColor: '#FBFCFF',
    padding: 16,
    borderWidth: 1,
    borderColor: instructorPalette.border,
    gap: 6,
  },
  messageTitle: {
    color: instructorPalette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
  },
  messageText: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  questionCard: {
    marginTop: 12,
    borderRadius: 24,
    backgroundColor: instructorPalette.surface,
    padding: 16,
    borderWidth: 1,
    borderColor: instructorPalette.border,
    gap: 10,
  },
  questionTitle: {
    color: instructorPalette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
  },
  questionList: {
    gap: 8,
  },
  questionText: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  composer: {
    marginTop: 14,
    borderRadius: 24,
    backgroundColor: '#FBFCFF',
    padding: 14,
    borderWidth: 1,
    borderColor: instructorPalette.border,
    gap: 10,
  },
  input: {
    minHeight: 78,
    color: instructorPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 14,
    textAlignVertical: 'top',
  },
  actions: {
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
