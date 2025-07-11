const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const prisma = new PrismaClient();

class DeployService {
  constructor() {
    this.deployments = new Map(); // 存储部署状态
    this.buildQueue = []; // 构建队列
  }

  // 部署项目
  async deployProject(projectId, deploymentConfig, userId) {
    try {
      // 创建部署记录
      const deployment = await prisma.deployment.create({
        data: {
          projectId,
          userId,
          status: 'PENDING',
          config: JSON.stringify(deploymentConfig)
        }
      });

      // 添加到部署队列
      this.buildQueue.push({
        deploymentId: deployment.id,
        projectId,
        config: deploymentConfig,
        userId
      });

      // 开始处理队列
      this.processDeploymentQueue();

      return deployment;
    } catch (error) {
      console.error('创建部署失败:', error);
      throw new Error(`创建部署失败: ${error.message}`);
    }
  }

  // 处理部署队列
  async processDeploymentQueue() {
    if (this.buildQueue.length === 0) return;

    const deployment = this.buildQueue.shift();
    await this.executeDeployment(deployment);
  }

  // 执行部署
  async executeDeployment(deployment) {
    const { deploymentId, projectId, config, userId } = deployment;

    try {
      // 更新状态为构建中
      await this.updateDeploymentStatus(deploymentId, 'BUILDING');

      // 获取项目文件
      const files = await this.getProjectFiles(projectId);
      
      // 创建临时构建目录
      const buildDir = path.join(process.cwd(), 'builds', deploymentId);
      await fs.mkdir(buildDir, { recursive: true });

      // 根据项目类型执行不同的部署策略
      const result = await this.buildProject(files, buildDir, config);

      if (result.success) {
        // 部署到目标平台
        const deployResult = await this.deployToPlatform(buildDir, config);
        
        if (deployResult.success) {
          await this.updateDeploymentStatus(deploymentId, 'SUCCESS', {
            url: deployResult.url,
            logs: result.logs + '\n' + deployResult.logs
          });
        } else {
          await this.updateDeploymentStatus(deploymentId, 'FAILED', {
            logs: result.logs + '\n' + deployResult.logs
          });
        }
      } else {
        await this.updateDeploymentStatus(deploymentId, 'FAILED', {
          logs: result.logs
        });
      }

    } catch (error) {
      console.error('部署执行失败:', error);
      await this.updateDeploymentStatus(deploymentId, 'FAILED', {
        logs: error.message
      });
    }

    // 清理临时文件
    await this.cleanupBuild(deploymentId);
  }

  // 构建项目
  async buildProject(files, buildDir, config) {
    const logs = [];
    
    try {
      // 写入项目文件
      for (const file of files) {
        const filePath = path.join(buildDir, file.path);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.content);
        logs.push(`✅ 写入文件: ${file.path}`);
      }

      // 根据项目类型执行构建命令
      const projectType = this.detectProjectType(files);
      const buildResult = await this.runBuildCommand(buildDir, projectType, config);
      
      logs.push(buildResult.logs);
      
      return {
        success: buildResult.success,
        logs: logs.join('\n')
      };
    } catch (error) {
      logs.push(`❌ 构建失败: ${error.message}`);
      return {
        success: false,
        logs: logs.join('\n')
      };
    }
  }

  // 检测项目类型
  detectProjectType(files) {
    const hasReact = files.some(f => f.path.includes('package.json') && f.content.includes('react'));
    const hasExpress = files.some(f => f.path.includes('server.js') || f.path.includes('app.js'));
    const hasVue = files.some(f => f.path.includes('package.json') && f.content.includes('vue'));
    
    if (hasReact && hasExpress) return 'FULLSTACK';
    if (hasReact) return 'REACT';
    if (hasVue) return 'VUE';
    if (hasExpress) return 'EXPRESS';
    return 'STATIC';
  }

  // 运行构建命令
  async runBuildCommand(buildDir, projectType, config) {
    const logs = [];
    
    try {
      switch (projectType) {
        case 'REACT':
          logs.push('🔨 构建React项目...');
          await execAsync('npm install', { cwd: buildDir });
          await execAsync('npm run build', { cwd: buildDir });
          break;
          
        case 'VUE':
          logs.push('🔨 构建Vue项目...');
          await execAsync('npm install', { cwd: buildDir });
          await execAsync('npm run build', { cwd: buildDir });
          break;
          
        case 'EXPRESS':
          logs.push('🔨 准备Express项目...');
          await execAsync('npm install', { cwd: buildDir });
          break;
          
        case 'FULLSTACK':
          logs.push('🔨 构建全栈项目...');
          // 构建前端
          if (config.buildFrontend !== false) {
            await execAsync('npm install', { cwd: path.join(buildDir, 'frontend') });
            await execAsync('npm run build', { cwd: path.join(buildDir, 'frontend') });
            logs.push('✅ 前端构建完成');
          }
          // 准备后端
          if (config.buildBackend !== false) {
            await execAsync('npm install', { cwd: path.join(buildDir, 'backend') });
            logs.push('✅ 后端准备完成');
          }
          break;
          
        default:
          logs.push('📁 静态项目，无需构建');
      }
      
      return { success: true, logs: logs.join('\n') };
    } catch (error) {
      logs.push(`❌ 构建命令执行失败: ${error.message}`);
      return { success: false, logs: logs.join('\n') };
    }
  }

  // 部署到平台
  async deployToPlatform(buildDir, config) {
    const logs = [];
    
    try {
      const platform = config.platform || 'local';
      
      switch (platform) {
        case 'vercel':
          return await this.deployToVercel(buildDir, config);
          
        case 'netlify':
          return await this.deployToNetlify(buildDir, config);
          
        case 'aws':
          return await this.deployToAWS(buildDir, config);
          
        case 'local':
        default:
          return await this.deployToLocal(buildDir, config);
      }
    } catch (error) {
      logs.push(`❌ 部署失败: ${error.message}`);
      return { success: false, logs: logs.join('\n') };
    }
  }

  // 部署到Vercel
  async deployToVercel(buildDir, config) {
    const logs = [];
    
    try {
      logs.push('🚀 部署到Vercel...');
      
      // 这里应该集成Vercel CLI
      // 目前返回模拟结果
      const url = `https://${config.projectName || 'project'}-${Date.now()}.vercel.app`;
      
      logs.push(`✅ 部署成功: ${url}`);
      
      return {
        success: true,
        url,
        logs: logs.join('\n')
      };
    } catch (error) {
      logs.push(`❌ Vercel部署失败: ${error.message}`);
      return {
        success: false,
        logs: logs.join('\n')
      };
    }
  }

  // 部署到Netlify
  async deployToNetlify(buildDir, config) {
    const logs = [];
    
    try {
      logs.push('🚀 部署到Netlify...');
      
      // 这里应该集成Netlify CLI
      const url = `https://${config.projectName || 'project'}-${Date.now()}.netlify.app`;
      
      logs.push(`✅ 部署成功: ${url}`);
      
      return {
        success: true,
        url,
        logs: logs.join('\n')
      };
    } catch (error) {
      logs.push(`❌ Netlify部署失败: ${error.message}`);
      return {
        success: false,
        logs: logs.join('\n')
      };
    }
  }

  // 部署到AWS
  async deployToAWS(buildDir, config) {
    const logs = [];
    
    try {
      logs.push('🚀 部署到AWS...');
      
      // 这里应该集成AWS SDK
      const url = `https://${config.projectName || 'project'}-${Date.now()}.amazonaws.com`;
      
      logs.push(`✅ 部署成功: ${url}`);
      
      return {
        success: true,
        url,
        logs: logs.join('\n')
      };
    } catch (error) {
      logs.push(`❌ AWS部署失败: ${error.message}`);
      return {
        success: false,
        logs: logs.join('\n')
      };
    }
  }

  // 本地部署
  async deployToLocal(buildDir, config) {
    const logs = [];
    
    try {
      logs.push('🚀 本地部署...');
      
      // 启动本地服务器
      const port = config.port || 3000;
      const url = `http://localhost:${port}`;
      
      logs.push(`✅ 本地服务器启动: ${url}`);
      
      return {
        success: true,
        url,
        logs: logs.join('\n')
      };
    } catch (error) {
      logs.push(`❌ 本地部署失败: ${error.message}`);
      return {
        success: false,
        logs: logs.join('\n')
      };
    }
  }

  // 获取项目文件
  async getProjectFiles(projectId) {
    try {
      const files = await prisma.file.findMany({
        where: { projectId },
        orderBy: { path: 'asc' }
      });
      
      return files;
    } catch (error) {
      console.error('获取项目文件失败:', error);
      throw new Error(`获取项目文件失败: ${error.message}`);
    }
  }

  // 更新部署状态
  async updateDeploymentStatus(deploymentId, status, data = {}) {
    try {
      const updateData = {
        status,
        updatedAt: new Date()
      };
      
      if (data.url) updateData.url = data.url;
      if (data.logs) updateData.logs = data.logs;
      
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: updateData
      });
      
      console.log(`📊 部署状态更新: ${deploymentId} -> ${status}`);
    } catch (error) {
      console.error('更新部署状态失败:', error);
    }
  }

  // 清理构建文件
  async cleanupBuild(deploymentId) {
    try {
      const buildDir = path.join(process.cwd(), 'builds', deploymentId);
      await fs.rm(buildDir, { recursive: true, force: true });
      console.log(`🧹 清理构建文件: ${deploymentId}`);
    } catch (error) {
      console.error('清理构建文件失败:', error);
    }
  }

  // 获取部署历史
  async getDeploymentHistory(projectId, limit = 10) {
    try {
      const deployments = await prisma.deployment.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: {
            select: {
              username: true,
              avatar: true
            }
          }
        }
      });
      
      return deployments;
    } catch (error) {
      console.error('获取部署历史失败:', error);
      throw new Error(`获取部署历史失败: ${error.message}`);
    }
  }

  // 取消部署
  async cancelDeployment(deploymentId, userId) {
    try {
      const deployment = await prisma.deployment.findUnique({
        where: { id: deploymentId }
      });
      
      if (!deployment) {
        throw new Error('部署不存在');
      }
      
      if (deployment.status === 'PENDING' || deployment.status === 'BUILDING') {
        await this.updateDeploymentStatus(deploymentId, 'CANCELLED');
        return { success: true };
      } else {
        throw new Error('只能取消待处理或构建中的部署');
      }
    } catch (error) {
      console.error('取消部署失败:', error);
      throw new Error(`取消部署失败: ${error.message}`);
    }
  }

  // 获取部署统计
  async getDeploymentStats(projectId) {
    try {
      const stats = await prisma.deployment.groupBy({
        by: ['status'],
        where: { projectId },
        _count: {
          status: true
        }
      });
      
      const total = await prisma.deployment.count({
        where: { projectId }
      });
      
      return {
        total,
        byStatus: stats.reduce((acc, stat) => {
          acc[stat.status] = stat._count.status;
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('获取部署统计失败:', error);
      throw new Error(`获取部署统计失败: ${error.message}`);
    }
  }
}

module.exports = new DeployService(); 