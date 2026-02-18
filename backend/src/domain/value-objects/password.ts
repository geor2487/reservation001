import { DomainError } from "../../shared/errors";

export class Password {
  private constructor(public readonly value: string) {}

  static create(password: string): Password {
    if (!password || password.length < 6) {
      throw new DomainError("パスワードは6文字以上にしてください");
    }
    return new Password(password);
  }
}
