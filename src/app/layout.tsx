import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { ThemeScript } from "@/components/theme-script";
import { Penyedia } from "@/components/penyedia";
import "./globals.css";

export const metadata: Metadata = {
  title: "Toko Plastik & Bahan Kue",
  description: "Stok FIFO, kas nyata, tanpa retur. V1.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f9fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0b0f" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-dvh antialiased">
        <Penyedia>{children}</Penyedia>
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
