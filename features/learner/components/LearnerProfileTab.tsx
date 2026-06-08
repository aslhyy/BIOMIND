import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { actualizarPerfilUsuario } from '@/services/auth';
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
  const [photoUri, setPhotoUri] = useState(session.photoUrl || '');
  const [photoBase64, setPhotoBase64] = useState('');
  const [photoMimeType, setPhotoMimeType] = useState('image/jpeg');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    setName(session.name);
    setPhotoUri(session.photoUrl || '');
  }, [session.name, session.photoUrl]);

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
    setSaving(true);
    setFeedback('');

    try {
      const updatedProfile = await actualizarPerfilUsuario({
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
          <Field label="Correo" value={session.email} editable={false} />
          <Field label="Programa" value={session.programa || 'Biotecnología vegetal'} editable={false} />
          <Field label="Ficha" value={session.ficha || 'Sin ficha'} editable={false} />
          <Field
            label="Trimestre actual"
            value={session.trimestreActual || 'Se calculara automaticamente segun tu ficha'}
            editable={false}
          />
        </View>

        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Progreso académico</Text>
            <Text style={styles.progressValue}>60%</Text>
          </View>
          <ProgressBar accent={learnerPalette.primary} progress={60} soft="#EAF6F3" />
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
