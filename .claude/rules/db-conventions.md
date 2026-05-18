# DB規約（Drizzle ORM + Supabase）

## 全テーブル必須カラム

```typescript
id:         uuid("id").primaryKey().defaultRandom()
tenant_id:  uuid("tenant_id").notNull().references(() => tenants.id)
created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
updated_at: timestamp("updated_at", { withTimezone: true })
deleted_at: timestamp("deleted_at", { withTimezone: true })  // 論理削除
```

## テーブル定義

### `tenants`
マルチテナントのルート。全テーブルが `tenant_id` で紐づく。

### `profiles`
Supabase Auth のログインユーザー管理専用。`therapist_id` の参照先ではない。  
`audit_logs.changed_by` のみ `profiles.id` を参照する（誰が変更したか = 認証ユーザー）。

### `staffs`
療法士・スタッフの業務管理テーブル。`profiles` とは別。

```typescript
name:               text("name").notNull()                    // 氏名（full_name ではなく name）
name_kana:          text("name_kana").notNull()               // カナ
role:               userRoleEnum("role").notNull().default("therapist")       // 'admin' | 'therapist'
occupation:         occupationEnum("occupation").notNull().default("pt")      // 'pt' | 'ot' | 'st'
email:              text("email")                             // nullable（将来ログイン用）
max_units_per_day:  integer("max_units_per_day").notNull().default(18)
max_units_per_week: integer("max_units_per_week").notNull().default(108)
```

- `schedules.therapist_id` / `sessions.therapist_id` / `patients.therapist_id` → `staffs.id` を参照
- 療法士の表示名は `staffs.name`（`profiles.full_name` ではない）
- 療法士一覧は `getTherapists()` で `staffs` テーブルから取得

### `patients`

```typescript
therapist_id: uuid("therapist_id").references(() => staffs.id)  // staffs.id を参照
```

### `schedules`

```typescript
therapist_id: uuid("therapist_id").references(() => staffs.id)
```

### `sessions`

```typescript
therapist_id:  uuid("therapist_id").references(() => staffs.id)
status:        sessionStatusEnum("status").notNull().default("scheduled")
               // enum: 'scheduled' | 'draft' | 'completed'
max_units:     integer("max_units").notNull().default(6)
               // ハードコード禁止。patients テーブル or staffs テーブルから取得する
is_ambulatory: boolean("is_ambulatory").notNull().default(true)
               // 離床の有無。false = 減算対象フラグ
```

### `audit_logs`

```typescript
session_id:  uuid("session_id").references(() => sessions.id)
changed_by:  uuid("changed_by").references(() => profiles.id)  // 認証ユーザー（staffs.id ではない）
before_data: jsonb("before_data")   // 変更前
after_data:  jsonb("after_data")    // 変更後
changed_at:  timestamp("changed_at", { withTimezone: true }).defaultNow()
```

---

## クエリ規約

- **`tenant_id` を含まないクエリを書かない**（RLS + アプリ層の Defense in Depth）
- `max_units_per_day` / `max_units_per_week` は必ず `staffs` テーブルのカラムから取得。ハードコード禁止。
- `deleted_at IS NULL` を必ず付与して論理削除済みを除外する
- 療法士名表示は `staffs.name` を使う

## マイグレーション

- スキーマ変更はすべて `drizzle-kit generate` → `supabase db push`（またはマイグレーションファイル経由）
- 本番DBを直接 ALTER / DROP しない

## RLS（Row Level Security）

- 全テーブルに RLS を有効化
- `tenant_id = auth.jwt() -> tenant_id` ポリシーを基本とする
- `service_role` キーはサーバーサイド（`.env.local`）のみ。`NEXT_PUBLIC_` プレフィックス禁止
