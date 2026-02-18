"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, customerAuth as auth } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import { AuthResponse } from "@/lib/types";

export default function CustomerRegister() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!/^0\d{9,10}$/.test(form.phone)) {
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

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

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

        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-gray-300" />
          <span className="px-4 text-sm text-gray-500">または</span>
          <div className="flex-1 border-t border-gray-300" />
        </div>

        <button
          type="button"
          onClick={() => {
            getSupabase().auth.signInWithOAuth({
              provider: "google",
              options: {
                redirectTo: window.location.origin + "/reserve/auth/callback",
              },
            });
          }}
          className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg py-2 px-4 hover:bg-gray-50 transition"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          <span className="text-sm font-medium text-gray-700">Googleでログイン</span>
        </button>

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
