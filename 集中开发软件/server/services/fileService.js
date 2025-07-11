const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

class FileService {
  // 保存文件
  async saveFile(projectId, filePath, content, userId, fileType = 'FRONTEND') {
    try {
      const fileName = path.basename(filePath);
      
      // 检查文件是否已存在
      const existingFile = await prisma.file.findUnique({
        where: {
          projectId_path: {
            projectId,
            path: filePath
          }
        }
      });

      if (existingFile) {
        // 更新现有文件
        const updatedFile = await prisma.file.update({
          where: { id: existingFile.id },
          data: {
            content,
            updatedAt: new Date()
          }
        });

        // 记录活动
        await this.recordActivity(userId, projectId, 'FILE_UPDATED', {
          fileId: updatedFile.id,
          fileName,
          filePath
        });

        return updatedFile;
      } else {
        // 创建新文件
        const newFile = await prisma.file.create({
          data: {
            name: fileName,
            path: filePath,
            content,
            type: fileType,
            projectId,
            userId
          }
        });

        // 记录活动
        await this.recordActivity(userId, projectId, 'FILE_CREATED', {
          fileId: newFile.id,
          fileName,
          filePath
        });

        return newFile;
      }
    } catch (error) {
      console.error('保存文件失败:', error);
      throw new Error(`保存文件失败: ${error.message}`);
    }
  }

  // 读取文件
  async getFile(projectId, filePath) {
    try {
      const file = await prisma.file.findUnique({
        where: {
          projectId_path: {
            projectId,
            path: filePath
          }
        }
      });

      if (!file) {
        throw new Error('文件不存在');
      }

      return file;
    } catch (error) {
      console.error('读取文件失败:', error);
      throw new Error(`读取文件失败: ${error.message}`);
    }
  }

  // 获取项目所有文件
  async getProjectFiles(projectId) {
    try {
      const files = await prisma.file.findMany({
        where: { projectId },
        orderBy: [
          { type: 'asc' },
          { path: 'asc' }
        ]
      });

      return files;
    } catch (error) {
      console.error('获取项目文件失败:', error);
      throw new Error(`获取项目文件失败: ${error.message}`);
    }
  }

  // 删除文件
  async deleteFile(projectId, filePath, userId) {
    try {
      const file = await prisma.file.findUnique({
        where: {
          projectId_path: {
            projectId,
            path: filePath
          }
        }
      });

      if (!file) {
        throw new Error('文件不存在');
      }

      await prisma.file.delete({
        where: { id: file.id }
      });

      // 记录活动
      await this.recordActivity(userId, projectId, 'FILE_DELETED', {
        fileName: file.name,
        filePath
      });

      return { success: true };
    } catch (error) {
      console.error('删除文件失败:', error);
      throw new Error(`删除文件失败: ${error.message}`);
    }
  }

  // 创建项目模板文件
  async createProjectTemplate(projectId, projectType, userId) {
    const templates = {
      FULLSTACK: [
        {
          path: 'frontend/src/App.jsx',
          content: `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>欢迎使用集成开发平台</h1>
        <p>开始构建你的全栈应用吧！</p>
      </header>
    </div>
  );
}

export default App;`,
          type: 'FRONTEND'
        },
        {
          path: 'frontend/src/App.css',
          content: `.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  padding: 20px;
  color: white;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
}`,
          type: 'FRONTEND'
        },
        {
          path: 'backend/server.js',
          content: `const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// 示例API
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

app.get('/api/users', (req, res) => {
  res.json([
    { id: 1, name: '张三', email: 'zhangsan@example.com' },
    { id: 2, name: '李四', email: 'lisi@example.com' }
  ]);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(\`服务器运行在端口 \${PORT}\`);
});`,
          type: 'BACKEND'
        },
        {
          path: 'package.json',
          content: `{
  "name": "fullstack-project",
  "version": "1.0.0",
  "description": "全栈项目模板",
  "scripts": {
    "dev": "concurrently \\"npm run server\\" \\"npm run client\\"",
    "server": "nodemon backend/server.js",
    "client": "cd frontend && npm start",
    "build": "cd frontend && npm run build"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "concurrently": "^8.2.0"
  }
}`,
          type: 'CONFIG'
        }
      ],
      FRONTEND: [
        {
          path: 'src/App.jsx',
          content: `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>React 前端项目</h1>
        <p>开始构建你的前端应用吧！</p>
      </header>
    </div>
  );
}

export default App;`,
          type: 'FRONTEND'
        },
        {
          path: 'src/App.css',
          content: `.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  padding: 20px;
  color: white;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
}`,
          type: 'FRONTEND'
        }
      ],
      BACKEND: [
        {
          path: 'server.js',
          content: `const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// 示例API
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

app.get('/api/users', (req, res) => {
  res.json([
    { id: 1, name: '张三', email: 'zhangsan@example.com' },
    { id: 2, name: '李四', email: 'lisi@example.com' }
  ]);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(\`服务器运行在端口 \${PORT}\`);
});`,
          type: 'BACKEND'
        },
        {
          path: 'package.json',
          content: `{
  "name": "backend-project",
  "version": "1.0.0",
  "description": "后端项目模板",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}`,
          type: 'CONFIG'
        }
      ]
    };

    const templateFiles = templates[projectType] || templates.FULLSTACK;

    try {
      for (const file of templateFiles) {
        await this.saveFile(projectId, file.path, file.content, userId, file.type);
      }

      console.log(`✅ 项目模板创建成功: ${projectType}`);
      return { success: true, filesCreated: templateFiles.length };
    } catch (error) {
      console.error('创建项目模板失败:', error);
      throw new Error(`创建项目模板失败: ${error.message}`);
    }
  }

  // 记录活动
  async recordActivity(userId, projectId, type, data) {
    try {
      await prisma.activity.create({
        data: {
          type,
          userId,
          projectId,
          data: JSON.stringify(data)
        }
      });
    } catch (error) {
      console.error('记录活动失败:', error);
    }
  }

  // 获取文件历史版本
  async getFileHistory(projectId, filePath, limit = 10) {
    try {
      const file = await prisma.file.findUnique({
        where: {
          projectId_path: {
            projectId,
            path: filePath
          }
        }
      });

      if (!file) {
        throw new Error('文件不存在');
      }

      // 这里可以实现更复杂的版本控制逻辑
      // 目前返回文件的基本信息
      return {
        currentVersion: file.updatedAt,
        content: file.content,
        lastModified: file.updatedAt
      };
    } catch (error) {
      console.error('获取文件历史失败:', error);
      throw new Error(`获取文件历史失败: ${error.message}`);
    }
  }

  // 搜索文件
  async searchFiles(projectId, query) {
    try {
      const files = await prisma.file.findMany({
        where: {
          projectId,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } }
          ]
        },
        orderBy: { updatedAt: 'desc' }
      });

      return files;
    } catch (error) {
      console.error('搜索文件失败:', error);
      throw new Error(`搜索文件失败: ${error.message}`);
    }
  }
}

module.exports = new FileService(); 