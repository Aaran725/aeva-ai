/**
 * CalibrationResult.jsx
 * Phase 4 & 5: Full-screen result overlay with AI insights + history timeline.
 * Replaces the old inline chat card.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, RotateCcw, ChevronRight, ChevronDown, Layers } from 'lucide-react'
import { SUBJECT_LABELS, SUBJECT_ICONS, CALIBRATION_MAP, NODE_CLUSTERS, CLUSTER_LABELS } from './calibrationMap'

// ── Lower-bound threshold for each band (mirrors calibBand thresholds in App.jsx) ──
// Used to compute position-within-band for the sub-level indicator.
const BAND_LOWER = {
  'AP · Year 2':  8.5,
  'AP · Year 1':  7.5,
  'Grade 11+':    6.5,
  'Grade 11':     5.5,
  'Grade 10+':    4.5,
  'Grade 10':     3.5,
  'Grade 9+':     2.5,
  'Grade 9':      1.5,
  'Grade 8':      0.5,
  'Grade 7':     -0.5,
  'Grade 6':     -1.5,
  'Grade 5':     -2.5,
  'Grade 4':     -3.5,
  'Grade 3':     -4.5,
  'Grade 2':     -5.5,
  'Grade 1':     -6.5,
}

// ── Band ordering for progress comparisons ────────────────────────────────────
const BAND_ORDER = {
  'Grade 1': 0, 'Grade 2': 1, 'Grade 3': 2, 'Grade 4': 3,
  'Grade 5': 4, 'Grade 6': 5, 'Grade 7': 6, 'Grade 8': 7,
  'Grade 9': 8, 'Grade 9+': 9, 'Grade 10': 10, 'Grade 10+': 11,
  'Grade 11': 12, 'Grade 11+': 13, 'AP · Year 1': 14, 'AP · Year 2': 15,
}
const BAND_COLORS = {
  'Grade 1':      '#F87171', 'Grade 2':      '#F87171',
  'Grade 3':      '#FB923C', 'Grade 4':      '#FB923C',
  'Grade 5':      '#FBBF24', 'Grade 6':      '#60D0A0',
  'Grade 7':      '#4ADE80', 'Grade 8':      '#34D399',
  'Grade 9':      '#A78BFA', 'Grade 9+':     '#9B75F5',
  'Grade 10':     '#8B5CF6', 'Grade 10+':    '#7C52E8',
  'Grade 11':     '#6366F1', 'Grade 11+':    '#5558D9',
  'AP · Year 1':  '#E9A364', 'AP · Year 2':  '#F59E0B',
}

// ── Result UI text (English + Japanese) ──────────────────────────────────────
const RESULT_TEXT = {
  en: {
    yourLevel:          'Your Level',
    estimatedRange:     (lo, hi) => `Estimated range: ${lo} – ${hi}`,
    subLabel:           (pos) => pos < 0.35 ? 'Developing' : pos < 0.70 ? 'Solid' : 'Strong',
    subDesc:            (pos) => pos < 0.35 ? "You're building this level" : pos < 0.70 ? "You're comfortably here" : 'Ready to move up',
    bandStart:          (b) => `Start of ${b}`,
    nextLevel:          'Next level →',
    topicBreakdown:     'Topic Breakdown',
    topicsCovered:      (hit, total) => `${hit}/${total} topics covered`,
    notReached:         'Not reached in this diagnostic',
    topicStatus:        { strong: 'Strong', developing: 'Developing', weak: 'Weak', untested: 'Not tested' },
    skillBreakdown:     'Skill Breakdown',
    skillStatus:        { mastery: 'Mastery', solid: 'Solid', shaky: 'Shaky', gap: 'Gap' },
    aevaInsights:       "Aeva's Insights",
    generatingInsights: 'Generating insights…',
    yourProgress:       'Your Progress',
    now:                '← now',
    whatToWorkOn:       'What To Work On',
    startHere:          'Start Here',
    study:              'Study',
    recStatus:          {
      gap:   { icon: '✗', label: 'Gap'      },
      shaky: { icon: '△', label: 'Shaky'    },
      next:  { icon: '→', label: 'Next step' },
    },
    resolveReason: (reasonKey, reasonN) => {
      if (reasonKey === 'unlocksN') return `Unlocks ${reasonN} other topics`
      if (reasonKey === 'unlocks2') return 'Unlocks 2 other topics'
      if (reasonKey === 'unlocks1') return 'Prerequisite for another topic'
      if (reasonKey === 'weakestArea') return 'Weakest topic area'
      if (reasonKey === 'gapFound') return 'Gap identified in diagnostic'
      if (reasonKey === 'consolidate') return 'Needs consolidation'
      return 'Next step up'
    },
    diagnosticComplete: 'Diagnostic Complete',
    backToChat:         'Back to Chat',
    statsQ:             (n) => `${n} questions`,
    statsMins:          (n) => `${n} min${n !== 1 ? 's' : ''}`,
    statsSkills:        (n) => `${n} skills assessed`,
    confidence:         (n) => `${n}% confidence`,
    calibrateAnother:   'Calibrate another subject',
    reRun:              'Re-run this diagnostic',
  },
  ja: {
    yourLevel:          'あなたのレベル',
    estimatedRange:     (lo, hi) => `推定範囲: ${lo} – ${hi}`,
    subLabel:           (pos) => pos < 0.35 ? '発展中' : pos < 0.70 ? '習得' : '得意',
    subDesc:            (pos) => pos < 0.35 ? 'このレベルを構築中です' : pos < 0.70 ? 'このレベルは安定しています' : '次のレベルへ進む準備ができています',
    bandStart:          (b) => `${b} の開始`,
    nextLevel:          '次のレベル →',
    topicBreakdown:     'トピック別分析',
    topicsCovered:      (hit, total) => `${hit}/${total} トピックをカバー`,
    notReached:         'この診断では到達しませんでした',
    topicStatus:        { strong: '得意', developing: '発展中', weak: '弱点', untested: '未テスト' },
    skillBreakdown:     'スキル分析',
    skillStatus:        { mastery: '完全習得', solid: '習得', shaky: '不安定', gap: '未習得' },
    aevaInsights:       'Aeva のインサイト',
    generatingInsights: 'インサイトを生成中…',
    yourProgress:       'あなたの進捗',
    now:                '← 現在',
    whatToWorkOn:       '取り組むべき内容',
    startHere:          'ここから始める',
    study:              '学習する',
    recStatus:          {
      gap:   { icon: '✗', label: '未習得'      },
      shaky: { icon: '△', label: '不安定'      },
      next:  { icon: '→', label: '次のステップ' },
    },
    resolveReason: (reasonKey, reasonN) => {
      if (reasonKey === 'unlocksN') return `${reasonN}つのトピックを解放`
      if (reasonKey === 'unlocks2') return '2つのトピックを解放'
      if (reasonKey === 'unlocks1') return '別のトピックの前提条件'
      if (reasonKey === 'weakestArea') return '最も弱いトピック分野'
      if (reasonKey === 'gapFound') return '診断で特定されたギャップ'
      if (reasonKey === 'consolidate') return '定着が必要'
      return '次のステップ'
    },
    diagnosticComplete: '診断完了',
    backToChat:         'チャットに戻る',
    statsQ:             (n) => `${n} 問`,
    statsMins:          (n) => `${n} 分`,
    statsSkills:        (n) => `${n} スキルを評価`,
    confidence:         (n) => `信頼度 ${n}%`,
    calibrateAnother:   '別の科目を診断する',
    reRun:              '診断を再実行する',
  },
}
const getT = (lang) => RESULT_TEXT[lang] || RESULT_TEXT.en

// ── Sub-band indicator ────────────────────────────────────────────────────────
function SubBandIndicator({ band, bandAvg, bandColor, isLight, lang = 'en' }) {
  if (bandAvg == null) return null
  const t = getT(lang)
  const lower = BAND_LOWER[band] ?? -6.5
  const pos = Math.max(0, Math.min(1, bandAvg - lower))
  const pct = Math.round(pos * 100)
  const subLabel = t.subLabel(pos)
  const subDesc  = t.subDesc(pos)
  const trackBg = isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)'
  const mutedCol = isLight ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.35)'

  return (
    <div style={{ marginTop: 18 }}>
      {/* Label row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase',
            color: bandColor,
            background: `${bandColor}18`,
            border: `1px solid ${bandColor}38`,
            padding: '3px 9px', borderRadius: 99,
          }}>
            {subLabel}
          </span>
          <span style={{ fontSize: 11.5, color: mutedCol }}>{subDesc}</span>
        </div>
        <span style={{ fontSize: 11, color: mutedCol, fontWeight: 600 }}>{pct}%</span>
      </div>
      {/* Bar */}
      <div style={{ height: 6, borderRadius: 99, background: trackBg, overflow: 'hidden', position: 'relative' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: 0.25, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          style={{
            height: '100%', borderRadius: 99,
            background: `linear-gradient(90deg, ${bandColor}99, ${bandColor})`,
            boxShadow: `0 0 10px ${bandColor}66`,
          }}
        />
        {/* Next-level marker at 100% */}
        <div style={{
          position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
          width: 2, height: 10, borderRadius: 1,
          background: isLight ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.18)',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        <span style={{ fontSize: 10, color: mutedCol }}>{t.bandStart(band)}</span>
        <span style={{ fontSize: 10, color: mutedCol }}>{t.nextLevel}</span>
      </div>
    </div>
  )
}

// ── Topic breakdown ───────────────────────────────────────────────────────────
const TOPIC_STATUS = {
  strong:     { icon: '✓', color: '#4ADE80', bg: 'rgba(74,222,128,0.08)',   border: 'rgba(74,222,128,0.22)',  label: 'Strong'     },
  developing: { icon: '△', color: '#FBBF24', bg: 'rgba(251,191,36,0.08)',   border: 'rgba(251,191,36,0.22)',  label: 'Developing' },
  weak:       { icon: '✗', color: '#F87171', bg: 'rgba(248,113,113,0.08)',  border: 'rgba(248,113,113,0.22)', label: 'Weak'       },
  untested:   { icon: '—', color: 'rgba(255,255,255,0.25)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.10)', label: 'Not tested' },
}

function TopicBreakdown({ subject, skillMap, isLight, lang = 'en', onRunMiniDiagnostic }) {
  const t = getT(lang)
  const clusterMap  = NODE_CLUSTERS[subject]
  const labelMap    = CLUSTER_LABELS[subject]
  if (!clusterMap || !labelMap) return null

  // Unique cluster keys in definition order
  const clusterKeys = [...new Set(Object.values(clusterMap))]

  const clusters = clusterKeys.map(key => {
    const nodeIds  = Object.entries(clusterMap).filter(([, c]) => c === key).map(([id]) => id)
    const assessed = nodeIds.filter(id => skillMap[id])
    if (!assessed.length) return { key, status: 'untested', pct: 0, assessed: 0, total: nodeIds.length }

    const scoreOf = s => s === 'mastery' ? 3 : s === 'solid' ? 2 : s === 'shaky' ? 1 : 0
    const total   = assessed.length
    const avg     = assessed.reduce((acc, id) => acc + scoreOf(skillMap[id]), 0) / total
    const pct     = Math.round((avg / 3) * 100)
    const status  = avg >= 2.0 ? 'strong' : avg >= 1.0 ? 'developing' : 'weak'
    return { key, status, pct, assessed: total, total: nodeIds.length }
  })

  const mutedCol = isLight ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.35)'
  const testedCount = clusters.filter(c => c.status !== 'untested').length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.10em', color: mutedCol, textTransform: 'uppercase' }}>
          {t.topicBreakdown}
        </div>
        <span style={{ fontSize: 10.5, color: mutedCol }}>
          {t.topicsCovered(testedCount, clusters.length)}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {clusters.map(({ key, status, pct, assessed, total }) => {
          const cfg  = TOPIC_STATUS[status]
          const name = labelMap[key] || key
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 12,
                background: cfg.bg, border: `1px solid ${cfg.border}`,
              }}
            >
              {/* Icon */}
              <span style={{ fontSize: 13, fontWeight: 800, color: cfg.color, width: 14, textAlign: 'center', flexShrink: 0 }}>
                {cfg.icon}
              </span>

              {/* Name + status label */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{name}</span>
                  <span style={{ fontSize: 10.5, color: cfg.color, opacity: 0.7 }}>{t.topicStatus[status] || cfg.label}</span>
                </div>
                {status !== 'untested' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                    {/* Mini bar */}
                    <div style={{ flex: 1, height: 3, borderRadius: 99, background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.15, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                        style={{ height: '100%', borderRadius: 99, background: cfg.color }}
                      />
                    </div>
                    <span style={{ fontSize: 10, color: mutedCol, flexShrink: 0 }}>{assessed}/{total} nodes</span>
                  </div>
                )}
                {status === 'untested' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 3, gap: 8 }}>
                    <div style={{ fontSize: 10.5, color: mutedCol }}>
                      {t.notReached}
                    </div>
                    {onRunMiniDiagnostic && (
                      <button
                        onClick={() => onRunMiniDiagnostic(key)}
                        style={{
                          background: 'none', border: `1px solid ${isLight ? 'rgba(129,140,248,0.35)' : 'rgba(129,140,248,0.30)'}`,
                          borderRadius: 8, padding: '3px 9px', cursor: 'pointer',
                          fontSize: 10, fontWeight: 700, color: '#818CF8',
                          fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
                        }}
                      >
                        Quick test →
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Score pct */}
              {status !== 'untested' && (
                <span style={{ fontSize: 12, fontWeight: 800, color: cfg.color, flexShrink: 0 }}>
                  {pct}%
                </span>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ── Status config for skill breakdown ─────────────────────────────────────────
const STATUS = {
  mastery: { dot: '#C084FC', label: 'Mastery',  chip: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.28)' },
  solid:   { dot: '#4ADE80', label: 'Solid',    chip: 'rgba(74,222,128,0.10)',  border: 'rgba(74,222,128,0.26)'  },
  shaky:   { dot: '#FBBF24', label: 'Shaky',    chip: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.26)'  },
  gap:     { dot: '#F87171', label: 'Gap',       chip: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.26)' },
}

// ── Skill breakdown section ───────────────────────────────────────────────────
function SkillBreakdown({ skillMap, subjectMap, isLight, lang = 'en' }) {
  const t = getT(lang)
  const groups = ['mastery', 'solid', 'shaky', 'gap']
    .map(s => ({ status: s, skills: Object.entries(skillMap || {}).filter(([, v]) => v === s) }))
    .filter(g => g.skills.length > 0)

  const text   = isLight ? '#0f1117'            : 'rgba(255,255,255,0.88)'
  const label  = isLight ? 'rgba(0,0,0,0.42)'  : 'rgba(255,255,255,0.35)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.10em', color: label, textTransform: 'uppercase' }}>
        {t.skillBreakdown}
      </div>
      {groups.map(({ status, skills }) => {
        const cfg = STATUS[status]
        return (
          <div key={status}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot, flexShrink: 0, boxShadow: `0 0 6px ${cfg.dot}88` }} />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: cfg.dot, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {t.skillStatus[status] || cfg.label}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {skills.map(([id]) => (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  style={{
                    padding: '5px 13px', borderRadius: 99,
                    background: cfg.chip, border: `1px solid ${cfg.border}`,
                    fontSize: 12, fontWeight: 600, color: cfg.dot,
                  }}
                >
                  {subjectMap[id]?.label || id}
                </motion.div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── AI Insights section ───────────────────────────────────────────────────────
function InsightsPanel({ insights, isLight, lang = 'en' }) {
  const t = getT(lang)
  const cardBg  = isLight ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.10)'
  const border  = isLight ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.22)'
  const label   = isLight ? 'rgba(0,0,0,0.4)'      : 'rgba(255,255,255,0.35)'
  const textCol = isLight ? '#0f1117'               : 'rgba(255,255,255,0.82)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.10em', color: label, textTransform: 'uppercase' }}>
        {t.aevaInsights}
      </div>

      {!insights && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderRadius: 12, background: cardBg, border: `1px solid ${border}` }}>
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.3, repeat: Infinity }}
            style={{ width: 7, height: 7, borderRadius: '50%', background: '#818CF8', flexShrink: 0 }}
          />
          <span style={{ fontSize: 12.5, color: label }}>{t.generatingInsights}</span>
        </div>
      )}

      {insights && insights.length === 0 && (
        <div style={{ fontSize: 12.5, color: label, fontStyle: 'italic' }}>
          Complete the diagnostic to see personalised insights.
        </div>
      )}

      {insights && insights.map((insight, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.12, duration: 0.22 }}
          style={{
            display: 'flex', gap: 12, alignItems: 'flex-start',
            padding: '13px 16px', borderRadius: 12,
            background: cardBg, border: `1px solid ${border}`,
          }}
        >
          <span style={{ fontSize: 13, flexShrink: 0, marginTop: 0.5 }}>
            {i === 0 ? '🔗' : i === 1 ? '🎯' : '→'}
          </span>
          <span style={{ fontSize: 13, lineHeight: 1.6, color: textCol }}>{insight}</span>
        </motion.div>
      ))}
    </div>
  )
}

// ── Recommendation cards (Phase B) ───────────────────────────────────────────
const REC_STATUS = {
  gap:  { icon: '✗', label: 'Gap',         color: '#F87171' },
  shaky:{ icon: '△', label: 'Shaky',       color: '#FBBF24' },
  next: { icon: '→', label: 'Next step',   color: '#4ADE80' },
}

// Estimated time-to-master heuristic based on rec status
const STEP_TIME = { gap: '~2 sessions', shaky: '~1 session', next: '~3 sessions' }

function RecommendationCards({ recommendations, subjectMap, bandColor, isLight, onStartTopic, subject, lang = 'en' }) {
  if (!recommendations?.length) return null
  const t       = getT(lang)
  const cardBg    = isLight ? '#ffffff'               : '#161826'
  const borderCol = isLight ? 'rgba(0,0,0,0.08)'     : 'rgba(255,255,255,0.07)'
  const textCol   = isLight ? '#0f1117'               : 'rgba(255,255,255,0.88)'
  const mutedCol  = isLight ? 'rgba(0,0,0,0.38)'     : 'rgba(255,255,255,0.35)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.24, duration: 0.24 }}
      style={{ background: cardBg, borderRadius: 20, border: `1px solid ${borderCol}`, padding: '20px 22px' }}
    >
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.10em', color: mutedCol, textTransform: 'uppercase', marginBottom: 14 }}>
        {t.whatToWorkOn}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {recommendations.map((rec, i) => {
          const isPrimary   = i === 0
          const cfg         = t.recStatus[rec.status] || REC_STATUS[rec.status] || { icon: '→', label: 'Topic', color: bandColor }
          const statusColor = cfg.color
          const timeEst     = STEP_TIME[rec.status] || '~2 sessions'
          const unlockCount = rec.reasonN || (rec.reasonKey === 'unlocks2' ? 2 : rec.reasonKey === 'unlocks1' ? 1 : null)
          const whyLine     = rec.reasonKey ? t.resolveReason(rec.reasonKey, rec.reasonN) : rec.reason

          return (
            <motion.div
              key={rec.nodeId}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.26 + i * 0.07, duration: 0.20 }}
              style={{
                padding: isPrimary ? '14px 16px' : '10px 14px',
                borderRadius: 14,
                background: isPrimary
                  ? `${statusColor}12`
                  : isLight ? 'rgba(0,0,0,0.025)' : 'rgba(255,255,255,0.025)',
                border: `1px solid ${isPrimary ? statusColor + '35' : borderCol}`,
                borderLeft: `3px solid ${isPrimary ? statusColor : (isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.08)')}`,
              }}
            >
              {/* Step number + status row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                <span style={{
                  fontSize: 9, fontWeight: 900, color: isLight ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.28)',
                  letterSpacing: '0.04em',
                }}>
                  STEP {i + 1}
                </span>
                {isPrimary && (
                  <>
                    <span style={{ color: mutedCol, fontSize: 9 }}>·</span>
                    <span style={{ fontSize: 9, fontWeight: 800, color: statusColor, letterSpacing: '0.09em', textTransform: 'uppercase' }}>
                      {t.startHere}
                    </span>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: isPrimary ? 14 : 12.5, fontWeight: isPrimary ? 800 : 600, color: textCol, marginBottom: 5, lineHeight: 1.3 }}>
                    {rec.label}
                  </div>

                  {/* Why + time estimate */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: isPrimary ? 6 : 0 }}>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: statusColor }}>
                      {cfg.icon} {cfg.label}
                    </span>
                    <span style={{ fontSize: 9.5, color: mutedCol }}>·</span>
                    <span style={{ fontSize: 9.5, color: mutedCol }}>{whyLine}</span>
                    <span style={{ fontSize: 9.5, color: mutedCol }}>·</span>
                    <span style={{ fontSize: 9.5, color: mutedCol }}>{timeEst}</span>
                  </div>

                  {/* Primary card: unlock chain + lesson prompt */}
                  {isPrimary && (
                    <div style={{
                      fontSize: 11, lineHeight: 1.5, color: mutedCol, fontStyle: 'italic',
                      borderTop: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}`,
                      paddingTop: 6, marginTop: 4,
                    }}>
                      {unlockCount != null
                        ? `Mastering this unlocks ${unlockCount} related skill${unlockCount !== 1 ? 's' : ''} — it's the highest-leverage place to start.`
                        : `This is your next unlock — addressing it now compounds your progress fastest.`
                      }
                    </div>
                  )}
                </div>
                {isPrimary && (
                  <button
                    onClick={() => onStartTopic?.(rec.nodeId, subject)}
                    style={{
                      flexShrink: 0, padding: '8px 14px', borderRadius: 10,
                      background: statusColor, border: 'none',
                      fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    {t.study} <ChevronRight size={12} />
                  </button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

// ── History timeline (Phase 5) ────────────────────────────────────────────────
function HistoryTimeline({ history, currentBand, isLight, lang = 'en' }) {
  const t = getT(lang)
  if (!history || history.length < 2) return null

  // Show last 5 entries (current last = newest)
  const recent = history.slice(-5)
  const label  = isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.35)'

  // Detect net improvement vs first entry
  const firstBandOrder   = BAND_ORDER[recent[0].band] ?? -1
  const currentBandOrder = BAND_ORDER[currentBand]    ?? -1
  const improved = currentBandOrder > firstBandOrder

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.10em', color: label, textTransform: 'uppercase' }}>
          {t.yourProgress}
        </div>
        {improved && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              fontSize: 10.5, fontWeight: 800, color: '#4ADE80',
              background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.25)',
              padding: '3px 10px', borderRadius: 99,
            }}
          >
            ↑ {recent[0].band} → {currentBand}
          </motion.div>
        )}
      </div>

      {/* Timeline dots */}
      <div style={{ position: 'relative', paddingLeft: 20 }}>
        {/* Vertical connector line */}
        <div style={{ position: 'absolute', left: 6, top: 8, bottom: 8, width: 1.5, background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)', borderRadius: 1 }} />

        {recent.map((entry, i) => {
          const isLatest   = i === recent.length - 1
          const bandColor  = BAND_COLORS[entry.band] || '#818CF8'
          const textColor  = isLight ? '#0f1117' : 'rgba(255,255,255,0.85)'
          const dateStr    = entry.calibratedAt
            ? new Date(entry.calibratedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
            : ''

          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: i < recent.length - 1 ? 14 : 0 }}>
              {/* Dot */}
              <div style={{
                width: isLatest ? 13 : 9, height: isLatest ? 13 : 9,
                borderRadius: '50%',
                background: isLatest ? bandColor : (isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'),
                border: isLatest ? `2px solid ${bandColor}` : 'none',
                boxShadow: isLatest ? `0 0 8px ${bandColor}88` : 'none',
                flexShrink: 0,
                marginLeft: isLatest ? -2 : 0,
                transition: 'all 0.3s',
              }} />
              {/* Label */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flex: 1 }}>
                <span style={{ fontSize: isLatest ? 13 : 12, fontWeight: isLatest ? 800 : 500, color: isLatest ? bandColor : label }}>
                  {entry.band}
                </span>
                {isLatest && <span style={{ fontSize: 10.5, color: bandColor, opacity: 0.7, fontWeight: 600 }}>{t.now}</span>}
                <span style={{ fontSize: 10.5, color: label, marginLeft: 'auto' }}>{dateStr}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Missed questions replay (collapsible) ────────────────────────────────────
function MissedQuestionsReplay({ questionLog, isLight }) {
  const [expanded, setExpanded] = useState(false)
  const mistakes = (questionLog || []).filter(e => e.understanding === 'none' || e.understanding === 'partial')
  if (!mistakes.length) return null

  const cardBg   = isLight ? '#ffffff'                  : '#161826'
  const borderCol= isLight ? 'rgba(0,0,0,0.08)'        : 'rgba(255,255,255,0.07)'
  const textCol  = isLight ? '#0f1117'                  : 'rgba(255,255,255,0.88)'
  const mutedCol = isLight ? 'rgba(0,0,0,0.38)'        : 'rgba(255,255,255,0.35)'
  const innerBg  = isLight ? 'rgba(0,0,0,0.025)'       : 'rgba(255,255,255,0.03)'
  const innerBd  = isLight ? 'rgba(0,0,0,0.07)'        : 'rgba(255,255,255,0.06)'
  const correctBg= isLight ? 'rgba(0,0,0,0.035)'       : 'rgba(255,255,255,0.045)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.20, duration: 0.26 }}
      style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 20, overflow: 'hidden' }}
    >
      {/* Toggle header */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '18px 24px', background: 'none', border: 'none',
          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.10em', color: mutedCol, textTransform: 'uppercase' }}>
            Review your mistakes
          </span>
          <span style={{
            fontSize: 9.5, fontWeight: 800, padding: '2px 8px', borderRadius: 99,
            background: 'rgba(248,113,113,0.12)', color: '#F87171',
            border: '1px solid rgba(248,113,113,0.28)',
          }}>
            {mistakes.length}
          </span>
        </div>
        <ChevronDown
          size={14}
          style={{ color: mutedCol, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}
        />
      </button>

      {/* Expandable list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 24px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {mistakes.map((entry, i) => {
                const isPartial = entry.understanding === 'partial'
                const sc = isPartial ? '#FBBF24' : '#F87171'
                const sl = isPartial ? 'Partial' : 'Missed'
                return (
                  <div key={i} style={{
                    borderRadius: 14, padding: '13px 15px',
                    background: innerBg, border: `1px solid ${innerBd}`,
                    borderLeft: `3px solid ${sc}`,
                  }}>
                    {/* Topic + status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                      <span style={{ fontSize: 9.5, fontWeight: 800, color: sc, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{sl}</span>
                      <span style={{ fontSize: 9.5, color: mutedCol }}>·</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: mutedCol }}>{entry.nodeLabel}</span>
                    </div>
                    {/* Question text */}
                    <p style={{ margin: '0 0 7px', fontSize: 13, lineHeight: 1.55, color: textCol, fontWeight: 440 }}>
                      {entry.q.length > 240 ? entry.q.slice(0, 240) + '…' : entry.q}
                    </p>
                    {/* Critic note */}
                    {entry.note && (
                      <p style={{ margin: '0 0 9px', fontSize: 11.5, lineHeight: 1.5, color: mutedCol, fontStyle: 'italic' }}>
                        {entry.note}
                      </p>
                    )}
                    {/* Correct working */}
                    {entry.correctAnswer && (
                      <div style={{ borderRadius: 10, padding: '9px 13px', background: correctBg, border: `1px solid ${innerBd}` }}>
                        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.10em', textTransform: 'uppercase', color: sc, opacity: 0.75, marginBottom: 4 }}>
                          Correct approach
                        </div>
                        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: textCol, whiteSpace: 'pre-wrap' }}>
                          {entry.correctAnswer}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Main export — full-screen result overlay ──────────────────────────────────
export default function CalibrationResult({
  result,
  subject,
  history,
  insights,
  isLight,
  onStartTopic,
  onRecalibrate,
  onAnotherSubject,
  onRunMiniDiagnostic,
  onClose,
}) {
  const subjectLabel = SUBJECT_LABELS[subject] || subject
  const subjectIcon  = SUBJECT_ICONS[subject]  || '📚'
  const subjectMap   = CALIBRATION_MAP[subject] || {}

  const lang      = result?.language || 'en'
  const t         = getT(lang)
  const bandColor = BAND_COLORS[result?.band] || '#818CF8'
  const mins      = result?.durationMs ? Math.round(result.durationMs / 60000) : null
  const confidence = result?.confidence ?? null
  const confColor  = confidence == null ? null
    : confidence >= 75 ? '#4ADE80' : confidence >= 50 ? '#FBBF24' : '#F87171'

  // Detect significant level-up (≥2 band positions above last result)
  const prevResult  = history && history.length >= 2 ? history[history.length - 2] : null
  const prevOrder   = prevResult ? (BAND_ORDER[prevResult.band] ?? -1) : -1
  const currOrder   = BAND_ORDER[result?.band] ?? -1
  const isLevelUp   = prevOrder >= 0 && currOrder - prevOrder >= 2

  // ── Theme tokens ─────────────────────────────────────────────────────────
  const bg         = isLight ? '#f4f5fa'                  : '#0d0e16'
  const cardBg     = isLight ? '#ffffff'                  : '#161826'
  const panelBg    = isLight ? 'rgba(0,0,0,0.03)'        : 'rgba(255,255,255,0.03)'
  const borderCol  = isLight ? 'rgba(0,0,0,0.08)'        : 'rgba(255,255,255,0.07)'
  const textCol    = isLight ? '#0f1117'                  : 'rgba(255,255,255,0.88)'
  const mutedCol   = isLight ? 'rgba(0,0,0,0.38)'        : 'rgba(255,255,255,0.35)'

  if (!result) return null

  return (
    <motion.div
      key="calib-result"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1900,
        background: bg,
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Inter', system-ui, sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 28px', borderBottom: `1px solid ${borderCol}`, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>{subjectIcon}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: textCol }}>{subjectLabel}</span>
          <div style={{ width: 1, height: 14, background: borderCol }} />
          <span style={{ fontSize: 11, color: mutedCol, fontWeight: 600 }}>{t.diagnosticComplete}</span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: mutedCol, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '6px 10px', borderRadius: 8 }}
        >
          <X size={13} /> {t.backToChat}
        </button>
      </div>

      {/* ── Scrollable content ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 40px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', gap: 28, alignItems: 'flex-start' }}>

          {/* ── LEFT: band headline + skill breakdown + history ──────────── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Band headline card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}
              style={{
                background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 20,
                padding: '28px 30px',
                borderTop: `3px solid ${bandColor}`,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: bandColor, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                {isLevelUp ? '🎉 Level up!' : t.yourLevel}
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.72, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.08, type: 'spring', stiffness: 180, damping: 16 }}
                style={{ position: 'relative', display: 'inline-block' }}
              >
                <motion.div
                  animate={isLevelUp ? {
                    textShadow: [`0 0 0px ${bandColor}`, `0 0 28px ${bandColor}88`, `0 0 0px ${bandColor}`],
                  } : {}}
                  transition={{ delay: 0.35, duration: 1.2, ease: 'easeOut' }}
                  style={{ fontSize: 38, fontWeight: 900, color: bandColor, lineHeight: 1, letterSpacing: '-0.02em', marginBottom: 2 }}
                >
                  {result.band || 'Calibrated'}
                </motion.div>
                {/* Burst ring for significant level-ups */}
                {isLevelUp && (
                  <motion.div
                    initial={{ opacity: 0.9, scale: 0.5 }}
                    animate={{ opacity: 0, scale: 2.4 }}
                    transition={{ delay: 0.12, duration: 0.8, ease: 'easeOut' }}
                    style={{
                      position: 'absolute', inset: -4, borderRadius: 12,
                      border: `2px solid ${bandColor}`,
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </motion.div>
              {/* "Level has been set" moment for first-timers or level-ups */}
              {(isLevelUp || !prevResult) && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                  style={{
                    fontSize: 11, fontWeight: 700, color: bandColor, marginBottom: 4, marginTop: 2,
                    opacity: 0.75, letterSpacing: '0.03em',
                  }}
                >
                  {isLevelUp ? `↑ Up from ${prevResult?.band}` : '✓ Your level has been set'}
                </motion.div>
              )}

              {/* Band range (low confidence only) */}
              {result.bandLow && result.bandHigh && (
                <div style={{ fontSize: 12.5, color: mutedCol, marginBottom: 4, marginTop: 2 }}>
                  {t.estimatedRange(result.bandLow, result.bandHigh)}
                </div>
              )}

              <SubBandIndicator
                band={result.band}
                bandAvg={result.bandAvg}
                bandColor={bandColor}
                isLight={isLight}
                lang={lang}
              />

              <div style={{ fontSize: 12.5, color: mutedCol, display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 16, alignItems: 'center' }}>
                <span>{t.statsQ(result.questionsAsked || '?')}</span>
                {mins !== null && <span>{t.statsMins(mins)}</span>}
                <span>{t.statsSkills(Object.keys(result.skillMap || {}).length)}</span>
                {confidence != null && (
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: '2px 9px', borderRadius: 99,
                    background: `${confColor}18`, color: confColor,
                    border: `1px solid ${confColor}35`, letterSpacing: '0.03em',
                  }}>
                    {confidence >= 75 ? '✓ Level confirmed' : t.confidence(confidence)}
                  </span>
                )}
              </div>
              {/* Confidence explanation — always visible, tells students what it means */}
              {confidence != null && (
                <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.5, color: confidence >= 75 ? '#4ADE80' : mutedCol }}>
                  {confidence >= 75
                    ? 'High confidence — your level is well established across multiple topics.'
                    : `${100 - confidence}% of your level is still uncertain. Run more questions to pin down your exact grade.`
                  }
                </div>
              )}
            </motion.div>

            {/* Topic breakdown card */}
            {NODE_CLUSTERS[subject] && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.26 }}
                style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 20, padding: '24px 28px' }}
              >
                <TopicBreakdown subject={subject} skillMap={result.skillMap} isLight={isLight} lang={lang} onRunMiniDiagnostic={onRunMiniDiagnostic} />
              </motion.div>
            )}

            {/* Missed questions replay — collapsible; shown when there are wrong/partial answers */}
            <MissedQuestionsReplay questionLog={result.questionLog} isLight={isLight} />

            {/* Skill breakdown card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.26 }}
              style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 20, padding: '24px 28px' }}
            >
              <SkillBreakdown skillMap={result.skillMap} subjectMap={subjectMap} isLight={isLight} lang={lang} />
            </motion.div>

            {/* History timeline (Phase 5) */}
            {history && history.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22, duration: 0.26 }}
                style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 20, padding: '24px 28px' }}
              >
                <HistoryTimeline history={history} currentBand={result.band} isLight={isLight} lang={lang} />
              </motion.div>
            )}
          </div>

          {/* ── RIGHT: insights + next step + actions ───────────────────── */}
          <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* AI Insights card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.26 }}
              style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 20, padding: '24px 24px' }}
            >
              <InsightsPanel insights={insights} isLight={isLight} lang={lang} />
            </motion.div>

            {/* Recommendation cards (Phase B — replaces single next-topic) */}
            <RecommendationCards
              recommendations={result?.recommendations}
              subjectMap={subjectMap}
              bandColor={bandColor}
              isLight={isLight}
              onStartTopic={onStartTopic}
              subject={subject}
              lang={lang}
            />

            {/* Secondary actions */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.30, duration: 0.22 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <button
                onClick={() => onAnotherSubject?.()}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: panelBg, border: `1px solid ${borderCol}`, borderRadius: 12, padding: '11px 16px',
                  fontSize: 12.5, fontWeight: 600, color: mutedCol, cursor: 'pointer',
                }}
              >
                <Layers size={13} /> {t.calibrateAnother}
              </button>
              <button
                onClick={() => onRecalibrate?.()}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'none', border: `1px solid ${borderCol}`, borderRadius: 12, padding: '11px 16px',
                  fontSize: 12.5, fontWeight: 600, color: mutedCol, cursor: 'pointer',
                }}
              >
                <RotateCcw size={13} /> {t.reRun}
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
