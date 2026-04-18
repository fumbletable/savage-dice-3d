import OBR from "@owlbear-rodeo/sdk";
import { useEffect, useState } from "react";

export interface PlayerInfo {
  id: string;
  name: string;
  color: string;
}

/** Current OBR player identity, null when not embedded in OBR (local dev). */
export function usePlayerInfo(): PlayerInfo | null {
  const [info, setInfo] = useState<PlayerInfo | null>(null);

  useEffect(() => {
    if (!OBR.isAvailable) return;
    let mounted = true;
    let unsub: (() => void) | undefined;

    const setup = async () => {
      // OBR.player.onChange before ready throws "Unable to send message: not ready".
      // Do the initial fetch AND the subscribe after onReady resolves.
      if (!OBR.isReady) {
        await new Promise<void>((resolve) => OBR.onReady(() => resolve()));
      }
      if (!mounted) return;

      const [name, color] = await Promise.all([
        OBR.player.getName(),
        OBR.player.getColor(),
      ]);
      if (!mounted) return;
      setInfo({ id: OBR.player.id, name, color });

      unsub = OBR.player.onChange((player) => {
        setInfo({ id: player.id, name: player.name, color: player.color });
      });
    };
    setup();

    return () => {
      mounted = false;
      unsub?.();
    };
  }, []);

  return info;
}
