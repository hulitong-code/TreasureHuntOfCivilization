# 文明求索 - 安装说明

## 环境要求

- **操作系统**: Windows 10/11, macOS, Linux
- **Node.js**: 18.0 或更高版本
- **浏览器**: Chrome, Firefox, Edge, Safari (现代浏览器)

---

## 一、安装 Node.js

### Windows

**方法 1: 使用 winget (推荐)**

打开 PowerShell，运行：
```powershell
winget install OpenJS.NodeJS.LTS
```

**方法 2: 官网下载**

1. 访问 https://nodejs.org
2. 下载 LTS (长期支持) 版本
3. 运行安装程序，按提示完成安装

### macOS

**方法 1: 使用 Homebrew (推荐)**
```bash
brew install node
```

**方法 2: 官网下载**

访问 https://nodejs.org 下载 macOS 安装包

### Linux (Ubuntu/Debian)

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 验证安装

安装完成后，**重新打开终端**，运行以下命令验证：

```bash
node --version   # 应显示 v18.x.x 或更高
npm --version    # 应显示 9.x.x 或更高
```

---

## 二、安装项目依赖

### 1. 进入项目目录

```bash
cd E:\code\ai\aicode\sanguo
```

### 2. 安装依赖

```bash
npm install
```

等待安装完成，大约需要 1-2 分钟。

**可能出现的问题：**

如果遇到网络问题，可以使用淘宝镜像：
```bash
npm install --registry=https://registry.npmmirror.com
```

---

## 三、启动游戏

### 开发模式 (推荐)

```bash
npm run dev
```

这会同时启动前端和后端服务器：
- 前端游戏: http://localhost:3000
- 后端 API: http://localhost:3001

### 分别启动

如果需要分别启动前端和后端：

```bash
# 终端 1 - 启动后端
npm run dev:server

# 终端 2 - 启动前端
npm run dev:client
```

---

## 四、访问游戏

打开浏览器，访问：

**http://localhost:3000**

---

## 五、常见问题

### Q1: 提示 "node: command not found"

**原因**: Node.js 未正确安装或 PATH 未更新

**解决**:
1. 确认 Node.js 已安装
2. 重新打开终端窗口
3. Windows 用户可能需要重启电脑

### Q2: npm install 报错 EACCES 权限问题

**解决 (macOS/Linux)**:
```bash
sudo chown -R $(whoami) ~/.npm
npm install
```

### Q3: 端口 3000 被占用

**解决**: 修改 `client/vite.config.ts` 中的端口：
```typescript
server: {
  port: 3002,  // 改为其他端口
}
```

### Q4: 页面打开后白屏

**解决**:
1. 打开浏览器开发者工具 (F12) 查看控制台错误
2. 确认后端服务器正在运行
3. 尝试清除浏览器缓存后刷新

### Q5: Windows 上中文乱码

**解决**: 在 PowerShell 中运行：
```powershell
chcp 65001
```

---

## 六、项目结构

```
civilization-quest/
├── client/          # 前端 (Phaser.js 游戏)
│   ├── src/
│   │   ├── scenes/  # 游戏场景
│   │   └── main.ts  # 入口文件
│   └── index.html
├── server/          # 后端 (Node.js API)
│   └── src/
│       ├── game/    # 游戏逻辑
│       └── quiz/    # 题库管理
├── shared/          # 共享类型定义
├── package.json     # 项目配置
└── README.md        # 项目说明
```

---

## 七、构建生产版本

```bash
npm run build
```

构建产物位于 `client/dist` 目录，可部署到任意静态托管服务。

---

## 八、联系与反馈

如有问题或建议，请在项目仓库中提交 Issue。

---

**祝游戏愉快！让学习成为一场文明的征程！** 🏛️
