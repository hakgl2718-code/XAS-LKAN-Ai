import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import ServiceWorkerRegister from "./sw-register";

export const metadata: Metadata = {
  title: "XASİLKAN AJAN — Gerçek kod üreten AI ajanı",
  description:
    "Doğal dille anlat, gerçek bir yapay zeka modeli senin için çalışan web uygulamasını üretsin ve canlı önizlesin.",
  manifest: "/manifest.webmanifest",
  applicationName: "XASİLKAN AJAN",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "XASİLKAN AJAN",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body className="bg-slate-950 text-slate-100 antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
