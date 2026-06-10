import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated as RNAnimated, Dimensions, Easing, View } from 'react-native';
import { authScreenStyles } from '../styles/authScreen.styles';
import type {
  AuthAlert,
  AuthView,
  PendingVerification,
  ShowAuthAlertInput,
} from '../types';
import { AuthAlertStack } from './AuthAlertStack';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { VerifyEmailForm } from './VerifyEmailForm';
import { WelcomeView } from './WelcomeView';

const { height, width } = Dimensions.get('window');

export function AuthScreen() {
  const router = useRouter();
  const [vista, setVista] = useState<AuthView>('bienvenida');
  const [welcomeLogoY, setWelcomeLogoY] = useState<number | null>(null);
  const [pendingVerification, setPendingVerification] = useState<PendingVerification | null>(null);
  const [prefilledEmail, setPrefilledEmail] = useState('');
  const [alerts, setAlerts] = useState<AuthAlert[]>([]);
  const introHasPlayed = useRef(false);
  const alertTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [fontsLoaded] = useFonts({
    SulphurPoint: require('../../../assets/fonts/SulphurPoint-Light.ttf'),
    SulphurPointBold: require('../../../assets/fonts/SulphurPoint-Bold.ttf'),
    PoppinsRegular: require('../../../assets/fonts/Poppins-Regular.ttf'),
    PoppinsMedium: require('../../../assets/fonts/Poppins/Poppins-Medium.ttf'),
    PoppinsSemiBold: require('../../../assets/fonts/Poppins/Poppins-SemiBold.ttf'),
  });

  const imageIOpacity = useRef(new RNAnimated.Value(1)).current;
  const imageSOpacity = useRef(new RNAnimated.Value(0)).current;
  const titleTranslateY = useRef(new RNAnimated.Value(0)).current;
  const titleOpacity = useRef(new RNAnimated.Value(1)).current;
  const titleScale = useRef(new RNAnimated.Value(1)).current;
  const welcomeLogoOpacity = useRef(new RNAnimated.Value(0)).current;
  const panelTranslateY = useRef(new RNAnimated.Value(height)).current;
  const panelOpacity = useRef(new RNAnimated.Value(0)).current;
  const cardHeight = useRef(new RNAnimated.Value(height * 0.54)).current;

  const heights: Record<AuthView, number> = {
    bienvenida: height * 0.54,
    login: height * 0.5,
    register: height * 0.76,
    verify: height * 0.64,
  };

  const dismissAlert = (id: string) => {
    const timeoutId = alertTimeouts.current[id];

    if (timeoutId) {
      clearTimeout(timeoutId);
      delete alertTimeouts.current[id];
    }

    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  const showAlert = ({ durationMs = 4200, ...input }: ShowAuthAlertInput) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    setAlerts((prev) => [...prev, { id, ...input }]);
    alertTimeouts.current[id] = setTimeout(() => dismissAlert(id), durationMs);
  };

  useEffect(() => {
    return () => {
      Object.values(alertTimeouts.current).forEach(clearTimeout);
    };
  }, []);

  const cambiarVista = (nueva: AuthView) => {
    RNAnimated.timing(cardHeight, {
      toValue: height * 0.15,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      setVista(nueva);
      RNAnimated.timing(cardHeight, {
        toValue: heights[nueva],
        duration: 400,
        useNativeDriver: false,
      }).start();
    });
  };

  useEffect(() => {
    if (welcomeLogoY === null || introHasPlayed.current) {
      return;
    }

    const initialLogoTop = 100;
    const initialLogoSize = 67;
    const targetLogoSize = 52;
    const finalCardTop = height - heights.bienvenida;
    const finalLogoTop = finalCardTop + welcomeLogoY + 13;
    const logoTravelDistance = finalLogoTop - initialLogoTop;
    let isCancelled = false;

    titleTranslateY.setValue(0);
    titleOpacity.setValue(1);
    titleScale.setValue(1);
    welcomeLogoOpacity.setValue(0);
    imageIOpacity.setValue(1);
    imageSOpacity.setValue(0);
    panelTranslateY.setValue(height);
    panelOpacity.setValue(0);

    const startTimer = setTimeout(() => {
      if (isCancelled) {
        return;
      }

      introHasPlayed.current = true;

      RNAnimated.parallel([
        RNAnimated.timing(titleTranslateY, {
          toValue: logoTravelDistance,
          duration: 2400,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        RNAnimated.timing(titleScale, {
          toValue: targetLogoSize / initialLogoSize,
          duration: 2600,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        RNAnimated.sequence([
          RNAnimated.delay(2400),
          RNAnimated.timing(titleOpacity, {
            toValue: 0,
            duration: 300,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        RNAnimated.sequence([
          RNAnimated.delay(2400),
          RNAnimated.timing(welcomeLogoOpacity, {
            toValue: 1,
            duration: 420,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        RNAnimated.timing(imageIOpacity, {
          toValue: 0,
          duration: 2800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        RNAnimated.sequence([
          RNAnimated.delay(300),
          RNAnimated.timing(imageSOpacity, {
            toValue: 1,
            duration: 1500,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        RNAnimated.timing(panelTranslateY, {
          toValue: 0,
          duration: 1500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        RNAnimated.timing(panelOpacity, {
          toValue: 1,
          duration: 1300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }, 500);

    return () => {
      isCancelled = true;
      clearTimeout(startTimer);
    };
  }, [
    heights.bienvenida,
    imageIOpacity,
    imageSOpacity,
    panelOpacity,
    panelTranslateY,
    titleOpacity,
    titleScale,
    titleTranslateY,
    welcomeLogoOpacity,
    welcomeLogoY,
  ]);

  const handleAuthenticated = () => {
    router.replace('/dashboard/dashboard');
  };

  const handleRegistered = (pending: PendingVerification) => {
    setPendingVerification(pending);
    setPrefilledEmail(pending.correo);
    cambiarVista('verify');
  };

  const handleRequiresVerification = (pending: PendingVerification) => {
    setPendingVerification(pending);
    setPrefilledEmail(pending.correo);
    cambiarVista('verify');
  };

  const handleReadyToLogin = (correo: string) => {
    setPrefilledEmail(correo);
    setPendingVerification(null);
    cambiarVista('login');
  };

  const handleVerificationBack = () => {
    if (pendingVerification?.correo) {
      setPrefilledEmail(pendingVerification.correo);
    }

    setPendingVerification(null);
    cambiarVista('login');
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={authScreenStyles.container}>
      <AuthAlertStack alerts={alerts} onDismiss={dismissAlert} />

      <RNAnimated.Image
        source={require('../../../assets/images/inicio.png')}
        style={[authScreenStyles.imageI, { width, height: height * 0.85, opacity: imageIOpacity }]}
        resizeMode="cover"
      />
      <RNAnimated.Image
        source={require('../../../assets/images/ingreso.png')}
        style={[authScreenStyles.imageS, { width, height: height * 0.49, opacity: imageSOpacity }]}
        resizeMode="cover"
      />
      <RNAnimated.Text
        style={[
          authScreenStyles.logoText,
          {
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }, { scale: titleScale }],
          },
        ]}>
        BIOMIND
      </RNAnimated.Text>

      <RNAnimated.View
        style={[
          authScreenStyles.panelWrapper,
          {
            opacity: panelOpacity,
            transform: [{ translateY: panelTranslateY }],
          },
        ]}>
        <RNAnimated.View style={[authScreenStyles.card, { height: cardHeight }]}>
          {vista === 'bienvenida' && (
            <WelcomeView
              onGoLogin={() => cambiarVista('login')}
              onGoRegister={() => cambiarVista('register')}
              onLogoLayout={setWelcomeLogoY}
              showLogo
              logoOpacity={welcomeLogoOpacity}
            />
          )}

          {vista === 'login' && (
            <LoginForm
              onBack={() => cambiarVista('bienvenida')}
              onGoRegister={() => cambiarVista('register')}
              onAuthenticated={handleAuthenticated}
              onRequiresVerification={handleRequiresVerification}
              showAlert={showAlert}
              initialEmail={prefilledEmail}
            />
          )}

          {vista === 'register' && (
            <RegisterForm
              onBack={() => cambiarVista('bienvenida')}
              onGoLogin={() => cambiarVista('login')}
              onRegistered={handleRegistered}
              showAlert={showAlert}
            />
          )}

          {vista === 'verify' && (
            <VerifyEmailForm
              pendingVerification={pendingVerification}
              onBack={handleVerificationBack}
              onAuthenticated={handleAuthenticated}
              onReadyToLogin={handleReadyToLogin}
              showAlert={showAlert}
            />
          )}
        </RNAnimated.View>
      </RNAnimated.View>
    </View>
  );
}
