import React, { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { useColors } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { Button, Card, Chip, Field, Heading, Page, SectionTitle } from '../components/UI';

export default function Account() {
  const c = useColors();
  const { user, refreshProfile, signOut } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const toggleTheme = async (theme: 'light' | 'dark') => {
    if (!user) return;
    setError('');
    try {
      const { error: updateError } = await supabase.from('profiles').update({ theme }).eq('id', user.id);
      if (updateError) throw updateError;
      await refreshProfile();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível guardar o tema.'); }
  };

  const changePassword = async () => {
    if (!current) return setError('Indica a palavra-passe atual.');
    if (next.length < 12 || next.length > 128) return setError('A nova palavra-passe deve ter entre 12 e 128 caracteres.');
    if (!user) return;
    setBusy(true); setError('');
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
      if (verifyError) throw new Error('A palavra-passe atual está incorreta.');
      const { error: updateError } = await supabase.auth.updateUser({ password: next });
      if (updateError) throw updateError;
      await api('/api/auth/complete-password-reset', { method: 'POST' });
      await refreshProfile(); setCurrent(''); setNext('');
      Alert.alert('Palavra-passe alterada', 'A tua conta está protegida com a nova palavra-passe.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível alterar a palavra-passe.'); }
    finally { setBusy(false); }
  };

  const logout = () => Alert.alert('Terminar sessão?', 'Terás de iniciar sessão novamente para consultar a agenda.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Terminar sessão', style: 'destructive', onPress: async () => { await signOut(); router.replace('/auth'); } },
  ]);

  const roleName = user?.role === 'admin' ? 'Administrador' : user?.role === 'editor' ? 'Professor' : 'Aluno';

  return (
    <Page safeAreaEdges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 12, paddingBottom: 34, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 5 }}><Text style={{ color: c.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }}>PERFIL</Text><Heading>A minha conta</Heading><Text style={{ color: c.muted }}>Preferências e segurança da conta.</Text></View>
        {error ? <Card style={{ borderColor: c.red, backgroundColor: c.surfaceAlt }}><Text style={{ color: c.red, fontWeight: '700' }}>Não foi possível concluir</Text><Text style={{ color: c.muted, lineHeight: 20 }}>{error}</Text></Card> : null}
        <Card>
          <View style={{ flexDirection: 'row', gap: 13, alignItems: 'center' }}>
            <View style={{ width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primarySoft }}><Text style={{ color: c.primary, fontSize: 20, fontWeight: '800' }}>{user?.display_name.slice(0, 1).toUpperCase() || 'E'}</Text></View>
            <View style={{ flex: 1, gap: 3 }}><Heading small>{user?.display_name}</Heading><Text style={{ color: c.muted }}>{user?.email}</Text></View>
          </View>
          <View style={{ alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: c.primarySoft }}><Text style={{ color: c.primary, fontWeight: '700' }}>{roleName}</Text></View>
        </Card>
        <Card>
          <SectionTitle title="Aparência" detail="A preferência é guardada na tua conta e acompanha os dispositivos ligados." />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Chip label="Claro" selected={user?.theme === 'light'} onPress={() => void toggleTheme('light')} /></View>
            <View style={{ flex: 1 }}><Chip label="Escuro" selected={user?.theme === 'dark'} onPress={() => void toggleTheme('dark')} /></View>
          </View>
          {!user?.theme ? <Text style={{ color: c.muted, fontSize: 12 }}>Segue a aparência do iPhone até escolheres um tema.</Text> : null}
        </Card>
        <Card>
          <SectionTitle title="Palavra-passe" detail="Confirma a palavra-passe atual para guardar uma nova." />
          <Field label="Palavra-passe atual" value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" />
          <Field label="Nova palavra-passe · 12 a 128 caracteres" value={next} onChangeText={setNext} secureTextEntry autoComplete="new-password" maxLength={128} />
          <Button title="Alterar palavra-passe" onPress={() => void changePassword()} busy={busy} />
        </Card>
        <Card>
          <SectionTitle title="Agenda na TV" detail="Autoriza uma TV a mostrar os eventos pessoais da tua conta." />
          <Button title="Ler QR da TV" secondary onPress={() => router.push('/qr-scanner')} />
        </Card>
        <Button title="Terminar sessão" secondary destructive onPress={logout} />
        <Text style={{ color: c.muted, fontSize: 12, textAlign: 'center' }}>Em Dia · Agenda Escolar</Text>
      </ScrollView>
    </Page>
  );
}
