"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import TherapistFilter from "@/components/features/schedule/therapist-filter";
import SchedulePanel from "@/components/features/schedule/schedule-panel";
import ScheduleCreatePanel from "@/components/features/schedule/schedule-create-panel";
import type { ScheduleWithRelations } from "@/lib/actions/schedule";

const CalendarView = dynamic(() => import("@/components/features/schedule/calendar-view"), {
  ssr: false,
});

type Staff = { id: string; name: string; occupation: string };

type Props = {
  schedules: ScheduleWithRelations[];
  staffs: Staff[];
  currentStaffId: string | null;
  tenantId: string;
};

type PanelIntent =
  | {
      mode: "create";
      start: Date;
      end: Date;
      patientId?: string;
      patientName?: string;
      therapistId?: string;
    }
  | { mode: "edit"; schedule: ScheduleWithRelations }
  | null;

export default function ScheduleClient({
  schedules: initialSchedules,
  staffs,
  currentStaffId,
  tenantId,
}: Props) {
  const router = useRouter();
  const [selectedStaffId, setSelectedStaffId] = useState<string | "all">(currentStaffId ?? "all");
  const [openPanelId, setOpenPanelId] = useState<string | null>(null);
  const [panelIntent, setPanelIntent] = useState<PanelIntent>(null);

  const filteredSchedules =
    selectedStaffId === "all"
      ? initialSchedules
      : initialSchedules.filter((s) => s.therapist_id === selectedStaffId);

  // 表示中のスタッフが「自分」かどうかに関わらず、選択中スタッフのイベントを主役の色で表示する
  const activeStaffId = selectedStaffId === "all" ? currentStaffId : selectedStaffId;

  // 全員表示時のグレー順序（ログインユーザーが先頭）
  const orderedStaffIds =
    selectedStaffId === "all"
      ? [
          ...(currentStaffId ? [currentStaffId] : []),
          ...staffs.filter((s) => s.id !== currentStaffId).map((s) => s.id),
        ]
      : [selectedStaffId];

  const handleRefresh = useCallback(() => router.refresh(), [router]);

  const handleSelect = useCallback((start: Date, end: Date) => {
    setOpenPanelId(null);
    setPanelIntent({ mode: "create", start, end });
  }, []);

  const handleDuplicate = useCallback((schedule: ScheduleWithRelations) => {
    setOpenPanelId(null);
    setPanelIntent({
      mode: "create",
      start: schedule.start_at,
      end: schedule.end_at,
      patientId: schedule.patient_id,
      patientName: schedule.patient_name,
      therapistId: schedule.therapist_id,
    });
  }, []);

  // 予約作成時のデフォルト担当者: 選択中スタッフ → ログインユーザー
  const defaultCreateTherapistId =
    panelIntent?.mode === "create"
      ? (panelIntent.therapistId ?? (selectedStaffId !== "all" ? selectedStaffId : currentStaffId))
      : selectedStaffId !== "all"
        ? selectedStaffId
        : currentStaffId;

  return (
    <div>
      <TherapistFilter
        staffs={staffs}
        currentStaffId={currentStaffId}
        selectedId={selectedStaffId}
        onChange={setSelectedStaffId}
      />

      <div className="hidden md:block">
        <CalendarView
          schedules={filteredSchedules}
          tenantId={tenantId}
          currentStaffId={activeStaffId}
          orderedStaffIds={orderedStaffIds}
          onEventClick={(id) => {
            setPanelIntent(null);
            setOpenPanelId(id);
          }}
          onEditSchedule={(schedule) => {
            setOpenPanelId(null);
            setPanelIntent({ mode: "edit", schedule });
          }}
          onSelect={handleSelect}
          onDuplicate={handleDuplicate}
          onRefresh={handleRefresh}
        />
      </div>

      <div className="md:hidden">
        <p className="p-4 text-sm text-[#888]">スケジュールはPC画面でご確認ください。</p>
      </div>

      <SchedulePanel
        scheduleId={openPanelId}
        schedules={initialSchedules}
        onClose={() => setOpenPanelId(null)}
      />

      <ScheduleCreatePanel
        tenantId={tenantId}
        staffs={staffs}
        defaultTherapistId={defaultCreateTherapistId}
        defaultStart={panelIntent?.mode === "create" ? panelIntent.start : null}
        defaultEnd={panelIntent?.mode === "create" ? panelIntent.end : null}
        defaultPatientId={panelIntent?.mode === "create" ? panelIntent.patientId : undefined}
        defaultPatientName={panelIntent?.mode === "create" ? panelIntent.patientName : undefined}
        editSchedule={panelIntent?.mode === "edit" ? panelIntent.schedule : undefined}
        onClose={() => setPanelIntent(null)}
        onCreated={handleRefresh}
      />
    </div>
  );
}
