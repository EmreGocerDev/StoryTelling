// src/app/layout.tsx

import type { Metadata } from "next";
// HATA BURADAYDI: VT33 -> VT323 OLARAK DÜZELTİLDİ
import { VT323 } from "next/font/google";
import "./globals.css";

// HATA BURADAYDI: VT33 -> VT323 OLARAK DÜZELTİLDİ
const vt323 = VT323({
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "STORYTELLING",
  description: "Metin tabanlı macera oyunu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${vt323.className} bg-black text-white min-h-screen`}>
        {children}
      </body>
    </html>
  );
}