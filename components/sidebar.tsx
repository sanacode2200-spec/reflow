"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  ClipboardList,
  FileText,
  Settings,
  LogOut,
  KeyRound,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import ChangePasswordModal from "@/components/change-password-modal";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/patients", label: "患者一覧", icon: Users },
  { href: "/schedule", label: "スケジュール", icon: CalendarDays },
  { href: "/records", label: "実施記録一覧", icon: ClipboardList },
  { href: "/documents", label: "計画書管理", icon: FileText },
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
                background: "var(--brand-gradient)",
                boxShadow: "var(--brand-shadow)",
              }}
            >
              R
            </div>
            <span className="text-foreground text-lg font-bold tracking-tight">ReFlow</span>
            <ThemeToggle className="ml-auto" />
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-card text-foreground shadow-[0_6px_18px_rgba(20,24,60,0.06),0_0_0_1px_rgba(20,24,60,0.04)]"
                    : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
                )}
              >
                <Icon size={16} className={active ? "text-primary" : "text-muted-foreground"} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User menu */}
        <div className="relative px-3 py-3">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="hover:bg-card/60 flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-sm transition-all duration-150"
          >
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ background: "var(--brand-gradient)" }}
            >
              {staffName.charAt(0)}
            </div>
            <div className="flex-1 text-left">
              <p className="text-foreground text-xs leading-tight font-medium">{staffName}</p>
              {staffCode && <p className="text-muted-foreground text-[10px]">ID: {staffCode}</p>}
            </div>
            <ChevronUp
              size={14}
              className={cn(
                "text-muted-foreground transition-transform",
                menuOpen ? "rotate-0" : "rotate-180"
              )}
            />
          </button>

          {menuOpen && (
            <div
              className="border-border bg-popover/90 absolute right-3 bottom-full left-3 mb-1 overflow-hidden rounded-2xl border py-1 shadow-[0_10px_30px_rgba(20,24,60,0.10)]"
              style={{ backdropFilter: "blur(10px)" }}
            >
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setChangePasswordOpen(true);
                }}
                className="text-muted-foreground hover:bg-primary/10 hover:text-foreground flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors"
              >
                <KeyRound size={14} />
                パスワード変更
              </button>
              <div className="border-border my-1 border-t" />
              <button
                onClick={handleLogout}
                className="text-muted-foreground hover:bg-primary/10 hover:text-foreground flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors"
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
