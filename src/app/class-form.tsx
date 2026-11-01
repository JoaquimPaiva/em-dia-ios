import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { api, json } from '../lib/api';
import { useColors } from '../lib/theme';
import type { Classroom, UserRecord } from '../lib/types';
import { Button, Card, Field, Heading, Page, SectionTitle } from '../components/UI';

export default function ClassForm() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [allUsers, setAllUsers] = useState<UserRecord[]>([]);
  const [teachers, setTeachers] = useState<string[]>([]);
  const [students, setStudents] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [workingCode, setWorkingCode] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let current = true;
    const loadUsers = api<UserRecord[]>('/api/users').then((rows) => { if (current) setAllUsers(rows); });
    if (id) {
      Promise.all([loadUsers, api<Classroom[]>('/api/classes')]).then(([, rows]) => {
        if (!current) return;
        const item = rows.find((row) => String(row.id) === id);
        if (!item) throw new Error('A turma não está disponível.');
        setName(item.name); setYear(item.school_year || ''); setTeachers((item.teachers || []).map((person) => person.id));
        setStudents((item.students || []).map((person) => person.id)); setCode(item.join_code || ''); setActive(item.active);
      }).catch((cause) => { if (current) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a turma.'); })
        .finally(() => { if (current) setLoading(false); });
    } else loadUsers.catch((cause) => { if (current) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os utilizadores.'); });
    return () => { current = false; };
  }, [id]);

  const toggle = (userId: string, role: 'editor' | 'viewer') => {
    const list = role === 'editor' ? teachers : students;
    const setList = role === 'editor' ? setTeachers : setStudents;
    setList(list.includes(userId) ? list.filter((item) => item !== userId) : [...list, userId]);
  };

  const save = async () => {
    if (!name.trim()) return Alert.alert('Nome em falta', 'Indique o nome da turma.');
    if (name.trim().length > 100 || year.trim().length > 30) return Alert.alert('Dados demasiado longos', 'Verifique o nome da turma e o ano letivo.');
    setSaving(true); setError('');
    try {
      if (id) {
        await api(`/api/classes/${id}`, json('PATCH', { name: name.trim(), school_year: year.trim(), active }));
        await api(`/api/classes/${id}/members`, json('PUT', { teacher_ids: teachers, student_ids: students }));
      } else await api('/api/classes', json('POST', { name: name.trim(), school_year: year.trim() }));
      router.back();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível guardar a turma.'); }
    finally { setSaving(false); }
  };

  const generateCode = () => Alert.alert('Gerar novo código?', 'O código atual deixará de funcionar para novas inscrições.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Gerar código', onPress: async () => {
      setWorkingCode(true);
      try { const result = await api<{ join_code: string }>(`/api/classes/${id}/join-code`, { method: 'POST' }); setCode(result.join_code); }
      catch (cause) { Alert.alert('Não foi possível gerar o código', cause instanceof Error ? cause.message : 'Tente novamente.'); }
      finally { setWorkingCode(false); }
    } },
  ]);

  const copyCode = async () => {
    try { await Clipboard.setStringAsync(code); Alert.alert('Código copiado', 'Partilhe-o apenas com os alunos desta turma.'); }
    catch { Alert.alert('Não foi possível copiar', 'Selecione e copie o código manualmente.'); }
  };

  const memberList = (role: 'editor' | 'viewer', title: string, selected: string[]) => {
    const users = allUsers.filter((account) => account.role === role && (account.active || selected.includes(account.id)));
    return <View style={{ gap: 9 }}>
      <SectionTitle title={title} detail={`${selected.length} selecionados`} />
      {users.length ? users.map((person) => {
        const checked = selected.includes(person.id);
        return <Pressable key={person.id} accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => toggle(person.id, role)} style={({ pressed }) => ({ minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: checked ? c.primary : c.line, backgroundColor: checked ? c.primarySoft : c.surface, opacity: pressed ? 0.75 : 1 })}>
          <View style={{ width: 21, height: 21, borderRadius: 7, borderWidth: 1.5, borderColor: checked ? c.primary : c.muted, backgroundColor: checked ? c.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{checked ? <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>✓</Text> : null}</View>
          <View style={{ flex: 1 }}><Text style={{ color: c.text, fontWeight: '600' }}>{person.display_name}</Text><Text style={{ color: c.muted, fontSize: 12 }}>{person.email}</Text></View>
          {!person.active ? <Text style={{ color: c.red, fontSize: 11 }}>Inativo</Text> : null}
        </Pressable>;
      }) : <Text style={{ color: c.muted }}>Não existem utilizadores ativos com esta permissão.</Text>}
    </View>;
  };

  if (loading) return <Page safeAreaEdges={['top', 'bottom', 'left', 'right']}><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}><ActivityIndicator color={c.primary} size="large" /><Text style={{ color: c.muted }}>A carregar turma…</Text></View></Page>;

  return (
    <Page safeAreaEdges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 12, paddingBottom: 34, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 5 }}><Text style={{ color: c.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }}>GESTÃO ESCOLAR</Text><Heading>{id ? 'Gerir turma' : 'Criar turma'}</Heading><Text style={{ color: c.muted }}>Organiza os professores, alunos e eventos partilhados.</Text></View>
        {error ? <Card style={{ borderColor: c.red }}><Text style={{ color: c.red, fontWeight: '700' }}>Não foi possível concluir a operação</Text><Text style={{ color: c.muted }}>{error}</Text></Card> : null}
        <Card>
          <Field label="Nome da turma *" value={name} onChangeText={setName} placeholder="Ex.: 10.º A" maxLength={100} />
          <Field label="Ano letivo" value={year} onChangeText={setYear} placeholder="2026/2027" maxLength={30} />
          {id ? <>
            {memberList('editor', 'Professores', teachers)}
            {memberList('viewer', 'Alunos', students)}
            <View style={{ gap: 9 }}><SectionTitle title="Inscrição de alunos" detail="Partilha o código para os alunos aderirem ao criar conta." />
              {code ? <Pressable accessibilityRole="button" accessibilityLabel="Copiar código de inscrição" onPress={() => void copyCode()} style={({ pressed }) => ({ padding: 14, borderRadius: 16, backgroundColor: c.primarySoft, opacity: pressed ? 0.75 : 1 })}><Text style={{ color: c.muted, fontSize: 12, fontWeight: '700' }}>CÓDIGO DA TURMA</Text><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 }}><Text style={{ color: c.primary, fontWeight: '800', fontSize: 20, letterSpacing: 2 }}>{code}</Text><Text style={{ color: c.primary, fontWeight: '700' }}>Copiar</Text></View></Pressable> : <Text style={{ color: c.muted }}>Ainda não existe um código.</Text>}
              <Button title={workingCode ? 'A gerar…' : 'Gerar novo código'} secondary onPress={generateCode} busy={workingCode} disabled={workingCode} />
            </View>
            <Pressable accessibilityRole="switch" accessibilityState={{ checked: active }} onPress={() => setActive(!active)} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><View><Text style={{ color: c.text, fontWeight: '700' }}>Turma ativa</Text><Text style={{ color: c.muted, fontSize: 12 }}>{active ? 'Aceita eventos e inscrições' : 'Pausada para novas atividades'}</Text></View><View style={{ width: 48, height: 28, borderRadius: 14, padding: 3, backgroundColor: active ? c.primary : c.line, justifyContent: 'center', alignItems: active ? 'flex-end' : 'flex-start' }}><View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' }} /></View></Pressable>
          </> : null}
          <Button title={id ? 'Guardar alterações' : 'Criar turma'} onPress={() => void save()} busy={saving} disabled={Boolean(error && id)} />
        </Card>
      </ScrollView>
    </Page>
  );
}
