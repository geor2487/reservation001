import { IReservationRepository } from "../../../domain/repositories/reservation-repository";
import { DomainError } from "../../../shared/errors";

export class CancelReservationUseCase {
  constructor(private reservationRepo: IReservationRepository) {}

  async execute(id: number) {
    const result = await this.reservationRepo.cancelByStaff(id);
    if (!result) {
      throw DomainError.notFound("予約が見つからないか、既にキャンセル済みです");
    }
    return result;
  }
}
