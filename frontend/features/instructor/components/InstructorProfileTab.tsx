import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { instructorPalette } from '../theme';
import { ProgressBar, SectionHeading } from './InstructorUI';
import { actualizarPerfilUsuario } from '@/services/auth';
import { UserAvatar } from '@/features/workspace/components/UserAvatar';
import { useAssignedSheetLabels } from '@/features/workspace/components/RealAcademicContext';
import type { AuthenticatedSession } from '@/features/workspace/types';
// @ts-ignore
import { escucharBitacoras } from '@/services/bitacoras';

type InstructorBitacora = {
  estado?: string;
  fichaId?: string;
  observacion?: string;
  observaciones?: unknown[];
  revisadoPorUid?: string | null;
};

export function InstructorProfileTab({
  session,
  showHomeNews,
  showHomeProjects,
  voiceEnabled,
  onShowHomeNewsChange,
  onShowHomeProjectsChange,
  onSignOut,
  onVoiceChange,
}: {
  session: AuthenticatedSession;
  showHomeNews: boolean;
  showHomeProjects: boolean;
  voiceEnabled: boolean;
  onShowHomeNewsChange: (value: boolean) => void;
  onShowHomeProjectsChange: (value: boolean) => void;
  onSignOut: () => Promise<void> | void;
  onVoiceChange: (value: boolean) => void;
}) {
  const [name, setName] = useState(session.name);
  const [email, setEmail] = useState(session.email);
  const [photoUri, setPhotoUri] = useState(session.photoUrl || '');
  const [photoBase64, setPhotoBase64] = useState('');
  const [photoMimeType, setPhotoMimeType] = useState('image/jpeg');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [bitacoras, setBitacoras] = useState<InstructorBitacora[]>([]);
  const assignedSheetLabels = useAssignedSheetLabels(session);
  const assignedSheetValues = useMemo(
    () => new Set([
      session.ficha,
      session.fichaId,
      ...(Array.isArray(session.fichasAsignadas) ? session.fichasAsignadas : []),
    ].map((value) => String(value || '').trim()).filter(Boolean)),
    [session.ficha, session.fichaId, session.fichasAsignadas]
  );
  const visibleBitacoras = useMemo(
    () => bitacoras.filter((bitacora) => {
      const fichaId = String(bitacora.fichaId || '').trim();
      return assignedSheetValues.size ? assignedSheetValues.has(fichaId) : bitacora.revisadoPorUid === session.uid;
    }),
    [assignedSheetValues, bitacoras, session.uid]
  );
  const reviewedBitacoras = useMemo(
    () => visibleBitacoras.filter((bitacora) => {
      const estado = String(bitacora.estado || '').trim();
      return ['Aprobada', 'Rechazada', 'Correccion'].includes(estado)
        || bitacora.revisadoPorUid === session.uid
        || Boolean(String(bitacora.observacion || '').trim())
        || Boolean(Array.isArray(bitacora.observaciones) && bitacora.observaciones.length);
    }),
    [session.uid, visibleBitacoras]
  );
  const academicProgress = visibleBitacoras.length
    ? Math.round((reviewedBitacoras.length / visibleBitacoras.length) * 100)
    : 0;

  useEffect(() => {
    setName(session.name);
    setEmail(session.email);
    setPhotoUri(session.photoUrl || '');
  }, [session.email, session.name, session.photoUrl]);

  useEffect(() => {
    return escucharBitacoras(
      setBitacoras,
      (error: { message?: string }) => setFeedback(error?.message || 'No pudimos cargar el progreso académico.')
    );
  }, []);

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
    setFeedback('Foto lista para actualizar el perfil.');
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setFeedback('Falta el nombre. Ingresa tu nombre antes de guardar el perfil.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setFeedback('Ingresa un correo válido antes de guardar el perfil.');
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
          <Field label="Rol" value={session.role} editable={false} />
        </View>

        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Progreso académico revisado</Text>
            <Text style={styles.progressValue}>{academicProgress}%</Text>
          </View>
          <ProgressBar accent={instructorPalette.secondary} progress={academicProgress} soft="#EAF6F3" />
          <Text style={styles.progressCaption}>
            {reviewedBitacoras.length}/{visibleBitacoras.length} bitácoras revisadas
          </Text>
        </View>

        <View style={styles.fichasCard}>
          <Text style={styles.fichasTitle}>Fichas asignadas</Text>
          {assignedSheetLabels.length ? assignedSheetLabels.map((label) => (
            <Text key={label} style={styles.fichaItem}>
              {label}
            </Text>
          )) : <Text style={styles.fichaItem}>Aún no tienes fichas asignadas.</Text>}
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
        actionLabel="Preferencias"
        subtitle="Ajustes visibles y funcionales del perfil de instructor."
        title="Configuración"
      />

      <View style={styles.stack}>
        <ToggleRow
          description="Activa o desactiva la voz dentro del asistente del instructor."
          title="Voz del asistente"
          value={voiceEnabled}
          onValueChange={onVoiceChange}
        />
        <ToggleRow
          description="Muestra u oculta el carrusel de novedades en el inicio."
          title="Novedades en inicio"
          value={showHomeNews}
          onValueChange={onShowHomeNewsChange}
        />
        <ToggleRow
          description="Muestra u oculta el bloque de proyectos recientes en el inicio."
          title="Proyectos recientes"
          value={showHomeProjects}
          onValueChange={onShowHomeProjectsChange}
        />
      </View>
    </>
  );
}

function Field({
  label,
  onChangeText,
  placeholder,
  value,
  editable = true,
}: {
  label: string;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  value: string;
  editable?: boolean;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.fieldBlock}>
      <Text
        style={[
          styles.fieldLabel,
          isFocused && editable && { color: instructorPalette.primary },
        ]}>
        {label}
      </Text>

      <TextInput
        value={value}
        editable={editable}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#97AEA7"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[
          styles.fieldInput,
          isFocused && editable && styles.fieldInputActive,
          !editable && styles.fieldInputDisabled,
        ]}
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
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      <Switch
        onValueChange={onValueChange}
        thumbColor={value ? '#FFFFFF' : '#F2F5F4'}
        trackColor={{ false: '#D8E6E2', true: '#73C088' }}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    backgroundColor: instructorPalette.surface,
    paddingHorizontal: 40,
    paddingVertical: 20,
    paddingTop: 30,
    marginHorizontal: -30,
    shadowColor: instructorPalette.shadow,
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
    backgroundColor: instructorPalette.surfaceMuted,
  },
  cameraBadgeText: {
    color: instructorPalette.primary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  formStack: {
    gap: 10,
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
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
  fieldInputDisabled: {
    backgroundColor: '#ececec',
    color: instructorPalette.textMuted,
  },
  progressBlock: {
    marginTop: 22,
    width: '100%',
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressTitle: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsMedium',
    fontSize: 12,
  },
  progressValue: {
    color: instructorPalette.secondary,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  progressCaption: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 11,
    lineHeight: 16,
  },
  fichasCard: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: instructorPalette.surfaceMuted,
    gap: 4,
    borderColor: instructorPalette.secondary,
    borderWidth: 0.2,
    shadowColor: instructorPalette.secondary,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    marginTop: 12,
    marginBottom: 8,
  },
  fichasTitle: {
    color: instructorPalette.dark,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  fichaItem: {
    color: instructorPalette.text,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
  },
  profileActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  primaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: instructorPalette.primary,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  signOutButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: instructorPalette.coral,
  },
  signOutText: {
    color: '#EAA189',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 12,
  },
  feedbackText: {
    color: instructorPalette.secondary,
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
    borderColor: instructorPalette.secondary,
    shadowColor: instructorPalette.primary,
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
    color: instructorPalette.text,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  toggleDescription: {
    color: instructorPalette.textMuted,
    fontFamily: 'PoppinsRegular',
    fontSize: 12,
    lineHeight: 17,
  }
});
