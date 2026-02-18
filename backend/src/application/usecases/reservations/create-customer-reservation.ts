import { IReservationRepository } from "../../../domain/repositories/reservation-repository";
import { IUserRepository } from "../../../domain/repositories/user-repository";
import { BookingPolicy } from "../../../domain/services/booking-policy";
import { DomainError } from "../../../shared/errors";
import { ReservationDate } from "../../../domain/value-objects/reservation-date";
import { TimeSlot } from "../../../domain/value-objects/time-slot";

export class CreateCustomerReservationUseCase {
  constructor(
    private reservationRepo: IReservationRepository,
    private userRepo: IUserRepository,
    private bookingPolicy: BookingPolicy
  ) {}

  async execute(customerId: string, input: {
    table_id: number;
    date: string;
    start_time: string;
    end_time?: string;
    party_size: number;
    note?: string;
  }) {
    if (!input.table_id || !input.date || !input.start_time || !input.party_size) {
      throw new DomainError("テーブル、日付、時間、人数は必須です");
    }

    ReservationDate.create(input.date);
    const timeSlot = TimeSlot.create(input.start_time, input.end_time);

    await this.bookingPolicy.validateBooking(input.table_id, input.date, timeSlot, input.party_size);

    const customer = await this.userRepo.findById(customerId);

    return this.reservationRepo.create({
      table_id: input.table_id,
      customer_id: customerId,
      customer_name: customer?.name || "",
      customer_phone: customer?.phone || null,
      date: input.date,
      start_time: timeSlot.startTime,
      end_time: timeSlot.endTime,
      party_size: input.party_size,
      note: input.note || null,
      status: "confirmed",
      created_by: "customer",
    });
  }
}
