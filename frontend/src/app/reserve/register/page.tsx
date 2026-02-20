"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, customerAuth as auth } from "@/lib/api";
import { AuthResponse } from "@/lib/types";
import { AlertMessage } from "@/components/AlertMessage";
import { GoogleOAuthButton } from "@/components/GoogleOAuthButton";
import { validatePhone } from "@/lib/utils";

export default function CustomerRegister() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!validatePhone(form.phone)) {
      setError("電話番号は0始まりの10〜11桁の数字で入力してください");
      setLoading(false);
      return;
    }

    try {
      const data = await api<AuthResponse>("/auth/customer/register", {
        method: "POST",
        body: form,
      });
      auth.login(data.token, data.user);
      router.push("/reserve");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">新規登録</h1>

        <AlertMessage error={error} />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">お名前 *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              placeholder="田中花子"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">メールアドレス *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              placeholder="example@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">電話番号 *</label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={11}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^0-9]/g, "") })}
              required
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              placeholder="09012345678"
            />
            <p className="mt-1 text-xs text-gray-500">ハイフンなし（例: 09012345678）</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">パスワード *</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              placeholder="6文字以上"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
          >
            {loading ? "登録中..." : "登録してはじめる"}
          </button>
        </form>

        <GoogleOAuthButton />

        <div className="mt-4 text-center text-sm text-gray-900">
          既にアカウントがある方は
          <Link href="/reserve/login" className="text-orange-500 hover:underline ml-1">
            ログイン
          </Link>
        </div>
      </div>
    </div>
  );
}
