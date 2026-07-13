"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, API_BASE } from "@/lib/api";
import { Asset, STATUS_COLORS, HealthAnalysis, PreventiveRec } from "@/lib/types";
import { QRCodeSVG } from "qrcode.react";

export default function AssetDetailPage() {
  const params = useParams();
  const code = params.code as string;
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [retiring, setRetiring] = useState(false);

  const [health, setHealth] = useState<HealthAnalysis | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [preventive, setPreventive] = useState<PreventiveRec | null>(null);
  const [preventiveLoading, setPreventiveLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/assets/code/${code}`);
      setAsset(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Asset not found");
    }
    setLoading(false);
  }, [code]);

  useEffect(() => { load(); }, [load]);

  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/assets/${code}` : `${API_BASE}/assets/${code}`;

  async function downloadQR() {
    const res = await fetch(`${API_BASE}/api/assets/qr/${code}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `maintainiq-${code}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(publicUrl);
    alert("Public link copied to clipboard");
  }

  async function handleRetire() {
    if (!confirm(`Retire asset ${code}? It will remain readable but marked Retired.`)) return;
    setRetiring(true);
    try {
      await apiFetch(`/api/assets/${asset!.id}/retire`, { method: "POST" });
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to retire");
    }
    setRetiring(false);
  }

  async function runHealth() {
    setHealthLoading(true); setHealth(null);
    try {
      const data = await apiFetch("/api/ai/health-analysis", { method: "POST", body: JSON.stringify({ asset_code: code }) });
      setHealth(data);
    } catch { setHealth({ health_score: 70, recurring_issues: [], risk_level: "medium", analysis: "Analysis unavailable" }); }
    setHealthLoading(false);
  }

  async function runPreventive() {
    setPreventiveLoading(true); setPreventive(null);
    try {
      const data = await apiFetch("/api/ai/preventive", { method: "POST", body: JSON.stringify({ asset_code: code }) });
      setPreventive(data);
    } catch { setPreventive({ recommended_action: "Schedule inspection", suggested_next_service: "within 30 days", priority: "medium", rationale: "" }); }
    setPreventiveLoading(false);
  }

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-8"><div className="h-8 bg-gray-200 rounded w-64 animate-pulse" /></div>;
  if (error || !asset) return <div className="max-w-5xl mx-auto px-4 py-16 text-center text-gray-500">Asset not found</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/dashboard/assets" className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block">&larr; Back to Assets</Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{asset.name}</h1>
            {asset.status === "retired" && <span className="px-3 py-1 rounded-full text-sm font-bold bg-gray-800 text-white">Retired</span>}
          </div>
          <p className="text-sm text-gray-500 mt-1 font-mono">{asset.asset_code}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${STATUS_COLORS[asset.status] || "bg-gray-100"}`}>{asset.status.replace(/_/g, " ")}</span>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Asset Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Info label="Category" value={asset.category} />
              <Info label="Location" value={asset.location} />
              <Info label="Condition" value={asset.condition} />
              <Info label="Assigned Tech" value={asset.assigned_technician_id || "—"} />
              <Info label="Last Service" value={asset.last_service_date || "N/A"} />
              <Info label="Next Service" value={asset.next_service_date || "N/A"} />
            </div>
            <div className="flex flex-wrap gap-3 mt-5">
              <Link href={`/assets/${code}`} target="_blank" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Open Public Page</Link>
              <button onClick={copyLink} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Copy Link</button>
              <button onClick={() => setShowEdit(!showEdit)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Edit</button>
              {asset.status !== "retired" && (
                <button onClick={handleRetire} disabled={retiring} className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 disabled:opacity-50">Retire Asset</button>
              )}
            </div>
          </div>

          {showEdit && <EditAssetForm asset={asset} onSaved={() => { setShowEdit(false); load(); }} onCancel={() => setShowEdit(false)} />}

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-3">AI Insights</h2>
            <div className="flex gap-3 mb-4">
              <button onClick={runHealth} disabled={healthLoading} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                {healthLoading ? "Analyzing..." : "Asset Health Analysis"}
              </button>
              <button onClick={runPreventive} disabled={preventiveLoading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {preventiveLoading ? "Generating..." : "Preventive Recommendation"}
              </button>
            </div>
            {health && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-3">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl font-bold text-purple-800">{health.health_score}</span>
                  <span className="text-xs text-purple-600">/100 health score</span>
                  <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${health.risk_level === "high" ? "bg-red-100 text-red-700" : health.risk_level === "medium" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{health.risk_level} risk</span>
                </div>
                {health.recurring_issues?.length > 0 && (
                  <p className="text-sm text-purple-800">Recurring: {health.recurring_issues.join(", ")}</p>
                )}
                <p className="text-sm text-purple-800 mt-1">{health.analysis}</p>
              </div>
            )}
            {preventive && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <p className="text-sm text-indigo-900 font-medium">{preventive.recommended_action}</p>
                <p className="text-xs text-indigo-600 mt-1">Next service: {preventive.suggested_next_service} · Priority: {preventive.priority}</p>
                {preventive.rationale && <p className="text-sm text-indigo-800 mt-1">{preventive.rationale}</p>}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <h2 className="font-semibold text-gray-900 mb-3">QR Code</h2>
            <div className="inline-block bg-white border rounded-lg p-3">
              <QRCodeSVG value={publicUrl} size={160} />
            </div>
            <button onClick={downloadQR} className="mt-4 w-full py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">Download QR (PNG)</button>
            <button onClick={() => window.print()} className="mt-2 w-full py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Print Asset Label</button>
          </div>
        </div>
      </div>

      <PrintLabel asset={asset} publicUrl={publicUrl} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-sm text-gray-500">{label}</span>
      <p className="text-sm font-medium text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

function EditAssetForm({ asset, onSaved, onCancel }: { asset: Asset; onSaved: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    name: asset.name, category: asset.category, location: asset.location,
    condition: asset.condition, status: asset.status,
    last_service_date: asset.last_service_date || "", next_service_date: asset.next_service_date || "",
  });
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    try {
      await apiFetch(`/api/assets/${asset.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...form,
          last_service_date: form.last_service_date || null,
          next_service_date: form.next_service_date || null,
        }),
      });
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  }
  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Edit Asset</h3>
      {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">{error}</div>}
      <div className="grid md:grid-cols-2 gap-4">
        <F label="Name" v={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <F label="Category" v={form.category} onChange={(v) => setForm({ ...form, category: v })} />
        <F label="Location" v={form.location} onChange={(v) => setForm({ ...form, location: v })} />
        <F label="Condition" v={form.condition} onChange={(v) => setForm({ ...form, condition: v })} />
        <F label="Status" v={form.status} onChange={(v) => setForm({ ...form, status: v })} />
        <F label="Last Service" v={form.last_service_date} onChange={(v) => setForm({ ...form, last_service_date: v })} />
        <F label="Next Service" v={form.next_service_date} onChange={(v) => setForm({ ...form, next_service_date: v })} />
      </div>
      <div className="flex gap-3 mt-4">
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Save</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
      </div>
    </form>
  );
}

function F({ label, v, onChange }: { label: string; v: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input value={v} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
    </div>
  );
}

function PrintLabel({ asset, publicUrl }: { asset: Asset; publicUrl: string }) {
  return (
    <div className="hidden print:block p-6">
      <div className="border-2 border-black rounded-lg p-4 max-w-sm">
        <p className="text-xs font-bold uppercase tracking-wide">MaintainIQ Facilities</p>
        <div className="flex items-center justify-between mt-2">
          <div>
            <p className="font-bold text-lg">{asset.name}</p>
            <p className="text-sm font-mono">{asset.asset_code}</p>
            <p className="text-xs mt-1">{asset.location}</p>
          </div>
          <QRCodeSVG value={publicUrl} size={96} />
        </div>
        <p className="text-[10px] mt-3 border-t pt-2">Scan to view asset status or report an issue.</p>
      </div>
    </div>
  );
}
