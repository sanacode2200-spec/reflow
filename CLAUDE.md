# CLAUDE.md — ReFlow 開発ガイド

> **プロダクト**: ReFlow（医療保険リハビリ管理SaaS）  
> **スタック**: Next.js 15 App Router + TypeScript strict + Tailwind CSS v4 + shadcn/ui + Supabase（ローカルDocker）+ Drizzle ORM  
> **Phase1**: 患者管理・スケジュール・実施記録のみ。localhost院内LAN運用。

---

## 🚨 作業前の儀式（必ず最初に実行）

ユーザーから修正・変更の指示を受けたら、**コードを書く前に**以下を実行する：

```bash
# 1. 直近の変更履歴を確認
git log --oneline -20

# 2. 最新の差分を確認
git diff HEAD~1

# 3. 対象ファイルの現状を確認
cat <対象ファイルのパス>
```

**4. 原因を特定してから修正方針を報告する。推測で修正しない。**  
**5. 「どこを・なぜ・どう変えるか」を伝えてから実装する。**

> ユーザーが「現場検証」と言ったら、上記を必ず実行すること。

---

## ⛔ 絶対ルール（違反したら事故）

| ルール | 理由 |
|--------|------|
| `any` 型禁止。`unknown` + Zod で絞る | 型安全の崩壊 |
| `console.log` 禁止（`console.error` / `console.warn` のみ） | 個人情報ログ漏洩 |
| `tenant_id` を含まないクエリを書かない | マルチテナント漏洩 |
| `max_units_per_day` / `max_units_per_week` をハードコードしない | 必ず `staffs` テーブルから取得 |
| 計画書・実施記録は論理削除のみ（本番環境） | 診療録保存義務5年 |
| 本番DBを直接編集・削除しない | すべてマイグレーション経由 |
| `service_role` キーをクライアントに露出させない | `.env.local` のみ。`NEXT_PUBLIC_` 禁止 |
| 不明点は推測しない | 選択肢を提示してユーザーに確認する |

---

## 🏗 実装順序

```
Step 1: 環境構築・認証・DBスキーマ
Step 2: 患者管理CRUD（/patients）
Step 3: スケジュール（FullCalendar）
Step 4: 実施記録（3ステータス + SessionPanel）
Step 5: スタッフ管理（/settings/staffs）
```

### 各 Step の開始プロンプト例

**Step 1（環境構築）：**
```
CLAUDE.md と .claude/rules/ を読んで環境構築してください。
- Next.js 15 App Router + TypeScript strict + Tailwind CSS v4 + shadcn/ui
- Supabase ローカル（Docker）+ Drizzle ORM
- 認証：Supabase Auth（メール+パスワード）
- ESLint（no-console設定込み）+ Prettier + Husky
- db-conventions.md のスキーマ規約に従い全テーブルを作成
```

**Step 2（患者管理）：**
```
CLAUDE.md と .claude/rules/ を読んで患者管理を実装してください。
- /patients 一覧（TanStack Table・検索・ステータスフィルタ）
- /patients/new 4ステップウィザード登録フォーム
- /patients/[id] 詳細ページ
- 起算日入力時に早期加算・初期加算の対象判定アラート
- アーカイブ/復帰機能（論理削除）
```

**Step 3（スケジュール）：**
```
CLAUDE.md と .claude/rules/ を読んでスケジュールを実装してください。
- FullCalendar 無料版（Interactionプラグイン）タイムグリッドビュー（週次/日次）
- 療法士軸 × 時間軸のカラム表示
- ドラッグ&ドロップ予約作成・移動
- 重複チェック（時間の重複のみ）・単位上限チェック（staffsテーブルから取得）
- 繰り返し予約（同一曜日×指定週数）
- 予約枠クリック → 右パネルスライドイン（framer-motion AnimatePresence）
```

**Step 4（実施記録）：**
```
CLAUDE.md と .claude/rules/ を読んで実施記録を実装してください。
- 3ステータス（scheduled / draft / completed）
- completedの条件：単位数 + 記録本文が必須入力済み
- 離床の有無トグル（is_ambulatory: boolean DEFAULT true）
- 実施済み後の修正は audit_logs に JSONB で diff 保存
- /records 一覧（行クリックで SessionPanel を開く）
```

**Step 5（スタッフ管理）：**
```
CLAUDE.md と .claude/rules/ を読んでスタッフ管理を実装してください。
- /settings/staffs でスタッフ登録・編集・アーカイブ/復帰
- TanStack Table + モーダル登録フォーム
- 職種（pt/ot/st）・権限（admin/therapist）・単位上限をDBで管理
```

---

## 📁 ディレクトリ構成

```
reflow/
├── app/
│   ├── (auth)/login/page.tsx
│   └── (dashboard)/
│       ├── layout.tsx              # サイドバー+ヘッダー（レスポンシブ）
│       ├── page.tsx                # ダッシュボード
│       ├── patients/
│       │   ├── page.tsx            # 一覧
│       │   ├── new/page.tsx        # 4ステップ登録ウィザード
│       │   └── [id]/page.tsx       # 詳細
│       ├── schedule/page.tsx       # FullCalendar
│       ├── records/page.tsx        # 実施記録一覧
│       └── settings/staffs/page.tsx
├── components/
│   ├── ui/                         # shadcn/ui
│   └── features/
│       ├── schedule/               # カレンダー + 右パネル
│       ├── patient-form/           # 登録ウィザード
│       ├── session-panel/          # 実施記録入力パネル
│       └── staff/                  # スタッフ管理
├── lib/
│   ├── supabase/                   # client.ts / server.ts
│   ├── db/
│   │   ├── schema/                 # Drizzle スキーマ（テーブルごとに分割）
│   │   └── migrations/
│   ├── actions/                    # Server Actions
│   ├── validators/                 # Zod schemas（フロント・サーバ共通）
│   └── rehab/
│       ├── calculator.ts           # 単位数・上限チェック（ユニットテスト必須）
│       └── additions.ts            # 早期加算・初期加算判定
├── supabase/
│   ├── migrations/
│   └── config.toml
├── .claude/
│   └── rules/
│       ├── db-conventions.md       # Drizzle スキーマ規約・テーブル定義
│       ├── rehab-domain.md         # 医療保険リハビリ業務ドメイン知識
│       └── ui-conventions.md       # デザイントークン・UIルール
├── CLAUDE.md
└── tsconfig.json
```

---

## ⚙️ コーディング規約

- TypeScript strict mode・`noUncheckedIndexedAccess: true`
- 関数はアロー関数、コンポーネントは function 宣言
- ファイル名 kebab-case・コンポーネント PascalCase・変数 camelCase
- Conventional Commits（日本語可）。例：`feat: 患者登録フォームを追加`
- `main` への直接 push 禁止

### Server Actions vs Route Handlers

| 用途 | 方法 |
|------|------|
| データ取得 | RSC から直接 Drizzle 呼び出し |
| 作成・更新・削除 | Server Actions（CSRF自動防御） |
| Webhook・外部公開API | Route Handlers |

### 削除ポリシー

| 環境 | 方法 |
|------|------|
| 本番 | 論理削除のみ（`deleted_at` をセット） |
| ローカル開発 | 物理削除OK（テストデータのみ） |

---

## 📖 詳細仕様（参照先）

| 内容 | ファイル |
|------|----------|
| DBスキーマ・Drizzle規約・RLS | `.claude/rules/db-conventions.md` |
| リハビリ業務ドメイン知識・算定ルール | `.claude/rules/rehab-domain.md` |
| UIデザイン・カラー・レスポンシブ | `.claude/rules/ui-conventions.md` |
