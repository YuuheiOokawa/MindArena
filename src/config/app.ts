/** App-wide branding. Change these to reskin the product without touching any game/tournament code. */
export const APP_CONFIG = {
  title: "MIND ARENA",
  tagline: "読み合え。裏をかけ。頂点に立て。",
  shortTagline: "心理戦トーナメント",
  /** Referenced by the legal pages (利用規約/プライバシーポリシー/特定商取引法に基づく表記) —
   * change these in one place to update the operator info shown across all of them. */
  operator: {
    companyName: "株式会社マインドアリーナ",
    representativeName: "代表取締役 山田 太郎",
    address: "東京都渋谷区マインド1-2-3 アリーナビル5F",
    supportEmail: "support@mindarena.example.com",
  },
  demoAccount: {
    username: "demo",
    email: "demo@example.com",
    password: "Demo1234!",
  },
} as const;
