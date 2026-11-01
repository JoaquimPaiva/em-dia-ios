import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useColors } from '../lib/theme';
import { Button, Card, Field, Heading, Page } from '../components/UI';

export default function ResetPassword() {
  const c = useColors();
  const { refreshProfile } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const save = async () => {
    if (password.length < 12 || password.length > 128) return setError('A palavra-passe deve ter entre 12 e 128 caracteres.');
    if (password !== confirmation) return setError('As palavras-passe não coincidem.');
    setBusy(true); setError('');
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await api('/api/auth/complete-password-reset', { method: 'POST' });
      await refreshProfile(); setSuccess(true); setPassword(''); setConfirmation('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a palavra-passe.'); }
    finally { setBusy(false); }
  };

  return (
    <Page safeAreaEdges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 22, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 5 }}><Text style={{ color: c.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }}>SEGURANÇA DA CONTA</Text><Heading>Definir nova palavra-passe</Heading><Text style={{ color: c.muted, lineHeight: 21 }}>Escolhe uma palavra-passe segura para voltares à tua agenda.</Text></View>
        <Card>
          {success ? <View style={{ gap: 12 }}><Text style={{ color: c.green, fontSize: 16, fontWeight: '700' }}>Palavra-passe atualizada.</Text><Text style={{ color: c.muted }}>Já podes continuar para a agenda.</Text><Button title="Abrir agenda" onPress={() => router.replace('/(tabs)')} /></View> : <>
            {error ? <View style={{ padding: 12, borderRadius: 13, backgroundColor: c.surfaceAlt }}><Text accessibilityRole="alert" style={{ color: c.red, lineHeight: 20 }}>{error}</Text></View> : null}
            <Field label="Nova palavra-passe · 12 a 128 caracteres" value={password} onChangeText={setPassword} placeholder="Nova palavra-passe" secureTextEntry autoComplete="new-password" maxLength={128} />
            <Field label="Confirmar palavra-passe" value={confirmation} onChangeText={setConfirmation} placeholder="Repete a palavra-passe" secureTextEntry autoComplete="new-password" maxLength={128} onSubmitEditing={() => void save()} returnKeyType="go" />
            <Button title="Guardar palavra-passe" onPress={() => void save()} busy={busy} />
          </>}
        </Card>
      </ScrollView>
    </Page>
  );
}
