import { supabaseAdmin } from "../../../infrastructure/supabase/client";
import { DomainError } from "../../../shared/errors";
import { PhoneNumber } from "../../../domain/value-objects/phone-number";
import { User } from "../../../domain/entities/user";

export class CustomerRegisterUseCase {
  async execute(input: { email: string; password: string; name: string; phone: string }) {
    if (!input.email || !input.password || !input.name || !input.phone) {
      throw new DomainError("メールアドレス、パスワード、名前、電話番号は必須です");
    }

    PhoneNumber.create(input.phone);

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { role: "customer", name: input.name, phone: input.phone || null },
    });

    if (error) {
      if (error.message.includes("already been registered")) {
        throw DomainError.conflict("このメールアドレスは既に登録されています");
      }
      throw error;
    }

    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (signInError) throw signInError;

    const user = new User({
      id: data.user.id,
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      role: "customer",
    });
    return { token: signInData.session.access_token, user: user.toResponse() };
  }
}
