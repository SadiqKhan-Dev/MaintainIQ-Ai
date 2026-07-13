"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

export default function NewAssetPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    asset_code: "", name: "", category: "", location: "", condition: "good",
    last_service_date: "", next_service_date: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSubmitting(true);
    try {
      await apiFetch("/api/assets", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          last_service_date: form.last_service_date || null,
          next_service_date: form.next_service_date || null,
        }),
      });
      router.push("/dashboard/assets");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create asset");
    }
    setSubmitting(false);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/dashboard/assets" className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block">&larr; Back to Assets</Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Register New Asset</h1>
      <p className="text-sm text-gray-500 mb-2">A unique QR-linked public page is generated automatically on creation.</p>
      <Link href="/dashboard/assets/ai" className="text-sm text-purple-600 hover:text-purple-800 mb-6 inline-block">✨ Or add this asset by chatting with the AI assistant</Link>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Asset Code *" value={form.asset_code} onChange={(v) => setForm({ ...form, asset_code: v })} placeholder="HVAC-001" />
          <Field label="Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="Category *" value={form.category} onChange={(v) => setForm({ ...form, category: v })} placeholder="HVAC, Electrical..." />
          <Field label="Location *" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
            <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </select>
          </div>
          <Field label="Last Service" type="date" value={form.last_service_date} onChange={(v) => setForm({ ...form, last_service_date: v })} />
          <Field label="Next Service" type="date" value={form.next_service_date} onChange={(v) => setForm({ ...form, next_service_date: v })} />
        </div>
        <div className="flex gap-3 mt-6">
          <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {submitting ? "Creating..." : "Create Asset"}
          </button>
          <button type="button" onClick={() => router.push("/dashboard/assets")} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type || "text"} required={!type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
    </div>
  );
}
