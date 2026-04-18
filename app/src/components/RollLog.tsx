import { useEffect, useMemo, useState } from "react";
import type { SavageRoll, RollChains } from "../lib/types";
import type { RemoteRoll } from "../lib/usePlayerDice";
import type { PlayerInfo } from "../lib/usePlayerInfo";
import type { DieType } from "../meshes/DiceMesh";
import { theme } from "../lib/theme";

const MAX_ENTRIES = 50;

interface DieStateLike {
  id: string;
  dieType: DieType;
  chain: number[];
  done: boolean;
}

interface Entry {
  id: string;           // roll id, dedupe key
  playerName: string;
  playerColor: string;
  label: string;        // "Trait 7" / "Damage 12"
  detail: string;       // "D6 + Wild" / "D8 + D10"
  isOwn: boolean;
  timestamp: number;
}

interface Props {
  currentRoll: SavageRoll | null;
  myDieStates: Record<string, DieStateLike>;
  remoteRolls: RemoteRoll[];
  playerInfo: PlayerInfo | null;
}

export function RollLog({ currentRoll, myDieStates, remoteRolls, playerInfo }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);

  // Completion check for my own roll — all dice in dieStates marked done.
  const myComplete = useMemo(() => {
    if (!currentRoll) return false;
    const vals = Object.values(myDieStates);
    return vals.length > 0 && vals.every((d) => d.done);
  }, [currentRoll, myDieStates]);

  useEffect(() => {
    setEntries((prev) => {
      const have = new Set(prev.map((e) => e.id));
      const add: Entry[] = [];

      if (currentRoll && myComplete && !have.has(currentRoll.rollId)) {
        add.push({
          id: currentRoll.rollId,
          playerName: playerInfo?.name ?? "You",
          playerColor: playerInfo?.color ?? "#888888",
          label: labelFromMine(currentRoll, myDieStates),
          detail: detailFromMine(currentRoll, myDieStates),
          isOwn: true,
          timestamp: currentRoll.timestamp,
        });
      }

      for (const r of remoteRolls) {
        if (!r.finishedRolling) continue;
        if (have.has(r.roll.rollId)) continue;
        add.push({
          id: r.roll.rollId,
          playerName: r.player.name,
          playerColor: r.player.color,
          label: r.roll.hidden ? "Hidden roll" : labelFromRemote(r.roll, r.chains),
          detail: r.roll.hidden ? "—" : detailFromRemote(r.roll),
          isOwn: false,
          timestamp: r.roll.timestamp,
        });
      }

      if (add.length === 0) return prev;
      return [...add, ...prev].slice(0, MAX_ENTRIES);
    });
  }, [currentRoll, myComplete, myDieStates, remoteRolls, playerInfo]);

  return (
    <div
      style={{
        height: 170,                 // fixed — reserves room for ~5 rows regardless of content count
        overflowY: "auto",
        borderTop: `1px solid ${theme.surfaceHi}`,
        background: theme.surface,
      }}
    >
      {entries.length === 0 ? (
        <div
          style={{
            padding: "16px 10px",
            fontSize: 13,
            color: theme.textDimmer,
            textAlign: "center",
            letterSpacing: 0.3,
          }}
        >
          No rolls yet
        </div>
      ) : (
        entries.map((e) => <LogRow key={e.id} entry={e} />)
      )}
    </div>
  );
}

function LogRow({ entry }: { entry: Entry }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 10px",
        borderBottom: `1px solid ${theme.surfaceHi}`,
        fontSize: 14,
        lineHeight: 1.3,
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          background: entry.playerColor,
          borderRadius: "50%",
          flexShrink: 0,
        }}
      />
      <span style={{ fontWeight: 600, color: theme.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {entry.playerName}
      </span>
      <span style={{ color: theme.primaryHi, fontWeight: 600 }}>{entry.label}</span>
      <span style={{ color: theme.textDim, fontSize: 12, marginLeft: "auto", flexShrink: 0 }}>
        {entry.detail}
      </span>
    </div>
  );
}

// ---- label/detail builders ----

function chainSum(chains: RollChains, id: string): number {
  return (chains[id] ?? []).reduce((a, b) => a + b, 0);
}

function labelFromRemote(roll: SavageRoll, chains: RollChains): string {
  const label = roll.mode === "trait" ? "Trait" : "Damage";
  if (roll.mode === "trait") {
    const traitTotal = chainSum(chains, "trait") + roll.modifier;
    const wildTotal = roll.wildCard ? chainSum(chains, "wild") + roll.modifier : traitTotal;
    return `${label} ${Math.max(traitTotal, wildTotal)}`;
  }
  const total = roll.dice.reduce((s, d) => s + chainSum(chains, d.id), 0) + roll.modifier;
  return `${label} ${total}`;
}

function detailFromRemote(roll: SavageRoll): string {
  if (roll.mode === "trait") {
    const trait = roll.dice.find((d) => d.role === "trait");
    const wild = roll.wildCard ? " + Wild" : "";
    return `${(trait?.type ?? "d6").toUpperCase()}${wild}${modString(roll.modifier)}`;
  }
  // damage — group by die type
  const counts: Record<string, number> = {};
  for (const d of roll.dice) counts[d.type] = (counts[d.type] ?? 0) + 1;
  const parts = Object.entries(counts).map(([t, n]) => (n > 1 ? `${n}${t.toUpperCase()}` : t.toUpperCase()));
  return `${parts.join(" + ")}${modString(roll.modifier)}`;
}

function labelFromMine(roll: SavageRoll, dieStates: Record<string, DieStateLike>): string {
  const label = roll.mode === "trait" ? "Trait" : "Damage";
  const sumChain = (id: string) => (dieStates[id]?.chain ?? []).reduce((a, b) => a + b, 0);
  if (roll.mode === "trait") {
    const traitTotal = sumChain("trait") + roll.modifier;
    const wildTotal = roll.wildCard ? sumChain("wild") + roll.modifier : traitTotal;
    return `${label} ${Math.max(traitTotal, wildTotal)}`;
  }
  const total = Object.values(dieStates).reduce(
    (s, d) => s + d.chain.reduce((a, b) => a + b, 0),
    0,
  ) + roll.modifier;
  return `${label} ${total}`;
}

function detailFromMine(roll: SavageRoll, _dieStates: Record<string, DieStateLike>): string {
  // Same as remote — roll.dice already reflects what was rolled
  return detailFromRemote(roll);
}

function modString(m: number): string {
  if (m === 0) return "";
  return m > 0 ? ` +${m}` : ` ${m}`;
}
