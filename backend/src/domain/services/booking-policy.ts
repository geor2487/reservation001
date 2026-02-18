import { DomainError } from "../../shared/errors";
import { IReservationRepository } from "../repositories/reservation-repository";
import { ITableRepository } from "../repositories/table-repository";
import { TimeSlot } from "../value-objects/time-slot";

export class BookingPolicy {
  constructor(
    private reservationRepo: IReservationRepository,
    private tableRepo: ITableRepository
  ) {}

  async validateBooking(
    tableId: number,
    date: string,
    timeSlot: TimeSlot,
    partySize: number,
    excludeReservationId?: number
  ): Promise<void> {
    const table = await this.tableRepo.findActiveById(tableId);
    if (!table) {
      throw DomainError.notFound("指定されたテーブルが見つかりません");
    }

    if (partySize > table.capacity) {
      throw new DomainError(`このテーブルの最大人数は${table.capacity}人です`);
    }

    const hasConflict = await this.reservationRepo.hasConflict(
      tableId,
      date,
      timeSlot.startTime,
      timeSlot.endTime,
      excludeReservationId
    );

    if (hasConflict) {
      throw DomainError.conflict(
        "この時間帯は既に予約が入っています。別の時間またはテーブルを選んでください"
      );
    }
  }
}
