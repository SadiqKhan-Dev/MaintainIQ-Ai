"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type ChatMessage = { role: "user" | "assistant"; content: string };
type CreatedAsset = { id: string; asset_code: string; name: string; category: string; location: string; status: string };

export default function AIAssetAssistantPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I can register a new asset for you. Tell me what you'd like to add and I'll ask a few quick questions, then create it once you confirm.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedAsset | null>(null);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const data = await apiFetch("/api/ai/asset-assistant", {
        method: "POST",
        body: JSON.stringify({ message: text, session_id: sessionId }),
      });
      setSessionId(data.session_id ?? sessionId);
      setMessages([...next, { role: "assistant" as const, content: data.reply }]);
      if (data.asset) setCreated(data.asset);
    } catch (err: unknown) {
      setMessages([
        ...next,
        {
          role: "assistant" as const,
          content: err instanceof Error ? `Error: ${err.message}` : "Something went wrong talking to the assistant.",
        },
      ]);
    }
    setLoading(false);
  }

  function reset() {
    setMessages([
      {
        role: "assistant",
        content: "Started a new session. What asset would you like to add?",
      },
    ]);
    setSessionId(null);
    setCreated(null);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/dashboard/assets" className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block">
        &larr; Back to Assets
      </Link>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-900">AI Asset Assistant</h1>
        <button onClick={reset} className="text-sm text-gray-500 hover:text-gray-800">
          Start over
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Describe an asset in plain language. The assistant collects details, confirms with you, then creates the asset.
      </p>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col" style={{ height: "60vh" }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-800 rounded-bl-sm"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-500 px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm">Thinking…</div>
            </div>
          )}
          {created && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-green-800 mb-1">Asset created successfully ✓</p>
              <p className="text-sm text-green-700 mb-3">
                <span className="font-mono">{created.asset_code}</span> — {created.name}
              </p>
              <div className="flex gap-3">
                <Link
                  href={`/dashboard/assets/${created.asset_code}`}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700"
                >
                  View Asset
                </Link>
                <button
                  onClick={() => router.push("/dashboard/assets")}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  View All Assets
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="e.g. Add a new water pump in the basement, condition good"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
