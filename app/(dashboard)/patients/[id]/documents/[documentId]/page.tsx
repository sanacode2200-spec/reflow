import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTenantIdFromUser } from "@/lib/actions/staff";
import { getPatient } from "@/lib/actions/patient";
import { getRehabDocument } from "@/lib/actions/rehab-document";
import B21PlanForm from "@/components/features/documents/b21-plan-form";

export default async function PatientDocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string; documentId: string }>;
}) {
  const { id, documentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenantId = await getTenantIdFromUser(user.id);
  const [patient, document] = await Promise.all([
    getPatient(id, tenantId),
    getRehabDocument(documentId, tenantId),
  ]);
  if (!patient || !document || document.patient_id !== patient.id) notFound();

  return (
    <B21PlanForm
      tenantId={tenantId}
      patient={patient}
      document={document}
      backHref={`/patients/${patient.id}/documents`}
    />
  );
}
