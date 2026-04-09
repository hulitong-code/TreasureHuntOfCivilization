import Phaser from 'phaser';

/**
 * 战斗场景 - 预留
 */
export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // 占位场景
    this.add.text(width / 2, height / 2, '战斗场景 (开发中)', {
      font: '32px Microsoft YaHei',
      color: '#ffffff',
    }).setOrigin(0.5);

    // 返回按钮
    const backBtn = this.add.text(width / 2, height / 2 + 50, '返回地图', {
      font: '20px Microsoft YaHei',
      color: '#00d4ff',
    });
    backBtn.setOrigin(0.5);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.scene.start('WorldMapScene');
    });
  }
}
