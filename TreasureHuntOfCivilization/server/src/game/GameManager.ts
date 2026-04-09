import type { GameState, Player, Civilization, Territory, TerrainType } from '../../shared/types.js';

// 预定义文明
const CIVILIZATIONS: Map<string, Civilization> = new Map([
  ['rome', {
    id: 'rome',
    name: '罗马',
    nameEn: 'Rome',
    description: '伟大的罗马帝国',
    era: 'classical',
    color: '#8B0000',
    specialUnit: '军团兵',
    specialBuilding: '罗马浴场',
    bonus: '所有道路建造成本-50%',
  }],
  ['china', {
    id: 'china',
    name: '中华',
    nameEn: 'China',
    description: '拥有五千年文明史的东方古国',
    era: 'ancient',
    color: '#FFD700',
    specialUnit: '诸葛连弩',
    specialBuilding: '长城',
    bonus: '科技研究速度+20%',
  }],
  ['egypt', {
    id: 'egypt',
    name: '埃及',
    nameEn: 'Egypt',
    description: '尼罗河畔的古老文明',
    era: 'ancient',
    color: '#DAA520',
    specialUnit: '战车射手',
    specialBuilding: '金字塔',
    bonus: '奇观建造速度+30%',
  }],
  ['greece', {
    id: 'greece',
    name: '希腊',
    nameEn: 'Greece',
    description: '民主制度的发源地',
    era: 'classical',
    color: '#4169E1',
    specialUnit: '重装步兵',
    specialBuilding: '卫城',
    bonus: '文化值产出+25%',
  }],
]);

/**
 * 游戏管理器 - 管理所有游戏房间和状态
 */
export class GameManager {
  private games: Map<string, GameState> = new Map();
  private playerToGame: Map<string, string> = new Map();

  /**
   * 创建新游戏
   */
  createGame(playerId: string, playerName: string, civilizationId: string): GameState {
    const gameId = this.generateGameId();
    const civilization = CIVILIZATIONS.get(civilizationId);

    if (!civilization) {
      throw new Error('无效的文明ID');
    }

    const player: Player = {
      id: playerId,
      name: playerName,
      civilization,
      resources: {
        food: 100,
        production: 50,
        gold: 100,
        science: 0,
        culture: 0,
      },
      territories: [],
      techLevel: 1,
      score: 0,
    };

    const game: GameState = {
      id: gameId,
      players: [player],
      currentTurn: 1,
      currentPlayerIndex: 0,
      map: this.generateMap(),
      phase: 'waiting',
    };

    this.games.set(gameId, game);
    this.playerToGame.set(playerId, gameId);

    return game;
  }

  /**
   * 加入游戏
   */
  joinGame(gameId: string, playerId: string, playerName: string, civilizationId: string): GameState {
    const game = this.games.get(gameId);

    if (!game) {
      throw new Error('游戏不存在');
    }

    if (game.players.length >= 6) {
      throw new Error('游戏已满');
    }

    if (game.phase !== 'waiting') {
      throw new Error('游戏已开始');
    }

    const civilization = CIVILIZATIONS.get(civilizationId);
    if (!civilization) {
      throw new Error('无效的文明ID');
    }

    // 检查文明是否已被选择
    if (game.players.some(p => p.civilization.id === civilizationId)) {
      throw new Error('该文明已被其他玩家选择');
    }

    const player: Player = {
      id: playerId,
      name: playerName,
      civilization,
      resources: {
        food: 100,
        production: 50,
        gold: 100,
        science: 0,
        culture: 0,
      },
      territories: [],
      techLevel: 1,
      score: 0,
    };

    game.players.push(player);
    this.playerToGame.set(playerId, gameId);

    // 如果玩家数量达到2人，可以开始游戏
    if (game.players.length >= 2) {
      game.phase = 'playing';
    }

    return game;
  }

  /**
   * 结束回合
   */
  endTurn(gameId: string, playerId: string): GameState {
    const game = this.games.get(gameId);

    if (!game) {
      throw new Error('游戏不存在');
    }

    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer.id !== playerId) {
      throw new Error('不是你的回合');
    }

    // 计算回合收益
    const territoryCount = currentPlayer.territories.length || 1;
    currentPlayer.resources.food += territoryCount * 5;
    currentPlayer.resources.production += territoryCount * 3;
    currentPlayer.resources.gold += territoryCount * 2;
    currentPlayer.score += territoryCount;

    // 下一个玩家
    game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
    if (game.currentPlayerIndex === 0) {
      game.currentTurn++;
    }

    return game;
  }

  /**
   * 占领领土
   */
  claimTerritory(gameId: string, playerId: string, x: number, y: number): GameState {
    const game = this.games.get(gameId);

    if (!game) {
      throw new Error('游戏不存在');
    }

    const player = game.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('玩家不在游戏中');
    }

    if (x < 0 || x >= game.map.length || y < 0 || y >= game.map[0].length) {
      throw new Error('无效的坐标');
    }

    const territory = game.map[x][y];
    if (territory.owner) {
      throw new Error('该领土已被占领');
    }

    if (territory.type === 'water' || territory.type === 'mountains') {
      throw new Error('无法占领该地形');
    }

    territory.owner = playerId;
    player.territories.push(territory);
    player.score += 10;

    return game;
  }

  /**
   * 处理玩家断开连接
   */
  handleDisconnect(playerId: string): string[] {
    const gameId = this.playerToGame.get(playerId);
    const affectedGames: string[] = [];

    if (gameId) {
      const game = this.games.get(gameId);
      if (game) {
        game.players = game.players.filter(p => p.id !== playerId);
        affectedGames.push(gameId);

        // 如果没有玩家了，删除游戏
        if (game.players.length === 0) {
          this.games.delete(gameId);
        }
      }
      this.playerToGame.delete(playerId);
    }

    return affectedGames;
  }

  /**
   * 获取所有活跃游戏
   */
  getActiveGames(): { id: string; playerCount: number; phase: string }[] {
    return Array.from(this.games.values()).map(game => ({
      id: game.id,
      playerCount: game.players.length,
      phase: game.phase,
    }));
  }

  /**
   * 生成游戏ID
   */
  private generateGameId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /**
   * 生成地图
   */
  private generateMap(): Territory[][] {
    const cols = 16;
    const rows = 10;
    const map: Territory[][] = [];
    const terrainTypes: TerrainType[] = ['plains', 'hills', 'forest', 'desert', 'mountains', 'water', 'coast'];

    for (let x = 0; x < cols; x++) {
      map[x] = [];
      for (let y = 0; y < rows; y++) {
        let terrain: TerrainType;
        const rand = Math.random();

        if (x === 0 || x === cols - 1 || y === 0 || y === rows - 1) {
          terrain = rand < 0.7 ? 'water' : 'coast';
        } else if (rand < 0.35) {
          terrain = 'plains';
        } else if (rand < 0.55) {
          terrain = 'forest';
        } else if (rand < 0.70) {
          terrain = 'hills';
        } else if (rand < 0.80) {
          terrain = 'desert';
        } else if (rand < 0.90) {
          terrain = 'mountains';
        } else {
          terrain = 'water';
        }

        map[x][y] = {
          id: `${x}-${y}`,
          x,
          y,
          type: terrain,
        };
      }
    }

    return map;
  }
}
