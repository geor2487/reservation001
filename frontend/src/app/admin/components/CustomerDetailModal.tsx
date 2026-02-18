"use client";
import { useState, useEffect, useCallback } from "react";
import { api, staffAuth as auth } from "@/lib/api";
import { CustomerDetail } from "@/lib/types";

type Props = {
  customerId: string | null;
  customerPhone: string | null;
  onClose: () => void;
};

export default function CustomerDetailModal({ customerId, customerPhone, onClose }: Props) {
  const [data, setData] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [staffNote, setStaffNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const fetchData = useCallback(async () => {
    const token = auth.getToken();
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      let result: CustomerDetail;
      if (customerId) {
        result = await api<CustomerDetail>(`/customers/${customerId}/detail`, { token });
      } else if (customerPhone) {
        result = await api<CustomerDetail>(`/customers/by-phone/${encodeURIComponent(customerPhone)}`, { token });
      } else {
        setError("顧客情報が見つかりません");
        setLoading(false);
        return;
      }
      setData(result);
      setStaffNote(result.profile?.staff_note ?? "");
    } catch {
      setError("顧客情報の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [customerId, customerPhone]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveNote = async () => {
    if (!data?.profile?.id) return;
    const token = auth.getToken();
    if (!token) return;
    setSaving(true);
    setSaveMessage("");
    try {
      await api(`/customers/${data.profile.id}/staff-note`, {
        method: "PUT",
        token,
        body: { note: staffNote },
      });
      setSaveMessage("保存しました");
      setTimeout(() => setSaveMessage(""), 2000);
    } catch {
      setSaveMessage("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">顧客情報</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">読み込み中...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : data ? (
            <>
              {/* 基本情報 */}
              <section>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">基本情報</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-1.5 text-sm">
                  {data.profile ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500">名前</span>
                        <span className="font-medium text-gray-900">{data.profile.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">電話番号</span>
                        <span className="text-gray-900">{data.profile.phone ?? "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">メール</span>
                        <span className="text-gray-900">{data.profile.email ?? "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">登録日</span>
                        <span className="text-gray-900">{formatDate(data.profile.created_at)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-500">
                      ゲスト予約（未登録）
                      {customerPhone && (
                        <span className="ml-2 text-gray-900">{customerPhone}</span>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* 来店情報 */}
              <section>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">来店情報</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">来店回数</span>
                    <span className="font-medium text-gray-900">{data.visitCount}回</span>
                  </div>
                  {data.reservations.length > 0 && (() => {
                    const today = new Date().toISOString().split("T")[0];
                    const pastVisits = data.reservations.filter(
                      (r) => r.status === "confirmed" && r.date <= today
                    );
                    if (pastVisits.length === 0) return null;
                    const last = pastVisits[0];
                    return (
                      <div className="flex justify-between">
                        <span className="text-gray-500">前回来店</span>
                        <span className="text-gray-900">
                          {formatDate(last.date)} {last.start_time?.slice(0, 5)} {last.table_name} {last.party_size}人
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </section>

              {/* スタッフメモ */}
              <section>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">スタッフメモ</h3>
                {data.profile ? (
                  <div className="space-y-2">
                    <textarea
                      value={staffNote}
                      onChange={(e) => setStaffNote(e.target.value)}
                      placeholder="顧客に関するメモを入力..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-500 outline-none resize-none text-gray-900"
                      rows={3}
                    />
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSaveNote}
                        disabled={saving}
                        className="px-4 py-1.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50"
                      >
                        {saving ? "保存中..." : "保存"}
                      </button>
                      {saveMessage && (
                        <span className={`text-sm ${saveMessage.includes("失敗") ? "text-red-500" : "text-green-600"}`}>
                          {saveMessage}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-400">
                    ゲスト予約のためメモ機能は利用できません
                  </div>
                )}
              </section>

              {/* 予約履歴 */}
              <section>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">
                  予約履歴（{data.reservations.length}件）
                </h3>
                {data.reservations.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-400">予約履歴はありません</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b">
                          <th className="pb-2 pr-3">日付</th>
                          <th className="pb-2 pr-3">時間</th>
                          <th className="pb-2 pr-3">人数</th>
                          <th className="pb-2 pr-3">テーブル</th>
                          <th className="pb-2">メモ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.reservations.map((r) => (
                          <tr
                            key={r.id}
                            className={`border-b border-gray-100 ${r.status === "cancelled" ? "opacity-50" : ""}`}
                          >
                            <td className="py-2 pr-3 text-gray-900 whitespace-nowrap">{formatDate(r.date)}</td>
                            <td className="py-2 pr-3 text-gray-900 whitespace-nowrap">
                              {r.start_time?.slice(0, 5)}〜{r.end_time?.slice(0, 5)}
                            </td>
                            <td className="py-2 pr-3 text-gray-900">{r.party_size}人</td>
                            <td className="py-2 pr-3 text-gray-900">{r.table_name ?? "-"}</td>
                            <td className="py-2 text-gray-500 truncate max-w-[120px]">{r.note || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
