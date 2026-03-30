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
  fields: { key: keyof T; label: string; width?: string; type?: "text" | "textarea" }[];
  emptyItem: () => T;
  readOnly?: boolean;
}) {
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
        <h3 className="text-sm font-bold text-gray-700">{title}</h3>
        {!readOnly && (
          <button type="button" onClick={add} className="text-xs text-orange-500 hover:text-orange-700 font-medium">
            + 추가
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">항목이 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-start bg-gray-50 rounded-lg p-3">
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {fields.filter((f) => f.type !== "textarea").map((f) => readOnly ? (
                    <div key={String(f.key)} className={`px-2 py-1.5 text-gray-900 ${String(f.key) === "school_name" ? "text-xl font-bold col-span-2" : "text-sm"}`}>
                      {String(f.key) !== "school_name" && <span className="text-xs text-gray-400">{f.label}: </span>}
                      {item[f.key] || "-"}
                    </div>
                  ) : (
                    <input
                      key={String(f.key)}
                      type="text"
                      value={item[f.key] || ""}
                      onChange={(e) => update(idx, f.key, e.target.value)}
                      placeholder={f.label}
                      className={`border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-1 focus:ring-orange-400 outline-none ${f.width || ""}`}
                    />
                  ))}
                </div>
                {fields.filter((f) => f.type === "textarea").map((f) => readOnly ? (
                  <div key={String(f.key)} className="py-1">
                    <ul className="space-y-1.5">
                      {(item[f.key] || "").split("\n").filter(Boolean).slice(0, 5).map((line: string, j: number) => (
                        <li key={j} className="flex items-center gap-2 text-sm text-gray-900">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                          {line}
                        </li>
                      ))}
                      {!item[f.key] && <span className="text-sm text-gray-400">-</span>}
                    </ul>
                  </div>
                ) : (
                  <div key={String(f.key)} className="space-y-1.5">
                    {[0, 1, 2, 3, 4].map((j) => {
                      const lines = (item[f.key] || "").split("\n");
                      return (
                        <div key={j} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
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
                            className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-1 focus:ring-orange-400 outline-none"
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              {!readOnly && (
                <button type="button" onClick={() => remove(idx)} className="text-red-400 hover:text-red-600 text-xs mt-1 flex-shrink-0">
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

  const [step, setStep] = useState<"upload" | "form">("upload");

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
      if (data.role === "EXECUTIVE" && !data.hasEmployee) {
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
            const splitP = (item: Record<string, string>) => {
              if (item.startDate || item.endDate) return item;
              if (item.period) { const p = item.period.split(/[~\-–—]/).map((s: string) => s.trim()); return { ...item, startDate: p[0] || "", endDate: p[1] || "" }; }
              return item;
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

    // period → startDate/endDate 호환 변환
    const splitPeriod = (item: Record<string, string>) => {
      if (item.startDate || item.endDate) return item;
      if (item.period) {
        const parts = item.period.split(/[~\-–—]/).map((s: string) => s.trim());
        return { ...item, startDate: parts[0] || "", endDate: parts[1] || "" };
      }
      return item;
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

  const handleSkip = () => setStep("form");
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
      alert(isEdit ? "수정이 완료되었습니다." : "등록이 완료되었습니다.");
      router.push("/profile");
      return;
    } else {
      const err = await res.json();
      setError(err.error || "등록에 실패했습니다.");
    }
    setLoading(false);
  };

  if (!user) return null;
  if (step === "upload") return <PdfDropzone onExtracted={handleExtracted} onSkip={handleSkip} />;

  const readOnly = isEdit && !editing;
  const inputCls = readOnly
    ? "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none"
    : "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none";
  const selectCls = readOnly
    ? "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none appearance-none"
    : "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F5F5F0]"><div className="max-w-3xl mx-auto pb-12 px-4 pt-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? "내 인사정보" : "인사정보 등록"}
        </h1>
        {isEdit && editing && (
          <button
            type="button"
            onClick={() => setStep("upload")}
            className="flex items-center gap-1.5 text-sm text-orange-500 hover:text-orange-700 font-medium transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            이력서 재업로드
          </button>
        )}
      </div>

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
          {isEdit ? "인사정보가 수정되었습니다." : "인사정보가 등록되었습니다."}
        </div>
      )}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── 기본 정보 ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">기본 정보</h2>

          {/* 프로필 사진 */}
          <div className="flex items-center gap-5">
            <div className="relative group">
              {photoUrl ? (
                <img src={photoUrl} alt="프로필" className="w-20 h-20 rounded-full object-cover ring-2 ring-gray-200" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center ring-2 ring-gray-200">
                  <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
              )}
              {!readOnly && photoUrl && (
                <button
                  type="button"
                  onClick={() => setPhotoUrl(null)}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                >
                  ×
                </button>
              )}
            </div>
            {!readOnly && (
            <div>
              <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 cursor-pointer transition">
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
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP (5MB 이하)</p>
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
                  <span key={i} className="px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700">{s.trim()}</span>
                ))}
                {!form.skills && <span className="text-sm text-gray-400">-</span>}
              </div>
            ) : (
              <>
                <input type="text" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} className={inputCls} placeholder="콤마(,)로 구분하여 입력 (예: Excel, AutoCAD, BIM)" />
                <p className="text-xs text-gray-400 mt-1">보유 스킬을 콤마(,)로 구분하여 입력하세요</p>
              </>
            )}
          </div>
        </div>

        {/* ── 소속/직급/직책 ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">소속 · 직급 · 직책</h2>

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
                  <li key={i} className="flex items-center gap-2.5 text-sm text-gray-900">
                    <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                    {line}
                  </li>
                ))}
                {!form.taskDetail && <span className="text-sm text-gray-400">-</span>}
              </ul>
            ) : (
              <div className="space-y-2">
                {[0, 1, 2].map((idx) => {
                  const lines = (form.taskDetail || "").split("\n");
                  return (
                    <div key={idx} className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
              { key: "startDate", label: "입학일" },
              { key: "endDate", label: "졸업일" },
            ]}
          />
        </div>

        {/* ── 자격증 ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <EditableSection
            title="자격증 · 면허"
            items={certifications}
            setItems={setCertifications}
            emptyItem={emptyCertification}
            readOnly={readOnly}
            fields={[
              { key: "name", label: "자격면허명" },
              { key: "acquisition_date", label: "취득일" },
              { key: "issuer", label: "발급기관" },
              { key: "license_number", label: "면허번호" },
            ]}
          />
        </div>

        {/* ── 경력 ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
              { key: "startDate", label: "입사일" },
              { key: "endDate", label: "퇴직일" },
              { key: "description", label: "상세 업무 / 프로젝트", type: "textarea" },
            ]}
          />
        </div>

        {/* ── 가족관계 ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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

        {/* ── 발령사항 ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <EditableSection
            title="발령사항"
            items={appointmentHistory}
            setItems={setAppointmentHistory}
            emptyItem={emptyAppointment}
            readOnly={readOnly}
            fields={[
              { key: "date", label: "발령일자" },
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
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-4 py-3">
            📄 이력서 첨부됨
            <button type="button" onClick={() => setShowPdf(true)} className="text-orange-500 hover:underline">보기</button>
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
          className="fixed bottom-8 right-8 flex items-center gap-2 px-5 py-3 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600 transition font-medium z-50"
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
          className="fixed bottom-8 right-8 flex items-center gap-2 px-5 py-3 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition font-medium disabled:bg-gray-400 z-50"
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
          className="fixed bottom-8 right-8 flex items-center gap-2 px-5 py-3 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600 transition font-medium disabled:bg-gray-400 z-50"
        >
          {loading ? "처리 중..." : "등록하기"}
        </button>
      )}
    </div></div>
  );
}
