import { pgTable, uuid, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const userRoleEnum = pgEnum("user_role", ["admin", "therapist"]);
export const occupationEnum = pgEnum("occupation", ["pt", "ot", "st"]);

export const staffs = pgTable("staffs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenant_id: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  name: text("name").notNull(),
  name_kana: text("name_kana").notNull(),
  role: userRoleEnum("role").notNull().default("therapist"),
  occupation: occupationEnum("occupation").notNull().default("pt"),
  staff_code: text("staff_code"),
  email: text("email"),
  color: text("color").notNull().default("#0070f3"),
  max_units_per_day: integer("max_units_per_day").notNull().default(18),
  max_units_per_week: integer("max_units_per_week").notNull().default(108),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }),
  deleted_at: timestamp("deleted_at", { withTimezone: true }),
});
