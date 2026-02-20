"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, staffAuth as auth } from "@/lib/api";
import { Reservation, Table } from "@/lib/types";
import CustomerDetailModal from "./components/CustomerDetailModal";
import { AdminHeader, AdminUserMenu } from "@/components/AdminHeader";
import { AlertMessage } from "@/components/AlertMessage";
import { useRequireAuth } from "@/hooks/useRequireAuth";

// タイムライン用定数
const START_HOUR = 17;
const END_HOUR = 24;
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;

const getLeftPercent = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  const minutes = (h - START_HOUR) * 60 + m;
  return Math.max(0, (minutes / TOTAL_MINUTES) * 100);
};

const getWidthPercent = (startTime: string, endTime: string): number => {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const duration = (eh - sh) * 60 + (em - sm);
  return Math.max(0, (duration / TOTAL_MINUTES) * 100);
};

export default function AdminDashboard() {
  const router = useRouter();
  const user = useRequireAuth(auth, "staff", "/admin/login");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalTarget, setModalTarget] = useState<{ customerId: string | null; customerPhone: string | null } | null>(null);

  const fetchReservations = useCallback(async () => {
    const token = auth.getToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await api<Reservation[]>(
        `/reservations?date=${date}`,
        { token }
      );
      setReservations(data);
    } catch {
      setError("予約の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [date]);

  const fetchTables = useCallback(async () => {
    try {
      const data = await api<Table[]>("/tables");
      setTables(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  useEffect(() => {
    if (user) fetchReservations();
  }, [user, date, fetchReservations]);

  const handleCancel = async (id: number) => {
    if (!confirm("この予約をキャンセルしますか？")) return;
    const token = auth.getToken();
    try {
      await api(`/reservations/${id}/cancel`, { method: "PATCH", token: token! });
      fetchReservations();
    } catch (err) {
      alert(err instanceof Error ? err.message : "キャンセルに失敗しました");
    }
  };

  const handleLogout = () => {
    auth.logout();
    router.push("/admin/login");
  };

  // 日付を1日ずらすヘルパー
  const changeDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split("T")[0]);
  };

  // テーブルごとの確定予約を取得
  const getTableReservations = (tableId: number) =>
    reservations.filter((r) => r.table_id === tableId && r.status === "confirmed");

  const openCustomerModal = (r: Reservation) => {
    setModalTarget({
      customerId: r.customer_id,
      customerPhone: r.customer_phone,
    });
  };

  const confirmedCount = reservations.filter((r) => r.status === "confirmed").length;
  const totalGuests = reservations
    .filter((r) => r.status === "confirmed")
    .reduce((sum, r) => sum + r.party_size, 0);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminHeader
        currentPage="reservations"
        rightContent={user ? <AdminUserMenu user={user} onLogout={handleLogout} /> : undefined}
      />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* 日付選択 & サマリー */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeDate(-1)}
              className="px-3 py-1 bg-white rounded-lg shadow-sm hover:bg-gray-50"
            >
              ←
            </button>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-gray-500 outline-none"
            />
            <button
              onClick={() => changeDate(1)}
              className="px-3 py-1 bg-white rounded-lg shadow-sm hover:bg-gray-50"
            >
              →
            </button>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="bg-white px-3 py-1 rounded-lg shadow-sm">
              予約数: <strong>{confirmedCount}件</strong>
            </span>
            <span className="bg-white px-3 py-1 rounded-lg shadow-sm">
              来客数: <strong>{totalGuests}人</strong>
            </span>
          </div>
        </div>

        <AlertMessage error={error} />

        {/* タイムライン */}
        {loading ? (
          <div className="text-center py-12 text-gray-900">読み込み中...</div>
        ) : reservations.length === 0 && tables.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-900">
            この日の予約はありません
            <div className="mt-4">
              <Link
                href="/admin/reservations/new"
                className="text-orange-500 hover:underline text-sm"
              >
                + 予約を登録する
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* タイムライン表示 */}
            {tables.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 overflow-x-auto mb-6">
                {/* 時間ヘッダー */}
                <div className="flex min-w-[700px]">
                  <div className="w-28 shrink-0" />
                  <div className="flex-1 relative h-6">
                    {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i).map((h) => (
                      <span
                        key={h}
                        className="absolute text-xs text-gray-900 -translate-x-1/2"
                        style={{ left: `${getLeftPercent(`${h}:00`)}%` }}
                      >
                        {h}:00
                      </span>
                    ))}
                  </div>
                </div>

                {/* テーブル行 */}
                {tables.map((table) => {
                  const tableReservations = getTableReservations(table.id);
                  return (
                    <div key={table.id} className="flex min-w-[700px] border-t border-gray-100">
                      <div className="w-28 shrink-0 py-3 pr-3">
                        <div className="text-sm font-medium text-gray-900">{table.table_name}</div>
                        <div className="text-xs text-gray-900">{table.capacity}人</div>
                      </div>
                      <div className="flex-1 relative h-14 bg-gray-50 rounded">
                        {/* 時間の区切り線 */}
                        {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i).map((h) => (
                          <div
                            key={h}
                            className="absolute top-0 bottom-0 border-l border-gray-200"
                            style={{ left: `${getLeftPercent(`${h}:00`)}%` }}
                          />
                        ))}
                        {/* 予約ブロック */}
                        {tableReservations.map((r) => (
                          <div
                            key={r.id}
                            className="absolute top-1 bottom-1 bg-orange-100 border border-orange-300 rounded-md px-1.5 flex items-center overflow-hidden cursor-pointer hover:bg-orange-200 transition-colors"
                            style={{
                              left: `${getLeftPercent(r.start_time)}%`,
                              width: `${getWidthPercent(r.start_time, r.end_time)}%`,
                            }}
                            title={`${r.customer_name} ${r.party_size}人 ${r.start_time?.slice(0, 5)}〜${r.end_time?.slice(0, 5)}${r.note ? `\nメモ: ${r.note}` : ""}`}
                            onClick={() => openCustomerModal(r)}
                          >
                            <span className="text-xs text-orange-900 truncate font-medium">
                              {r.customer_name} {r.party_size}人
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 詳細テーブル一覧 */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-left text-sm text-gray-900">
                    <th className="px-4 py-3">時間</th>
                    <th className="px-4 py-3">テーブル</th>
                    <th className="px-4 py-3">お客さん</th>
                    <th className="px-4 py-3">人数</th>
                    <th className="px-4 py-3">メモ</th>
                    <th className="px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((r) => (
                    <tr
                      key={r.id}
                      className={`border-t ${
                        r.status === "cancelled" ? "bg-gray-50 opacity-60" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-sm">
                        {r.start_time?.slice(0, 5)}〜{r.end_time?.slice(0, 5)}
                      </td>
                      <td className="px-4 py-3 text-sm">{r.table_name}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openCustomerModal(r)}
                          className="text-left hover:underline"
                        >
                          <div className="text-sm font-medium text-gray-900">{r.customer_name}</div>
                          {r.customer_phone && (
                            <div className="text-xs text-gray-500">{r.customer_phone}</div>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm">{r.party_size}人</td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-[150px] truncate">
                        {r.note || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {r.status === "confirmed" && (
                          <button
                            onClick={() => handleCancel(r.id)}
                            className="text-xs text-red-500 hover:text-red-700 hover:underline"
                          >
                            キャンセル
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {/* 顧客詳細モーダル */}
      {modalTarget && (
        <CustomerDetailModal
          customerId={modalTarget.customerId}
          customerPhone={modalTarget.customerPhone}
          onClose={() => setModalTarget(null)}
        />
      )}
    </div>
  );
}
