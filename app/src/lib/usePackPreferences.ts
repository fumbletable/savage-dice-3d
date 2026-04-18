import { useCallback, useEffect, useState } from "react";
import type { DiceStyle } from "../materials/DiceMaterial";

const STORAGE_KEY = "savage-dice-3d.packs.v1";

interface PackPrefs {
  main: DiceStyle;    // Trait die + damage dice
  wild: DiceStyle;    // Wild die — kept distinct so it stands apart
}

const DEFAULTS: PackPrefs = {
  main: "walnut",
  wild: "sunset",
};

function load(): PackPrefs {
  if (typeof localStorage === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      main: parsed.main ?? DEFAULTS.main,
      wild: parsed.wild ?? DEFAULTS.wild,
    };
  } catch {
    return DEFAULTS;
  }
}

/** Player's chosen dice packs, persisted to localStorage so they survive reloads. */
export function usePackPreferences() {
  const [prefs, setPrefs] = useState<PackPrefs>(load);

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // quota exceeded, private mode, etc — ignore
    }
  }, [prefs]);

  const setMain = useCallback(
    (main: DiceStyle) => setPrefs((p) => ({ ...p, main })),
    [],
  );
  const setWild = useCallback(
    (wild: DiceStyle) => setPrefs((p) => ({ ...p, wild })),
    [],
  );

  return { prefs, setMain, setWild };
}
