"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface CostAnalytics {
  total_maintenance_cost: number;
  avg_cost_per_issue: number;
  mttr_hours: number;
  resolved_count: number;
  open_count: number;
  top_assets_by_cost: { asset_code: string; name: string; cost: number }[];
  top_locations_by_cost: { location: string; cost: number }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<CostAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/dashboard/cost-analytics")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-8"><div className="h-40 bg-gray-200 rounded-lg animate-pulse" /></div>;
  if (!data) return <div className="max-w-7xl mx-auto px-4 py-8 text-center py-12 text-gray-500">No data available</div>;

  const maxAsset = Math.max(1, ...data.top_assets_by_cost.map((a) => a.cost));
  const maxLoc = Math.max(1, ...data.top_locations_by_cost.map((l) => l.cost));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Cost &amp; ROI Analytics</h1>
      <p className="text-sm text-gray-500 mb-6">Maintenance spend, efficiency, and where the money goes.</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card label="Total Spend" value={`$${data.total_maintenance_cost.toLocaleString()}`} />
        <Card label="Avg / Issue" value={`$${data.avg_cost_per_issue.toLocaleString()}`} />
        <Card label="MTTR" value={`${data.mttr_hours}h`} />
        <Card label="Resolved" value={`${data.resolved_count}`} />
        <Card label="Open" value={`${data.open_count}`} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Top Assets by Cost</h2>
          {data.top_assets_by_cost.length === 0 ? (
            <p className="text-sm text-gray-400">No maintenance costs recorded yet</p>
          ) : (
            <div className="space-y-3">
              {data.top_assets_by_cost.map((a) => (
                <div key={a.asset_code}>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-900">{a.name} <span className="text-gray-400 font-mono">({a.asset_code})</span></span>
                    <span className="font-medium">${a.cost.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full mt-1">
                    <div className="h-2 bg-red-400 rounded-full" style={{ width: `${(a.cost / maxAsset) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Top Locations by Cost</h2>
          {data.top_locations_by_cost.length === 0 ? (
            <p className="text-sm text-gray-400">No maintenance costs recorded yet</p>
          ) : (
            <div className="space-y-3">
              {data.top_locations_by_cost.map((l) => (
                <div key={l.location}>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-900">{l.location}</span>
                    <span className="font-medium">${l.cost.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full mt-1">
                    <div className="h-2 bg-indigo-400 rounded-full" style={{ width: `${(l.cost / maxLoc) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
