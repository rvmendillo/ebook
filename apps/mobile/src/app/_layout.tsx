import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { AppProvider, useApp } from '@/state/app-state';
import { palettes } from '@/theme';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

/** Keeps the branded splash screen up until the library and account are ready. */
function SplashGate() {
  const { ready } = useApp();
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (ready || timedOut) void SplashScreen.hideAsync();
  }, [ready, timedOut]);
  return null;
}

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const p = palettes[scheme];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme: Theme = {
    ...base,
    colors: { ...base.colors, primary: p.primary, background: p.bg, card: p.surface, text: p.text, border: p.border },
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <ThemeProvider value={navTheme}>
          <SplashGate />
          <Stack
            screenOptions={{
              headerBackButtonDisplayMode: 'minimal',
              headerTintColor: p.primary,
              headerTitleStyle: { color: p.text },
              contentStyle: { backgroundColor: p.bg },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="read/[id]" options={{ title: '' }} />
            <Stack.Screen name="category/[slug]" options={{ title: '' }} />
            <Stack.Screen name="paywall" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="sign-in" options={{ presentation: 'modal', title: 'Sync your library' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}
