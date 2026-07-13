"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { DashboardSummary } from "@/lib/types";
import { useRealtime, RealtimeEvent } from "@/lib/useRealtime";
import { Donut, Legend, BarList } from "@/components/charts";

const STATUS_HEX: Record<string, string> = {
  operational: "#10b981",
  issue_reported: "#f59e0b",
  under_inspection: "#3b82f6",
  under_maintenance: "#f97316",
  out_of_service: "#ef4444",
  retired: "#9ca3af",
};
const PRIORITY_HEX: Record<string, string> = {
  low: "#9ca3af",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  function load() {
    apiFetch("/api/dashboard/summary")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  useRealtime((e: RealtimeEvent) => {
    load();
    setToast(e.type === "issue_status" ? `Issue ${e.issue_number} → ${e.status?.replace(/_/g, " ")}` : `Maintenance update on ${e.issue_number}`);
    setTimeout(() => setToast(null), 4000);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          {toast}
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Operations Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time maintenance overview across all assets</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/assets/new" className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm">+ New Asset</Link>
          <Link href="/dashboard/issues" className="px-4 py-2.5 border border-gray-300 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">View Issues</Link>
        </div>
      </div>

      {loading || !data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <Kpi label="Total Assets" value={data.kpis.total_assets} tone="blue" />
            <Kpi label="Operational" value={data.kpis.operational} tone="emerald" />
            <Kpi label="Open Issues" value={data.kpis.open_issues} tone="amber" />
            <Kpi label="Critical" value={data.kpis.critical_issues} tone="red" />
            <Kpi label="Due for Service" value={data.kpis.due_for_service} tone="violet" />
            <Kpi label="Spend" value={`$${data.kpis.total_maintenance_cost.toLocaleString()}`} tone="slate" />
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            <Card title="Asset Status">
              <div className="flex items-center gap-6">
                <Donut segments={Object.entries(data.assets_by_status).map(([k, v]) => ({ label: k, value: v, color: STATUS_HEX[k] || "#cbd5e1" }))} />
                <div className="flex-1"><Legend segments={Object.entries(data.assets_by_status).map(([k, v]) => ({ label: k, value: v, color: STATUS_HEX[k] || "#cbd5e1" }))} /></div>
              </div>
            </Card>

            <Card title="Issues by Priority">
              <div className="flex items-center gap-6">
                <Donut segments={Object.entries(data.issues_by_priority).map(([k, v]) => ({ label: k, value: v, color: PRIORITY_HEX[k] || "#cbd5e1" }))} />
                <div className="flex-1"><Legend segments={Object.entries(data.issues_by_priority).map(([k, v]) => ({ label: k, value: v, color: PRIORITY_HEX[k] || "#cbd5e1" }))} /></div>
              </div>
            </Card>

            <Card title="Technician Workload">
              <BarList
                max={Math.max(1, ...data.technician_workload.map((t) => t.open))}
                items={data.technician_workload.map((t) => ({
                  label: t.technician_id,
                  value: t.open,
                  sub: t.critical ? `· ${t.critical} crit` : "",
                  color: t.critical ? "#ef4444" : "#2563eb",
                }))}
              />
              {data.technician_workload.length === 0 && <p className="text-sm text-gray-400">No assignments yet</p>}
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <Card title="Due for Service (≤30 days)">
              <div className="space-y-2">
                {data.due_soon.slice(0, 6).map((d) => (
                  <Link key={d.asset_code} href={`/dashboard/assets/${d.asset_code}`} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 transition">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{d.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{d.asset_code}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.days_left < 0 ? "bg-red-100 text-red-700" : d.days_left <= 7 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {d.days_left < 0 ? `${Math.abs(d.days_left)}d overdue` : `${d.days_left}d left`}
                    </span>
                  </Link>
                ))}
                {data.due_soon.length === 0 && <p className="text-sm text-gray-400">All assets on schedule</p>}
              </div>
            </Card>

            <Card title="Recurring Problem Assets">
              <div className="space-y-2">
                {data.recurring_assets.map((r) => (
                  <Link key={r.asset_code} href={`/dashboard/assets/${r.asset_code}`} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 transition">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{r.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{r.asset_code}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">{r.issue_count} issues</span>
                  </Link>
                ))}
                {data.recurring_assets.length === 0 && <p className="text-sm text-gray-400">No recurring failures detected</p>}
              </div>
            </Card>

            <Card title="Recent Activity">
              <div className="space-y-3 max-h-80 overflow-auto">
                {data.recent_activity.map((h) => (
                  <div key={h.id} className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0">
                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${h.actor_role === "reporter" ? "bg-purple-400" : h.action.includes("resolved") || h.action.includes("closed") ? "bg-emerald-400" : "bg-blue-400"}`} />
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800">{h.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {h.asset_code && <span className="font-mono">{h.asset_code}</span>}
                        {h.actor_role && <span> · {h.actor_role}</span>}
                        {" · "}{new Date(h.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                {data.recent_activity.length === 0 && <p className="text-sm text-gray-400">No activity yet</p>}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

const TONES: Record<string, string> = {
  blue: "from-blue-50 to-blue-100/40 text-blue-600",
  emerald: "from-emerald-50 to-emerald-100/40 text-emerald-600",
  amber: "from-amber-50 to-amber-100/40 text-amber-600",
  red: "from-red-50 to-red-100/40 text-red-600",
  violet: "from-violet-50 to-violet-100/40 text-violet-600",
  slate: "from-slate-50 to-slate-100/40 text-slate-600",
};

function Kpi({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${TONES[tone]} p-4 border border-gray-100`}>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-wide">{label}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <h2 className="font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}
