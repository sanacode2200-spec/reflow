"use server";

import { db } from "@/lib/db";
import { rehabDocuments, patients, staffs } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireTenantAccess } from "@/lib/actions/auth";
import { rehabDocumentSchema } from "@/lib/validators/rehab-document";

export type RehabDocumentListItem = {
  id: string;
  document_date: string;
  valid_from: string | null;
  valid_to: string | null;
  patient_id: string;
  patient_name: string;
  patient_code: string;
  created_by: string;
  creator_name: string;
  document_type: "comprehensive_plan";
  created_at: Date;
};

async function getTenantPatient(patientId: string, tenantId: string) {
  return db.query.patients.findFirst({
    where: (p, { eq, and, isNull }) =>
      and(eq(p.id, patientId), eq(p.tenant_id, tenantId), isNull(p.deleted_at)),
    columns: { id: true },
  });
}

export async function getRehabDocuments(
  tenantId: string,
  patientId?: string
): Promise<RehabDocumentListItem[]> {
  await requireTenantAccess(tenantId);

  const rows = await db
    .select({
      id: rehabDocuments.id,
      document_date: rehabDocuments.document_date,
      valid_from: rehabDocuments.valid_from,
      valid_to: rehabDocuments.valid_to,
      patient_id: rehabDocuments.patient_id,
      patient_name: patients.name_kanji,
      patient_code: patients.patient_code,
      created_by: rehabDocuments.created_by,
      creator_name: staffs.name,
      document_type: rehabDocuments.document_type,
      created_at: rehabDocuments.created_at,
    })
    .from(rehabDocuments)
    .innerJoin(patients, eq(rehabDocuments.patient_id, patients.id))
    .innerJoin(staffs, eq(rehabDocuments.created_by, staffs.id))
    .where(
      and(
        eq(rehabDocuments.tenant_id, tenantId),
        isNull(rehabDocuments.deleted_at),
        patientId ? eq(rehabDocuments.patient_id, patientId) : undefined
      )
    )
    .orderBy(desc(rehabDocuments.document_date));

  return rows;
}

export async function getRehabDocument(id: string, tenantId: string) {
  await requireTenantAccess(tenantId);

  const row = await db.query.rehabDocuments.findFirst({
    where: (d, { eq, and, isNull }) =>
      and(eq(d.id, id), eq(d.tenant_id, tenantId), isNull(d.deleted_at)),
  });

  return row ?? null;
}

export async function createRehabDocument(
  tenantId: string,
  input: unknown
): Promise<{ error: string } | { id: string }> {
  const { user } = await requireTenantAccess(tenantId);

  const parsed = rehabDocumentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力内容を確認してください" };
  }

  const data = parsed.data;
  const patient = await getTenantPatient(data.patient_id, tenantId);
  if (!patient) return { error: "患者が見つかりません" };

  const staff = await db.query.staffs.findFirst({
    where: (s, { eq, and, isNull }) =>
      and(eq(s.email, user.email ?? ""), eq(s.tenant_id, tenantId), isNull(s.deleted_at)),
    columns: { id: true },
  });
  if (!staff) return { error: "ログイン中のスタッフが見つかりません" };

  const [doc] = await db
    .insert(rehabDocuments)
    .values({
      tenant_id: tenantId,
      patient_id: data.patient_id,
      created_by: staff.id,
      document_date: data.document_date,
      valid_from: data.valid_from || null,
      valid_to: data.valid_to || null,
      content: data.content,
    })
    .returning({ id: rehabDocuments.id });

  revalidatePath("/documents");
  revalidatePath(`/patients/${data.patient_id}/documents`);
  if (!doc) return { error: "計画書の作成に失敗しました" };
  return { id: doc.id };
}

export async function updateRehabDocument(
  id: string,
  tenantId: string,
  input: unknown
): Promise<{ error: string } | void> {
  await requireTenantAccess(tenantId);

  const parsed = rehabDocumentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力内容を確認してください" };
  }

  const data = parsed.data;
  const [existing, patient] = await Promise.all([
    db.query.rehabDocuments.findFirst({
      where: (d, { eq, and, isNull }) =>
        and(eq(d.id, id), eq(d.tenant_id, tenantId), isNull(d.deleted_at)),
      columns: { patient_id: true },
    }),
    getTenantPatient(data.patient_id, tenantId),
  ]);

  if (!existing) return { error: "計画書が見つかりません" };
  if (!patient) return { error: "患者が見つかりません" };

  await db
    .update(rehabDocuments)
    .set({
      patient_id: data.patient_id,
      document_date: data.document_date,
      valid_from: data.valid_from || null,
      valid_to: data.valid_to || null,
      content: data.content,
      updated_at: new Date(),
    })
    .where(
      and(
        eq(rehabDocuments.id, id),
        eq(rehabDocuments.tenant_id, tenantId),
        isNull(rehabDocuments.deleted_at)
      )
    );

  revalidatePath("/documents");
  revalidatePath(`/documents/${id}`);
  revalidatePath(`/patients/${existing.patient_id}/documents`);
  revalidatePath(`/patients/${existing.patient_id}/documents/${id}`);
  revalidatePath(`/patients/${data.patient_id}/documents`);
  revalidatePath(`/patients/${data.patient_id}/documents/${id}`);
}

export async function deleteRehabDocument(
  id: string,
  tenantId: string
): Promise<{ error: string } | void> {
  await requireTenantAccess(tenantId);
  const existing = await db.query.rehabDocuments.findFirst({
    where: (d, { eq, and, isNull }) =>
      and(eq(d.id, id), eq(d.tenant_id, tenantId), isNull(d.deleted_at)),
    columns: { patient_id: true },
  });
  if (!existing) return { error: "計画書が見つかりません" };

  await db
    .update(rehabDocuments)
    .set({ deleted_at: new Date() })
    .where(
      and(
        eq(rehabDocuments.id, id),
        eq(rehabDocuments.tenant_id, tenantId),
        isNull(rehabDocuments.deleted_at)
      )
    );

  revalidatePath("/documents");
  revalidatePath(`/documents/${id}`);
  revalidatePath(`/patients/${existing.patient_id}/documents`);
  revalidatePath(`/patients/${existing.patient_id}/documents/${id}`);
  revalidatePath("/patients/[id]/documents", "page");
}
