"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "デフォルトテーマに切り替え" : "ダークテーマに切り替え"}
      onClick={() => setTheme(isDark ? "default" : "dark")}
      className={cn(
        "text-muted-foreground hover:bg-card hover:text-foreground flex size-8 items-center justify-center rounded-xl transition-colors",
        className
      )}
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
