import { DomainError } from "../../shared/errors";

export interface ReservationProps {
  id?: number;
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
  created_at?: string;
  updated_at?: string;
}

export class Reservation {
  constructor(public readonly props: ReservationProps) {}

  cancel(): void {
    if (this.props.status !== "confirmed") {
      throw DomainError.notFound("予約が見つからないか、既にキャンセル済みです");
    }
    (this.props as { status: string }).status = "cancelled";
  }

  toPersistence(): Omit<ReservationProps, "id" | "created_at" | "updated_at"> {
    return {
      table_id: this.props.table_id,
      customer_id: this.props.customer_id,
      customer_name: this.props.customer_name,
      customer_phone: this.props.customer_phone,
      date: this.props.date,
      start_time: this.props.start_time,
      end_time: this.props.end_time,
      party_size: this.props.party_size,
      status: this.props.status,
      note: this.props.note,
      created_by: this.props.created_by,
    };
  }
}
