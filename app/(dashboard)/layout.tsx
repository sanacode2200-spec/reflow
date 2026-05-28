import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Sidebar from "@/components/sidebar";
import BottomNav from "@/components/bottom-nav";
import { requireCurrentTenant } from "@/lib/actions/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let auth;
  try {
    auth = await requireCurrentTenant();
  } catch {
    redirect("/login");
  }

  const { user, tenantId } = auth;

  const staff = await db.query.staffs.findFirst({
    where: (s, { eq, and, isNull }) =>
      and(eq(s.email, user.email ?? ""), eq(s.tenant_id, tenantId), isNull(s.deleted_at)),
  });

  return (
    <div className="min-h-screen">
      <Sidebar staffName={staff?.name ?? user.email ?? ""} staffCode={staff?.staff_code ?? null} />
      <BottomNav />
      <main className="pb-16 md:pb-0 md:pl-[220px]">{children}</main>
    </div>
  );
}
