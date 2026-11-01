import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { api } from '../../lib/api';
import { fetchVisibleEvents } from '../../lib/events';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { useColors } from '../../lib/theme';
import type { Classroom, EventItem } from '../../lib/types';
import { Button, Card, Chip, EmptyState, Field, Heading, Page, SectionTitle } from '../../components/UI';

type Period = 'Todos' | 'Hoje' | 'Futuros' | 'Passados';
type Scope = 'Todos' | 'Escola' | 'Turma' | 'Pessoal';
const kinds = ['Todos', 'prova', 'teste', 'apresentacao', 'trabalho', 'aula', 'outro'];
const kindLabel = (kind: string) => kind === 'apresentacao' ? 'Apresentação' : kind === 'Todos' ? kind : `${kind[0].toUpperCase()}${kind.slice(1)}`;
const localDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dateText = (value: string, options: Intl.DateTimeFormatOptions = { weekday: 'short', day: '2-digit', month: 'short' }) => {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-PT', options).format(date);
};
const timeOf = (event: EventItem) => new Date(`${event.data}T${(event.hora || '23:59').slice(0, 5)}:00`).getTime();
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-PT');

function SummaryTile({ label, value, icon }: { label: string; value: string | number; icon: 'books.vertical' | 'star' }) {
  const c = useColors();
  return (
    <Card style={{ flex: 1, minHeight: 88, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11, borderColor: c.primary + '30', backgroundColor: c.surface }}>
      <View style={{ width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primarySoft }}>
        <SymbolView name={icon === 'books.vertical' ? { ios: 'books.vertical', android: 'auto_stories', web: 'auto_stories' } : { ios: 'star', android: 'star', web: 'star' }} size={18} tintColor={c.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: c.muted, fontSize: 12, fontWeight: '600' }}>{label}</Text>
        <Text numberOfLines={1} style={{ color: c.text, fontSize: 21, fontWeight: '800', letterSpacing: -0.4 }}>{value}</Text>
      </View>
    </Card>
  );
}

export default function Agenda() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [teacherClassIds, setTeacherClassIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('Todos');
  const [scope, setScope] = useState<Scope>('Todos');
  const [period, setPeriod] = useState<Period>('Todos');
  const [clock, setClock] = useState(() => Date.now());
  const [error, setError] = useState('');

  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true); else setLoading(true);
    setError('');
    try { setEvents(await fetchVisibleEvents()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a agenda.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => {
    void load();
    const timer = setInterval(() => void load(true), 30_000);
    return () => clearInterval(timer);
  }, [load]));

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel(`native-events-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => void load(true))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, load]);

  useEffect(() => {
    if (user?.role !== 'editor') return;
    let active = true;
    api<Classroom[]>('/api/classes').then((rows) => { if (active) setTeacherClassIds(rows.map((row) => row.id)); })
      .catch(() => { if (active) setTeacherClassIds([]); });
    return () => { active = false; };
  }, [user?.id, user?.role]);

  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer); }, []);

  const today = localDateKey(new Date(clock));
  const todayEvents = useMemo(() => events.filter((event) => event.data === today).sort((a, b) => (a.hora || '').localeCompare(b.hora || '')), [events, today]);
  const upcoming = useMemo(() => events.filter((event) => timeOf(event) >= clock).sort((a, b) => timeOf(a) - timeOf(b))[0], [events, clock]);
  const currentDayEvent = todayEvents.find((event) => timeOf(event) >= clock);
  const featured = currentDayEvent || upcoming || todayEvents.at(-1);
  const countdown = featured && timeOf(featured) >= clock ? timeOf(featured) - clock : 0;
  const daysLeft = Math.floor(countdown / 86_400_000);
  const hoursLeft = Math.floor((countdown % 86_400_000) / 3_600_000);
  const minsLeft = Math.floor((countdown % 3_600_000) / 60_000);
  const secsLeft = Math.floor((countdown % 60_000) / 1000);

  const filtered = useMemo(() => events.filter((event) => {
    const searchable = normalize(`${event.titulo} ${event.descricao || ''} ${event.class_name || ''}`);
    const matchesQuery = !query.trim() || searchable.includes(normalize(query.trim()));
    const matchesKind = kind === 'Todos' || normalize(event.tipo || '') === normalize(kind);
    const matchesScope = scope === 'Todos' || (scope === 'Pessoal' ? event.scope === 'personal' : scope === 'Turma' ? event.scope === 'class' : event.scope === 'school');
    const matchesPeriod = period === 'Todos' || (period === 'Hoje' ? event.data === today : period === 'Futuros' ? event.data >= today : event.data < today);
    return matchesQuery && matchesKind && matchesScope && matchesPeriod;
  }).sort((a, b) => {
    const group = (event: EventItem) => event.data === today ? 0 : event.data > today ? 1 : 2;
    const diff = group(a) - group(b);
    return diff || (group(a) === 2 ? timeOf(b) - timeOf(a) : timeOf(a) - timeOf(b));
  }), [events, query, kind, scope, period, today]);

  const roleName = user?.role === 'admin' ? 'administrador' : user?.role === 'editor' ? 'professor' : 'estudante';
  const countdownText = !featured ? 'Sem eventos futuros' : timeOf(featured) < clock ? 'Último evento de hoje' : daysLeft ? `${daysLeft} d ${hoursLeft} h` : hoursLeft ? `${hoursLeft} h ${minsLeft} min` : `${minsLeft} min ${secsLeft} s`;

  return (
    <Page safeAreaEdges={['top', 'left', 'right']}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 112 : 36), gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={c.primary} />}
        ListHeaderComponent={
          <View style={{ gap: 18, paddingBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: c.primary, fontWeight: '800', fontSize: 11, letterSpacing: 1.5 }}>EM DIA · AGENDA ESCOLAR</Text>
                <Heading>Olá, {user?.display_name?.trim().split(/\s+/)[0] || 'estudante'}.</Heading>
                <Text style={{ color: c.muted, fontSize: 14 }}>A tua agenda está pronta, {roleName}.</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Abrir a minha conta" onPress={() => router.push('/account')} style={({ pressed }) => ({ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primarySoft, opacity: pressed ? 0.7 : 1 })}>
                <Text style={{ color: c.primary, fontSize: 16, fontWeight: '800' }}>{user?.display_name?.trim().slice(0, 1).toUpperCase() || 'E'}</Text>
              </Pressable>
            </View>

            {error ? <Card style={{ borderColor: c.red, backgroundColor: c.surface }}>
              <Text style={{ color: c.red, fontWeight: '700', fontSize: 16 }}>A agenda não foi atualizada</Text>
              <Text style={{ color: c.muted, lineHeight: 20 }}>{error}</Text>
              <Button title="Tentar novamente" secondary onPress={() => void load(true)} />
            </Card> : null}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <SummaryTile label="Eventos agendados" value={events.length} icon="books.vertical" />
              <SummaryTile label="Hoje" value={todayEvents.length} icon="star" />
            </View>

            <Card style={{ padding: 18, borderColor: c.primary + '35', backgroundColor: c.primarySoft, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: c.primary, fontSize: 13, fontWeight: '800', letterSpacing: 1 }}>{featured?.data === today ? 'A DECORRER HOJE' : 'PRÓXIMO EVENTO'}</Text>
                {loading ? <ActivityIndicator size="small" color={c.primary} /> : null}
              </View>
              <Text numberOfLines={2} style={{ color: c.text, fontSize: 21, fontWeight: '800', letterSpacing: -0.5 }}>{featured?.titulo || 'Sem eventos futuros'}</Text>
              {featured ? <Text style={{ color: c.muted, fontSize: 14 }}>{dateText(featured.data, { weekday: 'long', day: 'numeric', month: 'long' })}{featured.hora ? ` · ${featured.hora.slice(0, 5)}` : ''}{featured.class_name ? ` · ${featured.class_name}` : ''}</Text> : <Text style={{ color: c.muted }}>Os próximos eventos aparecem aqui automaticamente.</Text>}
              {featured ? <View style={{ borderTopWidth: 1, borderTopColor: c.primary + '24', paddingTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: c.primary, fontWeight: '800', fontSize: 16 }}>{countdownText}</Text>
                {featured.data === today && todayEvents.length > 1 ? <Text style={{ color: c.muted, fontSize: 13 }}>{todayEvents.length} eventos hoje</Text> : null}
              </View> : null}
            </Card>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Button title="＋  Novo evento" onPress={() => router.push('/event-form')} /></View>
              <Pressable accessibilityRole="button" onPress={() => router.push('/qr-scanner')} style={({ pressed }) => ({ minHeight: 50, flex: 1, borderRadius: 15, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: c.surfaceAlt, opacity: pressed ? 0.75 : 1 })}>
                <SymbolView name={{ ios: 'qrcode.viewfinder', android: 'qr_code_scanner', web: 'qr_code_scanner' }} size={18} tintColor={c.primary} /><Text numberOfLines={1} style={{ color: c.primary, fontWeight: '700', fontSize: 14 }}>Ligar à TV</Text>
              </Pressable>
            </View>

            <View style={{ gap: 11 }}>
              <SectionTitle title="A tua agenda" detail={`${filtered.length} ${filtered.length === 1 ? 'evento' : 'eventos'} visíveis`} />
              <Field label="Pesquisar" value={query} onChangeText={setQuery} placeholder="Provas, aulas, atividades…" returnKeyType="search" clearButtonMode="while-editing" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {kinds.map((item) => <Chip key={item} label={kindLabel(item)} selected={kind === item} onPress={() => setKind(item)} />)}
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {(['Todos', 'Hoje', 'Futuros', 'Passados'] as Period[]).map((item) => <Chip key={item} label={item} selected={period === item} onPress={() => setPeriod(item)} />)}
                <View style={{ width: 1, height: 25, backgroundColor: c.line, alignSelf: 'center', marginHorizontal: 2 }} />
                {(['Todos', 'Escola', 'Turma', 'Pessoal'] as Scope[]).map((item) => <Chip key={item} label={item} selected={scope === item} onPress={() => setScope(item)} />)}
              </ScrollView>
            </View>
          </View>
        }
        ListEmptyComponent={loading
          ? <Card style={{ alignItems: 'center', paddingVertical: 28 }}><ActivityIndicator color={c.primary} /><Text style={{ color: c.muted }}>A carregar a agenda…</Text></Card>
          : <EmptyState
              title={events.length ? 'Sem resultados para estes filtros' : 'Ainda não há eventos na agenda'}
              detail={events.length ? 'Altera a pesquisa ou limpa alguns filtros para voltares a ver eventos.' : 'Quando a escola ou a tua turma publicar eventos, eles aparecem aqui.'}
              action={events.length ? <Button title="Limpar filtros" secondary onPress={() => { setQuery(''); setKind('Todos'); setPeriod('Todos'); setScope('Todos'); }} /> : user?.role !== 'viewer' ? <Button title="Criar primeiro evento" onPress={() => router.push('/event-form')} /> : undefined}
            />}
        renderItem={({ item }) => {
          const editable = user?.role === 'admin'
            ? item.scope !== 'personal' || item.owner_id === user.id
            : user?.role === 'editor'
              ? item.scope === 'class' && teacherClassIds.includes(Number(item.class_id))
              : item.scope === 'personal' && item.owner_id === user?.id;
          const scopeLabel = item.scope === 'personal' ? 'Pessoal' : item.scope === 'class' ? item.class_name || 'Turma' : 'Escola';
          return (
            <Pressable disabled={!editable} accessibilityRole={editable ? 'button' : undefined} accessibilityLabel={`${item.titulo}, ${dateText(item.data)}${editable ? ', editar evento' : ''}`} onPress={() => router.push({ pathname: '/event-form', params: { id: String(item.id) } })}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderColor: item.data === today ? c.primary + '55' : c.line }}>
                <View style={{ width: 55, minHeight: 61, borderRadius: 16, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', padding: 5 }}>
                  <Text style={{ color: c.primary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>{dateText(item.data, { weekday: 'short' }).replace('.', '')}</Text>
                  <Text style={{ color: c.primary, fontWeight: '800', fontSize: 21 }}>{item.data.slice(8, 10)}</Text>
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  <Text numberOfLines={2} style={{ color: c.text, fontWeight: '700', fontSize: 16 }}>{item.titulo}</Text>
                  <Text numberOfLines={1} style={{ color: c.muted, fontSize: 13 }}>{[item.hora?.slice(0, 5), scopeLabel, kindLabel(item.tipo || 'evento')].filter(Boolean).join(' · ')}</Text>
                  {item.descricao ? <Text numberOfLines={2} style={{ color: c.muted, fontSize: 13, lineHeight: 18 }}>{item.descricao}</Text> : null}
                </View>
                {editable ? <Text accessibilityElementsHidden style={{ color: c.primary, fontSize: 21, fontWeight: '700' }}>›</Text> : null}
              </Card>
            </Pressable>
          );
        }}
      />
    </Page>
  );
}
