import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTenantIdFromUser } from "@/lib/actions/staff";
import { getRehabDocuments } from "@/lib/actions/rehab-document";
import { getPatients } from "@/lib/actions/patient";
import DocumentsClient from "./documents-client";

export default async function DocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenantId = await getTenantIdFromUser(user.id);
  const [documents, patientList] = await Promise.all([
    getRehabDocuments(tenantId),
    getPatients(tenantId),
  ]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <DocumentsClient tenantId={tenantId} initialDocuments={documents} patients={patientList} />
    </div>
  );
}
