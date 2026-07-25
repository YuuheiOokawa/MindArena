export interface Announcement {
  id: string;
  title: string;
  date: string;
  body: string;
}

/** Home screen "お知らせ" feed — master data, no component hardcodes announcement copy. */
export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "special-tournament-abyss",
    title: "特別大会「深淵の頂点」開催予告",
    date: "2026年8月2日(日) 20:00〜",
    body: "期間限定の特別トーナメントを開催します。優勝者には称号「深淵を制した者」と3,000ptのボーナス報酬を進呈。参加方法など詳細は開催が近づき次第あらためてお知らせします。",
  },
];
