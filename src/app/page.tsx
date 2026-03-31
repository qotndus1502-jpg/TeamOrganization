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
          <div className="text-5xl mx-auto mb-4">🏢</div>
          <CardTitle className="text-2xl font-bold">조직도 관리</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">부서 및 인사정보 통합 관리</p>
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
