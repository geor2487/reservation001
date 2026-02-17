import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db/pool";
import { authenticateStaff, AuthRequest } from "../middleware/auth";

const router = Router();

// ============================================
// 店員ログイン
// POST /api/auth/staff/login
// ============================================
router.post("/staff/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // バリデーション（入力チェック）
    if (!email || !password) {
      res.status(400).json({ error: "メールとパスワードを入力してください" });
      return;
    }

    // メールでスタッフを検索
    const result = await pool.query("SELECT * FROM staff WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      res.status(401).json({ error: "メールアドレスまたはパスワードが間違っています" });
      return;
    }

    const staff = result.rows[0];

    // パスワードを照合（ハッシュ化されたものと比較）
    const isValid = await bcrypt.compare(password, staff.password_hash);
    if (!isValid) {
      res.status(401).json({ error: "メールアドレスまたはパスワードが間違っています" });
      return;
    }

    // JWT トークンを発行
    const token = jwt.sign(
      { id: staff.id, email: staff.email, role: "staff" },
      process.env.JWT_SECRET!,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: { id: staff.id, name: staff.name, email: staff.email, role: "staff" },
    });
  } catch (error) {
    console.error("店員ログインエラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

// ============================================
// お客さん新規登録
// POST /api/auth/customer/register
// ============================================
router.post("/customer/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, phone } = req.body;

    if (!email || !password || !name || !phone) {
      res.status(400).json({ error: "メール、パスワード、名前、電話番号は必須です" });
      return;
    }

    // メールの重複チェック
    const existing = await pool.query("SELECT id FROM customers WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "このメールアドレスは既に登録されています" });
      return;
    }

    // パスワードをハッシュ化して保存
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO customers (email, password_hash, name, phone) 
       VALUES ($1, $2, $3, $4) RETURNING id, email, name, phone`,
      [email, passwordHash, name, phone || null]
    );

    const customer = result.rows[0];

    // そのままログイン状態にする
    const token = jwt.sign(
      { id: customer.id, email: customer.email, role: "customer" },
      process.env.JWT_SECRET!,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      token,
      user: { id: customer.id, name: customer.name, email: customer.email, role: "customer" },
    });
  } catch (error) {
    console.error("お客さん登録エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

// ============================================
// お客さんログイン
// POST /api/auth/customer/login
// ============================================
router.post("/customer/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "メールとパスワードを入力してください" });
      return;
    }

    const result = await pool.query("SELECT * FROM customers WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      res.status(401).json({ error: "メールアドレスまたはパスワードが間違っています" });
      return;
    }

    const customer = result.rows[0];
    const isValid = await bcrypt.compare(password, customer.password_hash);

    if (!isValid) {
      res.status(401).json({ error: "メールアドレスまたはパスワードが間違っています" });
      return;
    }

    const token = jwt.sign(
      { id: customer.id, email: customer.email, role: "customer" },
      process.env.JWT_SECRET!,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        role: "customer",
      },
    });
  } catch (error) {
    console.error("お客さんログインエラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

// ============================================
// スタッフ名変更
// PUT /api/auth/staff/name
// ============================================
router.put("/staff/name", authenticateStaff, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: "名前を入力してください" });
      return;
    }

    const result = await pool.query(
      "UPDATE staff SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email",
      [name.trim(), req.user!.id]
    );

    res.json({
      user: { id: result.rows[0].id, name: result.rows[0].name, email: result.rows[0].email, role: "staff" },
    });
  } catch (error) {
    console.error("スタッフ名変更エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

export default router;
