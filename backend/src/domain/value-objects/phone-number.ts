import { DomainError } from "../../shared/errors";

export class PhoneNumber {
  private constructor(public readonly value: string) {}

  static create(phone: string): PhoneNumber {
    if (!/^0\d{9,10}$/.test(phone)) {
      throw new DomainError("電話番号は0始まりの10〜11桁の数字で入力してください");
    }
    return new PhoneNumber(phone);
  }
}
