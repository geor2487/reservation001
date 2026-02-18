import { IReservationRepository } from "../../../domain/repositories/reservation-repository";
import { BookingPolicy } from "../../../domain/services/booking-policy";
import { DomainError } from "../../../shared/errors";
import { ReservationDate } from "../../../domain/value-objects/reservation-date";
import { TimeSlot } from "../../../domain/value-objects/time-slot";

export class CreateStaffReservationUseCase {
  constructor(
    private reservationRepo: IReservationRepository,
    private bookingPolicy: BookingPolicy
  ) {}

  async execute(input: {
    table_id: number;
    customer_name: string;
    customer_phone?: string;
    date: string;
    start_time: string;
    end_time?: string;
    party_size: number;
    note?: string;
  }) {
    if (!input.table_id || !input.customer_name || !input.date || !input.start_time || !input.party_size) {
      throw new DomainError("テーブル、名前、日付、時間、人数は必須です");
    }

    ReservationDate.create(input.date);
    const timeSlot = TimeSlot.create(input.start_time, input.end_time);

    await this.bookingPolicy.validateBooking(input.table_id, input.date, timeSlot, input.party_size);

    return this.reservationRepo.create({
      table_id: input.table_id,
      customer_name: input.customer_name,
      customer_phone: input.customer_phone || null,
      date: input.date,
      start_time: timeSlot.startTime,
      end_time: timeSlot.endTime,
      party_size: input.party_size,
      note: input.note || null,
      created_by: "staff",
    });
  }
}
