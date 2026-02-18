# DDD（ドメイン駆動設計）ガイド - 予約アプリ版

## DDDってなに？

一言でいうと、**「ビジネスのルールや概念を中心にコードを組み立てよう」** という設計思想。

今のアプリは「APIルート → DBクエリ」が直結してる構造で、いわゆる **トランザクションスクリプト** パターン。これはこれでシンプルで悪くないんだけど、ビジネスロジックがルートハンドラの中に散らばりがちになる。

DDDは「予約ってこういうルールがあるよね」「テーブルってこういう性質だよね」っていうビジネスの知識を、専用のオブジェクトとしてコードに表現する考え方。

---

## DDDの主要な概念を予約アプリで説明

### 1. エンティティ（Entity）

**「IDで識別されるもの」**。同じ内容でもIDが違えば別物。

この予約アプリだと：

- **Reservation**（予約） → `id: 1` の予約と `id: 2` の予約は、たとえ同じ日時・同じ人数でも別の予約
- **Table**（テーブル） → テーブルAとテーブルBは別物
- **Profile（Customer / Staff）** → ユーザーそれぞれが別人

エンティティは「状態が変わりうるもの」でもある。予約のステータスが `confirmed` から `cancelled` に変わっても、同じ予約。

---

### 2. 値オブジェクト（Value Object）

**「値そのものが意味を持つもの」**。IDは持たない。同じ値なら同じもの。

この予約アプリだと：

- **TimeSlot**（時間枠） → `{ start: "18:00", end: "20:00" }` は、どこで作っても同じ時間帯なら同じ
- **PartySize**（人数） → ただの数字だけど「1以上かつテーブル定員以下」というルールがある
- **ReservationDate**（予約日） → 「過去の日付はダメ」というルールを持てる
- **PhoneNumber**（電話番号） → 「数字のみ」というバリデーションを持てる

**ポイント**: 値オブジェクトの中にバリデーションを閉じ込める。今は `routes/reservations.ts` の中でバラバラにチェックしてるルールを、値オブジェクトの生成時に自動で検証するようにする。

例えば今こんな感じでルートの中にバリデーションが散らばってるのが：

```ts
// 今のコード（ルートハンドラの中）
if (!date || !start_time) return res.status(400).json({ error: '...' });
```

こうなる：

```ts
// DDD後（値オブジェクトがルールを持つ）
class ReservationDate {
  readonly value: string;

  constructor(date: string) {
    if (!date) throw new Error('日付は必須です');
    if (this.isPast(date)) throw new Error('過去の日付は予約できません');
    this.value = date;
  }

  private isPast(date: string): boolean {
    return new Date(date) < new Date(new Date().toDateString());
  }
}
```

---

### 3. 集約（Aggregate）

**「まとめて整合性を守るべきエンティティの塊」**。外からは集約ルート（ルートエンティティ）経由でしかアクセスしない。

```
予約集約（Reservation Aggregate）
  Reservation（集約ルート = 入口）
    TimeSlot（値オブジェクト）
    PartySize（値オブジェクト）
    ReservationDate（値オブジェクト）
```

例えば「予約の start_time を変更したら end_time も自動で変わる」というルールは、Reservation エンティティの中に閉じ込める。今は `calculateEndTime` がユーティリティ関数として外にあるけど、DDDだと Reservation 自体が知ってるべき知識になる。

集約の外から「end_time だけ直接書き換える」みたいなことはさせない。必ず Reservation を通して変更する。こうすることで整合性が壊れない。

---

### 4. リポジトリ（Repository）

**「集約の保存・取得を担当する層」**。DBの詳細を隠蔽する。

今のコードはルートハンドラの中で直接 Supabase を叩いてる：

```ts
// 今のコード
const { data, error } = await supabaseAdmin
  .from('reservations')
  .select('*, table:tables(*), customer:profiles(*)')
  .eq('id', id);
```

DDDだとこうなる：

```ts
// DDD後
const reservation = await reservationRepository.findById(id);
// → Reservationエンティティが返ってくる（Supabaseのことは知らない）
```

ルートハンドラは「データがSupabaseにあるのかMySQLにあるのか」を気にしなくてよくなる。リポジトリの中だけがSupabaseの使い方を知ってる。

---

### 5. ドメインサービス（Domain Service）

**「1つのエンティティに属さないビジネスロジック」** を置く場所。

この予約アプリだと：

- **空き状況チェック** → 「その日時にそのテーブルは空いてる？」は、Reservation と Table の両方にまたがるロジック。どちらか一方のエンティティに入れるのは不自然なので、ドメインサービスに置く。

```ts
// domain/services/ReservationAvailabilityService.ts
class ReservationAvailabilityService {
  async isAvailable(
    tableId: number,
    date: ReservationDate,
    timeSlot: TimeSlot
  ): Promise<boolean> {
    // 既存の予約と時間が重なってないかチェック
  }
}
```

---

### 6. アプリケーションサービス（Application Service / Use Case）

**「ユースケースの手順を組み立てる層」**。ドメインオブジェクトを使って処理のフローを記述する。ビジネスルール自体は持たない。「何をどの順番でやるか」だけを知ってる。

例：予約作成のユースケース

```ts
// application/usecases/CreateReservation.ts
class CreateReservationUseCase {
  async execute(input: CreateReservationInput) {
    // 1. 値オブジェクトを作る（ここでバリデーションが走る）
    const date = new ReservationDate(input.date);
    const timeSlot = new TimeSlot(input.startTime);
    const partySize = new PartySize(input.partySize);

    // 2. 空き状況を確認する（ドメインサービス）
    const isAvailable = await this.availabilityService.isAvailable(
      input.tableId, date, timeSlot
    );
    if (!isAvailable) throw new Error('その時間は予約済みです');

    // 3. 予約エンティティを作る
    const reservation = Reservation.create(date, timeSlot, partySize, input.tableId);

    // 4. リポジトリで保存する
    await this.reservationRepository.save(reservation);

    return reservation;
  }
}
```

今はこの 1〜4 が全部 `routes/reservations.ts` の `router.post('/guest', ...)` の中に混ざってる。

---

## レイヤー構成のビフォー・アフター

### 今の構成（フラット）

```
routes/reservations.ts  →  Supabase直叩き
  バリデーション        ← 全部ここに
  ビジネスロジック      ← 全部ここに
  DBクエリ             ← 全部ここに
  レスポンス整形        ← 全部ここに
```

### DDD適用後（レイヤード）

```
routes/              → HTTPリクエストの受け取りとレスポンス返却だけ
  ↓ 呼び出す
application/         → ユースケース（手順の組み立て）
  ↓ 使う
domain/              → ビジネスルール（エンティティ、値オブジェクト、ドメインサービス）
  ↓ 抽象化
infrastructure/      → DB操作（リポジトリの実装、Supabaseクエリ）
```

**下の層は上の層を知らない** というのが大事なルール。domain層はinfrastructure層を知らない。リポジトリはdomain層でインターフェース（型）だけ定義して、実際のSupabaseを使った実装はinfrastructure層に置く。

---

## 具体的にどう変わるかの例

今の `calculateEndTime`：

```ts
// utils/timeUtils.ts にポツンとある関数
export function calculateEndTime(startTime: string): string {
  // start_time + 2時間を計算
}
```

DDD後：

```ts
// domain/value-objects/TimeSlot.ts
class TimeSlot {
  readonly start: string;
  readonly end: string;

  constructor(startTime: string) {
    if (!this.isWithinBusinessHours(startTime)) {
      throw new Error('営業時間外です');
    }
    this.start = startTime;
    this.end = this.calculateEnd(startTime); // end_timeの計算はTimeSlotが知ってる
  }

  private calculateEnd(startTime: string): string {
    // start + 2時間
  }

  private isWithinBusinessHours(time: string): boolean {
    // 17:30〜22:00 の範囲内か
  }
}
```

ロジックが「あるべき場所」に住むようになる。TimeSlot を作った時点で、必ず営業時間内であることが保証されるし、end_time も必ずセットになってる。

---

## まとめ

| 概念 | 役割 | この予約アプリでの例 |
|------|------|---------------------|
| エンティティ | IDで区別されるもの | Reservation, Table, Profile |
| 値オブジェクト | 値とルールのセット | TimeSlot, PartySize, ReservationDate |
| 集約 | 整合性を守る単位 | Reservation集約（予約+時間枠+人数+日付） |
| リポジトリ | 保存と取得の抽象化 | ReservationRepository, TableRepository |
| ドメインサービス | 複数集約にまたがるロジック | 空席チェック（AvailabilityService） |
| アプリケーションサービス | ユースケースの手順 | 予約作成、予約キャンセル、予約編集 |
