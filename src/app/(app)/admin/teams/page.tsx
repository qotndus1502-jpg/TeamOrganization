"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COMPANIES = ["3사 통합관리", "남광토건", "극동건설", "금광기업"];
const POSITIONS = ["부장", "차장", "과장", "대리", "주임", "사원"];
const ROLES_LIST = ["팀원", "팀장", "부서장"];

// native select를 Input/SelectTrigger와 동일하게 보이게
const nativeSelectClass = "flex h-11 w-full items-center rounded-lg border border-input bg-card px-3.5 py-2.5 text-sm font-medium text-foreground shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[4px] focus-visible:ring-ring/15 disabled:opacity-50 disabled:cursor-not-allowed";

interface Location { id: number; company: string; name: string; type: string; }
interface Team {
  id: number; name: string; description: string | null; imageUrl: string | null;
  category: string | null; locationId: number; location: Location; _count: { employees: number };
}
interface Employee {
  id: number; name: string; email: string; phone: string | null;
  position: string; role: string; joinDate: string | null; resumePath: string | null;
  teamId: number; team: Team & { location: Location };
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const [selCompany, setSelCompany] = useState("");
  const [selType, setSelType] = useState<"HQ" | "SITE">("HQ");
  const [selLocationId, setSelLocationId] = useState("");
  const [newSiteName, setNewSiteName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamDesc, setTeamDesc] = useState("");
  const [teamImage, setTeamImage] = useState("");
  const [teamCategory, setTeamCategory] = useState("");

  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", position: "", role: "", teamId: "" });
  const [editError, setEditError] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [dbCategories, setDbCategories] = useState<{ id: number; name: string; company: string; locationId: number }[]>([]);

  const load = () => {
    fetch("/api/admin/teams").then((r) => r.json()).then((t: Team[]) => { setTeams(t); setAllTeams(t); });
    fetch("/api/admin/locations").then((r) => r.json()).then(setLocations);
    fetch("/api/admin/categories").then((r) => r.ok ? r.json() : []).then(setDbCategories).catch(() => {});
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
    setTeamName(""); setTeamDesc(""); setTeamImage(""); setTeamCategory(""); setEditId(null); setError("");
  };

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
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: teamName, locationId, description: teamDesc || null, imageUrl: teamImage || null, category: teamCategory || null }) });
    if (!res.ok) { setError((await res.json()).error); return; }
    resetForm(); setShowForm(false); load();
  };

  const handleEditTeam = (team: Team) => {
    setSelCompany(team.location.company); setSelType(team.location.type as "HQ" | "SITE");
    setSelLocationId(String(team.locationId)); setTeamName(team.name);
    setTeamDesc(team.description || ""); setTeamImage(team.imageUrl || "");
    setTeamCategory(team.category || ""); setEditId(team.id); setShowForm(true); setError("");
  };

  const handleDeleteTeam = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/admin/teams/${id}`, { method: "DELETE" });
    if (!res.ok) { alert((await res.json()).error); return; }
    load();
  };

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
        <button onClick={() => setSelectedTeamId(null)} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6 group">
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          팀 목록으로
        </button>

        <div className="mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shadow-primary/20">
            <svg className="w-6 h-6 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{selectedTeam.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="brand" size="sm">{selectedTeam.location.company}</Badge>
              <span className="text-sm text-muted-foreground">{selectedTeam.location.name}</span>
              <span className="text-sm text-muted-foreground">·</span>
              <span className="text-sm font-medium text-foreground">{employees.length}명</span>
            </div>
          </div>
        </div>

        {employees.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">등록된 팀원이 없습니다.</CardContent></Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>직급</TableHead>
                  <TableHead>직책</TableHead>
                  <TableHead>연락처</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell className="text-muted-foreground">{emp.email}</TableCell>
                    <TableCell><Badge variant="gray">{emp.position}</Badge></TableCell>
                    <TableCell><Badge variant={emp.role === "팀장" || emp.role === "부서장" ? "brand" : "gray"}>{emp.role}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{emp.phone || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="xs" variant="secondary" onClick={() => openEdit(emp)}>수정</Button>
                      <Button size="xs" variant="ghost" className="text-destructive hover:bg-destructive-muted hover:text-destructive ml-1" onClick={() => handleDeleteEmployee(emp)}>삭제</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        <Dialog open={!!editingEmployee} onOpenChange={(open) => { if (!open) setEditingEmployee(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingEmployee?.name} 정보 수정</DialogTitle>
            </DialogHeader>
            {editError && (
              <div className="p-3 bg-destructive-muted border border-destructive-border text-destructive-muted-foreground text-sm rounded-lg">{editError}</div>
            )}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>이름</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>연락처</Label>
                <Input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>직급</Label>
                  <select value={editForm.position} onChange={(e) => setEditForm({ ...editForm, position: e.target.value })} className={nativeSelectClass}>
                    {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>직책</Label>
                  <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className={nativeSelectClass}>
                    {ROLES_LIST.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>소속 팀 (부서이동)</Label>
                <select value={editForm.teamId} onChange={(e) => setEditForm({ ...editForm, teamId: e.target.value })} className={nativeSelectClass}>
                  {companies.map((company) => {
                    const cTeams = allTeams.filter((t) => t.location.company === company);
                    return (
                      <optgroup key={company} label={company}>
                        {cTeams.map((t) => <option key={t.id} value={t.id}>[{t.location.type === "HQ" ? "본사" : t.location.name}] {t.name}</option>)}
                      </optgroup>
                    );
                  })}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <Button className="flex-1" onClick={handleEditSubmit}>저장</Button>
              <Button className="flex-1" variant="outline" onClick={() => setEditingEmployee(null)}>취소</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── 팀 목록 뷰 ──
  return (
    <div>
      {pendingCount > 0 && (
        <Link href="/admin/users" className="flex items-center gap-3 mb-5 p-4 bg-warning-muted border border-warning-border rounded-2xl hover:shadow-md transition-all duration-200 group">
          <div className="w-9 h-9 rounded-xl bg-warning/15 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-warning-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-warning-muted-foreground">승인 대기 {pendingCount}건</p>
            <p className="text-xs text-warning-muted-foreground/70">관리자 권한 승인 요청이 있습니다</p>
          </div>
          <svg className="w-4 h-4 text-warning-muted-foreground/50 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">팀 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">팀을 추가, 수정, 삭제할 수 있습니다</p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); resetForm(); }} variant={showForm ? "outline" : "default"} className="gap-1.5">
          {showForm ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              취소
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              팀 추가
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-5">
            <form onSubmit={handleSubmit}>
              <div className="flex gap-3 items-end flex-wrap">
                <div className="w-36">
                  <Label className="mb-1.5 block"><span className="text-primary mr-1">1</span>소속회사</Label>
                  <select required value={selCompany} onChange={(e) => { setSelCompany(e.target.value); setSelLocationId(""); setNewSiteName(""); }} className={nativeSelectClass}>
                    <option value="">선택</option>
                    {COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="w-28">
                  <Label className="mb-1.5 block"><span className="text-primary mr-1">2</span>구분</Label>
                  <select value={selType} disabled={!selCompany} onChange={(e) => { setSelType(e.target.value as "HQ" | "SITE"); setSelLocationId(""); setNewSiteName(""); }} className={nativeSelectClass}>
                    <option value="HQ">본사</option><option value="SITE">현장</option>
                  </select>
                </div>
                {selType === "SITE" && selCompany && (
                  <div className="w-48">
                    <Label className="mb-1.5 block"><span className="text-primary mr-1">3</span>현장 선택</Label>
                    <select required value={selLocationId} onChange={(e) => setSelLocationId(e.target.value)} className={nativeSelectClass}>
                      <option value="">선택</option>
                      {siteLocations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                      <option value="__new__">+ 새 현장 추가</option>
                    </select>
                  </div>
                )}
                {selType === "SITE" && selLocationId === "__new__" && (
                  <div className="w-44">
                    <Label className="mb-1.5 block">현장명</Label>
                    <Input required value={newSiteName} onChange={(e) => setNewSiteName(e.target.value)} placeholder="예: 서울 강남현장" />
                  </div>
                )}
                <div className="w-36">
                  <Label className="mb-1.5 block"><span className="text-primary mr-1">{selType === "SITE" ? "4" : "3"}</span>본부</Label>
                  <select value={teamCategory} onChange={(e) => setTeamCategory(e.target.value)} className={nativeSelectClass}>
                    <option value="">선택</option>
                    {dbCategories.filter((c) => {
                      if (selType === "HQ" && hqLocation) return c.locationId === hqLocation.id;
                      if (selType === "SITE" && selLocationId && selLocationId !== "__new__") return c.locationId === Number(selLocationId);
                      return c.company === selCompany;
                    }).map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <Label className="mb-1.5 block"><span className="text-primary mr-1">{selType === "SITE" ? "5" : "4"}</span>팀명</Label>
                  <Input required value={teamName} disabled={!selCompany || (selType === "SITE" && !selLocationId)} onChange={(e) => setTeamName(e.target.value)} placeholder="예: 경영지원팀" />
                </div>
                <Button type="submit">{editId ? "수정" : "추가"}</Button>
              </div>
              <div className="flex gap-3 mt-3">
                <div className="flex-1">
                  <Label className="mb-1.5 block">팀 설명 (선택)</Label>
                  <Input value={teamDesc} onChange={(e) => setTeamDesc(e.target.value)} placeholder="예: 그룹사 재무·회계 업무 총괄" />
                </div>
                <div className="flex-1">
                  <Label className="mb-1.5 block">대표 이미지 URL (선택)</Label>
                  <Input value={teamImage} onChange={(e) => setTeamImage(e.target.value)} placeholder="예: /uploads/team-photo.jpg" />
                </div>
              </div>
              {error && <p className="text-destructive text-sm mt-2">{error}</p>}
            </form>
          </CardContent>
        </Card>
      )}

      {grouped.length > 0 ? grouped.map((g) => (
        <div key={g.company} className="mb-6">
          <h2 className="text-lg font-bold text-foreground mb-3">{g.company}</h2>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>구분</TableHead>
                  <TableHead>소속</TableHead>
                  <TableHead>본부</TableHead>
                  <TableHead>팀명</TableHead>
                  <TableHead>인원</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {g.teams.map((team) => (
                  <TableRow key={team.id} className="cursor-pointer" onClick={() => setSelectedTeamId(team.id)}>
                    <TableCell>
                      <Badge variant={team.location.type === "HQ" ? "brand" : "gray"}>
                        {team.location.type === "HQ" ? "본사" : "현장"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{team.location.name}</TableCell>
                    <TableCell className="text-muted-foreground">{team.category || "—"}</TableCell>
                    <TableCell className="font-medium text-foreground">{team.name}</TableCell>
                    <TableCell><Badge variant="gray">{team._count.employees}명</Badge></TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button size="xs" variant="secondary" onClick={() => handleEditTeam(team)}>수정</Button>
                      <Button size="xs" variant="ghost" className="text-destructive hover:bg-destructive-muted hover:text-destructive ml-1" onClick={() => handleDeleteTeam(team.id)}>삭제</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )) : (
        <Card><CardContent className="p-8 text-center text-muted-foreground">등록된 팀이 없습니다.</CardContent></Card>
      )}
    </div>
  );
}
