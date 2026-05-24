"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

// リサイズハンドル上では dnd-kit のドラッグを起動しないカスタムセンサー
class NoDndPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: "onPointerDown" as const,
      handler({ nativeEvent }: { nativeEvent: PointerEvent }) {
        if (
          nativeEvent.target instanceof HTMLElement &&
          nativeEvent.target.closest("[data-no-dnd]")
        ) {
          return false;
        }
        return true;
      },
    },
  ] as typeof PointerSensor.activators;
}
import { addDays, addWeeks, endOfDay, format, startOfWeek, subWeeks } from "date-fns";
import type { Patient, Schedule, ScheduleInstance, Staff } from "@/lib/types";
import { GRID_END_HOUR, GRID_START_HOUR, getTotalSlots, snapMinutesToSlot } from "@/lib/grid";
import { expandSchedules } from "@/lib/recurrence";
import CalendarGrid from "./CalendarGrid";
import ContextMenu, { type ContextMenuItem } from "./ContextMenu";
import CopyDatePicker from "./CopyDatePicker";
import DragLayer from "./DragLayer";

export type RehabCalendarProps = {
  staffs: Staff[];
  patients: Patient[];
  schedules: Schedule[];
  currentStaffId: string;
  initialWeek?: Date;
  onScheduleUpdate?: (schedule: Schedule) => Promise<void>;
  onScheduleCreate?: (schedules: Schedule[]) => void;
  onScheduleDelete?: (scheduleId: string) => void;
  onScheduleCancel?: (scheduleId: string, cancel: boolean) => Promise<void>;
  onCreateRequested?: (params: { start: Date; end: Date; therapistId: string }) => void;
  onEditRequested?: (scheduleId: string) => void;
  onRecordOpen?: (scheduleId: string) => void;
};

const OCCUPATION_CHIP: Record<string, string> = {
  pt: "bg-sky-100 text-sky-700 border-sky-300",
  ot: "bg-emerald-100 text-emerald-700 border-emerald-300",
  st: "bg-violet-100 text-violet-700 border-violet-300",
};

const GRID_HEADER_PX = 96;
const TOTAL_SLOTS_20 = getTotalSlots(20);

type SlotMinutes = 20 | 10 | 5;

type Selection = {
  dayIdx: number;
  staffId: string;
  startMin: number;
  endMin: number;
  columnTop: number;
} | null;

type ContextMenuState = {
  x: number;
  y: number;
  items: ContextMenuItem[];
} | null;

export default function RehabCalendar({
  staffs,
  patients,
  schedules,
  currentStaffId,
  initialWeek,
  onScheduleUpdate,
  onScheduleCreate,
  onScheduleDelete,
  onScheduleCancel,
  onCreateRequested,
  onEditRequested,
  onRecordOpen,
}: RehabCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(initialWeek ?? new Date(), { weekStartsOn: 1 })
  );
  const [visibleStaffIds, setVisibleStaffIds] = useState<string[]>([currentStaffId]);
  const [selectedInstance, setSelectedInstance] = useState<ScheduleInstance | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoverColId, setHoverColId] = useState<string | null>(null);
  const [showCopyPicker, setShowCopyPicker] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  const [slotMinutes, setSlotMinutes] = useState<SlotMinutes>(20);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerH, setContainerH] = useState(700);

  // ドラッグ選択
  const [selection, setSelection] = useState<Selection>(null);
  const selectionRef = useRef<Selection>(null);
  const isSelectingRef = useRef(false);

  // リサイズ
  const [resizing, setResizing] = useState<{ instanceId: string; newEndMin: number } | null>(null);
  const isResizingRef = useRef(false);
  const resizingRef = useRef<{
    instance: ScheduleInstance;
    columnTop: number;
    currentEndMin: number;
    minEndMin: number;
  } | null>(null);

  // コンテキストメニュー
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [localUpdates, setLocalUpdates] = useState<Map<string, Schedule>>(new Map());
  const [moveError, setMoveError] = useState<string | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setContainerH(el.clientHeight));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalUpdates(new Map());
  }, [schedules]);

  // 選択・リサイズのマウスイベントをwindowで追跡
  useEffect(() => {
    const pad2 = (n: number) => String(n).padStart(2, "0");
    const fmtLocal = (d: Date) =>
      `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:00`;

    const handleMouseMove = (e: MouseEvent) => {
      // ドラッグ選択
      if (isSelectingRef.current && selectionRef.current) {
        const relY = e.clientY - selectionRef.current.columnTop;
        const rawMin =
          GRID_START_HOUR * 60 +
          Math.floor(relY / slotHeightPxRef.current) * slotMinutesRef.current;
        const endMin = Math.max(
          GRID_START_HOUR * 60 + slotMinutesRef.current,
          Math.min(
            GRID_END_HOUR * 60,
            snapMinutesToSlot(rawMin, slotMinutesRef.current) + slotMinutesRef.current
          )
        );
        const updated = { ...selectionRef.current, endMin };
        selectionRef.current = updated;
        setSelection({ ...updated });
      }
      // リサイズ
      if (isResizingRef.current && resizingRef.current) {
        const { columnTop, minEndMin } = resizingRef.current;
        const relY = e.clientY - columnTop;
        const rawMin =
          GRID_START_HOUR * 60 + (relY / slotHeightPxRef.current) * slotMinutesRef.current;
        const snapped = snapMinutesToSlot(rawMin, slotMinutesRef.current);
        const clamped = Math.max(minEndMin, Math.min(GRID_END_HOUR * 60, snapped));
        resizingRef.current.currentEndMin = clamped;
        setResizing({ instanceId: resizingRef.current.instance.id, newEndMin: clamped });
      }
    };
    const handleMouseUp = () => {
      if (isSelectingRef.current) {
        isSelectingRef.current = false;
      }
      if (isResizingRef.current && resizingRef.current) {
        isResizingRef.current = false;
        const { instance, currentEndMin } = resizingRef.current;
        resizingRef.current = null;
        setResizing(null);

        const original = schedulesRef.current.find((s) => s.id === instance.schedule_id);
        if (original && onScheduleUpdateRef.current) {
          const endAt = new Date(instance.start_at);
          endAt.setHours(Math.floor(currentEndMin / 60), currentEndMin % 60, 0, 0);
          void onScheduleUpdateRef
            .current({ ...original, end_at: fmtLocal(endAt) })
            ?.catch((err: unknown) => {
              setMoveError(err instanceof Error ? err.message : "予約の変更に失敗しました");
            });
        }
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // スロット高の最新値をrefで管理（mousemoveハンドラから参照するため）
  const slotMinutesRef = useRef(slotMinutes);
  const slotHeightPxRef = useRef(0);
  // stale closure 回避用 refs
  const schedulesRef = useRef(schedules);
  // eslint-disable-next-line react-hooks/refs, react-hooks/immutability
  schedulesRef.current = schedules;
  const onScheduleUpdateRef = useRef(onScheduleUpdate);
  const onScheduleCreateRef = useRef(onScheduleCreate);
  // eslint-disable-next-line react-hooks/refs, react-hooks/immutability
  onScheduleUpdateRef.current = onScheduleUpdate;
  // eslint-disable-next-line react-hooks/refs
  onScheduleCreateRef.current = onScheduleCreate;

  const baseSlotHeightPx = Math.max(18, Math.floor((containerH - GRID_HEADER_PX) / TOTAL_SLOTS_20));

  const slotHeightPx = useMemo(() => {
    // 10分/5分は 20分基準より小さくしつつ、クリック可能な最低高さを確保
    // グリッドが縦長になるのは許容（スクロールで対応）
    if (slotMinutes === 20) return baseSlotHeightPx;
    if (slotMinutes === 10) return Math.max(16, Math.floor(baseSlotHeightPx * 0.75));
    return Math.max(12, Math.floor(baseSlotHeightPx * 0.6));
  }, [slotMinutes, baseSlotHeightPx]);

  // eslint-disable-next-line react-hooks/refs, react-hooks/immutability
  slotHeightPxRef.current = slotHeightPx;
  // eslint-disable-next-line react-hooks/refs, react-hooks/immutability
  slotMinutesRef.current = slotMinutes;

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  );
  const weekEnd = useMemo(() => endOfDay(addDays(currentWeekStart, 6)), [currentWeekStart]);

  const effectiveSchedules = useMemo(() => {
    if (localUpdates.size === 0) return schedules;
    return schedules.map((s) => localUpdates.get(s.id) ?? s);
  }, [schedules, localUpdates]);

  const instances = useMemo(
    () => expandSchedules(effectiveSchedules, currentWeekStart, weekEnd),
    [effectiveSchedules, currentWeekStart, weekEnd]
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

  const activeOccupation = useMemo(() => {
    if (!activeId) return null;
    const inst = instances.find((i) => i.id === activeId);
    return inst ? (staffMap.get(inst.therapist_id)?.occupation ?? null) : null;
  }, [activeId, instances, staffMap]);

  const hoverTargetStaff = useMemo(() => {
    if (!hoverColId) return undefined;
    const parts = hoverColId.split("-");
    if (parts[0] !== "col" || parts.length !== 3) return undefined;
    const sIdx = parseInt(parts[2] ?? "0", 10);
    return staffs[sIdx];
  }, [hoverColId, staffs]);

  const isValidDropTarget =
    !activeOccupation || !hoverTargetStaff || hoverTargetStaff.occupation === activeOccupation;

  const sensors = useSensors(
    useSensor(NoDndPointerSensor, { activationConstraint: { distance: 4 } })
  );

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
          units: selectedInstance.units,
          session_status: null,
          comment: selectedInstance.comment,
          is_cancelled: false,
        };
      });

      onScheduleCreateRef.current?.(newSchedules);
      setShowCopyPicker(false);
    },
    [selectedInstance]
  );

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  }, []);

  const handleDragOver = useCallback((e: DragOverEvent) => {
    setHoverColId(e.over ? String(e.over.id) : null);
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setHoverColId(null);
  }, []);

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      setActiveId(null);
      setHoverColId(null);
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

      // 同一職種のみ移動可能
      const draggedStaff = staffMap.get(instance.therapist_id);
      if (draggedStaff?.occupation !== targetStaff.occupation) return;

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
        const updatedSchedule = {
          ...original,
          therapist_id: targetStaff.id,
          start_at: fmtLocal(newStartAt),
          end_at: fmtLocal(newEndAt),
        };
        const originalId = original.id;
        setLocalUpdates((prev) => new Map(prev).set(originalId, updatedSchedule));
        void onScheduleUpdateRef.current?.(updatedSchedule)?.catch((err: unknown) => {
          setLocalUpdates((prev) => {
            const next = new Map(prev);
            next.delete(originalId);
            return next;
          });
          setMoveError(err instanceof Error ? err.message : "予約の移動に失敗しました");
        });
      }
      setSelectedInstance(null);
    },
    [instances, weekDays, staffs, staffMap, schedules, slotHeightPx, slotMinutes]
  );

  // ドラッグ選択開始
  const handleSelectionStart = useCallback(
    (dayIdx: number, staffId: string, startMin: number, columnTop: number) => {
      setContextMenu(null);
      const sel: Selection = {
        dayIdx,
        staffId,
        startMin,
        endMin: startMin + slotMinutes,
        columnTop,
      };
      selectionRef.current = sel;
      setSelection(sel);
      isSelectingRef.current = true;
    },
    [slotMinutes]
  );

  // リサイズ開始
  const handleResizeStart = useCallback(
    (instance: ScheduleInstance, clientY: number, columnTop: number) => {
      setContextMenu(null);
      setSelection(null);
      selectionRef.current = null;
      isSelectingRef.current = false;

      const startMin = instance.start_at.getHours() * 60 + instance.start_at.getMinutes();
      const endMin = instance.end_at.getHours() * 60 + instance.end_at.getMinutes();

      isResizingRef.current = true;
      resizingRef.current = {
        instance,
        columnTop,
        currentEndMin: endMin,
        minEndMin: startMin + slotMinutesRef.current,
      };
      setResizing({ instanceId: instance.id, newEndMin: endMin });
    },
    []
  );

  // 空セルの右クリック
  const handleCellContextMenu = useCallback(
    (x: number, y: number, dayIdx: number, staffId: string, clickedMin: number) => {
      const day = weekDays[dayIdx];
      if (!day) return;

      // 選択範囲があればそれを使う
      const sel = selectionRef.current;
      const useSelection =
        sel && sel.dayIdx === dayIdx && sel.staffId === staffId && !isSelectingRef.current;

      const startMin = useSelection ? Math.min(sel.startMin, sel.endMin) : clickedMin;
      const endMin = useSelection ? Math.max(sel.startMin, sel.endMin) : clickedMin + slotMinutes;

      const start = new Date(day);
      start.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
      const end = new Date(day);
      end.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);

      const formatT = (d: Date) => format(d, "HH:mm");
      setContextMenu({
        x,
        y,
        items: [
          {
            label: `予約を作成（${formatT(start)}〜${formatT(end)}）`,
            onClick: () => {
              onCreateRequested?.({ start, end, therapistId: staffId });
              setSelection(null);
              selectionRef.current = null;
            },
          },
        ],
      });
    },
    [weekDays, slotMinutes, onCreateRequested]
  );

  // 予約枠の右クリック
  const handleEventContextMenu = useCallback(
    (x: number, y: number, instance: ScheduleInstance) => {
      setContextMenu({
        x,
        y,
        items: [
          {
            label: "記録を入力",
            onClick: () => onRecordOpen?.(instance.schedule_id),
          },
          {
            label: "編集",
            onClick: () => onEditRequested?.(instance.schedule_id),
          },
          {
            label: "複数日にコピー",
            onClick: () => {
              setSelectedInstance(instance);
              setShowCopyPicker(true);
            },
          },
          {
            label: instance.is_cancelled ? "中止を解除" : "中止にする",
            onClick: () => {
              void onScheduleCancel?.(instance.schedule_id, !instance.is_cancelled)?.catch(
                (err: unknown) => {
                  setMoveError(err instanceof Error ? err.message : "操作に失敗しました");
                }
              );
            },
          },
          {
            label: "削除",
            danger: true,
            onClick: () => {
              if (window.confirm("この予約を削除しますか？")) {
                onScheduleDelete?.(instance.schedule_id);
              }
            },
          },
        ],
      });
    },
    [onEditRequested, onScheduleDelete, onScheduleCancel, onRecordOpen]
  );

  const weekLabel = `${format(currentWeekStart, "yyyy年M月d日")} 〜 ${format(weekEnd, "M月d日")}`;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        className="relative flex h-full flex-col overflow-hidden bg-gray-50"
        onClick={() => {
          setSelection(null);
          selectionRef.current = null;
          setContextMenu(null);
        }}
      >
        {/* ── エラーバナー ── */}
        {moveError && (
          <div className="absolute top-2 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 shadow-md">
            {moveError}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMoveError(null);
              }}
              className="leading-none opacity-60 hover:opacity-100"
            >
              ×
            </button>
          </div>
        )}
        {/* ── ナビゲーションバー ── */}
        <div
          className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-100 bg-white px-4 py-3"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 週ナビ */}
          <button
            onClick={() => setCurrentWeekStart((w) => subWeeks(w, 1))}
            className="rounded-lg px-3 py-1.5 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            ← 前週
          </button>
          <span className="min-w-[180px] text-center text-sm font-bold text-slate-800">
            {weekLabel}
          </span>
          <button
            onClick={() => setCurrentWeekStart((w) => addWeeks(w, 1))}
            className="rounded-lg px-3 py-1.5 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            翌週 →
          </button>
          <button
            onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="rounded-lg px-3 py-1.5 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            今週
          </button>

          {/* 時間刻み切り替え */}
          <div className="ml-2 flex overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-sm">
            {([20, 10, 5] as const).map((m) => (
              <button
                key={m}
                onClick={() => setSlotMinutes(m)}
                className={`rounded-md px-3 py-1 transition-all ${
                  slotMinutes === m
                    ? "bg-white font-medium text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
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
        </div>

        {/* ── メインエリア ── */}
        <div className="flex flex-1 overflow-hidden">
          <div
            ref={scrollRef}
            className="flex-1 overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
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
              activeOccupation={activeOccupation}
              selection={selection}
              resizing={resizing}
              onEventSelect={(inst) => onEditRequested?.(inst.schedule_id)}
              onEventContextMenu={handleEventContextMenu}
              onSelectionStart={handleSelectionStart}
              onCellContextMenu={handleCellContextMenu}
              onResizeStart={handleResizeStart}
            />
          </div>
        </div>
      </div>

      <DragLayer
        activeInstance={activeInstance}
        patient={activeInstance ? patientMap.get(activeInstance.patient_id) : undefined}
        staff={activeInstance ? staffMap.get(activeInstance.therapist_id) : undefined}
        slotMinutes={slotMinutes}
        slotHeightPx={slotHeightPx}
        targetStaff={hoverTargetStaff}
        isValidTarget={isValidDropTarget}
      />

      {showCopyPicker && selectedInstance && (
        <CopyDatePicker
          instance={selectedInstance}
          schedules={schedules}
          onCancel={() => setShowCopyPicker(false)}
          onConfirm={handleCopyConfirm}
        />
      )}

      {/* コンテキストメニュー */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </DndContext>
  );
}
