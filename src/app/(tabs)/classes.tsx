import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, RefreshControl, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { SymbolView } from 'expo-symbols';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { useColors } from '../../lib/theme';
import type { Classroom } from '../../lib/types';
import { Button, Card, EmptyState, Heading, Page, SectionTitle } from '../../components/UI';

export default function Classes() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true); else setLoading(true);
    setError('');
    try { setClasses(await api<Classroom[]>('/api/classes')); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as turmas.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const copyCode = async (code: string) => {
    try { await Clipboard.setStringAsync(code); Alert.alert('Código copiado', 'Já pode partilhá-lo com os alunos da turma.'); }
    catch { Alert.alert('Não foi possível copiar', 'Selecione e copie o código manualmente.'); }
  };

  return (
    <Page safeAreaEdges={['top', 'left', 'right']}>
      <FlatList
        data={classes}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 20, paddingTop: 12, paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 112 : 36), gap: 14 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={c.primary} />}
        ListHeaderComponent={<View style={{ gap: 14, paddingBottom: 4 }}>
          <View style={{ gap: 5 }}><Text style={{ color: c.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }}>COMUNIDADE ESCOLAR</Text><Heading>Turmas</Heading><Text style={{ color: c.muted, fontSize: 14, lineHeight: 20 }}>{user?.role === 'viewer' ? 'As turmas associadas à tua conta e os eventos partilhados.' : 'Acede às turmas que geres e mantém os eventos organizados.'}</Text></View>
          {user?.role === 'admin' ? <Button title="＋  Criar turma" onPress={() => router.push('/class-form')} /> : null}
          {error ? <Card style={{ borderColor: c.red }}><Text style={{ color: c.red, fontWeight: '700' }}>Não foi possível carregar as turmas</Text><Text style={{ color: c.muted }}>{error}</Text><Button title="Tentar novamente" secondary onPress={() => void load(true)} /></Card> : null}
          {!error && !loading && classes.length ? <SectionTitle title="As tuas turmas" detail={`${classes.length} ${classes.length === 1 ? 'turma' : 'turmas'}`} /> : null}
        </View>}
        ListEmptyComponent={loading
          ? <Card style={{ alignItems: 'center', paddingVertical: 28 }}><ActivityIndicator color={c.primary} /><Text style={{ color: c.muted }}>A carregar turmas…</Text></Card>
          : error ? <View /> : <EmptyState title="Ainda não tens turmas" detail={user?.role === 'viewer' ? 'Pede ao professor o código da turma e usa-o ao criar a tua conta.' : 'As turmas associadas à tua conta aparecem aqui.'} action={user?.role === 'admin' ? <Button title="Criar primeira turma" onPress={() => router.push('/class-form')} /> : undefined} />}
        renderItem={({ item }) => (
          <Card style={{ borderColor: item.active ? c.line : c.red + '55' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ flex: 1, gap: 4 }}><Heading small>{item.name}</Heading><Text style={{ color: c.muted }}>{item.school_year || 'Ano letivo não indicado'}{item.active ? '' : ' · Inativa'}</Text></View>
              {user?.role === 'admin' ? <Pressable accessibilityRole="button" accessibilityLabel={`Gerir turma ${item.name}`} onPress={() => router.push({ pathname: '/class-form', params: { id: String(item.id) } })} style={{ padding: 8 }}><SymbolView name={{ ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' }} size={20} tintColor={c.primary} /></Pressable> : null}
            </View>
            <View style={{ height: 1, backgroundColor: c.line }} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, borderRadius: 14, padding: 12, backgroundColor: c.surfaceAlt, gap: 3 }}><Text style={{ color: c.muted, fontSize: 12 }}>Professores</Text><Text numberOfLines={2} style={{ color: c.text, fontWeight: '600' }}>{item.teachers?.map((teacher) => teacher.display_name).filter(Boolean).join(', ') || '—'}</Text></View>
              <View style={{ minWidth: 90, borderRadius: 14, padding: 12, backgroundColor: c.surfaceAlt, gap: 3 }}><Text style={{ color: c.muted, fontSize: 12 }}>Alunos</Text><Text style={{ color: c.text, fontSize: 17, fontWeight: '800' }}>{item.students?.length ?? '—'}</Text></View>
            </View>
            {user?.role === 'admin' && item.join_code ? <Pressable accessibilityRole="button" accessibilityLabel={`Copiar código da turma ${item.name}`} onPress={() => void copyCode(item.join_code!)} style={({ pressed }) => ({ borderRadius: 16, padding: 14, backgroundColor: c.primarySoft, opacity: pressed ? 0.75 : 1 })}>
              <Text style={{ color: c.muted, fontSize: 12, fontWeight: '600' }}>CÓDIGO DE INSCRIÇÃO</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }}><Text style={{ color: c.primary, fontSize: 20, fontWeight: '800', letterSpacing: 2 }}>{item.join_code}</Text><Text style={{ color: c.primary, fontWeight: '700' }}>Copiar</Text></View>
            </Pressable> : null}
          </Card>
        )}
      />
    </Page>
  );
}
