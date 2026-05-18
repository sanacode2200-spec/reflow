import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/sidebar";
import BottomNav from "@/components/bottom-nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Sidebar />
      <BottomNav />
      <main className="pb-16 md:pb-0 md:pl-[220px]">{children}</main>
    </div>
  );
}
