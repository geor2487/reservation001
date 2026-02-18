import { IReservationRepository } from "../../../domain/repositories/reservation-repository";

export class ListMyReservationsUseCase {
  constructor(private reservationRepo: IReservationRepository) {}

  async execute(customerId: string) {
    return this.reservationRepo.findByCustomerId(customerId);
  }
}
