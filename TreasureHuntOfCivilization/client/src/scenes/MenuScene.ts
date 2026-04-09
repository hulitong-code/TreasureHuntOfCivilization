import Phaser from 'phaser';
import type { Civilization } from '@shared/types';
import { CIVILIZATIONS, CIV_ICONS } from './LobbyScene';
import { t, tf, getLanguage, setLanguage, initLanguage, type Language } from '../i18n';

/**
 * 主菜单场景 - 支持多语言
 */
export class MenuScene extends Phaser.Scene {
  private selectedCiv: Civilization | null = null;
  private civButtons: Phaser.GameObjects.Container[] = [];
  private startButton: Phaser.GameObjects.Container | null = null;
  private languageButton!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    // 初始化语言
    initLanguage();

    const { width, height } = this.cameras.main;
    this.selectedCiv = null;
    this.civButtons = [];

    // 背景渐变效果
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    bg.fillRect(0, 0, width, height);

    // 语言选择按钮（右上角）
    this.createLanguageButton();

    // 标题
    const title = this.add.text(width / 2, 45, t('menu.title'), {
      font: 'bold 42px Microsoft YaHei',
      color: '#00d4ff',
    });
    title.setOrigin(0.5);
    title.setShadow(2, 2, '#0066ff', 10, true, true);

    // 副标题
    const subtitle = this.add.text(width / 2, 90, t('menu.subtitle'), {
      font: '20px Arial',
      color: '#88ccff',
    });
    subtitle.setOrigin(0.5);

    // 选择文明提示
    const selectText = this.add.text(width / 2, 130, t('menu.selectCiv'), {
      font: '22px Microsoft YaHei',
      color: '#ffffff',
    });
    selectText.setOrigin(0.5);

    // 文明选择卡片
    this.createCivilizationCards();

    // 开始游戏按钮（初始禁用）
    this.createStartButton();

    // 底部说明
    const infoText = this.add.text(width / 2, 570, t('menu.bottomHint'), {
      font: '16px Microsoft YaHei',
      color: '#666666',
    });
    infoText.setOrigin(0.5);
  }

  private createLanguageButton(): void {
    const { width } = this.cameras.main;
    const btnWidth = 100;
    const btnHeight = 36;

    this.languageButton = this.add.container(width - 70, 30);

    const bg = this.add.graphics();
    bg.fillStyle(0x333355, 1);
    bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 8);
    bg.lineStyle(2, 0x5555aa, 1);
    bg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 8);

    const currentLang = getLanguage();
    const langText = this.add.text(0, 0, currentLang === 'zh' ? '🌐 中文' : '🌐 English', {
      font: '14px Microsoft YaHei',
      color: '#ffffff',
    });
    langText.setOrigin(0.5);

    this.languageButton.add([bg, langText]);
    this.languageButton.setSize(btnWidth, btnHeight);
    this.languageButton.setInteractive({ useHandCursor: true });
    this.languageButton.setData('bg', bg);
    this.languageButton.setData('text', langText);

    this.languageButton.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x444466, 1);
      bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 8);
      bg.lineStyle(2, 0x7777cc, 1);
      bg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 8);
    });

    this.languageButton.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x333355, 1);
      bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 8);
      bg.lineStyle(2, 0x5555aa, 1);
      bg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 8);
    });

    this.languageButton.on('pointerdown', () => {
      this.toggleLanguage();
    });
  }

  private toggleLanguage(): void {
    const currentLang = getLanguage();
    const newLang: Language = currentLang === 'zh' ? 'en' : 'zh';
    setLanguage(newLang);

    // 重新加载场景以应用新语言
    this.scene.restart();
  }

  private createCivilizationCards(): void {
    const { width } = this.cameras.main;
    const cardWidth = 190;
    const cardHeight = 230;
    const gap = 30;
    const totalWidth = 4 * cardWidth + 3 * gap;
    const startX = (width - totalWidth) / 2 + cardWidth / 2;
    const startY = 290;

    const lang = getLanguage();

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
      colorBar.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, 6, { tl: 16, tr: 16, bl: 0, br: 0 });

      // 文明图标
      const icon = this.add.text(0, -75, this.getCivEmoji(civ.id), {
        font: '36px Arial',
      });
      icon.setOrigin(0.5);

      // 文明名称（根据语言显示）
      const civName = lang === 'zh' ? civ.name : civ.nameEn;
      const nameText = this.add.text(0, -35, civName, {
        font: 'bold 22px Microsoft YaHei',
        color: '#ffffff',
      });
      nameText.setOrigin(0.5);

      // 副名称
      const subName = lang === 'zh' ? civ.nameEn : civ.name;
      const nameEnText = this.add.text(0, -12, subName, {
        font: '12px Arial',
        color: '#888888',
      });
      nameEnText.setOrigin(0.5);

      // 技能名称（根据语言）
      const skillKey = `skill.${civ.id === 'rome' ? 'legionConquest' : civ.id === 'china' ? 'silkRoadTreasure' : civ.id === 'egypt' ? 'pharaohProtection' : 'academicExploration'}`;
      const skillDescKey = `${skillKey}Desc`;
      const skillName = t(skillKey);
      const skillDesc = t(skillDescKey);

      // 技能名称
      const skillText = this.add.text(0, 20, `${civ.skill?.icon || '⚡'} ${skillName}`, {
        font: 'bold 12px Microsoft YaHei',
        color: '#9C27B0',
        align: 'center',
        wordWrap: { width: cardWidth - 16 },
      });
      skillText.setOrigin(0.5);

      // 技能说明（换行居中）
      const skillDescText = this.add.text(0, 48, skillDesc, {
        font: '10px Microsoft YaHei',
        color: '#aaaaaa',
        wordWrap: { width: cardWidth - 20 },
        align: 'center',
        lineSpacing: 2,
      });
      skillDescText.setOrigin(0.5, 0);

      container.add([cardBg, colorBar, icon, nameText, nameEnText, skillText, skillDescText]);

      // 交互
      container.setSize(cardWidth, cardHeight);
      container.setInteractive({ useHandCursor: true });

      container.on('pointerover', () => {
        this.tweens.add({
          targets: container,
          scaleX: 1.05,
          scaleY: 1.05,
          duration: 200,
        });
      });

      container.on('pointerout', () => {
        if (this.selectedCiv?.id !== civ.id) {
          this.tweens.add({
            targets: container,
            scaleX: 1,
            scaleY: 1,
            duration: 200,
          });
        }
      });

      container.on('pointerdown', () => {
        this.selectCivilization(civ, index);
      });

      this.civButtons.push(container);
    });
  }

  private getCivEmoji(civId: string): string {
    return CIV_ICONS[civId] || '🏰';
  }

  private selectCivilization(civ: Civilization, index: number): void {
    this.selectedCiv = civ;

    // 重置所有卡片
    this.civButtons.forEach((btn, i) => {
      this.tweens.add({
        targets: btn,
        scaleX: i === index ? 1.1 : 1,
        scaleY: i === index ? 1.1 : 1,
        duration: 200,
      });
    });

    // 启用开始按钮
    if (this.startButton) {
      this.startButton.setAlpha(1);
      this.startButton.setData('enabled', true);
    }
  }

  private createStartButton(): void {
    const { width, height } = this.cameras.main;
    const btnWidth = 200;
    const btnHeight = 46;
    const gap = 20;

    // 单人游戏按钮
    const singleContainer = this.add.container(width / 2 - btnWidth / 2 - gap / 2, 490);

    const singleBg = this.add.graphics();
    singleBg.fillStyle(0x00aa88, 1);
    singleBg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);

    const singleText = this.add.text(0, 0, t('menu.singlePlayer'), {
      font: 'bold 20px Microsoft YaHei',
      color: '#ffffff',
    });
    singleText.setOrigin(0.5);

    singleContainer.add([singleBg, singleText]);
    singleContainer.setSize(btnWidth, btnHeight);
    singleContainer.setInteractive({ useHandCursor: true });
    singleContainer.setAlpha(0.5);
    singleContainer.setData('enabled', false);

    singleContainer.on('pointerover', () => {
      if (singleContainer.getData('enabled')) {
        singleBg.clear();
        singleBg.fillStyle(0x00cc99, 1);
        singleBg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
      }
    });

    singleContainer.on('pointerout', () => {
      singleBg.clear();
      singleBg.fillStyle(0x00aa88, 1);
      singleBg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
    });

    singleContainer.on('pointerdown', () => {
      if (singleContainer.getData('enabled') && this.selectedCiv) {
        // 单人模式
        this.scene.start('WorldMapScene', {
          isMultiplayer: false,
          civilization: this.selectedCiv,
        });
      }
    });

    this.startButton = singleContainer;

    // 多人游戏按钮
    const multiContainer = this.add.container(width / 2 + btnWidth / 2 + gap / 2, 490);

    const multiBg = this.add.graphics();
    multiBg.fillStyle(0x2196F3, 1);
    multiBg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);

    const multiText = this.add.text(0, 0, t('menu.multiplayer'), {
      font: 'bold 20px Microsoft YaHei',
      color: '#ffffff',
    });
    multiText.setOrigin(0.5);

    multiContainer.add([multiBg, multiText]);
    multiContainer.setSize(btnWidth, btnHeight);
    multiContainer.setInteractive({ useHandCursor: true });

    multiContainer.on('pointerover', () => {
      multiBg.clear();
      multiBg.fillStyle(0x42A5F5, 1);
      multiBg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
    });

    multiContainer.on('pointerout', () => {
      multiBg.clear();
      multiBg.fillStyle(0x2196F3, 1);
      multiBg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
    });

    multiContainer.on('pointerdown', () => {
      // 进入多人游戏大厅
      this.scene.start('LobbyScene');
    });

    // 多人游戏说明
    const multiHint = this.add.text(width / 2, 535, t('menu.multiplayerHint'), {
      font: '14px Microsoft YaHei',
      color: '#888888',
    });
    multiHint.setOrigin(0.5);
  }
}
