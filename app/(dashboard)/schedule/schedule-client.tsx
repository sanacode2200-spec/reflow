"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ScheduleCreatePanel from "@/components/features/schedule/schedule-create-panel";
import SessionPanel from "@/components/features/session/session-panel";
import { Button } from "@/components/ui/button";
import type { ScheduleWithRelations } from "@/lib/actions/schedule";
import type { Staff } from "@/lib/types";

const CalendarView = dynamic(() => import("@/components/features/schedule/calendar-view"), {
  ssr: false,
});

type PatientRow = { id: string; name_kanji: string };

type PanelState =
  | { mode: "create"; start: Date; end: Date; therapistId: string }
  | { mode: "edit"; schedule: ScheduleWithRelations }
  | null;

type Props = {
  schedules: ScheduleWithRelations[];
  staffs: Staff[];
  patients: PatientRow[];
  currentStaffId: string | null;
  tenantId: string;
};

export default function ScheduleClient({
  schedules,
  staffs,
  patients,
  currentStaffId,
  tenantId,
}: Props) {
  const router = useRouter();
  const [panelState, setPanelState] = useState<PanelState>(null);
  const [recordSchedule, setRecordSchedule] = useState<ScheduleWithRelations | null>(null);

  const handleRefresh = useCallback(() => router.refresh(), [router]);

  function openCreatePanel() {
    const now = new Date();
    const rounded = new Date(now);
    rounded.setMinutes(Math.ceil(now.getMinutes() / 20) * 20, 0, 0);
    setPanelState({
      mode: "create",
      start: rounded,
      end: new Date(rounded.getTime() + 20 * 60 * 1000),
      therapistId: currentStaffId ?? staffs[0]?.id ?? "",
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex shrink-0 justify-end px-6">
        <Button
          onClick={openCreatePanel}
          className="flex items-center gap-1.5 rounded-full bg-[#6366f1] shadow-[0_8px_18px_rgba(99,102,241,0.3)] hover:bg-[#4f52e0]"
        >
          新規予約
        </Button>
      </div>

      <div className="hidden min-h-0 flex-1 overflow-hidden px-6 pb-4 md:block">
        <CalendarView
          schedules={schedules}
          staffs={staffs}
          patients={patients}
          currentStaffId={currentStaffId ?? ""}
          tenantId={tenantId}
          onRefresh={handleRefresh}
          onCreateOpen={(params) => setPanelState({ mode: "create", ...params })}
          onEditOpen={(schedule) => setPanelState({ mode: "edit", schedule })}
          onRecordOpen={(schedule) => setRecordSchedule(schedule)}
        />
      </div>

      <div className="md:hidden">
        <p className="p-4 text-sm text-[#888]">スケジュールはPC画面でご確認ください。</p>
      </div>

      <ScheduleCreatePanel
        tenantId={tenantId}
        staffs={staffs}
        defaultTherapistId={
          panelState?.mode === "create"
            ? panelState.therapistId
            : panelState?.mode === "edit"
              ? panelState.schedule.therapist_id
              : currentStaffId
        }
        defaultStart={panelState?.mode === "create" ? panelState.start : null}
        defaultEnd={panelState?.mode === "create" ? panelState.end : null}
        editSchedule={panelState?.mode === "edit" ? panelState.schedule : undefined}
        onClose={() => setPanelState(null)}
        onCreated={() => {
          setPanelState(null);
          handleRefresh();
        }}
      />

      <SessionPanel
        scheduleId={recordSchedule?.id ?? null}
        sessionId={recordSchedule?.session_id ?? null}
        tenantId={tenantId}
        onClose={() => setRecordSchedule(null)}
        onSaved={handleRefresh}
      />
    </div>
  );
}
