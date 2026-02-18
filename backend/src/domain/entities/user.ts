export interface UserProps {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: "staff" | "customer";
}

export class User {
  constructor(public readonly props: UserProps) {}

  toResponse(): Record<string, unknown> {
    const base: Record<string, unknown> = {
      id: this.props.id,
      name: this.props.name,
      email: this.props.email,
      role: this.props.role,
    };
    if (this.props.role === "customer") {
      base.phone = this.props.phone ?? null;
    }
    return base;
  }
}
