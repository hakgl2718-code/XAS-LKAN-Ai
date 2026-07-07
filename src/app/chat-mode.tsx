"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ProviderId =
  | "pollinations";

interface ModelEntry {
  id: string;
  name: string;
}
interface ModelGroup {
  label: string;
  models: ModelEntry[];
}
interface ProviderInfo {
  id: ProviderId;
  label: string;
  defaultModel: string;
  models: string[];
  modelGroups: ModelGroup[];
  hasServerKey: boolean;
}
interface Msg {
  role: "user" | "assistant";
  content: string;
}

const FALLBACK_PROVIDERS: ProviderInfo[] = [
  {
    id: "pollinations",
    label: "XASİLKAN AI",
    defaultModel: "openai-fast",
    models: ["openai-fast", "openai"],
    modelGroups: [
      {
        label: "Anahtarsız",
        models: [
          { id: "openai-fast", name: "XASİLKAN Hızlı" },
          { id: "openai", name: "XASİLKAN Kodlama" },
        ],
      },
    ],
    hasServerKey: true,
  },
];

export default function ChatMode() {
  const [providers, setProviders] = useState<ProviderInfo[]>(FALLBACK_PROVIDERS);
  // Chat has its own provider settings and defaults to the keyless XASİLKAN AI.
  const [provider, setProvider] = useState<ProviderId>("pollinations");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then((j) => {
        if (Array.isArray(j.providers) && j.providers.length) {
          setProviders(j.providers);
        }
      })
      .catch(() => {});
    const p = localStorage.getItem("xa_chat_provider") as ProviderId | null;
    const m = localStorage.getItem("xa_chat_model");
    const k = localStorage.getItem("xa_apikey");
    if (p === "pollinations") setProvider(p);
    if (m) setModel(m);
    if (k) setApiKey(k);
    const saved = localStorage.getItem("xa_chat");
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch {
        /* ignore */
      }
    }
  }, []);

  const currentProvider = useMemo(
    () => providers.find((p) => p.id === provider),
    [providers, provider],
  );
  const keyReady = Boolean(apiKey.trim() || currentProvider?.hasServerKey);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    localStorage.setItem("xa_chat", JSON.stringify(messages.slice(-40)));
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const history = messages;
    setMessages([...history, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, provider, model, apiKey }),
      });
      // Defensive parse: read text first so a non-JSON response (timeout,
      // empty body, HTML error page) does not throw an opaque JSON token error.
      const raw = await res.text();
      let json: { reply?: string; error?: string } = {};
      if (raw) {
        try {
          json = JSON.parse(raw);
        } catch {
          throw new Error(
            res.ok
              ? "Sunucudan beklenmeyen bir yanıt geldi. Lütfen tekrar dene."
              : `Sunucu hatası (${res.status}). Lütfen tekrar dene.`,
          );
        }
      }
      if (!res.ok) throw new Error(json.error || `Sohbet başarısız (${res.status}).`);
      if (!json.reply) throw new Error(json.error || "Model boş yanıt döndürdü, tekrar dene.");
      setMessages((m) => [...m, { role: "assistant", content: json.reply as string }]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="text-sm font-semibold text-slate-200">💬 Sohbet</span>
        <select
          value={provider}
          onChange={(e) => {
            const p = e.target.value as ProviderId;
            setProvider(p);
            setModel("");
            localStorage.setItem("xa_chat_provider", p);
          }}
          className="rounded-lg border border-white/10 bg-slate-800 px-2 py-1 text-xs"
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          value={model || currentProvider?.defaultModel || ""}
          onChange={(e) => {
            setModel(e.target.value);
            localStorage.setItem("xa_chat_model", e.target.value);
          }}
          className="max-w-[200px] rounded-lg border border-white/10 bg-slate-800 px-2 py-1 text-xs"
        >
          {(currentProvider?.modelGroups ?? []).map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          onClick={() => {
            setMessages([]);
            localStorage.removeItem("xa_chat");
          }}
          className="ml-auto rounded-lg border border-white/10 px-2.5 py-1 text-xs hover:bg-white/5"
        >
          🗑 Temizle
        </button>
      </div>

      {/* messages */}
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 overflow-y-auto p-4">
        {messages.length === 0 && !loading && (
          <div className="mt-16 text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-2xl">
              💬
            </div>
            <h2 className="font-bold">Bir şey sor, sohbet edelim</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">
              Kod üretmeden normal bir asistan gibi konuşabilirsin — soru sor,
              fikir al, bir şey açıklat.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-indigo-500 text-white"
                  : "border border-white/10 bg-slate-900 text-slate-100"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-400">
              <span className="h-2 w-2 animate-bounce rounded-full bg-sky-400 [animation-delay:-0.2s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-sky-400 [animation-delay:-0.1s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-sky-400" />
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* composer */}
      <div className="shrink-0 border-t border-white/10 p-3">
        <div className="mx-auto flex w-full max-w-3xl items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Mesajını yaz… (Enter ile gönder)"
            className="flex-1 resize-none rounded-xl border border-white/10 bg-slate-800 p-3 text-sm outline-none focus:border-indigo-500"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim() || !keyReady}
            className="h-11 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            Gönder
          </button>
        </div>
        {!keyReady && (
          <p className="mx-auto mt-2 max-w-3xl text-xs text-amber-400">
            Bu model anahtarsız çalışır; tekrar dene.
          </p>
        )}
      </div>
    </div>
  );
}
