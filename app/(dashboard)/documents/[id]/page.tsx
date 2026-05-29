import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTenantIdFromUser } from "@/lib/actions/staff";
import { getRehabDocument } from "@/lib/actions/rehab-document";
import { getPatient } from "@/lib/actions/patient";
import B21PlanForm from "@/components/features/documents/b21-plan-form";

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenantId = await getTenantIdFromUser(user.id);
  const doc = await getRehabDocument(id, tenantId);
  if (!doc) notFound();
  const patient = await getPatient(doc.patient_id, tenantId);
  if (!patient) notFound();

  return <B21PlanForm tenantId={tenantId} patient={patient} document={doc} backHref="/documents" />;
}
