"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import TherapistFilter from "@/components/features/schedule/therapist-filter";
import SchedulePanel from "@/components/features/schedule/schedule-panel";
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

export default function ScheduleClient({
  schedules: initialSchedules,
  staffs,
  currentStaffId,
  tenantId,
}: Props) {
  const defaultSelected = currentStaffId ? [currentStaffId] : staffs.map((s) => s.id);
  const [selectedTherapistIds, setSelectedTherapistIds] = useState<string[]>(defaultSelected);
  const [openPanelId, setOpenPanelId] = useState<string | null>(null);
  const [schedules, setSchedules] = useState(initialSchedules);

  const filteredSchedules = schedules.filter((s) => selectedTherapistIds.includes(s.therapist_id));

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

  const handleRefresh = useCallback(() => {
    window.location.reload();
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
          onEventClick={setOpenPanelId}
          onRefresh={handleRefresh}
        />
      </div>

      <div className="md:hidden">
        <p className="p-4 text-sm text-[#888]">スケジュールはPC画面でご確認ください。</p>
      </div>

      <SchedulePanel
        scheduleId={openPanelId}
        schedules={schedules}
        onClose={() => setOpenPanelId(null)}
      />
    </div>
  );
}
