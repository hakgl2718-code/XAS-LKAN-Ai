"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import type { ChatTurn, GeneratedFile } from "@/db/schema";
import { buildPreviewHtml } from "@/lib/preview";

type ProviderId = "pollinations";

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
  liveModels: boolean;
  hasServerKey: boolean;
}

interface ApiKeyNeed {
  service: string;
  instructions: string;
}

interface GenResponse {
  projectId: number;
  message: string;
  name: string;
  summary: string;
  changed: boolean;
  needsApiKey: ApiKeyNeed | null;
  files: GeneratedFile[];
}

interface HistoryItem {
  id: number;
  name: string;
  summary: string;
  provider: string;
  model: string;
  updatedAt: string;
}

const FALLBACK_PROVIDERS: ProviderInfo[] = [
  {
    id: "pollinations",
    label: "XASİLKAN AI",
    defaultModel: "openai",
    models: ["openai", "openai-fast"],
    modelGroups: [
      {
        label: "Anahtarsız",
        models: [
          { id: "openai", name: "XASİLKAN Kodlama" },
          { id: "openai-fast", name: "XASİLKAN Hızlı" },
        ],
      },
    ],
    liveModels: false,
    hasServerKey: true,
  },
];

const EXAMPLES = [
  "Pomodoro zamanlayıcı yap, çalış/mola döngüsü ve ses uyarısı olsun",
  "Yapılacaklar listesi, sürükle-bırak ve kaydetme özelliğiyle",
  "Tetris oyunu yap, klavye kontrolü ve skor tablosu olsun",
  "Hava durumu uygulaması yap",
  "Hesap makinesi, koyu tema ve klavye desteğiyle",
];

export default function Studio() {
  const [providers, setProviders] = useState<ProviderInfo[]>(FALLBACK_PROVIDERS);
  const [provider, setProvider] = useState<ProviderId>("pollinations");
  const [model, setModel] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [projectId, setProjectId] = useState<number | null>(null);
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [projectName, setProjectName] = useState("");
  const [apiNeed, setApiNeed] = useState<ApiKeyNeed | null>(null);

  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [activeFile, setActiveFile] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [previewKey, setPreviewKey] = useState(0);

  const [liveGroups, setLiveGroups] = useState<ModelGroup[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelFilter, setModelFilter] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then((j) => setProviders(j.providers ?? []))
      .catch(() => {});
    const p = localStorage.getItem("xa_provider") as ProviderId | null;
    const m = localStorage.getItem("xa_model");
    const k = localStorage.getItem("xa_apikey");
    if (p === "pollinations") setProvider(p);
    if (m) setModel(m);
    if (k) setApiKey(k);
    loadHistory();
  }, []);

  const currentProvider = useMemo(
    () => providers.find((p) => p.id === provider),
    [providers, provider],
  );
  const keyReady = Boolean(apiKey.trim() || currentProvider?.hasServerKey);

  // Which groups to show: live catalogue (if fetched) else the curated list.
  const displayGroups: ModelGroup[] = useMemo(() => {
    const base =
      liveGroups.length && currentProvider?.liveModels
        ? liveGroups
        : (currentProvider?.modelGroups ?? []);
    const q = modelFilter.trim().toLowerCase();
    if (!q) return base;
    return base
      .map((g) => ({
        label: g.label,
        models: g.models.filter(
          (m) =>
            m.id.toLowerCase().includes(q) ||
            m.name.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.models.length > 0);
  }, [liveGroups, currentProvider, modelFilter]);

  const allModelIds = useMemo(
    () => displayGroups.flatMap((g) => g.models.map((m) => m.id)),
    [displayGroups],
  );

  useEffect(() => {
    // reset live catalogue + filter when switching provider
    setLiveGroups([]);
    setModelFilter("");
  }, [provider]);

  useEffect(() => {
    if (currentProvider && !currentProvider.models.includes(model) && !liveGroups.length) {
      setModel(currentProvider.defaultModel);
    }
  }, [currentProvider, model, liveGroups.length]);

  async function loadLiveModels() {
    setLoadingModels(true);
    try {
      const r = await fetch("/api/models");
      const j = await r.json();
      if (Array.isArray(j.groups) && j.groups.length) {
        setLiveGroups(j.groups);
      }
    } catch {
      /* fall back to curated list */
    } finally {
      setLoadingModels(false);
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, loading]);

  const loadHistory = useCallback(async () => {
    try {
      const r = await fetch("/api/projects", { cache: "no-store" });
      const j = await r.json();
      setHistory(j.items ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  const previewHtml = useMemo(
    () => (files.length ? buildPreviewHtml(files) : ""),
    [files],
  );

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || loading) return;

    localStorage.setItem("xa_provider", provider);
    localStorage.setItem("xa_model", model);
    localStorage.setItem("xa_apikey", apiKey);

    const priorHistory = chat;
    setChat([...priorHistory, { role: "user", content: message }]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          message,
          history: priorHistory,
          files,
          provider,
          model,
          apiKey,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Üretim başarısız.");
      const data = json as GenResponse;

      setProjectId(data.projectId);
      setChat((c) => [...c, { role: "assistant", content: data.message }]);
      setProjectName(data.name);
      setApiNeed(data.needsApiKey);
      if (data.changed && data.files.length) {
        setFiles(data.files);
        setActiveFile(0);
        setTab("preview");
        setPreviewKey((k) => k + 1);
      }
      loadHistory();
    } catch (err) {
      setError((err as Error).message);
      // roll back the optimistic user bubble's partner (keep user msg, show error)
    } finally {
      setLoading(false);
    }
  }

  function newProject() {
    setProjectId(null);
    setChat([]);
    setFiles([]);
    setProjectName("");
    setApiNeed(null);
    setError(null);
    setInput("");
  }

  async function loadProject(id: number) {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/projects?id=${id}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      const p = j.project;
      setProjectId(p.id);
      setChat(Array.isArray(p.messages) ? p.messages : []);
      setFiles(Array.isArray(p.files) ? p.files : []);
      setProjectName(p.name);
      setApiNeed(null);
      setActiveFile(0);
      setTab("preview");
      setPreviewKey((k) => k + 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function downloadZip() {
    if (!files.length) return;
    const zip = new JSZip();
    for (const f of files) zip.file(f.path, f.content);
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(projectName || "proje").replace(/[^\w-]+/g, "_")}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openInNewTab() {
    const w = window.open();
    if (w) {
      w.document.open();
      w.document.write(previewHtml);
      w.document.close();
    }
  }

  const hasProject = files.length > 0;

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-200">
            🛠️ Uygulama
          </span>
          <span className="text-[11px] text-slate-500">
            sohbet ederek üret & düzelt
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={newProject}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5"
          >
            + Yeni
          </button>
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5"
          >
            ⚙️{" "}
            {keyReady ? (
              <span className="text-emerald-400">hazır</span>
            ) : (
              <span className="text-amber-400">hazırlanıyor</span>
            )}
          </button>
        </div>
      </header>

      {/* Settings */}
      {showSettings && (
        <div className="shrink-0 border-b border-white/10 bg-slate-900 px-4 py-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block text-slate-400">Sağlayıcı</span>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as ProviderId)}
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 flex items-center justify-between text-slate-400">
                <span>
                  Model{" "}
                  <span className="text-slate-500">
                    ({allModelIds.length})
                  </span>
                </span>
                {currentProvider?.liveModels && (
                  <button
                    type="button"
                    onClick={loadLiveModels}
                    disabled={loadingModels}
                    className="text-[11px] text-indigo-400 hover:underline disabled:opacity-50"
                  >
                    {loadingModels
                      ? "yükleniyor…"
                      : liveGroups.length
                        ? "↻ yenile"
                        : "🌐 tüm modelleri getir"}
                  </button>
                )}
              </span>
              {(liveGroups.length > 0 || (currentProvider?.models.length ?? 0) > 12) && (
                <input
                  value={modelFilter}
                  onChange={(e) => setModelFilter(e.target.value)}
                  placeholder="model ara… (ör. claude, llama, free)"
                  className="mb-1 w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-xs"
                />
              )}
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2"
              >
                {displayGroups.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
                {/* keep current selection valid even if filtered out */}
                {!allModelIds.includes(model) && model && (
                  <optgroup label="Seçili">
                    <option value={model}>{model}</option>
                  </optgroup>
                )}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-400">
                API Anahtarı <span className="text-emerald-400">(gerekmez)</span>
              </span>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Anahtarsız kullanım açık — boş bırak"
                disabled
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2"
              />
            </label>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            API anahtarı isteyen modeller kaldırıldı. Kodlama ajanı anahtarsız
            XASİLKAN Kodlama modeliyle, sohbet ise hızlı XASİLKAN Hızlı modeliyle çalışır.
          </p>
        </div>
      )}

      {/* Body: chat left, preview right */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[400px_1fr]">
        {/* Chat column */}
        <section className="flex min-h-0 flex-col border-r border-white/10">
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {chat.length === 0 && !loading && (
              <div className="mt-8 text-center">
                <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-2xl">
                  💬
                </div>
                <h2 className="font-bold">Ne inşa edelim?</h2>
                <p className="mx-auto mt-1 max-w-xs text-sm text-slate-400">
                  Uygulamanı anlat, üreteyim. Sonra “şurada hata var düzelt” ya da
                  “şu özelliği ekle” diyerek benimle konuşmaya devam edebilirsin.
                </p>
                <div className="mt-4 flex flex-col gap-1.5">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => send(ex)}
                      disabled={!keyReady}
                      className="rounded-lg border border-white/10 px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/5 disabled:opacity-40"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
                {!keyReady && (
                  <p className="mt-3 text-xs text-amber-400">
                    Anahtarsız model hazırlanıyor, tekrar dene.
                  </p>
                )}
              </div>
            )}

            {chat.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm ${
                    m.role === "user"
                      ? "bg-indigo-500 text-white"
                      : "border border-white/10 bg-slate-900 text-slate-100"
                  }`}
                >
                  {m.role === "assistant" && (
                    <span className="mb-1 block text-[11px] font-semibold text-fuchsia-400">
                      XASİLKAN AJAN
                    </span>
                  )}
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-400">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-fuchsia-400 [animation-delay:-0.2s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-fuchsia-400 [animation-delay:-0.1s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-fuchsia-400" />
                  <span className="ml-1">yazıyor & kod üretiyor…</span>
                </div>
              </div>
            )}

            {apiNeed && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                <div className="mb-1 font-semibold">
                  🔑 Bu uygulama {apiNeed.service} anahtarı gerektiriyor
                </div>
                <p>{apiNeed.instructions}</p>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {error}
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Composer */}
          <div className="shrink-0 border-t border-white/10 p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={2}
                placeholder={
                  hasProject
                    ? "Değişiklik iste ya da hatayı anlat… (Enter ile gönder)"
                    : "Uygulamanı anlat… (Enter ile gönder)"
                }
                className="flex-1 resize-none rounded-xl border border-white/10 bg-slate-800 p-3 text-sm outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => send()}
                disabled={loading || !input.trim() || !keyReady}
                className="h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 text-sm font-semibold text-white disabled:opacity-40"
              >
                {loading ? "…" : hasProject ? "Gönder" : "Üret"}
              </button>
            </div>

            {/* History */}
            {history.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-300">
                  Geçmiş projeler ({history.length})
                </summary>
                <ul className="mt-1 max-h-32 space-y-0.5 overflow-y-auto">
                  {history.map((h) => (
                    <li key={h.id}>
                      <button
                        onClick={() => loadProject(h.id)}
                        className={`w-full truncate rounded-md px-2 py-1 text-left text-xs hover:bg-white/5 ${h.id === projectId ? "text-indigo-400" : "text-slate-400"}`}
                      >
                        {h.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </section>

        {/* Preview / code column */}
        <section className="flex min-h-0 flex-col bg-slate-900">
          {!hasProject ? (
            <div className="grid flex-1 place-items-center p-8 text-center">
              <div>
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-3xl">
                  🤖
                </div>
                <h2 className="text-xl font-bold">Önizleme burada görünecek</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                  Sol taraftan bir istek gönder; ajan uygulamayı üretsin, canlı ve
                  tıklanabilir önizlemesi burada belirsin.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 p-3">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">{projectName}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg border border-white/10 p-0.5 text-sm">
                    <button
                      onClick={() => setTab("preview")}
                      className={`rounded-md px-3 py-1 ${tab === "preview" ? "bg-indigo-500 text-white" : "text-slate-300"}`}
                    >
                      Önizleme
                    </button>
                    <button
                      onClick={() => setTab("code")}
                      className={`rounded-md px-3 py-1 ${tab === "code" ? "bg-indigo-500 text-white" : "text-slate-300"}`}
                    >
                      Kod ({files.length})
                    </button>
                  </div>
                  {tab === "preview" && (
                    <button
                      onClick={() => setPreviewKey((k) => k + 1)}
                      className="rounded-lg border border-white/10 px-2.5 py-1 text-sm hover:bg-white/5"
                      title="Yenile"
                    >
                      ⟳
                    </button>
                  )}
                  <button
                    onClick={openInNewTab}
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-sm hover:bg-white/5"
                    title="Yeni sekmede aç"
                  >
                    ↗
                  </button>
                  <button
                    onClick={downloadZip}
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-sm hover:bg-white/5"
                  >
                    ⬇ ZIP
                  </button>
                </div>
              </div>

              {tab === "preview" ? (
                <iframe
                  key={previewKey}
                  title="Canlı önizleme"
                  srcDoc={previewHtml}
                  sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups allow-downloads"
                  className="min-h-0 flex-1 bg-white"
                />
              ) : (
                <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
                  <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/10 p-2 sm:w-52 sm:flex-col sm:overflow-y-auto sm:border-b-0 sm:border-r">
                    {files.map((f, i) => (
                      <button
                        key={f.path}
                        onClick={() => setActiveFile(i)}
                        className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-left text-xs ${i === activeFile ? "bg-indigo-500 text-white" : "text-slate-300 hover:bg-white/5"}`}
                      >
                        {f.path}
                      </button>
                    ))}
                  </div>
                  <pre className="min-h-0 flex-1 overflow-auto p-4 text-xs leading-relaxed">
                    <code>{files[activeFile]?.content}</code>
                  </pre>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
