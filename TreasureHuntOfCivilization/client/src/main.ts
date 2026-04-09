import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { LobbyScene } from './scenes/LobbyScene';
import { DiceScene } from './scenes/DiceScene';
import { WorldMapScene } from './scenes/WorldMapScene';
import { QuizScene } from './scenes/QuizScene';
import { BattleScene } from './scenes/BattleScene';

// 游戏配置
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scene: [BootScene, MenuScene, LobbyScene, DiceScene, WorldMapScene, QuizScene, BattleScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
};

// 启动游戏
const game = new Phaser.Game(config);

export default game;
