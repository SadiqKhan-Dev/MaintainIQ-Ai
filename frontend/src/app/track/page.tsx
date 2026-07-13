"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function TrackPage() {
  const router = useRouter();
  const [number, setNumber] = useState("");

  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <Link href="/" className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block">&larr; Home</Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Track Your Issue</h1>
      <p className="text-sm text-gray-500 mb-6">Enter the issue number you received after reporting (e.g. ISS-00001) to check its current status.</p>
      <form onSubmit={(e) => { e.preventDefault(); if (number.trim()) router.push(`/track/${number.trim()}`); }} className="flex gap-3">
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="ISS-00001"
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button className="px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Track</button>
      </form>
    </div>
  );
}
