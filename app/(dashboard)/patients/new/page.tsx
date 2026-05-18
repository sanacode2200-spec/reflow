import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTenantIdFromUser } from "@/lib/actions/staff";
import { getStaffs } from "@/lib/actions/schedule";
import PatientWizard from "./patient-wizard";

export default async function NewPatientPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenantId = await getTenantIdFromUser(user.id);
  const staffList = await getStaffs(tenantId);

  return (
    <div className="p-6">
      <h1 className="mb-6 text-xl font-bold text-[#111]">患者登録</h1>
      <PatientWizard tenantId={tenantId} staffs={staffList} />
    </div>
  );
}
