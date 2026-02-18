import { supabaseAdmin } from "../supabase/client";
import {
  IReservationRepository,
  ReservationRow,
} from "../../domain/repositories/reservation-repository";

export class SupabaseReservationRepository implements IReservationRepository {
  async findByDateWithTables(date: string): Promise<ReservationRow[]> {
    const { data, error } = await supabaseAdmin
      .from("reservations")
      .select("*, tables(table_name, capacity)")
      .eq("date", date)
      .eq("status", "confirmed")
      .order("start_time");

    if (error) throw error;
    return (data ?? []) as unknown as ReservationRow[];
  }

  async findAllWithTables(filters: { date?: string; status?: string }): Promise<ReservationRow[]> {
    let query = supabaseAdmin
      .from("reservations")
      .select("*, tables(table_name, capacity)");

    if (filters.date) {
      query = query.eq("date", filters.date);
    }
    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    query = query.order("date").order("start_time");

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as unknown as ReservationRow[];
  }

  async findByCustomerId(customerId: string): Promise<ReservationRow[]> {
    const { data, error } = await supabaseAdmin
      .from("reservations")
      .select("*, tables(table_name, capacity)")
      .eq("customer_id", customerId)
      .order("date", { ascending: false })
      .order("start_time", { ascending: false });

    if (error) throw error;
    return (data ?? []) as unknown as ReservationRow[];
  }

  async findById(id: number): Promise<ReservationRow | null> {
    const { data, error } = await supabaseAdmin
      .from("reservations")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return data as unknown as ReservationRow;
  }

  async hasConflict(
    tableId: number,
    date: string,
    startTime: string,
    endTime: string,
    excludeId?: number
  ): Promise<boolean> {
    let query = supabaseAdmin
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("table_id", tableId)
      .eq("date", date)
      .lt("start_time", endTime)
      .gt("end_time", startTime)
      .eq("status", "confirmed");

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { count } = await query;
    return (count ?? 0) > 0;
  }

  async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data: result, error } = await supabaseAdmin
      .from("reservations")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async update(id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data: result, error } = await supabaseAdmin
      .from("reservations")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async cancelByStaff(id: number): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabaseAdmin
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("status", "confirmed")
      .select()
      .single();

    if (error || !data) return null;
    return data;
  }

  async cancelByCustomer(id: number, customerId: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabaseAdmin
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("customer_id", customerId)
      .eq("status", "confirmed")
      .select()
      .single();

    if (error || !data) return null;
    return data;
  }
}
