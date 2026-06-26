import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Linking, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { learnerPalette } from '../theme';
import type { AuthenticatedSession } from '@/features/workspace/types';
import { LearnerSectionIntro } from './LearnerSectionIntro';
// @ts-ignore
import { escucharContextoAcademicoUsuario, escucharGruposTrabajo, escucharProyectos } from '@/services/academic';
// @ts-ignore
import { eliminarBitacora, escucharBitacorasAprendiz, guardarBitacora } from '@/services/bitacoras';

type Props = {
  session: AuthenticatedSession;
};

type Instructor = {
  id: string;
  nombre?: string;
  correo?: string;
};

type WorkGroup = {
  id: string;
  aprendizIds?: string[];
};

type Project = {
  id: string;
  titulo?: string;
  descripcion?: string;
  fichaId?: string;
  fichaNumero?: string;
  competenciaNombre?: string;
  rapDescripcion?: string;
  instructorUid?: string;
  asignacionTipo?: 'aprendices' | 'grupo';
  aprendizIds?: string[];
  grupoId?: string | null;
  estado?: string;
  activo?: boolean;
};

type Evidence = {
  nombre?: string;
  mimeType?: string;
  base64?: string;
  url?: string;
  ruta?: string;
};

type Bitacora = {
  id: string;
  proyectoId?: string;
  proyectoTitulo?: string;
  descripcion?: string;
  fecha?: string;
  avance?: string;
  dificultades?: string;
  evidencias?: Evidence[];
  archivoNombre?: string;
  archivoUrl?: string;
  estado?: string;
  observacion?: string;
  revisadoPorNombre?: string;
  revisadoPorRol?: string;
};

type FormState = {
  descripcion: string;
  fecha: string;
  avance: string;
  dificultades: string;
  evidencias: Evidence[];
  archivoNombre: string;
  archivoUrl: string;
};

const emptyForm = (): FormState => ({
  descripcion: '',
  fecha: new Date().toISOString().slice(0, 10),
  avance: '',
  dificultades: '',
  evidencias: [],
  archivoNombre: '',
  archivoUrl: '',
});

export function LearnerBitacorasTab({ session }: Props) {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [groups, setGroups] = useState<WorkGroup[]>([]);
  const [bitacoras, setBitacoras] = useState<Bitacora[]>([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [instructorSearch, setInstructorSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [editingId, setEditingId] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [expandedObservationIds, setExpandedObservationIds] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    const unsubscribeContext = escucharContextoAcademicoUsuario(
      session,
      (context: { instructores?: Instructor[] }) => setInstructors(context.instructores || []),
      () => setFeedback('No pudimos cargar los instructores asignados.')
    );
    const unsubscribeProjects = escucharProyectos(
      (items: Project[]) => setProjects(items),
      () => setFeedback('No pudimos cargar los proyectos asignados.')
    );
    const unsubscribeGroups = escucharGruposTrabajo(
      (items: WorkGroup[]) => setGroups(items),
      () => setFeedback('No pudimos cargar los grupos de trabajo.')
    );
    const unsubscribeBitacoras = escucharBitacorasAprendiz(
      session.uid,
      setBitacoras,
      () => setFeedback('No pudimos cargar tus bitácoras.')
    );

    return () => {
      unsubscribeContext?.();
      unsubscribeProjects?.();
      unsubscribeGroups?.();
      unsubscribeBitacoras?.();
    };
  }, [session]);

  const learnerGroupIds = useMemo(
    () => new Set(groups.filter((group) => (group.aprendizIds || []).includes(session.uid)).map((group) => group.id)),
    [groups, session.uid]
  );

  const assignedProjects = useMemo(
    () =>
      projects.filter((project) => {
        if (project.activo === false || project.estado === 'Inactivo') {
          return false;
        }

        if ((project.aprendizIds || []).includes(session.uid)) {
          return true;
        }

        return Boolean(project.grupoId && learnerGroupIds.has(project.grupoId));
      }),
    [learnerGroupIds, projects, session.uid]
  );

  const assignedInstructorIds = useMemo(
    () =>
      new Set(
        assignedProjects
          .map((project) => project.instructorUid)
          .filter((instructorUid): instructorUid is string => Boolean(instructorUid))
      ),
    [assignedProjects]
  );

  const availableInstructors = useMemo(() => {
    const normalizedSearch = instructorSearch.trim().toLowerCase();
    const instructorById = new Map(instructors.map((instructor) => [instructor.id, instructor]));

    return Array.from(assignedInstructorIds)
      .map(
        (instructorId): Instructor =>
          instructorById.get(instructorId) || {
            id: instructorId,
            nombre: 'Instructor asignado',
            correo: '',
          }
      )
      .filter((instructor) =>
        `${instructor.nombre || ''} ${instructor.correo || ''}`.toLowerCase().includes(normalizedSearch)
      )
      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));
  }, [assignedInstructorIds, instructorSearch, instructors]);

  const instructorProjects = useMemo(() => {
    const normalizedSearch = projectSearch.trim().toLowerCase();
    return assignedProjects
      .filter((project) => project.instructorUid === selectedInstructorId)
      .filter((project) =>
        `${project.titulo || ''} ${project.competenciaNombre || ''} ${project.fichaNumero || ''}`
          .toLowerCase()
          .includes(normalizedSearch)
      )
      .sort((a, b) => (a.titulo || '').localeCompare(b.titulo || '', 'es'));
  }, [assignedProjects, projectSearch, selectedInstructorId]);

  const selectedProject = useMemo(
    () => assignedProjects.find((project) => project.id === selectedProjectId),
    [assignedProjects, selectedProjectId]
  );

  const projectBitacoras = useMemo(
    () => bitacoras.filter((bitacora) => bitacora.proyectoId === selectedProjectId),
    [bitacoras, selectedProjectId]
  );

  useEffect(() => {
    if (selectedInstructorId && assignedInstructorIds.has(selectedInstructorId)) {
      return;
    }

    setSelectedInstructorId(availableInstructors[0]?.id || '');
  }, [assignedInstructorIds, availableInstructors, selectedInstructorId]);

  useEffect(() => {
    const projectStillAvailable = instructorProjects.some((project) => project.id === selectedProjectId);
    if (!projectStillAvailable) {
      setSelectedProjectId(instructorProjects[0]?.id || '');
      setFormOpen(false);
      setEditingId('');
      setForm(emptyForm());
    }
  }, [instructorProjects, selectedProjectId]);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const openCreateForm = () => {
    if (!selectedProject) {
      setFeedback('Selecciona un proyecto antes de crear la bitácora.');
      return;
    }

    setEditingId('');
    setForm(emptyForm());
    setCalendarMonth(startOfMonth(new Date()));
    setFormOpen(true);
    setFeedback('');
  };

  const closeForm = () => {
    setEditingId('');
    setForm(emptyForm());
    setFormOpen(false);
    setCalendarOpen(false);
  };

  const pickPhoto = async () => {
    if (form.evidencias.length >= 3) {
      setFeedback('Puedes agregar máximo 3 fotografías por bitácora.');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFeedback('Necesitamos permiso para seleccionar evidencias fotográficas.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.25,
      base64: true,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];
    if (!asset.base64) {
      setFeedback('No pudimos comprimir la fotografía. Selecciona otra imagen.');
      return;
    }

    const mimeType = asset.mimeType || 'image/jpeg';
    const base64 = `data:${mimeType};base64,${asset.base64}`;
    if (base64.length > 280000) {
      setFeedback('La fotografía sigue siendo muy pesada. Selecciona una imagen de menor tamaño.');
      return;
    }

    setForm((current) => ({
      ...current,
      evidencias: [
        ...current.evidencias,
        {
          nombre: asset.fileName || `evidencia-${Date.now()}.jpg`,
          mimeType,
          base64,
        },
      ],
    }));
  };

  const removeSavedEvidence = (indexToRemove: number) => {
    setForm((current) => ({
      ...current,
      evidencias: current.evidencias.filter((_, index) => index !== indexToRemove),
    }));
  };

  const handleSave = async () => {
    if (!selectedProject) {
      setFeedback('Selecciona un proyecto.');
      return;
    }

    if (!form.fecha.trim()) {
      setFeedback('Ingresa la fecha de la bitácora.');
      return;
    }

    if (!form.descripcion.trim()) {
      setFeedback('Escribe la descripción de la actividad realizada.');
      return;
    }

    if (!form.avance.trim()) {
      setFeedback('Describe el avance alcanzado.');
      return;
    }

    if (form.archivoUrl.trim() && !/^https?:\/\/\S+$/i.test(form.archivoUrl.trim())) {
      setFeedback('El enlace del archivo debe comenzar por http:// o https://.');
      return;
    }

    setSaving(true);
    setFeedback('');

    try {
      await guardarBitacora({
        id: editingId || undefined,
        aprendizUid: session.uid,
        aprendizNombre: session.name,
        proyectoId: selectedProject.id,
        proyectoTitulo: selectedProject.titulo || 'Proyecto',
        fichaId: selectedProject.fichaId || session.fichaId || session.ficha || '',
        descripcion: form.descripcion,
        fecha: form.fecha,
        avance: form.avance,
        dificultades: form.dificultades,
        evidencias: form.evidencias,
        archivoNombre: form.archivoNombre,
        archivoUrl: form.archivoUrl,
        estado: editingId
          ? bitacoras.find((bitacora) => bitacora.id === editingId)?.estado || 'Enviada'
          : 'Enviada',
      });

      setFeedback(editingId ? 'Bitácora actualizada correctamente.' : 'Bitácora creada correctamente.');
      closeForm();
    } catch (error) {
      const typedError = error as { message?: string };
      setFeedback(typedError.message || 'No pudimos guardar la bitácora.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (bitacora: Bitacora) => {
    const bitacoraDate = parseDate(bitacora.fecha) || new Date();
    setEditingId(bitacora.id);
    setForm({
      descripcion: bitacora.descripcion || '',
      fecha: bitacora.fecha || new Date().toISOString().slice(0, 10),
      avance: bitacora.avance || '',
      dificultades: bitacora.dificultades || '',
      evidencias: bitacora.evidencias || [],
      archivoNombre: bitacora.archivoNombre || '',
      archivoUrl: bitacora.archivoUrl || '',
    });
    setCalendarMonth(startOfMonth(bitacoraDate));
    setFormOpen(true);
    setFeedback('');
  };

  const handleDelete = (bitacoraId: string) => {
    Alert.alert('Eliminar bitácora', '¿Seguro que quieres eliminar esta bitácora?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await eliminarBitacora(bitacoraId);
            if (editingId === bitacoraId) {
              closeForm();
            }
            setFeedback('Bitácora eliminada.');
          } catch (error) {
            const typedError = error as { message?: string };
            setFeedback(typedError.message || 'No pudimos eliminar la bitácora.');
          }
        },
      },
    ]);
  };

  const toggleObservation = (bitacoraId: string) => {
    setExpandedObservationIds((current) =>
      current.includes(bitacoraId)
        ? current.filter((id) => id !== bitacoraId)
        : [...current, bitacoraId]
    );
  };

  return (
    <>
      <LearnerSectionIntro
        label="Bitácoras y evidencias"
        text="Selecciona un instructor y uno de tus proyectos asignados para consultar o registrar avances."
        title="Seguimiento por proyecto."
      />

      <View style={styles.filterCard}>
        <Text style={styles.title}>1. Selecciona el instructor</Text>
        <SearchInput
          placeholder="Buscar instructor..."
          value={instructorSearch}
          onChangeText={setInstructorSearch}
        />
        <View style={styles.optionList}>
          {availableInstructors.map((instructor) => (
            <SelectorButton
              key={instructor.id}
              active={selectedInstructorId === instructor.id}
              label={instructor.nombre || instructor.correo || 'Instructor'}
              onPress={() => {
                setSelectedInstructorId(instructor.id);
                setProjectSearch('');
              }}
            />
          ))}
          {!availableInstructors.length ? (
            <Text style={styles.emptyText}>No tienes instructores con proyectos asignados.</Text>
          ) : null}
        </View>
      </View>

      {selectedInstructorId ? (
        <View style={styles.filterCard}>
          <Text style={styles.title}>2. Selecciona el proyecto</Text>
          <SearchInput
            placeholder="Buscar por proyecto, competencia o ficha..."
            value={projectSearch}
            onChangeText={setProjectSearch}
          />
          <View style={styles.projectList}>
            {instructorProjects.map((project) => (
              <Pressable
                key={project.id}
                onPress={() => setSelectedProjectId(project.id)}
                style={[styles.projectCard, selectedProjectId === project.id && styles.projectCardActive]}>
                <View style={styles.projectHeader}>
                  <Text style={styles.projectTitle}>{project.titulo || 'Proyecto sin nombre'}</Text>
                  <Text style={styles.projectStatus}>{project.estado || 'Pendiente'}</Text>
                </View>
                <Text style={styles.projectMeta}>
                  Competencia: {project.competenciaNombre || 'Sin competencia registrada'}
                </Text>
                <Text style={styles.projectMeta}>Ficha: {project.fichaNumero || 'Sin número'}</Text>
              </Pressable>
            ))}
            {!instructorProjects.length ? (
              <Text style={styles.emptyText}>Este instructor no tiene proyectos asignados para ti.</Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {selectedProject ? (
        <>
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Proyecto seleccionado</Text>
            <Text style={styles.detailTitle}>{selectedProject.titulo}</Text>
            <InfoRow icon="book-check-outline" text={`Competencia: ${selectedProject.competenciaNombre || 'Sin registrar'}`} />
            <InfoRow icon="target" text={`RAP: ${selectedProject.rapDescripcion || 'Sin registrar'}`} />
            {selectedProject.descripcion ? <Text style={styles.detailText}>{selectedProject.descripcion}</Text> : null}
            <Pressable onPress={openCreateForm} style={styles.createButton}>
              <MaterialCommunityIcons name="plus" size={19} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Crear bitácora</Text>
            </Pressable>
          </View>

          {formOpen ? (
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <Text style={styles.title}>{editingId ? 'Editar bitácora' : 'Nueva bitácora'}</Text>
                <Pressable accessibilityLabel="Cerrar formulario" onPress={closeForm} style={styles.closeButton}>
                  <MaterialCommunityIcons name="close" size={22} color={learnerPalette.text} />
                </Pressable>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Fecha</Text>
                <Pressable
                  onPress={() => {
                    setCalendarMonth(startOfMonth(parseDate(form.fecha) || new Date()));
                    setCalendarOpen(true);
                  }}
                  style={styles.dateButton}>
                  <MaterialCommunityIcons name="calendar-month-outline" size={20} color={learnerPalette.primary} />
                  <Text style={styles.dateButtonText}>{formatDateLabel(form.fecha)}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color={learnerPalette.textMuted} />
                </Pressable>
              </View>
              <Field
                label="Actividad realizada"
                multiline
                placeholder="Describe qué actividad desarrollaste..."
                value={form.descripcion}
                onChangeText={(value) => updateField('descripcion', value)}
              />
              <Field
                label="Avance alcanzado"
                multiline
                placeholder="Explica los resultados o avances obtenidos..."
                value={form.avance}
                onChangeText={(value) => updateField('avance', value)}
              />
              <Field
                label="Dificultades o novedades"
                multiline
                placeholder="Describe dificultades, dudas o novedades. Este campo es opcional."
                value={form.dificultades}
                onChangeText={(value) => updateField('dificultades', value)}
              />

              <Text style={styles.fieldLabel}>Evidencias fotográficas</Text>
              <Text style={styles.helperText}>
                Máximo 3 fotos comprimidas. Se guardan directamente en la bitácora sin usar Storage.
              </Text>
              <View style={styles.attachmentActions}>
                <AttachmentButton icon="image-plus" label="Añadir foto" onPress={pickPhoto} />
              </View>

              <View style={styles.attachmentList}>
                {form.evidencias.map((evidence, index) => (
                  <AttachmentPreview
                    key={`saved-${evidence.ruta || evidence.nombre || index}`}
                    name={evidence.nombre || 'Evidencia guardada'}
                    imageUri={getEvidenceUri(evidence)}
                    onRemove={() => removeSavedEvidence(index)}
                  />
                ))}
              </View>

              <View style={styles.linkCard}>
                <Text style={styles.fieldLabel}>Documento externo opcional</Text>
                <Text style={styles.helperText}>
                  Sube el PDF o documento a Google Drive, OneDrive u otro servicio gratuito y pega aquí el enlace compartido.
                </Text>
                <Field
                  label="Nombre del archivo"
                  placeholder="Ejemplo: Informe de laboratorio.pdf"
                  value={form.archivoNombre}
                  onChangeText={(value) => updateField('archivoNombre', value)}
                />
                <Field
                  label="Enlace compartido"
                  placeholder="https://drive.google.com/..."
                  value={form.archivoUrl}
                  onChangeText={(value) => updateField('archivoUrl', value)}
                />
              </View>

              <Pressable disabled={saving} onPress={handleSave} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>
                  {saving ? 'Guardando...' : editingId ? 'Actualizar bitácora' : 'Guardar bitácora'}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.historyHeader}>
            <View>
              <Text style={styles.sectionTitle}>Historial del proyecto</Text>
              <Text style={styles.sectionSubtitle}>{projectBitacoras.length} bitácora(s) registrada(s)</Text>
            </View>
          </View>

          <View style={styles.stack}>
            {projectBitacoras.map((bitacora) => (
              <View key={bitacora.id} style={styles.bitacoraCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardCopy}>
                    <Text style={styles.cardTitle}>{bitacora.fecha || 'Sin fecha'}</Text>
                  </View>
                  <StatusBadge status={bitacora.estado} />
                </View>
                <Text style={styles.cardText}>{bitacora.descripcion}</Text>
                <Text style={styles.cardText}>Avance: {bitacora.avance}</Text>
                {bitacora.dificultades ? (
                  <Text style={styles.cardText}>Dificultades: {bitacora.dificultades}</Text>
                ) : null}

                <Pressable
                  onPress={() => toggleObservation(bitacora.id)}
                  style={[
                    styles.observationButton,
                    Boolean(bitacora.observacion) && styles.observationButtonActive,
                  ]}>
                  <MaterialCommunityIcons
                    name={bitacora.observacion ? 'message-text-outline' : 'message-outline'}
                    size={18}
                    color={bitacora.observacion ? learnerPalette.primary : learnerPalette.textMuted}
                  />
                  <Text
                    style={[
                      styles.observationButtonText,
                      Boolean(bitacora.observacion) && styles.observationButtonTextActive,
                    ]}>
                    {bitacora.observacion ? 'Ver observaciones' : 'Sin observaciones'}
                  </Text>
                  <MaterialCommunityIcons
                    name={expandedObservationIds.includes(bitacora.id) ? 'chevron-up' : 'chevron-down'}
                    size={19}
                    color={learnerPalette.textMuted}
                  />
                </Pressable>

                {expandedObservationIds.includes(bitacora.id) ? (
                  <View style={styles.observationPanel}>
                    {bitacora.observacion ? (
                      <>
                        <Text style={styles.observationAuthor}>
                          {getReviewerLabel(bitacora)}
                        </Text>
                        <Text style={styles.observation}>{bitacora.observacion}</Text>
                      </>
                    ) : (
                      <Text style={styles.noObservationText}>
                        El instructor o pasante todavía no ha registrado observaciones.
                      </Text>
                    )}
                  </View>
                ) : null}

                <View style={styles.evidenceGrid}>
                  {(bitacora.evidencias || []).map((evidence, index) => {
                    const imageUri = getEvidenceUri(evidence);
                    return imageUri ? (
                      <Image key={`${bitacora.id}-${index}`} source={{ uri: imageUri }} style={styles.evidenceImage} />
                    ) : (
                      <View key={`${bitacora.id}-${index}`} style={styles.fileBadge}>
                        <MaterialCommunityIcons name="file-outline" size={18} color={learnerPalette.primary} />
                        <Text numberOfLines={1} style={styles.fileBadgeText}>{evidence.nombre || 'Archivo'}</Text>
                      </View>
                    );
                  })}
                </View>

                {bitacora.archivoUrl ? (
                  <Pressable
                    onPress={() => Linking.openURL(bitacora.archivoUrl || '')}
                    style={styles.externalFileButton}>
                    <MaterialCommunityIcons name="open-in-new" size={17} color={learnerPalette.primary} />
                    <Text numberOfLines={1} style={styles.externalFileText}>
                      {bitacora.archivoNombre || 'Abrir documento adjunto'}
                    </Text>
                  </Pressable>
                ) : null}

                <View style={styles.actions}>
                  <Pressable onPress={() => handleEdit(bitacora)} style={styles.smallButton}>
                    <MaterialCommunityIcons name="pencil-outline" size={16} color={learnerPalette.primary} />
                    <Text style={styles.smallButtonText}>Editar</Text>
                  </Pressable>
                  <Pressable onPress={() => handleDelete(bitacora.id)} style={styles.deleteButton}>
                    <MaterialCommunityIcons name="trash-can-outline" size={16} color="#C45C43" />
                    <Text style={styles.deleteButtonText}>Eliminar</Text>
                  </Pressable>
                </View>
              </View>
            ))}
            {!projectBitacoras.length ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="notebook-outline" size={30} color={learnerPalette.primary} />
                <Text style={styles.emptyTitle}>Todavía no hay bitácoras</Text>
                <Text style={styles.emptyText}>Pulsa “Crear bitácora” para registrar el primer avance de este proyecto.</Text>
              </View>
            ) : null}
          </View>
        </>
      ) : null}

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

      <DateCalendarModal
        month={calendarMonth}
        selectedDate={form.fecha}
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        onMonthChange={setCalendarMonth}
        onSelect={(date) => {
          updateField('fecha', toDateValue(date));
          setCalendarOpen(false);
        }}
      />
    </>
  );
}

const monthFormatter = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' });
const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function parseDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLabel(value: string) {
  const date = parseDate(value);
  return date ? dateFormatter.format(date) : 'Seleccionar fecha';
}

function getCalendarDays(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: Array<Date | null> = Array.from({ length: mondayOffset }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, monthIndex, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function DateCalendarModal({
  month,
  selectedDate,
  visible,
  onClose,
  onMonthChange,
  onSelect,
}: {
  month: Date;
  selectedDate: string;
  visible: boolean;
  onClose: () => void;
  onMonthChange: (month: Date) => void;
  onSelect: (date: Date) => void;
}) {
  const days = getCalendarDays(month);

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Pressable
              accessibilityLabel="Mes anterior"
              onPress={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              style={styles.calendarArrow}>
              <MaterialCommunityIcons name="chevron-left" size={24} color={learnerPalette.primary} />
            </Pressable>
            <Text style={styles.calendarTitle}>{capitalize(monthFormatter.format(month))}</Text>
            <Pressable
              accessibilityLabel="Mes siguiente"
              onPress={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              style={styles.calendarArrow}>
              <MaterialCommunityIcons name="chevron-right" size={24} color={learnerPalette.primary} />
            </Pressable>
          </View>

          <View style={styles.calendarGrid}>
            {weekDays.map((day, index) => (
              <Text key={`${day}-${index}`} style={styles.weekDay}>{day}</Text>
            ))}
            {days.map((date, index) => {
              const value = date ? toDateValue(date) : '';
              const selected = value === selectedDate;
              return (
                <View key={value || `empty-${index}`} style={styles.calendarCell}>
                  {date ? (
                    <Pressable
                      onPress={() => onSelect(date)}
                      style={[styles.dayButton, selected && styles.dayButtonSelected]}>
                      <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{date.getDate()}</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>

          <View style={styles.calendarFooter}>
            <Pressable onPress={onClose} style={styles.calendarCancel}>
              <Text style={styles.calendarCancelText}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={() => onSelect(new Date())} style={styles.calendarToday}>
              <Text style={styles.calendarTodayText}>Hoy</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getEvidenceUri(evidence: Evidence) {
  if (evidence.base64?.startsWith('data:image')) {
    return evidence.base64;
  }
  if (evidence.url && (evidence.mimeType?.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(evidence.nombre || ''))) {
    return evidence.url;
  }
  return undefined;
}

function getBitacoraStatus(status?: string) {
  if (status === 'Aprobada') {
    return { label: 'Aprobada', background: '#EAFBF7', color: '#0E8F72', icon: 'check-circle-outline' as const };
  }

  if (status === 'Rechazada' || status === 'Desaprobada') {
    return { label: 'Desaprobada', background: '#FFF1EB', color: '#C45C43', icon: 'close-circle-outline' as const };
  }

  if (status === 'Correccion') {
    return { label: 'Requiere corrección', background: '#FFF8E5', color: '#A66A00', icon: 'pencil-circle-outline' as const };
  }

  return { label: 'Pendiente', background: '#EEF4F1', color: '#62766E', icon: 'clock-outline' as const };
}

function getReviewerLabel(bitacora: Bitacora) {
  const role = bitacora.revisadoPorRol?.trim();
  const name = bitacora.revisadoPorNombre?.trim();

  if (role && name) {
    return `Observación de ${role}: ${name}`;
  }

  if (name) {
    return `Observación de ${name}`;
  }

  return 'Observación del instructor o pasante';
}

function StatusBadge({ status }: { status?: string }) {
  const config = getBitacoraStatus(status);

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.background }]}>
      <MaterialCommunityIcons name={config.icon} size={15} color={config.color} />
      <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

function SearchInput({
  placeholder,
  value,
  onChangeText,
}: {
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.searchBox}>
      <MaterialCommunityIcons name="magnify" size={20} color={learnerPalette.textMuted} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={learnerPalette.textMuted}
        value={value}
        onChangeText={onChangeText}
        style={styles.searchInput}
      />
    </View>
  );
}

function SelectorButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.selectorButton, active && styles.selectorButtonActive]}>
      <MaterialCommunityIcons
        name="account-tie-outline"
        size={19}
        color={active ? '#FFFFFF' : learnerPalette.primary}
      />
      <Text style={[styles.selectorText, active && styles.selectorTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Field({
  label,
  multiline = false,
  placeholder,
  value,
  onChangeText,
}: {
  label: string;
  multiline?: boolean;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor={learnerPalette.textMuted}
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, multiline && styles.textArea]}
      />
    </View>
  );
}

function InfoRow({ icon, text }: { icon: 'book-check-outline' | 'target'; text: string }) {
  return (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon} size={18} color={learnerPalette.primary} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

function AttachmentButton({
  icon,
  label,
  onPress,
}: {
  icon: 'image-plus';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.attachmentButton}>
      <MaterialCommunityIcons name={icon} size={18} color={learnerPalette.primary} />
      <Text style={styles.attachmentButtonText}>{label}</Text>
    </Pressable>
  );
}

function AttachmentPreview({
  imageUri,
  name,
  onRemove,
}: {
  imageUri?: string;
  name: string;
  onRemove: () => void;
}) {
  return (
    <View style={styles.attachmentItem}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.attachmentImage} />
      ) : (
        <View style={styles.attachmentIcon}>
          <MaterialCommunityIcons name="file-document-outline" size={24} color={learnerPalette.primary} />
        </View>
      )}
      <Text numberOfLines={2} style={styles.attachmentName}>{name}</Text>
      <Pressable accessibilityLabel={`Quitar ${name}`} onPress={onRemove} style={styles.removeAttachment}>
        <MaterialCommunityIcons name="close" size={16} color="#C45C43" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  filterCard: {
    backgroundColor: learnerPalette.surface,
    borderRadius: 22,
    padding: 16,
    gap: 12,
  },
  title: {
    color: learnerPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 17,
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: learnerPalette.surfaceMuted,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 13,
  },
  searchInput: {
    color: learnerPalette.text,
    flex: 1,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    minHeight: 46,
  },
  optionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectorButton: {
    alignItems: 'center',
    backgroundColor: learnerPalette.mint,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  selectorButtonActive: {
    backgroundColor: learnerPalette.primary,
  },
  selectorText: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
  },
  selectorTextActive: {
    color: '#FFFFFF',
  },
  projectList: {
    gap: 9,
  },
  projectCard: {
    backgroundColor: learnerPalette.surfaceMuted,
    borderColor: 'transparent',
    borderRadius: 16,
    borderWidth: 1,
    gap: 5,
    padding: 13,
  },
  projectCardActive: {
    backgroundColor: learnerPalette.mint,
    borderColor: learnerPalette.primary,
  },
  projectHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  projectTitle: {
    color: learnerPalette.dark,
    flex: 1,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
  },
  projectStatus: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 10,
  },
  projectMeta: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
  },
  detailCard: {
    backgroundColor: learnerPalette.surface,
    borderRadius: 22,
    gap: 9,
    padding: 17,
  },
  detailLabel: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  detailTitle: {
    color: learnerPalette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 19,
  },
  detailText: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  infoRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
  },
  infoText: {
    color: learnerPalette.text,
    flex: 1,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  createButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: learnerPalette.primary,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 7,
    marginTop: 5,
    paddingHorizontal: 17,
    paddingVertical: 11,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  formCard: {
    backgroundColor: learnerPalette.surface,
    borderRadius: 22,
    gap: 13,
    padding: 16,
  },
  formHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: learnerPalette.surfaceMuted,
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    color: learnerPalette.text,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
  },
  input: {
    backgroundColor: learnerPalette.surfaceMuted,
    borderRadius: 14,
    color: learnerPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dateButton: {
    alignItems: 'center',
    backgroundColor: learnerPalette.surfaceMuted,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 9,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  dateButtonText: {
    color: learnerPalette.text,
    flex: 1,
    fontFamily: 'PoppinsRegular',
    fontSize: 13,
  },
  textArea: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  attachmentActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  helperText: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 17,
  },
  linkCard: {
    backgroundColor: learnerPalette.surfaceMuted,
    borderRadius: 16,
    gap: 10,
    padding: 12,
  },
  attachmentButton: {
    alignItems: 'center',
    backgroundColor: learnerPalette.mint,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  attachmentButtonText: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  attachmentList: {
    gap: 8,
  },
  attachmentItem: {
    alignItems: 'center',
    backgroundColor: learnerPalette.surfaceMuted,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 10,
    padding: 9,
  },
  attachmentImage: {
    backgroundColor: learnerPalette.mint,
    borderRadius: 9,
    height: 48,
    width: 48,
  },
  attachmentIcon: {
    alignItems: 'center',
    backgroundColor: learnerPalette.mint,
    borderRadius: 9,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  attachmentName: {
    color: learnerPalette.text,
    flex: 1,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
  },
  removeAttachment: {
    alignItems: 'center',
    backgroundColor: '#FFF1EB',
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: learnerPalette.primary,
    borderRadius: 999,
    paddingVertical: 13,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  historyHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: learnerPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 17,
  },
  sectionSubtitle: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
  },
  stack: {
    gap: 12,
  },
  bitacoraCard: {
    backgroundColor: learnerPalette.surface,
    borderRadius: 22,
    gap: 8,
    padding: 16,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardCopy: {
    flex: 1,
  },
  cardTitle: {
    color: learnerPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
  },
  statusBadge: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusText: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 10,
  },
  cardText: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  observation: {
    color: learnerPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  observationButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: learnerPalette.surfaceMuted,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  observationButtonActive: {
    backgroundColor: learnerPalette.mint,
  },
  observationButtonText: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsMedium',
    fontSize: 11,
  },
  observationButtonTextActive: {
    color: learnerPalette.primary,
  },
  observationPanel: {
    backgroundColor: learnerPalette.surfaceMuted,
    borderLeftColor: learnerPalette.primary,
    borderLeftWidth: 3,
    borderRadius: 12,
    gap: 5,
    padding: 12,
  },
  observationAuthor: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  noObservationText: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 17,
  },
  evidenceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  evidenceImage: {
    backgroundColor: learnerPalette.surfaceMuted,
    borderRadius: 12,
    height: 72,
    width: 72,
  },
  fileBadge: {
    alignItems: 'center',
    backgroundColor: learnerPalette.surfaceMuted,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
    maxWidth: 170,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  fileBadgeText: {
    color: learnerPalette.text,
    flexShrink: 1,
    fontFamily: 'PoppinsRegular',
    fontSize: 10,
  },
  externalFileButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: learnerPalette.mint,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 7,
    maxWidth: '100%',
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  externalFileText: {
    color: learnerPalette.primary,
    flexShrink: 1,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    alignItems: 'center',
    backgroundColor: learnerPalette.mint,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  smallButtonText: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: '#FFF1EB',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  deleteButtonText: {
    color: '#C45C43',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: learnerPalette.surface,
    borderRadius: 22,
    gap: 7,
    padding: 20,
  },
  emptyTitle: {
    color: learnerPalette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 15,
  },
  emptyText: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  feedback: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(27, 49, 34, 0.42)',
    flex: 1,
    justifyContent: 'center',
    padding: 22,
  },
  calendarCard: {
    backgroundColor: learnerPalette.surface,
    borderRadius: 24,
    gap: 16,
    maxWidth: 380,
    padding: 18,
    width: '100%',
  },
  calendarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarArrow: {
    alignItems: 'center',
    backgroundColor: learnerPalette.mint,
    borderRadius: 999,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  calendarTitle: {
    color: learnerPalette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 15,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  weekDay: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
    textAlign: 'center',
    width: `${100 / 7}%`,
  },
  calendarCell: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: `${100 / 7}%`,
  },
  dayButton: {
    alignItems: 'center',
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  dayButtonSelected: {
    backgroundColor: learnerPalette.primary,
  },
  dayText: {
    color: learnerPalette.text,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
  calendarFooter: {
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'flex-end',
  },
  calendarCancel: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  calendarCancelText: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
  },
  calendarToday: {
    backgroundColor: learnerPalette.primary,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  calendarTodayText: {
    color: '#FFFFFF',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
});
