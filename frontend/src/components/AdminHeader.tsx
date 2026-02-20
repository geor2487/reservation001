"use client";
import { useState } from "react";
import Link from "next/link";
import { User } from "@/lib/types";

type Props = {
  currentPage?: "reservations" | "new-reservation";
  rightContent?: React.ReactNode;
};

export function AdminHeader({ currentPage, rightContent }: Props) {
  return (
    <header className="bg-gray-800 text-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-lg font-bold">管理画面</Link>
          <nav className="flex gap-3 text-sm">
            <Link
              href="/admin"
              className={currentPage === "reservations" ? "text-orange-300 hover:text-orange-200" : "text-gray-300 hover:text-white"}
            >
              予約一覧
            </Link>
            <Link
              href="/admin/reservations/new"
              className={currentPage === "new-reservation" ? "text-orange-300 hover:text-orange-200" : "text-gray-300 hover:text-white"}
            >
              予約登録
            </Link>
          </nav>
        </div>
        {rightContent}
      </div>
    </header>
  );
}

type UserMenuProps = {
  user: User;
  onLogout: () => void;
};

export function AdminUserMenu({ user, onLogout }: UserMenuProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="text-sm text-gray-300 hover:text-white"
      >
        {user.name}
      </button>
      {showMenu && (
        <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg py-1 z-50">
          <Link
            href="/admin/settings"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setShowMenu(false)}
          >
            設定
          </Link>
          <button
            onClick={onLogout}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            ログアウト
          </button>
        </div>
      )}
    </div>
  );
}
