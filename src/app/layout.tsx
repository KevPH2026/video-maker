import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "VideoAI · 一句话生成专业视频",
  description: "AI驱动的视频生成平台，用一句话生成专业产品介绍视频。支持GSAP动画、多种风格模板。",
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className={`${inter.variable} font-sans h-full`}>{children}</body>
    </html>
  );
}
