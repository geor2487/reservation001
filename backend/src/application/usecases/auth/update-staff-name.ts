import { IUserRepository } from "../../../domain/repositories/user-repository";
import { DomainError } from "../../../shared/errors";

export class UpdateStaffNameUseCase {
  constructor(private userRepo: IUserRepository) {}

  async execute(userId: string, name: string) {
    if (!name || !name.trim()) {
      throw new DomainError("名前を入力してください");
    }

    const result = await this.userRepo.updateProfile(userId, { name: name.trim() });
    if (!result) {
      throw DomainError.notFound("ユーザーが見つかりません");
    }

    return { user: { id: result.id, name: result.name, email: result.email, role: "staff" } };
  }
}
