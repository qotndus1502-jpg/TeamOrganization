"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

interface User {
  id: number;
  name: string;
  role: string;
  pendingRole: string | null;
  hasEmployee: boolean;
  teamId: number | null;
  teamCompany: string | null;
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setUser(data));
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case "ADMIN": return "관리자";
      case "EXECUTIVE": return "임원";
      default: return "직원";
    }
  };

  return (
    <div className="flex justify-between h-16 items-center">
      <a href={`/dashboard?company=${encodeURIComponent("남광토건")}`} className="flex items-center gap-2.5 group cursor-pointer">
        <div className="w-8 h-8 bg-[#C1FD3C] rounded-lg flex items-center justify-center group-hover:bg-[#b0ec2b] transition">
          <svg className="w-4.5 h-4.5 text-[#2B3037]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div className="text-xl tracking-tight">
          <span className="font-black text-gray-900" style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "-0.03em" }}>Team</span><span className="font-light text-gray-400" style={{ fontFamily: "'Inter', sans-serif" }}>Work</span>
        </div>
      </a>
      <div className="flex items-center gap-5">
        {user ? (
          <>
            {user.teamId && (
              <Link href={`/dashboard?company=${encodeURIComponent(user.teamCompany || "")}&team=${user.teamId}`} className="text-gray-600 hover:text-gray-900 font-medium text-sm">
                나의 팀
              </Link>
            )}
            {user.role === "ADMIN" && (
              <Link href="/admin" className="text-gray-600 hover:text-gray-900 font-medium text-sm">
                관리자
              </Link>
            )}
            {/* EXECUTIVE: no register/edit link, only view */}
            {/* EMPLOYEE/ADMIN: show profile link to register page */}
            <div className="flex items-center gap-3 border-l border-gray-200 pl-5">
              <Link
                href={user.role === "EMPLOYEE" ? "/register" : "/dashboard"}
                className="flex items-center gap-2 hover:opacity-80 transition"
              >
                <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white">
                  {user.name.charAt(0)}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700 leading-tight">{user.name}</span>
                  <span className="text-[10px] text-gray-400 leading-tight">
                    {roleLabel(user.role)}
                    {user.pendingRole && (
                      <span className="text-orange-500 ml-1">(승인 대기)</span>
                    )}
                  </span>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="text-xs text-gray-400 hover:text-red-500 transition"
              >
                로그아웃
              </button>
            </div>
          </>
        ) : (
          <>
            <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium text-sm">
              로그인
            </Link>
            <Link href="/signup" className="bg-orange-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-orange-600 transition">
              회원가입
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
