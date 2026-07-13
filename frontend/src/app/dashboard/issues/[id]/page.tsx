"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Issue, HistoryEntry, MaintenanceRecord, STATUS_COLORS, PRIORITY_COLORS } from "@/lib/types";

const VALID_TRANSITIONS: Record<string, string[]> = {
  reported: ["assigned"],
  assigned: ["inspection_started"],
  inspection_started: ["maintenance_in_progress"],
  maintenance_in_progress: ["waiting_for_parts", "resolved"],
  waiting_for_parts: ["maintenance_in_progress", "resolved"],
  resolved: ["closed", "reopened"],
  closed: ["reopened"],
  reopened: ["assigned", "inspection_started", "maintenance_in_progress"],
};

export default function IssueDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [issue, setIssue] = useState<Issue | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [assignId, setAssignId] = useState("");
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({
    inspection_notes: "",
    work_performed: "",
    parts_replaced: "",
    cost: "0",
    final_condition: "good",
  });

  useEffect(() => {
    loadIssue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadIssue() {
    try {
      const data = await apiFetch(`/api/issues/${id}`);
      setIssue(data);
      const hist = await apiFetch(`/api/assets/${data.asset_id}/history`).catch(() => []);
      setHistory(hist);
      const recs = await apiFetch(`/api/issues/${id}/maintenance`).catch(() => []);
      setMaintenanceRecords(recs);
    } catch {
    }
    setLoading(false);
  }

  async function generateSummary() {
    if (maintenanceRecords.length === 0) return;
    const rec = maintenanceRecords[maintenanceRecords.length - 1];
    setSummaryLoading(true); setSummary("");
    try {
      const data = await apiFetch("/api/ai/maintenance-summary", {
        method: "POST",
        body: JSON.stringify({
          asset_name: issue?.asset_name || issue?.asset_code || "Asset",
          technician_notes: rec.work_performed || rec.inspection_notes || "",
          parts_replaced: rec.parts_replaced || [],
          cost: rec.cost || 0,
        }),
      });
      setSummary(data.summary || "");
    } catch {
      setSummary("AI summary unavailable.");
    }
    setSummaryLoading(false);
  }

  async function handleStatusChange(newStatus: string) {
    setActionLoading(true);
    try {
      await apiFetch(`/api/issues/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      await loadIssue();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    }
    setActionLoading(false);
  }

  async function handleAssign() {
    if (!assignId.trim()) return;
    setActionLoading(true);
    try {
      await apiFetch(`/api/issues/${id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ technician_id: assignId.trim() }),
      });
      await loadIssue();
      setAssignId("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to assign");
    }
    setActionLoading(false);
  }

  async function handleMaintenance(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    try {
      await apiFetch(`/api/issues/${id}/maintenance`, {
        method: "POST",
        body: JSON.stringify({
          ...maintenanceForm,
          cost: parseFloat(maintenanceForm.cost) || 0,
          parts_replaced: maintenanceForm.parts_replaced ? maintenanceForm.parts_replaced.split(",").map((s) => s.trim()) : [],
        }),
      });
      setShowMaintenanceForm(false);
      setMaintenanceForm({ inspection_notes: "", work_performed: "", parts_replaced: "", cost: "0", final_condition: "good" });
      await loadIssue();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to add maintenance record");
    }
    setActionLoading(false);
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12 text-gray-500">Issue not found</div>
      </div>
    );
  }

  const currentStatus = issue.status;
  const allowedNext = VALID_TRANSITIONS[currentStatus] || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/dashboard/issues" className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block">
        &larr; Back to Issues
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{issue.issue_number}</h1>
          <p className="text-gray-500 mt-1">{issue.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${PRIORITY_COLORS[issue.priority]}`}>
            {issue.priority}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${STATUS_COLORS[issue.status]}`}>
            {issue.status.replace(/_/g, " ")}
          </span>
          {issue.ai_suggested && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
              AI Suggested
            </span>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Details</h2>
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-500">Asset:</span> <Link href={`/assets/${issue.asset_code}`} className="text-blue-600 hover:underline">{issue.asset_code} - {issue.asset_name}</Link></div>
            <div><span className="text-gray-500">Category:</span> {issue.category || "—"}</div>
            <div><span className="text-gray-500">Reporter:</span> {issue.reporter_name || "—"}</div>
            <div><span className="text-gray-500">Assigned to:</span> {issue.assigned_technician_id || "Unassigned"}</div>
            <div className="pt-2"><span className="text-gray-500">Description:</span><p className="mt-1 text-gray-700">{issue.description}</p></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Actions</h2>

          {allowedNext.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-xs text-gray-500 uppercase">Status Transition</p>
              {allowedNext.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={actionLoading}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  Move to {s.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          )}

          {["reported", "reopened"].includes(currentStatus) && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 uppercase mb-2">Assign Technician</p>
              <input
                type="text"
                value={assignId}
                onChange={(e) => setAssignId(e.target.value)}
                placeholder="Technician Clerk ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2"
              />
              <button
                onClick={handleAssign}
                disabled={actionLoading || !assignId.trim()}
                className="w-full px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                Assign
              </button>
            </div>
          )}

          <button
            onClick={() => setShowMaintenanceForm(!showMaintenanceForm)}
            className="w-full px-3 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition"
          >
            Add Maintenance Record
          </button>
        </div>
      </div>

      {showMaintenanceForm && (
        <form onSubmit={handleMaintenance} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Maintenance Record</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Inspection Notes</label>
              <textarea value={maintenanceForm.inspection_notes} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, inspection_notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows={3} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Performed</label>
              <textarea value={maintenanceForm.work_performed} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, work_performed: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows={3} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parts Replaced (comma-separated)</label>
              <input type="text" value={maintenanceForm.parts_replaced} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, parts_replaced: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Filter, Belt, Gasket" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost ($)</label>
              <input type="number" min="0" step="0.01" value={maintenanceForm.cost} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Final Condition</label>
              <select value={maintenanceForm.final_condition} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, final_condition: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={actionLoading} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
              {actionLoading ? "Saving..." : "Save Record"}
            </button>
            <button type="button" onClick={() => setShowMaintenanceForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Maintenance Records</h2>
          {maintenanceRecords.length > 0 && (
            <button onClick={generateSummary} disabled={summaryLoading} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-50">
              {summaryLoading ? "Generating..." : "AI Summary"}
            </button>
          )}
        </div>
        {maintenanceRecords.length === 0 ? (
          <p className="text-sm text-gray-400">No maintenance records yet</p>
        ) : (
          <div className="space-y-3">
            {maintenanceRecords.map((r) => (
              <div key={r.id} className="border border-gray-100 rounded-lg p-3 text-sm">
                <p className="text-gray-700">{r.work_performed || r.inspection_notes || "No details"}</p>
                {r.parts_replaced?.length > 0 && <p className="text-xs text-gray-500 mt-1">Parts: {r.parts_replaced.join(", ")}</p>}
                {r.cost != null && <p className="text-xs text-gray-500">Cost: ${r.cost}</p>}
              </div>
            ))}
          </div>
        )}
        {summary && (
          <div className="mt-3 bg-purple-50 border border-purple-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-purple-900 mb-1">AI Maintenance Summary</p>
            <p className="text-sm text-purple-800">{summary}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Activity History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400">No history records yet</p>
        ) : (
          <div className="space-y-3">
            {history.map((h) => (
              <div key={h.id} className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 shrink-0" />
                <div>
                  <p className="text-sm text-gray-900">{h.description || h.action}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {h.actor_role && <span className="font-medium">{h.actor_role}</span>}
                    {h.created_at && <span> &middot; {new Date(h.created_at).toLocaleString()}</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
