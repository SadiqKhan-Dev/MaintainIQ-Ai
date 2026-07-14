"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Asset, STATUS_COLORS } from "@/lib/types";
import { ZoomableQR } from "@/components/ZoomableQR";

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; seconds: number } | null>(null);
  const deleteTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (deleteTimer.current) clearInterval(deleteTimer.current);
    };
  }, []);

  function cancelDelete() {
    if (deleteTimer.current) clearInterval(deleteTimer.current);
    deleteTimer.current = null;
    setPendingDelete(null);
  }

  function startDelete(asset: Asset) {
    if (pendingDelete) return;
    setPendingDelete({ id: asset.id, seconds: 30 });
    let remaining = 30;
    deleteTimer.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        if (deleteTimer.current) clearInterval(deleteTimer.current);
        deleteTimer.current = null;
        setPendingDelete(null);
        void executeDelete(asset.id);
      } else {
        setPendingDelete({ id: asset.id, seconds: remaining });
      }
    }, 1000);
  }

  async function executeDelete(id: string) {
    try {
      await apiFetch(`/api/assets/${id}`, { method: "DELETE" });
      setAssets((prev) => prev.filter((a) => a.id !== id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to delete asset");
    }
  }

  useEffect(() => {
    loadAssets();
  }, []);

  async function loadAssets() {
    try {
      const data = await apiFetch("/api/assets");
      setAssets(data);
    } catch {
    }
    setLoading(false);
  }

  const filtered = assets.filter((a) => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.asset_code.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && a.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
          <p className="text-sm text-gray-500 mt-1">{assets.length} total assets</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/assets/ai"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition"
          >
            ✨ Add via AI
          </Link>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            + Add Asset
          </button>
        </div>
      </div>

      {showAddForm && <AddAssetForm onCreated={() => { setShowAddForm(false); loadAssets(); }} onCancel={() => setShowAddForm(false)} />}

      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Statuses</option>
          <option value="operational">Operational</option>
          <option value="issue_reported">Issue Reported</option>
          <option value="under_inspection">Under Inspection</option>
          <option value="under_maintenance">Under Maintenance</option>
          <option value="out_of_service">Out of Service</option>
          <option value="retired">Retired</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No assets found</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">QR</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <Link href={`/dashboard/assets/${asset.asset_code}`} className="text-sm font-mono font-medium text-blue-600 hover:text-blue-800">
                      {asset.asset_code}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{asset.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{asset.category}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{asset.location}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[asset.status] || "bg-gray-100 text-gray-700"}`}>
                      {asset.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-10 h-10 bg-white border rounded flex items-center justify-center">
                      <ZoomableQR value={`${typeof window !== "undefined" ? window.location.origin : ""}/assets/${asset.asset_code}`} size={32} />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditing(asset)}
                        disabled={pendingDelete?.id === asset.id}
                        className="px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50"
                      >
                        Edit
                      </button>
                      {pendingDelete?.id === asset.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-red-600">Deleting in {pendingDelete.seconds}s</span>
                          <button
                            onClick={cancelDelete}
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            Undo
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startDelete(asset)}
                          className="px-3 py-1.5 text-xs font-medium text-red-700 border border-red-200 rounded-lg hover:bg-red-50"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EditAssetModal asset={editing} onSaved={() => { setEditing(null); loadAssets(); }} onCancel={() => setEditing(null)} />
      )}
    </div>
  );
}

function AddAssetForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    asset_code: "",
    name: "",
    category: "",
    location: "",
    condition: "good",
    parent_asset_id: "",
  });
  const [assets, setAssets] = useState<Asset[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch("/api/assets").then(setAssets).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await apiFetch("/api/assets", {
        method: "POST",
        body: JSON.stringify({ ...form, parent_asset_id: form.parent_asset_id || null }),
      });
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create asset");
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
      <h3 className="font-semibold text-gray-900 mb-4">Add New Asset</h3>
      {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">{error}</div>}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Asset Code *</label>
          <input
            type="text"
            required
            value={form.asset_code}
            onChange={(e) => setForm({ ...form, asset_code: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="e.g. HVAC-001"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
          <input
            type="text"
            required
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="e.g. HVAC, Plumbing, Electrical"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
          <input
            type="text"
            required
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
          <select
            value={form.condition}
            onChange={(e) => setForm({ ...form, condition: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Parent Asset (optional)</label>
          <select
            value={form.parent_asset_id}
            onChange={(e) => setForm({ ...form, parent_asset_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">None</option>
            {assets.filter((a) => a.asset_code !== form.asset_code).map((a) => (
              <option key={a.id} value={a.id}>{a.name} ({a.asset_code})</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-3 mt-4">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create Asset"}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  );
}

function EditAssetModal({ asset, onSaved, onCancel }: { asset: Asset; onSaved: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    name: asset.name,
    category: asset.category,
    location: asset.location,
    condition: asset.condition,
    status: asset.status,
    last_service_date: asset.last_service_date || "",
    next_service_date: asset.next_service_date || "",
    parent_asset_id: asset.parent_asset_id || "",
  });
  const [assets, setAssets] = useState<Asset[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch("/api/assets").then(setAssets).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await apiFetch(`/api/assets/${asset.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...form,
          parent_asset_id: form.parent_asset_id || null,
          last_service_date: form.last_service_date || null,
          next_service_date: form.next_service_date || null,
        }),
      });
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-gray-900 mb-4">Edit Asset · {asset.asset_code}</h3>
        {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <form onSubmit={submit}>
          <div className="grid md:grid-cols-2 gap-4">
            <F label="Name" v={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <F label="Category" v={form.category} onChange={(v) => setForm({ ...form, category: v })} />
            <F label="Location" v={form.location} onChange={(v) => setForm({ ...form, location: v })} />
            <F label="Condition" v={form.condition} onChange={(v) => setForm({ ...form, condition: v })} />
            <F label="Status" v={form.status} onChange={(v) => setForm({ ...form, status: v })} />
            <F label="Last Service" v={form.last_service_date} onChange={(v) => setForm({ ...form, last_service_date: v })} />
            <F label="Next Service" v={form.next_service_date} onChange={(v) => setForm({ ...form, next_service_date: v })} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Asset</label>
              <select
                value={form.parent_asset_id}
                onChange={(e) => setForm({ ...form, parent_asset_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">None</option>
                {assets.filter((a) => a.id !== asset.id).map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.asset_code})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
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
