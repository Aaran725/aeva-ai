/**
 * WidgetDashboard — Ai OS–style widget home screen
 * Toggle from the classic bento grid via the LayoutGrid button in the header.
 */
import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
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
}

/* Larger dots, near-invisible off-state — matches the reference LED look */
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
                  /* glow on lit dots only */
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

/* ─────────────────────────────────────────────────────
   TWO-WAVE SPARKLINE  (matches Balance card in reference)
───────────────────────────────────────────────────── */
function Sparkline({
  width = 170,
  height = 38,
  color = '#F59E0B',
  amplitude = 10,
  frequency = 1.55,
  phase = 0.45,
}) {
  // Always use a fixed numeric width internally — never accept "100%" strings
  const w = typeof width === 'number' && width > 0 ? width : 170
  const steps = 70
  const wave = (freq, ph) =>
    Array.from({ length: steps + 1 }, (_, i) => {
      const x = (i / steps) * w
      const y = height / 2 + amplitude * Math.sin((i / steps) * Math.PI * 2 * freq + ph)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' L ')

  /* triangle marker sits on first wave at ~65% */
  const mx = w * 0.65
  const my =
    height / 2 + amplitude * Math.sin(0.65 * Math.PI * 2 * frequency + phase)

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible', display: 'block' }}
    >
      {/* secondary wave — slightly offset, lower opacity */}
      <path
        d={`M ${wave(frequency * 1.38, phase + 1.1)}`}
        fill="none"
        stroke={color}
        strokeWidth={1}
        opacity={0.35}
      />
      {/* primary wave */}
      <path
        d={`M ${wave(frequency, phase)}`}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        opacity={0.80}
      />
      {/* ▼ triangle marker */}
      <polygon
        points={`${mx},${my + 5} ${mx - 4.5},${my + 13} ${mx + 4.5},${my + 13}`}
        fill={color}
        opacity={0.95}
      />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────
   EQUALIZER BARS  (Enhance / Mood card)
───────────────────────────────────────────────────── */
function EqualizerBars({ color = 'rgba(255,255,255,0.55)', count = 9, maxH = 32 }) {
  const [h, setH] = useState(() =>
    Array.from({ length: count }, () => 0.2 + Math.random() * 0.8)
  )
  useEffect(() => {
    const id = setInterval(
      () => setH(Array.from({ length: count }, () => 0.12 + Math.random() * 0.88)),
      370
    )
    return () => clearInterval(id)
  }, [count])
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: maxH }}>
      {h.map((v, i) => (
        <motion.div
          key={i}
          animate={{ height: Math.max(3, v * maxH) }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          style={{ width: 3, borderRadius: 2, background: color, flexShrink: 0 }}
        />
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   SCATTER DOTS  (Skin-Damage / Knowledge card)
   Uses SVG feGaussianBlur filter for the bloom glow
───────────────────────────────────────────────────── */
function ScatterDots({ concepts = [] }) {
  const dots = useMemo(() => {
    const real = concepts.slice(0, 16).map((c, i) => ({
      x: 8 + ((i * 43 + 9) % 84),
      y: 8 + ((i * 61 + 17) % 84),
      r: 3 + (c.mastery / 100) * 11,
      opacity: 0.40 + (c.mastery / 100) * 0.60,
    }))
    const fill = Array.from({ length: Math.max(0, 14 - real.length) }, (_, i) => ({
      x: 5 + ((i * 19 + 5) % 90),
      y: 5 + ((i * 31 + 15) % 90),
      r: 2 + (i % 5) * 1.8,
      opacity: 0.10 + (i % 6) * 0.04,
    }))
    return [...real, ...fill]
  }, [concepts])

  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
      <defs>
        {/* bloom glow identical to the reference image */}
        <filter id="dot-bloom" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {dots.map((d, i) => (
        <motion.circle
          key={i}
          cx={d.x}
          cy={d.y}
          r={d.r}
          fill="#60A5FA"
          opacity={d.opacity}
          filter="url(#dot-bloom)"
          animate={{
            r: [d.r, d.r * 1.30, d.r],
            opacity: [d.opacity, Math.min(1, d.opacity * 1.55), d.opacity],
          }}
          transition={{
            duration: 2.0 + (i % 7) * 0.45,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.09,
          }}
        />
      ))}
    </svg>
  )
}

/* ─────────────────────────────────────────────────────
   GOLDEN ARC  (Sleep / Quality card decoration)
───────────────────────────────────────────────────── */
function GoldenArc() {
  return (
    <svg
      style={{ position: 'absolute', right: -18, top: '50%', transform: 'translateY(-55%)', pointerEvents: 'none' }}
      width={128}
      height={128}
      viewBox="0 0 128 128"
    >
      {/* outer crescent arc */}
      <circle
        cx={64} cy={64} r={56}
        fill="none"
        stroke="rgba(251,191,36,0.38)"
        strokeWidth={2.5}
        strokeDasharray="195 158"
        strokeLinecap="round"
        transform="rotate(-42 64 64)"
      />
      {/* inner ring */}
      <circle
        cx={64} cy={64} r={40}
        fill="none"
        stroke="rgba(251,191,36,0.16)"
        strokeWidth={1.5}
        strokeDasharray="130 122"
        strokeLinecap="round"
        transform="rotate(30 64 64)"
      />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────
   LEVEL NAMES
───────────────────────────────────────────────────── */
const LEVEL_NAMES = [
  'Rookie','Explorer','Seeker','Thinker',
  'Scholar','Analyst','Expert','Master','Legend','Sage',
]
const getLevelName = l => LEVEL_NAMES[Math.min((l || 1) - 1, LEVEL_NAMES.length - 1)]

/* ─────────────────────────────────────────────────────
   BASE WIDGET CARD
───────────────────────────────────────────────────── */
function Widget({ children, style, onClick, idx = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1], delay: idx * 0.06 }}
      whileHover={onClick ? { y: -4, scale: 1.018 } : undefined}
      whileTap={onClick ? { scale: 0.975 } : undefined}
      onClick={onClick}
      style={{
        borderRadius: 32,
        padding: 22,
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        /* deep drop-shadow + inner highlight rim — key to the premium depth look */
        boxShadow: '0 10px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12)',
        ...style,
      }}
    >
      {children}
    </motion.div>
  )
}

function Label({ children, color = 'rgba(255,255,255,0.55)' }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', color, textTransform: 'uppercase', marginBottom: 2, fontFamily: "'Inter',system-ui,sans-serif" }}>
      {children}
    </div>
  )
}
function Sub({ children, color = 'rgba(255,255,255,0.38)' }) {
  return (
    <div style={{ fontSize: 10.5, color, marginBottom: 14, fontFamily: "'Inter',system-ui,sans-serif" }}>
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   INDIVIDUAL WIDGET CARDS
═══════════════════════════════════════════════════ */

/* ── HERO  (dark, like the Slava Kornilov card) ── */
function HeroWidget({ name, level, xpPct, onOrbClick, activeOrbDef, orbPersonality, onChatOpen }) {
  return (
    <Widget
      idx={0}
      style={{
        /* deep dark with ambient purple glow in corner */
        background: 'radial-gradient(ellipse at 80% 15%, rgba(80,30,130,0.55) 0%, rgba(10,8,20,0.0) 55%), #09080f',
        gridColumn: 'span 2',
        gridRow: 'span 2',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 300,
      }}
    >
      {/* bottom-left warm glow */}
      <div aria-hidden style={{ position:'absolute', bottom:'-12%', left:'-8%', width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle, rgba(200,100,40,0.18) 0%, transparent 65%)', filter:'blur(24px)', pointerEvents:'none' }} />

      {/* top row: label + orb */}
      <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <Label color="rgba(255,255,255,0.28)">Dashboard</Label>
          <h2 style={{ fontFamily:"'Inter',system-ui,sans-serif", fontSize:'clamp(28px,3.5vw,42px)', fontWeight:900, color:'rgba(255,255,255,0.96)', margin:'10px 0 8px', lineHeight:1.07, letterSpacing:'-0.04em' }}>
            {name || 'Student'}
          </h2>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ padding:'3px 11px', borderRadius:99, background:'rgba(124,58,237,0.22)', border:'1px solid rgba(124,58,237,0.40)', fontSize:11, fontWeight:700, color:'#C4B5FD', fontFamily:"'Inter',system-ui,sans-serif" }}>
              Lv {level}
            </div>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.38)', fontFamily:"'Inter',system-ui,sans-serif" }}>
              {getLevelName(level)}
            </span>
          </div>
        </div>
        <motion.button onClick={e => { e.stopPropagation(); onOrbClick() }} whileHover={{ scale:1.08 }} whileTap={{ scale:0.93 }}
          style={{ background:'none', border:'none', cursor:'pointer', padding:0, flexShrink:0, marginTop:8 }}>
          <AevaOrbComponent size={90} personality={orbPersonality} orbGradient={activeOrbDef?.gradient} orbAccent={activeOrbDef?.accent} />
        </motion.button>
      </div>

      {/* XP slider — "Natural vs Artificial" style */}
      <div style={{ position:'relative', zIndex:1 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ fontSize:9.5, color:'rgba(255,255,255,0.28)', fontWeight:600, letterSpacing:'0.07em', textTransform:'uppercase', fontFamily:"'Inter',system-ui,sans-serif" }}>XP Progress</span>
          <span style={{ fontSize:10.5, color:'rgba(255,255,255,0.52)', fontWeight:700, fontFamily:"'Inter',system-ui,sans-serif" }}>{xpPct}%</span>
        </div>
        <div style={{ position:'relative', height:6, borderRadius:99, background:'rgba(255,255,255,0.08)' }}>
          <motion.div initial={{ width:0 }} animate={{ width:`${xpPct}%` }} transition={{ duration:1.2, ease:'easeOut', delay:0.5 }}
            style={{ height:'100%', borderRadius:99, background:'linear-gradient(90deg,#7C3AED,#A78BFA 60%,#E9A364)' }} />
          {/* ▼ triangle marker */}
          <div style={{ position:'absolute', top:'100%', left:`${xpPct}%`, transform:'translateX(-50%)', marginTop:2 }}>
            <div style={{ width:0, height:0, borderLeft:'5px solid transparent', borderRight:'5px solid transparent', borderTop:'7px solid rgba(233,163,100,0.85)' }} />
          </div>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:13, marginBottom:16 }}>
          <span style={{ fontSize:9, color:'rgba(255,255,255,0.20)', fontFamily:"'Inter',system-ui,sans-serif" }}>Lv {level}</span>
          <span style={{ fontSize:9, color:'rgba(255,255,255,0.20)', fontFamily:"'Inter',system-ui,sans-serif" }}>Lv {level + 1}</span>
        </div>
        <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }} onClick={onChatOpen}
          style={{ width:'100%', padding:'12px 0', borderRadius:20, background:'rgba(124,58,237,0.20)', border:'1px solid rgba(124,58,237,0.36)', color:'rgba(255,255,255,0.92)', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontFamily:"'Inter',system-ui,sans-serif" }}>
          <Zap size={14} /> Start Session
        </motion.button>
      </div>
    </Widget>
  )
}

/* ── STREAK  (Weather card — deep red, radial glow from upper-center) ── */
function StreakWidget({ streak }) {
  return (
    <Widget idx={1} style={{
      background: 'radial-gradient(ellipse 160% 130% at 16% 5%, #E87030 0%, #C85020 22%, #A03010 45%, #782010 66%, #521010 84%, #360808 100%)',
    }}>
      <Label>Streak</Label>
      <Sub color="rgba(255,200,170,0.45)">Days in a row</Sub>

      <DotMatrix value={String(Math.max(0, streak || 0))} color="rgba(255,215,195,0.96)" dimColor="rgba(255,255,255,0.04)" dotSize={8} gap={2} />

      {/* mini sparkline at bottom like the Weather card */}
      <div style={{ marginTop:18 }}>
        <svg width="100%" height={18} viewBox="0 0 120 18" preserveAspectRatio="none">
          <path d="M0,9 Q8,3 16,10 Q24,17 32,8 Q40,2 48,9 Q56,17 64,7 Q72,2 80,9 Q88,17 96,6 Q104,2 112,9 L120,9"
            fill="none" stroke="rgba(255,175,110,0.42)" strokeWidth={1.5} />
        </svg>
        <div style={{ fontSize:9.5, color:'rgba(255,195,155,0.42)', marginTop:4, fontFamily:"'Inter',system-ui,sans-serif" }}>
          {(streak || 0) > 0 ? '🔥 Keep it going' : 'Start today'}
        </div>
      </div>
    </Widget>
  )
}

/* ── LEVEL  (Sleep/Quality card — teal, radial from upper-right, golden arc) ── */
function LevelWidget({ level, xpPct }) {
  return (
    <Widget idx={2} style={{
      background: 'radial-gradient(ellipse 160% 130% at 84% 5%, #22D8BC 0%, #12B09A 22%, #0A8880 45%, #086868 66%, #054A52 84%, #033040 100%)',
    }}>
      {/* The distinctive golden crescent arcs */}
      <GoldenArc />

      <Label>Level</Label>
      <Sub color="rgba(180,255,238,0.42)">{getLevelName(level)}</Sub>

      <DotMatrix value={String(level || 1)} color="rgba(185,255,242,0.96)" dimColor="rgba(255,255,255,0.04)" dotSize={8} gap={2} />

      <div style={{ marginTop:12, fontSize:9.5, color:'rgba(185,255,242,0.40)', fontFamily:"'Inter',system-ui,sans-serif" }}>
        {xpPct}% to next level
      </div>
    </Widget>
  )
}

/* ── READINESS  (Balance card — SOFT LAVENDER, not dark, sine-wave sparkline) ── */
function ReadinessWidget({ pct, roadmapTitle }) {
  return (
    <Widget idx={3} style={{
      background: 'radial-gradient(ellipse 160% 130% at 18% 5%, #C8A0E0 0%, #A070C8 22%, #7848A8 45%, #5830A0 66%, #3E1888 84%, #261268 100%)',
      gridColumn: 'span 2',
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <Label>Readiness</Label>
          <Sub color="rgba(220,205,255,0.45)">{roadmapTitle || 'No active roadmap'}</Sub>
          <div style={{ display:'flex', alignItems:'flex-end', gap:9 }}>
            <DotMatrix value={String(pct || 0)} color="rgba(228,218,255,0.97)" dimColor="rgba(255,255,255,0.05)" dotSize={8} gap={2} />
            <span style={{ fontSize:28, fontWeight:900, color:'rgba(220,205,255,0.42)', lineHeight:1, marginBottom:3, fontFamily:"'Inter',system-ui,sans-serif" }}>%</span>
          </div>
        </div>
      </div>

      {/* amber sine-wave sparkline identical to the Balance card */}
      <div style={{ marginTop:18 }}>
        <Sparkline width={170} height={36} color="#F59E0B" amplitude={9} frequency={1.55} phase={0.5} />
      </div>

      <div style={{ marginTop:8, fontSize:9.5, color:'rgba(220,205,255,0.40)', fontFamily:"'Inter',system-ui,sans-serif" }}>
        {pct >= 80 ? 'Exam ready' : pct >= 60 ? 'Good progress' : pct >= 35 ? 'Keep going' : 'Getting started'}
      </div>
    </Widget>
  )
}

/* ── MODE  (Enhance/Mood card — deep cerise/fuchsia, equalizer bars) ── */
function ModeWidget({ modeName, modeColor, modeSub }) {
  /* map mode color to Enhance-style card gradient */
  // Mode card = Enhance/Mood style: glow FROM CENTRE outward, dark edges stay hued not black
  const bgMap = {
    '#4ADE80': 'radial-gradient(ellipse 150% 130% at 40% 42%, #32D060 0%, #1EA840 20%, #0E7828 42%, #085020 64%, #063010 84%, #041808 100%)',
    '#60A5FA': 'radial-gradient(ellipse 150% 130% at 40% 42%, #3C90F8 0%, #1C60D0 20%, #0C3898 42%, #081870 64%, #040C50 84%, #020830 100%)',
    '#F87171': 'radial-gradient(ellipse 150% 130% at 40% 42%, #E84050 0%, #B01828 20%, #780818 42%, #500810 64%, #300808 84%, #180404 100%)',
    '#FBBF24': 'radial-gradient(ellipse 150% 130% at 40% 42%, #E09818 0%, #A06800 20%, #704800 42%, #483000 64%, #301800 84%, #180C00 100%)',
    '#A78BFA': 'radial-gradient(ellipse 150% 130% at 40% 42%, #9C60F8 0%, #6030C8 20%, #3A1898 42%, #201070 64%, #100850 84%, #080430 100%)',
    '#F97316': 'radial-gradient(ellipse 150% 130% at 40% 42%, #E86818 0%, #B04008 20%, #782008 42%, #501008 64%, #300808 84%, #180404 100%)',
  }
  const bg = bgMap[modeColor] || 'radial-gradient(ellipse 150% 130% at 40% 42%, #F03080 0%, #C01868 20%, #900848 42%, #600430 64%, #3C0220 84%, #220112 100%)'

  return (
    <Widget idx={4} style={{ background: bg }}>
      <Label>Aeva Mode</Label>
      <Sub color={`${modeColor}75`}>{modeSub}</Sub>

      <h3 style={{ fontSize:21, fontWeight:900, color:'rgba(255,255,255,0.93)', margin:'0 0 20px', letterSpacing:'-0.03em', lineHeight:1.1, fontFamily:"'Inter',system-ui,sans-serif" }}>
        {modeName}
      </h3>

      <EqualizerBars color={`${modeColor}90`} count={9} maxH={30} />

      <div style={{ marginTop:8, fontSize:9, color:'rgba(255,255,255,0.30)', fontFamily:"'Inter',system-ui,sans-serif" }}>
        Live reading
      </div>
    </Widget>
  )
}

/* ── DUE CARDS  (Clock card — dark wine/maroon, radial from top-right) ── */
function DueWidget({ count, onLab }) {
  return (
    <Widget idx={5} onClick={onLab} style={{
      background: 'radial-gradient(ellipse 160% 130% at 82% 5%, #C82838 0%, #A01828 22%, #701018 45%, #501010 66%, #300808 84%, #1A0404 100%)',
    }}>
      <Label>Cards Due</Label>
      <Sub color="rgba(255,175,175,0.42)">Spaced repetition</Sub>

      <DotMatrix value={String(count || 0)} color="rgba(255,205,205,0.96)" dimColor="rgba(255,255,255,0.04)" dotSize={8} gap={2} />

      {/* vertical bar chart like the Clock card's right edge */}
      <div style={{ position:'absolute', right:18, bottom:22, display:'flex', alignItems:'flex-end', gap:2 }}>
        {[0.3, 0.5, 0.65, 0.8, 1].map((h, i) => (
          <div key={i} style={{ width:3, height: Math.round(h * 28), borderRadius:2, background:'rgba(255,175,175,0.35)' }} />
        ))}
      </div>

      <div style={{ marginTop:12, fontSize:9.5, color:'rgba(255,175,175,0.40)', fontFamily:"'Inter',system-ui,sans-serif" }}>
        {count > 0 ? `Tap to review` : 'All caught up ✓'}
      </div>
    </Widget>
  )
}

/* ── QUICK LAUNCH  (dark pill card like "Today's Metrix") ── */
function QuickLaunchWidget({ onChat, onLab, onArcade, onRoadmaps, onDocs, onBrain, onParents, labBadge }) {
  const actions = [
    { icon: <MessageCircle size={17} />, label: 'Chat',    color: '#818CF8', bg: 'rgba(99,102,241,0.18)', border: 'rgba(99,102,241,0.30)', action: onChat },
    { icon: <FlaskConical  size={17} />, label: 'Lab',     color: '#60A5FA', bg: 'rgba(59,130,246,0.18)', border: 'rgba(59,130,246,0.30)', action: onLab, badge: labBadge },
    { icon: <Gamepad2      size={17} />, label: 'Arcade',  color: '#A78BFA', bg: 'rgba(139,92,246,0.18)', border: 'rgba(139,92,246,0.30)', action: onArcade },
    { icon: <span style={{ fontSize:17, lineHeight:1 }}>🗺️</span>, label: 'Maps', color: '#C4B5FD', bg: 'rgba(167,139,250,0.18)', border: 'rgba(167,139,250,0.30)', action: onRoadmaps },
    { icon: <Brain         size={17} />, label: 'Brain',   color: '#34D399', bg: 'rgba(52,211,153,0.18)', border: 'rgba(52,211,153,0.30)', action: onBrain },
    { icon: <FileText      size={17} />, label: 'Docs',    color: '#FCD34D', bg: 'rgba(245,158,11,0.18)', border: 'rgba(245,158,11,0.30)', action: onDocs },
    { icon: <Users         size={17} />, label: 'Parents', color: '#FB7185', bg: 'rgba(251,113,133,0.18)', border: 'rgba(251,113,133,0.30)', action: onParents },
    { icon: <BookOpen      size={17} />, label: 'Library', color: '#93C5FD', bg: 'rgba(96,165,250,0.18)', border: 'rgba(96,165,250,0.30)', action: onDocs },
  ]
  return (
    <Widget idx={6} style={{
      background: 'radial-gradient(ellipse at 50% 0%, rgba(50,45,80,0.60) 0%, rgba(8,7,18,0.0) 65%), #0c0b16',
      gridColumn: 'span 2',
    }}>
      <Label color="rgba(255,255,255,0.28)">Quick Launch</Label>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:9, marginTop:12 }}>
        {actions.map(a => (
          <motion.button key={a.label} onClick={a.action} whileHover={{ scale:1.07, y:-2 }} whileTap={{ scale:0.93 }}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'12px 6px', borderRadius:18, background:a.bg, border:`1px solid ${a.border}`, color:a.color, cursor:'pointer', position:'relative', fontFamily:"'Inter',system-ui,sans-serif" }}>
            {a.icon}
            <span style={{ fontSize:9.5, fontWeight:600, color:'rgba(255,255,255,0.60)' }}>{a.label}</span>
            {a.badge > 0 && (
              <div style={{ position:'absolute', top:-4, right:-4, minWidth:16, height:16, borderRadius:99, background:'#4ADE80', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800, color:'#050a1a', padding:'0 3px', boxShadow:'0 0 8px rgba(74,222,128,0.60)' }}>
                {a.badge}
              </div>
            )}
          </motion.button>
        ))}
      </div>
    </Widget>
  )
}

/* ── KNOWLEDGE  (Skin Damage — dark navy, bloom scatter dots) ── */
function KnowledgeWidget({ concepts, onPalace }) {
  return (
    <Widget idx={7} onClick={onPalace} style={{
      background: 'radial-gradient(ellipse 160% 130% at 78% 5%, #2848D0 0%, #1830B0 22%, #0E2090 45%, #081470 66%, #050A50 84%, #030638 100%)',
      gridColumn: 'span 2',
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <Label color="rgba(255,255,255,0.38)">Knowledge</Label>
          <Sub color="rgba(148,200,255,0.38)">Monitoring</Sub>
          <div style={{ fontSize:38, fontWeight:900, color:'rgba(148,200,255,0.75)', letterSpacing:'-0.05em', lineHeight:1, fontFamily:"'Inter',system-ui,sans-serif" }}>
            {concepts.length}
          </div>
          <div style={{ fontSize:9.5, color:'rgba(148,200,255,0.35)', marginTop:4, fontFamily:"'Inter',system-ui,sans-serif" }}>
            concepts mapped
          </div>
          {/* small "AM" style sublabel like the reference */}
          <div style={{ marginTop:12, fontSize:9, color:'rgba(255,255,255,0.20)', fontFamily:"'Inter',system-ui,sans-serif", letterSpacing:'0.06em', textTransform:'uppercase' }}>
            Tap to explore
          </div>
        </div>
        <div style={{ width:130, height:130, flexShrink:0 }}>
          <ScatterDots concepts={concepts} />
        </div>
      </div>
    </Widget>
  )
}

/* ═══════════════════════════════════════════════════
   MAIN EXPORT
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
  const { openLab, orders: labOrders } = useLabStore()
  const { openArcade } = useArcadeStore()
  const { openRoadmapHub, roadmaps } = useRoadmapStore()

  const level      = levelFromXP(xp)
  const xpPct      = xpIntoLevel(xp)
  const dueCount   = getDueCount()
  const orbDef     = ORBS.find(o => o.id === activeOrbId) || ORBS[0]
  const labBadge   = (labOrders || []).filter(o => !o.completedAt).length + dueCount

  const readinessPct = useMemo(() => {
    const rm = roadmaps?.[0]
    if (!rm?.nodes?.length) return 0
    const score = rm.nodes.reduce((s, n) => {
      const c = n.confidence || 'none'
      return s + (c === 'solid' ? 100 : c === 'shaky' ? 60 : 0)
    }, 0)
    return Math.round(score / rm.nodes.length)
  }, [roadmaps])

  const VIBE_MAP = {
    Proud:    { name:'In The Zone', color:'#4ADE80', sub:'On a winning streak' },
    Engaged:  { name:'Locked In',   color:'#4ADE80', sub:'Full focus engaged' },
    Focused:  { name:'Locked In',   color:'#4ADE80', sub:'Full focus engaged' },
    Impressed:{ name:'Momentum',    color:'#60A5FA', sub:'Building fast' },
    Skeptical:{ name:'Critical',    color:'#F87171', sub:'Questioning everything' },
    Concerned:{ name:'Rebuilding',  color:'#FBBF24', sub:'Finding focus' },
  }
  const isNew = !totalExchanges || totalExchanges < 3
  const mode = isNew
    ? { name:'Calibrating', color:'#A78BFA', sub:'Getting to know you' }
    : frustrationScore > 72
      ? { name:'Simplifying', color:'#F97316', sub:'Aeva adjusting level' }
      : (VIBE_MAP[currentVibe] || { name:'Focused', color:'#4ADE80', sub:'Ready to learn' })

  return (
    <motion.div
      key="widget-dashboard"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
        gap: 14,
        padding: isMobile ? '12px' : '8px 24px',
        maxWidth: 1280,
        margin: '0 auto',
        paddingBottom: isMobile ? 'calc(90px + env(safe-area-inset-bottom))' : 48,
      }}
    >
      <HeroWidget
        name={userName}
        level={level}
        xpPct={xpPct}
        onOrbClick={onOrbClick}
        activeOrbDef={orbDef}
        orbPersonality={orbPersonality}
        onChatOpen={onChatOpen}
      />
      <StreakWidget streak={streak} />
      <LevelWidget level={level} xpPct={xpPct} />
      <ReadinessWidget pct={readinessPct} roadmapTitle={roadmaps?.[0]?.title} />
      <ModeWidget modeName={mode.name} modeColor={mode.color} modeSub={mode.sub} />
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
      <KnowledgeWidget concepts={[...conceptMap]} onPalace={onPalace} />
    </motion.div>
  )
}
