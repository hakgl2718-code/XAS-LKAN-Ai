export const dynamic = "force-dynamic";

const providers = [
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
    liveModels: false,
    hasServerKey: true,
  },
];

export function GET() {
  return Response.json({ providers });
}
