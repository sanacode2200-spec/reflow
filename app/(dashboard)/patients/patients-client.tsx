"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
import {
  Search,
  Archive,
  RotateCcw,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Check,
} from "lucide-react";
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

const insuranceLabel = { medical: "医療", workers_comp: "労災", auto_liability: "自賠責" };
const diseaseCategoryLabel: Record<string, string> = {
  cerebrovascular: "脳血管",
  musculoskeletal: "運動器",
  disuse_syndrome: "廃用",
  cardiovascular: "心大血管",
  respiratory: "呼吸器",
};
const patientTypeLabel = { inpatient: "入院中", outpatient: "外来" };
const patientTypeStyle = {
  inpatient: "bg-[rgba(99,102,241,0.10)] text-[#6366f1]",
  outpatient: "bg-[#f5f5f5] text-[#888]",
};

type Staff = { id: string; name: string; occupation: string };
type Props = { patients: PatientRow[]; tenantId: string; staffs: Staff[] };
type TypeFilter = "all" | "inpatient" | "outpatient";
type FilterKey = "patient_type" | "therapist_name" | "disease_category";

const OCCUPATION_LABEL: Record<string, string> = { pt: "PT", ot: "OT", st: "ST" };
const FILTER_COLUMNS = new Set<FilterKey>(["patient_type", "therapist_name", "disease_category"]);

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (!sorted) return <ChevronsUpDown size={11} className="text-[#ccc]" />;
  return sorted === "asc" ? (
    <ChevronUp size={11} className="text-[#111]" />
  ) : (
    <ChevronDown size={11} className="text-[#111]" />
  );
}

export default function PatientsClient({ patients: initial, tenantId, staffs }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [therapistFilter, setTherapistFilter] = useState("");
  const [diseaseFilter, setDiseaseFilter] = useState("");
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<PatientRow | null>(null);
  const [processing, setProcessing] = useState(false);
  const [mounted, setMounted] = useState(false);

  const theadRef = useRef<HTMLTableSectionElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      const inThead = theadRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inThead && !inDropdown) {
        setOpenFilter(null);
        setDropdownPos(null);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const filtered = useMemo(
    () =>
      initial.filter((p) => {
        if (!!p.deleted_at !== showArchived) return false;
        if (typeFilter !== "all" && p.patient_type !== typeFilter) return false;
        if (
          therapistFilter &&
          p.therapist_id !== therapistFilter &&
          p.pt_therapist_id !== therapistFilter &&
          p.ot_therapist_id !== therapistFilter &&
          p.st_therapist_id !== therapistFilter
        )
          return false;
        if (diseaseFilter && p.disease_category !== diseaseFilter) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          p.name_kanji.toLowerCase().includes(q) ||
          p.name_kana.toLowerCase().includes(q) ||
          p.patient_code.toLowerCase().includes(q)
        );
      }),
    [initial, search, showArchived, typeFilter, therapistFilter, diseaseFilter]
  );

  const columns: ColumnDef<PatientRow>[] = [
    {
      accessorKey: "patient_code",
      header: "ID",
      enableSorting: false,
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-[#888]">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: "name_kanji",
      header: "氏名",
      enableSorting: true,
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
      enableSorting: true,
      cell: ({ getValue }) => (
        <span className="text-sm text-[#888]">
          {differenceInYears(new Date(), parseISO(getValue() as string))}歳
        </span>
      ),
    },
    {
      accessorKey: "patient_type",
      header: "区分",
      enableSorting: false,
      cell: ({ getValue }) => {
        const v = getValue() as keyof typeof patientTypeLabel;
        return (
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${patientTypeStyle[v] ?? ""}`}>
            {patientTypeLabel[v] ?? v}
          </span>
        );
      },
    },
    {
      accessorKey: "therapist_name",
      header: "主担当",
      enableSorting: false,
      cell: ({ getValue }) => <span className="text-sm text-[#888]">{getValue() as string}</span>,
    },
    {
      accessorKey: "disease_category",
      header: "疾患区分",
      enableSorting: false,
      cell: ({ getValue }) => (
        <span className="text-sm text-[#888]">
          {diseaseCategoryLabel[getValue() as string] ?? (getValue() as string)}
        </span>
      ),
    },
    {
      accessorKey: "insurance_type",
      header: "保険",
      enableSorting: false,
      cell: ({ getValue }) => (
        <span className="rounded bg-[#f5f5f5] px-2 py-0.5 text-xs text-[#888]">
          {insuranceLabel[getValue() as keyof typeof insuranceLabel]}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          {showArchived ? (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                await restorePatient(row.original.id, tenantId);
              }}
              className="rounded p-1.5 text-[#888] hover:bg-[#f5f5f5] hover:text-[#6366f1]"
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

  const activeLabel: Record<FilterKey, string | null> = {
    patient_type: typeFilter !== "all" ? (typeFilter === "outpatient" ? "外来" : "入院中") : null,
    therapist_name: therapistFilter
      ? (staffs.find((s) => s.id === therapistFilter)?.name ?? null)
      : null,
    disease_category: diseaseFilter ? (diseaseCategoryLabel[diseaseFilter] ?? null) : null,
  };

  function openDropdown(e: React.MouseEvent, key: FilterKey) {
    e.stopPropagation();
    if (openFilter === key) {
      setOpenFilter(null);
      setDropdownPos(null);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 4, left: rect.left });
    setOpenFilter(key);
  }

  function DropdownItem({
    active,
    onClick,
    children,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-[#fafafa] ${
          active ? "font-medium text-[#111]" : "text-[#555]"
        }`}
      >
        <Check size={12} className={active ? "text-[#6366f1] opacity-100" : "opacity-0"} />
        {children}
      </button>
    );
  }

  function renderDropdownContent() {
    if (!openFilter) return null;

    const close = () => {
      setOpenFilter(null);
      setDropdownPos(null);
    };

    if (openFilter === "patient_type") {
      return (
        <>
          {(["all", "outpatient", "inpatient"] as const).map((v) => (
            <DropdownItem
              key={v}
              active={typeFilter === v}
              onClick={() => {
                setTypeFilter(v);
                close();
              }}
            >
              {v === "all" ? "全て" : v === "outpatient" ? "外来" : "入院中"}
            </DropdownItem>
          ))}
        </>
      );
    }

    if (openFilter === "therapist_name") {
      return (
        <>
          <DropdownItem
            active={!therapistFilter}
            onClick={() => {
              setTherapistFilter("");
              close();
            }}
          >
            全て
          </DropdownItem>
          {staffs.map((s) => (
            <DropdownItem
              key={s.id}
              active={therapistFilter === s.id}
              onClick={() => {
                setTherapistFilter(s.id);
                close();
              }}
            >
              {OCCUPATION_LABEL[s.occupation] ?? s.occupation} {s.name}
            </DropdownItem>
          ))}
        </>
      );
    }

    if (openFilter === "disease_category") {
      return (
        <>
          <DropdownItem
            active={!diseaseFilter}
            onClick={() => {
              setDiseaseFilter("");
              close();
            }}
          >
            全て
          </DropdownItem>
          {Object.entries(diseaseCategoryLabel).map(([v, l]) => (
            <DropdownItem
              key={v}
              active={diseaseFilter === v}
              onClick={() => {
                setDiseaseFilter(v);
                close();
              }}
            >
              {l}
            </DropdownItem>
          ))}
        </>
      );
    }

    return null;
  }

  const hasFilter = typeFilter !== "all" || !!therapistFilter || !!diseaseFilter;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
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
          {showArchived ? "アーカイブ表示中" : "アーカイブ"}
        </button>

        <p className="text-sm text-[#888]">{filtered.length}名</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#eaeaea] bg-white">
        <table className="w-full text-sm">
          <thead ref={theadRef}>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-[#eaeaea]">
                {hg.headers.map((h) => {
                  const colId = h.column.id as FilterKey;
                  const isFilterable = FILTER_COLUMNS.has(colId);
                  const label = activeLabel[colId];
                  const isOpen = openFilter === colId;

                  if (isFilterable) {
                    return (
                      <th
                        key={h.id}
                        className="cursor-pointer px-4 py-3 text-left text-xs font-medium select-none first:pl-5"
                        onClick={(e) => openDropdown(e, colId)}
                      >
                        <span
                          className={`flex items-center gap-1 ${
                            label ? "text-[#6366f1]" : "text-[#888] hover:text-[#111]"
                          }`}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {label && <span className="font-normal">: {label}</span>}
                          <ChevronDown
                            size={11}
                            className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                          />
                        </span>
                      </th>
                    );
                  }

                  return (
                    <th
                      key={h.id}
                      className={`px-4 py-3 text-left text-xs font-medium text-[#888] first:pl-5 ${
                        h.column.getCanSort() ? "cursor-pointer select-none hover:text-[#111]" : ""
                      }`}
                      onClick={h.column.getToggleSortingHandler()}
                    >
                      <span className="flex items-center gap-1">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {h.column.getCanSort() && <SortIcon sorted={h.column.getIsSorted()} />}
                      </span>
                    </th>
                  );
                })}
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
                  {search || hasFilter
                    ? "条件に一致する患者が見つかりません"
                    : "患者が登録されていません"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {mounted &&
        openFilter &&
        dropdownPos &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: dropdownPos.top,
              left: dropdownPos.left,
              zIndex: 9999,
            }}
            className="min-w-[130px] overflow-hidden rounded-lg border border-[#eaeaea] bg-white shadow-lg"
          >
            {renderDropdownContent()}
          </div>,
          document.body
        )}

      <AlertDialog open={!!archiveTarget} onOpenChange={(o) => !o && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>患者をアーカイブしますか？</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{archiveTarget?.name_kanji}</strong> をアーカイブします。後から復帰できます。
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
