/**
 * WidgetDashboard — Ai OS–style widget home screen
 * Toggle from the classic bento grid via the LayoutGrid button in the header.
 */
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, FlaskConical, Gamepad2, MessageCircle,
  Brain, Users, FileText, BookOpen,
} from 'lucide-react'
import { useXPStore, ORBS, levelFromXP, xpIntoLevel } from './xpStore'
import { useNeuralStore } from './neuralStore'
import { useSRStore } from './srStore'
import { useLabStore } from './labStore'
import { useArcadeStore } from './arcadeStore'
import { useRoadmapStore } from './roadmapStore'
import AevaOrbComponent from './AevaOrb'

/* ─────────────────────────────────────────────────────
   DOT-MATRIX DIGITS  (5 cols × 7 rows, 1 = lit dot)
───────────────────────────────────────────────────── */
const DOT_DIGITS = {
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
}

function DotMatrix({ value, dotSize = 5, gap = 1.5, color = 'rgba(255,255,255,0.92)', dimColor = 'rgba(255,255,255,0.07)' }) {
  const chars = String(value).split('')
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: gap * 3.5 }}>
      {chars.map((ch, ci) => {
        const pattern = DOT_DIGITS[ch]
        if (!pattern) return null
        const cols = pattern[0].length
        return (
          <div key={ci} style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, ${dotSize}px)`,
            gap: `${gap}px`,
          }}>
            {pattern.flat().map((on, pi) => (
              <div key={pi} style={{
                width: dotSize,
                height: dotSize,
                borderRadius: '50%',
                background: on ? color : dimColor,
                boxShadow: on ? `0 0 ${dotSize * 1.4}px ${color}55` : 'none',
              }} />
            ))}
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   SPARKLINE — two overlapping sine waves + triangle marker
───────────────────────────────────────────────────── */
function Sparkline({ width = 160, height = 36, color = '#F59E0B', amplitude = 9, frequency = 1.6, phase = 0.4 }) {
  const steps = 60
  const wave = (freq, ph) => Array.from({ length: steps + 1 }, (_, i) => {
    const x = (i / steps) * width
    const y = height / 2 + amplitude * Math.sin((i / steps) * Math.PI * 2 * freq + ph)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' L ')

  const markerX = width * 0.62
  const markerY = height / 2 + amplitude * Math.sin(0.62 * Math.PI * 2 * frequency + phase)

  return (
    <svg width={width} height={height} style={{ overflow: 'visible', display: 'block' }}>
      <path d={`M ${wave(frequency, phase)}`}
        fill="none" stroke={color} strokeWidth={1.6} opacity={0.75} />
      <path d={`M ${wave(frequency * 1.35, phase + 0.9)}`}
        fill="none" stroke={color} strokeWidth={1} opacity={0.38} />
      {/* Triangle marker */}
      <polygon
        points={`${markerX},${markerY + 6} ${markerX - 4.5},${markerY + 13} ${markerX + 4.5},${markerY + 13}`}
        fill={color}
        opacity={0.9}
      />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────
   EQUALIZER BARS — animated vertical bars (mood card)
───────────────────────────────────────────────────── */
function EqualizerBars({ color = 'rgba(255,255,255,0.55)', count = 8, maxHeight = 32 }) {
  const [heights, setHeights] = useState(() =>
    Array.from({ length: count }, () => 0.25 + Math.random() * 0.75)
  )
  useEffect(() => {
    const id = setInterval(() => {
      setHeights(Array.from({ length: count }, () => 0.15 + Math.random() * 0.85))
    }, 380)
    return () => clearInterval(id)
  }, [count])
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: maxHeight }}>
      {heights.map((h, i) => (
        <motion.div key={i}
          animate={{ height: Math.max(4, h * maxHeight) }}
          transition={{ duration: 0.32, ease: 'easeInOut' }}
          style={{ width: 3, borderRadius: 2, background: color, flexShrink: 0 }}
        />
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   SCATTER DOTS — knowledge constellation (navy card)
───────────────────────────────────────────────────── */
function ScatterDots({ concepts = [], size = 100 }) {
  const dots = useMemo(() => {
    const real = concepts.slice(0, 18).map((c, i) => ({
      x: 6 + ((i * 41 + 7) % 88),
      y: 6 + ((i * 59 + 13) % 88),
      r: 2.5 + (c.mastery / 100) * 8,
      color: c.mastery >= 70 ? '#60A5FA' : c.mastery >= 40 ? '#93C5FD' : '#BFDBFE',
      opacity: 0.35 + (c.mastery / 100) * 0.65,
    }))
    const fill = Array.from({ length: Math.max(0, 14 - real.length) }, (_, i) => ({
      x: 4 + ((i * 17 + 3) % 92),
      y: 4 + ((i * 29 + 11) % 92),
      r: 1.8 + (i % 4) * 1.4,
      color: '#60A5FA',
      opacity: 0.08 + (i % 6) * 0.04,
    }))
    return [...real, ...fill]
  }, [concepts])

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', height: '100%' }}>
      {dots.map((d, i) => (
        <motion.circle key={i}
          cx={d.x} cy={d.y} r={d.r}
          fill={d.color}
          opacity={d.opacity}
          animate={{
            r: [d.r, d.r * 1.35, d.r],
            opacity: [d.opacity, Math.min(1, d.opacity * 1.6), d.opacity],
          }}
          transition={{
            duration: 2.2 + (i % 6) * 0.55,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.08,
          }}
        />
      ))}
    </svg>
  )
}

/* ─────────────────────────────────────────────────────
   LEVEL NAMES
───────────────────────────────────────────────────── */
const LEVEL_NAMES = ['Rookie','Explorer','Seeker','Thinker','Scholar','Analyst','Expert','Master','Legend','Sage']
const getLevelName = l => LEVEL_NAMES[Math.min((l || 1) - 1, LEVEL_NAMES.length - 1)]

/* ─────────────────────────────────────────────────────
   BASE WIDGET CARD
───────────────────────────────────────────────────── */
function Widget({ children, style, onClick, staggerIndex = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1],
        delay: staggerIndex * 0.055,
      }}
      whileHover={onClick ? { y: -3, scale: 1.015 } : undefined}
      whileTap={onClick ? { scale: 0.975 } : undefined}
      onClick={onClick}
      style={{
        borderRadius: 28,
        padding: 22,
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: '0 8px 40px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.10)',
        ...style,
      }}
    >
      {children}
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────
   LABEL helpers
───────────────────────────────────────────────────── */
function CardLabel({ children, color = 'rgba(255,255,255,0.52)' }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.13em',
      color, textTransform: 'uppercase', marginBottom: 2,
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {children}
    </div>
  )
}
function CardSub({ children, color = 'rgba(255,255,255,0.38)' }) {
  return (
    <div style={{ fontSize: 10.5, color, marginBottom: 14, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   WIDGET CARDS
═══════════════════════════════════════════════════ */

/* ── HERO WIDGET — name, level, XP slider ── */
function HeroWidget({ name, level, xpPct, onOrbClick, activeOrbDef, orbPersonality, onChatOpen }) {
  const levelName = getLevelName(level)
  return (
    <Widget
      staggerIndex={0}
      style={{
        background: 'linear-gradient(148deg, #0a0a14 0%, #11101d 55%, #191026 100%)',
        gridColumn: 'span 2',
        gridRow: 'span 2',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 290,
      }}
    >
      {/* Mesh glow blobs */}
      <div aria-hidden style={{ position: 'absolute', top: '-15%', right: '-8%', width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.28) 0%, transparent 65%)', filter: 'blur(28px)', pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'absolute', bottom: '5%', left: '-5%', width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(233,163,100,0.16) 0%, transparent 65%)', filter: 'blur(24px)', pointerEvents: 'none' }} />

      {/* Top row: label + orb */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <CardLabel color="rgba(255,255,255,0.32)">Dashboard</CardLabel>
          <h2 style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 'clamp(26px, 3.5vw, 40px)',
            fontWeight: 900,
            color: 'rgba(255,255,255,0.95)',
            margin: '10px 0 8px',
            lineHeight: 1.08,
            letterSpacing: '-0.04em',
          }}>
            {name || 'Student'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              padding: '3px 11px', borderRadius: 99,
              background: 'rgba(124,58,237,0.22)', border: '1px solid rgba(124,58,237,0.38)',
              fontSize: 11, fontWeight: 700, color: '#C4B5FD',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}>
              Lv {level}
            </div>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', fontWeight: 500, fontFamily: "'Inter', system-ui, sans-serif" }}>
              {levelName}
            </span>
          </div>
        </div>
        <motion.button
          onClick={e => { e.stopPropagation(); onOrbClick() }}
          whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, marginTop: 10 }}
          title="Change orb"
        >
          <AevaOrbComponent
            size={88}
            personality={orbPersonality}
            orbGradient={activeOrbDef?.gradient}
            orbAccent={activeOrbDef?.accent}
          />
        </motion.button>
      </div>

      {/* Bottom: XP progress bar (Natural vs Artificial style) */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: "'Inter', system-ui, sans-serif" }}>XP Progress</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 700, fontFamily: "'Inter', system-ui, sans-serif" }}>{xpPct}%</span>
        </div>
        <div style={{ position: 'relative', height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'visible' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${xpPct}%` }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
            style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #7C3AED, #A78BFA 60%, #E9A364)' }}
          />
          {/* Triangle marker */}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: `${xpPct}%`,
            transform: 'translateX(-50%)',
            marginTop: 2,
            width: 0, height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '7px solid rgba(233,163,100,0.82)',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.22)', fontFamily: "'Inter', system-ui, sans-serif" }}>Lv {level}</span>
          <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.22)', fontFamily: "'Inter', system-ui, sans-serif" }}>Lv {level + 1}</span>
        </div>
        <motion.button
          whileHover={{ scale: 1.03, background: 'rgba(124,58,237,0.32)' }}
          whileTap={{ scale: 0.97 }}
          onClick={onChatOpen}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 18,
            background: 'rgba(124,58,237,0.20)', border: '1px solid rgba(124,58,237,0.35)',
            color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', letterSpacing: '-0.01em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          <Zap size={14} /> Start Session
        </motion.button>
      </div>
    </Widget>
  )
}

/* ── STREAK WIDGET — red/orange gradient, dot-matrix number ── */
function StreakWidget({ streak }) {
  return (
    <Widget staggerIndex={1} style={{ background: 'linear-gradient(148deg, #7A1515 0%, #AB2E12 55%, #C84020 100%)' }}>
      <CardLabel>Streak</CardLabel>
      <CardSub color="rgba(255,200,180,0.45)">Days in a row</CardSub>

      <DotMatrix
        value={String(Math.max(0, streak || 0))}
        dotSize={7}
        gap={2.2}
        color="rgba(255,218,200,0.95)"
        dimColor="rgba(255,255,255,0.07)"
      />

      <div style={{ marginTop: 18 }}>
        <svg width="100%" height={20} viewBox="0 0 120 20" preserveAspectRatio="none">
          <path
            d="M0,10 Q8,4 16,11 Q24,18 32,9 Q40,2 48,10 Q56,17 64,8 Q72,2 80,10 Q88,17 96,7 Q104,2 112,10 L120,10"
            fill="none" stroke="rgba(255,180,120,0.45)" strokeWidth={1.5}
          />
        </svg>
        <div style={{ fontSize: 9.5, color: 'rgba(255,200,180,0.45)', marginTop: 5, fontFamily: "'Inter', system-ui, sans-serif" }}>
          {(streak || 0) > 0 ? '🔥 Keep it going' : 'Start your streak today'}
        </div>
      </div>
    </Widget>
  )
}

/* ── LEVEL WIDGET — teal gradient, circular ring decoration ── */
function LevelWidget({ level, xpPct }) {
  return (
    <Widget staggerIndex={2} style={{ background: 'linear-gradient(148deg, #0C5050 0%, #0E7060 55%, #18908A 100%)' }}>
      {/* Ring decorations (like the Sleep/Quality card) */}
      <div aria-hidden style={{ position: 'absolute', right: -22, top: '50%', transform: 'translateY(-50%)', width: 110, height: 110, borderRadius: '50%', border: '1.5px solid rgba(180,255,240,0.16)', pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)', width: 72, height: 72, borderRadius: '50%', border: '1px solid rgba(180,255,240,0.08)', pointerEvents: 'none' }} />

      <CardLabel>Level</CardLabel>
      <CardSub color="rgba(180,255,240,0.40)">{getLevelName(level)}</CardSub>

      <DotMatrix
        value={String(level || 1)}
        dotSize={7}
        gap={2.2}
        color="rgba(180,255,240,0.95)"
        dimColor="rgba(255,255,255,0.07)"
      />

      <div style={{ marginTop: 12, fontSize: 9.5, color: 'rgba(180,255,240,0.40)', fontFamily: "'Inter', system-ui, sans-serif" }}>
        {xpPct}% to next level
      </div>
    </Widget>
  )
}

/* ── READINESS WIDGET — purple gradient, sine wave sparkline ── */
function ReadinessWidget({ pct, roadmapTitle }) {
  return (
    <Widget staggerIndex={3} style={{
      background: 'linear-gradient(148deg, #2E1B60 0%, #4A2A8A 55%, #6840B8 100%)',
      gridColumn: 'span 2',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <CardLabel>Readiness</CardLabel>
          <CardSub color="rgba(210,195,255,0.40)">{roadmapTitle || 'No active roadmap'}</CardSub>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <DotMatrix
              value={String(pct || 0)}
              dotSize={7}
              gap={2.2}
              color="rgba(215,205,255,0.95)"
              dimColor="rgba(255,255,255,0.07)"
            />
            <span style={{ fontSize: 26, fontWeight: 900, color: 'rgba(210,195,255,0.45)', lineHeight: 1, marginBottom: 2, fontFamily: "'Inter', system-ui, sans-serif" }}>%</span>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <Sparkline width={220} height={34} color="#F59E0B" amplitude={9} frequency={1.55} phase={0.5} />
      </div>
      <div style={{ marginTop: 10, fontSize: 9.5, color: 'rgba(210,195,255,0.40)', fontFamily: "'Inter', system-ui, sans-serif" }}>
        {pct >= 80 ? 'Exam ready' : pct >= 60 ? 'Good progress' : pct >= 35 ? 'Keep going' : 'Getting started'}
      </div>
    </Widget>
  )
}

/* ── MODE WIDGET — dynamic color, equalizer bars ── */
function ModeWidget({ modeName, modeColor, modeSub }) {
  const gradients = {
    '#4ADE80': 'linear-gradient(148deg, #0E3825 0%, #1A5E3C 55%, #207050 100%)',
    '#60A5FA': 'linear-gradient(148deg, #0D2040 0%, #163565 55%, #1E4880 100%)',
    '#F87171': 'linear-gradient(148deg, #550E28 0%, #7A1A3A 55%, #961E48 100%)',
    '#FBBF24': 'linear-gradient(148deg, #3D2800 0%, #614000 55%, #8C5E00 100%)',
    '#A78BFA': 'linear-gradient(148deg, #30185A 0%, #4B2880 55%, #6030A0 100%)',
    '#F97316': 'linear-gradient(148deg, #451200 0%, #722000 55%, #9A2C00 100%)',
  }
  const bg = gradients[modeColor] || 'linear-gradient(148deg, #4A0E3A 0%, #7A1860 55%, #A02080 100%)'
  return (
    <Widget staggerIndex={4} style={{ background: bg }}>
      <CardLabel>Aeva Mode</CardLabel>
      <CardSub color={`${modeColor}70`}>{modeSub}</CardSub>
      <h3 style={{
        fontSize: 20, fontWeight: 900, color: 'rgba(255,255,255,0.92)',
        margin: '0 0 18px', letterSpacing: '-0.03em', lineHeight: 1.1,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        {modeName}
      </h3>
      <EqualizerBars color={`${modeColor}80`} count={9} maxHeight={30} />
      <div style={{ marginTop: 8, fontSize: 9.5, color: 'rgba(255,255,255,0.32)', fontFamily: "'Inter', system-ui, sans-serif" }}>
        Live reading
      </div>
    </Widget>
  )
}

/* ── DUE CARDS WIDGET — navy gradient, dot-matrix count ── */
function DueWidget({ count, onLab }) {
  return (
    <Widget staggerIndex={5} onClick={onLab} style={{ background: 'linear-gradient(148deg, #08162E 0%, #102240 55%, #162E58 100%)' }}>
      <CardLabel>Cards Due</CardLabel>
      <CardSub color="rgba(148,210,255,0.40)">Spaced repetition</CardSub>

      <DotMatrix
        value={String(count || 0)}
        dotSize={7}
        gap={2.2}
        color="rgba(148,210,255,0.95)"
        dimColor="rgba(255,255,255,0.07)"
      />

      <div style={{ marginTop: 12, fontSize: 9.5, color: 'rgba(148,210,255,0.40)', fontFamily: "'Inter', system-ui, sans-serif" }}>
        {count > 0 ? `${count} ready to review` : 'All caught up ✓'}
      </div>
    </Widget>
  )
}

/* ── QUICK LAUNCH WIDGET — dark card, icon grid ── */
function QuickLaunchWidget({ onChat, onLab, onArcade, onRoadmaps, onDocs, onBrain, onParents, labBadge }) {
  const actions = [
    { icon: <MessageCircle size={17} />, label: 'Chat',    color: '#818CF8', bg: 'rgba(99,102,241,0.16)', border: 'rgba(99,102,241,0.28)',  action: onChat },
    { icon: <FlaskConical  size={17} />, label: 'Lab',     color: '#60A5FA', bg: 'rgba(59,130,246,0.16)', border: 'rgba(59,130,246,0.28)',  action: onLab, badge: labBadge },
    { icon: <Gamepad2      size={17} />, label: 'Arcade',  color: '#A78BFA', bg: 'rgba(139,92,246,0.16)', border: 'rgba(139,92,246,0.28)',  action: onArcade },
    { icon: <span style={{ fontSize: 17, lineHeight: 1 }}>🗺️</span>, label: 'Roadmap', color: '#C4B5FD', bg: 'rgba(167,139,250,0.16)', border: 'rgba(167,139,250,0.28)', action: onRoadmaps },
    { icon: <Brain         size={17} />, label: 'Brain',   color: '#34D399', bg: 'rgba(52,211,153,0.16)', border: 'rgba(52,211,153,0.28)',  action: onBrain },
    { icon: <FileText      size={17} />, label: 'Docs',    color: '#FCD34D', bg: 'rgba(245,158,11,0.16)', border: 'rgba(245,158,11,0.28)',  action: onDocs },
    { icon: <Users         size={17} />, label: 'Parents', color: '#FB7185', bg: 'rgba(251,113,133,0.16)', border: 'rgba(251,113,133,0.28)', action: onParents },
    { icon: <BookOpen      size={17} />, label: 'Library', color: '#93C5FD', bg: 'rgba(96,165,250,0.16)', border: 'rgba(96,165,250,0.28)',  action: onDocs },
  ]
  return (
    <Widget staggerIndex={6} style={{
      background: 'linear-gradient(148deg, #0C0C18 0%, #121220 100%)',
      gridColumn: 'span 2',
    }}>
      <CardLabel color="rgba(255,255,255,0.30)">Quick Launch</CardLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 9, marginTop: 12 }}>
        {actions.map((a, i) => (
          <motion.button
            key={a.label}
            onClick={a.action}
            whileHover={{ scale: 1.07, y: -2 }}
            whileTap={{ scale: 0.93 }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              padding: '12px 6px', borderRadius: 18,
              background: a.bg, border: `1px solid ${a.border}`,
              color: a.color, cursor: 'pointer', position: 'relative',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            {a.icon}
            <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.60)' }}>{a.label}</span>
            {a.badge > 0 && (
              <div style={{
                position: 'absolute', top: -4, right: -4,
                minWidth: 16, height: 16, borderRadius: 99,
                background: '#4ADE80',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 800, color: '#050a1a',
                padding: '0 3px',
                boxShadow: '0 0 8px rgba(74,222,128,0.60)',
              }}>
                {a.badge}
              </div>
            )}
          </motion.button>
        ))}
      </div>
    </Widget>
  )
}

/* ── KNOWLEDGE WIDGET — navy, scatter dots ── */
function KnowledgeWidget({ concepts, onPalace }) {
  return (
    <Widget staggerIndex={7} onClick={onPalace} style={{
      background: 'linear-gradient(148deg, #050B22 0%, #0C1638 55%, #121E50 100%)',
      gridColumn: 'span 2',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <CardLabel color="rgba(255,255,255,0.35)">Knowledge</CardLabel>
          <CardSub color="rgba(148,210,255,0.35)">Monitoring</CardSub>
          <div style={{ fontSize: 36, fontWeight: 900, color: 'rgba(148,210,255,0.72)', letterSpacing: '-0.05em', lineHeight: 1, fontFamily: "'Inter', system-ui, sans-serif" }}>
            {concepts.length}
          </div>
          <div style={{ fontSize: 9.5, color: 'rgba(148,210,255,0.35)', marginTop: 4, fontFamily: "'Inter', system-ui, sans-serif" }}>
            concepts mapped
          </div>
        </div>
        <div style={{ width: 120, height: 120, flexShrink: 0 }}>
          <ScatterDots concepts={concepts} size={100} />
        </div>
      </div>
    </Widget>
  )
}

/* ═══════════════════════════════════════════════════
   MAIN WIDGET DASHBOARD
═══════════════════════════════════════════════════ */
export default function WidgetDashboard({
  onChatOpen,
  onBrain,
  onDocs,
  onShowEm,
  onPalace,
  onOrbClick,
  userName,
  isMobile,
}) {
  const { xp, streak, activeOrb: activeOrbId } = useXPStore()
  const { conceptMap, currentVibe, frustrationScore, totalExchanges, orbPersonality } = useNeuralStore()
  const { getDueCount } = useSRStore()
  const { openLab, orders: labOrders, drillHistory } = useLabStore()
  const { openArcade } = useArcadeStore()
  const { openRoadmapHub, roadmaps } = useRoadmapStore()

  const currentLevel = levelFromXP(xp)
  const xpPct        = xpIntoLevel(xp)
  const dueCount     = getDueCount()
  const activeOrbDef = ORBS.find(o => o.id === activeOrbId) || ORBS[0]
  const labBadge     = (labOrders || []).filter(o => !o.completedAt).length + dueCount

  // Readiness from first roadmap
  const readinessPct = useMemo(() => {
    const rm = roadmaps?.[0]
    if (!rm?.nodes?.length) return 0
    const score = rm.nodes.reduce((s, n) => {
      const c = n.confidence || 'none'
      return s + (c === 'solid' ? 100 : c === 'shaky' ? 60 : 0)
    }, 0)
    return Math.round(score / rm.nodes.length)
  }, [roadmaps])

  // Aeva mode
  const VIBE_MAP = {
    Proud:    { name: 'In The Zone', color: '#4ADE80', sub: 'On a winning streak' },
    Engaged:  { name: 'Locked In',   color: '#4ADE80', sub: 'Full focus engaged' },
    Focused:  { name: 'Locked In',   color: '#4ADE80', sub: 'Full focus engaged' },
    Impressed:{ name: 'Momentum',    color: '#60A5FA', sub: 'Building fast' },
    Skeptical:{ name: 'Critical',    color: '#F87171', sub: 'Questioning everything' },
    Concerned:{ name: 'Rebuilding',  color: '#FBBF24', sub: 'Finding focus' },
  }
  const isNew = !totalExchanges || totalExchanges < 3
  const modeConfig = isNew
    ? { name: 'Calibrating', color: '#A78BFA', sub: 'Getting to know you' }
    : frustrationScore > 72
      ? { name: 'Simplifying', color: '#F97316', sub: 'Aeva adjusting level' }
      : (VIBE_MAP[currentVibe] || { name: 'Focused', color: '#4ADE80', sub: 'Ready to learn' })

  const gridCols = isMobile ? '1fr 1fr' : 'repeat(4, 1fr)'

  return (
    <motion.div
      key="widget-dashboard"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: 'grid',
        gridTemplateColumns: gridCols,
        gap: 13,
        padding: isMobile ? '12px 12px' : '8px 24px',
        maxWidth: 1280,
        margin: '0 auto',
        paddingBottom: isMobile ? 'calc(90px + env(safe-area-inset-bottom))' : 48,
      }}
    >
      <HeroWidget
        name={userName}
        level={currentLevel}
        xpPct={xpPct}
        onOrbClick={onOrbClick}
        activeOrbDef={activeOrbDef}
        orbPersonality={orbPersonality}
        onChatOpen={onChatOpen}
      />

      <StreakWidget streak={streak} />
      <LevelWidget level={currentLevel} xpPct={xpPct} />

      <ReadinessWidget
        pct={readinessPct}
        roadmapTitle={roadmaps?.[0]?.title}
      />

      <ModeWidget
        modeName={modeConfig.name}
        modeColor={modeConfig.color}
        modeSub={modeConfig.sub}
      />
      <DueWidget count={dueCount} onLab={openLab} />

      <QuickLaunchWidget
        onChat={onChatOpen}
        onLab={openLab}
        onArcade={openArcade}
        onRoadmaps={openRoadmapHub}
        onDocs={onDocs}
        onBrain={onBrain}
        onParents={onShowEm}
        labBadge={labBadge}
      />

      <KnowledgeWidget
        concepts={[...conceptMap]}
        onPalace={onPalace}
      />
    </motion.div>
  )
}
