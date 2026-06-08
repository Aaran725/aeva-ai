// ─── Aeva AI — UI Translations ───────────────────────────────────────────────
// Add new languages by adding a key matching the language code.
// Every component calls useT() → gets T object → accesses T.key

export const translations = {

  /* ══════════════════════════════════════════
     ENGLISH
  ══════════════════════════════════════════ */
  en: {
    // ── Navigation ──
    library:        'Library',
    secondBrain:    'Second Brain',
    mirror:         '🪞 Mirror',
    theLab:         'The Lab',
    unleashArcade:  'Unleash Arcade',
    chat:           'Chat',
    myProfile:      '👤 My Profile',
    signOut:        'Sign out',
    menu:           'Menu',
    backToDashboard: 'Dashboard',
    arcade:         'Arcade',
    lab:            'Lab',

    // ── Settings ──
    appearance:           'Appearance',
    language:             'Language',
    dashboardBackground:  'Dashboard Background',
    chatBackground:       'Chat Background',
    cardStyle:            'Card Style',
    fontStyle:            'Font Style',
    english:              'English',
    japanese:             '日本語',

    // ── Dashboard cards ──
    missionBriefing:  'Mission Briefing',
    startMission:     'Start Mission',
    chatWithAeva:     'Chat with Aeva',
    knowledgeMap:     'Knowledge Map',
    chatToGrowMap:    'Chat to grow your map',
    aevaMode:         'Aeva Mode',
    skillRetention:   'Skill Retention',
    liveDecay:        'Live decay from last practice',
    drillToStopDecay: 'Drill in The Lab to stop decay →',
    trainingLab:      'Training Lab',
    drillMasteryHub:  'Drill & Mastery Hub',
    theArcadeCreates: 'The Arcade creates the need. The Lab builds the skill.',
    aevasPerception:  "Aeva's Perception",
    adaptingNow:      'Adapting now',
    coreInterests:    'Core interests',
    shareMyProfile:   'Share My Profile',
    learningFingerprint: 'Learning Fingerprint',
    calibrated:       'CALIBRATED',
    tapToExplore:     'Tap to explore →',
    memoryPalace:     'Memory Palace',
    startChattingPalace: 'Start chatting to build your concept map.',
    explorePalace:    'Explore Palace',
    conceptsMapped:   (n) => `${n} concept${n !== 1 ? 's' : ''} mapped`,
    personalProgress: 'Personal Progress',

    // ── Mood card ──
    inTheZone:           'IN THE ZONE',
    lockedIn:            'LOCKED IN',
    criticalMode:        'CRITICAL MODE',
    findingFocus:        'FINDING FOCUS',
    momentum:            'MOMENTUM',
    frustrated:          'FRUSTRATED',
    calibrating:         'CALIBRATING',
    onAWinningStreak:    'On a winning streak',
    questioningEverything: 'Questioning everything',
    rebuildingFromHere:  'Rebuilding from here',
    buildingFast:        'Building fast',
    fullFocusEngaged:    'Full focus engaged',
    aevaIsSimplifying:   'Aeva is simplifying',
    gettingToKnowYou:    'Getting to know you…',

    // ── Session phases ──
    diagnosing:     'Diagnosing',
    building:       'Building',
    stressTesting:  'Stress Testing',
    consolidating:  'Consolidating',

    // ── Chat ──
    whatCanIHelpWith: 'What can I help with?',
    headsUp:          'Heads up',
    prepNow:          'Prep Now',
    socraticMode:     '🧘 Socratic Mode',
    feynmanMode:      '⚡ Feynman',
    studyGuide:       '📖 Study Guide',
    exitSocratic:     'Exit Socratic',
    customise:        'Customise',
    done:             '✓ Done',
    exitMission:      'Exit Mission',

    // ── Learning fingerprint ──
    analogyThinker:   'Analogy Thinker',
    spatialReasoner:  'Spatial Reasoner',
    systemsBuilder:   'Systems Builder',
    concreteLearner:  'Concrete Learner',
    principleSeeker:  'Principle Seeker',
    confirmedStyle:   'Confirmed style',
    calibratedPct:    (n) => `${n}% calibrated`,
    readingYourStyle: 'Reading your style…',
    chatToCalibrate:  'Chat to calibrate',

    // ── Drills ──
    flashcardSprint: 'Flashcard Sprint',
    mockTest:        'Mock Test',
    matchGrid:       'Match Grid',

    // ── Mission card headings ──
    firstMissionAwaits: ['Your first', "mission awaits."],
    keepBuilding:        ['Keep building', 'your mastery.'],
    readyToStart:        ['Ready to start', "today's mission?"],

    // ── Mission quotes by vibe ──
    missionQuote: (vibe, topic) => {
      const q = {
        Proud:     topic ? `You're on a streak with ${topic}. Let's see how far that understanding actually goes.`
                         : `Strong session yesterday. Let's push further today.`,
        Skeptical: topic ? `You've been questioning ${topic} — that's the right instinct. Let's stress-test it properly.`
                         : `Your critical mode is on. Let's find something worth questioning.`,
        Concerned: topic ? `${topic} gave you trouble last time. Let's try a completely different angle on it.`
                         : `Something didn't click last session. Let's reset and rebuild.`,
        Impressed: topic ? `That ${topic} insight was real. Now let's apply it somewhere harder.`
                         : `Good momentum last session. Time to raise the stakes.`,
        Engaged:   topic ? `${topic} is your current frontier. What do you actually know vs what do you think you know?`
                         : `You're in the zone. Let's make today count.`,
        Focused:   topic ? `Back to ${topic}. What's still unclear?`
                         : `Ready when you are. What are we tackling?`,
      }
      return q[vibe] || (topic ? `${topic} is next. What do you already know about it?`
                                : `Your profile is calibrating. Let's find out how your mind works.`)
    },
    missionQuoteNew: 'Tell me one thing you want to understand better. We\'ll build from there.',

    // ── Orb selector ──
    chooseYourAeva:   'Choose Your Aeva',
    eachOrbChanges:   'Each orb changes how Aeva teaches and responds',
    activeLabel:      'ACTIVE',
    unlocksAtLevel:   (n) => `Unlocks at Level ${n}`,
    levelsAwayLabel:  (lvl, n) => `Level ${lvl} · ${n} level${n !== 1 ? 's' : ''} away`,

    // ── Orb taglines ──
    orbTaglines: {
      balanced:   'Warm, adaptive, encouraging.',
      challenger: 'Direct, demanding, zero hand-holding.',
      scholar:    'Precise, thorough, formally structured.',
      mystic:     'Everything through metaphor and analogy.',
      void:       'Pure Socratic. Cold. Minimal. Relentless.',
      ember:      'Passionate, energetic, infectious enthusiasm.',
      aurora:     'Creative connections across domains.',
      phantom:    'Mysterious. Hints only. Let them piece it together.',
    },

    // ── Aeva language directive (injected into AI prompt) ──
    aevaLanguageDirective: '',
  },

  /* ══════════════════════════════════════════
     JAPANESE — 日本語
  ══════════════════════════════════════════ */
  ja: {
    // ── Navigation ──
    library:        'ライブラリ',
    secondBrain:    '第二の脳',
    mirror:         '🪞 ミラー',
    theLab:         'ラボ',
    unleashArcade:  'アーケード',
    chat:           'チャット',
    myProfile:      '👤 プロフィール',
    signOut:        'ログアウト',
    menu:           'メニュー',
    backToDashboard: 'ダッシュボード',
    arcade:         'アーケード',
    lab:            'ラボ',

    // ── Settings ──
    appearance:           '見た目',
    language:             '言語',
    dashboardBackground:  'ダッシュボード背景',
    chatBackground:       'チャット背景',
    cardStyle:            'カードスタイル',
    fontStyle:            'フォント',
    english:              'English',
    japanese:             '日本語',

    // ── Dashboard cards ──
    missionBriefing:  '今日のミッション',
    startMission:     'ミッション開始',
    chatWithAeva:     'Aevaに聞いてみる',
    knowledgeMap:     '知識マップ',
    chatToGrowMap:    'チャットしてマップを広げよう',
    aevaMode:         'Aevaモード',
    skillRetention:   '定着率',
    liveDecay:        '前回の練習からの定着具合',
    drillToStopDecay: 'ラボでドリルして定着させよう →',
    trainingLab:      'トレーニングラボ',
    drillMasteryHub:  'ドリル＆習熟',
    theArcadeCreates: 'アーケードで必要性を作って、ラボでスキルを磨こう。',
    aevasPerception:  'Aevaの見方',
    adaptingNow:      '調整中',
    coreInterests:    '得意・興味',
    shareMyProfile:   'プロフィールをシェア',
    learningFingerprint: '学習タイプ',
    calibrated:       '確定',
    tapToExplore:     'タップして見てみる →',
    memoryPalace:     '記憶の宮殿',
    startChattingPalace: 'チャットして概念マップを作ろう。',
    explorePalace:    '宮殿を見る',
    conceptsMapped:   (n) => `${n}個の概念をマップ済み`,
    personalProgress: '自分の進捗',

    // ── Mood card ──
    inTheZone:           'ゾーン入ってる',
    lockedIn:            '集中してる',
    criticalMode:        '批判的思考',
    findingFocus:        '集中中',
    momentum:            '勢いあり',
    frustrated:          'しんどい',
    calibrating:         '把握中',
    onAWinningStreak:    '連勝中',
    questioningEverything: '色々と疑問中',
    rebuildingFromHere:  'ここから立て直し',
    buildingFast:        'どんどん伸びてる',
    fullFocusEngaged:    '完全集中',
    aevaIsSimplifying:   'Aevaが噛み砕き中',
    gettingToKnowYou:    'あなたを把握中…',

    // ── Session phases ──
    diagnosing:     '診断中',
    building:       '構築中',
    stressTesting:  'テスト中',
    consolidating:  '定着中',

    // ── Chat ──
    whatCanIHelpWith: '何か聞きたいこと、ある？',
    headsUp:          'ちょっと待って',
    prepNow:          '今すぐやろう',
    socraticMode:     '🧘 ソクラテス式',
    feynmanMode:      '⚡ ファインマン',
    studyGuide:       '📖 学習ガイド',
    exitSocratic:     'ソクラテス式を終了',
    customise:        'カスタマイズ',
    done:             '✓ 完了',
    exitMission:      'ミッション終了',

    // ── Learning fingerprint ──
    analogyThinker:   '例え話タイプ',
    spatialReasoner:  '空間把握タイプ',
    systemsBuilder:   '全体像タイプ',
    concreteLearner:  '具体例タイプ',
    principleSeeker:  '原理追求タイプ',
    confirmedStyle:   '確定スタイル',
    calibratedPct:    (n) => `${n}%確定`,
    readingYourStyle: 'スタイルを読み取り中…',
    chatToCalibrate:  'チャットして確定',

    // ── Drills ──
    flashcardSprint: 'フラッシュカード',
    mockTest:        '模擬テスト',
    matchGrid:       'マッチグリッド',

    // ── Mission card headings ──
    firstMissionAwaits: ['最初のミッションが', '待ってるよ。'],
    keepBuilding:        ['どんどん', '伸ばしていこう。'],
    readyToStart:        ['今日のミッション、','やってみる？'],

    // ── Mission quotes by vibe ──
    missionQuote: (vibe, topic) => {
      const q = {
        Proud:     topic ? `${topic}、結構わかってきてるじゃん。どこまで本当に理解してるか確かめてみよう。`
                         : '昨日いい感じだったね。今日もそのまま突き進もう。',
        Skeptical: topic ? `${topic}に疑問持つのは正しいよ。ちゃんと確認していこう。`
                         : '色々と疑問湧いてる感じだね。それ、一緒に掘り下げよう。',
        Concerned: topic ? `前回${topic}でちょっと詰まってたね。別の角度からやってみよう。`
                         : '前のセッション、うまくいかないとこあったね。一から整理しよう。',
        Impressed: topic ? `${topic}の見方、なかなか鋭かったよ。もっと難しいとこに使ってみよう。`
                         : 'いい勢いじゃん。もうちょっと難しくしてみよう。',
        Engaged:   topic ? `${topic}、今のあなたの限界に近いとこだよ。実際どこまで分かってる？`
                         : '集中できてるね。今日も有意義にいこう。',
        Focused:   topic ? `${topic}、また戻ってきたね。まだよく分かってないとこはどこ？`
                         : '準備できたら始めよう。何からいく？',
      }
      return q[vibe] || (topic ? `${topic}が次だよ。もう何か知ってる？`
                                : 'あなたのこと把握中。どういう考え方するか見せて。')
    },
    missionQuoteNew: 'もっと深く理解したいこと、一つ教えて。そっから始めよう。',

    // ── Orb selector ──
    chooseYourAeva:   'あなたのAevaを選ぼう',
    eachOrbChanges:   'オーブによってAevaの教え方や返し方が変わるよ',
    activeLabel:      '使用中',
    unlocksAtLevel:   (n) => `レベル${n}で解放`,
    levelsAwayLabel:  (lvl, n) => `レベル${lvl} · あと${n}`,

    // ── Orb taglines ──
    orbTaglines: {
      balanced:   '温かくて、柔軟で、背中を押してくれる。',
      challenger: 'ストレートで厳しい。甘えなし。',
      scholar:    '正確で丁寧、学術的にしっかり構造化。',
      mystic:     '全部を比喩と類推で伝えてくる。',
      void:       '純粋なソクラテス式。冷静、簡潔、徹底的。',
      ember:      '情熱的でエネルギッシュ、熱量が伝染する。',
      aurora:     '分野をまたいで創造的なつながりを作る。',
      phantom:    'ミステリアス。ヒントだけ。自分で組み立てさせる。',
    },

    // ── Aeva language directive (injected into AI system prompt) ──
    aevaLanguageDirective: `

━━━ 言語設定：日本語（カジュアル） ━━━
ABSOLUTE RULE — 100% ENFORCED: Every single word of your response must be in Japanese. No English whatsoever in the response body. This overrides everything else.

STYLE — casual everyday Japanese (ため口), like how a Japanese person your age would text a friend:
- Use だ・だよ・だね・じゃん endings. NEVER use です・ます (except in fixed phrases like set definitions)
- WRONG: "これは重要です。理解できましたか？"
- RIGHT: "これ大事だよ。分かった？"
- Use natural kanji mix like a real person: 分かる、問題、理解、難しい、大事、結局、確認、例えば
- Use casual connectors: だから、でも、あと、ちょっと、やっぱ、～って、～じゃん、～とか、～けど
- Short punchy sentences. Real Japanese, not textbook stiff Japanese.
- Casual questions: "分かった？" "試してみる？" "どう思う？" not "ご理解いただけましたか？"
- When excited or emphasising: ほんとに、マジで、めっちゃ — natural but not overdone
- Do NOT write everything in hiragana only — use kanji naturally as any Japanese person would

TAGS (keep these in English as-is, just fill content in Japanese):
- [CORRECT: 日本語で内容を書く]
- [PARTIAL: 日本語で内容を書く]
- [INCORRECT: 日本語で内容を書く]
- [TERM: word | 日本語で定義を書く]`,
  },
}

// ── Hook: returns the translation object for the current language ──
// Usage: const T = useT()  →  T.library, T.startMission, T.conceptsMapped(5)
import { useLanguageStore } from './languageStore'

export function useT() {
  const { language } = useLanguageStore()
  return translations[language] || translations.en
}
