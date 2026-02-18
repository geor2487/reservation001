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
    const supabase = getSupabase();

    const processSession = async (accessToken: string) => {
      try {
        const result = await api<OAuthResponse>("/auth/customer/oauth", {
          method: "POST",
          body: { access_token: accessToken },
        });

        customerAuth.login(result.token, result.user);

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

    // PKCE flow: URLに?code=がある場合、onAuthStateChangeでセッション確立を待つ
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          await processSession(session.access_token);
        }
      }
    );

    // Hash fragment flow (fallback): 既にセッションがある場合
    const checkExistingSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await processSession(data.session.access_token);
      }
    };
    checkExistingSession();

    return () => subscription.unsubscribe();
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
