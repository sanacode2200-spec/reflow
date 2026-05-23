"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { addDays, addWeeks, format, startOfWeek, subWeeks } from "date-fns";
import type { Patient, Schedule, ScheduleInstance, Staff } from "@/lib/types";
import { GRID_END_HOUR, GRID_START_HOUR, getTotalSlots, snapMinutesToSlot } from "@/lib/grid";
import { expandSchedules } from "@/lib/recurrence";
import CalendarGrid from "./CalendarGrid";
import CopyDatePicker from "./CopyDatePicker";
import DetailPanel from "./DetailPanel";
import DragLayer from "./DragLayer";

export type RehabCalendarProps = {
  staffs: Staff[];
  patients: Patient[];
  schedules: Schedule[];
  currentStaffId: string;
  initialWeek?: Date;
  onScheduleUpdate?: (schedule: Schedule) => void;
  onScheduleCreate?: (schedules: Schedule[]) => void;
  onScheduleDelete?: (scheduleId: string) => void;
};

const OCCUPATION_CHIP: Record<string, string> = {
  pt: "bg-sky-100 text-sky-700 border-sky-300",
  ot: "bg-emerald-100 text-emerald-700 border-emerald-300",
  st: "bg-violet-100 text-violet-700 border-violet-300",
};

// CalendarGrid 内の sticky ヘッダー2行分の実測高さ（曜日行 + スタッフ名行）
const GRID_HEADER_PX = 96;
// 20分スロット数: 8:00〜18:00 = 600分 / 20 = 30
const TOTAL_SLOTS_20 = getTotalSlots(20);

type SlotMinutes = 20 | 10 | 5;

export default function RehabCalendar({
  staffs,
  patients,
  schedules,
  currentStaffId,
  initialWeek,
  onScheduleUpdate,
  onScheduleCreate,
  onScheduleDelete: _onScheduleDelete,
}: RehabCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(initialWeek ?? new Date(), { weekStartsOn: 1 })
  );
  const [visibleStaffIds, setVisibleStaffIds] = useState<string[]>([currentStaffId]);
  const [selectedInstance, setSelectedInstance] = useState<ScheduleInstance | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showCopyPicker, setShowCopyPicker] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  const [slotMinutes, setSlotMinutes] = useState<SlotMinutes>(20);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerH, setContainerH] = useState(700);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setContainerH(el.clientHeight));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // 20分スロット基準の高さ（コンテナにぴったり収まるよう計算、最低18px）
  const baseSlotHeightPx = Math.max(18, Math.floor((containerH - GRID_HEADER_PX) / TOTAL_SLOTS_20));

  const slotHeightPx = useMemo(() => {
    if (slotMinutes === 20) return baseSlotHeightPx;
    if (slotMinutes === 10) return baseSlotHeightPx; // 同じ高さ、スロット数2倍でスクロール
    return Math.max(12, Math.ceil(baseSlotHeightPx / 2)); // 5分は半分
  }, [slotMinutes, baseSlotHeightPx]);

  const weekDays = useMemo(
    () => Array.from({ length: 6 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  );
  const weekEnd = useMemo(() => addDays(currentWeekStart, 5), [currentWeekStart]);

  const instances = useMemo(
    () => expandSchedules(schedules, currentWeekStart, weekEnd),
    [schedules, currentWeekStart, weekEnd]
  );

  const patientMap = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients]);
  const staffMap = useMemo(() => new Map(staffs.map((s) => [s.id, s])), [staffs]);

  const visibleStaffs = useMemo(
    () => visibleStaffIds.flatMap((id) => staffMap.get(id) ?? []),
    [visibleStaffIds, staffMap]
  );

  const addableStaffs = useMemo(
    () => staffs.filter((s) => !visibleStaffIds.includes(s.id)),
    [staffs, visibleStaffIds]
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const activeInstance = useMemo(
    () => (activeId ? (instances.find((i) => i.id === activeId) ?? null) : null),
    [activeId, instances]
  );

  const handleAddStaff = useCallback((staffId: string) => {
    setVisibleStaffIds((prev) => [...prev, staffId]);
    setShowAddMenu(false);
  }, []);

  const handleRemoveStaff = useCallback(
    (staffId: string) => {
      if (staffId === currentStaffId) return;
      setVisibleStaffIds((prev) => prev.filter((id) => id !== staffId));
    },
    [currentStaffId]
  );

  const handleCopyConfirm = useCallback(
    (dates: Date[]) => {
      if (!selectedInstance) return;
      const durationMs = selectedInstance.end_at.getTime() - selectedInstance.start_at.getTime();
      const srcH = selectedInstance.start_at.getHours();
      const srcM = selectedInstance.start_at.getMinutes();
      const pad2 = (n: number) => String(n).padStart(2, "0");
      const fmtLocal = (d: Date) =>
        `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:00`;

      const newSchedules: Schedule[] = dates.map((date, i) => {
        const start = new Date(date);
        start.setHours(srcH, srcM, 0, 0);
        const end = new Date(start.getTime() + durationMs);
        return {
          id: `copy-${selectedInstance.schedule_id}-${Date.now()}-${i}`,
          patient_id: selectedInstance.patient_id,
          therapist_id: selectedInstance.therapist_id,
          start_at: fmtLocal(start),
          end_at: fmtLocal(end),
          recurrence_rule: null,
        };
      });

      onScheduleCreate?.(newSchedules);
      setShowCopyPicker(false);
    },
    [selectedInstance]
  );

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      setActiveId(null);
      const { active, over, delta } = e;
      if (!over) return;

      const instance = instances.find((i) => i.id === String(active.id));
      if (!instance) return;

      const parts = String(over.id).split("-");
      if (parts[0] !== "col" || parts.length !== 3) return;
      const dIdx = parseInt(parts[1] ?? "0", 10);
      const sIdx = parseInt(parts[2] ?? "0", 10);

      const targetDay = weekDays[dIdx];
      const targetStaff = staffs[sIdx];
      if (!targetDay || !targetStaff) return;

      const durationMs = instance.end_at.getTime() - instance.start_at.getTime();
      const durationMin = durationMs / 60000;
      const deltaMin = Math.round(delta.y / slotHeightPx) * slotMinutes;

      const origMinFromMidnight =
        instance.start_at.getHours() * 60 + instance.start_at.getMinutes();
      const rawNewMin = origMinFromMidnight + deltaMin;
      const clampedMin = Math.max(
        GRID_START_HOUR * 60,
        Math.min(GRID_END_HOUR * 60 - durationMin, rawNewMin)
      );
      const newStartMin = snapMinutesToSlot(clampedMin, slotMinutes);

      const newStartAt = new Date(targetDay);
      newStartAt.setHours(Math.floor(newStartMin / 60), newStartMin % 60, 0, 0);
      const newEndAt = new Date(newStartAt.getTime() + durationMs);

      const pad2 = (n: number) => String(n).padStart(2, "0");
      const fmtLocal = (d: Date) =>
        `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:00`;

      const original = schedules.find((s) => s.id === instance.schedule_id);
      if (original) {
        onScheduleUpdate?.({
          ...original,
          therapist_id: targetStaff.id,
          start_at: fmtLocal(newStartAt),
          end_at: fmtLocal(newEndAt),
        });
      }
      setSelectedInstance(null);
    },
    [instances, weekDays, staffs, slotHeightPx, slotMinutes]
  );

  const weekLabel = `${format(currentWeekStart, "yyyy年M月d日")} 〜 ${format(weekEnd, "M月d日")}`;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-full flex-col overflow-hidden bg-gray-50">
        {/* ── ナビゲーションバー ── */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-4 py-2">
          {/* 週ナビ */}
          <button
            onClick={() => setCurrentWeekStart((w) => subWeeks(w, 1))}
            className="rounded border border-gray-300 px-3 py-1 text-sm transition-colors hover:bg-gray-100"
          >
            ← 前週
          </button>
          <span className="min-w-[180px] text-center text-sm font-semibold text-gray-800">
            {weekLabel}
          </span>
          <button
            onClick={() => setCurrentWeekStart((w) => addWeeks(w, 1))}
            className="rounded border border-gray-300 px-3 py-1 text-sm transition-colors hover:bg-gray-100"
          >
            翌週 →
          </button>
          <button
            onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="rounded border border-gray-300 px-3 py-1 text-sm transition-colors hover:bg-gray-100"
          >
            今週
          </button>

          {/* 時間刻み切り替え */}
          <div className="ml-2 flex overflow-hidden rounded border border-gray-200 text-sm">
            {([20, 10, 5] as const).map((m) => (
              <button
                key={m}
                onClick={() => setSlotMinutes(m)}
                className={`px-2.5 py-1 transition-colors ${
                  slotMinutes === m
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                }`}
              >
                {m}分
              </button>
            ))}
          </div>

          {/* スタッフ選択エリア */}
          <div className="ml-4 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-gray-400">表示中:</span>
            {visibleStaffs.map((staff) => {
              const isSelf = staff.id === currentStaffId;
              const chipCls =
                OCCUPATION_CHIP[staff.occupation] ?? "bg-gray-100 text-gray-600 border-gray-300";
              return (
                <span
                  key={staff.id}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${chipCls}`}
                >
                  {staff.name}
                  {isSelf && <span className="text-[9px] opacity-60">(自分)</span>}
                  {!isSelf && (
                    <button
                      onClick={() => handleRemoveStaff(staff.id)}
                      className="ml-0.5 leading-none opacity-50 hover:opacity-100"
                      aria-label="削除"
                    >
                      ×
                    </button>
                  )}
                </span>
              );
            })}

            {/* スタッフ追加ボタン */}
            {addableStaffs.length > 0 && (
              <div className="relative" ref={addMenuRef}>
                <button
                  onClick={() => setShowAddMenu((v) => !v)}
                  className="rounded-full border border-dashed border-gray-400 px-2 py-0.5 text-xs text-gray-500 transition-colors hover:bg-gray-100"
                >
                  + 追加
                </button>
                {showAddMenu && (
                  <div className="absolute top-full left-0 z-50 mt-1 min-w-[140px] rounded border border-gray-200 bg-white shadow-lg">
                    {addableStaffs.map((staff) => {
                      const chipCls = OCCUPATION_CHIP[staff.occupation] ?? "";
                      return (
                        <button
                          key={staff.id}
                          onClick={() => handleAddStaff(staff.id)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                        >
                          <span
                            className={`rounded border px-1 py-0.5 text-[10px] font-bold ${chipCls}`}
                          >
                            {staff.occupation.toUpperCase()}
                          </span>
                          {staff.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 凡例 */}
          <div className="ml-auto flex items-center gap-2 text-[11px] text-gray-400">
            <span className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-400" /> 繰り返し
            </span>
          </div>
        </div>

        {/* ── メインエリア ── */}
        <div className="flex flex-1 overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-auto">
            <CalendarGrid
              staffs={staffs}
              visibleStaffs={visibleStaffs}
              patients={patients}
              instances={instances}
              weekDays={weekDays}
              activeId={activeId}
              patientMap={patientMap}
              staffMap={staffMap}
              slotMinutes={slotMinutes}
              slotHeightPx={slotHeightPx}
              onEventSelect={setSelectedInstance}
            />
          </div>

          {selectedInstance && (
            <DetailPanel
              instance={selectedInstance}
              patient={patientMap.get(selectedInstance.patient_id)}
              staff={staffMap.get(selectedInstance.therapist_id)}
              onClose={() => setSelectedInstance(null)}
              onCopyRequest={() => setShowCopyPicker(true)}
            />
          )}
        </div>
      </div>

      <DragLayer
        activeInstance={activeInstance}
        patient={activeInstance ? patientMap.get(activeInstance.patient_id) : undefined}
        staff={activeInstance ? staffMap.get(activeInstance.therapist_id) : undefined}
        slotMinutes={slotMinutes}
        slotHeightPx={slotHeightPx}
      />

      {showCopyPicker && selectedInstance && (
        <CopyDatePicker
          instance={selectedInstance}
          schedules={schedules}
          onCancel={() => setShowCopyPicker(false)}
          onConfirm={handleCopyConfirm}
        />
      )}
    </DndContext>
  );
}
