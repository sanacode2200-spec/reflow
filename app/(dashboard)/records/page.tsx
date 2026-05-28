import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTenantIdFromUser } from "@/lib/actions/staff";
import { getPatients } from "@/lib/actions/patient";
import { getSessionRecords } from "@/lib/actions/session";
import { getStaffs } from "@/lib/actions/schedule";
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

  const [records, patientList, staffList] = await Promise.all([
    patientId ? getSessionRecords(tenantId, from, to, patientId) : Promise.resolve([]),
    getPatients(tenantId),
    getStaffs(tenantId),
  ]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <RecordsClient
        tenantId={tenantId}
        initialRecords={records}
        initialFrom={from}
        initialTo={to}
        initialPatientId={patientId}
        patients={patientList}
        staffs={staffList}
      />
    </div>
  );
}
