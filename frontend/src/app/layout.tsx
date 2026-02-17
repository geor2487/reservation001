import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "予約管理 - POND",
  description: "小規模飲食店向け予約管理Webアプリ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
