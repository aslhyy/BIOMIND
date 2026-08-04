import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Image, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AuthenticatedSession } from '@/features/workspace/types';
// @ts-ignore
import { eliminarObservacionBitacora, observarBitacora, revisarBitacora } from '@/services/bitacoras';

type Evidence = {
  nombre?: string;
  mimeType?: string;
  base64?: string;
  url?: string;
};

type Observation = {
  id?: string;
  autorUid?: string;
  autorNombre?: string;
  autorRol?: string;
  texto?: string;
  creadoEn?: any;
  actualizadoEn?: any;
};

type Bitacora = {
  id: string;
  aprendizUid?: string;
  aprendizNombre?: string;
  proyectoId?: string;
  proyectoTitulo?: string;
  fichaId?: string;
  descripcion?: string;
  fecha?: string;
  avance?: string;
  dificultades?: string;
  evidencias?: Evidence[];
  archivoNombre?: string;
  archivoUrl?: string;
  estado?: string;
  observacion?: string;
  observaciones?: Observation[];
  revisadoPorUid?: string;
  revisadoPorNombre?: string;
  revisadoPorRol?: string;
};

type Props = {
  bitacoras: Bitacora[];
  groupMemberNames?: string[];
  isGroupProject?: boolean;
  mode?: 'review' | 'observation';
  session: AuthenticatedSession;
};

const statusColors: Record<string, { background: string; color: string; label: string }> = {
  Enviada: { background: '#EEF4F1', color: '#62766E', label: 'Pendiente' },
  Aprobada: { background: '#EAFBF7', color: '#0E8F72', label: 'Aprobada' },
  Rechazada: { background: '#FFF1EB', color: '#C45C43', label: 'Desaprobada' },
  Correccion: { background: '#FFF8E5', color: '#A66A00', label: 'Requiere corrección' },
  Borrador: { background: '#F1F3F4', color: '#5F6368', label: 'Borrador' },
};

export function BitacorasReviewPanel({ bitacoras, groupMemberNames = [], isGroupProject = false, mode = 'review', session }: Props) {
  const [selectedId, setSelectedId] = useState('');
  const [observacion, setObservacion] = useState('');
  const [editingObservationId, setEditingObservationId] = useState('');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedBitacora = bitacoras.find((item) => item.id === selectedId);

  useEffect(() => {
    if (selectedId && !bitacoras.some((item) => item.id === selectedId)) {
      setSelectedId('');
      setObservacion('');
    }
  }, [bitacoras, selectedId]);

  const openBitacora = (bitacora: Bitacora) => {
    setSelectedId(bitacora.id);
    setObservacion('');
    setEditingObservationId('');
    setFeedback('');
  };

  const closeDetail = () => {
    setSelectedId('');
    setObservacion('');
    setEditingObservationId('');
    setFeedback('');
  };

  const openAttachedFile = async (url?: string) => {
    const fileUrl = normalizeFileUrl(url);

    if (!fileUrl || !/^https?:\/\//i.test(fileUrl)) {
      setFeedback('Este adjunto quedó guardado como archivo local. Vuelve a adjuntarlo para generar un enlace permanente.');
      return;
    }

    try {
      await Linking.openURL(fileUrl);
    } catch (error) {
      setFeedback('No pudimos abrir el archivo adjunto.');
    }
  };

  const saveReview = async (estado: 'Aprobada' | 'Rechazada' | 'Correccion') => {
    if (!selectedBitacora?.id) {
      setFeedback('Selecciona una bitácora para revisar.');
      return;
    }

    if (!observacion.trim()) {
      setFeedback('Escribe una observación antes de guardar la revisión.');
      return;
    }

    setSaving(true);
    setFeedback('');

    try {
      await revisarBitacora(selectedBitacora.id, {
        estado,
        observacion,
        observacionId: editingObservationId,
        revisadoPorUid: session.uid,
        revisadoPorNombre: session.name,
        revisadoPorRol: session.role,
      });
      setFeedback('Revisión guardada correctamente.');
    } catch (error) {
      const typedError = error as { message?: string };
      setFeedback(typedError.message || 'No pudimos guardar la revisión.');
    } finally {
      setSaving(false);
    }
  };

  const handleReview = (estado: 'Aprobada' | 'Rechazada' | 'Correccion') => {
    const actionLabel = estado === 'Aprobada'
      ? 'aprobar'
      : estado === 'Correccion'
        ? 'solicitar corrección para'
        : 'desaprobar';

    Alert.alert(
      'Confirmar revisión',
      `¿Seguro que deseas ${actionLabel} esta bitácora?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Aceptar', onPress: () => saveReview(estado) },
      ]
    );
  };

  const saveObservation = async () => {
    if (!selectedBitacora?.id) {
      setFeedback('Selecciona una bitácora para observar.');
      return;
    }

    if (!observacion.trim()) {
      setFeedback('Escribe una observación antes de guardar.');
      return;
    }

    setSaving(true);
    setFeedback('');

    try {
      await observarBitacora(selectedBitacora.id, {
        observacion,
        observacionId: editingObservationId,
        revisadoPorUid: session.uid,
        revisadoPorNombre: session.name,
        revisadoPorRol: session.role,
      });
      setFeedback('Observación guardada correctamente.');
    } catch (error) {
      const typedError = error as { message?: string };
      setFeedback(typedError.message || 'No pudimos guardar la observación.');
    } finally {
      setSaving(false);
    }
  };

  const startEditObservation = (item: Observation) => {
    setEditingObservationId(item.id || '');
    setObservacion(item.texto || '');
    setFeedback('');
  };

  const deleteObservation = (item: Observation) => {
    if (!selectedBitacora?.id || !item.id) {
      return;
    }

    Alert.alert('Eliminar observación', '¿Seguro que deseas eliminar esta observación', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await eliminarObservacionBitacora(selectedBitacora.id, item.id);
            if (editingObservationId === item.id) {
              setEditingObservationId('');
              setObservacion('');
            }
            setFeedback('Observación eliminada.');
          } catch (error) {
            const typedError = error as { message: string };
            setFeedback(typedError.message || 'No pudimos eliminar la observación.');
          }
        },
      },
    ]);
  };

  if (!bitacoras.length) {
    return (
      <View style={styles.emptyCard}>
        <MaterialCommunityIcons name="notebook-outline" size={34} color="#117C72" />
        <Text style={styles.emptyTitle}>No hay bitácoras para este filtro</Text>
        <Text style={styles.emptyText}>
          Cuando el aprendiz registre avances para este proyecto, aparecerán aquí.
        </Text>
      </View>
    );
  }

  if (selectedBitacora) {
    const status = getStatus(selectedBitacora.estado);
    const observations = getBitacoraObservations(selectedBitacora);

    return (
      <View style={styles.detailCard}>
        <Pressable onPress={closeDetail} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={19} color="#117C72" />
          <Text style={styles.backButtonText}>Volver a las bitácoras</Text>
        </Pressable>

        <View style={styles.detailHeader}>
          <View style={styles.detailCopy}>
            <Text style={styles.detailTitle}>{selectedBitacora.proyectoTitulo || 'Bitácora del proyecto'}</Text>
            <Text style={styles.detailMeta}>
              {isGroupProject ? `Grupo: ${formatGroupMembers(groupMemberNames)}` : selectedBitacora.aprendizNombre || 'Aprendiz'} · {selectedBitacora.fecha || 'Sin fecha'}
            </Text>
            {isGroupProject ? (
              <Text style={styles.detailMeta}>
                Publicada por {selectedBitacora.aprendizNombre || 'integrante del grupo'}
              </Text>
            ) : null}
          </View>
          <StatusBadge status={status} />
        </View>

        <DetailSection icon="text-box-outline" label="Actividad realizada">
          {selectedBitacora.descripcion || 'Sin descripción registrada.'}
        </DetailSection>
        <DetailSection icon="progress-check" label="Avance alcanzado">
          {selectedBitacora.avance || 'Sin avance registrado.'}
        </DetailSection>
        <DetailSection icon="alert-circle-outline" label="Dificultades o novedades">
          {selectedBitacora.dificultades || 'El aprendiz no registró dificultades.'}
        </DetailSection>

        <View style={styles.detailSection}>
          <Text style={styles.detailSectionLabel}>Evidencias fotográficas</Text>
          <View style={styles.evidenceRow}>
            {(selectedBitacora.evidencias || []).map((evidence, index) => {
              const imageUri = getImageUri(evidence);
              return imageUri ? (
                <Image
                  key={`${selectedBitacora.id}-${index}`}
                  source={{ uri: imageUri }}
                  style={styles.evidenceImage}
                />
              ) : null;
            })}
            {!selectedBitacora.evidencias?.length ? (
              <Text style={styles.emptyEvidence}>Sin fotografías adjuntas.</Text>
            ) : null}
          </View>
        </View>

        {selectedBitacora.archivoUrl ? (
          <Pressable
            onPress={() => openAttachedFile(selectedBitacora.archivoUrl)}
            style={styles.fileButton}>
            <MaterialCommunityIcons name="file-document-outline" size={18} color="#117C72" />
            <Text numberOfLines={1} style={styles.fileButtonText}>
              {selectedBitacora.archivoNombre || 'Abrir documento adjunto'}
            </Text>
            <MaterialCommunityIcons name="open-in-new" size={16} color="#117C72" />
          </Pressable>
        ) : null}

        <View style={styles.reviewBlock}>
          <Text style={styles.reviewTitle}>Observaciones registradas</Text>
          {observations.length ? observations.map((item) => {
            const ownObservation = item.autorUid === session.uid;
            return (
              <View key={item.id || `${item.autorUid}-${item.texto}`} style={styles.observationCard}>
                <View style={styles.observationHeader}>
                  <View style={styles.cardCopy}>
                    <Text style={styles.observationAuthor}>{item.autorNombre || 'Equipo académico'}</Text>
                    <Text style={styles.observationRole}>{item.autorRol || 'Observación'}</Text>
                  </View>
                  {ownObservation ? (
                    <View style={styles.observationActions}>
                      <Pressable onPress={() => startEditObservation(item)} style={styles.iconButton}>
                        <MaterialCommunityIcons name="pencil-outline" size={15} color="#117C72" />
                      </Pressable>
                      <Pressable onPress={() => deleteObservation(item)} style={styles.iconButton}>
                        <MaterialCommunityIcons name="trash-can-outline" size={15} color="#C45C43" />
                      </Pressable>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.observationText}>{item.texto}</Text>
              </View>
            );
          }) : (
            <Text style={styles.reviewText}>Todavía no hay observaciones registradas.</Text>
          )}
        </View>

        <View style={styles.reviewBlock}>
          <Text style={styles.reviewTitle}>{mode === 'observation' ? 'Observación del pasante' : 'Revisión del instructor'}</Text>
          <Text style={styles.reviewText}>
            {mode === 'observation'
              ? 'Registra una observacion tecnica. El estado de aprobacion queda a cargo del instructor.'
              : 'Registra una observacion clara antes de aprobar, desaprobar o solicitar correccion.'}
          </Text>
          <TextInput
            multiline
            onChangeText={setObservacion}
            placeholder="Escribe la retroalimentación para el aprendiz..."
            placeholderTextColor="#7A8B84"
            style={styles.textArea}
            value={observacion}
          />
          {mode === 'observation' ? (
            <View style={styles.actions}>
              <ReviewButton
                color="#117C72"
                disabled={saving}
                icon="pencil-circle-outline"
                label="Guardar observación"
                onPress={saveObservation}
              />
            </View>
          ) : (
            <View style={styles.actions}>
              <ReviewButton
                color="#91b483"
                disabled={saving}
                icon="check-circle-outline"
                label="Aprobar"
                onPress={() => handleReview('Aprobada')}
              />
              <ReviewButton
                color="#eccc90"
                disabled={saving}
                icon="pencil-circle-outline"
                label="Solicitar corrección"
                onPress={() => handleReview('Correccion')}
              />
              <ReviewButton
                color="#f5a38b"
                disabled={saving}
                icon="close-circle-outline"
                label="Desaprobar"
                onPress={() => handleReview('Rechazada')}
              />
            </View>
          )}
          {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      {bitacoras.map((bitacora) => {
        const status = getStatus(bitacora.estado);
        const evidenceCount = bitacora.evidencias?.length || 0;
        return (
          <Pressable key={bitacora.id} onPress={() => openBitacora(bitacora)} style={styles.bitacoraCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <MaterialCommunityIcons name="notebook-edit-outline" size={20} color="#117C72" />
              </View>
              <View style={styles.cardCopy}>
                <Text style={styles.cardTitle}>
                  {isGroupProject ? 'Bitácora grupal' : bitacora.aprendizNombre || 'Aprendiz'}
                </Text>
                <Text style={styles.cardMeta}>{bitacora.fecha || 'Sin fecha'}</Text>
                {isGroupProject ? (
                  <>
                    <Text style={styles.cardMeta}>Publicada por {bitacora.aprendizNombre || 'integrante del grupo'}</Text>
                    <Text style={styles.cardMeta}>Integrantes: {formatGroupMembers(groupMemberNames)}</Text>
                  </>
                ) : null}
              </View>
              <StatusBadge status={status} />
            </View>
            <Text numberOfLines={2} style={styles.cardText}>
              {bitacora.descripcion || 'Sin descripción registrada.'}
            </Text>
            <View style={styles.deliveryMetaRow}>
              <View style={styles.deliveryMetaPill}>
                <MaterialCommunityIcons name="image-outline" size={14} color="#117C72" />
                <Text style={styles.deliveryMetaText}>{evidenceCount} foto{evidenceCount === 1 ? '' : 's'}</Text>
              </View>
              <View style={styles.deliveryMetaPill}>
                <MaterialCommunityIcons name="file-document-outline" size={14} color="#117C72" />
                <Text style={styles.deliveryMetaText}>{bitacora.archivoUrl ? 'Documento adjunto' : 'Sin documento'}</Text>
              </View>
            </View>
            <View style={styles.openRow}>
              <Text style={styles.openText}>Ver información completa</Text>
              <MaterialCommunityIcons name="chevron-right" size={19} color="#117C72" />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function DetailSection({
  children,
  icon,
  label,
}: {
  children: string;
  icon: 'text-box-outline' | 'progress-check' | 'alert-circle-outline';
  label: string;
}) {
  return (
    <View style={styles.detailSection}>
      <View style={styles.detailSectionHeader}>
        <MaterialCommunityIcons name={icon} size={17} color="#117C72" />
        <Text style={styles.detailSectionLabel}>{label}</Text>
      </View>
      <Text style={styles.detailSectionText}>{children}</Text>
    </View>
  );
}

function getBitacoraObservations(bitacora: Bitacora): Observation[] {
  if (Array.isArray(bitacora.observaciones) && bitacora.observaciones.length) {
    return bitacora.observaciones;
  }

  if (!bitacora.observacion) {
    return [];
  }

  return [{
    id: 'legacy-observacion',
    autorUid: bitacora.revisadoPorUid,
    autorNombre: bitacora.revisadoPorNombre,
    autorRol: bitacora.revisadoPorRol,
    texto: bitacora.observacion,
  }];
}

function ReviewButton({
  color,
  disabled,
  icon,
  label,
  onPress,
}: {
  color: string;
  disabled: boolean;
  icon: 'check-circle-outline' | 'pencil-circle-outline' | 'close-circle-outline';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.actionButton, { backgroundColor: color }]}>
      <MaterialCommunityIcons name={icon} size={17} color="#FFFFFF" />
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
  );
}

function formatGroupMembers(groupMemberNames: string[]) {
  return groupMemberNames.length ? groupMemberNames.join(', ') : 'Sin integrantes registrados';
}

function StatusBadge({ status }: { status: { background: string; color: string; label: string } }) {
  return (
    <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
      <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
    </View>
  );
}

function getStatus(status?: string) {
  return statusColors[status || 'Enviada'] || statusColors.Enviada;
}

function getImageUri(evidence: Evidence) {
  if (evidence.base64?.startsWith('data:image')) return evidence.base64;
  if (evidence.url && (evidence.mimeType || '').startsWith('image/')) return evidence.url;
  return undefined;
}

function normalizeFileUrl(url?: string | null) {
  let cleanUrl = String(url || '').trim();

  if (!cleanUrl) {
    return '';
  }

  cleanUrl = cleanUrl
    .replace(/^https?:\/(?!\/)/i, (match) => `${match}/`)
    .replace(/^https?:\/\/https?:\/\//i, 'https://');

  if (/^\/\//.test(cleanUrl)) {
    return `https:${cleanUrl}`;
  }

  if (/^https?:\/\//i.test(cleanUrl)) {
    return cleanUrl;
  }

  if (/supabase\.co/i.test(cleanUrl)) {
    return `https://${cleanUrl}`;
  }

  return cleanUrl;
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    gap: 8,
    padding: 20,
  },
  emptyTitle: {
    color: '#173B35',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 16,
  },
  emptyText: {
    color: '#52645E',
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  bitacoraCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D7F2EB',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    gap: 13,
    padding: 22,
    shadowColor: '#0B2F2B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  cardIcon: {
    alignItems: 'center',
    backgroundColor: '#DDF7F1',
    borderRadius: 18,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  cardCopy: { flex: 1 },
  cardTitle: {
    color: '#173B35',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  cardMeta: {
    color: '#117C72',
    fontFamily: 'PoppinsMedium',
    fontSize: 10,
    lineHeight: 15,
  },
  cardText: {
    color: '#52645E',
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  deliveryMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  deliveryMetaPill: {
    alignItems: 'center',
    backgroundColor: '#F4FAF8',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  deliveryMetaText: {
    color: '#117C72',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 10,
  },
  openRow: {
    alignItems: 'center',
    backgroundColor: '#F4FAF8',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  openText: {
    color: '#117C72',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  statusText: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 9,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    elevation: 3,
    gap: 16,
    padding: 24,
    shadowColor: '#0B2F2B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  backButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#DDF7F1',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  backButtonText: {
    color: '#117C72',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  detailHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  detailCopy: { flex: 1 },
  detailTitle: {
    color: '#173B35',
    fontFamily: 'SulphurPointBold',
    fontSize: 25,
    lineHeight: 27,
  },
  detailMeta: {
    color: '#117C72',
    fontFamily: 'PoppinsMedium',
    fontSize: 11,
  },
  detailSection: {
    backgroundColor: '#F4FAF8',
    borderRadius: 16,
    gap: 8,
    padding: 16,
  },
  detailSectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  detailSectionLabel: {
    color: '#173B35',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  detailSectionText: {
    color: '#52645E',
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  evidenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  evidenceImage: {
    backgroundColor: '#EAF6F3',
    borderRadius: 12,
    height: 92,
    width: 92,
  },
  emptyEvidence: {
    color: '#7A8B84',
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
  },
  fileButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#DDF7F1',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 7,
    maxWidth: '100%',
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  fileButtonText: {
    color: '#117C72',
    flexShrink: 1,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  reviewBlock: {
    borderTopColor: '#D7F2EB',
    borderTopWidth: 1,
    gap: 12,
    paddingTop: 18,
  },
  reviewTitle: {
    color: '#173B35',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 15,
  },
  reviewText: {
    color: '#52645E',
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 17,
  },
  observationCard: {
    backgroundColor: '#F4FAF8',
    borderLeftColor: '#117C72',
    borderLeftWidth: 3,
    borderRadius: 14,
    gap: 7,
    padding: 11,
  },
  observationHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  observationAuthor: {
    color: '#173B35',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  observationRole: {
    color: '#7A8B84',
    fontFamily: 'PoppinsRegular',
    fontSize: 10,
  },
  observationText: {
    color: '#52645E',
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  observationActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  textArea: {
    backgroundColor: '#F4FAF8',
    borderRadius: 16,
    color: '#173B35',
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    minHeight: 96,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
  },
  feedback: {
    color: '#117C72',
    fontFamily: 'PoppinsMedium',
    fontSize: 11,
  },
});
