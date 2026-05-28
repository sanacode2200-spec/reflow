"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createStaff, updateStaff } from "@/lib/actions/staff";
import type { StaffRow } from "@/lib/actions/staff";
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

const createSchema = z.object({
  name: z.string().min(1, "氏名を入力してください"),
  name_kana: z.string().min(1, "カナを入力してください"),
  role: z.enum(["admin", "therapist"]),
  occupation: z.enum(["pt", "ot", "st"]),
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
        max_units_per_day: staff.max_units_per_day,
        max_units_per_week: staff.max_units_per_week,
      });
    }
  }, [open, staff]); // eslint-disable-line react-hooks/exhaustive-deps

  const isSubmitting = isEdit ? editForm.formState.isSubmitting : createForm.formState.isSubmitting;

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
      <DialogContent className="border-border bg-popover/90 max-w-md shadow-[0_24px_60px_rgba(20,24,60,0.14)] ring-0 backdrop-blur-xl">
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
              <Button type="submit" disabled={isSubmitting}>
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "登録中..." : "登録する"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
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
            className="border-input focus:ring-ring/50 h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm transition-colors outline-none focus:ring-3"
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
            className="border-input focus:ring-ring/50 h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm transition-colors outline-none focus:ring-3"
          >
            {roleOptions.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

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
        <div className="border-border border-t pt-3">
          <p className="text-muted-foreground mb-3 text-xs">ログイン情報</p>
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
  return <p className="text-destructive text-xs">{msg}</p>;
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <p className="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
      {msg}
    </p>
  );
}
