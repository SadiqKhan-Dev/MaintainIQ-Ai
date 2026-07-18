"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

type ChatMessage = { role: "user" | "assistant"; content: string };
type UpdatedAsset = { id: string; asset_code: string; name: string; category: string; location: string; status: string };

export default function EditAssetWithAI({
  assetCode,
  onUpdated,
  onClose,
}: {
  assetCode: string;
  onUpdated: () => void;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Hi! Tell me what you'd like to change on ${assetCode} and I'll ask a few quick questions, then apply the update once you confirm.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [updated, setUpdated] = useState<UpdatedAsset | null>(null);

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
      if (data.asset) {
        setUpdated(data.asset);
        onUpdated();
      }
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

  return (
    <div className="bg-white rounded-xl border border-purple-200 p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-purple-600">✨</span> Edit with AI
        </h3>
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-800">Close</button>
      </div>

      <div className="bg-gray-50 rounded-xl border border-gray-200 flex flex-col" style={{ height: "340px" }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-purple-600 text-white rounded-br-sm"
                    : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 text-gray-500 px-3.5 py-2 rounded-2xl rounded-bl-sm text-sm">Thinking…</div>
            </div>
          )}
          {updated && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-sm font-semibold text-green-800 mb-1">Asset updated ✓</p>
              <p className="text-sm text-green-700">{updated.asset_code} — {updated.name}</p>
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
            placeholder={`e.g. Move ${assetCode} to the basement and set condition to poor`}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
