"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { archiveStaff } from "@/lib/actions/staff";
import type { StaffRow } from "@/lib/actions/staff";
import StaffModal from "./staff-modal";
import ResetPasswordModal from "./reset-password-modal";
import { Button } from "@/components/ui/button";
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
import { Plus, Pencil, KeyRound, Archive } from "lucide-react";

const occupationLabel: Record<string, string> = { pt: "PT", ot: "OT", st: "ST" };
const roleLabel: Record<string, string> = { admin: "管理者", therapist: "療法士" };

type Props = {
  staffs: StaffRow[];
  tenantId: string;
  currentStaffId: string | null;
  isAdmin: boolean;
};

export default function StaffTable({ staffs, tenantId, currentStaffId, isAdmin }: Props) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffRow | null>(null);
  const [resetTarget, setResetTarget] = useState<StaffRow | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<StaffRow | null>(null);
  const [archiving, setArchiving] = useState(false);

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await archiveStaff(tenantId, archiveTarget.id);
      router.refresh();
    } finally {
      setArchiving(false);
      setArchiveTarget(null);
    }
  };

  const columns: ColumnDef<StaffRow>[] = [
    {
      accessorKey: "staff_code",
      header: "ID",
      cell: ({ getValue }) => (
        <span className="font-mono text-sm text-[#888]">{(getValue() as string) ?? "—"}</span>
      ),
    },
    {
      accessorKey: "name",
      header: "氏名",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-[#111]">{row.original.name}</p>
          <p className="text-xs text-[#888]">{row.original.name_kana}</p>
        </div>
      ),
    },
    {
      accessorKey: "occupation",
      header: "職種",
      cell: ({ getValue }) => (
        <span className="rounded bg-[#f5f5f5] px-2 py-0.5 text-xs font-medium text-[#888]">
          {occupationLabel[getValue() as string] ?? (getValue() as string)}
        </span>
      ),
    },
    {
      accessorKey: "role",
      header: "権限",
      cell: ({ getValue }) => (
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${
            getValue() === "admin" ? "bg-[#f0f7ff] text-[#0070f3]" : "bg-[#f5f5f5] text-[#888]"
          }`}
        >
          {roleLabel[getValue() as string] ?? (getValue() as string)}
        </span>
      ),
    },
    {
      accessorKey: "max_units_per_day",
      header: "1日上限",
      cell: ({ getValue }) => (
        <span className="text-sm text-[#888]">{getValue() as number}単位</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const s = row.original;
        const isMe = s.id === currentStaffId;
        return (
          <div className="flex items-center justify-end gap-1">
            {isAdmin && (
              <>
                <button
                  onClick={() => setEditTarget(s)}
                  className="rounded p-1.5 text-[#888] hover:bg-[#f5f5f5] hover:text-[#111]"
                  title="編集"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setResetTarget(s)}
                  className="rounded p-1.5 text-[#888] hover:bg-[#f5f5f5] hover:text-[#111]"
                  title="パスワードリセット"
                >
                  <KeyRound size={14} />
                </button>
                {!isMe && (
                  <button
                    onClick={() => setArchiveTarget(s)}
                    className="rounded p-1.5 text-[#888] hover:bg-red-50 hover:text-red-500"
                    title="アーカイブ"
                  >
                    <Archive size={14} />
                  </button>
                )}
              </>
            )}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: staffs,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-[#888]">{staffs.length}名</p>
        {isAdmin && (
          <Button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 bg-black hover:bg-[#111]"
            size="sm"
          >
            <Plus size={14} />
            スタッフを追加
          </Button>
        )}
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
                className="border-b border-[#eaeaea] last:border-0 hover:bg-[#fafafa]"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 first:pl-5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {staffs.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-5 py-8 text-center text-sm text-[#888]">
                  スタッフが登録されていません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <StaffModal open={createOpen} onClose={() => setCreateOpen(false)} tenantId={tenantId} />
      <StaffModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        tenantId={tenantId}
        staff={editTarget ?? undefined}
      />
      <ResetPasswordModal
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        tenantId={tenantId}
        staff={resetTarget}
      />

      <AlertDialog open={!!archiveTarget} onOpenChange={(o) => !o && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>スタッフをアーカイブしますか？</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{archiveTarget?.name}</strong>{" "}
              をアーカイブします。ログインできなくなります。後から復帰できます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiving}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={archiving}
              className="bg-red-600 hover:bg-red-700"
            >
              {archiving ? "処理中..." : "アーカイブ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
