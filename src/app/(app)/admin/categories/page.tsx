"use client";

import { useEffect, useState } from "react";

interface Team {
  id: number;
  name: string;
  category: string | null;
  location: { company: string; name: string; type: string };
}

export default function AdminCategoriesPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState("");
  const [error, setError] = useState("");
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const load = async () => {
    const res = await fetch("/api/admin/teams");
    const data = await res.json();
    setTeams(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const categories = [...new Set(teams.map((t) => t.category).filter(Boolean))] as string[];
  const uncategorized = teams.filter((t) => !t.category);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!newCategory.trim()) { setError("본부명을 입력해주세요."); return; }
    if (categories.includes(newCategory.trim())) { setError("이미 존재하는 본부입니다."); return; }
    // 본부만 생성 (팀 배정은 팀 관리에서)
    setError("");
    alert(`"${newCategory.trim()}" 본부가 추가되었습니다.\n팀 관리에서 팀의 본부를 지정해주세요.`);
    setNewCategory("");
  };

  const handleRename = async (oldName: string) => {
    if (!editValue.trim() || editValue.trim() === oldName) { setEditingCat(null); return; }
    const targetTeams = teams.filter((t) => t.category === oldName);
    for (const team of targetTeams) {
      await fetch(`/api/admin/teams/${team.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: team.name, locationId: team.location ? undefined : undefined, category: editValue.trim() }),
      });
    }
    setEditingCat(null);
    load();
  };

  const handleDelete = async (catName: string) => {
    const targetTeams = teams.filter((t) => t.category === catName);
    if (!confirm(`"${catName}" 본부를 삭제하시겠습니까?\n소속된 ${targetTeams.length}개 팀의 본부가 해제됩니다.`)) return;
    for (const team of targetTeams) {
      await fetch(`/api/admin/teams/${team.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: team.name, locationId: team.location ? undefined : undefined, category: null }),
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
            {categories.map((cat) => {
              const catTeams = teams.filter((t) => t.category === cat);
              return (
                <tr key={cat} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {editingCat === cat ? (
                      <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleRename(cat); if (e.key === "Escape") setEditingCat(null); }}
                        autoFocus
                        className="border border-orange-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-orange-400 outline-none" />
                    ) : cat}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {catTeams.map((t) => t.name).join(", ")}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{catTeams.length}팀</td>
                  <td className="px-5 py-3 text-right space-x-2">
                    {editingCat === cat ? (
                      <>
                        <button onClick={() => handleRename(cat)} className="text-orange-500 hover:underline text-xs font-medium">저장</button>
                        <button onClick={() => setEditingCat(null)} className="text-gray-400 hover:underline text-xs font-medium">취소</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditingCat(cat); setEditValue(cat); }} className="text-orange-500 hover:underline text-xs font-medium">수정</button>
                        <button onClick={() => handleDelete(cat)} className="text-red-400 hover:text-red-600 text-xs font-medium">삭제</button>
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
  );
}
