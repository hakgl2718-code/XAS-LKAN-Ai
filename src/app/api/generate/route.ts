import type { ChatTurn, GeneratedFile } from "@/db/schema";

type GenerateRequest = {
  projectId?: number | null;
  message?: string;
  history?: ChatTurn[];
  files?: GeneratedFile[];
  provider?: string;
  model?: string;
};

type GeneratePayload = {
  name?: string;
  summary?: string;
  message?: string;
  files?: GeneratedFile[];
};

export const dynamic = "force-dynamic";

const FALLBACK_FILES: GeneratedFile[] = [
  {
    path: "index.html",
    content: `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>XASİLKAN App</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <main>
      <h1>Uygulama hazır</h1>
      <p>İsteğini tekrar göndererek tasarımı ve davranışı detaylandırabilirsin.</p>
      <button id="action">Tıkla</button>
    </main>
    <script src="script.js"></script>
  </body>
</html>`,
  },
  {
    path: "style.css",
    content: `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: Inter, system-ui, sans-serif;
  color: #f8fafc;
  background: linear-gradient(135deg, #0f172a, #312e81);
}

main {
  width: min(560px, calc(100vw - 32px));
  padding: 32px;
  border: 1px solid rgb(255 255 255 / 0.14);
  border-radius: 18px;
  background: rgb(15 23 42 / 0.72);
  box-shadow: 0 24px 80px rgb(0 0 0 / 0.28);
}

button {
  border: 0;
  border-radius: 12px;
  padding: 12px 18px;
  color: white;
  background: #6366f1;
  cursor: pointer;
}`,
  },
  {
    path: "script.js",
    content: `document.querySelector("#action")?.addEventListener("click", () => {
  alert("Çalışıyor.");
});`,
  },
];

function buildPrompt(body: GenerateRequest, message: string): string {
  const existingFiles = (Array.isArray(body.files) ? body.files : [])
    .slice(0, 8)
    .map((file) => `--- ${file.path}\n${file.content}`)
    .join("\n\n");
  const recent = (Array.isArray(body.history) ? body.history : [])
    .slice(-6)
    .map((turn) => `${turn.role === "user" ? "Kullanıcı" : "Ajan"}: ${turn.content}`)
    .join("\n");

  return `Sen anahtarsız çalışan bir web uygulaması kodlama ajanısın.
Kullanıcının isteğine göre tek sayfalık, tarayıcıda çalışan bir uygulama üret.
Sadece geçerli JSON döndür. Markdown, açıklama veya kod bloğu kullanma.
JSON şeması:
{
  "name": "kısa proje adı",
  "summary": "ne yapıldı",
  "message": "kullanıcıya kısa yanıt",
  "files": [
    { "path": "index.html", "content": "..." },
    { "path": "style.css", "content": "..." },
    { "path": "script.js", "content": "..." }
  ]
}
Kurallar: Harici paket kullanma. HTML, CSS ve JavaScript dosyalarını eksiksiz yaz. Türkçe arayüz metni kullan.

Son konuşma:
${recent || "(yok)"}

Mevcut dosyalar:
${existingFiles || "(yok)"}

Yeni istek: ${message}`;
}

function extractJson(text: string): GeneratePayload | null {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(cleaned) as GeneratePayload;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as GeneratePayload;
    } catch {
      return null;
    }
  }
}

function normalizeFiles(files: unknown): GeneratedFile[] {
  if (!Array.isArray(files)) return [];
  return files
    .filter(
      (file): file is GeneratedFile =>
        file &&
        typeof file === "object" &&
        typeof (file as GeneratedFile).path === "string" &&
        typeof (file as GeneratedFile).content === "string",
    )
    .slice(0, 20);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as GenerateRequest;
  const message = body.message?.trim();

  if (!message) {
    return Response.json({ error: "İstek boş olamaz." }, { status: 400 });
  }

  if (body.provider && body.provider !== "pollinations") {
    return Response.json(
      { error: "Kodlama ajanında yalnızca anahtarsız XASİLKAN modeli kullanılır." },
      { status: 400 },
    );
  }

  const model = body.model || "openai";
  const url = new URL(`https://text.pollinations.ai/${encodeURIComponent(buildPrompt(body, message))}`);
  url.searchParams.set("model", model);
  url.searchParams.set("json", "true");

  const response = await fetch(url, {
    headers: { Accept: "text/plain" },
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    return Response.json(
      { error: `Anahtarsız kodlama servisi yanıt vermedi (${response.status}).` },
      { status: 502 },
    );
  }

  const payload = extractJson(await response.text());
  const files = normalizeFiles(payload?.files);
  const changed = files.length > 0;

  return Response.json({
    projectId: body.projectId ?? Date.now(),
    name: payload?.name || "XASİLKAN Uygulama",
    summary: payload?.summary || "Anahtarsız model ile uygulama üretildi.",
    message:
      payload?.message ||
      (changed
        ? "Uygulamayı anahtarsız modelle oluşturdum."
        : "Model dosya üretemedi; örnek bir başlangıç uygulaması hazırladım."),
    changed: true,
    needsApiKey: null,
    files: changed ? files : FALLBACK_FILES,
  });
}
