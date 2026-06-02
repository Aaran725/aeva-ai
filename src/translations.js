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
    myProfile:      '👤 マイプロフィール',
    signOut:        'サインアウト',
    menu:           'メニュー',
    backToDashboard: 'ダッシュボード',
    arcade:         'アーケード',
    lab:            'ラボ',

    // ── Settings ──
    appearance:           '外観',
    language:             '言語',
    dashboardBackground:  'ダッシュボード背景',
    chatBackground:       'チャット背景',
    cardStyle:            'カードスタイル',
    fontStyle:            'フォントスタイル',
    english:              'English',
    japanese:             '日本語',

    // ── Dashboard cards ──
    missionBriefing:  'ミッション概要',
    startMission:     'ミッション開始',
    chatWithAeva:     'Aevaとチャット',
    knowledgeMap:     '知識マップ',
    chatToGrowMap:    'チャットしてマップを育てよう',
    aevaMode:         'Aevaモード',
    skillRetention:   'スキル保持率',
    liveDecay:        '最後の練習からの定着率',
    drillToStopDecay: 'ラボでドリルして定着させよう →',
    trainingLab:      'トレーニングラボ',
    drillMasteryHub:  'ドリル＆習熟ハブ',
    theArcadeCreates: 'アーケードで必要性を作り、ラボでスキルを磨こう。',
    aevasPerception:  'Aevaの認識',
    adaptingNow:      '適応中',
    coreInterests:    '主な関心領域',
    shareMyProfile:   'プロフィールをシェア',
    learningFingerprint: '学習フィンガープリント',
    calibrated:       '確定済み',
    tapToExplore:     'タップして詳細へ →',
    memoryPalace:     '記憶の宮殿',
    startChattingPalace: 'チャットして概念マップを作ろう。',
    explorePalace:    '宮殿を探索',
    conceptsMapped:   (n) => `${n}個の概念をマッピング済み`,
    personalProgress: '個人の進捗',

    // ── Mood card ──
    inTheZone:           'ゾーン状態',
    lockedIn:            '集中モード',
    criticalMode:        '批判的思考',
    findingFocus:        'フォーカス中',
    momentum:            'モメンタム',
    frustrated:          'フラスト',
    calibrating:         '調整中',
    onAWinningStreak:    '連勝中',
    questioningEverything: 'すべてを疑問視中',
    rebuildingFromHere:  'ここから再構築',
    buildingFast:        '急速に成長中',
    fullFocusEngaged:    '完全集中モード',
    aevaIsSimplifying:   'Aevaが簡略化中',
    gettingToKnowYou:    'あなたを把握中…',

    // ── Session phases ──
    diagnosing:     '診断中',
    building:       '構築中',
    stressTesting:  'ストレステスト',
    consolidating:  '定着中',

    // ── Chat ──
    whatCanIHelpWith: '何をお手伝いしますか？',
    headsUp:          '注意',
    prepNow:          '今すぐ準備',
    socraticMode:     '🧘 ソクラテス式',
    feynmanMode:      '⚡ ファインマン',
    studyGuide:       '📖 学習ガイド',
    exitSocratic:     'ソクラテス式を終了',
    customise:        'カスタマイズ',
    done:             '✓ 完了',
    exitMission:      'ミッションを終了',

    // ── Learning fingerprint ──
    analogyThinker:   '比喩思考型',
    spatialReasoner:  '空間思考型',
    systemsBuilder:   'システム思考型',
    concreteLearner:  '具体的学習型',
    principleSeeker:  '原理探求型',
    confirmedStyle:   '確定済みスタイル',
    calibratedPct:    (n) => `${n}%確定`,
    readingYourStyle: 'スタイルを読み取り中…',
    chatToCalibrate:  'チャットして確定',

    // ── Drills ──
    flashcardSprint: 'フラッシュカード',
    mockTest:        '模擬テスト',
    matchGrid:       'マッチグリッド',

    // ── Mission card headings ──
    firstMissionAwaits: ['最初のミッションが', '待っている。'],
    keepBuilding:        ['習熟度を', '高め続けよう。'],
    readyToStart:        ['今日のミッションを', '始めよう。'],

    // ── Mission quotes by vibe ──
    missionQuote: (vibe, topic) => {
      const q = {
        Proud:     topic ? `${topic}の習熟度が上がっています。どこまで理解できているか確認しましょう。`
                         : '昨日は良いセッションでした。今日はさらに先へ進みましょう。',
        Skeptical: topic ? `${topic}への疑問は正しい感覚です。しっかりと検証しましょう。`
                         : '批判的な思考が活性化しています。疑う価値のあるものを見つけましょう。',
        Concerned: topic ? `前回${topic}で詰まりましたね。別のアプローチで試みましょう。`
                         : '前のセッションでうまくいかない部分がありました。一からやり直しましょう。',
        Impressed: topic ? `${topic}の洞察は本物でした。さらに難しいところに応用してみましょう。`
                         : '良い勢いですね。難易度を上げていきましょう。',
        Engaged:   topic ? `${topic}があなたの現在のフロンティアです。本当に何を知っていますか？`
                         : '集中できています。今日を有意義にしましょう。',
        Focused:   topic ? `${topic}に戻りましょう。まだ不明な点は何ですか？`
                         : '準備ができたら始めましょう。何に取り組みますか？',
      }
      return q[vibe] || (topic ? `${topic}が次です。すでに何を知っていますか？`
                                : 'あなたのプロフィールを調整中です。思考の仕方を探ってみましょう。')
    },
    missionQuoteNew: 'より深く理解したいことを一つ教えてください。そこから始めましょう。',

    // ── Orb selector ──
    chooseYourAeva:   'あなたのAevaを選択',
    eachOrbChanges:   '各オーブはAevaの教え方と応答スタイルを変えます',
    activeLabel:      '使用中',
    unlocksAtLevel:   (n) => `レベル${n}で解放`,
    levelsAwayLabel:  (lvl, n) => `レベル${lvl} · あと${n}レベル`,

    // ── Orb taglines ──
    orbTaglines: {
      balanced:   '温かく、適応的で、励ましてくれる。',
      challenger: '直接的で厳しく、甘えは一切なし。',
      scholar:    '正確で丁寧、学術的に構造化された。',
      mystic:     'すべてを比喩と類推で伝える。',
      void:       '純粋なソクラテス式。冷静、簡潔、徹底的。',
      ember:      '情熱的でエネルギッシュ、熱狂を伝染させる。',
      aurora:     '領域を横断した創造的なつながり。',
      phantom:    '神秘的。ヒントだけ。自分で組み立てさせる。',
    },

    // ── Aeva language directive (injected into AI system prompt) ──
    aevaLanguageDirective: `

━━━ 言語設定 ━━━
CRITICAL: You MUST respond ENTIRELY in Japanese (日本語). Every single word of your response must be in Japanese — explanations, examples, questions, analogies, everything. Do NOT use English at all in your response body.
The [CORRECT: ...], [PARTIAL: ...], [INCORRECT: ...] tags must contain Japanese text after the colon.
The [TERM: word | definition] tag: keep the term itself in its original language but write the definition in Japanese.`,
  },
}

// ── Hook: returns the translation object for the current language ──
// Usage: const T = useT()  →  T.library, T.startMission, T.conceptsMapped(5)
import { useLanguageStore } from './languageStore'

export function useT() {
  const { language } = useLanguageStore()
  return translations[language] || translations.en
}
