/**
 * DotMatrix — Aeva OS signature number display.
 *
 * Renders any string of digits (and ":") as a 5×7 LED dot-matrix.
 * The glow on lit dots is the defining visual fingerprint of Aeva OS.
 *
 * Props:
 *   value     — string or number to display (digits + ":" only)
 *   color     — lit dot colour  (default: inherit accent via CSS var)
 *   dimColor  — unlit dot colour
 *   dotSize   — px size of each dot (default: --aeva-dot-size → 8)
 *   gap       — px gap between dots  (default: --aeva-dot-gap  → 2)
 *
 * Usage:
 *   <DotMatrix value="42" color="#A5B4FC" dimColor="rgba(255,255,255,0.04)" />
 */

/* ─────────────────────────────────────────────────────
   5 cols × 7 rows LED digit map  (1 = lit dot)
───────────────────────────────────────────────────── */
export const DOT_DIGITS = {
  '0': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  '1': [[0,0,1,0,0],[0,1,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,1,1,1,0]],
  '2': [[0,1,1,1,0],[1,0,0,0,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,1,1,1,1]],
  '3': [[1,1,1,1,0],[0,0,0,0,1],[0,0,0,0,1],[0,1,1,1,0],[0,0,0,0,1],[0,0,0,0,1],[1,1,1,1,0]],
  '4': [[0,0,0,1,0],[0,0,1,1,0],[0,1,0,1,0],[1,0,0,1,0],[1,1,1,1,1],[0,0,0,1,0],[0,0,0,1,0]],
  '5': [[1,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[0,0,0,0,1],[0,0,0,0,1],[1,1,1,1,0]],
  '6': [[0,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  '7': [[1,1,1,1,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
  '8': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  '9': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,1],[0,0,0,0,1],[0,0,0,0,1],[0,1,1,1,0]],
  ':': [[0],[0],[1],[0],[1],[0],[0]],
  '%': [[1,0,0,0,1],[1,0,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,1,0,0,0],[0,1,0,0,1],[1,0,0,0,1]],
}

export function DotMatrix({
  value,
  dotSize = 8,
  gap = 2,
  color = 'rgba(255,255,255,0.94)',
  dimColor = 'rgba(255,255,255,0.04)',
}) {
  const chars = String(value).split('')
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: gap * 4 }}>
      {chars.map((ch, ci) => {
        const pattern = DOT_DIGITS[ch]
        if (!pattern) return null
        const cols = pattern[0].length
        return (
          <div
            key={ci}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, ${dotSize}px)`,
              gap: `${gap}px`,
            }}
          >
            {pattern.flat().map((on, pi) => (
              <div
                key={pi}
                style={{
                  width: dotSize,
                  height: dotSize,
                  borderRadius: '50%',
                  background: on ? color : dimColor,
                  boxShadow: on
                    ? `0 0 ${dotSize * 1.6}px ${color}60, 0 0 ${dotSize * 0.6}px ${color}`
                    : 'none',
                }}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}

export default DotMatrix
