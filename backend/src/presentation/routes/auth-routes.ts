import { Router, Request, Response } from "express";
import { authenticateStaff, authenticateCustomer, AuthRequest } from "../middleware/auth";
import { container } from "../../infrastructure/container";
import { handleRoute } from "./handle-route";
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

router.post("/staff/login", handleRoute("店員ログインエラー", async (req, res) => {
  const result = await staffLogin.execute(req.body);
  res.json(result);
}));

router.post("/customer/register", handleRoute("お客さん登録エラー", async (req, res) => {
  const result = await customerRegister.execute(req.body);
  res.status(201).json(result);
}));

router.post("/customer/login", handleRoute("お客さんログインエラー", async (req, res) => {
  const result = await customerLogin.execute(req.body);
  res.json(result);
}));

router.put("/staff/name", authenticateStaff, handleRoute("スタッフ名変更エラー", async (req, res) => {
  const result = await updateStaffName.execute((req as AuthRequest).user!.id, req.body.name);
  res.json(result);
}));

router.put("/staff/login-settings", authenticateStaff, handleRoute("スタッフログイン設定変更エラー", async (req, res) => {
  const result = await updateStaffLoginSettings.execute((req as AuthRequest).user!.id, req.body);
  res.json(result);
}));

router.get("/customers", authenticateStaff, handleRoute("顧客一覧取得エラー", async (_req, res) => {
  const data = await container.userRepo.findCustomers();
  res.json(data);
}));

router.put("/customer/profile", authenticateCustomer, handleRoute("顧客プロフィール変更エラー", async (req, res) => {
  const authReq = req as AuthRequest;
  const result = await updateCustomerProfile.execute(authReq.user!.id, authReq.user!.email!, req.body);
  res.json(result);
}));

router.post("/customer/oauth", handleRoute("OAuthログインエラー", async (req, res) => {
  const result = await customerOAuth.execute(req.body.access_token);
  res.json(result);
}));

export default router;
