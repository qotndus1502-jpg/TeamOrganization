import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto-sans-kr",
});

export const metadata: Metadata = {
  title: "조직도 관리",
  description: "건설회사 본사/현장 조직도 및 인사정보 관리",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={notoSansKR.variable}>
      <body className="bg-background min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}
