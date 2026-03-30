"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export function AdminSidebarLink({
  href,
  children,
  badge,
}: {
  href: string;
  children: React.ReactNode;
  badge?: number;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname?.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
        isActive
          ? "bg-primary/10 text-primary border border-primary/15"
          : "text-foreground/60 hover:bg-muted hover:text-foreground border border-transparent"
      }`}
    >
      <div className="flex items-center gap-3">
        {children}
      </div>
      {badge !== undefined && (
        <Badge variant="error" className="h-5 min-w-5 flex items-center justify-center p-0 px-1.5 text-[10px]">
          {badge}
        </Badge>
      )}
    </Link>
  );
}
