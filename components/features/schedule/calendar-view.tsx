"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventDropArg, EventContentArg } from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { deleteSchedule, moveSchedule } from "@/lib/actions/schedule";
import { calcUnitsFromMinutes } from "@/lib/rehab/calculator";
import type { ScheduleWithRelations } from "@/lib/actions/schedule";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  schedules: ScheduleWithRelations[];
  tenantId: string;
  currentStaffId: string | null;
  orderedStaffIds: string[];
  onEventClick: (scheduleId: string) => void;
  onEditSchedule: (schedule: ScheduleWithRelations) => void;
  onSelect: (start: Date, end: Date) => void;
  onDuplicate: (schedule: ScheduleWithRelations) => void;
  onRefresh: () => void;
};

type SlotDuration = "00:20:00" | "00:10:00" | "00:05:00";

type ContextMenu = {
  x: number;
  y: number;
  schedule: ScheduleWithRelations;
} | null;

type DeleteTarget = {
  schedule: ScheduleWithRelations;
} | null;

// ログイン者のステータス別背景色
const myStatusBg: Record<string, { bg: string; text: string }> = {
  scheduled: { bg: "#ffffff", text: "#3f3f46" },
  draft: { bg: "#fff7ed", text: "#c2410c" },
  completed: { bg: "#eff6ff", text: "#1d4ed8" },
};

// 他スタッフ用グレー階調（選択順に暗くなる）
const STAFF_GRAYS = [
  { bg: "#F7F7F7", text: "#404040" },
  { bg: "#E5E5E5", text: "#404040" },
  { bg: "#737373", text: "#ffffff" },
  { bg: "#404040", text: "#ffffff" },
  { bg: "#171717", text: "#ffffff" },
];

export default function CalendarView({
  schedules,
  tenantId,
  currentStaffId,
  orderedStaffIds,
  onEventClick,
  onEditSchedule,
  onSelect,
  onDuplicate,
  onRefresh,
}: Props) {
  const calendarRef = useRef<FullCalendar>(null);
  const [slotDuration, setSlotDuration] = useState<SlotDuration>("00:20:00");
  const [contextMenu, setContextMenu] = useState<ContextMenu>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [deleting, setDeleting] = useState(false);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    schedule: ScheduleWithRelations;
  } | null>(null);

  const slotMinHeight = slotDuration === "00:05:00" ? 12 : 24;

  // 他スタッフのグレーマップ（選択順で色が決まる）
  const otherStaffGrayMap = useMemo(() => {
    const map: Record<string, { bg: string; text: string }> = {};
    let idx = 0;
    for (const id of orderedStaffIds) {
      if (id !== currentStaffId) {
        map[id] = STAFF_GRAYS[idx % STAFF_GRAYS.length]!;
        idx++;
      }
    }
    return map;
  }, [orderedStaffIds, currentStaffId]);

  const events = schedules.map((s) => {
    const isMe = s.therapist_id === currentStaffId;
    const status = s.session_status ?? "scheduled";
    const style = isMe
      ? (myStatusBg[status] ?? myStatusBg["scheduled"]!)
      : (otherStaffGrayMap[s.therapist_id] ?? STAFF_GRAYS[0]!);
    return {
      id: s.id,
      title: `${format(s.start_at, "HH:mm")} ${s.patient_name}`,
      start: s.start_at,
      end: s.end_at,
      extendedProps: { schedule: s, status },
      borderColor: "transparent",
      backgroundColor: style.bg,
      textColor: style.text,
    };
  });

  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      const schedule = arg.event.extendedProps["schedule"] as ScheduleWithRelations;
      onEventClick(schedule.id);
    },
    [onEventClick]
  );

  const handleContextMenu = useCallback((e: React.MouseEvent, schedule: ScheduleWithRelations) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, schedule });
  }, []);

  const handleDeleteClick = useCallback(() => {
    if (!contextMenu) return;
    setDeleteTarget({ schedule: contextMenu.schedule });
    setContextMenu(null);
  }, [contextMenu]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSchedule(deleteTarget.schedule.id, tenantId);
      onRefresh();
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, tenantId, onRefresh]);

  useEffect(() => {
    const close = () => setContextMenu(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("click", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const renderEventContent = (arg: EventContentArg) => {
    const schedule = arg.event.extendedProps["schedule"] as ScheduleWithRelations | undefined;
    return (
      <div
        className="h-full w-full cursor-pointer overflow-hidden px-1.5"
        onContextMenu={(e) => schedule && handleContextMenu(e, schedule)}
        onMouseEnter={(e) => {
          if (!schedule) return;
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setTooltip({ x: rect.left, y: rect.bottom + 4, schedule });
        }}
        onMouseLeave={() => setTooltip(null)}
      >
        <span className="block truncate text-xs leading-tight">{arg.event.title}</span>
      </div>
    );
  };

  const deleteTargetStatus = deleteTarget?.schedule.session_status ?? "scheduled";
  const canDelete =
    deleteTargetStatus === "scheduled" || deleteTarget?.schedule.session_status === null;

  return (
    <div className="relative">
      {/* Slot duration toggle */}
      <div className="mb-3 flex gap-1">
        {(["00:20:00", "00:10:00", "00:05:00"] as SlotDuration[]).map((d) => (
          <button
            key={d}
            onClick={() => setSlotDuration(d)}
            className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
              slotDuration === d
                ? "border-black bg-black text-white"
                : "border-[#eaeaea] bg-white text-[#888] hover:border-[#111]"
            }`}
          >
            {d === "00:20:00" ? "20分" : d === "00:10:00" ? "10分" : "5分"}
          </button>
        ))}
      </div>

      <style>{`
        .fc-timegrid-slot { height: ${slotMinHeight}px !important; }
        .fc-event { border: none !important; box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04); border-radius: 4px !important; }
        .fc-event:hover { box-shadow: 0 2px 6px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06); }
        .fc-day-today { background: #f0f7ff !important; }
        .fc-timegrid-now-indicator-line { border-color: #0070f3 !important; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: #eaeaea; border-radius: 3px; }
      `}</style>

      <FullCalendar
        ref={calendarRef}
        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        locale="ja"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "timeGridWeek,timeGridDay",
        }}
        slotMinTime="08:00:00"
        slotMaxTime="18:00:00"
        slotLabelFormat={{
          hour: "numeric",
          minute: "2-digit",
          omitZeroMinute: false,
          hour12: false,
        }}
        slotDuration={slotDuration}
        snapDuration="00:05:00"
        businessHours={{ daysOfWeek: [1, 2, 3, 4, 5, 6], startTime: "08:00", endTime: "18:00" }}
        hiddenDays={[0]}
        nowIndicator
        editable
        selectable
        selectMirror
        dayMaxEvents
        events={events}
        eventContent={renderEventContent}
        eventClick={handleEventClick}
        select={(arg) => {
          onSelect(arg.start, arg.end);
          calendarRef.current?.getApi().unselect();
        }}
        eventDrop={(arg: EventDropArg) => {
          if (arg.jsEvent.ctrlKey || arg.jsEvent.altKey || arg.jsEvent.metaKey) {
            arg.revert();
            return;
          }
          if (!arg.event.start || !arg.event.end) {
            arg.revert();
            return;
          }
          const schedule = arg.event.extendedProps["schedule"] as ScheduleWithRelations;
          const canMove = !schedule.session_status || schedule.session_status === "scheduled";
          if (!canMove) {
            arg.revert();
            return;
          }
          moveSchedule(schedule.id, tenantId, schedule.therapist_id, arg.event.start, arg.event.end)
            .then(() => onRefresh())
            .catch(() => arg.revert());
        }}
        eventResize={(arg: EventResizeDoneArg) => {
          if (!arg.event.start || !arg.event.end) {
            arg.revert();
            return;
          }
          const schedule = arg.event.extendedProps["schedule"] as ScheduleWithRelations;
          const canEdit = !schedule.session_status || schedule.session_status === "scheduled";
          if (!canEdit) {
            arg.revert();
            return;
          }
          const diffMin = (arg.event.end.getTime() - arg.event.start.getTime()) / 60000;
          const newUnits = calcUnitsFromMinutes(diffMin);
          moveSchedule(
            schedule.id,
            tenantId,
            schedule.therapist_id,
            arg.event.start,
            arg.event.end,
            newUnits
          )
            .then(() => onRefresh())
            .catch(() => arg.revert());
        }}
        height="auto"
      />

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[160px] rounded-lg border border-[#eaeaea] bg-white py-1 shadow-md"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-4 py-2 text-left text-sm text-[#111] hover:bg-[#fafafa]"
            onClick={() => {
              onEditSchedule(contextMenu.schedule);
              setContextMenu(null);
            }}
          >
            編集
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm text-[#111] hover:bg-[#fafafa]"
            onClick={() => {
              onDuplicate(contextMenu.schedule);
              setContextMenu(null);
            }}
          >
            複製
          </button>
          <div className="my-1 border-t border-[#eaeaea]" />
          {contextMenu.schedule.session_status === "scheduled" ||
          contextMenu.schedule.session_status === null ? (
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-[#fafafa]"
              style={{ color: "#dc2626" }}
              onClick={handleDeleteClick}
            >
              削除
            </button>
          ) : (
            <button
              className="w-full cursor-not-allowed px-4 py-2 text-left text-sm text-[#ccc]"
              disabled
            >
              削除不可
            </button>
          )}
        </div>
      )}

      {/* Tooltip */}
      {tooltip && tooltip.schedule && (
        <div
          className="pointer-events-none fixed z-[70] rounded-lg border border-[#eaeaea] bg-white px-3 py-2 text-xs shadow-md"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="mb-1 font-bold text-[#111]">{tooltip.schedule.patient_name}</div>
          <div className="text-[#888]">
            {format(tooltip.schedule.start_at, "HH:mm")} –{" "}
            {format(tooltip.schedule.end_at, "HH:mm")}
          </div>
          <div className="text-[#888]">{tooltip.schedule.therapist_name}</div>
          <div className="text-[#888]">{tooltip.schedule.units}単位</div>
          <div className="mt-1">
            <span
              className="rounded px-1.5 py-0.5 text-xs"
              style={{
                background:
                  myStatusBg[tooltip.schedule.session_status ?? "scheduled"]?.bg ?? "#fafafa",
                color: myStatusBg[tooltip.schedule.session_status ?? "scheduled"]?.text ?? "#888",
              }}
            >
              {tooltip.schedule.session_status === "completed"
                ? "実施済み"
                : tooltip.schedule.session_status === "draft"
                  ? "一時保存"
                  : "予約"}
            </span>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>予約を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  <strong>{deleteTarget.schedule.patient_name}</strong> の{" "}
                  <strong>
                    {format(deleteTarget.schedule.start_at, "M月d日(E) HH:mm", { locale: ja })}
                  </strong>{" "}
                  の予約を削除します。この操作は取り消せません。
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting || !canDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "削除中..." : "削除する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
