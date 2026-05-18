import { pgTable, uuid, integer, boolean, timestamp, text, pgEnum } from "drizzle-orm/pg-core";
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
  status: sessionStatusEnum("status").notNull().default("scheduled"),
  units: integer("units"),
  max_units: integer("max_units").notNull().default(6),
  soap_note: text("soap_note"),
  is_ambulatory: boolean("is_ambulatory").notNull().default(true),
  started_at: timestamp("started_at", { withTimezone: true }),
  ended_at: timestamp("ended_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }),
  deleted_at: timestamp("deleted_at", { withTimezone: true }),
});
