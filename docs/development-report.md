# 予約管理Webアプリ 開発レポート

## プロジェクト概要

小規模飲食店（個人店・30席程度）向けの予約管理Webアプリを開発した。お客さんがスマホから予約できる顧客向け画面と、店員が予約状況を一覧・管理できる管理画面の2つのインターフェースを持つ。

### 想定ユーザー

- **お客さん**: Webから予約・確認・キャンセルを行う
- **店員**: 予約状況の確認、電話予約の代理登録、テーブル管理を行う

---

## 技術スタック

| カテゴリ | 技術 | バージョン |
|---------|------|-----------|
| フロントエンド | Next.js (App Router) | 14.2 |
| フロントエンド | TypeScript | 5.x |
| フロントエンド | Tailwind CSS | 3.4 |
| バックエンド | Express | 4.18 |
| バックエンド | TypeScript | 5.x |
| データベース | PostgreSQL | 16 |
| 認証 | JWT (jsonwebtoken) | 9.0 |
| パスワード | bcrypt | 5.1 |
| コンテナ | Docker Compose | - |

### なぜこの構成にしたか

- **Next.js 14 (App Router)**: React ベースで、ファイルベースルーティングによりページ構成がシンプル。SSRも使えるが今回はCSR中心で利用
- **Express**: 軽量で学習コストが低く、小規模APIに適している
- **PostgreSQL**: リレーショナルDBとしての信頼性。ダブルブッキング防止など整合性が重要な予約管理に適している
- **Tailwind CSS**: ユーティリティファーストでUIを素早く構築。カスタムCSSをほぼ書かずにデザインを実現

---

## アーキテクチャ

```
┌─────────────────┐     HTTP/JSON     ┌─────────────────┐     SQL      ┌──────────┐
│   Next.js 14    │ ◄──────────────► │   Express API   │ ◄──────────► │ PostgreSQL│
│   (port 3000)   │                   │   (port 3001)   │              │ (port 5432)│
│                 │                   │                 │              │          │
│ - 顧客向けUI     │                   │ - REST API      │              │ - staff  │
│ - 管理者UI       │                   │ - JWT認証        │              │ - customers│
│ - Tailwind CSS  │                   │ - バリデーション    │              │ - tables │
└─────────────────┘                   └─────────────────┘              │ - reservations│
                                                                      └──────────┘
```

### ディレクトリ構成

```
reservation-app/
├── docker-compose.yml        # PostgreSQL コンテナ定義
├── backend/
│   └── src/
│       ├── index.ts          # Expressサーバー起動・ルーティング設定
│       ├── db/
│       │   ├── pool.ts       # DB接続プール
│       │   ├── migrate.ts    # テーブル作成マイグレーション
│       │   └── seed.ts       # テストデータ投入
│       ├── middleware/
│       │   └── auth.ts       # JWT認証ミドルウェア
│       └── routes/
│           ├── auth.ts       # ログイン・登録API
│           ├── tables.ts     # テーブル管理API
│           └── reservations.ts # 予約管理API
└── frontend/
    └── src/
        ├── lib/
        │   ├── api.ts        # API呼び出しヘルパー・認証管理
        │   └── types.ts      # TypeScript型定義
        └── app/
            ├── page.tsx      # トップページ
            ├── globals.css   # グローバルスタイル
            ├── reserve/      # 顧客向けページ群
            └── admin/        # 管理者向けページ群
```

---

## データベース設計

### ER図

```
staff (店員)
├── id (PK)
├── email (UNIQUE)
├── password_hash
├── name
└── created_at / updated_at

customers (顧客)
├── id (PK)
├── email (UNIQUE, NULL可)
├── password_hash
├── name
├── phone
└── created_at / updated_at

tables (テーブル)
├── id (PK)
├── table_name
├── capacity (席数)
├── is_active (論理削除用)
└── created_at / updated_at

reservations (予約)
├── id (PK)
├── table_id (FK → tables)
├── customer_id (FK → customers, NULL可)
├── customer_name
├── customer_phone
├── date
├── start_time
├── end_time (自動計算: start_time + 2h)
├── party_size
├── status (confirmed / cancelled)
├── note
├── created_by (customer / staff)
└── created_at / updated_at
```

### 設計上のポイント

- **`customer_id` がNULL可能**: ゲスト予約（会員登録なし）に対応するため。ゲスト予約でも `customer_name` と `customer_phone` は必須
- **`is_active` による論理削除**: テーブルを削除しても既存の予約データを保持できる
- **ダブルブッキング防止インデックス**: `(table_id, date, start_time, end_time) WHERE status='confirmed'` で高速な重複チェックを実現
- **`end_time` の自動計算**: フロントエンドでは入力させず、バックエンドで `start_time + 2時間` を自動計算。ユーザー操作をシンプルにするための判断

---

## 画面設計と機能

### お客さん向け画面（オレンジ系アクセント）

#### トップページ (`/`)
- 店舗名「POND」を表示
- 「予約する」ボタン → `/reserve` へ
- 店員向けリンク → `/admin/login` へ

#### 予約フォーム (`/reserve`) - 5ステップ構成
予約のUXを最適化するため、1画面に全項目を出すのではなく、ステップバイステップのウィザード形式を採用した。

1. **人数入力**: 来店人数を入力
2. **日付選択**: 本日以降の日付を選択（過去日付は選択不可）
3. **来店時間選択**: ドロップダウンで 17:30〜22:00（15分間隔）から選択
4. **テーブル選択**: 人数に合ったテーブルのみ表示（capacity >= 人数 かつ capacity <= 人数+2）
5. **詳細入力・確認**: ゲストは名前・電話番号を入力、ログイン済みは自動入力。メモ欄あり

予約完了後は完了画面を表示。

#### マイ予約 (`/reserve/my-reservations`)
- ログイン済み顧客の予約一覧
- 今後の予約のキャンセルが可能

#### 顧客設定 (`/reserve/settings`)
- 名前・電話番号・メールアドレスの変更
- パスワード変更

### 管理者向け画面（グレー系）

#### ダッシュボード (`/admin`)
- **タイムライン表示**: 17:00〜24:00の時間軸 × テーブル行のガントチャート風ビュー
- 予約ブロックをクリックで詳細表示・編集
- 日付切り替え（前日/翌日）
- 当日の予約数・来客数のサマリー表示

#### 予約登録 (`/admin/reservations/new`)
- 店員が電話予約などを代理登録するためのフォーム
- 顧客一覧から選択 or ゲスト情報を直接入力

#### テーブル管理 (`/admin/tables`)
- テーブルの追加・名前変更・席数変更・無効化

#### 管理者設定 (`/admin/settings`)
- アカウント情報（名前・メール・パスワード）の変更
- 登録顧客の一覧表示

---

## API設計

### 認証 (`/api/auth`)

| メソッド | エンドポイント | 認証 | 説明 |
|---------|--------------|------|------|
| POST | `/staff/login` | 不要 | 店員ログイン（メール + パスワード → JWT） |
| POST | `/customer/register` | 不要 | 顧客新規登録（名前・電話番号必須、メール任意） |
| POST | `/customer/login` | 不要 | 顧客ログイン（電話番号 + パスワード） |
| PUT | `/staff/name` | 店員 | 店員の名前変更 |
| PUT | `/staff/login-settings` | 店員 | 店員のメール・パスワード変更 |
| GET | `/customers` | 店員 | 顧客一覧取得 |
| PUT | `/customer/profile` | 顧客 | 顧客のプロフィール・パスワード変更 |

### テーブル (`/api/tables`)

| メソッド | エンドポイント | 認証 | 説明 |
|---------|--------------|------|------|
| GET | `/` | 不要 | アクティブなテーブル一覧 |
| POST | `/` | 店員 | テーブル追加 |
| PUT | `/:id` | 店員 | テーブル編集 |
| DELETE | `/:id` | 店員 | テーブル無効化（論理削除） |

### 予約 (`/api/reservations`)

| メソッド | エンドポイント | 認証 | 説明 |
|---------|--------------|------|------|
| GET | `/availability?date=` | 不要 | 指定日の空き状況 |
| GET | `/` | 店員 | 予約一覧（日付・ステータスでフィルター可） |
| GET | `/my` | 顧客 | 自分の予約一覧 |
| POST | `/guest` | 不要 | ゲスト予約（名前・電話番号必須） |
| POST | `/customer` | 顧客 | ログイン済み顧客の予約 |
| POST | `/staff` | 店員 | 店員による代理予約 |
| PUT | `/:id` | 店員 | 予約の編集 |
| PATCH | `/:id/cancel` | 店員 | 予約キャンセル（店員） |
| PATCH | `/:id/cancel/customer` | 顧客 | 予約キャンセル（顧客自身） |

---

## 主要な設計判断

### 1. 予約ステータスは即confirmed（承認フローなし）

小規模個人店を想定しているため、店員が1件1件承認するフローは不要と判断。予約は即座に確定（`confirmed`）となる。ステータスは `confirmed` と `cancelled` の2種類のみ。

### 2. 終了時間はバックエンドで自動計算

ユーザーに終了時間を入力させると操作が煩雑になるため、開始時間 + 2時間で自動計算する設計にした。`calculateEndTime()` 関数で一元管理。

### 3. ゲスト予約の対応

会員登録のハードルを下げるため、ゲスト予約（認証不要）を用意した。`POST /api/reservations/guest` エンドポイントで、名前と電話番号さえあれば予約可能。`customer_id` は NULL になる。

### 4. テーブル選択のフィルタリング

予約時にすべてのテーブルを表示するのではなく、人数に合ったテーブルだけを表示する。具体的には `テーブル席数 >= 人数` かつ `テーブル席数 <= 人数 + 2` でフィルタリングし、大きすぎるテーブルや小さすぎるテーブルを除外する。

### 5. 顧客ログインは電話番号ベース

当初はメールアドレスでのログインだったが、飲食店の予約では電話番号のほうが自然なため、電話番号 + パスワードでのログインに変更した。メールアドレスは任意項目に。

### 6. ダブルブッキング防止

SQLレベルで時間帯の重複チェックを行う。`既存の開始時間 < 新規の終了時間 AND 既存の終了時間 > 新規の開始時間` の条件で重複を検出。部分インデックスで confirmed ステータスの予約のみを対象にすることで、キャンセル済み予約との重複は許容。

---

## 開発の流れ（Git履歴ベース）

### Step 1: 初期実装

**コミット**: `Initial commit: reservation app with party-size-first flow`

- プロジェクトの基本構成を構築（Next.js + Express + PostgreSQL）
- Docker ComposeでPostgreSQLコンテナを定義
- DB マイグレーション・シードデータの作成
- 認証システム（JWT）の実装
- 予約の CRUD API を実装
- 顧客向け予約フォーム（人数優先フロー）を実装
- 管理画面（タイムライン表示）を実装
- テーブル管理機能を実装

### Step 2: 管理画面の来店時間入力をドロップダウンに変更

**コミット**: `Change admin start_time input to dropdown (17:30-24:00, 15min intervals)`

- 管理画面の予約登録フォームで、来店時間の入力方法をテキスト入力からドロップダウン選択に変更
- 17:30〜24:00の範囲で15分間隔の選択肢を表示
- 入力ミスの防止と操作性の向上

### Step 3: Neon DB対応

**コミット**: `Add SSL support for Neon DB connection`

- クラウドPostgreSQL（Neon）での運用に対応するため、SSL接続オプションを追加
- ローカル開発とクラウド環境の両方で動作するよう設定

### Step 4: 管理画面の予約テーブルからステータス列を削除

**コミット**: `Remove status column from admin reservation table`

- 承認フローを廃止し予約は即confirmed になったため、管理画面のテーブル表示からステータス列を削除
- UIの簡素化

### Step 5: バリデーション強化とUI改善

**コミット**: `Prevent past date reservations, restrict phone to digits only, remove subtitle from home`

- 過去日付への予約を防止するバリデーションをバックエンドに追加
- 電話番号入力を数字のみに制限
- トップページのサブタイトルを削除してシンプルに

### Step 6: 設定ページと電話番号バリデーション追加

**コミット**: `Add settings page, phone validation, and UI improvements`

- 顧客向け設定ページを追加（プロフィール編集・パスワード変更）
- 電話番号のバリデーション強化
- UIの各種改善

### Step 7: メールアドレスを任意項目に変更、ログイン方式の変更

**コミット**: `Make email optional, switch customer login to phone number`

- 顧客のメールアドレスを必須から任意に変更
- 顧客ログインをメールアドレスから電話番号ベースに切り替え
- 飲食店予約のユースケースに合わせた判断

### Step 8: 管理者設定ページと顧客一覧

**コミット**: `Add settings pages for admin and customer, customer list for admin`

- 管理者向け設定ページを追加（アカウント情報変更）
- 管理画面に登録顧客の一覧表示を追加
- 顧客向け設定ページの改善

### Step 9: 予約完了画面と人数ラベルの修正

**コミット**: `Show completion screen after reservation, fix party size label`

- 予約完了後に完了画面を表示するように改善
- 人数の表示ラベルを修正

---

## UI/デザイン方針

### 全体
- 文字色は黒（`#111111`）に統一
- ダークモードは無効化（`globals.css` で設定）
- 絵文字は使用しない
- レスポンシブ対応（モバイルファースト）

### 顧客向け画面
- **アクセントカラー**: オレンジ系
- シンプルで直感的な操作を重視
- ステップバイステップのウィザード形式で迷わない予約フロー

### 管理者向け画面
- **アクセントカラー**: グレー系
- 情報密度を高めつつ見やすいレイアウト
- タイムライン表示で視覚的に予約状況を把握

---

## 環境構築手順

### 前提条件
- Node.js
- Docker / Docker Compose

### セットアップ

```bash
# 1. PostgreSQLコンテナを起動
docker compose up -d

# 2. バックエンドの準備
cd backend
npm install
npm run db:migrate   # テーブル作成
npm run db:seed      # テストデータ投入
npm run dev          # http://localhost:3001 で起動

# 3. フロントエンドの準備
cd frontend
npm install
npm run dev          # http://localhost:3000 で起動
```

### テストアカウント

| 役割 | ログイン情報 | パスワード |
|------|------------|-----------|
| 店員 | admin@example.com | password123 |
| 顧客（田中花子） | 電話番号で登録済み | password123 |
| 顧客（鈴木一郎） | 電話番号で登録済み | password123 |

### シードデータのテーブル構成

| テーブル名 | 席数 |
|-----------|------|
| カウンター1 | 2 |
| カウンター2 | 2 |
| テーブルA | 4 |
| テーブルB | 4 |
| テーブルC | 6 |
| 座敷 | 6 |
| 個室 | 6 |

---

## 今後の拡張候補

- LINE / SMS による予約リマインダー通知
- 営業時間・定休日の設定機能
- 予約の繰り返し設定（常連向け）
- 売上・来客数の統計ダッシュボード
- 複数店舗対応
