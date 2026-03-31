"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PdfDropzone from "@/components/PdfDropzone";
import PdfModal from "@/components/PdfModal";

interface Team {
  id: number;
  name: string;
  locationId: number;
  location: { id: number; name: string; type: string; company: string };
}

interface UserInfo {
  id: number;
  email: string;
  name: string;
  role: string;
  hasEmployee: boolean;
  employeeId: number | null;
}

interface Education { [key: string]: string; startDate: string; endDate: string; school_name: string; major: string; degree: string; location: string }
interface Certification { [key: string]: string; name: string; acquisition_date: string; issuer: string; license_number: string }
interface Experience { [key: string]: string; startDate: string; endDate: string; company: string; position: string; task: string; description: string }
interface FamilyRelation { [key: string]: string; relation: string; name: string; birth_date: string; occupation: string }
interface Appointment { [key: string]: string; date: string; type: string; position: string; grade: string; department: string; duty: string; job_role: string; description: string }

interface ExtractedData {
  basic_information?: Record<string, string | undefined>;
  education?: Partial<Education>[];
  certifications?: Partial<Certification>[];
  experience?: Partial<Experience>[];
  family_relations?: Partial<FamilyRelation>[];
  appointment_history?: Partial<Appointment>[];
}

const POSITIONS = ["부장", "차장", "과장", "대리", "주임", "사원"];
const ROLES = ["팀원", "팀장", "부서장"];

const emptyEducation = (): Education => ({ startDate: "", endDate: "", school_name: "", major: "", degree: "", location: "" });
const emptyCertification = (): Certification => ({ name: "", acquisition_date: "", issuer: "", license_number: "" });
const emptyExperience = (): Experience => ({ startDate: "", endDate: "", company: "", position: "", task: "", description: "" });
const emptyFamily = (): FamilyRelation => ({ relation: "", name: "", birth_date: "", occupation: "" });
const emptyAppointment = (): Appointment => ({ date: "", type: "", position: "", grade: "", department: "", duty: "", job_role: "", description: "" });

// 편집 가능한 배열 섹션 컴포넌트
function EditableSection<T extends Record<string, string>>({
  title,
  items,
  setItems,
  fields,
  emptyItem,
  readOnly = false,
}: {
  title: string;
  items: T[];
  setItems: (items: T[]) => void;
  fields: { key: keyof T; label: string; width?: string; type?: "text" | "textarea" | "date"; pairWith?: keyof T; pairLabel?: string }[];
  emptyItem: () => T;
  readOnly?: boolean;
}) {
  // 2자리 연도 → 4자리 연도 변환
  const normalizeYear = (d: string) => {
    if (!d) return d;
    const m = d.match(/^(\d{2})([.\-/])(\d{1,2})\2(\d{1,2})/);
    if (m) return `${Number(m[1]) < 50 ? "20" : "19"}${m[1]}${m[2]}${m[3]}${m[2]}${m[4]}`;
    return d;
  };
  // YYYY.MM.DD → YYYY-MM-DD (input[type=date]용)
  const toIso = (d: string) => {
    if (!d) return "";
    const n = normalizeYear(d).replace(/\./g, "-");
    const m = n.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    return "";
  };
  // YYYY-MM-DD → YYYY.MM.DD (표시/저장용)
  const toDot = (d: string) => d ? d.replace(/-/g, ".") : "";

  const update = (idx: number, key: keyof T, value: string) => {
    const next = [...items];
    next[idx] = { ...next[idx], [key]: value };
    setItems(next);
  };
  const remove = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const add = () => setItems([...items, emptyItem()]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-foreground/70">{title}</h3>
        {!readOnly && (
          <button type="button" onClick={add} className="text-xs text-primary hover:text-primary/80 font-medium">
            + 추가
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">항목이 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-start bg-muted rounded-lg p-3">
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {(() => {
                    const textFields = fields.filter((f) => f.type !== "textarea" && f.type !== "date" && !f.pairWith);
                    const dateFields = fields.filter((f) => f.type === "date");
                    // date 필드를 2개씩 묶어서 나란히 표시
                    const datePairs: typeof dateFields[] = [];
                    for (let i = 0; i < dateFields.length; i += 2) {
                      datePairs.push(dateFields.slice(i, i + 2));
                    }
                    return (
                      <>
                        {textFields.map((f) => readOnly ? (
                          <div key={String(f.key)} className={`px-2 py-1.5 text-foreground ${String(f.key) === "school_name" ? "text-xl font-bold col-span-2" : "text-sm"}`}>
                            {String(f.key) !== "school_name" && <span className="text-xs text-muted-foreground">{f.label}: </span>}
                            {item[f.key] || "-"}
                          </div>
                        ) : (
                          <input
                            key={String(f.key)}
                            type="text"
                            value={item[f.key] || ""}
                            onChange={(e) => update(idx, f.key, e.target.value)}
                            placeholder={f.label}
                            className={`border border-input rounded-md px-2 py-1.5 text-sm focus:ring-1 focus:ring-ring outline-none ${f.width || ""}`}
                          />
                        ))}
                        {datePairs.map((pair, pi) => readOnly ? (
                          <div key={pi} className="col-span-2 flex items-center gap-2 text-sm text-foreground px-2 py-1.5">
                            <span className="text-xs text-muted-foreground">{pair[0].label}:</span> {item[pair[0].key] || "-"}
                            {pair[1] && <><span className="text-border mx-1">~</span><span className="text-xs text-muted-foreground">{pair[1].label}:</span> {item[pair[1].key] || "-"}</>}
                          </div>
                        ) : (
                          <div key={pi} className="col-span-2 flex items-center gap-2">
                            <div className="flex-1">
                              <label className="text-[10px] text-muted-foreground mb-0.5 block">{pair[0].label}</label>
                              <input
                                type="date"
                                value={toIso(item[pair[0].key] || "")}
                                onChange={(e) => update(idx, pair[0].key, toDot(e.target.value))}
                                className="w-full border border-input rounded-md px-2 py-1.5 text-sm focus:ring-1 focus:ring-ring outline-none"
                              />
                            </div>
                            <span className="text-muted-foreground mt-4">~</span>
                            {pair[1] && (
                              <div className="flex-1">
                                <label className="text-[10px] text-muted-foreground mb-0.5 block">{pair[1].label}</label>
                                <input
                                  type="date"
                                  value={toIso(item[pair[1].key] || "")}
                                  onChange={(e) => update(idx, pair[1].key, toDot(e.target.value))}
                                  className="w-full border border-input rounded-md px-2 py-1.5 text-sm focus:ring-1 focus:ring-ring outline-none"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
                {fields.filter((f) => f.type === "textarea").map((f) => readOnly ? (
                  <div key={String(f.key)} className="py-1">
                    <ul className="space-y-1.5">
                      {(item[f.key] || "").split("\n").filter(Boolean).slice(0, 5).map((line: string, j: number) => (
                        <li key={j} className="flex items-center gap-2 text-sm text-foreground">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                          {line}
                        </li>
                      ))}
                      {!item[f.key] && <span className="text-sm text-muted-foreground">-</span>}
                    </ul>
                  </div>
                ) : (
                  <div key={String(f.key)} className="space-y-1.5">
                    {[0, 1, 2, 3, 4].map((j) => {
                      const lines = (item[f.key] || "").split("\n");
                      return (
                        <div key={j} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                          <input
                            type="text"
                            value={lines[j] || ""}
                            onChange={(e) => {
                              const newLines = [...lines];
                              while (newLines.length <= j) newLines.push("");
                              newLines[j] = e.target.value;
                              update(idx, f.key, newLines.slice(0, 5).join("\n"));
                            }}
                            placeholder={`${f.label.replace(/\s*\(.*\)/, "")} ${j + 1}`}
                            className="flex-1 border border-input rounded-md px-2 py-1.5 text-sm focus:ring-1 focus:ring-ring outline-none"
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              {!readOnly && (
                <button type="button" onClick={() => remove(idx)} className="text-destructive/60 hover:text-destructive text-xs mt-1 flex-shrink-0">
                  삭제
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isEdit, setIsEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [resumePath, setResumePath] = useState<string | null>(null);
  const [showPdf, setShowPdf] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [step, setStep] = useState<"upload" | "form" | "quick">("upload");

  // 기본 정보 폼
  const [form, setForm] = useState({
    name: "", nameEn: "", email: "", phone: "", phoneWork: "", emailWork: "", position: "", role: "", teamId: "", joinDate: "",
    birthDate: "", address: "", jobCategory: "", jobRole: "", employmentType: "",
    entryType: "", specialty: "", hobby: "", taskDetail: "", skills: "",
  });

  // 배열 데이터 (편집 가능)
  const [education, setEducation] = useState<Education[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [experience, setExperience] = useState<Experience[]>([]);
  const [familyRelations, setFamilyRelations] = useState<FamilyRelation[]>([]);
  const [appointmentHistory, setAppointmentHistory] = useState<Appointment[]>([]);

  useEffect(() => {
    (async () => {
      const [meRes, teamsRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/teams"),
      ]);
      const data: UserInfo | null = await meRes.json();
      const teamsData: Team[] = await teamsRes.json();
      setTeams(teamsData);

      if (!data) { router.replace("/login"); return; }
      // EXECUTIVE users without employee data -> redirect to dashboard
      if (data.role.includes("EXECUTIVE") && !data.role.includes("EMPLOYEE") && !data.hasEmployee) {
        router.replace("/dashboard");
        return;
      }
      setUser(data);
      setForm((f) => ({ ...f, name: data.name, email: data.email }));

      if (data.hasEmployee && data.employeeId) {
        setIsEdit(true);
        setStep("form");
        const empRes = await fetch(`/api/employees/${data.employeeId}`);
        const emp = await empRes.json();
        // resumeData에서 배열 데이터 복원
        if (emp.resumeData) {
          try {
            const rd = JSON.parse(emp.resumeData);
            const fy = (d: string) => { if (!d) return d; const m = d.trim().match(/^(\d{2})([.\-/])(\d{1,2})\2(\d{1,2})/); if (m) return `${Number(m[1])<50?"20":"19"}${m[1]}.${m[3].padStart(2,"0")}.${m[4].padStart(2,"0")}`; return d.trim(); };
            const splitP = (item: Record<string, string>) => {
              const f = { ...item }; if (f.startDate) f.startDate = fy(f.startDate); if (f.endDate) f.endDate = fy(f.endDate);
              if (f.startDate || f.endDate) return f;
              if (f.period) { const p = f.period.split(/[~\-–—]/).map((s: string) => s.trim()); return { ...f, startDate: fy(p[0]||""), endDate: fy(p[1]||"") }; }
              return f;
            };
            if (rd.education?.length) setEducation(rd.education.map((e: Partial<Education>) => ({ ...emptyEducation(), ...splitP(e as Record<string, string>) })));
            if (rd.certifications?.length) setCertifications(rd.certifications.map((c: Partial<Certification>) => ({ ...emptyCertification(), ...c })));
            if (rd.experience?.length) setExperience(rd.experience.map((e: Partial<Experience>) => ({ ...emptyExperience(), ...splitP(e as Record<string, string>) })));
            if (rd.familyRelations?.length) setFamilyRelations(rd.familyRelations.map((f: Partial<FamilyRelation>) => ({ ...emptyFamily(), ...f })));
            if (rd.appointmentHistory?.length) setAppointmentHistory(rd.appointmentHistory.map((a: Partial<Appointment>) => ({ ...emptyAppointment(), ...a })));
          } catch { /* ignore parse error */ }
        }

        setForm({
          name: emp.name,
          nameEn: emp.nameEn || "",
          email: emp.email,
          phone: emp.phone || "",
          phoneWork: emp.phoneWork || "",
          emailWork: emp.emailWork || "",
          position: emp.position || "",
          role: emp.role || "",
          teamId: String(emp.teamId),
          joinDate: emp.joinDate || "",
          birthDate: emp.birthDate || "",
          address: emp.address || "",
          jobCategory: emp.jobCategory || "",
          jobRole: emp.jobRole || "",
          employmentType: emp.employmentType || "",
          entryType: emp.entryType || "",
          specialty: emp.specialty || "",
          hobby: emp.hobby || "",
          taskDetail: emp.taskDetail || "",
          skills: emp.skills || "",
        });
        setResumePath(emp.resumePath || null);
        setPhotoUrl(emp.photoUrl || null);
      }
    })();
  }, [router]);

  const handleExtracted = (data: ExtractedData, path: string) => {
    setResumePath(path);
    const bi = data.basic_information || {};

    const latestAppt = data.appointment_history?.length
      ? data.appointment_history[data.appointment_history.length - 1] : null;

    setForm((f) => {
      const updated = {
        ...f,
        name: bi.name_kor || f.name,
        phone: bi.phone_number || f.phone,
        joinDate: bi.entry_date?.replace(/\./g, "-") || f.joinDate,
        birthDate: bi.birth_date || "",
        address: bi.address || "",
        jobCategory: bi.job_category || "",
        jobRole: bi.job_role || "",
        employmentType: bi.employment_type || "",
        entryType: bi.entry_type || "",
        specialty: bi.specialty || "",
        hobby: bi.hobby || "",
      };
      if (latestAppt) {
        const posMatch = POSITIONS.find((p) => latestAppt.position?.includes(p));
        if (posMatch) updated.position = posMatch;
        const roleMatch = ROLES.find((r) => latestAppt.duty?.includes(r));
        if (roleMatch) updated.role = roleMatch;
      }
      return updated;
    });

    // period → startDate/endDate 호환 변환 + 2자리 연도 → 4자리
    const fixYear = (d: string) => {
      if (!d) return d;
      const m = d.trim().match(/^(\d{2})([.\-/])(\d{1,2})\2(\d{1,2})/);
      if (m) return `${Number(m[1]) < 50 ? "20" : "19"}${m[1]}.${m[3].padStart(2,"0")}.${m[4].padStart(2,"0")}`;
      return d.trim();
    };
    const splitPeriod = (item: Record<string, string>) => {
      const fixed = { ...item };
      if (fixed.startDate) fixed.startDate = fixYear(fixed.startDate);
      if (fixed.endDate) fixed.endDate = fixYear(fixed.endDate);
      if (fixed.startDate || fixed.endDate) return fixed;
      if (fixed.period) {
        const parts = fixed.period.split(/[~\-–—]/).map((s: string) => s.trim());
        return { ...fixed, startDate: fixYear(parts[0] || ""), endDate: fixYear(parts[1] || "") };
      }
      return fixed;
    };

    // 배열 데이터 매핑
    setEducation((data.education || []).map((e) => ({ ...emptyEducation(), ...splitPeriod(e) } as Education)));
    setCertifications((data.certifications || []).map((c) => ({ ...emptyCertification(), ...c } as Certification)));
    setExperience((data.experience || []).map((e) => ({ ...emptyExperience(), ...splitPeriod(e) } as Experience)));
    setFamilyRelations((data.family_relations || []).map((f) => ({ ...emptyFamily(), ...f } as FamilyRelation)));
    setAppointmentHistory((data.appointment_history || []).map((a) => ({ ...emptyAppointment(), ...a } as Appointment)));

    setStep("form");
  };

  // 팀 자동 매칭
  useEffect(() => {
    if (!appointmentHistory.length || !teams.length || form.teamId) return;
    const latest = appointmentHistory[appointmentHistory.length - 1];
    if (latest?.department) {
      const matched = teams.find((t) => latest.department.includes(t.name) || t.name.includes(latest.department));
      if (matched) setForm((f) => ({ ...f, teamId: String(matched.id) }));
    }
  }, [appointmentHistory, teams, form.teamId]);

  const handleSkip = () => setStep("quick");
  const [quickTasks, setQuickTasks] = useState<string[]>([""]);
  const companies = [...new Set(teams.map((t) => t.location.company))];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(""); setSuccess(false);

    const resumeDataJson = JSON.stringify({
      education, certifications, experience, familyRelations, appointmentHistory,
    });

    const body = {
      ...form, resumePath: resumePath || undefined, userId: user?.id,
      resumeData: resumeDataJson,
      photoUrl: photoUrl || undefined,
    };

    const url = isEdit && user?.employeeId ? `/api/employees/${user.employeeId}` : "/api/employees";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

    if (res.ok) {
      setLoading(false);
      const emp = await res.json();
      const teamId = emp.teamId || form.teamId;
      const empId = emp.id || user?.employeeId;
      const company = teams.find(t => t.id === Number(teamId))?.location?.company || "남광토건";
      window.location.href = `/dashboard?company=${encodeURIComponent(company)}&team=${teamId}&employee=${empId}`;
      return;
    } else {
      const err = await res.json();
      setError(err.error || "등록에 실패했습니다.");
    }
    setLoading(false);
  };

  if (!user) return null;
  if (step === "upload") return <PdfDropzone onExtracted={handleExtracted} onSkip={handleSkip} />;

  // ── 간편 등록 (PDF 없이) ──
  if (step === "quick") {
    const quickSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true); setError("");
      if (!form.teamId) { setError("소속 팀을 선택해주세요."); setLoading(false); return; }
      if (!form.position) { setError("직급을 선택해주세요."); setLoading(false); return; }
      if (!form.role) { setError("직책을 선택해주세요."); setLoading(false); return; }
      const body = {
        name: form.name, email: form.email, phone: "", position: form.position, role: form.role,
        teamId: form.teamId, joinDate: form.joinDate, userId: user.id,
        taskDetail: quickTasks.filter(Boolean).join("\n"),
      };
      const res = await fetch("/api/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) {
        const emp = await res.json();
        const company = teams.find(t => t.id === Number(form.teamId))?.location?.company || "남광토건";
        window.location.href = `/dashboard?company=${encodeURIComponent(company)}&team=${form.teamId}&employee=${emp.id}`;
      } else {
        const err = await res.json();
        setError(err.error || "등록에 실패했습니다.");
        setLoading(false);
      }
    };

    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-auth-gradient">
        <div className="w-full max-w-md bg-card/80 backdrop-blur-sm rounded-2xl shadow-xl border-0 p-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">인사정보 등록</h1>
          <p className="text-sm text-muted-foreground mb-6">기본 정보를 입력하면 바로 시작할 수 있습니다</p>
          {error && <div className="mb-4 p-3 bg-destructive-muted border border-destructive-border text-destructive-muted-foreground rounded-lg text-sm">{error}</div>}
          <form onSubmit={quickSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">소속 팀</label>
              <select value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })} className="flex h-10 w-full items-center rounded-lg border border-input bg-card px-3 py-2 text-sm font-medium text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[4px] focus-visible:ring-ring/15">
                <option value="">선택</option>
                {[...new Set(teams.map(t => t.location.company))].map(company => (
                  <optgroup key={company} label={company}>
                    {teams.filter(t => t.location.company === company).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">직급</label>
                <select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="flex h-10 w-full items-center rounded-lg border border-input bg-card px-3 py-2 text-sm font-medium text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[4px] focus-visible:ring-ring/15">
                  <option value="">선택</option>
                  {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">직책</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="flex h-10 w-full items-center rounded-lg border border-input bg-card px-3 py-2 text-sm font-medium text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[4px] focus-visible:ring-ring/15">
                  <option value="">선택</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">입사일</label>
              <input type="text" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} placeholder="2024.03.01" className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[4px] focus-visible:ring-ring/15" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-foreground">담당 업무</label>
                {quickTasks.length < 5 && <button type="button" className="text-xs text-primary font-medium" onClick={() => setQuickTasks([...quickTasks, ""])}>+ 추가</button>}
              </div>
              <div className="space-y-2">
                {quickTasks.map((t, i) => (
                  <div key={i} className="flex gap-1.5 items-center">
                    <input value={t} onChange={(e) => { const n = [...quickTasks]; n[i] = e.target.value; setQuickTasks(n); }} placeholder={`업무 ${i + 1}`} className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[4px] focus-visible:ring-ring/15" />
                    {quickTasks.length > 1 && <button type="button" onClick={() => setQuickTasks(quickTasks.filter((_, j) => j !== i))} className="text-destructive/60 hover:text-destructive text-lg px-1">×</button>}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{quickTasks.length}/5</p>
            </div>
            <button type="submit" disabled={loading} className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-xs hover:bg-primary/90 transition disabled:opacity-50">
              {loading ? "등록 중..." : "등록하고 시작하기"}
            </button>
          </form>
          <button onClick={() => setStep("upload")} className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground transition">
            이력서 PDF로 등록하기
          </button>
        </div>
      </div>
    );
  }

  const readOnly = isEdit && !editing;
  const inputCls = readOnly
    ? "w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
    : "w-full border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:border-primary outline-none";
  const selectCls = readOnly
    ? "w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none appearance-none"
    : "w-full border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:border-primary outline-none";
  const labelCls = "block text-sm font-medium text-foreground/70 mb-1";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background"><div className="max-w-3xl mx-auto pb-12 px-4 pt-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-foreground">
          {isEdit ? "내 인사정보" : "인사정보 등록"}
        </h1>
        {isEdit && editing && (
          <button
            type="button"
            onClick={() => setStep("upload")}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            이력서 재업로드
          </button>
        )}
      </div>

      {success && (
        <div className="mb-4 p-4 bg-success-muted border border-success-border text-success-muted-foreground rounded-lg">
          {isEdit ? "인사정보가 수정되었습니다." : "인사정보가 등록되었습니다."}
        </div>
      )}
      {error && (
        <div className="mb-4 p-4 bg-destructive-muted border border-destructive-border text-destructive-muted-foreground rounded-lg">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── 기본 정보 ── */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6 space-y-4">
          <h2 className="text-lg font-bold text-foreground">기본 정보</h2>

          {/* 프로필 사진 */}
          <div className="flex items-center gap-5">
            <div className="relative group">
              {photoUrl ? (
                <img src={photoUrl} alt="프로필" className="w-20 h-20 rounded-full object-cover ring-2 ring-border" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center ring-2 ring-border">
                  <svg className="w-8 h-8 text-border" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
              )}
              {!readOnly && photoUrl && (
                <button
                  type="button"
                  onClick={() => setPhotoUrl(null)}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                >
                  ×
                </button>
              )}
            </div>
            {!readOnly && (
            <div>
              <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium text-foreground/70 cursor-pointer transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
                {photoUploading ? "업로드 중..." : "사진 등록"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setPhotoUploading(true);
                    const fd = new FormData();
                    fd.append("file", file);
                    try {
                      const res = await fetch("/api/upload/photo", { method: "POST", body: fd });
                      if (res.ok) {
                        const { url } = await res.json();
                        setPhotoUrl(url);
                      } else {
                        const err = await res.json().catch(() => ({ error: "업로드 실패" }));
                        alert(err.error || "사진 업로드에 실패했습니다.");
                      }
                    } catch {
                      alert("사진 업로드 중 오류가 발생했습니다.");
                    }
                    setPhotoUploading(false);
                    e.target.value = "";
                  }}
                />
              </label>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP (5MB 이하)</p>
            </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>이름 *</label>
              <input type="text" required readOnly={readOnly} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>영어 이름</label>
              <input type="text" readOnly={readOnly} value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} className={inputCls} placeholder="예: Gildong Hong" />
            </div>
            <div>
              <label className={labelCls}>이메일 *</label>
              <input type="email" required readOnly={readOnly} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>개인 연락처</label>
              <input type="tel" readOnly={readOnly} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="010-1234-5678" />
            </div>
            <div>
              <label className={labelCls}>회사 번호</label>
              <input type="tel" readOnly={readOnly} value={form.phoneWork} onChange={(e) => setForm({ ...form, phoneWork: e.target.value })} className={inputCls} placeholder="02-1234-5678" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>생년월일</label>
              <input type="text" readOnly={readOnly} value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} className={inputCls} placeholder="YYYY-MM-DD" />
            </div>
          </div>

          <div>
            <label className={labelCls}>주소</label>
            <input type="text" readOnly={readOnly} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>직종</label>
              <input type="text" readOnly={readOnly} value={form.jobCategory} onChange={(e) => setForm({ ...form, jobCategory: e.target.value })} className={inputCls} placeholder="예: 건축" />
            </div>
            <div>
              <label className={labelCls}>직무</label>
              <input type="text" readOnly={readOnly} value={form.jobRole} onChange={(e) => setForm({ ...form, jobRole: e.target.value })} className={inputCls} placeholder="예: 공사관리" />
            </div>
            <div>
              <label className={labelCls}>직원구분</label>
              <input type="text" readOnly={readOnly} value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })} className={inputCls} placeholder="예: 일반직" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>입사경위</label>
              <input type="text" readOnly={readOnly} value={form.entryType} onChange={(e) => setForm({ ...form, entryType: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>특기</label>
              <input type="text" readOnly={readOnly} value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>취미</label>
              <input type="text" readOnly={readOnly} value={form.hobby} onChange={(e) => setForm({ ...form, hobby: e.target.value })} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>스킬</label>
            {readOnly ? (
              <div className="flex flex-wrap gap-2">
                {(form.skills || "").split(",").filter((s: string) => s.trim()).map((s: string, i: number) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-muted text-sm text-foreground/70">{s.trim()}</span>
                ))}
                {!form.skills && <span className="text-sm text-muted-foreground">-</span>}
              </div>
            ) : (
              <>
                <input type="text" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} className={inputCls} placeholder="콤마(,)로 구분하여 입력 (예: Excel, AutoCAD, BIM)" />
                <p className="text-xs text-muted-foreground mt-1">보유 스킬을 콤마(,)로 구분하여 입력하세요</p>
              </>
            )}
          </div>
        </div>

        {/* ── 소속/직급/직책 ── */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6 space-y-4">
          <h2 className="text-lg font-bold text-foreground">소속 · 직급 · 직책</h2>

          <div>
            <label className={labelCls}>소속 팀 *</label>
            {readOnly ? (
              <input type="text" readOnly value={teams.find((t) => String(t.id) === form.teamId) ? `[${teams.find((t) => String(t.id) === form.teamId)!.location.type === "HQ" ? "본사" : teams.find((t) => String(t.id) === form.teamId)!.location.name}] ${teams.find((t) => String(t.id) === form.teamId)!.name}` : ""} className={inputCls} />
            ) : (
            <select required value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })} className={selectCls}>
              <option value="">팀을 선택하세요</option>
              {companies.map((company) => {
                const cTeams = teams.filter((t) => t.location.company === company);
                const hq = cTeams.filter((t) => t.location.type === "HQ");
                const site = cTeams.filter((t) => t.location.type === "SITE");
                return (
                  <optgroup key={company} label={company}>
                    {hq.map((t) => (<option key={t.id} value={t.id}>[본사] {t.name}</option>))}
                    {site.map((t) => (<option key={t.id} value={t.id}>[{t.location.name}] {t.name}</option>))}
                  </optgroup>
                );
              })}
            </select>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>직급 *</label>
              {readOnly ? (
                <input type="text" readOnly value={form.position} className={inputCls} />
              ) : (
              <select required value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className={selectCls}>
                <option value="">선택</option>
                {POSITIONS.map((p) => (<option key={p} value={p}>{p}</option>))}
              </select>
              )}
            </div>
            <div>
              <label className={labelCls}>직책 *</label>
              {readOnly ? (
                <input type="text" readOnly value={form.role} className={inputCls} />
              ) : (
              <select required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={selectCls}>
                <option value="">선택</option>
                {ROLES.map((r) => (<option key={r} value={r}>{r}</option>))}
              </select>
              )}
            </div>
            <div>
              <label className={labelCls}>입사일</label>
              <input type={readOnly ? "text" : "date"} readOnly={readOnly} value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>상세 업무 (최대 3개)</label>
            {readOnly ? (
              <ul className="space-y-2">
                {(form.taskDetail || "").split("\n").filter(Boolean).slice(0, 3).map((line: string, i: number) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-foreground">
                    <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    {line}
                  </li>
                ))}
                {!form.taskDetail && <span className="text-sm text-muted-foreground">-</span>}
              </ul>
            ) : (
              <div className="space-y-2">
                {[0, 1, 2].map((idx) => {
                  const lines = (form.taskDetail || "").split("\n");
                  return (
                    <div key={idx} className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      <input
                        type="text"
                        value={lines[idx] || ""}
                        onChange={(e) => {
                          const newLines = [...lines];
                          while (newLines.length <= idx) newLines.push("");
                          newLines[idx] = e.target.value;
                          setForm({ ...form, taskDetail: newLines.filter((l, i) => i < 3).join("\n") });
                        }}
                        placeholder={`업무 ${idx + 1}`}
                        className={inputCls}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── 학력 ── */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <EditableSection
            title="학력"
            items={education}
            setItems={setEducation}
            emptyItem={emptyEducation}
            readOnly={readOnly}
            fields={[
              { key: "school_name", label: "학교명" },
              { key: "major", label: "전공" },
              { key: "degree", label: "학위" },
              { key: "startDate", label: "입학일", type: "date" },
              { key: "endDate", label: "졸업일", type: "date" },
            ]}
          />
        </div>

        {/* ── 자격증 ── */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <EditableSection
            title="자격증 · 면허"
            items={certifications}
            setItems={setCertifications}
            emptyItem={emptyCertification}
            readOnly={readOnly}
            fields={[
              { key: "name", label: "자격면허명" },
              { key: "acquisition_date", label: "취득일", type: "date" },
              { key: "issuer", label: "발급기관" },
              { key: "license_number", label: "면허번호" },
            ]}
          />
        </div>

        {/* ── 경력 ── */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <EditableSection
            title="경력사항"
            items={experience}
            setItems={setExperience}
            emptyItem={emptyExperience}
            readOnly={readOnly}
            fields={[
              { key: "company", label: "회사명" },
              { key: "position", label: "직위" },
              { key: "task", label: "담당업무" },
              { key: "startDate", label: "입사일", type: "date" },
              { key: "endDate", label: "퇴직일", type: "date" },
              { key: "description", label: "상세 업무 / 프로젝트", type: "textarea" },
            ]}
          />
        </div>

        {/* ── 가족관계 ── */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <EditableSection
            title="가족관계"
            items={familyRelations}
            setItems={setFamilyRelations}
            emptyItem={emptyFamily}
            readOnly={readOnly}
            fields={[
              { key: "relation", label: "관계" },
              { key: "name", label: "성명" },
              { key: "birth_date", label: "생년월일" },
              { key: "occupation", label: "직업" },
            ]}
          />
        </div>

        {/* ── 현재 발령 (자동) ── */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <h3 className="text-sm font-bold text-foreground/70 mb-3">현재 발령</h3>
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-xs text-muted-foreground">소속부서</span><p className="font-medium text-foreground">{teams.find((t) => String(t.id) === form.teamId)?.name || "—"}</p></div>
              <div><span className="text-xs text-muted-foreground">직위</span><p className="font-medium text-foreground">{form.position || "—"}</p></div>
              <div><span className="text-xs text-muted-foreground">직책</span><p className="font-medium text-foreground">{form.role || "—"}</p></div>
              <div><span className="text-xs text-muted-foreground">입사일</span><p className="font-medium text-foreground">{form.joinDate || "—"}</p></div>
            </div>
          </div>
        </div>

        {/* ── 이전 발령사항 ── */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <EditableSection
            title="이전 발령사항"
            items={appointmentHistory.slice(1)}
            setItems={(prev) => setAppointmentHistory([appointmentHistory[0], ...prev].filter(Boolean))}
            emptyItem={emptyAppointment}
            readOnly={readOnly}
            fields={[
              { key: "date", label: "발령일자", type: "date" },
              { key: "type", label: "발령구분" },
              { key: "position", label: "직위" },
              { key: "department", label: "소속부서" },
              { key: "duty", label: "직책" },
              { key: "job_role", label: "직무" },
              { key: "description", label: "담당 업무 / 프로젝트", type: "textarea" },
            ]}
          />
        </div>

        {/* ── 이력서 ── */}
        {resumePath && (
          <div className="flex items-center gap-2 text-sm text-success-muted-foreground bg-success-muted rounded-lg px-4 py-3">
            📄 이력서 첨부됨
            <button type="button" onClick={() => setShowPdf(true)} className="text-primary hover:underline">보기</button>
          </div>
        )}
        {showPdf && resumePath && (
          <PdfModal src={resumePath} onClose={() => setShowPdf(false)} />
        )}

      </form>

      {/* ── 우측 하단 고정 버튼 ── */}
      {isEdit && !editing && user?.role !== "EXECUTIVE" && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="fixed bottom-8 right-8 flex items-center gap-2 px-5 py-3 bg-primary/50 text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition font-medium z-50"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
          수정
        </button>
      )}
      {editing && (
        <button
          type="button"
          onClick={(e) => {
            const form = (e.target as HTMLElement).closest("div")?.querySelector("form");
            if (form) form.requestSubmit();
          }}
          disabled={loading}
          className="fixed bottom-8 right-8 flex items-center gap-2 px-5 py-3 bg-success text-success-foreground rounded-full shadow-lg hover:bg-success/90 transition font-medium disabled:opacity-50 z-50"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          {loading ? "처리 중..." : "저장"}
        </button>
      )}
      {!isEdit && (
        <button
          type="button"
          onClick={(e) => {
            const form = (e.target as HTMLElement).closest("div")?.querySelector("form");
            if (form) form.requestSubmit();
          }}
          disabled={loading}
          className="fixed bottom-8 right-8 flex items-center gap-2 px-5 py-3 bg-primary/50 text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition font-medium disabled:opacity-50 z-50"
        >
          {loading ? "처리 중..." : "등록하기"}
        </button>
      )}
    </div></div>
  );
}
