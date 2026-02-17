import pool from "./pool";
import bcrypt from "bcrypt";

// シードスクリプト = テスト用のダミーデータを入れるスクリプト
// 開発中に「データがないと画面が確認できない」ってなるから、最初にサンプルを入れておく

const seed = async () => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 既存データをクリア（順番大事！外部キーの依存関係があるから）
    await client.query("DELETE FROM reservations");
    await client.query("DELETE FROM tables");
    await client.query("DELETE FROM customers");
    await client.query("DELETE FROM staff");

    // シーケンス（自動採番）をリセット
    await client.query("ALTER SEQUENCE staff_id_seq RESTART WITH 1");
    await client.query("ALTER SEQUENCE customers_id_seq RESTART WITH 1");
    await client.query("ALTER SEQUENCE tables_id_seq RESTART WITH 1");
    await client.query("ALTER SEQUENCE reservations_id_seq RESTART WITH 1");

    // ① 店員を追加
    const staffPassword = await bcrypt.hash("password123", 10);
    await client.query(
      `INSERT INTO staff (email, password_hash, name) VALUES ($1, $2, $3)`,
      ["admin@example.com", staffPassword, "オーナー太郎"]
    );
    console.log("[OK] 店員データ追加");

    // ② お客さんを追加
    const customerPassword = await bcrypt.hash("password123", 10);
    await client.query(
      `INSERT INTO customers (email, password_hash, name, phone) VALUES ($1, $2, $3, $4)`,
      ["tanaka@example.com", customerPassword, "田中花子", "090-1234-5678"]
    );
    await client.query(
      `INSERT INTO customers (email, password_hash, name, phone) VALUES ($1, $2, $3, $4)`,
      ["suzuki@example.com", customerPassword, "鈴木一郎", "080-9876-5432"]
    );
    console.log("[OK] お客さんデータ追加");

    // ③ テーブル（席）を追加
    const tablesData = [
      ["カウンター1", 2],
      ["カウンター2", 2],
      ["テーブルA", 4],
      ["テーブルB", 4],
      ["テーブルC", 4],
      ["座敷", 8],
      ["個室", 6],
    ];
    for (const [name, capacity] of tablesData) {
      await client.query(
        `INSERT INTO tables (table_name, capacity) VALUES ($1, $2)`,
        [name, capacity]
      );
    }
    console.log("[OK] テーブルデータ追加（合計30席）");

    // ④ サンプル予約を追加
    // 明日の日付を使う
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];

    await client.query(
      `INSERT INTO reservations (table_id, customer_id, customer_name, customer_phone, date, start_time, end_time, party_size, status, note, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [3, 1, "田中花子", "090-1234-5678", dateStr, "18:00", "19:30", 3, "confirmed", "アレルギー：えび", "customer"]
    );
    await client.query(
      `INSERT INTO reservations (table_id, customer_id, customer_name, customer_phone, date, start_time, end_time, party_size, status, note, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [6, null, "山田太郎", "070-1111-2222", dateStr, "19:00", "21:00", 6, "confirmed", "誕生日ケーキ持ち込み", "staff"]
    );
    console.log("[OK] サンプル予約データ追加");

    await client.query("COMMIT");
    console.log("\nシード完了！テストデータが追加されました");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[ERROR] シード失敗:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

seed();
