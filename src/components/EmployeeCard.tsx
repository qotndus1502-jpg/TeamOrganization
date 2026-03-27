"use client";

import { useState } from "react";
import PdfModal from "@/components/PdfModal";

interface Employee {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  position: string;
  role: string;
  joinDate: string | null;
  resumePath: string | null;
}

const POSITION_COLORS: Record<string, string> = {
  부장: "bg-purple-100 text-purple-800",
  차장: "bg-blue-100 text-orange-700",
  과장: "bg-green-100 text-green-800",
  대리: "bg-yellow-100 text-yellow-800",
  사원: "bg-gray-100 text-gray-800",
};

export default function EmployeeCard({
  employee,
  isLeader,
}: {
  employee: Employee & { resumePath?: string | null };
  isLeader: boolean;
}) {
  const colorClass = POSITION_COLORS[employee.position] || "bg-gray-100 text-gray-800";

  return (
    <div
      className={`bg-white rounded-xl border-2 p-5 transition hover:shadow-md ${
        isLeader ? "border-orange-400 shadow-sm" : "border-gray-200"
      }`}
    >
      {/* 헤더: 이름 + 배지 */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-600">
          {employee.name.charAt(0)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 text-lg">{employee.name}</span>
            {isLeader && (
              <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">
                {employee.role}
              </span>
            )}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${colorClass}`}>
            {employee.position}
          </span>
        </div>
      </div>

      {/* 상세 정보 */}
      <div className="space-y-1 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">📧</span>
          <span>{employee.email}</span>
        </div>
        {employee.phone && (
          <div className="flex items-center gap-2">
            <span className="text-gray-400">📱</span>
            <span>{employee.phone}</span>
          </div>
        )}
        {employee.joinDate && (
          <div className="flex items-center gap-2">
            <span className="text-gray-400">📅</span>
            <span>입사일: {employee.joinDate}</span>
          </div>
        )}
      </div>

      {/* 이력서 링크 */}
      {employee.resumePath && (
        <ResumeButton src={employee.resumePath} />
      )}
    </div>
  );
}

function ResumeButton({ src }: { src: string }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <button onClick={() => setShow(true)} className="mt-3 inline-block text-sm text-orange-500 hover:text-orange-700 font-medium">
        📄 이력서 보기
      </button>
      {show && <PdfModal src={src} onClose={() => setShow(false)} />}
    </>
  );
}
