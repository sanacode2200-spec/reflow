"use client";

import { DragOverlay } from "@dnd-kit/core";
import { format } from "date-fns";
import type { Patient, ScheduleInstance, Staff } from "@/lib/types";
import { durationToPx } from "@/lib/grid";

const OCCUPATION_STYLE: Record<string, string> = {
  pt: "bg-sky-500 border-sky-600",
  ot: "bg-emerald-500 border-emerald-600",
  st: "bg-violet-500 border-violet-600",
};

type Props = {
  activeInstance: ScheduleInstance | null;
  patient: Patient | undefined;
  staff: Staff | undefined;
  slotMinutes: number;
  slotHeightPx: number;
  targetStaff?: Staff;
  isValidTarget: boolean;
};

export default function DragLayer({
  activeInstance,
  patient,
  staff,
  slotMinutes,
  slotHeightPx,
  targetStaff,
  isValidTarget,
}: Props) {
  if (!activeInstance) return <DragOverlay>{null}</DragOverlay>;

  const height = durationToPx(
    activeInstance.start_at,
    activeInstance.end_at,
    slotMinutes,
    slotHeightPx
  );
  const colorCls = OCCUPATION_STYLE[staff?.occupation ?? ""] ?? "bg-gray-400 border-gray-500";

  const showGuide = targetStaff && targetStaff.id !== staff?.id;

  return (
    <DragOverlay dropAnimation={null}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <div
          style={{ width: 76, height, opacity: isValidTarget ? 0.9 : 0.5 }}
          className={`cursor-grabbing overflow-hidden rounded border text-xs text-white shadow-xl select-none ${colorCls}`}
        >
          <div className="truncate px-1 pt-0.5 leading-tight font-semibold">
            {patient?.name ?? "—"}
          </div>
          {height >= 28 && (
            <div className="px-1 text-[10px] leading-tight opacity-80">
              {format(activeInstance.start_at, "HH:mm")}–{format(activeInstance.end_at, "HH:mm")}
            </div>
          )}
        </div>
        {showGuide && (
          <div
            style={{ width: 76 }}
            className={`mt-1 rounded px-1.5 py-0.5 text-center text-[10px] font-medium shadow ${
              isValidTarget ? "bg-sky-100 text-sky-700" : "bg-red-100 text-red-600"
            }`}
          >
            {isValidTarget ? "→ " : "✕ "}
            {targetStaff.name.split(" ")[0]}
          </div>
        )}
      </div>
    </DragOverlay>
  );
}
