import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../../infrastructure/supabase/client";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role: "staff" | "customer";
  };
}

function createAuthMiddleware(role: "staff" | "customer") {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.status(401).json({ error: "認証が必要です" });
      return;
    }

    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) {
        res.status(401).json({ error: "トークンが無効です" });
        return;
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== role) {
        const message = role === "staff" ? "店員権限が必要です" : "お客さん用の権限が必要です";
        res.status(403).json({ error: message });
        return;
      }

      req.user = { id: user.id, email: user.email, role };
      next();
    } catch {
      res.status(401).json({ error: "トークンが無効です" });
    }
  };
}

export const authenticateStaff = createAuthMiddleware("staff");
export const authenticateCustomer = createAuthMiddleware("customer");
