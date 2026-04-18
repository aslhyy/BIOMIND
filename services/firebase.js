import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBL8nAyASRxz8SSY7eibvrN6Ytp6B1nSWg",
  authDomain: "biomind-c1ea1.firebaseapp.com",
  projectId: "biomind-c1ea1",
  storageBucket: "biomind-c1ea1.firebasestorage.app",
  messagingSenderId: "34990659998",
  appId: "1:34990659998:web:8d902b840144c8c6fd1e8f",
  measurementId: "G-54GH4LYKNG"
};

const app = initializeApp(firebaseConfig);
const { getReactNativePersistence } = require('@firebase/auth/dist/rn/index.js');

let authInstance;

try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch {
  authInstance = getAuth(app);
}

authInstance.languageCode = 'es';

export const auth = authInstance;
export const db = getFirestore(app);
