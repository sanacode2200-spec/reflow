"use server";

import { db } from "@/lib/db";
import { sessions, schedules, patients, staffs, auditLogs } from "@/lib/db/schema";
import { eq, and, isNull, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkAdditions, type AdditionAlert } from "@/lib/rehab/additions";
import { format } from "date-fns";
import { requireTenantAccess } from "@/lib/actions/auth";

const sessionUpsertSchema = z.object({
  scheduleId: z.string().min(1),
  tenantId: z.string().min(1),
  sessionId: z.string().nullable(),
  status: z.enum(["draft", "completed"]),
  units: z.coerce.number().int().min(1).max(9).nullable(),
  soapSubjective: z.string().max(2000).nullable(),
  soapObjective: z.string().max(2000).nullable(),
  soapAssessment: z.string().max(2000).nullable(),
  soapPlan: z.string().max(2000).nullable(),
  isAmbulatory: z.boolean(),
  actualStartTime: z.string().nullable(),
  actualEndTime: z.string().nullable(),
  sessionDate: z.string(),
  additions: z.array(z.string()).default([]),
});

export type SessionDetail = {
  id: string;
  status: "scheduled" | "draft" | "completed";
  units: number | null;
  isAmbulatory: boolean;
  soapSubjective: string | null;
  soapObjective: string | null;
  soapAssessment: string | null;
  soapPlan: string | null;
  actualStartTime: string | null;
  actualEndTime: string | null;
  sessionDate: string;
  additions: string[];
};

export type SessionPanelData = {
  session: SessionDetail | null;
  patientName: string;
  therapistName: string;
  scheduleStartAt: string;
  scheduleEndAt: string;
  scheduleUnits: number;
  additionAlert: AdditionAlert;
};

export type SessionRecord = {
  id: string;
  scheduleId: string | null;
  sessionDate: string;
  status: "scheduled" | "draft" | "completed";
  patientId: string;
  patientName: string;
  therapistName: string;
  units: number | null;
  isAmbulatory: boolean;
  soapSubjective: string | null;
  soapObjective: string | null;
  soapAssessment: string | null;
  soapPlan: string | null;
  actualStartTime: string | null;
  actualEndTime: string | null;
  additions: string[];
};

export async function getSessionPanelData(
  scheduleId: string,
  tenantId: string
): Promise<SessionPanelData> {
  await requireTenantAccess(tenantId);

  const rows = await db
    .select({
      start_at: schedules.start_at,
      end_at: schedules.end_at,
      units: schedules.units,
      patient_name: patients.name_kanji,
      therapist_name: staffs.name,
      onset_date: patients.onset_date,
    })
    .from(schedules)
    .innerJoin(patients, eq(schedules.patient_id, patients.id))
    .innerJoin(staffs, eq(schedules.therapist_id, staffs.id))
    .where(
      and(
        eq(schedules.id, scheduleId),
        eq(schedules.tenant_id, tenantId),
        isNull(schedules.deleted_at)
      )
    )
    .limit(1);

  const row = rows[0];
  if (!row) throw new Error("予約が見つかりません");

  const sessionRow = await db.query.sessions.findFirst({
    where: (s, { eq: eqFn, and: andFn, isNull: isNullFn }) =>
      andFn(eqFn(s.schedule_id, scheduleId), eqFn(s.tenant_id, tenantId), isNullFn(s.deleted_at)),
  });

  const sessionDateStr = format(row.start_at, "yyyy-MM-dd");
  const additionAlert = checkAdditions(row.onset_date, sessionDateStr);

  return {
    session: sessionRow
      ? {
          id: sessionRow.id,
          status: sessionRow.status,
          units: sessionRow.units,
          isAmbulatory: sessionRow.is_ambulatory,
          soapSubjective: sessionRow.soap_subjective,
          soapObjective: sessionRow.soap_objective,
          soapAssessment: sessionRow.soap_assessment,
          soapPlan: sessionRow.soap_plan,
          actualStartTime: sessionRow.actual_start_time,
          actualEndTime: sessionRow.actual_end_time,
          sessionDate: sessionRow.session_date,
          additions: sessionRow.additions,
        }
      : null,
    patientName: row.patient_name,
    therapistName: row.therapist_name,
    scheduleStartAt: row.start_at.toISOString(),
    scheduleEndAt: row.end_at.toISOString(),
    scheduleUnits: row.units,
    additionAlert,
  };
}

export async function upsertSession(input: unknown) {
  const parsed = sessionUpsertSchema.parse(input);
  const { user } = await requireTenantAccess(parsed.tenantId);

  if (parsed.status === "completed") {
    if (!parsed.units) throw new Error("完了時は単位数が必要です");
    const hasSoap =
      parsed.soapSubjective?.trim() ||
      parsed.soapObjective?.trim() ||
      parsed.soapAssessment?.trim() ||
      parsed.soapPlan?.trim();
    if (!hasSoap) throw new Error("完了時は記録（S/O/A/Pいずれか）が必要です");
  }

  const schedule = await db.query.schedules.findFirst({
    where: (s, { eq: eqFn, and: andFn, isNull: isNullFn }) =>
      andFn(
        eqFn(s.id, parsed.scheduleId),
        eqFn(s.tenant_id, parsed.tenantId),
        isNullFn(s.deleted_at)
      ),
  });
  if (!schedule) throw new Error("予約が見つかりません");

  const now = new Date();

  if (parsed.sessionId) {
    const existing = await db.query.sessions.findFirst({
      where: (s, { eq: eqFn, and: andFn, isNull: isNullFn }) =>
        andFn(
          eqFn(s.id, parsed.sessionId!),
          eqFn(s.schedule_id, parsed.scheduleId),
          eqFn(s.tenant_id, parsed.tenantId),
          isNullFn(s.deleted_at)
        ),
    });
    if (!existing) throw new Error("記録が見つかりません");

    if (existing.status === "completed") {
      await db.insert(auditLogs).values({
        session_id: parsed.sessionId,
        changed_by: user.id,
        before_data: {
          status: existing.status,
          units: existing.units,
          is_ambulatory: existing.is_ambulatory,
          soap_subjective: existing.soap_subjective,
          soap_objective: existing.soap_objective,
          soap_assessment: existing.soap_assessment,
          soap_plan: existing.soap_plan,
          additions: existing.additions,
          actual_start_time: existing.actual_start_time,
          actual_end_time: existing.actual_end_time,
        },
        after_data: {
          status: parsed.status,
          units: parsed.units,
          is_ambulatory: parsed.isAmbulatory,
          soap_subjective: parsed.soapSubjective,
          soap_objective: parsed.soapObjective,
          soap_assessment: parsed.soapAssessment,
          soap_plan: parsed.soapPlan,
          additions: parsed.additions,
          actual_start_time: parsed.actualStartTime,
          actual_end_time: parsed.actualEndTime,
        },
      });
    }

    await db
      .update(sessions)
      .set({
        status: parsed.status,
        units: parsed.units,
        is_ambulatory: parsed.isAmbulatory,
        soap_subjective: parsed.soapSubjective,
        soap_objective: parsed.soapObjective,
        soap_assessment: parsed.soapAssessment,
        soap_plan: parsed.soapPlan,
        additions: parsed.additions,
        actual_start_time: parsed.actualStartTime,
        actual_end_time: parsed.actualEndTime,
        updated_at: now,
      })
      .where(and(eq(sessions.id, parsed.sessionId), eq(sessions.tenant_id, parsed.tenantId)));
  } else {
    const existing = await db.query.sessions.findFirst({
      where: (s, { eq: eqFn, and: andFn, isNull: isNullFn }) =>
        andFn(
          eqFn(s.schedule_id, parsed.scheduleId),
          eqFn(s.tenant_id, parsed.tenantId),
          isNullFn(s.deleted_at)
        ),
      columns: { id: true },
    });
    if (existing) throw new Error("この予約には既に記録があります");

    await db.insert(sessions).values({
      tenant_id: parsed.tenantId,
      schedule_id: parsed.scheduleId,
      patient_id: schedule.patient_id,
      therapist_id: schedule.therapist_id,
      session_date: parsed.sessionDate,
      status: parsed.status,
      units: parsed.units,
      is_ambulatory: parsed.isAmbulatory,
      soap_subjective: parsed.soapSubjective,
      soap_objective: parsed.soapObjective,
      soap_assessment: parsed.soapAssessment,
      soap_plan: parsed.soapPlan,
      additions: parsed.additions,
      actual_start_time: parsed.actualStartTime,
      actual_end_time: parsed.actualEndTime,
      max_units: 6,
    });
  }

  if (parsed.units) {
    const newEndAt = new Date(schedule.start_at.getTime() + parsed.units * 20 * 60 * 1000);
    await db
      .update(schedules)
      .set({ end_at: newEndAt, units: parsed.units, updated_at: now })
      .where(and(eq(schedules.id, parsed.scheduleId), eq(schedules.tenant_id, parsed.tenantId)));
  }

  revalidatePath("/schedule");
  revalidatePath("/records");
}

export async function getSessionRecords(
  tenantId: string,
  from: string,
  to: string,
  patientId?: string
): Promise<SessionRecord[]> {
  await requireTenantAccess(tenantId);

  const conditions = [
    eq(sessions.tenant_id, tenantId),
    isNull(sessions.deleted_at),
    gte(sessions.session_date, from),
    lte(sessions.session_date, to),
    ...(patientId ? [eq(sessions.patient_id, patientId)] : []),
  ];

  const rows = await db
    .select({
      id: sessions.id,
      schedule_id: sessions.schedule_id,
      session_date: sessions.session_date,
      status: sessions.status,
      patient_id: sessions.patient_id,
      patient_name: patients.name_kanji,
      therapist_name: staffs.name,
      units: sessions.units,
      is_ambulatory: sessions.is_ambulatory,
      soap_subjective: sessions.soap_subjective,
      soap_objective: sessions.soap_objective,
      soap_assessment: sessions.soap_assessment,
      soap_plan: sessions.soap_plan,
      actual_start_time: sessions.actual_start_time,
      actual_end_time: sessions.actual_end_time,
      additions: sessions.additions,
    })
    .from(sessions)
    .innerJoin(patients, eq(sessions.patient_id, patients.id))
    .innerJoin(staffs, eq(sessions.therapist_id, staffs.id))
    .where(and(...conditions))
    .orderBy(sessions.session_date);

  return rows.map((r) => ({
    id: r.id,
    scheduleId: r.schedule_id,
    sessionDate: r.session_date,
    status: r.status,
    patientId: r.patient_id,
    patientName: r.patient_name,
    therapistName: r.therapist_name,
    units: r.units,
    isAmbulatory: r.is_ambulatory,
    soapSubjective: r.soap_subjective,
    soapObjective: r.soap_objective,
    soapAssessment: r.soap_assessment,
    soapPlan: r.soap_plan,
    actualStartTime: r.actual_start_time,
    actualEndTime: r.actual_end_time,
    additions: r.additions,
  }));
}
