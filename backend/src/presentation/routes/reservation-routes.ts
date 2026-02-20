import { Router, Request, Response } from "express";
import { authenticateStaff, authenticateCustomer, AuthRequest } from "../middleware/auth";
import { container } from "../../infrastructure/container";
import { handleRoute } from "./handle-route";
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

router.get("/availability", handleRoute("空き状況取得エラー", async (req, res) => {
  const result = await getAvailability.execute(req.query.date as string);
  res.json({
    date: result.date,
    tables: result.tables,
    reservations: (result.reservations as ReservationRow[]).map(flattenReservation),
  });
}));

router.get("/", authenticateStaff, handleRoute("予約一覧取得エラー", async (req, res) => {
  const data = await listReservations.execute({
    date: req.query.date as string | undefined,
    status: req.query.status as string | undefined,
  });
  res.json((data as ReservationRow[]).map(flattenReservation));
}));

router.get("/my", authenticateCustomer, handleRoute("マイ予約取得エラー", async (req, res) => {
  const data = await listMyReservations.execute((req as AuthRequest).user!.id);
  res.json((data as ReservationRow[]).map(flattenReservation));
}));

router.post("/guest", handleRoute("ゲスト予約作成エラー", async (req, res) => {
  const data = await createGuestReservation.execute(req.body);
  res.status(201).json(data);
}));

router.post("/customer", authenticateCustomer, handleRoute("予約作成エラー", async (req, res) => {
  const data = await createCustomerReservation.execute((req as AuthRequest).user!.id, req.body);
  res.status(201).json(data);
}));

router.post("/staff", authenticateStaff, handleRoute("予約作成（店員）エラー", async (req, res) => {
  const data = await createStaffReservation.execute(req.body);
  res.status(201).json(data);
}));

router.put("/:id", authenticateStaff, handleRoute("予約編集エラー", async (req, res) => {
  const data = await updateReservation.execute(parseInt(req.params.id), req.body);
  res.json(data);
}));

router.patch("/:id/cancel", authenticateStaff, handleRoute("予約キャンセル（店員）エラー", async (req, res) => {
  const data = await cancelReservation.execute(parseInt(req.params.id));
  res.json(data);
}));

router.patch("/:id/cancel/customer", authenticateCustomer, handleRoute("予約キャンセル（お客さん）エラー", async (req, res) => {
  const data = await cancelCustomerReservation.execute(parseInt(req.params.id), (req as AuthRequest).user!.id);
  res.json(data);
}));

export default router;
