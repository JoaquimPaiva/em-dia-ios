export type Role = 'admin' | 'editor' | 'viewer';
export type Profile = { id: string; email: string; display_name: string; role: Role; active: boolean; theme?: 'light' | 'dark'; password_reset_required?: boolean };
export type EventItem = { id: number; titulo: string; data: string; hora?: string; tipo?: string; descricao?: string; nivel_educacional?: string; scope?: string; owner_id?: string; class_id?: number | null; class_name?: string | null };
export type Classroom = { id: number; name: string; school_year?: string; active: boolean; join_code?: string; teachers?: any[]; students?: any[] };
export type UserRecord = Profile & { created_at?: string };
