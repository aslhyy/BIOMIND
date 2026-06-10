import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { obtenerProgramas } from '../../../services/academic';
import {
  ActivityIndicator,
  Animated as RNAnimated,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { registrar } from '../../../services/auth';
import { registerStyles } from '../styles/registerForm.styles';
import { mapAuthErrorToAlert, validateEmail, validatePassword } from '../utils/authFeedback';
import type { RegisterFormProps } from '../types';

type RegisterField = 'nombre' | 'identificacion' | 'correo' | 'contrasena' | 'confirmarContrasena';
type IoniconName = ComponentProps<typeof Ionicons>['name'];
type Programa = {
  id: string;
  nombre?: string;
};

const AnimatedText = RNAnimated.createAnimatedComponent(Text);

export function RegisterForm({ onBack, onGoLogin, onRegistered, showAlert }: RegisterFormProps) {
  const animations: Record<RegisterField, RNAnimated.Value> = {
    nombre: useState(new RNAnimated.Value(0))[0],
    identificacion: useState(new RNAnimated.Value(0))[0],
    correo: useState(new RNAnimated.Value(0))[0],
    contrasena: useState(new RNAnimated.Value(0))[0],
    confirmarContrasena: useState(new RNAnimated.Value(0))[0],
  };
  const [form, setForm] = useState({
    nombre: '',
    identificacion: '',
    correo: '',
    contrasena: '',
    confirmarContrasena: '',
    programaId: '',
    programa: '',
    fotoPerfilUri: '',
    fotoPerfilBase64: '',
    fotoPerfilMimeType: 'image/jpeg',
  });
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [loadingProgramas, setLoadingProgramas] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function cargarProgramas() {
      try {
        const data = await obtenerProgramas();

        if (mounted) {
          setProgramas(data);
        }
      } catch {
        showAlert({
          variant: 'error',
          title: 'No pudimos cargar programas',
          message: 'Intenta nuevamente o pide al administrador revisar los programas.',
        });
      } finally {
        if (mounted) {
          setLoadingProgramas(false);
        }
      }
    }

    cargarProgramas();

    return () => {
      mounted = false;
    };
  }, [showAlert]);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const update = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const animateFocus = (field: RegisterField, toValue: number) => {
    RNAnimated.timing(animations[field], {
      toValue,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  const pickProfilePhoto = async () => {
    setUploadingPhoto(true);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        showAlert({
          variant: 'warning',
          title: 'Permiso requerido',
          message: 'Necesitamos permiso para abrir tu galeria y elegir una foto.',
        });
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
      update('fotoPerfilUri', asset.uri);
      update('fotoPerfilBase64', asset.base64 || '');
      update('fotoPerfilMimeType', asset.mimeType || 'image/jpeg');

      showAlert({
        variant: 'info',
        title: 'Foto seleccionada',
        message: 'Tu foto de perfil quedo lista para guardarse con el registro.',
      });
    } catch {
      showAlert({
        variant: 'error',
        title: 'No pudimos abrir la galeria',
        message: 'Intenta nuevamente para seleccionar tu foto.',
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRegister = async () => {
    const requiredValues = [
      form.nombre,
      form.identificacion,
      form.correo,
      form.contrasena,
      form.confirmarContrasena,
    ];

    if (!form.programaId) {
      showAlert({
        variant: 'warning',
        title: 'Programa requerido',
        message: 'Selecciona el programa al que perteneces.',
      });
      return;
    }

    if (requiredValues.some((value) => !value.trim())) {
      showAlert({
        variant: 'warning',
        title: 'Faltan datos',
        message: 'Completa todos los campos obligatorios antes de registrarte.',
      });
      return;
    }

    if (!validateEmail(form.correo.trim().toLowerCase())) {
      showAlert({
        variant: 'warning',
        title: 'Correo invalido',
        message: 'Escribe un correo con formato valido para continuar.',
      });
      return;
    }

    const passwordValidation = validatePassword(form.contrasena);

    if (!passwordValidation.isValid) {
      showAlert({
        variant: 'warning',
        title: 'Contrasena insegura',
        message: passwordValidation.message,
      });
      return;
    }

    if (form.contrasena !== form.confirmarContrasena) {
      showAlert({
        variant: 'warning',
        title: 'Contrasenas distintas',
        message: 'La contrasena y su confirmacion deben coincidir.',
      });
      return;
    }

    setLoading(true);

    try {
      const registeredUser = await registrar({
        ...form,
        correo: form.correo.trim().toLowerCase(),

      });

      showAlert({
        variant: 'success',
        title: registeredUser.rol === 'Administrador' ? 'Administrador creado' : 'Registro exitoso',
        message:
          registeredUser.rol === 'Administrador'
            ? 'Te enviamos un enlace de verificacion. Al verificar tu correo podras entrar como administrador.'
            : 'Te enviamos un enlace de verificacion. Luego el administrador debe asignarte un rol para ingresar.',
      });

      onRegistered({
        correo: registeredUser.correo,
        contrasena: form.contrasena,
      });
    } catch (error) {
      showAlert(mapAuthErrorToAlert(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack} style={registerStyles.backRow}>
        <Ionicons name="arrow-back-outline" size={20} color="#2FC4B1" />
        <Text style={registerStyles.backText}>Volver</Text>
      </Pressable>

      <Text style={registerStyles.title}>REGISTRATE</Text>

      <TouchableOpacity style={registerStyles.photoButton} onPress={pickProfilePhoto} activeOpacity={0.85}>
        {form.fotoPerfilUri ? (
          <Image source={{ uri: form.fotoPerfilUri }} style={registerStyles.photoPreview} contentFit="cover" />
        ) : (
          <View style={registerStyles.photoPlaceholder}>
            {uploadingPhoto ? (
              <ActivityIndicator color="#2FC4B1" />
            ) : (
              <Ionicons name="camera-outline" size={22} color="#2FC4B1" />
            )}
            <Text style={registerStyles.photoText}>Tu foto</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={registerStyles.photoHint}>
        El primer usuario sera administrador. Los siguientes usuarios esperan asignacion de rol.
      </Text>

      <AnimatedField
        animation={animations.nombre}
        icon="person-outline"
        label="Usuario"
        placeholder="Nombre completo"
        value={form.nombre}
        onBlur={() => animateFocus('nombre', 0)}
        onChangeText={(value) => update('nombre', value)}
        onFocus={() => animateFocus('nombre', 1)}
      />

      <AnimatedField
        animation={animations.identificacion}
        icon="card-outline"
        keyboardType="numeric"
        label="Identificacion"
        placeholder="Numero de identificacion"
        value={form.identificacion}
        onBlur={() => animateFocus('identificacion', 0)}
        onChangeText={(value) => update('identificacion', value)}
        onFocus={() => animateFocus('identificacion', 1)}
      />

      <AnimatedField
        animation={animations.correo}
        autoCapitalize="none"
        icon="mail-outline"
        keyboardType="email-address"
        label="Correo electronico"
        placeholder="correo@ejemplo.com"
        value={form.correo}
        onBlur={() => animateFocus('correo', 0)}
        onChangeText={(value) => update('correo', value)}
        onFocus={() => animateFocus('correo', 1)}
      />

      <Text style={registerStyles.label}>Programa</Text>

      <View style={registerStyles.dropdown}>
        {loadingProgramas ? (
          <View style={registerStyles.dropdownItem}>
            <ActivityIndicator color="#2FC4B1" />
            <Text style={registerStyles.dropdownText}>Cargando programas...</Text>
          </View>
        ) : programas.length ? (
          programas.map((programa) => {
            const selected = form.programaId === programa.id;

            return (
              <TouchableOpacity
                key={programa.id}
                style={registerStyles.dropdownItem}
                activeOpacity={0.85}
                onPress={() =>
                  setForm((prev) => ({
                    ...prev,
                    programaId: programa.id,
                    programa: programa.nombre || programa.id,
                  }))
                }>
                <Text
                  style={[
                    registerStyles.dropdownText,
                    selected && registerStyles.dropdownTextActive,
                  ]}>
                  {programa.nombre || programa.id}
                </Text>

                {selected ? (
                  <Ionicons name="checkmark-circle-outline" size={18} color="#2FC4B1" />
                ) : null}
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={registerStyles.dropdownItem}>
            <Text style={registerStyles.dropdownText}>
              No hay programas creados por el administrador.
            </Text>
          </View>
        )}
      </View>

      <AnimatedField
        animation={animations.contrasena}
        icon="key-outline"
        label="Contrasena"
        placeholder="Contrasena"
        secureTextEntry={!showPass}
        trailingIcon={showPass ? 'eye-off-outline' : 'eye-outline'}
        value={form.contrasena}
        onBlur={() => animateFocus('contrasena', 0)}
        onChangeText={(value) => update('contrasena', value)}
        onFocus={() => animateFocus('contrasena', 1)}
        onTrailingPress={() => setShowPass((value) => !value)}
      />

      <AnimatedField
        animation={animations.confirmarContrasena}
        icon="lock-closed-outline"
        label="Confirmar contrasena"
        placeholder="Repite tu contrasena"
        secureTextEntry={!showConfirmPass}
        trailingIcon={showConfirmPass ? 'eye-off-outline' : 'eye-outline'}
        value={form.confirmarContrasena}
        onBlur={() => animateFocus('confirmarContrasena', 0)}
        onChangeText={(value) => update('confirmarContrasena', value)}
        onFocus={() => animateFocus('confirmarContrasena', 1)}
        onTrailingPress={() => setShowConfirmPass((value) => !value)}
      />

      <Text style={registerStyles.passwordHint}>
        Usa minimo 8 caracteres, una mayuscula, una minuscula y un numero.
      </Text>

      <TouchableOpacity style={registerStyles.button} onPress={handleRegister} activeOpacity={0.85}>
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Ionicons name="person-add-outline" size={20} color="white" />
            <Text style={registerStyles.buttonText}>Crear cuenta</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={registerStyles.linkContainer} onPress={onGoLogin}>
        <Text style={registerStyles.linkText}>Ya tienes cuenta? </Text>
        <Text style={[registerStyles.linkText, registerStyles.linkBold]}>Inicia sesion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function AnimatedField({
  animation,
  autoCapitalize = 'sentences',
  icon,
  keyboardType = 'default',
  label,
  onBlur,
  onChangeText,
  onFocus,
  onTrailingPress,
  placeholder,
  secureTextEntry = false,
  trailingIcon,
  value,
}: {
  animation: RNAnimated.Value;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  icon: IoniconName;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  label: string;
  onBlur: () => void;
  onChangeText: (value: string) => void;
  onFocus: () => void;
  onTrailingPress?: () => void;
  placeholder: string;
  secureTextEntry?: boolean;
  trailingIcon?: IoniconName;
  value: string;
}) {
  const iconColor = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['#B6B6B6', '#2FC4B1'],
  });

  return (
    <>
      <RNAnimated.Text
        style={[
          registerStyles.label,
          {
            transform: [
              {
                scale: animation.interpolate({ inputRange: [0, 1], outputRange: [1, 1.01] }),
              },
            ],
          },
        ]}>
        {label}
      </RNAnimated.Text>
      <RNAnimated.View
        style={[
          registerStyles.inputWrapper,
          {
            borderBottomWidth: animation.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }),
          },
        ]}>
        <AnimatedText
          style={{
            marginRight: 8,
            transform: [
              {
                scale: animation.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }),
              },
            ],
            color: iconColor,
          }}>
          <Ionicons name={icon} size={18} />
        </AnimatedText>
        <TextInput
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          onBlur={onBlur}
          onChangeText={onChangeText}
          onFocus={onFocus}
          placeholder={placeholder}
          placeholderTextColor="#88888859"
          secureTextEntry={secureTextEntry}
          style={[registerStyles.input, { flex: 1 }]}
          value={value}
        />
        {trailingIcon && onTrailingPress ? (
          <TouchableOpacity onPress={onTrailingPress}>
            <Ionicons name={trailingIcon} size={18} color="#9AA8A0" />
          </TouchableOpacity>
        ) : null}
      </RNAnimated.View>
    </>
  );
}
