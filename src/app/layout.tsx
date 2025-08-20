// app/layout.tsx
import type { Metadata } from "next";
import { VT323 } from "next/font/google"; // Fontu import et
import "./globals.css";

// Font ayarlarını yap
const vt323 = VT323({
  subsets: ["latin"],
  weight: "400", // Sadece bir ağırlığı var
  variable: "--font-vt323", // CSS değişkeni olarak tanımla
});

export const metadata: Metadata = {
  title: "ŞİDMİ",
  description: "Metin tabanlı macera oyunu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      {/* Fontun class'ını body'ye uygula */}
      <body className={`${vt323.className} bg-black`}>{children}</body>
    </html>
  );
}