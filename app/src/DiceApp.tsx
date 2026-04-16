import { useState, useCallback } from "react";
import { DiceScene } from "./components/DiceScene";
import type { DieThrow } from "./components/PhysicsDie";
import type { DieType } from "./meshes/DiceMesh";
import { randomThrow } from "./lib/throw";

const DIE_TYPES: DieType[] = ["d4", "d6", "d8", "d10", "d12"];

export function DiceApp() {
  const [selectedDie, setSelectedDie] = useState<DieType>("d6");
  const [dieThrow, setDieThrow] = useState<DieThrow | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);

  const handleRoll = useCallback(() => {
    setResult(null);
    setRolling(true);
    setDieThrow(randomThrow());
  }, []);

  const handleResult = useCallback((value: number) => {
    setResult(value);
    setRolling(false);
  }, []);

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
      {/* 3D canvas */}
      <div style={{ flex: 1, position: "relative" }}>
        <DiceScene dieType={selectedDie} dieThrow={dieThrow} onResult={handleResult} />
      </div>

      {/* Die selector */}
      <div style={{
        display: "flex",
        gap: "6px",
        padding: "8px 12px",
        borderTop: "1px solid #2a2a4a",
      }}>
        {DIE_TYPES.map((die) => (
          <button
            key={die}
            onClick={() => { setSelectedDie(die); setResult(null); }}
            style={{
              flex: 1,
              padding: "6px 0",
              background: selectedDie === die ? "#e8c84a" : "#2a2a4a",
              color: selectedDie === die ? "#1a1a2e" : "#aaa",
              border: "none",
              borderRadius: "4px",
              fontWeight: 700,
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            {die.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Roll button + result */}
      <div style={{
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        borderTop: "1px solid #2a2a4a",
      }}>
        <button
          onClick={handleRoll}
          disabled={rolling}
          style={{
            padding: "8px 20px",
            background: rolling ? "#444" : "#e8c84a",
            color: rolling ? "#aaa" : "#1a1a2e",
            border: "none",
            borderRadius: "6px",
            fontWeight: 700,
            fontSize: "14px",
            cursor: rolling ? "not-allowed" : "pointer",
          }}
        >
          {rolling ? "Rolling..." : `Roll ${selectedDie.toUpperCase()}`}
        </button>

        {result !== null && (
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#e8c84a" }}>
            {result}
          </div>
        )}
      </div>
    </div>
  );
}
