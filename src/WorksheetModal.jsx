import { motion } from 'framer-motion'
import { X, Printer } from 'lucide-react'

/* ── Print HTML builder ─────────────────────────────────────────────────── */
function buildPrintHTML(worksheet, studentName) {
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const formulasHTML = worksheet.keyFormulas?.length
    ? `<div class="formula-box">
        <div class="formula-box-title">Key Formulas / Reference</div>
        ${worksheet.keyFormulas.map(f => `
          <div class="formula-row">
            <strong>${f.name}:</strong>
            <code>${f.formula}</code>
            ${f.note ? `<span class="formula-note"> — ${f.note}</span>` : ''}
          </div>
        `).join('')}
      </div>`
    : ''

  const sectionsHTML = (worksheet.sections || []).map(section => `
    <div class="section">
      <div class="section-title">${section.title}</div>
      ${section.instructions ? `<p class="section-instructions">${section.instructions}</p>` : ''}
      ${(section.questions || []).map(q => {
        const isCalc = q.type === 'calculation'
        const workingBlock = isCalc && q.workingLines > 0
          ? `<div class="working-block">
               <span class="working-label">Working:</span>
               ${Array.from({ length: q.workingLines || 5 }, () => '<div class="answer-line"></div>').join('')}
             </div>`
          : ''
        const answerBlock = isCalc
          ? `<div class="calc-answer-row"><span class="answer-label">Answer:</span><div class="answer-underline"></div></div>`
          : Array.from({ length: q.lines || 3 }, () => '<div class="answer-line"></div>').join('')
        return `<div class="question">
          <div class="question-text">
            <span class="question-num">${q.number}.</span>
            <span class="${isCalc ? 'calc-q' : ''}">${q.question}</span>
          </div>
          ${workingBlock}
          <div class="answer-lines">${answerBlock}</div>
        </div>`
      }).join('')}
    </div>
  `).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${worksheet.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 13.5px;
      line-height: 1.55;
      color: #111;
      background: #fff;
      padding: 48px 56px;
      max-width: 820px;
      margin: 0 auto;
    }

    /* ── Header ── */
    .ws-header { margin-bottom: 28px; border-bottom: 2.5px solid #111; padding-bottom: 18px; }
    .ws-title { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 3px; font-family: 'Arial', sans-serif; }
    .ws-subtitle { font-size: 12px; color: #555; margin-bottom: 18px; font-family: 'Arial', sans-serif; }

    .fields-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 32px; }
    .field { display: flex; align-items: flex-end; gap: 6px; padding-bottom: 3px; border-bottom: 1.2px solid #333; }
    .field-label { font-size: 11.5px; font-weight: 700; white-space: nowrap; font-family: 'Arial', sans-serif; color: #333; }
    .field-value { flex: 1; font-size: 13px; min-height: 18px; }

    /* ── Formula box ── */
    .formula-box {
      border: 1.5px solid #333;
      border-radius: 5px;
      padding: 13px 16px;
      margin-bottom: 28px;
      background: #f7f7f7;
    }
    .formula-box-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #444;
      margin-bottom: 10px;
      font-family: 'Arial', sans-serif;
    }
    .formula-row { margin-bottom: 7px; font-family: 'Arial', sans-serif; font-size: 13px; line-height: 1.5; }
    .formula-row code { font-family: 'Courier New', monospace; background: #eee; padding: 1px 6px; border-radius: 3px; font-size: 12.5px; }
    .formula-note { color: #666; font-size: 12px; }

    /* ── Sections ── */
    .section { margin-bottom: 36px; page-break-inside: avoid; }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      font-family: 'Arial', sans-serif;
      border-bottom: 2px solid #111;
      padding-bottom: 5px;
      margin-bottom: 12px;
      letter-spacing: 0.01em;
    }
    .section-instructions { font-size: 11.5px; color: #555; font-style: italic; margin-bottom: 16px; font-family: 'Arial', sans-serif; }

    .question { margin-bottom: 26px; }
    .question-text { display: flex; gap: 8px; margin-bottom: 9px; line-height: 1.5; }
    .question-num { font-weight: 700; min-width: 22px; font-family: 'Arial', sans-serif; }

    .answer-line { border-bottom: 1px solid #bbb; height: 30px; margin-bottom: 2px; }

    .calc-q { font-family: 'Courier New', monospace; font-size: 13.5px; font-weight: 600; }

    .working-block { margin: 6px 0 8px 30px; }
    .working-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #777; font-family: 'Arial', sans-serif; display: block; margin-bottom: 4px; }

    .calc-answer-row { display: flex; align-items: flex-end; gap: 10px; margin: 8px 0 0 30px; }
    .answer-label { font-size: 11.5px; font-weight: 700; font-family: 'Arial', sans-serif; white-space: nowrap; color: #333; }
    .answer-underline { flex: 1; max-width: 180px; border-bottom: 2px solid #333; height: 24px; }

    /* ── Print button ── */
    .print-bar {
      position: fixed; top: 0; left: 0; right: 0;
      background: #1a1a2e; color: #fff;
      padding: 12px 24px;
      display: flex; align-items: center; justify-content: space-between;
      font-family: 'Arial', sans-serif;
      z-index: 999;
    }
    .print-bar-title { font-size: 14px; font-weight: 700; }
    .print-btn {
      padding: 8px 20px; background: #6366F1; border: none; border-radius: 8px;
      color: #fff; font-size: 13px; font-weight: 700; cursor: pointer;
      font-family: 'Arial', sans-serif;
    }
    .print-btn:hover { background: #4F46E5; }

    body.has-bar { padding-top: 96px; }

    /* ── Print media ── */
    @media print {
      .print-bar { display: none; }
      body { padding: 0; padding-top: 0 !important; }
      @page { margin: 18mm 20mm; size: A4; }
    }
  </style>
</head>
<body class="has-bar">

  <div class="print-bar">
    <span class="print-bar-title">📄 ${worksheet.title}</span>
    <button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
  </div>

  <div class="ws-header">
    <div class="ws-title">${worksheet.title}</div>
    <div class="ws-subtitle">${[worksheet.subject, worksheet.topic].filter(Boolean).join(' · ')}</div>
    <div class="fields-grid">
      <div class="field"><span class="field-label">Name:</span><span class="field-value">${studentName || ''}</span></div>
      <div class="field"><span class="field-label">Date:</span><span class="field-value">${date}</span></div>
      <div class="field"><span class="field-label">Class / Teacher:</span><span class="field-value"></span></div>
      <div class="field"><span class="field-label">Score:</span><span class="field-value"></span></div>
    </div>
  </div>

  ${formulasHTML}
  ${sectionsHTML}

</body>
</html>`
}

/* ── WorksheetModal ─────────────────────────────────────────────────────── */
export default function WorksheetModal({ worksheet, studentName, onClose }) {
  if (!worksheet) return null

  const handlePrint = () => {
    const html = buildPrintHTML(worksheet, studentName)
    const win = window.open('', '_blank')
    if (!win) { alert('Allow pop-ups to open the printable worksheet.'); return }
    win.document.write(html)
    win.document.close()
    win.focus()
  }

  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(4,5,18,0.94)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* ── Top bar ── */}
      <div style={{
        flexShrink: 0, height: 58, padding: '0 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(5,6,15,0.96)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: 'linear-gradient(135deg,#4F46E5,#7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
          }}>📄</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{worksheet.title}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{[worksheet.subject, worksheet.topic].filter(Boolean).join(' · ')}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <motion.button
            whileHover={{ scale: 1.04, background: 'rgba(99,102,241,0.28)' }}
            whileTap={{ scale: 0.96 }}
            onClick={handlePrint}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 18px', borderRadius: 11,
              background: 'linear-gradient(135deg,#4F46E5,#7C3AED)',
              border: 'none', color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
            }}>
            <Printer size={14} strokeWidth={2.2} /> Open Printable
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.55)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <X size={15} />
          </motion.button>
        </div>
      </div>

      {/* ── Preview (white paper) ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 20px 48px', background: '#E8EAF0' }}>
        <div style={{
          maxWidth: 740, margin: '0 auto',
          background: '#fff',
          borderRadius: 4,
          padding: '48px 56px',
          color: '#111',
          boxShadow: '0 8px 48px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.12)',
          fontFamily: 'Georgia, "Times New Roman", serif',
        }}>

          {/* Header */}
          <div style={{ borderBottom: '2.5px solid #111', paddingBottom: 18, marginBottom: 26 }}>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 3, fontFamily: 'Arial, sans-serif' }}>
              {worksheet.title}
            </div>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 18, fontFamily: 'Arial, sans-serif' }}>
              {[worksheet.subject, worksheet.topic].filter(Boolean).join(' · ')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 32px' }}>
              {[['Name', studentName], ['Date', date], ['Class / Teacher', ''], ['Score', '']].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'flex-end', gap: 6, paddingBottom: 3, borderBottom: '1.2px solid #333' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', fontFamily: 'Arial, sans-serif', color: '#333' }}>{label}:</span>
                  <span style={{ flex: 1, fontSize: 13, color: '#111', minHeight: 18 }}>{val || ''}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Key formulas */}
          {worksheet.keyFormulas?.length > 0 && (
            <div style={{
              border: '1.5px solid #333', borderRadius: 5,
              padding: '13px 16px', marginBottom: 28,
              background: '#f7f7f7',
            }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#444', marginBottom: 10, fontFamily: 'Arial, sans-serif' }}>
                Key Formulas / Reference
              </div>
              {worksheet.keyFormulas.map((f, i) => (
                <div key={i} style={{ marginBottom: 7, fontSize: 13, lineHeight: 1.55, fontFamily: 'Arial, sans-serif' }}>
                  <strong>{f.name}:</strong>{' '}
                  <code style={{ fontFamily: 'Courier New, monospace', background: '#eee', padding: '1px 6px', borderRadius: 3, fontSize: 12.5 }}>{f.formula}</code>
                  {f.note && <span style={{ color: '#666', fontSize: 12 }}> — {f.note}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Sections */}
          {worksheet.sections?.map((section, si) => (
            <div key={si} style={{ marginBottom: 36 }}>
              <div style={{
                fontSize: 13.5, fontWeight: 700,
                fontFamily: 'Arial, sans-serif',
                borderBottom: '2px solid #111',
                paddingBottom: 5, marginBottom: 12,
                letterSpacing: '0.01em',
              }}>
                {section.title}
              </div>
              {section.instructions && (
                <div style={{ fontSize: 11.5, color: '#555', fontStyle: 'italic', marginBottom: 16, fontFamily: 'Arial, sans-serif' }}>
                  {section.instructions}
                </div>
              )}
              {section.questions?.map((q, qi) => {
                const isCalc = q.type === 'calculation'
                return (
                  <div key={qi} style={{ marginBottom: 26 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: isCalc ? 6 : 9, lineHeight: 1.6 }}>
                      <span style={{ fontWeight: 700, minWidth: 22, fontFamily: 'Arial, sans-serif', flexShrink: 0 }}>{q.number}.</span>
                      <span style={{
                        fontSize: 13.5,
                        fontFamily: isCalc ? 'Courier New, monospace' : 'inherit',
                        fontWeight: isCalc ? 600 : 400,
                      }}>{q.question}</span>
                    </div>
                    {isCalc && (q.workingLines || 5) > 0 && (
                      <div style={{ marginLeft: 30, marginBottom: 6 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', fontFamily: 'Arial, sans-serif', marginBottom: 4 }}>Working:</div>
                        {Array.from({ length: q.workingLines || 5 }, (_, li) => (
                          <div key={li} style={{ borderBottom: '1px solid #bbb', height: 30, marginBottom: 2 }} />
                        ))}
                      </div>
                    )}
                    {isCalc ? (
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginLeft: 30, marginTop: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'Arial, sans-serif', color: '#333', whiteSpace: 'nowrap' }}>Answer:</span>
                        <div style={{ width: 160, borderBottom: '2px solid #333', height: 24 }} />
                      </div>
                    ) : (
                      Array.from({ length: q.lines || 3 }, (_, li) => (
                        <div key={li} style={{ borderBottom: '1px solid #bbb', height: 30, marginBottom: 2 }} />
                      ))
                    )}
                  </div>
                )
              })}
            </div>
          ))}

          {/* Footer */}
          <div style={{ marginTop: 40, paddingTop: 12, borderTop: '1px solid #ddd', textAlign: 'center', fontSize: 10.5, color: '#aaa', fontFamily: 'Arial, sans-serif' }}>
            Generated by Aeva · {date}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
