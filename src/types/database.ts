// Hand-written types matching supabase/migrations/0001_init.sql.
// Once the Supabase project exists, replace this with generated types:
//   npx supabase gen types typescript --project-id <id> > src/types/database.ts
//
// NOTE: every entity below is declared with `type`, not `interface`. This
// matters — @supabase/postgrest-js checks each table's Row/Insert/Update
// against `Record<string, unknown>` via a conditional (`extends`) type, and
// TypeScript does NOT consider a plain `interface` to satisfy that check
// (only object type aliases / literals do). Using `interface` here silently
// makes every `.from(...).select(...)` call resolve to `never`.

export type UserRole = "supervisor" | "project_manager" | "admin";
export type ProjectStatus = "active" | "archived";
export type DiaryEntryStatus = "draft" | "in_review" | "approved";
export type MediaKind = "photo" | "video" | "document";
export type SafetySeverity = "info" | "minor" | "major" | "incident";

export type Company = {
  id: string;
  name: string;
  created_at: string;
};

export type Profile = {
  id: string;
  company_id: string | null;
  full_name: string | null;
  role: UserRole;
  created_at: string;
};

export type Project = {
  id: string;
  company_id: string;
  name: string;
  site_address: string | null;
  site_lat: number | null;
  site_lng: number | null;
  status: ProjectStatus;
  created_at: string;
};

export type DiaryEntry = {
  id: string;
  project_id: string;
  created_by: string;
  entry_date: string;
  status: DiaryEntryStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
};

export type MediaAsset = {
  id: string;
  diary_entry_id: string;
  kind: MediaKind;
  storage_path: string;
  caption: string | null;
  created_at: string;
};

export type VoiceNote = {
  id: string;
  diary_entry_id: string;
  storage_path: string;
  transcript: string | null;
  created_at: string;
};

export type LaborRecord = {
  id: string;
  diary_entry_id: string;
  trade: string;
  worker_count: number;
  hours: number | null;
  notes: string | null;
};

export type EquipmentRecord = {
  id: string;
  diary_entry_id: string;
  equipment_name: string;
  hours_used: number | null;
  notes: string | null;
};

export type WeatherLog = {
  id: string;
  diary_entry_id: string;
  condition: string | null;
  temp_c: number | null;
  wind_kph: number | null;
  rainfall_mm: number | null;
  source: "auto" | "manual";
};

export type SafetyObservation = {
  id: string;
  diary_entry_id: string;
  severity: SafetySeverity;
  description: string;
  action_taken: string | null;
};

export type ProgressNote = {
  id: string;
  diary_entry_id: string;
  summary: string | null;
  percent_complete: number | null;
};

export type ClientReport = {
  id: string;
  diary_entry_id: string;
  pdf_storage_path: string | null;
  sent_to: string | null;
  sent_at: string | null;
};

export type AuditLog = {
  id: string;
  entity_table: string;
  entity_id: string;
  action: string;
  actor_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

// Minimal Database shape so @supabase/ssr's generics are satisfied.
// Once the Supabase project exists, prefer generating this file with
// `npx supabase gen types typescript` instead of maintaining it by hand.
type TableDef<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      companies: TableDef<Company, { id?: string; name: string; created_at?: string }>;
      profiles: TableDef<
        Profile,
        { id: string; company_id?: string | null; full_name?: string | null; role?: UserRole; created_at?: string }
      >;
      projects: TableDef<
        Project,
        {
          id?: string;
          company_id: string;
          name: string;
          site_address?: string | null;
          site_lat?: number | null;
          site_lng?: number | null;
          status?: ProjectStatus;
          created_at?: string;
        }
      >;
      diary_entries: TableDef<
        DiaryEntry,
        {
          id?: string;
          project_id: string;
          created_by: string;
          entry_date?: string;
          status?: DiaryEntryStatus;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
        }
      >;
      media_assets: TableDef<
        MediaAsset,
        {
          id?: string;
          diary_entry_id: string;
          kind: MediaKind;
          storage_path: string;
          caption?: string | null;
          created_at?: string;
        }
      >;
      voice_notes: TableDef<
        VoiceNote,
        { id?: string; diary_entry_id: string; storage_path: string; transcript?: string | null; created_at?: string }
      >;
      labor_records: TableDef<LaborRecord, Omit<LaborRecord, "id"> & { id?: string }>;
      equipment_records: TableDef<EquipmentRecord, Omit<EquipmentRecord, "id"> & { id?: string }>;
      weather_logs: TableDef<WeatherLog, Omit<WeatherLog, "id"> & { id?: string }>;
      safety_observations: TableDef<SafetyObservation, Omit<SafetyObservation, "id"> & { id?: string }>;
      progress_notes: TableDef<ProgressNote, Omit<ProgressNote, "id"> & { id?: string }>;
      client_reports: TableDef<ClientReport, Omit<ClientReport, "id"> & { id?: string }>;
      audit_log: TableDef<AuditLog, Omit<AuditLog, "id" | "created_at"> & { id?: string; created_at?: string }>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
