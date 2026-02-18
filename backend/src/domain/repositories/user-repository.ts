export interface ProfileRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  created_at: string;
}

export interface IUserRepository {
  findById(id: string): Promise<ProfileRow | null>;
  findByIdWithRole(id: string, role: string): Promise<ProfileRow | null>;
  findCustomers(): Promise<ProfileRow[]>;
  updateProfile(id: string, data: Record<string, unknown>): Promise<ProfileRow | null>;
}
