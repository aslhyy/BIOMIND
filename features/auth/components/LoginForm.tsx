import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
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
import {
  enviarRecuperacionContrasena,
  iniciarSesion,
} from '../../../services/auth';
import { loginStyles } from '../styles/loginForm.styles';
import type { LoginFormProps } from '../types';
import { mapAuthErrorToAlert, validateEmail } from '../utils/authFeedback';

const AnimatedText = RNAnimated.createAnimatedComponent(Text);

export function LoginForm({
  onBack,
  onGoRegister,
  onAuthenticated,
  onRequiresVerification,
  showAlert,
  initialEmail = '',
}: LoginFormProps) {
  const animations = {
    correo: useState(new RNAnimated.Value(0))[0],
    contrasena: useState(new RNAnimated.Value(0))[0],
  };

  const [form, setForm] = useState({ correo: initialEmail, contrasena: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (initialEmail) {
      setForm((prev) => ({ ...prev, correo: initialEmail }));
    }
  }, [initialEmail]);

  const animateFocus = (field: keyof typeof animations, toValue: number) => {
    RNAnimated.timing(animations[field], {
      toValue,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  const getIconColor = (field: keyof typeof animations) =>
    animations[field].interpolate({
      inputRange: [0, 1],
      outputRange: ['#B6B6B6', '#2FC4B1'],
    });

  const update = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const getNormalizedEmail = () => form.correo.trim().toLowerCase();

  const handleLogin = async () => {
    const correo = getNormalizedEmail();
    const contrasena = form.contrasena;

    if (!correo || !contrasena) {
      showAlert({
        variant: 'warning',
        title: 'Faltan datos',
        message: 'Completa correo y contraseña para iniciar sesión.',
      });
      return;
    }

    if (!validateEmail(correo)) {
      showAlert({
        variant: 'warning',
        title: 'Correo inválido',
        message: 'Escribe un correo con formato válido.',
      });
      return;
    }

    setLoading(true);

    try {
      const session = await iniciarSesion(correo, contrasena);
      if (String(session?.profile?.rol || '').trim()) {
        showAlert({
          variant: 'success',
          title: 'Bienvenido',
          message: 'Tu inicio de sesión fue exitoso.',
        });
      }
      onAuthenticated();
    } catch (error: any) {
      if (error?.code === 'auth/email-not-verified') {
        showAlert(mapAuthErrorToAlert(error));
        onRequiresVerification({
          correo: error.correo || correo,
          contrasena,
        });
        return;
      }

      showAlert(mapAuthErrorToAlert(error));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const correo = getNormalizedEmail();

    if (!correo) {
      showAlert({
        variant: 'warning',
        title: 'Escribe tu correo',
        message: 'Ingresa primero tu correo para enviarte el enlace de recuperación.',
      });
      return;
    }

    if (!validateEmail(correo)) {
      showAlert({
        variant: 'warning',
        title: 'Correo inválido',
        message: 'Escribe un correo válido para recuperar tu contraseña.',
      });
      return;
    }

    setRecovering(true);

    try {
      await enviarRecuperacionContrasena(correo);
      setForm((prev) => ({ ...prev, contrasena: '' }));
      showAlert({
        variant: 'info',
        title: 'Revisa tu correo',
        message:
          'Te enviamos un enlace para restablecer tu contraseña. Guarda la nueva clave desde ese enlace y luego vuelve a iniciar sesión.',
      });
    } catch (error) {
      showAlert(mapAuthErrorToAlert(error));
    } finally {
      setRecovering(false);
    }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack} style={loginStyles.backRow}>
        <Ionicons name="arrow-back-outline" size={20} color="#2FC4B1" />
        <Text style={loginStyles.backText}>Volver</Text>
      </Pressable>

      <Text style={loginStyles.title}>INICIA SESIÓN</Text>

      <RNAnimated.Text
        style={[
          loginStyles.label,
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
          loginStyles.inputWrapper,
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
          style={loginStyles.input}
          placeholder="correo@ejemplo.com"
          placeholderTextColor="#88888859"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={form.correo}
          onChangeText={(value) => update('correo', value)}
          onFocus={() => animateFocus('correo', 1)}
          onBlur={() => animateFocus('correo', 0)}
        />
      </RNAnimated.View>

      <RNAnimated.Text
        style={[
          loginStyles.label,
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
          loginStyles.inputWrapper,
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
          style={[loginStyles.input, { flex: 1 }]}
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

      <View style={loginStyles.helpRow}>
        <TouchableOpacity
          style={loginStyles.secondaryPill}
          onPress={handleForgotPassword}
          activeOpacity={0.82}
          disabled={recovering || loading}>
          {recovering ? (
            <ActivityIndicator size="small" color="#117C72" />
          ) : (
            <>
              <Ionicons name="refresh-circle-outline" size={18} color="#117C72" />
              <Text style={loginStyles.secondaryPillText}>Recuperar contraseña</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={loginStyles.button}
        onPress={handleLogin}
        activeOpacity={0.85}
        disabled={loading || recovering}>
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Ionicons name="log-in-outline" size={20} color="white" />
            <Text style={loginStyles.buttonText}>Iniciar sesión</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={loginStyles.linkContainer} onPress={onGoRegister}>
        <Text style={loginStyles.linkText}>¿No tienes cuenta? </Text>
        <Text style={[loginStyles.linkText, loginStyles.linkBold]}>Regístrate</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
