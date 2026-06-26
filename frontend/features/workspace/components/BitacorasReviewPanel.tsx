import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AuthenticatedSession } from '@/features/workspace/types';
// @ts-ignore
import { revisarBitacora } from '@/services/bitacoras';

type Evidence = {
  nombre?: string;
  mimeType?: string;
  base64?: string;
  url?: string;
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
  revisadoPorUid?: string;
  revisadoPorNombre?: string;
  revisadoPorRol?: string;
};

type Props = {
  bitacoras: Bitacora[];
  session: AuthenticatedSession;
};

const statusColors: Record<string, { background: string; color: string; label: string }> = {
  Enviada: { background: '#EEF4F1', color: '#62766E', label: 'Pendiente' },
  Aprobada: { background: '#EAFBF7', color: '#0E8F72', label: 'Aprobada' },
  Rechazada: { background: '#FFF1EB', color: '#C45C43', label: 'Desaprobada' },
  Correccion: { background: '#FFF8E5', color: '#A66A00', label: 'Requiere corrección' },
  Borrador: { background: '#F1F3F4', color: '#5F6368', label: 'Borrador' },
};

export function BitacorasReviewPanel({ bitacoras, session }: Props) {
  const [selectedId, setSelectedId] = useState('');
  const [observacion, setObservacion] = useState('');
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
    setObservacion(bitacora.observacion || '');
    setFeedback('');
  };

  const closeDetail = () => {
    setSelectedId('');
    setObservacion('');
    setFeedback('');
  };

  const handleReview = async (estado: 'Aprobada' | 'Rechazada' | 'Correccion') => {
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
              {selectedBitacora.aprendizNombre || 'Aprendiz'} · {selectedBitacora.fecha || 'Sin fecha'}
            </Text>
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
            onPress={() => Linking.openURL(selectedBitacora.archivoUrl || '')}
            style={styles.fileButton}>
            <MaterialCommunityIcons name="file-document-outline" size={18} color="#117C72" />
            <Text numberOfLines={1} style={styles.fileButtonText}>
              {selectedBitacora.archivoNombre || 'Abrir documento adjunto'}
            </Text>
            <MaterialCommunityIcons name="open-in-new" size={16} color="#117C72" />
          </Pressable>
        ) : null}

        <View style={styles.reviewBlock}>
          <Text style={styles.reviewTitle}>Revisión del instructor</Text>
          <Text style={styles.reviewText}>
            Registra una observación clara antes de aprobar, desaprobar o solicitar corrección.
          </Text>
          <TextInput
            multiline
            onChangeText={setObservacion}
            placeholder="Escribe la retroalimentación para el aprendiz..."
            placeholderTextColor="#7A8B84"
            style={styles.textArea}
            value={observacion}
          />
          <View style={styles.actions}>
            <ReviewButton
              color="#117C72"
              disabled={saving}
              icon="check-circle-outline"
              label="Aprobar"
              onPress={() => handleReview('Aprobada')}
            />
            <ReviewButton
              color="#D9941E"
              disabled={saving}
              icon="pencil-circle-outline"
              label="Solicitar corrección"
              onPress={() => handleReview('Correccion')}
            />
            <ReviewButton
              color="#C45C43"
              disabled={saving}
              icon="close-circle-outline"
              label="Desaprobar"
              onPress={() => handleReview('Rechazada')}
            />
          </View>
          {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      {bitacoras.map((bitacora) => {
        const status = getStatus(bitacora.estado);
        return (
          <Pressable key={bitacora.id} onPress={() => openBitacora(bitacora)} style={styles.bitacoraCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <MaterialCommunityIcons name="notebook-edit-outline" size={20} color="#117C72" />
              </View>
              <View style={styles.cardCopy}>
                <Text style={styles.cardTitle}>{bitacora.aprendizNombre || 'Aprendiz'}</Text>
                <Text style={styles.cardMeta}>{bitacora.fecha || 'Sin fecha'}</Text>
              </View>
              <StatusBadge status={status} />
            </View>
            <Text numberOfLines={2} style={styles.cardText}>
              {bitacora.descripcion || 'Sin descripción registrada.'}
            </Text>
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
  if (evidence.url && evidence.mimeType?.startsWith('image/')) return evidence.url;
  return undefined;
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
    borderRadius: 22,
    elevation: 2,
    gap: 10,
    padding: 16,
    shadowColor: '#0B2F2B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
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
  },
  cardText: {
    color: '#52645E',
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  openRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
    borderRadius: 26,
    elevation: 3,
    gap: 15,
    padding: 17,
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
    gap: 7,
    padding: 13,
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
    gap: 10,
    paddingTop: 15,
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
