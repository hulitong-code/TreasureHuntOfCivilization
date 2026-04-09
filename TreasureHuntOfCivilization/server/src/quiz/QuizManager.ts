import type { QuizQuestion, Subject } from '../../shared/types.js';

// 完整题库
const QUESTIONS: QuizQuestion[] = [
  // ========== 历史题目 ==========
  {
    id: 'h1',
    subject: 'history',
    difficulty: 1,
    question: '古埃及的金字塔主要是用来做什么的？',
    options: ['作为法老的陵墓', '作为粮仓', '作为天文台', '作为神庙'],
    correctIndex: 0,
    explanation: '金字塔是古埃及法老的陵墓，其中最著名的是吉萨金字塔群。胡夫金字塔是最大的一座。',
    relatedCivilization: 'egypt',
    knowledgePoint: '古埃及文明',
  },
  {
    id: 'h2',
    subject: 'history',
    difficulty: 1,
    question: '中国的长城最初主要是为了防御哪个方向的入侵？',
    options: ['北方游牧民族', '南方越族', '东方海盗', '西方波斯'],
    correctIndex: 0,
    explanation: '长城主要是为了防御北方游牧民族（如匈奴、突厥、蒙古）的入侵，绵延万里。',
    relatedCivilization: 'china',
    knowledgePoint: '中国古代史',
  },
  {
    id: 'h3',
    subject: 'history',
    difficulty: 2,
    question: '古希腊的"民主制度"最早出现在哪个城邦？',
    options: ['雅典', '斯巴达', '底比斯', '科林斯'],
    correctIndex: 0,
    explanation: '雅典是古希腊民主制度的发源地，克里斯提尼改革确立了民主制的基础。',
    relatedCivilization: 'greece',
    knowledgePoint: '古希腊政治制度',
  },
  {
    id: 'h4',
    subject: 'history',
    difficulty: 2,
    question: '罗马帝国的官方语言是什么？',
    options: ['拉丁语', '希腊语', '希伯来语', '波斯语'],
    correctIndex: 0,
    explanation: '拉丁语是罗马帝国的官方语言，后来演变成今天的法语、西班牙语、意大利语等。',
    relatedCivilization: 'rome',
    knowledgePoint: '罗马帝国',
  },
  {
    id: 'h5',
    subject: 'history',
    difficulty: 1,
    question: '造纸术是哪个国家发明的？',
    options: ['中国', '埃及', '印度', '巴比伦'],
    correctIndex: 0,
    explanation: '造纸术是中国古代四大发明之一，东汉蔡伦改进了造纸技术。',
    relatedCivilization: 'china',
    knowledgePoint: '中国古代科技',
  },
  {
    id: 'h6',
    subject: 'history',
    difficulty: 2,
    question: '文艺复兴运动起源于哪个国家？',
    options: ['意大利', '法国', '英国', '德国'],
    correctIndex: 0,
    explanation: '文艺复兴运动14世纪起源于意大利的佛罗伦萨，后传播到欧洲各地。',
    knowledgePoint: '欧洲文艺复兴',
  },
  {
    id: 'h7',
    subject: 'history',
    difficulty: 3,
    question: '亚历山大大帝是哪个国家的国王？',
    options: ['马其顿', '波斯', '埃及', '巴比伦'],
    correctIndex: 0,
    explanation: '亚历山大大帝是古马其顿国王，他建立了横跨欧亚非的庞大帝国。',
    relatedCivilization: 'greece',
    knowledgePoint: '古代帝国',
  },

  // ========== 地理题目 ==========
  {
    id: 'g1',
    subject: 'geography',
    difficulty: 1,
    question: '尼罗河流经哪个古代文明的发源地？',
    options: ['古埃及', '古巴比伦', '古印度', '古中国'],
    correctIndex: 0,
    explanation: '尼罗河是世界上最长的河流之一，古埃及文明就诞生在尼罗河流域的肥沃土地上。',
    knowledgePoint: '世界河流',
  },
  {
    id: 'g2',
    subject: 'geography',
    difficulty: 1,
    question: '地中海位于哪几个大洲之间？',
    options: ['欧洲、非洲、亚洲', '欧洲、美洲、亚洲', '非洲、美洲、大洋洲', '亚洲、大洋洲、美洲'],
    correctIndex: 0,
    explanation: '地中海被欧洲、非洲和亚洲三大洲环绕，是古代文明交流的重要通道。',
    knowledgePoint: '世界海洋',
  },
  {
    id: 'g3',
    subject: 'geography',
    difficulty: 2,
    question: '以下哪条河流是中华文明的发源地之一？',
    options: ['黄河', '亚马逊河', '密西西比河', '莱茵河'],
    correctIndex: 0,
    explanation: '黄河被称为中华民族的母亲河，黄河流域是中华文明的重要发源地。',
    knowledgePoint: '中国地理',
  },
  {
    id: 'g4',
    subject: 'geography',
    difficulty: 2,
    question: '世界上面积最大的沙漠是？',
    options: ['撒哈拉沙漠', '戈壁沙漠', '阿拉伯沙漠', '塔克拉玛干沙漠'],
    correctIndex: 0,
    explanation: '撒哈拉沙漠位于非洲北部，面积约900万平方公里，是世界上最大的热沙漠。',
    knowledgePoint: '世界地形',
  },
  {
    id: 'g5',
    subject: 'geography',
    difficulty: 1,
    question: '世界上最高的山峰是？',
    options: ['珠穆朗玛峰', '乔戈里峰', '干城章嘉峰', '洛子峰'],
    correctIndex: 0,
    explanation: '珠穆朗玛峰位于中国和尼泊尔边境，海拔8848.86米，是世界最高峰。',
    knowledgePoint: '世界地形',
  },
  {
    id: 'g6',
    subject: 'geography',
    difficulty: 2,
    question: '赤道穿过的大洲有几个？',
    options: ['3个', '2个', '4个', '5个'],
    correctIndex: 0,
    explanation: '赤道穿过非洲、亚洲和南美洲三个大洲。',
    knowledgePoint: '地球与经纬度',
  },
  {
    id: 'g7',
    subject: 'geography',
    difficulty: 3,
    question: '两河流域指的是哪两条河？',
    options: ['幼发拉底河和底格里斯河', '尼罗河和刚果河', '黄河和长江', '恒河和印度河'],
    correctIndex: 0,
    explanation: '两河流域指幼发拉底河和底格里斯河之间的地区，是古巴比伦文明的发源地。',
    knowledgePoint: '世界河流',
  },

  // ========== 物理题目 ==========
  {
    id: 'p1',
    subject: 'physics',
    difficulty: 1,
    question: '古代投石机利用了什么物理原理？',
    options: ['杠杆原理', '浮力原理', '电磁感应', '光的折射'],
    correctIndex: 0,
    explanation: '投石机利用杠杆原理，通过力臂的作用将石块抛出，是古代重要的攻城武器。',
    knowledgePoint: '简单机械',
  },
  {
    id: 'p2',
    subject: 'physics',
    difficulty: 1,
    question: '弓箭发射时，弓弦储存的是什么能量？',
    options: ['弹性势能', '动能', '电能', '热能'],
    correctIndex: 0,
    explanation: '拉弓时，弓弦发生形变储存弹性势能，释放时转化为箭的动能。',
    knowledgePoint: '能量转换',
  },
  {
    id: 'p3',
    subject: 'physics',
    difficulty: 2,
    question: '金字塔能够稳固矗立数千年，主要是因为它的结构具有？',
    options: ['低重心和宽底座', '特殊的建筑材料', '地基深入地下', '内部有支撑结构'],
    correctIndex: 0,
    explanation: '金字塔的三角形结构使其重心低、底座宽，这样的结构最稳定，不容易倾倒。',
    knowledgePoint: '力学稳定性',
  },
  {
    id: 'p4',
    subject: 'physics',
    difficulty: 2,
    question: '古罗马的引水渠能让水自动流动，利用的是什么原理？',
    options: ['重力和高度差', '水泵抽水', '虹吸现象', '毛细现象'],
    correctIndex: 0,
    explanation: '罗马引水渠利用重力，通过精确计算高度差让水自然流动，展现了古人的工程智慧。',
    knowledgePoint: '流体力学基础',
  },
  {
    id: 'p5',
    subject: 'physics',
    difficulty: 1,
    question: '帆船能够前进，是利用了什么力？',
    options: ['风力', '水的浮力', '地球引力', '摩擦力'],
    correctIndex: 0,
    explanation: '帆船利用风力推动前进，通过调整帆的角度可以利用不同方向的风。',
    knowledgePoint: '力的作用',
  },
  {
    id: 'p6',
    subject: 'physics',
    difficulty: 2,
    question: '声音在空气中传播的速度大约是？',
    options: ['340米/秒', '3000米/秒', '光速', '1米/秒'],
    correctIndex: 0,
    explanation: '声音在空气中的传播速度约为340米/秒，比光速慢得多。',
    knowledgePoint: '声学基础',
  },
  {
    id: 'p7',
    subject: 'physics',
    difficulty: 3,
    question: '阿基米德原理描述的是什么现象？',
    options: ['浮力等于排开液体的重量', '杠杆平衡', '能量守恒', '运动定律'],
    correctIndex: 0,
    explanation: '阿基米德原理：浸在液体中的物体受到向上的浮力，大小等于它排开液体的重量。',
    knowledgePoint: '浮力原理',
  },

  // ========== 数学题目 ==========
  {
    id: 'm1',
    subject: 'math',
    difficulty: 1,
    question: '古埃及人使用的数学进制是？',
    options: ['十进制', '二进制', '六十进制', '八进制'],
    correctIndex: 0,
    explanation: '古埃及人使用十进制，他们发明了象形数字来表示数量。',
    knowledgePoint: '数制',
  },
  {
    id: 'm2',
    subject: 'math',
    difficulty: 2,
    question: '勾股定理最早由哪个文明发现并使用？',
    options: ['中国', '希腊', '埃及', '巴比伦'],
    correctIndex: 0,
    explanation: '中国古代的《周髀算经》最早记载了勾股定理，比毕达哥拉斯更早。',
    knowledgePoint: '几何定理',
  },
  {
    id: 'm3',
    subject: 'math',
    difficulty: 1,
    question: '圆周率π的近似值是？',
    options: ['3.14', '2.71', '1.41', '1.73'],
    correctIndex: 0,
    explanation: 'π≈3.14159...，中国数学家祖冲之将其精确到小数点后7位。',
    knowledgePoint: '圆周率',
  },
  {
    id: 'm4',
    subject: 'math',
    difficulty: 2,
    question: '如果一个正方形的边长是5，那么它的面积是？',
    options: ['25', '20', '10', '15'],
    correctIndex: 0,
    explanation: '正方形面积 = 边长 × 边长 = 5 × 5 = 25',
    knowledgePoint: '面积计算',
  },
];

/**
 * 问答管理器 - 管理知识题库
 */
export class QuizManager {
  private questions: Map<string, QuizQuestion> = new Map();

  constructor() {
    // 初始化题库
    QUESTIONS.forEach(q => {
      this.questions.set(q.id, q);
    });
  }

  /**
   * 获取随机题目
   */
  getRandomQuestion(subject?: string): QuizQuestion {
    let candidates = Array.from(this.questions.values());

    if (subject) {
      candidates = candidates.filter(q => q.subject === subject);
    }

    if (candidates.length === 0) {
      candidates = Array.from(this.questions.values());
    }

    const index = Math.floor(Math.random() * candidates.length);
    return candidates[index];
  }

  /**
   * 检查答案
   */
  checkAnswer(questionId: string, answerIndex: number): { correct: boolean; explanation: string } {
    const question = this.questions.get(questionId);

    if (!question) {
      return { correct: false, explanation: '题目不存在' };
    }

    const correct = question.correctIndex === answerIndex;
    return {
      correct,
      explanation: question.explanation,
    };
  }

  /**
   * 获取所有学科
   */
  getSubjects(): { id: Subject; name: string; count: number }[] {
    const subjects: Record<Subject, { name: string; count: number }> = {
      history: { name: '历史', count: 0 },
      geography: { name: '地理', count: 0 },
      physics: { name: '物理', count: 0 },
      math: { name: '数学', count: 0 },
      chemistry: { name: '化学', count: 0 },
      biology: { name: '生物', count: 0 },
      economics: { name: '经济', count: 0 },
    };

    this.questions.forEach(q => {
      if (subjects[q.subject]) {
        subjects[q.subject].count++;
      }
    });

    return Object.entries(subjects)
      .filter(([_, v]) => v.count > 0)
      .map(([id, v]) => ({
        id: id as Subject,
        name: v.name,
        count: v.count,
      }));
  }

  /**
   * 添加新题目
   */
  addQuestion(question: QuizQuestion): void {
    this.questions.set(question.id, question);
  }

  /**
   * 获取题目总数
   */
  getQuestionCount(): number {
    return this.questions.size;
  }
}
