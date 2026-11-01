import { EDGE_URL, SUPABASE_KEY } from './config';
import { supabase } from './supabase';

export async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  if (!SUPABASE_KEY) throw new Error('Configura EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY para ligar à agenda.');
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  headers.set('apikey', SUPABASE_KEY);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
  let response: Response;
  try {
    response = await fetch(`${EDGE_URL}${path}`, { ...init, headers });
  } catch (cause) {
    throw new Error(cause instanceof Error && cause.message.toLowerCase().includes('network')
      ? 'Sem ligação ao serviço. Verifique a internet e tente novamente.'
      : 'Não foi possível contactar o serviço. Verifique a ligação à internet e tente novamente.');
  }
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : { error: `O serviço respondeu com um formato inesperado (HTTP ${response.status}).` };
  if (!response.ok) throw new Error(body?.error || body?.message || `Erro ${response.status} ao comunicar com o serviço.`);
  return body as T;
}

export const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });
