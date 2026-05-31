import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, FileText, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTenantIdFromUser } from "@/lib/actions/staff";
import { getPatients } from "@/lib/actions/patient";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function DocumentNewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenantId = await getTenantIdFromUser(user.id);
  const patientList = await getPatients(tenantId);

  return (
    <div className="flex h-screen flex-col overflow-hidden p-6">
      <div className="mb-5 flex shrink-0 items-center gap-3">
        <Link
          href="/documents"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-full")}
        >
          <ChevronLeft size={15} />
          書類一覧
        </Link>
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">患者を選択</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            計画書は患者ごとの書類画面で作成します
          </p>
        </div>
      </div>

      <div className="glass-card min-h-0 flex-1 overflow-y-auto p-4">
        {patientList.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
              <UserRound size={22} className="text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">患者がまだ登録されていません</p>
          </div>
        ) : (
          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {patientList.map((patient) => (
              <Link
                key={patient.id}
                href={`/patients/${patient.id}/documents/new`}
                className="border-border bg-card hover:border-primary/35 rounded-xl border p-4 shadow-sm transition-colors"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-medium">
                    {patient.patient_type === "inpatient" ? "入院" : "外来"}
                  </span>
                  <FileText size={15} className="text-muted-foreground" />
                </div>
                <p className="text-foreground font-semibold">{patient.name_kanji}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {patient.patient_code} / {patient.name_kana}
                </p>
                <p className="text-muted-foreground mt-2 line-clamp-2 text-xs">
                  {patient.main_diagnosis}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
