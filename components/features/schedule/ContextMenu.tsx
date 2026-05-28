"use client";

import { useEffect, useRef } from "react";

export type ContextMenuItem = {
  label: string;
  onClick: () => void;
  danger?: boolean;
  icon?: React.ReactNode;
  separator?: boolean;
};

type Props = {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
};

export default function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const adjustedX = Math.min(x, (typeof window !== "undefined" ? window.innerWidth : 1280) - 180);
  const adjustedY = Math.min(
    y,
    (typeof window !== "undefined" ? window.innerHeight : 900) - items.length * 40 - 12
  );

  return (
    <div
      ref={ref}
      style={{ position: "fixed", left: adjustedX, top: adjustedY, zIndex: 200 }}
      className="border-border bg-popover text-popover-foreground min-w-[160px] overflow-hidden rounded-lg border py-1 shadow-xl"
    >
      {items.map((item, i) => (
        <div key={i}>
          {item.separator && i > 0 && <div className="border-border my-1 border-t" />}
          <button
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={`hover:bg-muted flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
              item.danger ? "text-destructive hover:bg-destructive/10" : "text-popover-foreground"
            }`}
          >
            {item.icon && (
              <span className="flex h-4 w-4 shrink-0 items-center justify-center opacity-60">
                {item.icon}
              </span>
            )}
            {item.label}
          </button>
        </div>
      ))}
    </div>
  );
}
