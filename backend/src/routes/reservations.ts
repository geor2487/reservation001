import { Router, Request, Response } from "express";
import pool from "../db/pool";
import {
  authenticateStaff,
  authenticateCustomer,
  AuthRequest,
} from "../middleware/auth";

const router = Router();

// ============================================
// ダブルブッキングチェック用のヘルパー関数
// 同じテーブル・同じ日・時間が重なる予約がないか確認する
// ============================================
const checkDoubleBooking = async (
  tableId: number,
  date: string,
  startTime: string,
  endTime: string,
  excludeReservationId?: number
): Promise<boolean> => {
  // 時間の重なりチェック：
  // 既存の start_time < 新しい end_time AND 既存の end_time > 新しい start_time
  // → 少しでも重なっていたら true（= ダブルブッキング）
  let query = `
    SELECT COUNT(*) FROM reservations
    WHERE table_id = $1
      AND date = $2
      AND start_time < $3
      AND end_time > $4
      AND status = 'confirmed'
  `;
  const params: (string | number)[] = [tableId, date, endTime, startTime];

  // 予約編集時は、自分自身を除外する
  if (excludeReservationId) {
    query += ` AND id != $5`;
    params.push(excludeReservationId);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].count) > 0;
};

// ============================================
// end_time自動設定用のヘルパー関数
// start_time + 2時間 を返す
// ============================================
const calculateEndTime = (startTime: string): string => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const endHours = hours + 2;
  return `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

// ============================================
// 空き状況確認（誰でも見れる）
// GET /api/reservations/availability?date=2025-02-17
// ============================================
router.get("/availability", async (req: Request, res: Response): Promise<void> => {
  try {
    const { date } = req.query;

    if (!date) {
      res.status(400).json({ error: "日付を指定してください" });
      return;
    }

    // その日の全テーブルと予約状況を取得
    const tables = await pool.query(
      "SELECT * FROM tables WHERE is_active = true ORDER BY id"
    );

    const reservations = await pool.query(
      `SELECT r.*, t.table_name, t.capacity
       FROM reservations r
       JOIN tables t ON r.table_id = t.id
       WHERE r.date = $1 AND r.status = 'confirmed'
       ORDER BY r.start_time`,
      [date]
    );

    res.json({
      date,
      tables: tables.rows,
      reservations: reservations.rows,
    });
  } catch (error) {
    console.error("空き状況取得エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

// ============================================
// 予約一覧取得（店員用）
// GET /api/reservations?date=2025-02-17
// ============================================
router.get("/", authenticateStaff, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { date, status } = req.query;

    let query = `
      SELECT r.*, t.table_name, t.capacity
      FROM reservations r
      JOIN tables t ON r.table_id = t.id
      WHERE 1=1
    `;
    const params: string[] = [];
    let paramIndex = 1;

    if (date) {
      query += ` AND r.date = $${paramIndex}`;
      params.push(date as string);
      paramIndex++;
    }

    if (status) {
      query += ` AND r.status = $${paramIndex}`;
      params.push(status as string);
      paramIndex++;
    }

    query += ` ORDER BY r.date, r.start_time`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("予約一覧取得エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

// ============================================
// 自分の予約一覧（お客さん用）
// GET /api/reservations/my
// ============================================
router.get("/my", authenticateCustomer, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT r.*, t.table_name, t.capacity
       FROM reservations r
       JOIN tables t ON r.table_id = t.id
       WHERE r.customer_id = $1
       ORDER BY r.date DESC, r.start_time DESC`,
      [req.user!.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("マイ予約取得エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

// ============================================
// 予約作成（ゲスト用 - 認証不要）
// POST /api/reservations/guest
// ============================================
router.post(
  "/guest",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { table_id, date, start_time, end_time, party_size, customer_name, customer_phone } = req.body;

      // バリデーション
      if (!table_id || !date || !start_time || !party_size || !customer_name || !customer_phone) {
        res.status(400).json({ error: "テーブル、日付、開始時間、人数、名前、電話番号は必須です" });
        return;
      }

      // end_timeが未指定の場合、start_time + 2時間で自動設定
      const resolvedEndTime = end_time || calculateEndTime(start_time);

      // テーブルの存在チェック & 人数チェック
      const tableResult = await pool.query(
        "SELECT * FROM tables WHERE id = $1 AND is_active = true",
        [table_id]
      );
      if (tableResult.rows.length === 0) {
        res.status(404).json({ error: "指定されたテーブルが見つかりません" });
        return;
      }

      const table = tableResult.rows[0];
      if (party_size > table.capacity) {
        res.status(400).json({
          error: `このテーブルの最大人数は${table.capacity}人です`,
        });
        return;
      }

      // ダブルブッキングチェック
      const isDoubleBooked = await checkDoubleBooking(table_id, date, start_time, resolvedEndTime);
      if (isDoubleBooked) {
        res.status(409).json({
          error: "この時間帯は既に予約が入っています。別の時間またはテーブルを選んでください",
        });
        return;
      }

      // 予約を作成（customer_id = NULL, status = 'pending', created_by = 'customer'）
      const result = await pool.query(
        `INSERT INTO reservations
         (table_id, customer_id, customer_name, customer_phone, date, start_time, end_time, party_size, status, created_by)
         VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, 'confirmed', 'customer')
         RETURNING *`,
        [table_id, customer_name, customer_phone, date, start_time, resolvedEndTime, party_size]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("ゲスト予約作成エラー:", error);
      res.status(500).json({ error: "サーバーエラーが発生しました" });
    }
  }
);

// ============================================
// 予約作成（お客さん用）
// POST /api/reservations/customer
// ============================================
router.post(
  "/customer",
  authenticateCustomer,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { table_id, date, start_time, end_time, party_size, note } = req.body;

      // バリデーション
      if (!table_id || !date || !start_time || !party_size) {
        res.status(400).json({ error: "テーブル、日付、時間、人数は必須です" });
        return;
      }

      // end_timeが未指定の場合、start_time + 2時間で自動設定
      const resolvedEndTime = end_time || calculateEndTime(start_time);

      // テーブルの存在チェック & 人数チェック
      const tableResult = await pool.query(
        "SELECT * FROM tables WHERE id = $1 AND is_active = true",
        [table_id]
      );
      if (tableResult.rows.length === 0) {
        res.status(404).json({ error: "指定されたテーブルが見つかりません" });
        return;
      }

      const table = tableResult.rows[0];
      if (party_size > table.capacity) {
        res.status(400).json({
          error: `このテーブルの最大人数は${table.capacity}人です`,
        });
        return;
      }

      // ダブルブッキングチェック
      const isDoubleBooked = await checkDoubleBooking(table_id, date, start_time, resolvedEndTime);
      if (isDoubleBooked) {
        res.status(409).json({
          error: "この時間帯は既に予約が入っています。別の時間またはテーブルを選んでください",
        });
        return;
      }

      // お客さん情報を取得
      const customerResult = await pool.query(
        "SELECT name, phone FROM customers WHERE id = $1",
        [req.user!.id]
      );
      const customer = customerResult.rows[0];

      // 予約を作成
      const result = await pool.query(
        `INSERT INTO reservations
         (table_id, customer_id, customer_name, customer_phone, date, start_time, end_time, party_size, note, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'confirmed', 'customer')
         RETURNING *`,
        [table_id, req.user!.id, customer.name, customer.phone, date, start_time, resolvedEndTime, party_size, note || null]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("予約作成エラー:", error);
      res.status(500).json({ error: "サーバーエラーが発生しました" });
    }
  }
);

// ============================================
// 予約作成（店員用 - 電話/LINE対応分）
// POST /api/reservations/staff
// ============================================
router.post(
  "/staff",
  authenticateStaff,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { table_id, customer_name, customer_phone, date, start_time, end_time, party_size, note } = req.body;

      if (!table_id || !customer_name || !date || !start_time || !party_size) {
        res.status(400).json({ error: "テーブル、名前、日付、時間、人数は必須です" });
        return;
      }

      // end_timeが未指定の場合、start_time + 2時間で自動設定
      const resolvedEndTime = end_time || calculateEndTime(start_time);

      // テーブル存在チェック & 人数チェック
      const tableResult = await pool.query(
        "SELECT * FROM tables WHERE id = $1 AND is_active = true",
        [table_id]
      );
      if (tableResult.rows.length === 0) {
        res.status(404).json({ error: "指定されたテーブルが見つかりません" });
        return;
      }

      const table = tableResult.rows[0];
      if (party_size > table.capacity) {
        res.status(400).json({
          error: `このテーブルの最大人数は${table.capacity}人です`,
        });
        return;
      }

      // ダブルブッキングチェック
      const isDoubleBooked = await checkDoubleBooking(table_id, date, start_time, resolvedEndTime);
      if (isDoubleBooked) {
        res.status(409).json({
          error: "この時間帯は既に予約が入っています",
        });
        return;
      }

      const result = await pool.query(
        `INSERT INTO reservations
         (table_id, customer_name, customer_phone, date, start_time, end_time, party_size, note, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'staff')
         RETURNING *`,
        [table_id, customer_name, customer_phone || null, date, start_time, resolvedEndTime, party_size, note || null]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("予約作成（店員）エラー:", error);
      res.status(500).json({ error: "サーバーエラーが発生しました" });
    }
  }
);

// ============================================
// 予約編集（店員用）
// PUT /api/reservations/:id
// ============================================
router.put("/:id", authenticateStaff, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { table_id, customer_name, customer_phone, date, start_time, end_time, party_size, note, status } = req.body;

    // 予約存在チェック
    const existing = await pool.query("SELECT * FROM reservations WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: "予約が見つかりません" });
      return;
    }

    const current = existing.rows[0];

    // テーブルや時間が変わった場合、ダブルブッキングチェック
    const newTableId = table_id || current.table_id;
    const newDate = date || current.date;
    const newStartTime = start_time || current.start_time;
    const newEndTime = end_time || current.end_time;

    if (table_id || date || start_time || end_time) {
      const isDoubleBooked = await checkDoubleBooking(
        newTableId, newDate, newStartTime, newEndTime, parseInt(id)
      );
      if (isDoubleBooked) {
        res.status(409).json({ error: "変更先の時間帯は既に予約が入っています" });
        return;
      }
    }

    // 人数チェック
    if (party_size || table_id) {
      const tableResult = await pool.query("SELECT capacity FROM tables WHERE id = $1", [newTableId]);
      if (tableResult.rows.length > 0) {
        const newPartySize = party_size || current.party_size;
        if (newPartySize > tableResult.rows[0].capacity) {
          res.status(400).json({
            error: `このテーブルの最大人数は${tableResult.rows[0].capacity}人です`,
          });
          return;
        }
      }
    }

    const result = await pool.query(
      `UPDATE reservations SET
        table_id = COALESCE($1, table_id),
        customer_name = COALESCE($2, customer_name),
        customer_phone = COALESCE($3, customer_phone),
        date = COALESCE($4, date),
        start_time = COALESCE($5, start_time),
        end_time = COALESCE($6, end_time),
        party_size = COALESCE($7, party_size),
        note = COALESCE($8, note),
        status = COALESCE($9, status),
        updated_at = NOW()
       WHERE id = $10 RETURNING *`,
      [table_id, customer_name, customer_phone, date, start_time, end_time, party_size, note, status, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("予約編集エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

// ============================================
// 予約キャンセル（店員用）
// PATCH /api/reservations/:id/cancel
// ============================================
router.patch("/:id/cancel", authenticateStaff, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE reservations SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND status = 'confirmed' RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "予約が見つからないか、既にキャンセル済みです" });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("予約キャンセル（店員）エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

// ============================================
// 予約キャンセル（お客さん用 - 自分の予約のみ）
// PATCH /api/reservations/:id/cancel/customer
// ============================================
router.patch(
  "/:id/cancel/customer",
  authenticateCustomer,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `UPDATE reservations SET status = 'cancelled', updated_at = NOW()
         WHERE id = $1 AND customer_id = $2 AND status = 'confirmed' RETURNING *`,
        [id, req.user!.id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "予約が見つからないか、キャンセルできません" });
        return;
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("予約キャンセル（お客さん）エラー:", error);
      res.status(500).json({ error: "サーバーエラーが発生しました" });
    }
  }
);

export default router;
