"use server";

import { db } from "@/lib/db";
import { patients, staffs } from "@/lib/db/schema";
import { eq, and, isNull, or, ilike } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const optTherapistId = z.preprocess(
  (v) => (v === "" ? null : v),
  z.string().uuid().nullable().optional()
);

const patientSchema = z
  .object({
    patient_code: z.string().min(1, "患者IDを入力してください"),
    name_kanji: z.string().min(1, "氏名（漢字）を入力してください"),
    name_kana: z.string().min(1, "氏名（カナ）を入力してください"),
    birth_date: z.string().min(1, "生年月日を入力してください"),
    gender: z.enum(["male", "female", "other"]),
    patient_type: z.enum(["inpatient", "outpatient"]),
    insurance_type: z.enum(["medical", "workers_comp", "auto_liability"]),
    main_diagnosis: z.string().min(1, "主病名を入力してください"),
    disease_category: z.enum([
      "cerebrovascular",
      "musculoskeletal",
      "disuse_syndrome",
      "cardiovascular",
      "respiratory",
    ]),
    facility_grade: z.enum(["grade_1", "grade_2", "grade_3"]),
    rehab_start_date: z.string().min(1, "リハビリ開始日を入力してください"),
    onset_date: z.string().min(1, "起算日を入力してください"),
    onset_type: z.enum(["onset", "surgery", "acute_exacerbation"]),
    pt_therapist_id: optTherapistId,
    ot_therapist_id: optTherapistId,
    st_therapist_id: optTherapistId,
    is_nursing_care: z.boolean().default(false),
    medical_history: z.string().optional(),
  })
  .refine((d) => d.pt_therapist_id || d.ot_therapist_id || d.st_therapist_id, {
    message: "PT・OT・STのいずれか1人以上の主担当を選択してください",
    path: ["pt_therapist_id"],
  });

export type PatientFormData = z.infer<typeof patientSchema>;

export type PatientRow = {
  id: string;
  patient_code: string;
  name_kanji: string;
  name_kana: string;
  birth_date: string;
  gender: "male" | "female" | "other";
  patient_type: "inpatient" | "outpatient";
  insurance_type: "medical" | "workers_comp" | "auto_liability";
  main_diagnosis: string;
  disease_category:
    | "cerebrovascular"
    | "musculoskeletal"
    | "disuse_syndrome"
    | "cardiovascular"
    | "respiratory";
  facility_grade: "grade_1" | "grade_2" | "grade_3";
  rehab_start_date: string;
  onset_date: string;
  onset_type: "onset" | "surgery" | "acute_exacerbation";
  therapist_id: string;
  therapist_name: string;
  pt_therapist_id: string | null;
  ot_therapist_id: string | null;
  st_therapist_id: string | null;
  is_nursing_care: boolean;
  medical_history: string | null;
  deleted_at: Date | null;
};

async function assertAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function getPatients(
  tenantId: string,
  search = "",
  includeArchived = false
): Promise<PatientRow[]> {
  await assertAuth();

  const rows = await db
    .select({
      id: patients.id,
      patient_code: patients.patient_code,
      name_kanji: patients.name_kanji,
      name_kana: patients.name_kana,
      birth_date: patients.birth_date,
      gender: patients.gender,
      patient_type: patients.patient_type,
      insurance_type: patients.insurance_type,
      main_diagnosis: patients.main_diagnosis,
      disease_category: patients.disease_category,
      facility_grade: patients.facility_grade,
      rehab_start_date: patients.rehab_start_date,
      onset_date: patients.onset_date,
      onset_type: patients.onset_type,
      therapist_id: patients.therapist_id,
      therapist_name: staffs.name,
      pt_therapist_id: patients.pt_therapist_id,
      ot_therapist_id: patients.ot_therapist_id,
      st_therapist_id: patients.st_therapist_id,
      is_nursing_care: patients.is_nursing_care,
      medical_history: patients.medical_history,
      deleted_at: patients.deleted_at,
    })
    .from(patients)
    .innerJoin(staffs, eq(patients.therapist_id, staffs.id))
    .where(
      and(
        eq(patients.tenant_id, tenantId),
        includeArchived ? undefined : isNull(patients.deleted_at),
        search
          ? or(
              ilike(patients.name_kanji, `%${search}%`),
              ilike(patients.name_kana, `%${search}%`),
              ilike(patients.patient_code, `%${search}%`)
            )
          : undefined
      )
    );

  return rows.map((r) => ({
    ...r,
    therapist_name: r.therapist_name ?? "",
    pt_therapist_id: r.pt_therapist_id ?? null,
    ot_therapist_id: r.ot_therapist_id ?? null,
    st_therapist_id: r.st_therapist_id ?? null,
    medical_history: r.medical_history ?? null,
    deleted_at: r.deleted_at ?? null,
  }));
}

export async function getPatient(id: string, tenantId: string): Promise<PatientRow | null> {
  await assertAuth();

  const rows = await db
    .select({
      id: patients.id,
      patient_code: patients.patient_code,
      name_kanji: patients.name_kanji,
      name_kana: patients.name_kana,
      birth_date: patients.birth_date,
      gender: patients.gender,
      patient_type: patients.patient_type,
      insurance_type: patients.insurance_type,
      main_diagnosis: patients.main_diagnosis,
      disease_category: patients.disease_category,
      facility_grade: patients.facility_grade,
      rehab_start_date: patients.rehab_start_date,
      onset_date: patients.onset_date,
      onset_type: patients.onset_type,
      therapist_id: patients.therapist_id,
      therapist_name: staffs.name,
      pt_therapist_id: patients.pt_therapist_id,
      ot_therapist_id: patients.ot_therapist_id,
      st_therapist_id: patients.st_therapist_id,
      is_nursing_care: patients.is_nursing_care,
      medical_history: patients.medical_history,
      deleted_at: patients.deleted_at,
    })
    .from(patients)
    .innerJoin(staffs, eq(patients.therapist_id, staffs.id))
    .where(and(eq(patients.id, id), eq(patients.tenant_id, tenantId)));

  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    therapist_name: row.therapist_name ?? "",
    pt_therapist_id: row.pt_therapist_id ?? null,
    ot_therapist_id: row.ot_therapist_id ?? null,
    st_therapist_id: row.st_therapist_id ?? null,
    medical_history: row.medical_history ?? null,
    deleted_at: row.deleted_at ?? null,
  };
}

export async function createPatient(tenantId: string, input: unknown) {
  await assertAuth();
  const data = patientSchema.parse(input);

  const existing = await db.query.patients.findFirst({
    where: (p, { eq, and, isNull }) =>
      and(eq(p.tenant_id, tenantId), eq(p.patient_code, data.patient_code), isNull(p.deleted_at)),
  });
  if (existing) throw new Error(`患者ID「${data.patient_code}」は既に使用されています`);

  const therapist_id = (data.pt_therapist_id ?? data.ot_therapist_id ?? data.st_therapist_id)!;

  const [patient] = await db
    .insert(patients)
    .values({ tenant_id: tenantId, ...data, therapist_id })
    .returning();
  revalidatePath("/patients");
  return patient;
}

export async function updatePatient(id: string, tenantId: string, input: unknown) {
  await assertAuth();
  const data = patientSchema.parse(input);

  const therapist_id = (data.pt_therapist_id ?? data.ot_therapist_id ?? data.st_therapist_id)!;

  await db
    .update(patients)
    .set({ ...data, therapist_id, updated_at: new Date() })
    .where(and(eq(patients.id, id), eq(patients.tenant_id, tenantId)));

  revalidatePath("/patients");
  revalidatePath(`/patients/${id}`);
}

export async function archivePatient(id: string, tenantId: string) {
  await assertAuth();
  await db
    .update(patients)
    .set({ deleted_at: new Date() })
    .where(and(eq(patients.id, id), eq(patients.tenant_id, tenantId)));
  revalidatePath("/patients");
}

export async function restorePatient(id: string, tenantId: string) {
  await assertAuth();
  await db
    .update(patients)
    .set({ deleted_at: null, updated_at: new Date() })
    .where(and(eq(patients.id, id), eq(patients.tenant_id, tenantId)));
  revalidatePath("/patients");
}
