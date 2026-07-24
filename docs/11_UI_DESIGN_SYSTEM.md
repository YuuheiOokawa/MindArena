# 11. UI Design System

## Viewport

- Design canvas: 390×844, works down to 320px width.
- On viewports wider than the mobile canvas (desktop browsers), the app renders inside a
  centered `MobileShell` capped at `max-width: 430px` with a subtle side vignette — never a
  full-bleed desktop layout.
- `100dvh` + `env(safe-area-inset-*)` padding throughout (`components/layout/SafeArea.tsx`).
- No horizontal scroll anywhere; wide content (bracket) scrolls internally within its own
  container.

## Palette (Tailwind theme tokens, `app/globals.css` `@theme`)

| Token | Value | Use |
|---|---|---|
| `--color-arena-bg` | `#05070d` | app background |
| `--color-arena-surface` | `#0e1220` | cards/panels base |
| `--color-arena-surface-2` | `#161c2e` | raised panels |
| `--color-arena-border` | `#232a42` | hairlines |
| `--color-arena-silver` | `#c7ccd8` | secondary text/icons |
| `--color-arena-white` | `#f5f6fa` | primary text |
| `--color-arena-gold` | `#d4af6a` | accent, CTA, win state |
| `--color-arena-gold-soft` | `#efe3c3` | gold text on dark |
| `--color-arena-danger` | `#c0524a` | loss/error, desaturated red (not neon) |
| `--color-arena-success` | `#4d9d7c` | win/confirm, desaturated green |

Glass panels: `bg-white/[0.04] backdrop-blur-md border border-white/10`. Gradients are limited
to a single subtle radial gold-to-transparent glow behind hero numbers — never full-panel
rainbow gradients.

## Typography

- Numbers (points, timers, scores) use tabular figures at a visibly larger weight/size than
  surrounding text — `text-4xl font-semibold tabular-nums` for hero stats.
- Minimum body text 14px, minimum tap target 44×44px (`min-h-11 min-w-11` utility everywhere
  interactive).

## Component rules

- One primary action per screen (`<Button variant="primary">`), styled identically everywhere
  (solid gold, dark text). Secondary/tertiary actions use consistently lower-emphasis variants.
- State is never color-only: win/loss shows an icon + word ("WIN"/"LOSE") plus color; locked
  leagues show a lock icon plus "REQUIRES {n} PTS" text, not just a dimmed card.
- Every list-fetching screen has three explicit states: `Loading` (skeleton, not a spinner
  wall), `Empty` (`EmptyState` with icon + message), `Error` (`ErrorState` with retry button).
- Buttons show a pressed/active scale-down (`active:scale-[0.97]`) and disable during pending
  network calls to prevent double-submits.

## Motion

- Screen transitions: short fade/slide (150–220ms), driven by CSS/Tailwind transitions, not a
  heavy animation library, to keep the bundle light.
- "Reduced motion" setting (Settings screen, persisted to `PlayerProfile` settings JSON and
  mirrored in a Zustand store) shortens all durations to ~40ms and disables the confetti-style
  championship effect, per source spec §22.
