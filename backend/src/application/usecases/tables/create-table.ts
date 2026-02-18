import { ITableRepository } from "../../../domain/repositories/table-repository";
import { RestaurantTable } from "../../../domain/entities/table";

export class CreateTableUseCase {
  constructor(private tableRepo: ITableRepository) {}

  async execute(input: { table_name: string; capacity: number }) {
    const data = RestaurantTable.create(input.table_name, input.capacity);
    return this.tableRepo.create(data);
  }
}
