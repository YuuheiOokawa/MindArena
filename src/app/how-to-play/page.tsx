import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { AppScreen } from "@/components/layout/app-screen";
import { FocusHeader } from "@/components/layout/focus-header";
import { GameRulesCard } from "@/components/common/game-rules-card";
import { TUTORIAL_SECTIONS } from "@/config/tutorial";
import { GAME_CATALOG } from "@/config/games";

export default async function HowToPlayPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <AppScreen nav header={<FocusHeader title="遊び方" backHref="/profile" />}>
      <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
        {TUTORIAL_SECTIONS.map((section) => (
          <section key={section.id} className="flex flex-col gap-1.5">
            <h2 className="text-sm font-bold text-arena-white">{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="text-xs leading-relaxed text-arena-silver">
                {paragraph}
              </p>
            ))}
          </section>
        ))}

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-arena-white">4つの心理戦ゲーム</h2>
          <div className="flex flex-col gap-2">
            {GAME_CATALOG.map((game) => (
              <GameRulesCard key={game.id} game={game} />
            ))}
          </div>
        </section>
      </div>
    </AppScreen>
  );
}
