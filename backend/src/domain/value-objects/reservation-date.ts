import { DomainError } from "../../shared/errors";

export class ReservationDate {
  private constructor(public readonly value: string) {}

  static create(date: string, allowPast = false): ReservationDate {
    if (!allowPast && ReservationDate.isPast(date)) {
      throw new DomainError("過去の日付には予約できません");
    }
    return new ReservationDate(date);
  }

  private static isPast(date: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date + "T00:00:00");
    return target < today;
  }
}
