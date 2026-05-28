import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
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
      <div className="shrink-0 px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-[#1d1f2b]">スタッフ管理</h1>
        <p className="mt-1 text-sm text-[#8a8fa3]">登録 {staffList.length} 名</p>
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
