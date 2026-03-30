"use client";

import { useEffect, useState } from "react";

const COMPANIES = ["3사 통합관리", "남광토건", "극동건설", "금광기업"];

interface Location {
  id: number;
  company: string;
  name: string;
  type: string;
}

interface Category {
  id: number;
  name: string;
  company: string;
  locationId: number;
  location: Location;
}

interface Team {
  id: number;
  name: string;
  category: string | null;
  locationId: number;
  location: Location;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selCompany, setSelCompany] = useState("");
  const [selLocationId, setSelLocationId] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const load = async () => {
    const [catsRes, teamsRes, locsRes] = await Promise.all([
      fetch("/api/admin/categories"),
      fetch("/api/admin/teams"),
      fetch("/api/admin/locations"),
    ]);
    setCategories(await catsRes.json());
    setTeams(await teamsRes.json());
    setLocations(await locsRes.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredLocations = locations.filter((l) => l.company === selCompany);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selCompany) { setError("회사를 선택해주세요."); return; }
    if (!selLocationId) { setError("소속을 선택해주세요."); return; }
    if (!newCategory.trim()) { setError("본부명을 입력해주세요."); return; }
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategory.trim(), company: selCompany, locationId: Number(selLocationId) }),
    });
    if (res.ok) { setNewCategory(""); load(); }
    else { const data = await res.json(); setError(data.error || "추가 실패"); }
  };

  const handleRename = async (cat: Category) => {
    if (!editValue.trim() || editValue.trim() === cat.name) { setEditingId(null); return; }
    const targetTeams = teams.filter((t) => t.locationId === cat.locationId && t.category === cat.name);
    for (const team of targetTeams) {
      await fetch(`/api/admin/teams/${team.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: team.name, locationId: team.locationId, category: editValue.trim() }),
      });
    }
    await fetch("/api/admin/categories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cat.id }),
    });
    await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editValue.trim(), company: cat.company, locationId: cat.locationId }),
    });
    setEditingId(null);
    load();
  };

  const handleDelete = async (cat: Category) => {
    const targetTeams = teams.filter((t) => t.locationId === cat.locationId && t.category === cat.name);
    const msg = targetTeams.length > 0
      ? `"${cat.name}" 본부를 삭제하시겠습니까?\n소속된 ${targetTeams.length}개 팀의 본부가 해제됩니다.`
      : `"${cat.name}" 본부를 삭제하시겠습니까?`;
    if (!confirm(msg)) return;
    await fetch("/api/admin/categories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cat.id, clearTeams: true }),
    });
    load();
  };

  // 회사 > 소속별 그룹핑
  const grouped = COMPANIES.map((company) => {
    const companyLocs = locations.filter((l) => l.company === company);
    const locGroups = companyLocs.map((loc) => {
      const locCats = categories.filter((c) => c.locationId === loc.id);
      return { loc, cats: locCats };
    }).filter((lg) => lg.cats.length > 0);
    return { company, locGroups };
  }).filter((g) => g.locGroups.length > 0);

  if (loading) return <div className="text-center py-20 text-gray-400">로딩 중...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">본부 관리</h1>

      <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex gap-3 items-end">
          <div className="w-36">
            <label className="block text-sm font-medium text-gray-700 mb-1"><span className="text-orange-500 mr-1">1</span>회사</label>
            <select required value={selCompany} onChange={(e) => { setSelCompany(e.target.value); setSelLocationId(""); }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none">
              <option value="">선택</option>
              {COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="w-36">
            <label className="block text-sm font-medium text-gray-700 mb-1"><span className="text-orange-500 mr-1">2</span>소속</label>
            <select required value={selLocationId} onChange={(e) => setSelLocationId(e.target.value)}
              disabled={!selCompany}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none disabled:bg-gray-100">
              <option value="">선택</option>
              {filteredLocations.map((l) => <option key={l.id} value={l.id}>{l.type === "HQ" ? "본사" : l.name}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1"><span className="text-orange-500 mr-1">3</span>본부명</label>
            <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
              disabled={!selLocationId}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none disabled:bg-gray-100"
              placeholder="예: 건축사업본부" />
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
          {g.locGroups.map(({ loc, cats }) => {
            return (
              <div key={loc.id} className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${loc.type === "HQ" ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"}`}>
                    {loc.type === "HQ" ? "본사" : "현장"}
                  </span>
                  {loc.name}
                </h3>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-5 py-3 font-medium text-gray-600">본부명</th>
                        <th className="text-left px-5 py-3 font-medium text-gray-600">소속 팀</th>
                        <th className="text-left px-5 py-3 font-medium text-gray-600">팀 수</th>
                        <th className="text-right px-5 py-3 font-medium text-gray-600">액션</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cats.map((cat) => {
                        const catTeams = teams.filter((t) => t.locationId === cat.locationId && t.category === cat.name);
                        return (
                          <tr key={cat.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-5 py-3 font-medium text-gray-900">
                              {editingId === cat.id ? (
                                <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") handleRename(cat); if (e.key === "Escape") setEditingId(null); }}
                                  autoFocus
                                  className="border border-orange-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-orange-400 outline-none" />
                              ) : cat.name}
                            </td>
                            <td className="px-5 py-3 text-gray-600">{catTeams.length > 0 ? catTeams.map((t) => t.name).join(", ") : "—"}</td>
                            <td className="px-5 py-3 text-gray-600">{catTeams.length}팀</td>
                            <td className="px-5 py-3 text-right space-x-2">
                              {editingId === cat.id ? (
                                <>
                                  <button onClick={() => handleRename(cat)} className="text-orange-500 hover:underline text-xs font-medium">저장</button>
                                  <button onClick={() => setEditingId(null)} className="text-gray-400 hover:underline text-xs font-medium">취소</button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => { setEditingId(cat.id); setEditValue(cat.name); }} className="text-orange-500 hover:underline text-xs font-medium">수정</button>
                                  <button onClick={() => handleDelete(cat)} className="text-red-400 hover:text-red-600 text-xs font-medium">삭제</button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">등록된 본부가 없습니다.</div>
      )}
    </div>
  );
}
