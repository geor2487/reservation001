import { IUserRepository } from "../../../domain/repositories/user-repository";
import { supabaseAdmin } from "../../../infrastructure/supabase/client";
import { DomainError } from "../../../shared/errors";
import { Password } from "../../../domain/value-objects/password";

export class UpdateStaffLoginSettingsUseCase {
  constructor(private userRepo: IUserRepository) {}

  async execute(userId: string, input: { email?: string; current_password: string; new_password?: string }) {
    if (!input.current_password) {
      throw new DomainError("現在のパスワードを入力してください");
    }

    const profile = await this.userRepo.findById(userId);
    if (!profile) {
      throw DomainError.notFound("ユーザーが見つかりません");
    }

    // Verify current password
    const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: profile.email!,
      password: input.current_password,
    });

    if (signInError) {
      throw DomainError.unauthorized("現在のパスワードが間違っています");
    }

    // Update email
    if (input.email && input.email !== profile.email) {
      const { error: updateEmailError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { email: input.email }
      );
      if (updateEmailError) {
        if (updateEmailError.message.includes("already been registered")) {
          throw DomainError.conflict("このメールアドレスは既に使用されています");
        }
        throw updateEmailError;
      }
      await this.userRepo.updateProfile(userId, { email: input.email });
    }

    // Update password
    if (input.new_password) {
      Password.create(input.new_password);
      const { error: updatePwError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: input.new_password }
      );
      if (updatePwError) throw updatePwError;
    }

    const updated = await this.userRepo.findById(userId);
    return { user: { ...updated, role: "staff" } };
  }
}
