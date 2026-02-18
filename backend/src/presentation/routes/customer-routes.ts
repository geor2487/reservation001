import { Router, Response } from "express";
import { authenticateStaff, AuthRequest } from "../middleware/auth";
import { container } from "../../infrastructure/container";
import { DomainError } from "../../shared/errors";
import { flattenReservation } from "../dto/reservation-dto";
import { ReservationRow } from "../../domain/repositories/reservation-repository";
import { GetCustomerDetailUseCase } from "../../application/usecases/customers/get-customer-detail";
import { GetCustomerByPhoneUseCase } from "../../application/usecases/customers/get-customer-by-phone";
import { UpdateStaffNoteUseCase } from "../../application/usecases/customers/update-staff-note";

const router = Router();

const getCustomerDetail = new GetCustomerDetailUseCase(container.userRepo, container.reservationRepo);
const getCustomerByPhone = new GetCustomerByPhoneUseCase(container.userRepo, container.reservationRepo);
const updateStaffNote = new UpdateStaffNoteUseCase(container.userRepo);

// 登録顧客の詳細+予約履歴
router.get("/:id/detail", authenticateStaff, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await getCustomerDetail.execute(req.params.id);
    res.json({
      profile: result.profile,
      visitCount: result.visitCount,
      reservations: (result.reservations as ReservationRow[]).map(flattenReservation),
    });
  } catch (error) {
    if (error instanceof DomainError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("顧客詳細取得エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

// 電話番号で予約履歴検索（ゲスト対応）
router.get("/by-phone/:phone", authenticateStaff, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await getCustomerByPhone.execute(req.params.phone);
    res.json({
      profile: result.profile,
      visitCount: result.visitCount,
      reservations: (result.reservations as ReservationRow[]).map(flattenReservation),
    });
  } catch (error) {
    if (error instanceof DomainError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("電話番号検索エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

// スタッフメモ更新
router.put("/:id/staff-note", authenticateStaff, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { note } = req.body;
    if (note === undefined) {
      res.status(400).json({ error: "noteフィールドが必要です" });
      return;
    }
    const result = await updateStaffNote.execute(req.params.id, note);
    res.json(result);
  } catch (error) {
    if (error instanceof DomainError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("スタッフメモ更新エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

export default router;
