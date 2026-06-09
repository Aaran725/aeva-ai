/**
 * AevaLabel — small-caps section label.
 *
 * The caps label style used on every card and section:
 * "STREAK", "READINESS", "EXPLANATION", "THIS WEEK", etc.
 * Reads --aeva-text-3 so it's always the right tone against any surface.
 *
 * Props:
 *   children  — label text
 *   color     — override the default dimmed colour
 *   size      — 'xs' (9px) | 'sm' (10px) | 'md' (11px) — default 'sm'
 *   spacing   — letterSpacing override (default '0.10em')
 *   mb        — marginBottom in px (default 0)
 *   style     — escape hatch
 *
 * Usage:
 *   <AevaLabel>STREAK</AevaLabel>
 *   <AevaLabel color="#60A5FA" mb={4}>TRAINING LAB</AevaLabel>
 */

const SIZES = { xs: 9, sm: 10, md: 11 }

export function AevaLabel({
  children,
  color = 'var(--aeva-text-3)',
  size = 'sm',
  spacing = '0.10em',
  mb = 0,
  style = {},
}) {
  return (
    <div
      style={{
        fontSize:      SIZES[size] ?? SIZES.sm,
        fontWeight:    700,
        letterSpacing: spacing,
        textTransform: 'uppercase',
        color,
        marginBottom:  mb,
        lineHeight:    1.2,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export default AevaLabel
