"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { reminders } from "@/lib/db/schema";
import { requireTenantAccess } from "@/lib/actions/auth";

const createReminderSchema = z.object({
  title: z.string().trim().min(1, "内容を入力してください").max(120),
  reminder_at: z.string().min(1, "日時を選択してください"),
});

export async function createReminder(tenantId: string, input: unknown) {
  const { user } = await requireTenantAccess(tenantId);
  const data = createReminderSchema.parse(input);

  const staff = await db.query.staffs.findFirst({
    where: (s, { eq, and, isNull }) =>
      and(eq(s.email, user.email ?? ""), eq(s.tenant_id, tenantId), isNull(s.deleted_at)),
  });
  if (!staff) throw new Error("ログイン中のスタッフが見つかりません");

  const reminderAt = new Date(data.reminder_at);
  if (Number.isNaN(reminderAt.getTime())) {
    throw new Error("日時の形式が正しくありません");
  }

  try {
    await db.insert(reminders).values({
      tenant_id: tenantId,
      staff_id: staff.id,
      title: data.title,
      reminder_at: reminderAt,
    });
  } catch {
    throw new Error("リマインダー機能を使うにはデータベース更新が必要です");
  }

  revalidatePath("/");
}
