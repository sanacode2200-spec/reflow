"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Users, ClipboardList, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/patients", label: "患者", icon: Users },
  { href: "/schedule", label: "スケジュール", icon: CalendarDays },
  { href: "/records", label: "記録一覧", icon: ClipboardList },
  { href: "/settings/staffs", label: "設定", icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed right-0 bottom-0 left-0 z-40 border-t border-[rgba(20,24,60,0.06)] bg-white/80 md:hidden"
      style={{ backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
    >
      <div className="flex">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors",
              pathname === href ? "text-[#6366f1]" : "text-[#8a8fa3]"
            )}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
