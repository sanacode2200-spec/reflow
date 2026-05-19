"use server";

import { db } from "@/lib/db";
import { schedules, patients, staffs, sessions } from "@/lib/db/schema";
import { eq, and, isNull, gte, lte, sum, count } from "drizzle-orm";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  differenceInDays,
  addDays,
  parseISO,
} from "date-fns";
import { createClient } from "@/lib/supabase/server";

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
  activePatients: number;
  alertCount: number;
};

export async function getDashboardData(tenantId: string): Promise<{
  stats: DashboardStats;
  todaySchedules: TodayScheduleRow[];
  alerts: AlertRow[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  // 今日の予約数
  const [todayCountRow] = await db
    .select({ value: count() })
    .from(schedules)
    .where(
      and(
        eq(schedules.tenant_id, tenantId),
        isNull(schedules.deleted_at),
        gte(schedules.start_at, dayStart),
        lte(schedules.start_at, dayEnd)
      )
    );

  // 今週の総単位数
  const [weeklyUnitsRow] = await db
    .select({ value: sum(schedules.units) })
    .from(schedules)
    .where(
      and(
        eq(schedules.tenant_id, tenantId),
        isNull(schedules.deleted_at),
        gte(schedules.start_at, weekStart),
        lte(schedules.start_at, weekEnd)
      )
    );

  // アクティブ患者数
  const [patientCountRow] = await db
    .select({ value: count() })
    .from(patients)
    .where(and(eq(patients.tenant_id, tenantId), isNull(patients.deleted_at)));

  // 今日のスケジュール（患者・療法士・セッションステータス結合）
  const todaySchedules = await db
    .select({
      id: schedules.id,
      start_at: schedules.start_at,
      end_at: schedules.end_at,
      units: schedules.units,
      patient_name: patients.name_kanji,
      therapist_name: staffs.name,
      therapist_occupation: staffs.occupation,
      session_status: sessions.status,
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
        lte(schedules.start_at, dayEnd)
      )
    )
    .orderBy(schedules.start_at);

  // アラート計算（患者情報を取得してJS側で判定）
  const allActivePatients = await db
    .select({
      id: patients.id,
      name_kanji: patients.name_kanji,
      rehab_start_date: patients.rehab_start_date,
      onset_date: patients.onset_date,
      disease_category: patients.disease_category,
    })
    .from(patients)
    .where(and(eq(patients.tenant_id, tenantId), isNull(patients.deleted_at)));

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

  return {
    stats: {
      todayCount: todayCountRow?.value ?? 0,
      weeklyUnits: Number(weeklyUnitsRow?.value ?? 0),
      activePatients: patientCountRow?.value ?? 0,
      alertCount: alertPatientIds.size,
    },
    todaySchedules: todaySchedules.map((s) => ({
      ...s,
      patient_name: s.patient_name ?? "",
      therapist_name: s.therapist_name ?? "",
      therapist_occupation: s.therapist_occupation ?? "pt",
    })),
    alerts,
  };
}
