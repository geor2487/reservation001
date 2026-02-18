"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, staffAuth as auth } from "@/lib/api";
import { Table } from "@/lib/types";

export default function AdminTables() {
  const router = useRouter();
  const [tables, setTables] = useState<Table[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ table_name: "", capacity: 2 });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = auth.getUser();
    if (!u || u.role !== "staff") {
      router.push("/admin/login");
      return;
    }
  }, [router]);

  const fetchTables = useCallback(async () => {
    try {
      const data = await api<Table[]>("/tables");
      setTables(data);
    } catch {
      setError("テーブル一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = auth.getToken();
    try {
      await api("/tables", {
        method: "POST",
        token: token!,
        body: { table_name: form.table_name, capacity: form.capacity },
      });
      setForm({ table_name: "", capacity: 2 });
      setShowForm(false);
      fetchTables();
    } catch (err) {
      setError(err instanceof Error ? err.message : "追加に失敗しました");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const token = auth.getToken();
    try {
      await api(`/tables/${editingId}`, {
        method: "PUT",
        token: token!,
        body: { table_name: form.table_name, capacity: form.capacity },
      });
      setEditingId(null);
      setForm({ table_name: "", capacity: 2 });
      fetchTables();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`「${name}」を無効化しますか？`)) return;
    const token = auth.getToken();
    try {
      await api(`/tables/${id}`, { method: "DELETE", token: token! });
      fetchTables();
    } catch (err) {
      alert(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  const startEdit = (table: Table) => {
    setEditingId(table.id);
    setForm({ table_name: table.table_name, capacity: table.capacity });
    setShowForm(false);
  };

  const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/admin" className="text-lg font-bold">管理画面</Link>
          <nav className="flex gap-3 text-sm">
            <Link href="/admin" className="text-gray-300 hover:text-white">予約一覧</Link>
            <Link href="/admin/reservations/new" className="text-gray-300 hover:text-white">予約登録</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-bold">テーブル管理</h1>
            <p className="text-sm text-gray-900">
              {tables.length}テーブル / 合計{totalCapacity}席
            </p>
          </div>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setForm({ table_name: "", capacity: 2 });
            }}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 text-sm"
          >
            + テーブル追加
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        {/* 追加/編集フォーム */}
        {(showForm || editingId) && (
          <form
            onSubmit={editingId ? handleEdit : handleAdd}
            className="bg-white rounded-xl shadow-sm p-5 mb-6"
          >
            <h2 className="font-semibold mb-3">
              {editingId ? "テーブルを編集" : "テーブルを追加"}
            </h2>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-900 mb-1">テーブル名</label>
                <input
                  type="text"
                  value={form.table_name}
                  onChange={(e) => setForm({ ...form, table_name: e.target.value })}
                  required
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-500 outline-none"
                  placeholder="例：カウンター1"
                />
              </div>
              <div className="w-32">
                <label className="block text-sm font-medium text-gray-900 mb-1">席数</label>
                <input
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) })}
                  required
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-500 outline-none"
                />
              </div>
              <button
                type="submit"
                className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800"
              >
                {editingId ? "更新" : "追加"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="text-gray-400 hover:text-gray-600 px-2 py-2"
              >
                キャンセル
              </button>
            </div>
          </form>
        )}

        {/* テーブル一覧 */}
        {loading ? (
          <div className="text-center py-12 text-gray-900">読み込み中...</div>
        ) : (
          <div className="space-y-3">
            {tables.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-xl shadow-sm p-4 flex justify-between items-center"
              >
                <div>
                  <span className="font-medium">{t.table_name}</span>
                  <span className="ml-3 text-sm text-gray-900">最大{t.capacity}人</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(t)}
                    className="text-sm text-blue-500 hover:text-blue-700 hover:underline"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(t.id, t.table_name)}
                    className="text-sm text-red-500 hover:text-red-700 hover:underline"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
