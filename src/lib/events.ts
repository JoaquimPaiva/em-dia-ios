import { api } from './api';
import { supabase } from './supabase';
import type { EventItem } from './types';

function unwrapEvents(payload: unknown): EventItem[] {
  if (Array.isArray(payload)) return payload as EventItem[];
  if (payload && typeof payload === 'object') {
    const value = payload as Record<string, unknown>;
    for (const key of ['events', 'eventos', 'items', 'data']) {
      if (Array.isArray(value[key])) return value[key] as EventItem[];
    }
  }
  throw new Error('O serviço devolveu a agenda num formato inesperado.');
}

function mapDatabaseEvent(row: any, className?: string): EventItem {
  const time = String(row.event_time || '').slice(0, 5);
  return {
    id: Number(row.id), titulo: String(row.title || ''), data: String(row.event_date || ''), hora: time,
    tipo: String(row.event_type || 'outro'), descricao: String(row.description || ''),
    nivel_educacional: String(row.education_level || ''), scope: String(row.scope || ''),
    owner_id: row.owner_id || undefined, class_id: row.class_id == null ? null : Number(row.class_id),
    class_name: className || null,
  };
}

async function readWithRowLevelSecurity(): Promise<EventItem[]> {
  const { data, error } = await supabase.from('events')
    .select('id,title,event_date,event_time,event_type,description,education_level,scope,owner_id,class_id')
    .order('event_date', { ascending: true }).order('event_time', { ascending: true });
  if (error) throw error;
  const rows = data || [];
  const classIds = [...new Set(rows.map((row: any) => row.class_id).filter((id: unknown): id is number => typeof id === 'number'))];
  let classNames = new Map<number, string>();
  if (classIds.length) {
    const { data: classes } = await supabase.from('classes').select('id,name').in('id', classIds);
    classNames = new Map((classes || []).map((item: any) => [Number(item.id), String(item.name)]));
  }
  return rows.map((row: any) => mapDatabaseEvent(row, row.class_id ? classNames.get(Number(row.class_id)) : undefined));
}

/** Prefer the same permission-filtered API as the web app; use direct RLS as a resilient fallback. */
export async function fetchVisibleEvents(): Promise<EventItem[]> {
  let edgeResult: EventItem[] | null = null;
  let edgeFailure: unknown;
  try {
    edgeResult = unwrapEvents(await api<unknown>('/api/eventos'));
    if (edgeResult.length) return edgeResult;
  } catch (error) { edgeFailure = error; }

  try {
    const rows = await readWithRowLevelSecurity();
    if (rows.length || edgeResult !== null) return rows;
  } catch (databaseError) {
    if (edgeFailure) throw new Error(`Não foi possível carregar eventos. API: ${edgeFailure instanceof Error ? edgeFailure.message : 'indisponível'} · Supabase: ${databaseError instanceof Error ? databaseError.message : 'indisponível'}`);
    throw databaseError;
  }
  return edgeResult || [];
}
