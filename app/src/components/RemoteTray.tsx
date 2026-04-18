import { useEffect, useMemo } from "react";
import { DiceScene } from "./DiceScene";
import type { SceneDie } from "./DiceScene";
import type { RemoteRoll } from "../lib/usePlayerDice";

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
        tint: roll.player.color,
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
        background: "rgba(18, 18, 42, 0.88)",
        border: `2px solid ${roll.player.color}`,
        borderRadius: 6,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 6px 16px rgba(0,0,0,0.5)",
      }}
    >
      {/* Player name bar */}
      <div
        style={{
          padding: "4px 8px",
          fontSize: 11,
          fontWeight: 700,
          color: "#fff",
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
          fontSize: 11,
          color: "#ccc",
          background: "#14142a",
          textAlign: "center",
          minHeight: 22,
        }}
      >
        {totals ?? (roll.roll.hidden ? "Hidden" : "Rolling...")}
      </div>
    </div>
  );
}

function noop() {}

/** Tiny summary string — we'll replace with a richer chip in the recent-rolls log. */
function computeDisplayTotal(roll: RemoteRoll): string | null {
  if (roll.roll.hidden) return null;
  if (!roll.finishedRolling) return null;

  const chainSum = (id: string) =>
    (roll.chains[id] ?? []).reduce((a, b) => a + b, 0);

  if (roll.roll.mode === "trait") {
    const traitTotal = chainSum("trait") + roll.roll.modifier;
    if (!roll.roll.wildCard) return `${traitTotal}`;
    const wildTotal = chainSum("wild") + roll.roll.modifier;
    const best = Math.max(traitTotal, wildTotal);
    return `${best} (T ${traitTotal} / W ${wildTotal})`;
  }

  // damage
  const total = roll.roll.dice.reduce((sum, d) => sum + chainSum(d.id), 0) + roll.roll.modifier;
  return `${total}`;
}
