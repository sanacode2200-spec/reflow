import { pgTable, uuid, integer, timestamp, text } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { patients } from "./patients";
import { staffs } from "./staffs";

export const schedules = pgTable("schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenant_id: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  patient_id: uuid("patient_id")
    .notNull()
    .references(() => patients.id),
  therapist_id: uuid("therapist_id")
    .notNull()
    .references(() => staffs.id),
  start_at: timestamp("start_at", { withTimezone: true }).notNull(),
  end_at: timestamp("end_at", { withTimezone: true }).notNull(),
  units: integer("units").notNull().default(1),
  recurrence_rule: text("recurrence_rule"),
  recurrence_group_id: uuid("recurrence_group_id"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }),
  deleted_at: timestamp("deleted_at", { withTimezone: true }),
});
