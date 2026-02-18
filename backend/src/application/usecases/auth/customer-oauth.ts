import { IUserRepository } from "../../../domain/repositories/user-repository";
import { supabaseAdmin } from "../../../infrastructure/supabase/client";
import { DomainError } from "../../../shared/errors";

export class CustomerOAuthUseCase {
  constructor(private userRepo: IUserRepository) {}

  async execute(accessToken: string) {
    if (!accessToken) {
      throw new DomainError("アクセストークンが必要です");
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (error || !user) {
      throw DomainError.unauthorized("認証に失敗しました");
    }

    const profile = await this.userRepo.findById(user.id);
    if (!profile) {
      throw new DomainError("プロフィールの取得に失敗しました", 500);
    }

    if (profile.role !== "customer") {
      throw DomainError.forbidden("お客さんアカウントではありません");
    }

    // Update name from Google metadata if empty
    if (!profile.name && user.user_metadata?.name) {
      await this.userRepo.updateProfile(user.id, { name: user.user_metadata.name });
      profile.name = user.user_metadata.name;
    }

    // Update email from Google metadata if empty
    if (!profile.email && user.email) {
      await this.userRepo.updateProfile(user.id, { email: user.email });
      profile.email = user.email;
    }

    const needsPhone = !profile.phone;

    return {
      token: accessToken,
      user: {
        id: user.id,
        name: profile.name || "",
        email: profile.email || user.email,
        phone: profile.phone,
        role: "customer",
      },
      needsPhone,
    };
  }
}
