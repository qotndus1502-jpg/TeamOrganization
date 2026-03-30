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
    setLocations(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!form.company || !form.name) { setError("회사와 소속명을 입력해주세요."); return; }
    const res = await fetch("/api/admin/locations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
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

  if (loading) return <div className="text-center py-20 text-muted-foreground">로딩 중...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">소속 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">회사별 본사/현장 소속을 관리합니다</p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-5">
          <form onSubmit={handleAdd}>
            <div className="flex gap-3 items-end">
              <div className="w-40">
                <Label className="mb-1.5 block">회사</Label>
                <Select value={form.company} onValueChange={(v) => setForm({ ...form, company: v })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="선택" /></SelectTrigger>
                  <SelectContent>
                    {COMPANIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-28">
                <Label className="mb-1.5 block">구분</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HQ">본사</SelectItem>
                    <SelectItem value="SITE">현장</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="mb-1.5 block">소속명</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: 본사, 서울현장" />
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
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>구분</TableHead>
                  <TableHead>소속명</TableHead>
                  <TableHead>팀 수</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {g.locations.map((loc) => (
                  <TableRow key={loc.id}>
                    <TableCell>
                      <Badge variant={loc.type === "HQ" ? "brand" : "gray"}>
                        {loc.type === "HQ" ? "본사" : "현장"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{loc.name}</TableCell>
                    <TableCell className="text-muted-foreground">{loc._count?.teams ?? 0}팀</TableCell>
                    <TableCell className="text-right">
                      <Button size="xs" variant="ghost" className="text-destructive hover:bg-destructive-muted hover:text-destructive" onClick={() => handleDelete(loc.id, loc.name)}>
                        삭제
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )) : (
        <Card><CardContent className="p-8 text-center text-muted-foreground">등록된 소속이 없습니다.</CardContent></Card>
      )}
    </div>
  );
}
