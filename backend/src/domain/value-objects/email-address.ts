import { DomainError } from "../../shared/errors";

export class EmailAddress {
  private constructor(public readonly value: string) {}

  static create(email: string): EmailAddress {
    if (!email || !email.trim()) {
      throw new DomainError("メールアドレスを入力してください");
    }
    return new EmailAddress(email.trim());
  }
}
