"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ScheduleCreatePanel from "@/components/features/schedule/schedule-create-panel";
import type { ScheduleWithRelations } from "@/lib/actions/schedule";
import type { Staff } from "@/lib/types";

const CalendarView = dynamic(() => import("@/components/features/schedule/calendar-view"), {
  ssr: false,
});

type PatientRow = { id: string; name_kanji: string };

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
  const [createStart, setCreateStart] = useState<Date | null>(null);

  const handleRefresh = useCallback(() => router.refresh(), [router]);

  function openCreatePanel() {
    const now = new Date();
    const rounded = new Date(now);
    rounded.setMinutes(Math.ceil(now.getMinutes() / 20) * 20, 0, 0);
    setCreateStart(rounded);
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          onClick={openCreatePanel}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#333]"
        >
          新規予約
        </button>
      </div>

      <div className="hidden md:block">
        <CalendarView
          schedules={schedules}
          staffs={staffs}
          patients={patients}
          currentStaffId={currentStaffId ?? ""}
          tenantId={tenantId}
          onRefresh={handleRefresh}
        />
      </div>

      <div className="md:hidden">
        <p className="p-4 text-sm text-[#888]">スケジュールはPC画面でご確認ください。</p>
      </div>

      <ScheduleCreatePanel
        tenantId={tenantId}
        staffs={staffs}
        defaultTherapistId={currentStaffId}
        defaultStart={createStart}
        defaultEnd={createStart ? new Date(createStart.getTime() + 20 * 60 * 1000) : null}
        onClose={() => setCreateStart(null)}
        onCreated={() => {
          setCreateStart(null);
          handleRefresh();
        }}
      />
    </div>
  );
}
