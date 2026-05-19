import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
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
import { ROLES } from '../constants';
import { registerStyles } from '../styles/registerForm.styles';
import { mapAuthErrorToAlert, validateEmail, validatePassword } from '../utils/authFeedback';
import type { RegisterFormProps } from '../types';

const AnimatedText = RNAnimated.createAnimatedComponent(Text);

export function RegisterForm({ onBack, onGoLogin, onRegistered, showAlert }: RegisterFormProps) {
  const animations = {
    nombre: useState(new RNAnimated.Value(0))[0],
    identificacion: useState(new RNAnimated.Value(0))[0],
    programa: useState(new RNAnimated.Value(0))[0],
    ficha: useState(new RNAnimated.Value(0))[0],
    correo: useState(new RNAnimated.Value(0))[0],
    contrasena: useState(new RNAnimated.Value(0))[0],
    rol: useState(new RNAnimated.Value(0))[0],
  };

  const [form, setForm] = useState({
    nombre: '',
    identificacion: '',
    programa: '',
    ficha: '',
    correo: '',
    contrasena: '',
    rol: '',
    fotoPerfilUri: '',
    fotoPerfilBase64: '',
    fotoPerfilMimeType: 'image/jpeg',
  });
  const [showPass, setShowPass] = useState(false);
  const [showRoles, setShowRoles] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const skipsProgramAndFicha = ['Instructor', 'Pasante'].includes(form.rol);

  const animateFocus = (field: keyof typeof animations, toValue: number) => {
    RNAnimated.timing(animations[field], {
      toValue,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  const iconColor = animations.nombre.interpolate({
    inputRange: [0, 1],
    outputRange: ['#B6B6B6', '#2FC4B1'],
  });

  const getIconColor = (field: keyof typeof animations) =>
    animations[field].interpolate({
      inputRange: [0, 1],
      outputRange: ['#B6B6B6', '#2FC4B1'],
    });

  const update = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleRoleSelect = (rol: string) => {
    update('rol', rol);

    if (['Instructor', 'Pasante'].includes(rol)) {
      update('programa', '');
      update('ficha', '');
    }

    setShowRoles(false);
  };

  const pickProfilePhoto = async () => {
    setUploadingPhoto(true);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        showAlert({
          variant: 'warning',
          title: 'Permiso requerido',
          message: 'Necesitamos permiso para abrir tu galería y elegir una foto.',
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
        message: 'Tu foto de perfil quedó lista para guardarse con el registro.',
      });
    } catch (error) {
      showAlert({
        variant: 'error',
        title: 'No pudimos abrir la galería',
        message: 'Intenta nuevamente para seleccionar tu foto.',
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRegister = async () => {
    const requiredValues = skipsProgramAndFicha
      ? [form.nombre, form.identificacion, form.correo, form.contrasena, form.rol]
      : [
          form.nombre,
          form.identificacion,
          form.programa,
          form.ficha,
          form.correo,
          form.contrasena,
          form.rol,
        ];

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
        title: 'Correo inválido',
        message: 'Escribe un correo con formato válido para continuar.',
      });
      return;
    }

    const passwordValidation = validatePassword(form.contrasena);

    if (!passwordValidation.isValid) {
      showAlert({
        variant: 'warning',
        title: 'Contraseña insegura',
        message: passwordValidation.message,
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
        title: 'Registro exitoso',
        message:
          'Te enviamos un enlace de verificación a tu correo. Abre ese enlace y luego inicia sesión en Biomind.',
      });

      onRegistered(registeredUser.correo);
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

      <Text style={registerStyles.title}>REGÍSTRATE</Text>

      <Text style={registerStyles.label}>Rol</Text>
      <TouchableOpacity onPress={() => setShowRoles(!showRoles)} activeOpacity={0.7}>
        <RNAnimated.View
          style={[
            registerStyles.inputWrapper,
            {
              borderBottomWidth: animations.rol.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }),
            },
          ]}>
          <Ionicons
            name="people-outline"
            size={18}
            color={showRoles || form.rol ? '#2FC4B1' : '#B6B6B6'}
            style={registerStyles.inputIcon}
          />
          <Text style={[registerStyles.input, !form.rol && { color: '#B0C4BB' }]}>
            {form.rol || 'Selecciona tu rol'}
          </Text>
          <Ionicons
            name={showRoles ? 'chevron-up-outline' : 'chevron-down-outline'}
            size={16}
            color={showRoles ? '#2FC4B1' : '#9AA8A0'}
          />
        </RNAnimated.View>
      </TouchableOpacity>

      {showRoles && (
        <View style={registerStyles.dropdown}>
          {ROLES.map((rol) => (
            <TouchableOpacity
              key={rol}
              style={registerStyles.dropdownItem}
              onPress={() => handleRoleSelect(rol)}>
              <Text
                style={[
                  registerStyles.dropdownText,
                  form.rol === rol && registerStyles.dropdownTextActive,
                ]}>
                {rol}
              </Text>
              {form.rol === rol && <Ionicons name="checkmark" size={16} color="#2FC4B1" />}
            </TouchableOpacity>
          ))}
        </View>
      )}

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

      <RNAnimated.Text
        style={[
          registerStyles.label,
          {
            color: animations.nombre.interpolate({
              inputRange: [0, 1],
              outputRange: ['#2FC4B1', '#2FC4B1'],
            }),
            transform: [
              {
                scale: animations.nombre.interpolate({ inputRange: [0, 1], outputRange: [1, 1.01] }),
              },
            ],
          },
        ]}>
        Usuario
      </RNAnimated.Text>
      <RNAnimated.View
        style={[
          registerStyles.inputWrapper,
          {
            borderBottomColor: animations.nombre.interpolate({
              inputRange: [0, 1],
              outputRange: ['#2FC4B1', '#2FC4B1'],
            }),
            borderBottomWidth: animations.nombre.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }),
          },
        ]}>
        <AnimatedText
          style={{
            marginRight: 8,
            transform: [
              {
                scale: animations.nombre.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }),
              },
            ],
            color: iconColor,
          }}>
          <Ionicons name="person-outline" size={18} />
        </AnimatedText>
        <TextInput
          style={registerStyles.input}
          placeholder="Nombre completo"
          placeholderTextColor="#88888859"
          value={form.nombre}
          onChangeText={(value) => update('nombre', value)}
          autoCapitalize="words"
          onFocus={() => animateFocus('nombre', 1)}
          onBlur={() => animateFocus('nombre', 0)}
        />
      </RNAnimated.View>

      <RNAnimated.Text
        style={[
          registerStyles.label,
          {
            transform: [
              {
                scale: animations.identificacion.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.01],
                }),
              },
            ],
          },
        ]}>
        Identificación
      </RNAnimated.Text>
      <RNAnimated.View
        style={[
          registerStyles.inputWrapper,
          {
            borderBottomWidth: animations.identificacion.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.5],
            }),
          },
        ]}>
        <AnimatedText
          style={{
            marginRight: 8,
            transform: [
              {
                scale: animations.identificacion.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.15],
                }),
              },
            ],
            color: getIconColor('identificacion'),
          }}>
          <Ionicons name="card-outline" size={18} />
        </AnimatedText>
        <TextInput
          style={registerStyles.input}
          placeholder="Número de identificación"
          placeholderTextColor="#88888859"
          keyboardType="numeric"
          value={form.identificacion}
          onChangeText={(value) => update('identificacion', value)}
          onFocus={() => animateFocus('identificacion', 1)}
          onBlur={() => animateFocus('identificacion', 0)}
        />
      </RNAnimated.View>

      <RNAnimated.Text
        style={[
          registerStyles.label,
          {
            transform: [
              {
                scale: animations.programa.interpolate({ inputRange: [0, 1], outputRange: [1, 1.01] }),
              },
            ],
          },
        ]}>
        Programa
      </RNAnimated.Text>
      <RNAnimated.View
        style={[
          registerStyles.inputWrapper,
          skipsProgramAndFicha && { opacity: 0.55 },
          {
            borderBottomWidth: animations.programa.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }),
          },
        ]}>
        <AnimatedText
          style={{
            marginRight: 8,
            transform: [
              {
                scale: animations.programa.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }),
              },
            ],
            color: getIconColor('programa'),
          }}>
          <Ionicons name="document-text-outline" size={18} />
        </AnimatedText>
        <TextInput
          style={registerStyles.input}
          editable={!skipsProgramAndFicha}
          placeholder={skipsProgramAndFicha ? `No aplica para ${form.rol.toLowerCase()}` : 'Nombre del programa'}
          placeholderTextColor="#88888859"
          value={form.programa}
          onChangeText={(value) => update('programa', value)}
          onFocus={() => animateFocus('programa', 1)}
          onBlur={() => animateFocus('programa', 0)}
        />
      </RNAnimated.View>

      <RNAnimated.Text
        style={[
          registerStyles.label,
          {
            transform: [
              {
                scale: animations.ficha.interpolate({ inputRange: [0, 1], outputRange: [1, 1.01] }),
              },
            ],
          },
        ]}>
        Número de ficha
      </RNAnimated.Text>
      <RNAnimated.View
        style={[
          registerStyles.inputWrapper,
          skipsProgramAndFicha && { opacity: 0.55 },
          {
            borderBottomWidth: animations.ficha.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }),
          },
        ]}>
        <AnimatedText style={{ marginRight: 8, color: getIconColor('ficha') }}>
          <Ionicons name="school-outline" size={18} />
        </AnimatedText>
        <TextInput
          style={registerStyles.input}
          editable={!skipsProgramAndFicha}
          placeholder={skipsProgramAndFicha ? `No aplica para ${form.rol.toLowerCase()}` : 'Número de ficha'}
          placeholderTextColor="#88888859"
          keyboardType="numeric"
          value={form.ficha}
          onChangeText={(value) => update('ficha', value)}
          onFocus={() => animateFocus('ficha', 1)}
          onBlur={() => animateFocus('ficha', 0)}
        />
      </RNAnimated.View>

      <RNAnimated.Text
        style={[
          registerStyles.label,
          {
            transform: [
              {
                scale: animations.correo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.01] }),
              },
            ],
          },
        ]}>
        Correo electrónico
      </RNAnimated.Text>
      <RNAnimated.View
        style={[
          registerStyles.inputWrapper,
          {
            borderBottomWidth: animations.correo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }),
          },
        ]}>
        <AnimatedText
          style={{
            marginRight: 8,
            transform: [
              {
                scale: animations.correo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }),
              },
            ],
            color: getIconColor('correo'),
          }}>
          <Ionicons name="mail-outline" size={18} />
        </AnimatedText>
        <TextInput
          style={registerStyles.input}
          placeholder="correo@ejemplo.com"
          placeholderTextColor="#88888859"
          keyboardType="email-address"
          autoCapitalize="none"
          value={form.correo}
          onChangeText={(value) => update('correo', value)}
          onFocus={() => animateFocus('correo', 1)}
          onBlur={() => animateFocus('correo', 0)}
        />
      </RNAnimated.View>

      <RNAnimated.Text
        style={[
          registerStyles.label,
          {
            transform: [
              {
                scale: animations.contrasena.interpolate({ inputRange: [0, 1], outputRange: [1, 1.01] }),
              },
            ],
          },
        ]}>
        Contraseña
      </RNAnimated.Text>
      <RNAnimated.View
        style={[
          registerStyles.inputWrapper,
          {
            borderBottomWidth: animations.contrasena.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.5],
            }),
          },
        ]}>
        <AnimatedText
          style={{
            marginRight: 8,
            transform: [
              {
                scale: animations.contrasena.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }),
              },
            ],
            color: getIconColor('contrasena'),
          }}>
          <Ionicons name="key-outline" size={18} />
        </AnimatedText>
        <TextInput
          style={[registerStyles.input, { flex: 1 }]}
          placeholder="Contraseña"
          placeholderTextColor="#88888859"
          secureTextEntry={!showPass}
          value={form.contrasena}
          onChangeText={(value) => update('contrasena', value)}
          onFocus={() => animateFocus('contrasena', 1)}
          onBlur={() => animateFocus('contrasena', 0)}
        />
        <TouchableOpacity onPress={() => setShowPass(!showPass)}>
          <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9AA8A0" />
        </TouchableOpacity>
      </RNAnimated.View>

      <Text style={registerStyles.passwordHint}>
        Usa mínimo 8 caracteres, una mayúscula, una minúscula y un número.
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
        <Text style={registerStyles.linkText}>¿Ya tienes cuenta? </Text>
        <Text style={[registerStyles.linkText, registerStyles.linkBold]}>Inicia sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
