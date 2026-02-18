import { supabaseAdmin } from "../supabase/client";
import { ITableRepository, TableRow } from "../../domain/repositories/table-repository";

export class SupabaseTableRepository implements ITableRepository {
  async findAllActive(): Promise<TableRow[]> {
    const { data, error } = await supabaseAdmin
      .from("tables")
      .select("*")
      .eq("is_active", true)
      .order("id");

    if (error) throw error;
    return (data ?? []) as TableRow[];
  }

  async findActiveById(id: number): Promise<TableRow | null> {
    const { data, error } = await supabaseAdmin
      .from("tables")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .single();

    if (error || !data) return null;
    return data as TableRow;
  }

  async create(data: { table_name: string; capacity: number }): Promise<TableRow> {
    const { data: result, error } = await supabaseAdmin
      .from("tables")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result as TableRow;
  }

  async update(id: number, data: Record<string, unknown>): Promise<TableRow | null> {
    const { data: result, error } = await supabaseAdmin
      .from("tables")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (!result) return null;
    return result as TableRow;
  }

  async softDelete(id: number): Promise<TableRow | null> {
    const { data, error } = await supabaseAdmin
      .from("tables")
      .update({ is_active: false })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return null;
    return data as TableRow;
  }
}
