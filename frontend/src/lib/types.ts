export interface Asset {
  id: string;
  asset_code: string;
  name: string;
  category: string;
  location: string;
  condition: string;
  status: string;
  last_service_date: string | null;
  next_service_date: string | null;
  assigned_technician_id: string | null;
  parent_asset_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicAsset {
  asset_code: string;
  name: string;
  category: string;
  location: string;
  condition: string;
  status: string;
  last_service_date: string | null;
  next_service_date: string | null;
  is_retired: boolean;
  recent_activity: ActivityEntry[];
}

export interface Issue {
  id: string;
  issue_number: string;
  asset_id: string;
  title: string;
  description: string;
  category: string | null;
  priority: string;
  status: string;
  reporter_name: string | null;
  reporter_contact: string | null;
  ai_suggested: boolean;
  ai_edited: boolean;
  assigned_technician_id: string | null;
  sla_due_at?: string | null;
  work_order_type?: string;
  generated_by?: string | null;
  sla_status?: string | null;
  created_at: string;
  updated_at: string;
  asset_code?: string;
  asset_name?: string;
}

export interface ActivityEntry {
  action: string;
  description: string;
  created_at: string;
}

export interface HistoryEntry {
  id: string;
  asset_id: string;
  issue_id: string | null;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  description: string | null;
  created_at: string;
}

export interface MaintenanceRecord {
  id: string;
  issue_id: string;
  technician_id: string;
  inspection_notes: string | null;
  work_performed: string | null;
  parts_replaced: string[];
  cost: number;
  evidence_urls: string[];
  final_condition: string | null;
  created_at: string;
}

export interface AITriage {
  title: string;
  category: string;
  priority: string;
  possible_causes: string[];
  initial_checks: string[];
  recurring_pattern_warning: string | null;
}

export interface DashboardSummary {
  generated_at: string;
  kpis: {
    total_assets: number;
    operational: number;
    issue_reported: number;
    under_maintenance: number;
    out_of_service: number;
    retired: number;
    open_issues: number;
    critical_issues: number;
    high_issues: number;
    resolved_total: number;
    total_maintenance_cost: number;
    due_for_service: number;
  };
  assets_by_status: Record<string, number>;
  issues_by_status: Record<string, number>;
  issues_by_priority: Record<string, number>;
  due_soon: { asset_code: string; name: string; next_service_date: string; days_left: number; status: string }[];
  recurring_assets: { asset_code: string; name: string; issue_count: number; open: number }[];
  technician_workload: { technician_id: string; open: number; critical: number }[];
  recent_activity: { id: string; action: string; description: string; actor_role: string | null; asset_code: string | null; asset_name: string | null; created_at: string }[];
}

export interface HealthAnalysis {
  health_score: number;
  recurring_issues: string[];
  risk_level: string;
  analysis: string;
}

export interface PreventiveRec {
  recommended_action: string;
  suggested_next_service: string;
  priority: string;
  rationale: string;
}

export const STATUS_COLORS: Record<string, string> = {
  operational: "bg-emerald-100 text-emerald-800 border-emerald-300",
  issue_reported: "bg-yellow-100 text-yellow-800 border-yellow-300",
  under_inspection: "bg-blue-100 text-blue-800 border-blue-300",
  under_maintenance: "bg-orange-100 text-orange-800 border-orange-300",
  out_of_service: "bg-red-100 text-red-800 border-red-300",
  retired: "bg-gray-100 text-gray-600 border-gray-300",
  reported: "bg-yellow-100 text-yellow-800 border-yellow-300",
  assigned: "bg-blue-100 text-blue-800 border-blue-300",
  inspection_started: "bg-indigo-100 text-indigo-800 border-indigo-300",
  maintenance_in_progress: "bg-orange-100 text-orange-800 border-orange-300",
  waiting_for_parts: "bg-amber-100 text-amber-800 border-amber-300",
  resolved: "bg-green-100 text-green-800 border-green-300",
  closed: "bg-gray-100 text-gray-600 border-gray-300",
  reopened: "bg-red-100 text-red-800 border-red-300",
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export const SLA_COLORS: Record<string, string> = {
  ok: "bg-emerald-100 text-emerald-800 border-emerald-300",
  due_soon: "bg-amber-100 text-amber-800 border-amber-300",
  breached: "bg-red-100 text-red-800 border-red-300",
  none: "bg-gray-100 text-gray-600 border-gray-300",
};
