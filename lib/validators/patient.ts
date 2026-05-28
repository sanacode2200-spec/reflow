import { z } from "zod";

const optionalTherapistId = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().uuid().nullable().optional()
);

export const patientFormSchema = z
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
    pt_therapist_id: optionalTherapistId,
    ot_therapist_id: optionalTherapistId,
    st_therapist_id: optionalTherapistId,
    is_nursing_care: z.boolean().default(false),
    medical_history: z.string().optional(),
  })
  .refine((data) => data.pt_therapist_id || data.ot_therapist_id || data.st_therapist_id, {
    message: "いずれか1人以上選択してください",
    path: ["pt_therapist_id"],
  });

export type PatientForm = z.infer<typeof patientFormSchema>;

export const GENDER_OPTIONS = [
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
  { value: "other", label: "その他" },
] as const;

export const PATIENT_TYPE_OPTIONS = [
  { value: "outpatient", label: "外来通院" },
  { value: "inpatient", label: "入院中" },
] as const;

export const INSURANCE_OPTIONS = [
  { value: "medical", label: "医療保険" },
  { value: "workers_comp", label: "労災保険" },
  { value: "auto_liability", label: "自賠責保険" },
] as const;

export const ONSET_TYPE_OPTIONS = [
  { value: "onset", label: "発症日" },
  { value: "surgery", label: "手術日" },
  { value: "acute_exacerbation", label: "急性増悪日" },
] as const;

export const DISEASE_OPTIONS = [
  { value: "cerebrovascular", label: "脳血管疾患等" },
  { value: "musculoskeletal", label: "運動器" },
  { value: "disuse_syndrome", label: "廃用症候群" },
  { value: "cardiovascular", label: "心大血管" },
  { value: "respiratory", label: "呼吸器" },
] as const;

export const DISEASE_LABEL = Object.fromEntries(
  DISEASE_OPTIONS.map((option) => [option.value, option.label])
) as Record<(typeof DISEASE_OPTIONS)[number]["value"], string>;
