import { useCallback, useEffect, useState } from "react";
import { RemoteTray } from "./RemoteTray";
import type { RemoteRoll } from "../lib/usePlayerDice";

interface Props {
  rolls: RemoteRoll[];
}

/**
 * Corner stack of remote-player roll trays. Each tray auto-dismisses itself
 * N seconds after its roll settles; clicking the × also removes it. A new
 * rollId for a player they've dismissed brings back that player's tray.
 */
export function RemoteTrays({ rolls }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Two jobs:
  //  - Prune dismissed entries whose rolls are no longer in flight (player
  //    cleared metadata or new rollId arrived). Stops the set growing forever.
  //  - Auto-dismiss all non-latest rolls so an older player's tray doesn't
  //    resurface when the newer player's tray auto-dismisses after settle.
  useEffect(() => {
    const live = new Set(rolls.map((r) => r.roll.rollId));
    let latestId = "";
    let latestTs = -Infinity;
    for (const r of rolls) {
      if (r.roll.timestamp > latestTs) {
        latestTs = r.roll.timestamp;
        latestId = r.roll.rollId;
      }
    }

    setDismissed((prev) => {
      const next = new Set<string>();
      let changed = false;
      for (const id of prev) {
        if (live.has(id)) next.add(id);
        else changed = true;
      }
      for (const r of rolls) {
        if (r.roll.rollId !== latestId && !next.has(r.roll.rollId)) {
          next.add(r.roll.rollId);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [rolls]);

  const dismiss = useCallback((rollId: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(rollId);
      return next;
    });
  }, []);

  // With up to 5-player games, stacking mini-trays overflows the popover.
  // We show only the MOST RECENT remote roll — newer rolls visually replace
  // older ones. Every roll still lands in the log below, so nothing is lost.
  const latest = rolls
    .filter((r) => !dismissed.has(r.roll.rollId))
    .reduce<typeof rolls[number] | null>(
      (acc, r) => (acc && acc.roll.timestamp >= r.roll.timestamp ? acc : r),
      null,
    );

  if (!latest) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 8,
        right: 8,
        pointerEvents: "auto",
        zIndex: 10,
      }}
    >
      <RemoteTray
        key={latest.roll.rollId}
        roll={latest}
        onDismiss={() => dismiss(latest.roll.rollId)}
      />
    </div>
  );
}
