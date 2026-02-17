import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Pool = DBへの接続を使い回すための仕組み
// 毎回接続を作り直すと遅いから、プール（貯めておく場所）を作っておく
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("neon.tech")
    ? { rejectUnauthorized: false }
    : undefined,
});

export default pool;
