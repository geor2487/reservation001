import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// ミドルウェア = リクエストが実際の処理に届く前に「通る関門」みたいなもの
// ここでは「ログインしてるかどうか」をチェックしてる

// Requestの型を拡張して、user情報を追加できるようにする
export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: "staff" | "customer";
  };
}

// 店員用の認証ミドルウェア
export const authenticateStaff = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const token = req.headers.authorization?.split(" ")[1]; // "Bearer xxxx" の xxxx 部分

  if (!token) {
    res.status(401).json({ error: "認証が必要です" });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: number;
      email: string;
      role: string;
    };

    if (decoded.role !== "staff") {
      res.status(403).json({ error: "店員権限が必要です" });
      return;
    }

    req.user = { id: decoded.id, email: decoded.email, role: "staff" };
    next();
  } catch {
    res.status(401).json({ error: "トークンが無効です" });
  }
};

// お客さん用の認証ミドルウェア
export const authenticateCustomer = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "認証が必要です" });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: number;
      email: string;
      role: string;
    };

    if (decoded.role !== "customer") {
      res.status(403).json({ error: "お客さん用の権限が必要です" });
      return;
    }

    req.user = { id: decoded.id, email: decoded.email, role: "customer" };
    next();
  } catch {
    res.status(401).json({ error: "トークンが無効です" });
  }
};
