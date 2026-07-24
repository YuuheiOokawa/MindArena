# 02. Screen List

| # | Screen | Route | Bottom nav | Notes |
|---|---|---|---|---|
| 1 | Splash | `/` | hidden | Logo, tagline, auto-redirects to `/home` or `/login` |
| 2 | Register | `/register` | hidden | username, email, password, confirm, terms checkbox |
| 3 | Login | `/login` | hidden | username-or-email + password |
| 4 | Forgot password | `/forgot-password` | hidden | stub flow, see `01_REQUIREMENTS.md` |
| 5 | Onboarding / first profile setup | `/onboarding` | hidden | display name + avatar color pick, runs once |
| 6 | Home | `/home` | Home | profile summary, league gauge, CTA, recent results, announcements |
| 7 | League list | `/leagues` | League | 10 leagues, locked/unlocked, tap → detail |
| 8 | League detail | `/leagues/[leagueId]` | League | rewards, bot difficulty, games used, unlock condition |
| 9 | Tournament join | `/tournaments/join?league=` | Tournament | league summary, games used, rewards, participant count, join CTA |
| 10 | Matchmaking | `/tournaments/[id]/matchmaking` | hidden | live participant count, bot fill animation, "bracket ready" transition |
| 11 | Bracket | `/tournaments/[id]/bracket` | Tournament | round switcher, match cards, "you" highlighted |
| 12 | Pre-match | `/tournaments/[id]/matches/[matchId]/preview` | hidden | opponent card, win rate, recent tendency, game name, start CTA |
| 13 | Game | `/tournaments/[id]/matches/[matchId]/play` | hidden | per-game board, timer, round, score |
| 14 | Match result | `/tournaments/[id]/matches/[matchId]/result` | hidden | win/lose, points, round-by-round breakdown, next-match / back-to-bracket |
| 15 | Championship | `/tournaments/[id]/champion` | hidden | trophy animation, points, title/frame unlock |
| 16 | Profile | `/profile` | Profile | stats, win rates, titles, achievements, cosmetics |
| 17 | Match history | `/history` | History | filterable list of past matches |
| 18 | Settings | `/settings` | hidden (accessed from Profile) | sound/bgm/vibration/reduced motion/bot tag/logout |

## Bottom navigation (5 tabs)

`Home` · `League` · `Tournament` · `History` (「戦績」) · `Profile`

Hidden during: Game screen, Match result, Championship, Matchmaking, Pre-match — anywhere an
accidental tap could interrupt a live match or a payoff moment.
