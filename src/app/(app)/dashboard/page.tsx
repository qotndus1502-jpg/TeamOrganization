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
      className="relative rounded-2xl bg-card shadow-sm hover:shadow-xl border border-border/40 text-left transition-all duration-300 group overflow-hidden cursor-pointer p-6 flex flex-col justify-between h-40 hover:border-primary/20"
    >
      <div className="flex items-start justify-between">
        <h3 className="text-xl font-bold text-foreground leading-tight">{team.name}</h3>
        <div className="w-8 h-8 rounded-lg bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
          <svg className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {/* 호버 블러 오버레이 */}
      <div className="absolute top-0 bottom-0 right-0 bg-foreground/60 backdrop-blur-xl translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out z-20 rounded-l-3xl border-l border-card/10" style={{ width: "60%" }}>
        <div className="h-full flex flex-col justify-between p-5 pt-5">
          <div>
            <p className="text-primary-foreground/40 text-[10px] font-semibold tracking-[0.15em] uppercase mb-3">Team Leader</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-foreground/15 overflow-hidden flex-shrink-0 ring-1 ring-primary-foreground/20">
                {team.leader?.photoUrl ? (
                  <img src={team.leader.photoUrl} alt={team.leader.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-primary-foreground/60 text-sm font-bold">
                    {team.leader?.name?.charAt(0) || "?"}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-primary-foreground font-semibold text-sm truncate">{team.leader?.name || "미배정"}</p>
                <p className="text-primary-foreground/40 text-xs">{team.leader ? `${team.leader.position} · ${team.leader.role}` : "팀장 미배정"}</p>
              </div>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <span className="text-3xl font-black text-primary-foreground tabular-nums">{String(memberCount).padStart(2, "0")}</span>
              <span className="text-sm text-primary-foreground/40 ml-1">명</span>
            </div>
            <span className="text-[10px] text-primary-foreground/25 font-medium tracking-wider uppercase">Members</span>
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
      <h2 className="text-lg font-semibold text-foreground mb-4">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} onSelect={onSelect} isAdmin={isAdmin} onImageUpdate={onImageUpdate} />
        ))}
      </div>
    </div>
  );
}

// 브래킷 트리 라인: 부모 오른쪽 → 수평 → 수직 스파인 → 수평 → 자식 왼쪽
function drawBracketLines(svg: SVGSVGElement, container: HTMLDivElement) {
  const rect = container.getBoundingClientRect();
  svg.setAttribute("width", String(rect.width));
  svg.setAttribute("height", String(rect.height));
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const line = (x1: number, y1: number, x2: number, y2: number) => {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
    el.setAttribute("x1", String(x1)); el.setAttribute("y1", String(y1));
    el.setAttribute("x2", String(x2)); el.setAttribute("y2", String(y2));
    const borderColor = getComputedStyle(document.documentElement).getPropertyValue("--border").trim() || "#E2E8F0";
    el.setAttribute("stroke", borderColor); el.setAttribute("stroke-width", "1.5");
    svg.appendChild(el);
  };

  const connectParentToChildren = (parentEl: Element, childEls: Element[]) => {
    if (childEls.length === 0) return;
    const pr = parentEl.getBoundingClientRect();
    const px = pr.right - rect.left;
    const py = pr.top + pr.height / 2 - rect.top;

    const childMids = childEls.map((el) => {
      const cr = el.getBoundingClientRect();
      return { x: cr.left - rect.left, y: cr.top + cr.height / 2 - rect.top };
    });

    const spineX = px + 24;
    // 부모 → 스파인
    line(px, py, spineX, py);

    if (childEls.length === 1) {
      // 1개면 직선
      line(spineX, py, childMids[0].x, childMids[0].y);
    } else {
      // 수직 스파인
      const minY = Math.min(...childMids.map((c) => c.y));
      const maxY = Math.max(...childMids.map((c) => c.y));
      line(spineX, minY, spineX, maxY);
      // 각 자식으로 수평선
      childMids.forEach((c) => { line(spineX, c.y, c.x, c.y); });
    }
  };

  // 소속(본사/현장) → 회사
  const locEls = Array.from(container.querySelectorAll("[data-node='location']"));
  locEls.forEach((locEl) => {
    const locId = locEl.getAttribute("data-loc-id");
    const companyEls = Array.from(container.querySelectorAll(`[data-node='company'][data-parent='${locId}']`));
    if (companyEls.length > 0) connectParentToChildren(locEl, companyEls);
  });

  // 회사 → 카테고리
  const companyEls = Array.from(container.querySelectorAll("[data-node='company']"));
  companyEls.forEach((companyEl) => {
    const companyId = companyEl.getAttribute("data-company-id");
    const catEls = Array.from(container.querySelectorAll(`[data-node='category'][data-parent='${companyId}']`));
    if (catEls.length > 0) connectParentToChildren(companyEl, catEls);
  });
}

const COMPANY_STYLES: Record<string, string> = {
  "남광토건": "bg-[#2563EB] text-white",
  "극동건설": "bg-[#3B82F6] text-white",
  "금광기업": "bg-[#60A5FA] text-white",
};

const LOC_STYLE = "bg-gradient-to-br from-[#6366F1] to-[#818CF8] shadow-[#6366F1]/20";

function LocationTreeLayout({ locationType, locLabel, companyGroups, onSelectTeam, userTeamId }: {
  locationType: string;
  locLabel: string;
  companyGroups: { company: string; teams: Team[]; categories: { label: string; teams: Team[] }[] }[];
  onSelectTeam: (id: number) => void;
  userTeamId?: number | null;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (svgRef.current && containerRef.current) {
      drawBracketLines(svgRef.current, containerRef.current);
    }
  });

  return (
    <div ref={containerRef} className="relative p-10 min-w-fit">
      <svg ref={svgRef} className="absolute top-0 left-0 pointer-events-none" style={{ zIndex: 0 }} />

      <div className="relative flex items-center" style={{ zIndex: 1 }}>
        {/* 본사/현장 */}
        <div className="flex-shrink-0">
          <div data-node="location" data-loc-id={locLabel} className={`${LOC_STYLE} rounded-2xl w-[160px] h-[80px] shadow-lg flex flex-col items-center justify-center text-center`}>
            <h2 className="text-base font-bold text-white">{locLabel}</h2>
          </div>
        </div>

        {/* 회사 열 */}
        <div className="flex flex-col gap-10 ml-16">
          {companyGroups.map((cg) => (
            <div key={cg.company} className="flex items-center">
              {/* 회사 */}
              <div className="flex-shrink-0">
                <div
                  data-node="company" data-company-id={`${locLabel}-${cg.company}`} data-parent={locLabel}
                  className={`${COMPANY_STYLES[cg.company] || "bg-card text-foreground"} rounded-2xl w-[160px] h-[80px] shadow-sm flex flex-col items-center justify-center text-center`}
                >
                  <h3 className="text-base font-bold">{cg.company}</h3>
                  <p className="text-xs mt-0.5 opacity-70">{cg.teams.length}팀</p>
                </div>
              </div>

              {/* 카테고리 열 */}
              <div className="flex flex-col gap-6 ml-16">
                {cg.categories.length > 0 ? cg.categories.map((cat) => (
                  <div key={cat.label} className="flex items-center gap-0">
                    <div className="flex-shrink-0">
                      <button
                        data-node="category" data-cat-id={`${locLabel}-${cg.company}-${cat.label}`} data-parent={`${locLabel}-${cg.company}`}
                        onClick={() => { if (cat.teams.length > 0) onSelectTeam(cat.teams[0].id); }}
                        className="bg-card/90 border border-border/30 rounded-2xl w-[160px] h-[80px] shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md hover:border-primary/15 transition-all duration-200 cursor-pointer"
                      >
                        <p className="text-base font-bold text-foreground">{cat.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{cat.teams.length}팀</p>
                      </button>
                    </div>

                    {cat.teams.length > 0 && (
                      <div className="flex flex-col gap-2 ml-10">
                        {(() => {
                          const rows = [];
                          for (let i = 0; i < cat.teams.length; i += 3) {
                            rows.push(cat.teams.slice(i, i + 3));
                          }
                          return rows.map((row, ri) => (
                            <div key={ri} className="flex gap-2">
                              {row.map((team) => (
                                <button key={team.id}
                                  onClick={() => onSelectTeam(team.id)}
                                  className={`premium-card relative rounded-xl w-[160px] h-[80px] p-4 text-left overflow-hidden flex flex-col justify-between bg-accent hover:border-primary/30 ${userTeamId === team.id ? "border-2 border-primary ring-2 ring-primary/20" : "border border-primary/15"}`}>
                                  <div className="flex items-center gap-1.5">
                                    <h4 className="text-base font-extrabold text-foreground leading-tight">{team.name}</h4>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className="px-2.5 py-0.5 rounded-full bg-card text-sm font-bold text-foreground">{team._count.employees}명</span>
                                    {userTeamId === team.id && <span className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[9px] font-bold">MyTeam</span>}
                                  </div>
                                </button>
                              ))}
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="bg-card/50 border border-border/30 rounded-xl p-5 text-center text-sm text-muted-foreground">
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

function TeamListView({ teams, companyFilter, onSelectTeam, userTeamId }: {
  teams: Team[]; companyFilter: string | null; onSelectTeam: (id: number) => void; userTeamId?: number | null;
}) {
  const [dbCategories, setDbCategories] = useState<{ id: number; name: string; company: string; locationId: number; location: { id: number; company: string; type: string } }[]>([]);

  useEffect(() => {
    fetch("/api/admin/categories").then((r) => r.ok ? r.json() : []).then(setDbCategories).catch(() => {});
  }, []);

  const companies = ["남광토건", "극동건설", "금광기업"];

  const groupByCategory = (teamList: Team[], company: string, locType: string) => {
    const grouped: { label: string; teams: Team[] }[] = [];
    // DB 카테고리에서 해당 회사+소속 타입에 맞는 것 가져오기
    const locCats = dbCategories.filter((c) => c.location.company === company && c.location.type === locType);
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

  const locationTypes = [
    { type: "HQ", label: "본사" },
    { type: "SITE", label: "현장" },
  ];

  const locationData = locationTypes.map(({ type, label }) => {
    const companyGroups = companies.map((company) => {
      const companyTeams = teams.filter((t) => t.location.company === company && t.location.type === type);
      return {
        company,
        teams: companyTeams,
        categories: groupByCategory(companyTeams, company, type),
      };
    });
    return { type, label, companyGroups };
  });

  return (
    <div className="flex-1 overflow-auto min-h-[calc(100vh-4rem)]">
      <style>{`
        .premium-card {
          transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .premium-card:hover {
          transform: translateY(-2px) scale(1.01);
          box-shadow: var(--shadow-lg), 0 0 0 1px hsl(from var(--primary) h s l / 0.15);
        }
      `}</style>

      <div className="flex flex-col items-start gap-12 py-10 px-10">
        {locationData.map((data) => (
          <LocationTreeLayout
            key={data.type}
            locationType={data.type}
            locLabel={data.label}
            companyGroups={data.companyGroups}
            onSelectTeam={onSelectTeam}
            userTeamId={userTeamId}
          />
        ))}
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
  teamId: number | null;
  employeeId: number | null;
}


export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center text-muted-foreground">불러오는 중...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const companyFilter = searchParams.get("company");
  const teamParam = searchParams.get("team");
  const employeeParam = searchParams.get("employee");

  const [user, setUser] = useState<User | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(teamParam ? Number(teamParam) : null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [activeTab, setActiveTab] = useState<"HQ" | "SITE">("HQ");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [employeePanelOpen, setEmployeePanelOpen] = useState(false);
  const [autoOpenEmployeeId, setAutoOpenEmployeeId] = useState<number | null>(employeeParam ? Number(employeeParam) : null);

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
    // 직원은 자기 팀만 볼 수 있음 (관리자/임원은 전체)
    if (user && !user.role.includes("ADMIN") && !user.role.includes("EXECUTIVE") && user.teamId && user.teamId !== id) {
      alert("자신의 팀만 조회할 수 있습니다.");
      return;
    }
    triggerZoom(() => { setSelectedTeamId(id); setSidebarOpen(false); });
  };


  const isAdmin = user?.role.includes("ADMIN");

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((data) => {
      if (!data) { window.location.href = "/login"; return; }
      setUser(data);
    });
  }, []);

  const loadTeams = useCallback(async () => {
    const allRes: Team[] = await fetch("/api/teams").then((r) => r.json());
    setTeams(allRes);
    setAllTeams(allRes);
  }, []);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  const initialLoadDone = useRef(false);
  const loadEmployees = useCallback(() => {
    if (selectedTeamId === null) { setEmployees([]); initialLoadDone.current = false; return; }
    if (!initialLoadDone.current) setLoadingEmployees(true);
    fetch(`/api/employees?teamId=${selectedTeamId}`)
      .then((r) => r.json())
      .then((data: Employee[]) => { setEmployees(data); setLoadingEmployees(false); initialLoadDone.current = true; });
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
        className="fixed bottom-8 right-8 z-50 bg-card hover:bg-muted text-foreground px-5 py-2.5 rounded-full shadow-xl border border-border/60 hover:shadow-2xl transition-all duration-200 text-sm font-semibold flex items-center gap-2 active:scale-95"
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
        <div className="fixed inset-0 bg-foreground/20 z-30" onClick={() => setSidebarOpen(false)} />
      )}

      {/* 사이드바 */}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-card/95 backdrop-blur-md shadow-2xl z-40 transform transition-transform duration-300 ease-in-out border-r border-border/50 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        onMouseLeave={() => setSidebarOpen(false)}
      >
        <div className="p-5 h-full flex flex-col">
          <div className="mb-5">
            <div className="px-1 pb-4 mb-2">
              <h2 className="text-xl font-bold text-foreground">{companyFilter || "전체"}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">팀 목록</p>
            </div>
            <div className="flex gap-1 bg-muted rounded-xl p-1">
              <button
                onClick={() => setActiveTab("HQ")}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === "HQ" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                본사
              </button>
              <button
                onClick={() => setActiveTab("SITE")}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === "SITE" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                현장
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
            {filteredTeams.map((team) => (
              <button
                key={team.id}
                onClick={() => handleSelectTeam(team.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all duration-200 ${
                  selectedTeamId === team.id
                    ? "bg-primary/10 text-primary border border-primary/15"
                    : "hover:bg-muted border border-transparent text-foreground/70"
                }`}
              >
                <p className={`text-sm font-semibold truncate ${selectedTeamId === team.id ? "text-primary" : ""}`}>{team.name}</p>
                <span className={`text-xs font-medium flex-shrink-0 ml-2 tabular-nums ${selectedTeamId === team.id ? "text-primary/60" : "text-muted-foreground"}`}>{team._count.employees}명</span>
              </button>
            ))}
            {filteredTeams.length === 0 && (
              <div className="text-center py-10">
                <p className="text-sm text-muted-foreground">등록된 팀이 없습니다</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="h-full flex flex-col">
        {selectedTeamId ? (
          <div className="fixed inset-0 top-0 z-20 bg-card/95 backdrop-blur-sm flex flex-col">
            {/* 조직도 — 전체 영역 */}
            <div className="flex-1 overflow-auto">
              {loadingEmployees ? (
                <div className="mt-32 text-center">
                  <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-muted text-muted-foreground text-sm">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                    불러오는 중...
                  </div>
                </div>
              ) : employees.length === 0 ? (
                <div className="mt-32 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                  </div>
                  <p className="text-muted-foreground text-sm">등록된 팀원이 없습니다</p>
                </div>
              ) : (
                <TeamOrgChart
                  leader={leader}
                  members={members}
                  teamName={selectedTeam?.name}
                  teamSub={`${selectedTeam?.location.company} · ${selectedTeam?.location.name}`}
                  onPanelChange={(open) => { setEmployeePanelOpen(open); if (open) setSidebarOpen(false); }}
                  isAdmin={isAdmin}
                  onUpdate={loadEmployees}
                  currentEmployeeId={user?.employeeId}
                  autoOpenEmployeeId={autoOpenEmployeeId}
                />
              )}
            </div>
          </div>
        ) : (
          <TeamListView
            teams={teams}
            companyFilter={companyFilter}
            onSelectTeam={handleSelectTeam}
            userTeamId={user?.teamId}
          />
        )}
      </div>

    </div>
    </>
  );
}
