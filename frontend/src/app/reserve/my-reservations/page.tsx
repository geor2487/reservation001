"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, customerAuth as auth } from "@/lib/api";
import { Reservation } from "@/lib/types";
import { AlertMessage } from "@/components/AlertMessage";

export default function MyReservations() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = auth.getToken();
    if (!token) {
      router.push("/reserve/login");
      return;
    }
    fetchReservations(token);
  }, [router]);

  const fetchReservations = async (token: string) => {
    try {
      const data = await api<Reservation[]>("/reservations/my", { token });
      setReservations(data);
    } catch {
      setError("予約の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm("この予約をキャンセルしますか？")) return;

    const token = auth.getToken();
    try {
      await api(`/reservations/${id}/cancel/customer`, {
        method: "PATCH",
        token: token!,
      });
      // 一覧を再取得
      fetchReservations(token!);
    } catch (err) {
      alert(err instanceof Error ? err.message : "キャンセルに失敗しました");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-900">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/reserve" className="text-xl font-bold text-gray-800">
            POND
          </Link>
          <Link href="/reserve" className="text-sm text-orange-500 hover:underline">
            ← 予約画面に戻る
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">マイ予約</h1>

        <AlertMessage error={error} />

        {reservations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-900">
            予約はありません
          </div>
        ) : (
          <div className="space-y-4">
            {reservations.map((r) => (
              <div
                key={r.id}
                className={`bg-white rounded-xl shadow-sm p-5 ${
                  r.status === "cancelled" ? "opacity-60" : ""
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{r.date}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          r.status === "confirmed"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {r.status === "confirmed" ? "確定" : "キャンセル済み"}
                      </span>
                    </div>
                    <p className="text-gray-900">
                      {r.start_time?.slice(0, 5)}〜{r.end_time?.slice(0, 5)}
                    </p>
                    <p className="text-sm text-gray-900">
                      {r.table_name} / {r.party_size}人
                    </p>
                    {r.note && (
                      <p className="text-sm text-gray-900 mt-1">メモ: {r.note}</p>
                    )}
                  </div>
                  {r.status === "confirmed" && (
                    <button
                      onClick={() => handleCancel(r.id)}
                      className="text-sm text-red-500 hover:text-red-700 hover:underline"
                    >
                      キャンセル
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
