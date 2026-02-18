import { ITableRepository } from "../../../domain/repositories/table-repository";
import { DomainError } from "../../../shared/errors";

export class DeleteTableUseCase {
  constructor(private tableRepo: ITableRepository) {}

  async execute(id: number) {
    const result = await this.tableRepo.softDelete(id);
    if (!result) {
      throw DomainError.notFound("テーブルが見つかりません");
    }
    return { message: "テーブルを無効化しました" };
  }
}
