"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((user) => {
      if (user) router.replace("/dashboard?company=" + encodeURIComponent("남광토건"));
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      setError("서버 응답 오류가 발생했습니다.");
      setLoading(false);
      return;
    }

    if (!res.ok) {
      setError(data.error || "로그인에 실패했습니다.");
      setLoading(false);
      return;
    }

    // Role-based redirect after login (full page reload to ensure cookie is sent)
    if (data.role === "EXECUTIVE" || data.role === "ADMIN") {
      window.location.href = "/dashboard?company=" + encodeURIComponent("남광토건");
    } else if (!data.hasEmployee) {
      window.location.href = "/register";
    } else {
      window.location.href = "/dashboard?company=" + encodeURIComponent("남광토건");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">로그인</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-500 text-white py-2.5 rounded-lg font-medium hover:bg-orange-600 transition disabled:bg-gray-400"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        계정이 없으신가요?{" "}
        <Link href="/signup" className="text-orange-500 hover:underline font-medium">
          회원가입
        </Link>
      </p>
    </div>
  );
}
