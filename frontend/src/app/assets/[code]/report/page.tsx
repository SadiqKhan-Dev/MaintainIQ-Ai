"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, API_BASE } from "@/lib/api";
import { PublicAsset, AITriage } from "@/lib/types";

type TriageStep = "form" | "triaging" | "review" | "submitting" | "done";

export default function ReportIssuePage() {
  const params = useParams();
  const code = params.code as string;
  const [asset, setAsset] = useState<PublicAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [step, setStep] = useState<TriageStep>("form");
  const [description, setDescription] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterContact, setReporterContact] = useState("");
  const [triage, setTriage] = useState<AITriage | null>(null);
  const [formData, setFormData] = useState({ title: "", category: "", priority: "medium" });
  const [issueNumber, setIssueNumber] = useState("");
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/assets/${code}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setAsset)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [code]);

  async function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    setStep("triaging");

    try {
      const res = await fetch(`${API_BASE}/api/issues/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_code: code,
          description,
          reporter_name: reporterName || undefined,
          reporter_contact: reporterContact || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to submit");

      setIssueNumber(data.issue_number);
      if (data.ai_triage) {
        setTriage(data.ai_triage);
        setFormData({
          title: data.ai_triage.title || "",
          category: data.ai_triage.category || "",
          priority: data.ai_triage.priority || "medium",
        });
        setStep("review");
      } else {
        setFormData({ title: data.title || description.slice(0, 100), category: "Other", priority: "medium" });
        setStep("review");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit");
      setStep("form");
    }
  }

  async function handleConfirmIssue() {
    setStep("submitting");
    try {
      await fetch(`${API_BASE}/api/issues/${issueNumber ? await getIssueId() : ""}/confirm`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description,
          category: formData.category,
          priority: formData.priority,
          reporter_name: reporterName || undefined,
        }),
      }).catch(() => {});

      setStep("done");
    } catch {
      setStep("review");
    }
  }

  async function getIssueId(): Promise<string> {
    try {
      const issues = await apiFetch("/api/issues");
      const issue = issues.find((i: { issue_number: string; id: string }) => i.issue_number === issueNumber);
      return issue?.id || "";
    } catch {
      return "";
    }
  }

  async function handleTranslate() {
    if (!description.trim()) return;
    setTranslating(true);
    try {
      const data = await fetch(`${API_BASE}/api/ai/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: description }),
      }).then((r) => r.json());
      if (data.translated) setDescription(data.translated);
    } catch {
    }
    setTranslating(false);
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error && !asset) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Asset Not Found</h1>
        <p className="text-gray-500">No asset found with code &ldquo;{code}&rdquo;</p>
        <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">Go Home</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href={`/assets/${code}`} className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block">
        &larr; Back to {code}
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Report Issue</h1>
        {asset?.is_retired && (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-800 text-white">Retired</span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>
      )}

      {step === "form" && (
        <form onSubmit={handleSubmitForm} className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Asset:</span> {asset?.name} ({code})
            </p>
            <p className="text-sm text-gray-500 mt-1">{asset?.location} &middot; {asset?.category}</p>
          </div>

          <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Describe the issue *</label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what you observed — our AI will help triage this issue..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button type="button" onClick={handleTranslate} disabled={translating || !description.trim()} className="mt-2 text-xs text-purple-600 hover:text-purple-800 font-medium disabled:opacity-50">
                  {translating ? "Translating..." : "Translate Roman Urdu / Urdu to English"}
                </button>
              </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name (optional)</label>
                <input type="text" value={reporterName} onChange={(e) => setReporterName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact (optional)</label>
                <input type="text" value={reporterContact} onChange={(e) => setReporterContact(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>
          </div>

          <button type="submit" className="mt-6 w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition">
            Submit Issue Report
          </button>
        </form>
      )}

      {step === "triaging" && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4" />
          <p className="text-gray-600 font-medium">AI is triaging your issue...</p>
          <p className="text-sm text-gray-400 mt-1">Analyzing asset history and classifying the problem</p>
        </div>
      )}

      {step === "review" && (
        <div className="space-y-4">
          {triage && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-purple-900 mb-2">AI Triage Results</h3>
              {triage.possible_causes.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-purple-600 font-medium">Possible Causes:</p>
                  <ul className="text-sm text-purple-800 ml-4 list-disc">
                    {triage.possible_causes.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}
              {triage.initial_checks.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-purple-600 font-medium">Initial Checks:</p>
                  <ul className="text-sm text-purple-800 ml-4 list-disc">
                    {triage.initial_checks.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}
              {triage.recurring_pattern_warning && (
                <p className="text-sm text-amber-700 bg-amber-50 p-2 rounded mt-2">{triage.recurring_pattern_warning}</p>
              )}
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Review & Edit (if needed)</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input type="text" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600"><span className="font-medium">Description:</span> {description}</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleConfirmIssue} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition">
                Confirm & Save Issue
              </button>
              <button onClick={() => setStep("form")} className="px-6 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition">
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "submitting" && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Saving your issue...</p>
        </div>
      )}

      {step === "done" && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Issue Reported!</h2>
          <p className="text-gray-500 mb-2">Issue number: <span className="font-mono font-medium text-gray-900">{issueNumber}</span></p>
           <p className="text-sm text-gray-400 mb-6">Our team will review and assign this issue shortly.</p>
           <div className="flex gap-3 justify-center">
             <Link href={`/track/${issueNumber}`} className="inline-block px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">
               Track Status
             </Link>
             <Link href={`/assets/${code}`} className="inline-block px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
               Back to Asset
             </Link>
           </div>
        </div>
      )}
    </div>
  );
}
