import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "TeamWork",
  description: "건설회사 본사/현장 조직도 및 인사정보 관리",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-[#F5F5F0] min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}
