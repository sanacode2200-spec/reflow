import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTenantIdFromUser } from "@/lib/actions/staff";
import { getPatients } from "@/lib/actions/patient";
import { getStaffs } from "@/lib/actions/schedule";
import PatientsClient from "./patients-client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function PatientsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenantId = await getTenantIdFromUser(user.id);
  const [patientList, staffList] = await Promise.all([getPatients(tenantId), getStaffs(tenantId)]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between px-6 pt-6 pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#1d1f2b]">患者一覧</h1>
          <p className="mt-0.5 text-xs text-[#8a8fa3]">
            登録 {patientList.filter((p) => !p.deleted_at).length} 名
          </p>
        </div>
        <Link href="/patients/new">
          <Button className="flex items-center gap-1.5 rounded-full bg-[#6366f1] shadow-[0_8px_18px_rgba(99,102,241,0.3)] hover:bg-[#4f52e0]">
            <Plus size={14} />
            患者登録
          </Button>
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-6 pb-6">
        <PatientsClient patients={patientList} tenantId={tenantId} staffs={staffList} />
      </div>
    </div>
  );
}
