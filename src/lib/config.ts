export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://vyyuzvxfstlngqrslakj.supabase.co';
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
export const EDGE_URL = `${SUPABASE_URL}/functions/v1/calendar-api`;
