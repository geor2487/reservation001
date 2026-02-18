import { DomainError } from "../../shared/errors";

export class PartySize {
  private constructor(public readonly value: number) {}

  static create(size: number): PartySize {
    if (!size || size < 1) {
      throw new DomainError("人数は1人以上で指定してください");
    }
    return new PartySize(size);
  }
}
