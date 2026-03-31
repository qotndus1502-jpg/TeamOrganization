"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS = [
  { value: "EMPLOYEE", label: "직원", desc: "인사정보 등록 및 수정" },
  { value: "EXECUTIVE", label: "임원", desc: "조직도 열람 전용" },
  { value: "ADMIN", label: "관리자", desc: "승인 후 전체 관리 가능" },
] as const;

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", passwordConfirm: "" });
  const [selectedRole, setSelectedRole] = useState<string>("EMPLOYEE");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((user) => {
      if (user) router.replace("/dashboard");
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (form.password !== form.passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, email: form.email, password: form.password, selectedRole }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setLoading(false);
      return;
    }

    if (data.needsApproval) {
      alert("회원가입이 완료되었습니다.\n관리자 승인 후 로그인할 수 있습니다.");
      window.location.href = "/login";
      return;
    }

    window.location.href = "/register";
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-auth-gradient">
      <Card className="w-full max-w-sm border-0 shadow-xl bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="text-4xl mx-auto mb-3">📋</div>
          <CardTitle className="text-2xl font-bold">회원가입</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">새 계정을 만들어 시작하세요</p>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          {error && (
            <div className="mb-4 p-3 bg-destructive-muted border border-destructive-border text-destructive-muted-foreground rounded-lg text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection */}
            <div className="space-y-2">
              <Label>가입 유형</Label>
              <div className="grid grid-cols-3 gap-2">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedRole(opt.value)}
                    className={cn(
                      "py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200",
                      selectedRole === opt.value
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-[1.02]"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                {ROLE_OPTIONS.find((o) => o.value === selectedRole)?.desc}
                {(selectedRole === "ADMIN" || selectedRole === "EXECUTIVE") && (
                  <span className="text-primary font-medium ml-1">* 관리자 승인 필요</span>
                )}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="홍길동"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="hong@company.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">비밀번호 <span className="text-muted-foreground font-normal">(8자 이상)</span></Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                placeholder="영문 + 숫자 + 특수문자"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="passwordConfirm">비밀번호 확인</Label>
              <Input
                id="passwordConfirm"
                type="password"
                required
                placeholder="비밀번호를 다시 입력하세요"
                value={form.passwordConfirm}
                onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })}
              />
            </div>
            <Button type="submit" disabled={loading} size="lg" className="w-full mt-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                  가입 중...
                </span>
              ) : "회원가입"}
            </Button>
          </form>
          <div className="mt-6 pt-4 border-t border-border/50 text-center">
            <p className="text-sm text-muted-foreground">
              이미 계정이 있으신가요?{" "}
              <Link href="/login" className="text-primary hover:underline font-semibold">
                로그인
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
