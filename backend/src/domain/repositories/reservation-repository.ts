export interface ReservationRow {
  id: number;
  table_id: number;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  date: string;
  start_time: string;
  end_time: string;
  party_size: number;
  status: string;
  note: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  tables: { table_name: string; capacity: number } | null;
}

export interface IReservationRepository {
  findByDateWithTables(date: string): Promise<ReservationRow[]>;
  findAllWithTables(filters: { date?: string; status?: string }): Promise<ReservationRow[]>;
  findByCustomerId(customerId: string): Promise<ReservationRow[]>;
  findById(id: number): Promise<ReservationRow | null>;
  hasConflict(
    tableId: number,
    date: string,
    startTime: string,
    endTime: string,
    excludeId?: number
  ): Promise<boolean>;
  create(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  update(id: number, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  cancelByStaff(id: number): Promise<Record<string, unknown> | null>;
  cancelByCustomer(id: number, customerId: string): Promise<Record<string, unknown> | null>;
}
