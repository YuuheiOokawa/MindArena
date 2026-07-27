import { LegalDocument } from "@/components/legal/legal-document";
import { APP_CONFIG } from "@/config/app";

export const metadata = { title: `特定商取引法に基づく表記 | ${APP_CONFIG.title}` };

const ROWS: { label: string; value: React.ReactNode }[] = [
  { label: "販売事業者", value: APP_CONFIG.operator.companyName },
  { label: "運営統括責任者", value: APP_CONFIG.operator.representativeName },
  { label: "所在地", value: APP_CONFIG.operator.address },
  { label: "メールアドレス", value: APP_CONFIG.operator.supportEmail },
  {
    label: "電話番号",
    value: "メールでのお問い合わせを基本とさせていただいております。お電話でのお問い合わせをご希望の場合は、メールにてご連絡ください。",
  },
  {
    label: "販売価格",
    value: (
      <>
        現在、本サービス内で付与される「賞金（プライズカレンシー）」等のゲーム内通貨は、対戦・トーナメントの参加および勝敗の結果としてのみ付与されており、実際の金銭による購入手段は提供しておりません。
        <br />
        今後、有償のゲーム内通貨またはアイテムの販売を開始する場合は、購入手続き画面に販売価格（消費税込み）を表示します。
      </>
    ),
  },
  { label: "商品代金以外の必要料金", value: "本サービスのご利用にあたり、インターネット接続に必要な通信料は利用者のご負担となります。" },
  { label: "支払方法", value: "現時点で有償販売は行っておりません。有償販売開始時には、クレジットカード決済等、購入手続き画面に表示する方法によります。" },
  { label: "支払時期", value: "有償販売開始時には、購入手続き完了時にお支払いが確定します。" },
  { label: "商品の引渡し時期", value: "ゲーム内通貨・アイテムは、付与条件を満たした時点、または（有償販売開始後は）決済完了後、直ちにアカウントへ反映されます。" },
  {
    label: "返品・キャンセルについて",
    value: "ゲーム内通貨・アイテムの性質上、付与後の返品・返金・キャンセルはお受けできません。ただし、当社の責めに帰すべき事由がある場合はこの限りではありません。",
  },
  { label: "動作環境", value: "最新版のモバイル・PCブラウザでのご利用を推奨します。" },
];

export default function TokushohoPage() {
  return (
    <LegalDocument title="特定商取引法に基づく表記">
      <p>
        特定商取引に関する法律に基づき、以下のとおり表記いたします。なお、{APP_CONFIG.title}
        は現時点で実際の金銭を伴う商品・サービスの販売は行っておらず、本ページは将来的な有償機能の追加に備えて公開しているものです。
      </p>

      <table>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.label}>
              <td className="w-28 shrink-0 whitespace-nowrap font-semibold text-arena-white">{row.label}</td>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="pt-2 text-[11px] text-arena-silver/50">制定日：2026年7月27日</p>
    </LegalDocument>
  );
}
