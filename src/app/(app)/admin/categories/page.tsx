"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COMPANIES = ["3사 통합관리", "남광토건", "극동건설", "금광기업"];

interface Location { id: number; company: string; name: string; type: string; }
interface Category { id: number; name: string; company: string; locationId: number; location: Location; }
interface Team { id: number; name: string; category: string | null; locationId: number; location: Location; }

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
      fetch("/api/admin/categories"), fetch("/api/admin/teams"), fetch("/api/admin/locations"),
    ]);
    setCategories(await catsRes.json());
    setTeams(await teamsRes.json());
    setLocations(await locsRes.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredLocations = locations.filter((l) => l.company === selCompany);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!selCompany) { setError("회사를 선택해주세요."); return; }
    if (!selLocationId) { setError("소속을 선택해주세요."); return; }
    if (!newCategory.trim()) { setError("본부명을 입력해주세요."); return; }
    const res = await fetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCategory.trim(), company: selCompany, locationId: Number(selLocationId) }) });
    if (res.ok) { setNewCategory(""); load(); }
    else { const data = await res.json(); setError(data.error || "추가 실패"); }
  };

  const handleRename = async (cat: Category) => {
    if (!editValue.trim() || editValue.trim() === cat.name) { setEditingId(null); return; }
    const targetTeams = teams.filter((t) => t.locationId === cat.locationId && t.category === cat.name);
    for (const team of targetTeams) {
      await fetch(`/api/admin/teams/${team.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: team.name, locationId: team.locationId, category: editValue.trim() }) });
    }
    await fetch("/api/admin/categories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: cat.id }) });
    await fetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editValue.trim(), company: cat.company, locationId: cat.locationId }) });
    setEditingId(null); load();
  };

  const handleDelete = async (cat: Category) => {
    const targetTeams = teams.filter((t) => t.locationId === cat.locationId && t.category === cat.name);
    const msg = targetTeams.length > 0
      ? `"${cat.name}" 본부를 삭제하시겠습니까?\n소속된 ${targetTeams.length}개 팀의 본부가 해제됩니다.`
      : `"${cat.name}" 본부를 삭제하시겠습니까?`;
    if (!confirm(msg)) return;
    await fetch("/api/admin/categories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: cat.id, clearTeams: true }) });
    load();
  };

  const grouped = COMPANIES.map((company) => {
    const companyLocs = locations.filter((l) => l.company === company);
    const locGroups = companyLocs.map((loc) => {
      const locCats = categories.filter((c) => c.locationId === loc.id);
      return { loc, cats: locCats };
    }).filter((lg) => lg.cats.length > 0);
    return { company, locGroups };
  }).filter((g) => g.locGroups.length > 0);

  if (loading) return <div className="text-center py-20 text-muted-foreground">로딩 중...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">본부 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">팀을 분류하는 본부(카테고리)를 관리합니다</p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-5">
          <form onSubmit={handleAdd}>
            <div className="flex gap-3 items-end">
              <div className="w-36">
                <Label className="mb-1.5 block"><span className="text-primary mr-1">1</span>회사</Label>
                <Select value={selCompany} onValueChange={(v) => { setSelCompany(v); setSelLocationId(""); }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="선택" /></SelectTrigger>
                  <SelectContent>{COMPANIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="w-36">
                <Label className="mb-1.5 block"><span className="text-primary mr-1">2</span>소속</Label>
                <Select value={selLocationId} onValueChange={setSelLocationId} disabled={!selCompany}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="선택" /></SelectTrigger>
                  <SelectContent>
                    {filteredLocations.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.type === "HQ" ? "본사" : l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="mb-1.5 block"><span className="text-primary mr-1">3</span>본부명</Label>
                <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} disabled={!selLocationId} placeholder="예: 건축사업본부" />
              </div>
              <Button type="submit">추가</Button>
            </div>
            {error && <p className="text-destructive text-sm mt-2">{error}</p>}
          </form>
        </CardContent>
      </Card>

      {grouped.length > 0 ? grouped.map((g) => (
        <div key={g.company} className="mb-6">
          <h2 className="text-lg font-bold text-foreground mb-3">{g.company}</h2>
          {g.locGroups.map(({ loc, cats }) => (
            <div key={loc.id} className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={loc.type === "HQ" ? "brand" : "gray"}>{loc.type === "HQ" ? "본사" : "현장"}</Badge>
                <span className="text-sm font-medium text-muted-foreground">{loc.name}</span>
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>본부명</TableHead>
                      <TableHead>소속 팀</TableHead>
                      <TableHead>팀 수</TableHead>
                      <TableHead className="text-right">액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cats.map((cat) => {
                      const catTeams = teams.filter((t) => t.locationId === cat.locationId && t.category === cat.name);
                      return (
                        <TableRow key={cat.id}>
                          <TableCell className="font-medium">
                            {editingId === cat.id ? (
                              <Input value={editValue} onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleRename(cat); if (e.key === "Escape") setEditingId(null); }}
                                autoFocus size="sm" className="w-40" />
                            ) : cat.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{catTeams.length > 0 ? catTeams.map((t) => t.name).join(", ") : "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{catTeams.length}팀</TableCell>
                          <TableCell className="text-right">
                            {editingId === cat.id ? (
                              <div className="flex justify-end gap-1">
                                <Button size="xs" variant="secondary" onClick={() => handleRename(cat)}>저장</Button>
                                <Button size="xs" variant="ghost" onClick={() => setEditingId(null)}>취소</Button>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-1">
                                <Button size="xs" variant="ghost" onClick={() => { setEditingId(cat.id); setEditValue(cat.name); }}>수정</Button>
                                <Button size="xs" variant="ghost" className="text-destructive hover:bg-destructive-muted hover:text-destructive" onClick={() => handleDelete(cat)}>삭제</Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            </div>
          ))}
        </div>
      )) : (
        <Card><CardContent className="p-8 text-center text-muted-foreground">등록된 본부가 없습니다.</CardContent></Card>
      )}
    </div>
  );
}
