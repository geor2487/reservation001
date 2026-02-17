"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, auth } from "@/lib/api";
import { User } from "@/lib/types";

type Customer = {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  created_at: string;
};

export default function AdminSettings() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [loginForm, setLoginForm] = useState({
    email: "",
    current_password: "",
    new_password: "",
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    const u = auth.getUser();
    if (!u || u.role !== "staff") {
      router.push("/admin/login");
      return;
    }
    setUser(u);
    setName(u.name);
    setLoginForm((prev) => ({ ...prev, email: u.email }));
  }, [router]);

  const fetchCustomers = useCallback(async () => {
    const token = auth.getToken();
    if (!token) return;
    try {
      const data = await api<Customer[]>("/auth/customers", { token });
      setCustomers(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleNameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!name.trim()) {
      setError("名前を入力してください");
      return;
    }
    setLoading(true);
    const token = auth.getToken();
    try {
      const data = await api<{ user: User }>("/auth/staff/name", {
        method: "PUT",
        token: token!,
        body: { name: name.trim() },
      });
      const currentUser = auth.getUser();
      if (currentUser) {
        auth.login(token!, { ...currentUser, name: data.user.name });
      }
      setUser(data.user);
      setSuccess("ユーザー名を変更しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "変更に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!loginForm.current_password) {
      setError("現在のパスワードを入力してください");
      return;
    }
    setLoginLoading(true);
    const token = auth.getToken();
    try {
      const data = await api<{ user: User }>("/auth/staff/login-settings", {
        method: "PUT",
        token: token!,
        body: loginForm,
      });
      const currentUser = auth.getUser();
      if (currentUser) {
        auth.login(token!, { ...currentUser, email: data.user.email });
      }
      setLoginForm({ email: data.user.email, current_password: "", new_password: "" });
      setSuccess("ログイン設定を変更しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "変更に失敗しました");
    } finally {
      setLoginLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-lg font-bold">管理画面</Link>
            <nav className="flex gap-3 text-sm">
              <Link href="/admin" className="text-gray-300 hover:text-white">予約一覧</Link>
              <Link href="/admin/reservations/new" className="text-gray-300 hover:text-white">予約登録</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-6">設定</h1>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm">{success}</div>
        )}

        {/* ユーザー名変更 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="font-semibold mb-4">ユーザー名を変更</h2>
          <form onSubmit={handleNameChange} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-900 mb-1">ユーザー名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-500 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? "変更中..." : "変更"}
            </button>
          </form>
        </div>

        {/* ログイン設定 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="font-semibold mb-4">ログイン設定</h2>
          <form onSubmit={handleLoginSettings} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">メールアドレス</label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">新しいパスワード</label>
              <input
                type="password"
                value={loginForm.new_password}
                onChange={(e) => setLoginForm({ ...loginForm, new_password: e.target.value })}
                placeholder="変更しない場合は空欄"
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">現在のパスワード *</label>
              <input
                type="password"
                value={loginForm.current_password}
                onChange={(e) => setLoginForm({ ...loginForm, current_password: e.target.value })}
                required
                placeholder="確認のため入力"
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-500 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {loginLoading ? "変更中..." : "ログイン設定を変更"}
            </button>
          </form>
        </div>

        {/* テーブル管理 */}
        <Link
          href="/admin/tables"
          className="block bg-white rounded-xl shadow-sm p-6 hover:bg-gray-50 transition mb-6"
        >
          <h2 className="font-semibold">テーブル管理</h2>
          <p className="text-sm text-gray-500 mt-1">テーブルの追加・編集・削除</p>
        </Link>

        {/* 顧客情報 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold mb-4">顧客情報</h2>
          {customers.length === 0 ? (
            <p className="text-sm text-gray-500">登録済みの顧客はいません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-left text-sm text-gray-900">
                    <th className="px-3 py-2">名前</th>
                    <th className="px-3 py-2">電話番号</th>
                    <th className="px-3 py-2">メール</th>
                    <th className="px-3 py-2">登録日</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="border-t text-sm">
                      <td className="px-3 py-2 font-medium">{c.name}</td>
                      <td className="px-3 py-2">{c.phone}</td>
                      <td className="px-3 py-2 text-gray-500">{c.email || "-"}</td>
                      <td className="px-3 py-2 text-gray-500">
                        {new Date(c.created_at).toLocaleDateString("ja-JP")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
