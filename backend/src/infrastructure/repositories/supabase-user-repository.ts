import { supabaseAdmin } from "../supabase/client";
import { IUserRepository, ProfileRow } from "../../domain/repositories/user-repository";

export class SupabaseUserRepository implements IUserRepository {
  async findById(id: string): Promise<ProfileRow | null> {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, name, email, phone, role, created_at")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return data as ProfileRow;
  }

  async findByIdWithRole(id: string, role: string): Promise<ProfileRow | null> {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", id)
      .eq("role", role)
      .single();

    if (error || !data) return null;
    return data as ProfileRow;
  }

  async findCustomers(): Promise<ProfileRow[]> {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, name, email, phone, created_at")
      .eq("role", "customer")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as ProfileRow[];
  }

  async updateProfile(id: string, data: Record<string, unknown>): Promise<ProfileRow | null> {
    const { data: result, error } = await supabaseAdmin
      .from("profiles")
      .update(data)
      .eq("id", id)
      .select("id, name, email, phone")
      .single();

    if (error) throw error;
    return result as ProfileRow | null;
  }
}
