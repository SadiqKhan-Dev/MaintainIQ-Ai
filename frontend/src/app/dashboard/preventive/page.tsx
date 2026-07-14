"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface DueAsset {
  asset_code: string;
  name: string;
  next_service_date: string;
  days_left: number;
  status: string;
}

export default function PreventivePage() {
  const [due, setDue] = useState<DueAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [lookahead, setLookahead] = useState(30);
  const [result, setResult] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch("/api/dashboard/summary");
      setDue(data.due_soon || []);
    } catch {
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function generate() {
    setGenerating(true);
    setResult(null);
    try {
      const data = await apiFetch(`/api/issues/generate-preventive?lookahead_days=${lookahead}`, { method: "POST" });
      setResult(`Generated ${data.created} preventive work order(s), skipped ${data.skipped} already open.`);
      await load();
    } catch (e: unknown) {
      setResult(e instanceof Error ? e.message : "Failed to generate");
    }
    setGenerating(false);
  }

  const overdue = due.filter((d) => d.days_left < 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Preventive Maintenance</h1>
          <p className="text-sm text-gray-500 mt-1">{due.length} asset(s) due for service within {lookahead} days{overdue.length > 0 && <> &middot; <span className="text-red-600 font-medium">{overdue.length} overdue</span></>}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={lookahead} onChange={(e) => setLookahead(Number(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
          <button onClick={generate} disabled={generating} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {generating ? "Generating..." : "Generate Work Orders"}
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 text-sm rounded-lg px-4 py-3 mb-6">{result}</div>
      )}

      {loading ? (
        <div className="h-40 bg-gray-200 rounded-lg animate-pulse" />
      ) : due.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No assets due for service</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Window</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {due.map((d) => (
                <tr key={d.asset_code} className={d.days_left < 0 ? "bg-red-50/40" : ""}>
                  <td className="px-6 py-4">
                    <Link href={`/dashboard/assets/${d.asset_code}`} className="text-sm font-mono font-medium text-blue-600 hover:text-blue-800">{d.asset_code}</Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{d.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{d.next_service_date}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{d.status.replace(/_/g, " ")}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.days_left < 0 ? "bg-red-100 text-red-700" : d.days_left <= 7 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {d.days_left < 0 ? `${-d.days_left}d overdue` : `${d.days_left}d left`}
                    </span>
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
