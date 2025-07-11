const { v4: uuidv4 } = require('uuid');
const { diff_match_patch } = require('diff-match-patch');

// 存储活跃的协作会话
const activeSessions = new Map();
const userSessions = new Map();

// OT算法实现
class OperationalTransformation {
  constructor() {
    this.dmp = new diff_match_patch();
  }

  // 应用操作转换
  transform(operation, concurrentOperation) {
    const patches = this.dmp.patch_make(operation);
    const transformedPatches = this.dmp.patch_apply(patches, concurrentOperation);
    return transformedPatches[0];
  }

  // 合并操作
  compose(operation1, operation2) {
    return operation1 + operation2;
  }
}

const ot = new OperationalTransformation();

// 设置Socket.IO处理器
function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 用户连接: ${socket.id}`);

    // 加入项目协作房间
    socket.on('join-project', async (data) => {
      const { projectId, userId, username } = data;
      
      socket.join(`project-${projectId}`);
      
      // 记录用户会话
      if (!userSessions.has(socket.id)) {
        userSessions.set(socket.id, { userId, username, projectId });
      }

      // 初始化项目会话
      if (!activeSessions.has(projectId)) {
        activeSessions.set(projectId, {
          users: new Set(),
          documents: new Map(),
          version: 0
        });
      }

      const session = activeSessions.get(projectId);
      session.users.add(socket.id);

      // 通知其他用户有新成员加入
      socket.to(`project-${projectId}`).emit('user-joined', {
        userId,
        username,
        socketId: socket.id
      });

      // 发送当前项目状态
      socket.emit('project-state', {
        users: Array.from(session.users).map(id => {
          const userSession = userSessions.get(id);
          return {
            socketId: id,
            userId: userSession?.userId,
            username: userSession?.username
          };
        }),
        documents: Array.from(session.documents.entries()).map(([docId, doc]) => ({
          id: docId,
          content: doc.content,
          version: doc.version
        }))
      });

      console.log(`👥 用户 ${username} 加入项目 ${projectId}`);
    });

    // 处理代码编辑操作
    socket.on('code-edit', async (data) => {
      const { projectId, documentId, operation, version, userId } = data;
      
      const session = activeSessions.get(projectId);
      if (!session) return;

      const document = session.documents.get(documentId) || {
        content: '',
        version: 0,
        operations: []
      };

      // 版本冲突检查
      if (version < document.version) {
        // 发送冲突解决请求
        socket.emit('version-conflict', {
          documentId,
          currentVersion: document.version,
          clientVersion: version
        });
        return;
      }

      // 应用OT算法
      const transformedOperation = ot.transform(operation, document.content);
      document.content = ot.compose(document.content, transformedOperation);
      document.version++;
      document.operations.push({
        id: uuidv4(),
        operation: transformedOperation,
        version: document.version,
        userId,
        timestamp: Date.now()
      });

      session.documents.set(documentId, document);

      // 广播给其他用户
      socket.to(`project-${projectId}`).emit('code-updated', {
        documentId,
        operation: transformedOperation,
        version: document.version,
        userId,
        timestamp: Date.now()
      });

      console.log(`📝 文档 ${documentId} 已更新，版本: ${document.version}`);
    });

    // 处理光标位置同步
    socket.on('cursor-move', (data) => {
      const { projectId, documentId, position, userId } = data;
      
      socket.to(`project-${projectId}`).emit('cursor-updated', {
        documentId,
        position,
        userId,
        socketId: socket.id
      });
    });

    // 处理文件保存
    socket.on('save-file', async (data) => {
      const { projectId, documentId, content, userId } = data;
      
      try {
        // 这里可以调用文件服务保存到数据库
        const { saveFile } = require('./fileService');
        await saveFile(projectId, documentId, content, userId);
        
        socket.emit('file-saved', {
          documentId,
          success: true,
          timestamp: Date.now()
        });
        
        console.log(`💾 文件 ${documentId} 已保存`);
      } catch (error) {
        socket.emit('file-saved', {
          documentId,
          success: false,
          error: error.message
        });
      }
    });

    // 处理实时预览更新
    socket.on('preview-update', (data) => {
      const { projectId, frontendCode, backendCode, mockData } = data;
      
      socket.to(`project-${projectId}`).emit('preview-changed', {
        frontendCode,
        backendCode,
        mockData,
        timestamp: Date.now()
      });
    });

    // 处理部署请求
    socket.on('deploy-request', async (data) => {
      const { projectId, userId, deploymentConfig } = data;
      
      try {
        const { deployProject } = require('./deployService');
        const deployment = await deployProject(projectId, deploymentConfig);
        
        socket.emit('deployment-started', {
          deploymentId: deployment.id,
          status: 'started'
        });
        
        // 广播部署状态
        socket.to(`project-${projectId}`).emit('deployment-update', {
          deploymentId: deployment.id,
          status: 'started',
          userId
        });
        
        console.log(`🚀 项目 ${projectId} 开始部署`);
      } catch (error) {
        socket.emit('deployment-error', {
          error: error.message
        });
      }
    });

    // 处理断开连接
    socket.on('disconnect', () => {
      const userSession = userSessions.get(socket.id);
      if (userSession) {
        const { projectId, username } = userSession;
        
        // 从项目会话中移除用户
        const session = activeSessions.get(projectId);
        if (session) {
          session.users.delete(socket.id);
          
          // 如果没有用户了，清理会话
          if (session.users.size === 0) {
            activeSessions.delete(projectId);
            console.log(`🗑️ 项目 ${projectId} 会话已清理`);
          } else {
            // 通知其他用户
            socket.to(`project-${projectId}`).emit('user-left', {
              socketId: socket.id,
              username
            });
          }
        }
        
        userSessions.delete(socket.id);
        console.log(`👋 用户 ${username} 断开连接`);
      }
    });

    // 错误处理
    socket.on('error', (error) => {
      console.error(`Socket错误: ${error.message}`);
      socket.emit('error', { message: '连接发生错误' });
    });
  });

  console.log('🔌 Socket.IO 处理器已设置');
}

// 获取活跃会话信息
function getActiveSessions() {
  const sessions = {};
  for (const [projectId, session] of activeSessions.entries()) {
    sessions[projectId] = {
      userCount: session.users.size,
      version: session.version,
      documents: session.documents.size
    };
  }
  return sessions;
}

// 清理过期会话
function cleanupSessions() {
  const now = Date.now();
  const timeout = 30 * 60 * 1000; // 30分钟超时
  
  for (const [projectId, session] of activeSessions.entries()) {
    let hasActiveUsers = false;
    for (const socketId of session.users) {
      const userSession = userSessions.get(socketId);
      if (userSession && (now - userSession.lastActivity) < timeout) {
        hasActiveUsers = true;
        break;
      }
    }
    
    if (!hasActiveUsers) {
      activeSessions.delete(projectId);
      console.log(`🧹 清理过期项目会话: ${projectId}`);
    }
  }
}

// 定期清理过期会话
setInterval(cleanupSessions, 5 * 60 * 1000); // 每5分钟清理一次

module.exports = {
  setupSocketHandlers,
  getActiveSessions,
  activeSessions,
  userSessions
}; 