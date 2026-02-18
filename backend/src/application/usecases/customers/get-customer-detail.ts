import { IUserRepository } from "../../../domain/repositories/user-repository";
import { IReservationRepository, ReservationRow } from "../../../domain/repositories/reservation-repository";
import { DomainError } from "../../../shared/errors";

export class GetCustomerDetailUseCase {
  constructor(
    private userRepo: IUserRepository,
    private reservationRepo: IReservationRepository
  ) {}

  async execute(customerId: string) {
    const profile = await this.userRepo.findById(customerId);
    if (!profile) {
      throw new DomainError("顧客が見つかりません", 404);
    }

    const reservations = await this.reservationRepo.findByCustomerId(customerId);

    const confirmedPast = reservations.filter(
      (r: ReservationRow) => r.status === "confirmed" && r.date <= new Date().toISOString().split("T")[0]
    );

    return {
      profile,
      visitCount: confirmedPast.length,
      reservations,
    };
  }
}
