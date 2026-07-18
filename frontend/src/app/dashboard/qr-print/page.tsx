"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Asset } from "@/lib/types";
import { QRCodeSVG } from "qrcode.react";

export default function QrPrintPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectAll, setSelectAll] = useState(true);
  const [category, setCategory] = useState("all");
  const [location, setLocation] = useState("all");

  useEffect(() => {
    apiFetch("/api/assets")
      .then((data: Asset[]) => {
        setAssets(data);
        setSelected(new Set(data.map((a) => a.id)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categories = ["all", ...Array.from(new Set(assets.map((a) => a.category).filter(Boolean))).sort()];
  const locations = ["all", ...Array.from(new Set(assets.map((a) => a.location).filter(Boolean))).sort()];

  const filtered = assets.filter(
    (a) =>
      (category === "all" || a.category === category) &&
      (location === "all" || a.location === location)
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((a) => next.add(a.id));
      return next;
    });
  }

  function clearAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((a) => next.delete(a.id));
      return next;
    });
  }

  function toggleAll() {
    if (selectAll) setSelected(new Set());
    else setSelected(new Set(assets.map((a) => a.id)));
    setSelectAll(!selectAll);
  }

  const chosen = assets.filter((a) => selected.has(a.id));

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-8"><div className="h-40 bg-gray-200 rounded-lg animate-pulse" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulk QR Print</h1>
          <p className="text-sm text-gray-500 mt-1">{chosen.length} of {assets.length} labels selected</p>
        </div>
        <div className="flex gap-3">
          <button onClick={toggleAll} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            {selectAll ? "Deselect All" : "Select All"}
          </button>
          <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            Print Labels
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 print:hidden">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c === "all" ? "All categories" : c}</option>
          ))}
        </select>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          {locations.map((l) => (
            <option key={l} value={l}>{l === "all" ? "All locations" : l}</option>
          ))}
        </select>
        <button onClick={selectAllFiltered} className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
          Select filtered ({filtered.length})
        </button>
        <button onClick={clearAllFiltered} className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
          Clear filtered
        </button>
      </div>

      <div className="hidden print:block print-title mb-4">
        <h1 className="text-lg font-bold">MaintainIQ Asset QR Labels</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 print:grid-cols-3">
        {chosen.map((a) => (
          <div key={a.id} className="border border-gray-300 rounded-lg p-3 flex flex-col items-center text-center break-inside-avoid print:border-black">
            <QRCodeSVG value={`${typeof window !== "undefined" ? window.location.origin : ""}/assets/${a.asset_code}`} size={120} />
            <p className="text-sm font-semibold mt-2">{a.name}</p>
            <p className="text-xs font-mono text-gray-500">{a.asset_code}</p>
            <p className="text-xs text-gray-400">{a.location}</p>
          </div>
        ))}
      </div>

      {chosen.length === 0 && (
        <div className="text-center py-12 text-gray-500 print:hidden">No labels selected</div>
      )}

      <div className="mt-8 print:hidden">
        <h2 className="font-semibold text-gray-900 mb-2">Select assets</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-50">
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 w-10">
                    <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} />
                  </td>
                  <td className="px-4 py-2 font-mono text-gray-600">{a.asset_code}</td>
                  <td className="px-4 py-2 text-gray-900">{a.name}</td>
                  <td className="px-4 py-2 text-gray-500">{a.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
