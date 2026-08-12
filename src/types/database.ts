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

export type UserRole = "supervisor" | "project_manager" | "admin" | "field_worker";
export type ProjectStatus = "active" | "archived";
export type DiaryEntryStatus = "draft" | "in_review" | "approved";
export type MediaKind = "photo" | "video" | "document";
export type SafetySeverity = "info" | "minor" | "major" | "incident";

export type MfrCategory = "SC1" | "SC2" | "CAT1" | "CAT2" | "CAT3" | "CAT4" | "CAT5" | "CAT6" | "CAT7";
export type CompanyType = "residential_builder" | "commercial_contractor";

export type Company = {
  id: string;
  name: string;
  qbcc_licence_number: string | null;
  qbcc_licence_class: string | null;
  qbcc_licence_expiry: string | null;
  mfr_category: MfrCategory | null;
  mfr_report_due_date: string | null;
  company_type: CompanyType;
  logo_storage_path: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  company_id: string | null;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  qbcc_licence_number: string | null;
  qbcc_licence_class: string | null;
  qbcc_licence_expiry: string | null;
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
  practical_completion_date: string | null;
  defects_liability_end_date: string | null;
  contract_value: number | null;
  deposit_amount: number | null;
  home_warranty_premium_paid: boolean;
  home_warranty_premium_paid_date: string | null;
  start_date: string | null;
  contracted_completion_date: string | null;
  client_portal_token: string;
  client_name: string | null;
  client_email: string | null;
  xero_contact_id: string | null;
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
  notifiable: boolean;
  reported_at: string | null;
  report_reference: string | null;
  workcover_notified_at: string | null;
  workcover_reference: string | null;
};

export type ProgressNote = {
  id: string;
  diary_entry_id: string;
  summary: string | null;
  percent_complete: number | null;
  delays: string[] | null;
  missing_information: string[] | null;
  outstanding_actions: string[] | null;
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

export type Invite = {
  id: string;
  company_id: string;
  token: string;
  role: UserRole;
  project_id: string | null;
  created_by: string | null;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  created_at: string;
};

export type RfiStatus = "open" | "answered" | "closed";

export type Rfi = {
  id: string;
  project_id: string;
  subject: string;
  question: string;
  status: RfiStatus;
  raised_by: string | null;
  assigned_to: string | null;
  due_date: string | null;
  answer: string | null;
  answered_by: string | null;
  answered_at: string | null;
  created_at: string;
};

export type VariationStatus = "draft" | "submitted" | "approved" | "rejected";
export type VariationRequestedByType = "client" | "builder";

export type Variation = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  cost_impact: number | null;
  time_impact_days: number | null;
  status: VariationStatus;
  raised_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  requested_by_type: VariationRequestedByType | null;
  reason: string | null;
  client_name: string | null;
  client_approval_token: string;
  client_approved_at: string | null;
  client_approved_name: string | null;
  work_started: boolean;
  work_started_date: string | null;
  created_at: string;
};

export type SelectionStatus = "draft" | "awaiting_choice" | "chosen";

export type Selection = {
  id: string;
  project_id: string;
  category: string;
  description: string | null;
  allowance_amount: number | null;
  due_date: string | null;
  status: SelectionStatus;
  client_approval_token: string;
  chosen_option_id: string | null;
  client_chosen_at: string | null;
  client_chosen_name: string | null;
  created_by: string | null;
  created_at: string;
};

export type SelectionOption = {
  id: string;
  selection_id: string;
  name: string;
  description: string | null;
  cost: number | null;
  supplier: string | null;
  sort_order: number;
  created_at: string;
};

export type EotCause = "weather" | "latent_conditions" | "client_variation" | "subcontractor_delay" | "authority_delay" | "other";
export type EotClaimStatus = "open" | "notice_sent" | "granted" | "rejected";

export type EotClaim = {
  id: string;
  project_id: string;
  milestone_id: string | null;
  title: string;
  cause: EotCause;
  description: string | null;
  date_became_aware: string;
  days_claimed: number | null;
  notice_due_date: string;
  notice_sent_at: string | null;
  notice_sent_note: string | null;
  status: EotClaimStatus;
  client_response_note: string | null;
  created_by: string | null;
  created_at: string;
};

export type MilestoneStatus = "pending" | "on_track" | "at_risk" | "delayed" | "complete";

export type Milestone = {
  id: string;
  project_id: string;
  name: string;
  target_date: string | null;
  status: MilestoneStatus;
  notes: string | null;
  actual_date: string | null;
  delay_reason: string | null;
  duration_days: number;
  created_at: string;
};

export type MilestoneDependency = {
  id: string;
  predecessor_id: string;
  successor_id: string;
  created_at: string;
};

export type AiInvocation = {
  id: string;
  user_id: string;
  route: string;
  created_at: string;
};

export type DtrStatus = "open" | "rectified" | "disputed" | "overdue";

export type DirectionToRectify = {
  id: string;
  project_id: string;
  description: string;
  issued_date: string;
  due_date: string;
  status: DtrStatus;
  notes: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
};

export type PaymentClaimStatus = "submitted" | "schedule_received" | "paid" | "disputed";

export type PaymentClaim = {
  id: string;
  project_id: string;
  claim_number: string | null;
  claim_date: string;
  amount_claimed: number;
  due_date: string;
  schedule_due_date: string | null;
  status: PaymentClaimStatus;
  scheduled_amount: number | null;
  scheduled_date: string | null;
  paid_amount: number | null;
  paid_date: string | null;
  notes: string | null;
  supporting_statement_provided: boolean;
  xero_invoice_id: string | null;
  xero_invoice_status: string | null;
  xero_synced_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type SubcontractorStatus = "quoting" | "awarded" | "active" | "complete" | "terminated";

export type Subcontractor = {
  id: string;
  project_id: string;
  company_name: string;
  trade: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  qbcc_licence_number: string | null;
  licence_expiry: string | null;
  insurance_expiry: string | null;
  notes: string | null;
  status: SubcontractorStatus;
  scope_of_works: string | null;
  contract_value: number | null;
  retention_percentage: number | null;
  start_date: string | null;
  completion_date: string | null;
  retention_released_amount: number | null;
  retention_released_date: string | null;
  portal_token: string;
  created_at: string;
};

export type QuoteStatus = "requested" | "received" | "accepted" | "declined";

export type SubcontractorQuote = {
  id: string;
  subcontractor_id: string;
  project_id: string;
  description: string;
  amount: number | null;
  status: QuoteStatus;
  requested_date: string;
  received_date: string | null;
  notes: string | null;
  storage_path: string | null;
  submitted_via_portal: boolean;
  created_by: string | null;
  created_at: string;
};

export type SubcontractorQuoteItem = {
  id: string;
  subcontractor_quote_id: string;
  description: string;
  amount: number | null;
  item_date: string | null;
  sort_order: number;
  created_at: string;
};

export type SubcontractorUpdateType = "general" | "delay_or_issue" | "stage_complete";

export type SubcontractorUpdate = {
  id: string;
  subcontractor_id: string;
  project_id: string;
  message: string;
  update_type: SubcontractorUpdateType;
  photo_storage_path: string | null;
  created_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
};

export type SubcontractorPaymentStatus = "submitted" | "approved" | "paid" | "disputed";

export type SubcontractorPayment = {
  id: string;
  subcontractor_id: string;
  project_id: string;
  claim_number: string | null;
  claim_date: string;
  amount_claimed: number;
  retention_held: number;
  amount_paid: number | null;
  due_date: string | null;
  status: SubcontractorPaymentStatus;
  paid_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type SwmsStatus = "current" | "review_due" | "expired" | "superseded";

export type Swms = {
  id: string;
  project_id: string;
  subcontractor_id: string | null;
  title: string;
  received_date: string | null;
  review_due_date: string | null;
  status: SwmsStatus;
  document_reference: string | null;
  notes: string | null;
  acknowledged_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type InspectionType = "hold_point" | "witness_point" | "final";
export type InspectionStatus = "pending" | "passed" | "passed_with_notes" | "failed";

export type Inspection = {
  id: string;
  project_id: string;
  work_area: string;
  inspection_type: InspectionType;
  status: InspectionStatus;
  scheduled_date: string | null;
  inspected_date: string | null;
  inspector_name: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type NcrStatus = "open" | "closed" | "disputed";

export type NonConformanceReport = {
  id: string;
  project_id: string;
  inspection_id: string | null;
  description: string;
  trade: string | null;
  raised_date: string;
  status: NcrStatus;
  corrective_action: string | null;
  closed_date: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
};

export type DefectStatus = "open" | "rectified";
export type DefectType = "structural" | "non_structural";

export type Defect = {
  id: string;
  project_id: string;
  description: string;
  location: string | null;
  status: DefectStatus;
  defect_type: DefectType;
  noted_date: string;
  due_date: string | null;
  rectified_date: string | null;
  notes: string | null;
  subcontractor_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type HandoverItem = {
  id: string;
  project_id: string;
  label: string;
  category: string;
  completed: boolean;
  completed_date: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
};

export type Reminder = {
  id: string;
  company_id: string;
  project_id: string | null;
  title: string;
  due_date: string;
  notes: string | null;
  completed: boolean;
  created_by: string | null;
  created_at: string;
};

export type MaterialStatus = "ordered" | "delivered" | "short" | "damaged" | "cancelled";

export type Material = {
  id: string;
  project_id: string;
  description: string;
  supplier: string | null;
  quantity_ordered: number | null;
  unit: string | null;
  cost: number | null;
  ordered_date: string | null;
  expected_date: string | null;
  received_date: string | null;
  quantity_received: number | null;
  status: MaterialStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type AssetOwnership = "owned" | "hired";
export type AssetStatus = "available" | "checked_out" | "in_repair" | "retired";

export type Asset = {
  id: string;
  company_id: string;
  name: string;
  category: string | null;
  ownership: AssetOwnership;
  hire_company: string | null;
  hire_cost_per_day: number | null;
  serial_number: string | null;
  status: AssetStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type AssetCheckout = {
  id: string;
  asset_id: string;
  project_id: string | null;
  checked_out_to: string;
  checked_out_date: string;
  due_back_date: string | null;
  returned_date: string | null;
  notes: string | null;
  total_cost: number | null;
  created_by: string | null;
  created_at: string;
};

export type Worker = {
  id: string;
  company_id: string;
  name: string;
  trade: string | null;
  hourly_rate: number | null;
  active: boolean;
  notes: string | null;
  linked_profile_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type ProjectWorker = {
  id: string;
  project_id: string;
  profile_id: string;
  added_at: string;
};

export type WorkerPhoto = {
  id: string;
  project_id: string;
  uploaded_by: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
};

export type WorkerQuestion = {
  id: string;
  project_id: string;
  asked_by: string;
  question: string;
  answer: string | null;
  answered_by: string | null;
  answered_at: string | null;
  created_at: string;
};

export type WorkerTimeEntry = {
  id: string;
  worker_id: string;
  project_id: string;
  work_date: string;
  hours: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type DocumentCategory = "contract" | "insurance" | "plans" | "permit" | "other";

export type ProjectDocument = {
  id: string;
  project_id: string;
  category: DocumentCategory;
  title: string;
  storage_path: string;
  file_name: string | null;
  uploaded_by: string | null;
  client_visible: boolean;
  created_at: string;
};

export type LeadStatus = "enquiry" | "quoting" | "quote_sent" | "won" | "lost";

export type Lead = {
  id: string;
  company_id: string;
  client_name: string;
  site_address: string | null;
  description: string | null;
  estimated_value: number | null;
  quote_amount: number | null;
  quote_sent_date: string | null;
  follow_up_date: string | null;
  status: LeadStatus;
  lost_reason: string | null;
  converted_project_id: string | null;
  notes: string | null;
  client_approval_token: string;
  quote_accepted_at: string | null;
  quote_accepted_name: string | null;
  created_by: string | null;
  created_at: string;
};

export type LeadNote = {
  id: string;
  lead_id: string;
  body: string;
  created_by: string | null;
  created_at: string;
};

export type LeadFollowUp = {
  id: string;
  lead_id: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

export type NotificationLog = {
  id: string;
  company_id: string;
  kind: string;
  sent_date: string;
  created_at: string;
};

export type ChatRoomKind = "team" | "project" | "group";

export type ChatRoom = {
  id: string;
  company_id: string;
  project_id: string | null;
  kind: ChatRoomKind;
  name: string | null;
  created_by: string | null;
  created_at: string;
};

export type ChatParticipant = {
  id: string;
  chat_room_id: string;
  profile_id: string | null;
  subcontractor_id: string | null;
  added_at: string;
};

export type ChatMessage = {
  id: string;
  chat_room_id: string;
  sender_profile_id: string | null;
  sender_subcontractor_id: string | null;
  body: string;
  created_at: string;
};

// Bearer credentials for a company's Xero organisation. No RLS policy
// grants this to `authenticated` at all — only reachable via the
// service-role admin client from a server route that has already checked
// the caller is a company admin. Never select this table with the normal
// request-scoped client.
export type XeroConnection = {
  id: string;
  company_id: string;
  tenant_id: string;
  tenant_name: string | null;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  connected_by: string | null;
  created_at: string;
  updated_at: string;
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
      companies: TableDef<
        Company,
        {
          id?: string;
          name: string;
          qbcc_licence_number?: string | null;
          qbcc_licence_class?: string | null;
          qbcc_licence_expiry?: string | null;
          mfr_category?: MfrCategory | null;
          mfr_report_due_date?: string | null;
          company_type?: CompanyType;
          logo_storage_path?: string | null;
          created_at?: string;
        }
      >;
      profiles: TableDef<
        Profile,
        {
          id: string;
          company_id?: string | null;
          full_name?: string | null;
          email?: string | null;
          role?: UserRole;
          qbcc_licence_number?: string | null;
          qbcc_licence_class?: string | null;
          qbcc_licence_expiry?: string | null;
          created_at?: string;
        }
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
          practical_completion_date?: string | null;
          defects_liability_end_date?: string | null;
          contract_value?: number | null;
          deposit_amount?: number | null;
          home_warranty_premium_paid?: boolean;
          home_warranty_premium_paid_date?: string | null;
          start_date?: string | null;
          contracted_completion_date?: string | null;
          client_portal_token?: string;
          client_name?: string | null;
          client_email?: string | null;
          xero_contact_id?: string | null;
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
      safety_observations: TableDef<
        SafetyObservation,
        Omit<
          SafetyObservation,
          "id" | "notifiable" | "reported_at" | "report_reference" | "workcover_notified_at" | "workcover_reference"
        > & {
          id?: string;
          notifiable?: boolean;
          reported_at?: string | null;
          report_reference?: string | null;
          workcover_notified_at?: string | null;
          workcover_reference?: string | null;
        }
      >;
      progress_notes: TableDef<
        ProgressNote,
        Omit<ProgressNote, "id" | "delays" | "missing_information" | "outstanding_actions"> & {
          id?: string;
          delays?: string[] | null;
          missing_information?: string[] | null;
          outstanding_actions?: string[] | null;
        }
      >;
      client_reports: TableDef<ClientReport, Omit<ClientReport, "id"> & { id?: string }>;
      audit_log: TableDef<AuditLog, Omit<AuditLog, "id" | "created_at"> & { id?: string; created_at?: string }>;
      invites: TableDef<
        Invite,
        {
          id?: string;
          company_id: string;
          token?: string;
          role?: UserRole;
          project_id?: string | null;
          created_by?: string | null;
          expires_at?: string;
          used_at?: string | null;
          used_by?: string | null;
          created_at?: string;
        }
      >;
      rfis: TableDef<
        Rfi,
        {
          id?: string;
          project_id: string;
          subject: string;
          question: string;
          status?: RfiStatus;
          raised_by?: string | null;
          assigned_to?: string | null;
          due_date?: string | null;
          answer?: string | null;
          answered_by?: string | null;
          answered_at?: string | null;
          created_at?: string;
        }
      >;
      variations: TableDef<
        Variation,
        {
          id?: string;
          project_id: string;
          title: string;
          description?: string | null;
          cost_impact?: number | null;
          time_impact_days?: number | null;
          status?: VariationStatus;
          raised_by?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          requested_by_type?: VariationRequestedByType | null;
          reason?: string | null;
          client_name?: string | null;
          client_approval_token?: string;
          client_approved_at?: string | null;
          client_approved_name?: string | null;
          work_started?: boolean;
          work_started_date?: string | null;
          created_at?: string;
        }
      >;
      milestones: TableDef<
        Milestone,
        {
          id?: string;
          project_id: string;
          name: string;
          target_date?: string | null;
          status?: MilestoneStatus;
          notes?: string | null;
          actual_date?: string | null;
          delay_reason?: string | null;
          duration_days?: number;
          created_at?: string;
        }
      >;
      milestone_dependencies: TableDef<
        MilestoneDependency,
        {
          id?: string;
          predecessor_id: string;
          successor_id: string;
          created_at?: string;
        }
      >;
      selections: TableDef<
        Selection,
        {
          id?: string;
          project_id: string;
          category: string;
          description?: string | null;
          allowance_amount?: number | null;
          due_date?: string | null;
          status?: SelectionStatus;
          client_approval_token?: string;
          chosen_option_id?: string | null;
          client_chosen_at?: string | null;
          client_chosen_name?: string | null;
          created_by?: string | null;
          created_at?: string;
        }
      >;
      eot_claims: TableDef<
        EotClaim,
        {
          id?: string;
          project_id: string;
          milestone_id?: string | null;
          title: string;
          cause: EotCause;
          description?: string | null;
          date_became_aware?: string;
          days_claimed?: number | null;
          notice_due_date: string;
          notice_sent_at?: string | null;
          notice_sent_note?: string | null;
          status?: EotClaimStatus;
          client_response_note?: string | null;
          created_by?: string | null;
          created_at?: string;
        }
      >;
      selection_options: TableDef<
        SelectionOption,
        {
          id?: string;
          selection_id: string;
          name: string;
          description?: string | null;
          cost?: number | null;
          supplier?: string | null;
          sort_order?: number;
          created_at?: string;
        }
      >;
      ai_invocations: TableDef<AiInvocation, Omit<AiInvocation, "id" | "created_at"> & { id?: string; created_at?: string }>;
      directions_to_rectify: TableDef<
        DirectionToRectify,
        {
          id?: string;
          project_id: string;
          description: string;
          issued_date?: string;
          due_date: string;
          status?: DtrStatus;
          notes?: string | null;
          assigned_to?: string | null;
          created_by?: string | null;
          created_at?: string;
        }
      >;
      payment_claims: TableDef<
        PaymentClaim,
        {
          id?: string;
          project_id: string;
          claim_number?: string | null;
          claim_date?: string;
          amount_claimed: number;
          due_date: string;
          schedule_due_date?: string | null;
          status?: PaymentClaimStatus;
          scheduled_amount?: number | null;
          scheduled_date?: string | null;
          paid_amount?: number | null;
          paid_date?: string | null;
          notes?: string | null;
          supporting_statement_provided?: boolean;
          xero_invoice_id?: string | null;
          xero_invoice_status?: string | null;
          xero_synced_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        }
      >;
      subcontractors: TableDef<
        Subcontractor,
        {
          id?: string;
          project_id: string;
          company_name: string;
          trade?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          qbcc_licence_number?: string | null;
          licence_expiry?: string | null;
          insurance_expiry?: string | null;
          notes?: string | null;
          status?: SubcontractorStatus;
          scope_of_works?: string | null;
          contract_value?: number | null;
          retention_percentage?: number | null;
          start_date?: string | null;
          completion_date?: string | null;
          retention_released_amount?: number | null;
          retention_released_date?: string | null;
          portal_token?: string;
          created_at?: string;
        }
      >;
      subcontractor_quotes: TableDef<
        SubcontractorQuote,
        {
          id?: string;
          subcontractor_id: string;
          project_id: string;
          description: string;
          amount?: number | null;
          status?: QuoteStatus;
          requested_date?: string;
          received_date?: string | null;
          notes?: string | null;
          storage_path?: string | null;
          submitted_via_portal?: boolean;
          created_by?: string | null;
          created_at?: string;
        }
      >;
      subcontractor_quote_items: TableDef<
        SubcontractorQuoteItem,
        {
          id?: string;
          subcontractor_quote_id: string;
          description: string;
          amount?: number | null;
          item_date?: string | null;
          sort_order?: number;
          created_at?: string;
        }
      >;
      subcontractor_updates: TableDef<
        SubcontractorUpdate,
        {
          id?: string;
          subcontractor_id: string;
          project_id: string;
          message: string;
          update_type?: SubcontractorUpdateType;
          photo_storage_path?: string | null;
          created_at?: string;
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
        }
      >;
      subcontractor_payments: TableDef<
        SubcontractorPayment,
        {
          id?: string;
          subcontractor_id: string;
          project_id: string;
          claim_number?: string | null;
          claim_date?: string;
          amount_claimed: number;
          retention_held?: number;
          amount_paid?: number | null;
          due_date?: string | null;
          status?: SubcontractorPaymentStatus;
          paid_date?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        }
      >;
      swms: TableDef<
        Swms,
        {
          id?: string;
          project_id: string;
          subcontractor_id?: string | null;
          title: string;
          received_date?: string | null;
          review_due_date?: string | null;
          status?: SwmsStatus;
          document_reference?: string | null;
          notes?: string | null;
          acknowledged_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        }
      >;
      inspections: TableDef<
        Inspection,
        {
          id?: string;
          project_id: string;
          work_area: string;
          inspection_type?: InspectionType;
          status?: InspectionStatus;
          scheduled_date?: string | null;
          inspected_date?: string | null;
          inspector_name?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        }
      >;
      non_conformance_reports: TableDef<
        NonConformanceReport,
        {
          id?: string;
          project_id: string;
          inspection_id?: string | null;
          description: string;
          trade?: string | null;
          raised_date?: string;
          status?: NcrStatus;
          corrective_action?: string | null;
          closed_date?: string | null;
          assigned_to?: string | null;
          created_by?: string | null;
          created_at?: string;
        }
      >;
      defects: TableDef<
        Defect,
        {
          id?: string;
          project_id: string;
          description: string;
          location?: string | null;
          status?: DefectStatus;
          defect_type?: DefectType;
          noted_date?: string;
          due_date?: string | null;
          rectified_date?: string | null;
          notes?: string | null;
          subcontractor_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        }
      >;
      handover_items: TableDef<
        HandoverItem,
        {
          id?: string;
          project_id: string;
          label: string;
          category?: string;
          completed?: boolean;
          completed_date?: string | null;
          notes?: string | null;
          sort_order?: number;
          created_at?: string;
        }
      >;
      reminders: TableDef<
        Reminder,
        {
          id?: string;
          company_id: string;
          project_id?: string | null;
          title: string;
          due_date: string;
          notes?: string | null;
          completed?: boolean;
          created_by?: string | null;
          created_at?: string;
        }
      >;
      materials: TableDef<
        Material,
        {
          id?: string;
          project_id: string;
          description: string;
          supplier?: string | null;
          quantity_ordered?: number | null;
          unit?: string | null;
          cost?: number | null;
          ordered_date?: string | null;
          expected_date?: string | null;
          received_date?: string | null;
          quantity_received?: number | null;
          status?: MaterialStatus;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        }
      >;
      assets: TableDef<
        Asset,
        {
          id?: string;
          company_id: string;
          name: string;
          category?: string | null;
          ownership?: AssetOwnership;
          hire_company?: string | null;
          hire_cost_per_day?: number | null;
          serial_number?: string | null;
          status?: AssetStatus;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        }
      >;
      asset_checkouts: TableDef<
        AssetCheckout,
        {
          id?: string;
          asset_id: string;
          project_id?: string | null;
          checked_out_to: string;
          checked_out_date?: string;
          due_back_date?: string | null;
          returned_date?: string | null;
          notes?: string | null;
          total_cost?: number | null;
          created_by?: string | null;
          created_at?: string;
        }
      >;
      workers: TableDef<
        Worker,
        {
          id?: string;
          company_id: string;
          name: string;
          trade?: string | null;
          hourly_rate?: number | null;
          active?: boolean;
          notes?: string | null;
          linked_profile_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        }
      >;
      project_workers: TableDef<
        ProjectWorker,
        {
          id?: string;
          project_id: string;
          profile_id: string;
          added_at?: string;
        }
      >;
      worker_photos: TableDef<
        WorkerPhoto,
        {
          id?: string;
          project_id: string;
          uploaded_by: string;
          storage_path: string;
          caption?: string | null;
          created_at?: string;
        }
      >;
      worker_questions: TableDef<
        WorkerQuestion,
        {
          id?: string;
          project_id: string;
          asked_by: string;
          question: string;
          answer?: string | null;
          answered_by?: string | null;
          answered_at?: string | null;
          created_at?: string;
        }
      >;
      worker_time_entries: TableDef<
        WorkerTimeEntry,
        {
          id?: string;
          worker_id: string;
          project_id: string;
          work_date?: string;
          hours: number;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        }
      >;
      documents: TableDef<
        ProjectDocument,
        {
          id?: string;
          project_id: string;
          category?: DocumentCategory;
          title: string;
          storage_path: string;
          file_name?: string | null;
          uploaded_by?: string | null;
          client_visible?: boolean;
          created_at?: string;
        }
      >;
      leads: TableDef<
        Lead,
        {
          id?: string;
          company_id: string;
          client_name: string;
          site_address?: string | null;
          description?: string | null;
          estimated_value?: number | null;
          quote_amount?: number | null;
          quote_sent_date?: string | null;
          follow_up_date?: string | null;
          status?: LeadStatus;
          lost_reason?: string | null;
          converted_project_id?: string | null;
          notes?: string | null;
          client_approval_token?: string;
          quote_accepted_at?: string | null;
          quote_accepted_name?: string | null;
          created_by?: string | null;
          created_at?: string;
        }
      >;
      lead_notes: TableDef<
        LeadNote,
        {
          id?: string;
          lead_id: string;
          body: string;
          created_by?: string | null;
          created_at?: string;
        }
      >;
      lead_follow_ups: TableDef<
        LeadFollowUp,
        {
          id?: string;
          lead_id: string;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
        }
      >;
      notification_log: TableDef<
        NotificationLog,
        {
          id?: string;
          company_id: string;
          kind: string;
          sent_date?: string;
          created_at?: string;
        }
      >;
      chat_rooms: TableDef<
        ChatRoom,
        {
          id?: string;
          company_id: string;
          project_id?: string | null;
          kind: ChatRoomKind;
          name?: string | null;
          created_by?: string | null;
          created_at?: string;
        }
      >;
      chat_participants: TableDef<
        ChatParticipant,
        {
          id?: string;
          chat_room_id: string;
          profile_id?: string | null;
          subcontractor_id?: string | null;
          added_at?: string;
        }
      >;
      chat_messages: TableDef<
        ChatMessage,
        {
          id?: string;
          chat_room_id: string;
          sender_profile_id?: string | null;
          sender_subcontractor_id?: string | null;
          body: string;
          created_at?: string;
        }
      >;
      xero_connections: TableDef<
        XeroConnection,
        {
          id?: string;
          company_id: string;
          tenant_id: string;
          tenant_name?: string | null;
          access_token: string;
          refresh_token: string;
          expires_at: string;
          connected_by?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      get_invite_preview: {
        Args: { invite_token: string };
        Returns: { company_name: string; role: UserRole; is_valid: boolean }[];
      };
      redeem_invite: {
        Args: { invite_token: string };
        Returns: { company_id: string; role: UserRole };
      };
      check_ai_rate_limit: {
        Args: { p_route: string; p_limit: number; p_window_minutes: number };
        Returns: boolean;
      };
      create_company: {
        Args: { company_name: string; company_type: CompanyType };
        Returns: { company_id: string };
      };
      get_variation_by_token: {
        Args: { variation_token: string };
        Returns: {
          project_name: string;
          company_name: string;
          title: string;
          description: string | null;
          cost_impact: number | null;
          time_impact_days: number | null;
          requested_by_type: VariationRequestedByType | null;
          reason: string | null;
          client_approved_at: string | null;
          client_approved_name: string | null;
          is_valid: boolean;
        }[];
      };
      approve_variation_by_token: {
        Args: { variation_token: string; approver_name: string };
        Returns: { approved_at: string; approved_name: string };
      };
      get_quote_by_token: {
        Args: { quote_token: string };
        Returns: {
          company_name: string;
          client_name: string;
          site_address: string | null;
          description: string | null;
          quote_amount: number | null;
          quote_sent_date: string | null;
          status: LeadStatus;
          quote_accepted_at: string | null;
          quote_accepted_name: string | null;
          is_valid: boolean;
        }[];
      };
      accept_quote_by_token: {
        Args: { quote_token: string; accepter_name: string };
        Returns: { accepted_at: string; accepted_name: string };
      };
      get_project_portal_data: {
        Args: { portal_token: string };
        Returns: {
          is_valid: boolean;
          project_name?: string;
          site_address?: string | null;
          status?: ProjectStatus;
          practical_completion_date?: string | null;
          company_name?: string;
          licence_number?: string | null;
          latest_progress?: { entry_date: string; summary: string | null; percent_complete: number | null } | null;
          recent_entries?: { entry_date: string; summary: string | null; percent_complete: number | null }[];
          photos?: { entry_date: string; caption: string | null; storage_path: string }[];
          documents?: { title: string; category: DocumentCategory; storage_path: string }[];
          milestones?: { name: string; status: MilestoneStatus; target_date: string | null; actual_date: string | null }[];
          variations_awaiting_approval?: { title: string; cost_impact: number | null; time_impact_days: number | null; token: string }[];
          variations_approved?: { title: string; cost_impact: number | null; approved_at: string }[];
          selections_awaiting_choice?: { category: string; due_date: string | null; token: string }[];
          selections_chosen?: { category: string; chosen_at: string | null }[];
          payment_claims?: {
            claim_number: string | null;
            amount_claimed: number;
            claim_date: string;
            status: PaymentClaimStatus;
            paid_amount: number | null;
          }[];
          contract_value?: number | null;
          revised_contract_value?: number | null;
          total_claimed?: number;
          total_paid?: number;
        };
      };
      get_subcontractor_portal_data: {
        Args: { sub_token: string };
        Returns: {
          is_valid: boolean;
          builder_company_name?: string;
          project_name?: string;
          site_address?: string | null;
          company_name?: string;
          trade?: string | null;
          status?: SubcontractorStatus;
          contract_value?: number | null;
          start_date?: string | null;
          completion_date?: string | null;
          insurance_expiry?: string | null;
          licence_expiry?: string | null;
          retention_percentage?: number | null;
          retention_released_amount?: number | null;
          retention_released_date?: string | null;
          payments?: {
            id: string;
            claim_number: string | null;
            claim_date: string;
            amount_claimed: number;
            status: SubcontractorPaymentStatus;
            amount_paid: number | null;
            paid_date: string | null;
          }[];
          swms?: { id: string; title: string; status: SwmsStatus; review_due_date: string | null; acknowledged_at: string | null }[];
          quotes?: {
            id: string;
            description: string;
            amount: number | null;
            status: QuoteStatus;
            requested_date: string;
            received_date: string | null;
            notes: string | null;
            storage_path: string | null;
          }[];
          updates?: {
            id: string;
            message: string;
            update_type: SubcontractorUpdateType;
            photo_storage_path: string | null;
            created_at: string;
          }[];
        };
      };
      update_subcontractor_compliance_by_token: {
        Args: { sub_token: string; new_insurance_expiry: string | null; new_licence_expiry: string | null };
        Returns: { insurance_expiry: string | null; licence_expiry: string | null };
      };
      submit_subcontractor_claim_by_token: {
        Args: { sub_token: string; claim_amount: number; claim_notes: string | null };
        Returns: { id: string; claim_date: string; amount_claimed: number };
      };
      acknowledge_swms_by_token: {
        Args: { sub_token: string; target_swms_id: string };
        Returns: { acknowledged_at: string };
      };
      submit_subcontractor_quote_by_token: {
        Args: {
          sub_token: string;
          target_quote_id: string | null;
          quote_description: string | null;
          quoted_amount: number | null;
          quote_notes: string | null;
          quote_storage_path: string | null;
        };
        Returns: { id: string; status: QuoteStatus; amount: number | null };
      };
      submit_subcontractor_update_by_token: {
        Args: { sub_token: string; update_message: string; update_kind: string | null; update_photo_path: string | null };
        Returns: { id: string; created_at: string };
      };
      get_field_worker_home: {
        Args: Record<string, never>;
        Returns: {
          projects: { id: string; name: string; site_address: string | null; status: string }[];
        };
      };
      get_field_worker_project_data: {
        Args: { target_project_id: string };
        Returns: {
          is_valid: boolean;
          project_name?: string;
          site_address?: string | null;
          diary_entries?: { id: string; entry_date: string; status: string; summary: string | null; percent_complete: number | null }[];
          safety_observations?: { id: string; severity: string; description: string; action_taken: string | null; entry_date: string }[];
          my_hours?: { id: string; work_date: string; hours: number; notes: string | null; can_remove: boolean }[];
          my_total_hours?: number;
        };
      };
      get_or_create_team_chat_room: {
        Args: Record<string, never>;
        Returns: string;
      };
      get_or_create_project_chat_room: {
        Args: { target_project_id: string };
        Returns: string;
      };
      get_subcontractor_chat_by_token: {
        Args: { sub_token: string };
        Returns: {
          is_participant: boolean;
          messages?: { id: string; body: string; created_at: string; sender_name: string; is_me: boolean }[];
        };
      };
      post_subcontractor_chat_message_by_token: {
        Args: { sub_token: string; message_body: string };
        Returns: { id: string; created_at: string };
      };
      get_or_create_worker_project_chat_room: {
        Args: { target_project_id: string };
        Returns: string;
      };
      create_group_chat: {
        Args: { chat_name: string; target_project_id: string | null; member_profile_ids: string[] };
        Returns: string;
      };
      get_xero_connection_status: {
        Args: Record<string, never>;
        Returns: { connected: boolean; tenant_name?: string | null; connected_at?: string | null };
      };
      get_selection_by_token: {
        Args: { selection_token: string };
        Returns: {
          is_valid: boolean;
          project_name?: string;
          company_name?: string;
          category?: string;
          description?: string | null;
          allowance_amount?: number | null;
          due_date?: string | null;
          status?: SelectionStatus;
          chosen_option_id?: string | null;
          client_chosen_at?: string | null;
          client_chosen_name?: string | null;
          options?: { id: string; name: string; description: string | null; cost: number | null; supplier: string | null }[];
        };
      };
      choose_selection_by_token: {
        Args: { selection_token: string; option_id: string; chooser_name: string };
        Returns: { chosen_option_id: string; chosen_at: string; chosen_name: string };
      };
      log_my_hours: {
        Args: { target_project_id: string; p_work_date: string; p_hours: number; p_notes: string | null };
        Returns: { id: string; work_date: string; hours: number; notes: string | null };
      };
      delete_my_hours: {
        Args: { entry_id: string };
        Returns: void;
      };
    };
  };
};
