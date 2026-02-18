"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, customerAuth as auth } from "@/lib/api";
import { User } from "@/lib/types";

export default function CustomerSettings() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    const u = auth.getUser();
    if (!u || u.role !== "customer") {
      router.push("/reserve/login");
      return;
    }
    setUser(u);
    setForm({ name: u.name, phone: u.phone || "", email: u.email || "" });
  }, [router]);

  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!form.name.trim() || !form.email || !form.phone) {
      setError("名前、メールアドレス、電話番号は必須です");
      return;
    }
    if (!/^0\d{9,10}$/.test(form.phone)) {
      setError("電話番号は0始まりの10〜11桁の数字で入力してください");
      return;
    }
    setLoading(true);
    const token = auth.getToken();
    try {
      const data = await api<{ user: User }>("/auth/customer/profile", {
        method: "PUT",
        token: token!,
        body: { name: form.name, phone: form.phone, email: form.email || null },
      });
      auth.login(token!, { ...data.user, role: "customer" });
      setUser({ ...data.user, role: "customer" });
      setSuccess("登録情報を変更しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "変更に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!passwordForm.current_password || !passwordForm.new_password) {
      setError("現在のパスワードと新しいパスワードを入力してください");
      return;
    }
    setPwLoading(true);
    const token = auth.getToken();
    try {
      await api("/auth/customer/profile", {
        method: "PUT",
        token: token!,
        body: {
          name: form.name,
          phone: form.phone,
          email: form.email || null,
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        },
      });
      setPasswordForm({ current_password: "", new_password: "" });
      setSuccess("パスワードを変更しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "変更に失敗しました");
    } finally {
      setPwLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-gray-800">
            POND
          </Link>
          <Link href="/reserve" className="text-sm text-orange-500 hover:underline">
            ← 予約に戻る
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">設定</h1>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm">{success}</div>
        )}

        {/* 登録情報 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="font-semibold mb-4">登録情報</h2>
          <form onSubmit={handleProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">お名前 *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">メールアドレス *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
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
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="09012345678"
              />
              <p className="mt-1 text-xs text-gray-500">ハイフンなし（例: 09012345678）</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
            >
              {loading ? "変更中..." : "登録情報を変更"}
            </button>
          </form>
        </div>

        {/* パスワード変更 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold mb-4">パスワード変更</h2>
          <form onSubmit={handlePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">現在のパスワード</label>
              <input
                type="password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                required
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">新しいパスワード</label>
              <input
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                required
                minLength={6}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="6文字以上"
              />
            </div>
            <button
              type="submit"
              disabled={pwLoading}
              className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
            >
              {pwLoading ? "変更中..." : "パスワードを変更"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
