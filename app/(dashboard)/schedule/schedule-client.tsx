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
  const defaultSelected = currentStaffId ? [currentStaffId] : staffs.map((s) => s.id);
  const [selectedTherapistIds, setSelectedTherapistIds] = useState<string[]>(defaultSelected);
  const [openPanelId, setOpenPanelId] = useState<string | null>(null);
  const [panelIntent, setPanelIntent] = useState<PanelIntent>(null);

  const filteredSchedules = initialSchedules.filter((s) =>
    selectedTherapistIds.includes(s.therapist_id)
  );

  const handleFilterChange = useCallback(
    (ids: string[]) => {
      if (currentStaffId && !ids.includes(currentStaffId)) {
        setSelectedTherapistIds([currentStaffId, ...ids]);
      } else {
        setSelectedTherapistIds(ids);
      }
    },
    [currentStaffId]
  );

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

  return (
    <div>
      <TherapistFilter
        staffs={staffs}
        currentStaffId={currentStaffId}
        selectedIds={selectedTherapistIds}
        onChange={handleFilterChange}
      />

      <div className="hidden md:block">
        <CalendarView
          schedules={filteredSchedules}
          tenantId={tenantId}
          currentStaffId={currentStaffId}
          orderedStaffIds={selectedTherapistIds}
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
        defaultTherapistId={
          panelIntent?.mode === "create"
            ? (panelIntent.therapistId ?? currentStaffId)
            : currentStaffId
        }
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
