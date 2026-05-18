"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { archivePatient, restorePatient } from "@/lib/actions/patient";
import type { PatientRow } from "@/lib/actions/patient";
import { differenceInYears, parseISO } from "date-fns";
import { Search, Archive, RotateCcw, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
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

const genderLabel = { male: "男", female: "女", other: "他" };
const insuranceLabel = { medical: "医療", workers_comp: "労災", auto_liability: "自賠責" };
const diseaseCategoryLabel = {
  cerebrovascular: "脳血管",
  musculoskeletal: "運動器",
  disuse_syndrome: "廃用",
  cardiovascular: "心大血管",
  respiratory: "呼吸器",
};

type Staff = { id: string; name: string; occupation: string };
type Props = { patients: PatientRow[]; tenantId: string; staffs: Staff[] };

export default function PatientsClient({ patients: initial, tenantId }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<PatientRow | null>(null);
  const [processing, setProcessing] = useState(false);

  const filtered = useMemo(
    () =>
      initial.filter((p) => {
        const isArchived = !!p.deleted_at;
        if (isArchived !== showArchived) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          p.name_kanji.toLowerCase().includes(q) ||
          p.name_kana.toLowerCase().includes(q) ||
          p.patient_code.toLowerCase().includes(q)
        );
      }),
    [initial, search, showArchived]
  );

  const columns: ColumnDef<PatientRow>[] = [
    {
      accessorKey: "patient_code",
      header: "ID",
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-[#888]">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: "name_kanji",
      header: "氏名",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-[#111]">{row.original.name_kanji}</p>
          <p className="text-xs text-[#888]">{row.original.name_kana}</p>
        </div>
      ),
    },
    {
      accessorKey: "birth_date",
      header: "年齢",
      cell: ({ getValue }) => {
        const age = differenceInYears(new Date(), parseISO(getValue() as string));
        return <span className="text-sm text-[#888]">{age}歳</span>;
      },
    },
    {
      accessorKey: "gender",
      header: "性別",
      cell: ({ getValue }) => (
        <span className="text-sm text-[#888]">
          {genderLabel[getValue() as keyof typeof genderLabel]}
        </span>
      ),
    },
    {
      accessorKey: "insurance_type",
      header: "保険",
      cell: ({ getValue }) => (
        <span className="rounded bg-[#f5f5f5] px-2 py-0.5 text-xs text-[#888]">
          {insuranceLabel[getValue() as keyof typeof insuranceLabel]}
        </span>
      ),
    },
    {
      accessorKey: "disease_category",
      header: "疾患区分",
      cell: ({ getValue }) => (
        <span className="text-sm text-[#888]">
          {diseaseCategoryLabel[getValue() as keyof typeof diseaseCategoryLabel]}
        </span>
      ),
    },
    {
      accessorKey: "therapist_name",
      header: "担当",
      cell: ({ getValue }) => <span className="text-sm text-[#888]">{getValue() as string}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          {showArchived ? (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                await restorePatient(row.original.id, tenantId);
              }}
              className="rounded p-1.5 text-[#888] hover:bg-[#f5f5f5] hover:text-[#0070f3]"
              title="復帰"
            >
              <RotateCcw size={14} />
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setArchiveTarget(row.original);
              }}
              className="rounded p-1.5 text-[#888] hover:bg-red-50 hover:text-red-500"
              title="アーカイブ"
            >
              <Archive size={14} />
            </button>
          )}
          <ChevronRight size={14} className="text-[#eaeaea]" />
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-[#888]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="氏名・カナ・IDで検索"
            className="pl-8"
          />
        </div>
        <button
          onClick={() => setShowArchived((v) => !v)}
          className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
            showArchived
              ? "border-[#111] bg-[#111] text-white"
              : "border-[#eaeaea] bg-white text-[#888] hover:border-[#111]"
          }`}
        >
          {showArchived ? "アーカイブ表示中" : "アーカイブを表示"}
        </button>
        <p className="text-sm text-[#888]">{filtered.length}名</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#eaeaea] bg-white">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-[#eaeaea]">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="px-4 py-3 text-left text-xs font-medium text-[#888] first:pl-5"
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-b border-[#eaeaea] last:border-0 hover:bg-[#fafafa]"
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-3 first:pl-5"
                    onClick={() => {
                      if ((cell.column.columnDef as { id?: string }).id !== "actions") {
                        window.location.href = `/patients/${row.original.id}`;
                      }
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-5 py-10 text-center text-sm text-[#888]">
                  {search ? "該当する患者が見つかりません" : "患者が登録されていません"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AlertDialog open={!!archiveTarget} onOpenChange={(o) => !o && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>患者をアーカイブしますか？</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{archiveTarget?.name_kanji}</strong>{" "}
              をアーカイブします。スケジュール登録ができなくなります。後から復帰できます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              disabled={processing}
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                if (!archiveTarget) return;
                setProcessing(true);
                try {
                  await archivePatient(archiveTarget.id, tenantId);
                } finally {
                  setProcessing(false);
                  setArchiveTarget(null);
                }
              }}
            >
              {processing ? "処理中..." : "アーカイブ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
