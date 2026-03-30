"use client";

import { useEffect, useState } from "react";

const COMPANIES = ["3사 통합관리", "남광토건", "극동건설", "금광기업"];

interface Location {
  id: number;
  company: string;
  name: string;
  type: string;
  _count?: { teams: number };
}

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ company: "", name: "", type: "HQ" });
  const [error, setError] = useState("");

  const load = async () => {
    const res = await fetch("/api/admin/locations");
    const data = await res.json();
    setLocations(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.company || !form.name) { setError("회사와 소속명을 입력해주세요."); return; }
    const res = await fetch("/api/admin/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setForm({ company: "", name: "", type: "HQ" }); load(); }
    else { const data = await res.json(); setError(data.error || "추가 실패"); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`"${name}" 소속을 삭제하시겠습니까?`)) return;
    const res = await fetch(`/api/admin/locations/${id}`, { method: "DELETE" });
    if (res.ok) { load(); }
    else { const data = await res.json(); alert(data.error || "삭제 실패"); }
  };

  const grouped = COMPANIES.map((company) => ({
    company,
    locations: locations.filter((l) => l.company === company),
  })).filter((g) => g.locations.length > 0);

  if (loading) return <div className="text-center py-20 text-gray-400">로딩 중...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">소속 관리</h1>

      <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex gap-3 items-end">
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">회사</label>
            <select required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none">
              <option value="">선택</option>
              {COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="w-28">
            <label className="block text-sm font-medium text-gray-700 mb-1">구분</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none">
              <option value="HQ">본사</option>
              <option value="SITE">현장</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">소속명</label>
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none"
              placeholder="예: 본사, 서울현장" />
          </div>
          <button type="submit" className="bg-orange-500 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition">
            추가
          </button>
        </div>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </form>

      {grouped.length > 0 ? grouped.map((g) => (
        <div key={g.company} className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3">{g.company}</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">구분</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">소속명</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">팀 수</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-600">액션</th>
                </tr>
              </thead>
              <tbody>
                {g.locations.map((loc) => (
                  <tr key={loc.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${loc.type === "HQ" ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"}`}>
                        {loc.type === "HQ" ? "본사" : "현장"}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900">{loc.name}</td>
                    <td className="px-5 py-3 text-gray-600">{loc._count?.teams ?? 0}팀</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => handleDelete(loc.id, loc.name)}
                        className="text-red-400 hover:text-red-600 text-xs font-medium">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">등록된 소속이 없습니다.</div>
      )}
    </div>
  );
}
