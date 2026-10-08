import type { Metadata } from "next";
import { Providers } from "@/hooks/use-home";
import { AppShell } from "@/components/app-shell";
import "./globals.css";
export const metadata: Metadata = {
  title: "Home Assistant ESP32 · Váš domov v rovnováze",
  description:
    "Chytrá domácnost, klima, osvětlení a solární energie. České tabletové rozhraní pro ESP32.",
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
