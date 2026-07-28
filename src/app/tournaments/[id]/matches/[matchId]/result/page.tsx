"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { AppScreen } from "@/components/layout/app-screen";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfettiBurst } from "@/components/common/confetti-burst";
import { AnimatedNumber } from "@/components/common/animated-number";
import { resumeHref } from "@/features/tournaments/resume-href";
import type { ResumeScreen } from "@/features/tournaments/resume";
import { usePreferences } from "@/components/providers/preferences-provider";
import { LeagueBadgeIcon } from "@/components/common/league-badge-icon";
import { Award, Coins, Flag, Trophy, TrendingDown, TrendingUp, XCircle } from "lucide-react";

interface MatchResultView {
  won: boolean;
  myScore: number;
  opponentScore: number;
  opponentName: string;
  tournamentId: string;
  pointsEarned: number;
  outcomeLabel: string;
  pointsBefore: number | null;
  pointsAfter: number | null;
  league: { displayName: string; themeKey: string } | null;
  leagueChange: "PROMOTED" | "DEMOTED" | "NONE";
}

interface AchievementNotice {
  code: string;
  name: string;
  description: string;
  rewardPoints: number;
}

export default function MatchResultPage({ params }: { params: Promise<{ id: string; matchId: string }> }) {
  const { id, matchId } = use(params);
  // Keyed on matchId so each match's result gets a fresh mount — otherwise the pop-in/confetti
  // CSS animations (which only play once per element mount) wouldn't replay on a second win.
  return <MatchResultSession key={matchId} id={id} matchId={matchId} />;
}

function MatchResultSession({ id, matchId }: { id: string; matchId: string }) {
  const router = useRouter();
  const { vibrate, playTone } = usePreferences();
  const [result, setResult] = useState<MatchResultView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [unlockedAchievements, setUnlockedAchievements] = useState<AchievementNotice[]>([]);
  // consumeUnseenAchievements marks what it returns as notified server-side, so a second call
  // legitimately returns []. Without this guard, React Strict Mode's dev-only double-invoke of
  // effects would race two calls and the second (empty) response can clobber the first (real)
  // one — this ref makes the second invocation on the same mount a no-op instead.
  const achievementsFetchStartedRef = useRef(false);
  const resultFeedbackFiredRef = useRef(false);

  useEffect(() => {
    apiClient
      .get<MatchResultView>(`/api/matches/${matchId}/result`)
      .then((data) => {
        setResult(data);
        if (resultFeedbackFiredRef.current) return;
        resultFeedbackFiredRef.current = true;
        vibrate(data.won ? [40, 30, 40] : 80);
        playTone(data.won ? "win" : "lose");
      })
      .catch((e) => setError(e instanceof ApiClientError ? e.message : "結果の取得に失敗しました。"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  useEffect(() => {
    // Independent of the result fetch above and never surfaces its own error — an achievement
    // celebration is a bonus on top of the core win/lose result, not something that should be
    // able to block it.
    if (achievementsFetchStartedRef.current) return;
    achievementsFetchStartedRef.current = true;
    apiClient
      .post<AchievementNotice[]>("/api/profile/me/achievements/unseen")
      .then((notices) => {
        setUnlockedAchievements(notices);
        if (notices.length > 0) {
          vibrate([20, 40, 20, 40, 20]);
          playTone("achievement");
        }
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  async function handleNext() {
    if (navigating) return;
    setNavigating(true);
    try {
      const resume = await apiClient.get<ResumeScreen>("/api/tournaments/resume");
      const href = resumeHref(resume);
      // Flags the bracket screen to play its "advanced to the next round" reveal — only relevant
      // right after a win, and only meaningful when resume actually lands back on the bracket.
      const withAdvanceFlag = result?.won && resume.screen === "bracket" ? `${href}?advanced=1` : href;
      router.push(withAdvanceFlag);
    } catch {
      router.push(`/tournaments/${id}/bracket`);
    }
  }

  function handleBackToBracket() {
    if (navigating) return;
    setNavigating(true);
    router.push(`/tournaments/${id}/bracket`);
  }

  if (error) return <AppScreen><ErrorState message={error} /></AppScreen>;
  if (!result) return <AppScreen><LoadingState /></AppScreen>;

  return (
    <AppScreen>
      <div className="relative flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        {result.won && <ConfettiBurst />}
        {result.won ? (
          <div
            className="arena-pop-in arena-glow-pulse flex h-20 w-20 items-center justify-center rounded-full border-2 border-arena-gold/60 bg-arena-gold/10"
            style={{ "--arena-glow-color": "rgba(224, 178, 86, 0.6)" } as React.CSSProperties}
          >
            <Trophy className="h-9 w-9 text-arena-gold" />
          </div>
        ) : (
          <div className="arena-pop-in arena-shake-once flex h-20 w-20 items-center justify-center rounded-full border-2 border-arena-danger/40 bg-arena-danger/10">
            <XCircle className="h-9 w-9 text-arena-danger" />
          </div>
        )}
        <div className="arena-pop-in" style={{ animationDelay: "0.15s" }}>
          <p className={`text-3xl font-black tracking-wide ${result.won ? "text-arena-gold" : "text-arena-danger"}`}>
            {result.won ? "WIN" : "LOSE"}
          </p>
          <p className="mt-1 text-sm text-arena-silver">vs {result.opponentName}</p>
        </div>

        <Card className="w-full arena-pop-in" style={{ animationDelay: "0.25s" }}>
          <CardContent className="flex flex-col gap-3 py-4">
            <div className="flex items-center justify-around">
              <ScoreBlock label="あなた" value={result.myScore} />
              <p className="text-arena-silver">-</p>
              <ScoreBlock label="相手" value={result.opponentScore} />
            </div>

            <div className="h-px bg-arena-border" />

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-arena-silver">
                <Flag className="h-3.5 w-3.5" />
                到達ラウンド
              </span>
              <span className="text-sm font-semibold text-arena-white">{result.outcomeLabel}</span>
            </div>

            {result.pointsEarned !== 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-arena-silver">{result.pointsEarned > 0 ? "獲得ポイント" : "ポイント変動"}</span>
                <span
                  className={`flex items-center gap-1 text-base font-bold tabular-nums ${
                    result.pointsEarned > 0 ? "text-arena-gold" : "text-arena-silver"
                  }`}
                >
                  <Coins className="h-4 w-4" />
                  {result.pointsEarned > 0 ? "+" : "-"}
                  <AnimatedNumber value={Math.abs(result.pointsEarned)} />P
                </span>
              </div>
            )}

            {result.pointsBefore !== null && result.pointsAfter !== null && (
              <p className="text-right text-[11px] text-arena-silver/60">
                {result.pointsBefore.toLocaleString()} → {result.pointsAfter.toLocaleString()} pt
              </p>
            )}

            {result.league && result.leagueChange !== "NONE" && (
              <div
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold arena-pop-in ${
                  result.leagueChange === "PROMOTED"
                    ? "border border-arena-gold/40 bg-arena-gold/10 text-arena-gold"
                    : "border border-arena-border bg-arena-surface-2/60 text-arena-silver"
                }`}
                style={{ animationDelay: "0.3s" }}
              >
                {result.leagueChange === "PROMOTED" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <LeagueBadgeIcon themeKey={result.league.themeKey} />
                {result.leagueChange === "PROMOTED" ? "昇格！" : "降格"} — {result.league.displayName}
              </div>
            )}
          </CardContent>
        </Card>

        {unlockedAchievements.length > 0 && (
          <div className="flex w-full flex-col gap-2 arena-pop-in" style={{ animationDelay: "0.35s" }}>
            {unlockedAchievements.map((achievement) => (
              <Card key={achievement.code} className="border-arena-gold/40 bg-gradient-to-r from-arena-gold/10 to-transparent">
                <CardContent className="flex items-center gap-3 py-3">
                  <div
                    className="arena-glow-pulse flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-arena-gold/50 bg-arena-gold/15"
                    style={{ "--arena-glow-color": "rgba(224, 178, 86, 0.5)" } as React.CSSProperties}
                  >
                    <Award className="h-5 w-5 text-arena-gold" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-arena-gold">実績解放！</p>
                    <p className="truncate text-sm font-bold text-arena-white">{achievement.name}</p>
                    <p className="truncate text-[11px] text-arena-silver/70">{achievement.description}</p>
                  </div>
                  {achievement.rewardPoints > 0 && (
                    <span className="shrink-0 text-sm font-bold tabular-nums text-arena-gold">+{achievement.rewardPoints}P</span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex w-full flex-col gap-2">
          <Button variant="gold" onClick={handleNext} disabled={navigating}>
            {navigating ? "移動中…" : "次へ進む"}
          </Button>
          <Button variant="secondary" onClick={handleBackToBracket} disabled={navigating}>
            トーナメント表へ戻る
          </Button>
        </div>
      </div>
    </AppScreen>
  );
}

function ScoreBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-[11px] text-arena-silver/70">{label}</p>
      <p className="text-2xl font-bold tabular-nums text-arena-white">
        <AnimatedNumber value={value} />
      </p>
    </div>
  );
}
