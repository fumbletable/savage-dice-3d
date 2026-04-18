import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { DiceScene } from "./components/DiceScene";
import type { SceneDie } from "./components/DiceScene";
import type { DieType } from "./meshes/DiceMesh";
import type { DiceStyle } from "./materials/DiceMaterial";
import { randomThrow } from "./lib/throw";
import type { ThrowRegion } from "./lib/throw";
import type {
  DiceTransform,
  SavageRoll,
  SavageDie,
  DieRole,
} from "./lib/types";
import { DiceRollSync } from "./lib/DiceRollSync";
import { usePlayerInfo } from "./lib/usePlayerInfo";
import { VERSION } from "./version";

const DIE_TYPES: DieType[] = ["d4", "d6", "d8", "d10", "d12"];
const ACE_DELAY_MS = 450;
const ACE_JITTER_MS = 250; // stops simultaneous aces from re-throwing in the same frame

// Role → material pack. Trait + damage share a pack so normal rolls feel like
// one set of dice. Only the wild die stands apart, as SWADE convention wants.
const TRAIT_STYLE: DiceStyle = "walnut";
const WILD_STYLE: DiceStyle = "sunset";
const DAMAGE_STYLE: DiceStyle = "walnut";

// Accent colours used in UI chips (not the die surface)
const TRAIT_COLOUR = "#d4af37";
const WILD_COLOUR = "#c94b4b";
const DAMAGE_COLOUR = "#c8c8d4";

type Mode = "trait" | "damage";

function sidesOf(die: DieType): number {
  return Number(die.slice(1));
}

// SWADE: a d10 face reading "0" counts as 10 (ace value).
function normaliseFaceValue(dieType: DieType, raw: number): number {
  if (dieType === "d10" && raw === 0) return 10;
  return raw;
}

interface DieState {
  id: string;
  dieType: DieType;
  style: DiceStyle;
  tint?: string;
  region: ThrowRegion;
  role: DieRole;
  chain: number[];
  done: boolean;
}

export function DiceApp() {
  const [mode, setMode] = useState<Mode>("trait");

  // Trait state
  const [selectedDie, setSelectedDie] = useState<DieType>("d6");
  const [wildCard, setWildCard] = useState(true);

  // Damage state
  const [damagePool, setDamagePool] = useState<DieType[]>([]);

  // Shared
  const [modifier, setModifier] = useState(0);

  // Live roll state — a flat record keyed by die id
  const [dieStates, setDieStates] = useState<Record<string, DieState>>({});
  const [throws, setThrows] = useState<Record<string, SceneDie["throw"]>>({});
  // Final resting poses, written on settle. Published to OBR metadata by the
  // sender so receivers can snap out of physics when the roll ends.
  const [transforms, setTransforms] = useState<Record<string, DiceTransform>>({});
  const [rolling, setRolling] = useState(false);

  // Current roll descriptor — becomes the broadcast `roll` object. Null when idle.
  const [currentRoll, setCurrentRoll] = useState<SavageRoll | null>(null);

  // OBR player identity (null outside OBR — dev mode)
  const playerInfo = usePlayerInfo();

  const aceTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const clearAceTimers = useCallback(() => {
    Object.values(aceTimersRef.current).forEach(clearTimeout);
    aceTimersRef.current = {};
  }, []);

  const resetResults = useCallback(() => {
    clearAceTimers();
    setDieStates({});
    setThrows({});
    setTransforms({});
    setCurrentRoll(null);
    setRolling(false);
  }, [clearAceTimers]);

  const handleRoll = useCallback(() => {
    resetResults();

    const plan: DieState[] = [];
    if (mode === "trait") {
      plan.push({
        id: "trait",
        dieType: selectedDie,
        style: TRAIT_STYLE,
        region: wildCard ? "left" : "full",
        role: "trait",
        chain: [],
        done: false,
      });
      if (wildCard) {
        plan.push({
          id: "wild",
          dieType: "d6",
          style: WILD_STYLE,
          region: "right",
          role: "wild",
          chain: [],
          done: false,
        });
      }
    } else {
      damagePool.forEach((die, i) => {
        plan.push({
          id: `dmg-${i}`,
          dieType: die,
          style: DAMAGE_STYLE,
          region: i % 2 === 0 ? "left" : "right",
          role: "damage",
          chain: [],
          done: false,
        });
      });
    }

    if (plan.length === 0) return;

    const nextStates: Record<string, DieState> = {};
    const nextThrows: Record<string, SceneDie["throw"]> = {};
    plan.forEach((d) => {
      nextStates[d.id] = d;
      nextThrows[d.id] = randomThrow(d.region);
    });
    setDieStates(nextStates);
    setThrows(nextThrows);
    setRolling(true);

    // Build the broadcast descriptor. playerInfo is null outside OBR (local dev) —
    // DiceRollSync short-circuits if OBR isn't available, so placeholder values
    // here are fine and never actually hit the network.
    const broadcastDice: SavageDie[] = plan.map((d) => ({
      id: d.id,
      type: d.dieType,
      role: d.role,
      style: d.style,
    }));
    setCurrentRoll({
      rollId: typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      playerId: playerInfo?.id ?? "local",
      playerName: playerInfo?.name ?? "Local",
      playerColor: playerInfo?.color ?? "#888888",
      mode,
      modifier,
      wildCard,
      dice: broadcastDice,
      timestamp: Date.now(),
    });
  }, [mode, selectedDie, wildCard, damagePool, modifier, playerInfo, resetResults]);

  const handleResult = useCallback((id: string, value: number, transform: DiceTransform) => {
    setTransforms((prev) => ({ ...prev, [id]: transform }));
    setDieStates((prev) => {
      const die = prev[id];
      if (!die) return prev;
      const normalised = normaliseFaceValue(die.dieType, value);
      const newChain = [...die.chain, normalised];
      const isAce = normalised === sidesOf(die.dieType);
      const updated: DieState = { ...die, chain: newChain, done: !isAce };

      if (isAce) {
        const delay = ACE_DELAY_MS + Math.random() * ACE_JITTER_MS;
        aceTimersRef.current[id] = setTimeout(() => {
          setThrows((t) => ({ ...t, [id]: randomThrow(die.region) }));
        }, delay);
      }

      return { ...prev, [id]: updated };
    });
  }, []);

  // Stop rolling once every die is done
  useEffect(() => {
    if (!rolling) return;
    const all = Object.values(dieStates);
    if (all.length === 0) return;
    if (all.every((d) => d.done)) setRolling(false);
  }, [rolling, dieStates]);

  useEffect(() => () => clearAceTimers(), [clearAceTimers]);

  // Build the SceneDie array for the canvas
  const sceneDice: SceneDie[] = useMemo(() => {
    return Object.values(dieStates)
      .filter((d) => throws[d.id])
      .map((d) => ({
        id: d.id,
        dieType: d.dieType,
        style: d.style,
        tint: d.tint,
        throw: throws[d.id],
      }));
  }, [dieStates, throws]);

  // Chains + done flags, derived from dieStates, for broadcast.
  // Memoised so DiceRollSync's effect only re-fires when values actually change.
  const rollChains = useMemo(() => {
    const out: Record<string, number[]> = {};
    for (const [id, d] of Object.entries(dieStates)) out[id] = d.chain;
    return out;
  }, [dieStates]);

  const rollDone = useMemo(() => {
    const out: Record<string, boolean> = {};
    for (const [id, d] of Object.entries(dieStates)) out[id] = d.done;
    return out;
  }, [dieStates]);

  // Totals
  const traitState = dieStates["trait"];
  const wildState = dieStates["wild"];
  const damageStates = Object.keys(dieStates)
    .filter((id) => id.startsWith("dmg-"))
    .sort()
    .map((id) => dieStates[id]);

  const traitTotal = traitState ? traitState.chain.reduce((a, b) => a + b, 0) + modifier : 0;
  const wildTotal = wildState ? wildState.chain.reduce((a, b) => a + b, 0) + modifier : 0;
  const damageTotal =
    damageStates.reduce((sum, d) => sum + d.chain.reduce((a, b) => a + b, 0), 0) + modifier;

  const traitDone = traitState?.done ?? false;
  const wildDone = wildState?.done ?? false;
  const damageDone = damageStates.length > 0 && damageStates.every((d) => d.done);

  const bestTrait =
    mode === "trait" && traitDone && (!wildCard || wildDone)
      ? wildCard && wildTotal > traitTotal ? "wild" : "trait"
      : null;

  const rollLabel = useMemo(() => {
    const modStr = modifier === 0 ? "" : modifier > 0 ? `+${modifier}` : `${modifier}`;
    if (mode === "trait") {
      return `Roll ${selectedDie.toUpperCase()}${wildCard ? " + Wild" : ""}${modStr}`;
    }
    if (damagePool.length === 0) return "Add damage dice";
    const grouped: Record<string, number> = {};
    damagePool.forEach((d) => { grouped[d] = (grouped[d] || 0) + 1; });
    const parts = Object.entries(grouped).map(([d, n]) => (n > 1 ? `${n}${d}` : d));
    return `Roll ${parts.join("+")}${modStr}`;
  }, [mode, selectedDie, wildCard, damagePool, modifier]);

  const canRoll = !rolling && (mode === "trait" || damagePool.length > 0);

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      background: "#1a1a2e",
      color: "#fff",
      fontFamily: "system-ui, sans-serif",
    }}>
      {/* Invisible — publishes roll state to OBR player metadata */}
      <DiceRollSync
        roll={currentRoll}
        throws={throws}
        chains={rollChains}
        done={rollDone}
        transforms={transforms}
      />

      {/* 3D canvas */}
      <div style={{ flex: 1, position: "relative" }}>
        <DiceScene dice={sceneDice} onResult={handleResult} />
        <div style={{
          position: "absolute",
          bottom: 4,
          right: 6,
          fontSize: "9px",
          color: "#5a5a70",
          letterSpacing: 0.3,
          pointerEvents: "none",
          userSelect: "none",
        }}>
          v{VERSION}
        </div>
      </div>

      {/* Mode tabs */}
      <div style={{ display: "flex", borderTop: "1px solid #2a2a4a" }}>
        {(["trait", "damage"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); resetResults(); }}
            style={{
              flex: 1,
              padding: "8px 0",
              background: mode === m ? "#1a1a2e" : "#12122a",
              color: mode === m ? "#e8c84a" : "#888",
              border: "none",
              borderBottom: mode === m ? "2px solid #e8c84a" : "2px solid transparent",
              fontWeight: 700,
              fontSize: "12px",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              cursor: "pointer",
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Die row — behaviour depends on mode */}
      <div style={{
        display: "flex",
        gap: "6px",
        padding: "8px 12px",
      }}>
        {DIE_TYPES.map((die) => {
          const isSelected = mode === "trait" && selectedDie === die;
          return (
            <button
              key={die}
              onClick={() => {
                if (mode === "trait") {
                  setSelectedDie(die);
                  resetResults();
                } else {
                  setDamagePool((p) => [...p, die]);
                  resetResults();
                }
              }}
              style={{
                flex: 1,
                padding: "6px 0",
                background: isSelected ? "#e8c84a" : "#2a2a4a",
                color: isSelected ? "#1a1a2e" : "#aaa",
                border: "none",
                borderRadius: "4px",
                fontWeight: 700,
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              {die.toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* Mode-specific row: Wild Card toggle OR damage pool */}
      {mode === "trait" ? (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "4px 12px 6px",
          fontSize: "12px",
        }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={wildCard}
              onChange={(e) => { setWildCard(e.target.checked); resetResults(); }}
            />
            Wild Card (+ d6 Wild Die)
          </label>
        </div>
      ) : (
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "4px",
          padding: "4px 12px 6px",
          minHeight: "28px",
          alignItems: "center",
          fontSize: "11px",
        }}>
          {damagePool.length === 0 && (
            <span style={{ color: "#888" }}>Tap a die above to add it to the damage pool</span>
          )}
          {damagePool.map((die, idx) => (
            <button
              key={idx}
              onClick={() => {
                setDamagePool((p) => p.filter((_, i) => i !== idx));
                resetResults();
              }}
              title="Remove"
              style={{
                padding: "3px 8px",
                background: "#2a2a4a",
                color: "#c8c8d4",
                border: "1px solid #3a3a5a",
                borderRadius: "999px",
                fontWeight: 700,
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              {die.toUpperCase()} ×
            </button>
          ))}
          {damagePool.length > 0 && (
            <button
              onClick={() => { setDamagePool([]); resetResults(); }}
              style={{
                padding: "3px 8px",
                background: "transparent",
                color: "#888",
                border: "none",
                fontSize: "11px",
                cursor: "pointer",
                marginLeft: "auto",
              }}
            >
              clear
            </button>
          )}
        </div>
      )}

      {/* Modifier row */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 12px",
        borderTop: "1px solid #2a2a4a",
      }}>
        <span style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: 0.5, width: "32px" }}>
          Mod
        </span>
        <button onClick={() => setModifier((m) => m - 1)} style={modBtnStyle}>−</button>
        <div style={{
          minWidth: "40px",
          textAlign: "center",
          fontSize: "18px",
          fontWeight: 700,
          color: modifier === 0 ? "#888" : "#e8c84a",
        }}>
          {modifier > 0 ? `+${modifier}` : modifier}
        </div>
        <button onClick={() => setModifier((m) => m + 1)} style={modBtnStyle}>+</button>
        {modifier !== 0 && (
          <button onClick={() => setModifier(0)} style={{ ...modBtnStyle, marginLeft: "auto", width: "auto", padding: "4px 10px", fontSize: "11px" }}>
            reset
          </button>
        )}
      </div>

      {/* Roll button + result */}
      <div style={{
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        borderTop: "1px solid #2a2a4a",
        minHeight: "62px",
      }}>
        <button
          onClick={handleRoll}
          disabled={!canRoll}
          style={{
            padding: "10px 16px",
            background: canRoll ? "#e8c84a" : "#444",
            color: canRoll ? "#1a1a2e" : "#aaa",
            border: "none",
            borderRadius: "6px",
            fontWeight: 700,
            fontSize: "13px",
            cursor: canRoll ? "pointer" : "not-allowed",
            whiteSpace: "nowrap",
          }}
        >
          {rolling ? "Rolling..." : rollLabel}
        </button>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {mode === "trait" && traitState && (
            <ResultChip
              label={selectedDie.toUpperCase()}
              chain={traitState.chain}
              total={traitTotal}
              modifier={modifier}
              colour={TRAIT_COLOUR}
              highlighted={bestTrait === "trait"}
              aced={!traitState.done}
            />
          )}
          {mode === "trait" && wildCard && wildState && (
            <ResultChip
              label="Wild"
              chain={wildState.chain}
              total={wildTotal}
              modifier={modifier}
              colour={WILD_COLOUR}
              highlighted={bestTrait === "wild"}
              aced={!wildState.done}
            />
          )}
          {mode === "damage" && damageStates.length > 0 && (
            <DamageChip
              states={damageStates}
              total={damageTotal}
              modifier={modifier}
              done={damageDone}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const modBtnStyle: React.CSSProperties = {
  width: "32px",
  height: "28px",
  background: "#2a2a4a",
  color: "#e8c84a",
  border: "none",
  borderRadius: "4px",
  fontWeight: 700,
  fontSize: "16px",
  cursor: "pointer",
};

function ResultChip({
  label,
  chain,
  total,
  modifier,
  colour,
  highlighted,
  aced,
}: {
  label: string;
  chain: number[];
  total: number;
  modifier: number;
  colour: string;
  highlighted: boolean;
  aced: boolean;
}) {
  const chainText = chain.length > 1 ? chain.join("+") : null;
  const modText = modifier === 0 ? "" : modifier > 0 ? ` +${modifier}` : ` ${modifier}`;
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      lineHeight: 1.1,
      opacity: highlighted ? 1 : 0.6,
      border: highlighted ? `2px solid ${colour}` : "2px solid transparent",
      borderRadius: "6px",
      padding: "2px 8px",
    }}>
      <div style={{ fontSize: "10px", color: "#aaa", textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}{aced ? " · acing" : ""}
      </div>
      <div style={{ fontSize: "22px", fontWeight: 700, color: colour }}>
        {total}
      </div>
      {(chainText || modText) && (
        <div style={{ fontSize: "10px", color: "#ccc", marginTop: 1 }}>
          {chainText ?? chain[0] ?? ""}{modText}
        </div>
      )}
    </div>
  );
}

function DamageChip({
  states,
  total,
  modifier,
  done,
}: {
  states: DieState[];
  total: number;
  modifier: number;
  done: boolean;
}) {
  const anyAcing = states.some((s) => !s.done);
  const modText = modifier === 0 ? "" : modifier > 0 ? ` +${modifier}` : ` ${modifier}`;
  const breakdown = states
    .map((s) => s.chain.length > 1 ? `${s.dieType}:${s.chain.join("+")}` : `${s.dieType}:${s.chain[0] ?? "?"}`)
    .join(" ");

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      lineHeight: 1.1,
      border: done ? `2px solid ${DAMAGE_COLOUR}` : "2px solid transparent",
      borderRadius: "6px",
      padding: "2px 8px",
    }}>
      <div style={{ fontSize: "10px", color: "#aaa", textTransform: "uppercase", letterSpacing: 0.5 }}>
        Damage{anyAcing ? " · acing" : ""}
      </div>
      <div style={{ fontSize: "22px", fontWeight: 700, color: DAMAGE_COLOUR }}>
        {total}
      </div>
      <div style={{ fontSize: "10px", color: "#ccc", marginTop: 1 }}>
        {breakdown}{modText}
      </div>
    </div>
  );
}
