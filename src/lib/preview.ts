import type { GeneratedFile } from "@/db/schema";

function getFile(files: GeneratedFile[], path: string): string | null {
  const normalized = path.replace(/^\.\//, "");
  return (
    files.find((file) => file.path.replace(/^\.\//, "") === normalized)
      ?.content ?? null
  );
}

function escapeScript(content: string): string {
  return content.replace(/<\/script/gi, "<\\/script");
}

function escapeHtml(content: string): string {
  return content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildPreviewHtml(files: GeneratedFile[]): string {
  const html =
    getFile(files, "index.html") ??
    getFile(files, "public/index.html") ??
    getFile(files, "src/index.html");
  const css =
    getFile(files, "style.css") ??
    getFile(files, "styles.css") ??
    getFile(files, "src/style.css") ??
    getFile(files, "src/styles.css");
  const js =
    getFile(files, "script.js") ??
    getFile(files, "app.js") ??
    getFile(files, "main.js") ??
    getFile(files, "src/script.js") ??
    getFile(files, "src/app.js") ??
    getFile(files, "src/main.js");

  if (html) {
    const withCss =
      css && !html.includes("</head>")
        ? `<style>${css}</style>${html}`
        : html.replace("</head>", `<style>${css ?? ""}</style></head>`);
    return js
      ? withCss.replace("</body>", `<script>${escapeScript(js)}</script></body>`)
      : withCss;
  }

  const renderedFiles = files
    .map(
      (file) => `<section>
  <h2>${escapeHtml(file.path)}</h2>
  <pre><code>${escapeHtml(file.content)}</code></pre>
</section>`,
    )
    .join("");

  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Önizleme</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a; }
    main { max-width: 960px; margin: 0 auto; padding: 32px 20px; }
    section { margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: white; }
    h1, h2 { margin: 0; }
    h1 { margin-bottom: 24px; font-size: 24px; }
    h2 { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; background: #f1f5f9; }
    pre { margin: 0; padding: 16px; overflow: auto; font-size: 13px; line-height: 1.5; }
  </style>
</head>
<body>
  <main>
    <h1>Üretilen dosyalar</h1>
    ${renderedFiles}
  </main>
</body>
</html>`;
}
