"use client";

import { useState } from "react";
import PdfModal from "@/components/PdfModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

const POSITION_VARIANTS: Record<string, "brand" | "success" | "warning" | "orange" | "gray"> = {
  부장: "brand",
  차장: "brand",
  과장: "success",
  대리: "warning",
  주임: "orange",
  사원: "gray",
};

export default function EmployeeCard({
  employee,
  isLeader,
}: {
  employee: Employee & { resumePath?: string | null };
  isLeader: boolean;
}) {
  const badgeVariant = POSITION_VARIANTS[employee.position] || "gray";

  return (
    <Card className={`transition-all duration-300 hover:shadow-lg group ${isLeader ? "ring-2 ring-orange-border shadow-md" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3.5">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0 ${
            isLeader
              ? "bg-orange-muted text-orange-muted-foreground shadow-sm ring-1 ring-orange-border"
              : "bg-gradient-to-br from-muted to-muted/80 text-muted-foreground"
          }`}>
            {employee.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-bold leading-tight truncate">{employee.name}</CardTitle>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Badge variant={badgeVariant} size="sm">
                {employee.position}
              </Badge>
              {isLeader && (
                <Badge variant="orange" size="sm">
                  {employee.role}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <span className="truncate text-foreground/80">{employee.email}</span>
          </div>
          {employee.phone && (
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span className="text-foreground/80">{employee.phone}</span>
            </div>
          )}
          {employee.joinDate && (
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span className="text-foreground/80">{employee.joinDate}</span>
            </div>
          )}
        </div>
        {employee.resumePath && (
          <ResumeButton src={employee.resumePath} />
        )}
      </CardContent>
    </Card>
  );
}

function ResumeButton({ src }: { src: string }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <button
        onClick={() => setShow(true)}
        className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-semibold transition-all duration-200 group/resume"
      >
        <svg className="w-4 h-4 group-hover/resume:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        이력서 보기
      </button>
      {show && <PdfModal src={src} onClose={() => setShow(false)} />}
    </>
  );
}
