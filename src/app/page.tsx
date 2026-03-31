"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-primary/20 rounded-2xl" />
          <div className="text-muted-foreground text-sm">로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-auth-gradient">
      <Card className="w-full max-w-sm border-0 shadow-xl bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/25">
            <svg className="w-8 h-8 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <CardTitle className="text-4xl tracking-tight mb-1">
            <span className="font-black text-foreground" style={{ letterSpacing: "-0.03em" }}>Team</span>
            <span className="font-light text-muted-foreground">Work</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">건설그룹 조직 관리 시스템</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5 px-8 pb-8 pt-4">
          <Button asChild size="lg" className="w-full shadow-sm">
            <Link href="/login">로그인</Link>
          </Button>
          <Button variant="outline" asChild size="lg" className="w-full">
            <Link href="/signup">회원가입</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
