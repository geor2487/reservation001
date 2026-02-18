import { IUserRepository } from "../../../domain/repositories/user-repository";
import { supabaseAdmin } from "../../../infrastructure/supabase/client";
import { DomainError } from "../../../shared/errors";
import { User } from "../../../domain/entities/user";

export class CustomerLoginUseCase {
  constructor(private userRepo: IUserRepository) {}

  async execute(input: { email: string; password: string }) {
    if (!input.email || !input.password) {
      throw new DomainError("メールアドレスとパスワードを入力してください");
    }

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      throw DomainError.unauthorized("メールアドレスまたはパスワードが間違っています");
    }

    const profile = await this.userRepo.findByIdWithRole(data.user.id, "customer");
    if (!profile) {
      throw DomainError.forbidden("お客さんアカウントではありません");
    }

    const user = new User({
      id: data.user.id,
      name: profile.name,
      email: data.user.email!,
      phone: profile.phone,
      role: "customer",
    });
    return { token: data.session.access_token, user: user.toResponse() };
  }
}
