import React, { useEffect } from 'react';
import { Stack, router, useGlobalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../lib/AuthContext';
import { useColors } from '../lib/theme';
import { supabase } from '../lib/supabase';
import * as Linking from 'expo-linking';

function Routes() {
  const c = useColors();
  const params = useGlobalSearchParams<{ 'tv-pair'?: string }>();
  useEffect(() => {
    const handle = async (url: string) => {
      const parsed = Linking.parse(url);
      const fragment = new URLSearchParams(url.split('#')[1] || '');
      const access = String(parsed.queryParams?.access_token || fragment.get('access_token') || '');
      const refresh = String(parsed.queryParams?.refresh_token || fragment.get('refresh_token') || '');
      if (access && refresh) await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
      if (parsed.queryParams?.code) await supabase.auth.exchangeCodeForSession(String(parsed.queryParams.code));
      if (parsed.queryParams?.['tv-pair']) router.push({ pathname: '/pairing', params: { token: String(parsed.queryParams['tv-pair']) } });
      if (parsed.path === 'reset-password' || parsed.hostname === 'reset-password') router.push('/reset-password');
    };
    Linking.getInitialURL().then((url) => { if (url) void handle(url); });
    const sub = Linking.addEventListener('url', ({ url }) => { void handle(url); });
    return () => sub.remove();
  }, []);
  const pairToken = params['tv-pair'];
  useEffect(() => { if (pairToken) router.push({ pathname: '/pairing', params: { token: pairToken } }); }, [pairToken]);
  return <><StatusBar style="auto" /><Stack screenOptions={{ headerTintColor: c.primary, headerStyle: { backgroundColor: c.bg }, headerTitleStyle: { color: c.text }, contentStyle: { backgroundColor: c.bg } }}>
    <Stack.Screen name="index" options={{ headerShown: false }} />
    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    <Stack.Screen name="auth" options={{ title: 'Aceder à conta', headerShown: false }} />
    <Stack.Screen name="event-form" options={{ title: 'Evento', presentation: 'formSheet', sheetGrabberVisible: true, headerShown: false, sheetAllowedDetents: [0.72, 1], sheetInitialDetentIndex: 1, sheetCornerRadius: 28 }} />
    <Stack.Screen name="class-form" options={{ title: 'Turma', presentation: 'formSheet', sheetGrabberVisible: true, headerShown: false, sheetAllowedDetents: [0.6, 1], sheetInitialDetentIndex: 1, sheetCornerRadius: 28 }} />
    <Stack.Screen name="user-form" options={{ title: 'Utilizador', presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.65, 1], sheetInitialDetentIndex: 1, sheetCornerRadius: 28 }} />
    <Stack.Screen name="account" options={{ title: 'A minha conta', headerShown: false, presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.55, 1], sheetInitialDetentIndex: 0, sheetCornerRadius: 28 }} />
    <Stack.Screen name="reset-password" options={{ title: 'Nova palavra-passe', presentation: 'formSheet', headerShown: false, sheetGrabberVisible: true }} />
    <Stack.Screen name="pairing" options={{ title: 'Ligar à TV', headerShown: false, presentation: 'formSheet', sheetGrabberVisible: true }} />
    <Stack.Screen name="qr-scanner" options={{ title: 'Ler código da TV', headerShown: false, presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.8, 1], sheetInitialDetentIndex: 1 }} />
  </Stack></>;
}
export default function RootLayout() { return <AuthProvider><Routes /></AuthProvider>; }
