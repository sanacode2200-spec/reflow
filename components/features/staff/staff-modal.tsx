"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createStaff, updateStaff } from "@/lib/actions/staff";
import type { StaffRow } from "@/lib/actions/staff";
import { STAFF_ICON_KEYS, STAFF_ICON_MAP } from "@/lib/constants/staff-icons";
import type { StaffIconKey } from "@/lib/constants/staff-icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export { STAFF_ICON_MAP };

const iconSchema = z.enum(STAFF_ICON_KEYS);

const createSchema = z.object({
  name: z.string().min(1, "氏名を入力してください"),
  name_kana: z.string().min(1, "カナを入力してください"),
  role: z.enum(["admin", "therapist"]),
  occupation: z.enum(["pt", "ot", "st"]),
  icon: iconSchema,
  staff_code: z.string().regex(/^\d{4}$/, "数字4桁で入力してください"),
  password: z.string().min(4, "4文字以上で入力してください"),
  max_units_per_day: z.number().int().min(1),
  max_units_per_week: z.number().int().min(1),
});

const editSchema = z.object({
  name: z.string().min(1, "氏名を入力してください"),
  name_kana: z.string().min(1, "カナを入力してください"),
  role: z.enum(["admin", "therapist"]),
  occupation: z.enum(["pt", "ot", "st"]),
  icon: iconSchema,
  max_units_per_day: z.number().int().min(1),
  max_units_per_week: z.number().int().min(1),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;

type Props = {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  staff?: StaffRow;
};

const occupationOptions = [
  { value: "pt", label: "PT（理学）" },
  { value: "ot", label: "OT（作業）" },
  { value: "st", label: "ST（言語聴覚）" },
] as const;

const roleOptions = [
  { value: "therapist", label: "療法士" },
  { value: "admin", label: "管理者" },
] as const;

export default function StaffModal({ open, onClose, tenantId, staff }: Props) {
  const router = useRouter();
  const isEdit = !!staff;
  const [serverError, setServerError] = useState<string | null>(null);

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: "",
      name_kana: "",
      role: "therapist",
      occupation: "pt",
      icon: "star",
      staff_code: "",
      password: "",
      max_units_per_day: 18,
      max_units_per_week: 108,
    },
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: staff?.name ?? "",
      name_kana: staff?.name_kana ?? "",
      role: staff?.role ?? "therapist",
      occupation: staff?.occupation ?? "pt",
      icon: (staff?.icon ?? "star") as StaffIconKey,
      max_units_per_day: staff?.max_units_per_day ?? 18,
      max_units_per_week: staff?.max_units_per_week ?? 108,
    },
  });

  useEffect(() => {
    if (open && staff) {
      editForm.reset({
        name: staff.name,
        name_kana: staff.name_kana,
        role: staff.role,
        occupation: staff.occupation,
        icon: staff.icon,
        max_units_per_day: staff.max_units_per_day,
        max_units_per_week: staff.max_units_per_week,
      });
    }
  }, [open, staff]); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    formState: { isSubmitting: createSubmitting },
  } = createForm;
  const {
    formState: { isSubmitting: editSubmitting },
  } = editForm;
  const isSubmitting = isEdit ? editSubmitting : createSubmitting;

  const handleCreate = async (data: CreateForm) => {
    setServerError(null);
    try {
      await createStaff(tenantId, data);
      createForm.reset();
      onClose();
      router.refresh();
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "エラーが発生しました");
    }
  };

  const handleEdit = async (data: EditForm) => {
    if (!staff) return;
    setServerError(null);
    try {
      await updateStaff(tenantId, staff.id, data);
      onClose();
      router.refresh();
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "エラーが発生しました");
    }
  };

  const handleClose = () => {
    setServerError(null);
    createForm.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "スタッフ編集" : "スタッフ登録"}</DialogTitle>
        </DialogHeader>

        {isEdit ? (
          <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
            <FormFields form={editForm} isEdit />
            {serverError && <ErrorMsg msg={serverError} />}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                キャンセル
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-black hover:bg-[#111]">
                {isSubmitting ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
            <FormFields form={createForm} isEdit={false} />
            {serverError && <ErrorMsg msg={serverError} />}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                キャンセル
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-black hover:bg-[#111]">
                {isSubmitting ? "登録中..." : "登録する"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function IconPicker({
  value,
  onChange,
}: {
  value: StaffIconKey;
  onChange: (key: StaffIconKey) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>アイコン</Label>
      <div className="flex flex-wrap gap-2">
        {STAFF_ICON_KEYS.map((key) => {
          const Icon = STAFF_ICON_MAP[key];
          const selected = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border-2 transition-all ${
                selected
                  ? "border-[#111] bg-[#111] text-white"
                  : "border-[#eaeaea] bg-white text-[#888] hover:border-[#111] hover:text-[#111]"
              }`}
              title={key}
            >
              <Icon size={16} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FormFields({
  form,
  isEdit,
}: {
  form: ReturnType<typeof useForm<CreateForm>> | ReturnType<typeof useForm<EditForm>>;
  isEdit: boolean;
}) {
  const f = form as ReturnType<typeof useForm<CreateForm>>;
  const iconValue = (f.watch("icon") ?? "star") as StaffIconKey;

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>氏名</Label>
          <Input {...f.register("name")} placeholder="山田 太郎" />
          {f.formState.errors.name && <FieldError msg={f.formState.errors.name.message} />}
        </div>
        <div className="space-y-1.5">
          <Label>カナ</Label>
          <Input {...f.register("name_kana")} placeholder="ヤマダ タロウ" />
          {f.formState.errors.name_kana && (
            <FieldError msg={f.formState.errors.name_kana.message} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>職種</Label>
          <select
            {...f.register("occupation")}
            className="w-full rounded-md border border-[#eaeaea] bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#111] focus:outline-none"
          >
            {occupationOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>権限</Label>
          <select
            {...f.register("role")}
            className="w-full rounded-md border border-[#eaeaea] bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#111] focus:outline-none"
          >
            {roleOptions.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <IconPicker value={iconValue} onChange={(key) => f.setValue("icon", key)} />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>1日上限単位</Label>
          <Input
            {...f.register("max_units_per_day", { valueAsNumber: true })}
            type="number"
            min={1}
          />
        </div>
        <div className="space-y-1.5">
          <Label>週上限単位</Label>
          <Input
            {...f.register("max_units_per_week", { valueAsNumber: true })}
            type="number"
            min={1}
          />
        </div>
      </div>

      {!isEdit && (
        <div className="border-t border-[#eaeaea] pt-3">
          <p className="mb-3 text-xs text-[#888]">ログイン情報</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>スタッフID（4桁）</Label>
              <Input
                {...(f as ReturnType<typeof useForm<CreateForm>>).register("staff_code")}
                inputMode="numeric"
                maxLength={4}
                placeholder="0000"
                className="font-mono tracking-widest"
              />
              {(f as ReturnType<typeof useForm<CreateForm>>).formState.errors.staff_code && (
                <FieldError
                  msg={
                    (f as ReturnType<typeof useForm<CreateForm>>).formState.errors.staff_code
                      ?.message
                  }
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>初期パスワード</Label>
              <Input
                {...(f as ReturnType<typeof useForm<CreateForm>>).register("password")}
                type="password"
                placeholder="4文字以上"
              />
              {(f as ReturnType<typeof useForm<CreateForm>>).formState.errors.password && (
                <FieldError
                  msg={
                    (f as ReturnType<typeof useForm<CreateForm>>).formState.errors.password?.message
                  }
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-red-500">{msg}</p>;
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
      {msg}
    </p>
  );
}
