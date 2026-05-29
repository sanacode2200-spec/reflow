"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Calendar, ChevronLeft, FilePlus, FileText, Pencil, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { PatientRow } from "@/lib/actions/patient";
import { deleteRehabDocument, type RehabDocumentListItem } from "@/lib/actions/rehab-document";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  tenantId: string;
  patient: PatientRow;
  initialDocuments: RehabDocumentListItem[];
};

function formatDate(value: string | null) {
  if (!value) return "未設定";
  return format(new Date(`${value}T00:00:00`), "yyyy/MM/dd");
}

export default function PatientDocumentsClient({ tenantId, patient, initialDocuments }: Props) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [keyword, setKeyword] = useState("");

  const filtered = useMemo(() => {
    const q = keyword.trim();
    if (!q) return documents;
    return documents.filter((doc) => {
      return (
        formatDate(doc.document_date).includes(q) ||
        formatDate(doc.valid_from).includes(q) ||
        formatDate(doc.valid_to).includes(q) ||
        doc.creator_name.includes(q)
      );
    });
  }, [documents, keyword]);

  async function handleDelete(id: string) {
    if (!confirm("この書類を削除します。よろしいですか？")) return;
    const result = await deleteRehabDocument(id, tenantId);
    if (result && "error" in result) {
      toast.error(result.error);
      return;
    }
    setDocuments((current) => current.filter((doc) => doc.id !== id));
    toast.success("書類を削除しました");
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between px-6 pt-6 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/patients" className="text-muted-foreground hover:text-foreground">
            <ChevronLeft size={18} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-foreground truncate text-xl font-bold">書類一覧</h1>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {patient.name_kanji} / {patient.patient_code} / {documents.length} 件
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/patients/${patient.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full")}
          >
            患者情報
          </Link>
          <Link
            href={`/patients/${patient.id}/documents/new`}
            className={cn(
              buttonVariants({ size: "sm" }),
              "rounded-full shadow-[0_8px_18px_rgba(99,102,241,0.3)]"
            )}
          >
            <FilePlus size={14} />
            書類作成
          </Link>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-6 pb-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search
              size={14}
              className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
            />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="作成日・期間・作成者で検索"
              className="pl-8"
            />
          </div>
          <p className="text-muted-foreground text-sm">{filtered.length}件</p>
        </div>

        {filtered.length === 0 ? (
          <div className="glass-card flex min-h-[360px] flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
              <FileText size={22} className="text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">
              {keyword ? "条件に一致する書類がありません" : "作成済みの書類はありません"}
            </p>
            {!keyword && (
              <Link
                href={`/patients/${patient.id}/documents/new`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full")}
              >
                書類を作成する
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((doc) => (
              <article key={doc.id} className="glass-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/patients/${patient.id}/documents/${doc.id}`}
                    className="min-w-0 flex-1"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="bg-primary/10 text-primary rounded px-2 py-0.5 text-[11px] font-medium">
                        リハビリテーション実施計画書
                      </span>
                    </div>
                    <p className="text-foreground font-semibold">
                      {formatDate(doc.document_date)} 作成
                    </p>
                    <div className="text-muted-foreground mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        計画期間: {formatDate(doc.valid_from)} - {formatDate(doc.valid_to)}
                      </span>
                      <span>作成者: {doc.creator_name}</span>
                    </div>
                  </Link>
                  <div className="flex shrink-0 items-center gap-1">
                    <Link
                      href={`/patients/${patient.id}/documents/${doc.id}`}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "sm" }),
                        "h-8 w-8 rounded-lg p-0"
                      )}
                      title="表示・編集"
                    >
                      <Pencil size={14} />
                    </Link>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive h-8 w-8 rounded-lg p-0"
                      title="削除"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
