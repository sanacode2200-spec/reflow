"use client";

import { useEffect, useRef } from "react";

export type ContextMenuItem = {
  label: string;
  onClick: () => void;
  danger?: boolean;
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
      className="min-w-[160px] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-xl"
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className={`flex w-full items-center px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 ${
            item.danger ? "text-red-600 hover:bg-red-50" : "text-gray-700"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
