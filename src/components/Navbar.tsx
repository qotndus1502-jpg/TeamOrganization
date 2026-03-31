"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Home } from "lucide-react";

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
    const roles = role.split(",");
    const labels = roles.map((r) => {
      switch (r) { case "ADMIN": return "관리자"; case "EXECUTIVE": return "임원"; default: return "직원"; }
    });
    return labels.join(" · ");
  };

  const isActive = (path: string) => pathname?.startsWith(path);

  return (
    <div className="flex justify-between h-16 items-center">
      <a href={`/dashboard?company=${encodeURIComponent("남광토건")}`} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all" title="홈">
        <Home className="w-5 h-5" />
      </a>

      <div className="flex items-center gap-1">
        {user ? (
          <>
            {user.teamId && (
              <a
                href={`/dashboard?company=${encodeURIComponent(user.teamCompany || "")}&team=${user.teamId}`}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200"
              >
                나의 팀
              </a>
            )}
            {user.role.includes("ADMIN") && (
              <Link
                href="/admin"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive("/admin")
                    ? "text-primary bg-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                관리자
              </Link>
            )}
            <Separator orientation="vertical" className="h-5 mx-2" />
            <Link
              href={user.role.includes("EMPLOYEE") ? "/register" : "/dashboard"}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/60 transition-all duration-200"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-xs font-bold text-primary-foreground shadow-sm">
                {user.name.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground leading-tight">{user.name}</span>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  {roleLabel(user.role)}
                  {user.pendingRole && (
                    <span className="text-primary font-medium ml-1">(승인 대기)</span>
                  )}
                </span>
              </div>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="ml-1 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive-muted">
              로그아웃
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">로그인</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">회원가입</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
