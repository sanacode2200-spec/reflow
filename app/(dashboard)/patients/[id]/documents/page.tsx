import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTenantIdFromUser } from "@/lib/actions/staff";
import { getPatient } from "@/lib/actions/patient";
import { getRehabDocuments } from "@/lib/actions/rehab-document";
import PatientDocumentsClient from "./patient-documents-client";

export default async function PatientDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenantId = await getTenantIdFromUser(user.id);
  const [patient, documents] = await Promise.all([
    getPatient(id, tenantId),
    getRehabDocuments(tenantId, id),
  ]);
  if (!patient) notFound();

  return (
    <PatientDocumentsClient tenantId={tenantId} patient={patient} initialDocuments={documents} />
  );
}
