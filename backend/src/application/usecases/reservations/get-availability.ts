import { IReservationRepository, ReservationRow } from "../../../domain/repositories/reservation-repository";
import { ITableRepository } from "../../../domain/repositories/table-repository";
import { DomainError } from "../../../shared/errors";

export class GetAvailabilityUseCase {
  constructor(
    private reservationRepo: IReservationRepository,
    private tableRepo: ITableRepository
  ) {}

  async execute(date: string) {
    if (!date) {
      throw new DomainError("日付を指定してください");
    }
    const tables = await this.tableRepo.findAllActive();
    const reservations = await this.reservationRepo.findByDateWithTables(date);
    return { date, tables, reservations };
  }
}
