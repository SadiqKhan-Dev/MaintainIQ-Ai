"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Issue, STATUS_COLORS, PRIORITY_COLORS, SLA_COLORS } from "@/lib/types";

function slaLabel(issue: Issue): string {
  if (issue.sla_status === "breached") return "SLA Breached";
  if (issue.sla_status === "due_soon") {
    if (!issue.sla_due_at) return "Due Soon";
    const diff = new Date(issue.sla_due_at).getTime() - Date.now();
    const hrs = Math.max(0, Math.round(diff / 3600000));
    return `Due in ${hrs}h`;
  }
  if (issue.sla_status === "ok" && issue.sla_due_at) {
    const diff = new Date(issue.sla_due_at).getTime() - Date.now();
    const hrs = Math.max(0, Math.round(diff / 3600000));
    return `Due in ${hrs}h`;
  }
  return "No SLA";
}

export default function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [slaFilter, setSlaFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    apiFetch("/api/issues")
      .then(setIssues)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = issues.filter((i) => {
    if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !i.issue_number.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && i.status !== statusFilter) return false;
    if (priorityFilter && i.priority !== priorityFilter) return false;
    if (slaFilter && (i.sla_status || "none") !== slaFilter) return false;
    if (typeFilter && (i.work_order_type || "reactive") !== typeFilter) return false;
    return true;
  });

  const breachedCount = issues.filter((i) => i.sla_status === "breached").length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dispatch Board</h1>
        <p className="text-sm text-gray-500 mt-1">{issues.length} total issues{breachedCount > 0 && <> &middot; <span className="text-red-600 font-medium">{breachedCount} SLA breached</span></>}</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by title or number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">All Statuses</option>
          {["reported", "assigned", "inspection_started", "maintenance_in_progress", "waiting_for_parts", "resolved", "closed", "reopened"].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">All Priorities</option>
          {["low", "medium", "high", "critical"].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select value={slaFilter} onChange={(e) => setSlaFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">All SLA</option>
          <option value="breached">Breached</option>
          <option value="due_soon">Due Soon</option>
          <option value="ok">On Track</option>
          <option value="none">No SLA</option>
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">All Types</option>
          <option value="reactive">Reactive</option>
          <option value="preventive">Preventive</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No issues found</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SLA</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">AI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((issue) => (
                <tr key={issue.id} className={`hover:bg-gray-50 transition ${issue.sla_status === "breached" ? "bg-red-50/40" : ""}`}>
                  <td className="px-6 py-4">
                    <Link href={`/dashboard/issues/${issue.id}`} className="text-sm font-mono font-medium text-blue-600 hover:text-blue-800">
                      {issue.issue_number}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{issue.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{issue.asset_code || "—"}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[issue.priority]}`}>
                      {issue.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[issue.status]}`}>
                      {issue.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${SLA_COLORS[issue.sla_status || "none"]}`}>
                      {slaLabel(issue)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${issue.work_order_type === "preventive" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600"}`}>
                      {issue.work_order_type === "preventive" ? "Preventive" : "Reactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {issue.ai_suggested && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        {issue.ai_edited ? "AI + Edited" : "AI"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
