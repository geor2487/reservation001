import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./presentation/routes/auth-routes";
import tablesRoutes from "./presentation/routes/table-routes";
import reservationsRoutes from "./presentation/routes/reservation-routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS設定（本番ではFRONTEND_URLのみ許可）
const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json()); // JSONのリクエストボディを解析

// ルーティング（URLとAPIの紐づけ）
app.use("/api/auth", authRoutes);
app.use("/api/tables", tablesRoutes);
app.use("/api/reservations", reservationsRoutes);

// ヘルスチェック（サーバーが動いてるか確認用）
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", storeName: process.env.STORE_NAME });
});

// デバッグ用: INSERT テスト
app.get("/api/debug/insert-test", async (_req, res) => {
  try {
    const { supabaseAdmin } = await import("./infrastructure/supabase/client");
    const { data, error } = await supabaseAdmin
      .from("reservations")
      .insert({
        table_id: 2,
        customer_id: null,
        customer_name: "デバッグテスト",
        customer_phone: "09000000000",
        date: "2026-02-18",
        start_time: "21:00",
        end_time: "23:00",
        party_size: 1,
        status: "confirmed",
        created_by: "customer",
      })
      .select()
      .single();
    if (error) {
      res.json({ success: false, error: { message: error.message, code: error.code, details: error.details, hint: error.hint } });
    } else {
      res.json({ success: true, data });
    }
  } catch (err) {
    res.json({ success: false, caught: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });
  }
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`サーバー起動: http://localhost:${PORT}`);
  console.log(`店舗名: ${process.env.STORE_NAME}`);
  console.log(`営業時間: ${process.env.STORE_OPEN_TIME} - ${process.env.STORE_CLOSE_TIME}`);
});
