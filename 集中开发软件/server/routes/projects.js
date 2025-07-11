const express = require('express');
const { PrismaClient } = require('@prisma/client');
const fileService = require('../services/fileService');
const mockService = require('../services/mockService');

const router = express.Router();
const prisma = new PrismaClient();

// 获取用户的项目列表
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id; // 从JWT中获取用户ID
    
    if (!userId) {
      return res.status(401).json({ error: '未授权访问' });
    }

    const projects = await prisma.project.findMany({
      where: {
        members: {
          some: {
            userId: userId
          }
        },
        status: 'ACTIVE'
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            files: true,
            deployments: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json(projects);
  } catch (error) {
    console.error('获取项目列表失败:', error);
    res.status(500).json({ error: '获取项目列表失败' });
  }
});

// 创建新项目
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { name, description, type = 'FULLSTACK' } = req.body;

    if (!userId) {
      return res.status(401).json({ error: '未授权访问' });
    }

    if (!name) {
      return res.status(400).json({ error: '项目名称不能为空' });
    }

    // 创建项目
    const project = await prisma.project.create({
      data: {
        name,
        description,
        type,
        members: {
          create: {
            userId,
            role: 'OWNER'
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    // 创建项目模板文件
    await fileService.createProjectTemplate(project.id, type, userId);

    // 初始化Mock数据
    const defaultSchema = {
      users: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'id' },
            name: { type: 'string', examples: ['张三', '李四', '王五'] },
            email: { type: 'email' },
            createdAt: { type: 'date' }
          }
        }
      }
    };
    
    await mockService.setProjectMockData(project.id, defaultSchema);

    res.status(201).json(project);
  } catch (error) {
    console.error('创建项目失败:', error);
    res.status(500).json({ error: '创建项目失败' });
  }
});

// 获取项目详情
router.get('/:projectId', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { projectId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: '未授权访问' });
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        members: {
          some: {
            userId: userId
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true
              }
            }
          }
        },
        files: {
          orderBy: { path: 'asc' }
        },
        _count: {
          select: {
            files: true,
            deployments: true
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: '项目不存在或无权限访问' });
    }

    res.json(project);
  } catch (error) {
    console.error('获取项目详情失败:', error);
    res.status(500).json({ error: '获取项目详情失败' });
  }
});

// 更新项目
router.put('/:projectId', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { projectId } = req.params;
    const { name, description, type } = req.body;

    if (!userId) {
      return res.status(401).json({ error: '未授权访问' });
    }

    // 检查用户权限
    const member = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId,
        role: {
          in: ['OWNER', 'ADMIN']
        }
      }
    });

    if (!member) {
      return res.status(403).json({ error: '无权限修改项目' });
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        name,
        description,
        type
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    res.json(project);
  } catch (error) {
    console.error('更新项目失败:', error);
    res.status(500).json({ error: '更新项目失败' });
  }
});

// 删除项目
router.delete('/:projectId', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { projectId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: '未授权访问' });
    }

    // 检查用户权限
    const member = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId,
        role: 'OWNER'
      }
    });

    if (!member) {
      return res.status(403).json({ error: '只有项目所有者可以删除项目' });
    }

    // 软删除项目
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'DELETED' }
    });

    // 清理Mock数据
    await mockService.cleanupProjectMockData(projectId);

    res.json({ success: true });
  } catch (error) {
    console.error('删除项目失败:', error);
    res.status(500).json({ error: '删除项目失败' });
  }
});

// 获取项目文件列表
router.get('/:projectId/files', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { projectId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: '未授权访问' });
    }

    // 检查项目权限
    const member = await prisma.projectMember.findFirst({
      where: { projectId, userId }
    });

    if (!member) {
      return res.status(403).json({ error: '无权限访问项目' });
    }

    const files = await fileService.getProjectFiles(projectId);
    res.json(files);
  } catch (error) {
    console.error('获取项目文件失败:', error);
    res.status(500).json({ error: '获取项目文件失败' });
  }
});

// 获取项目Mock数据
router.get('/:projectId/mock', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { projectId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: '未授权访问' });
    }

    // 检查项目权限
    const member = await prisma.projectMember.findFirst({
      where: { projectId, userId }
    });

    if (!member) {
      return res.status(403).json({ error: '无权限访问项目' });
    }

    const mockData = await mockService.getProjectMockData(projectId);
    res.json(mockData);
  } catch (error) {
    console.error('获取Mock数据失败:', error);
    res.status(500).json({ error: '获取Mock数据失败' });
  }
});

// 更新项目Mock数据
router.put('/:projectId/mock', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { projectId } = req.params;
    const { schema, data } = req.body;

    if (!userId) {
      return res.status(401).json({ error: '未授权访问' });
    }

    // 检查项目权限
    const member = await prisma.projectMember.findFirst({
      where: { projectId, userId }
    });

    if (!member) {
      return res.status(403).json({ error: '无权限访问项目' });
    }

    const result = await mockService.setProjectMockData(projectId, schema, data);
    res.json(result);
  } catch (error) {
    console.error('更新Mock数据失败:', error);
    res.status(500).json({ error: '更新Mock数据失败' });
  }
});

// 搜索项目文件
router.get('/:projectId/search', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { projectId } = req.params;
    const { q: query } = req.query;

    if (!userId) {
      return res.status(401).json({ error: '未授权访问' });
    }

    if (!query) {
      return res.status(400).json({ error: '搜索关键词不能为空' });
    }

    // 检查项目权限
    const member = await prisma.projectMember.findFirst({
      where: { projectId, userId }
    });

    if (!member) {
      return res.status(403).json({ error: '无权限访问项目' });
    }

    const files = await fileService.searchFiles(projectId, query);
    res.json(files);
  } catch (error) {
    console.error('搜索文件失败:', error);
    res.status(500).json({ error: '搜索文件失败' });
  }
});

// 获取项目活动记录
router.get('/:projectId/activities', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { projectId } = req.params;
    const { limit = 20 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: '未授权访问' });
    }

    // 检查项目权限
    const member = await prisma.projectMember.findFirst({
      where: { projectId, userId }
    });

    if (!member) {
      return res.status(403).json({ error: '无权限访问项目' });
    }

    const activities = await prisma.activity.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    res.json(activities);
  } catch (error) {
    console.error('获取项目活动失败:', error);
    res.status(500).json({ error: '获取项目活动失败' });
  }
});

module.exports = router; 