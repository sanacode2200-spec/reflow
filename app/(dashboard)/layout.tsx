import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { staffs } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import Sidebar from "@/components/sidebar";
import BottomNav from "@/components/bottom-nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const staff = await db.query.staffs.findFirst({
    where: (s, { eq, and, isNull }) => and(eq(s.email, user.email ?? ""), isNull(s.deleted_at)),
  });

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Sidebar staffName={staff?.name ?? user.email ?? ""} staffCode={staff?.staff_code ?? null} />
      <BottomNav />
      <main className="pb-16 md:pb-0 md:pl-[220px]">{children}</main>
    </div>
  );
}
