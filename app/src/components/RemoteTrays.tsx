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

  // Prune dismissed set when remote rolls actually go away (player cleared
  // their metadata or new rollId arrived). Keeps the set from growing forever.
  useEffect(() => {
    const live = new Set(rolls.map((r) => r.roll.rollId));
    setDismissed((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (live.has(id)) next.add(id);
        else changed = true;
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

  const visible = rolls.filter((r) => !dismissed.has(r.roll.rollId));
  if (visible.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 8,
        right: 8,
        display: "flex",
        flexDirection: "column-reverse", // newest nearest the controls
        gap: 8,
        pointerEvents: "none", // let the main tray receive events
        zIndex: 10,
      }}
    >
      {visible.map((roll) => (
        <div key={roll.roll.rollId} style={{ pointerEvents: "auto" }}>
          <RemoteTray roll={roll} onDismiss={() => dismiss(roll.roll.rollId)} />
        </div>
      ))}
    </div>
  );
}
