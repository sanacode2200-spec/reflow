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
};

export default function DragLayer({ activeInstance, patient, staff }: Props) {
  if (!activeInstance) return <DragOverlay>{null}</DragOverlay>;

  const height = durationToPx(activeInstance.start_at, activeInstance.end_at);
  const colorCls = OCCUPATION_STYLE[staff?.occupation ?? ""] ?? "bg-gray-400 border-gray-500";

  return (
    <DragOverlay dropAnimation={null}>
      <div
        style={{ width: 76, height }}
        className={`cursor-grabbing overflow-hidden rounded border text-xs text-white opacity-90 shadow-xl select-none ${colorCls}`}
      >
        <div className="truncate px-1 pt-0.5 leading-tight font-semibold">
          {patient?.name ?? "—"}
        </div>
        {height >= 32 && (
          <div className="px-1 text-[10px] leading-tight opacity-80">
            {format(activeInstance.start_at, "HH:mm")}–{format(activeInstance.end_at, "HH:mm")}
          </div>
        )}
      </div>
    </DragOverlay>
  );
}
