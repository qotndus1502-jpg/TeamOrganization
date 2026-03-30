"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
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

function TreeNode({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`relative ${className}`}>{children}</div>;
}

function TreeConnector({ direction = "right" }: { direction?: "right" | "down" }) {
  if (direction === "down") return <div className="w-px h-6 bg-gray-300 mx-auto" />;
  return <div className="w-8 h-px bg-gray-300 flex-shrink-0" />;
}

function TreeBranch({ children }: { children: React.ReactNode }) {
  const items = React.Children.toArray(children);
  if (items.length === 0) return null;
  return (
    <div className="relative flex flex-col gap-0">
      {/* 수직선 */}
      {items.length > 1 && (
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-300" style={{ top: "50%" }} />
      )}
      {items.map((child, i) => (
        <div key={i} className="relative flex items-center">
          {/* 수평 연결선 */}
          <div className="w-6 h-px bg-gray-300 flex-shrink-0" />
          {child}
        </div>
      ))}
    </div>
  );
}

function CompanyTreeLayout({ companyFilter, locations, onSelectTeam }: {
  companyFilter: string | null;
  locations: { label: string; teams: Team[]; categories: { label: string; teams: Team[] }[] }[];
  onSelectTeam: (id: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // SVG 라인 그리기
  useEffect(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container) return;

    const rect = container.getBoundingClientRect();
    svg.setAttribute("width", String(rect.width));
    svg.setAttribute("height", String(rect.height));

    // 기존 라인 제거
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const drawLine = (from: Element, to: Element) => {
      const fr = from.getBoundingClientRect();
      const tr = to.getBoundingClientRect();
      const x1 = fr.right - rect.left;
      const y1 = fr.top + fr.height / 2 - rect.top;
      const x2 = tr.left - rect.left;
      const y2 = tr.top + tr.height / 2 - rect.top;
      const midX = (x1 + x2) / 2;

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", `M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`);
      path.setAttribute("stroke", "#d1d5db");
      path.setAttribute("stroke-width", "1.5");
      path.setAttribute("fill", "none");
      svg.appendChild(path);
    };

    // 회사 → 소속
    const companyEl = container.querySelector("[data-node='company']");
    const locEls = container.querySelectorAll("[data-node='location']");
    locEls.forEach((el) => { if (companyEl) drawLine(companyEl, el); });

    // 소속 → 카테고리
    locEls.forEach((locEl) => {
      const locId = locEl.getAttribute("data-loc-id");
      const catEls = container.querySelectorAll(`[data-node='category'][data-parent='${locId}']`);
      catEls.forEach((catEl) => drawLine(locEl, catEl));
    });

  });

  const allLocs = locations.filter((l) => l.categories.length > 0 || l.teams.length > 0);

  return (
    <div ref={containerRef} className="relative p-10 min-w-fit">
      <svg ref={svgRef} className="absolute top-0 left-0 pointer-events-none" style={{ zIndex: 0 }} />

      <div className="relative flex items-start gap-0" style={{ zIndex: 1 }}>
        {/* 회사 */}
        <div className="flex-shrink-0 flex items-center" style={{ minHeight: allLocs.length > 1 ? `${allLocs.length * 200}px` : "auto", alignItems: "center" }}>
          <div data-node="company" className="bg-white/80 backdrop-blur-md border border-white/60 rounded-2xl px-8 py-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)] text-center">
            <span className="px-2.5 py-0.5 rounded-full bg-[#111] text-white text-[10px] font-semibold tracking-wider uppercase">Company</span>
            <h2 className="text-xl font-bold text-[#111] mt-2">{companyFilter || "남광토건"}</h2>
          </div>
        </div>

        {/* 소속 열 */}
        <div className="flex-shrink-0 flex flex-col justify-center gap-12 ml-16">
          {allLocs.map((loc) => (
            <div key={loc.label} className="flex items-start gap-0">
              {/* 소속 카드 */}
              <div className="flex-shrink-0 flex items-center" style={{ minHeight: loc.categories.length > 1 ? `${loc.categories.length * 120}px` : "auto", alignItems: "center" }}>
                <button
                  data-node="location" data-loc-id={loc.label}
                  onClick={() => { if (loc.teams.length > 0) onSelectTeam(loc.teams[0].id); }}
                  className="bg-white/80 backdrop-blur-md border border-white/60 rounded-xl px-7 py-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)] text-center hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all cursor-pointer"
                >
                  <h3 className="text-lg font-bold text-[#111]">{loc.label}</h3>
                  <p className="text-sm text-[#999] mt-0.5">{loc.teams.length}팀</p>
                </button>
              </div>

              {/* 카테고리 열 */}
              <div className="flex-shrink-0 flex flex-col justify-center gap-8 ml-14">
                {loc.categories.length > 0 ? loc.categories.map((cat) => (
                  <div key={cat.label} className="flex items-start gap-0">
                    {/* 카테고리 카드 */}
                    <div className="flex-shrink-0 flex items-center" style={{ minHeight: cat.teams.length > 3 ? `${Math.ceil(cat.teams.length / 3) * 80}px` : "auto", alignItems: "center" }}>
                      <button
                        data-node="category" data-cat-id={`${loc.label}-${cat.label}`} data-parent={loc.label}
                        onClick={() => { if (cat.teams.length > 0) onSelectTeam(cat.teams[0].id); }}
                        className="bg-white/70 backdrop-blur-md border border-white/50 rounded-xl px-5 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] text-center min-w-[120px] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all cursor-pointer"
                      >
                        <p className="text-base font-bold text-[#111]">{cat.label}</p>
                        <p className="text-sm text-[#999] mt-0.5">{cat.teams.length}팀</p>
                      </button>
                    </div>

                    {/* 팀 그리드 */}
                    {cat.teams.length > 0 && (
                      <div className="flex flex-col gap-2 ml-12">
                        {(() => {
                          const rows = [];
                          for (let i = 0; i < cat.teams.length; i += 3) {
                            rows.push(cat.teams.slice(i, i + 3));
                          }
                          return rows.map((row, ri) => (
                            <div key={ri} className="flex gap-2">
                              {row.map((team) => (
                                <button key={team.id}
                                  data-node="team" data-parent={`${loc.label}-${cat.label}`}
                                  onClick={() => onSelectTeam(team.id)}
                                  className="premium-card relative rounded-2xl p-4 text-left overflow-hidden min-w-[130px] min-h-[80px] flex flex-col justify-between"
                                  style={{ background: "linear-gradient(135deg, #C1FD3C 60%, #d9fea0 100%)" }}>
                                  <h4 className="text-base font-extrabold text-[#2B3037] leading-tight">{team.name}</h4>
                                  <span className="mt-2 px-2.5 py-0.5 rounded-full bg-white text-sm font-bold text-[#2B3037] self-start">{team._count.employees}명</span>
                                </button>
                              ))}
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="bg-white/50 border border-white/50 rounded-xl p-5 text-center text-sm text-[#999]">
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

function TeamListView({ teams, companyFilter, onSelectTeam }: {
  teams: Team[]; companyFilter: string | null; onSelectTeam: (id: number) => void;
}) {
  const [dbCategories, setDbCategories] = useState<{ id: number; name: string; company: string; locationId: number }[]>([]);

  useEffect(() => {
    fetch("/api/admin/categories").then((r) => r.ok ? r.json() : []).then(setDbCategories).catch(() => {});
  }, []);

  const hqTeams = teams.filter((t) => t.location.type === "HQ");
  const siteTeams = teams.filter((t) => t.location.type === "SITE");

  const groupByCategory = (teamList: Team[], locationType: string) => {
    const grouped: { label: string; teams: Team[] }[] = [];
    // 해당 소속의 locationId 목록
    const locationIds = [...new Set(teamList.map((t) => t.location.id))];
    // DB에 등록된 카테고리 (해당 소속의 것만)
    const locCats = dbCategories.filter((c) => locationIds.includes(c.locationId));
    const catNames = [...new Set([
      ...locCats.map((c) => c.name),
      ...teamList.map((t) => t.category).filter(Boolean) as string[],
    ])];
    for (const cat of catNames) {
      const filtered = teamList.filter((t) => t.category === cat);
      grouped.push({ label: cat, teams: filtered });
    }
    const uncategorized = teamList.filter((t) => !t.category);
    if (uncategorized.length > 0) grouped.push({ label: "기타", teams: uncategorized });
    return grouped;
  };

  const locations = [
    { label: "본사", teams: hqTeams, categories: groupByCategory(hqTeams, "HQ") },
    { label: "현장", teams: siteTeams, categories: groupByCategory(siteTeams, "SITE") },
  ];

  return (
    <div className="flex-1 overflow-auto flex items-center justify-center min-h-[calc(100vh-4rem)]" style={{ background: "linear-gradient(160deg, #fdfcf9 0%, #faf8f3 30%, #f7f4ee 60%, #fbf9f5 100%)" }}>
      <style>{`
        @keyframes cardSweep {
          0% { transform: translateX(-100%) rotate(25deg); }
          100% { transform: translateX(300%) rotate(25deg); }
        }
        .premium-card {
          transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .premium-card:hover {
          transform: translateY(-2px) scale(1.01);
          box-shadow: 0 12px 24px rgba(249,115,22,0.2), 0 0 0 1px rgba(249,115,22,0.15);
        }
      `}</style>

      <CompanyTreeLayout companyFilter={companyFilter} locations={locations} onSelectTeam={onSelectTeam} />
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

  // URL의 team 파라미터 변경 시 반영
  useEffect(() => {
    if (teamParam) {
      setSelectedTeamId(Number(teamParam));
    }
  }, [teamParam]);
  const [slidePhase, setSlidePhase] = useState(0); // 0=정상, 1=나감, 2=들어옴
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const triggerZoom = (action: () => void) => {
    setSlidePhase(1);
    setTimeout(() => {
      action();
      setSlidePhase(2);
    }, 250);
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

    // "나의 팀" 파라미터로 진입 시, 해당 팀이 목록에 없으면 전체에서 추가
    if (teamParam) {
      const tid = Number(teamParam);
      const found = mainTeams.find((t) => t.id === tid);
      if (!found) {
        const allRes: Team[] = await fetch("/api/teams").then((r) => r.json());
        const myTeam = allRes.find((t) => t.id === tid);
        if (myTeam) mainTeams.push(myTeam);
        setAllTeams(allRes);
        setTeams(mainTeams);
        return;
      }
    }

    setTeams(mainTeams);

    // 부서이동용 전체 팀 목록
    fetch("/api/teams").then((r) => r.json()).then(setAllTeams);
  }, [companyFilter, teamParam]);

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
        transition: slidePhase === 2 ? "none" : "transform 0.3s ease-out, opacity 0.3s ease-out",
        transform: slidePhase === 1 ? "translateX(-30px)" : slidePhase === 2 ? "translateX(30px)" : "translateX(0)",
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
            <div className="px-3 pb-4 mb-2 border-b border-gray-200">
              <h2 className="text-2xl font-black text-gray-900">{companyFilter || "전체"} 팀 목록</h2>
            </div>
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
          <div className="flex-1 overflow-y-auto space-y-0.5">
            {filteredTeams.map((team) => (
              <button
                key={team.id}
                onClick={() => handleSelectTeam(team.id)}
                className={`w-full flex items-center gap-3.5 px-3 py-2 rounded-xl text-left transition-all duration-200 ${
                  selectedTeamId === team.id
                    ? "bg-gray-100 border border-gray-200"
                    : "hover:bg-[#faf7f2] border border-transparent"
                }`}
              >
                <div className="min-w-0 flex-1 flex items-baseline gap-2">
                  <p className={`text-lg font-semibold truncate ${selectedTeamId === team.id ? "text-gray-900" : "text-gray-700"}`}>{team.name}</p>
                  <p className={`text-sm flex-shrink-0 ${selectedTeamId === team.id ? "text-gray-500" : "text-gray-400"}`}>{team._count.employees}명</p>
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
