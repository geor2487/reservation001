import { Router, Request, Response } from "express";
import { authenticateStaff, authenticateCustomer, AuthRequest } from "../middleware/auth";
import { container } from "../../infrastructure/container";
import { DomainError } from "../../shared/errors";
import { StaffLoginUseCase } from "../../application/usecases/auth/staff-login";
import { CustomerLoginUseCase } from "../../application/usecases/auth/customer-login";
import { CustomerRegisterUseCase } from "../../application/usecases/auth/customer-register";
import { CustomerOAuthUseCase } from "../../application/usecases/auth/customer-oauth";
import { UpdateStaffNameUseCase } from "../../application/usecases/auth/update-staff-name";
import { UpdateStaffLoginSettingsUseCase } from "../../application/usecases/auth/update-staff-login-settings";
import { UpdateCustomerProfileUseCase } from "../../application/usecases/auth/update-customer-profile";

const router = Router();

const staffLogin = new StaffLoginUseCase(container.userRepo);
const customerLogin = new CustomerLoginUseCase(container.userRepo);
const customerRegister = new CustomerRegisterUseCase();
const customerOAuth = new CustomerOAuthUseCase(container.userRepo);
const updateStaffName = new UpdateStaffNameUseCase(container.userRepo);
const updateStaffLoginSettings = new UpdateStaffLoginSettingsUseCase(container.userRepo);
const updateCustomerProfile = new UpdateCustomerProfileUseCase(container.userRepo);

router.post("/staff/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await staffLogin.execute(req.body);
    res.json(result);
  } catch (error) {
    if (error instanceof DomainError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("店員ログインエラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

router.post("/customer/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await customerRegister.execute(req.body);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof DomainError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("お客さん登録エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

router.post("/customer/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await customerLogin.execute(req.body);
    res.json(result);
  } catch (error) {
    if (error instanceof DomainError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("お客さんログインエラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

router.put("/staff/name", authenticateStaff, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await updateStaffName.execute(req.user!.id, req.body.name);
    res.json(result);
  } catch (error) {
    if (error instanceof DomainError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("スタッフ名変更エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

router.put("/staff/login-settings", authenticateStaff, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await updateStaffLoginSettings.execute(req.user!.id, req.body);
    res.json(result);
  } catch (error) {
    if (error instanceof DomainError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("スタッフログイン設定変更エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

router.get("/customers", authenticateStaff, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await container.userRepo.findCustomers();
    res.json(data);
  } catch (error) {
    if (error instanceof DomainError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("顧客一覧取得エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

router.put("/customer/profile", authenticateCustomer, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await updateCustomerProfile.execute(req.user!.id, req.user!.email!, req.body);
    res.json(result);
  } catch (error) {
    if (error instanceof DomainError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("顧客プロフィール変更エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

router.post("/customer/oauth", async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await customerOAuth.execute(req.body.access_token);
    res.json(result);
  } catch (error) {
    if (error instanceof DomainError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("OAuthログインエラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

export default router;
