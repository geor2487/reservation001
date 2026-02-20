"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, customerAuth } from "@/lib/api";
import { User } from "@/lib/types";
import { AlertMessage } from "@/components/AlertMessage";
import { validatePhone } from "@/lib/utils";

export default function CompleteProfile() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const currentUser = customerAuth.getUser();
    if (!currentUser) {
      router.push("/reserve/login");
      return;
    }
    setUser(currentUser);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validatePhone(phone)) {
      setError("電話番号は0始まりの10〜11桁の数字で入力してください");
      return;
    }

    setLoading(true);

    try {
      const token = customerAuth.getToken();
      const result = await api<{ user: User }>("/auth/customer/profile", {
        method: "PUT",
        token: token || undefined,
        body: {
          name: user!.name,
          email: user!.email,
          phone,
        },
      });
      customerAuth.login(token!, result.user);
      router.push("/reserve");
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2">プロフィール登録</h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          予約に必要な情報を入力してください
        </p>

        <AlertMessage error={error} />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">お名前</label>
            <input
              type="text"
              value={user.name || ""}
              readOnly
              className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">メールアドレス</label>
            <input
              type="email"
              value={user.email || ""}
              readOnly
              className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">電話番号 *</label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={11}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
              required
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              placeholder="09012345678"
            />
            <p className="mt-1 text-xs text-gray-500">ハイフンなし（例: 09012345678）</p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
          >
            {loading ? "登録中..." : "登録して予約へ進む"}
          </button>
        </form>
      </div>
    </div>
  );
}
