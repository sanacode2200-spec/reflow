"use server";

import { db } from "@/lib/db";
import { staffs, profiles } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { z } from "zod";

const staffCodeSchema = z.string().regex(/^\d{4}$/, "スタッフIDは数字4桁で入力してください");

const createStaffSchema = z.object({
  name: z.string().min(1),
  name_kana: z.string().min(1),
  role: z.enum(["admin", "therapist"]),
  occupation: z.enum(["pt", "ot", "st"]),
  staff_code: staffCodeSchema,
  password: z.string().min(4, "パスワードは4文字以上で入力してください"),
  max_units_per_day: z.number().int().min(1).default(18),
  max_units_per_week: z.number().int().min(1).default(108),
});

const updateStaffSchema = z.object({
  name: z.string().min(1),
  name_kana: z.string().min(1),
  role: z.enum(["admin", "therapist"]),
  occupation: z.enum(["pt", "ot", "st"]),
  max_units_per_day: z.number().int().min(1),
  max_units_per_week: z.number().int().min(1),
});

export async function getTenantIdFromUser(userId: string): Promise<string> {
  const profile = await db.query.profiles.findFirst({
    where: (p, { eq }) => eq(p.id, userId),
  });
  if (!profile) throw new Error("Profile not found");
  return profile.tenant_id;
}

function getAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function assertAdmin(tenantId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const profile = await db.query.profiles.findFirst({
    where: (p, { eq }) => eq(p.id, user.id),
  });
  if (!profile || profile.tenant_id !== tenantId) throw new Error("Forbidden");

  const staff = await db.query.staffs.findFirst({
    where: (s, { eq, and, isNull }) =>
      and(eq(s.email, user.email ?? ""), eq(s.tenant_id, tenantId), isNull(s.deleted_at)),
  });
  if (!staff || staff.role !== "admin") throw new Error("管理者権限が必要です");
}

export type StaffRow = {
  id: string;
  name: string;
  name_kana: string;
  role: "admin" | "therapist";
  occupation: "pt" | "ot" | "st";
  color: string;
  staff_code: string | null;
  email: string | null;
  max_units_per_day: number;
  max_units_per_week: number;
  deleted_at: Date | null;
};

export async function getStaffList(tenantId: string): Promise<StaffRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const rows = await db
    .select()
    .from(staffs)
    .where(and(eq(staffs.tenant_id, tenantId), isNull(staffs.deleted_at)));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    name_kana: r.name_kana,
    role: r.role,
    occupation: r.occupation,
    color: r.color,
    staff_code: r.staff_code ?? null,
    email: r.email ?? null,
    max_units_per_day: r.max_units_per_day,
    max_units_per_week: r.max_units_per_week,
    deleted_at: r.deleted_at ?? null,
  }));
}

export async function createStaff(tenantId: string, input: unknown) {
  await assertAdmin(tenantId);

  const data = createStaffSchema.parse(input);

  const existing = await db.query.staffs.findFirst({
    where: (s, { eq, and, isNull }) =>
      and(eq(s.tenant_id, tenantId), eq(s.staff_code, data.staff_code), isNull(s.deleted_at)),
  });
  if (existing) throw new Error(`スタッフID ${data.staff_code} は既に使用されています`);

  const email = `${data.staff_code}@reflow.local`;
  const adminSupabase = getAdminSupabase();
  const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password: data.password,
    email_confirm: true,
  });
  if (authError) throw new Error(authError.message);

  const [staff] = await db
    .insert(staffs)
    .values({
      tenant_id: tenantId,
      name: data.name,
      name_kana: data.name_kana,
      role: data.role,
      occupation: data.occupation,
      staff_code: data.staff_code,
      email,
      max_units_per_day: data.max_units_per_day,
      max_units_per_week: data.max_units_per_week,
    })
    .returning();

  if (!staff) throw new Error("スタッフの作成に失敗しました");

  await db.insert(profiles).values({
    id: authUser.user.id,
    tenant_id: tenantId,
    email,
    full_name: data.name,
  });

  revalidatePath("/settings/staffs");
  return staff;
}

export async function updateStaff(tenantId: string, staffId: string, input: unknown) {
  await assertAdmin(tenantId);
  const data = updateStaffSchema.parse(input);

  // 最後の管理者を降格させない
  if (data.role !== "admin") {
    const adminCount = await db
      .select({ id: staffs.id })
      .from(staffs)
      .where(
        and(eq(staffs.tenant_id, tenantId), eq(staffs.role, "admin"), isNull(staffs.deleted_at))
      );
    const isLastAdmin = adminCount.length === 1 && adminCount[0]?.id === staffId;
    if (isLastAdmin) throw new Error("最後の管理者の権限を変更することはできません");
  }

  await db
    .update(staffs)
    .set({
      name: data.name,
      name_kana: data.name_kana,
      role: data.role,
      occupation: data.occupation,
      max_units_per_day: data.max_units_per_day,
      max_units_per_week: data.max_units_per_week,
      updated_at: new Date(),
    })
    .where(and(eq(staffs.id, staffId), eq(staffs.tenant_id, tenantId)));

  revalidatePath("/settings/staffs");
}

export async function archiveStaff(tenantId: string, staffId: string) {
  await assertAdmin(tenantId);

  await db
    .update(staffs)
    .set({ deleted_at: new Date() })
    .where(and(eq(staffs.id, staffId), eq(staffs.tenant_id, tenantId)));

  revalidatePath("/settings/staffs");
}

export async function adminResetPassword(tenantId: string, staffId: string, newPassword: string) {
  await assertAdmin(tenantId);

  if (newPassword.length < 4) throw new Error("パスワードは4文字以上で入力してください");

  const staff = await db.query.staffs.findFirst({
    where: (s, { eq, and }) => and(eq(s.id, staffId), eq(s.tenant_id, tenantId)),
  });
  if (!staff?.email) throw new Error("スタッフのメールアドレスが見つかりません");

  const adminSupabase = getAdminSupabase();
  const { data: users } = await adminSupabase.auth.admin.listUsers();
  const authUser = users.users.find((u) => u.email === staff.email);
  if (!authUser) throw new Error("認証ユーザーが見つかりません");

  const { error } = await adminSupabase.auth.admin.updateUserById(authUser.id, {
    password: newPassword,
  });
  if (error) throw new Error(error.message);
}

export async function changeMyPassword(currentPassword: string, newPassword: string) {
  if (newPassword.length < 4) throw new Error("パスワードは4文字以上で入力してください");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Unauthorized");

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signInError) throw new Error("現在のパスワードが正しくありません");

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}
