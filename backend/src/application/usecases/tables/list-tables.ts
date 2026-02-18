import { ITableRepository } from "../../../domain/repositories/table-repository";

export class ListTablesUseCase {
  constructor(private tableRepo: ITableRepository) {}

  async execute() {
    return this.tableRepo.findAllActive();
  }
}
