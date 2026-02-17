"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { api, auth } from "@/lib/api";
import { AvailabilityResponse, Table, Reservation, User } from "@/lib/types";

// 17:30〜22:00まで15分間隔の時間選択肢を生成
const generateTimeOptions = (): string[] => {
  const options: string[] = [];
  for (let h = 17; h <= 22; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 17 && m < 30) continue;
      if (h === 22 && m > 0) break;
      options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return options;
};

const timeOptions = generateTimeOptions();

export default function ReservePage() {
  const [user, setUser] = useState<User | null>(null);
  const [partySize, setPartySize] = useState(0);
  const [date, setDate] = useState("");
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [form, setForm] = useState({
    start_time: "",
    note: "",
  });
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // 今日以降の日付のみ選べるようにする
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const u = auth.getUser();
    setUser(u);
  }, []);

  // 日付が変わったら空き状況を取得
  useEffect(() => {
    if (!date) return;
    const fetchAvailability = async () => {
      try {
        const data = await api<AvailabilityResponse>(
          `/reservations/availability?date=${date}`
        );
        setAvailability(data);
        setSelectedTable(null);
      } catch {
        setError("空き状況の取得に失敗しました");
      }
    };
    fetchAvailability();
  }, [date]);

  // テーブルがその時間帯に空いてるかチェック
  const isTableAvailable = (table: Table, startTime: string): boolean => {
    if (!availability || !startTime) return true;
    const [h, m] = startTime.split(':').map(Number);
    const endTime = `${String(h + 2).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return !availability.reservations.some(
      (r) =>
        r.table_id === table.id &&
        r.status !== "cancelled" &&
        r.start_time < endTime &&
        r.end_time > startTime
    );
  };

  // テーブルの予約状況を取得
  const getTableReservations = (tableId: number): Reservation[] => {
    if (!availability) return [];
    return availability.reservations.filter(
      (r) => r.table_id === tableId && r.status !== "cancelled"
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedTable || !date || !form.start_time || partySize < 1) {
      setError("人数、テーブル、日付、時間を選んでください");
      return;
    }

    if (!user && (!guestName || !guestPhone)) {
      setError("名前と電話番号を入力してください");
      return;
    }

    if (partySize > selectedTable.capacity) {
      setError(`このテーブルの最大人数は${selectedTable.capacity}人です`);
      return;
    }

    setLoading(true);
    try {
      if (user) {
        const token = auth.getToken();
        await api<Reservation>("/reservations/customer", {
          method: "POST",
          token: token!,
          body: {
            table_id: selectedTable.id,
            date,
            start_time: form.start_time,
            party_size: partySize,
            note: form.note || null,
          },
        });
      } else {
        await api<Reservation>("/reservations/guest", {
          method: "POST",
          body: {
            table_id: selectedTable.id,
            date,
            start_time: form.start_time,
            party_size: partySize,
            note: form.note || null,
            customer_name: guestName,
            customer_phone: guestPhone,
          },
        });
      }
      setSuccess("予約が完了しました！");
      setSelectedTable(null);
      setPartySize(0);
      setForm({ start_time: "", note: "" });
      setGuestName("");
      setGuestPhone("");
      // 空き状況を再取得
      const data = await api<AvailabilityResponse>(
        `/reservations/availability?date=${date}`
      );
      setAvailability(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "予約に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    auth.logout();
    setUser(null);
  };

  return (
    <div className="min-h-screen">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-gray-800">
            POND
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  href="/reserve/my-reservations"
                  className="text-sm text-orange-500 hover:underline"
                >
                  マイ予約
                </Link>
                <span className="text-sm text-gray-900">{user.name}さん</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-400 hover:text-gray-600"
                >
                  ログアウト
                </button>
              </>
            ) : (
              <Link
                href="/reserve/login"
                className="text-sm bg-orange-500 text-white px-4 py-1.5 rounded-lg hover:bg-orange-600"
              >
                ログイン
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">予約する</h1>

        {!user && (
          <p className="text-sm text-gray-900 mb-4">
            <Link href="/reserve/login" className="text-orange-500 hover:underline">ログイン</Link>
            すると予約履歴の確認やキャンセルが簡単にできます
          </p>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm">{success}</div>
        )}

        {/* Step 1: 人数選択 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="font-semibold mb-3">1. 人数を選択</h2>
          <input
            type="number"
            min={1}
            value={partySize || ""}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 0;
              setPartySize(val);
              setSelectedTable(null);
            }}
            placeholder="人数を入力"
            className="w-32 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
          />
          {partySize >= 1 && (
            <span className="ml-2 text-sm text-gray-900">{partySize}名</span>
          )}
        </div>

        {/* Step 2: 日付選択 */}
        {partySize >= 1 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="font-semibold mb-3">2. 日付を選択</h2>
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>
        )}

        {/* Step 3: 来店時間選択 */}
        {partySize >= 1 && availability && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="font-semibold mb-3">3. 来店時間を選択</h2>
            <select
              value={form.start_time}
              onChange={(e) => {
                setForm({ ...form, start_time: e.target.value });
                setSelectedTable(null);
              }}
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
            >
              <option value="">選択してください</option>
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Step 4: テーブル選択 */}
        {partySize >= 1 && availability && form.start_time && (() => {
          const filteredTables = availability.tables.filter(
            (t) => t.capacity >= partySize && t.capacity <= partySize + 2
          );
          return (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="font-semibold mb-3">4. テーブルを選択</h2>
              {filteredTables.length === 0 ? (
                <p className="text-sm text-gray-900">
                  {partySize}名に適したテーブルがありません。人数を変更してください。
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                  {filteredTables.map((table) => {
                    const reservations = getTableReservations(table.id);
                    const isSelected = selectedTable?.id === table.id;
                    const available = isTableAvailable(table, form.start_time);

                    return (
                      <button
                        key={table.id}
                        type="button"
                        onClick={() => setSelectedTable(table)}
                        className={`p-4 rounded-lg border-2 text-left transition ${
                          isSelected
                            ? "border-orange-500 bg-orange-50"
                            : available
                            ? "border-gray-200 hover:border-orange-300"
                            : "border-gray-200 bg-gray-100 opacity-50"
                        }`}
                        disabled={!available}
                      >
                        <div className="font-medium">{table.table_name}</div>
                        <div className="text-sm text-gray-900">
                          最大{table.capacity}人
                        </div>
                        {!available && (
                          <div className="mt-1 text-xs text-red-500">
                            予約済み
                          </div>
                        )}
                        {available && reservations.length > 0 && (
                          <div className="mt-1 text-xs text-gray-900">
                            {reservations.length}件予約あり
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Step 5: テーブル選択後に詳細入力フォーム表示 */}
              {selectedTable && (
                <form onSubmit={handleSubmit}>
                  <h3 className="font-semibold mb-3">
                    {selectedTable.table_name} - 詳細を入力
                  </h3>

                  {!user && (
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          お名前 *
                        </label>
                        <input
                          type="text"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          required
                          placeholder="山田 太郎"
                          className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          電話番号 *
                        </label>
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={11}
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value.replace(/[^0-9]/g, ""))}
                          required
                          placeholder="09012345678"
                          className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      メモ（アレルギーや要望など）
                    </label>
                    <textarea
                      value={form.note}
                      onChange={(e) => setForm({ ...form, note: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
                      rows={2}
                      placeholder="例：えびアレルギーあり"
                    />
                  </div>

                  {/* そのテーブルの既存予約を表示 */}
                  {getTableReservations(selectedTable.id).length > 0 && (
                    <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm font-medium text-yellow-700 mb-1">
                        この日の {selectedTable.table_name} の予約：
                      </p>
                      {getTableReservations(selectedTable.id).map((r) => (
                        <p key={r.id} className="text-sm text-yellow-600">
                          {r.start_time.slice(0, 5)}〜{r.end_time.slice(0, 5)} ({r.party_size}人)
                        </p>
                      ))}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition disabled:opacity-50 font-medium"
                  >
                    {loading ? "予約中..." : "予約を確定する"}
                  </button>
                </form>
              )}
            </div>
          );
        })()}
      </main>
    </div>
  );
}
