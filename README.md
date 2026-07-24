# MIND ARENA

スマートフォン縦持ち専用の心理戦ブラウザゲーム。相手の考えを読み、嘘・駆け引き・選択・予測を駆使して32人制トーナメントの頂点を目指す。

タイトル・タグライン・リーグ名・ゲーム名はすべて `src/config/*` の設定値であり、コードを触らずに差し替えられる。

詳しい設計はすべて [`docs/`](./docs) 配下にある。まず [`docs/00_PROJECT_OVERVIEW.md`](./docs/00_PROJECT_OVERVIEW.md) を参照。

## 使用技術

| レイヤー | 採用技術 |
|---|---|
| フロントエンド | Next.js (App Router) / React / TypeScript / Tailwind CSS |
| 状態管理 | Zustand（クライアントUI状態）、サーバーが正とするゲーム状態 |
| フォーム | React Hook Form + Zod |
| バックエンド | Next.js Route Handlers（一部 Server Actions） |
| ORM / DB | Prisma 7（`@prisma/adapter-pg` 経由）+ PostgreSQL |
| 認証 | Auth.js（Credentials、ユーザー名 or メールアドレス + bcrypt） |
| テスト | Vitest（unit / integration）、Playwright（E2E） |
| デプロイ想定 | Vercel + Neon PostgreSQL |

## 必要環境

- Node.js 20 以上
- PostgreSQL 14 以上（ローカルに用意するか、Neon 等のホスティングを利用）
- npm

## セットアップ方法

```bash
npm install
cp .env.example .env
# .env の DATABASE_URL / AUTH_SECRET を編集する
npx prisma migrate dev
npm run db:seed
npm run dev
```

`http://localhost:3000` を開くとスプラッシュ画面が表示される。

## 環境変数

`.env.example` を参照。

| 変数 | 説明 |
|---|---|
| `DATABASE_URL` | PostgreSQL 接続文字列 |
| `AUTH_SECRET` | Auth.js のセッション署名用シークレット（`npx auth secret` で生成可能） |
| `NEXTAUTH_URL` | アプリのベースURL（本番デプロイ時は実URLに変更） |
| `NEXT_PUBLIC_E2E_TEST_MODE` | 開発/テスト専用。`true` にすると Playwright の自動勝利モードが有効になる。`NODE_ENV=production` では常に無効（`src/lib/e2e-test-mode.ts`）。本番では必ず `false`。 |

## DB作成方法

ローカルにPostgreSQLがある場合:

```bash
createdb mindarena_dev
```

Dockerを使う場合の例:

```bash
docker run --name mindarena-postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=mindarena_dev -p 5432:5432 -d postgres:16
```

## Prismaマイグレーション

```bash
npx prisma migrate dev      # 開発中の新規マイグレーション作成 + 適用
npx prisma migrate deploy   # 本番環境への適用（マイグレーション作成はしない）
npx prisma generate         # Prisma Client の再生成のみ
npx prisma studio           # DBを閲覧できるGUI
```

## シード実行方法

```bash
npm run db:seed
```

以下が投入される。

- リーグ 10種類（BRONZE 〜 MIND KING）
- ゲーム 4種類（GameType）
- BOT 60体（難易度5種 × 性格6種 × 2体）
- 実績 12種類
- プロフィールフレーム 6種類、称号 10種類（CosmeticItem）
- デモユーザー（`NODE_ENV=production` では自動的にスキップされる）

デモアカウント:

```
username: demo
email: demo@example.com
password: Demo1234!
```

開発中にトーナメント関連のデータだけをリセットしたい場合:

```bash
npm run db:reset-demo
```

## 開発サーバー起動方法

```bash
npm run dev
```

## テスト実行方法

```bash
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint
npm run test             # Vitest ユニットテスト（DB不要）
npm run test:integration # Vitest 統合テスト（DB接続が必要。.env の DATABASE_URL を使用）
```

ユニットテストは4ゲームの勝敗判定・スコア計算、BOTの行動生成、ポイント計算、リーグ解放判定、
プロフィール装飾判定、トーナメント組み合わせ生成・勝者の次ラウンド進出、勝率計算をカバーする
（`tests/unit/`）。統合テストはユーザー登録・ログイン解決・トーナメント参加・BOT補充・対戦表生成
をカバーする（`tests/integration/`）。

## E2Eテスト実行方法

```bash
npm run db:seed          # デモユーザーが必要
npm run db:reset-demo    # 前回の実行結果をクリアしておくと確実
npm run test:e2e
```

`e2e/tournament-run.spec.ts` は以下を自動確認する。

1. デモユーザーでログイン
2. ブロンズリーグを選択してトーナメントに参加（BOTが31人自動補充される）
3. 対戦表画面から自分の対戦へ進む
4. 4種類の心理戦ゲームをプレイして5回勝ち抜く（開発専用の決定論的テストモードを使用）
5. 優勝画面が表示されることを確認
6. プロフィールの戦績が更新されていることを確認

E2Eテストは `NEXT_PUBLIC_E2E_TEST_MODE=true` でNext.js開発サーバーを自動起動する
（`playwright.config.ts` の `webServer.env`）。このフラグはサーバー側で
`NODE_ENV !== "production"` の場合にのみ有効になり、本番ビルドでは絶対に効かない
（`src/lib/e2e-test-mode.ts`、`docs/12_SECURITY.md`）。

## 本番ビルド方法

```bash
npm run build
npm run start
```

## Vercelデプロイ方法

1. [Neon](https://neon.tech) 等でPostgreSQLデータベースを作成し、接続文字列を取得する。
2. Vercelにリポジトリをインポートする。
3. Vercelの環境変数に `DATABASE_URL` / `AUTH_SECRET` / `NEXTAUTH_URL`（本番URL）を設定する。
   `NEXT_PUBLIC_E2E_TEST_MODE` は設定しない（未設定 = 無効）。
4. ビルドコマンドの前に `npx prisma migrate deploy` を実行するようにする
   （例: Vercelの "Build Command" を `npx prisma migrate deploy && npm run build` にする）。
5. デプロイ後、初回のみ `npm run db:seed` を本番DBに対して実行するとマスターデータ
   （リーグ・ゲーム・BOT・実績・装飾）が投入される。デモユーザーは `NODE_ENV=production`
   のため自動的にスキップされる。

## デモアカウント

```
username: demo
email: demo@example.com
password: Demo1234!
```

`NODE_ENV=production` でシードを実行した場合は作成されない。

## ディレクトリ構成

```
docs/                    設計ドキュメント（00〜15、必ずここから読む）
prisma/
  schema.prisma          DBスキーマ
  seed.ts                初期シードデータ
  reset-demo.ts           開発用リセットスクリプト
src/
  app/                    ルーティング（画面 + APIルートハンドラ）
  components/
    ui/                   汎用UIプリミティブ（Button, Card, Badge...）
    common/                Empty/Error/Loading, StatTile
    layout/                MobileShell, BottomNav, AppScreen, FocusHeader
    game/                  4ゲーム共通のボードUI、タイマー
  features/
    auth/                  登録
    profiles/              プロフィール読み取り・更新・戦績
    leagues/                リーグ一覧・詳細
    tournaments/            参加・BOT補充・対戦表生成・進行・復帰
    games/
      core/                 ゲームエンジン共通部分（レジストリ、セッション、BOTシミュレーション）
      trust-or-betray/
      number-bluff/
      minority-choice/
      final-prediction/
    bots/                   BOT性格・ミス確率・ゲーム別戦略レジストリ
    points/                 ポイント付与
  domain/
    enums/                  ステータス等のEnum
    interfaces/              PsychologicalGame などのプラグイン契約
    entities/                Prismaに依存しないドメイン型
    services/                純粋関数のドメインサービス（ポイント計算・リーグ解放・対戦表生成等）
  infrastructure/
    database/                Prismaクライアント（唯一の生成元）
    auth/                    Auth.js設定・パスワードハッシュ
    repositories/             Prismaアクセスの唯一の窓口
  lib/                      validation, errors, logging, utils, http
  config/                   リーグ・ゲーム・ポイント・BOT・フレーム・称号・実績・タイマー等のマスターデータ
tests/
  unit/                     ドメインロジックのユニットテスト
  integration/               DBを使った結合テスト
e2e/                        Playwright E2Eテスト
```

## 新しいゲームを追加する方法

1. `src/features/games/<new-game>/` に `PsychologicalGame` インターフェース
   （`src/domain/interfaces/psychological-game.ts`）を実装するモジュールを作成する。
2. `src/config/games.ts` の `GAME_CATALOG` に表示用メタデータを追加する。
3. `src/components/game/<new-game>-board.tsx` を作成し、
   `src/components/game/game-board.tsx` に1行追加する。
4. `src/features/games/core/registry.ts` の `GAME_REGISTRY` に1行追加する。
5. `src/features/bots/strategies/<new-game>.strategy.ts` を作成し、
   `src/features/bots/strategy-registry.ts` に登録する。
6. `prisma/seed.ts` でその `GameType` 行をシードする。

トーナメント進行・ポイント計算・プロフィール機能のコードは一切変更不要（詳細は
`docs/08_GAME_ENGINE_DESIGN.md`）。

## 新しいリーグを追加する方法

`src/config/leagues.ts` の `LEAGUES` 配列にエントリを追加し、`npm run db:seed` を再実行する
だけでよい。倍率・BOT難易度・必要ポイント・表示順もすべてこの設定ファイルで管理されている
（詳細は `docs/09_TOURNAMENT_DESIGN.md`）。

## 新しいBOT戦略を追加する方法

`src/features/bots/strategies/<game>.strategy.ts` 内で `bot.personality`
（`src/domain/enums`の`BotPersonality`）ごとの分岐を追加するか、新しい性格を
`BotPersonality` enumと `src/config/bots.ts` の `BOT_PERSONALITIES` に追加した上で
各ゲームの戦略ファイルに分岐を実装する。BOTの強さ自体は `src/config/bots.ts` の
`BOT_DIFFICULTY_BANDS`（能力値レンジ・ミス確率）で調整する（詳細は `docs/10_BOT_DESIGN.md`）。

## 今後の開発予定

友達対戦、観戦、ランキング、シーズン制、降格、ギルド、チャット、アイテム/ショップ、
デイリーミッション、リプレイ、管理画面、多言語対応、PWA化など。それぞれが現在の設計の
どの部分を土台に追加できるかは [`docs/15_FUTURE_ROADMAP.md`](./docs/15_FUTURE_ROADMAP.md) を参照。

## 完了条件チェックリスト

- [x] ユーザー登録できる
- [x] ユーザー名またはメールアドレスでログインできる
- [x] ホーム画面が表示される
- [x] 10種類のリーグが表示される
- [x] ポイントに応じてリーグが解放される
- [x] トーナメントに参加できる
- [x] 参加人数不足分をBOTで補充できる
- [x] 32人の対戦表が生成される
- [x] 4種類の心理戦ゲームが動作する
- [x] 勝者が次のラウンドへ進む
- [x] 5回勝利すると優勝できる
- [x] 優勝報酬を獲得できる
- [x] ポイント履歴が保存される
- [x] 心理戦勝率がプロフィールに表示される
- [x] ポイントに応じてプロフィールが豪華になる（フレーム段階）
- [x] 対戦履歴を確認できる
- [x] リロード後も進行状態を復元できる（`features/tournaments/resume.ts`）
- [x] スマートフォン縦持ちで問題なく操作できる（390px基準、320pxまで崩れない）
- [x] 自動テストが成功する（unit / integration / E2E）
- [x] READMEだけで環境構築と起動ができる
