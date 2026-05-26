import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { staffs } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import { getStaffList, getTenantIdFromUser } from "@/lib/actions/staff";
import StaffTable from "@/components/features/staff/staff-table";

export default async function StaffsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let tenantId: string;
  try {
    tenantId = await getTenantIdFromUser(user.id);
  } catch {
    return (
      <div className="p-6">
        <p className="text-sm text-[#888]">データの取得に失敗しました。</p>
      </div>
    );
  }

  const currentStaff = await db.query.staffs.findFirst({
    where: (s, { eq, and, isNull }) =>
      and(eq(s.email, user.email ?? ""), eq(s.tenant_id, tenantId), isNull(s.deleted_at)),
  });

  const rawList = await getStaffList(tenantId);
  const staffList = [...rawList].sort((a, b) => {
    if (a.id === currentStaff?.id) return -1;
    if (b.id === currentStaff?.id) return 1;
    return 0;
  });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-6 pt-5 pb-3">
        <h1 className="text-xl font-bold text-[#1d1f2b]">スタッフ管理</h1>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-6 pb-6">
        <StaffTable
          staffs={staffList}
          tenantId={tenantId}
          currentStaffId={currentStaff?.id ?? null}
          isAdmin={currentStaff?.role === "admin"}
        />
      </div>
    </div>
  );
}
