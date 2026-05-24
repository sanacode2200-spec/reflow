import {
  pgTable,
  uuid,
  integer,
  boolean,
  timestamp,
  text,
  date,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants";
import { patients } from "./patients";
import { staffs } from "./staffs";
import { schedules } from "./schedules";

export const sessionStatusEnum = pgEnum("session_status", ["scheduled", "draft", "completed"]);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenant_id: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  schedule_id: uuid("schedule_id").references(() => schedules.id),
  patient_id: uuid("patient_id")
    .notNull()
    .references(() => patients.id),
  therapist_id: uuid("therapist_id")
    .notNull()
    .references(() => staffs.id),
  session_date: date("session_date").notNull(),
  status: sessionStatusEnum("status").notNull().default("scheduled"),
  units: integer("units"),
  max_units: integer("max_units").notNull().default(6),
  is_ambulatory: boolean("is_ambulatory").notNull().default(true),
  soap_subjective: text("soap_subjective"),
  soap_objective: text("soap_objective"),
  soap_assessment: text("soap_assessment"),
  soap_plan: text("soap_plan"),
  notes: text("notes"),
  actual_start_time: text("actual_start_time"),
  actual_end_time: text("actual_end_time"),
  additions: text("additions")
    .array()
    .notNull()
    .default(sql`'{}'`),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }),
  deleted_at: timestamp("deleted_at", { withTimezone: true }),
});
