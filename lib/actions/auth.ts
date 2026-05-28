import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { and, eq, isNull } from "drizzle-orm";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function getTenantIdFromAuthenticatedUser(userId: string): Promise<string> {
  const profile = await db.query.profiles.findFirst({
    where: and(eq(profiles.id, userId), isNull(profiles.deleted_at)),
    columns: { tenant_id: true },
  });

  if (!profile) throw new Error("Profile not found");
  return profile.tenant_id;
}

export async function requireTenantAccess(tenantId: string) {
  const user = await requireUser();
  const profileTenantId = await getTenantIdFromAuthenticatedUser(user.id);

  if (profileTenantId !== tenantId) throw new Error("Forbidden");
  return { user, tenantId: profileTenantId };
}

export async function requireCurrentTenant() {
  const user = await requireUser();
  const tenantId = await getTenantIdFromAuthenticatedUser(user.id);

  return { user, tenantId };
}
