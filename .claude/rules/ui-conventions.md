# UIデザイン規約

## コンセプト

「クリーンブルー × モダンSaaS」。Notion / Linear / Vercel のような「プロフェッショナルで迷わないUI」。

## レスポンシブ設計

| 画面幅                   | ナビ                      | レイアウト        |
| ------------------------ | ------------------------- | ----------------- |
| 〜767px（スマホ）        | ボトムナビ + FABボタン    | 1カラム・カード型 |
| 768px〜（PC/タブレット） | 左サイドバー（220px固定） | 2カラムグリッド   |

- スマホ時はサイドバーを非表示、ボトムナビを表示
- スケジュール画面（CalendarView）は `hidden md:block`（PC専用）。スマホはカードリスト。

## カラーパレット（Tailwind設定）

```js
// Vercel Geist ベース
colors: {
  primary: {
    50:  '#f0f7ff',  // 薄い青背景・バッジ
    500: '#0070f3',  // Vercelブルー・リンク・アクセント
    600: '#0060d1',  // ホバー
  },
  neutral: {
    50:  '#fafafa',  // ページ背景
    100: '#f5f5f5',  // タグ・バッジ下地
    200: '#eaeaea',  // ボーダー（極薄）
    500: '#888888',  // 補助テキスト・ラベル
    900: '#111111',  // 本文・見出し
  },
  orange: { 100: '#ffedd5', 500: '#f97316', 600: '#ea580c' }, // 一時保存バッジ
}
```

**Vercel Geist 設計思想：**

- ボタン・CTAは黒（`#000`）。ブランドブルーはリンクとアクセントのみ。
- ページ背景 `#fafafa` + カード背景 `#ffffff` でカードが自然に浮く。
- ボーダーは `#eaeaea`（極薄）。存在を主張しない。
- テキストは `#111`（本文）と `#888`（補助）の2階層のみ。

## ステータス配色

予約枠は「白カード ＋ スタッフカラー左border accent」スタイル。ステータスは背景色のみで区別する。

| ステータス            | 左border                | 背景      | テキスト  |
| --------------------- | ----------------------- | --------- | --------- |
| 予約（scheduled）     | `staffs.color` 実線 3px | `#ffffff` | `#3f3f46` |
| 一時保存（draft）     | `staffs.color` 点線 3px | `#fff7ed` | `#c2410c` |
| 実施済み（completed） | `staffs.color` 実線 3px | `#eff6ff` | `#1d4ed8` |

- `staffs.color` は staffs テーブルの `color` カラム（HEX 6桁）から取得
- box-shadow でカードを白背景から浮かせる（`.fc-event` に適用）

## 差別化ポイント

- **余白を十分に取る**（`p-6` / `gap-4` を基本）
- **フォント14px以上**（`clamp(14px, 2vw, 16px)` でPC/スマホ自動対応）
- **タップ/クリックターゲット48px以上**
- **情報を詰め込まない**（表よりカードを優先）

## スケジュール画面

- **表示開始時刻**：`slotMinTime: '08:00:00'`
- **時間刻み切り替えボタン**：20分 / 10分 / 5分（`slotDuration` を動的変更）
- **スナップ単位**：`snapDuration: '00:05:00'`（固定）。ドラッグ・リサイズは5分単位
- **5分刻み時の行高さ**：`.fc-timegrid-slot` の height を通常の半分に縮小（20分・10分刻みは現状維持）
- **予約枠テキスト**：枠内は「開始時刻（HH:mm）＋患者名」のみ（1行・truncate）
- **本日列**：`.fc-day-today { background: #f0f7ff }` （薄ブルー）
- **リサイズ**：`eventResize` で終了時刻・単位数を自動更新（`scheduled` のみ可）
- **単位数計算**：`calcUnitsFromMinutes(diffMin)` → `lib/rehab/calculator.ts`

### スタッフフィルター

- ログイン中スタッフは常に一番左・常時選択（解除不可）
- `therapist-filter.tsx` でログインスタッフを先頭にソート

### 右クリックメニュー

| 項目 | 動作                                                | 条件           |
| ---- | --------------------------------------------------- | -------------- |
| 編集 | `ScheduleCreatePanel` を編集モードで開く            | 常時           |
| 複製 | 同患者・担当者・時間帯で `ScheduleCreatePanel` 開く | 常時           |
| 削除 | 確認ダイアログ → 論理削除                           | scheduled のみ |

### ツールチップ（PCのみ）

- 白背景・shadow・border-radius 8px・`position: fixed`・z-index 70
- 内容：患者名（太字）・開始〜終了時刻・担当療法士名・単位数・ステータスバッジ
- モバイル（タッチ）はタップで右パネルが開くためツールチップ不要

## 右パネル（SessionPanel）

- `framer-motion AnimatePresence` でスライドイン
- 予約枠シングルクリック or /records 行クリックで開く
- 保存後は `router.refresh()` で一覧を再取得

## ScheduleCreatePanel（新規作成・編集共用）

- `editSchedule` prop を渡すと編集モードに切り替わる
- 新規作成時のみ「他の日にもコピー」（複数日付選択）セクションを表示
- `PanelIntent` discriminated union で create/edit を管理（schedule-client.tsx）
