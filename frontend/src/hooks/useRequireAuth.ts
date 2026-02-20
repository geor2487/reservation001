"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/lib/types";

type AuthModule = {
  getUser: () => User | null;
};

export function useRequireAuth(
  auth: AuthModule,
  role: "staff" | "customer",
  redirectPath: string
): User | null {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const u = auth.getUser();
    if (!u || u.role !== role) {
      router.push(redirectPath);
      return;
    }
    setUser(u);
  }, [auth, role, redirectPath, router]);

  return user;
}
