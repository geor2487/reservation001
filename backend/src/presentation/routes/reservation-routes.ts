import { Router, Request, Response } from "express";
import { authenticateStaff, authenticateCustomer, AuthRequest } from "../middleware/auth";
import { container } from "../../infrastructure/container";
import { DomainError } from "../../shared/errors";
import { flattenReservation } from "../dto/reservation-dto";
import { ReservationRow } from "../../domain/repositories/reservation-repository";
import { GetAvailabilityUseCase } from "../../application/usecases/reservations/get-availability";
import { ListReservationsUseCase } from "../../application/usecases/reservations/list-reservations";
import { ListMyReservationsUseCase } from "../../application/usecases/reservations/list-my-reservations";
import { CreateGuestReservationUseCase } from "../../application/usecases/reservations/create-guest-reservation";
import { CreateCustomerReservationUseCase } from "../../application/usecases/reservations/create-customer-reservation";
import { CreateStaffReservationUseCase } from "../../application/usecases/reservations/create-staff-reservation";
import { UpdateReservationUseCase } from "../../application/usecases/reservations/update-reservation";
import { CancelReservationUseCase } from "../../application/usecases/reservations/cancel-reservation";
import { CancelCustomerReservationUseCase } from "../../application/usecases/reservations/cancel-customer-reservation";

const router = Router();

const getAvailability = new GetAvailabilityUseCase(container.reservationRepo, container.tableRepo);
const listReservations = new ListReservationsUseCase(container.reservationRepo);
const listMyReservations = new ListMyReservationsUseCase(container.reservationRepo);
const createGuestReservation = new CreateGuestReservationUseCase(container.reservationRepo, container.bookingPolicy);
const createCustomerReservation = new CreateCustomerReservationUseCase(container.reservationRepo, container.userRepo, container.bookingPolicy);
const createStaffReservation = new CreateStaffReservationUseCase(container.reservationRepo, container.bookingPolicy);
const updateReservation = new UpdateReservationUseCase(container.reservationRepo, container.tableRepo);
const cancelReservation = new CancelReservationUseCase(container.reservationRepo);
const cancelCustomerReservation = new CancelCustomerReservationUseCase(container.reservationRepo);

router.get("/availability", async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await getAvailability.execute(req.query.date as string);
    res.json({
      date: result.date,
      tables: result.tables,
      reservations: (result.reservations as ReservationRow[]).map(flattenReservation),
    });
  } catch (error) {
    if (error instanceof DomainError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("空き状況取得エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

router.get("/", authenticateStaff, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await listReservations.execute({
      date: req.query.date as string | undefined,
      status: req.query.status as string | undefined,
    });
    res.json((data as ReservationRow[]).map(flattenReservation));
  } catch (error) {
    if (error instanceof DomainError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("予約一覧取得エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

router.get("/my", authenticateCustomer, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await listMyReservations.execute(req.user!.id);
    res.json((data as ReservationRow[]).map(flattenReservation));
  } catch (error) {
    if (error instanceof DomainError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("マイ予約取得エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

router.post("/guest", async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await createGuestReservation.execute(req.body);
    res.status(201).json(data);
  } catch (error) {
    if (error instanceof DomainError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("ゲスト予約作成エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

router.post("/customer", authenticateCustomer, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await createCustomerReservation.execute(req.user!.id, req.body);
    res.status(201).json(data);
  } catch (error) {
    if (error instanceof DomainError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("予約作成エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

router.post("/staff", authenticateStaff, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await createStaffReservation.execute(req.body);
    res.status(201).json(data);
  } catch (error) {
    if (error instanceof DomainError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("予約作成（店員）エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

router.put("/:id", authenticateStaff, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await updateReservation.execute(parseInt(req.params.id), req.body);
    res.json(data);
  } catch (error) {
    if (error instanceof DomainError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("予約編集エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

router.patch("/:id/cancel", authenticateStaff, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await cancelReservation.execute(parseInt(req.params.id));
    res.json(data);
  } catch (error) {
    if (error instanceof DomainError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("予約キャンセル（店員）エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

router.patch("/:id/cancel/customer", authenticateCustomer, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await cancelCustomerReservation.execute(parseInt(req.params.id), req.user!.id);
    res.json(data);
  } catch (error) {
    if (error instanceof DomainError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("予約キャンセル（お客さん）エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

export default router;
