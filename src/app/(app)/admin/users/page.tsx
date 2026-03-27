"use client";

import { useEffect, useState } from "react";

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

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-gray-900 text-white",
  EXECUTIVE: "bg-orange-500 text-white",
  EMPLOYEE: "bg-gray-200 text-gray-700",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [changingRole, setChangingRole] = useState<number | null>(null);
  const [newRoleValue, setNewRoleValue] = useState("");

  const load = async () => {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const pendingUsers = users.filter((u) => u.pendingRole);

  const handleApprove = async (userId: number) => {
    await fetch(`/api/admin/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    load();
  };

  const handleReject = async (userId: number) => {
    if (!confirm("승인 요청을 거절하시겠습니까?")) return;
    await fetch(`/api/admin/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject" }),
    });
    load();
  };

  const handleChangeRole = async (userId: number) => {
    if (!newRoleValue) return;
    await fetch(`/api/admin/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "changeRole", role: newRoleValue }),
    });
    setChangingRole(null);
    setNewRoleValue("");
    load();
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-400">로딩 중...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">사용자 관리</h1>

      {/* 승인 대기 */}
      {pendingUsers.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold text-gray-800">승인 대기</h2>
            <span className="bg-orange-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {pendingUsers.length}
            </span>
          </div>
          <div className="space-y-3">
            {pendingUsers.map((u) => (
              <div key={u.id} className="bg-white rounded-2xl p-5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm">
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{u.name}</p>
                    <p className="text-sm text-gray-400">{u.email} · <span className="text-orange-500 font-medium">{ROLE_LABELS[u.pendingRole!]} 권한 요청</span></p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(u.id)}
                    className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition"
                  >
                    승인
                  </button>
                  <button
                    onClick={() => handleReject(u.id)}
                    className="px-5 py-2 bg-gray-100 text-gray-500 text-sm font-medium rounded-xl hover:bg-gray-200 transition"
                  >
                    거절
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 전체 사용자 */}
      <h2 className="text-lg font-bold text-gray-800 mb-4">전체 사용자</h2>
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="bg-white rounded-2xl p-5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm">
                {u.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{u.name}</p>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role] || "bg-gray-100 text-gray-600"}`}>
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                  {u.pendingRole && (
                    <span className="text-xs text-orange-500 font-medium">({ROLE_LABELS[u.pendingRole]} 대기)</span>
                  )}
                </div>
                <p className="text-sm text-gray-400 mt-0.5">
                  {u.email}
                  {u.employee && <span> · {u.employee.team.name} / {u.employee.position}</span>}
                </p>
              </div>
            </div>
            <div>
              {changingRole === u.id ? (
                <div className="flex items-center gap-2">
                  <select
                    value={newRoleValue}
                    onChange={(e) => setNewRoleValue(e.target.value)}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none"
                  >
                    <option value="EMPLOYEE">직원</option>
                    <option value="EXECUTIVE">임원</option>
                    <option value="ADMIN">관리자</option>
                  </select>
                  <button
                    onClick={() => handleChangeRole(u.id)}
                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition"
                  >
                    변경
                  </button>
                  <button
                    onClick={() => { setChangingRole(null); setNewRoleValue(""); }}
                    className="px-4 py-2 bg-gray-100 text-gray-500 text-sm font-medium rounded-xl hover:bg-gray-200 transition"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setChangingRole(u.id); setNewRoleValue(u.role); }}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition font-medium"
                >
                  역할 변경
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
