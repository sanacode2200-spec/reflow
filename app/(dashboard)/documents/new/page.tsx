import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTenantIdFromUser } from "@/lib/actions/staff";
import { getPatients } from "@/lib/actions/patient";
import DocumentForm from "./document-form";

export default async function DocumentNewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenantId = await getTenantIdFromUser(user.id);
  const patientList = await getPatients(tenantId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <DocumentForm tenantId={tenantId} patients={patientList} />
    </div>
  );
}
