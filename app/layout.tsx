import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ultima — Stablecoin yield, made clearer",
  description: "Compare stablecoin strategies and manage your onchain positions on Arc.",
  applicationName: "Ultima",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
