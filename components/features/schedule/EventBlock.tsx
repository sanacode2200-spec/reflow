"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import type { Patient, ScheduleInstance, Staff } from "@/lib/types";
import { durationToPx, timeToTopPx } from "@/lib/grid";

const OCCUPATION_STYLE: Record<string, string> = {
  pt: "bg-sky-500 border-sky-600 text-white",
  ot: "bg-emerald-500 border-emerald-600 text-white",
  st: "bg-violet-500 border-violet-600 text-white",
};

type Props = {
  instance: ScheduleInstance;
  patient: Patient | undefined;
  staff: Staff | undefined;
  onClick: (instance: ScheduleInstance) => void;
};

export default function EventBlock({ instance, patient, staff, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: instance.id,
    data: { instance },
  });

  const top = timeToTopPx(instance.start_at);
  const height = durationToPx(instance.start_at, instance.end_at);
  const colorCls =
    OCCUPATION_STYLE[staff?.occupation ?? ""] ?? "bg-gray-400 border-gray-500 text-white";

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={{ top, height, position: "absolute", left: 2, right: 2 }}
        className="rounded border border-dashed border-gray-300 bg-gray-100/60"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        top,
        height,
        position: "absolute",
        left: 2,
        right: 2,
        transform: transform ? CSS.Transform.toString(transform) : undefined,
        touchAction: "none",
      }}
      className={`z-10 cursor-grab overflow-hidden rounded border text-xs select-none ${colorCls}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick(instance);
      }}
      {...listeners}
      {...attributes}
    >
      <div className="truncate px-1 pt-0.5 leading-tight font-semibold">{patient?.name ?? "—"}</div>
      {height >= 32 && (
        <div className="px-1 text-[10px] leading-tight opacity-80">
          {format(instance.start_at, "HH:mm")}–{format(instance.end_at, "HH:mm")}
        </div>
      )}
      {instance.is_recurring && (
        <div
          className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-yellow-300"
          title="繰り返し予約"
        />
      )}
    </div>
  );
}
