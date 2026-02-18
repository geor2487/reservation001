// アプリ全体で使う型定義
// TypeScriptでは「このデータはこういう形をしてるよ」を先に定義しておく

export type Table = {
  id: number;
  table_name: string;
  capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Reservation = {
  id: number;
  table_id: number;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  date: string;
  start_time: string;
  end_time: string;
  party_size: number;
  status: "pending" | "confirmed" | "cancelled";
  note: string | null;
  created_by: "customer" | "staff";
  created_at: string;
  updated_at: string;
  // JOINで取得する追加情報
  table_name?: string;
  capacity?: number;
};

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "staff" | "customer";
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type AvailabilityResponse = {
  date: string;
  tables: Table[];
  reservations: Reservation[];
};
