import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ERP - MITRA MOTOR",
  description: "Sistem ERP Mitra Motor",
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
