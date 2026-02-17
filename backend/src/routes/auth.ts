import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db/pool";
import { authenticateStaff, authenticateCustomer, AuthRequest } from "../middleware/auth";

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

    if (!password || !name || !phone) {
      res.status(400).json({ error: "パスワード、名前、電話番号は必須です" });
      return;
    }

    // 電話番号の重複チェック
    const existingPhone = await pool.query("SELECT id FROM customers WHERE phone = $1", [phone]);
    if (existingPhone.rows.length > 0) {
      res.status(409).json({ error: "この電話番号は既に登録されています" });
      return;
    }

    // メールの重複チェック（入力された場合のみ）
    if (email) {
      const existingEmail = await pool.query("SELECT id FROM customers WHERE email = $1", [email]);
      if (existingEmail.rows.length > 0) {
        res.status(409).json({ error: "このメールアドレスは既に登録されています" });
        return;
      }
    }

    // パスワードをハッシュ化して保存
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO customers (email, password_hash, name, phone)
       VALUES ($1, $2, $3, $4) RETURNING id, email, name, phone`,
      [email || null, passwordHash, name, phone]
    );

    const customer = result.rows[0];

    // そのままログイン状態にする
    const token = jwt.sign(
      { id: customer.id, phone: customer.phone, role: "customer" },
      process.env.JWT_SECRET!,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      token,
      user: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, role: "customer" },
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
    const { phone, password } = req.body;

    if (!phone || !password) {
      res.status(400).json({ error: "電話番号とパスワードを入力してください" });
      return;
    }

    const result = await pool.query("SELECT * FROM customers WHERE phone = $1", [phone]);

    if (result.rows.length === 0) {
      res.status(401).json({ error: "電話番号またはパスワードが間違っています" });
      return;
    }

    const customer = result.rows[0];
    const isValid = await bcrypt.compare(password, customer.password_hash);

    if (!isValid) {
      res.status(401).json({ error: "電話番号またはパスワードが間違っています" });
      return;
    }

    const token = jwt.sign(
      { id: customer.id, phone: customer.phone, role: "customer" },
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

// ============================================
// スタッフログイン設定変更（メアド・パスワード）
// PUT /api/auth/staff/login-settings
// ============================================
router.put("/staff/login-settings", authenticateStaff, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, current_password, new_password } = req.body;

    if (!current_password) {
      res.status(400).json({ error: "現在のパスワードを入力してください" });
      return;
    }

    // 現在のパスワード確認
    const staffResult = await pool.query("SELECT * FROM staff WHERE id = $1", [req.user!.id]);
    const staff = staffResult.rows[0];
    const isValid = await bcrypt.compare(current_password, staff.password_hash);
    if (!isValid) {
      res.status(401).json({ error: "現在のパスワードが間違っています" });
      return;
    }

    // メアド変更
    if (email && email !== staff.email) {
      const existing = await pool.query("SELECT id FROM staff WHERE email = $1 AND id != $2", [email, req.user!.id]);
      if (existing.rows.length > 0) {
        res.status(409).json({ error: "このメールアドレスは既に使用されています" });
        return;
      }
      await pool.query("UPDATE staff SET email = $1, updated_at = NOW() WHERE id = $2", [email, req.user!.id]);
    }

    // パスワード変更
    if (new_password) {
      if (new_password.length < 6) {
        res.status(400).json({ error: "パスワードは6文字以上にしてください" });
        return;
      }
      const hash = await bcrypt.hash(new_password, 10);
      await pool.query("UPDATE staff SET password_hash = $1, updated_at = NOW() WHERE id = $2", [hash, req.user!.id]);
    }

    const updated = await pool.query("SELECT id, name, email FROM staff WHERE id = $1", [req.user!.id]);
    res.json({ user: { ...updated.rows[0], role: "staff" } });
  } catch (error) {
    console.error("スタッフログイン設定変更エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

// ============================================
// 顧客一覧（店員用）
// GET /api/auth/customers
// ============================================
router.get("/customers", authenticateStaff, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, phone, created_at FROM customers ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("顧客一覧取得エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

// ============================================
// 顧客プロフィール変更
// PUT /api/auth/customer/profile
// ============================================
router.put("/customer/profile", authenticateCustomer, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, phone, email, current_password, new_password } = req.body;

    if (!name || !phone) {
      res.status(400).json({ error: "名前と電話番号は必須です" });
      return;
    }

    // 電話番号の重複チェック
    const existingPhone = await pool.query("SELECT id FROM customers WHERE phone = $1 AND id != $2", [phone, req.user!.id]);
    if (existingPhone.rows.length > 0) {
      res.status(409).json({ error: "この電話番号は既に登録されています" });
      return;
    }

    // メアドの重複チェック
    if (email) {
      const existingEmail = await pool.query("SELECT id FROM customers WHERE email = $1 AND id != $2", [email, req.user!.id]);
      if (existingEmail.rows.length > 0) {
        res.status(409).json({ error: "このメールアドレスは既に登録されています" });
        return;
      }
    }

    await pool.query(
      "UPDATE customers SET name = $1, phone = $2, email = $3, updated_at = NOW() WHERE id = $4",
      [name.trim(), phone, email || null, req.user!.id]
    );

    // パスワード変更
    if (new_password && current_password) {
      const customer = await pool.query("SELECT password_hash FROM customers WHERE id = $1", [req.user!.id]);
      const isValid = await bcrypt.compare(current_password, customer.rows[0].password_hash);
      if (!isValid) {
        res.status(401).json({ error: "現在のパスワードが間違っています" });
        return;
      }
      if (new_password.length < 6) {
        res.status(400).json({ error: "パスワードは6文字以上にしてください" });
        return;
      }
      const hash = await bcrypt.hash(new_password, 10);
      await pool.query("UPDATE customers SET password_hash = $1, updated_at = NOW() WHERE id = $2", [hash, req.user!.id]);
    }

    const updated = await pool.query("SELECT id, name, email, phone FROM customers WHERE id = $1", [req.user!.id]);
    res.json({ user: { ...updated.rows[0], role: "customer" } });
  } catch (error) {
    console.error("顧客プロフィール変更エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

export default router;
