"use server";

import { db } from "@/lib/db";
import { schedules, sessions, patients, staffs } from "@/lib/db/schema";
import { eq, and, isNull, lt, gt, ne, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";

const PATIENT_MAX_UNITS_PER_DAY = 6; // Phase1固定

const scheduleCreateSchema = z.object({
  patient_id: z.string().uuid("患者を選択してください"),
  therapist_id: z.string().uuid("療法士を選択してください"),
  start_at: z.string().min(1, "開始時刻を入力してください"),
  end_at: z.string().min(1, "終了時刻を入力してください"),
  units: z.coerce.number().int().min(1).max(9),
  // "yyyy-MM-dd" 形式の追加日付（ベース日以外にコピーする日）
  extra_dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).default([]),
});

export type ScheduleWithRelations = {
  id: string;
  patient_id: string;
  therapist_id: string;
  start_at: Date;
  end_at: Date;
  units: number;
  recurrence_rule: string | null;
  recurrence_group_id: string | null;
  patient_name: string;
  therapist_name: string;
  session_status: "scheduled" | "draft" | "completed" | null;
  session_id: string | null;
};

export async function getSchedules(
  tenantId: string,
  therapistIds: string[],
  from: Date,
  to: Date
): Promise<ScheduleWithRelations[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const rows = await db
    .select({
      id: schedules.id,
      patient_id: schedules.patient_id,
      therapist_id: schedules.therapist_id,
      start_at: schedules.start_at,
      end_at: schedules.end_at,
      units: schedules.units,
      recurrence_rule: schedules.recurrence_rule,
      recurrence_group_id: schedules.recurrence_group_id,
      patient_name: patients.name_kanji,
      therapist_name: staffs.name,
      session_status: sessions.status,
      session_id: sessions.id,
    })
    .from(schedules)
    .innerJoin(patients, eq(schedules.patient_id, patients.id))
    .innerJoin(staffs, eq(schedules.therapist_id, staffs.id))
    .leftJoin(sessions, eq(sessions.schedule_id, schedules.id))
    .where(and(eq(schedules.tenant_id, tenantId), isNull(schedules.deleted_at)));

  return rows
    .filter((r) => {
      if (therapistIds.length > 0 && !therapistIds.includes(r.therapist_id)) return false;
      const start = new Date(r.start_at);
      return start >= from && start <= to;
    })
    .map((r) => ({
      ...r,
      start_at: new Date(r.start_at),
      end_at: new Date(r.end_at),
    }));
}

export async function deleteSchedule(scheduleId: string, tenantId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await db
    .update(schedules)
    .set({ deleted_at: new Date() })
    .where(
      and(
        eq(schedules.id, scheduleId),
        eq(schedules.tenant_id, tenantId),
        isNull(schedules.deleted_at)
      )
    );

  revalidatePath("/schedule");
}

export async function getTenantId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const profile = await db.query.profiles.findFirst({
    where: (p, { eq }) => eq(p.id, user.id),
  });

  if (!profile) throw new Error("Profile not found");
  return profile.tenant_id;
}

export async function getStaffs(tenantId: string) {
  return db
    .select({ id: staffs.id, name: staffs.name, occupation: staffs.occupation })
    .from(staffs)
    .where(and(eq(staffs.tenant_id, tenantId), isNull(staffs.deleted_at)));
}

export async function getCurrentStaffId(tenantId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const staff = await db.query.staffs.findFirst({
    where: (s, { eq, and, isNull }) =>
      and(eq(s.tenant_id, tenantId), eq(s.email, user.email ?? ""), isNull(s.deleted_at)),
  });

  return staff?.id ?? null;
}

export async function getPatientsForSchedule(
  tenantId: string
): Promise<{ id: string; name_kanji: string; name_kana: string }[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  return db
    .select({ id: patients.id, name_kanji: patients.name_kanji, name_kana: patients.name_kana })
    .from(patients)
    .where(and(eq(patients.tenant_id, tenantId), isNull(patients.deleted_at)))
    .orderBy(patients.name_kana);
}

export async function createSchedule(tenantId: string, input: unknown) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const parsed = scheduleCreateSchema.parse(input);
  const startAt = new Date(parsed.start_at);
  const endAt = new Date(parsed.end_at);

  if (endAt <= startAt) throw new Error("終了時刻は開始時刻より後にしてください");

  const therapist = await db.query.staffs.findFirst({
    where: (s, { eq: eqFn, and: andFn, isNull: isNullFn }) =>
      andFn(eqFn(s.id, parsed.therapist_id), eqFn(s.tenant_id, tenantId), isNullFn(s.deleted_at)),
    columns: { max_units_per_day: true, max_units_per_week: true },
  });
  if (!therapist) throw new Error("療法士が見つかりません");

  const { max_units_per_day, max_units_per_week } = therapist;

  const durationMs = endAt.getTime() - startAt.getTime();
  const baseTime = { h: startAt.getHours(), m: startAt.getMinutes() };

  // ベース日 + 追加日付からoccurrencesを構築
  const occurrences: { start: Date; end: Date }[] = [{ start: startAt, end: endAt }];
  for (const dateStr of parsed.extra_dates) {
    const d = new Date(`${dateStr}T00:00:00`);
    const start = new Date(d);
    start.setHours(baseTime.h, baseTime.m, 0, 0);
    const end = new Date(start.getTime() + durationMs);
    occurrences.push({ start, end });
  }

  for (const occ of occurrences) {
    // 時間重複チェック（同一療法士）
    const overlaps = await db
      .select({ id: schedules.id })
      .from(schedules)
      .where(
        and(
          eq(schedules.tenant_id, tenantId),
          eq(schedules.therapist_id, parsed.therapist_id),
          isNull(schedules.deleted_at),
          lt(schedules.start_at, occ.end),
          gt(schedules.end_at, occ.start)
        )
      );
    if (overlaps.length > 0) {
      const d = occ.start.toLocaleDateString("ja", { month: "long", day: "numeric" });
      throw new Error(`${d} は同じ療法士の予約と時間が重複しています`);
    }

    const dayStart = startOfDay(occ.start);
    const dayEnd = endOfDay(occ.start);
    const weekStart = startOfWeek(occ.start, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(occ.start, { weekStartsOn: 1 });

    // 療法士 1日上限
    const therapistDayRows = await db
      .select({ units: schedules.units })
      .from(schedules)
      .where(
        and(
          eq(schedules.tenant_id, tenantId),
          eq(schedules.therapist_id, parsed.therapist_id),
          isNull(schedules.deleted_at),
          gte(schedules.start_at, dayStart),
          lte(schedules.start_at, dayEnd)
        )
      );
    const therapistDayUnits = therapistDayRows.reduce((s, r) => s + r.units, 0);
    if (therapistDayUnits + parsed.units > max_units_per_day) {
      const d = occ.start.toLocaleDateString("ja", { month: "long", day: "numeric" });
      throw new Error(
        `${d} は療法士の1日上限（${max_units_per_day}単位）を超えます（現在 ${therapistDayUnits}単位）`
      );
    }

    // 療法士 週上限
    const therapistWeekRows = await db
      .select({ units: schedules.units })
      .from(schedules)
      .where(
        and(
          eq(schedules.tenant_id, tenantId),
          eq(schedules.therapist_id, parsed.therapist_id),
          isNull(schedules.deleted_at),
          gte(schedules.start_at, weekStart),
          lte(schedules.start_at, weekEnd)
        )
      );
    const therapistWeekUnits = therapistWeekRows.reduce((s, r) => s + r.units, 0);
    if (therapistWeekUnits + parsed.units > max_units_per_week) {
      const d = occ.start.toLocaleDateString("ja", { month: "long", day: "numeric" });
      throw new Error(
        `${d} の週は療法士の週上限（${max_units_per_week}単位）を超えます（現在 ${therapistWeekUnits}単位）`
      );
    }

    // 患者 1日上限（Phase1: 6単位固定）
    const patientDayRows = await db
      .select({ units: schedules.units })
      .from(schedules)
      .where(
        and(
          eq(schedules.tenant_id, tenantId),
          eq(schedules.patient_id, parsed.patient_id),
          isNull(schedules.deleted_at),
          gte(schedules.start_at, dayStart),
          lte(schedules.start_at, dayEnd)
        )
      );
    const patientDayUnits = patientDayRows.reduce((s, r) => s + r.units, 0);
    if (patientDayUnits + parsed.units > PATIENT_MAX_UNITS_PER_DAY) {
      const d = occ.start.toLocaleDateString("ja", { month: "long", day: "numeric" });
      throw new Error(
        `${d} は患者の1日上限（${PATIENT_MAX_UNITS_PER_DAY}単位）を超えます（現在 ${patientDayUnits}単位）`
      );
    }
  }

  const recurrenceGroupId = occurrences.length > 1 ? crypto.randomUUID() : null;

  await db.insert(schedules).values(
    occurrences.map((occ) => ({
      tenant_id: tenantId,
      patient_id: parsed.patient_id,
      therapist_id: parsed.therapist_id,
      start_at: occ.start,
      end_at: occ.end,
      units: parsed.units,
      recurrence_rule: occurrences.length > 1 ? "CUSTOM" : null,
      recurrence_group_id: recurrenceGroupId,
    }))
  );

  revalidatePath("/schedule");
}

export async function moveSchedule(
  scheduleId: string,
  tenantId: string,
  startAt: Date,
  endAt: Date
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const existing = await db.query.schedules.findFirst({
    where: (s, { eq: eqFn, and: andFn, isNull: isNullFn }) =>
      andFn(eqFn(s.id, scheduleId), eqFn(s.tenant_id, tenantId), isNullFn(s.deleted_at)),
  });
  if (!existing) throw new Error("予約が見つかりません");

  const overlaps = await db
    .select({ id: schedules.id })
    .from(schedules)
    .where(
      and(
        eq(schedules.tenant_id, tenantId),
        eq(schedules.therapist_id, existing.therapist_id),
        ne(schedules.id, scheduleId),
        isNull(schedules.deleted_at),
        lt(schedules.start_at, endAt),
        gt(schedules.end_at, startAt)
      )
    );
  if (overlaps.length > 0) throw new Error("移動先の時間帯に別の予約があります");

  await db
    .update(schedules)
    .set({ start_at: startAt, end_at: endAt, updated_at: new Date() })
    .where(and(eq(schedules.id, scheduleId), eq(schedules.tenant_id, tenantId)));

  revalidatePath("/schedule");
}
