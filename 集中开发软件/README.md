# 集成开发软件 - All-in-One全栈开发平台

## 🚀 产品概述

这是一个**前端与后台实时同步的集成开发软件**，专注于**统一工作台、实时协作、无缝部署**三大核心价值，结合低代码与专业开发能力。

### 核心特性

- **三联视图工作台** - 前端编辑器、后端逻辑编辑器、实时预览窗口
- **智能数据沙箱** - 实时Mock引擎和双向绑定调试
- **统一部署管道** - 一键发布功能
- **实时协作** - 基于OT算法的多人编辑
- **API自动同步** - 前后端类型定义自动生成

## 🎯 目标用户

- **全栈开发者** - 避免频繁切换工具
- **小型创业团队** - 降低前后端协作成本
- **传统企业IT部门** - 加速内部系统开发

## 🏗️ 技术架构

```
客户端 (React) ←→ 同步引擎 (Socket.IO) ←→ 后端服务 (Express)
                ↓
            数据库代理 (Prisma) ←→ SQLite沙箱/PostgreSQL生产
```

### 核心技术栈

- **前端**: React + TypeScript + Monaco Editor
- **后端**: Node.js + Express + Socket.IO
- **数据库**: Prisma + SQLite (开发) / PostgreSQL (生产)
- **实时同步**: Operational Transformation (OT算法)
- **部署**: Docker + CI/CD

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn
- Git

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd integrated-dev-platform
```

2. **安装依赖**
```bash
npm run install-all
```

3. **启动开发环境**
```bash
npm run dev
```

4. **访问应用**
- 前端: http://localhost:3000
- 后端API: http://localhost:5000

## 📁 项目结构

```
integrated-dev-platform/
├── client/                 # React前端应用
│   ├── src/
│   │   ├── components/     # 三联视图组件
│   │   ├── hooks/         # 自定义Hooks
│   │   ├── services/      # API服务
│   │   └── utils/         # 工具函数
├── server/                # Express后端服务
│   ├── controllers/       # 控制器
│   ├── middleware/        # 中间件
│   ├── models/           # 数据模型
│   ├── routes/           # 路由
│   └── services/         # 业务逻辑
├── shared/               # 共享类型定义
└── docs/                # 文档
```

## 🎨 核心功能

### 1. 三联视图工作台

```jsx
// 前端编辑器
<FrontendEditor 
  code={frontendCode}
  onChange={handleFrontendChange}
  components={availableComponents}
/>

// 后端逻辑编辑器
<BackendEditor 
  code={backendCode}
  onChange={handleBackendChange}
  apis={generatedAPIs}
/>

// 实时预览窗口
<PreviewWindow 
  frontendCode={frontendCode}
  backendCode={backendCode}
  mockData={mockData}
/>
```

### 2. 智能数据沙箱

```jsx
// 双向绑定调试
const [userData, setUserData] = useSyncState('/api/user');

// 自动生成Mock数据
const mockData = generateMockData(schema);
```

### 3. 统一部署管道

```bash
# 一键部署
npm run deploy

# 自动生成部署配置
- 前端 → CDN (Vercel/OSS)
- 后端 → Serverless (AWS Lambda/阿里云FC)
- 数据库 → 自动迁移脚本
```

## 🔧 开发指南

### 添加新组件

1. 在 `client/src/components/` 创建组件
2. 在 `shared/types/` 添加类型定义
3. 在 `server/services/` 添加对应API

### 扩展API

1. 在 `server/routes/` 添加路由
2. 在 `server/controllers/` 添加控制器
3. 在 `client/src/services/` 添加前端调用

### 数据库操作

```javascript
// 使用Prisma进行数据库操作
const users = await prisma.user.findMany({
  include: { projects: true }
});
```

## 🚀 部署

### 开发环境

```bash
npm run dev
```

### 生产环境

```bash
npm run build
npm start
```

### Docker部署

```bash
docker build -t integrated-dev-platform .
docker run -p 3000:3000 -p 5000:5000 integrated-dev-platform
```

## 📊 性能优化

- **增量编译** - 类似Vite的热更新机制
- **代码分割** - 按需加载组件和模块
- **缓存策略** - Redis缓存热点数据
- **CDN加速** - 静态资源CDN分发

## 🔒 安全特性

- **沙箱环境** - 完全隔离的测试环境
- **权限控制** - RBAC角色权限管理
- **数据加密** - 敏感数据加密存储
- **审计日志** - 完整的操作记录

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 联系我们

- 项目主页: [GitHub Repository]
- 问题反馈: [Issues]
- 邮箱: support@integrated-dev.com

---

**让全栈开发更简单、更高效、更协作！** 🚀 