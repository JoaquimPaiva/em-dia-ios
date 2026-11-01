import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useColors } from '../lib/theme';
import { Button, Card, Field, Heading, Page } from '../components/UI';

type Mode = 'login' | 'signup' | 'recovery';

export default function AuthScreen() {
  const c = useColors();
  const { refreshProfile } = useAuth();
  const { tvToken } = useLocalSearchParams<{ tvToken?: string }>();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const changeMode = (next: Mode) => { setMode(next); setMessage(''); setError(''); };

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return setError('Indique um endereço de email válido.');
    if (mode === 'login' && !password) return setError('Indique a palavra-passe da conta.');
    if (mode === 'signup') {
      const normalizedCode = code.replace(/[\s-]/g, '').toUpperCase();
      if (!name.trim()) return setError('Indique o seu nome.');
      if (!/^[A-F0-9]{12}$/.test(normalizedCode)) return setError('O código da turma deve ter 12 caracteres.');
      if (password.length < 12 || password.length > 128) return setError('A palavra-passe deve ter entre 12 e 128 caracteres.');
    }
    setBusy(true); setMessage(''); setError('');
    try {
      if (mode === 'login') {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (authError) throw authError;
        await refreshProfile();
        if (tvToken) router.replace({ pathname: '/pairing', params: { token: tvToken } });
      } else if (mode === 'signup') {
        const normalizedCode = code.replace(/[\s-]/g, '').toUpperCase();
        const { data, error: authError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { emailRedirectTo: 'emdia://auth-callback', data: { display_name: name.trim(), pending_class_code: normalizedCode } },
        });
        if (authError) throw authError;
        if (data.session) await supabase.auth.signOut();
        setMessage('Conta criada. Confirma o email e depois inicia sessão para concluir a inscrição na turma.');
        setPassword(''); setMode('login');
      } else {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo: 'emdia://reset-password' });
        if (authError) throw authError;
        setMessage('Enviámos uma ligação segura de recuperação para o email da conta.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível continuar. Tente novamente.');
    } finally { setBusy(false); }
  };

  const title = mode === 'login' ? 'Bem-vindo de volta' : mode === 'signup' ? 'Criar conta de aluno' : 'Recuperar acesso';

  return (
    <Page safeAreaEdges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 20 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 10 }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primarySoft }}><Text style={{ color: c.primary, fontSize: 19, fontWeight: '800' }}>ED</Text></View>
            <Text style={{ color: c.primary, fontWeight: '800', letterSpacing: 1.8, fontSize: 12 }}>EM DIA · AGENDA ESCOLAR</Text>
            <Heading>{title}</Heading>
            <Text style={{ color: c.muted, fontSize: 15, lineHeight: 22 }}>{mode === 'signup' ? 'Entra na comunidade escolar com o código de inscrição da tua turma.' : mode === 'recovery' ? 'Vamos enviar uma ligação segura para recuperares o acesso.' : 'Consulta os teus eventos e mantém tudo no mesmo lugar.'}</Text>
          </View>
          <Card>
            {mode === 'signup' ? <Field label="Nome completo" value={name} onChangeText={setName} placeholder="O teu nome" autoCapitalize="words" autoComplete="name" returnKeyType="next" /> : null}
            <Field label="Email" value={email} onChangeText={setEmail} placeholder="nome@escola.pt" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" returnKeyType={mode === 'recovery' ? 'send' : 'next'} />
            {mode === 'signup' ? <Field label="Código da turma" value={code} onChangeText={(value) => setCode(value.toUpperCase())} placeholder="12 caracteres" autoCapitalize="characters" autoCorrect={false} maxLength={14} returnKeyType="next" /> : null}
            {mode !== 'recovery' ? <Field label="Palavra-passe" value={password} onChangeText={setPassword} placeholder={mode === 'signup' ? 'Pelo menos 12 caracteres' : 'A tua palavra-passe'} secureTextEntry autoComplete={mode === 'login' ? 'current-password' : 'new-password'} maxLength={128} onSubmitEditing={() => void submit()} returnKeyType="go" /> : null}
            {message ? <View style={{ padding: 12, borderRadius: 13, backgroundColor: c.primarySoft }}><Text accessibilityRole="alert" style={{ color: c.primary, lineHeight: 20 }}>{message}</Text></View> : null}
            {error ? <View style={{ padding: 12, borderRadius: 13, backgroundColor: c.surfaceAlt }}><Text accessibilityRole="alert" style={{ color: c.red, lineHeight: 20 }}>{error}</Text></View> : null}
            <Button title={mode === 'login' ? 'Entrar na agenda' : mode === 'signup' ? 'Criar conta' : 'Enviar ligação'} onPress={() => void submit()} busy={busy} />
            <View style={{ alignItems: 'center', gap: 13, paddingTop: 3 }}>
              {mode === 'login' ? <Pressable accessibilityRole="button" onPress={() => changeMode('recovery')}><Text style={{ color: c.primary, fontWeight: '700', padding: 4 }}>Esqueci-me da palavra-passe</Text></Pressable> : null}
              {mode === 'login' ? <Pressable accessibilityRole="button" onPress={() => changeMode('signup')}><Text style={{ color: c.muted }}>Ainda não tens conta? <Text style={{ color: c.primary, fontWeight: '700' }}>Criar conta</Text></Text></Pressable> : null}
              {mode !== 'login' ? <Pressable accessibilityRole="button" onPress={() => changeMode('login')}><Text style={{ color: c.primary, fontWeight: '700', padding: 4 }}>Voltar a iniciar sessão</Text></Pressable> : null}
            </View>
          </Card>
          <Text style={{ color: c.muted, fontSize: 12, textAlign: 'center' }}>A tua conta só mostra eventos a que tens acesso.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Page>
  );
}
