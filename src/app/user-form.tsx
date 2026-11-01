import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api, json } from '../lib/api';
import { useColors } from '../lib/theme';
import type { Role, UserRecord } from '../lib/types';
import { Button, Card, Chip, Field, Heading, Page } from '../components/UI';

const roles: { id: Role; title: string; detail: string }[] = [
  { id: 'viewer', title: 'Aluno', detail: 'Acompanha eventos e cria eventos pessoais.' },
  { id: 'editor', title: 'Professor', detail: 'Publica e gere eventos das suas turmas.' },
  { id: 'admin', title: 'Administrador', detail: 'Gere utilizadores, turmas e agenda escolar.' },
];

export default function UserForm() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('viewer');
  const [loading, setLoading] = useState(Boolean(id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let active = true;
    api<UserRecord[]>('/api/users').then((rows) => {
      if (!active) return;
      const account = rows.find((item) => item.id === id);
      if (!account) throw new Error('Este utilizador não está disponível.');
      setName(account.display_name); setEmail(account.email); setRole(account.role);
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o utilizador.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const save = async () => {
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (!trimmedName || trimmedName.length > 100) return setError('Indique um nome válido, até 100 caracteres.');
    if (!id && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return setError('Indique um endereço de email válido.');
    if ((!id || password) && (password.length < 12 || password.length > 128)) return setError('A palavra-passe deve ter entre 12 e 128 caracteres.');
    setBusy(true); setError('');
    try {
      if (id) {
        await api(`/api/users/${id}`, json('PATCH', { display_name: trimmedName, role }));
        if (password) await api(`/api/users/${id}/password`, json('POST', { password }));
      } else await api('/api/users', json('POST', { display_name: trimmedName, email: normalizedEmail, password, role }));
      router.back();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível guardar o utilizador.'); }
    finally { setBusy(false); }
  };

  if (loading) return <Page safeAreaEdges={['top', 'bottom', 'left', 'right']}><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}><ActivityIndicator color={c.primary} size="large" /><Text style={{ color: c.muted }}>A carregar utilizador…</Text></View></Page>;

  return (
    <Page safeAreaEdges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 12, paddingBottom: 34, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 5 }}><Text style={{ color: c.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }}>ADMINISTRAÇÃO</Text><Heading>{id ? 'Editar utilizador' : 'Novo utilizador'}</Heading><Text style={{ color: c.muted }}>Define a identidade e o nível de acesso da conta.</Text></View>
        {error ? <Card style={{ borderColor: c.red, backgroundColor: c.surfaceAlt }}><Text style={{ color: c.red, fontWeight: '700' }}>Verifica os dados</Text><Text style={{ color: c.muted, lineHeight: 20 }}>{error}</Text></Card> : null}
        <Card>
          <Field label="Nome completo *" value={name} onChangeText={setName} placeholder="Nome do utilizador" autoCapitalize="words" maxLength={100} />
          {!id ? <Field label="Email *" value={email} onChangeText={setEmail} placeholder="nome@escola.pt" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" /> : <View style={{ gap: 4 }}><Text style={{ color: c.muted, fontSize: 13, fontWeight: '600' }}>Email</Text><Text style={{ color: c.text, fontSize: 15 }}>{email}</Text><Text style={{ color: c.muted, fontSize: 12 }}>O email da conta não pode ser alterado aqui.</Text></View>}
          <Field label={id ? 'Nova palavra-passe · opcional' : 'Palavra-passe inicial · mínimo 12 caracteres'} value={password} onChangeText={setPassword} placeholder={id ? 'Deixa em branco para manter' : '12 caracteres ou mais'} secureTextEntry autoComplete={id ? 'new-password' : 'new-password'} maxLength={128} />
          <View style={{ gap: 10 }}><Text style={{ color: c.text, fontSize: 17, fontWeight: '700' }}>Permissões</Text>{roles.map((item) => <View key={item.id} style={{ gap: 5 }}><Chip label={item.title} selected={role === item.id} onPress={() => setRole(item.id)} /><Text style={{ color: c.muted, fontSize: 12, lineHeight: 17, paddingHorizontal: 4 }}>{item.detail}</Text></View>)}</View>
          <Button title={id ? 'Guardar utilizador' : 'Criar utilizador'} onPress={() => void save()} busy={busy} />
        </Card>
      </ScrollView>
    </Page>
  );
}
