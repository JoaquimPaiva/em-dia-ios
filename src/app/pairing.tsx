import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { useColors } from '../lib/theme';
import { Button, Card, Heading, Page } from '../components/UI';

type PairingStatus = 'pending' | 'approved';

export default function Pairing() {
  const c = useColors();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { user, signOut } = useAuth();
  const [status, setStatus] = useState<PairingStatus | ''>('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const check = useCallback(async () => {
    if (!token || !user) return;
    try {
      const result = await api<{ status: PairingStatus }>(`/api/tv/pairings/${encodeURIComponent(token)}`);
      if (result.status !== 'pending' && result.status !== 'approved') throw new Error('A ligação devolveu um estado inesperado.');
      setError('');
      setStatus(result.status);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível validar o código da TV.'); }
  }, [token, user]);

  useEffect(() => {
    if (!token || !user) return;
    let active = true;
    api<{ status: PairingStatus }>(`/api/tv/pairings/${encodeURIComponent(token)}`).then((result) => {
      if (!active) return;
      if (result.status !== 'pending' && result.status !== 'approved') throw new Error('A ligação devolveu um estado inesperado.');
      setError(''); setStatus(result.status);
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível validar o código da TV.'); });
    return () => { active = false; };
  }, [token, user]);

  const approve = async () => {
    if (user?.role !== 'viewer' || !token) return;
    setBusy(true); setError('');
    try {
      await api(`/api/tv/pairings/${encodeURIComponent(token)}/approve`, { method: 'POST' });
      setStatus('approved');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível associar esta TV.'); }
    finally { setBusy(false); }
  };

  const openLogin = () => router.push({ pathname: '/auth', params: { tvToken: token || '' } });

  return (
    <Page safeAreaEdges={['top', 'bottom', 'left', 'right']}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 22 }}>
        <Card style={{ padding: 22, gap: 15 }}>
          <View style={{ width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primarySoft }}><Text style={{ color: c.primary, fontSize: 20, fontWeight: '800' }}>TV</Text></View>
          <Text style={{ color: c.primary, fontWeight: '800', letterSpacing: 1.5, fontSize: 12 }}>ACESSO PESSOAL</Text>
          <Heading>Ligar agenda à TV</Heading>
          <Text style={{ color: c.muted, lineHeight: 22 }}>{!user ? 'Inicia sessão com a tua conta de aluno para autorizar esta TV.' : user.role !== 'viewer' ? 'Por privacidade, só uma conta de aluno pode autorizar uma TV para mostrar a agenda pessoal.' : status === 'approved' ? 'TV associada. O ecrã vai carregar a tua agenda pessoal.' : status === 'pending' ? 'Confirma que queres mostrar os eventos da tua conta neste ecrã.' : error ? 'Não foi possível validar o código. Pede à TV para gerar um novo QR e tenta novamente.' : 'A validar o código seguro da TV…'}</Text>
          {!user ? <Button title="Iniciar sessão" onPress={openLogin} /> : null}
          {user?.role === 'viewer' && status === 'pending' ? <Button title="Autorizar esta TV" onPress={() => void approve()} busy={busy} /> : null}
          {user && !status && !error ? <ActivityIndicator color={c.primary} /> : null}
          {error ? <View style={{ gap: 8 }}><Text accessibilityRole="alert" style={{ color: c.red, lineHeight: 20 }}>{error}</Text>{user ? <Button title="Validar novamente" secondary onPress={() => void check()} /> : null}</View> : null}
          {user?.role && user.role !== 'viewer' ? <Button title="Terminar sessão" secondary onPress={() => Alert.alert('Terminar sessão?', 'Depois inicia sessão com uma conta de aluno.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Terminar', style: 'destructive', onPress: async () => { await signOut(); }}])} /> : null}
          <Text onPress={() => router.back()} accessibilityRole="button" style={{ color: c.primary, textAlign: 'center', padding: 8, fontWeight: '700' }}>Voltar</Text>
        </Card>
      </View>
    </Page>
  );
}
