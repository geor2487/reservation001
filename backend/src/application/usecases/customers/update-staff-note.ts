import { IUserRepository } from "../../../domain/repositories/user-repository";
import { DomainError } from "../../../shared/errors";

export class UpdateStaffNoteUseCase {
  constructor(private userRepo: IUserRepository) {}

  async execute(customerId: string, note: string) {
    const profile = await this.userRepo.findById(customerId);
    if (!profile) {
      throw new DomainError("顧客が見つかりません", 404);
    }

    const updated = await this.userRepo.updateStaffNote(customerId, note);
    return updated;
  }
}
