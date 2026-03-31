"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import PdfModal from "@/components/PdfModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Camera } from "lucide-react";

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
  teamId: number;
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

interface Education { period?: string; startDate?: string; endDate?: string; school_name: string; major: string; degree: string; logoUrl?: string; }
interface Certification { name: string; acquisition_date: string; issuer: string; }
interface Experience { period?: string; startDate?: string; endDate?: string; company: string; position: string; task: string; description?: string; }

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
  const m4 = s.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
  if (m4) return `${m4[1]}.${m4[2].padStart(2,"0")}.${m4[3].padStart(2,"0")}`;
  const m2 = s.match(/(\d{2})\.(\d{1,2})\.(\d{1,2})/);
  if (m2) { const yr = Number(m2[1]) < 50 ? 2000 + Number(m2[1]) : 1900 + Number(m2[1]); return `${yr}.${m2[2].padStart(2,"0")}.${m2[3].padStart(2,"0")}`; }
  return d;
}

function fmtDateShort(d: string | null | undefined): string {
  if (!d) return "—";
  const s = d.replace(/[\/\-]/g, ".").replace(/\s+/g, "");
  const m4 = s.match(/(\d{4})\.(\d{1,2})/);
  if (m4) return `${m4[1]}.${m4[2].padStart(2,"0")}`;
  const m2 = s.match(/(\d{2})\.(\d{1,2})/);
  if (m2) { const yr = Number(m2[1]) < 50 ? 2000 + Number(m2[1]) : 1900 + Number(m2[1]); return `${yr}.${m2[2].padStart(2,"0")}`; }
  return d;
}

function fmtPeriod(p: string | null | undefined): string {
  if (!p) return "—";
  const cleaned = p.replace(/\(.*?\)/g, "").trim();
  const parts = cleaned.split(/[~\-–—]/).map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2) return `${fmtDateShort(parts[0])} ~ ${fmtDateShort(parts[1])}`;
  if (parts.length === 1) return fmtDateShort(parts[0]);
  return cleaned;
}

function fmtRange(item: { startDate?: string; endDate?: string; period?: string }): string {
  if (item.startDate) {
    const start = fmtDateShort(item.startDate);
    const end = item.endDate ? fmtDateShort(item.endDate) : "현재";
    return `${start} ~ ${end}`;
  }
  if (item.period) return fmtPeriod(item.period);
  return "—";
}

const POSITION_RING_COLORS: Record<string, string> = {
  부장: "border-gray-500/40",
  차장: "border-gray-500/30",
  과장: "border-gray-400/30",
  대리: "border-gray-400/25",
  주임: "border-input/30",
  사원: "border-input/25",
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
        transform: scale(1.1);
        box-shadow: 0 12px 30px rgba(167,199,200,0.4), 0 4px 15px rgba(167,199,200,0.2);
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
      <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium mb-1">{label}</p>
      <p className="text-lg text-foreground">{value}</p>
    </div>
  );
}

// 전화번호 자동 포맷 (숫자만 추출 후 하이픈 삽입)
function formatPhone(val: string): string {
  const nums = val.replace(/\D/g, "");
  if (nums.startsWith("02")) {
    if (nums.length <= 2) return nums;
    if (nums.length <= 5) return `${nums.slice(0, 2)}-${nums.slice(2)}`;
    if (nums.length <= 9) return `${nums.slice(0, 2)}-${nums.slice(2, 5)}-${nums.slice(5)}`;
    return `${nums.slice(0, 2)}-${nums.slice(2, 6)}-${nums.slice(6, 10)}`;
  }
  if (nums.length <= 3) return nums;
  if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
  if (nums.length <= 10) return `${nums.slice(0, 3)}-${nums.slice(3, 6)}-${nums.slice(6)}`;
  return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7, 11)}`;
}

const POSITIONS = ["부장", "차장", "과장", "대리", "주임", "사원"];
const ROLES_LIST = ["팀원", "팀장", "부서장"];
const nativeSelectClass = "flex h-10 w-full items-center rounded-lg border border-input bg-card px-3 py-2 text-sm font-medium text-foreground shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[4px] focus-visible:ring-ring/15";

/* ── 섹션 수정 버튼 ── */
function SectionEditBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all" title="수정">
      <Pencil className="w-3.5 h-3.5" />
    </button>
  );
}

/* ── 우측 프로필 대시보드 (SalesMonk 스타일) ── */
function ProfilePanel({ employee, onClose, isAdmin, onUpdate, currentEmployeeId }: { employee: Employee; onClose: () => void; isAdmin?: boolean; onUpdate?: () => void; currentEmployeeId?: number | null }) {
  const canEdit = isAdmin || (currentEmployeeId != null && currentEmployeeId === employee.id);

  // 프로필 기본정보 수정
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: employee.name, phone: employee.phone || "", position: employee.position, role: employee.role });

  // 섹션별 수정 다이얼로그
  const [editSection, setEditSection] = useState<"skills" | "info" | "contact" | "certs" | "career" | "extCareer" | "education" | "team" | "appointment" | null>(null);
  const [skillsForm, setSkillsForm] = useState({ skills: employee.skills || "" });
  const [infoForm, setInfoForm] = useState({ birthDate: employee.birthDate || "", address: employee.address || "", jobCategory: employee.jobCategory || "", taskDetail: "" });
  const [taskItems, setTaskItems] = useState<string[]>([]);
  const [contactForm, setContactForm] = useState({ phone: employee.phone || "", phoneWork: employee.phoneWork || "", email: employee.email || "" });
  const [certsItems, setCertsItems] = useState<{ name: string; acquisition_date: string; issuer: string }[]>([]);
  const [extCareerItems, setExtCareerItems] = useState<{ company: string; position: string; period: string; task: string; descItems: string[] }[]>([]);
  const [eduItems, setEduItems] = useState<{ school_name: string; major: string; degree: string }[]>([]);
  const [teamForm, setTeamForm] = useState({ teamId: String(employee.teamId), joinDate: employee.joinDate || "" });
  const [allTeams, setAllTeams] = useState<{ id: number; name: string; location: { company: string; name: string } }[]>([]);
  const [apptItems, setApptItems] = useState<{ date: string; department: string; position: string; taskItems: string[] }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 사진 업로드
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload/photo", { method: "POST", body: fd });
    if (res.ok) {
      const { url } = await res.json();
      await saveFields({ photoUrl: url });
    }
    setUploading(false);
    e.target.value = "";
  };

  // 팀 목록 로드
  const loadTeams = async () => {
    const res = await fetch("/api/teams");
    if (res.ok) setAllTeams(await res.json());
  };

  // resumeData의 특정 키를 업데이트
  const saveResumeKey = async (key: string, value: unknown) => {
    const rd = employee.resumeData ? JSON.parse(employee.resumeData) : {};
    rd[key] = value;
    await saveFields({ resumeData: JSON.stringify(rd) });
  };

  const saveFields = async (fields: Record<string, unknown>) => {
    setSaving(true);
    const res = await fetch(`/api/employees/${employee.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: employee.name, email: employee.email, phone: employee.phone, position: employee.position, role: employee.role, teamId: employee.teamId, joinDate: employee.joinDate, resumePath: employee.resumePath, ...fields }),
    });
    setSaving(false);
    if (res.ok) { setEditSection(null); onUpdate?.(); }
    else { alert("수정에 실패했습니다."); }
  };
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
    const parseDate = (d: string) => {
      const parts = d.replace(/[\/-]/g, ".").split(".").map(Number);
      if (parts.length >= 3) {
        const yr = parts[0] < 100 ? parts[0] + 2000 : parts[0];
        return new Date(yr, parts[1] - 1, parts[2]);
      }
      return null;
    };
    experience.forEach((e) => {
      let start: Date | null = null;
      let end: Date | null = null;
      if (e.startDate && e.endDate) {
        start = parseDate(e.startDate);
        end = parseDate(e.endDate);
      } else if (e.period) {
        const cleaned = e.period.replace(/\(.*?\)/g, "");
        const dates = cleaned.split(/[~\-–—]/).map((s: string) => s.trim()).filter(Boolean);
        if (dates.length >= 2) { start = parseDate(dates[0]); end = parseDate(dates[1]); }
      }
      if (start && end) {
        prevMonths += (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
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
        <div className="relative bg-card rounded-xl border border-border p-5 pb-6 w-full shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          {canEdit && (
            <button onClick={() => { setEditForm({ name: employee.name, phone: employee.phone || "", position: employee.position, role: employee.role }); setEditOpen(true); }} className="absolute top-3 right-3 z-30 p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all" title="직급/직책 수정">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
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
              <Badge variant="orange" size="md" className="absolute left-0">{extra.jobCategory}</Badge>
            )}
            <div className="w-16 h-4 rounded-md bg-muted border border-input" style={{ boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)" }} />
          </div>
          <div className="flex flex-col items-center">
            {/* 증명사진 */}
            <div className="w-full aspect-[3/4] rounded-md overflow-hidden mb-5 relative group/photo">
                {employee.photoUrl ? (
                  <img src={employee.photoUrl} alt={employee.name} className="w-full h-full object-cover object-top" />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center text-3xl font-bold text-muted-foreground">
                    {employee.name.charAt(0)}
                  </div>
                )}
                {canEdit && (
                  <label className="absolute inset-0 bg-foreground/0 group-hover/photo:bg-foreground/40 flex items-center justify-center cursor-pointer transition-all">
                    <div className="opacity-0 group-hover/photo:opacity-100 transition-opacity flex flex-col items-center gap-1">
                      {uploading ? (
                        <svg className="w-6 h-6 text-primary-foreground animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                      ) : (
                        <Camera className="w-6 h-6 text-primary-foreground" />
                      )}
                      <span className="text-xs text-primary-foreground font-medium">{uploading ? "업로드 중..." : "사진 변경"}</span>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                  </label>
                )}
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-lg font-bold text-foreground">{employee.name}</h2>
              <span className="text-lg font-bold text-muted-foreground">{employee.role === "팀장" ? employee.role : employee.position}{age !== null && <span className="text-lg font-bold text-foreground"> ({age}세)</span>}</span>
            </div>
          </div>
        </div>

        {/* 직급/직책 수정 다이얼로그 */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{employee.name} 직급/직책 수정</DialogTitle>
            </DialogHeader>
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
            <div className="flex gap-2 mt-2">
              <Button className="flex-1" onClick={() => saveFields(editForm)} disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
              <Button className="flex-1" variant="outline" onClick={() => setEditOpen(false)}>취소</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 섹션별 수정 다이얼로그들 */}
        {/* ── 스킬 수정 ── */}
        <Dialog open={editSection === "skills"} onOpenChange={(o) => !o && setEditSection(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>스킬 수정</DialogTitle></DialogHeader>
            <div className="space-y-1.5">
              <Label>보유 스킬 (쉼표로 구분)</Label>
              <Input value={skillsForm.skills} onChange={(e) => setSkillsForm({ skills: e.target.value })} placeholder="예: AutoCAD, Excel, BIM" />
            </div>
            <div className="flex gap-2 mt-2">
              <Button className="flex-1" onClick={() => saveFields({ skills: skillsForm.skills })} disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
              <Button className="flex-1" variant="outline" onClick={() => setEditSection(null)}>취소</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── 인사정보 수정 ── */}
        <Dialog open={editSection === "info"} onOpenChange={(o) => !o && setEditSection(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>인사정보 수정</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>생년월일</Label><Input value={infoForm.birthDate} onChange={(e) => setInfoForm({ ...infoForm, birthDate: e.target.value })} placeholder="2000.01.01" /></div>
              <div className="space-y-1.5"><Label>주소</Label><Input value={infoForm.address} onChange={(e) => setInfoForm({ ...infoForm, address: e.target.value })} placeholder="서울특별시 강남구" /></div>
              <div className="space-y-1.5"><Label>직종</Label><Input value={infoForm.jobCategory} onChange={(e) => setInfoForm({ ...infoForm, jobCategory: e.target.value })} placeholder="건축, 토목" /></div>
            </div>
            <div className="flex gap-2 mt-2">
              <Button className="flex-1" onClick={() => saveFields(infoForm)} disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
              <Button className="flex-1" variant="outline" onClick={() => setEditSection(null)}>취소</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── 연락처 수정 ── */}
        <Dialog open={editSection === "contact"} onOpenChange={(o) => !o && setEditSection(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>연락처 수정</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>회사 전화</Label><Input type="tel" value={contactForm.phoneWork} onChange={(e) => setContactForm({ ...contactForm, phoneWork: formatPhone(e.target.value) })} placeholder="02-1234-5678" /></div>
              <div className="space-y-1.5"><Label>휴대폰</Label><Input type="tel" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: formatPhone(e.target.value) })} placeholder="010-1234-5678" /></div>
              <div className="space-y-1.5"><Label>이메일</Label><Input type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} /></div>
            </div>
            <div className="flex gap-2 mt-2">
              <Button className="flex-1" onClick={() => saveFields(contactForm)} disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
              <Button className="flex-1" variant="outline" onClick={() => setEditSection(null)}>취소</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── 현재 업무사항 수정 (최대 5개) ── */}
        <Dialog open={editSection === "career"} onOpenChange={(o) => !o && setEditSection(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>현재 업무사항 수정</DialogTitle></DialogHeader>
            <div className="space-y-2">
              {taskItems.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input value={item} onChange={(e) => { const n = [...taskItems]; n[i] = e.target.value; setTaskItems(n); }} placeholder={`업무 ${i + 1}`} />
                  <Button variant="ghost" size="icon-xs" className="text-destructive/60 hover:text-destructive flex-shrink-0" onClick={() => setTaskItems(taskItems.filter((_, j) => j !== i))}>×</Button>
                </div>
              ))}
              <Button variant="ghost" size="xs" className="text-primary" onClick={() => setTaskItems([...taskItems, ""])}>+ 업무 추가</Button>
            </div>
            <div className="flex gap-2 mt-2">
              <Button className="flex-1" onClick={() => saveFields({ taskDetail: taskItems.filter(Boolean).join("\n") })} disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
              <Button className="flex-1" variant="outline" onClick={() => setEditSection(null)}>취소</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── 타사 경력 수정 (최대 5개) ── */}
        <Dialog open={editSection === "extCareer"} onOpenChange={(o) => !o && setEditSection(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>타사 경력 수정</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {extCareerItems.map((item, i) => (
                <div key={i} className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">경력 {i + 1}</span>
                    <Button variant="ghost" size="icon-xs" className="text-destructive/60 hover:text-destructive" onClick={() => setExtCareerItems(extCareerItems.filter((_, j) => j !== i))}>×</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">회사명</Label><Input value={item.company} onChange={(e) => { const n = [...extCareerItems]; n[i] = { ...n[i], company: e.target.value }; setExtCareerItems(n); }} placeholder="회사명" /></div>
                    <div><Label className="text-xs">직책</Label><Input value={item.position} onChange={(e) => { const n = [...extCareerItems]; n[i] = { ...n[i], position: e.target.value }; setExtCareerItems(n); }} placeholder="사원, 대리 등" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><Label className="text-xs">입사일</Label><input type="date" value={item.startDate || ""} onChange={(e) => { const n = [...extCareerItems]; n[i] = { ...n[i], startDate: e.target.value }; setExtCareerItems(n); }} className={nativeSelectClass} /></div>
                    <div><Label className="text-xs">퇴사일</Label><input type="date" value={item.endDate || ""} onChange={(e) => { const n = [...extCareerItems]; n[i] = { ...n[i], endDate: e.target.value }; setExtCareerItems(n); }} className={nativeSelectClass} /></div>
                    <div><Label className="text-xs">담당 업무</Label><Input value={item.task} onChange={(e) => { const n = [...extCareerItems]; n[i] = { ...n[i], task: e.target.value }; setExtCareerItems(n); }} placeholder="업무 요약" /></div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">상세 업무</Label>
                      {item.descItems.length < 5 && <button type="button" className="text-xs text-primary font-medium" onClick={() => { const n = [...extCareerItems]; n[i] = { ...n[i], descItems: [...n[i].descItems, ""] }; setExtCareerItems(n); }}>+ 추가</button>}
                    </div>
                    <div className="space-y-1.5">
                      {item.descItems.map((d, di) => {
                        const isImportant = d.startsWith("★");
                        const cleanVal = isImportant ? d.slice(1) : d;
                        return (
                        <div key={di} className={`flex gap-1.5 items-center rounded-md px-1 ${isImportant ? "bg-yellow-100 dark:bg-yellow-900/30" : ""}`}>
                          <button type="button" onClick={() => { const n = [...extCareerItems]; const ds = [...n[i].descItems]; ds[di] = isImportant ? cleanVal : `★${cleanVal}`; n[i] = { ...n[i], descItems: ds }; setExtCareerItems(n); }} className={`flex-shrink-0 text-sm ${isImportant ? "text-yellow-500" : "text-muted-foreground/30 hover:text-yellow-400"}`} title="중요 표시">★</button>
                          <Input value={cleanVal} onChange={(e) => { const n = [...extCareerItems]; const ds = [...n[i].descItems]; ds[di] = (isImportant ? "★" : "") + e.target.value; n[i] = { ...n[i], descItems: ds }; setExtCareerItems(n); }} placeholder={`상세 업무 ${di + 1}`} />
                          {item.descItems.length > 1 && <Button variant="ghost" size="icon-xs" className="text-destructive/60 hover:text-destructive flex-shrink-0" onClick={() => { const n = [...extCareerItems]; n[i] = { ...n[i], descItems: n[i].descItems.filter((_, k) => k !== di) }; setExtCareerItems(n); }}>×</Button>}
                        </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="ghost" size="xs" className="text-primary" onClick={() => setExtCareerItems([...extCareerItems, { company: "", position: "", period: "", startDate: "", endDate: "", task: "", descItems: [""] }])}>+ 경력 추가</Button>
            </div>
            <div className="flex gap-2 mt-2">
              <Button className="flex-1" onClick={() => saveResumeKey("experience", extCareerItems.filter(e => e.company).map(e => ({ ...e, startDate: e.startDate || "", endDate: e.endDate || "", period: [e.startDate, e.endDate].filter(Boolean).join(" ~ "), description: e.descItems.filter(Boolean).join("\n"), descItems: undefined })))} disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
              <Button className="flex-1" variant="outline" onClick={() => setEditSection(null)}>취소</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── 자격증 수정 (최대 5개) ── */}
        <Dialog open={editSection === "certs"} onOpenChange={(o) => !o && setEditSection(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>자격증 및 면허 수정</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {certsItems.map((item, i) => (
                <div key={i} className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">자격증 {i + 1}</span>
                    <Button variant="ghost" size="icon-xs" className="text-destructive/60 hover:text-destructive" onClick={() => setCertsItems(certsItems.filter((_, j) => j !== i))}>×</Button>
                  </div>
                  <div><Label className="text-xs">자격증명</Label><Input value={item.name} onChange={(e) => { const n = [...certsItems]; n[i] = { ...n[i], name: e.target.value }; setCertsItems(n); }} placeholder="건축기사" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">취득일</Label><Input value={item.acquisition_date} onChange={(e) => { const n = [...certsItems]; n[i] = { ...n[i], acquisition_date: e.target.value }; setCertsItems(n); }} placeholder="2024.06" /></div>
                    <div><Label className="text-xs">발급기관</Label><Input value={item.issuer} onChange={(e) => { const n = [...certsItems]; n[i] = { ...n[i], issuer: e.target.value }; setCertsItems(n); }} placeholder="한국산업인력관리공단" /></div>
                  </div>
                </div>
              ))}
              <Button variant="ghost" size="xs" className="text-primary" onClick={() => setCertsItems([...certsItems, { name: "", acquisition_date: "", issuer: "" }])}>+ 자격증 추가</Button>
            </div>
            <div className="flex gap-2 mt-2">
              <Button className="flex-1" onClick={() => saveResumeKey("certifications", certsItems.filter(c => c.name))} disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
              <Button className="flex-1" variant="outline" onClick={() => setEditSection(null)}>취소</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── 학력 수정 (최대 5개) ── */}
        <Dialog open={editSection === "education"} onOpenChange={(o) => !o && setEditSection(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>학력 수정</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {eduItems.map((item, i) => (
                <div key={i} className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">학력 {i + 1}</span>
                    <Button variant="ghost" size="icon-xs" className="text-destructive/60 hover:text-destructive" onClick={() => setEduItems(eduItems.filter((_, j) => j !== i))}>×</Button>
                  </div>
                  <div><Label className="text-xs">학교명</Label><Input value={item.school_name} onChange={(e) => { const n = [...eduItems]; n[i] = { ...n[i], school_name: e.target.value }; setEduItems(n); }} placeholder="OO대학교" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">전공</Label><Input value={item.major} onChange={(e) => { const n = [...eduItems]; n[i] = { ...n[i], major: e.target.value }; setEduItems(n); }} placeholder="건축공학과" /></div>
                    <div><Label className="text-xs">학위</Label>
                      <select value={item.degree} onChange={(e) => { const n = [...eduItems]; n[i] = { ...n[i], degree: e.target.value }; setEduItems(n); }} className={nativeSelectClass}>
                        <option value="">선택</option>
                        <option value="학사">학사</option>
                        <option value="석사">석사</option>
                        <option value="박사수료">박사수료</option>
                        <option value="박사">박사</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="ghost" size="xs" className="text-primary" onClick={() => setEduItems([...eduItems, { school_name: "", major: "", degree: "" }])}>+ 학력 추가</Button>
            </div>
            <div className="flex gap-2 mt-2">
              <Button className="flex-1" onClick={() => saveResumeKey("education", eduItems.filter(e => e.school_name).map(e => ({ ...e, school_name: e.school_name.replace(/\s*\((학사|석사|박사수료|박사)\)/g, "") })))} disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
              <Button className="flex-1" variant="outline" onClick={() => setEditSection(null)}>취소</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── 소속/입사일 수정 ── */}
        <Dialog open={editSection === "team"} onOpenChange={(o) => !o && setEditSection(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>소속 및 입사일 수정</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>소속 팀</Label>
                <select value={teamForm.teamId} onChange={(e) => setTeamForm({ ...teamForm, teamId: e.target.value })} className={nativeSelectClass}>
                  {allTeams.map((t) => <option key={t.id} value={t.id}>[{t.location.company}] {t.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>입사일</Label>
                <Input value={teamForm.joinDate} onChange={(e) => setTeamForm({ ...teamForm, joinDate: e.target.value })} placeholder="2024.03.01" />
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <Button className="flex-1" onClick={() => saveFields({ teamId: Number(teamForm.teamId), joinDate: teamForm.joinDate })} disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
              <Button className="flex-1" variant="outline" onClick={() => setEditSection(null)}>취소</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── 발령내역(자사 경력) 수정 (최대 5개) ── */}
        <Dialog open={editSection === "appointment"} onOpenChange={(o) => !o && setEditSection(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>자사 경력 (발령내역) 수정</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {apptItems.map((item, i) => (
                <div key={i} className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">{i === 0 ? "현 부서" : `발령 ${i}`}</span>
                    {apptItems.length > 1 && <Button variant="ghost" size="icon-xs" className="text-destructive/60 hover:text-destructive" onClick={() => setApptItems(apptItems.filter((_, j) => j !== i))}>×</Button>}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><Label className="text-xs">발령일</Label><input type="date" value={item.date} onChange={(e) => { const n = [...apptItems]; n[i] = { ...n[i], date: e.target.value }; setApptItems(n); }} className={nativeSelectClass} /></div>
                    <div><Label className="text-xs">부서</Label><Input value={item.department} onChange={(e) => { const n = [...apptItems]; n[i] = { ...n[i], department: e.target.value }; setApptItems(n); }} placeholder="경영지원팀" /></div>
                    <div><Label className="text-xs">직위</Label>
                      <select value={item.position} onChange={(e) => { const n = [...apptItems]; n[i] = { ...n[i], position: e.target.value }; setApptItems(n); }} className={nativeSelectClass}>
                        <option value="">선택</option>
                        {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">세부 업무</Label>
                      {item.taskItems.length < 5 && <button type="button" className="text-xs text-primary font-medium" onClick={() => { const n = [...apptItems]; n[i] = { ...n[i], taskItems: [...n[i].taskItems, ""] }; setApptItems(n); }}>+ 추가</button>}
                    </div>
                    <div className="space-y-1.5">
                      {item.taskItems.map((t, ti) => {
                        const isImportant = t.startsWith("★");
                        const cleanVal = isImportant ? t.slice(1) : t;
                        return (
                        <div key={ti} className={`flex gap-1.5 items-center rounded-md px-1 ${isImportant ? "bg-yellow-100 dark:bg-yellow-900/30" : ""}`}>
                          <button type="button" onClick={() => { const n = [...apptItems]; const ts = [...n[i].taskItems]; ts[ti] = isImportant ? cleanVal : `★${cleanVal}`; n[i] = { ...n[i], taskItems: ts }; setApptItems(n); }} className={`flex-shrink-0 text-sm ${isImportant ? "text-yellow-500" : "text-muted-foreground/30 hover:text-yellow-400"}`} title="중요 표시">★</button>
                          <Input value={cleanVal} onChange={(e) => { const n = [...apptItems]; const ts = [...n[i].taskItems]; ts[ti] = (isImportant ? "★" : "") + e.target.value; n[i] = { ...n[i], taskItems: ts }; setApptItems(n); }} placeholder={`업무 ${ti + 1}`} />
                          {item.taskItems.length > 1 && <Button variant="ghost" size="icon-xs" className="text-destructive/60 hover:text-destructive flex-shrink-0" onClick={() => { const n = [...apptItems]; n[i] = { ...n[i], taskItems: n[i].taskItems.filter((_, k) => k !== ti) }; setApptItems(n); }}>×</Button>}
                        </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="ghost" size="xs" className="text-primary" onClick={() => setApptItems([...apptItems, { date: "", department: "", position: "", taskItems: [""] }])}>+ 발령 추가</Button>
            </div>
            <div className="flex gap-2 mt-2">
              <Button className="flex-1" onClick={() => saveResumeKey("appointmentHistory", apptItems.filter(a => a.date || a.department).map(a => ({ ...a, description: a.taskItems.filter(Boolean).join("\n"), taskItems: undefined })))} disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
              <Button className="flex-1" variant="outline" onClick={() => setEditSection(null)}>취소</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 근속/경력 카드 */}
        <div className="bg-card rounded-md border border-border py-4">
          <div className="flex">
            <div className="flex-1 text-center border-r border-border">
              <p className="text-base font-bold text-foreground leading-none">{yearsWorked}</p>
              <p className="text-xs text-muted-foreground mt-0.5">근속</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-base font-bold text-foreground leading-none">{totalCareer}</p>
              <p className="text-xs text-muted-foreground mt-0.5">경력</p>
            </div>
          </div>
        </div>

        {/* 학력 카드 */}
        <div className="bg-card rounded-md border border-border px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">학력</span>
            {canEdit && <SectionEditBtn onClick={() => { const rd = employee.resumeData ? JSON.parse(employee.resumeData) : {}; const edu = (rd.education || []).map((e: Record<string, string>) => ({ school_name: e.school_name || "", major: e.major || "", degree: e.degree || "" })); setEduItems(edu.length > 0 ? edu : [{ school_name: "", major: "", degree: "" }]); setEditSection("education"); }} />}
          </div>
          <div className="space-y-1">
            {education.length > 0 ? education.slice(0, 3).map((e, i) => (
              <div key={i} className="py-1.5 flex items-center gap-2.5">
                <span className="text-3xl flex-shrink-0">🎓</span>
                <div className="min-w-0">
                  <p className="text-base font-bold text-foreground truncate">{e.school_name}</p>
                  {e.major && <p className="text-xs text-muted-foreground">{e.major}{e.degree ? ` · ${e.degree}` : ""}</p>}
                </div>
              </div>
            )) : (
              <p className="text-xs text-muted-foreground text-center py-2">등록된 학력이 없습니다.</p>
            )}
          </div>
        </div>

      </div>

      {/* ── 메인 콘텐츠 (스크롤) ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-4 pt-8 pr-8 pb-4 pl-1">
          {/* Career 카드 */}
          <div className="bg-card rounded-md border border-border p-5">
            <p className="text-lg font-bold text-foreground uppercase tracking-normal mb-6">Career</p>
            <div className="grid grid-cols-2 gap-10">
              {/* 자사 경력 */}
              <div>
                <div className="flex items-center justify-between mb-5 pb-2 border-b border-border">
                  <h4 className="text-base font-bold text-muted-foreground uppercase tracking-widest">자사 경력</h4>
                  {canEdit && (
                    <div className="flex gap-1">
                      <SectionEditBtn onClick={() => { const rd = employee.resumeData ? JSON.parse(employee.resumeData) : {}; const ah = (rd.appointmentHistory || []).map((a: Record<string, string>, idx: number) => { const desc = a.description || (idx === 0 ? (extra.taskDetail?.trim() || extra.jobRole || "") : ""); return { date: a.date || "", department: a.department || "", position: a.position || "", taskItems: desc.split("\n").filter(Boolean).length > 0 ? desc.split("\n").filter(Boolean) : [""] }; }); setApptItems(ah.length > 0 ? ah : [{ date: "", department: "", position: "", taskItems: [""] }]); setEditSection("appointment"); }} />
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  {appointmentHistory.length > 0 ? appointmentHistory.map((a, i) => (
                    <div key={i} className={`p-6 rounded-md ${i === 0 ? "bg-card border-2 border-border" : "bg-card border border-border"}`}>
                      <p className={`font-bold ${i === 0 ? "text-base text-foreground" : "text-base text-foreground"}`}>
                        {i === 0 && <span className="mr-2 text-xs font-bold text-foreground bg-accent px-3 py-1 rounded-full uppercase tracking-widest">Now</span>}
                        {a.department || "—"}{a.position ? ` | ${a.position}` : ""} | {fmtDateShort(a.date)}
                      </p>
                      {(a.description || (i === 0 && ((extra.taskDetail?.trim()) || extra.jobRole))) && (
                        <ul className={`mt-4 space-y-2 pt-4 ${i === 0 ? "border-t border-foreground/15" : "border-t border-border"}`}>
                          {i === 0 && !a.description && ((extra.taskDetail?.trim() ? [extra.taskDetail] : [extra.jobRole]).filter(Boolean).join("\n")).split("\n").filter(Boolean).map((line: string, j: number) => (
                            <li key={`task-${j}`} className="text-base font-bold text-foreground flex items-center gap-2.5">
                              <span className="w-2 h-2 rounded-full bg-foreground flex-shrink-0" />
                              {line}
                            </li>
                          ))}
                          {a.description && a.description.split("\n").filter(Boolean).map((line: string, j: number) => {
                            const imp = line.startsWith("★");
                            const text = imp ? line.slice(1) : line;
                            return (
                            <li key={j} className={`flex items-center gap-2.5 ${imp ? "bg-yellow-100 dark:bg-yellow-900/30 rounded px-2 py-0.5" : ""} ${i === 0 ? "text-base font-bold text-foreground" : "text-sm text-muted-foreground"}`}>
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${imp ? "bg-yellow-500" : i === 0 ? "bg-foreground" : "bg-muted-foreground"}`} />
                              {text}
                            </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )) : (
                    <div className="p-6 rounded-md bg-card border-2 border-border">
                      <p className="text-base font-bold text-foreground">{employee.team?.name || "—"} | {employee.joinDate ? `${fmtDateShort(employee.joinDate)} ~ 현재` : "—"}</p>
                      {((extra.taskDetail?.trim()) || extra.jobRole) && (
                        <ul className="mt-4 space-y-2 border-t border-foreground/15 pt-4">
                          {((extra.taskDetail?.trim() ? [extra.taskDetail] : [extra.jobRole]).filter(Boolean).join("\n")).split("\n").filter(Boolean).map((line: string, i: number) => (
                            <li key={i} className="text-sm text-foreground/70 flex items-center gap-2.5">
                              <span className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
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
                <div className="flex items-center justify-between mb-5 pb-2 border-b border-border">
                  <h4 className="text-base font-bold text-muted-foreground uppercase tracking-widest">타사 경력</h4>
                  {canEdit && <SectionEditBtn onClick={() => { const rd = employee.resumeData ? JSON.parse(employee.resumeData) : {}; const toIso = (d: string) => { if (!d) return ""; const n = d.replace(/\./g, "-"); const m = n.match(/^(\d{2})-(\d{1,2})-(\d{1,2})$/); if (m) return `${Number(m[1]) < 50 ? "20" : "19"}${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`; const m2 = n.match(/(\d{4})-(\d{1,2})-(\d{1,2})/); if (m2) return `${m2[1]}-${m2[2].padStart(2,"0")}-${m2[3].padStart(2,"0")}`; return ""; }; const exp = (rd.experience || []).map((e: Record<string, string>) => { const desc = e.description || e.task || ""; return { company: e.company || "", position: e.position || "", period: e.period || "", startDate: toIso(e.startDate || ""), endDate: toIso(e.endDate || ""), task: e.task || "", descItems: desc.split("\n").filter(Boolean).length > 0 ? desc.split("\n").filter(Boolean) : [""] }; }); setExtCareerItems(exp.length > 0 ? exp : [{ company: "", position: "", period: "", startDate: "", endDate: "", task: "", descItems: [""] }]); setEditSection("extCareer"); }} />}
                </div>
                <div className="space-y-3">
                  {experience.length > 0 ? experience.map((e, i) => (
                    <div key={i} className="p-6 rounded-md bg-card border-2 border-border">
                      <p className="text-base font-bold text-foreground">{e.company}{e.position ? ` | ${e.position}` : ""} | {fmtRange(e)}</p>
                      {(e.task || e.description) && (
                        <ul className="mt-4 space-y-2 border-t border-border pt-4">
                          {e.task && !e.description && (
                            <li className="text-sm text-muted-foreground flex items-center gap-2.5">
                              <span className="w-2 h-2 rounded-full bg-muted-foreground flex-shrink-0" />
                              {e.task}
                            </li>
                          )}
                          {e.description && e.description.split("\n").filter(Boolean).map((line: string, j: number) => {
                            const imp = line.startsWith("★");
                            const text = imp ? line.slice(1) : line;
                            return (
                            <li key={j} className={`text-sm flex items-center gap-2.5 ${imp ? "text-foreground bg-yellow-100 dark:bg-yellow-900/30 rounded px-2 py-0.5" : "text-muted-foreground"}`}>
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${imp ? "bg-yellow-500" : "bg-muted-foreground"}`} />
                              {text}
                            </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground text-center py-10">등록된 타사 경력이 없습니다.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Education 카드 */}
          <div className="bg-card rounded-md border border-border p-5">
            <p className="text-lg font-bold text-foreground uppercase tracking-normal mb-6">Skills</p>
            <div className="space-y-3">
              {/* 자격증 + 스킬 (2열) */}
              <div className="grid grid-cols-2 gap-10">
                {/* 자격증 및 면허 */}
                <div>
                  <div className="flex items-center justify-between mb-5 pb-2 border-b border-border">
                    <h4 className="text-base font-bold text-muted-foreground uppercase tracking-widest">자격증 및 면허</h4>
                    {canEdit && <SectionEditBtn onClick={() => { const rd = employee.resumeData ? JSON.parse(employee.resumeData) : {}; const certs = (rd.certifications || []).map((c: Record<string, string>) => ({ name: c.name || "", acquisition_date: c.acquisition_date || "", issuer: c.issuer || "" })); setCertsItems(certs.length > 0 ? certs : [{ name: "", acquisition_date: "", issuer: "" }]); setEditSection("certs"); }} />}
                  </div>
                  {certifications.length > 0 ? (
                    <div className="space-y-3">
                      {certifications.map((c, i) => (
                        <div key={i} className="px-6 py-5 rounded-md bg-card border-2 border-border">
                          <p className="text-base font-bold text-foreground">{c.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{fmtDateShort(c.acquisition_date)}{c.issuer ? ` · ${c.issuer}` : ""}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">등록된 자격증이 없습니다.</p>
                  )}
                </div>
                {/* 스킬 */}
                <div>
                  <div className="flex items-center justify-between mb-5 pb-2 border-b border-border">
                    <h4 className="text-base font-bold text-muted-foreground uppercase tracking-widest">스킬</h4>
                    {canEdit && <SectionEditBtn onClick={() => { setSkillsForm({ skills: employee.skills || "" }); setEditSection("skills"); }} />}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {extra.skills ? extra.skills.split(",").map((s: string, i: number) => (
                      <span key={i} className="px-5 py-2.5 rounded-full bg-muted text-sm font-bold text-foreground">{s.trim()}</span>
                    )) : (
                      <p className="text-sm text-muted-foreground py-6 w-full text-center">등록된 스킬이 없습니다.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Information 카드 */}
          <div className="bg-card rounded-md border border-border p-5">
            <p className="text-lg font-bold text-foreground uppercase tracking-normal mb-6">Information</p>
            <div className="grid grid-cols-2 gap-10">
              {/* Info */}
              <div>
                <div className="flex items-center justify-between mb-5 pb-2 border-b border-border">
                  <h4 className="text-base font-bold text-muted-foreground uppercase tracking-widest">인사정보</h4>
                  {canEdit && <SectionEditBtn onClick={() => { setInfoForm({ birthDate: employee.birthDate || "", address: employee.address || "", jobCategory: employee.jobCategory || "", taskDetail: employee.taskDetail || "" }); setEditSection("info"); }} />}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-card flex items-center justify-center">
                      <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                    </div>
                    <span className="text-sm text-muted-foreground">{fmtDate(extra.birthDate)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-card flex items-center justify-center">
                      <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                    </div>
                    <span className="text-sm text-muted-foreground">{extra.address ? extra.address.split(" ").slice(0, 2).join(" ") : "—"}</span>
                  </div>
                </div>
              </div>
              {/* Contact */}
              <div>
                <div className="flex items-center justify-between mb-5 pb-2 border-b border-border">
                  <h4 className="text-base font-bold text-muted-foreground uppercase tracking-widest">연락처</h4>
                  {canEdit && <SectionEditBtn onClick={() => { setContactForm({ phone: formatPhone(employee.phone || ""), phoneWork: formatPhone(employee.phoneWork || ""), email: employee.email || "" }); setEditSection("contact"); }} />}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-card flex items-center justify-center">
                      <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                    </div>
                    <span className="text-sm text-muted-foreground">{employee.phoneWork || "—"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-card flex items-center justify-center">
                      <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
                    </div>
                    <span className="text-sm text-muted-foreground">{employee.phone || "—"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-card flex items-center justify-center">
                      <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                    </div>
                    <span className="text-sm text-muted-foreground">{employee.email || "—"}</span>
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
  const borderColor = POSITION_RING_COLORS[employee.position] || "border-input/25";
  const glow = POSITION_GLOW[employee.position] || "rgba(160,160,160,0.1)";

  const nameLabel = (
    <>
      <span className="font-bold text-foreground text-xl group-hover:text-foreground transition tracking-tight">
        {employee.name}
      </span>
      <span className="text-base text-muted-foreground font-light">{employee.position}</span>
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
        className={`org-node w-48 h-48 rounded-full bg-card backdrop-blur-sm border border-border shadow-[0_6px_30px_rgba(0,0,0,0.08)] flex items-center justify-center text-4xl font-light text-muted-foreground overflow-hidden relative`}
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
            <span className="text-xs text-muted-foreground">사진없음</span>
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
  isAdmin,
  onUpdate,
  currentEmployeeId,
  autoOpenEmployeeId,
}: {
  leader: Employee | undefined;
  members: Employee[];
  teamName?: string;
  teamSub?: string;
  onPanelChange?: (open: boolean) => void;
  isAdmin?: boolean;
  onUpdate?: () => void;
  currentEmployeeId?: number | null;
  autoOpenEmployeeId?: number | null;
}) {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const selectEmployee = (emp: Employee | null) => {
    setSelectedEmployee(emp);
    onPanelChange?.(emp !== null);
  };

  // URL에서 employee 파라미터로 자동 프로필 열기
  const autoOpened = useRef(false);
  useEffect(() => {
    if (autoOpenEmployeeId && !autoOpened.current) {
      const all = [...(leader ? [leader] : []), ...members];
      const target = all.find(e => e.id === autoOpenEmployeeId);
      if (target) { selectEmployee(target); autoOpened.current = true; }
    }
  }, [autoOpenEmployeeId, leader, members]);

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
    <div className="flex w-full h-full gap-3" style={{ background: "linear-gradient(160deg, var(--background) 0%, var(--secondary) 30%, var(--muted) 60%, var(--background) 100%)" }}>
      {/* 좌측 */}
      <div className={`transition-all duration-500 ease-in-out flex-shrink-0 ${isPanelOpen ? "w-64 overflow-y-auto flex-shrink-0 scrollbar-hide bg-card" : "w-full overflow-auto"}`}>
        <div className={`h-full transition-all duration-500 ${isPanelOpen ? "bg-card p-4" : "p-8 flex justify-center items-center overflow-visible"}`} style={!isPanelOpen ? { background: "linear-gradient(160deg, var(--background) 0%, var(--secondary) 30%, var(--muted) 60%, var(--background) 100%)" } : undefined}>

          {isPanelOpen ? (
            /* ── 패널 열림: 세로 리스트 ── */
            <div>
              {/* 팀명 */}
              {teamName && (
                <div className="px-3 pb-4 mb-5 border-b border-border">
                  <h2 className="text-2xl font-black text-foreground">{teamName}</h2>
                  {teamSub && <p className="text-sm text-muted-foreground mt-1.5">{teamSub}</p>}
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
                      isActive ? "bg-primary/10 border border-primary/15" : "hover:bg-muted"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0 overflow-hidden ${
                      isLeader
                        ? "bg-foreground/80 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {emp.photoUrl ? (
                        <img src={emp.photoUrl} alt={emp.name} className="w-full h-full object-cover" />
                      ) : (
                        emp.name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0 flex items-baseline gap-2">
                      <p className={`text-lg font-semibold truncate ${isActive ? "text-foreground" : "text-foreground/80"}`}>{emp.name}</p>
                      <p className={`text-sm flex-shrink-0 ${isActive ? "text-muted-foreground" : "text-muted-foreground"}`}>{emp.position}{emp.role !== "팀원" ? ` · ${emp.role}` : ""}</p>
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
                    className="org-node w-60 h-60 rounded-full overflow-hidden relative flex items-center justify-center bg-card"
                  >
                    <span className="relative z-10">
                      {leader.photoUrl ? (
                        <img src={leader.photoUrl} alt={leader.name} className="w-60 h-60 object-cover" />
                      ) : (
                        <span className="text-sm text-primary-foreground/50">사진없음</span>
                      )}
                    </span>
                  </div>
                  <span className="mt-4 font-bold text-foreground text-3xl tracking-tight">{leader.name}</span>
                  <span className="text-lg text-muted-foreground font-light">{leader.position} · {leader.role}</span>
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
                      className="absolute rounded-full bg-muted-foreground shadow-[0_0_10px_rgba(0,0,0,0.15)]"
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
          <ProfilePanel employee={selectedEmployee} onClose={() => selectEmployee(null)} isAdmin={isAdmin} onUpdate={onUpdate} currentEmployeeId={currentEmployeeId} />
        )}
      </div>
    </div>
  );
}
