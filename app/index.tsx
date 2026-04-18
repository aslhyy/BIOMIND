// This is the main entry point of app and it is used to define the main screen of the app. 

import { Stack } from 'expo-router';
import { AuthScreen } from '../features/auth/components/AuthScreen';

export default function Index() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AuthScreen />
    </>
  );
}
