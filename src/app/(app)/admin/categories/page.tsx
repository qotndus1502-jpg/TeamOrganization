"use client";

import { useEffect, useState } from "react";

const COMPANIES = ["3사 통합관리", "남광토건", "극동건설", "금광기업"];

interface Location {
  id: number;
  company: string;
  name: string;
  type: string;
}

interface Team {
  id: number;
  name: string;
  category: string | null;
  locationId: number;
  location: Location;
}

export default function AdminCategoriesPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selCompany, setSelCompany] = useState("");
  const [selLocationId, setSelLocationId] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [error, setError] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const load = async () => {
    const [teamsRes, locsRes] = await Promise.all([
      fetch("/api/admin/teams"),
      fetch("/api/admin/locations"),
    ]);
    setTeams(await teamsRes.json());
    setLocations(await locsRes.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredLocations = locations.filter((l) => l.company === selCompany);

  // 회사 > 소속별로 그룹핑
  const grouped = COMPANIES.map((company) => {
    const companyLocs = locations.filter((l) => l.company === company);
    const locGroups = companyLocs.map((loc) => {
      const locTeams = teams.filter((t) => t.locationId === loc.id);
      const cats = [...new Set(locTeams.map((t) => t.category).filter(Boolean))] as string[];
      const uncategorized = locTeams.filter((t) => !t.category);
      return { loc, cats, uncategorized, locTeams };
    }).filter((lg) => lg.cats.length > 0 || lg.uncategorized.length > 0);
    return { company, locGroups };
  }).filter((g) => g.locGroups.length > 0);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selCompany) { setError("회사를 선택해주세요."); return; }
    if (!newCategory.trim()) { setError("본부명을 입력해주세요."); return; }
    // 해당 회사 팀 중 이미 같은 본부가 있는지 체크
    const companyTeams = teams.filter((t) => t.location.company === selCompany);
    const existing = companyTeams.some((t) => t.category === newCategory.trim());
    if (existing) { setError("해당 회사에 이미 존재하는 본부입니다."); return; }
    alert(`"${newCategory.trim()}" 본부가 추가 가능합니다.\n팀 관리에서 팀의 본부를 "${newCategory.trim()}"으로 지정해주세요.`);
    setNewCategory("");
  };

  const handleRename = async (company: string, oldName: string) => {
    if (!editValue.trim() || editValue.trim() === oldName) { setEditingKey(null); return; }
    const targetTeams = teams.filter((t) => t.location.company === company && t.category === oldName);
    for (const team of targetTeams) {
      await fetch(`/api/admin/teams/${team.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: team.name, locationId: team.locationId, category: editValue.trim() }),
      });
    }
    setEditingKey(null);
    load();
  };

  const handleDelete = async (company: string, catName: string) => {
    const targetTeams = teams.filter((t) => t.location.company === company && t.category === catName);
    if (!confirm(`"${catName}" 본부를 삭제하시겠습니까?\n소속된 ${targetTeams.length}개 팀의 본부가 해제됩니다.`)) return;
    for (const team of targetTeams) {
      await fetch(`/api/admin/teams/${team.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: team.name, locationId: team.locationId, category: null }),
      });
    }
    load();
  };

  if (loading) return <div className="text-center py-20 text-gray-400">로딩 중...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">본부 관리</h1>

      <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex gap-3 items-end">
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">회사</label>
            <select required value={selCompany} onChange={(e) => { setSelCompany(e.target.value); setSelLocationId(""); }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none">
              <option value="">선택</option>
              {COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="w-36">
            <label className="block text-sm font-medium text-gray-700 mb-1">소속</label>
            <select value={selLocationId} onChange={(e) => setSelLocationId(e.target.value)}
              disabled={!selCompany}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none disabled:bg-gray-100">
              <option value="">전체</option>
              {filteredLocations.map((l) => <option key={l.id} value={l.id}>{l.type === "HQ" ? "본사" : l.name}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">새 본부명</label>
            <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none"
              placeholder="예: 건축사업본부, 토목사업본부" />
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
          {g.locGroups.map(({ loc, cats, uncategorized }) => (
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
                      const catTeams = teams.filter((t) => t.locationId === loc.id && t.category === cat);
                      const key = `${g.company}-${loc.id}-${cat}`;
                      return (
                        <tr key={cat} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-5 py-3 font-medium text-gray-900">
                            {editingKey === key ? (
                              <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleRename(g.company, cat); if (e.key === "Escape") setEditingKey(null); }}
                                autoFocus
                                className="border border-orange-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-orange-400 outline-none" />
                            ) : cat}
                          </td>
                          <td className="px-5 py-3 text-gray-600">{catTeams.map((t) => t.name).join(", ")}</td>
                          <td className="px-5 py-3 text-gray-600">{catTeams.length}팀</td>
                          <td className="px-5 py-3 text-right space-x-2">
                            {editingKey === key ? (
                              <>
                                <button onClick={() => handleRename(g.company, cat)} className="text-orange-500 hover:underline text-xs font-medium">저장</button>
                                <button onClick={() => setEditingKey(null)} className="text-gray-400 hover:underline text-xs font-medium">취소</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => { setEditingKey(key); setEditValue(cat); }} className="text-orange-500 hover:underline text-xs font-medium">수정</button>
                                <button onClick={() => handleDelete(g.company, cat)} className="text-red-400 hover:text-red-600 text-xs font-medium">삭제</button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {uncategorized.length > 0 && (
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <td className="px-5 py-3 text-gray-400 italic">미배정</td>
                        <td className="px-5 py-3 text-gray-400">{uncategorized.map((t) => t.name).join(", ")}</td>
                        <td className="px-5 py-3 text-gray-400">{uncategorized.length}팀</td>
                        <td className="px-5 py-3"></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">등록된 본부가 없습니다.</div>
      )}
    </div>
  );
}
