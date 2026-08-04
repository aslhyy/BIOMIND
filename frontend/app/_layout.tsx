// app/_layout.tsx

// This is the root layout of the app.
// It is used to define the common layout for all screens in the app.

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

// A root layout in a React framework (like Next.js or Expo Router) is a required, 
// top-level UI component that wraps all pages in the application.

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="dashboard/dashboard"
          options={{
            gestureEnabled: false,
            headerBackVisible: false,
            headerShown: false,
            title: '',
          }}
        />
      </Stack>
      <StatusBar backgroundColor="transparent" style="dark" translucent />
    </SafeAreaProvider>
  );
}
