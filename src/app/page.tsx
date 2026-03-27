"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((user) => {
        if (user) {
          router.replace("/dashboard?company=" + encodeURIComponent("남광토건"));
        } else {
          setChecking(false);
        }
      });
  }, [router]);

  if (checking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#F5F5F0]">
        <div className="text-gray-400 text-sm">로딩 중...</div>
      </div>
    );
  }

  // 비로그인 시 로그인 유도
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#F5F5F0]">
      <div className="text-center">
        <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <h1 className="text-5xl tracking-tight mb-2">
          <span className="font-black text-gray-900" style={{ letterSpacing: "-0.03em" }}>Team</span><span className="font-light text-gray-400">Work</span>
        </h1>
        <p className="text-sm text-gray-400 mb-8">조직 관리 시스템</p>
        <div className="flex gap-3 justify-center">
          <Link href="/login" className="bg-orange-500 text-white px-6 py-2.5 rounded-full font-medium hover:bg-orange-600 transition text-sm">
            로그인
          </Link>
          <Link href="/signup" className="bg-white text-gray-700 border border-gray-300 px-6 py-2.5 rounded-full font-medium hover:bg-gray-50 transition text-sm">
            회원가입
          </Link>
        </div>
      </div>
    </div>
  );
}
