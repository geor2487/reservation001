import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./presentation/routes/auth-routes";
import tablesRoutes from "./presentation/routes/table-routes";
import reservationsRoutes from "./presentation/routes/reservation-routes";
import customerRoutes from "./presentation/routes/customer-routes";

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
app.use("/api/customers", customerRoutes);

// ヘルスチェック（サーバーが動いてるか確認用）
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", storeName: process.env.STORE_NAME });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`サーバー起動: http://localhost:${PORT}`);
  console.log(`店舗名: ${process.env.STORE_NAME}`);
  console.log(`営業時間: ${process.env.STORE_OPEN_TIME} - ${process.env.STORE_CLOSE_TIME}`);
});
