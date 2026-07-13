"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { API_BASE } from "@/lib/api";
import { STATUS_COLORS, PRIORITY_COLORS } from "@/lib/types";

interface TrackStatus {
  issue_number: string;
  title: string;
  status: string;
  priority: string;
  category: string | null;
  created_at: string;
  updated_at: string;
  asset_code: string | null;
  asset_name: string | null;
}

export default function TrackDetailPage() {
  const params = useParams();
  const number = params.number as string;
  const [data, setData] = useState<TrackStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/issues/track/${number}`)
      .then((r) => { if (!r.ok) throw new Error("Issue not found"); return r.json(); })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [number]);

  if (loading) return <div className="max-w-xl mx-auto px-4 py-16"><div className="h-8 bg-gray-200 rounded w-64 animate-pulse" /></div>;
  if (error || !data) return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Not Found</h1>
      <p className="text-gray-500">{error}</p>
      <Link href="/track" className="mt-4 inline-block text-blue-600 hover:underline">Try another number</Link>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <Link href="/track" className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block">&larr; Track another</Link>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900 font-mono">{data.issue_number}</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${STATUS_COLORS[data.status] || "bg-gray-100"}`}>{data.status.replace(/_/g, " ")}</span>
        </div>
        <h2 className="font-semibold text-gray-900">{data.title}</h2>
        {data.asset_name && <p className="text-sm text-gray-500 mt-1">{data.asset_name} ({data.asset_code})</p>}
        <div className="flex items-center gap-2 mt-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${PRIORITY_COLORS[data.priority] || "bg-gray-100"}`}>{data.priority}</span>
          <span className="text-xs text-gray-400">Reported {new Date(data.created_at).toLocaleString()}</span>
        </div>
        <p className="text-sm text-gray-400 mt-4">Last updated {new Date(data.updated_at).toLocaleString()}</p>
      </div>
    </div>
  );
}
