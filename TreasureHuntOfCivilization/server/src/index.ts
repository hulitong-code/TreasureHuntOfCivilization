import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameManager } from './game/GameManager.js';
import { QuizManager } from './quiz/QuizManager.js';

const PORT = process.env.PORT || 3001;

// 创建 Express 应用
const app = express();
app.use(cors());
app.use(express.json());

// 创建 HTTP 服务器
const httpServer = createServer(app);

// 创建 Socket.IO 服务器
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://litongslg.cpolar.top'],
    methods: ['GET', 'POST'],
  },
});

// 游戏管理器
const gameManager = new GameManager();
const quizManager = new QuizManager();

// REST API 端点
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/games', (_req, res) => {
  res.json(gameManager.getActiveGames());
});

app.get('/api/quiz/random', (_req, res) => {
  const subject = _req.query.subject as string | undefined;
  const question = quizManager.getRandomQuestion(subject);
  res.json(question);
});

app.get('/api/quiz/subjects', (_req, res) => {
  res.json(quizManager.getSubjects());
});

// Socket.IO 连接处理
io.on('connection', (socket) => {
  console.log(`[连接] 玩家连接: ${socket.id}`);

  // 创建游戏
  socket.on('createGame', (playerName: string, civilizationId: string) => {
    try {
      const game = gameManager.createGame(socket.id, playerName, civilizationId);
      socket.join(game.id);
      socket.emit('gameState', game);
      console.log(`[游戏] ${playerName} 创建了游戏 ${game.id}`);
    } catch (error) {
      socket.emit('error', (error as Error).message);
    }
  });

  // 加入游戏
  socket.on('joinGame', (gameId: string, playerName: string, civilizationId: string) => {
    try {
      const game = gameManager.joinGame(gameId, socket.id, playerName, civilizationId);
      socket.join(gameId);
      io.to(gameId).emit('gameState', game);
      io.to(gameId).emit('playerJoined', game.players[game.players.length - 1]);
      console.log(`[游戏] ${playerName} 加入了游戏 ${gameId}`);
    } catch (error) {
      socket.emit('error', (error as Error).message);
    }
  });

  // 请求问答题目
  socket.on('requestQuiz', (subject?: string) => {
    const question = quizManager.getRandomQuestion(subject);
    socket.emit('quizQuestion', question);
  });

  // 回答问题
  socket.on('answerQuiz', (questionId: string, answerIndex: number) => {
    const result = quizManager.checkAnswer(questionId, answerIndex);
    socket.emit('quizResult', result.correct, result.explanation);
  });

  // 结束回合
  socket.on('endTurn', (gameId: string) => {
    try {
      const game = gameManager.endTurn(gameId, socket.id);
      io.to(gameId).emit('gameState', game);
      io.to(gameId).emit('turnChanged', game.currentPlayerIndex);
    } catch (error) {
      socket.emit('error', (error as Error).message);
    }
  });

  // 占领领土
  socket.on('claimTerritory', (gameId: string, x: number, y: number) => {
    try {
      const game = gameManager.claimTerritory(gameId, socket.id, x, y);
      io.to(gameId).emit('gameState', game);
    } catch (error) {
      socket.emit('error', (error as Error).message);
    }
  });

  // 断开连接
  socket.on('disconnect', () => {
    console.log(`[断开] 玩家断开: ${socket.id}`);
    const affectedGames = gameManager.handleDisconnect(socket.id);
    affectedGames.forEach((gameId) => {
      io.to(gameId).emit('playerLeft', socket.id);
    });
  });
});

// 启动服务器
httpServer.listen(PORT, () => {
  console.log('========================================');
  console.log('  文明求索 - 游戏服务器');
  console.log('========================================');
  console.log(`  服务器运行在: http://localhost:${PORT}`);
  console.log(`  API 端点: http://localhost:${PORT}/api`);
  console.log('========================================');
});
