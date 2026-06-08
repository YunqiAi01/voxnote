import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PwaRegister from "@/components/PwaRegister";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VoxNote - 语音速记 · AI 一键整理",
  description: "录制语音、AI 转写、智能整理笔记。支持中英文，免费开始使用。",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VoxNote",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="theme-color" content="#09090b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="VoxNote" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-full flex flex-col">{children}<PwaRegister /></body>
    </html>
  );
}
