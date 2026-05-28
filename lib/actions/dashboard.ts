"use server";

import { db } from "@/lib/db";
import { schedules, patients, staffs, sessions, reminders } from "@/lib/db/schema";
import { eq, and, isNull, gte, lte, sum, count } from "drizzle-orm";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  differenceInDays,
  addDays,
  parseISO,
  format,
} from "date-fns";
import { requireTenantAccess } from "@/lib/actions/auth";

const STANDARD_DAYS: Record<string, number> = {
  cerebrovascular: 180,
  musculoskeletal: 150,
  disuse_syndrome: 120,
  cardiovascular: 150,
  respiratory: 90,
};

export type TodayScheduleRow = {
  id: string;
  start_at: Date;
  end_at: Date;
  units: number;
  patient_name: string;
  therapist_name: string;
  therapist_occupation: string;
  session_status: "scheduled" | "draft" | "completed" | null;
  is_cancelled: boolean;
};

export type AlertRow = {
  patient_id: string;
  patient_name: string;
  type: "early_addition" | "initial_addition" | "expiry_warning";
  daysRemaining: number;
  label: string;
};

export type DashboardStats = {
  todayCount: number;
  weeklyUnits: number;
  weeklyUnitLimit: number;
  outpatientCount: number;
  inpatientCount: number;
  alertCount: number;
};

export type StatusCounts = {
  scheduled: number;
  draft: number;
  completed: number;
  cancelled: number;
};

export type ReminderRow = {
  id: string;
  title: string;
  reminder_at: Date;
};

export async function getDashboardData(tenantId: string): Promise<{
  stats: DashboardStats;
  statusCounts: StatusCounts;
  todaySchedules: TodayScheduleRow[];
  alerts: AlertRow[];
  todayReminders: ReminderRow[];
}> {
  const { user } = await requireTenantAccess(tenantId);

  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  // ログイン中スタッフを特定
  const currentStaff = await db.query.staffs.findFirst({
    where: (s, { eq, and, isNull }) =>
      and(eq(s.email, user.email ?? ""), eq(s.tenant_id, tenantId), isNull(s.deleted_at)),
  });

  const staffFilter = currentStaff ? eq(schedules.therapist_id, currentStaff.id) : undefined;
  const sessionStaffFilter = currentStaff ? eq(sessions.therapist_id, currentStaff.id) : undefined;
  const patientStaffFilter = currentStaff ? eq(patients.therapist_id, currentStaff.id) : undefined;

  const [
    [todayCountRow],
    [weeklyUnitsRow],
    [outpatientCountRow],
    [inpatientCountRow],
    todaySchedules,
    allActivePatients,
    todayStatusRows,
    todayReminderRows,
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(schedules)
      .where(
        and(
          eq(schedules.tenant_id, tenantId),
          isNull(schedules.deleted_at),
          gte(schedules.start_at, dayStart),
          lte(schedules.start_at, dayEnd),
          staffFilter
        )
      ),
    db
      .select({ value: sum(sessions.units) })
      .from(sessions)
      .where(
        and(
          eq(sessions.tenant_id, tenantId),
          isNull(sessions.deleted_at),
          eq(sessions.status, "completed"),
          gte(sessions.session_date, format(weekStart, "yyyy-MM-dd")),
          lte(sessions.session_date, format(weekEnd, "yyyy-MM-dd")),
          sessionStaffFilter
        )
      ),
    db
      .select({ value: count() })
      .from(patients)
      .where(
        and(
          eq(patients.tenant_id, tenantId),
          isNull(patients.deleted_at),
          eq(patients.patient_type, "outpatient"),
          patientStaffFilter
        )
      ),
    db
      .select({ value: count() })
      .from(patients)
      .where(
        and(
          eq(patients.tenant_id, tenantId),
          isNull(patients.deleted_at),
          eq(patients.patient_type, "inpatient"),
          patientStaffFilter
        )
      ),
    db
      .select({
        id: schedules.id,
        start_at: schedules.start_at,
        end_at: schedules.end_at,
        units: schedules.units,
        patient_name: patients.name_kanji,
        therapist_name: staffs.name,
        therapist_occupation: staffs.occupation,
        session_status: sessions.status,
        is_cancelled: schedules.is_cancelled,
      })
      .from(schedules)
      .leftJoin(patients, eq(schedules.patient_id, patients.id))
      .leftJoin(staffs, eq(schedules.therapist_id, staffs.id))
      .leftJoin(sessions, and(eq(sessions.schedule_id, schedules.id), isNull(sessions.deleted_at)))
      .where(
        and(
          eq(schedules.tenant_id, tenantId),
          isNull(schedules.deleted_at),
          gte(schedules.start_at, dayStart),
          lte(schedules.start_at, dayEnd),
          staffFilter
        )
      )
      .orderBy(schedules.start_at),
    db
      .select({
        id: patients.id,
        name_kanji: patients.name_kanji,
        rehab_start_date: patients.rehab_start_date,
        onset_date: patients.onset_date,
        disease_category: patients.disease_category,
      })
      .from(patients)
      .where(and(eq(patients.tenant_id, tenantId), isNull(patients.deleted_at))),
    // 本日のスケジュール×セッションステータス（自分のみ）
    db
      .select({ status: sessions.status, is_cancelled: schedules.is_cancelled })
      .from(schedules)
      .leftJoin(sessions, and(eq(sessions.schedule_id, schedules.id), isNull(sessions.deleted_at)))
      .where(
        and(
          eq(schedules.tenant_id, tenantId),
          isNull(schedules.deleted_at),
          gte(schedules.start_at, dayStart),
          lte(schedules.start_at, dayEnd),
          staffFilter
        )
      ),
    currentStaff
      ? db
          .select({
            id: reminders.id,
            title: reminders.title,
            reminder_at: reminders.reminder_at,
          })
          .from(reminders)
          .where(
            and(
              eq(reminders.tenant_id, tenantId),
              eq(reminders.staff_id, currentStaff.id),
              isNull(reminders.deleted_at),
              gte(reminders.reminder_at, dayStart),
              lte(reminders.reminder_at, dayEnd)
            )
          )
          .orderBy(reminders.reminder_at)
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  const alerts: AlertRow[] = [];

  for (const p of allActivePatients) {
    const rehabStart = parseISO(p.rehab_start_date);
    const onset = parseISO(p.onset_date);
    const daysSinceRehab = differenceInDays(now, rehabStart);
    const standardDays = STANDARD_DAYS[p.disease_category] ?? 150;
    const expiryDate = addDays(onset, standardDays);
    const daysToExpiry = differenceInDays(expiryDate, now);

    // 初期加算（14日以内）
    if (daysSinceRehab >= 0 && daysSinceRehab <= 14) {
      alerts.push({
        patient_id: p.id,
        patient_name: p.name_kanji,
        type: "initial_addition",
        daysRemaining: 14 - daysSinceRehab,
        label: "初期加算対象",
      });
    }
    // 早期加算（15〜30日、初期加算と重複しない）
    else if (daysSinceRehab > 14 && daysSinceRehab <= 30) {
      alerts.push({
        patient_id: p.id,
        patient_name: p.name_kanji,
        type: "early_addition",
        daysRemaining: 30 - daysSinceRehab,
        label: "早期加算対象",
      });
    }

    // 算定日数14日以内
    if (daysToExpiry >= 0 && daysToExpiry <= 14) {
      alerts.push({
        patient_id: p.id,
        patient_name: p.name_kanji,
        type: "expiry_warning",
        daysRemaining: daysToExpiry,
        label: "算定日数終了間近",
      });
    }
  }

  // 重複を除いたアラート数（患者単位）
  const alertPatientIds = new Set(alerts.map((a) => a.patient_id));

  const statusCounts: StatusCounts = { scheduled: 0, draft: 0, completed: 0, cancelled: 0 };
  for (const row of todayStatusRows) {
    if (row.is_cancelled) {
      statusCounts.cancelled++;
      continue;
    }
    const s = row.status ?? "scheduled";
    if (s === "draft") statusCounts.draft++;
    else if (s === "completed") statusCounts.completed++;
    else statusCounts.scheduled++;
  }

  return {
    stats: {
      todayCount: todayCountRow?.value ?? 0,
      weeklyUnits: Number(weeklyUnitsRow?.value ?? 0),
      weeklyUnitLimit: currentStaff?.max_units_per_week ?? 108,
      outpatientCount: outpatientCountRow?.value ?? 0,
      inpatientCount: inpatientCountRow?.value ?? 0,
      alertCount: alertPatientIds.size,
    },
    statusCounts,
    todayReminders: todayReminderRows,
    todaySchedules: todaySchedules.map((s) => ({
      ...s,
      patient_name: s.patient_name ?? "",
      therapist_name: s.therapist_name ?? "",
      therapist_occupation: s.therapist_occupation ?? "pt",
    })),
    alerts,
  };
}
