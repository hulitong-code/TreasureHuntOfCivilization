import Phaser from 'phaser';
import type { LocalPlayer } from './LobbyScene';
import { CIV_ICONS } from './LobbyScene';

// 骰子各面点位坐标（相对骰子中心）
const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-22, -22], [22, 22]],
  3: [[-22, -22], [0, 0], [22, 22]],
  4: [[-22, -22], [22, -22], [-22, 22], [22, 22]],
  5: [[-22, -22], [22, -22], [0, 0], [-22, 22], [22, 22]],
  6: [[-22, -22], [22, -22], [-22, 0], [22, 0], [-22, 22], [22, 22]],
};

/**
 * 投骰子场景 - 决定玩家行动顺序
 */
export class DiceScene extends Phaser.Scene {
  private players: LocalPlayer[] = [];
  private currentRollingIndex: number = 0;
  private diceContainer!: Phaser.GameObjects.Container;
  private diceDots!: Phaser.GameObjects.Graphics;
  private instructionText!: Phaser.GameObjects.Text;
  private rollButton!: Phaser.GameObjects.Container;
  private playerResults: Phaser.GameObjects.Container[] = [];
  private isRolling: boolean = false;

  constructor() {
    super({ key: 'DiceScene' });
  }

  init(data: { players: LocalPlayer[] }): void {
    this.players = data.players.map(p => ({ ...p, diceRoll: undefined }));
    this.currentRollingIndex = 0;
    this.playerResults = [];
    this.isRolling = false;
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // 背景
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    bg.fillRect(0, 0, width, height);

    // 标题
    const title = this.add.text(width / 2, 60, '🎲 投骰子决定顺序', {
      font: 'bold 36px Microsoft YaHei',
      color: '#00d4ff',
    });
    title.setOrigin(0.5);

    // 说明
    const subtitle = this.add.text(width / 2, 110, '点数最高的玩家先行动', {
      font: '18px Microsoft YaHei',
      color: '#888888',
    });
    subtitle.setOrigin(0.5);

    // 当前玩家提示
    this.instructionText = this.add.text(width / 2, 180, '', {
      font: '24px Microsoft YaHei',
      color: '#ffffff',
    });
    this.instructionText.setOrigin(0.5);
    this.updateInstruction();

    // 骰子容器
    this.diceContainer = this.add.container(width / 2, height / 2 - 30);

    const diceBg = this.add.graphics();
    diceBg.fillStyle(0xffffff, 1);
    diceBg.fillRoundedRect(-60, -60, 120, 120, 16);
    diceBg.lineStyle(4, 0x444444, 1);
    diceBg.strokeRoundedRect(-60, -60, 120, 120, 16);

    // 骰子阴影效果
    const diceShadow = this.add.graphics();
    diceShadow.fillStyle(0x000000, 0.15);
    diceShadow.fillRoundedRect(-57, -57, 120, 120, 16);

    this.diceDots = this.add.graphics();

    this.diceContainer.add([diceShadow, diceBg, this.diceDots]);

    // 初始显示等待状态（3个灰点）
    this.drawDiceFace(null);

    // 投骰子按钮
    this.createRollButton();

    // 玩家结果显示区域
    this.createPlayerResultsArea();
  }

  /** 绘制骰子点面，null 表示等待状态 */
  private drawDiceFace(value: number | null): void {
    this.diceDots.clear();

    if (value === null) {
      // 等待状态：3个淡灰色小圆点
      this.diceDots.fillStyle(0xdddddd, 1);
      this.diceDots.fillCircle(-20, 0, 7);
      this.diceDots.fillCircle(0, 0, 7);
      this.diceDots.fillCircle(20, 0, 7);
      return;
    }

    const positions = DOT_POSITIONS[value] ?? [];
    this.diceDots.fillStyle(0x222222, 1);
    for (const [dx, dy] of positions) {
      this.diceDots.fillCircle(dx, dy, 10);
    }
  }

  private updateInstruction(): void {
    const player = this.players[this.currentRollingIndex];
    this.instructionText.setText(`${player.name} (${player.civilization.name}) 请投骰子`);
    this.instructionText.setColor(player.civilization.color);
  }

  private createRollButton(): void {
    const { width, height } = this.cameras.main;
    const btnWidth = 180;
    const btnHeight = 50;

    this.rollButton = this.add.container(width / 2, height / 2 + 110);

    const bg = this.add.graphics();
    bg.fillStyle(0xFF5722, 1);
    bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);

    const text = this.add.text(0, 0, '🎲 投骰子', {
      font: 'bold 22px Microsoft YaHei',
      color: '#ffffff',
    });
    text.setOrigin(0.5);

    this.rollButton.add([bg, text]);
    this.rollButton.setSize(btnWidth, btnHeight);
    this.rollButton.setInteractive({ useHandCursor: true });
    this.rollButton.setData('bg', bg);

    this.rollButton.on('pointerover', () => {
      if (!this.isRolling) {
        const bg = this.rollButton.getData('bg') as Phaser.GameObjects.Graphics;
        bg.clear();
        bg.fillStyle(0xFF7043, 1);
        bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
      }
    });

    this.rollButton.on('pointerout', () => {
      const bg = this.rollButton.getData('bg') as Phaser.GameObjects.Graphics;
      bg.clear();
      bg.fillStyle(0xFF5722, 1);
      bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
    });

    this.rollButton.on('pointerdown', () => {
      if (!this.isRolling) {
        this.rollDice();
      }
    });
  }

  private createPlayerResultsArea(): void {
    const { width, height } = this.cameras.main;
    const itemWidth = 150;
    const gap = 30;

    const totalWidth = this.players.length * itemWidth + (this.players.length - 1) * gap;
    const offsetX = (width - totalWidth) / 2 + itemWidth / 2;
    const y = height - 110;

    this.players.forEach((player, index) => {
      const x = offsetX + index * (itemWidth + gap);
      const container = this.add.container(x, y);

      const bg = this.add.graphics();
      bg.fillStyle(Phaser.Display.Color.HexStringToColor(player.civilization.color).color, 0.2);
      bg.fillRoundedRect(-itemWidth / 2, -50, itemWidth, 100, 12);
      bg.lineStyle(2, Phaser.Display.Color.HexStringToColor(player.civilization.color).color, 1);
      bg.strokeRoundedRect(-itemWidth / 2, -50, itemWidth, 100, 12);

      const emoji = this.add.text(0, -25, this.getCivEmoji(player.civilization.id), {
        font: '28px Arial',
      });
      emoji.setOrigin(0.5);

      const name = this.add.text(0, 5, player.name, {
        font: '14px Microsoft YaHei',
        color: '#ffffff',
      });
      name.setOrigin(0.5);

      // 小骰子图形（替代文字显示结果）
      const miniDots = this.add.graphics();
      miniDots.setData('miniDots', true);
      // 初始状态：淡灰等待点
      miniDots.fillStyle(0x555555, 1);
      miniDots.fillCircle(-8, 30, 4);
      miniDots.fillCircle(0, 30, 4);
      miniDots.fillCircle(8, 30, 4);

      container.add([bg, emoji, name, miniDots]);
      this.playerResults.push(container);
    });
  }

  private getCivEmoji(civId: string): string {
    return CIV_ICONS[civId] || '🏰';
  }

  private rollDice(): void {
    this.isRolling = true;
    this.rollButton.setAlpha(0.5);

    let rollCount = 0;
    const maxRolls = 18;
    let lastValue = 1;

    const rollInterval = this.time.addEvent({
      delay: 70,
      callback: () => {
        lastValue = Phaser.Math.Between(1, 6);
        this.drawDiceFace(lastValue);

        // 骰子跳动动画
        this.diceContainer.setScale(1.08);
        this.tweens.add({
          targets: this.diceContainer,
          scale: 1,
          duration: 55,
          ease: 'Sine.easeOut',
        });

        rollCount++;
        if (rollCount >= maxRolls) {
          rollInterval.remove();
          this.finishRoll(lastValue);
        }
      },
      loop: true,
    });
  }

  private finishRoll(value: number): void {
    const player = this.players[this.currentRollingIndex];
    player.diceRoll = value;

    // 骰子放大强调最终结果
    this.tweens.add({
      targets: this.diceContainer,
      scale: 1.15,
      duration: 200,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: 600,
    });

    // 更新底部玩家卡片中的小骰子
    const resultContainer = this.playerResults[this.currentRollingIndex];
    const miniDots = resultContainer.list.find(
      obj => obj instanceof Phaser.GameObjects.Graphics && obj.getData('miniDots')
    ) as Phaser.GameObjects.Graphics;

    if (miniDots) {
      miniDots.clear();
      const positions = DOT_POSITIONS[value] ?? [];
      const civColor = Phaser.Display.Color.HexStringToColor(player.civilization.color).color;
      miniDots.fillStyle(civColor, 1);
      // 缩放绘制：点坐标×0.55，圆半径5，基准Y=28
      for (const [dx, dy] of positions) {
        miniDots.fillCircle(Math.round(dx * 0.55), 28 + Math.round(dy * 0.55), 5);
      }
    }

    this.currentRollingIndex++;

    if (this.currentRollingIndex < this.players.length) {
      // 结果显示 1.2 秒后，再切换到下一位玩家（修复"立即显示问号"bug）
      this.time.delayedCall(1200, () => {
        this.drawDiceFace(null);
        this.isRolling = false;
        this.rollButton.setAlpha(1);
        this.updateInstruction();
      });
    } else {
      // 全部投完
      this.time.delayedCall(1000, () => {
        this.calculateOrderAndStart();
      });
    }
  }

  private calculateOrderAndStart(): void {
    const sortedPlayers = [...this.players].sort((a, b) => (b.diceRoll || 0) - (a.diceRoll || 0));

    const { width, height } = this.cameras.main;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.82);
    overlay.fillRect(0, 0, width, height);

    const resultTitle = this.add.text(width / 2, 130, '🏆 行动顺序已确定！', {
      font: 'bold 36px Microsoft YaHei',
      color: '#FFD700',
    });
    resultTitle.setOrigin(0.5);

    sortedPlayers.forEach((player, index) => {
      const y = 220 + index * 72;

      // 排名小骰子图形
      const miniDice = this.add.graphics();
      const diceX = width / 2 - 130;
      miniDice.fillStyle(0xffffff, 1);
      miniDice.fillRoundedRect(diceX - 22, y - 22, 44, 44, 8);
      miniDice.lineStyle(2, 0x888888, 1);
      miniDice.strokeRoundedRect(diceX - 22, y - 22, 44, 44, 8);

      const dotsDraw = this.add.graphics();
      const positions = DOT_POSITIONS[player.diceRoll ?? 1] ?? [];
      dotsDraw.fillStyle(0x222222, 1);
      for (const [dx, dy] of positions) {
        dotsDraw.fillCircle(diceX + Math.round(dx * 0.55), y + Math.round(dy * 0.55), 4);
      }

      const civColor = Phaser.Display.Color.HexStringToColor(player.civilization.color).color;
      const rankBadge = this.add.text(width / 2 - 160, y, `${index + 1}.`, {
        font: 'bold 26px Arial',
        color: index === 0 ? '#FFD700' : '#aaaaaa',
      });
      rankBadge.setOrigin(0.5);

      const playerText = this.add.text(width / 2 - 60, y,
        `${player.name}  (${player.civilization.name})`, {
        font: '22px Microsoft YaHei',
        color: player.civilization.color,
      });
      playerText.setOrigin(0, 0.5);
    });

    const startY = 220 + sortedPlayers.length * 72 + 50;

    const startBtn = this.add.container(width / 2, startY);

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x4CAF50, 1);
    btnBg.fillRoundedRect(-100, -26, 200, 52, 12);

    const btnText = this.add.text(0, 0, '开始游戏！', {
      font: 'bold 22px Microsoft YaHei',
      color: '#ffffff',
    });
    btnText.setOrigin(0.5);

    startBtn.add([btnBg, btnText]);
    startBtn.setSize(200, 52);
    startBtn.setInteractive({ useHandCursor: true });

    startBtn.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0x66BB6A, 1);
      btnBg.fillRoundedRect(-100, -26, 200, 52, 12);
    });
    startBtn.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0x4CAF50, 1);
      btnBg.fillRoundedRect(-100, -26, 200, 52, 12);
    });
    startBtn.on('pointerdown', () => {
      this.scene.start('WorldMapScene', {
        isMultiplayer: true,
        players: sortedPlayers,
      });
    });
  }
}
