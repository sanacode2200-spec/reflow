"use client";

import { useRef, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import type { Patient, ScheduleInstance, Staff } from "@/lib/types";
import { durationToPx, timeToTopPx } from "@/lib/grid";

const OCCUPATION_ACCENT: Record<string, string> = {
  pt: "#8b5cf6",
  ot: "#14b8a6",
  st: "#e879f9",
};

function getStatusStyle(
  instance: ScheduleInstance,
  occupation?: string
): { bg: string; text: string; accent: string } {
  const accent = OCCUPATION_ACCENT[occupation ?? ""] ?? "#64748b";
  if (instance.is_cancelled) {
    return { bg: "bg-gray-100", text: "text-gray-400", accent: "#9ca3af" };
  }
  switch (instance.session_status) {
    case "completed":
      return { bg: "bg-green-50", text: "text-green-800", accent };
    case "draft":
      return { bg: "bg-orange-50", text: "text-orange-800", accent };
    default:
      return { bg: "bg-white", text: "text-slate-700", accent };
  }
}

function statusLabel(instance: ScheduleInstance): string {
  if (instance.is_cancelled) return "中止";
  switch (instance.session_status) {
    case "completed":
      return "実施済";
    case "draft":
      return "一時保存";
    default:
      return "予約";
  }
}

function statusBadgeStyle(instance: ScheduleInstance): string {
  if (instance.is_cancelled) return "bg-gray-300 text-gray-600";
  switch (instance.session_status) {
    case "completed":
      return "bg-emerald-100 text-emerald-800";
    case "draft":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

type Props = {
  instance: ScheduleInstance;
  patient: Patient | undefined;
  staff: Staff | undefined;
  slotMinutes: number;
  slotHeightPx: number;
  resizeEndMin?: number;
  onClick: (instance: ScheduleInstance) => void;
  onContextMenu?: (x: number, y: number, instance: ScheduleInstance) => void;
  onResizeStart?: (instance: ScheduleInstance, clientY: number, columnTop: number) => void;
};

export default function EventBlock({
  instance,
  patient,
  staff,
  slotMinutes,
  slotHeightPx,
  resizeEndMin,
  onClick,
  onContextMenu,
  onResizeStart,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: instance.id,
    data: { instance },
  });

  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const setRefs = (el: HTMLDivElement | null) => {
    setNodeRef(el);
    rootRef.current = el;
  };

  const top = timeToTopPx(instance.start_at, slotMinutes, slotHeightPx);

  let height: number;
  if (resizeEndMin !== undefined) {
    const startMinFromMidnight = instance.start_at.getHours() * 60 + instance.start_at.getMinutes();
    height = ((resizeEndMin - startMinFromMidnight) / slotMinutes) * slotHeightPx;
  } else {
    height = durationToPx(instance.start_at, instance.end_at, slotMinutes, slotHeightPx);
  }

  const { bg, text, accent } = getStatusStyle(instance, staff?.occupation);
  const handleHeight = Math.max(4, Math.min(8, Math.floor(height * 0.25)));

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const colEl = rootRef.current?.parentElement;
    const rect = colEl?.getBoundingClientRect();
    onResizeStart?.(instance, e.clientY, rect?.top ?? 0);
  };

  // 単位数（時間から計算）
  const durationMin = (instance.end_at.getTime() - instance.start_at.getTime()) / 60000;
  const units = instance.units ?? Math.round(durationMin / 20);

  if (isDragging) {
    return (
      <div
        ref={setRefs}
        style={{ top, height, position: "absolute", left: 2, right: 2 }}
        className="rounded border border-dashed border-gray-300 bg-gray-100/60"
      />
    );
  }

  return (
    <>
      <div
        ref={setRefs}
        data-event-block="true"
        style={{
          top,
          height,
          position: "absolute",
          left: 2,
          right: 2,
          borderLeft: `3px solid ${accent}`,
          borderRadius: 10,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          transform: transform ? CSS.Transform.toString(transform) : undefined,
          touchAction: "none",
          opacity: instance.is_cancelled ? 0.65 : 1,
        }}
        className={`z-10 cursor-grab overflow-hidden text-xs select-none ${bg} ${text}`}
        onClick={(e) => {
          e.stopPropagation();
          onClick(instance);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setTooltipPos(null);
          onContextMenu?.(e.clientX, e.clientY, instance);
        }}
        onMouseEnter={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
        onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setTooltipPos(null)}
        {...listeners}
        {...attributes}
      >
        <div
          className={`truncate px-1 pt-0.5 leading-tight font-semibold ${instance.is_cancelled ? "line-through" : ""}`}
        >
          {patient?.name ?? "—"}
        </div>
        {height >= 28 && (
          <div className="px-1 text-[10px] leading-tight opacity-55">
            {format(instance.start_at, "HH:mm")}–
            {resizeEndMin !== undefined
              ? `${String(Math.floor(resizeEndMin / 60)).padStart(2, "0")}:${String(resizeEndMin % 60).padStart(2, "0")}`
              : format(instance.end_at, "HH:mm")}
          </div>
        )}
        {instance.is_recurring && (
          <div
            className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-yellow-300"
            title="繰り返し予約"
          />
        )}
        {onResizeStart && height > 10 && (
          <div
            data-no-dnd="true"
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: handleHeight,
              cursor: "ns-resize",
            }}
            className="bg-white/20 hover:bg-white/40"
            onMouseDown={handleResizeMouseDown}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          />
        )}
      </div>

      {/* ホバーツールチップ */}
      {tooltipPos && !isDragging && (
        <div
          style={{
            position: "fixed",
            left: Math.min(tooltipPos.x + 14, window.innerWidth - 220),
            top: Math.min(tooltipPos.y - 8, window.innerHeight - 160),
            zIndex: 70,
            pointerEvents: "none",
          }}
          className="min-w-[180px] rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs shadow-lg"
        >
          <p className="mb-1 font-bold text-gray-900">{patient?.name ?? "—"}</p>
          <p className="text-gray-600">
            {format(instance.start_at, "HH:mm")} 〜 {format(instance.end_at, "HH:mm")}
          </p>
          {staff && (
            <p className="mt-0.5 text-gray-500">
              {staff.name}（{staff.occupation.toUpperCase()}）
            </p>
          )}
          <p className="text-gray-500">
            {units}単位 / {Math.round(durationMin)}分
          </p>
          {instance.comment && (
            <p className="mt-1 line-clamp-2 border-t border-gray-100 pt-1 text-gray-600">
              {instance.comment}
            </p>
          )}
          <span
            className={`mt-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${statusBadgeStyle(instance)}`}
          >
            {statusLabel(instance)}
          </span>
        </div>
      )}
    </>
  );
}
