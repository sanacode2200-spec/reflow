import {
  getSchedules,
  getStaffs,
  getTenantId,
  getCurrentStaffId,
  getPatientsForSchedule,
} from "@/lib/actions/schedule";
import ScheduleClient from "./schedule-client";
import { subMonths, addMonths } from "date-fns";

export default async function SchedulePage() {
  let tenantId: string;
  try {
    tenantId = await getTenantId();
  } catch {
    return (
      <div className="p-6">
        <p className="text-muted-foreground text-sm">
          データの取得に失敗しました。再読み込みしてください。
        </p>
      </div>
    );
  }

  const now = new Date();
  // RehabCalendar handles week navigation internally — load a 9-month window
  const from = subMonths(now, 3);
  const to = addMonths(now, 6);

  const [staffs, currentStaffId, schedules, patients] = await Promise.all([
    getStaffs(tenantId),
    getCurrentStaffId(tenantId),
    getSchedules(tenantId, [], from, to),
    getPatientsForSchedule(tenantId),
  ]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-3">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">スケジュール</h1>
        <p className="text-muted-foreground mt-1 text-sm">週表示 · 1単位 = 20分</p>
      </div>
      <div className="min-h-0 flex-1">
        <ScheduleClient
          schedules={schedules}
          staffs={staffs}
          patients={patients}
          currentStaffId={currentStaffId}
          tenantId={tenantId}
        />
      </div>
    </div>
  );
}
