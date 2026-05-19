"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  ClipboardList,
  Settings,
  LogOut,
  KeyRound,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import ChangePasswordModal from "@/components/change-password-modal";

const navItems = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/patients", label: "患者", icon: Users },
  { href: "/schedule", label: "スケジュール", icon: CalendarDays },
  { href: "/records", label: "実施記録", icon: ClipboardList },
  { href: "/settings/staffs", label: "スタッフ管理", icon: Settings },
];

type Props = {
  staffName: string;
  staffCode: string | null;
};

export default function Sidebar({ staffName, staffCode }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
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

        {/* User menu */}
        <div className="relative border-t border-[#eaeaea] px-3 py-3">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[#fafafa]"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#111] text-xs font-bold text-white">
              {staffName.charAt(0)}
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs leading-tight font-medium text-[#111]">{staffName}</p>
              {staffCode && <p className="text-[10px] text-[#888]">ID: {staffCode}</p>}
            </div>
            <ChevronUp
              size={14}
              className={cn(
                "text-[#888] transition-transform",
                menuOpen ? "rotate-0" : "rotate-180"
              )}
            />
          </button>

          {menuOpen && (
            <div className="absolute right-3 bottom-full left-3 mb-1 rounded-lg border border-[#eaeaea] bg-white py-1 shadow-md">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setChangePasswordOpen(true);
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#888] transition-colors hover:bg-[#fafafa] hover:text-[#111]"
              >
                <KeyRound size={14} />
                パスワード変更
              </button>
              <div className="my-1 border-t border-[#eaeaea]" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#888] transition-colors hover:bg-[#fafafa] hover:text-[#111]"
              >
                <LogOut size={14} />
                ログアウト
              </button>
            </div>
          )}
        </div>
      </aside>

      <ChangePasswordModal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
    </>
  );
}
