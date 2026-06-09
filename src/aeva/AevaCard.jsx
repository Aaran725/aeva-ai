/**
 * AevaCard — Aeva OS glass card primitive.
 *
 * The canonical dark-glass surface used across every screen.
 * Reads from Aeva OS foundation tokens so it automatically
 * responds to YOUR UI personalisation (radius, density, accent glow).
 *
 * Props:
 *   children   — card content
 *   padding    — 'none' | 'sm' | 'md' | 'lg' (default: 'md')
 *   radius     — 'sm' | 'md' | 'lg' | 'pill' | number (default: 'md')
 *   glow       — boolean — adds a subtle accent-coloured glow ring
 *   hover      — boolean — lifts shadow on hover (default: true)
 *   as         — element tag (default: 'div')
 *   onClick    — click handler
 *   style      — escape hatch for additional inline styles
 *   className  — extra class names
 *
 * Usage:
 *   <AevaCard padding="lg" glow>
 *     <AevaLabel>STREAK</AevaLabel>
 *     <DotMatrix value="5" color="#FFD4C3" />
 *   </AevaCard>
 */

const PADDING = {
  none: '0',
  sm:   'var(--aeva-space-sm)',
  md:   'var(--aeva-space-md)',
  lg:   'var(--aeva-space-lg)',
}

const RADIUS = {
  sm:   'var(--aeva-radius-sm)',
  md:   'var(--aeva-radius-md)',
  lg:   'var(--aeva-radius-lg)',
  pill: 'var(--aeva-radius-pill)',
}

export function AevaCard({
  children,
  padding = 'md',
  radius = 'md',
  glow = false,
  hover = true,
  as: Tag = 'div',
  onClick,
  style = {},
  className = '',
}) {
  const r = typeof radius === 'number' ? `${radius}px` : (RADIUS[radius] ?? RADIUS.md)
  const p = PADDING[padding] ?? PADDING.md

  return (
    <Tag
      onClick={onClick}
      className={[
        hover  ? 'aeva-card-hover'  : '',
        glow   ? 'aeva-card-glow'   : '',
        className,
      ].filter(Boolean).join(' ')}
      style={{
        background:    'var(--aeva-surface-1)',
        border:        '1px solid var(--aeva-border)',
        borderRadius:  r,
        padding:       p,
        backdropFilter:         'var(--aeva-blur-sm)',
        WebkitBackdropFilter:   'var(--aeva-blur-sm)',
        boxShadow:     'var(--aeva-shadow-card)',
        cursor:        onClick ? 'pointer' : undefined,
        ...style,
      }}
    >
      {children}
    </Tag>
  )
}

export default AevaCard
