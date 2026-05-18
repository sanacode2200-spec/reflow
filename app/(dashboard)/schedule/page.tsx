import { getSchedules, getStaffs, getTenantId, getCurrentStaffId } from "@/lib/actions/schedule";
import ScheduleClient from "./schedule-client";
import { startOfWeek, endOfWeek } from "date-fns";

export default async function SchedulePage() {
  let tenantId: string;
  try {
    tenantId = await getTenantId();
  } catch {
    return (
      <div className="p-6">
        <p className="text-sm text-[#888]">データの取得に失敗しました。再読み込みしてください。</p>
      </div>
    );
  }

  const now = new Date();
  const from = startOfWeek(now, { weekStartsOn: 1 });
  const to = endOfWeek(now, { weekStartsOn: 1 });

  const [staffs, currentStaffId, schedules] = await Promise.all([
    getStaffs(tenantId),
    getCurrentStaffId(tenantId),
    getSchedules(tenantId, [], from, to),
  ]);

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-bold text-[#111]">スケジュール</h1>
      <ScheduleClient
        schedules={schedules}
        staffs={staffs}
        currentStaffId={currentStaffId}
        tenantId={tenantId}
      />
    </div>
  );
}
