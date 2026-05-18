import { pgTable, uuid, text, date, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { staffs } from "./staffs";

export const genderEnum = pgEnum("gender", ["male", "female", "other"]);
export const insuranceTypeEnum = pgEnum("insurance_type", ["medical", "workers_comp", "auto"]);
export const onsetDateTypeEnum = pgEnum("onset_date_type", ["onset", "surgery", "exacerbation"]);
export const diseaseCategoryEnum = pgEnum("disease_category", [
  "cerebrovascular",
  "musculoskeletal",
  "disuse_syndrome",
  "cardiac",
  "respiratory",
]);

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenant_id: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  patient_code: text("patient_code").notNull(),
  name: text("name").notNull(),
  name_kana: text("name_kana").notNull(),
  birth_date: date("birth_date").notNull(),
  gender: genderEnum("gender").notNull(),
  insurance_type: insuranceTypeEnum("insurance_type").notNull().default("medical"),
  diagnosis: text("diagnosis").notNull(),
  disease_category: diseaseCategoryEnum("disease_category").notNull().default("musculoskeletal"),
  rehab_start_date: date("rehab_start_date").notNull(),
  onset_date: date("onset_date").notNull(),
  onset_date_type: onsetDateTypeEnum("onset_date_type").notNull().default("onset"),
  therapist_id: uuid("therapist_id").references(() => staffs.id),
  is_care_insured: boolean("is_care_insured").notNull().default(false),
  notes: text("notes"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }),
  deleted_at: timestamp("deleted_at", { withTimezone: true }),
});
