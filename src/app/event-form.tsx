import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { api, json } from '../lib/api';
import { fetchVisibleEvents } from '../lib/events';
import { useAuth } from '../lib/AuthContext';
import { useColors } from '../lib/theme';
import type { Classroom } from '../lib/types';
import { Button, Card, Chip, Field, Heading, Page, SectionTitle } from '../components/UI';

const localDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const isoToDisplay = (iso: string) => { const [year, month, day] = iso.split('-'); return year && month && day ? `${day}/${month}/${year}` : ''; };
const eventTypes = [['prova', 'Prova'], ['teste', 'Teste'], ['apresentacao', 'Apresentação'], ['trabalho', 'Trabalho'], ['aula', 'Aula'], ['outro', 'Outro']];
const levels = [['fundamental-i', '1.º ciclo'], ['fundamental-ii', '2.º/3.º ciclo'], ['medio', 'Secundário'], ['universidade', 'Ensino superior']];

export function EventFormScreen({ embedded = false }: { embedded?: boolean }) {
  const c = useColors();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [type, setType] = useState('prova');
  const [level, setLevel] = useState('universidade');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState(user?.role === 'viewer' ? 'personal' : user?.role === 'editor' ? 'class' : 'school');
  const [classId, setClassId] = useState('');
  const [loading, setLoading] = useState(Boolean(id));
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);

  useEffect(() => {
    let active = true;
    api<Classroom[]>('/api/classes').then((rows) => { if (active) setClasses(rows); })
      .catch((cause) => { if (active) setError(`Não foi possível carregar as turmas. ${cause instanceof Error ? cause.message : ''}`); })
      .finally(() => { if (active) setLoadingClasses(false); });
    if (!id) return () => { active = false; };
    fetchVisibleEvents().then((items) => {
      if (!active) return;
      const event = items.find((item) => String(item.id) === id);
      if (!event) throw new Error('Este evento não está disponível para a tua conta.');
      setTitle(event.titulo); setDate(event.data); setTime(event.hora || '09:00');
      setType(event.tipo || 'outro'); setDescription(event.descricao || '');
      setScope(event.scope || 'school'); setClassId(event.class_id ? String(event.class_id) : '');
      setLevel(event.nivel_educacional || 'universidade');
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar este evento.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const availableScopes = useMemo(() => user?.role === 'viewer' ? [['personal', 'Pessoal']] : user?.role === 'editor' ? [['class', 'Turma']] : [['school', 'Toda a escola'], ['class', 'Turma']], [user?.role]);
  const selectableClasses = classes.filter((item) => item.active || String(item.id) === classId);

  const save = async () => {
    const isoDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
    if (!title.trim()) return Alert.alert('Nome em falta', 'Indique o nome do evento.');
    if (title.trim().length > 200) return Alert.alert('Nome demasiado longo', 'O nome pode ter no máximo 200 caracteres.');
    if (!isoDate) return Alert.alert('Data inválida', 'Use o formato DD/MM/AAAA, por exemplo 15/11/2026.');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return Alert.alert('Hora inválida', 'Use o formato de 24 horas HH:MM.');
    if (scope === 'class' && !classId) return Alert.alert('Escolha uma turma', 'Selecione a turma que vai receber este evento.');
    if (scope === 'class' && !selectableClasses.some((item) => String(item.id) === classId)) return Alert.alert('Turma indisponível', 'Atualize a lista e selecione uma turma ativa.');
    setSaving(true);
    try {
      const payload = { titulo: title.trim(), data: isoDate, hora: time, tipo: type, descricao: description.trim(), nivel_educacional: level, scope, class_id: scope === 'class' ? Number(classId) : null };
      if (id) await api(`/api/eventos/${id}`, json('PUT', payload)); else await api('/api/eventos', json('POST', payload));
      if (embedded) {
        setTitle(''); setDate(''); setTime('09:00'); setType('prova'); setDescription(''); setClassId('');
        setScope(user?.role === 'viewer' ? 'personal' : user?.role === 'editor' ? 'class' : 'school');
        setSuccess('Evento publicado na agenda.');
      } else router.back();
    } catch (cause) { Alert.alert('Não foi possível guardar', cause instanceof Error ? cause.message : 'Tente novamente.'); }
    finally { setSaving(false); }
  };

  const remove = () => Alert.alert('Apagar evento?', 'Esta ação não pode ser anulada.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Apagar', style: 'destructive', onPress: async () => {
      setSaving(true);
      try { await api(`/api/eventos/${id}`, { method: 'DELETE' }); router.back(); }
      catch (cause) { Alert.alert('Não foi possível apagar', cause instanceof Error ? cause.message : 'Tente novamente.'); }
      finally { setSaving(false); }
    } },
  ]);

  const pickerDate = new Date(`${date || localDateKey(new Date())}T12:00:00`);
  const pickerTime = new Date(`2000-01-01T${time}:00`);
  const updatePicker = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed') { setPickerMode(null); return; }
    if (!selected) return;
    if (pickerMode === 'date') setDate(localDateKey(selected));
    if (pickerMode === 'time') setTime(`${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`);
    if (Platform.OS !== 'ios') setPickerMode(null);
  };

  if (loading) return <Page safeAreaEdges={['top', 'bottom', 'left', 'right']}><View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}><ActivityIndicator color={c.primary} size="large" /><Text style={{ color: c.muted }}>A carregar evento…</Text></View></Page>;

  return (
    <Page safeAreaEdges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 16 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 5 }}><Text style={{ color: c.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }}>{id ? 'GESTÃO DA AGENDA' : 'ADICIONAR À AGENDA'}</Text><Heading>{id ? 'Editar evento' : 'Novo evento'}</Heading><Text style={{ color: c.muted }}>Os campos marcados com * são obrigatórios.</Text></View>
          {error ? <Card style={{ borderColor: c.red }}><Text style={{ color: c.red, fontWeight: '700' }}>Há informação que não foi carregada</Text><Text style={{ color: c.muted }}>{error}</Text></Card> : null}
          {success ? <Card style={{ borderColor: c.green, backgroundColor: c.surfaceAlt }}><Text style={{ color: c.green, fontWeight: '700' }}>{success}</Text></Card> : null}
          <Card>
            <Field label="Nome do evento *" value={title} onChangeText={setTitle} placeholder="Ex.: Prova de Matemática" maxLength={200} returnKeyType="next" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, gap: 7 }}><Text style={{ color: c.muted, fontSize: 13, fontWeight: '600' }}>Data *</Text><Pressable accessibilityRole="button" accessibilityLabel={`Selecionar data${date ? `, ${isoToDisplay(date)}` : ''}`} onPress={() => setPickerMode(pickerMode === 'date' ? null : 'date')} style={({ pressed }) => ({ minHeight: 50, borderWidth: 1, borderColor: pickerMode === 'date' ? c.primary : c.line, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.surface, opacity: pressed ? 0.75 : 1 })}><Text style={{ color: date ? c.text : c.muted, fontSize: 15 }}>{date ? isoToDisplay(date) : 'Selecionar data'}</Text><Text style={{ color: c.primary }}>▦</Text></Pressable></View>
              <View style={{ width: 122, gap: 7 }}><Text style={{ color: c.muted, fontSize: 13, fontWeight: '600' }}>Hora *</Text><Pressable accessibilityRole="button" accessibilityLabel={`Selecionar hora, ${time}`} onPress={() => setPickerMode(pickerMode === 'time' ? null : 'time')} style={({ pressed }) => ({ minHeight: 50, borderWidth: 1, borderColor: pickerMode === 'time' ? c.primary : c.line, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.surface, opacity: pressed ? 0.75 : 1 })}><Text style={{ color: c.text, fontSize: 15 }}>{time}</Text><Text style={{ color: c.primary }}>◷</Text></Pressable></View>
            </View>
            {pickerMode ? <View style={{ alignItems: 'center', borderRadius: 16, paddingVertical: 6, backgroundColor: c.surfaceAlt }}><DateTimePicker value={pickerMode === 'date' ? pickerDate : pickerTime} mode={pickerMode} display={Platform.OS === 'ios' ? 'compact' : 'default'} locale="pt-PT" is24Hour onChange={updatePicker} accentColor={c.primary} /></View> : null}

            <View style={{ gap: 9 }}><SectionTitle title="Tipo de evento" /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{eventTypes.map(([key, label]) => <Chip key={key} label={label} selected={type === key} onPress={() => setType(key)} />)}</View></View>
            <View style={{ gap: 9 }}><SectionTitle title="Quem vê este evento?" /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{availableScopes.map(([key, label]) => <Chip key={key} label={label} selected={scope === key} onPress={() => { setScope(key); if (key !== 'class') setClassId(''); }} />)}</View></View>

            {scope === 'class' ? <View style={{ gap: 9 }}>
              <SectionTitle title="Turma" detail={user?.role === 'editor' ? 'Escolhe uma das turmas que geres.' : 'Escolhe a turma que vai receber o evento.'} />
              {loadingClasses ? <ActivityIndicator color={c.primary} /> : selectableClasses.length ? <View style={{ gap: 8 }}>{selectableClasses.map((item) => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: classId === String(item.id) }} onPress={() => setClassId(String(item.id))} style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, borderRadius: 14, borderWidth: 1, borderColor: classId === String(item.id) ? c.primary : c.line, backgroundColor: classId === String(item.id) ? c.primarySoft : c.surface, opacity: pressed ? 0.8 : 1 })}><View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: classId === String(item.id) ? c.primary : c.muted, alignItems: 'center', justifyContent: 'center' }}>{classId === String(item.id) ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary }} /> : null}</View><Text style={{ color: c.text, fontWeight: '600' }}>{item.name}</Text>{!item.active ? <Text style={{ color: c.red, marginLeft: 'auto', fontSize: 12 }}>Inativa</Text> : item.school_year ? <Text style={{ color: c.muted, marginLeft: 'auto', fontSize: 12 }}>{item.school_year}</Text> : null}</Pressable>)}</View> : <Text style={{ color: c.red }}>Não há turmas ativas disponíveis.</Text>}
            </View> : null}

            <View style={{ gap: 9 }}><SectionTitle title="Nível de ensino" /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{levels.map(([key, label]) => <Chip key={key} label={label} selected={level === key} onPress={() => setLevel(key)} />)}</View></View>
            <Field label="Detalhes · opcional" value={description} onChangeText={setDescription} multiline numberOfLines={4} maxLength={2000} style={{ minHeight: 104, textAlignVertical: 'top', paddingTop: 12 }} placeholder="Sala, materiais necessários ou outra informação útil…" />
            <Button title={id ? 'Guardar alterações' : 'Publicar evento'} onPress={() => void save()} busy={saving} disabled={Boolean(error && id)} />
            {id && !embedded ? <Button title="Apagar evento" secondary destructive onPress={remove} disabled={saving} /> : null}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Page>
  );
}

export default function EventForm() { return <EventFormScreen />; }
