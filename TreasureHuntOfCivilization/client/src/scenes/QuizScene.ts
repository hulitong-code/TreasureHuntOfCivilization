import Phaser from 'phaser';
import type { QuizQuestion, Subject } from '@shared/types';
import { QUESTIONS, getLocalizedQuestion, type BilingualQuestion } from '../data/questions';
import { t, tf, getLanguage } from '../i18n';

/**
 * 知识问答场景 - 支持多语言
 */
export class QuizScene extends Phaser.Scene {
  private currentQuestion: QuizQuestion | null = null;
  private onComplete: ((success: boolean) => void) | null = null;
  private optionButtons: Phaser.GameObjects.Container[] = [];
  private answered: boolean = false;
  private answerResult: boolean = false;
  private difficulty: 1 | 2 | 3 = 1;
  private terrainName: string = '';
  private subject: string = '';
  private showHint: boolean = false;
  private isPK: boolean = false;
  private pkStep: number = 0;
  private pkAnswerer: string = '';
  private pkRole: string = '';
  private presetQuestion: BilingualQuestion | null = null;
  private isRelicChallenge: boolean = false;

  constructor() {
    super({ key: 'QuizScene' });
  }

  init(data: {
    onComplete: (success: boolean) => void;
    difficulty?: 1 | 2 | 3;
    terrainName?: string;
    subject?: string;
    showHint?: boolean;
    isPK?: boolean;
    pkStep?: number;
    pkAnswerer?: string;
    pkRole?: string;
    presetQuestion?: BilingualQuestion;
    isRelicChallenge?: boolean;
  }): void {
    this.onComplete = data.onComplete;
    this.answered = false;
    this.answerResult = false;
    this.optionButtons = [];
    this.difficulty = data.difficulty || 1;
    this.terrainName = data.terrainName || '';
    this.subject = data.subject || '';
    this.showHint = data.showHint || false;
    this.isPK = data.isPK || false;
    this.pkStep = data.pkStep || 0;
    this.pkAnswerer = data.pkAnswerer || '';
    this.pkRole = data.pkRole || '';
    this.presetQuestion = data.presetQuestion || null;
    this.isRelicChallenge = data.isRelicChallenge || false;
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // 半透明背景遮罩
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, width, height);

    // 问答面板
    const panelWidth = 700;
    const panelHeight = 500;
    const panelX = (width - panelWidth) / 2;
    const panelY = (height - panelHeight) / 2;

    // 根据难度选择边框颜色
    const difficultyColors = {
      1: 0x4CAF50,  // 绿色 - 简单
      2: 0xFFC107,  // 黄色 - 中等
      3: 0xF44336,  // 红色 - 困难
    };
    const borderColor = difficultyColors[this.difficulty];

    const panel = this.add.graphics();
    panel.fillStyle(0x2a2a4a, 1);
    panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 20);
    panel.lineStyle(3, borderColor, 1);
    panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 20);

    // 标题（显示科目、难度、PK模式）
    const difficultyKey = { 1: 'quiz.difficulty.easy', 2: 'quiz.difficulty.medium', 3: 'quiz.difficulty.hard' }[this.difficulty];
    const difficultyLabel = t(difficultyKey);

    let titleText = '';
    if (this.isRelicChallenge) {
      titleText = t('world.relicChallenge');
    } else if (this.isPK && this.pkStep > 0 && this.pkAnswerer) {
      titleText = tf('world.pkRoundTitle', { step: this.pkStep, name: this.pkAnswerer, role: this.pkRole });
    } else if (this.isPK) {
      titleText = tf('quiz.pkTitle', { difficulty: difficultyLabel });
    } else if (this.subject) {
      titleText = `${tf('quiz.subjectChallenge', { subject: this.subject, difficulty: difficultyLabel })} ${'⭐'.repeat(this.difficulty)}`;
    } else if (this.terrainName) {
      titleText = `${tf('quiz.terrainChallenge', { terrain: this.terrainName, difficulty: difficultyLabel })} ${'⭐'.repeat(this.difficulty)}`;
    } else {
      titleText = t('quiz.title');
    }

    const title = this.add.text(width / 2, panelY + 30, titleText, {
      font: 'bold 24px Microsoft YaHei',
      color: `#${borderColor.toString(16).padStart(6, '0')}`,
    });
    title.setOrigin(0.5);

    // 选题：预设题目优先，否则随机选取
    if (this.presetQuestion) {
      this.currentQuestion = getLocalizedQuestion(this.presetQuestion);
    } else {
      this.currentQuestion = this.getRandomQuestion(this.difficulty);
    }
    this.displayQuestion(panelX, panelY, panelWidth);

    // 显示提示（孔明锦囊技能）
    if (this.showHint && this.currentQuestion) {
      this.displayHint(panelX, panelY, panelWidth);
    }

    // 关闭按钮
    const closeBtn = this.add.text(panelX + panelWidth - 30, panelY + 15, '✕', {
      font: '24px Arial',
      color: '#888888',
    });
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#888888'));
    closeBtn.on('pointerdown', () => {
      if (this.onComplete) {
        this.onComplete(this.answered ? this.answerResult : false);
      }
    });
  }

  private getRandomQuestion(targetDifficulty: 1 | 2 | 3): QuizQuestion {
    // 将科目名称映射到 Subject 类型
    const subjectMap: Record<string, Subject> = {
      // Direct subject IDs
      'physics': 'physics',
      'history': 'history',
      'geography': 'geography',
      'math': 'math',
      'chemistry': 'chemistry',
      'biology': 'biology',
      'economics': 'economics',
      // Chinese display names (legacy)
      '物理': 'physics',
      '历史': 'history',
      '地理': 'geography',
      '数学': 'math',
      '化学': 'chemistry',
      '生物': 'biology',
      '经济': 'economics',
      // English display names (legacy)
      'Physics': 'physics',
      'History': 'history',
      'Geography': 'geography',
      'Math': 'math',
      'Chemistry': 'chemistry',
      'Biology': 'biology',
      'Economics': 'economics',
    };

    const targetSubject = this.subject ? subjectMap[this.subject] : null;

    // 筛选题目
    let candidates = QUESTIONS.filter(q => {
      const matchDifficulty = q.difficulty === targetDifficulty;
      const matchSubject = targetSubject ? q.subject === targetSubject : true;
      return matchDifficulty && matchSubject;
    });

    // 如果没有对应难度+科目的题目，放宽难度
    if (candidates.length === 0 && targetSubject) {
      candidates = QUESTIONS.filter(q => q.subject === targetSubject);
    }

    // 如果还是没有，放宽科目
    if (candidates.length === 0) {
      candidates = QUESTIONS.filter(q => q.difficulty <= targetDifficulty);
    }

    // 如果还是没有，使用所有题目
    if (candidates.length === 0) {
      candidates = QUESTIONS;
    }

    const index = Math.floor(Math.random() * candidates.length);
    // 转换为当前语言的问题格式
    return getLocalizedQuestion(candidates[index]);
  }

  private displayQuestion(panelX: number, panelY: number, panelWidth: number): void {
    if (!this.currentQuestion) return;

    const { width } = this.cameras.main;
    const q = this.currentQuestion;

    // 学科标签
    const subjectColors: Record<Subject, number> = {
      history: 0xE91E63,
      geography: 0x4CAF50,
      physics: 0x2196F3,
      math: 0xFF9800,
      chemistry: 0x9C27B0,
      biology: 0x8BC34A,
      economics: 0x795548,
    };

    const subjectKeys: Record<Subject, string> = {
      history: 'subject.history',
      geography: 'subject.geography',
      physics: 'subject.physics',
      math: 'subject.math',
      chemistry: 'subject.chemistry',
      biology: 'subject.biology',
      economics: 'subject.economics',
    };

    const subjectBg = this.add.graphics();
    subjectBg.fillStyle(subjectColors[q.subject], 1);
    subjectBg.fillRoundedRect(panelX + 30, panelY + 70, 60, 26, 13);

    const subjectText = this.add.text(panelX + 60, panelY + 83, t(subjectKeys[q.subject] || 'subject.history'), {
      font: '14px Microsoft YaHei',
      color: '#ffffff',
    });
    subjectText.setOrigin(0.5);

    // 难度显示
    const difficultyText = this.add.text(panelX + 110, panelY + 83, '⭐'.repeat(q.difficulty), {
      font: '14px Arial',
    });
    difficultyText.setOrigin(0, 0.5);

    // 问题文本
    const questionText = this.add.text(width / 2, panelY + 140, q.question, {
      font: '22px Microsoft YaHei',
      color: '#ffffff',
      wordWrap: { width: panelWidth - 80 },
      align: 'center',
    });
    questionText.setOrigin(0.5);

    // 选项按钮
    const optionStartY = panelY + 220;
    const optionHeight = 50;
    const optionGap = 15;

    q.options.forEach((option, index) => {
      const y = optionStartY + index * (optionHeight + optionGap);
      const btn = this.createOptionButton(panelX + 50, y, panelWidth - 100, optionHeight, option, index);
      this.optionButtons.push(btn);
    });
  }

  private createOptionButton(x: number, y: number, width: number, height: number, text: string, index: number): Phaser.GameObjects.Container {
    const container = this.add.container(x + width / 2, y + height / 2);

    const bg = this.add.graphics();
    bg.fillStyle(0x3a3a5a, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
    bg.lineStyle(2, 0x5a5a7a, 1);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);

    const optionLabel = this.add.text(-width / 2 + 20, 0, ['A', 'B', 'C', 'D'][index], {
      font: 'bold 18px Arial',
      color: '#00d4ff',
    });
    optionLabel.setOrigin(0, 0.5);

    const optionText = this.add.text(-width / 2 + 50, 0, text, {
      font: '16px Microsoft YaHei',
      color: '#ffffff',
      wordWrap: { width: width - 80 },
    });
    optionText.setOrigin(0, 0.5);

    container.add([bg, optionLabel, optionText]);
    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });
    container.setData('index', index);
    container.setData('bg', bg);

    container.on('pointerover', () => {
      if (!this.answered) {
        bg.clear();
        bg.fillStyle(0x4a4a6a, 1);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
        bg.lineStyle(2, 0x00d4ff, 1);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
      }
    });

    container.on('pointerout', () => {
      if (!this.answered) {
        bg.clear();
        bg.fillStyle(0x3a3a5a, 1);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
        bg.lineStyle(2, 0x5a5a7a, 1);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
      }
    });

    container.on('pointerdown', () => {
      if (!this.answered) {
        this.selectAnswer(index, width, height);
      }
    });

    return container;
  }

  private selectAnswer(selectedIndex: number, width: number, height: number): void {
    if (!this.currentQuestion || this.answered) return;

    this.answered = true;
    const correct = selectedIndex === this.currentQuestion.correctIndex;
    this.answerResult = correct;

    // 更新所有按钮的显示
    this.optionButtons.forEach((btn, index) => {
      const bg = btn.getData('bg') as Phaser.GameObjects.Graphics;
      bg.clear();

      if (index === this.currentQuestion!.correctIndex) {
        // 正确答案 - 绿色
        bg.fillStyle(0x4CAF50, 1);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
        bg.lineStyle(3, 0x8BC34A, 1);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
      } else if (index === selectedIndex && !correct) {
        // 选错的答案 - 红色
        bg.fillStyle(0xF44336, 1);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
        bg.lineStyle(3, 0xEF5350, 1);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
      } else {
        // 其他选项 - 灰色
        bg.fillStyle(0x2a2a3a, 1);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
      }

      btn.disableInteractive();
    });

    // 显示解释
    this.showExplanation(correct);
  }

  private showExplanation(correct: boolean): void {
    if (!this.currentQuestion) return;

    const { width, height } = this.cameras.main;
    const panelWidth = 700;
    const panelY = (height - 500) / 2;

    // 播放答题特效
    if (correct) {
      this.playCorrectEffect();
    } else {
      this.playWrongEffect();
    }

    // 结果提示
    const resultText = this.add.text(width / 2, panelY + 450, correct ? t('quiz.correct') : t('quiz.wrong'), {
      font: 'bold 24px Microsoft YaHei',
      color: correct ? '#4CAF50' : '#F44336',
    });
    resultText.setOrigin(0.5);

    // 结果文字动画
    resultText.setScale(0);
    this.tweens.add({
      targets: resultText,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    // 知识点解释
    const explanationBg = this.add.graphics();
    explanationBg.fillStyle(0x1a1a2e, 0.9);
    explanationBg.fillRoundedRect((width - panelWidth + 60) / 2, panelY + 470, panelWidth - 60, 80, 10);

    const explanationTitle = this.add.text(width / 2, panelY + 490, tf('quiz.knowledgePoint', { point: this.currentQuestion.knowledgePoint }), {
      font: 'bold 14px Microsoft YaHei',
      color: '#00d4ff',
    });
    explanationTitle.setOrigin(0.5);

    const explanationText = this.add.text(width / 2, panelY + 520, this.currentQuestion.explanation, {
      font: '14px Microsoft YaHei',
      color: '#cccccc',
      wordWrap: { width: panelWidth - 100 },
      align: 'center',
    });
    explanationText.setOrigin(0.5);

    // 延迟显示退出按钮，让特效播完再出现
    this.time.delayedCall(800, () => {
      const btnWidth = 160;
      const btnHeight = 44;
      const btnX = width / 2;
      const btnY = panelY + 565;

      const exitBtn = this.add.container(btnX, btnY);

      const exitBg = this.add.graphics();
      exitBg.fillStyle(correct ? 0x4CAF50 : 0x546E7A, 1);
      exitBg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 10);

      const exitText = this.add.text(0, 0, '退出', {
        font: 'bold 20px Microsoft YaHei',
        color: '#ffffff',
      });
      exitText.setOrigin(0.5);

      exitBtn.add([exitBg, exitText]);
      exitBtn.setSize(btnWidth, btnHeight);
      exitBtn.setInteractive({ useHandCursor: true });
      exitBtn.setAlpha(0);

      this.tweens.add({ targets: exitBtn, alpha: 1, duration: 300 });

      exitBtn.on('pointerover', () => {
        exitBg.clear();
        exitBg.fillStyle(correct ? 0x66BB6A : 0x78909C, 1);
        exitBg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 10);
      });
      exitBtn.on('pointerout', () => {
        exitBg.clear();
        exitBg.fillStyle(correct ? 0x4CAF50 : 0x546E7A, 1);
        exitBg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 10);
      });
      exitBtn.on('pointerdown', () => {
        if (this.onComplete) this.onComplete(correct);
      });
    });
  }

  /**
   * 答对特效 - 彩色粒子庆祝
   */
  private playCorrectEffect(): void {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;

    // 屏幕闪烁绿色
    const flash = this.add.graphics();
    flash.fillStyle(0x4CAF50, 0.3);
    flash.fillRect(0, 0, width, height);
    flash.setDepth(100);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 500,
      onComplete: () => flash.destroy(),
    });

    // 发射彩色星星粒子
    const emojis = ['⭐', '✨', '🌟', '💫', '🎉'];

    for (let i = 0; i < 20; i++) {
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      const particle = this.add.text(centerX, centerY - 50, emoji, {
        font: `${20 + Math.random() * 20}px Arial`,
      });
      particle.setDepth(101);

      const angle = (Math.PI * 2 * i) / 20;
      const distance = 150 + Math.random() * 100;
      const targetX = centerX + Math.cos(angle) * distance;
      const targetY = centerY - 50 + Math.sin(angle) * distance;

      this.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        alpha: 0,
        scale: 0.3,
        duration: 800 + Math.random() * 400,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }

    // 大的中心庆祝图标
    const celebrateIcon = this.add.text(centerX, centerY - 100, '🎊', {
      font: '80px Arial',
    });
    celebrateIcon.setOrigin(0.5);
    celebrateIcon.setScale(0);
    celebrateIcon.setDepth(102);

    this.tweens.add({
      targets: celebrateIcon,
      scale: 1.2,
      duration: 300,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: 200,
      onComplete: () => {
        this.tweens.add({
          targets: celebrateIcon,
          alpha: 0,
          y: centerY - 150,
          duration: 400,
          onComplete: () => celebrateIcon.destroy(),
        });
      },
    });

    // 显示获得行动点
    const pointsText = this.add.text(centerX, centerY + 50, tf('quiz.gainPoints', { num: 3 }), {
      font: 'bold 28px Microsoft YaHei',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 4,
    });
    pointsText.setOrigin(0.5);
    pointsText.setDepth(102);
    pointsText.setAlpha(0);

    this.tweens.add({
      targets: pointsText,
      alpha: 1,
      y: centerY + 30,
      duration: 400,
      delay: 300,
      onComplete: () => {
        this.tweens.add({
          targets: pointsText,
          alpha: 0,
          y: centerY,
          duration: 600,
          delay: 800,
          onComplete: () => pointsText.destroy(),
        });
      },
    });
  }

  /**
   * 答错特效 - 屏幕震动 + 红色闪烁
   */
  private playWrongEffect(): void {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;

    // 屏幕震动
    this.cameras.main.shake(300, 0.01);

    // 屏幕闪烁红色
    const flash = this.add.graphics();
    flash.fillStyle(0xF44336, 0.4);
    flash.fillRect(0, 0, width, height);
    flash.setDepth(100);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 150,
      yoyo: true,
      repeat: 1,
      onComplete: () => flash.destroy(),
    });

    // 大X标记
    const wrongIcon = this.add.text(centerX, centerY - 100, '❌', {
      font: '80px Arial',
    });
    wrongIcon.setOrigin(0.5);
    wrongIcon.setScale(2);
    wrongIcon.setAlpha(0);
    wrongIcon.setDepth(102);

    this.tweens.add({
      targets: wrongIcon,
      scale: 1,
      alpha: 1,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        this.tweens.add({
          targets: wrongIcon,
          alpha: 0,
          scale: 0.5,
          duration: 400,
          delay: 400,
          onComplete: () => wrongIcon.destroy(),
        });
      },
    });

    // 飘落的碎片效果
    for (let i = 0; i < 8; i++) {
      const shard = this.add.text(
        centerX + (Math.random() - 0.5) * 100,
        centerY - 80,
        '💔',
        { font: '24px Arial' }
      );
      shard.setDepth(101);

      this.tweens.add({
        targets: shard,
        y: centerY + 100 + Math.random() * 50,
        x: shard.x + (Math.random() - 0.5) * 150,
        alpha: 0,
        rotation: Math.random() * 3,
        duration: 800,
        ease: 'Power1',
        onComplete: () => shard.destroy(),
      });
    }

    // 显示获得行动点（较少）
    const pointsText = this.add.text(centerX, centerY + 50, tf('quiz.gainPoints', { num: 1 }), {
      font: 'bold 24px Microsoft YaHei',
      color: '#888888',
      stroke: '#000000',
      strokeThickness: 3,
    });
    pointsText.setOrigin(0.5);
    pointsText.setDepth(102);
    pointsText.setAlpha(0);

    this.tweens.add({
      targets: pointsText,
      alpha: 1,
      y: centerY + 30,
      duration: 400,
      delay: 500,
      onComplete: () => {
        this.tweens.add({
          targets: pointsText,
          alpha: 0,
          y: centerY,
          duration: 600,
          delay: 600,
          onComplete: () => pointsText.destroy(),
        });
      },
    });
  }

  private displayHint(panelX: number, panelY: number, panelWidth: number): void {
    if (!this.currentQuestion) return;

    const { width } = this.cameras.main;
    const correctAnswer = this.currentQuestion.options[this.currentQuestion.correctIndex];

    // 提示框
    const hintBg = this.add.graphics();
    hintBg.fillStyle(0xFFD700, 0.2);
    hintBg.fillRoundedRect(panelX + 30, panelY + 180, panelWidth - 60, 30, 8);
    hintBg.lineStyle(2, 0xFFD700, 0.8);
    hintBg.strokeRoundedRect(panelX + 30, panelY + 180, panelWidth - 60, 30, 8);

    // 生成提示（显示正确答案的前几个字）
    const hintChars = correctAnswer.substring(0, Math.min(3, Math.ceil(correctAnswer.length / 3)));
    const hintText = this.add.text(width / 2, panelY + 195, tf('quiz.hintPrefix', { hint: hintChars }), {
      font: '14px Microsoft YaHei',
      color: '#FFD700',
    });
    hintText.setOrigin(0.5);
  }
}
