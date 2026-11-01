import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, RefreshControl, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, json } from '../../lib/api';
import { useColors } from '../../lib/theme';
import type { UserRecord } from '../../lib/types';
import { Button, Card, EmptyState, Heading, Page, SectionTitle } from '../../components/UI';

type AuditEntry = { id: string | number; display_name?: string; email?: string; action: string; entity_type?: string; created_at?: string };
const roleLabel = (role: UserRecord['role']) => role === 'viewer' ? 'Aluno' : role === 'editor' ? 'Professor' : 'Administrador';

export default function Users() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const [accounts, log] = await Promise.all([api<UserRecord[]>('/api/users'), api<AuditEntry[]>('/api/audit')]);
      setUsers(accounts); setAudit(log);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a gestão.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const toggleActive = (account: UserRecord) => Alert.alert(
    account.active ? 'Desativar conta?' : 'Ativar conta?',
    `${account.display_name} · ${account.email}`,
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: account.active ? 'Desativar' : 'Ativar', style: account.active ? 'destructive' : 'default', onPress: async () => {
        try { await api(`/api/users/${account.id}`, json('PATCH', { active: !account.active })); await load(true); }
        catch (cause) { Alert.alert('Não foi possível alterar a conta', cause instanceof Error ? cause.message : 'Tente novamente.'); }
      } },
    ],
  );

  return (
    <Page safeAreaEdges={['top', 'left', 'right']}>
      <FlatList
        data={users}
        keyExtractor={(user) => user.id}
        contentContainerStyle={{ padding: 20, paddingTop: 12, paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 112 : 36), gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={c.primary} />}
        ListHeaderComponent={<View style={{ gap: 14, paddingBottom: 5 }}>
          <View style={{ gap: 5 }}><Text style={{ color: c.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }}>ADMINISTRAÇÃO</Text><Heading>Utilizadores</Heading><Text style={{ color: c.muted, fontSize: 14 }}>Contas, permissões e atividade recente.</Text></View>
          <Button title="＋  Criar utilizador" onPress={() => router.push('/user-form')} />
          {error ? <Card style={{ borderColor: c.red }}><Text style={{ color: c.red, fontWeight: '700' }}>A gestão não foi carregada</Text><Text style={{ color: c.muted }}>{error}</Text><Button title="Tentar novamente" secondary onPress={() => void load(true)} /></Card> : null}
          {!error && !loading ? <SectionTitle title="Contas" detail={`${users.length} ${users.length === 1 ? 'utilizador' : 'utilizadores'}`} /> : null}
        </View>}
        ListEmptyComponent={loading
          ? <Card style={{ alignItems: 'center', paddingVertical: 28 }}><ActivityIndicator color={c.primary} /><Text style={{ color: c.muted }}>A carregar utilizadores…</Text></Card>
          : error ? <View /> : <EmptyState title="Ainda não existem utilizadores" detail="As contas criadas para a escola vão aparecer nesta lista." />}
        ListFooterComponent={!loading && !error && audit.length ? <View style={{ gap: 12, marginTop: 16 }}><SectionTitle title="Atividade recente" detail="Últimas ações registadas" />{audit.map((entry) => <Card key={String(entry.id)} style={{ padding: 14, gap: 5 }}><Text style={{ color: c.text, fontWeight: '700' }}>{entry.display_name || entry.email || 'Sistema'} · {entry.action}</Text><Text style={{ color: c.muted, fontSize: 13 }}>{entry.entity_type || 'Registo'}{entry.created_at ? ` · ${(() => { const date = new Date(entry.created_at); return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium', timeStyle: 'short' }).format(date); })()}` : ''}</Text></Card>)}</View> : <View />}
        renderItem={({ item }) => (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1, gap: 3 }}><Heading small>{item.display_name}</Heading><Text style={{ color: c.muted }}>{item.email}</Text></View>
              <View style={{ borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: item.active ? c.primarySoft : c.surfaceAlt }}><Text style={{ color: item.active ? c.primary : c.muted, fontSize: 12, fontWeight: '700' }}>{item.active ? 'Ativo' : 'Inativo'}</Text></View>
            </View>
            <Text style={{ color: c.primary, fontWeight: '700' }}>{roleLabel(item.role)}</Text>
            <View style={{ height: 1, backgroundColor: c.line }} />
            <View style={{ flexDirection: 'row', gap: 20 }}>
              <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/user-form', params: { id: item.id } })}><Text style={{ color: c.primary, fontWeight: '700', paddingVertical: 4 }}>Editar conta</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={() => toggleActive(item)}><Text style={{ color: item.active ? c.red : c.green, fontWeight: '700', paddingVertical: 4 }}>{item.active ? 'Desativar' : 'Ativar'}</Text></Pressable>
            </View>
          </Card>
        )}
      />
    </Page>
  );
}
