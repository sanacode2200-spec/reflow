"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [staffCode, setStaffCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^\d{4}$/.test(staffCode)) {
      setError("スタッフIDは数字4桁で入力してください");
      return;
    }

    setLoading(true);
    const email = `${staffCode}@reflow.local`;
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError("IDまたはパスワードが正しくありません");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="glass-card w-full max-w-sm p-8">
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl text-base font-bold text-white"
            style={{ background: "linear-gradient(135deg, #6366f1, #ec4899)" }}
          >
            R
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1f2b]">ReFlow</h1>
          <p className="mt-1 text-sm text-[#8a8fa3]">リハビリ管理システム</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="staffCode">スタッフID</Label>
            <Input
              id="staffCode"
              type="text"
              inputMode="numeric"
              value={staffCode}
              onChange={(e) => setStaffCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="0000"
              required
              maxLength={4}
              className="text-center font-mono text-lg tracking-[0.4em]"
              autoComplete="username"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full rounded-full bg-[#6366f1] hover:bg-[#4f52e0]"
            disabled={loading}
          >
            {loading ? "ログイン中..." : "ログイン"}
          </Button>
        </form>
      </div>
    </div>
  );
}
