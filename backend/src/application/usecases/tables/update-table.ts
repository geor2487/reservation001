import { ITableRepository } from "../../../domain/repositories/table-repository";
import { DomainError } from "../../../shared/errors";

export class UpdateTableUseCase {
  constructor(private tableRepo: ITableRepository) {}

  async execute(id: number, input: { table_name?: string; capacity?: number; is_active?: boolean }) {
    const updates: Record<string, unknown> = {};
    if (input.table_name !== undefined) updates.table_name = input.table_name;
    if (input.capacity !== undefined) updates.capacity = input.capacity;
    if (input.is_active !== undefined) updates.is_active = input.is_active;

    const result = await this.tableRepo.update(id, updates);
    if (!result) {
      throw DomainError.notFound("テーブルが見つかりません");
    }
    return result;
  }
}
