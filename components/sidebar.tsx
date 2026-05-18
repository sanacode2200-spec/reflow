"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Users, ClipboardList, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "ダッシュボード", icon: CalendarDays },
  { href: "/patients", label: "患者", icon: Users },
  { href: "/schedule", label: "スケジュール", icon: CalendarDays },
  { href: "/records", label: "実施記録", icon: ClipboardList },
  { href: "/settings/staffs", label: "スタッフ管理", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed top-0 left-0 z-40 hidden h-full w-[220px] flex-col border-r border-[#eaeaea] bg-white md:flex">
      <div className="border-b border-[#eaeaea] px-6 py-5">
        <span className="text-lg font-bold tracking-tight text-[#111]">ReFlow</span>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === href
                ? "bg-[#f5f5f5] text-[#111]"
                : "text-[#888] hover:bg-[#fafafa] hover:text-[#111]"
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
