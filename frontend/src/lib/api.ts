// バックエンドAPIを呼び出すためのヘルパー関数
// fetch() を毎回書くのは面倒だから、共通化しておく

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

type FetchOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
  token?: string;
};

export async function api<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // ログイン済みならトークンをヘッダーに付ける
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "APIエラーが発生しました");
  }

  return data as T;
}

// ローカルストレージからトークンを取得/保存するヘルパー
export const auth = {
  getToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  },
  getUser: () => {
    if (typeof window === "undefined") return null;
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },
  login: (token: string, user: object) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
  },
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },
};
