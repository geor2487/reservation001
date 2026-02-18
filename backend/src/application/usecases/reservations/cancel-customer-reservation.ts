import { IReservationRepository } from "../../../domain/repositories/reservation-repository";
import { DomainError } from "../../../shared/errors";

export class CancelCustomerReservationUseCase {
  constructor(private reservationRepo: IReservationRepository) {}

  async execute(id: number, customerId: string) {
    const result = await this.reservationRepo.cancelByCustomer(id, customerId);
    if (!result) {
      throw DomainError.notFound("予約が見つからないか、キャンセルできません");
    }
    return result;
  }
}
