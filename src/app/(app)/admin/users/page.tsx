"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface UserItem {
  id: number;
  email: string;
  name: string;
  role: string;
  pendingRole: string | null;
  createdAt: string;
  employee: { id: number; name: string; position: string; team: { name: string } } | null;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "관리자",
  EMPLOYEE: "직원",
  EXECUTIVE: "임원",
};

const roleBadgeVariant = (r: string): "brand" | "orange" | "gray" => {
  if (r === "ADMIN") return "brand";
  if (r === "EXECUTIVE") return "orange";
  return "gray";
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [changingRole, setChangingRole] = useState<number | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const load = async () => {
    const res = await fetch("/api/admin/users");
    setUsers(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const pendingUsers = users.filter((u) => u.pendingRole);

  const handleApprove = async (userId: number) => {
    await fetch(`/api/admin/users/${userId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve" }) });
    load();
  };

  const handleReject = async (userId: number) => {
    if (!confirm("승인 요청을 거절하시겠습니까?")) return;
    await fetch(`/api/admin/users/${userId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reject" }) });
    load();
  };

  const handleDelete = async (userId: number, userName: string) => {
    if (!confirm(`"${userName}" 사용자를 삭제하시겠습니까?\n연결된 직원 정보도 함께 삭제됩니다.`)) return;
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    if (res.ok) { load(); }
    else { const data = await res.json(); alert(data.error || "삭제에 실패했습니다."); }
  };

  if (loading) return <div className="text-center py-20 text-muted-foreground">로딩 중...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">사용자 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">사용자 역할 및 권한을 관리합니다</p>
      </div>

      {/* 승인 대기 */}
      {pendingUsers.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-4">
            <h2 className="text-lg font-bold text-foreground">승인 대기</h2>
            <Badge variant="error" size="md">{pendingUsers.length}</Badge>
          </div>
          <div className="space-y-3">
            {pendingUsers.map((u) => (
              <Card key={u.id} className="border-warning-border/50 bg-warning-muted/30">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-warning/30 to-warning/10 flex items-center justify-center text-warning-muted-foreground font-bold text-sm ring-2 ring-warning/20">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{u.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {u.email} · <span className="text-warning-muted-foreground font-semibold">{ROLE_LABELS[u.pendingRole!]} 권한 요청</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleApprove(u.id)} className="gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      승인
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleReject(u.id)}>거절</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 전체 사용자 */}
      <h2 className="text-lg font-bold text-foreground mb-4">전체 사용자 <span className="text-muted-foreground font-normal text-sm ml-1">{users.length}명</span></h2>
      <div className="space-y-2">
        {users.map((u) => (
          <Card key={u.id} className="hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center text-foreground font-bold text-sm">
                  {u.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">{u.name}</p>
                    {u.role.split(",").map((r: string) => (
                      <Badge key={r} variant={roleBadgeVariant(r)} size="sm">
                        {ROLE_LABELS[r] || r}
                      </Badge>
                    ))}
                    {u.pendingRole && (
                      <Badge variant="warning" size="sm">({ROLE_LABELS[u.pendingRole]} 대기)</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {u.email}
                    {u.employee && <span> · {u.employee.team.name} / {u.employee.position}</span>}
                  </p>
                </div>
              </div>
              <div>
                {changingRole === u.id ? (
                  <div className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-2.5">
                    {(["EMPLOYEE", "EXECUTIVE", "ADMIN"] as const).map((r) => (
                      <div key={r} className="flex items-center gap-1.5">
                        <Checkbox
                          id={`role-${u.id}-${r}`}
                          checked={selectedRoles.includes(r)}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedRoles([...selectedRoles, r]);
                            else setSelectedRoles(selectedRoles.filter((x) => x !== r));
                          }}
                        />
                        <Label htmlFor={`role-${u.id}-${r}`} className="text-sm cursor-pointer">{ROLE_LABELS[r]}</Label>
                      </div>
                    ))}
                    <Button size="xs" onClick={async () => {
                      if (selectedRoles.length === 0) { alert("최소 1개 역할을 선택해주세요."); return; }
                      await fetch(`/api/admin/users/${u.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "changeRole", role: selectedRoles.join(",") }) });
                      setChangingRole(null); setSelectedRoles([]); load();
                    }}>저장</Button>
                    <Button size="xs" variant="outline" onClick={() => { setChangingRole(null); setSelectedRoles([]); }}>취소</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Button size="xs" variant="ghost" onClick={() => { setChangingRole(u.id); setSelectedRoles(u.role.split(",")); }}>역할 변경</Button>
                    <Button size="xs" variant="ghost" className="text-destructive hover:bg-destructive-muted hover:text-destructive" onClick={() => handleDelete(u.id, u.name)}>삭제</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
