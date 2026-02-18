import { IReservationRepository } from "../../../domain/repositories/reservation-repository";
import { ITableRepository } from "../../../domain/repositories/table-repository";
import { DomainError } from "../../../shared/errors";

export class UpdateReservationUseCase {
  constructor(
    private reservationRepo: IReservationRepository,
    private tableRepo: ITableRepository
  ) {}

  async execute(id: number, input: {
    table_id?: number;
    customer_name?: string;
    customer_phone?: string;
    date?: string;
    start_time?: string;
    end_time?: string;
    party_size?: number;
    note?: string;
    status?: string;
  }) {
    const current = await this.reservationRepo.findById(id);
    if (!current) {
      throw DomainError.notFound("予約が見つかりません");
    }

    const newTableId = input.table_id || current.table_id;
    const newDate = input.date || current.date;
    const newStartTime = input.start_time || current.start_time;
    const newEndTime = input.end_time || current.end_time;

    if (input.table_id || input.date || input.start_time || input.end_time) {
      const hasConflict = await this.reservationRepo.hasConflict(
        newTableId, newDate, newStartTime, newEndTime, id
      );
      if (hasConflict) {
        throw DomainError.conflict("変更先の時間帯は既に予約が入っています");
      }
    }

    if (input.party_size || input.table_id) {
      const table = await this.tableRepo.findActiveById(newTableId);
      if (table) {
        const newPartySize = input.party_size || current.party_size;
        if (newPartySize > table.capacity) {
          throw new DomainError(`このテーブルの最大人数は${table.capacity}人です`);
        }
      }
    }

    const updates: Record<string, unknown> = {};
    if (input.table_id !== undefined) updates.table_id = input.table_id;
    if (input.customer_name !== undefined) updates.customer_name = input.customer_name;
    if (input.customer_phone !== undefined) updates.customer_phone = input.customer_phone;
    if (input.date !== undefined) updates.date = input.date;
    if (input.start_time !== undefined) updates.start_time = input.start_time;
    if (input.end_time !== undefined) updates.end_time = input.end_time;
    if (input.party_size !== undefined) updates.party_size = input.party_size;
    if (input.note !== undefined) updates.note = input.note;
    if (input.status !== undefined) updates.status = input.status;

    return this.reservationRepo.update(id, updates);
  }
}
