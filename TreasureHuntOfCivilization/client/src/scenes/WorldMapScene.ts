import Phaser from 'phaser';
import type { Civilization, Territory, TerrainType, Resources } from '@shared/types';
import type { LocalPlayer } from './LobbyScene';
import { VICTORY_CONFIG, ACTION_CONFIG, SUBJECTS, CIV_ICONS } from './LobbyScene';
import { t, tf, getLanguage } from '../i18n';
import { RELIC_QUESTIONS } from '../data/questions';

// 地形颜色映射
const TERRAIN_COLORS: Record<TerrainType, number> = {
  plains: 0x90EE90,
  hills: 0xBDB76B,
  mountains: 0x808080,
  forest: 0x228B22,
  desert: 0xF4A460,
  water: 0x4169E1,
  coast: 0x87CEEB,
};

// 地形配置（差异化设计）
interface TerrainConfig {
  name: string;
  passable: boolean;
  actionCost: number;      // 占领消耗的行动点
  goldBonus: number;       // 每回合金币收益
  specialEffect?: string;  // 特殊效果描述
  color: number;           // 地形颜色（用于高亮）
}

const TERRAIN_CONFIG: Record<TerrainType, TerrainConfig> = {
  plains: {
    name: '平原',
    passable: true,
    actionCost: 1,
    goldBonus: 3,
    specialEffect: '基础地形，易于开发',
    color: 0x90EE90,
  },
  forest: {
    name: '森林',
    passable: true,
    actionCost: 1,
    goldBonus: 4,
    specialEffect: '提供木材，防御加成',
    color: 0x228B22,
  },
  hills: {
    name: '丘陵',
    passable: true,
    actionCost: 2,
    goldBonus: 6,
    specialEffect: '矿产丰富，视野开阔',
    color: 0xBDB76B,
  },
  desert: {
    name: '沙漠',
    passable: true,
    actionCost: 2,
    goldBonus: 8,
    specialEffect: '古老遗迹，可能遭遇沙暴',
    color: 0xF4A460,
  },
  coast: {
    name: '海岸',
    passable: true,
    actionCost: 3,
    goldBonus: 12,
    specialEffect: '贸易要地，收益最高',
    color: 0x87CEEB,
  },
  mountains: {
    name: '山脉',
    passable: false,
    actionCost: 0,
    goldBonus: 0,
    color: 0x808080,
  },
  water: {
    name: '海洋',
    passable: false,
    actionCost: 0,
    goldBonus: 0,
    color: 0x4169E1,
  },
};

// 随机负面事件
const NEGATIVE_EVENTS = [
  { id: 'sandstorm', icon: '🌪️' },
  { id: 'bandits', icon: '💰' },
  { id: 'lost', icon: '🧭' },
  { id: 'plague', icon: '🦠' },
];

// 地图尺寸
const MAP_COLS = 10;
const MAP_ROWS = 8;
const TILE_SIZE = 65;
const MAP_OFFSET_X = 80;
const MAP_OFFSET_Y = 100;

// 起始位置（用于避免在这些位置生成遗迹）
const START_POSITIONS = [
  { x: 2, y: 2 },
  { x: MAP_COLS - 3, y: MAP_ROWS - 3 },
  { x: 2, y: MAP_ROWS - 3 },
  { x: MAP_COLS - 3, y: 2 },
];

// 遗迹数据
interface Relic {
  x: number;
  y: number;
  owner: number | null;  // null = 中立, number = 玩家索引
}

/**
 * 世界地图场景 - 重构版
 */
export class WorldMapScene extends Phaser.Scene {
  // 模式相关
  private isMultiplayer: boolean = false;
  private players: LocalPlayer[] = [];
  private currentPlayerIndex: number = 0;

  // 单人模式数据
  private singlePlayerCiv!: Civilization;
  private singlePlayerResources: Resources = { food: 50, production: 20, gold: 50, science: 0, culture: 0 };
  private singlePlayerRelics: number = 0;
  private singlePlayerSkillUsed: boolean = false;

  // 地图相关
  private mapTiles: Phaser.GameObjects.Rectangle[][] = [];
  private territories: Territory[][] = [];
  private tileOwners: Map<string, number> = new Map();  // key -> playerIndex
  private tileMarkers: Map<string, Phaser.GameObjects.Text> = new Map();  // 领土图标
  private blinkingMarkers: Phaser.GameObjects.Text[] = [];  // 当前玩家闪烁图标
  private relics: Relic[] = [];
  private relicSprites: Map<string, Phaser.GameObjects.Text> = new Map();

  // 回合相关
  private turn: number = 1;
  private actionPoints: number = 0;
  private currentSubject: string = '';
  private comboCount: number = 0;
  private nextTurnPenalty: number = 0;  // 下回合行动点惩罚
  private skillUsedThisTurn: boolean = false;
  private buyUsedThisTurn: boolean = false;
  private fragments: number = 0;  // 希腊学术探索碎片 (3碎片=1遗迹)

  // 新增状态
  private sandstormActive: boolean = false;   // 沙暴：下回合无法占领沙漠/丘陵
  private pkDefenderFailures: number = 0;     // PK守方失败次数（需2次才输）
  private scienceHintReady: boolean = false;  // 科技点满10→下题可看提示
  private passableTileCount: number = 0;      // 可通行格总数（地图初始化后固定）
  private merchantX: number = -1;             // 流浪商人坐标
  private merchantY: number = -1;
  private merchantSprite: Phaser.GameObjects.Text | null = null;

  // UI 元素
  private turnText!: Phaser.GameObjects.Text;
  private actionPointsText!: Phaser.GameObjects.Text;
  private currentPlayerText!: Phaser.GameObjects.Text;
  private relicText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private subjectText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private fragmentText!: Phaser.GameObjects.Text;
  private scienceText!: Phaser.GameObjects.Text;
  private cultureText!: Phaser.GameObjects.Text;
  private territoryText!: Phaser.GameObjects.Text;
  private skillButton!: Phaser.GameObjects.Container;
  private cultureInfluenceButton!: Phaser.GameObjects.Container;
  private playerPanels: Phaser.GameObjects.Container[] = [];
  private messageContainer: Phaser.GameObjects.Container | null = null;
  private tooltipContainer: Phaser.GameObjects.Container | null = null;

  // 游戏阶段
  private phase: 'quiz' | 'action' | 'ended' = 'quiz';

  constructor() {
    super({ key: 'WorldMapScene' });
  }

  init(data: { isMultiplayer?: boolean; players?: LocalPlayer[]; civilization?: Civilization }): void {
    this.isMultiplayer = data.isMultiplayer || false;
    this.tileOwners = new Map();
    this.tileMarkers = new Map();
    this.relics = [];
    this.relicSprites = new Map();
    this.playerPanels = [];
    this.turn = 1;
    this.currentPlayerIndex = 0;
    this.actionPoints = 0;
    this.comboCount = 0;
    this.nextTurnPenalty = 0;
    this.phase = 'quiz';
    this.fragments = 0;

    if (this.isMultiplayer && data.players) {
      this.players = data.players.map(p => ({
        ...p,
        resources: { food: 50, production: 20, gold: 50, science: 0, culture: 0 },
        relics: 0,
      }));
      // 初始化技能使用状态
      this.players.forEach(p => {
        (p as any).skillUsed = false;
        (p as any).fragments = 0;
      });
    } else if (data.civilization) {
      this.singlePlayerCiv = data.civilization;
      this.singlePlayerResources = { food: 50, production: 20, gold: 50, science: 0, culture: 0 };
      this.singlePlayerRelics = 0;
      this.singlePlayerSkillUsed = false;
    }
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // 背景
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    bg.fillRect(0, 0, width, height);

    // 生成地图
    this.generateMap();

    // 绘制地图
    this.drawMap();

    // 生成可见遗迹
    this.generateVisibleRelics();

    // 创建 UI
    this.createUI();

    // 分配初始领土
    this.assignInitialTerritories();

    // 开始第一回合
    this.startTurn();
  }

  private generateMap(): void {
    this.territories = [];

    for (let x = 0; x < MAP_COLS; x++) {
      this.territories[x] = [];
      for (let y = 0; y < MAP_ROWS; y++) {
        let terrain: TerrainType;
        const rand = Math.random();

        // 边缘是水域
        if (x === 0 || x === MAP_COLS - 1 || y === 0 || y === MAP_ROWS - 1) {
          terrain = rand < 0.6 ? 'water' : 'coast';
        } else if (rand < 0.30) {
          terrain = 'plains';
        } else if (rand < 0.50) {
          terrain = 'forest';
        } else if (rand < 0.65) {
          terrain = 'hills';
        } else if (rand < 0.80) {
          terrain = 'desert';
        } else if (rand < 0.90) {
          terrain = 'mountains';
        } else {
          terrain = 'coast';
        }

        this.territories[x][y] = { id: `${x}-${y}`, x, y, type: terrain };
      }
    }

    // 统计可通行格总数（用于领土胜利判断）
    this.passableTileCount = 0;
    for (let x = 0; x < MAP_COLS; x++) {
      for (let y = 0; y < MAP_ROWS; y++) {
        if (TERRAIN_CONFIG[this.territories[x][y].type].passable) {
          this.passableTileCount++;
        }
      }
    }
  }

  private generateVisibleRelics(): void {
    // 找到可放置遗迹的位置（避开起始点和边缘）
    const validPositions = this.getValidRelicPositions();
    Phaser.Utils.Array.Shuffle(validPositions);

    // 分散放置遗迹，确保最小距离 >= 3格
    const MIN_RELIC_DISTANCE = 3;
    const chosen: { x: number; y: number }[] = [];

    for (const pos of validPositions) {
      if (chosen.length >= 3) break;
      const tooClose = chosen.some(c => {
        const dx = Math.abs(c.x - pos.x);
        const dy = Math.abs(c.y - pos.y);
        return Math.max(dx, dy) < MIN_RELIC_DISTANCE;
      });
      if (!tooClose) {
        chosen.push(pos);
      }
    }

    // 如果距离限制太严导致不够3个，放宽限制再补
    if (chosen.length < 3) {
      for (const pos of validPositions) {
        if (chosen.length >= 3) break;
        if (!chosen.some(c => c.x === pos.x && c.y === pos.y)) {
          chosen.push(pos);
        }
      }
    }

    for (const pos of chosen) {
      this.spawnRelic(pos.x, pos.y);
    }
  }

  private getValidRelicPositions(): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = [];

    for (let x = 2; x < MAP_COLS - 2; x++) {
      for (let y = 2; y < MAP_ROWS - 2; y++) {
        const terrain = this.territories[x][y].type;
        if (!TERRAIN_CONFIG[terrain].passable) continue;

        // 检查是否是起始位置
        const isStartPos = START_POSITIONS.some(sp => sp.x === x && sp.y === y);
        if (isStartPos) continue;

        // 检查是否已有遗迹
        const hasRelic = this.relics.some(r => r.x === x && r.y === y);
        if (hasRelic) continue;

        // 检查是否已被占领
        if (this.tileOwners.has(`${x}-${y}`)) continue;

        positions.push({ x, y });
      }
    }

    return positions;
  }

  private spawnRelic(x: number, y: number): void {
    this.relics.push({ x, y, owner: null });

    // 创建遗迹精灵
    const relicSprite = this.add.text(
      MAP_OFFSET_X + x * TILE_SIZE,
      MAP_OFFSET_Y + y * TILE_SIZE - 5,
      '🏺',
      { font: '24px Arial' }
    );
    relicSprite.setOrigin(0.5);
    relicSprite.setDepth(10);
    this.relicSprites.set(`${x}-${y}`, relicSprite);

    // 添加发光动画
    this.tweens.add({
      targets: relicSprite,
      scale: { from: 1, to: 1.2 },
      alpha: { from: 1, to: 0.7 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });
  }

  private respawnRelic(): void {
    // 获取可用位置
    const validPositions = this.getValidRelicPositions();
    if (validPositions.length === 0) return;

    // 收集所有玩家领土坐标
    const ownedTiles: { x: number; y: number }[] = [];
    this.tileOwners.forEach((_owner, key) => {
      const [tx, ty] = key.split('-').map(Number);
      ownedTiles.push({ x: tx, y: ty });
    });

    const existingRelics = this.relics.filter(r => r.owner === null);
    const MIN_DIST_FROM_TERRITORY = 3;
    Phaser.Utils.Array.Shuffle(validPositions);

    // 优先选择远离所有玩家领土和现有遗迹的位置
    let bestPos = validPositions[0];
    let bestScore = -Infinity;

    for (const pos of validPositions) {
      // 与最近玩家领土的距离
      const minDistToTerritory = ownedTiles.length > 0
        ? Math.min(...ownedTiles.map(t => Math.max(Math.abs(t.x - pos.x), Math.abs(t.y - pos.y))))
        : Infinity;

      // 与最近无主遗迹的距离
      const minDistToRelic = existingRelics.length > 0
        ? Math.min(...existingRelics.map(r => Math.max(Math.abs(r.x - pos.x), Math.abs(r.y - pos.y))))
        : Infinity;

      // 综合评分：领土距离权重更高
      const score = minDistToTerritory * 2 + minDistToRelic;
      if (score > bestScore && minDistToTerritory >= MIN_DIST_FROM_TERRITORY) {
        bestScore = score;
        bestPos = pos;
      }
    }

    // 如果没找到满足最小距离的位置，放宽限制取最优
    if (bestScore === -Infinity) {
      bestScore = -Infinity;
      for (const pos of validPositions) {
        const minDistToTerritory = ownedTiles.length > 0
          ? Math.min(...ownedTiles.map(t => Math.max(Math.abs(t.x - pos.x), Math.abs(t.y - pos.y))))
          : Infinity;
        const minDistToRelic = existingRelics.length > 0
          ? Math.min(...existingRelics.map(r => Math.max(Math.abs(r.x - pos.x), Math.abs(r.y - pos.y))))
          : Infinity;
        const score = minDistToTerritory * 2 + minDistToRelic;
        if (score > bestScore) {
          bestScore = score;
          bestPos = pos;
        }
      }
    }

    this.spawnRelic(bestPos.x, bestPos.y);

    // 显示新遗迹出现的提示
    this.showQuickMessage(t('world.newRelic'));
  }

  private drawMap(): void {
    for (let x = 0; x < MAP_COLS; x++) {
      this.mapTiles[x] = [];
      for (let y = 0; y < MAP_ROWS; y++) {
        const territory = this.territories[x][y];
        const posX = MAP_OFFSET_X + x * TILE_SIZE;
        const posY = MAP_OFFSET_Y + y * TILE_SIZE;
        const config = TERRAIN_CONFIG[territory.type];

        const tile = this.add.rectangle(posX, posY, TILE_SIZE - 2, TILE_SIZE - 2, TERRAIN_COLORS[territory.type]);
        tile.setStrokeStyle(1, 0x333333);
        tile.setData('coords', { x, y });

        if (config.passable) {
          tile.setInteractive({ useHandCursor: true });

          tile.on('pointerover', () => {
            if (!this.tileOwners.has(`${x}-${y}`)) {
              tile.setStrokeStyle(2, 0xffffff);
            }
            // 显示地形信息提示
            this.showTerrainTooltip(x, y, tile);
          });

          tile.on('pointerout', () => {
            if (!this.tileOwners.has(`${x}-${y}`)) {
              tile.setStrokeStyle(1, 0x333333);
            }
            // 隐藏地形信息提示
            this.hideTerrainTooltip();
          });

          tile.on('pointerdown', () => this.onTileClick(x, y));
        }

        this.mapTiles[x][y] = tile;
      }
    }
  }

  /**
   * 显示地形提示
   */
  private showTerrainTooltip(x: number, y: number, tile: Phaser.GameObjects.Rectangle): void {
    this.hideTerrainTooltip();

    const terrain = this.territories[x][y].type;
    const config = TERRAIN_CONFIG[terrain];
    const isOwned = this.tileOwners.has(`${x}-${y}`);

    // 创建提示容器
    const tooltipX = tile.x + TILE_SIZE / 2 + 10;
    const tooltipY = tile.y - 20;

    this.tooltipContainer = this.add.container(tooltipX, tooltipY);
    this.tooltipContainer.setDepth(200);

    // 提示背景
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.95);
    bg.fillRoundedRect(0, 0, 160, isOwned ? 60 : 90, 8);
    bg.lineStyle(2, config.color, 1);
    bg.strokeRoundedRect(0, 0, 160, isOwned ? 60 : 90, 8);

    // 地形名称 (i18n)
    const terrainKey = `terrain.${this.territories[x][y].type}` as string;
    const localizedTerrainName = t(terrainKey);
    const nameText = this.add.text(10, 8, `📍 ${localizedTerrainName}`, {
      font: 'bold 14px Microsoft YaHei',
      color: '#ffffff',
    });

    this.tooltipContainer.add([bg, nameText]);

    if (isOwned) {
      // 已占领的领土
      const ownerIdx = this.tileOwners.get(`${x}-${y}`)!;
      const owner = this.isMultiplayer ? this.players[ownerIdx] : null;
      const ownerName = owner ? owner.name : t('world.yourTerritory');
      const ownerText = this.add.text(10, 30, `👤 ${ownerName}`, {
        font: '12px Microsoft YaHei',
        color: '#88ccff',
      });
      this.tooltipContainer.add(ownerText);

      // 检查是否有遗迹
      const currentIdx = this.isMultiplayer ? this.currentPlayerIndex : -1;
      const relic = this.relics.find(r => r.x === x && r.y === y && r.owner !== null);
      if (relic && this.isMultiplayer) {
        const tooltipH = ownerIdx !== currentIdx ? 90 : 80;
        bg.clear();
        bg.fillStyle(0x1a1a2e, 0.95);
        bg.fillRoundedRect(0, 0, 180, tooltipH, 8);
        bg.lineStyle(2, config.color, 1);
        bg.strokeRoundedRect(0, 0, 180, tooltipH, 8);

        const relicInfo = this.add.text(10, 50, `🏺 ${t('world.hasRelic')}`, {
          font: '12px Microsoft YaHei',
          color: '#FFD700',
        });
        this.tooltipContainer.add(relicInfo);

        if (ownerIdx !== currentIdx) {
          const stealHint = this.add.text(10, 70, `⚔️ ${tf('world.stealHint', { cost: ACTION_CONFIG.STEAL_RELIC_COST })}`, {
            font: 'bold 11px Microsoft YaHei',
            color: '#ff6666',
          });
          this.tooltipContainer.add(stealHint);
        }
      }
    } else {
      // 未占领的领土 - 显示占领消耗和收益
      const costText = this.add.text(10, 30, `⚡ ${tf('terrain.claimCost', { num: config.actionCost })}`, {
        font: '12px Microsoft YaHei',
        color: config.actionCost <= 1 ? '#88ff88' : config.actionCost === 2 ? '#ffcc00' : '#ff8888',
      });

      const bonusText = this.add.text(10, 50, `💰 ${tf('terrain.goldBonus', { num: config.goldBonus })}`, {
        font: '12px Microsoft YaHei',
        color: '#FFD700',
      });

      const terrainType = this.territories[x][y].type;
      const effectKeys: Record<TerrainType, string> = {
        plains: 'terrain.basicEffect',
        forest: 'terrain.forestEffect',
        hills: 'terrain.hillsEffect',
        desert: 'terrain.desertEffect',
        coast: 'terrain.coastEffect',
        mountains: 'terrain.basicEffect',
        water: 'terrain.basicEffect',
      };
      const effectText = this.add.text(10, 70, `✨ ${t(effectKeys[terrainType])}`, {
        font: '11px Microsoft YaHei',
        color: '#aaaaaa',
        wordWrap: { width: 140 },
      });

      this.tooltipContainer.add([costText, bonusText, effectText]);

      // 检查是否有中立遗迹
      const neutralRelic = this.relics.find(r => r.x === x && r.y === y && r.owner === null);
      if (neutralRelic) {
        const relicHint = this.add.text(10, 90, `🏺 ${t('world.neutralRelicHint')}`, {
          font: 'bold 11px Microsoft YaHei',
          color: '#FFD700',
        });
        this.tooltipContainer.add(relicHint);

        // 扩大背景
        bg.clear();
        bg.fillStyle(0x1a1a2e, 0.95);
        bg.fillRoundedRect(0, 0, 180, 112, 8);
        bg.lineStyle(2, 0xFFD700, 1);
        bg.strokeRoundedRect(0, 0, 180, 112, 8);
      }
    }

    // 确保提示不会超出屏幕
    const { width } = this.cameras.main;
    if (tooltipX + 180 > width) {
      this.tooltipContainer.setX(tile.x - TILE_SIZE / 2 - 190);
    }
  }

  /**
   * 隐藏地形提示
   */
  private hideTerrainTooltip(): void {
    if (this.tooltipContainer) {
      this.tooltipContainer.destroy();
      this.tooltipContainer = null;
    }
  }

  private createUI(): void {
    const { width, height } = this.cameras.main;

    // 顶部信息栏
    const topBar = this.add.graphics();
    topBar.fillStyle(0x1a1a2e, 0.95);
    topBar.fillRect(0, 0, width, 70);

    // 当前玩家信息
    this.currentPlayerText = this.add.text(20, 10, '', { font: 'bold 20px Microsoft YaHei', color: '#ffffff' });
    this.turnText = this.add.text(20, 38, '', { font: '14px Microsoft YaHei', color: '#888888' });

    // 行动点显示
    this.actionPointsText = this.add.text(250, 10, '', { font: 'bold 24px Microsoft YaHei', color: '#00ff88' });

    // 科目显示
    this.subjectText = this.add.text(250, 42, '', { font: '14px Microsoft YaHei', color: '#ffcc00' });

    // 遗迹和Combo显示
    this.relicText = this.add.text(450, 10, '', { font: '18px Microsoft YaHei', color: '#FFD700' });
    this.comboText = this.add.text(450, 38, '', { font: '14px Microsoft YaHei', color: '#ff6600' });

    // 金币显示
    this.goldText = this.add.text(620, 10, '', { font: '18px Microsoft YaHei', color: '#FFD700' });

    // 碎片显示（希腊专属）
    this.fragmentText = this.add.text(620, 38, '', { font: '14px Microsoft YaHei', color: '#9C27B0' });
    this.fragmentText.setVisible(false);

    // 科技点显示
    this.scienceText = this.add.text(780, 10, '', { font: '16px Microsoft YaHei', color: '#00bcd4' });
    // 文化值显示
    this.cultureText = this.add.text(780, 38, '', { font: '16px Microsoft YaHei', color: '#e91e63' });
    // 领土占比显示
    this.territoryText = this.add.text(950, 10, '', { font: '14px Microsoft YaHei', color: '#aaaaaa' });

    // 右侧面板
    const panelX = width - 80;

    // 操作按钮区 - 紧凑排列在右上角
    this.createSkillButton(panelX, 100);
    this.createCultureInfluenceButton();
    this.createButton(panelX, 155, t('world.buyAP'), 0xD4A017, () => this.buyActionPoint());
    this.createButton(panelX, 200, t('world.endTurn'), 0x2196F3, () => this.endTurn());

    // 返回按钮
    this.createButton(panelX, height - 40, t('world.backToMenu'), 0x666666, () => this.scene.start('MenuScene'));

    // 多人模式玩家面板
    if (this.isMultiplayer) {
      this.createPlayerPanels();
    }

    // 底部图例
    this.createLegend();

    this.updateUI();
  }

  private createSkillButton(x: number, y: number): void {
    const btnWidth = 100;
    const btnHeight = 40;

    this.skillButton = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x9C27B0, 1);
    bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 8);

    const civ = this.getCurrentCiv();
    const skillIcon = this.add.text(-35, 0, civ.skill?.icon || CIV_ICONS[civ.id] || '⚡', { font: '16px Arial' });
    skillIcon.setOrigin(0.5);

    const skillKeyMap: Record<string, string> = {
      rome: 'skill.legionConquest',
      china: 'skill.silkRoadTreasure',
      egypt: 'skill.pharaohProtection',
      greece: 'skill.academicExploration',
    };
    const localizedSkillName = t(skillKeyMap[civ.id] || 'skill.legionConquest');
    const skillName = this.add.text(5, 0, localizedSkillName, { font: '11px Microsoft YaHei', color: '#ffffff' });
    skillName.setOrigin(0.5);

    this.skillButton.add([bg, skillIcon, skillName]);
    this.skillButton.setSize(btnWidth, btnHeight);
    this.skillButton.setInteractive({ useHandCursor: true });
    this.skillButton.setData('bg', bg);

    this.skillButton.on('pointerdown', () => this.useSkill());
  }

  private createPlayerPanels(): void {
    const { width } = this.cameras.main;
    const panelWidth = 110;
    const startY = 245;
    const gap = 58;

    this.players.forEach((player, index) => {
      const y = startY + index * gap;
      const container = this.add.container(width - 80, y);

      const bg = this.add.graphics();
      bg.fillStyle(Phaser.Display.Color.HexStringToColor(player.civilization.color).color, 0.3);
      bg.fillRoundedRect(-panelWidth / 2, -24, panelWidth, 48, 8);
      container.setData('bg', bg);

      const emoji = this.add.text(-40, -5, this.getCivEmoji(player.civilization.id), { font: '18px Arial' });
      const name = this.add.text(-18, -14, player.name, { font: 'bold 11px Microsoft YaHei', color: '#ffffff' });
      const relics = this.add.text(-18, 4, `🏺 0/${VICTORY_CONFIG.RELICS_TO_WIN}`, { font: '11px Microsoft YaHei', color: '#FFD700' });
      relics.setData('relicText', true);

      // 领先标记
      const leaderMark = this.add.text(42, -20, '👑', { font: '12px Arial' });
      leaderMark.setVisible(false);
      leaderMark.setData('leaderMark', true);

      container.add([bg, emoji, name, relics, leaderMark]);
      this.playerPanels.push(container);
    });
  }

  private createLegend(): void {
    const { width, height } = this.cameras.main;
    const y = height - 25;

    // 地形图例
    const terrains = [
      { color: 0x90EE90, name: t('terrain.plains') },
      { color: 0x228B22, name: t('terrain.forest') },
      { color: 0xBDB76B, name: t('terrain.hills') },
      { color: 0xF4A460, name: t('terrain.desert') },
      { color: 0x87CEEB, name: t('terrain.coast') },
    ];

    terrains.forEach((item, i) => {
      const x = 20 + i * 80;
      this.add.rectangle(x, y, 14, 14, item.color).setStrokeStyle(1, 0xffffff);
      this.add.text(x + 12, y, item.name, { font: '10px Microsoft YaHei', color: '#aaaaaa' }).setOrigin(0, 0.5);
    });

    // 遗迹和文明图标图例
    this.add.text(430, y, t('world.legendRelic'), { font: '11px Microsoft YaHei', color: '#FFD700' }).setOrigin(0, 0.5);

    // 文明图标图例
    const civs = [
      { icon: CIV_ICONS['rome'], name: t('civ.rome') },
      { icon: CIV_ICONS['china'], name: t('civ.china') },
      { icon: CIV_ICONS['egypt'], name: t('civ.egypt') },
      { icon: CIV_ICONS['greece'], name: t('civ.greece') },
    ];

    civs.forEach((civ, i) => {
      const x = 520 + i * 70;
      this.add.text(x, y, `${civ.icon}${civ.name}`, { font: '10px Microsoft YaHei', color: '#cccccc' }).setOrigin(0, 0.5);
    });
  }

  private assignInitialTerritories(): void {
    if (this.isMultiplayer) {
      // 多人模式：四角分配
      const positions = [
        { x: 2, y: 2 },
        { x: MAP_COLS - 3, y: MAP_ROWS - 3 },
        { x: 2, y: MAP_ROWS - 3 },
        { x: MAP_COLS - 3, y: 2 },
      ];

      this.players.forEach((player, index) => {
        const pos = positions[index];
        // 若起始格不可通行（山脉/海洋），强制改为平原
        if (!TERRAIN_CONFIG[this.territories[pos.x][pos.y].type].passable) {
          this.territories[pos.x][pos.y].type = 'plains';
          const tile = this.mapTiles[pos.x][pos.y];
          tile.setFillStyle(TERRAIN_CONFIG['plains'].color);
        }
        this.claimTerritory(pos.x, pos.y, index);
      });
    } else {
      // 单人模式：中心
      const centerX = Math.floor(MAP_COLS / 2);
      const centerY = Math.floor(MAP_ROWS / 2);
      if (!TERRAIN_CONFIG[this.territories[centerX][centerY].type].passable) {
        this.territories[centerX][centerY].type = 'plains';
        const tile = this.mapTiles[centerX][centerY];
        tile.setFillStyle(TERRAIN_CONFIG['plains'].color);
      }
      this.claimTerritory(centerX, centerY, -1);
    }
  }

  private updateBlinkingMarkers(): void {
    // 停止所有旧的闪烁，恢复完全不透明
    this.blinkingMarkers.forEach(marker => {
      this.tweens.killTweensOf(marker);
      marker.setAlpha(1);
    });
    this.blinkingMarkers = [];

    // 当前玩家的所有领土图标开始闪烁
    const currentIdx = this.isMultiplayer ? this.currentPlayerIndex : -1;
    this.tileMarkers.forEach((marker, key) => {
      if (this.tileOwners.get(key) === currentIdx) {
        this.blinkingMarkers.push(marker);
        this.tweens.add({
          targets: marker,
          alpha: 0.15,
          duration: 500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    });
  }

  private startTurn(): void {
    this.phase = 'quiz';
    this.skillUsedThisTurn = false;
    this.buyUsedThisTurn = false;

    // 应用上回合惩罚
    const penalty = this.nextTurnPenalty;
    this.nextTurnPenalty = 0;

    // 按地形权重选择科目
    this.currentSubject = this.selectSubjectByTerrain();

    // 每3回合生成流浪商人
    if (this.turn % 3 === 1 && this.turn > 1) {
      this.spawnMerchant();
    }

    // 重置沙暴效果
    this.sandstormActive = false;

    // 更新UI
    this.updateUI();

    // 更新当前玩家图标闪烁
    this.updateBlinkingMarkers();

    // 显示回合开始
    const player = this.isMultiplayer ? this.getCurrentPlayer() : null;
    const playerName = player ? player.name : this.singlePlayerCiv.name;

    this.showMessage(
      `📚 ${playerName}\n\n${tf('world.subject', { subject: t(`subject.${this.currentSubject}`) })}\n${penalty > 0 ? `⚠️ -${penalty}` : ''}\n\n${t('world.yourTurn')}`,
      () => this.showTurnQuiz(penalty)
    );
  }

  private showTurnQuiz(penalty: number): void {
    // 判断是否是领先者（多人模式下题目更难）
    const isLeader = this.isMultiplayer && this.checkIfLeader(this.currentPlayerIndex);
    const difficulty = isLeader ? 2 : 1;  // 领先者题目更难

    this.scene.launch('QuizScene', {
      subject: this.currentSubject,
      difficulty: difficulty,
      showHint: this.shouldShowHint(),  // 孔明锦囊
      onComplete: (success: boolean) => {
        this.scene.stop('QuizScene');
        this.handleQuizResult(success, penalty);
      },
    });
  }

  private shouldShowHint(): boolean {
    if (this.scienceHintReady) {
      this.scienceHintReady = false;
      return true;
    }
    // No longer used - China skill changed to relic gold bonus
    return false;
  }

  private handleQuizResult(success: boolean, penalty: number): void {
    if (success) {
      this.comboCount++;
      let points = ACTION_CONFIG.CORRECT_ANSWER_POINTS;

      // Combo奖励
      if (this.comboCount >= 3) {
        points += 1;
        this.showComboEffect();
      }

      this.actionPoints = Math.max(0, points - penalty);

      // 多人模式下检查是否有可抢夺的遗迹
      let stealTip = '';
      if (this.isMultiplayer) {
        const stealableCount = this.relics.filter(r => r.owner !== null && r.owner !== this.currentPlayerIndex).length;
        if (stealableCount > 0) {
          stealTip = '\n' + tf('world.stealTip', { count: stealableCount });
        }
      }

      // 学科资源奖励
      this.addSubjectResource(this.currentSubject);

      this.showMessage(
        tf('world.correctMsg', {
          points,
          penalty: penalty > 0 ? tf('world.penaltyInfo', { num: penalty }) : '',
          combo: this.comboCount >= 2 ? tf('world.comboInfo', { num: this.comboCount }) : '',
        }) + stealTip,
        () => {
          this.phase = 'action';
          this.updateUI();
        }
      );
    } else {
      this.comboCount = 0;
      this.actionPoints = Math.max(0, ACTION_CONFIG.WRONG_ANSWER_POINTS - penalty);

      // 触发随机负面事件
      this.triggerNegativeEvent();
    }
  }

  private showComboEffect(): void {
    const { width, height } = this.cameras.main;
    const comboText = this.add.text(width / 2, height / 2 - 100, `🔥 连击 ×${this.comboCount}！`, {
      font: 'bold 48px Microsoft YaHei',
      color: '#ff6600',
      stroke: '#000000',
      strokeThickness: 4,
    });
    comboText.setOrigin(0.5);
    comboText.setDepth(100);

    this.tweens.add({
      targets: comboText,
      scale: { from: 0.5, to: 1.5 },
      alpha: { from: 1, to: 0 },
      duration: 1200,
      onComplete: () => comboText.destroy(),
    });

    // 行动点文字变金色
    this.actionPointsText.setColor('#FFD700');
    this.time.delayedCall(1500, () => this.actionPointsText.setColor('#00ff88'));

    // 当前玩家所有领地格短暂发光
    const playerIdx = this.isMultiplayer ? this.currentPlayerIndex : -1;
    this.tileOwners.forEach((ownerIdx, key) => {
      if (ownerIdx !== playerIdx) return;
      const [tx, ty] = key.split('-').map(Number);
      const tile = this.mapTiles[tx]?.[ty];
      if (!tile) return;
      const origFill = tile.fillColor;
      this.tweens.add({
        targets: tile,
        fillColor: { from: 0xFFD700, to: origFill },
        duration: 800,
        ease: 'Sine.easeOut',
      });
    });
  }

  private triggerNegativeEvent(): void {
    const event = NEGATIVE_EVENTS[Math.floor(Math.random() * NEGATIVE_EVENTS.length)];

    // 应用事件效果
    const resources = this.getCurrentResources();
    let effectText = '';

    switch (event.id) {
      case 'bandits': {
        const banditLoss = Math.min(30, Math.floor(resources.gold * 0.4));
        resources.gold = Math.max(0, resources.gold - banditLoss);
        effectText = `💰 -${banditLoss}`;
        break;
      }
      case 'plague': {
        const plagueLoss = 20;
        resources.gold = Math.max(0, resources.gold - plagueLoss);
        effectText = `💰 -${plagueLoss}`;
        break;
      }
      case 'lost':
        this.nextTurnPenalty = 1;
        effectText = t('event.nextTurnAPMinus');
        break;
      case 'sandstorm':
        this.sandstormActive = true;
        effectText = '下回合无法占领沙漠/丘陵格';
        break;
    }

    const eventName = t(`event.${event.id}`);
    const eventEffect = t(`event.${event.id}Effect`);

    this.showMessage(
      `❌ ${t('quiz.wrong')}\n\n${event.icon} ${eventName}\n${eventEffect}\n${effectText}\n\n+${this.actionPoints} ⚡`,
      () => {
        this.phase = 'action';
        this.updateUI();
      }
    );
  }

  private onTileClick(x: number, y: number): void {
    if (this.phase !== 'action') return;

    // 检查是否点击到流浪商人
    if (x === this.merchantX && y === this.merchantY) {
      this.triggerMerchantQuiz();
      return;
    }

    const key = `${x}-${y}`;
    const territory = this.territories[x][y];
    const config = TERRAIN_CONFIG[territory.type];
    const currentIdx = this.isMultiplayer ? this.currentPlayerIndex : -1;

    // 检查是否已被占领
    if (this.tileOwners.has(key)) {
      const ownerIdx = this.tileOwners.get(key)!;
      if (ownerIdx === currentIdx) {
        // 检查自己的遗迹
        const ownRelic = this.relics.find(r => r.x === x && r.y === y && r.owner === currentIdx);
        if (ownRelic) {
          this.showQuickMessage(tf('world.ownedRelicInfo', { name: t(`terrain.${this.territories[x][y].type}`), gold: config.goldBonus }));
        } else {
          this.showQuickMessage(tf('world.ownedTerritory', { name: t(`terrain.${this.territories[x][y].type}`), gold: config.goldBonus }));
        }
      } else if (this.isMultiplayer) {
        // 检查是否有遗迹可以抢夺
        const relic = this.relics.find(r => r.x === x && r.y === y && r.owner === ownerIdx);
        if (relic) {
          if (!this.isAdjacentToOwned(x, y, currentIdx)) {
            this.showQuickMessage(t('world.stealNeedAdjacent'));
            return;
          }
          this.attemptStealRelic(relic, ownerIdx);
        } else {
          this.showQuickMessage(tf('world.otherTerritory', { name: this.players[ownerIdx].name }));
        }
      }
      return;
    }

    // 检查是否相邻
    if (!this.isAdjacentToOwned(x, y, currentIdx)) {
      this.showQuickMessage(t('world.adjacentOnly'));
      return;
    }

    // 沙暴效果：本回合无法占领沙漠/丘陵
    if (this.sandstormActive && (territory.type === 'desert' || territory.type === 'hills')) {
      this.showQuickMessage('🌪️ 沙暴肆虐！本回合无法占领沙漠/丘陵格！');
      return;
    }

    // 检查行动点是否足够
    if (this.actionPoints < config.actionCost) {
      this.showQuickMessage(tf('world.notEnoughAP', { need: config.actionCost, have: this.actionPoints }));
      return;
    }

    // 如果目标格有无主遗迹，先答题，答对才占领领土并获得遗迹
    const relic = this.relics.find(r => r.x === x && r.y === y && r.owner === null);
    if (relic) {
      this.triggerRelicQuiz(relic, x, y, currentIdx, config);
      return; // 领土占领、updateUI、checkVictory 全在回调内处理
    }

    // 普通格子：直接占领
    this.actionPoints -= config.actionCost;
    this.claimTerritory(x, y, currentIdx);
    this.updateBlinkingMarkers();
    this.showClaimEffect(x, y, config);

    this.updateUI();
    this.checkVictory();
  }

  private showClaimEffect(x: number, y: number, config: TerrainConfig): void {
    const posX = MAP_OFFSET_X + x * TILE_SIZE;
    const posY = MAP_OFFSET_Y + y * TILE_SIZE;

    // 显示获得的收益
    const bonusText = this.add.text(posX, posY - 30, `+${config.goldBonus}💰`, {
      font: 'bold 14px Microsoft YaHei',
      color: '#FFD700',
    });
    bonusText.setOrigin(0.5);
    bonusText.setDepth(100);

    this.tweens.add({
      targets: bonusText,
      y: posY - 60,
      alpha: 0,
      duration: 1200,
      onComplete: () => bonusText.destroy(),
    });
  }

  private attemptStealRelic(relic: Relic, ownerIdx: number): void {
    if (this.actionPoints < ACTION_CONFIG.STEAL_RELIC_COST) {
      this.showQuickMessage(tf('world.needPointsSteal', { num: ACTION_CONFIG.STEAL_RELIC_COST }));
      return;
    }

    const attackerCiv = this.getCurrentCiv();
    const ownerCiv = this.players[ownerIdx].civilization;
    const ownerName = this.players[ownerIdx].name;

    // 罗马技能：军团征服 - 跳过PK，直接抢夺
    if (attackerCiv.id === 'rome') {
      this.showMessage(
        tf('world.stealPK', { attacker: this.getCurrentPlayer().name, defender: ownerName }),
        () => {
          this.actionPoints -= ACTION_CONFIG.STEAL_RELIC_COST;

          // 埃及防御仍然生效
          if (ownerCiv.id === 'egypt') {
            const protected50 = Math.random() < 0.5;
            if (protected50) {
              // 埃及防守成功：攻方失去1行动点
              this.actionPoints = Math.max(0, this.actionPoints - 1);
              this.showMessage(
                `🛡️ ${tf('world.pharaohProtected', { name: ownerName })}\n⚡ 对方失去1行动点！`,
                () => this.updateUI()
              );
              return;
            }
          }

          // 直接抢夺成功
          relic.owner = this.currentPlayerIndex;
          this.players[ownerIdx].relics--;
          this.getCurrentPlayer().relics++;
          this.updateRelicSprite(relic);
          this.showQuickMessage(t('world.legionConquestActive'));
          this.showMessage(t('world.relicStolen'), () => {
            this.updateUI();
            this.checkVictory();
          });
        }
      );
      return;
    }

    // 非罗马：3轮轮流PK流程
    this.showMessage(
      tf('world.stealPK', { attacker: this.getCurrentPlayer().name, defender: ownerName }),
      () => {
        this.actionPoints -= ACTION_CONFIG.STEAL_RELIC_COST;
        this.runPKRound(1, relic, ownerIdx);
      }
    );
  }

  // PK轮次：step 1/3=挑战者，step 2/4=守方，守方需失败2次才输
  private runPKRound(step: number, relic: Relic, ownerIdx: number): void {
    if (step === 1) {
      this.pkDefenderFailures = 0; // 每次新PK重置守方失败计数
    }
    if (step > 4) {
      // 3轮全部答对，守方守住遗迹
      this.showMessage(
        tf('world.pkDraw', { name: this.players[ownerIdx].name }),
        () => this.updateUI()
      );
      return;
    }

    const isAttackerTurn = step % 2 === 1; // 第1、3轮挑战者答，第2轮守方答
    const attacker = this.getCurrentPlayer();
    const defender = this.players[ownerIdx];
    const ownerCiv = defender.civilization;
    const answererName = isAttackerTurn ? attacker.name : defender.name;
    const roleKey = isAttackerTurn ? 'world.pkAttackerRole' : 'world.pkDefenderRole';

    this.scene.launch('QuizScene', {
      difficulty: 2,
      isPK: true,
      pkStep: step,
      pkAnswerer: answererName,
      pkRole: t(roleKey),
      onComplete: (success: boolean) => {
        this.scene.stop('QuizScene');

        if (!success) {
          if (isAttackerTurn) {
            // 挑战者答错：赔一半金币给守方，行动点归零
            const halfGold = Math.floor(attacker.resources.gold / 2);
            attacker.resources.gold -= halfGold;
            defender.resources.gold += halfGold;
            this.actionPoints = 0;
            this.showMessage(
              tf('world.pkAttackerLost', { gold: halfGold, name: defender.name }),
              () => this.updateUI()
            );
          } else {
            // 守方答错：记录失败次数，需失败2次才输
            this.pkDefenderFailures++;
            if (this.pkDefenderFailures < 2) {
              // 第一次失败，继续PK
              this.showQuickMessage(`⚠️ ${defender.name} 答错！还有1次机会！`);
              this.runPKRound(step + 1, relic, ownerIdx);
              return;
            }
            // 第二次失败：判断埃及技能，然后转移遗迹
            if (ownerCiv.id === 'egypt') {
              const protected50 = Math.random() < 0.5;
              if (protected50) {
                // 埃及防守成功：攻方失去1行动点
                this.actionPoints = Math.max(0, this.actionPoints - 1);
                this.showMessage(
                  `🛡️ ${tf('world.pharaohProtected', { name: defender.name })}\n⚡ 对方失去1行动点！`,
                  () => this.updateUI()
                );
                return;
              } else {
                this.showQuickMessage(tf('world.pharaohFailed', { name: defender.name }));
              }
            }
            relic.owner = this.currentPlayerIndex;
            this.players[ownerIdx].relics--;
            attacker.relics++;
            this.updateRelicSprite(relic);
            this.showMessage(t('world.relicStolen'), () => {
              this.updateUI();
              this.checkVictory();
            });
          }
          return;
        }

        // 答对，继续下一步
        this.runPKRound(step + 1, relic, ownerIdx);
      },
    });
  }

  private collectRelic(relic: Relic): void {
    const currentIdx = this.isMultiplayer ? this.currentPlayerIndex : -1;
    relic.owner = currentIdx;

    if (this.isMultiplayer) {
      this.getCurrentPlayer().relics++;
    } else {
      this.singlePlayerRelics++;
    }

    // 中华技能：丝路财宝 - 收集遗迹时额外获得金币
    const civ = this.getCurrentCiv();
    const SILK_ROAD_GOLD = 50;
    if (civ.id === 'china') {
      const resources = this.getCurrentResources();
      resources.gold += SILK_ROAD_GOLD;
      this.showQuickMessage(tf('world.silkRoadGold', { num: SILK_ROAD_GOLD }));
    }

    // 更新遗迹精灵 - 变为已收集状态（保留在地图上，可被抢夺）
    this.updateRelicSprite(relic);

    // 收集动画（缩放闪烁后恢复，而非消失）
    const sprite = this.relicSprites.get(`${relic.x}-${relic.y}`);
    if (sprite) {
      this.tweens.killTweensOf(sprite);
      // 先放大再缩回
      this.tweens.add({
        targets: sprite,
        scale: 1.8,
        duration: 300,
        yoyo: true,
        ease: 'Back.easeOut',
        onComplete: () => {
          // 恢复后添加轻微呼吸动画
          this.tweens.add({
            targets: sprite,
            scale: { from: 1, to: 1.1 },
            duration: 1200,
            yoyo: true,
            repeat: -1,
          });
        },
      });
    }

    this.showQuickMessage(t('world.relicCollected'));

    // 注意：不再从 relics 数组中移除，保留以支持抢夺机制

    // 检查是否需要生成新遗迹（保持3个中立可用）
    const availableRelics = this.relics.filter(r => r.owner === null).length;
    if (availableRelics < 3) {
      this.time.delayedCall(1500, () => this.respawnRelic());
    }
  }

  /**
   * 遗迹挑战答题 - 答对才同时获得领土和遗迹，答错则两者均不得
   */
  private triggerRelicQuiz(relic: Relic, x: number, y: number, currentIdx: number, config: TerrainConfig): void {
    const randomQ = RELIC_QUESTIONS[Math.floor(Math.random() * RELIC_QUESTIONS.length)];

    this.scene.launch('QuizScene', {
      isRelicChallenge: true,
      difficulty: 2 as const,
      presetQuestion: randomQ,
      onComplete: (success: boolean) => {
        this.scene.stop('QuizScene');
        if (success) {
          // 答对：扣行动点，占领领土，获得遗迹
          this.actionPoints -= config.actionCost;
          this.claimTerritory(x, y, currentIdx);
          this.updateBlinkingMarkers();
          this.showClaimEffect(x, y, config);
          this.collectRelic(relic);

          // 希腊技能：学术探索 - 收集遗迹直接获得1碎片
          const civ = this.getCurrentCiv();
          if (civ.id === 'greece') {
            const currentFragments = this.getFragments() + 1;
            this.setFragments(currentFragments);
            if (currentFragments >= 3) {
              this.setFragments(0);
              if (this.isMultiplayer) {
                this.getCurrentPlayer().relics++;
              } else {
                this.singlePlayerRelics++;
              }
              this.showQuickMessage('📜 碎片集齐！额外获得遗迹！');
              this.updateUI();
              this.checkVictory();
            } else {
              this.showQuickMessage(`📜 学术碎片 ${currentFragments}/3`);
              this.updateUI();
            }
          }

          this.updateUI();
          this.checkVictory();
        } else {
          // 答错：行动点归零，领土和遗迹均不获得
          this.actionPoints = 0;
          this.showQuickMessage(t('world.relicQuizFailed'));
          this.updateUI();
        }
      },
    });
  }

  /**
   * 希腊学术探索 - 遗迹格触发高难度答题获碎片
   */
  private triggerAcademicQuiz(): void {
    // 当前难度+1（最高3）
    const baseDifficulty = this.isMultiplayer && this.checkIfLeader(this.currentPlayerIndex) ? 2 : 1;
    const difficulty = Math.min(3, baseDifficulty + 1) as 1 | 2 | 3;

    this.scene.launch('QuizScene', {
      subject: this.currentSubject,
      difficulty: difficulty,
      onComplete: (success: boolean) => {
        this.scene.stop('QuizScene');
        if (success) {
          // 获得碎片
          const currentFragments = this.getFragments() + 1;
          this.setFragments(currentFragments);

          if (currentFragments >= 3) {
            // 3碎片合成1遗迹
            this.setFragments(0);
            if (this.isMultiplayer) {
              this.getCurrentPlayer().relics++;
            } else {
              this.singlePlayerRelics++;
            }
            this.showMessage(t('world.fragmentToRelic'), () => {
              this.updateUI();
              this.checkVictory();
            });
          } else {
            this.showQuickMessage(tf('world.fragmentGained', { current: currentFragments }));
            this.updateUI();
          }
        } else {
          this.showQuickMessage(t('quiz.wrong'));
          this.updateUI();
        }
      },
    });
  }

  private getFragments(): number {
    if (this.isMultiplayer) {
      return (this.getCurrentPlayer() as any).fragments || 0;
    }
    return this.fragments;
  }

  private setFragments(value: number): void {
    if (this.isMultiplayer) {
      (this.getCurrentPlayer() as any).fragments = value;
    } else {
      this.fragments = value;
    }
  }

  private updateRelicSprite(relic: Relic): void {
    const key = `${relic.x}-${relic.y}`;
    const sprite = this.relicSprites.get(key);
    if (!sprite) return;

    if (relic.owner !== null) {
      const owner = this.isMultiplayer ? this.players[relic.owner] : null;
      const color = owner ? owner.civilization.color : this.singlePlayerCiv.color;
      const civId = owner ? owner.civilization.id : this.singlePlayerCiv.id;

      // 设置颜色标记
      sprite.setTint(Phaser.Display.Color.HexStringToColor(color).color);

      // 添加所有者图标（如果还没有）
      const ownerKey = `${key}-owner`;
      if (!this.relicSprites.has(ownerKey)) {
        const ownerIcon = this.add.text(
          MAP_OFFSET_X + relic.x * TILE_SIZE + 12,
          MAP_OFFSET_Y + relic.y * TILE_SIZE + 5,
          CIV_ICONS[civId] || '🏰',
          { font: '12px Arial' }
        );
        ownerIcon.setOrigin(0.5);
        ownerIcon.setDepth(11);
        this.relicSprites.set(ownerKey, ownerIcon);
      }
    } else {
      // 中立遗迹 - 清除标记
      sprite.clearTint();
      const ownerKey = `${key}-owner`;
      const ownerIcon = this.relicSprites.get(ownerKey);
      if (ownerIcon) {
        ownerIcon.destroy();
        this.relicSprites.delete(ownerKey);
      }
    }
  }

  private claimTerritory(x: number, y: number, playerIdx: number): void {
    const key = `${x}-${y}`;
    this.tileOwners.set(key, playerIdx);

    const tile = this.mapTiles[x][y];
    const civ = playerIdx >= 0 ? this.players[playerIdx].civilization : this.singlePlayerCiv;
    const civIcon = CIV_ICONS[civ.id] || '🏰';

    // 设置领土边框颜色
    tile.setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(civ.color).color);

    // 添加文明图标作为领土标记
    const marker = this.add.text(tile.x, tile.y, civIcon, {
      font: '20px Arial',
    });
    marker.setOrigin(0.5);
    marker.setDepth(5);

    // 添加出现动画
    marker.setScale(0);
    this.tweens.add({
      targets: marker,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    this.tileMarkers.set(key, marker);
  }

  private isAdjacentToOwned(x: number, y: number, playerIdx: number): boolean {
    const neighbors = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
    return neighbors.some(([nx, ny]) => this.tileOwners.get(`${nx}-${ny}`) === playerIdx);
  }

  private useSkill(): void {
    if (this.skillUsedThisTurn) {
      this.showQuickMessage(t('world.skillUsedTurn'));
      return;
    }

    const civ = this.getCurrentCiv();

    // 所有技能现在都是被动的，点击只显示说明
    switch (civ.id) {
      case 'rome':
        // 军团征服：被动 - 抢夺遗迹时跳过PK
        this.showQuickMessage(t('world.legionConquestActive'));
        break;

      case 'china':
        // 丝路财宝：被动 - 收集遗迹时额外金币
        this.showQuickMessage(t('world.silkRoadPassive'));
        break;

      case 'egypt':
        // 法老庇护：被动 - 50%概率保护遗迹
        this.showQuickMessage(t('world.pharaohPassive'));
        break;

      case 'greece':
        // 学术探索：被动 - 遗迹格碎片系统
        this.showQuickMessage(t('world.academicPassive'));
        break;
    }
  }

  private updateSkillButton(): void {
    const bg = this.skillButton.getData('bg') as Phaser.GameObjects.Graphics;
    bg.clear();
    bg.fillStyle(0x9C27B0, 1);
    bg.fillRoundedRect(-50, -20, 100, 40, 8);
  }

  /**
   * 花费金币购买额外行动点
   * 每次花费 30 金币获得 1 行动点
   */
  private buyActionPoint(): void {
    const COST = 30;
    const resources = this.getCurrentResources();

    if (this.phase !== 'action') {
      this.showQuickMessage(t('world.answerFirstBuy'));
      return;
    }

    // 第一回合不能购买
    if (this.turn <= 1) {
      this.showQuickMessage(t('world.buyNotFirstTurn'));
      return;
    }

    // 每回合只能买一次
    if (this.buyUsedThisTurn) {
      this.showQuickMessage(t('world.buyOncePerTurn'));
      return;
    }

    if (resources.gold < COST) {
      this.showQuickMessage(tf('world.goldInsufficient', { cost: COST }));
      return;
    }

    resources.gold -= COST;
    this.actionPoints += 1;
    this.buyUsedThisTurn = true;
    this.updateUI();

    // 显示效果
    const { width } = this.cameras.main;
    const effectText = this.add.text(width - 80, 155, '+1 ⚡', {
      font: 'bold 20px Microsoft YaHei',
      color: '#00ff88',
      stroke: '#000000',
      strokeThickness: 3,
    });
    effectText.setOrigin(0.5);
    effectText.setDepth(100);
    this.tweens.add({
      targets: effectText,
      y: 120,
      alpha: 0,
      duration: 800,
      onComplete: () => effectText.destroy(),
    });

    const costText = this.add.text(width - 80, 180, `-${COST} 💰`, {
      font: 'bold 16px Microsoft YaHei',
      color: '#ff8888',
    });
    costText.setOrigin(0.5);
    costText.setDepth(100);
    this.tweens.add({
      targets: costText,
      y: 210,
      alpha: 0,
      duration: 800,
      onComplete: () => costText.destroy(),
    });
  }

  private endTurn(): void {
    if (this.phase === 'quiz') {
      this.showQuickMessage(t('world.finishQuizFirst'));
      return;
    }

    // 计算领土收入并显示明细
    const incomeDetails = this.calculateIncome();
    this.showIncomeBreakdown(incomeDetails);

    if (this.isMultiplayer) {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
      if (this.currentPlayerIndex === 0) {
        this.turn++;
      }
    } else {
      this.turn++;
    }

    this.updateUI();

    // 延迟一下再开始下个回合，让玩家看到收入明细
    this.time.delayedCall(1800, () => {
      this.startTurn();
    });
  }

  private calculateIncome(): { base: number; territory: number; total: number; tiles: number } {
    const currentIdx = this.isMultiplayer ? this.currentPlayerIndex : -1;
    const resources = this.getCurrentResources();

    const base = 20;
    let territoryIncome = 0;
    let tileCount = 0;

    this.tileOwners.forEach((ownerIdx, key) => {
      if (ownerIdx === currentIdx) {
        const [x, y] = key.split('-').map(Number);
        const terrain = this.territories[x][y].type;
        territoryIncome += TERRAIN_CONFIG[terrain].goldBonus;
        tileCount++;
      }
    });

    const total = base + territoryIncome;
    resources.gold += total;

    return { base, territory: territoryIncome, total, tiles: tileCount };
  }

  private showIncomeBreakdown(details: { base: number; territory: number; total: number; tiles: number }): void {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;

    // 收入面板背景
    const panelW = 280;
    const panelH = details.tiles > 0 ? 130 : 90;
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x1a1a2e, 0.95);
    panelBg.fillRoundedRect(centerX - panelW / 2, centerY - panelH / 2, panelW, panelH, 12);
    panelBg.lineStyle(2, 0xFFD700, 0.8);
    panelBg.strokeRoundedRect(centerX - panelW / 2, centerY - panelH / 2, panelW, panelH, 12);
    panelBg.setDepth(200);

    // 标题
    const title = this.add.text(centerX, centerY - panelH / 2 + 20, t('world.incomeTitle'), {
      font: 'bold 18px Microsoft YaHei',
      color: '#FFD700',
    });
    title.setOrigin(0.5);
    title.setDepth(201);

    // 基础收入
    const baseLine = this.add.text(centerX - panelW / 2 + 30, centerY - panelH / 2 + 45, tf('world.baseIncome', { num: details.base }), {
      font: '14px Microsoft YaHei',
      color: '#cccccc',
    });
    baseLine.setDepth(201);

    const elements: Phaser.GameObjects.GameObject[] = [panelBg, title, baseLine];

    // 领土收入（只在有领土时显示）
    if (details.tiles > 0) {
      const territoryLine = this.add.text(centerX - panelW / 2 + 30, centerY - panelH / 2 + 68, tf('world.territoryIncome', { tiles: details.tiles, num: details.territory }), {
        font: '14px Microsoft YaHei',
        color: '#88ccff',
      });
      territoryLine.setDepth(201);
      elements.push(territoryLine);
    }

    // 总计
    const totalY = details.tiles > 0 ? centerY - panelH / 2 + 98 : centerY - panelH / 2 + 68;
    const totalLine = this.add.text(centerX, totalY, tf('world.totalIncome', { num: details.total }), {
      font: 'bold 16px Microsoft YaHei',
      color: '#00ff88',
    });
    totalLine.setOrigin(0.5);
    totalLine.setDepth(201);
    elements.push(totalLine);

    // 面板出现动画
    elements.forEach(el => {
      if (el instanceof Phaser.GameObjects.Graphics) {
        (el as Phaser.GameObjects.Graphics).setAlpha(0);
      } else {
        (el as Phaser.GameObjects.Text).setAlpha(0);
      }
    });

    this.tweens.add({
      targets: elements,
      alpha: 1,
      duration: 300,
      ease: 'Power2',
    });

    // 自动消失
    this.time.delayedCall(1600, () => {
      this.tweens.add({
        targets: elements,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          elements.forEach(el => el.destroy());
        },
      });
    });
  }

  private checkVictory(): void {
    const relics = this.isMultiplayer ? this.getCurrentPlayer().relics : this.singlePlayerRelics;

    if (relics >= VICTORY_CONFIG.RELICS_TO_WIN) {
      this.phase = 'ended';
      this.showVictoryScreen('relic');
      return;
    }

    // 领土胜利：控制60%以上可通行格
    const playerIdx = this.isMultiplayer ? this.currentPlayerIndex : -1;
    const ownedCount = this.countPlayerTiles(playerIdx);
    if (this.passableTileCount > 0 && ownedCount >= Math.ceil(this.passableTileCount * 0.6)) {
      this.phase = 'ended';
      this.showVictoryScreen('territory');
    }
  }

  private checkIfLeader(playerIdx: number): boolean {
    if (!this.isMultiplayer) return false;
    const maxRelics = Math.max(...this.players.map(p => p.relics));
    return this.players[playerIdx].relics === maxRelics && maxRelics > 0;
  }

  private showVictoryScreen(type: 'relic' | 'territory' = 'relic'): void {
    const { width, height } = this.cameras.main;
    const winner = this.isMultiplayer ? this.getCurrentPlayer() : null;
    const winnerName = winner ? `${winner.name} (${winner.civilization.name})` : this.singlePlayerCiv.name;
    const victoryTypeText = type === 'territory' ? '🗺️ 领土统治胜利！' : t('world.victoryTitle');

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.9);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(100);

    const title = this.add.text(width / 2, 150, victoryTypeText, {
      font: 'bold 56px Microsoft YaHei',
      color: '#FFD700',
    });
    title.setOrigin(0.5);
    title.setDepth(101);

    const winnerText = this.add.text(width / 2, 230, tf('world.victoryMsg', { name: winnerName, num: VICTORY_CONFIG.RELICS_TO_WIN }), {
      font: 'bold 32px Microsoft YaHei',
      color: winner ? winner.civilization.color : this.singlePlayerCiv.color,
    });
    winnerText.setOrigin(0.5);
    winnerText.setDepth(101);

    const statsText = this.add.text(width / 2, 300, tf('world.victoryStats', { relics: VICTORY_CONFIG.RELICS_TO_WIN, turns: this.turn }), {
      font: '24px Microsoft YaHei',
      color: '#ffffff',
      align: 'center',
    });
    statsText.setOrigin(0.5);
    statsText.setDepth(101);

    // 多人模式显示排名
    if (this.isMultiplayer) {
      const sorted = [...this.players].sort((a, b) => b.relics - a.relics);
      sorted.forEach((p, i) => {
        const y = 380 + i * 40;
        const text = this.add.text(width / 2, y, `${i + 1}. ${p.name} - 🏺 ${p.relics}`, {
          font: '20px Microsoft YaHei',
          color: p.civilization.color,
        });
        text.setOrigin(0.5);
        text.setDepth(101);
      });
    }

    // 返回按钮
    const btnY = this.isMultiplayer ? 380 + this.players.length * 40 + 40 : 400;
    const btn = this.add.container(width / 2, btnY);
    btn.setDepth(101);

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x4CAF50, 1);
    btnBg.fillRoundedRect(-80, -25, 160, 50, 12);

    const btnText = this.add.text(0, 0, t('world.backToMenu'), { font: 'bold 20px Microsoft YaHei', color: '#ffffff' });
    btnText.setOrigin(0.5);

    btn.add([btnBg, btnText]);
    btn.setSize(160, 50);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => this.scene.start('MenuScene'));
  }

  private updateUI(): void {
    const player = this.isMultiplayer ? this.getCurrentPlayer() : null;
    const civ = this.getCurrentCiv();
    const relics = this.isMultiplayer ? player!.relics : this.singlePlayerRelics;

    // 玩家信息
    this.currentPlayerText.setText(`${this.getCivEmoji(civ.id)} ${player ? player.name : civ.name}`);
    this.currentPlayerText.setColor(civ.color);
    this.turnText.setText(`${civ.name} · ${tf('world.turnInfo', { num: this.turn, phase: this.phase === 'quiz' ? t('world.quizPhase') : t('world.actionPhase') })}`);

    // 行动点
    this.actionPointsText.setText(tf('world.actionPoints', { num: this.actionPoints }));

    // 金币
    const gold = this.getCurrentResources().gold;
    this.goldText.setText(`💰 ${gold}`);

    // 科目
    this.subjectText.setText(tf('world.subjectDisplay', { subject: this.currentSubject ? t(`subject.${this.currentSubject}`) : t('world.subjectPending') }));

    // 遗迹
    this.relicText.setText(tf('world.relics', { current: relics, total: VICTORY_CONFIG.RELICS_TO_WIN }));

    // 碎片（希腊专属）
    if (civ.id === 'greece') {
      const frags = this.getFragments();
      this.fragmentText.setText(`📜 碎片 ${frags}/3`);
      this.fragmentText.setVisible(true);
    } else {
      this.fragmentText.setVisible(false);
    }

    // 科技点 & 文化值
    const res = this.getCurrentResources();
    this.scienceText.setText(`🔬 科技 ${res.science || 0}/10`);
    this.cultureText.setText(`🎭 文化 ${res.culture || 0}/8`);

    // 领土占比
    const ownedCount = this.countPlayerTiles(this.isMultiplayer ? this.currentPlayerIndex : -1);
    const pct = this.passableTileCount > 0 ? Math.round(ownedCount / this.passableTileCount * 100) : 0;
    this.territoryText.setText(`🗺️ 领土 ${pct}%`);

    // 文化影响按钮可见性
    if (this.cultureInfluenceButton) {
      const cultureReady = (res.culture || 0) >= 8;
      this.cultureInfluenceButton.setVisible(this.phase === 'action' && cultureReady);
    }

    // Combo
    if (this.comboCount >= 2) {
      this.comboText.setText(tf('world.combo', { num: this.comboCount }));
      this.comboText.setVisible(true);
    } else {
      this.comboText.setVisible(false);
    }

    // 更新技能按钮
    this.updateSkillButton();

    // 更新玩家面板
    if (this.isMultiplayer) {
      this.updatePlayerPanels();
    }
  }

  private updatePlayerPanels(): void {
    const maxRelics = Math.max(...this.players.map(p => p.relics));
    const panelWidth = 110;

    this.playerPanels.forEach((panel, index) => {
      const bg = panel.getData('bg') as Phaser.GameObjects.Graphics;
      const player = this.players[index];

      bg.clear();
      if (index === this.currentPlayerIndex) {
        bg.fillStyle(Phaser.Display.Color.HexStringToColor(player.civilization.color).color, 0.6);
        bg.lineStyle(2, 0xffffff, 1);
        bg.strokeRoundedRect(-panelWidth / 2, -24, panelWidth, 48, 8);
      } else {
        bg.fillStyle(Phaser.Display.Color.HexStringToColor(player.civilization.color).color, 0.3);
      }
      bg.fillRoundedRect(-panelWidth / 2, -24, panelWidth, 48, 8);

      // 更新遗迹数量
      const relicText = panel.list.find(obj =>
        obj instanceof Phaser.GameObjects.Text && obj.getData('relicText')
      ) as Phaser.GameObjects.Text;
      if (relicText) {
        let relicStr = `🏺 ${player.relics}/${VICTORY_CONFIG.RELICS_TO_WIN}`;
        // 希腊显示碎片
        if (player.civilization.id === 'greece') {
          const frags = (player as any).fragments || 0;
          relicStr += ` 🔮${frags}`;
        }
        relicText.setText(relicStr);
      }

      // 领先标记
      const leaderMark = panel.list.find(obj =>
        obj instanceof Phaser.GameObjects.Text && obj.getData('leaderMark')
      ) as Phaser.GameObjects.Text;
      if (leaderMark) {
        leaderMark.setVisible(player.relics === maxRelics && maxRelics > 0);
      }
    });
  }

  private getCurrentPlayer(): LocalPlayer {
    return this.players[this.currentPlayerIndex];
  }

  private getCurrentCiv(): Civilization {
    return this.isMultiplayer ? this.getCurrentPlayer().civilization : this.singlePlayerCiv;
  }

  private getCurrentResources(): Resources {
    return this.isMultiplayer ? this.getCurrentPlayer().resources : this.singlePlayerResources;
  }

  private getCivEmoji(id: string): string {
    return CIV_ICONS[id] || '🏰';
  }

  private createButton(x: number, y: number, text: string, color: number, cb: () => void): void {
    const btn = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-50, -20, 100, 40, 8);
    const label = this.add.text(0, 0, text, { font: '14px Microsoft YaHei', color: '#ffffff' });
    label.setOrigin(0.5);
    btn.add([bg, label]);
    btn.setSize(100, 40);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => { bg.clear(); bg.fillStyle(color, 0.7); bg.fillRoundedRect(-50, -20, 100, 40, 8); });
    btn.on('pointerout', () => { bg.clear(); bg.fillStyle(color, 1); bg.fillRoundedRect(-50, -20, 100, 40, 8); });
    btn.on('pointerdown', cb);
  }

  private showMessage(text: string, onClose?: () => void): void {
    if (this.messageContainer) {
      this.messageContainer.destroy();
    }

    const { width, height } = this.cameras.main;

    this.messageContainer = this.add.container(width / 2, height / 2);
    this.messageContainer.setDepth(200);

    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.95);
    bg.fillRoundedRect(-200, -100, 400, 200, 16);
    bg.lineStyle(2, 0x00d4ff, 1);
    bg.strokeRoundedRect(-200, -100, 400, 200, 16);

    const msgText = this.add.text(0, -20, text, {
      font: '18px Microsoft YaHei',
      color: '#ffffff',
      align: 'center',
    });
    msgText.setOrigin(0.5);

    const btn = this.add.container(0, 60);
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x4CAF50, 1);
    btnBg.fillRoundedRect(-50, -18, 100, 36, 8);
    const btnText = this.add.text(0, 0, t('confirm'), { font: 'bold 16px Microsoft YaHei', color: '#ffffff' });
    btnText.setOrigin(0.5);
    btn.add([btnBg, btnText]);
    btn.setSize(100, 36);
    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      this.messageContainer?.destroy();
      this.messageContainer = null;
      if (onClose) onClose();
    });

    this.messageContainer.add([bg, msgText, btn]);
  }

  private showQuickMessage(text: string): void {
    const { width, height } = this.cameras.main;

    const msgBg = this.add.graphics();
    msgBg.fillStyle(0x000000, 0.8);
    msgBg.fillRoundedRect(width / 2 - 150, height - 100, 300, 50, 12);
    msgBg.setDepth(150);

    const msgText = this.add.text(width / 2, height - 75, text, {
      font: '16px Microsoft YaHei',
      color: '#ffffff',
    });
    msgText.setOrigin(0.5);
    msgText.setDepth(151);

    this.time.delayedCall(1500, () => {
      msgBg.destroy();
      msgText.destroy();
    });
  }

  /** 按当前玩家领土地形权重选择答题科目 */
  private selectSubjectByTerrain(): string {
    const playerIdx = this.isMultiplayer ? this.currentPlayerIndex : -1;
    const terrainCounts: Partial<Record<string, number>> = {};
    this.tileOwners.forEach((ownerIdx, key) => {
      if (ownerIdx !== playerIdx) return;
      const [tx, ty] = key.split('-').map(Number);
      const terrain = this.territories[tx]?.[ty]?.type;
      if (terrain) terrainCounts[terrain] = (terrainCounts[terrain] || 0) + 1;
    });

    const terrainSubjectMap: Record<string, string[]> = {
      desert:    ['geography', 'history'],
      coast:     ['geography', 'physics'],
      forest:    ['biology', 'geography'],
      hills:     ['physics', 'math'],
      plains:    ['history', 'economics'],
      mountains: [],
      water:     [],
    };

    // 统计各科目权重
    const weights: Record<string, number> = {};
    for (const subject of SUBJECTS) weights[subject] = 1;
    for (const [terrain, count] of Object.entries(terrainCounts)) {
      const subjects = terrainSubjectMap[terrain] || [];
      subjects.forEach(s => { weights[s] = (weights[s] || 1) + (count as number); });
    }

    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;
    for (const [subject, w] of Object.entries(weights)) {
      rand -= w;
      if (rand <= 0) return subject;
    }
    return SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)];
  }

  /** 统计指定玩家拥有的可通行格数量 */
  private countPlayerTiles(playerIdx: number): number {
    let count = 0;
    this.tileOwners.forEach((ownerIdx, key) => {
      if (ownerIdx !== playerIdx) return;
      const [tx, ty] = key.split('-').map(Number);
      if (TERRAIN_CONFIG[this.territories[tx]?.[ty]?.type]?.passable) count++;
    });
    return count;
  }

  /** 每3回合生成流浪商人 */
  private spawnMerchant(): void {
    // 移除旧商人
    if (this.merchantSprite) {
      this.merchantSprite.destroy();
      this.merchantSprite = null;
      this.merchantX = -1;
      this.merchantY = -1;
    }

    // 随机找一个可通行且未被占领的格子
    const candidates: { x: number; y: number }[] = [];
    for (let x = 0; x < MAP_COLS; x++) {
      for (let y = 0; y < MAP_ROWS; y++) {
        if (TERRAIN_CONFIG[this.territories[x][y].type].passable && !this.tileOwners.has(`${x}-${y}`)) {
          candidates.push({ x, y });
        }
      }
    }
    if (candidates.length === 0) return;

    const pos = candidates[Math.floor(Math.random() * candidates.length)];
    this.merchantX = pos.x;
    this.merchantY = pos.y;

    const tile = this.mapTiles[pos.x][pos.y];
    this.merchantSprite = this.add.text(tile.x, tile.y - 10, '💰', { font: '22px Arial' });
    this.merchantSprite.setOrigin(0.5);
    this.merchantSprite.setDepth(8);

    // 上下漂浮动画
    this.tweens.add({
      targets: this.merchantSprite,
      y: tile.y - 18,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.showQuickMessage('💰 流浪商人出现了！前往地图上的💰格答题可获得奖励！');
  }

  /** 玩家点击流浪商人格触发答题 */
  private triggerMerchantQuiz(): void {
    this.scene.launch('QuizScene', {
      subject: this.currentSubject,
      difficulty: 1 as const,
      onComplete: (success: boolean) => {
        this.scene.stop('QuizScene');
        if (this.merchantSprite) {
          this.merchantSprite.destroy();
          this.merchantSprite = null;
        }
        this.merchantX = -1;
        this.merchantY = -1;

        if (success) {
          const bonus = 60;
          const apBonus = 2;
          this.getCurrentResources().gold += bonus;
          this.actionPoints += apBonus;
          this.showQuickMessage(`💰 商人奖励！+${bonus}金币 +${apBonus}⚡`);
        } else {
          this.showQuickMessage('💰 商人离开了...');
        }
        this.updateUI();
      },
    });
  }

  /** 答题科目奖励科技/文化资源 */
  private addSubjectResource(subject: string): void {
    const resources = this.getCurrentResources();
    if (subject === 'physics' || subject === 'math') {
      resources.science = (resources.science || 0) + 1;
      if (resources.science >= 10) {
        resources.science = 0;
        this.scienceHintReady = true;
        this.showQuickMessage('🔬 科技突破！下一道题可以看提示！');
      }
    } else if (subject === 'history' || subject === 'geography') {
      resources.culture = (resources.culture || 0) + 1;
    }
  }

  private createCultureInfluenceButton(): void {
    const { width } = this.cameras.main;
    const btnWidth = 120;
    const btnHeight = 36;

    this.cultureInfluenceButton = this.add.container(width / 2 - 70, 50);

    const bg = this.add.graphics();
    bg.fillStyle(0xe91e63, 1);
    bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 8);

    const icon = this.add.text(-45, 0, '🎭', { font: '14px Arial' });
    icon.setOrigin(0.5);

    const label = this.add.text(5, 0, '文化影响', { font: '13px Microsoft YaHei', color: '#ffffff' });
    label.setOrigin(0.5);

    this.cultureInfluenceButton.add([bg, icon, label]);
    this.cultureInfluenceButton.setSize(btnWidth, btnHeight);
    this.cultureInfluenceButton.setInteractive({ useHandCursor: true });
    this.cultureInfluenceButton.setVisible(false);
    this.cultureInfluenceButton.setDepth(10);

    this.cultureInfluenceButton.on('pointerdown', () => this.useCultureInfluence());
  }

  private useCultureInfluence(): void {
    const resources = this.getCurrentResources();
    if ((resources.culture || 0) < 8) return;

    // 找一个相邻的空白可通行格
    const playerIdx = this.isMultiplayer ? this.currentPlayerIndex : -1;
    const candidates: { x: number; y: number }[] = [];

    this.tileOwners.forEach((ownerIdx, key) => {
      if (ownerIdx !== playerIdx) return;
      const [tx, ty] = key.split('-').map(Number);
      // 检查四个方向的未占领可通行格
      const neighbors = [{ x: tx-1, y: ty }, { x: tx+1, y: ty }, { x: tx, y: ty-1 }, { x: tx, y: ty+1 }];
      neighbors.forEach(({ x, y }) => {
        if (x < 0 || y < 0 || x >= MAP_COLS || y >= MAP_ROWS) return;
        const nKey = `${x}-${y}`;
        if (!this.tileOwners.has(nKey) && TERRAIN_CONFIG[this.territories[x][y].type].passable) {
          if (!candidates.find(c => c.x === x && c.y === y)) candidates.push({ x, y });
        }
      });
    });

    if (candidates.length === 0) {
      this.showQuickMessage('🎭 没有可以影响的相邻空白格');
      return;
    }

    // 随机选一个相邻空格进行文化影响
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    resources.culture = (resources.culture || 0) - 8;
    this.claimTerritory(target.x, target.y, playerIdx);
    this.updateBlinkingMarkers();
    this.showQuickMessage(`🎭 文化影响！占领了一块相邻格（消耗8文化值）`);
    this.updateUI();
    this.checkVictory();
  }
}
