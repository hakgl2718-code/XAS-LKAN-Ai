"use client";

import { useState } from "react";
import Studio from "./studio";
import ChatMode from "./chat-mode";
import ImageMode from "./image-mode";

type Mode = "app" | "chat" | "image";

const MODES: { id: Mode; label: string; icon: string }[] = [
  { id: "app", label: "Uygulama", icon: "🛠️" },
  { id: "chat", label: "Sohbet", icon: "💬" },
  { id: "image", label: "Görsel", icon: "🎨" },
];

export default function HomePage() {
  const [mode, setMode] = useState<Mode>("app");

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      {/* Global header */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 font-black">
            X
          </div>
          <div>
            <h1 className="text-base font-bold leading-none">XASİLKAN AJAN</h1>
            <p className="text-[11px] text-slate-400">
              Gerçek üretim: uygulama · sohbet · görsel
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-900 p-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                mode === m.id
                  ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white"
                  : "text-slate-300 hover:bg-white/5"
              }`}
            >
              <span className="mr-1">{m.icon}</span>
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* Active mode */}
      <div className="min-h-0 flex-1">
        {mode === "app" && <Studio />}
        {mode === "chat" && <ChatMode />}
        {mode === "image" && <ImageMode />}
      </div>
    </div>
  );
}
