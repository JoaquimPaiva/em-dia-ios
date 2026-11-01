import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from './supabase';
import type { Profile } from './types';

type AuthValue = { user: Profile | null; loading: boolean; refreshProfile: () => Promise<void>; signOut: () => Promise<void> };
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshProfile = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { setUser(null); return; }
    const pendingCode = String(authUser.user_metadata?.pending_class_code || '');
    if (pendingCode) {
      const { error } = await supabase.rpc('join_class_by_code', { input_code: pendingCode });
      if (error) throw new Error(error.message || 'Não foi possível concluir a inscrição na turma.');
      await supabase.auth.updateUser({ data: { pending_class_code: null } });
    }
    const { data, error } = await supabase.from('profiles').select('id,email,display_name,role,active,theme,password_reset_required').eq('id', authUser.id).maybeSingle();
    if (error || !data || !data.active) throw new Error('A conta está inativa ou ainda não foi preparada no Supabase.');
    setUser(data as Profile);
  }, []);
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      queueMicrotask(() => refreshProfile().catch(() => setUser(null)).finally(() => setLoading(false)));
    });
    queueMicrotask(() => refreshProfile().catch(() => setUser(null)).finally(() => setLoading(false)));
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh(); else supabase.auth.stopAutoRefresh();
    });
    return () => { subscription.unsubscribe(); appState.remove(); };
  }, [refreshProfile]);
  const value = useMemo(() => ({ user, loading, refreshProfile, signOut: async () => { await supabase.auth.signOut(); setUser(null); } }), [user, loading, refreshProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('AuthProvider em falta'); return value; }
