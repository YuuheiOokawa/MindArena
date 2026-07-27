"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { apiClient, ApiClientError } from "@/lib/api-client";

export interface Preferences {
  soundEnabled: boolean;
  bgmEnabled: boolean;
  vibrationEnabled: boolean;
  reducedMotion: boolean;
  showBotTag: boolean;
}

const DEFAULT_PREFERENCES: Preferences = {
  soundEnabled: true,
  bgmEnabled: true,
  vibrationEnabled: true,
  reducedMotion: false,
  showBotTag: true,
};

export type ToneKind = "tap" | "win" | "lose" | "achievement";

/** Short envelope-shaped tones synthesized on the fly (no audio asset pipeline in this project) —
 * a sine blip for taps, a two-note rise for wins, a low fall for losses, a bright three-note
 * arpeggio for achievement unlocks. */
function playSynthesizedTone(ctx: AudioContext, kind: ToneKind) {
  const now = ctx.currentTime;
  const notes: Array<{ freq: number; start: number; duration: number }> =
    kind === "tap"
      ? [{ freq: 620, start: 0, duration: 0.05 }]
      : kind === "win"
        ? [
            { freq: 523.25, start: 0, duration: 0.12 },
            { freq: 783.99, start: 0.1, duration: 0.18 },
          ]
        : kind === "lose"
          ? [{ freq: 220, start: 0, duration: 0.22 }]
          : [
              { freq: 523.25, start: 0, duration: 0.09 },
              { freq: 659.25, start: 0.08, duration: 0.09 },
              { freq: 987.77, start: 0.16, duration: 0.22 },
            ];

  for (const note of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = note.freq;
    const start = now + note.start;
    const end = start + note.duration;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.18, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(end + 0.02);
  }
}

interface PreferencesContextValue extends Preferences {
  loaded: boolean;
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => Promise<void>;
  vibrate: (pattern: number | number[]) => void;
  playTone: (kind: ToneKind) => void;
}

const PreferencesContext = createContext<PreferencesContextValue>({
  ...DEFAULT_PREFERENCES,
  loaded: false,
  setPreference: async () => undefined,
  vibrate: () => undefined,
  playTone: () => undefined,
});

export function usePreferences() {
  return useContext(PreferencesContext);
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    apiClient
      .get<Preferences>("/api/profile/me")
      .then((profile) => {
        if (cancelled) return;
        setPrefs({
          soundEnabled: profile.soundEnabled,
          bgmEnabled: profile.bgmEnabled,
          vibrationEnabled: profile.vibrationEnabled,
          reducedMotion: profile.reducedMotion,
          showBotTag: profile.showBotTag,
        });
        setLoaded(true);
      })
      .catch(() => undefined); // non-critical — keep defaults on failure
    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    document.body.classList.toggle("arena-reduced-motion", prefs.reducedMotion);
  }, [prefs.reducedMotion]);

  async function setPreference<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    const previous = prefs;
    setPrefs((p) => ({ ...p, [key]: value }));
    try {
      await apiClient.patch("/api/profile/me/settings", { [key]: value });
    } catch (e) {
      setPrefs(previous);
      throw e instanceof ApiClientError ? e : new ApiClientError("UNKNOWN", "設定の保存に失敗しました。");
    }
  }

  function vibrate(pattern: number | number[]) {
    if (!prefs.vibrationEnabled) return;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  }

  function playTone(kind: ToneKind) {
    if (!prefs.soundEnabled) return;
    if (typeof window === "undefined") return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") void ctx.resume();
      playSynthesizedTone(ctx, kind);
    } catch {
      // Web Audio isn't available/allowed in this context — sound is a non-critical enhancement.
    }
  }

  return (
    <PreferencesContext.Provider value={{ ...prefs, loaded, setPreference, vibrate, playTone }}>
      {children}
    </PreferencesContext.Provider>
  );
}
