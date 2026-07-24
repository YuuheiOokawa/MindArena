import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { GameMeta } from "@/config/games";

/** Renders one game's tagline/description/rules — shared by the "how to play" screen and the pre-match preview. */
export function GameRulesCard({ game }: { game: GameMeta }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 py-4">
        <div>
          <p className="text-base font-bold text-arena-white">{game.name}</p>
          <p className="text-xs font-medium text-arena-primary-soft">{game.tagline}</p>
        </div>
        <p className="text-xs text-arena-silver">{game.description}</p>
        <ul className="mt-1 flex flex-col gap-1.5">
          {game.rules.map((rule) => (
            <li key={rule} className="flex items-start gap-1.5 text-xs text-arena-silver">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-arena-primary/70" />
              {rule}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
