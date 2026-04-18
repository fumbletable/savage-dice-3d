import { DICE_STYLES, DICE_STYLE_LABELS } from "../materials/DiceMaterial";
import type { DiceStyle } from "../materials/DiceMaterial";
import { theme } from "../lib/theme";

interface Props {
  main: DiceStyle;
  wild: DiceStyle;
  onMainChange: (s: DiceStyle) => void;
  onWildChange: (s: DiceStyle) => void;
}

/**
 * Settings panel — dice pack selection. Two pulldowns, no preview.
 * Main pack covers trait + damage dice; wild die stays its own pack so it
 * reads as visually distinct (SWADE convention).
 */
export function SettingsPanel({ main, wild, onMainChange, onWildChange }: Props) {
  return (
    <div
      style={{
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        fontSize: 13,
      }}
    >
      <Row label="Main dice" value={main} onChange={onMainChange} />
      <Row label="Wild die" value={wild} onChange={onWildChange} />
      <div style={{ fontSize: 11, color: theme.textDim, lineHeight: 1.5, marginTop: 4 }}>
        Applies to rolls you make on this browser. Other players see their own
        chosen packs.
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  onChange,
}: {
  label: string;
  value: DiceStyle;
  onChange: (s: DiceStyle) => void;
}) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span
        style={{
          width: 72,
          fontSize: 11,
          color: theme.textDim,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as DiceStyle)}
        style={{
          flex: 1,
          padding: "6px 8px",
          background: theme.surface,
          color: theme.text,
          border: `1px solid ${theme.surfaceHi}`,
          borderRadius: theme.radius,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        {DICE_STYLES.map((s) => (
          <option key={s} value={s}>
            {DICE_STYLE_LABELS[s]}
          </option>
        ))}
      </select>
    </label>
  );
}
