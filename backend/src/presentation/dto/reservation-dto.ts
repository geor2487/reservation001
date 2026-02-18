import { ReservationRow } from "../../domain/repositories/reservation-repository";

export const flattenReservation = (r: ReservationRow) => ({
  id: r.id,
  table_id: r.table_id,
  customer_id: r.customer_id,
  customer_name: r.customer_name,
  customer_phone: r.customer_phone,
  date: r.date,
  start_time: r.start_time,
  end_time: r.end_time,
  party_size: r.party_size,
  status: r.status,
  note: r.note,
  created_by: r.created_by,
  created_at: r.created_at,
  updated_at: r.updated_at,
  table_name: r.tables?.table_name,
  capacity: r.tables?.capacity,
});
