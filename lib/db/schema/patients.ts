import { pgTable, uuid, text, date, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { staffs } from "./staffs";

export const genderEnum = pgEnum("gender", ["male", "female", "other"]);
export const insuranceTypeEnum = pgEnum("insurance_type", [
  "medical",
  "workers_comp",
  "auto_liability",
]);
export const onsetTypeEnum = pgEnum("onset_type", ["onset", "surgery", "acute_exacerbation"]);
export const facilityGradeEnum = pgEnum("facility_grade", ["grade_1", "grade_2", "grade_3"]);
export const diseaseCategoryEnum = pgEnum("disease_category", [
  "cerebrovascular",
  "musculoskeletal",
  "disuse_syndrome",
  "cardiovascular",
  "respiratory",
]);

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenant_id: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  patient_code: text("patient_code").notNull(),
  name_kanji: text("name_kanji").notNull(),
  name_kana: text("name_kana").notNull(),
  birth_date: date("birth_date").notNull(),
  gender: genderEnum("gender").notNull(),
  insurance_type: insuranceTypeEnum("insurance_type").notNull().default("medical"),
  main_diagnosis: text("main_diagnosis").notNull(),
  disease_category: diseaseCategoryEnum("disease_category").notNull().default("musculoskeletal"),
  facility_grade: facilityGradeEnum("facility_grade").notNull().default("grade_2"),
  rehab_start_date: date("rehab_start_date").notNull(),
  onset_date: date("onset_date").notNull(),
  onset_type: onsetTypeEnum("onset_type").notNull().default("onset"),
  therapist_id: uuid("therapist_id")
    .notNull()
    .references(() => staffs.id),
  is_nursing_care: boolean("is_nursing_care").notNull().default(false),
  medical_history: text("medical_history"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }),
  deleted_at: timestamp("deleted_at", { withTimezone: true }),
});
