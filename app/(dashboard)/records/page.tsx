import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTenantIdFromUser } from "@/lib/actions/staff";
import { getSessionRecords } from "@/lib/actions/session";
import { db } from "@/lib/db";
import { format, startOfMonth, endOfMonth } from "date-fns";
import RecordsClient from "@/components/features/session/records-client";

type Props = { searchParams: Promise<{ patient_id?: string; from?: string; to?: string }> };

export default async function RecordsPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenantId = await getTenantIdFromUser(user.id);

  const today = new Date();
  const from = params.from ?? format(startOfMonth(today), "yyyy-MM-dd");
  const to = params.to ?? format(endOfMonth(today), "yyyy-MM-dd");
  const patientId = params.patient_id;

  const [records, patientRow] = await Promise.all([
    getSessionRecords(tenantId, from, to, patientId),
    patientId
      ? db.query.patients.findFirst({
          where: (p, { eq: eqFn, and: andFn, isNull: isNullFn }) =>
            andFn(eqFn(p.id, patientId), eqFn(p.tenant_id, tenantId), isNullFn(p.deleted_at)),
          columns: { name_kanji: true },
        })
      : Promise.resolve(undefined),
  ]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <RecordsClient
        tenantId={tenantId}
        initialRecords={records}
        initialFrom={from}
        initialTo={to}
        patientName={patientRow?.name_kanji}
      />
    </div>
  );
}
