import { IReservationRepository } from "../../../domain/repositories/reservation-repository";
import { BookingPolicy } from "../../../domain/services/booking-policy";
import { DomainError } from "../../../shared/errors";
import { ReservationDate } from "../../../domain/value-objects/reservation-date";
import { TimeSlot } from "../../../domain/value-objects/time-slot";
import { PhoneNumber } from "../../../domain/value-objects/phone-number";

export class CreateGuestReservationUseCase {
  constructor(
    private reservationRepo: IReservationRepository,
    private bookingPolicy: BookingPolicy
  ) {}

  async execute(input: {
    table_id: number;
    date: string;
    start_time: string;
    end_time?: string;
    party_size: number;
    customer_name: string;
    customer_phone: string;
  }) {
    if (!input.table_id || !input.date || !input.start_time || !input.party_size || !input.customer_name || !input.customer_phone) {
      throw new DomainError("テーブル、日付、開始時間、人数、名前、電話番号は必須です");
    }

    PhoneNumber.create(input.customer_phone);
    ReservationDate.create(input.date);
    const timeSlot = TimeSlot.create(input.start_time, input.end_time);

    await this.bookingPolicy.validateBooking(input.table_id, input.date, timeSlot, input.party_size);

    return this.reservationRepo.create({
      table_id: input.table_id,
      customer_id: null,
      customer_name: input.customer_name,
      customer_phone: input.customer_phone,
      date: input.date,
      start_time: timeSlot.startTime,
      end_time: timeSlot.endTime,
      party_size: input.party_size,
      status: "confirmed",
      created_by: "customer",
    });
  }
}
