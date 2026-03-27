"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import TeamOrgChart from "@/components/TeamOrgChart";

function TeamCard({ team, onSelect, isAdmin, onImageUpdate }: {
  team: Team; onSelect: (id: number) => void; isAdmin?: boolean;
  onImageUpdate?: (teamId: number, imageUrl: string | null, imageStyle?: string | null) => void;
}) {
  const isHQ = team.location.type === "HQ";
  const memberCount = team._count.employees - (team.leader ? 1 : 0);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);

  const parsedStyle: ImageStyle = team.imageStyle
    ? JSON.parse(team.imageStyle)
    : { scale: 1, x: 0, y: 0 };
  const [imgStyle, setImgStyle] = useState<ImageStyle>(parsedStyle);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const uploadRes = await fetch("/api/upload/photo", { method: "POST", body: fd });
    if (uploadRes.ok) {
      const { url } = await uploadRes.json();
      const newStyle = { scale: 1, x: 0, y: 0 };
      setImgStyle(newStyle);
      const saveRes = await fetch(`/api/admin/teams/${team.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: team.name, locationId: team.location.id, imageUrl: url, imageStyle: JSON.stringify(newStyle) }),
      });
      if (saveRes.ok) onImageUpdate?.(team.id, url, JSON.stringify(newStyle));
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleRemovePhoto = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await fetch(`/api/admin/teams/${team.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: team.name, locationId: team.location.id, imageUrl: null, imageStyle: null }),
    });
    if (res.ok) { setEditing(false); onImageUpdate?.(team.id, null, null); }
  };

  const handleSaveStyle = async () => {
    const styleJson = JSON.stringify(imgStyle);
    await fetch(`/api/admin/teams/${team.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: team.name, locationId: team.location.id, imageStyle: styleJson }),
    });
    onImageUpdate?.(team.id, team.imageUrl, styleJson);
    setEditing(false);
  };

  return (
    <div
      onClick={() => onSelect(team.id)}
      className="relative rounded-2xl bg-white shadow-sm hover:shadow-xl border border-gray-100 text-left transition-all duration-300 group overflow-hidden cursor-pointer p-6 flex flex-col justify-between h-40"
    >
      <h3 className="text-2xl font-bold text-gray-900">{team.name}</h3>

      {/* 호버 블러 오버레이 — 우측에서 등장 */}
      <div className="absolute top-0 bottom-0 right-0 bg-black/40 backdrop-blur-xl translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out z-20 rounded-l-3xl border-l border-white/10" style={{ width: "60%" }}>
        <div className="h-full flex flex-col justify-between p-5 pt-5">
          {/* 팀장 */}
          <div>
            <p className="text-white/50 text-[10px] font-medium tracking-widest uppercase mb-3">Team Leader</p>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-white/15 overflow-hidden flex-shrink-0 ring-1 ring-white/20">
                {team.leader?.photoUrl ? (
                  <img src={team.leader.photoUrl} alt={team.leader.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/60 text-sm font-bold">
                    {team.leader?.name?.charAt(0) || "?"}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm truncate">{team.leader?.name || "미배정"}</p>
                <p className="text-white/40 text-xs">{team.leader ? `${team.leader.position} · ${team.leader.role}` : "팀장 미배정"}</p>
              </div>
            </div>
          </div>
          {/* 하단 */}
          <div className="flex items-end justify-between">
            <div>
              <span className="text-3xl font-bold text-white">{String(memberCount).padStart(2, "0")}</span>
              <span className="text-sm text-white/40 ml-1.5">명</span>
            </div>
            <span className="text-xs text-white/30 font-medium tracking-wider uppercase">Members</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamSection({ title, teams, onSelect, isAdmin, onImageUpdate }: {
  title: string; teams: Team[]; onSelect: (id: number) => void;
  isAdmin?: boolean; onImageUpdate?: (teamId: number, imageUrl: string | null, imageStyle?: string | null) => void;
}) {
  if (teams.length === 0) return null;
  return (
    <div className="mb-10">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} onSelect={onSelect} isAdmin={isAdmin} onImageUpdate={onImageUpdate} />
        ))}
      </div>
    </div>
  );
}

function TeamListView({ teams, companyFilter, onSelectTeam }: {
  teams: Team[]; companyFilter: string | null; onSelectTeam: (id: number) => void;
}) {
  const hqTeams = teams.filter((t) => t.location.type === "HQ");
  const siteTeams = teams.filter((t) => t.location.type === "SITE");

  const CATEGORY_ORDER = ["건축사업본부", "토목사업본부", "경영지원실", "기타"];
  const groupByCategory = (teamList: Team[]) => {
    const grouped: { label: string; teams: Team[] }[] = [];
    for (const cat of CATEGORY_ORDER) {
      const filtered = teamList.filter((t) => (t.category || "기타") === cat);
      if (filtered.length > 0) grouped.push({ label: cat, teams: filtered });
    }
    const uncategorized = teamList.filter((t) => !t.category && !CATEGORY_ORDER.includes("기타"));
    if (uncategorized.length > 0) grouped.push({ label: "기타", teams: uncategorized });
    return grouped;
  };

  const locations = [
    { label: "본사", teams: hqTeams, categories: groupByCategory(hqTeams) },
    { label: "현장", teams: siteTeams, categories: groupByCategory(siteTeams) },
  ];

  return (
    <div className="flex-1 overflow-auto flex items-center justify-center min-h-[calc(100vh-4rem)]" style={{ background: "#EEF2F6" }}>
      <style>{`
        @keyframes cardSweep {
          0% { transform: translateX(-100%) rotate(25deg); }
          100% { transform: translateX(300%) rotate(25deg); }
        }
        .premium-card {
          transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .premium-card:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 20px 40px rgba(249,115,22,0.35), 0 0 0 1px rgba(249,115,22,0.2);
        }
      `}</style>

      <div className="flex justify-center p-10 gap-0">

        {/* 왼쪽: 회사 + 연결선 (본사/현장 세로 중앙) */}
        <div className="flex-shrink-0 flex flex-col justify-center">
          <div className="flex items-center">
            <div className="relative bg-white/70 backdrop-blur-[20px] border border-white/50 rounded-[32px] px-10 py-8 shadow-[0_8px_40px_rgba(167,199,200,0.2)] text-center overflow-hidden">
              <div className="absolute inset-0 overflow-hidden rounded-[32px]">
                <div className="absolute -inset-full w-[50%] h-full bg-gradient-to-r from-transparent via-white/30 to-transparent" style={{ animation: "cardSweep 5s ease-in-out infinite" }} />
              </div>
              <div className="relative z-10">
                <span className="px-3 py-1 rounded-full bg-[#111111] text-white text-[10px] font-semibold tracking-wider uppercase">Company</span>
                <h2 className="text-2xl font-bold text-[#111111] mt-3">{companyFilter || "남광토건"}</h2>
              </div>
            </div>
            <div className="w-12 h-px bg-gradient-to-r from-gray-400 to-gray-300" />
          </div>
        </div>

        {/* 2단: 본사/현장 → 3단: 카테고리 → 4단: 팀 */}
        <div className="flex flex-col gap-14">
          {locations.map((loc) => (
            <div key={loc.label} className="flex items-center gap-0">
              {/* 본사/현장 노드 */}
              <div className="flex-shrink-0">
                <div className="relative bg-white/70 backdrop-blur-[20px] border border-white/50 rounded-[24px] px-10 py-8 shadow-[0_4px_24px_rgba(167,199,200,0.15)] text-center overflow-hidden">
                  <div className="absolute inset-0 overflow-hidden rounded-[24px]">
                    <div className="absolute -inset-full w-[50%] h-full bg-gradient-to-r from-transparent via-white/30 to-transparent" style={{ animation: "cardSweep 5s ease-in-out infinite" }} />
                  </div>
                  <div className="relative z-10">
                    <h2 className="text-2xl font-bold text-[#111111]">{loc.label}</h2>
                    <p className="text-base text-[#999999] mt-1">{loc.teams.length}팀</p>
                  </div>
                </div>
              </div>

              {/* 연결선 2→3 */}
              <div className="flex-shrink-0">
                <div className="w-8 h-px bg-gray-400" />
              </div>

              {/* 카테고리 → 팀 */}
              <div className="flex flex-col gap-8">
                {loc.categories.length > 0 ? loc.categories.map((cat) => (
                  <div key={cat.label} className="flex items-center gap-0">
                    {/* 카테고리 노드 */}
                    <div className="flex-shrink-0">
                      <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl px-6 py-4 shadow-[0_2px_16px_rgba(167,199,200,0.1)] text-center min-w-[120px]">
                        <p className="text-base font-bold text-[#111111]">{cat.label}</p>
                        <p className="text-xs text-[#999999] mt-0.5">{cat.teams.length}팀</p>
                      </div>
                    </div>

                    {/* 연결선 3→4 */}
                    <div className="flex-shrink-0">
                      <div className="w-6 h-px bg-gray-400" />
                    </div>

                    {/* 팀 카드 그리드 */}
                    <div className="grid grid-cols-3 gap-3">
                      {cat.teams.map((team) => (
                        <button
                          key={team.id}
                          onClick={() => onSelectTeam(team.id)}
                          className="premium-card relative rounded-[20px] p-5 text-left overflow-hidden group min-h-[100px] flex flex-col justify-between"
                          style={{ background: "linear-gradient(135deg, #F97316 0%, #EA580C 50%, #DC2626 100%)" }}
                        >
                          {/* 장식 원 */}
                          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
                          <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5" />
                          <div className="relative z-10 flex flex-col justify-between h-full gap-3">
                            <h3 className="text-xl font-extrabold text-white leading-tight">{team.name}</h3>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-white/50 font-medium uppercase tracking-wider">Members</span>
                              <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-base font-bold text-white">{team._count.employees}명</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )) : (
                  <div className="bg-white/50 backdrop-blur-[20px] border border-white/50 rounded-[20px] p-6 text-center text-sm text-[#999999]">
                    등록된 팀이 없습니다
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

interface Location {
  id: number;
  name: string;
  type: string;
  company: string;
}

interface TeamLeader {
  id: number;
  name: string;
  position: string;
  role: string;
  photoUrl: string | null;
}

interface ImageStyle {
  scale: number;
  x: number;
  y: number;
}

interface Team {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  imageStyle: string | null;
  category: string | null;
  location: Location;
  leader: TeamLeader | null;
  _count: { employees: number };
}

interface Employee {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  position: string;
  role: string;
  joinDate: string | null;
  resumePath: string | null;
  photoUrl: string | null;
  resumeData: string | null;
  teamId: number;
  team: Team & { location: Location };
}

interface User {
  id: number;
  name: string;
  role: string;
}


export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center text-gray-400">불러오는 중...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const companyFilter = searchParams.get("company");
  const teamParam = searchParams.get("team");

  const [user, setUser] = useState<User | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(teamParam ? Number(teamParam) : null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [activeTab, setActiveTab] = useState<"HQ" | "SITE">("HQ");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [employeePanelOpen, setEmployeePanelOpen] = useState(false);
  const [slidePhase, setSlidePhase] = useState(0); // 0=정상, 1=나감, 2=들어옴
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const triggerZoom = (action: () => void) => {
    setSlidePhase(1);
    setTimeout(() => {
      action();
      setSlidePhase(2);
    }, 400);
  };

  // phase 2가 되면 바로 0으로 전환 (들어오는 애니메이션 시작)
  useEffect(() => {
    if (slidePhase === 2) {
      const id = requestAnimationFrame(() => setSlidePhase(0));
      return () => cancelAnimationFrame(id);
    }
  }, [slidePhase]);

  const handleSelectTeam = (id: number) => {
    triggerZoom(() => { setSelectedTeamId(id); setSidebarOpen(false); });
  };


  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then(setUser);
  }, []);

  const loadTeams = useCallback(async () => {
    const url = companyFilter
      ? `/api/teams?company=${encodeURIComponent(companyFilter)}`
      : "/api/teams";
    const mainTeams: Team[] = await fetch(url).then((r) => r.json());
    setTeams(mainTeams);

    // 부서이동용 전체 팀 목록
    fetch("/api/teams").then((r) => r.json()).then(setAllTeams);
  }, [companyFilter]);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  const loadEmployees = useCallback(() => {
    if (selectedTeamId === null) { setEmployees([]); return; }
    setLoadingEmployees(true);
    fetch(`/api/employees?teamId=${selectedTeamId}`)
      .then((r) => r.json())
      .then((data: Employee[]) => { setEmployees(data); setLoadingEmployees(false); });
  }, [selectedTeamId]);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (selectedTeamId && !employeePanelOpen && e.clientX <= window.innerWidth * 0.1) setSidebarOpen(true);
  }, [selectedTeamId, employeePanelOpen]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  const filteredTeams = teams.filter((t) => t.location.type === activeTab);

  const leader = employees.find((e) => e.role === "팀장" || e.role === "부서장");
  const members = employees.filter((e) => e.role !== "팀장" && e.role !== "부서장");
  const selectedTeam = teams.find((t) => t.id === selectedTeamId);


  return (
    <>
    {/* 플로팅 나가기 버튼 (팀 조직도 또는 인사정보일 때만) */}
    {(selectedTeamId || employeePanelOpen) && (
      <button
        onClick={() => {
          if (employeePanelOpen) {
            setEmployeePanelOpen(false);
            const el = document.querySelector('[data-orgchart-close]') as HTMLElement;
            if (el) el.click();
          } else if (selectedTeamId) {
            setSelectedTeamId(null);
          }
        }}
        className="fixed bottom-8 right-8 z-50 bg-[#F97316] hover:bg-[#F97316] text-white px-5 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all text-sm font-medium flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        나가기
      </button>
    )}
    <div
      className="h-full overflow-hidden relative origin-center"
      style={{
        transition: slidePhase === 2 ? "none" : "transform 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.4s ease",
        transform: slidePhase === 1 ? "scale(1.3)" : slidePhase === 2 ? "scale(0.9)" : "scale(1)",
        opacity: slidePhase === 0 ? 1 : 0,
      }}
    >
      {/* 사이드바 오버레이 */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setSidebarOpen(false)} />
      )}

      {/* 사이드바 */}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        onMouseLeave={() => setSidebarOpen(false)}
      >
        <div className="p-5 h-full flex flex-col">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              {companyFilter || "전체"} 팀 목록
            </h2>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mt-3">
              <button
                onClick={() => setActiveTab("HQ")}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition ${
                  activeTab === "HQ" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                }`}
              >
                본사
              </button>
              <button
                onClick={() => setActiveTab("SITE")}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition ${
                  activeTab === "SITE" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                }`}
              >
                현장
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5">
            {filteredTeams.map((team) => (
              <button
                key={team.id}
                onClick={() => handleSelectTeam(team.id)}
                className={`w-full p-3 rounded-xl text-left transition ${
                  selectedTeamId === team.id
                    ? "bg-gray-100 shadow-sm"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{team.name}</div>
                    <span className="text-xs text-gray-400">{team.location.name}</span>
                  </div>
                  <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">{team._count.employees}명</span>
                </div>
              </button>
            ))}
            {filteredTeams.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">등록된 팀이 없습니다.</p>
            )}
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="h-full flex flex-col">
        {selectedTeamId ? (
          <div className="fixed inset-0 top-0 z-20 bg-white flex flex-col">
            {/* 조직도 — 전체 영역 */}
            <div className="flex-1 overflow-auto">
              {loadingEmployees ? (
                <p className="text-gray-500 mt-20 text-center">불러오는 중...</p>
              ) : employees.length === 0 ? (
                <p className="text-gray-500 mt-20 text-center">등록된 팀원이 없습니다.</p>
              ) : (
                <TeamOrgChart
                  leader={leader}
                  members={members}
                  teamName={selectedTeam?.name}
                  teamSub={`${selectedTeam?.location.company} · ${selectedTeam?.location.name}`}
                  onPanelChange={(open) => { setEmployeePanelOpen(open); if (open) setSidebarOpen(false); }}
                />
              )}
            </div>
          </div>
        ) : (
          <TeamListView
            teams={teams}
            companyFilter={companyFilter}
            onSelectTeam={handleSelectTeam}
          />
        )}
      </div>

    </div>
    </>
  );
}
