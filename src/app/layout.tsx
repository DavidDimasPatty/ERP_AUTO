import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ERP - Toko Sparepart Motor",
  description: "Sistem ERP untuk Toko Sparepart Motor",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
