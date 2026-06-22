import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { learnerProjects } from '../data';
import { learnerPalette } from '../theme';
import type { AuthenticatedSession } from '@/features/workspace/types';
// @ts-ignore
import { eliminarBitacora, escucharBitacorasAprendiz, guardarBitacora } from '@/services/bitacoras';

type Props = {
    session: AuthenticatedSession;
};

export function LearnerBitacorasTab({ session }: Props) {
    const [bitacoras, setBitacoras] = useState<any[]>([]);
    const [editingId, setEditingId] = useState('');
    const [feedback, setFeedback] = useState('');
    const [form, setForm] = useState({
        proyectoId: learnerProjects[0]?.id || '',
        descripcion: '',
        fecha: new Date().toISOString().slice(0, 10),
        avance: '',
        dificultades: '',
        evidencias: [] as any[],
    });

    const selectedProject = learnerProjects.find((project) => project.id === form.proyectoId) || learnerProjects[0];

    useEffect(() => {
        const unsubscribe = escucharBitacorasAprendiz(
            session.uid,
            setBitacoras,
            () => setFeedback('No pudimos cargar tus bitácoras.')
        );

        return unsubscribe;
    }, [session.uid]);

    const updateField = (field: string, value: string) => {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const pickEvidence = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
            setFeedback('Necesitamos permiso para seleccionar evidencias.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.35,
            base64: true,
        });

        if (result.canceled || !result.assets?.length) {
            return;
        }

        const asset = result.assets[0];

        if (!asset.base64) {
            setFeedback('No pudimos preparar la imagen.');
            return;
        }

        const mimeType = asset.mimeType || 'image/jpeg';

        setForm((current) => ({
            ...current,
            evidencias: [
                ...current.evidencias,
                {
                    nombre: asset.fileName || `evidencia-${Date.now()}.jpg`,
                    mimeType,
                    base64: `data:${mimeType};base64,${asset.base64}`,
                },
            ],
        }));
    };

    const resetForm = () => {
        setEditingId('');
        setForm({
            proyectoId: learnerProjects[0]?.id || '',
            descripcion: '',
            fecha: new Date().toISOString().slice(0, 10),
            avance: '',
            dificultades: '',
            evidencias: [],
        });
    };

    const handleSave = async () => {
        if (!form.descripcion.trim() || !form.fecha.trim() || !form.avance.trim()) {
            setFeedback('Completa descripción, fecha y avance realizado.');
            return;
        }

        try {
            await guardarBitacora({
                id: editingId || undefined,
                aprendizUid: session.uid,
                aprendizNombre: session.name,
                proyectoId: selectedProject?.id || form.proyectoId,
                proyectoTitulo: selectedProject
                    ? `${selectedProject.title} - ${selectedProject.species}`
                    : form.proyectoId,
                fichaId: session.fichaId || session.ficha || '',
                descripcion: form.descripcion,
                fecha: form.fecha,
                avance: form.avance,
                dificultades: form.dificultades,
                evidencias: form.evidencias,
                estado: 'Enviada',
            });

            setFeedback(editingId ? 'Bitácora actualizada.' : 'Bitácora creada.');
            resetForm();
        } catch (error) {
            const typedError = error as { message?: string };
            setFeedback(typedError.message || 'No pudimos guardar la bitácora.');
        }
    };

    const handleEdit = (bitacora: any) => {
        setEditingId(bitacora.id);
        setForm({
            proyectoId: bitacora.proyectoId || learnerProjects[0]?.id || '',
            descripcion: bitacora.descripcion || '',
            fecha: bitacora.fecha || new Date().toISOString().slice(0, 10),
            avance: bitacora.avance || '',
            dificultades: bitacora.dificultades || '',
            evidencias: bitacora.evidencias || [],
        });
    };

    const handleDelete = (bitacoraId: string) => {
        Alert.alert('Eliminar bitácora', '¿Seguro que quieres eliminar esta bitácora?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar',
                style: 'destructive',
                onPress: async () => {
                    await eliminarBitacora(bitacoraId);
                    setFeedback('Bitácora eliminada.');
                },
            },
        ]);
    };

    return (
        <>
            <View style={styles.formCard}>
                <Text style={styles.title}>{editingId ? 'Editar bitácora' : 'Nueva bitácora'}</Text>

                <View style={styles.projectRow}>
                    {learnerProjects.map((project) => (
                        <Pressable
                            key={project.id}
                            onPress={() => updateField('proyectoId', project.id)}
                            style={[styles.projectChip, form.proyectoId === project.id && styles.projectChipActive]}>
                            <Text style={[styles.projectChipText, form.proyectoId === project.id && styles.projectChipTextActive]}>
                                {project.species}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                <TextInput
                    placeholder="Descripción"
                    value={form.descripcion}
                    onChangeText={(value) => updateField('descripcion', value)}
                    style={styles.input}
                    multiline
                />

                <TextInput
                    placeholder="Fecha AAAA-MM-DD"
                    value={form.fecha}
                    onChangeText={(value) => updateField('fecha', value)}
                    style={styles.input}
                />

                <TextInput
                    placeholder="Avance realizado"
                    value={form.avance}
                    onChangeText={(value) => updateField('avance', value)}
                    style={styles.input}
                    multiline
                />

                <TextInput
                    placeholder="Dificultades"
                    value={form.dificultades}
                    onChangeText={(value) => updateField('dificultades', value)}
                    style={styles.input}
                    multiline
                />

                <Pressable onPress={pickEvidence} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Agregar evidencia fotográfica</Text>
                </Pressable>

                <View style={styles.evidenceRow}>
                    {form.evidencias.map((evidence, index) => (
                        <Image key={`${evidence.nombre}-${index}`} source={{ uri: evidence.base64 }} style={styles.evidenceImage} />
                    ))}
                </View>

                <Pressable onPress={handleSave} style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>{editingId ? 'Actualizar bitácora' : 'Guardar bitácora'}</Text>
                </Pressable>

                {editingId ? (
                    <Pressable onPress={resetForm} style={styles.cancelButton}>
                        <Text style={styles.cancelButtonText}>Cancelar edición</Text>
                    </Pressable>
                ) : null}

                {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
            </View>

            <Text style={styles.sectionTitle}>Historial de bitácoras</Text>

            <View style={styles.stack}>
                {bitacoras.map((bitacora) => (
                    <View key={bitacora.id} style={styles.bitacoraCard}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardCopy}>
                                <Text style={styles.cardTitle}>{bitacora.proyectoTitulo}</Text>
                                <Text style={styles.cardDate}>{bitacora.fecha}</Text>
                            </View>
                            <Text style={styles.status}>{bitacora.estado}</Text>
                        </View>

                        <Text style={styles.cardText}>{bitacora.descripcion}</Text>
                        <Text style={styles.cardText}>Avance: {bitacora.avance}</Text>

                        {bitacora.dificultades ? (
                            <Text style={styles.cardText}>Dificultades: {bitacora.dificultades}</Text>
                        ) : null}

                        {bitacora.observacion ? (
                            <Text style={styles.observation}>Retroalimentación: {bitacora.observacion}</Text>
                        ) : null}

                        <View style={styles.evidenceRow}>
                            {(bitacora.evidencias || []).map((evidence: any, index: number) => (
                                <Image key={`${bitacora.id}-${index}`} source={{ uri: evidence.base64 }} style={styles.evidenceImage} />
                            ))}
                        </View>

                        <View style={styles.actions}>
                            <Pressable onPress={() => handleEdit(bitacora)} style={styles.smallButton}>
                                <Text style={styles.smallButtonText}>Editar</Text>
                            </Pressable>
                            <Pressable onPress={() => handleDelete(bitacora.id)} style={styles.deleteButton}>
                                <Text style={styles.deleteButtonText}>Eliminar</Text>
                            </Pressable>
                        </View>
                    </View>
                ))}
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    formCard: {
        backgroundColor: learnerPalette.surface,
        borderRadius: 22,
        padding: 16,
        gap: 12,
    },
    title: {
        color: learnerPalette.text,
        fontFamily: 'PoppinsSemiBold',
        fontSize: 18,
    },
    projectRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    projectChip: {
        backgroundColor: learnerPalette.mint,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    projectChipActive: {
        backgroundColor: learnerPalette.primary,
    },
    projectChipText: {
        color: learnerPalette.primary,
        fontFamily: 'PoppinsMedium',
        fontSize: 12,
    },
    projectChipTextActive: {
        color: '#FFFFFF',
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
    primaryButton: {
        backgroundColor: learnerPalette.primary,
        borderRadius: 999,
        paddingVertical: 13,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontFamily: 'PoppinsSemiBold',
        fontSize: 13,
    },
    secondaryButton: {
        backgroundColor: learnerPalette.mint,
        borderRadius: 999,
        paddingVertical: 12,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: learnerPalette.primary,
        fontFamily: 'PoppinsSemiBold',
        fontSize: 12,
    },
    cancelButton: {
        alignItems: 'center',
    },
    cancelButtonText: {
        color: learnerPalette.textMuted,
        fontFamily: 'PoppinsMedium',
        fontSize: 12,
    },
    feedback: {
        color: learnerPalette.primary,
        fontFamily: 'PoppinsMedium',
        fontSize: 12,
    },
    sectionTitle: {
        color: learnerPalette.text,
        fontFamily: 'PoppinsSemiBold',
        fontSize: 17,
    },
    stack: {
        gap: 12,
    },
    bitacoraCard: {
        backgroundColor: learnerPalette.surface,
        borderRadius: 22,
        padding: 16,
        gap: 8,
    },
    cardHeader: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
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
    cardDate: {
        color: learnerPalette.primary,
        fontFamily: 'PoppinsMedium',
        fontSize: 11,
    },
    status: {
        color: learnerPalette.primary,
        fontFamily: 'PoppinsSemiBold',
        fontSize: 11,
    },
    cardText: {
        color: learnerPalette.textMuted,
        fontFamily: 'PoppinsRegular',
        fontSize: 12,
        lineHeight: 18,
    },
    observation: {
        color: learnerPalette.primary,
        fontFamily: 'PoppinsMedium',
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
        backgroundColor: learnerPalette.surfaceMuted,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    smallButton: {
        backgroundColor: learnerPalette.mint,
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 9,
    },
    smallButtonText: {
        color: learnerPalette.primary,
        fontFamily: 'PoppinsSemiBold',
        fontSize: 12,
    },
    deleteButton: {
        backgroundColor: '#FFF1EB',
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 9,
    },
    deleteButtonText: {
        color: '#C45C43',
        fontFamily: 'PoppinsSemiBold',
        fontSize: 12,
    },
});