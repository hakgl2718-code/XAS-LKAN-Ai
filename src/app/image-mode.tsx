"use client";

import { useEffect, useState } from "react";

interface GenImage {
  prompt: string;
  url: string;
  loaded: boolean;
}

const MODELS = [
  { id: "flux", name: "Flux (kaliteli)" },
  { id: "flux-realism", name: "Flux Realism (foto-gerçekçi)" },
  { id: "flux-anime", name: "Flux Anime" },
  { id: "flux-3d", name: "Flux 3D" },
  { id: "turbo", name: "Turbo (hızlı)" },
];

const SIZES = [
  { id: "1024x1024", name: "Kare 1024²" },
  { id: "1280x720", name: "Yatay 16:9" },
  { id: "720x1280", name: "Dikey 9:16" },
  { id: "1024x1536", name: "Portre 2:3" },
];

const EXAMPLES = [
  "Neon ışıklı fütüristik bir şehir, yağmurlu gece",
  "Sevimli bir robot maskot, çıkartma tarzı",
  "Dağların ardında gün batımı, yağlı boya",
  "Uzayda süzülen bir astronot kedi",
];

export default function ImageMode() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("flux");
  const [size, setSize] = useState("1024x1024");
  const [enhance, setEnhance] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<GenImage[]>([]);

  // load provider settings for optional prompt enhancement
  const [provider, setProvider] = useState("gemini");
  const [llmModel, setLlmModel] = useState("");
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    setProvider(localStorage.getItem("xa_provider") || "gemini");
    setLlmModel(localStorage.getItem("xa_model") || "");
    setApiKey(localStorage.getItem("xa_apikey") || "");
    const saved = localStorage.getItem("xa_images");
    if (saved) {
      try {
        setImages(JSON.parse(saved));
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("xa_images", JSON.stringify(images.slice(0, 24)));
  }, [images]);

  async function enhancePrompt(raw: string): Promise<string> {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model: llmModel,
          apiKey,
          message: `Aşağıdaki görsel fikrini, yapay zeka görsel üreticisi için detaylı, İngilizce, tek satırlık bir prompt'a çevir. Işık, stil, kompozisyon detayları ekle. SADECE prompt'u döndür, açıklama yapma:\n\n"${raw}"`,
          history: [],
        }),
      });
      const json = await res.json();
      if (res.ok && json.reply) {
        return json.reply.replace(/^["'\s]+|["'\s]+$/g, "").slice(0, 600);
      }
    } catch {
      /* fall back to raw prompt */
    }
    return raw;
  }

  async function generate(text?: string) {
    const raw = (text ?? prompt).trim();
    if (!raw || busy) return;
    setBusy(true);
    setError(null);
    try {
      const finalPrompt = enhance ? await enhancePrompt(raw) : raw;
      const [w, h] = size.split("x");
      const seed = Math.floor(Math.random() * 1_000_000);
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
        finalPrompt,
      )}?width=${w}&height=${h}&nologo=true&model=${model}&seed=${seed}`;
      setImages((imgs) => [{ prompt: raw, url, loaded: false }, ...imgs]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function download(img: GenImage) {
    try {
      const res = await fetch(img.url);
      const blob = await res.blob();
      const u = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = u;
      a.download = `${img.prompt.slice(0, 30).replace(/[^\w-]+/g, "_") || "gorsel"}.jpg`;
      a.click();
      URL.revokeObjectURL(u);
    } catch {
      window.open(img.url, "_blank");
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* controls */}
      <div className="shrink-0 border-b border-white/10 p-4">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-200">🎨 Görsel</span>
          </div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  generate();
                }
              }}
              rows={2}
              placeholder="Ne çizelim? (Enter ile üret)"
              className="flex-1 resize-none rounded-xl border border-white/10 bg-slate-800 p-3 text-sm outline-none focus:border-fuchsia-500"
            />
            <button
              onClick={() => generate()}
              disabled={busy || !prompt.trim()}
              className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 sm:self-stretch"
            >
              {busy ? "Üretiliyor…" : "✨ Üret"}
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="rounded-lg border border-white/10 bg-slate-800 px-2 py-1"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="rounded-lg border border-white/10 bg-slate-800 px-2 py-1"
            >
              {SIZES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <label className="flex cursor-pointer items-center gap-1.5 text-slate-300">
              <input
                type="checkbox"
                checked={enhance}
                onChange={(e) => setEnhance(e.target.checked)}
                className="accent-fuchsia-500"
              />
              ✨ AI ile promptu zenginleştir
            </label>
            <div className="flex flex-wrap gap-1">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => {
                    setPrompt(ex);
                    generate(ex);
                  }}
                  className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-slate-400 hover:bg-white/5"
                >
                  {ex.slice(0, 22)}…
                </button>
              ))}
            </div>
          </div>
          {error && (
            <div className="mt-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* gallery */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-5xl">
          {images.length === 0 ? (
            <div className="mt-16 text-center">
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-pink-500 text-2xl">
                🎨
              </div>
              <h2 className="font-bold">Görsellerin burada belirecek</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">
                Bir fikir yaz, gerçek bir yapay zeka modeli senin için görsel
                üretsin. Türkçe yazabilirsin; “zenginleştir” açıksa ajan promptunu
                otomatik geliştirir.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {images.map((img, i) => (
                <div
                  key={i}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-slate-900"
                >
                  {!img.loaded && (
                    <div className="absolute inset-0 grid place-items-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/10 border-t-fuchsia-500" />
                    </div>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.prompt}
                    className="aspect-square w-full object-cover"
                    onLoad={() =>
                      setImages((imgs) =>
                        imgs.map((im, idx) =>
                          idx === i ? { ...im, loaded: true } : im,
                        ),
                      )
                    }
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                    <span className="line-clamp-2 text-[11px] text-white/90">
                      {img.prompt}
                    </span>
                    <button
                      onClick={() => download(img)}
                      className="shrink-0 rounded-lg bg-white/20 px-2 py-1 text-xs text-white backdrop-blur hover:bg-white/30"
                    >
                      ⬇
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
