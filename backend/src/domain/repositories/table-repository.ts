export interface TableRow {
  id: number;
  table_name: string;
  capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ITableRepository {
  findAllActive(): Promise<TableRow[]>;
  findActiveById(id: number): Promise<TableRow | null>;
  create(data: { table_name: string; capacity: number }): Promise<TableRow>;
  update(id: number, data: Record<string, unknown>): Promise<TableRow | null>;
  softDelete(id: number): Promise<TableRow | null>;
}
