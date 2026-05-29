import { pgTable, uuid, date, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { patients } from "./patients";
import { staffs } from "./staffs";

export const rehabDocTypeEnum = pgEnum("rehab_doc_type", ["comprehensive_plan"]);

export type ComprehensivePlanContent = {
  main_disability: string;
  long_term_goal: string;
  short_term_goal: string;
  goal_period: string;
  b21_checks?: Record<string, boolean>;
  b21_text?: Record<string, string>;
  treatment_content?: string;
  comorbidities?: string;
  rest_risk?: string;
  contraindications?: string;
  body_functions?: string;
  basic_movements?: string;
  adl_scores?: string;
  assistive_devices?: string;
  monthly_status?: string;
  nutrition?: string;
  oral?: string;
  social_services?: string;
  discharge_goal?: string;
  treatment_policy?: string;
  rehab_content?: string;
  history_status?: string;
  participation_goal?: string;
  activity_goal?: string;
  concrete_approach?: string;
  family_info?: string;
  home_environment?: string;
  swallowing_status?: string;
  swallowing_plan?: string;
  guidance_content?: string;
  service_coordination?: string;
  discharge_notes?: string;
  other_plan_notes?: string;
  evaluation_date?: string;
  pt_content?: string;
  pt_frequency?: string;
  ot_content?: string;
  ot_frequency?: string;
  st_content?: string;
  st_frequency?: string;
  precautions?: string;
  doctor_name?: string;
  consent_obtained: boolean;
  consent_date?: string;
};

export const rehabDocuments = pgTable("rehab_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenant_id: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  patient_id: uuid("patient_id")
    .notNull()
    .references(() => patients.id),
  created_by: uuid("created_by")
    .notNull()
    .references(() => staffs.id),
  document_type: rehabDocTypeEnum("document_type").notNull().default("comprehensive_plan"),
  document_date: date("document_date").notNull(),
  valid_from: date("valid_from"),
  valid_to: date("valid_to"),
  content: jsonb("content").$type<ComprehensivePlanContent>(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }),
  deleted_at: timestamp("deleted_at", { withTimezone: true }),
});

export type RehabDocumentRow = typeof rehabDocuments.$inferSelect;
export type RehabDocumentInsert = typeof rehabDocuments.$inferInsert;
