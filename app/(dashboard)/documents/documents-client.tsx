"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { FilePlus, Search, FileText, Calendar, User, Trash2, Pencil } from "lucide-react";
import { type RehabDocumentListItem, deleteRehabDocument } from "@/lib/actions/rehab-document";
import type { PatientRow } from "@/lib/actions/patient";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type Props = {
  tenantId: string;
  initialDocuments: RehabDocumentListItem[];
  patients: PatientRow[];
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return format(new Date(`${d}T00:00:00`), "yyyy/MM/dd");
}

export default function DocumentsClient({ tenantId, initialDocuments, patients }: Props) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [keyword, setKeyword] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter(
      (d) =>
        d.patient_name.toLowerCase().includes(q) ||
        d.patient_code.toLowerCase().includes(q) ||
        d.creator_name.toLowerCase().includes(q)
    );
  }, [documents, keyword]);

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    const result = await deleteRehabDocument(deleteTargetId, tenantId);
    if (result && "error" in result) {
      toast.error(result.error);
    } else {
      setDocuments((prev) => prev.filter((d) => d.id !== deleteTargetId));
      toast.success("計画書を削除しました");
    }
    setDeleteTargetId(null);
  };

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden p-6">
        <div className="mb-5 flex shrink-0 items-center justify-between">
          <div>
            <h1 className="text-foreground text-2xl font-bold tracking-tight">計画書管理</h1>
            <p className="text-muted-foreground mt-1 text-sm">総合実施計画書の作成・管理</p>
          </div>
          <Link
            href="/documents/new"
            className={cn(
              buttonVariants(),
              "rounded-full shadow-[0_8px_18px_rgba(99,102,241,0.28)]"
            )}
          >
            <FilePlus size={15} />
            計画書を作成
          </Link>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Sidebar filter */}
          <aside className="glass-card min-h-0 overflow-hidden p-4">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>患者・作成者で検索</Label>
                <div className="relative">
                  <Search
                    size={14}
                    className="text-muted-foreground absolute top-1/2 left-2.5 -translate-y-1/2"
                  />
                  <Input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="氏名 / 患者ID"
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="border-border border-t pt-4">
                <p className="text-muted-foreground text-xs">
                  全 {patients.length} 名の患者が登録されています
                </p>
                <p className="text-muted-foreground mt-1 text-xs">計画書 {documents.length} 件</p>
              </div>
            </div>
          </aside>

          {/* Document list */}
          <main className="glass-card min-h-0 overflow-y-auto p-4">
            {filtered.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
                  <FileText size={22} className="text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">
                  {keyword ? "検索条件に一致する計画書がありません" : "計画書がまだありません"}
                </p>
                {!keyword && (
                  <Link
                    href="/documents/new"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "mt-1 rounded-full"
                    )}
                  >
                    最初の計画書を作成する
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filtered.map((doc) => (
                  <article
                    key={doc.id}
                    className="border-border bg-card rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex items-center gap-2">
                          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-medium">
                            総合実施計画書
                          </span>
                          <span className="text-muted-foreground text-xs">{doc.patient_code}</span>
                        </div>

                        <p className="text-foreground font-semibold">{doc.patient_name}</p>

                        <div className="text-muted-foreground mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            作成日: {formatDate(doc.document_date)}
                          </span>
                          {doc.valid_from && (
                            <span className="flex items-center gap-1">
                              <Calendar size={11} />
                              計画期間: {formatDate(doc.valid_from)}
                              {doc.valid_to ? ` 〜 ${formatDate(doc.valid_to)}` : " 〜"}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <User size={11} />
                            作成者: {doc.creator_name}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <Link
                          href={`/documents/${doc.id}`}
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "sm" }),
                            "h-8 w-8 rounded-lg p-0"
                          )}
                        >
                          <Pencil size={13} />
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive h-8 w-8 rounded-lg p-0"
                          onClick={() => setDeleteTargetId(doc.id)}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>計画書を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。計画書が完全に削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
