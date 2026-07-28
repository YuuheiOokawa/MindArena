import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { getMyPointHistory } from "@/features/profiles/profile.service";
import { POINT_REASON_LABEL } from "@/domain/enums";
import { AppScreen } from "@/components/layout/app-screen";
import { FocusHeader } from "@/components/layout/focus-header";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Coins } from "lucide-react";

export default async function PointHistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const history = await getMyPointHistory(session.user.id, undefined, 50);

  return (
    <AppScreen header={<FocusHeader title="ポイント履歴" backHref="/home" />}>
      <div className="flex flex-col gap-4 px-4 pb-8 pt-4">
        {history.length === 0 ? (
          <EmptyState icon={Coins} title="ポイント履歴がありません" description="トーナメントに参加してポイントを獲得しましょう。" />
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((tx) => {
              const isPositive = tx.amount >= 0;
              return (
                <Card key={tx.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-semibold text-arena-white">{POINT_REASON_LABEL[tx.reason]}</p>
                      <p className="text-[11px] text-arena-silver/60">{new Date(tx.createdAt).toLocaleString("ja-JP")}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold tabular-nums ${isPositive ? "text-arena-success" : "text-arena-danger"}`}>
                        {isPositive ? "+" : ""}
                        {tx.amount.toLocaleString()} pt
                      </p>
                      <p className="text-[11px] text-arena-silver/60 tabular-nums">残高 {tx.balanceAfter.toLocaleString()} pt</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppScreen>
  );
}
