"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { api, customerAuth } from "@/lib/api";

type OAuthResponse = {
  token: string;
  user: { id: string; name: string; email: string; phone?: string; role: string };
  needsPhone: boolean;
};

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = getSupabase();

        // SupabaseがURLハッシュフラグメントから自動的にセッションを取得
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !data.session) {
          setError("認証に失敗しました");
          return;
        }

        // バックエンドでプロフィール確認
        const result = await api<OAuthResponse>("/auth/customer/oauth", {
          method: "POST",
          body: { access_token: data.session.access_token },
        });

        // ローカルストレージに保存
        customerAuth.login(result.token, result.user);

        // 電話番号未登録なら入力ページへ
        if (result.needsPhone) {
          router.push("/reserve/complete-profile");
        } else {
          router.push("/reserve");
        }
      } catch (err) {
        console.error("OAuth callback error:", err);
        setError("ログイン処理中にエラーが発生しました");
      }
    };

    handleCallback();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-md text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/reserve/login")}
            className="text-orange-500 hover:underline"
          >
            ログインページに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-md text-center">
        <p className="text-gray-600">ログイン処理中...</p>
      </div>
    </div>
  );
}
