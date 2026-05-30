# CLAUDE.md - ReFlow 復旧・開発ガイド

このファイルは、ReFlow の現状を復元できるようにするための一次資料です。
コードやディレクトリが壊れた場合は、この内容を基準に再構築してください。

## プロダクト概要

ReFlow は、医療保険リハビリ業務向けの院内 LAN 想定アプリです。

現在の対象範囲:

- ログイン
- ダッシュボード
- 患者管理
- スケジュール管理
- 実施記録
- スタッフ管理
- 今日のリマインダー
- 書類管理（リハビリテーション実施計画書・総合実施計画書）

主な技術:

- Next.js 16.2.6 App Router
- React 19
- TypeScript strict
- Tailwind CSS v4
- shadcn/ui 由来のローカル UI コンポーネント
- Supabase local Docker
- Drizzle ORM
- PostgreSQL

重要: このプロジェクトの Next.js は 16 系です。Next.js の仕様確認が必要な場合は、必ず `node_modules/next/dist/docs/` を読むこと。

## 現在の主要画面

| パス                                    | 内容                                                |
| --------------------------------------- | --------------------------------------------------- |
| `/login`                                | スタッフID + パスワードでログイン                   |
| `/`                                     | ダッシュボード                                      |
| `/patients`                             | 患者一覧、検索、フィルタ、アーカイブ                |
| `/patients/new`                         | 患者登録 4 ステップウィザード                       |
| `/patients/[id]`                        | 患者詳細、患者編集                                  |
| `/schedule`                             | 週間スケジュール、予約作成/編集、実施記録パネル起動 |
| `/records`                              | 実施記録一覧                                        |
| `/settings/staffs`                      | スタッフ登録、編集、アーカイブ、パスワードリセット  |
| `/patients/[id]/documents`              | 患者の書類一覧                                      |
| `/patients/[id]/documents/new`          | 書類新規作成（書類種別選択）                        |
| `/patients/[id]/documents/[documentId]` | 書類閲覧・編集・印刷                                |

## 現在の UI 方針

`UI.png` を参照デザインとしている。

- iOS 17 風の Soft Glass
- 白/半透明カード
- 淡いラベンダーからブルーの背景
- アクセントは indigo `#6366f1`
- 黒ボタンは原則使わない
- ダッシュボードは左に KPI 2x2 + 今日のスケジュール、右に要確認アラート + 紫のリマインダーカード

ダッシュボードの現在仕様:

- 今日の予約カード
- 今週の単位数カード
  - 月曜から日曜で集計
  - `sessions.status = completed` の `units` 合計
  - 上限は `staffs.max_units_per_week`
  - 未取得時の fallback は 108 単位
  - UI.png 風の進捗バーあり
- 担当患者カード
  - 外来/入院を分割表示
- 要確認アラートカード
  - 初期加算、早期加算、算定日数終了間近
  - 3 件分の高さで固定
  - 4 件目以降はカード内スクロール
  - **配色はインジゴ統一**（赤/destructive は使わない）
  - アイコンは種類別：初期加算 = Sparkles、早期加算 = Bell、算定終了 = Clock
- 今日のリマインダー
  - 今日分を最大 3 件表示
  - 「カレンダー」ボタンから日時 + 内容を登録

## ディレクトリ構成

```text
reflow/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── patients/
│   │   │   ├── page.tsx
│   │   │   ├── patients-client.tsx
│   │   │   ├── new/page.tsx
│   │   │   ├── new/patient-wizard.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── patient-edit-modal.tsx
│   │   ├── schedule/
│   │   │   ├── page.tsx
│   │   │   └── schedule-client.tsx
│   │   ├── records/page.tsx
│   │   └── settings/staffs/page.tsx
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── bottom-nav.tsx
│   ├── sidebar.tsx
│   ├── change-password-modal.tsx
│   ├── features/
│   │   ├── dashboard/reminder-card.tsx
│   │   ├── schedule/
│   │   ├── session/
│   │   └── staff/
│   └── ui/
├── lib/
│   ├── actions/
│   │   ├── auth.ts
│   │   ├── dashboard.ts
│   │   ├── patient.ts
│   │   ├── reminder.ts
│   │   ├── schedule.ts
│   │   ├── session.ts
│   │   └── staff.ts
│   ├── constants/
│   ├── db/
│   │   ├── index.ts
│   │   └── schema/
│   ├── rehab/
│   ├── supabase/
│   ├── validators/patient.ts
│   ├── grid.ts
│   ├── recurrence.ts
│   ├── types.ts
│   └── utils.ts
├── supabase/
│   ├── config.toml
│   └── migrations/
├── AGENTS.md
├── CLAUDE.md
├── package.json
├── drizzle.config.ts
├── eslint.config.mjs
├── next.config.ts
├── proxy.ts
└── tsconfig.json
```

## DB 現状

DB は Supabase local Docker の PostgreSQL。

`.env.local` の接続先:

```text
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

Docker 側:

```text
DB container: supabase_db_reflow
DB volume:    supabase_db_reflow
Studio:       http://127.0.0.1:54323
API:          http://127.0.0.1:54321
Postgres:     127.0.0.1:54322
```

現在の `public` テーブルは 8 個。

| テーブル     | 用途                                         | 現状                 |
| ------------ | -------------------------------------------- | -------------------- |
| `tenants`    | 施設/テナント                                | 必須                 |
| `profiles`   | Supabase Auth ユーザーと tenant の紐付け     | 必須                 |
| `staffs`     | スタッフ、職種、権限、単位上限、ログイン判定 | 必須                 |
| `patients`   | 患者情報                                     | 必須                 |
| `schedules`  | 予約、繰り返し、キャンセル                   | 必須                 |
| `sessions`   | 実施記録、単位数集計、SOAP                   | 必須                 |
| `audit_logs` | 実施記録更新履歴                             | 必須。UI表示は未実装 |
| `reminders`  | 今日のリマインダー                           | 必須                 |

確認時点の件数:

```text
audit_logs: 1
patients: 17
profiles: 3
reminders: 2
schedules: 83
sessions: 20
staffs: 11
tenants: 2
```

DB schema のコード定義:

```text
lib/db/schema/
├── audit-logs.ts
├── index.ts
├── patients.ts
├── profiles.ts
├── reminders.ts
├── schedules.ts
├── sessions.ts
├── staffs.ts
└── tenants.ts
```

DB migration:

```text
supabase/migrations/
├── 0000_sad_magus.sql
├── 0001_add_patient_type.sql
├── 0002_add_occupation_therapists.sql
├── 0003_align_current_schema.sql
└── 0004_add_reminders.sql
```

`reminders` テーブルがないとリマインダー登録できない。ローカルでは `0004_add_reminders.sql` 適用済み。

## 復旧手順

1. 依存関係を入れる。

```bash
npm install
```

2. Supabase local を起動する。

```bash
npx supabase start
```

3. `.env.local` を用意する。

```text
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase local anon key>
SUPABASE_SERVICE_ROLE_KEY=<supabase local service role key>
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

4. migration を適用する。

通常は Supabase CLI の DB reset / migration apply を使う。
ローカルで `reminders` だけ手動適用する場合は、`supabase/migrations/0004_add_reminders.sql` を Postgres に流す。

5. 開発サーバを起動する。

```bash
npm run dev
```

6. 確認する。

```bash
npm run lint
npx tsc --noEmit
npm run build
```

注意: `npm run build` は `next/font/google` が Google Fonts を取得するため、ネットワーク制限下では失敗する。ネットワーク許可ありなら成功確認済み。

## 実装済みの重要ロジック

### 認証

- Supabase Auth
- スタッフIDは `staffs.staff_code`
- 仮想メールは `<staff_code>@reflow.local`
- `profiles` で Auth user と tenant を紐付ける
- `requireCurrentTenant` / `requireTenantAccess` が tenant 境界

### 患者

- 登録は 4 ステップウィザード
- 患者フォーム schema は `lib/validators/patient.ts`
- PT / OT / ST のいずれか 1 人以上が必須
- アーカイブは `deleted_at`
- 加算判定は `lib/rehab/additions.ts`

### スケジュール

- 予約は `schedules`
- 実施記録は `sessions`
- `is_cancelled` で予約キャンセル
- ドラッグ/移動時にスタッフ、患者、単位上限をチェック
- ドラッグ移動時に `hasConflictOnDate`（`lib/recurrence.ts`）で時間帯重複も検出。重複あれば `"同じ時間帯に既存の予約があります"` エラーを表示して移動を拒否
- 単位上限は `staffs.max_units_per_day` / `staffs.max_units_per_week`
- `hasConflictOnDate` は `recurrence_rule === "CUSTOM"` の予約を単発扱い（同日のみ比較）で正しく判定する

**予約枠のインタラクション（`EventBlock.tsx`）:**

| 操作               | 動作                                                                         |
| ------------------ | ---------------------------------------------------------------------------- |
| シングルクリック   | 何もしない（ドラッグ起点のみ）                                               |
| **ダブルクリック** | 実施記録パネルを開く（`onRecordOpen`）                                       |
| **右クリック**     | コンテキストメニュー（予約を編集 / 記録を入力 / 複数日コピー / 中止 / 削除） |
| ホバー             | シャドウ + brightness でふわっと浮き上がる。ツールチップに操作ヒント表示     |

- コンテキストメニュー各項目にアイコン付き（lucide-react）
- 削除の前にはセパレーター（`separator: true`）

### 実施記録

- status は `scheduled` / `draft` / `completed`
- completed は単位数と SOAP 本文が必要
- completed 更新時は `audit_logs` に before/after を保存
- 実施記録一覧は `/records`
- **単位数 ±1 ボタンで終了時刻を自動更新**：`end_at = start_at + units × 20分`（`session-panel.tsx` の `recalcEndTime`）
- **`upsertSession` 保存時に `schedules.end_at` と `schedules.units` も同期更新**（カレンダーの枠サイズに即反映）

### リマインダー

- Server Action: `lib/actions/reminder.ts`
- UI: `components/features/dashboard/reminder-card.tsx`
- 保存先: `reminders`
- tenant + staff に紐付く
- 現在は「今日のリマインダー」表示と登録のみ
- 完了、削除、日付別一覧は未実装

### 書類管理（2026-05-31 実装）

リハビリテーション実施計画書（別紙様式21・総合実施計画書）の入力・閲覧・印刷。

**設計方針：データ保存 ＋ ブラウザ印刷**

- PDFファイル生成は行わない。データは `rehab_documents` テーブルに JSONB 保存
- 印刷は `@media print` + `window.print()` でブラウザのPDF保存機能を利用
- 様式は「様式21またはこれに準じた様式」として独自レイアウト（必須項目を満たせば合法）

**ファイル構成：**

- スキーマ: `lib/db/schema/rehab-documents.ts`
- バリデーター: `lib/validators/rehab-document.ts`
- Server Actions: `lib/actions/rehab-document.ts`
- フォームコンポーネント: `components/features/documents/b21-plan-form.tsx`
- ページ: `app/(dashboard)/patients/[id]/documents/`

**フォーム構成（2ページ印刷）：**

1枚目（実施計画書）:

- 患者基本情報（自動表示）
- 治療内容・注意事項
- 心身機能・構造（B21別紙様式21準拠チェックボックス。左：疾患リスク、右：神経・筋・高次脳）
- 基本動作（7項目×4段階ラジオボタン）
- ADL評価・FIM（18項目1-7入力、運動小計/認知小計/合計自動計算）
- 目標・治療方針
- 実施内容（PT/OT/ST別）

2枚目（総合実施計画書 / H003-2算定時）:

- リハビリ実施歴・現況
- 参加・活動目標
- 環境・家族情報
- 嚥下機能
- 指導・連携・退院
- 運動量増加機器加算（□算定する・適応疾患・□上肢□下肢・所見・機器計画）
- 評価日
- 作成医療機関及び担当者（医療機関名・リハビリ科医・主治医・PT/OT/ST/Ns/SW/RD・説明日・説明者・同意）

**印刷2ページ化のための主要CSS設計：**

- `@layer utilities { @media print { textarea { height: 1.1em !important; } } }`
- `p { min-height: 0 !important; }` でReadValueの最小高さを消去
- チェックボックス/ラジオボタン: `appearance: none` でカスタム白抜き表示
- 全セクション `print:space-y-0` / `print:gap-1` で印刷時スペース詰め

**DB マイグレーション：**

- `supabase/migrations/0005_add_rehab_documents.sql` - `rehab_documents` テーブル

## コーディング規約

- `any` は使わない。必要なら `unknown` + Zod で絞る
- `console.log` 禁止。許可は `console.error` / `console.warn`
- DB クエリは原則 `tenant_id` を含める
- 本番想定データは物理削除しない。`deleted_at` を使う
- service role key は server only
- ボタンは黒ではなく indigo 系を基本にする
- Next.js 16 の挙動は `node_modules/next/dist/docs/` で確認する
- React Compiler / TanStack Table の警告は、対象ファイル限定の ESLint override を使っている

## 現在の検証状態

直近で確認済み:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

`npm run build` は sandbox 内では Google Fonts 取得失敗になるが、ネットワーク許可ありで成功確認済み。

## 文書管理・評価チャート設計（2026-05-29 追加）

次フェーズとして、計画書・指導記録・評価チャートを扱う文書管理機能を追加する。

### 対象書類（医療保険）

- リハビリテーション総合実施計画書（様式23 / 様式21の6）。入院は月1回更新でリハビリテーション総合計画評価料に直結。多職種共同で作成し患者・家族に説明同意。
- リハビリテーション実施計画書（疾患別リハ開始時。総合実施計画書があれば作成不要）
- 目標設定等支援・管理シート（要介護被保険者の維持期リハを介護保険へ移行する際に作成）
- 退院時リハビリテーション指導記録（入院のみ。退院日1回。2026年6月改定で入院中に疾患別リハ料を算定した患者に限定）

### 対象書類（介護保険）

- 介護保険用リハビリテーション計画書（医療の様式23とは別物。初回は提供開始からおおむね2週間以内、その後おおむね3か月ごとに評価・見直し。2年間保存義務）

設計方針: 書類は患者に紐づけDB保存。構造化フォーム。介護保険用は患者フラグで出し分け、可能な限り共通テーブルにまとめる。原則手動作成で一覧の日付管理。

### 評価チャート（職種別）

共通:

- FIM（18項目・126点）
- Barthel Index
- HDS-R（長谷川式簡易知能評価スケール。9項目・30点。ST/OT共通の認知症スクリーニング）

PT:

- ROM（関節可動域。2022年改訂版が標準、学会連合版ROM指針2025あり）
- MMT（徒手筋力検査。学会連合版MMT 2024あり）
- BRS（Brunnstrom Stage。上肢・手指・下肢を個別判定）
- FMA（Fugl-Meyer Assessment）
- バランス（BBS / TUG）
- 歩行（10m歩行・6分間歩行）

OT:

- COPM（カナダ作業遂行測定。遂行度・満足度を10点で評価）
- STEF（簡易上肢機能検査）
- Box and Block Test
- 高次脳機能（MMSE / RBMT / BIT / BADS / TMT）

ST:

- 嚥下スクリーニング（RSST / MWST / フードテスト）
- FILS（食物摂取レベルスケール。10段階）
- VF / VE（嚥下精査。医師協業）
- 失語症（SLTA / WAB）
- 構音・発声評価

### 実装フェーズ案

優先度の高い順:

1. 総合実施計画書（算定直結・入院外来共通）
2. 共通評価（FIM / Barthel / HDS-R）
3. PT 基本評価（ROM / MMT）
4. ST 嚥下スクリーニング（RSST / MWST / FILS）
5. 残りの職種別評価チャートと書類を順次追加

DB 設計の方向性: 書類系は `rehab_documents`（document_type で出し分け）、評価系は `assessments`（assessment_type + JSONB で項目格納）に分けて検討する。いずれも `tenant_id` + `patient_id` + 作成 `staff_id` を必須とし、`deleted_at` で論理削除。

## 書類管理・帳票設計（2026-05-30 更新）

### 方針：データ保存 ＋ ブラウザ印刷

PDFファイルの生成・管理は行わない。データはDBに保存し、表示・印刷はブラウザの`@media print`で完結させる。WYSIWYGの座標合わせ方式は実用上ずれが出るため採用しない。

```css
@media print {
  @page {
    size: A4 portrait;
    margin: 10mm 12mm;
  }
  nav,
  .sidebar,
  .no-print {
    display: none;
  }
  .page-break {
    break-before: page;
  }
  body {
    font-size: 9pt;
    line-height: 1.4;
  }
}
```

印刷時は「ブラウザの印刷 → PDFに保存」で自然にPDF化もできる。

### 対象書類と「準じた様式」の法的根拠

「様式21またはこれに準じた様式」と規定されており、必須項目が揃っていれば独自レイアウトは合法。施設ごとのフラグで表示項目を切り替える設計にすること。

**全施設共通の必須項目：**

- 患者基本情報（氏名・性別・年齢・算定病名・発症日・手術日・リハ開始日）
- 治療内容・併存疾患・安静度・禁忌事項
- 心身機能・構造（該当項目のみ記載でOK。全列挙不要）
- 基本動作
- ADL評価：**FIMまたはBIのいずれか**（どちらか1つでOK。FIMのみで完全合法）
- 目標（1か月以内）・治療方針・実施内容（PT/OT/ST別）
- 担当者・説明日・説明者

**施設種別による条件付き必須：**

- 栄養欄：回復期リハ病棟入院料1を算定する場合のみ必須
- 口腔欄：回復期リハ病棟入院料1・2を算定する場合のみ必須
- 2枚目（参加・活動目標等）：総合実施計画書（H003-2算定）として使う場合のみ必要

**省略可能なもの：**

- BI（FIMを使えば不要）
- 心身機能の未該当チェック項目の全列挙
- 栄養・口腔欄（回復期病棟以外）

### 様式21の構成（A4 2枚）

**1枚目（実施計画書）：** 患者基本情報・心身機能・基本動作・FIM表・栄養口腔・目標・治療方針・担当者・説明欄

**2枚目（総合実施計画書）：** リハビリ実施歴・参加目標・活動目標・住環境・指導内容・介護保険連携・退院後生活・自由記載。H003-2を算定する場合のみ作成。

DB設計：書類は `rehab_documents`（document_type で種別管理）、施設フラグは `tenants` または `form_settings` テーブルで保持。

### 帳票点数算定（令和8年改定対応）

詳細は子ページ「令和8年改定 疾患別リハビリ 点数リファレンス（帳票検証用）」（Page ID: `37025cd7-db8f-8121-bc70-e533710391ac`）を参照。コード内の点数は必ずこのリファレンスと照合すること。

**主要変更点（帳票ロジックに影響するもの）：**

- 本体点数（H000〜H003）は5疾患すべて据え置き
- 早期リハ加算：一律25点 → 入院日から3日以内60点/4日目以降25点。期間30日→14日。起算日が発症等→入院日へ
- 休日リハ加算（新設）：土日祝かつ発症等から30日以内に1単位25点
- 離床なし減算・ベッド上のみ2単位制限（新設）：帳票に離床フラグ必要
- リハ総合計画評価料（H003-2）：初回/2回目以降の段階制（料1: 300/240、料2: 240/196）
- H003-4（目標設定等支援・管理料）廃止。関連する90%減算規定も削除
- 移行措置：R8.5.31以前の算定実績は起算日をリセットしない

`sessions` に持たせるフィールド：疾患区分・施設基準区分・実施職種・起算日・入院日・離床有無・ベッド上フラグ・当日累計単位数。加算判定ロジックは `lib/rehab/additions.ts` を拡張する。

### Notion 同期ルール（常設）

ローカルとNotionページを双方向で同期するが、方向によってトリガーを変える。

- **ローカルを変更したとき** → 自動でNotionへpush（事後報告のみ）
- **Notionを変更したとき** → ユーザー依頼により手動でローカルへpull

**同期対象とID：**

| ローカルファイル                     | Notion Page ID                         |
| ------------------------------------ | -------------------------------------- |
| `CLAUDE.md`                          | `36f25cd7-db8f-8143-90e1-dd388363b17a` |
| `docs/reiwa8-rehab-fee-reference.md` | `37025cd7-db8f-8121-bc70-e533710391ac` |

子ページ（リファレンス）の親は常にCLAUDE.mdページ。親子関係は変更しない。

**ローカル → Notion（自動push）：**

1. ローカルファイルの変更を検出（編集直後またはコミット直後）
2. `notion-update-page`（`update_content`）でNotionを上書き
3. `notion-fetch`で再取得し一致を検証
4. 変更内容を事後報告

承認不要。ただし点数・加算減算・起算日・移行措置に関わる変更が5件以上ある場合はpush前に一括要約を出す。

**Notion → ローカル（手動pull）：**

1. `notion-fetch`で対象ページを取得
2. ローカルとの差分を要約して提示
3. ユーザー承認後にローカルを上書き
4. 一致確認して報告

競合（両方変更されていた場合）は差分を並べてユーザーに判断を仰ぐ。勝手にどちらにも倒さない。

**禁止事項：** ページの削除・移動・タイトル変更・親子関係変更は禁止。点数の数値・起算日・移行措置の差分は1文字も見逃さず同期する。

Notion MCPは保存時に空白・改行を正規化するため、差分判定では意味のある変更（点数・語句・表のセル内容）のみを差分と見なし、フォーマットのぶれは無視する。

## 今後やること

優先度高:

1. リマインダーの完了/削除/編集を追加する
2. リマインダーを今日だけでなく日付別に見られるようにする
3. `audit_logs` の UI 表示を追加する
4. DB migration の適用手順を `README.md` にも反映する
5. 重要 action のテストを追加する

優先度中:

1. Google Fonts 依存を減らすか、ローカルフォント化して build を安定させる
2. `profiles` と `staffs` の責務を README に明記する
3. スタッフ、患者、スケジュールの検索/フィルタ UX を揃える
4. モバイル時のダッシュボードカード間隔をさらに調整する
5. `audit_logs` の差分形式を見やすく整える

保留:

1. 本番 RLS 設計
2. 本番バックアップ/復元手順
3. 外部公開 API
4. 複数施設運用の管理画面

## クリーンアップ判断

現時点で DB テーブルは削らない。
8 テーブルすべてコード参照または将来性ではなく現在機能に関係している。

削除候補ではないが注意:

- `audit_logs`: UI は未実装だが実施記録更新時に書き込むため必要
- `profiles`: `staffs` と似ているが Auth user と tenant の紐付けに必要
- `reminders`: 新規機能の保存先として必要

一時ファイルは原則置かない。スクリーンショット検証用スクリプトや試作 HTML は作業後に削除する。

## Notion / MCP

Notion MCP は接続済み・動作確認済み（2026-05-28）。
ワークスペースに「ReFlow UIレビュー — 2026-05-28」ページが存在することを確認。
外部保存が必要な場合は Notion MCP ツール（`notion-create-pages` 等）を使用できる。
