// app/_layout.tsx

// This is the root layout of the app.
// It is used to define the common layout for all screens in the app.

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

// A root layout in a React framework (like Next.js or Expo Router) is a required, 
// top-level UI component that wraps all pages in the application.

export default function RootLayout() {
  return (
    <>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/register" options={{ headerShown: false }} />
        <Stack.Screen name="dashboard/dashboard" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}