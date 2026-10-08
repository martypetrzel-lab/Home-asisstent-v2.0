import type { Metadata, Viewport } from "next";
import { Providers } from "@/hooks/use-home";
import { AppShell } from "@/components/app-shell";
import "./globals.css";
import "@/styles/tablet.css";
export const metadata: Metadata = {
  applicationName: "Home Assistant ESP32",
  appleWebApp: {
    capable: true,
    title: "Domov ESP32",
    statusBarStyle: "black-translucent",
  },
  icons: { apple: "/icons/icon-192.png" },
  title: "Home Assistant ESP32 · Váš domov v rovnováze",
  description:
    "Chytrá domácnost, klima, osvětlení a solární energie. České tabletové rozhraní pro ESP32.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#111313",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs" data-theme="dark" suppressHydrationWarning>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
