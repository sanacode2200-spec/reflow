"use client";

import { useDroppable } from "@dnd-kit/core";
import { format, isSameDay } from "date-fns";
import type { Patient, ScheduleInstance, Staff } from "@/lib/types";
import { getTotalHeightPx, getTotalSlots, getHourLabels } from "@/lib/grid";
import EventBlock from "./EventBlock";

const DAY_NAMES_JP = ["月", "火", "水", "木", "金", "土"] as const;

const TIME_COL_W = 52;
const COL_W = 88;

const OCCUPATION_HEADER: Record<string, string> = {
  pt: "bg-sky-50 border-sky-200 text-sky-700",
  ot: "bg-emerald-50 border-emerald-200 text-emerald-700",
  st: "bg-violet-50 border-violet-200 text-violet-700",
};

type DroppableColumnProps = {
  colId: string;
  children: React.ReactNode;
  height: number;
};

function DroppableColumn({ colId, children, height }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: colId });
  return (
    <div
      ref={setNodeRef}
      style={{ width: COL_W, height, position: "relative", flexShrink: 0 }}
      className={`border-r border-gray-200 transition-colors ${isOver ? "bg-sky-50" : ""}`}
    >
      {children}
    </div>
  );
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
  onEventSelect: (instance: ScheduleInstance) => void;
};

export default function CalendarGrid({
  staffs,
  visibleStaffs,
  instances,
  weekDays,
  activeId,
  patientMap,
  staffMap,
  slotMinutes,
  slotHeightPx,
  onEventSelect,
}: Props) {
  const hourLabels = getHourLabels(slotMinutes, slotHeightPx);
  const totalSlots = getTotalSlots(slotMinutes);
  const totalHeightPx = getTotalHeightPx(slotMinutes, slotHeightPx);
  const slotLines = Array.from({ length: totalSlots + 1 }, (_, i) => i);

  return (
    <div className="flex min-w-max flex-col select-none">
      {/* ── ヘッダー行 1: 曜日 + 日付 ── */}
      <div className="sticky top-0 z-20 flex border-b border-gray-300 bg-white">
        <div style={{ width: TIME_COL_W, flexShrink: 0 }} />
        {weekDays.map((day, dIdx) => {
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={dIdx}
              style={{ width: COL_W * visibleStaffs.length, flexShrink: 0 }}
              className={`border-l border-gray-300 py-1.5 text-center ${isToday ? "bg-sky-50" : ""}`}
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
      <div className="sticky top-[36px] z-20 flex border-b border-gray-300 bg-white">
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
                className={`border-l border-gray-200 py-1 text-center ${isToday ? "bg-sky-50/60" : ""}`}
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
      <div className="flex">
        {/* 時間軸 */}
        <div
          style={{
            width: TIME_COL_W,
            height: totalHeightPx,
            flexShrink: 0,
            position: "relative",
          }}
          className="border-r border-gray-300"
        >
          {hourLabels.map(({ label, topPx }) => (
            <div
              key={label}
              style={{ position: "absolute", top: topPx, right: 0, transform: "translateY(-50%)" }}
              className="pr-1.5 text-[10px] whitespace-nowrap text-gray-400"
            >
              {label}
            </div>
          ))}
        </div>

        {/* 曜日グループ × スタッフ列 */}
        {weekDays.map((day, dIdx) =>
          visibleStaffs.map((staff) => {
            const staffIdx = staffs.findIndex((s) => s.id === staff.id);
            const colId = `col-${dIdx}-${staffIdx}`;
            const colInstances = instances.filter(
              (inst) => inst.therapist_id === staff.id && isSameDay(inst.start_at, day)
            );
            const isToday = isSameDay(day, new Date());

            return (
              <DroppableColumn key={colId} colId={colId} height={totalHeightPx}>
                {/* 今日の背景 */}
                {isToday && (
                  <div
                    style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
                    className="bg-sky-50/30"
                  />
                )}
                {/* 日境界の太線 */}
                {visibleStaffs.indexOf(staff) === 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: 0,
                      width: 1,
                      background: "#d1d5db",
                      pointerEvents: "none",
                      zIndex: 1,
                    }}
                  />
                )}
                {/* グリッド線 */}
                {slotLines.map((i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      top: i * slotHeightPx,
                      left: 0,
                      right: 0,
                      borderTop:
                        slotMinutes === 20
                          ? i % 3 === 0
                            ? "1px solid #d1d5db"
                            : "1px solid #f3f4f6"
                          : slotMinutes === 10
                            ? i % 6 === 0
                              ? "1px solid #d1d5db"
                              : i % 3 === 0
                                ? "1px solid #e5e7eb"
                                : "1px solid #f9fafb"
                            : i % 12 === 0
                              ? "1px solid #d1d5db"
                              : i % 6 === 0
                                ? "1px solid #e5e7eb"
                                : "1px solid #f9fafb",
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
                    onClick={onEventSelect}
                  />
                ))}
              </DroppableColumn>
            );
          })
        )}
      </div>
    </div>
  );
}
