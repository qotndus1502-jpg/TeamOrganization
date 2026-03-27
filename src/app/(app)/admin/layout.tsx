import { requireAdmin } from "@/lib/auth";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  const pendingCount = await prisma.user.count({ where: { pendingRole: { not: null } } });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F5F5F0]">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          <aside className="w-56 flex-shrink-0">
            <div className="sticky top-24 space-y-2">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-4 mb-3">관리자</h2>
              <Link
                href="/admin/teams"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-white hover:shadow-sm transition"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
                팀 관리
              </Link>
              <Link
                href="/admin/users"
                className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-white hover:shadow-sm transition"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  사용자 관리
                </div>
                {pendingCount > 0 && (
                  <span className="bg-orange-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </Link>
            </div>
          </aside>
          <div className="flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
