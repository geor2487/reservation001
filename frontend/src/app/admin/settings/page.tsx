"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, auth } from "@/lib/api";
import { User } from "@/lib/types";

export default function AdminSettings() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const u = auth.getUser();
    if (!u || u.role !== "staff") {
      router.push("/admin/login");
      return;
    }
    setUser(u);
    setName(u.name);
  }, [router]);

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
      // localStorageのユーザー情報も更新
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

        {/* テーブル管理 */}
        <Link
          href="/admin/tables"
          className="block bg-white rounded-xl shadow-sm p-6 hover:bg-gray-50 transition"
        >
          <h2 className="font-semibold">テーブル管理</h2>
          <p className="text-sm text-gray-500 mt-1">テーブルの追加・編集・削除</p>
        </Link>
      </main>
    </div>
  );
}
