import { Router, Request, Response } from "express";
import pool from "../db/pool";
import { authenticateStaff, AuthRequest } from "../middleware/auth";

const router = Router();

// ============================================
// テーブル一覧取得（誰でも見れる）
// GET /api/tables
// ============================================
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      "SELECT * FROM tables WHERE is_active = true ORDER BY id"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("テーブル一覧取得エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

// ============================================
// テーブル追加（店員のみ）
// POST /api/tables
// ============================================
router.post("/", authenticateStaff, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { table_name, capacity } = req.body;

    if (!table_name || !capacity) {
      res.status(400).json({ error: "テーブル名と席数は必須です" });
      return;
    }

    const result = await pool.query(
      `INSERT INTO tables (table_name, capacity) VALUES ($1, $2) RETURNING *`,
      [table_name, capacity]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("テーブル追加エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

// ============================================
// テーブル更新（店員のみ）
// PUT /api/tables/:id
// ============================================
router.put("/:id", authenticateStaff, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { table_name, capacity, is_active } = req.body;

    const result = await pool.query(
      `UPDATE tables SET 
        table_name = COALESCE($1, table_name),
        capacity = COALESCE($2, capacity),
        is_active = COALESCE($3, is_active),
        updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [table_name, capacity, is_active, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "テーブルが見つかりません" });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("テーブル更新エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

// ============================================
// テーブル削除（店員のみ）- 論理削除（is_active = false）
// DELETE /api/tables/:id
// ============================================
router.delete("/:id", authenticateStaff, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE tables SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "テーブルが見つかりません" });
      return;
    }

    res.json({ message: "テーブルを無効化しました" });
  } catch (error) {
    console.error("テーブル削除エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

export default router;
