import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import tablesRoutes from "./routes/tables";
import reservationsRoutes from "./routes/reservations";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ミドルウェア設定
app.use(cors()); // フロントエンドからのリクエストを許可
app.use(express.json()); // JSONのリクエストボディを解析

// ルーティング（URLとAPIの紐づけ）
app.use("/api/auth", authRoutes);
app.use("/api/tables", tablesRoutes);
app.use("/api/reservations", reservationsRoutes);

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
