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
  { href: "/patients", label: "患者一覧", icon: Users },
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
      <aside className="fixed top-0 left-0 z-40 hidden h-full w-[220px] flex-col md:flex">
        {/* Logo */}
        <div className="px-5 py-6">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{
                background: "linear-gradient(135deg, #6366f1, #ec4899)",
                boxShadow: "0 8px 18px rgba(99,102,241,0.35)",
              }}
            >
              R
            </div>
            <span className="text-lg font-bold tracking-tight text-[#1d1f2b]">ReFlow</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-white/80 text-[#1d1f2b] shadow-[0_6px_18px_rgba(20,24,60,0.06),0_0_0_1px_rgba(20,24,60,0.04)]"
                    : "text-[#8a8fa3] hover:bg-white/50 hover:text-[#1d1f2b]"
                )}
              >
                <Icon size={16} className={active ? "text-[#6366f1]" : "text-[#8a8fa3]"} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User menu */}
        <div className="relative px-3 py-3">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-sm transition-all duration-150 hover:bg-white/50"
          >
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ background: "linear-gradient(135deg, #6366f1, #ec4899)" }}
            >
              {staffName.charAt(0)}
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs leading-tight font-medium text-[#1d1f2b]">{staffName}</p>
              {staffCode && <p className="text-[10px] text-[#8a8fa3]">ID: {staffCode}</p>}
            </div>
            <ChevronUp
              size={14}
              className={cn(
                "text-[#8a8fa3] transition-transform",
                menuOpen ? "rotate-0" : "rotate-180"
              )}
            />
          </button>

          {menuOpen && (
            <div
              className="absolute right-3 bottom-full left-3 mb-1 overflow-hidden rounded-2xl border border-[rgba(20,24,60,0.06)] bg-white/90 py-1 shadow-[0_10px_30px_rgba(20,24,60,0.10)]"
              style={{ backdropFilter: "blur(10px)" }}
            >
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setChangePasswordOpen(true);
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#8a8fa3] transition-colors hover:bg-[#6366f1]/8 hover:text-[#1d1f2b]"
              >
                <KeyRound size={14} />
                パスワード変更
              </button>
              <div className="my-1 border-t border-[rgba(20,24,60,0.06)]" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#8a8fa3] transition-colors hover:bg-[#6366f1]/8 hover:text-[#1d1f2b]"
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
