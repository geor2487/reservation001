export interface ProfileRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  staff_note: string | null;
  created_at: string;
}

export interface IUserRepository {
  findById(id: string): Promise<ProfileRow | null>;
  findByIdWithRole(id: string, role: string): Promise<ProfileRow | null>;
  findCustomers(): Promise<ProfileRow[]>;
  findByPhone(phone: string): Promise<ProfileRow | null>;
  updateProfile(id: string, data: Record<string, unknown>): Promise<ProfileRow | null>;
  updateStaffNote(id: string, note: string): Promise<ProfileRow | null>;
}
