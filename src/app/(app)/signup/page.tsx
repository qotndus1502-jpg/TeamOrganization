"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

    // Redirect based on role (full page reload to ensure cookie is sent)
    if (selectedRole === "EXECUTIVE") {
      window.location.href = "/dashboard?company=" + encodeURIComponent("남광토건");
    } else if (selectedRole === "ADMIN") {
      window.location.href = "/dashboard?company=" + encodeURIComponent("남광토건");
    } else {
      window.location.href = "/register";
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">회원가입</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        {/* Role Selection Pills */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">가입 유형</label>
          <div className="flex gap-2">
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedRole(opt.value)}
                className={`flex-1 py-2.5 px-3 rounded-full text-sm font-medium transition border-2 ${
                  selectedRole === opt.value
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            {ROLE_OPTIONS.find((o) => o.value === selectedRole)?.desc}
            {selectedRole === "ADMIN" && (
              <span className="text-orange-500 ml-1">* 관리자 승인 필요</span>
            )}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
            placeholder="홍길동"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
            placeholder="hong@company.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 (8자 이상, 영문+숫자+특수문자)</label>
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인</label>
          <input
            type="password"
            required
            value={form.passwordConfirm}
            onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-500 text-white py-2.5 rounded-lg font-medium hover:bg-orange-600 transition disabled:bg-gray-400"
        >
          {loading ? "가입 중..." : "회원가입"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="text-orange-500 hover:underline font-medium">
          로그인
        </Link>
      </p>
    </div>
  );
}
