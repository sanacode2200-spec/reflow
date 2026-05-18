"use client";

import { useState } from "react";
import { adminResetPassword } from "@/lib/actions/staff";
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

type Props = {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  staff: StaffRow | null;
};

export default function ResetPasswordModal({ open, onClose, tenantId, staff }: Props) {
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff) return;
    setError(null);

    if (newPassword !== confirm) {
      setError("パスワードが一致しません");
      return;
    }

    setLoading(true);
    try {
      await adminResetPassword(tenantId, staff.id, newPassword);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNewPassword("");
    setConfirm("");
    setError(null);
    setDone(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>パスワードリセット</DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="py-4 text-center">
            <p className="text-sm text-[#111]">
              <strong>{staff?.name}</strong> のパスワードをリセットしました。
            </p>
            <Button className="mt-4 bg-black hover:bg-[#111]" onClick={handleClose}>
              閉じる
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-[#888]">
              <strong className="text-[#111]">{staff?.name}</strong>（ID: {staff?.staff_code}
              ）の新しいパスワードを設定します。
            </p>

            <div className="space-y-1.5">
              <Label>新しいパスワード</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="4文字以上"
                required
                minLength={4}
              />
            </div>
            <div className="space-y-1.5">
              <Label>確認</Label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="もう一度入力"
                required
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                キャンセル
              </Button>
              <Button type="submit" disabled={loading} className="bg-black hover:bg-[#111]">
                {loading ? "設定中..." : "パスワードを設定"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
