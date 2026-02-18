import { IReservationRepository } from "../../../domain/repositories/reservation-repository";

export class ListReservationsUseCase {
  constructor(private reservationRepo: IReservationRepository) {}

  async execute(filters: { date?: string; status?: string }) {
    return this.reservationRepo.findAllWithTables(filters);
  }
}
