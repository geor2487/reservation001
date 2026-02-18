import { SupabaseReservationRepository } from "./repositories/supabase-reservation-repository";
import { SupabaseTableRepository } from "./repositories/supabase-table-repository";
import { SupabaseUserRepository } from "./repositories/supabase-user-repository";
import { BookingPolicy } from "../domain/services/booking-policy";

const reservationRepo = new SupabaseReservationRepository();
const tableRepo = new SupabaseTableRepository();
const userRepo = new SupabaseUserRepository();
const bookingPolicy = new BookingPolicy(reservationRepo, tableRepo);

export const container = {
  reservationRepo,
  tableRepo,
  userRepo,
  bookingPolicy,
};
