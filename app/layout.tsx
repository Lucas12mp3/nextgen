import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import Header from "@/components/Header";
import PageMotion from "@/components/PageMotion";

export const metadata: Metadata = {
  title: "NextGen | Conectando jovens ao futuro",
  description: "Plataforma de oportunidades para jovens, aprendizes e empresas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <Header />
        <PageMotion />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
