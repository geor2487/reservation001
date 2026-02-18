"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, staffAuth as auth } from "@/lib/api";
import { Table, Reservation, AvailabilityResponse } from "@/lib/types";

// 17:30〜24:00まで15分間隔の時間選択肢を生成
const generateTimeOptions = (): string[] => {
  const options: string[] = [];
  for (let h = 17; h <= 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 17 && m < 30) continue;
      if (h === 24 && m > 0) break;
      options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return options;
};

const timeOptions = generateTimeOptions();

export default function AdminNewReservation() {
  const router = useRouter();
  const [tables, setTables] = useState<Table[]>([]);
  const [form, setForm] = useState({
    table_id: "",
    customer_name: "",
    customer_phone: "",
    date: new Date().toISOString().split("T")[0],
    start_time: "",
    party_size: 1,
    note: "",
  });
  const [availability, setAvailability] = useState<Reservation[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const u = auth.getUser();
    if (!u || u.role !== "staff") {
      router.push("/admin/login");
      return;
    }
    fetchTables();
  }, [router]);

  // 日付変更時にその日の予約を取得
  useEffect(() => {
    if (form.date) fetchAvailability();
  }, [form.date]);

  const fetchTables = async () => {
    try {
      const data = await api<Table[]>("/tables");
      setTables(data);
    } catch {
      setError("テーブル一覧の取得に失敗しました");
    }
  };

  const fetchAvailability = async () => {
    try {
      const data = await api<AvailabilityResponse>(
        `/reservations/availability?date=${form.date}`
      );
      setAvailability(data.reservations);
    } catch {
      // silent
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const token = auth.getToken();
    try {
      await api<Reservation>("/reservations/staff", {
        method: "POST",
        token: token!,
        body: {
          table_id: parseInt(form.table_id),
          customer_name: form.customer_name,
          customer_phone: form.customer_phone || null,
          date: form.date,
          start_time: form.start_time,
          party_size: form.party_size,
          note: form.note || null,
        },
      });
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "予約登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // 選択中テーブルのその日の予約
  const selectedTableReservations = form.table_id
    ? availability.filter(
        (r) => r.table_id === parseInt(form.table_id) && r.status === "confirmed"
      )
    : [];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-lg font-bold">管理画面</Link>
            <nav className="flex gap-3 text-sm">
              <Link href="/admin" className="text-gray-300 hover:text-white">予約一覧</Link>
              <Link href="/admin/reservations/new" className="text-orange-300 hover:text-orange-200">予約登録</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-6">予約を登録</h1>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">お客さん名 *</label>
              <input
                type="text"
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                required
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-500 outline-none"
                placeholder="山田太郎"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">電話番号</label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={11}
                value={form.customer_phone}
                onChange={(e) => setForm({ ...form, customer_phone: e.target.value.replace(/[^0-9]/g, "") })}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-500 outline-none"
                placeholder="09012345678"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">日付 *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">テーブル *</label>
            <select
              value={form.table_id}
              onChange={(e) => setForm({ ...form, table_id: e.target.value })}
              required
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-500 outline-none"
            >
              <option value="">選択してください</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.table_name}（最大{t.capacity}人）
                </option>
              ))}
            </select>
          </div>

          {/* 選択テーブルの既存予約を表示 */}
          {selectedTableReservations.length > 0 && (
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm font-medium text-yellow-700 mb-1">
                この日の予約：
              </p>
              {selectedTableReservations.map((r) => (
                <p key={r.id} className="text-sm text-yellow-600">
                  {r.start_time?.slice(0, 5)}〜{r.end_time?.slice(0, 5)} {r.customer_name}
                  ({r.party_size}人)
                </p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">開始時間 *</label>
              <select
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                required
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-500 outline-none"
              >
                <option value="">選択してください</option>
                {timeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">人数 *</label>
              <input
                type="number"
                min={1}
                value={form.party_size}
                onChange={(e) => setForm({ ...form, party_size: parseInt(e.target.value) })}
                required
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">メモ</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-500 outline-none"
              rows={2}
              placeholder="アレルギー情報、要望など"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-700 text-white py-3 rounded-lg hover:bg-gray-800 transition disabled:opacity-50 font-medium"
          >
            {loading ? "登録中..." : "予約を登録する"}
          </button>
        </form>
      </main>
    </div>
  );
}
