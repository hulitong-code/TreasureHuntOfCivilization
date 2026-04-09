import Phaser from 'phaser';
import type { Civilization, Resources } from '@shared/types';

// 本地多人游戏的玩家数据
export interface LocalPlayer {
  id: number;
  name: string;
  civilization: Civilization;
  resources: Resources;
  relics: number;  // 收集的文明遗迹数量
  diceRoll?: number;  // 投骰子的点数
}

// 可选文明数据
export const CIVILIZATIONS: Civilization[] = [
  {
    id: 'rome',
    name: '罗马',
    nameEn: 'Rome',
    description: '伟大的罗马帝国，以法律和工程闻名于世',
    era: 'classical',
    color: '#DC143C',
    specialUnit: '军团兵',
    specialBuilding: '罗马浴场',
    bonus: '军团征服：抢夺遗迹时直接获取，无需PK答题',
    skill: {
      name: '军团征服',
      description: '抢夺遗迹时跳过PK，直接抢夺',
      icon: '⚔️',
    },
  },
  {
    id: 'china',
    name: '中华',
    nameEn: 'China',
    description: '拥有五千年文明史的东方古国',
    era: 'ancient',
    color: '#FFD700',
    specialUnit: '诸葛连弩',
    specialBuilding: '长城',
    bonus: '丝路财宝：收集遗迹时额外获得50金币',
    skill: {
      name: '丝路财宝',
      description: '收集遗迹时额外获得50金币',
      icon: '📜',
    },
  },
  {
    id: 'egypt',
    name: '埃及',
    nameEn: 'Egypt',
    description: '尼罗河畔的古老文明，金字塔的建造者',
    era: 'ancient',
    color: '#C9A86C',
    specialUnit: '战车射手',
    specialBuilding: '金字塔',
    bonus: '法老庇护：遗迹被抢时有50%概率保护成功',
    skill: {
      name: '法老庇护',
      description: '遗迹被抢时有50%概率保护成功（永久）',
      icon: '🛡️',
    },
  },
  {
    id: 'greece',
    name: '希腊',
    nameEn: 'Greece',
    description: '民主制度的发源地，哲学与艺术的摇篮',
    era: 'classical',
    color: '#4169E1',
    specialUnit: '重装步兵',
    specialBuilding: '卫城',
    bonus: '学术探索：遗迹格高难度答题，答对获得遗迹碎片，3碎片=1遗迹',
    skill: {
      name: '学术探索',
      description: '遗迹格答题难度+1，答对获碎片，3碎片=1遗迹',
      icon: '🏛️',
    },
  },
];

// 文明专属图标
export const CIV_ICONS: Record<string, string> = {
  rome: '🦅',    // 罗马鹰旗
  china: '🐉',   // 中华龙
  egypt: '🔺',   // 埃及金字塔
  greece: '🏛️',  // 希腊万神庙
};

// 胜利条件配置
export const VICTORY_CONFIG = {
  RELICS_TO_WIN: 3,           // 需要收集的遗迹数量（唯一胜利条件）
};

// 资源配置
export const RESOURCE_CONFIG = {
  STARTING_GOLD: 50,          // 初始金币
  BASE_INCOME_PER_TURN: 20,   // 每回合基础金币收入
};

// 行动点配置
export const ACTION_CONFIG = {
  CORRECT_ANSWER_POINTS: 3,   // 答对获得的行动点
  WRONG_ANSWER_POINTS: 1,     // 答错获得的行动点
  MOVE_COST: 1,               // 移动一格消耗的行动点
  CLAIM_COST: 1,              // 占领一格消耗的行动点
  STEAL_RELIC_COST: 2,        // 抢夺遗迹消耗的行动点
};

// 科目轮换 - 使用 i18n key 前缀
export const SUBJECTS = ['physics', 'history', 'geography', 'math', 'chemistry', 'biology', 'economics'] as const;
export type Subject = typeof SUBJECTS[number];

/**
 * 大厅场景 - 多人选角
 */
export class LobbyScene extends Phaser.Scene {
  private players: LocalPlayer[] = [];
  private maxPlayers: number = 4;
  private minPlayers: number = 2;
  private currentSelectingPlayer: number = 0;
  private selectedCivIds: Set<string> = new Set();
  private civCards: Phaser.GameObjects.Container[] = [];
  private playerListContainer!: Phaser.GameObjects.Container;
  private instructionText!: Phaser.GameObjects.Text;
  private startButton!: Phaser.GameObjects.Container;
  private playerNameInput: string = '';

  constructor() {
    super({ key: 'LobbyScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.players = [];
    this.selectedCivIds = new Set();
    this.currentSelectingPlayer = 0;
    this.civCards = [];

    // 背景
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    bg.fillRect(0, 0, width, height);

    // 标题
    const title = this.add.text(width / 2, 50, '🎮 多人游戏 - 选择文明', {
      font: 'bold 36px Microsoft YaHei',
      color: '#00d4ff',
    });
    title.setOrigin(0.5);

    // 游戏规则说明
    const rulesText = this.add.text(width / 2, 95,
      `胜利条件：率先收集 ${VICTORY_CONFIG.RELICS_TO_WIN} 个文明遗迹`, {
      font: '16px Microsoft YaHei',
      color: '#88ccff',
    });
    rulesText.setOrigin(0.5);

    // 当前玩家选择提示
    this.instructionText = this.add.text(width / 2, 140, '玩家 1 请选择你的文明', {
      font: '24px Microsoft YaHei',
      color: '#ffffff',
    });
    this.instructionText.setOrigin(0.5);

    // 文明选择卡片
    this.createCivilizationCards();

    // 已加入玩家列表
    this.createPlayerList();

    // 开始游戏按钮
    this.createStartButton();

    // 返回按钮
    this.createBackButton();
  }

  private createCivilizationCards(): void {
    const startX = 180;
    const startY = 280;
    const cardWidth = 200;
    const cardHeight = 260;
    const gap = 40;

    CIVILIZATIONS.forEach((civ, index) => {
      const x = startX + index * (cardWidth + gap);
      const y = startY;

      const container = this.add.container(x, y);

      // 卡片背景
      const cardBg = this.add.graphics();
      cardBg.fillStyle(0x2a2a4a, 1);
      cardBg.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 16);
      cardBg.lineStyle(3, Phaser.Display.Color.HexStringToColor(civ.color).color, 1);
      cardBg.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 16);

      // 文明颜色标识
      const colorBar = this.add.graphics();
      colorBar.fillStyle(Phaser.Display.Color.HexStringToColor(civ.color).color, 1);
      colorBar.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, 8, { tl: 16, tr: 16, bl: 0, br: 0 });

      // 文明图标
      const icon = this.add.text(0, -70, this.getCivEmoji(civ.id), { font: '48px Arial' });
      icon.setOrigin(0.5);

      // 文明名称
      const nameText = this.add.text(0, -10, civ.name, {
        font: 'bold 26px Microsoft YaHei',
        color: '#ffffff',
      });
      nameText.setOrigin(0.5);

      // 英文名
      const nameEnText = this.add.text(0, 18, civ.nameEn, {
        font: '14px Arial',
        color: '#888888',
      });
      nameEnText.setOrigin(0.5);

      // 技能
      const skillText = this.add.text(0, 55, `${civ.skill?.icon || '⚡'} ${civ.skill?.name || ''}`, {
        font: 'bold 13px Microsoft YaHei',
        color: '#9C27B0',
      });
      skillText.setOrigin(0.5);

      // 技能说明
      const skillDesc = this.add.text(0, 75, civ.skill?.description || '', {
        font: '11px Microsoft YaHei',
        color: '#aaaaaa',
        wordWrap: { width: cardWidth - 20 },
        align: 'center',
      });
      skillDesc.setOrigin(0.5);

      container.add([cardBg, colorBar, icon, nameText, nameEnText, skillText, skillDesc]);
      container.setSize(cardWidth, cardHeight);
      container.setInteractive({ useHandCursor: true });
      container.setData('civId', civ.id);
      container.setData('cardBg', cardBg);

      container.on('pointerover', () => {
        if (!this.selectedCivIds.has(civ.id)) {
          this.tweens.add({
            targets: container,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 150,
          });
        }
      });

      container.on('pointerout', () => {
        if (!this.selectedCivIds.has(civ.id)) {
          this.tweens.add({
            targets: container,
            scaleX: 1,
            scaleY: 1,
            duration: 150,
          });
        }
      });

      container.on('pointerdown', () => {
        this.selectCivilization(civ, container);
      });

      this.civCards.push(container);
    });
  }

  private getCivEmoji(civId: string): string {
    return CIV_ICONS[civId] || '🏰';
  }

  private showNameInput(defaultName: string, callback: (name: string) => void): void {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:9999;';

    const dialog = document.createElement('div');
    dialog.style.cssText = 'background:#1a1a2e;border:2px solid #00d4ff;border-radius:16px;padding:32px 40px;text-align:center;';

    const title = document.createElement('p');
    title.textContent = '输入你的名字';
    title.style.cssText = 'color:#00d4ff;font-size:22px;margin:0 0 20px;font-family:Microsoft YaHei,sans-serif;';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = defaultName;
    input.maxLength = 10;
    input.style.cssText = 'background:#16213e;border:2px solid #00d4ff;border-radius:8px;color:#fff;font-size:20px;padding:10px 20px;text-align:center;font-family:Microsoft YaHei,sans-serif;width:200px;outline:none;box-sizing:border-box;';

    const btn = document.createElement('button');
    btn.textContent = '确认';
    btn.style.cssText = 'display:block;margin:20px auto 0;background:#00d4ff;color:#1a1a2e;border:none;border-radius:8px;padding:10px 40px;font-size:18px;cursor:pointer;font-family:Microsoft YaHei,sans-serif;font-weight:bold;';

    const confirm = () => {
      const name = input.value.trim() || defaultName;
      document.body.removeChild(overlay);
      callback(name);
    };

    btn.onclick = confirm;
    input.onkeydown = (e) => { if (e.key === 'Enter') confirm(); };

    dialog.append(title, input, btn);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    setTimeout(() => { input.select(); input.focus(); }, 50);
  }

  private selectCivilization(civ: Civilization, container: Phaser.GameObjects.Container): void {
    // 检查是否已被选择
    if (this.selectedCivIds.has(civ.id)) {
      return;
    }

    const playerNumber = this.players.length + 1;
    this.showNameInput(`玩家 ${playerNumber}`, (name) => {
      const player: LocalPlayer = {
        id: playerNumber,
        name,
        civilization: civ,
        resources: {
          food: 100,
          production: 50,
          gold: 100,
          science: 0,
          culture: 0,
        },
        relics: 0,
      };

      this.players.push(player);
      this.selectedCivIds.add(civ.id);

      // 更新卡片状态（变暗并显示选择者）
      container.setAlpha(0.5);
      const ownerText = this.add.text(0, 90, `✓ ${player.name}`, {
        font: 'bold 14px Microsoft YaHei',
        color: civ.color,
      });
      ownerText.setOrigin(0.5);
      container.add(ownerText);

      // 更新玩家列表
      this.updatePlayerList();

      // 更新提示文本
      if (this.players.length < this.maxPlayers && this.players.length < CIVILIZATIONS.length) {
        this.instructionText.setText(`玩家 ${this.players.length + 1} 请选择你的文明`);
      } else {
        this.instructionText.setText('所有玩家已就绪！点击开始游戏');
      }

      // 检查是否可以开始
      this.updateStartButton();
    });
  }

  private createPlayerList(): void {
    const { width } = this.cameras.main;
    this.playerListContainer = this.add.container(width / 2, 520);

    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.8);
    bg.fillRoundedRect(-300, -40, 600, 100, 12);

    const title = this.add.text(0, -25, '已加入的玩家', {
      font: '16px Microsoft YaHei',
      color: '#888888',
    });
    title.setOrigin(0.5);

    this.playerListContainer.add([bg, title]);
  }

  private updatePlayerList(): void {
    // 清除旧的玩家显示
    this.playerListContainer.each((child: Phaser.GameObjects.GameObject) => {
      if (child.getData('isPlayerBadge')) {
        child.destroy();
      }
    });

    // 添加新的玩家徽章
    const startX = -220;
    const badgeWidth = 100;
    const gap = 20;

    this.players.forEach((player, index) => {
      const x = startX + index * (badgeWidth + gap);

      const badge = this.add.container(x, 15);
      badge.setData('isPlayerBadge', true);

      const bg = this.add.graphics();
      bg.fillStyle(Phaser.Display.Color.HexStringToColor(player.civilization.color).color, 0.3);
      bg.fillRoundedRect(-badgeWidth / 2, -25, badgeWidth, 50, 8);
      bg.lineStyle(2, Phaser.Display.Color.HexStringToColor(player.civilization.color).color, 1);
      bg.strokeRoundedRect(-badgeWidth / 2, -25, badgeWidth, 50, 8);

      const emoji = this.add.text(0, -8, this.getCivEmoji(player.civilization.id), {
        font: '20px Arial',
      });
      emoji.setOrigin(0.5);

      const name = this.add.text(0, 12, player.name, {
        font: '12px Microsoft YaHei',
        color: '#ffffff',
      });
      name.setOrigin(0.5);

      badge.add([bg, emoji, name]);
      badge.setData('isPlayerBadge', true);
      this.playerListContainer.add(badge);
    });
  }

  private createStartButton(): void {
    const { width, height } = this.cameras.main;
    const btnWidth = 200;
    const btnHeight = 50;

    this.startButton = this.add.container(width / 2, height - 80);

    const bg = this.add.graphics();
    bg.fillStyle(0x4CAF50, 1);
    bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);

    const text = this.add.text(0, 0, '🎲 开始游戏', {
      font: 'bold 20px Microsoft YaHei',
      color: '#ffffff',
    });
    text.setOrigin(0.5);

    this.startButton.add([bg, text]);
    this.startButton.setSize(btnWidth, btnHeight);
    this.startButton.setInteractive({ useHandCursor: true });
    this.startButton.setAlpha(0.5);
    this.startButton.setData('enabled', false);
    this.startButton.setData('bg', bg);

    this.startButton.on('pointerover', () => {
      if (this.startButton.getData('enabled')) {
        const bg = this.startButton.getData('bg') as Phaser.GameObjects.Graphics;
        bg.clear();
        bg.fillStyle(0x66BB6A, 1);
        bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
      }
    });

    this.startButton.on('pointerout', () => {
      const bg = this.startButton.getData('bg') as Phaser.GameObjects.Graphics;
      bg.clear();
      bg.fillStyle(0x4CAF50, 1);
      bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
    });

    this.startButton.on('pointerdown', () => {
      if (this.startButton.getData('enabled')) {
        // 进入投骰子场景
        this.scene.start('DiceScene', { players: this.players });
      }
    });
  }

  private updateStartButton(): void {
    const canStart = this.players.length >= this.minPlayers;
    this.startButton.setAlpha(canStart ? 1 : 0.5);
    this.startButton.setData('enabled', canStart);
  }

  private createBackButton(): void {
    const backBtn = this.add.text(30, 30, '← 返回', {
      font: '18px Microsoft YaHei',
      color: '#888888',
    });
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerover', () => backBtn.setColor('#ffffff'));
    backBtn.on('pointerout', () => backBtn.setColor('#888888'));
    backBtn.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });
  }
}
