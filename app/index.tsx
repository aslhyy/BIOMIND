// This is the main entry point of app and it is used to define the main screen of the app.

import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AuthScreen } from '../features/auth/components/AuthScreen';
import { useAuth } from '../hooks/useAuth';

export default function Index() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="large" color="#117C72" font-family="Poppins"/>
          <Text style={styles.loadingText}>Preparando Biomind...</Text>
        </View>
      </>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/dashboard/dashboard" />;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AuthScreen />
    </>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: '#F7FFFC',
  },
  loadingText: {
    color: '#117C72',
    fontSize: 16,
  },
});
