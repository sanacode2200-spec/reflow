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
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#111]">患者一覧</h1>
        <Link href="/patients/new">
          <Button className="flex items-center gap-1.5 bg-black hover:bg-[#111]">
            <Plus size={14} />
            患者を登録
          </Button>
        </Link>
      </div>
      <PatientsClient patients={patientList} tenantId={tenantId} staffs={staffList} />
    </div>
  );
}
