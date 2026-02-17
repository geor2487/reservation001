import pool from "./pool";

// マイグレーション = DBのテーブル構造を作成・更新するスクリプト
// これを実行すると、設計通りのテーブルがDBに作られる

const migrate = async () => {
  const client = await pool.connect();

  try {
    // トランザクション開始（全部成功するか、全部失敗するか、のどちらか）
    await client.query("BEGIN");

    // ① staff テーブル
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("[OK] staff テーブル作成完了");

    // ② customers テーブル
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("[OK] customers テーブル作成完了");

    // ③ tables テーブル
    await client.query(`
      CREATE TABLE IF NOT EXISTS tables (
        id SERIAL PRIMARY KEY,
        table_name VARCHAR(50) NOT NULL,
        capacity INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("[OK] tables テーブル作成完了");

    // ④ reservations テーブル
    await client.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id SERIAL PRIMARY KEY,
        table_id INTEGER NOT NULL REFERENCES tables(id),
        customer_id INTEGER REFERENCES customers(id),
        customer_name VARCHAR(100) NOT NULL,
        customer_phone VARCHAR(20),
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        party_size INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'confirmed',
        note TEXT,
        created_by VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("[OK] reservations テーブル作成完了");

    // ダブルブッキング防止用のインデックス（検索を高速化する仕組み）
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_table_date
      ON reservations (table_id, date, start_time, end_time)
      WHERE status = 'confirmed';
    `);
    console.log("[OK] インデックス作成完了");

    await client.query("COMMIT");
    console.log("\nマイグレーション完了！全テーブルが作成されました");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[ERROR] マイグレーション失敗:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

migrate();
