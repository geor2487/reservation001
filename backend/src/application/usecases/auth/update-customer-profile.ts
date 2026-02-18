import { IUserRepository } from "../../../domain/repositories/user-repository";
import { supabaseAdmin } from "../../../infrastructure/supabase/client";
import { DomainError } from "../../../shared/errors";
import { PhoneNumber } from "../../../domain/value-objects/phone-number";
import { Password } from "../../../domain/value-objects/password";

export class UpdateCustomerProfileUseCase {
  constructor(private userRepo: IUserRepository) {}

  async execute(userId: string, userEmail: string, input: {
    name: string;
    phone: string;
    email: string;
    current_password?: string;
    new_password?: string;
  }) {
    if (!input.name || !input.email || !input.phone) {
      throw new DomainError("名前、メールアドレス、電話番号は必須です");
    }

    PhoneNumber.create(input.phone);

    // Update profile
    await this.userRepo.updateProfile(userId, {
      name: input.name.trim(),
      phone: input.phone || null,
      email: input.email,
    });

    // Update email in auth if changed
    if (input.email && input.email !== userEmail) {
      const { error: updateEmailError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { email: input.email }
      );
      if (updateEmailError) {
        if (updateEmailError.message.includes("already been registered")) {
          throw DomainError.conflict("このメールアドレスは既に登録されています");
        }
        throw updateEmailError;
      }
    }

    // Update password if requested
    if (input.new_password && input.current_password) {
      const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: userEmail,
        password: input.current_password,
      });
      if (signInError) {
        throw DomainError.unauthorized("現在のパスワードが間違っています");
      }
      Password.create(input.new_password);
      const { error: updatePwError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: input.new_password }
      );
      if (updatePwError) throw updatePwError;
    }

    const updated = await this.userRepo.findById(userId);
    return { user: { ...updated, role: "customer" } };
  }
}
