"use client";
import Link from "next/link";
import { useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

const FEATURES = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    title: "Role-Based Access",
    description: "Admins manage assets and assign work. Technicians update issues and log maintenance. Public users report problems instantly.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: "AI Issue Triage",
    description: "Every reported issue is automatically analyzed by AI. It categorizes problems, suggests priorities, identifies possible causes, and flags recurring patterns.",
    color: "bg-purple-50 text-purple-600",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
      </svg>
    ),
    title: "QR Code Scanning",
    description: "Each asset gets a unique QR code. Anyone can scan it to view the asset's status, history, and report an issue in seconds.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    title: "State Machine Workflow",
    description: "Issues follow a strict lifecycle: reported, assigned, inspection, maintenance, resolved. No step can be skipped. Every transition is enforced server-side.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Cost & Parts Tracking",
    description: "Log every repair with parts replaced, labor cost, and technician notes. Get a clear picture of maintenance spending across all assets.",
    color: "bg-rose-50 text-rose-600",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Permanent Asset History",
    description: "Every action — creation, issue report, assignment, status change, maintenance — is recorded in an immutable timeline for full auditability.",
    color: "bg-indigo-50 text-indigo-600",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Scan the QR Code",
    description: "Point your phone camera at any asset's QR code sticker. You'll be taken to the asset's public page instantly.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
      </svg>
    ),
  },
  {
    step: "02",
    title: "Report the Issue",
    description: "Describe the problem in plain language. Our AI automatically categorizes it, assigns priority, and suggests possible causes.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
  },
  {
    step: "03",
    title: "Assign & Work",
    description: "Admins assign the issue to a qualified technician. The technician updates status through each stage and logs maintenance details.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    step: "04",
    title: "Resolve & Record",
    description: "Once fixed, the technician logs work performed, parts, and cost. The issue is resolved and the asset returns to operational status.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const ASSET_CATEGORIES = [
  { name: "HVAC", count: "Climate Control", icon: "\u2601\uFE0F" },
  { name: "Electrical", count: "Power Systems", icon: "\u26A1" },
  { name: "Plumbing", count: "Water & Drainage", icon: "\uD83D\uDCA7" },
  { name: "Safety", count: "Fire & Emergency", icon: "\uD83D\uDEA8" },
  { name: "Security", count: "Access & Surveillance", icon: "\uD83D\uDD12" },
  { name: "Structural", count: "Building & Fixtures", icon: "\uD83C\uDFD7\uFE0F" },
];

const STATUS_FLOW = [
  { label: "Reported", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { label: "Assigned", color: "bg-blue-100 text-blue-800 border-blue-300" },
  { label: "Inspection", color: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  { label: "Maintenance", color: "bg-orange-100 text-orange-800 border-orange-300" },
  { label: "Resolved", color: "bg-green-100 text-green-800 border-green-300" },
  { label: "Closed", color: "bg-gray-100 text-gray-600 border-gray-300" },
];

export default function HomePage() {
  useEffect(() => {
    // Parallax or scroll effects can be added here
  }, []);

  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                AI-Powered Maintenance Intelligence
              </div>
              <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                Smarter Maintenance,
                <br />
                <span className="text-blue-200">Zero Guesswork</span>
              </h1>
              <p className="text-lg text-blue-100 mb-8 max-w-lg leading-relaxed">
                MaintainIQ transforms how facilities manage assets. Scan a QR code, report a problem in plain language, and let AI triage, prioritize, and route it to the right technician automatically.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/dashboard"
                  className="px-8 py-3.5 bg-white text-blue-700 rounded-xl font-semibold hover:bg-blue-50 transition shadow-lg shadow-blue-900/30"
                >
                  Open Dashboard
                </Link>
                <Link
                  href="/dashboard/assets"
                  className="px-8 py-3.5 bg-white/10 backdrop-blur-sm border border-white/30 text-white rounded-xl font-semibold hover:bg-white/20 transition"
                >
                  Browse Assets
                </Link>
              </div>
              <div className="flex items-center gap-8 mt-10 text-sm text-blue-200">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Server-enforced rules
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Full audit trail
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  AI triage built-in
                </div>
              </div>
            </div>
            <div className="hidden lg:block relative">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="ml-2 text-xs text-blue-200 font-mono">maintainiq.app</span>
                </div>
                <div className="bg-white rounded-xl p-5 text-gray-900">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs text-gray-400">Asset</p>
                      <p className="font-semibold">HVAC-001</p>
                    </div>
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium border border-emerald-200">
                      Operational
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-blue-600">12</p>
                      <p className="text-[10px] text-gray-400">Open Issues</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-emerald-600">87%</p>
                      <p className="text-[10px] text-gray-400">Uptime</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-orange-600">$2.4k</p>
                      <p className="text-[10px] text-gray-400">This Month</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">AI</span>
                      <span className="text-gray-600">Lubrication needed on main bearing</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded font-medium">HIGH</span>
                      <span className="text-gray-600">Water pump noise reported</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-medium">CRIT</span>
                      <span className="text-gray-600">Fire alarm panel fault</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-4 flex items-center gap-3 border border-gray-100">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">AI Triage</p>
                  <p className="text-xs text-gray-400">Auto-classified in 2.3s</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "99.9%", label: "Enforced Server-Side", sublabel: "No client-side hacks" },
              { value: "<3s", label: "AI Triage Speed", sublabel: "From report to classified" },
              { value: "100%", label: "Audit Coverage", sublabel: "Every action logged" },
              { value: "0", label: "Skipped Steps", sublabel: "Strict state machine" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-extrabold text-gray-900">{stat.value}</p>
                <p className="text-sm font-medium text-gray-700 mt-1">{stat.label}</p>
                <p className="text-xs text-gray-400">{stat.sublabel}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-2">How It Works</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">From Scan to Resolution in 4 Steps</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Anyone can report an issue by scanning a QR code. AI handles triage. Technicians follow a guided workflow. Admins see everything.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.step} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-blue-200 to-transparent z-0" />
                )}
                <div className="relative bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition">
                      {s.icon}
                    </div>
                    <span className="text-xs font-bold text-blue-300">{s.step}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-2">Features</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Built for Real Facility Operations</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Every feature is designed around the realities of maintaining physical assets at scale.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="group p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition">
                <div className={`w-12 h-12 ${f.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition`}>
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* State Machine Visualization */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-2">Enforced Workflow</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Strict State Machine, Zero Shortcuts</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Every issue must follow the defined path. No status can be skipped or reversed. The backend rejects any invalid transition.</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {STATUS_FLOW.map((s, i) => (
                <div key={s.label} className="flex items-center gap-3">
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${s.color}`}>
                    {s.label}
                  </span>
                  {i < STATUS_FLOW.length - 1 && (
                    <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-gray-100 grid md:grid-cols-3 gap-4 text-center">
              <div className="bg-yellow-50 rounded-xl p-4">
                <p className="text-sm font-semibold text-yellow-800">Resolved / Closed</p>
                <p className="text-xs text-yellow-600 mt-1">Can always reopen if problem returns</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm font-semibold text-blue-800">Maintenance</p>
                <p className="text-xs text-blue-600 mt-1">Can pause for parts, then resume</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4">
                <p className="text-sm font-semibold text-red-800">Resolve Guard</p>
                <p className="text-xs text-red-600 mt-1">Requires at least one maintenance record</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Asset Categories */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-2">Asset Coverage</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Manage Every Type of Facility Asset</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">From HVAC systems to fire safety equipment, MaintainIQ handles the full spectrum of facility assets.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {ASSET_CATEGORIES.map((cat) => (
              <div key={cat.name} className="flex items-center gap-4 p-5 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition cursor-pointer group">
                <div className="text-3xl">{cat.icon}</div>
                <div>
                  <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition">{cat.name}</p>
                  <p className="text-sm text-gray-400">{cat.count}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Public Asset Page Preview */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-2">Public-Facing</p>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Anyone Can Scan and Report</h2>
              <p className="text-gray-500 leading-relaxed mb-6">
                No login required. No app to install. Anyone with a phone can scan an asset&apos;s QR code, view its current status, and submit a detailed issue report. Internal details like cost and technician notes are never exposed.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Safe fields only — no cost, no internal notes",
                  "Reporter name and contact are optional",
                  "Retired assets show a clear Retired badge",
                  "Invalid asset codes show a proper not-found page",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <svg className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/dashboard/assets"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
              >
                Try It Now
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <span className="text-xs text-gray-400 font-mono">maintainiq.app/assets/HVAC-001</span>
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Central HVAC Unit</h3>
                      <p className="text-sm text-gray-400 font-mono mt-0.5">HVAC-001</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-1.5">
                      <QRCodeSVG value="https://maintainiq.app/assets/HVAC-001" size={48} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400">Category</p>
                      <p className="text-sm font-medium text-gray-900">HVAC</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400">Location</p>
                      <p className="text-sm font-medium text-gray-900">Building A - Roof</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400">Condition</p>
                      <p className="text-sm font-medium text-gray-900">Good</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400">Status</p>
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Operational
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-xs text-gray-400 mb-2">Recent Activity</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full shrink-0" />
                        <span className="truncate">Status: under_maintenance &rarr; operational</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full shrink-0" />
                        <span className="truncate">Maintenance record added</span>
                      </div>
                    </div>
                  </div>
                  <button className="w-full py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition">
                    Report an Issue
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-semibold text-gray-400 uppercase tracking-wider mb-8">Built With</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-gray-300">
            {["Next.js", "TypeScript", "Tailwind CSS", "FastAPI", "Python", "PostgreSQL", "SQLAlchemy", "Alembic", "Clerk Auth", "Cloudinary", "Anthropic AI", "QR Codes"].map((tech) => (
              <span key={tech} className="text-sm font-medium hover:text-gray-500 transition cursor-default">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Ready to Modernize Your Maintenance?
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            Stop relying on spreadsheets and verbal reports. Start tracking every asset, issue, and repair with AI-powered intelligence.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/dashboard"
              className="px-8 py-3.5 bg-white text-blue-700 rounded-xl font-semibold hover:bg-blue-50 transition shadow-lg"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/dashboard/assets"
              className="px-8 py-3.5 bg-white/10 border border-white/30 text-white rounded-xl font-semibold hover:bg-white/20 transition"
            >
              View Assets
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xs">M</span>
              </div>
              <span className="text-sm font-semibold text-white">MaintainIQ</span>
            </div>
            <p className="text-xs text-gray-500">
              AI-Powered QR Maintenance & Asset History Platform &middot; Built for Hackathon 2026
            </p>
            <div className="flex items-center gap-6 text-xs">
              <Link href="/dashboard" className="hover:text-white transition">Dashboard</Link>
              <Link href="/dashboard/assets" className="hover:text-white transition">Assets</Link>
              <Link href="/dashboard/issues" className="hover:text-white transition">Issues</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
