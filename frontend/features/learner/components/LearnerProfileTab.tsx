import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { actualizarPerfilUsuario } from '@/services/auth';
// @ts-ignore
import { escucharContextoAcademicoUsuario, escucharFichas, escucharGruposTrabajo, escucharProyectos, solicitarFichaAprendiz } from '@/services/academic';
// @ts-ignore
import { escucharBitacoras } from '@/services/bitacoras';
import { learnerPalette } from '@/features/learner/theme';
import { ProgressBar, SectionHeading } from '@/features/learner/components/LearnerUI';
import { UserAvatar } from '@/features/workspace/components/UserAvatar';
import type { AuthenticatedSession } from '@/features/workspace/types';
import { LearnerSectionIntro } from './LearnerSectionIntro';

type LearnerProfileTabProps = {
  session: AuthenticatedSession;
  voiceEnabled: boolean;
  autoSaveEnabled: boolean;
  voiceSuggestionsEnabled: boolean;
  onAutoSaveChange: (value: boolean) => void;
  onSignOut: () => Promise<void> | void;
  onVoiceChange: (value: boolean) => void;
  onVoiceSuggestionsChange: (value: boolean) => void;
};

export function LearnerProfileTab({
  session,
  voiceEnabled,
  autoSaveEnabled,
  voiceSuggestionsEnabled,
  onAutoSaveChange,
  onSignOut,
  onVoiceChange,
  onVoiceSuggestionsChange,
}: LearnerProfileTabProps) {
  const [name, setName] = useState(session.name);
  const [email, setEmail] = useState(session.email);
  const [photoUri, setPhotoUri] = useState(session.photoUrl || '');
  const [photoBase64, setPhotoBase64] = useState('');
  const [photoMimeType, setPhotoMimeType] = useState('image/jpeg');
  const [saving, setSaving] = useState(false);
  const [fichas, setFichas] = useState<{ id: string; numero: string; programaNombre: string; activo: boolean; estado: string }[]>([]);
  const [contextFichas, setContextFichas] = useState<{ id?: string; numero?: string }[]>([]);
  const [groups, setGroups] = useState<{ id: string; fichaId?: string; fichaNumero?: string; aprendizIds?: string[] }[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [bitacoras, setBitacoras] = useState<any[]>([]);
  const [selectedFichaId, setSelectedFichaId] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    setName(session.name);
    setEmail(session.email);
    setPhotoUri(session.photoUrl || '');
  }, [session.email, session.name, session.photoUrl]);

  useEffect(() => {
    const unsubscribe = escucharFichas(
      (items: any[]) => setFichas(items.filter((ficha) => ficha.activo !== false && ficha.estado !== 'Inactiva')),
      () => setFeedback('No pudimos cargar las fichas disponibles.')
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleError = () => setFeedback('No pudimos cargar tu progreso académico.');
    const unsubscribeContext = escucharContextoAcademicoUsuario(
      session,
      (nextContext: any) => setContextFichas(nextContext.fichas || []),
      handleError
    );
    const unsubscribeGroups = escucharGruposTrabajo(setGroups, handleError);
    const unsubscribeProjects = escucharProyectos(setProjects, handleError);
    const unsubscribeBitacoras = escucharBitacoras(setBitacoras, handleError);

    return () => {
      unsubscribeContext?.();
      unsubscribeGroups?.();
      unsubscribeProjects?.();
      unsubscribeBitacoras?.();
    };
  }, [session]);

  const realProgress = useMemo(() => {
    const liveSheet = contextFichas[0];
    const sheetKeys = new Set((liveSheet ? [liveSheet.id, liveSheet.numero] : [session.fichaId, session.ficha])
      .filter(Boolean)
      .map(String));
    const learnerGroupIds = new Set(groups
      .filter((group) =>
        (group.aprendizIds || []).includes(session.uid)
        && (sheetKeys.has(String(group.fichaId || '')) || sheetKeys.has(String(group.fichaNumero || '')))
      )
      .map((group) => group.id));
    const assignedProjects = projects.filter((project) => {
      if (!project.id || project.activo === false || project.estado === 'Inactivo') return false;
      const belongsToSheet = sheetKeys.has(String(project.fichaId || '')) || sheetKeys.has(String(project.fichaNumero || ''));
      if (!belongsToSheet) return false;
      if (project.asignacionTipo === 'grupo' || project.grupoId) {
        return Boolean(project.grupoId && learnerGroupIds.has(project.grupoId));
      }
      return true;
    });

    if (!assignedProjects.length) return 0;

    const progressTotal = assignedProjects.reduce((total, project) => {
      const projectLogs = bitacoras.filter((bitacora) => {
        if (bitacora.proyectoId !== project.id) return false;
        if (project.asignacionTipo === 'grupo' || project.grupoId) return Boolean(project.grupoId && learnerGroupIds.has(project.grupoId));
        return bitacora.aprendizUid === session.uid;
      });
      const expected = Number(project.bitacorasEsperadas || 0);
      const progress = expected > 0
        ? Math.round((projectLogs.length / expected) * 100)
        : Number(project.progreso || 0);
      return total + Math.max(0, Math.min(100, Number.isFinite(progress) ? progress : 0));
    }, 0);

    return Math.round(progressTotal / assignedProjects.length);
  }, [bitacoras, contextFichas, groups, projects, session.ficha, session.fichaId, session.uid]);

  const pickProfilePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setFeedback('Necesitamos permiso para abrir tu galería y cambiar la foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.35,
      base64: true,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];

    if (!asset.base64) {
      setFeedback('No pudimos preparar la foto para guardarla. Intenta con otra imagen.');
      return;
    }

    setPhotoUri(asset.uri);
    setPhotoBase64(asset.base64 || '');
    setPhotoMimeType(asset.mimeType || 'image/jpeg');
    setFeedback('Foto lista para guardarse en tu perfil.');
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setFeedback('Falta el nombre. Ingresa tu nombre antes de guardar el perfil.');
      return;
    }
    if (!email.trim()) {
      setFeedback('Ingresa un correo válido antes de guardar.');
      return;
    }

    setSaving(true);
    setFeedback('');

    try {
      const updatedProfile = await actualizarPerfilUsuario({
        correo: email,
        nombre: name,
        fotoPerfilBase64: photoBase64 || undefined,
        fotoPerfilMimeType: photoBase64 ? photoMimeType : undefined,
      });
      setPhotoBase64('');
      if (updatedProfile?.fotoUrl) {
        setPhotoUri(updatedProfile.fotoUrl);
      }
      setFeedback('Perfil actualizado correctamente.');
    } catch (error) {
      const typedError = error as { message?: string };
      setFeedback(typedError?.message || 'No pudimos actualizar tu perfil.');
    } finally {
      setSaving(false);
    }
  };

  const requestFicha = async () => {
    const ficha = fichas.find((item) => item.id === selectedFichaId);

    if (!ficha) {
      setFeedback('Selecciona una ficha para solicitar inscripción.');
      return;
    }

    if (session.fichaId && ficha.id === session.fichaId) {
      setFeedback('Ya perteneces a esa ficha. Selecciona una ficha diferente para solicitar cambio.');
      return;
    }

    setSaving(true);
    setFeedback('');

    try {
      await solicitarFichaAprendiz({ aprendizUid: session.uid, ficha });
      setFeedback(session.fichaId
        ? 'Solicitud de cambio enviada. El instructor de la nueva ficha debe aprobarla.'
        : 'Solicitud enviada. Tu instructor debe darte de alta para activar la ficha.');
    } catch (error) {
      const typedError = error as { message: string };
      setFeedback(typedError.message || 'No pudimos enviar la solicitud de ficha.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>


      <View style={styles.profileCard}>
        <Pressable onPress={pickProfilePhoto} style={styles.avatarWrap}>
          <UserAvatar name={name} photoUrl={photoUri || session.photoUrl} size={100} />
          <View style={styles.cameraBadge}>
            <Text style={styles.cameraBadgeText}>Cambiar foto</Text>
          </View>
        </Pressable>

        <View style={styles.formStack}>
          <Field label="Nombre" value={name} onChangeText={setName} />
          <Field label="Correo" value={email} onChangeText={setEmail} />
          <Field
            label="Programa"
            value={session.programa || 'Aún no tienes programa asignado por el administrador.'}
            editable={false}
          />

          <Field
            label="Ficha"
            value={session.ficha || 'Aún no tienes ficha asignada por el administrador.'}
            editable={false}
          />

          <Field
            label="Trimestre actual"
            value={session.trimestreActual || 'Aún no tienes trimestre asignado.'}
            editable={false}
          />
        </View>

        {true ? (
          <View style={styles.fichaRequestCard}>
            <Text style={styles.fichaRequestTitle}>{session.fichaId ? 'Solicitar cambio de ficha' : 'Solicitar ficha'}</Text>
            <Text style={styles.fichaRequestText}>
              Elige una ficha creada por administración. El instructor responsable debe aprobar tu alta.
            </Text>
            {session.fichaSolicitudId ? (
              <View style={styles.pendingRequestBox}>
                <Text style={styles.pendingRequestText}>
                  Solicitud pendiente: Ficha {session.fichaSolicitudNumero || session.fichaSolicitudId}
                </Text>
              </View>
            ) : null}
            <View style={styles.fichaOptions}>
              {fichas.map((ficha) => {
                const active = ficha.id === selectedFichaId;
                const current = session.fichaId === ficha.id;
                return (
                  <Pressable
                    disabled={current}
                    key={ficha.id}
                    onPress={() => setSelectedFichaId(ficha.id)}
                    style={[styles.fichaChip, active && styles.fichaChipActive, current && styles.fichaChipCurrent]}>
                    <Text style={[styles.fichaChipText, active && styles.fichaChipTextActive]}>
                      Ficha {ficha.numero || ficha.id}
                    </Text>
                    <Text style={[styles.fichaChipMeta, active && styles.fichaChipTextActive]}>
                      {current ? 'Ficha actual' : ficha.programaNombre || 'Programa pendiente'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable disabled={saving} onPress={requestFicha} style={styles.requestFichaButton}>
              <Text style={styles.requestFichaText}>{session.fichaId ? 'Solicitar cambio' : 'Solicitar alta'}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Progreso académico</Text>
            <Text style={styles.progressValue}>{realProgress}%</Text>
          </View>
          <ProgressBar accent={learnerPalette.primary} progress={realProgress} soft="#EAF6F3" />
        </View>

        <View style={styles.profileActions}>
          <Pressable onPress={handleSaveProfile} style={styles.primaryButton}>
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Guardar perfil</Text>
            )}
          </Pressable>

          <Pressable onPress={onSignOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Cerrar sesión</Text>
          </Pressable>
        </View>

        {feedback ? <Text style={styles.feedbackText}>{feedback}</Text> : null}
      </View>

      <SectionHeading
        actionLabel="Voz"
        subtitle="Preferencias del asistente para registrar observaciones."
        title="Asistente BIOMIND"
      />

      <View style={styles.stack}>
        <ToggleRow
          description="Activa registro por voz durante las prácticas."
          title="Dictado de voz"
          value={voiceEnabled}
          onValueChange={onVoiceChange}
        />
        <ToggleRow
          description="Guarda automáticamente lo que confirmes en la conversación."
          title="Guardado automático"
          value={autoSaveEnabled}
          onValueChange={onAutoSaveChange}
        />
        <ToggleRow
          description="Lee sugerencias y preguntas en voz alta."
          title="Sugerencias por voz"
          value={voiceSuggestionsEnabled}
          onValueChange={onVoiceSuggestionsChange}
        />
      </View>
    </>
  );
}

function Field({
  editable = true,
  label,
  onChangeText,
  value,
}: {
  editable?: boolean;
  label: string;
  onChangeText?: (value: string) => void;
  value: string;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.fieldBlock}>
      <Text style={[styles.fieldLabel, isFocused && editable && { color: learnerPalette.primary }]}>{label}</Text>
      <TextInput
        editable={editable}
        onChangeText={onChangeText}
        onBlur={() => setIsFocused(false)}
        onFocus={() => setIsFocused(true)}
        placeholderTextColor="#97AEA7"
        style={[
          styles.fieldInput,
          isFocused && editable && styles.fieldInputActive,
          !editable && styles.fieldInputDisabled,
        ]}
        value={value}
      />
    </View>
  );
}

function ToggleRow({
  description,
  title,
  value,
  onValueChange,
}: {
  description: string;
  title: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleText}>{description}</Text>
      </View>
      <Switch
        onValueChange={onValueChange}
        thumbColor={value ? '#FFFFFF' : '#F1F4F7'}
        trackColor={{ false: '#D4DCE7', true: '#73C088' }}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    backgroundColor: learnerPalette.surface,
    paddingHorizontal: 40,
    paddingVertical: 20,
    paddingTop: 30,
    marginHorizontal: -30,
    shadowColor: learnerPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 8,
  },
  avatarWrap: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: 8,
  },
  cameraBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: learnerPalette.surfaceMuted,
  },
  cameraBadgeText: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  formStack: {
    gap: 10,
  },
  fichaRequestCard: {
    backgroundColor: learnerPalette.surfaceMuted,
    borderRadius: 22,
    gap: 10,
    marginTop: 12,
    padding: 14,
  },
  fichaRequestTitle: {
    color: learnerPalette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
  },
  fichaRequestText: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 17,
  },
  fichaOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fichaChip: {
    backgroundColor: learnerPalette.surface,
    borderColor: '#DDE8E2',
    borderRadius: 16,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    gap: 3,
    padding: 11,
  },
  fichaChipActive: {
    backgroundColor: learnerPalette.mint,
    borderColor: learnerPalette.primary,
  },
  fichaChipCurrent: {
    backgroundColor: '#ECECEC',
    borderColor: '#D2D2D2',
    opacity: 0.72,
  },
  fichaChipText: {
    color: learnerPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  fichaChipMeta: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 10,
  },
  fichaChipTextActive: {
    color: learnerPalette.primary,
  },
  pendingRequestBox: {
    backgroundColor: learnerPalette.mint,
    borderLeftColor: learnerPalette.primary,
    borderLeftWidth: 3,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pendingRequestText: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
    lineHeight: 16,
  },
  requestFichaButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: learnerPalette.primary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  requestFichaText: {
    color: '#FFFFFF',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  fieldBlock: {
    gap: 9,
  },
  fieldLabel: {
    color: learnerPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
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
  fieldInputDisabled: {
    backgroundColor: '#ececec',
    color: learnerPalette.textMuted,
  },
  progressBlock: {
    marginTop: 22,
    width: '100%',
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: {
    color: learnerPalette.text,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
  },
  progressValue: {
    color: learnerPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  profileActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
  },
  primaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: learnerPalette.greenText,
  },
  primaryButtonText: {
    color: learnerPalette.softGreen,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  signOutButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: learnerPalette.coral,
  },
  signOutText: {
    color: learnerPalette.coralText,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  feedbackText: {
    color: learnerPalette.secondary,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 18,
  },
  stack: {
    gap: 12,
  },
  toggleRow: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 16,
    borderColor: learnerPalette.secondary,
    shadowColor: learnerPalette.primary,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleCopy: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    color: learnerPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  toggleText: {
    color: learnerPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 17,
  },
});
