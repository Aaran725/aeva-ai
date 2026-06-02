import { motion } from 'framer-motion'

const ORB_PULSES = {
  aggressive: { scale: [1, 1.22, 0.97, 1.20, 1], dur: 0.85 },
  academic:   { scale: [1, 1.03, 1],              dur: 9    },
  curious:    { scale: [1, 1.12, 1.04, 1.09, 1],  dur: 3.8  },
  balanced:   { scale: [1, 1.05, 1],              dur: 4.5  },
}

const DEFAULT_GRADIENT = 'linear-gradient(122deg,#040622 0%,#090b38 7%,#141870 16%,#2D308E 27%,#4545aa 38%,#6a6ac0 48%,#9898d2 56%,#c0c6e8 63%,#dde2f6 68%,#eeeaf4 72%,#f4ede0 76%,#f0d4a0 80%,#E9A364 84%,#d08038 88%,#964e20 93%,#501808 97%,#1a0806 100%)'

export default function AevaOrb({ size = 218, active = false, scanMode = false, personality = 'balanced', orbGradient, orbAccent }) {
  const gradient = orbGradient || DEFAULT_GRADIENT
  const s = size / 218
  const shellW = Math.round(218 * s * 0.88)
  const shellH = Math.round(205 * s * 0.88)
  const pulse = ORB_PULSES[personality] || ORB_PULSES.balanced
  const [ar, ag, ab] = orbAccent || [233, 163, 100]

  return (
    <div style={{
      position: 'relative',
      width: Math.round(260 * s), height: Math.round(250 * s),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      filter: 'saturate(1.55) contrast(1.10)', flexShrink: 0,
    }}>
      {/* Outer aura — accent coloured */}
      <motion.div
        animate={{ scale: scanMode ? [1, 1.03, 1] : active ? [1, 1.18, 1] : pulse.scale }}
        transition={{ duration: scanMode ? 3.5 : active ? 1.2 : pulse.dur, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', inset: Math.round(-20 * s), borderRadius: '50%',
          background: `radial-gradient(ellipse at 44% 52%, rgba(${ar},${ag},${ab},0.32) 0%, rgba(${ar},${ag},${ab},0.10) 52%, transparent 76%)`,
          filter: `blur(${Math.round(42 * s)}px)`,
          transition: 'background 1.2s ease',
        }}
      />
      <motion.div
        animate={{
          borderRadius: active
            ? ['56% 44% 40% 60% / 54% 44% 56% 46%', '50% 50% 46% 54% / 52% 50% 50% 48%', '56% 44% 40% 60% / 54% 44% 56% 46%']
            : ['56% 44% 40% 60% / 54% 44% 56% 46%', '52% 48% 44% 56% / 53% 46% 54% 47%', '56% 44% 40% 60% / 54% 44% 56% 46%'],
          scale: active ? [1, 1.065, 1] : [1, 1.018, 1],
        }}
        transition={{
          borderRadius: { duration: active ? 4 : 16, repeat: Infinity, ease: 'easeInOut' },
          scale: { duration: active ? 1.5 : 8, repeat: Infinity, ease: 'easeInOut' },
        }}
        style={{
          position: 'relative', width: shellW, height: shellH,
          borderRadius: '56% 44% 40% 60% / 54% 44% 56% 46%',
          overflow: 'hidden',
          boxShadow: scanMode
            ? 'inset 0 0 30px rgba(96,165,250,0.50), inset 0 2px 10px rgba(147,197,253,0.60), 0 0 24px rgba(59,130,246,0.35)'
            : `inset 0 0 30px rgba(${ar},${ag},${ab},0.28), inset 0 2px 10px rgba(255,255,255,0.40), 0 0 ${Math.round(28*s)}px rgba(${ar},${ag},${ab},0.35)`,
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          transition: 'box-shadow 1.2s ease',
        }}
      >
        {/* Base gradient */}
        <div style={{ position: 'absolute', inset: 0, background: scanMode
          ? 'linear-gradient(122deg,#020a1a 0%,#051430 8%,#0a2456 16%,#1240a0 26%,#1D4ED8 36%,#2563EB 46%,#3B82F6 54%,#60A5FA 62%,#93C5FD 68%,#BAE6FD 72%,#E0F2FE 76%,#BAE6FD 80%,#60A5FA 84%,#2563EB 88%,#1a3a8a 93%,#0d1f50 97%,#020a1a 100%)'
          : gradient,
          transition: 'background 1.4s ease',
        }} />
        {/* Depth vignettes */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: 'radial-gradient(ellipse at 50% 50%, transparent 46%, rgba(0,0,0,0.30) 62%, rgba(0,0,0,0.58) 76%, rgba(0,0,0,0.80) 90%, rgba(0,0,0,0.92) 100%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: 'radial-gradient(ellipse at 72% 28%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.30) 30%, transparent 62%)', pointerEvents: 'none' }} />
        {/* Primary inner light — accent coloured */}
        <motion.div
          animate={{ x: [0, -15, 9, -5, 0], y: [0, 11, -14, 6, 0], scale: [1, 1.15, 0.92, 1.07, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', width: '75%', height: '70%', top: '16%', left: '-6%',
            borderRadius: '60% 40% 46% 54% / 58% 62% 38% 42%',
            background: `radial-gradient(ellipse at 46% 52%, rgba(255,255,255,0.95) 0%, rgba(${ar},${ag},${ab},0.90) 20%, rgba(${ar},${ag},${ab},0.60) 44%, rgba(${ar},${ag},${ab},0.18) 70%, transparent 100%)`,
            filter: `blur(${Math.round(14 * s)}px)`, mixBlendMode: 'screen',
            transition: 'background 1.2s ease',
          }}
        />
        {/* Secondary inner light */}
        <motion.div
          animate={{ x: [0, -8, 5, 0], y: [0, 8, -10, 0], opacity: [0.95, 1, 0.88, 0.95] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
          style={{
            position: 'absolute', width: '36%', height: '34%', top: '30%', left: '8%',
            borderRadius: '50%',
            background: `radial-gradient(ellipse, rgba(255,255,255,1) 0%, rgba(${ar},${ag},${ab},0.88) 32%, rgba(${ar},${ag},${ab},0.40) 66%, transparent 100%)`,
            filter: `blur(${Math.round(7 * s)}px)`, mixBlendMode: 'screen',
            transition: 'background 1.2s ease',
          }}
        />
        {/* Rotating shimmer */}
        <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.14) 0%, transparent 55%)', mixBlendMode: 'overlay', borderRadius: 'inherit' }} />
        <motion.div animate={{ rotate: [0, -360] }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse at 70% 65%, rgba(${ar},${ag},${ab},0.10) 0%, transparent 50%)`,
            mixBlendMode: 'overlay', borderRadius: 'inherit',
            transition: 'background 1.2s ease',
          }} />
        {/* Specular highlight */}
        <div style={{ position: 'absolute', width: '38%', height: '28%', top: '4%', right: '2%', borderRadius: '50%', background: 'radial-gradient(ellipse at 44% 34%, rgba(255,255,255,0.60) 0%, rgba(255,255,255,0.18) 48%, transparent 76%)', filter: `blur(${Math.round(10 * s)}px)` }} />
        <div style={{ position: 'absolute', width: '8%', height: '6%', top: '8%', right: '18%', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(255,255,255,1) 0%, rgba(255,255,255,0.50) 55%, transparent 80%)', filter: `blur(${Math.round(2 * s)}px)` }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', boxShadow: 'inset 0 0 65px rgba(0,0,0,0.65)', pointerEvents: 'none' }} />
      </motion.div>
    </div>
  )
}
