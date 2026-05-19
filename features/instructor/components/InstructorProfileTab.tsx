import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { instructorProfile, sheetOverviews } from '../data';
import { instructorPalette } from '../theme';
import { ProgressBar, SectionHeading } from './InstructorUI';
import { actualizarPerfilUsuario } from '@/services/auth';
import { UserAvatar } from '@/features/workspace/components/UserAvatar';
import type { AuthenticatedSession } from '@/features/workspace/types';

export function InstructorProfileTab({
  autoFeedbackEnabled,
  dualAssistantEnabled,
  offlineEnabled,
  session,
  voiceEnabled,
  onAutoFeedbackChange,
  onDualAssistantChange,
  onOfflineChange,
  onSignOut,
  onVoiceChange,
}: {
  autoFeedbackEnabled: boolean;
  dualAssistantEnabled: boolean;
  offlineEnabled: boolean;
  session: AuthenticatedSession;
  voiceEnabled: boolean;
  onAutoFeedbackChange: (value: boolean) => void;
  onDualAssistantChange: (value: boolean) => void;
  onOfflineChange: (value: boolean) => void;
  onSignOut: () => Promise<void> | void;
  onVoiceChange: (value: boolean) => void;
}) {
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
    setFeedback('Foto lista para actualizar el perfil.');
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
          <Field label="Rol" value={session.role} editable={false} />
        </View>

        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Progreso académico revisado</Text>
            <Text style={styles.progressValue}>{Math.round(instructorProfile.academyProgress * 100)}%</Text>
          </View>
          <ProgressBar accent={instructorPalette.secondary} progress={instructorProfile.academyProgress * 100} soft="#EAF6F3" />
        </View>

        <View style={styles.fichasCard}>
          <Text style={styles.fichasTitle}>Fichas asignadas</Text>
          {sheetOverviews.map((sheet) => (
            <Text key={sheet.id} style={styles.fichaItem}>
              Ficha {sheet.code} - {sheet.trimester}
            </Text>
          ))}
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
        subtitle="Ajustes funcionales de asistencia, voz y trabajo offline."
        title="Configuracion"
      />

      <View style={styles.stack}>
        <ToggleRow
          description="Permite dictar observaciones sin tocar el dispositivo."
          title="Registro por voz"
          value={voiceEnabled}
          onValueChange={onVoiceChange}
        />
        <ToggleRow
          description="Genera comentarios automáticos para guiar prácticas e informes."
          title="Retroalimentación automática"
          value={autoFeedbackEnabled}
          onValueChange={onAutoFeedbackChange}
        />
        <ToggleRow
          description="Asistencia distinta para aprendiz e instructor."
          title="Asistente dual"
          value={dualAssistantEnabled}
          onValueChange={onDualAssistantChange}
        />
        <ToggleRow
          description="Sigue funcionando localmente y sincroniza despues."
          title="Modo offline"
          value={offlineEnabled}
          onValueChange={onOfflineChange}
        />
      </View>

      <SectionHeading
        actionLabel="Resumen"
        subtitle="Indicadores generales del trabajo reciente."
        title="Impacto"
      />
      <View style={styles.impactRow}>
        <ImpactCardOne label="Prácticas revisadas" value={String(instructorProfile.reviewedPractices)} />
        <ImpactCardTwo label="Reportes automáticos" value={String(instructorProfile.automatedReports)} />
        <ImpactCardThree label="Sesiones guiadas" value={String(instructorProfile.guidedSessions)} />
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

function ImpactCardOne({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.impactCardOne}>
      <Text style={styles.impactValueOne}>{value}</Text>
      <Text style={styles.impactLabelOne}>{label}</Text>
    </View>
  );
}
function ImpactCardTwo({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.impactCardTwo}>
      <Text style={styles.impactValueTwo}>{value}</Text>
      <Text style={styles.impactLabelTwo}>{label}</Text>
    </View>
  );
}
function ImpactCardThree({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.impactCardThree}>
      <Text style={styles.impactValueThree}>{value}</Text>
      <Text style={styles.impactLabelThree}>{label}</Text>
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
  },
  impactRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
impactCardOne: {
  flexBasis: '31%',
  flexGrow: 1,
  minWidth: 100,
  backgroundColor: instructorPalette.mint,
  borderRadius: 22,
  paddingHorizontal: 12,
  paddingVertical: 16,
  alignItems: 'center',
  gap: 4,
  borderWidth: 0.5,
  borderColor: instructorPalette.secondary,
  shadowColor: instructorPalette.primary,
  shadowOpacity: 0.15,
  shadowRadius: 6,
  shadowOffset: {
    width: 0,
    height: 2,
  },
},

impactCardTwo: {
  flexBasis: '31%',
  flexGrow: 1,
  minWidth: 100,
  backgroundColor: instructorPalette.softGreen,
  borderRadius: 22,
  paddingHorizontal: 12,
  paddingVertical: 16,
  alignItems: 'center',
  gap: 4,
  borderWidth: 0.5,
  borderColor: instructorPalette.green,
  shadowColor: instructorPalette.primary,
  shadowOpacity: 0.15,
  shadowRadius: 6,
  shadowOffset: {
    width: 0,
    height: 2,
  },
},

impactCardThree: {
  flexBasis: '31%',
  flexGrow: 1,
  minWidth: 100,
  backgroundColor: instructorPalette.coral,
  borderRadius: 22,
  paddingHorizontal: 12,
  paddingVertical: 16,
  alignItems: 'center',
  gap: 4,
  borderWidth: 0.5,
  borderColor:  '#EAA189',
  shadowColor: instructorPalette.primary,
  shadowOpacity: 0.15,
  shadowRadius: 6,
  shadowOffset: {
    width: 0,
    height: 2,
  },
},
impactValueOne: {
  color: instructorPalette.primary,
  fontFamily: 'PoppinsSemiBold',
  fontSize: 24,
},

impactLabelOne: {
  color: instructorPalette.primary,
  fontFamily: 'PoppinsRegular',
  fontSize: 11,
  textAlign: 'center',
  lineHeight: 16,
},

impactValueTwo: {
  color: instructorPalette.green,
  fontFamily: 'PoppinsSemiBold',
  fontSize: 24,
},

impactLabelTwo: {
  color: instructorPalette.green,
  fontFamily: 'PoppinsRegular',
  fontSize: 11,
  textAlign: 'center',
  lineHeight: 16,
},

impactValueThree: {
  color:  '#EAA189',
  fontFamily: 'PoppinsSemiBold',
  fontSize: 24,
},

impactLabelThree: {
  color:  '#EAA189',
  fontFamily: 'PoppinsRegular',
  fontSize: 11,
  textAlign: 'center',
  lineHeight: 16,
},
});
