# 予約管理Webアプリ - サンプル食堂

小規模飲食店（個人店・〜30席）向けの予約管理Webアプリ

## 技術スタック

- **フロントエンド**: Next.js 14 + TypeScript + Tailwind CSS
- **バックエンド**: Express + TypeScript
- **データベース**: PostgreSQL 16
- **認証**: JWT (JSON Web Token)

## セットアップ手順

### 1. PostgreSQL を起動（Docker）

```bash
docker compose up -d
```

### 2. バックエンドのセットアップ

```bash
cd backend
pnpm install
pnpm db:migrate      # テーブル作成
pnpm db:seed         # テストデータ投入
pnpm dev             # サーバー起動（http://localhost:3001）
```

### 3. フロントエンドのセットアップ

```bash
cd frontend
pnpm install
pnpm dev             # 開発サーバー起動（http://localhost:3000）
```

## テストアカウント

| 役割 | メール | パスワード |
|------|--------|-----------|
| 店員 | admin@example.com | password123 |
| お客さん | tanaka@example.com | password123 |
| お客さん | suzuki@example.com | password123 |

## 画面一覧

### お客さん用
- `/reserve` - 予約画面（日付・テーブル選択 → 予約）
- `/reserve/login` - ログイン
- `/reserve/register` - 新規登録
- `/reserve/my-reservations` - マイ予約一覧

### 店員用（管理画面）
- `/admin` - 予約一覧（日別表示）
- `/admin/login` - 店員ログイン
- `/admin/reservations/new` - 予約登録（電話/LINE対応）
- `/admin/tables` - テーブル管理

## API一覧

### 認証
- `POST /api/auth/staff/login` - 店員ログイン
- `POST /api/auth/customer/login` - お客さんログイン
- `POST /api/auth/customer/register` - お客さん新規登録

### テーブル
- `GET /api/tables` - テーブル一覧
- `POST /api/tables` - テーブル追加（店員のみ）
- `PUT /api/tables/:id` - テーブル編集（店員のみ）
- `DELETE /api/tables/:id` - テーブル無効化（店員のみ）

### 予約
- `GET /api/reservations/availability?date=YYYY-MM-DD` - 空き状況
- `GET /api/reservations?date=YYYY-MM-DD` - 予約一覧（店員のみ）
- `GET /api/reservations/my` - マイ予約（お客さん）
- `POST /api/reservations/customer` - 予約作成（お客さん）
- `POST /api/reservations/staff` - 予約作成（店員）
- `PUT /api/reservations/:id` - 予約編集（店員のみ）
- `PATCH /api/reservations/:id/cancel` - 予約キャンセル（店員）
- `PATCH /api/reservations/:id/cancel/customer` - 予約キャンセル（お客さん）

## DB設計

4テーブル構成: `staff`, `customers`, `tables`, `reservations`

ダブルブッキング防止は `reservations` テーブルの時間帯重複チェックで実現。
