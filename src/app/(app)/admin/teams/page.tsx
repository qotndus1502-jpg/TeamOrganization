"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

const COMPANIES = ["3사 통합관리", "남광토건", "극동건설", "금광기업"];
const POSITIONS = ["부장", "차장", "과장", "대리", "주임", "사원"];
const ROLES_LIST = ["팀원", "팀장", "부서장"];

interface Location {
  id: number;
  company: string;
  name: string;
  type: string;
}

interface Team {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  locationId: number;
  location: Location;
  _count: { employees: number };
}

interface Employee {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  position: string;
  role: string;
  teamId: number;
  team: Team & { location: Location };
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState("");

  // 팀 폼
  const [selCompany, setSelCompany] = useState("");
  const [selType, setSelType] = useState<"HQ" | "SITE">("HQ");
  const [selLocationId, setSelLocationId] = useState("");
  const [newSiteName, setNewSiteName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamDesc, setTeamDesc] = useState("");
  const [teamImage, setTeamImage] = useState("");

  // 팀원 관리
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", position: "", role: "", teamId: "" });
  const [editError, setEditError] = useState("");

  // 승인 대기 알림
  const [pendingCount, setPendingCount] = useState(0);

  const load = () => {
    fetch("/api/admin/teams").then((r) => r.json()).then((t: Team[]) => { setTeams(t); setAllTeams(t); });
    fetch("/api/admin/locations").then((r) => r.json()).then(setLocations);
    fetch("/api/admin/users").then((r) => r.json()).then((users: { pendingRole: string | null }[]) => {
      setPendingCount(users.filter((u) => u.pendingRole).length);
    }).catch(() => {});
  };

  useEffect(load, []);

  const loadEmployees = useCallback(() => {
    if (!selectedTeamId) { setEmployees([]); return; }
    fetch(`/api/employees?teamId=${selectedTeamId}`).then((r) => r.json()).then(setEmployees);
  }, [selectedTeamId]);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  const siteLocations = locations.filter((l) => l.company === selCompany && l.type === "SITE");
  const hqLocation = locations.find((l) => l.company === selCompany && l.type === "HQ");
  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const companies = [...new Set(allTeams.map((t) => t.location.company))];

  const resetForm = () => {
    setSelCompany(""); setSelType("HQ"); setSelLocationId(""); setNewSiteName("");
    setTeamName(""); setTeamDesc(""); setTeamImage(""); setEditId(null); setError("");
  };

  // 팀 CRUD
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    let locationId: number;
    if (selType === "HQ") {
      if (hqLocation) { locationId = hqLocation.id; }
      else {
        const res = await fetch("/api/admin/locations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company: selCompany, name: "본사", type: "HQ" }) });
        if (!res.ok) { setError("본사 거점 생성 실패"); return; }
        locationId = (await res.json()).id;
      }
    } else {
      if (selLocationId === "__new__") {
        if (!newSiteName.trim()) { setError("현장명을 입력해주세요."); return; }
        const res = await fetch("/api/admin/locations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company: selCompany, name: newSiteName.trim(), type: "SITE" }) });
        if (!res.ok) { setError("현장 생성 실패"); return; }
        locationId = (await res.json()).id;
      } else { locationId = Number(selLocationId); }
    }
    const url = editId ? `/api/admin/teams/${editId}` : "/api/admin/teams";
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: teamName, locationId, description: teamDesc || null, imageUrl: teamImage || null }) });
    if (!res.ok) { setError((await res.json()).error); return; }
    resetForm(); setShowForm(false); load();
  };

  const handleEditTeam = (team: Team) => {
    setSelCompany(team.location.company); setSelType(team.location.type as "HQ" | "SITE");
    setSelLocationId(String(team.locationId)); setTeamName(team.name);
    setTeamDesc(team.description || ""); setTeamImage(team.imageUrl || "");
    setEditId(team.id); setShowForm(true); setError("");
  };

  const handleDeleteTeam = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/admin/teams/${id}`, { method: "DELETE" });
    if (!res.ok) { alert((await res.json()).error); return; }
    load();
  };

  // 팀원 CRUD
  const openEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditForm({ name: emp.name, phone: emp.phone || "", position: emp.position, role: emp.role, teamId: String(emp.teamId) });
    setEditError("");
  };

  const handleEditSubmit = async () => {
    if (!editingEmployee) return; setEditError("");
    const res = await fetch(`/api/employees/${editingEmployee.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editForm.name, email: editingEmployee.email, phone: editForm.phone, position: editForm.position, role: editForm.role, teamId: Number(editForm.teamId), joinDate: editingEmployee.joinDate, resumePath: editingEmployee.resumePath }),
    });
    if (res.ok) { setEditingEmployee(null); loadEmployees(); load(); }
    else { setEditError((await res.json()).error || "수정 실패"); }
  };

  const handleDeleteEmployee = async (emp: Employee) => {
    if (!confirm(`${emp.name} 님을 삭제하시겠습니까?`)) return;
    const res = await fetch(`/api/employees/${emp.id}`, { method: "DELETE" });
    if (res.ok) { loadEmployees(); load(); } else { alert("삭제에 실패했습니다."); }
  };

  const grouped = COMPANIES.map((company) => ({
    company, teams: teams.filter((t) => t.location.company === company),
  })).filter((g) => g.teams.length > 0);

  // ── 팀원 관리 뷰 ──
  if (selectedTeamId && selectedTeam) {
    return (
      <div>
        <button onClick={() => setSelectedTeamId(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 font-medium transition mb-6">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          팀 목록으로
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{selectedTeam.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{selectedTeam.location.company} · {selectedTeam.location.name} · {employees.length}명</p>
          </div>
        </div>

        {employees.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">등록된 팀원이 없습니다.</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">이름</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">이메일</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">직급</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">직책</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">연락처</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-600">액션</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{emp.name}</td>
                    <td className="px-5 py-3 text-gray-600">{emp.email}</td>
                    <td className="px-5 py-3 text-gray-600">{emp.position}</td>
                    <td className="px-5 py-3 text-gray-600">{emp.role}</td>
                    <td className="px-5 py-3 text-gray-600">{emp.phone || "-"}</td>
                    <td className="px-5 py-3 text-right space-x-2">
                      <button onClick={() => openEdit(emp)} className="text-orange-500 hover:underline text-xs">수정</button>
                      <button onClick={() => handleDeleteEmployee(emp)} className="text-red-600 hover:underline text-xs">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 직원 수정 모달 */}
        {editingEmployee && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setEditingEmployee(null)}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 mb-4">{editingEmployee.name} 정보 수정</h3>
              {editError && <div className="mb-3 p-2 bg-red-50 text-red-700 text-sm rounded-lg">{editError}</div>}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                  <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
                  <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">직급</label>
                    <select value={editForm.position} onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none">
                      {POSITIONS.map((p) => (<option key={p} value={p}>{p}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">직책</label>
                    <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none">
                      {ROLES_LIST.map((r) => (<option key={r} value={r}>{r}</option>))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">소속 팀 (부서이동)</label>
                  <select value={editForm.teamId} onChange={(e) => setEditForm({ ...editForm, teamId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none">
                    {companies.map((company) => {
                      const cTeams = allTeams.filter((t) => t.location.company === company);
                      return (
                        <optgroup key={company} label={company}>
                          {cTeams.map((t) => (<option key={t.id} value={t.id}>[{t.location.type === "HQ" ? "본사" : t.location.name}] {t.name}</option>))}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={handleEditSubmit} className="flex-1 bg-orange-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition">저장</button>
                <button onClick={() => setEditingEmployee(null)} className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition">취소</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── 팀 목록 뷰 ──
  return (
    <div>
      {/* 승인 대기 알림 배너 */}
      {pendingCount > 0 && (
        <Link href="/admin/users" className="flex items-center gap-3 mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition">
          <span className="bg-orange-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
            {pendingCount}
          </span>
          <span className="text-sm text-orange-700 font-medium">
            관리자 권한 승인 대기 중인 요청이 있습니다
          </span>
          <svg className="w-4 h-4 text-orange-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">팀 관리</h1>
        <button onClick={() => { setShowForm(!showForm); resetForm(); }}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition">
          {showForm ? "취소" : "+ 팀 추가"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="w-36">
              <label className="block text-sm font-medium text-gray-700 mb-1"><span className="text-orange-500 mr-1">1</span>소속회사</label>
              <select required value={selCompany} onChange={(e) => { setSelCompany(e.target.value); setSelLocationId(""); setNewSiteName(""); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none">
                <option value="">선택</option>
                {COMPANIES.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
            <div className="w-28">
              <label className="block text-sm font-medium text-gray-700 mb-1"><span className="text-orange-500 mr-1">2</span>구분</label>
              <select value={selType} disabled={!selCompany} onChange={(e) => { setSelType(e.target.value as "HQ" | "SITE"); setSelLocationId(""); setNewSiteName(""); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none disabled:bg-gray-100">
                <option value="HQ">본사</option><option value="SITE">현장</option>
              </select>
            </div>
            {selType === "SITE" && selCompany && (
              <div className="w-48">
                <label className="block text-sm font-medium text-gray-700 mb-1"><span className="text-orange-500 mr-1">3</span>현장 선택</label>
                <select required value={selLocationId} onChange={(e) => setSelLocationId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none">
                  <option value="">선택</option>
                  {siteLocations.map((loc) => (<option key={loc.id} value={loc.id}>{loc.name}</option>))}
                  <option value="__new__">+ 새 현장 추가</option>
                </select>
              </div>
            )}
            {selType === "SITE" && selLocationId === "__new__" && (
              <div className="w-44">
                <label className="block text-sm font-medium text-gray-700 mb-1">현장명</label>
                <input type="text" required value={newSiteName} onChange={(e) => setNewSiteName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none" placeholder="예: 서울 강남현장" />
              </div>
            )}
            <div className="flex-1 min-w-[140px]">
              <label className="block text-sm font-medium text-gray-700 mb-1"><span className="text-orange-500 mr-1">{selType === "SITE" ? "4" : "3"}</span>팀명</label>
              <input type="text" required value={teamName} disabled={!selCompany || (selType === "SITE" && !selLocationId)}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none disabled:bg-gray-100" placeholder="예: 경영지원팀" />
            </div>
            <button type="submit" className="bg-orange-500 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition">
              {editId ? "수정" : "추가"}
            </button>
          </div>
          <div className="flex gap-3 mt-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">팀 설명 (선택)</label>
              <input type="text" value={teamDesc} onChange={(e) => setTeamDesc(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none" placeholder="예: 그룹사 재무·회계 업무 총괄" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">대표 이미지 URL (선택)</label>
              <input type="text" value={teamImage} onChange={(e) => setTeamImage(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none" placeholder="예: /uploads/team-photo.jpg" />
            </div>
          </div>
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </form>
      )}

      {grouped.length > 0 ? grouped.map((g) => (
        <div key={g.company} className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3">{g.company}</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">구분</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">소속</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">팀명</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">인원</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-600">액션</th>
                </tr>
              </thead>
              <tbody>
                {g.teams.map((team) => (
                  <tr key={team.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedTeamId(team.id)}>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${team.location.type === "HQ" ? "bg-orange-100 text-orange-600" : "bg-orange-100 text-orange-700"}`}>
                        {team.location.type === "HQ" ? "본사" : "현장"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{team.location.name}</td>
                    <td className="px-5 py-3 font-medium text-orange-500">{team.name}</td>
                    <td className="px-5 py-3 text-gray-600">{team._count.employees}명</td>
                    <td className="px-5 py-3 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleEditTeam(team)} className="text-orange-500 hover:underline text-xs">수정</button>
                      <button onClick={() => handleDeleteTeam(team.id)} className="text-red-600 hover:underline text-xs">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">등록된 팀이 없습니다.</div>
      )}
    </div>
  );
}
