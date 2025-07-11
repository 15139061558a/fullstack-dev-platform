const express = require('express');
const { PrismaClient } = require('@prisma/client');
const deployService = require('../services/deployService');

const router = express.Router();
const prisma = new PrismaClient();

// 创建部署
router.post('/:projectId', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { projectId } = req.params;
    const deploymentConfig = req.body;

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

    const deployment = await deployService.deployProject(projectId, deploymentConfig, userId);
    res.status(201).json(deployment);
  } catch (error) {
    console.error('创建部署失败:', error);
    res.status(500).json({ error: '创建部署失败' });
  }
});

// 获取部署历史
router.get('/:projectId', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { projectId } = req.params;
    const { limit = 10 } = req.query;

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

    const deployments = await deployService.getDeploymentHistory(projectId, parseInt(limit));
    res.json(deployments);
  } catch (error) {
    console.error('获取部署历史失败:', error);
    res.status(500).json({ error: '获取部署历史失败' });
  }
});

// 获取部署详情
router.get('/:projectId/:deploymentId', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { projectId, deploymentId } = req.params;

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

    const deployment = await prisma.deployment.findFirst({
      where: {
        id: deploymentId,
        projectId
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      }
    });

    if (!deployment) {
      return res.status(404).json({ error: '部署不存在' });
    }

    res.json(deployment);
  } catch (error) {
    console.error('获取部署详情失败:', error);
    res.status(500).json({ error: '获取部署详情失败' });
  }
});

// 取消部署
router.delete('/:projectId/:deploymentId', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { projectId, deploymentId } = req.params;

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

    const result = await deployService.cancelDeployment(deploymentId, userId);
    res.json(result);
  } catch (error) {
    console.error('取消部署失败:', error);
    res.status(500).json({ error: '取消部署失败' });
  }
});

// 获取部署统计
router.get('/:projectId/stats', async (req, res) => {
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

    const stats = await deployService.getDeploymentStats(projectId);
    res.json(stats);
  } catch (error) {
    console.error('获取部署统计失败:', error);
    res.status(500).json({ error: '获取部署统计失败' });
  }
});

module.exports = router; 