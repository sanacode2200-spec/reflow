import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTenantIdFromUser } from "@/lib/actions/staff";
import { getPatient } from "@/lib/actions/patient";
import DocumentTypeAndForm from "./document-type-and-form";

export default async function NewPatientDocumentPage({
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
  const patient = await getPatient(id, tenantId);
  if (!patient) notFound();

  return <DocumentTypeAndForm tenantId={tenantId} patient={patient} />;
}
