"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, FileText } from "lucide-react";
import type { PatientRow } from "@/lib/actions/patient";
import B21PlanForm from "@/components/features/documents/b21-plan-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  tenantId: string;
  patient: PatientRow;
};

export default function DocumentTypeAndForm({ tenantId, patient }: Props) {
  const [selectedType, setSelectedType] = useState<"comprehensive_plan" | null>(null);
  const backHref = `/patients/${patient.id}/documents`;

  if (selectedType === "comprehensive_plan") {
    return <B21PlanForm tenantId={tenantId} patient={patient} backHref={backHref} />;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-3 px-6 pt-6 pb-4">
        <Link
          href={backHref}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-full")}
        >
          <ChevronLeft size={15} />
          書類一覧
        </Link>
        <div>
          <h1 className="text-foreground text-xl font-bold">作成する書類を選択</h1>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {patient.name_kanji} / {patient.patient_code}
          </p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-6 pb-6">
        <button
          type="button"
          onClick={() => setSelectedType("comprehensive_plan")}
          className="glass-card hover:border-primary/35 flex w-full max-w-xl items-start gap-4 border border-transparent p-5 text-left transition-colors"
        >
          <span className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <FileText size={20} />
          </span>
          <span>
            <span className="text-foreground block font-semibold">
              リハビリテーション実施計画書（総合実施計画書）
            </span>
            <span className="text-muted-foreground mt-1 block text-sm">
              別紙様式21。2ページ構成の様式を編集します。
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
