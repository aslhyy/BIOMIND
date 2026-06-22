import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { AuthenticatedSession } from '@/features/workspace/types';
// @ts-ignore
import { revisarBitacora } from '@/services/bitacoras';

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
    evidencias?: {
        nombre?: string;
        mimeType?: string;
        base64?: string;
        url?: string;
    }[];
    estado?: string;
    observacion?: string;
    revisadoPorUid?: string;
    revisadoPorNombre?: string;
};

type Props = {
    bitacoras: Bitacora[];
    session: AuthenticatedSession;
};

const statusColors: Record<string, { background: string; color: string; label: string }> = {
    Enviada: {
        background: '#EAF6F3',
        color: '#117C72',
        label: 'Enviada',
    },
    Aprobada: {
        background: '#EAFBF7',
        color: '#0E8F72',
        label: 'Aprobada',
    },
    Rechazada: {
        background: '#FFF1EB',
        color: '#C45C43',
        label: 'Rechazada',
    },
    Correccion: {
        background: '#FFF8E5',
        color: '#A66A00',
        label: 'Requiere corrección',
    },
    Borrador: {
        background: '#F1F3F4',
        color: '#5F6368',
        label: 'Borrador',
    },
};

export function BitacorasReviewPanel({ bitacoras, session }: Props) {
    const [selectedId, setSelectedId] = useState('');
    const [observacion, setObservacion] = useState('');
    const [feedback, setFeedback] = useState('');
    const [saving, setSaving] = useState(false);

    const selectedBitacora = bitacoras.find((item) => item.id === selectedId) || bitacoras[0];

    const selectBitacora = (bitacora: Bitacora) => {
        setSelectedId(bitacora.id);
        setObservacion(bitacora.observacion || '');
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
                <Text style={styles.emptyTitle}>No hay bitácoras todavía</Text>
                <Text style={styles.emptyText}>
                    Cuando los aprendices registren avances, aparecerán aquí para revisión.
                </Text>
            </View>
        );
    }

    return (
        <>
            <View style={styles.headerCard}>
                <Text style={styles.headerLabel}>Revisión diaria</Text>
                <Text style={styles.headerTitle}>Bitácoras y evidencias</Text>
                <Text style={styles.headerText}>
                    Consulta registros de aprendices, revisa evidencias fotográficas y deja retroalimentación.
                </Text>
            </View>

            <View style={styles.stack}>
                {bitacoras.map((bitacora) => {
                    const isActive = bitacora.id === selectedBitacora?.id;
                    const status = getStatus(bitacora.estado);

                    return (
                        <Pressable
                            key={bitacora.id}
                            onPress={() => selectBitacora(bitacora)}
                            style={[styles.bitacoraCard, isActive && styles.bitacoraCardActive]}>
                            <View style={styles.cardHeader}>
                                <View style={styles.cardCopy}>
                                    <Text style={styles.cardTitle}>
                                        {bitacora.proyectoTitulo || 'Proyecto sin título'}
                                    </Text>
                                    <Text style={styles.cardMeta}>
                                        {bitacora.aprendizNombre || 'Aprendiz'} · {bitacora.fecha || 'Sin fecha'}
                                    </Text>
                                </View>

                                <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
                                    <Text style={[styles.statusText, { color: status.color }]}>
                                        {status.label}
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.cardText}>{bitacora.descripcion || 'Sin descripción registrada.'}</Text>

                            <View style={styles.infoRow}>
                                <MaterialCommunityIcons name="progress-check" size={16} color="#117C72" />
                                <Text style={styles.infoText}>
                                    {bitacora.avance || 'Sin avance registrado.'}
                                </Text>
                            </View>

                            {bitacora.dificultades ? (
                                <View style={styles.infoRow}>
                                    <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#C45C43" />
                                    <Text style={styles.infoText}>{bitacora.dificultades}</Text>
                                </View>
                            ) : null}

                            <View style={styles.evidenceRow}>
                                {(bitacora.evidencias || []).map((evidence, index) => {
                                    const imageUri = evidence.base64 || evidence.url;

                                    if (!imageUri) {
                                        return null;
                                    }

                                    return (
                                        <Image
                                            key={`${bitacora.id}-${index}`}
                                            source={{ uri: imageUri }}
                                            style={styles.evidenceImage}
                                        />
                                    );
                                })}
                            </View>
                        </Pressable>
                    );
                })}
            </View>

            {selectedBitacora ? (
                <View style={styles.reviewCard}>
                    <Text style={styles.reviewTitle}>Retroalimentación al aprendiz</Text>
                    <Text style={styles.reviewSubtitle}>
                        {selectedBitacora.aprendizNombre || 'Aprendiz'} · {selectedBitacora.proyectoTitulo || 'Proyecto'}
                    </Text>

                    <TextInput
                        placeholder="Escribe una observación clara para el aprendiz..."
                        placeholderTextColor="#7A8B84"
                        value={observacion}
                        onChangeText={setObservacion}
                        style={styles.textArea}
                        multiline
                    />

                    <View style={styles.actions}>
                        <Pressable
                            disabled={saving}
                            onPress={() => handleReview('Aprobada')}
                            style={[styles.actionButton, styles.approveButton]}>
                            <MaterialCommunityIcons name="check-circle-outline" size={17} color="#FFFFFF" />
                            <Text style={styles.actionButtonText}>Aprobar</Text>
                        </Pressable>

                        <Pressable
                            disabled={saving}
                            onPress={() => handleReview('Correccion')}
                            style={[styles.actionButton, styles.correctionButton]}>
                            <MaterialCommunityIcons name="pencil-circle-outline" size={17} color="#FFFFFF" />
                            <Text style={styles.actionButtonText}>Corrección</Text>
                        </Pressable>

                        <Pressable
                            disabled={saving}
                            onPress={() => handleReview('Rechazada')}
                            style={[styles.actionButton, styles.rejectButton]}>
                            <MaterialCommunityIcons name="close-circle-outline" size={17} color="#FFFFFF" />
                            <Text style={styles.actionButtonText}>Rechazar</Text>
                        </Pressable>
                    </View>

                    {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
                </View>
            ) : null}
        </>
    );
}

function getStatus(status?: string) {
    return statusColors[status || 'Enviada'] || statusColors.Enviada;
}

const styles = StyleSheet.create({
    headerCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 16,
        gap: 6,
        shadowColor: '#0B2F2B',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    headerLabel: {
        color: '#117C72',
        fontFamily: 'PoppinsSemiBold',
        fontSize: 12,
    },
    headerTitle: {
        color: '#173B35',
        fontFamily: 'PoppinsSemiBold',
        fontSize: 20,
    },
    headerText: {
        color: '#52645E',
        fontFamily: 'PoppinsRegular',
        fontSize: 13,
        lineHeight: 19,
    },
    emptyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 20,
        alignItems: 'center',
        gap: 8,
    },
    emptyTitle: {
        color: '#173B35',
        fontFamily: 'PoppinsSemiBold',
        fontSize: 16,
    },
    emptyText: {
        color: '#52645E',
        fontFamily: 'PoppinsRegular',
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
    },
    stack: {
        gap: 12,
    },
    bitacoraCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 16,
        gap: 10,
        borderWidth: 1,
        borderColor: 'transparent',
        shadowColor: '#0B2F2B',
        shadowOpacity: 0.07,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },
    bitacoraCardActive: {
        borderColor: '#117C72',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        justifyContent: 'space-between',
    },
    cardCopy: {
        flex: 1,
        gap: 2,
    },
    cardTitle: {
        color: '#173B35',
        fontFamily: 'PoppinsSemiBold',
        fontSize: 14,
        lineHeight: 20,
    },
    cardMeta: {
        color: '#117C72',
        fontFamily: 'PoppinsMedium',
        fontSize: 11,
    },
    statusBadge: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    statusText: {
        fontFamily: 'PoppinsSemiBold',
        fontSize: 10,
    },
    cardText: {
        color: '#52645E',
        fontFamily: 'PoppinsRegular',
        fontSize: 12,
        lineHeight: 18,
    },
    infoRow: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'flex-start',
    },
    infoText: {
        flex: 1,
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
        width: 72,
        height: 72,
        borderRadius: 12,
        backgroundColor: '#EAF6F3',
    },
    reviewCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 16,
        gap: 12,
        shadowColor: '#0B2F2B',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    reviewTitle: {
        color: '#173B35',
        fontFamily: 'PoppinsSemiBold',
        fontSize: 16,
    },
    reviewSubtitle: {
        color: '#117C72',
        fontFamily: 'PoppinsMedium',
        fontSize: 12,
    },
    textArea: {
        minHeight: 96,
        borderRadius: 16,
        backgroundColor: '#F4FAF8',
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: '#173B35',
        fontFamily: 'PoppinsRegular',
        fontSize: 13,
        textAlignVertical: 'top',
    },
    actions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        paddingHorizontal: 13,
        paddingVertical: 10,
    },
    approveButton: {
        backgroundColor: '#117C72',
    },
    correctionButton: {
        backgroundColor: '#D9941E',
    },
    rejectButton: {
        backgroundColor: '#C45C43',
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontFamily: 'PoppinsSemiBold',
        fontSize: 12,
    },
    feedback: {
        color: '#117C72',
        fontFamily: 'PoppinsMedium',
        fontSize: 12,
    },
});