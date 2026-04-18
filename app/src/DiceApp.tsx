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
import { useRemoteRolls } from "./lib/usePlayerDice";
import { usePackPreferences } from "./lib/usePackPreferences";
import { RemoteTrays } from "./components/RemoteTrays";
import { RollLog } from "./components/RollLog";
import { SettingsPanel } from "./components/SettingsPanel";
import { theme } from "./lib/theme";
import { VERSION } from "./version";

const DIE_TYPES: DieType[] = ["d4", "d6", "d8", "d10", "d12"];
const ACE_DELAY_MS = 450;
const ACE_JITTER_MS = 250; // stops simultaneous aces from re-throwing in the same frame

// Accent colours used in UI chips (not the die surface)
const TRAIT_COLOUR = theme.trait;
const WILD_COLOUR = theme.wild;
const DAMAGE_COLOUR = theme.damage;

type Mode = "trait" | "damage" | "settings";

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

  // Other players' active rolls. Empty outside OBR.
  const remoteRolls = useRemoteRolls(playerInfo?.id);

  // Dice pack preferences — persisted to localStorage.
  const { prefs: packs, setMain: setMainPack, setWild: setWildPack } = usePackPreferences();

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
        style: packs.main,
        region: wildCard ? "left" : "full",
        role: "trait",
        chain: [],
        done: false,
      });
      if (wildCard) {
        plan.push({
          id: "wild",
          dieType: "d6",
          style: packs.wild,
          region: "right",
          role: "wild",
          chain: [],
          done: false,
        });
      }
    } else if (mode === "damage") {
      damagePool.forEach((die, i) => {
        plan.push({
          id: `dmg-${i}`,
          dieType: die,
          style: packs.main,
          region: i % 2 === 0 ? "left" : "right",
          role: "damage",
          chain: [],
          done: false,
        });
      });
    }

    if (plan.length === 0) return;
    // Narrow — the only way we've populated `plan` is via trait or damage
    // branches; settings mode produces an empty plan and early-returns above.
    if (mode === "settings") return;

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
  }, [mode, selectedDie, wildCard, damagePool, modifier, playerInfo, packs, resetResults]);

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

  // My own dice in the main tray. Remote players get their own mini-trays
  // via <RemoteTrays/> so concurrent rolls don't collide in the physics sim
  // or pile up visually when I switch modes.
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
      background: theme.bg,
      color: theme.text,
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: 14,
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
        <RemoteTrays rolls={remoteRolls} />
        <div style={{
          position: "absolute",
          bottom: 4,
          right: 6,
          fontSize: "9px",
          color: theme.textDimmer,
          letterSpacing: 0.3,
          pointerEvents: "none",
          userSelect: "none",
          zIndex: 20,
        }}>
          v{VERSION}
        </div>
      </div>

      {/* Mode tabs */}
      <div style={{ display: "flex", borderTop: `1px solid ${theme.surfaceHi}` }}>
        {(["trait", "damage", "settings"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              // Only reset in-progress dice when switching between real roll
              // modes — going to/from settings shouldn't nuke the current tumble.
              const bothRollModes = m !== "settings" && mode !== "settings";
              if (bothRollModes && mode !== m) resetResults();
              setMode(m);
            }}
            style={{
              flex: m === "settings" ? 0.6 : 1,
              padding: "8px 0",
              background: mode === m ? theme.bg : theme.surface,
              color: mode === m ? theme.primaryHi : theme.textDim,
              border: "none",
              borderBottom: mode === m ? `2px solid ${theme.primaryHi}` : "2px solid transparent",
              fontWeight: 600,
              fontSize: "12px",
              textTransform: "uppercase",
              letterSpacing: 0.8,
              cursor: "pointer",
            }}
            title={m === "settings" ? "Dice pack settings" : undefined}
          >
            {m === "settings" ? "⚙" : m}
          </button>
        ))}
      </div>

      {mode === "settings" ? (
        <SettingsPanel
          main={packs.main}
          wild={packs.wild}
          onMainChange={setMainPack}
          onWildChange={setWildPack}
        />
      ) : (
        <>
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
                background: isSelected ? theme.primary : theme.button,
                color: isSelected ? theme.text : theme.textMuted,
                border: `1px solid ${isSelected ? theme.primaryHi : theme.surfaceHi}`,
                borderRadius: theme.radius,
                fontWeight: 600,
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
          color: theme.textMuted,
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
            <span style={{ color: theme.textDim }}>Tap a die above to add it to the damage pool</span>
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
                background: theme.surface,
                color: theme.text,
                border: `1px solid ${theme.surfaceHi}`,
                borderRadius: 999,
                fontWeight: 600,
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
                color: theme.textDim,
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
        borderTop: `1px solid ${theme.surfaceHi}`,
      }}>
        <span style={{ fontSize: "10px", color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, width: "32px", fontWeight: 600 }}>
          Mod
        </span>
        <button onClick={() => setModifier((m) => m - 1)} style={modBtnStyle}>−</button>
        <div style={{
          minWidth: "40px",
          textAlign: "center",
          fontSize: "18px",
          fontWeight: 700,
          color: modifier === 0 ? theme.textDim : theme.primaryHi,
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
        borderTop: `1px solid ${theme.surfaceHi}`,
        minHeight: "62px",
      }}>
        <button
          onClick={handleRoll}
          disabled={!canRoll}
          style={{
            padding: "10px 16px",
            background: canRoll ? theme.primary : theme.button,
            color: canRoll ? theme.text : theme.textDim,
            border: `1px solid ${canRoll ? theme.primaryHi : theme.surfaceHi}`,
            borderRadius: theme.radius,
            fontWeight: 600,
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
        </>
      )}

      {/* Recent rolls log */}
      <RollLog
        currentRoll={currentRoll}
        myDieStates={dieStates}
        remoteRolls={remoteRolls}
        playerInfo={playerInfo}
      />
    </div>
  );
}

const modBtnStyle: React.CSSProperties = {
  width: "32px",
  height: "28px",
  background: theme.button,
  color: theme.text,
  border: `1px solid ${theme.surfaceHi}`,
  borderRadius: theme.radius,
  fontWeight: 600,
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
      opacity: highlighted ? 1 : 0.55,
      border: highlighted ? `1px solid ${colour}` : `1px solid transparent`,
      borderRadius: theme.radius,
      padding: "2px 8px",
    }}>
      <div style={{ fontSize: "10px", color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 }}>
        {label}{aced ? " · acing" : ""}
      </div>
      <div style={{ fontSize: "22px", fontWeight: 700, color: colour }}>
        {total}
      </div>
      {(chainText || modText) && (
        <div style={{ fontSize: "10px", color: theme.textMuted, marginTop: 1 }}>
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
      border: done ? `1px solid ${DAMAGE_COLOUR}` : `1px solid transparent`,
      borderRadius: theme.radius,
      padding: "2px 8px",
    }}>
      <div style={{ fontSize: "10px", color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 }}>
        Damage{anyAcing ? " · acing" : ""}
      </div>
      <div style={{ fontSize: "22px", fontWeight: 700, color: DAMAGE_COLOUR }}>
        {total}
      </div>
      <div style={{ fontSize: "10px", color: theme.textMuted, marginTop: 1 }}>
        {breakdown}{modText}
      </div>
    </div>
  );
}
