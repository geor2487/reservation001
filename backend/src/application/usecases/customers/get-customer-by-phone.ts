import { IUserRepository } from "../../../domain/repositories/user-repository";
import { IReservationRepository, ReservationRow } from "../../../domain/repositories/reservation-repository";

export class GetCustomerByPhoneUseCase {
  constructor(
    private userRepo: IUserRepository,
    private reservationRepo: IReservationRepository
  ) {}

  async execute(phone: string) {
    const reservations = await this.reservationRepo.findByPhone(phone);

    const confirmedPast = reservations.filter(
      (r: ReservationRow) => r.status === "confirmed" && r.date <= new Date().toISOString().split("T")[0]
    );

    // 登録顧客が見つかればプロフィールも返す
    const profile = await this.userRepo.findByPhone(phone);

    return {
      profile: profile ?? null,
      visitCount: confirmedPast.length,
      reservations,
    };
  }
}
