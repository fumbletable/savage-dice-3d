import { useEffect, useMemo } from "react";
import { DiceScene } from "./DiceScene";
import type { SceneDie } from "./DiceScene";
import type { RemoteRoll } from "../lib/usePlayerDice";
import { theme } from "../lib/theme";

interface Props {
  roll: RemoteRoll;
  onDismiss: () => void;
}

// How long after a remote roll finishes before the mini-tray disappears.
const DISMISS_AFTER_MS = 8000;

/**
 * One remote player's roll rendered in a self-contained mini-scene.
 * Own physics world, own dice — doesn't collide with the main tray.
 * Auto-dismisses N seconds after all dice settle.
 */
export function RemoteTray({ roll, onDismiss }: Props) {
  const sceneDice: SceneDie[] = useMemo(() => {
    return roll.roll.dice
      .filter((d) => roll.throws[d.id])
      .map((d) => ({
        id: d.id,
        dieType: d.type,
        style: d.style,
        // No tint — the coloured border + name bar already show whose roll this is.
        // Tinting muddied the baked-albedo textures.
        throw: roll.throws[d.id],
      }));
  }, [roll]);

  // Schedule dismissal once the roll finishes. If a new throw arrives
  // (ace re-roll) finishedRolling flips false, timer cancels.
  useEffect(() => {
    if (!roll.finishedRolling) return;
    const t = setTimeout(onDismiss, DISMISS_AFTER_MS);
    return () => clearTimeout(t);
  }, [roll.finishedRolling, onDismiss]);

  // Compute a simple total for display — damage sums, trait is best-of (trait vs wild)
  const totals = useMemo(() => computeDisplayTotal(roll), [roll]);

  return (
    <div
      style={{
        width: 150,
        height: 230,
        background: "rgba(26, 26, 29, 0.92)",
        border: `1px solid ${roll.player.color}`,
        borderRadius: theme.radius,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: `0 6px 16px rgba(0,0,0,0.5), 0 0 0 1px ${theme.surfaceHi}`,
      }}
    >
      {/* Player name bar */}
      <div
        style={{
          padding: "4px 8px",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 0.5,
          color: theme.text,
          background: roll.player.color,
          textAlign: "center",
          textShadow: "0 1px 2px rgba(0,0,0,0.4)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {roll.player.name}
      </div>

      {/* Scene */}
      <div style={{ flex: 1, position: "relative" }}>
        <DiceScene dice={sceneDice} onResult={noop} />
      </div>

      {/* Result footer */}
      <div
        style={{
          padding: "4px 8px",
          fontSize: 12,
          fontWeight: 600,
          color: theme.text,
          background: theme.bg,
          borderTop: `1px solid ${theme.surfaceHi}`,
          textAlign: "center",
          minHeight: 22,
          letterSpacing: 0.3,
        }}
      >
        {totals ?? "Hidden"}
      </div>
    </div>
  );
}

function noop() {}

/** Footer string: "Trait 7" or "Damage 12". Shows "Trait..." / "Damage..."
 *  while dice are still tumbling. For trait+wild the best of the two (+mod)
 *  is what matters to onlookers — the loser doesn't get called out. */
function computeDisplayTotal(roll: RemoteRoll): string | null {
  if (roll.roll.hidden) return null;

  const label = roll.roll.mode === "trait" ? "Trait" : "Damage";
  if (!roll.finishedRolling) return `${label}...`;

  const chainSum = (id: string) =>
    (roll.chains[id] ?? []).reduce((a, b) => a + b, 0);

  if (roll.roll.mode === "trait") {
    const traitTotal = chainSum("trait") + roll.roll.modifier;
    const wildTotal = roll.roll.wildCard
      ? chainSum("wild") + roll.roll.modifier
      : traitTotal;
    const best = Math.max(traitTotal, wildTotal);
    return `${label} ${best}`;
  }

  const total =
    roll.roll.dice.reduce((sum, d) => sum + chainSum(d.id), 0) + roll.roll.modifier;
  return `${label} ${total}`;
}
