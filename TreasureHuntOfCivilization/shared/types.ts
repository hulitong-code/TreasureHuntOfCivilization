// ============================================
// 文明求索 - 共享类型定义
// ============================================

// 文明技能
export interface CivilizationSkill {
  name: string;
  description: string;
  icon: string;
}

// 文明类型
export interface Civilization {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  era: Era;
  color: string;
  specialUnit: string;
  specialBuilding: string;
  bonus: string;
  skill?: CivilizationSkill;
}

// 时代
export type Era = 'ancient' | 'classical' | 'medieval' | 'renaissance' | 'industrial' | 'modern';

export const EraNames: Record<Era, string> = {
  ancient: '远古时代',
  classical: '古典时代',
  medieval: '中世纪',
  renaissance: '文艺复兴',
  industrial: '工业时代',
  modern: '现代',
};

// 知识问答题目
export interface QuizQuestion {
  id: string;
  subject: Subject;
  difficulty: 1 | 2 | 3; // 1=简单, 2=中等, 3=困难
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  relatedCivilization?: string;
  knowledgePoint: string;
}

export type Subject = 'history' | 'geography' | 'physics' | 'math' | 'chemistry' | 'biology' | 'economics';

export const SubjectNames: Record<Subject, string> = {
  history: '历史',
  geography: '地理',
  physics: '物理',
  math: '数学',
  chemistry: '化学',
  biology: '生物',
  economics: '经济',
};

// 玩家
export interface Player {
  id: string;
  name: string;
  civilization: Civilization;
  resources: Resources;
  territories: Territory[];
  techLevel: number;
  score: number;
}

// 资源
export interface Resources {
  food: number;      // 粮食
  production: number; // 生产力
  gold: number;       // 金币
  science: number;    // 科技点
  culture: number;    // 文化值
}

// 领土
export interface Territory {
  id: string;
  x: number;
  y: number;
  type: TerrainType;
  owner?: string;
  building?: Building;
}

export type TerrainType = 'plains' | 'hills' | 'mountains' | 'forest' | 'desert' | 'water' | 'coast';

export const TerrainNames: Record<TerrainType, string> = {
  plains: '平原',
  hills: '丘陵',
  mountains: '山脉',
  forest: '森林',
  desert: '沙漠',
  water: '海洋',
  coast: '海岸',
};

// 建筑
export interface Building {
  id: string;
  name: string;
  type: BuildingType;
  effect: string;
  requiredTech: string;
}

export type BuildingType = 'city' | 'farm' | 'mine' | 'market' | 'library' | 'barracks' | 'wonder';

// 游戏状态
export interface GameState {
  id: string;
  players: Player[];
  currentTurn: number;
  currentPlayerIndex: number;
  map: Territory[][];
  phase: GamePhase;
  winner?: string;
}

export type GamePhase = 'waiting' | 'playing' | 'quiz' | 'battle' | 'ended';

// Socket 事件
export interface ServerToClientEvents {
  gameState: (state: GameState) => void;
  quizQuestion: (question: QuizQuestion) => void;
  quizResult: (correct: boolean, explanation: string) => void;
  playerJoined: (player: Player) => void;
  playerLeft: (playerId: string) => void;
  turnChanged: (playerIndex: number) => void;
  gameEnded: (winnerId: string) => void;
  error: (message: string) => void;
}

export interface ClientToServerEvents {
  joinGame: (gameId: string, playerName: string, civilizationId: string) => void;
  createGame: (playerName: string, civilizationId: string) => void;
  answerQuiz: (questionId: string, answerIndex: number) => void;
  endTurn: () => void;
  buildStructure: (territoryId: string, buildingType: BuildingType) => void;
  claimTerritory: (x: number, y: number) => void;
}
