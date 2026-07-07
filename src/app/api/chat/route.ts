type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequest = {
  message?: string;
  history?: ChatMessage[];
  provider?: string;
  model?: string;
  apiKey?: string;
};

export const dynamic = "force-dynamic";

function buildPrompt(message: string, history: ChatMessage[]): string {
  const recent = history
    .slice(-8)
    .map((turn) => `${turn.role === "user" ? "Kullanıcı" : "Asistan"}: ${turn.content}`)
    .join("\n");
  return `${recent ? `${recent}\n` : ""}Kullanıcı: ${message}\nAsistan:`;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as ChatRequest;
  const message = body.message?.trim();

  if (!message) {
    return Response.json({ error: "Mesaj boş olamaz." }, { status: 400 });
  }

  const provider = body.provider || "pollinations";
  if (provider !== "pollinations") {
    return Response.json(
      { error: "Bu sağlayıcı için API anahtarı gerekiyor. Anahtarsız sohbet için XASİLKAN AI seç." },
      { status: 400 },
    );
  }

  const prompt = buildPrompt(message, Array.isArray(body.history) ? body.history : []);
  const url = new URL(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`);
  if (body.model) {
    url.searchParams.set("model", body.model);
  }

  const response = await fetch(url, {
    headers: { Accept: "text/plain" },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    return Response.json(
      { error: `Anahtarsız sohbet servisi yanıt vermedi (${response.status}).` },
      { status: 502 },
    );
  }

  const reply = (await response.text()).trim();
  return Response.json({ reply: reply || "Boş yanıt geldi, tekrar dener misin?" });
}
