/* ═══ CHAT THEMES (Ai OS palette) ════════════════ */
// Two-layer approach matching the reference exactly:
//   Layer 1 (top): localised radial glow — the bright "light source"
//   Layer 2 (base): linear gradient — the atmospheric base hue fill
// This matches how the reference cards actually look: a coloured base + a spotlight glow,
// NOT a single wide radial that fades to black.
// Shared by Chat (App.jsx) and Aeva Docs (AevaDoc.jsx).
export const CHAT_THEMES = {
  purple: {
    // Balance card — soft PASTEL lavender, gentle diffuse glow upper area, stays light/muted (never dark)
    swatch: '#9B72BC', label: 'Lavender',
    bg: 'radial-gradient(ellipse 110% 85% at 42% 28%, #C9ABDC 0%, #B492CE 42%, rgba(180,146,206,0) 78%), linear-gradient(160deg, #B69ECC 0%, #A082BE 38%, #8A6CA8 68%, #6E5290 100%)',
    inputBg: 'radial-gradient(ellipse at 50% 0%, #6840A8 0%, #321470 70%, #1E0850 100%)',
    inputBorder: 'rgba(200,168,216,0.45)',
    inputGlow: '0 0 0 1px rgba(155,114,188,0.20), 0 8px 40px rgba(0,0,0,0.35), 0 0 32px rgba(155,114,188,0.30)',
    accent: '#E0C8F0', accentBg: 'rgba(155,114,188,0.22)', accentBorder: 'rgba(200,168,216,0.38)',
    aiBg: 'radial-gradient(ellipse 90% 80% at 18% 10%, #A070C0 0%, rgba(140,80,180,0) 65%), linear-gradient(145deg, #6038A0 0%, #3A1870 100%)',
    userBg: 'radial-gradient(ellipse 90% 80% at 82% 10%, #C07840 0%, rgba(180,100,48,0) 65%), linear-gradient(220deg, #804820 0%, #401008 100%)',
    aiBorder: '1px solid rgba(200,168,216,0.22)', userBorder: '1px solid rgba(220,140,90,0.22)',
  },
  ember: {
    // Streak/Weather card — vivid red-orange glow top-left over dark maroon base
    swatch: '#C84518', label: 'Ember',
    bg: 'radial-gradient(ellipse 85% 60% at 18% 10%, #E87030 0%, rgba(230,108,40,0) 60%), linear-gradient(145deg, #A02808 0%, #781010 40%, #501010 70%, #340808 100%)',
    inputBg: 'radial-gradient(ellipse at 50% 0%, #A02808 0%, #501010 70%, #340808 100%)',
    inputBorder: 'rgba(200,100,50,0.50)',
    inputGlow: '0 0 0 1px rgba(200,70,24,0.20), 0 8px 40px rgba(0,0,0,0.35), 0 0 32px rgba(200,70,24,0.35)',
    accent: '#FDBA74', accentBg: 'rgba(200,70,24,0.22)', accentBorder: 'rgba(200,100,50,0.40)',
    aiBg: 'radial-gradient(ellipse 90% 80% at 18% 10%, #D05820 0%, rgba(200,80,24,0) 65%), linear-gradient(145deg, #801808 0%, #440808 100%)',
    userBg: 'radial-gradient(ellipse 90% 80% at 82% 10%, #E06820 0%, rgba(210,96,28,0) 65%), linear-gradient(220deg, #901808 0%, #500808 100%)',
    aiBorder: '1px solid rgba(200,100,50,0.25)', userBorder: '1px solid rgba(220,130,60,0.25)',
  },
  teal: {
    // Sleep card — bright cyan CIRCLE glow in the centre, deepening to teal-green at edges
    swatch: '#1EC4AA', label: 'Teal',
    bg: 'radial-gradient(circle at 50% 44%, #3DE8D0 0%, #1FC8B2 30%, #14A092 52%, rgba(20,160,146,0) 72%), linear-gradient(165deg, #18B0A0 0%, #0E8A80 38%, #0A6A66 68%, #084E50 100%)',
    inputBg: 'radial-gradient(ellipse at 50% 0%, #0E9880 0%, #065858 70%, #044848 100%)',
    inputBorder: 'rgba(30,196,170,0.50)',
    inputGlow: '0 0 0 1px rgba(30,196,170,0.20), 0 8px 40px rgba(0,0,0,0.35), 0 0 32px rgba(30,196,170,0.30)',
    accent: '#5EEAD4', accentBg: 'rgba(30,196,170,0.20)', accentBorder: 'rgba(30,196,170,0.40)',
    aiBg: 'radial-gradient(ellipse 90% 80% at 80% 10%, #18C0A8 0%, rgba(20,190,170,0) 65%), linear-gradient(220deg, #0A8878 0%, #065858 100%)',
    userBg: 'radial-gradient(ellipse 90% 80% at 20% 10%, #14B898 0%, rgba(18,180,155,0) 65%), linear-gradient(135deg, #0A9080 0%, #065E5E 100%)',
    aiBorder: '1px solid rgba(30,196,170,0.25)', userBorder: '1px solid rgba(50,220,190,0.25)',
  },
  cerise: {
    // Enhance/Mood card — hot pink glows FROM THE CENTRE outward, dark magenta base
    swatch: '#E01E6A', label: 'Cerise',
    bg: 'radial-gradient(circle at 46% 42%, #FF3A8E 0%, #E81E72 26%, #B01055 48%, rgba(176,16,85,0) 72%), linear-gradient(155deg, #800840 0%, #5A0230 40%, #3C0120 70%, #260114 100%)',
    inputBg: 'radial-gradient(ellipse at 50% 50%, #A80850 0%, rgba(168,8,80,0) 65%), linear-gradient(150deg, #600230 0%, #2C0118 100%)',
    inputBorder: 'rgba(224,30,106,0.50)',
    inputGlow: '0 0 0 1px rgba(224,30,106,0.20), 0 8px 40px rgba(0,0,0,0.35), 0 0 32px rgba(224,30,106,0.35)',
    accent: '#F9A8D4', accentBg: 'rgba(224,30,106,0.22)', accentBorder: 'rgba(224,30,106,0.42)',
    aiBg: 'radial-gradient(ellipse 90% 80% at 44% 40%, #C81868 0%, rgba(200,24,104,0) 62%), linear-gradient(150deg, #700438 0%, #380120 100%)',
    userBg: 'radial-gradient(ellipse 90% 80% at 56% 40%, #D82070 0%, rgba(216,32,112,0) 62%), linear-gradient(150deg, #800440 0%, #420120 100%)',
    aiBorder: '1px solid rgba(224,30,106,0.25)', userBorder: '1px solid rgba(240,60,120,0.25)',
  },
  navy: {
    // Skin Damage card — blue glow centre/lower over rich navy base (deepens toward top edge)
    swatch: '#1E3A9A', label: 'Navy',
    bg: 'radial-gradient(circle at 52% 56%, #2E64E0 0%, #1E48C4 30%, #122E96 54%, rgba(18,46,150,0) 76%), linear-gradient(200deg, #0C1A78 0%, #0A1466 38%, #080F50 70%, #060A3C 100%)',
    inputBg: 'radial-gradient(ellipse at 50% 0%, #0E1878 0%, #060A48 70%, #040838 100%)',
    inputBorder: 'rgba(60,100,240,0.50)',
    inputGlow: '0 0 0 1px rgba(30,58,154,0.22), 0 8px 40px rgba(0,0,0,0.35), 0 0 32px rgba(30,58,154,0.38)',
    accent: '#93C5FD', accentBg: 'rgba(30,58,154,0.22)', accentBorder: 'rgba(60,100,240,0.40)',
    aiBg: 'radial-gradient(ellipse 90% 80% at 78% 10%, #1A30B0 0%, rgba(26,48,176,0) 62%), linear-gradient(215deg, #0A1068 0%, #050848 100%)',
    userBg: 'radial-gradient(ellipse 90% 80% at 22% 10%, #1C38B8 0%, rgba(28,56,184,0) 62%), linear-gradient(135deg, #0C1270 0%, #060A50 100%)',
    aiBorder: '1px solid rgba(60,100,240,0.25)', userBorder: '1px solid rgba(80,120,255,0.25)',
  },
  olive: {
    // Natural vs Artificial — olive glow top-centre, dark forest-green base
    swatch: '#7A8E18', label: 'Olive',
    bg: 'radial-gradient(ellipse 85% 60% at 50% 8%, #AABB28 0%, rgba(170,187,40,0) 58%), linear-gradient(170deg, #586810 0%, #384008 40%, #222806 70%, #141602 100%)',
    inputBg: 'radial-gradient(ellipse at 50% 0%, #586810 0%, #222806 70%, #141602 100%)',
    inputBorder: 'rgba(160,185,30,0.50)',
    inputGlow: '0 0 0 1px rgba(138,158,32,0.20), 0 8px 40px rgba(0,0,0,0.35), 0 0 32px rgba(138,158,32,0.30)',
    accent: '#BEF264', accentBg: 'rgba(138,158,32,0.20)', accentBorder: 'rgba(160,185,30,0.40)',
    aiBg: 'radial-gradient(ellipse 90% 80% at 40% 10%, #8A9C20 0%, rgba(138,156,32,0) 62%), linear-gradient(145deg, #405008 0%, #242E04 100%)',
    userBg: 'radial-gradient(ellipse 90% 80% at 60% 10%, #9AAC24 0%, rgba(154,172,36,0) 62%), linear-gradient(220deg, #4A5A0A 0%, #2A3406 100%)',
    aiBorder: '1px solid rgba(160,185,30,0.25)', userBorder: '1px solid rgba(180,210,40,0.25)',
  },
}
