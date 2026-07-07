export const dynamic = "force-dynamic";

const providers = [
  {
    id: "pollinations",
    label: "XASİLKAN AI",
    defaultModel: "openai",
    models: ["openai"],
    modelGroups: [
      {
        label: "Anahtarsız",
        models: [{ id: "openai", name: "XASİLKAN AI" }],
      },
    ],
    liveModels: false,
    hasServerKey: true,
  },
  {
    id: "gemini",
    label: "Gemini",
    defaultModel: "gemini-2.5-flash",
    models: ["gemini-2.5-flash"],
    modelGroups: [
      {
        label: "Google",
        models: [{ id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" }],
      },
    ],
    liveModels: false,
    hasServerKey: Boolean(process.env.GEMINI_API_KEY),
  },
  {
    id: "openai",
    label: "OpenAI",
    defaultModel: "gpt-4o-mini",
    models: ["gpt-4o-mini"],
    modelGroups: [
      {
        label: "OpenAI",
        models: [{ id: "gpt-4o-mini", name: "GPT-4o Mini" }],
      },
    ],
    liveModels: false,
    hasServerKey: Boolean(process.env.OPENAI_API_KEY),
  },
  {
    id: "groq",
    label: "Groq",
    defaultModel: "llama-3.1-8b-instant",
    models: ["llama-3.1-8b-instant"],
    modelGroups: [
      {
        label: "Groq",
        models: [{ id: "llama-3.1-8b-instant", name: "Llama 3.1 8B" }],
      },
    ],
    liveModels: false,
    hasServerKey: Boolean(process.env.GROQ_API_KEY),
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    defaultModel: "openrouter/auto",
    models: ["openrouter/auto"],
    modelGroups: [
      {
        label: "OpenRouter",
        models: [{ id: "openrouter/auto", name: "Auto" }],
      },
    ],
    liveModels: true,
    hasServerKey: Boolean(process.env.OPENROUTER_API_KEY),
  },
];

export function GET() {
  return Response.json({ providers });
}
