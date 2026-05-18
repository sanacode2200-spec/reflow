import { pgTable, uuid, jsonb, timestamp } from "drizzle-orm/pg-core";
import { sessions } from "./sessions";
import { profiles } from "./profiles";

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  session_id: uuid("session_id").references(() => sessions.id),
  changed_by: uuid("changed_by").references(() => profiles.id),
  before_data: jsonb("before_data"),
  after_data: jsonb("after_data"),
  changed_at: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});
