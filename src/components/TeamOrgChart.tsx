"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import PdfModal from "@/components/PdfModal";

interface Employee {
  id: number;
  name: string;
  nameEn: string | null;
  email: string;
  phone: string | null;
  phoneWork: string | null;
  emailWork: string | null;
  position: string;
  role: string;
  joinDate: string | null;
  resumePath: string | null;
  photoUrl: string | null;
  resumeData: string | null;
  team?: { name: string; location: { name: string; company: string } };
  birthDate?: string | null;
  address?: string | null;
  jobCategory?: string | null;
  jobRole?: string | null;
  employmentType?: string | null;
  entryType?: string | null;
  specialty?: string | null;
  hobby?: string | null;
  taskDetail?: string | null;
  skills?: string | null;
}

interface ResumeExtra {
  birthDate?: string;
  address?: string;
  jobCategory?: string;
  jobRole?: string;
  employmentType?: string;
  entryType?: string;
  specialty?: string;
  hobby?: string;
}

interface Education { period: string; school_name: string; major: string; degree: string; logoUrl?: string; }
interface Certification { name: string; acquisition_date: string; issuer: string; }
interface Experience { period: string; company: string; position: string; task: string; description?: string; }

function parseResumeData(data: string | null) {
  if (!data) return { education: [], certifications: [], experience: [], appointmentHistory: [], extra: {} as ResumeExtra };
  try {
    const rd = JSON.parse(data);
    return {
      education: (rd.education || []) as Education[],
      certifications: (rd.certifications || []) as Certification[],
      experience: (rd.experience || []) as Experience[],
      appointmentHistory: (rd.appointmentHistory || []) as Array<Record<string, string>>,
      extra: (rd.extra || {}) as ResumeExtra,
    };
  } catch { return { education: [], certifications: [], experience: [], appointmentHistory: [], extra: {} as ResumeExtra }; }
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const s = d.replace(/[\/\-]/g, ".").replace(/\s+/g, "");
  const m = s.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
  if (m) return `${m[1]}.${m[2].padStart(2,"0")}.${m[3].padStart(2,"0")}`;
  return d;
}

function fmtDateShort(d: string | null | undefined): string {
  if (!d) return "—";
  const s = d.replace(/[\/\-]/g, ".").replace(/\s+/g, "");
  const m = s.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
  if (m) return `${m[1]}.${m[2].padStart(2,"0")}`;
  return d;
}

function fmtPeriod(p: string | null | undefined): string {
  if (!p) return "—";
  const parts = p.split(/[~\-–—]/).map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2) return `${fmtDateShort(parts[0])} ~ ${fmtDateShort(parts[1])}`;
  if (parts.length === 1) return fmtDateShort(parts[0]);
  return p;
}

const POSITION_RING_COLORS: Record<string, string> = {
  부장: "border-gray-500/40",
  차장: "border-gray-500/30",
  과장: "border-gray-400/30",
  대리: "border-gray-400/25",
  주임: "border-gray-300/30",
  사원: "border-gray-300/25",
};

const POSITION_GLOW: Record<string, string> = {
  부장: "rgba(120,120,120,0.25)",
  차장: "rgba(120,120,120,0.2)",
  과장: "rgba(130,130,130,0.18)",
  대리: "rgba(140,140,140,0.15)",
  주임: "rgba(150,150,150,0.12)",
  사원: "rgba(160,160,160,0.1)",
};

/* ── 조직도 스타일 (Dusty Mint) ── */
function OrgChartStyles() {
  return (
    <style>{`
      @keyframes fadeUp { from { opacity:0; transform:translateX(-50%) translateY(6px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
      @keyframes cardPop { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
      @keyframes orgShimmer { 0% { transform: translateX(-100%) rotate(25deg); } 100% { transform: translateX(250%) rotate(25deg); } }
      @keyframes lineGlow {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.7; }
      }
      .org-node {
        transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
      }
      .org-node:hover {
        transform: scale(1.5);
        box-shadow: 0 20px 60px rgba(167,199,200,0.5), 0 8px 25px rgba(167,199,200,0.3);
        z-index: 10;
      }
    `}</style>
  );
}


/* ── 정보 항목 ── */
function InfoItem({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-sm text-gray-400 uppercase tracking-wider font-medium mb-1">{label}</p>
      <p className="text-lg text-gray-800">{value}</p>
    </div>
  );
}

/* ── 우측 프로필 대시보드 (SalesMonk 스타일) ── */
function ProfilePanel({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const parsed = parseResumeData(employee.resumeData);
  const { education, certifications } = parsed;
  const extra = {
    birthDate: employee.birthDate || undefined,
    address: employee.address || undefined,
    jobCategory: employee.jobCategory || undefined,
    jobRole: employee.jobRole || undefined,
    employmentType: employee.employmentType || undefined,
    entryType: employee.entryType || undefined,
    specialty: employee.specialty || undefined,
    hobby: employee.hobby || undefined,
    taskDetail: employee.taskDetail || undefined,
    skills: employee.skills || undefined,
  };
  const experience = [...parsed.experience].sort((a, b) => {
    const dateA = (a.period || "").replace(/\./g, "-");
    const dateB = (b.period || "").replace(/\./g, "-");
    return dateB.localeCompare(dateA);
  });
  const appointmentHistory = [...parsed.appointmentHistory].sort((a, b) => {
    const dateA = (a.date || "").replace(/\./g, "-");
    const dateB = (b.date || "").replace(/\./g, "-");
    return dateB.localeCompare(dateA);
  });
  // 만 나이 계산
  let age: number | null = null;
  if (extra.birthDate) {
    const bd = extra.birthDate.replace(/\./g, "-");
    const birth = new Date(bd);
    if (!isNaN(birth.getTime())) {
      const today = new Date();
      age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    }
  }

  const workRef = useRef<HTMLDivElement>(null);
  const schoolRef = useRef<HTMLDivElement>(null);
  const teamRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 지표 계산
  const joinDateStr = employee.joinDate;
  let yearsWorked = "—";
  let totalCareer = "—";
  if (joinDateStr) {
    const join = new Date(joinDateStr.replace(/\./g, "-"));
    const now = new Date();
    const diff = (now.getTime() - join.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    yearsWorked = diff >= 1 ? `${Math.floor(diff)}년` : `${Math.floor(diff * 12)}개월`;
    let prevMonths = 0;
    experience.forEach((e) => {
      if (!e.period) return;
      // "19.06.24 ~ 19.12.27" or "2019.06.24 ~ 2019.12.27" or "2019-06-24 ~ 2019-12-27"
      const cleaned = e.period.replace(/\(.*?\)/g, "");
      const dates = cleaned.split(/[~\-–—]/).map((s: string) => s.trim()).filter(Boolean);
      if (dates.length >= 2) {
        const parse = (d: string) => {
          const parts = d.replace(/-/g, ".").split(".").map(Number);
          if (parts.length >= 3) {
            const yr = parts[0] < 100 ? parts[0] + 2000 : parts[0];
            return new Date(yr, parts[1] - 1, parts[2]);
          }
          return null;
        };
        const start = parse(dates[0]);
        const end = parse(dates[1]);
        if (start && end) {
          prevMonths += (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
        }
      }
    });
    const totalMonths = diff * 12 + prevMonths;
    totalCareer = totalMonths >= 12 ? `${Math.floor(totalMonths / 12)}년 ${Math.floor(totalMonths % 12)}개월` : `${Math.floor(totalMonths)}개월`;
  }

  const menuItems = [
    { key: "work" as const, label: "경력사항", icon: "M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0", ref: workRef },
    { key: "school" as const, label: "학력사항", icon: "M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5", ref: schoolRef },
  ];
  const [activeMenu, setActiveMenu] = useState<"work" | "school">("work");

  const sectionOrder: ("work" | "school")[] = ["work", "school"];
  const sectionRefs = { work: workRef, school: schoolRef };
  const wheelLock = useRef(false);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (wheelLock.current) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const dir = e.deltaY > 0 ? 1 : -1;
    const idx = sectionOrder.indexOf(activeMenu);
    const next = idx + dir;

    // 컨테이너 스크롤 여부 확인
    const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 10;
    const atTop = container.scrollTop <= 10;

    // 아래로 스크롤: 콘텐츠 끝에 도달해야 다음 섹션
    if (dir === 1 && !atBottom) return;
    // 위로 스크롤: 콘텐츠 맨 위에 도달해야 이전 섹션
    if (dir === -1 && !atTop) return;

    // 범위 밖이면 순환
    const nextIdx = (next + sectionOrder.length) % sectionOrder.length;

    e.preventDefault();
    wheelLock.current = true;
    const nextKey = sectionOrder[nextIdx];
    setActiveMenu(nextKey);
    // 다음 섹션 전환 시 스크롤을 맨 위로
    setTimeout(() => {
      if (container) container.scrollTop = 0;
      wheelLock.current = false;
    }, 100);
  }, [activeMenu]);

  const handleScroll = useCallback(() => {
    if (wheelLock.current) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const sections = [
      { key: "work" as const, ref: workRef },
      { key: "school" as const, ref: schoolRef },
    ];
    const scrollTop = container.scrollTop;
    let closest = "work" as "work" | "school";
    let minDist = Infinity;
    for (const s of sections) {
      if (s.ref.current) {
        const dist = Math.abs(s.ref.current.offsetTop - scrollTop);
        if (dist < minDist) { minDist = dist; closest = s.key; }
      }
    }
    setActiveMenu(closest);
  }, []);

  return (
    <div className="h-full flex animate-[slideIn_0.4s_cubic-bezier(0.23,1,0.32,1)]">
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }`}</style>

      {/* ── 프로필 사이드바 (고정) ── */}
      <div className="w-80 flex flex-col gap-4 flex-shrink-0 pt-8 pl-8 pr-4 pb-4 overflow-y-auto scrollbar-hide">
        {/* 프로필 카드 (사원증) */}
        <div className="relative bg-white rounded-xl border border-gray-200 p-5 pb-6 w-full shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          {/* 끈+클립 (구멍 관통해서 위로) */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-14 z-20 flex flex-col items-center">
            {/* 끈 */}
            <div className="w-6 h-8 bg-gradient-to-b from-[#B8B8B8] to-[#A0A0A0] rounded-t-sm" style={{ boxShadow: "inset -1px 0 2px rgba(0,0,0,0.1), inset 1px 0 2px rgba(255,255,255,0.2)" }} />
            {/* 클립 몸통 */}
            <div className="w-10 h-5 bg-gradient-to-b from-[#C8C8C8] to-[#A8A8A8] rounded-[3px] flex items-center justify-center" style={{ boxShadow: "0 2px 6px rgba(0,0,0,0.2), inset 0 1px 2px rgba(255,255,255,0.4)" }}>
              <div className="w-3 h-3 rounded-full bg-gradient-to-b from-[#D0D0D0] to-[#999] border border-[#888]" style={{ boxShadow: "inset 0 1px 2px rgba(255,255,255,0.5), 0 1px 2px rgba(0,0,0,0.2)" }} />
            </div>
            {/* 클립 하단 */}
            <div className="w-6 h-4 bg-gradient-to-b from-[#A8A8A8] to-[#909090]" style={{ boxShadow: "inset -1px 0 2px rgba(0,0,0,0.1), inset 1px 0 2px rgba(255,255,255,0.15)" }} />
          </div>
          {/* 카드 상단 구멍 (슬롯) + 직종 태그 */}
          <div className="relative z-10 flex justify-center items-center gap-2 mb-5 mt-1">
            {extra.jobCategory && (
              <span className="absolute left-0 px-4 py-1 rounded-full bg-orange-500 text-white text-base font-bold">{extra.jobCategory}</span>
            )}
            <div className="w-16 h-4 rounded-md bg-gray-200 border border-gray-300" style={{ boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)" }} />
          </div>
          <div className="flex flex-col items-center">
            {/* 증명사진 */}
            <div className="w-full aspect-[3/4] rounded-md overflow-hidden mb-5">
                {employee.photoUrl ? (
                  <img src={employee.photoUrl} alt={employee.name} className="w-full h-full object-cover object-top" />
                ) : (
                  <div className="w-full h-full bg-[#EEF2F6] flex items-center justify-center text-3xl font-bold text-gray-400">
                    {employee.name.charAt(0)}
                  </div>
                )}
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-lg font-bold text-[#2B3037]">{employee.name}</h2>
              <span className="text-lg font-bold text-gray-400">{employee.role === "팀장" ? employee.role : employee.position}{age !== null && <span className="text-lg font-bold text-[#2B3037]"> ({age}세)</span>}</span>
            </div>
                      </div>
        </div>

        {/* 근속/경력 카드 */}
        <div className="bg-white rounded-md border border-gray-200 py-4 flex">
          <div className="flex-1 text-center border-r border-gray-200">
            <p className="text-base font-bold text-[#2B3037] leading-none">{yearsWorked}</p>
            <p className="text-xs text-gray-500 mt-0.5">근속</p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-base font-bold text-[#2B3037] leading-none">{totalCareer}</p>
            <p className="text-xs text-gray-500 mt-0.5">경력</p>
          </div>
        </div>

        {/* 학력 카드 */}
        <div className="bg-white rounded-md border border-gray-200 px-4 py-3">
          <div className="space-y-1">
            {education.length > 0 ? education.slice(0, 3).map((e, i) => (
              <div key={i} className="py-1.5 flex items-center gap-2.5">
                <span className="text-3xl flex-shrink-0">🎓</span>
                <div className="min-w-0">
                  <p className="text-base font-bold text-[#2B3037] truncate">{e.school_name}</p>
                  {e.major && <p className="text-xs text-gray-500">{e.major}{e.degree ? ` · ${e.degree}` : ""}</p>}
                </div>
              </div>
            )) : (
              <p className="text-xs text-gray-400 text-center py-2">등록된 학력이 없습니다.</p>
            )}
          </div>
        </div>

      </div>

      {/* ── 메인 콘텐츠 (스크롤) ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-4 pt-8 pr-8 pb-4 pl-1">
          {/* Career 카드 */}
          <div className="bg-white rounded-md border border-gray-200 p-5">
            <p className="text-lg font-bold text-[#2B3037] uppercase tracking-normal mb-6">Career</p>
            <div className="grid grid-cols-2 gap-10">
              {/* 자사 경력 */}
              <div>
                <h4 className="text-base font-bold text-gray-500 uppercase tracking-widest mb-5 pb-2 border-b border-gray-200">자사 경력</h4>
                <div className="space-y-3">
                  {appointmentHistory.length > 0 ? appointmentHistory.map((a, i) => (
                    <div key={i} className={`p-6 rounded-md ${i === 0 ? "bg-white border-2 border-gray-200" : "bg-white border border-gray-200"}`}>
                      <p className={`font-bold ${i === 0 ? "text-base text-[#2B3037]" : "text-base text-[#2B3037]"}`}>
                        {i === 0 && <span className="mr-2 text-xs font-bold text-[#2B3037] bg-[#C1FD3C] px-3 py-1 rounded-full uppercase tracking-widest">Now</span>}
                        {a.department || "—"}{a.position ? ` | ${a.position}` : ""} | {fmtDateShort(a.date)}
                      </p>
                      {(a.description || (i === 0 && ((extra.taskDetail?.trim()) || extra.jobRole))) && (
                        <ul className={`mt-4 space-y-2 pt-4 ${i === 0 ? "border-t border-[#2B3037]/15" : "border-t border-gray-200"}`}>
                          {i === 0 && !a.description && ((extra.taskDetail?.trim() ? [extra.taskDetail] : [extra.jobRole]).filter(Boolean).join("\n")).split("\n").filter(Boolean).map((line: string, j: number) => (
                            <li key={`task-${j}`} className="text-base font-bold text-[#2B3037] flex items-center gap-2.5">
                              <span className="w-2 h-2 rounded-full bg-[#2B3037] flex-shrink-0" />
                              {line}
                            </li>
                          ))}
                          {a.description && a.description.split("\n").filter(Boolean).slice(0, 5).map((line: string, j: number) => (
                            <li key={j} className={`flex items-center gap-2.5 ${i === 0 ? "text-base font-bold text-[#2B3037]" : "text-sm text-gray-600"}`}>
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${i === 0 ? "bg-[#2B3037]" : "bg-gray-400"}`} />
                              {line}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )) : (
                    <div className="p-6 rounded-md bg-white border-2 border-gray-200">
                      <p className="text-base font-bold text-[#2B3037]">{employee.team?.name || "—"} | {employee.joinDate ? `${fmtDateShort(employee.joinDate)} ~ 현재` : "—"}</p>
                      {((extra.taskDetail?.trim()) || extra.jobRole) && (
                        <ul className="mt-4 space-y-2 border-t border-[#2B3037]/15 pt-4">
                          {((extra.taskDetail?.trim() ? [extra.taskDetail] : [extra.jobRole]).filter(Boolean).join("\n")).split("\n").filter(Boolean).map((line: string, i: number) => (
                            <li key={i} className="text-sm text-[#2B3037]/70 flex items-center gap-2.5">
                              <span className="w-2 h-2 rounded-full bg-green-600 flex-shrink-0" />
                              {line}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {/* 타사 경력 */}
              <div>
                <h4 className="text-base font-bold text-gray-500 uppercase tracking-widest mb-5 pb-2 border-b border-gray-200">타사 경력</h4>
                <div className="space-y-3">
                  {experience.length > 0 ? experience.map((e, i) => (
                    <div key={i} className="p-6 rounded-md bg-white border-2 border-gray-200">
                      <p className="text-base font-bold text-[#2B3037]">{e.company}{e.position ? ` | ${e.position}` : ""} | {fmtPeriod(e.period)}</p>
                      {(e.task || e.description) && (
                        <ul className="mt-4 space-y-2 border-t border-gray-200 pt-4">
                          {e.task && !e.description && (
                            <li className="text-sm text-gray-600 flex items-center gap-2.5">
                              <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
                              {e.task}
                            </li>
                          )}
                          {e.description && e.description.split("\n").filter(Boolean).slice(0, 5).map((line: string, j: number) => (
                            <li key={j} className="text-sm text-gray-600 flex items-center gap-2.5">
                              <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
                              {line}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )) : (
                    <p className="text-sm text-gray-400 text-center py-10">등록된 타사 경력이 없습니다.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Education 카드 */}
          <div className="bg-white rounded-md border border-gray-200 p-5">
            <p className="text-lg font-bold text-[#2B3037] uppercase tracking-normal mb-6">Skills</p>
            <div className="space-y-3">
              {/* 자격증 + 스킬 (2열) */}
              <div className="grid grid-cols-2 gap-10">
                {/* 자격증 및 면허 */}
                <div>
                  <h4 className="text-base font-bold text-gray-500 uppercase tracking-widest mb-5 pb-2 border-b border-gray-200">자격증 및 면허</h4>
                  {certifications.length > 0 ? (
                    <div className="space-y-3">
                      {certifications.map((c, i) => (
                        <div key={i} className="px-6 py-5 rounded-md bg-white border-2 border-gray-200">
                          <p className="text-base font-bold text-[#2B3037]">{c.name}</p>
                          <p className="text-xs text-gray-500 mt-1">{fmtDateShort(c.acquisition_date)}{c.issuer ? ` · ${c.issuer}` : ""}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-6">등록된 자격증이 없습니다.</p>
                  )}
                </div>
                {/* 스킬 */}
                <div>
                  <h4 className="text-base font-bold text-gray-500 uppercase tracking-widest mb-5 pb-2 border-b border-gray-200">스킬</h4>
                  <div className="flex flex-wrap gap-3">
                    {extra.skills ? extra.skills.split(",").map((s: string, i: number) => (
                      <span key={i} className="px-5 py-2.5 rounded-full bg-gray-200 text-sm font-bold text-[#2B3037]">{s.trim()}</span>
                    )) : (
                      <p className="text-sm text-gray-400 py-6 w-full text-center">등록된 스킬이 없습니다.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Information 카드 */}
          <div className="bg-white rounded-md border border-gray-200 p-5">
            <p className="text-lg font-bold text-[#2B3037] uppercase tracking-normal mb-6">Information</p>
            <div className="grid grid-cols-2 gap-10">
              {/* Info */}
              <div>
                <h4 className="text-base font-bold text-gray-500 uppercase tracking-widest mb-5 pb-2 border-b border-gray-200">인사정보</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                    </div>
                    <span className="text-sm text-gray-600">{fmtDate(extra.birthDate)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                    </div>
                    <span className="text-sm text-gray-600">{extra.address ? extra.address.split(" ").slice(0, 2).join(" ") : "—"}</span>
                  </div>
                </div>
              </div>
              {/* Contact */}
              <div>
                <h4 className="text-base font-bold text-gray-500 uppercase tracking-widest mb-5 pb-2 border-b border-gray-200">연락처</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                    </div>
                    <span className="text-sm text-gray-600">{employee.phoneWork || "—"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
                    </div>
                    <span className="text-sm text-gray-600">{employee.phone || "—"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                    </div>
                    <span className="text-sm text-gray-600">{employee.email || "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

/* ── 팀원 프로필 — 글래스 노드 ── */
function MemberProfile({
  employee,
  onClick,
  onHoverStart,
  onHoverEnd,
  isHovered,
  labelBelow,
}: {
  employee: Employee;
  onClick: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  isHovered: boolean;
  labelBelow?: boolean;
}) {
  const borderColor = POSITION_RING_COLORS[employee.position] || "border-gray-300/25";
  const glow = POSITION_GLOW[employee.position] || "rgba(160,160,160,0.1)";

  const nameLabel = (
    <>
      <span className="font-bold text-[#111111] text-xl group-hover:text-[#111111] transition tracking-tight">
        {employee.name}
      </span>
      <span className="text-base text-gray-400 font-light">{employee.position}</span>
    </>
  );

  return (
    <div
      className="relative flex flex-col items-center cursor-pointer group"
      onClick={onClick}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
    >
      {/* 이름 위에 (아래쪽 팀원) */}
      {!labelBelow && <div className="flex flex-col items-center mb-3">{nameLabel}</div>}
      <div
        className={`org-node w-48 h-48 rounded-full bg-gradient-to-br from-gray-50 via-white to-gray-100 backdrop-blur-sm border border-gray-200 shadow-[0_6px_30px_rgba(0,0,0,0.08)] flex items-center justify-center text-4xl font-light text-gray-400 overflow-hidden relative`}
        style={{ "--node-glow": glow } as React.CSSProperties}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/60 via-transparent to-transparent" />
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div className="absolute -inset-full w-[200%] h-full bg-gradient-to-r from-transparent via-white/30 to-transparent" style={{ animation: "orgShimmer 6s ease-in-out infinite" }} />
        </div>
        <span className="relative z-10">
          {employee.photoUrl ? (
            <img src={employee.photoUrl} alt={employee.name} className="w-48 h-48 object-cover" />
          ) : (
            <span className="text-xs text-gray-400">사진없음</span>
          )}
        </span>
      </div>
      {/* 이름 아래 (위쪽 팀원) */}
      {labelBelow && <div className="flex flex-col items-center mt-3">{nameLabel}</div>}
    </div>
  );
}

const COL_W = 160;
const LEADER_W = 220;
const CONNECTOR_H = 30;
const PROFILE_H = 260;
const NODE_R = 6;
const LEADER_CIRCLE = 240;

const POSITION_ORDER: Record<string, number> = {
  부장: 0, 차장: 1, 과장: 2, 대리: 3, 주임: 4, 사원: 5,
};

const ZIGZAG_THRESHOLD = 5;

export default function TeamOrgChart({
  leader,
  members,
  teamName,
  teamSub,
  onPanelChange,
}: {
  leader: Employee | undefined;
  members: Employee[];
  teamName?: string;
  teamSub?: string;
  onPanelChange?: (open: boolean) => void;
}) {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const selectEmployee = (emp: Employee | null) => {
    setSelectedEmployee(emp);
    onPanelChange?.(emp !== null);
  };
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const sorted = [...members].sort((a, b) =>
    (POSITION_ORDER[a.position] ?? 99) - (POSITION_ORDER[b.position] ?? 99)
  );

  const zigzag = sorted.length >= ZIGZAG_THRESHOLD;
  const PROFILE_SIMPLE = 260; // 지그재그 아닐 때 (이름 위 + 원)
  const pH = zigzag ? PROFILE_H : PROFILE_SIMPLE;
  const lineY = pH + CONNECTOR_H;
  const totalH = zigzag
    ? lineY + CONNECTOR_H + PROFILE_H
    : lineY + CONNECTOR_H + PROFILE_SIMPLE;
  const colW = zigzag ? COL_W : 300;
  const leaderW = zigzag ? LEADER_W : 350;
  const totalW = leaderW + sorted.length * colW;

  const isPanelOpen = selectedEmployee !== null;

  // 전체 멤버 (팀장 포함, 직위순)
  const allMembers = [
    ...(leader ? [leader] : []),
    ...sorted,
  ];

  return (
    <div className="flex w-full h-full gap-3" style={{ background: "linear-gradient(160deg, #fdfcf9 0%, #faf8f3 30%, #f7f4ee 60%, #fbf9f5 100%)" }}>
      {/* 좌측 */}
      <div className={`transition-all duration-500 ease-in-out flex-shrink-0 ${isPanelOpen ? "w-64 overflow-y-auto flex-shrink-0 scrollbar-hide bg-white" : "w-full overflow-auto"}`}>
        <div className={`h-full transition-all duration-500 ${isPanelOpen ? "bg-white p-4" : "p-8 flex justify-center items-center overflow-visible"}`} style={!isPanelOpen ? { background: "linear-gradient(160deg, #fdfcf9 0%, #faf8f3 30%, #f7f4ee 60%, #fbf9f5 100%)" } : undefined}>

          {isPanelOpen ? (
            /* ── 패널 열림: 세로 리스트 ── */
            <div>
              {/* 팀명 */}
              {teamName && (
                <div className="px-3 pb-4 mb-5 border-b border-gray-200">
                  <h2 className="text-2xl font-black text-gray-900">{teamName}</h2>
                  {teamSub && <p className="text-sm text-gray-400 mt-1.5">{teamSub}</p>}
                </div>
              )}
              <div className="space-y-0.5">
              {allMembers.map((emp) => {
                const isLeader = emp.role === "팀장" || emp.role === "부서장";
                const isActive = selectedEmployee?.id === emp.id;
                return (
                  <button
                    key={emp.id}
                    onClick={() => selectEmployee(emp)}
                    className={`w-full flex items-center gap-3.5 px-3 py-2 rounded-xl text-left transition-all duration-200 ${
                      isActive ? "bg-gray-100 border border-gray-200" : "hover:bg-[#faf7f2]"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0 overflow-hidden ${
                      isLeader
                        ? "bg-gray-700 text-white"
                        : "bg-gray-300 text-gray-600"
                    }`}>
                      {emp.photoUrl ? (
                        <img src={emp.photoUrl} alt={emp.name} className="w-full h-full object-cover" />
                      ) : (
                        emp.name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0 flex items-baseline gap-2">
                      <p className={`text-lg font-semibold truncate ${isActive ? "text-gray-900" : "text-gray-700"}`}>{emp.name}</p>
                      <p className={`text-sm flex-shrink-0 ${isActive ? "text-gray-500" : "text-gray-400"}`}>{emp.position}{emp.role !== "팀원" ? ` · ${emp.role}` : ""}</p>
                    </div>
                  </button>
                );
              })}
              <button data-orgchart-close onClick={() => selectEmployee(null)} className="hidden" />
              </div>
            </div>
          ) : (
            /* ── 패널 닫힘: 조직도 — Urban Premium ── */
            <div className="relative" style={{ width: totalW, height: totalH }}>
              <OrgChartStyles />

              {/* 팀장 — 글래스 오브 */}
              {leader && (
                <div
                  className="absolute flex flex-col items-center cursor-pointer group"
                  style={{ left: 0, top: lineY - LEADER_CIRCLE / 2 - 10, width: leaderW }}
                  onClick={() => selectEmployee(leader)}
                  onMouseEnter={() => setHoveredId(leader.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div
                    className="org-node w-60 h-60 rounded-full bg-gradient-to-br from-gray-700 via-gray-500 to-gray-400 backdrop-blur-xl border border-white/30 shadow-[0_10px_50px_rgba(0,0,0,0.15)] flex items-center justify-center text-7xl font-extralight text-white overflow-hidden relative"
                    style={{ "--node-glow": "rgba(80,80,80,0.3)" } as React.CSSProperties}
                  >
                    {/* 유리 반사 */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/10 via-transparent to-transparent" />
                    <div className="absolute top-2 left-5 right-5 h-6 rounded-full bg-gradient-to-b from-white/8 to-transparent blur-sm" />
                    <div className="absolute inset-0 rounded-full overflow-hidden">
                      <div className="absolute -inset-full w-[200%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent" style={{ animation: "orgShimmer 5s ease-in-out infinite" }} />
                    </div>
                    <span className="relative z-10">
                      {leader.photoUrl ? (
                        <img src={leader.photoUrl} alt={leader.name} className="w-60 h-60 object-cover" />
                      ) : (
                        <span className="text-sm text-white/50">사진없음</span>
                      )}
                    </span>
                  </div>
                  <span className="mt-4 font-bold text-[#111111] text-3xl tracking-tight">{leader.name}</span>
                  <span className="text-lg text-gray-400 font-light">{leader.position} · {leader.role}</span>
                </div>
              )}

              {/* 수평선 — 그라데이션 */}
              {sorted.length > 0 && (
                <div
                  className="absolute h-px"
                  style={{
                    left: leaderW - 10,
                    top: lineY,
                    width: (sorted.length - 1) * colW + colW / 2 + 10,
                    background: "linear-gradient(90deg, rgba(167,199,200,0.1) 0%, rgba(167,199,200,0.5) 30%, rgba(167,199,200,0.5) 70%, rgba(167,199,200,0.1) 100%)",
                  }}
                />
              )}

              {/* 팀원 */}
              {sorted.map((member, idx) => {
                const cx = leaderW + idx * colW + colW / 2;
                const isAbove = zigzag ? idx % 2 === 0 : true;

                return (
                  <div key={member.id}>
                    {/* 노드 점 — 미니멀 */}
                    <div
                      className="absolute rounded-full bg-gray-400 shadow-[0_0_10px_rgba(0,0,0,0.15)]"
                      style={{ left: cx - NODE_R / 2, top: lineY - NODE_R / 2, width: NODE_R, height: NODE_R }}
                    />
                    {/* 수직선 — 페이드 */}
                    <div
                      className="absolute"
                      style={{
                        left: cx,
                        top: isAbove ? (zigzag ? pH - CONNECTOR_H : pH) : lineY,
                        width: 1,
                        height: isAbove ? (zigzag ? lineY - pH + CONNECTOR_H : CONNECTOR_H) : CONNECTOR_H,
                        background: isAbove
                          ? "linear-gradient(180deg, rgba(167,199,200,0.15) 0%, rgba(167,199,200,0.6) 100%)"
                          : "linear-gradient(180deg, rgba(167,199,200,0.6) 0%, rgba(167,199,200,0.15) 100%)",
                      }}
                    />
                    <div
                      className="absolute"
                      style={{ left: cx - colW / 2, top: isAbove ? (zigzag ? -CONNECTOR_H : 0) : lineY + CONNECTOR_H, width: colW }}
                    >
                      <MemberProfile
                        employee={member}
                        onClick={() => selectEmployee(member)}
                        onHoverStart={() => setHoveredId(member.id)}
                        onHoverEnd={() => setHoveredId(null)}
                        isHovered={hoveredId === member.id}
                        labelBelow={zigzag && !isAbove}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 우측: 프로필 패널 */}
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isPanelOpen ? "flex-1" : "w-0"}`}>
        {selectedEmployee && (
          <ProfilePanel employee={selectedEmployee} onClose={() => selectEmployee(null)} />
        )}
      </div>
    </div>
  );
}
