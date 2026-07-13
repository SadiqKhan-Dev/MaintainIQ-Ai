"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetchPublic } from "@/lib/api";
import { PublicAsset, STATUS_COLORS } from "@/lib/types";
import { ZoomableQR } from "@/components/ZoomableQR";

export default function PublicAssetPage() {
  const params = useParams();
  const code = params.code as string;
  const [asset, setAsset] = useState<PublicAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetchPublic(`/api/assets/${code}`)
      .then(setAsset)
      .catch((err) => setError(err.message || "Asset not found"))
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Asset Not Found</h1>
        <p className="text-gray-500">No asset found with code &ldquo;{code}&rdquo;</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{asset.name}</h1>
            {asset.is_retired && (
              <span className="px-3 py-1 rounded-full text-sm font-bold bg-gray-800 text-white">
                Retired
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1 font-mono">{asset.asset_code}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-2">
          <ZoomableQR value={typeof window !== "undefined" ? window.location.href : ""} size={80} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Asset Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="Category" value={asset.category} />
          <InfoRow label="Location" value={asset.location} />
          <InfoRow label="Condition" value={asset.condition} />
          <div>
            <span className="text-sm text-gray-500">Status</span>
            <div className="mt-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[asset.status] || "bg-gray-100"}`}>
                {asset.status.replace(/_/g, " ")}
              </span>
            </div>
          </div>
          <InfoRow label="Last Service" value={asset.last_service_date || "N/A"} />
          <InfoRow label="Next Service" value={asset.next_service_date || "N/A"} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Recent Activity</h2>
        {asset.recent_activity.length === 0 ? (
          <p className="text-sm text-gray-400">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {asset.recent_activity.map((h, i) => (
              <div key={i} className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 shrink-0" />
                <div>
                  <p className="text-sm text-gray-900">{h.description || h.action}</p>
                  <p className="text-xs text-gray-400">{new Date(h.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link
        href={`/assets/${code}/report`}
        className="block w-full py-3 bg-red-600 text-white rounded-xl text-center font-medium hover:bg-red-700 transition"
      >
        Report an Issue
      </Link>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-sm text-gray-500">{label}</span>
      <p className="text-sm font-medium text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}
