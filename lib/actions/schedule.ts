"use server";

import { db } from "@/lib/db";
import { schedules, sessions, patients, staffs } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
      patient_name: patients.name,
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
