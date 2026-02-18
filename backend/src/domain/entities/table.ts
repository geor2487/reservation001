import { DomainError } from "../../shared/errors";

export interface TableProps {
  id: number;
  table_name: string;
  capacity: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export class RestaurantTable {
  constructor(public readonly props: TableProps) {}

  canAccommodate(partySize: number): void {
    if (partySize > this.props.capacity) {
      throw new DomainError(
        `このテーブルの最大人数は${this.props.capacity}人です`
      );
    }
  }

  static create(tableName: string, capacity: number): { table_name: string; capacity: number } {
    if (!tableName || !capacity) {
      throw new DomainError("テーブル名と席数は必須です");
    }
    return { table_name: tableName, capacity };
  }
}
