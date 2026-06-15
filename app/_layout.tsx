// MUST be the first import - Polyfills for React Native compatibility
import '../polyfills';
import React, { useState, useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import AppLoadingScreen from '../components/AppLoadingScreen';

// Keep the native splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [showMainApp, setShowMainApp] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Hide native splash screen immediately (custom loading will take over)
        await SplashScreen.hideAsync();
        
        // Show AppLoadingScreen for exactly 4 seconds
        setTimeout(() => {
          setShowMainApp(true);
        }, 4000);
        
      } catch (e) {
        console.warn('Error during app preparation:', e);
        setShowMainApp(true); // Show app anyway on error
      }
    }

    prepare();
  }, []);

  // Show loading screen for 4 seconds
  if (!showMainApp) {
    return <AppLoadingScreen onFinish={() => {}} />;
  }

  // Show main app after 4 seconds
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen 
            name="confirm-ride" 
            options={{ 
              headerShown: false,
              presentation: 'card',
              animation: 'slide_from_bottom',
            }} 
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}