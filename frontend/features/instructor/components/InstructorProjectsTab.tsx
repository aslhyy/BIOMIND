import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { projectDetails, type IconName, type ProjectDetail } from '../data';
import { instructorPalette } from '../theme';
import { IconLabel, ProgressBar, SectionHeading, StatusBadge } from './InstructorUI';

const fallbackIcons: IconName[] = [
  'sprout',
  'flower-tulip-outline',
  'fruit-cherries',
  'leaf-circle-outline',
];

export function InstructorProjectsTab() {
  const [projects, setProjects] = useState<ProjectDetail[]>(projectDetails);
  const [selectedProjectId, setSelectedProjectId] = useState(projectDetails[0]?.id || '');
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || projects[0],
    [projects, selectedProjectId]
  );

  const [draftTitle, setDraftTitle] = useState(selectedProject?.title || '');
  const [draftSpecies, setDraftSpecies] = useState(selectedProject?.species || '');
  const [draftGuide, setDraftGuide] = useState(selectedProject?.guideName || '');
  const [draftIcon, setDraftIcon] = useState<IconName>(selectedProject?.icon || 'sprout');

  useEffect(() => {
    if (!selectedProject) {
      return;
    }

    setDraftTitle(selectedProject.title);
    setDraftSpecies(selectedProject.species);
    setDraftGuide(selectedProject.guideName);
    setDraftIcon(selectedProject.icon);
  }, [selectedProject]);

  const handleCreateProject = () => {
    const newProject: ProjectDetail = {
      id: `project-${Date.now()}`,
      title: draftTitle || 'Nuevo proyecto',
      species: draftSpecies || 'Especie',
      stage: 'Nuevo registro',
      progress: 0,
      contamination: 'Sin datos aún',
      inventory: 'Pendiente',
      photos: 0,
      accent: instructorPalette.primary,
      soft: instructorPalette.mint,
      icon: draftIcon,
      guideName: draftGuide || 'Guía_pendiente.pdf',
      iconOptions: fallbackIcons,
      sharedSheets: ['Ficha 3203082'],
      sharedLearners: [],
      competencies: ['Competencia por asignar'],
      gallery: [],
      questions: [],
    };

    setProjects((current) => [newProject, ...current]);
    setSelectedProjectId(newProject.id);
  };

  const handleUpdateProject = () => {
    if (!selectedProject) {
      return;
    }

    setProjects((current) =>
      current.map((project) =>
        project.id === selectedProject.id
          ? {
            ...project,
            title: draftTitle || project.title,
            species: draftSpecies || project.species,
            guideName: draftGuide || project.guideName,
            icon: draftIcon,
          }
          : project
      )
    );
  };

  const handleDeleteProject = () => {
    if (!selectedProject) {
      return;
    }

    const remainingProjects = projects.filter((project) => project.id !== selectedProject.id);
    setProjects(remainingProjects);
    setSelectedProjectId(remainingProjects[0]?.id || '');
  };

  return (
    <>
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Gestión de cultivos</Text>
        <Text style={styles.heroTitle}>Gestión de proyectos y evidencias.</Text>
        <Text style={styles.heroText}>
          El instructor puede crear proyectos, elegir icono, adjuntar guía, compartir con fichas o aprendices y responder dudas.
        </Text>
      </View>



      <View style={styles.formCard}>
        <SectionHeading
          actionLabel=""
          subtitle="Esta sección ya está lista para conectar con backend."
          title="Crear o editar proyecto"
        />
        <Text style={styles.space}></Text>

        <View style={styles.iconSection}>
          <Text style={styles.fieldLabel}>Icono representativo</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconRow}>
            {(selectedProject?.iconOptions || fallbackIcons).map((iconOption) => {
              const isActive = iconOption === draftIcon;

              return (
                <Pressable
                  key={iconOption}
                  onPress={() => setDraftIcon(iconOption)}
                  style={[styles.iconChoice, isActive && styles.iconChoiceActive]}>
                  <MaterialCommunityIcons
                    name={iconOption}
                    size={20}
                    color={isActive ? '#FFFFFF' : instructorPalette.primary}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
        <Field label="Nombre del proyecto" value={draftTitle} onChangeText={setDraftTitle} placeholder="Propagacion in vitro" />
        <Field label="Especie / evidencia" value={draftSpecies} onChangeText={setDraftSpecies} placeholder="Orquideas" />
        <Field label="Guía compartida" value={draftGuide} onChangeText={setDraftGuide} placeholder="Guía_Proyecto.pdf" />


        <View style={styles.actionRow}>
          <ActionButton label="Crear" onPress={handleCreateProject} tone="primary" />
          <ActionButton label="Editar" onPress={handleUpdateProject} />
          <ActionButton label="Eliminar" onPress={handleDeleteProject} tone="danger" />
        </View>
      </View>

      <SectionHeading
        actionLabel="Activos"
        subtitle="Selecciona un proyecto para ver fotos, guía, dudas y asignaciones."
        title="Proyectos"
      />

      <View style={styles.stack}>
        {projects.map((project) => (
          <Pressable key={project.id} onPress={() => setSelectedProjectId(project.id)} style={styles.projectCard}>
            <View style={[styles.projectInner, project.id === selectedProjectId && styles.projectInnerActive]}>
              <View style={styles.header}>
                <View style={[styles.iconWrap, { backgroundColor: project.soft }]}>
                  <MaterialCommunityIcons name={project.icon} size={18} color={project.accent} />
                </View>
                <View style={styles.copy}>
                  <Text style={styles.title}>
                    {project.title} - {project.species}
                  </Text>
                  <Text style={styles.subtitle}>{project.stage}</Text>
                </View>
                <Text style={styles.percent}>{project.progress}%</Text>
              </View>

              <ProgressBar accent={project.accent} progress={project.progress} soft="#EFF3FA" />

              <View style={styles.meta}>
                <IconLabel icon="alert-circle-outline" text={project.contamination} />
                <IconLabel icon="archive-outline" text={project.inventory} />
                <IconLabel icon="camera-outline" text={`${project.photos} fotos registradas`} />
              </View>
            </View>
          </Pressable>
        ))}
      </View>

      {selectedProject ? <ProjectDetailCard project={selectedProject} /> : null}
    </>
  );
}

function ProjectDetailCard({ project }: { project: ProjectDetail }) {
  return (
    <View style={styles.detailCard}>
      <View style={styles.detailHeader}>
        <View>
          <Text style={styles.detailTitle}>
            {project.title} - {project.species}
          </Text>
          <Text style={styles.detailSubtitle}>Guía: {project.guideName}</Text>
        </View>
        <StatusBadge accent={instructorPalette.secondary} label={`${project.sharedSheets.length} fichas`} soft="#EAFBF7" />
      </View>

      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>Asignacion y competencias</Text>
        {project.sharedSheets.map((sheet) => (
          <IconLabel key={sheet} icon="account-group-outline" text={sheet} />
        ))}
        {project.competencies.map((competency) => (
          <IconLabel key={competency} icon="book-check-outline" text={competency} />
        ))}
      </View>

      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>Fotos subidas por aprendices</Text>
        {project.gallery.length ? (
          project.gallery.map((photo) => (
            <View key={photo.id} style={styles.photoCard}>
              <View style={styles.photoThumb}>
                <MaterialCommunityIcons name="image-outline" size={20} color={instructorPalette.primary} />
              </View>
              <View style={styles.photoCopy}>
                <Text style={styles.photoTitle}>{photo.learner}</Text>
                <Text style={styles.photoText}>{photo.note}</Text>
                <Text style={styles.photoDate}>{photo.date}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Aún no hay fotos registradas para este proyecto.</Text>
        )}
      </View>

      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>Dudas de aprendices</Text>
        {project.questions.length ? (
          project.questions.map((question) => (
            <View key={question.id} style={styles.questionCard}>
              <View style={styles.questionHeader}>
                <Text style={styles.questionLearner}>{question.learner}</Text>
                <StatusBadge
                  accent={question.status === 'Respondida' ? instructorPalette.primary : '#EAA189'}
                  label={question.status}
                  soft={question.status === 'Respondida' ? '#EAFBF7' : '#FFF1EB'}
                />
              </View>
              <Text style={styles.questionText}>{question.question}</Text>
              <Text style={styles.answerText}>
                {question.answer || 'Respuesta pendiente del instructor.'}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No hay dudas pendientes en este proyecto.</Text>
        )}
      </View>
    </View>
  );
}

function Field({
  label,
  onChangeText,
  placeholder,
  value,
}: {
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.fieldBlock}>
      <Text
        style={[
          styles.fieldLabel,
          isFocused && { color: instructorPalette.primary },
        ]}>
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#97AEA7"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[
          styles.fieldInput,
          isFocused && styles.fieldInputActive,
        ]}
      />
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  tone = 'default',
}: {
  label: string;
  onPress: () => void;
  tone?: 'default' | 'primary' | 'danger';
}) {
  const toneStyles = {
    default: styles.actionButton,
    primary: [styles.actionButton, styles.actionButtonPrimary],
    danger: [styles.actionButton, styles.actionButtonDanger],
  };

  const textToneStyles = {
    default: styles.actionButtonText,
    primary: [styles.actionButtonText, styles.actionButtonTextPrimary],
    danger: [styles.actionButtonText, styles.actionButtonTextDanger],
  };

  return (
    <Pressable onPress={onPress} style={toneStyles[tone]}>
      <Text style={textToneStyles[tone]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: "Transparent",
    paddingHorizontal: 37,
    paddingVertical: 20,
    marginHorizontal: -30,
    shadowColor: instructorPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 8,
    marginBottom: -22,
  },
  heroLabel: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  heroTitle: {
    color: instructorPalette.dark,
    fontFamily: 'SulphurPointBold',
    fontSize: 28,
    lineHeight: 28,
    marginBottom: 6,
  },
  heroText: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 10,
  },
  formCard: {
    backgroundColor: instructorPalette.surface,
    paddingHorizontal: 37,
    paddingVertical: 20,
    marginHorizontal: -30,
    shadowColor: instructorPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 8,
  },
  space: {
    color: instructorPalette.greenText,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 2,
  },
  fieldBlock: {
    gap: 9,
  },
  fieldLabel: {
    color: instructorPalette.textMuted,
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
    color: instructorPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    backgroundColor: '#fbfbfb',
    shadowColor: instructorPalette.text,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },
  fieldInputActive: {
    borderColor: instructorPalette.secondary,
    backgroundColor: '#FFFFFF',
    shadowColor: instructorPalette.primary,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },
  iconSection: {
    gap: 8,
  },
  iconRow: {
    gap: 10,
  },
  iconChoice: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4FBF9',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  iconChoiceActive: {
    backgroundColor: instructorPalette.secondary,
    borderColor: instructorPalette.secondary,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: instructorPalette.surfaceMuted,
  },
  actionButtonPrimary: {
    backgroundColor: instructorPalette.primary,
  },
  actionButtonDanger: {
    backgroundColor: '#FFF1EB',
  },
  actionButtonText: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  actionButtonTextPrimary: {
    color: '#FFFFFF',
  },
  actionButtonTextDanger: {
    color: '#C97B63',
  },
  stack: {
    gap: 12,
  },
  projectCard: {
    borderRadius: 24,
  },
  projectInner: {
    backgroundColor: instructorPalette.surface,
    borderRadius: 24,
    padding: 16,
    shadowColor: instructorPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 12,
  },
  projectInnerActive: {
    borderColor: instructorPalette.secondary,
    backgroundColor: '#FCFFFE',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
  },
  subtitle: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
  },
  percent: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  meta: {
    gap: 8,
  },
  detailCard: {
    backgroundColor: instructorPalette.surface,
    paddingHorizontal: 40,
    paddingVertical: 25,
    marginHorizontal: -30,
    shadowColor: instructorPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 8,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: -22,
    alignItems: 'flex-start',
  },
  detailTitle: {
    color: instructorPalette.primary,
    fontFamily: 'SulphurPointBold',
    fontSize: 28,
    maxWidth: '85%',
    marginBottom: 9,
  },
  detailSubtitle: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    marginBottom: 5,
  },
  detailSection: {
    gap: 10,
  },
  detailSectionTitle: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
    marginTop: 12,
  },
  photoCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: instructorPalette.surface,
    borderRadius: 18,
    padding: 12,
    borderColor: instructorPalette.secondary,
    borderWidth: 0.5,
    shadowColor: instructorPalette.secondary,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },
  photoThumb: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E4FAF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCopy: {
    flex: 1,
    gap: 2,
  },
  photoTitle: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  photoText: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
  },
  photoDate: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsMedium',
    fontSize: 11,
  },
  questionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    gap: 7,
    borderColor: instructorPalette.secondary,
    shadowColor: instructorPalette.primary,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  questionLearner: {
    color: instructorPalette.secondary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  questionText: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  answerText: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  emptyText: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
});
