"use client";

import { useEffect, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { format, isSameDay } from "date-fns";
import type { Patient, ScheduleInstance, Staff } from "@/lib/types";
import {
  GRID_END_HOUR,
  GRID_START_HOUR,
  getTotalHeightPx,
  getTotalSlots,
  getHourLabels,
  snapMinutesToSlot,
} from "@/lib/grid";
import EventBlock from "./EventBlock";

const DAY_NAMES_JP = ["月", "火", "水", "木", "金", "土"] as const;

const TIME_COL_W = 52;
const COL_W = 88;

const BUSINESS_START_MIN = 8 * 60 + 30;
const BUSINESS_END_MIN = 17 * 60;

const OCCUPATION_HEADER: Record<string, string> = {
  pt: "bg-sky-50 border-sky-200 text-sky-700",
  ot: "bg-emerald-50 border-emerald-200 text-emerald-700",
  st: "bg-violet-50 border-violet-200 text-violet-700",
};

type Selection = {
  dayIdx: number;
  staffId: string;
  startMin: number;
  endMin: number;
} | null;

type ResizingState = {
  instanceId: string;
  newEndMin: number;
} | null;

type DroppableColumnProps = {
  colId: string;
  children: React.ReactNode;
  height: number;
  isToday: boolean;
  slotMinutes: number;
  slotHeightPx: number;
  day: Date;
  staffId: string;
  staffOccupation: string;
  dayIdx: number;
  isFirstInDay: boolean;
  activeOccupation: string | null;
  selection: Selection;
  onSelectionStart: (dayIdx: number, staffId: string, startMin: number, columnTop: number) => void;
  onCellContextMenu: (
    x: number,
    y: number,
    dayIdx: number,
    staffId: string,
    clickedMin: number
  ) => void;
};

function DroppableColumn({
  colId,
  children,
  height,
  isToday,
  slotMinutes,
  slotHeightPx,
  staffId,
  staffOccupation,
  dayIdx,
  isFirstInDay,
  activeOccupation,
  selection,
  onSelectionStart,
  onCellContextMenu,
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: colId });
  const isInvalidTarget = activeOccupation !== null && staffOccupation !== activeOccupation;

  const offTopHeight = ((BUSINESS_START_MIN - GRID_START_HOUR * 60) / slotMinutes) * slotHeightPx;
  const offBottomTopPx = ((BUSINESS_END_MIN - GRID_START_HOUR * 60) / slotMinutes) * slotHeightPx;

  const selActive = selection && selection.dayIdx === dayIdx && selection.staffId === staffId;
  const selTopPx = selActive
    ? ((Math.min(selection.startMin, selection.endMin) - GRID_START_HOUR * 60) / slotMinutes) *
      slotHeightPx
    : 0;
  const selHeightPx = selActive
    ? (Math.abs(selection.endMin - selection.startMin) / slotMinutes) * slotHeightPx
    : 0;

  return (
    <div
      ref={setNodeRef}
      style={{
        width: COL_W,
        height,
        position: "relative",
        flexShrink: 0,
        borderRight: "1px solid rgba(15,23,42,0.04)",
      }}
      className={`transition-colors ${isOver && !isInvalidTarget ? "bg-sky-50/60" : ""}`}
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        if ((e.target as Element).closest("[data-event-block]")) return;
        if ((e.target as Element).closest("[data-no-dnd]")) return;
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const relY = e.clientY - rect.top;
        const rawMin = GRID_START_HOUR * 60 + Math.floor(relY / slotHeightPx) * slotMinutes;
        const startMin = Math.max(
          GRID_START_HOUR * 60,
          Math.min(GRID_END_HOUR * 60 - slotMinutes, rawMin)
        );
        onSelectionStart(dayIdx, staffId, startMin, rect.top);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        if ((e.target as Element).closest("[data-event-block]")) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const relY = e.clientY - rect.top;
        const rawMin = GRID_START_HOUR * 60 + Math.floor(relY / slotHeightPx) * slotMinutes;
        const clickedMin = snapMinutesToSlot(
          Math.max(GRID_START_HOUR * 60, Math.min(GRID_END_HOUR * 60 - slotMinutes, rawMin)),
          slotMinutes
        );
        onCellContextMenu(e.clientX, e.clientY, dayIdx, staffId, clickedMin);
      }}
    >
      {/* 異職種ドロップ不可オーバーレイ */}
      {isInvalidTarget && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(239,68,68,0.07)",
            pointerEvents: "none",
            zIndex: 3,
          }}
        />
      )}
      {/* 今日の背景 */}
      {isToday && (
        <div
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          className="bg-sky-50/30"
        />
      )}
      {/* 日境界線 */}
      {isFirstInDay && (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: 1,
            background: "#e5e7eb",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
      )}
      {/* 時間外グレーアウト（8:00-8:30） */}
      {offTopHeight > 0 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: offTopHeight,
            background: "rgba(156,163,175,0.18)",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />
      )}
      {/* 時間外グレーアウト（17:00-18:00） */}
      <div
        style={{
          position: "absolute",
          top: offBottomTopPx,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(156,163,175,0.18)",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />
      {/* 選択ハイライト */}
      {selActive && selHeightPx > 0 && (
        <div
          style={{
            position: "absolute",
            top: selTopPx,
            height: selHeightPx,
            left: 2,
            right: 2,
            background: "rgba(14,165,233,0.18)",
            border: "1.5px solid rgba(14,165,233,0.6)",
            borderRadius: 4,
            pointerEvents: "none",
            zIndex: 6,
          }}
        />
      )}
      {children}
    </div>
  );
}

// グリッド線の色（1時間ごとのみ表示、30分はドット、それ以外は非表示）
function getGridLineStyle(i: number, slotMinutes: number): string {
  if (slotMinutes === 20) {
    if (i % 3 === 0) return "1px solid #e5e7eb";
    return "none";
  }
  if (slotMinutes === 10) {
    if (i % 6 === 0) return "1px solid #e5e7eb";
    if (i % 3 === 0) return "1px dashed #f0f0f0";
    return "none";
  }
  // 5分
  if (i % 12 === 0) return "1px solid #e5e7eb";
  if (i % 6 === 0) return "1px dashed #f0f0f0";
  return "none";
}

type Props = {
  staffs: Staff[];
  visibleStaffs: Staff[];
  patients: Patient[];
  instances: ScheduleInstance[];
  weekDays: Date[];
  activeId: string | null;
  patientMap: Map<string, Patient>;
  staffMap: Map<string, Staff>;
  slotMinutes: number;
  slotHeightPx: number;
  activeOccupation: string | null;
  selection: Selection;
  resizing: ResizingState;
  onEventSelect: (instance: ScheduleInstance) => void;
  onEventContextMenu: (x: number, y: number, instance: ScheduleInstance) => void;
  onSelectionStart: (dayIdx: number, staffId: string, startMin: number, columnTop: number) => void;
  onCellContextMenu: (
    x: number,
    y: number,
    dayIdx: number,
    staffId: string,
    clickedMin: number
  ) => void;
  onResizeStart: (instance: ScheduleInstance, clientY: number, columnTop: number) => void;
};

export default function CalendarGrid({
  staffs,
  visibleStaffs,
  instances,
  weekDays,
  patientMap,
  staffMap,
  slotMinutes,
  slotHeightPx,
  activeOccupation,
  selection,
  resizing,
  onEventSelect,
  onEventContextMenu,
  onSelectionStart,
  onCellContextMenu,
  onResizeStart,
}: Props) {
  const [nowTopPx, setNowTopPx] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      if (nowMin < GRID_START_HOUR * 60 || nowMin > GRID_END_HOUR * 60) {
        setNowTopPx(null);
      } else {
        setNowTopPx(((nowMin - GRID_START_HOUR * 60) / slotMinutes) * slotHeightPx);
      }
    };
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [slotMinutes, slotHeightPx]);

  const hourLabels = getHourLabels(slotMinutes, slotHeightPx);
  const totalSlots = getTotalSlots(slotMinutes);
  const totalHeightPx = getTotalHeightPx(slotMinutes, slotHeightPx);
  const slotLines = Array.from({ length: totalSlots + 1 }, (_, i) => i);

  return (
    <div className="flex min-w-max flex-col select-none">
      {/* ── ヘッダー行 1: 曜日 + 日付 ── */}
      <div className="sticky top-0 z-20 flex border-b border-slate-100 bg-white">
        <div style={{ width: TIME_COL_W, flexShrink: 0 }} />
        {weekDays.map((day, dIdx) => {
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={dIdx}
              style={{ width: COL_W * visibleStaffs.length, flexShrink: 0 }}
              className={`border-l border-slate-100 py-1.5 text-center ${isToday ? "bg-sky-50" : ""}`}
            >
              <span className={`text-sm font-bold ${isToday ? "text-sky-600" : "text-gray-700"}`}>
                {DAY_NAMES_JP[dIdx]}
              </span>
              <span className={`ml-1.5 text-xs ${isToday ? "text-sky-500" : "text-gray-400"}`}>
                {format(day, "M/d")}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── ヘッダー行 2: スタッフ名 ── */}
      <div className="sticky top-[36px] z-20 flex border-b border-slate-100 bg-white">
        <div style={{ width: TIME_COL_W, flexShrink: 0 }} />
        {weekDays.map((day, dIdx) =>
          visibleStaffs.map((staff) => {
            const isToday = isSameDay(day, new Date());
            const headerCls =
              OCCUPATION_HEADER[staff.occupation] ?? "bg-gray-50 border-gray-200 text-gray-600";
            return (
              <div
                key={`${dIdx}-${staff.id}`}
                style={{ width: COL_W, flexShrink: 0 }}
                className={`border-l border-slate-100 py-1 text-center ${isToday ? "bg-sky-50/60" : ""}`}
              >
                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${headerCls}`}>
                  {staff.occupation.toUpperCase()}
                </span>
                <div className="mt-0.5 truncate px-1 text-[11px] leading-tight text-gray-600">
                  {staff.name.split(" ")[0]}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── グリッド本体 ── */}
      <div className="flex" style={{ position: "relative" }}>
        {/* 時間軸 */}
        <div
          style={{ width: TIME_COL_W, height: totalHeightPx, flexShrink: 0, position: "relative" }}
          className="border-r border-slate-100"
        >
          {hourLabels.map(({ label, topPx, hour }) => (
            <div
              key={label}
              style={{
                position: "absolute",
                top: topPx,
                right: 0,
                transform:
                  hour === GRID_START_HOUR
                    ? "translateY(1px)"
                    : hour === GRID_END_HOUR
                      ? "translateY(-100%)"
                      : "translateY(-50%)",
              }}
              className="pr-1.5 text-[10px] whitespace-nowrap text-gray-400"
            >
              {label}
            </div>
          ))}
        </div>

        {/* 曜日グループ × スタッフ列 */}
        {weekDays.map((day, dIdx) =>
          visibleStaffs.map((staff, staffVisIdx) => {
            const staffIdx = staffs.findIndex((s) => s.id === staff.id);
            const colId = `col-${dIdx}-${staffIdx}`;
            const colInstances = instances.filter(
              (inst) => inst.therapist_id === staff.id && isSameDay(inst.start_at, day)
            );
            const isToday = isSameDay(day, new Date());

            return (
              <DroppableColumn
                key={colId}
                colId={colId}
                height={totalHeightPx}
                isToday={isToday}
                slotMinutes={slotMinutes}
                slotHeightPx={slotHeightPx}
                day={day}
                staffId={staff.id}
                staffOccupation={staff.occupation}
                dayIdx={dIdx}
                isFirstInDay={staffVisIdx === 0}
                activeOccupation={activeOccupation}
                selection={selection}
                onSelectionStart={onSelectionStart}
                onCellContextMenu={onCellContextMenu}
              >
                {/* グリッド線 */}
                {slotLines.map((i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      top: i * slotHeightPx,
                      left: 0,
                      right: 0,
                      pointerEvents: "none",
                      borderTop: getGridLineStyle(i, slotMinutes),
                    }}
                  />
                ))}
                {/* 予約ブロック */}
                {colInstances.map((inst) => (
                  <EventBlock
                    key={inst.id}
                    instance={inst}
                    patient={patientMap.get(inst.patient_id)}
                    staff={staffMap.get(inst.therapist_id)}
                    slotMinutes={slotMinutes}
                    slotHeightPx={slotHeightPx}
                    resizeEndMin={resizing?.instanceId === inst.id ? resizing.newEndMin : undefined}
                    onClick={onEventSelect}
                    onContextMenu={onEventContextMenu}
                    onResizeStart={onResizeStart}
                  />
                ))}
              </DroppableColumn>
            );
          })
        )}
        {/* 現在時刻インジケーター */}
        {nowTopPx !== null && (
          <>
            <div
              style={{
                position: "absolute",
                top: nowTopPx - 3,
                left: TIME_COL_W - 4,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#ef4444",
                pointerEvents: "none",
                zIndex: 25,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: nowTopPx,
                left: TIME_COL_W,
                right: 0,
                height: 2,
                background: "#ef4444",
                pointerEvents: "none",
                zIndex: 25,
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
