/**
 * 多语言支持系统
 */

export type Language = 'zh' | 'en';

// 当前语言
let currentLanguage: Language = 'zh';

// 获取当前语言
export function getLanguage(): Language {
  return currentLanguage;
}

// 设置语言
export function setLanguage(lang: Language): void {
  currentLanguage = lang;
  // 保存到本地存储
  localStorage.setItem('game_language', lang);
}

// 初始化语言（从本地存储读取）
export function initLanguage(): void {
  const saved = localStorage.getItem('game_language') as Language | null;
  if (saved && (saved === 'zh' || saved === 'en')) {
    currentLanguage = saved;
  }
}

// 翻译文本
export function t(key: string): string {
  const translation = translations[currentLanguage]?.[key];
  if (!translation) {
    console.warn(`Missing translation for key: ${key}`);
    return key;
  }
  return translation;
}

// 翻译文本（带参数）
export function tf(key: string, params: Record<string, string | number>): string {
  let text = t(key);
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(`{${k}}`, String(v));
  }
  return text;
}

// 翻译数据
const translations: Record<Language, Record<string, string>> = {
  zh: {
    // 菜单场景
    'menu.title': '文明求索',
    'menu.subtitle': 'World Civilization Quest',
    'menu.selectCiv': '选择你的文明',
    'menu.singlePlayer': '🎮 单人游戏',
    'menu.multiplayer': '👥 多人游戏',
    'menu.multiplayerHint': '多人游戏：2-4人本地轮流，收集遗迹获胜！',
    'menu.bottomHint': '通过回答知识问题来发展你的文明，征服世界！',
    'menu.language': '语言',

    // 大厅场景
    'lobby.title': '🎮 多人游戏 - 选择文明',
    'lobby.victoryCondition': '胜利条件：率先收集 {count} 个文明遗迹',
    'lobby.selectPrompt': '玩家 {num} 请选择你的文明',
    'lobby.allReady': '所有玩家已就绪！点击开始游戏',
    'lobby.joinedPlayers': '已加入的玩家',
    'lobby.startGame': '🎲 开始游戏',
    'lobby.back': '← 返回',

    // 骰子场景
    'dice.title': '🎲 投骰子决定顺序',
    'dice.subtitle': '点数最高的玩家先行动',
    'dice.rollPrompt': '{name} ({civ}) 请投骰子',
    'dice.rollButton': '🎲 投骰子',
    'dice.waiting': '等待中...',
    'dice.orderDecided': '🏆 行动顺序已确定！',
    'dice.startGame': '开始游戏！',

    // 世界地图场景
    'world.turn': '第 {num} 回合',
    'world.actionPoints': '⚡ 行动点: {num}',
    'world.relics': '🏺 遗迹: {current}/{total}',
    'world.fragments': '🔮 碎片: {current}/3',
    'world.combo': '🔥 Combo x{num}',
    'world.subject': '📚 本回合科目: {subject}',
    'world.endTurn': '结束回合',
    'world.backToMenu': '返回菜单',
    'world.needPoints': '需要 {num} 行动点才能占领此地形！',
    'world.needPointsSteal': '需要 {num} 行动点才能抢夺遗迹！',
    'world.yourTurn': '轮到你行动了！',
    'world.turnStart': '{name} 的回合开始',
    'world.answerFirst': '请先答题获得行动点！',
    'world.victory': '🎉 胜利！',
    'world.victoryMsg': '{name} 收集了 {num} 个遗迹，赢得了游戏！',
    'world.relicCollected': '🏺 获得文明遗迹！',
    'world.relicStolen': '⚔️ 抢夺遗迹成功！',
    'world.relicDefended': '🛡️ 成功保卫遗迹！',
    'world.pharaohProtection': '🛡️ {name} 的法老庇护发动！\n\n遗迹无法被抢夺',
    'world.stealPK': '⚔️ 抢夺遗迹！\n\n{attacker} vs {defender}\n\n答题PK开始！',
    'world.newRelic': '✨ 新的遗迹出现了！',
    'world.yourTerritory': '你的领土',
    'world.adjacentOnly': '只能扩张到相邻领土！',
    'world.notEnoughAP': '行动点不足！需要 {need} 点，当前 {have} 点',
    'world.buyAP': '💰 买行动点',
    'world.quizPhase': '答题阶段',
    'world.actionPhase': '行动阶段',
    'world.turnInfo': '回合 {num} | {phase}',
    'world.subjectDisplay': '📚 科目: {subject}',
    'world.subjectPending': '待定',
    'world.correctMsg': '✅ 答对了！\n\n获得 {points} 行动点{penalty}\n{combo}',
    'world.penaltyInfo': ' (惩罚-{num})',
    'world.comboInfo': '🔥 连击 x{num}',
    'world.goldInsufficient': '金币不足！需要 {cost} 💰',
    'world.answerFirstBuy': '请先答题！',
    'world.buyNotFirstTurn': '第一回合不能购买行动点！',
    'world.buyOncePerTurn': '每回合只能购买一次行动点！',
    'world.finishQuizFirst': '请先完成答题！',
    'world.incomeTitle': '💰 回合收入',
    'world.baseIncome': '基础收入: +{num} 💰',
    'world.territoryIncome': '领土收入 ({tiles}块): +{num} 💰',
    'world.totalIncome': '合计: +{num} 💰',
    'world.skillUsedTurn': '本回合已使用过技能！',
    'world.skillUsedUp': '技能已用完！',
    'world.legionConquestActive': '⚔️ 军团征服！抢夺遗迹时将跳过PK',
    'world.useInAction': '需要在行动阶段使用！',
    'world.silkRoadPassive': '📜 被动技能，收集遗迹时自动获得额外金币',
    'world.pharaohPassive': '🛡️ 被动技能，遗迹被抢时自动触发50%保护',
    'world.pharaohProtected': '🛡️ {name} 的法老庇护发动！\n\n遗迹守护成功！',
    'world.pharaohFailed': '💥 {name} 的法老庇护未发动...\n\n遗迹被抢走了！',
    'world.academicPassive': '🏛️ 被动技能，在遗迹格答题获得碎片',
    'world.fragmentGained': '🔮 获得遗迹碎片！({current}/3)',
    'world.fragmentToRelic': '🏛️ 学术探索！3个碎片合成了1个遗迹！',
    'world.silkRoadGold': '📜 丝路财宝！额外获得 {num} 💰',
    'world.victoryTitle': '🏆 胜利！',
    'world.victoryStats': '收集了 {relics} 个文明遗迹\n用时 {turns} 回合',
    'world.legendRelic': '🏺遗迹',
    'world.ownedTerritory': '你的领土 - {name}\n每回合 +{gold} 💰',
    'world.ownedRelicInfo': '🏺 你的遗迹所在地 - {name}\n每回合 +{gold} 💰\n小心被其他玩家抢夺！',
    'world.otherTerritory': '这是 {name} 的领土',
    'world.hasRelic': '此处有遗迹',
    'world.stealHint': '点击抢夺！(消耗{cost}行动点)',
    'world.neutralRelicHint': '占领此格可获得遗迹！',
    'world.stealTip': '⚔️ 发现 {count} 个可抢夺的遗迹！点击对手遗迹格即可发起抢夺',
    'world.stealNeedAdjacent': '需要与对方领土接壤才能发起抢夺！',
    'world.pkRoundTitle': '⚔️ 第{step}/3轮 - {name}（{role}）答题',
    'world.pkAttackerRole': '挑战者',
    'world.pkDefenderRole': '守方',
    'world.pkAttackerLost': '❌ 挑战者答错！赔付 {gold} 💰 给 {name}',
    'world.pkDraw': '🤝 3轮平局！{name} 守住了遗迹！',
    'world.relicChallenge': '🏺 遗迹挑战！答对才能获得遗迹！',
    'world.relicQuizFailed': '❌ 答错了！行动点归零，本轮行动结束！',

    // 负面事件
    'event.sandstorm': '沙尘暴',
    'event.sandstormEffect': '损失一块沙漠领土',
    'event.bandits': '强盗来袭',
    'event.banditsEffect': '被抢走30金币',
    'event.lost': '迷路',
    'event.lostEffect': '下回合行动点-1',
    'event.plague': '瘟疫',
    'event.plagueEffect': '损失20金币',
    'event.noEffect': '（暂无影响）',
    'event.nextTurnAPMinus': '下回合行动点-1',

    // 技能
    'skill.legionConquest': '军团征服',
    'skill.legionConquestDesc': '抢夺遗迹时跳过PK，直接抢夺',
    'skill.silkRoadTreasure': '丝路财宝',
    'skill.silkRoadTreasureDesc': '收集遗迹时额外获得50金币',
    'skill.pharaohProtection': '法老庇护',
    'skill.pharaohProtectionDesc': '遗迹被抢时50%概率保护成功',
    'skill.academicExploration': '学术探索',
    'skill.academicExplorationDesc': '遗迹格答题难度+1\n答对获碎片\n3碎片=1遗迹',
    'skill.used': '已使用',
    'skill.activated': '技能已激活！',

    // 问答场景
    'quiz.title': '📚 知识挑战',
    'quiz.pkTitle': '⚔️ 答题PK - {difficulty}',
    'quiz.subjectChallenge': '📚 {subject}挑战 - {difficulty}',
    'quiz.terrainChallenge': '📚 {terrain}挑战 - {difficulty}',
    'quiz.correct': '✓ 回答正确！',
    'quiz.wrong': '✗ 回答错误',
    'quiz.knowledgePoint': '💡 知识点：{point}',
    'quiz.hintPrefix': '📜 孔明锦囊提示：答案以「{hint}...」开头',
    'quiz.gainPoints': '+{num} 行动点！',
    'quiz.difficulty.easy': '简单',
    'quiz.difficulty.medium': '中等',
    'quiz.difficulty.hard': '困难',

    // 科目
    'subject.physics': '物理',
    'subject.history': '历史',
    'subject.geography': '地理',
    'subject.math': '数学',
    'subject.chemistry': '化学',
    'subject.biology': '生物',
    'subject.economics': '经济',

    // 地形
    'terrain.plains': '平原',
    'terrain.forest': '森林',
    'terrain.hills': '丘陵',
    'terrain.desert': '沙漠',
    'terrain.coast': '海岸',
    'terrain.mountains': '山脉',
    'terrain.water': '海洋',
    'terrain.basicEffect': '基础地形，易于开发',
    'terrain.forestEffect': '提供木材，防御加成',
    'terrain.hillsEffect': '矿产丰富，视野开阔',
    'terrain.desertEffect': '古老遗迹，可能遭遇沙暴',
    'terrain.coastEffect': '贸易要地，收益最高',
    'terrain.claimCost': '占领消耗: {num} 点',
    'terrain.goldBonus': '每回合收益: +{num} 金',

    // 文明
    'civ.rome': '罗马',
    'civ.china': '中华',
    'civ.egypt': '埃及',
    'civ.greece': '希腊',
    'civ.romeDesc': '伟大的罗马帝国，以法律和工程闻名于世',
    'civ.chinaDesc': '拥有五千年文明史的东方古国',
    'civ.egyptDesc': '尼罗河畔的古老文明，金字塔的建造者',
    'civ.greeceDesc': '民主制度的发源地，哲学与艺术的摇篮',

    // 通用
    'player': '玩家',
    'confirm': '确定',
    'cancel': '取消',
  },

  en: {
    // Menu Scene
    'menu.title': 'Civilization Quest',
    'menu.subtitle': 'World Civilization Quest',
    'menu.selectCiv': 'Choose Your Civilization',
    'menu.singlePlayer': '🎮 Single Player',
    'menu.multiplayer': '👥 Multiplayer',
    'menu.multiplayerHint': 'Multiplayer: 2-4 players local turns, collect relics to win!',
    'menu.bottomHint': 'Develop your civilization by answering knowledge questions!',
    'menu.language': 'Language',

    // Lobby Scene
    'lobby.title': '🎮 Multiplayer - Choose Civilization',
    'lobby.victoryCondition': 'Victory: Collect {count} civilization relics first',
    'lobby.selectPrompt': 'Player {num}, choose your civilization',
    'lobby.allReady': 'All players ready! Click to start',
    'lobby.joinedPlayers': 'Joined Players',
    'lobby.startGame': '🎲 Start Game',
    'lobby.back': '← Back',

    // Dice Scene
    'dice.title': '🎲 Roll Dice for Turn Order',
    'dice.subtitle': 'Highest roll goes first',
    'dice.rollPrompt': '{name} ({civ}) roll the dice',
    'dice.rollButton': '🎲 Roll Dice',
    'dice.waiting': 'Waiting...',
    'dice.orderDecided': '🏆 Turn Order Decided!',
    'dice.startGame': 'Start Game!',

    // World Map Scene
    'world.turn': 'Turn {num}',
    'world.actionPoints': '⚡ Action Points: {num}',
    'world.relics': '🏺 Relics: {current}/{total}',
    'world.fragments': '🔮 Fragments: {current}/3',
    'world.combo': '🔥 Combo x{num}',
    'world.subject': '📚 Subject: {subject}',
    'world.endTurn': 'End Turn',
    'world.backToMenu': 'Back to Menu',
    'world.needPoints': 'Need {num} action points to claim this terrain!',
    'world.needPointsSteal': 'Need {num} action points to steal relic!',
    'world.yourTurn': "It's your turn!",
    'world.turnStart': "{name}'s turn begins",
    'world.answerFirst': 'Answer a question to get action points first!',
    'world.victory': '🎉 Victory!',
    'world.victoryMsg': '{name} collected {num} relics and won the game!',
    'world.relicCollected': '🏺 Relic Collected!',
    'world.relicStolen': '⚔️ Relic Stolen!',
    'world.relicDefended': '🛡️ Relic Defended!',
    'world.pharaohProtection': "🛡️ {name}'s Pharaoh Protection activated!\n\nRelic cannot be stolen",
    'world.stealPK': '⚔️ Steal Relic!\n\n{attacker} vs {defender}\n\nQuiz PK begins!',
    'world.newRelic': '✨ A new relic has appeared!',
    'world.yourTerritory': 'Your territory',
    'world.adjacentOnly': 'Can only expand to adjacent territory!',
    'world.notEnoughAP': 'Not enough AP! Need {need}, have {have}',
    'world.buyAP': '💰 Buy AP',
    'world.quizPhase': 'Quiz Phase',
    'world.actionPhase': 'Action Phase',
    'world.turnInfo': 'Turn {num} | {phase}',
    'world.subjectDisplay': '📚 Subject: {subject}',
    'world.subjectPending': 'TBD',
    'world.correctMsg': '✅ Correct!\n\n+{points} Action Points{penalty}\n{combo}',
    'world.penaltyInfo': ' (Penalty -{num})',
    'world.comboInfo': '🔥 Combo x{num}',
    'world.goldInsufficient': 'Not enough gold! Need {cost} 💰',
    'world.answerFirstBuy': 'Answer a question first!',
    'world.buyNotFirstTurn': 'Cannot buy AP on turn 1!',
    'world.buyOncePerTurn': 'Can only buy AP once per turn!',
    'world.finishQuizFirst': 'Please finish the quiz first!',
    'world.incomeTitle': '💰 Turn Income',
    'world.baseIncome': 'Base Income: +{num} 💰',
    'world.territoryIncome': 'Territory ({tiles} tiles): +{num} 💰',
    'world.totalIncome': 'Total: +{num} 💰',
    'world.skillUsedTurn': 'Skill already used this turn!',
    'world.skillUsedUp': 'Skill already depleted!',
    'world.legionConquestActive': '⚔️ Legion Conquest! Skip PK when stealing relics',
    'world.useInAction': 'Use during action phase!',
    'world.silkRoadPassive': '📜 Passive: extra gold when collecting relics',
    'world.pharaohPassive': "🛡️ Passive: 50% protection when relic is stolen",
    'world.pharaohProtected': "🛡️ {name}'s Pharaoh Protection activated!\n\nRelic defended!",
    'world.pharaohFailed': "💥 {name}'s Pharaoh Protection failed...\n\nRelic stolen!",
    'world.academicPassive': '🏛️ Passive: earn fragments at relic tiles',
    'world.fragmentGained': '🔮 Relic Fragment gained! ({current}/3)',
    'world.fragmentToRelic': '🏛️ Academic Exploration! 3 fragments forged into 1 relic!',
    'world.silkRoadGold': '📜 Silk Road Treasure! +{num} 💰',
    'world.victoryTitle': '🏆 Victory!',
    'world.victoryStats': 'Collected {relics} civilization relics\nin {turns} turns',
    'world.legendRelic': '🏺Relic',
    'world.ownedTerritory': 'Your territory - {name}\nIncome: +{gold} 💰/turn',
    'world.ownedRelicInfo': '🏺 Your relic here - {name}\nIncome: +{gold} 💰/turn\nWatch out for thieves!',
    'world.otherTerritory': "{name}'s territory",
    'world.hasRelic': 'Relic here',
    'world.stealHint': 'Click to steal! (costs {cost} AP)',
    'world.neutralRelicHint': 'Claim this tile to get a relic!',
    'world.stealTip': '⚔️ Found {count} stealable relic(s)! Click opponent relic tiles to steal',
    'world.stealNeedAdjacent': 'You need adjacent territory to steal relics!',
    'world.pkRoundTitle': '⚔️ Round {step}/3 - {name} ({role}) answers',
    'world.pkAttackerRole': 'Challenger',
    'world.pkDefenderRole': 'Defender',
    'world.pkAttackerLost': '❌ Challenger wrong! Paid {gold} 💰 to {name}',
    'world.pkDraw': '🤝 3-Round Draw! {name} defended the relic!',
    'world.relicChallenge': '🏺 Relic Challenge! Answer correctly to claim the relic!',
    'world.relicQuizFailed': '❌ Wrong answer! Action points reset to 0!',

    // Events
    'event.sandstorm': 'Sandstorm',
    'event.sandstormEffect': 'Lost a desert territory',
    'event.bandits': 'Bandits!',
    'event.banditsEffect': 'Lost 30 gold',
    'event.lost': 'Lost',
    'event.lostEffect': 'AP -1 next turn',
    'event.plague': 'Plague',
    'event.plagueEffect': 'Lost 20 gold',
    'event.noEffect': '(No effect)',
    'event.nextTurnAPMinus': 'AP -1 next turn',

    // Skills
    'skill.legionConquest': 'Legion Conquest',
    'skill.legionConquestDesc': 'Skip PK when stealing relics',
    'skill.silkRoadTreasure': 'Silk Road Treasure',
    'skill.silkRoadTreasureDesc': 'Gain 50 extra gold when collecting relics',
    'skill.pharaohProtection': "Pharaoh's Protection",
    'skill.pharaohProtectionDesc': '50% chance to block relic theft',
    'skill.academicExploration': 'Academic Exploration',
    'skill.academicExplorationDesc': 'Higher difficulty at relic tiles;\n correct = fragment;\n 3 fragments = 1 relic',
    'skill.used': 'Used',
    'skill.activated': 'Skill Activated!',

    // Quiz Scene
    'quiz.title': '📚 Knowledge Challenge',
    'quiz.pkTitle': '⚔️ Quiz PK - {difficulty}',
    'quiz.subjectChallenge': '📚 {subject} Challenge - {difficulty}',
    'quiz.terrainChallenge': '📚 {terrain} Challenge - {difficulty}',
    'quiz.correct': '✓ Correct!',
    'quiz.wrong': '✗ Wrong',
    'quiz.knowledgePoint': '💡 Knowledge: {point}',
    'quiz.hintPrefix': '📜 Hint: Answer starts with "{hint}..."',
    'quiz.gainPoints': '+{num} Action Points!',
    'quiz.difficulty.easy': 'Easy',
    'quiz.difficulty.medium': 'Medium',
    'quiz.difficulty.hard': 'Hard',

    // Subjects
    'subject.physics': 'Physics',
    'subject.history': 'History',
    'subject.geography': 'Geography',
    'subject.math': 'Math',
    'subject.chemistry': 'Chemistry',
    'subject.biology': 'Biology',
    'subject.economics': 'Economics',

    // Terrain
    'terrain.plains': 'Plains',
    'terrain.forest': 'Forest',
    'terrain.hills': 'Hills',
    'terrain.desert': 'Desert',
    'terrain.coast': 'Coast',
    'terrain.mountains': 'Mountains',
    'terrain.water': 'Ocean',
    'terrain.basicEffect': 'Basic terrain, easy to develop',
    'terrain.forestEffect': 'Provides wood, defense bonus',
    'terrain.hillsEffect': 'Rich minerals, wide view',
    'terrain.desertEffect': 'Ancient ruins, sandstorm risk',
    'terrain.coastEffect': 'Trade hub, highest income',
    'terrain.claimCost': 'Claim Cost: {num} pts',
    'terrain.goldBonus': 'Income: +{num} gold/turn',

    // Civilizations
    'civ.rome': 'Rome',
    'civ.china': 'China',
    'civ.egypt': 'Egypt',
    'civ.greece': 'Greece',
    'civ.romeDesc': 'The great Roman Empire, known for law and engineering',
    'civ.chinaDesc': 'Ancient Eastern nation with 5000 years of history',
    'civ.egyptDesc': 'Ancient civilization by the Nile, builders of pyramids',
    'civ.greeceDesc': 'Birthplace of democracy, cradle of philosophy and art',

    // Common
    'player': 'Player',
    'confirm': 'OK',
    'cancel': 'Cancel',
  },
};

export { translations };
