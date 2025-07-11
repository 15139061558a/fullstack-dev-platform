const express = require('express');
const { PrismaClient } = require('@prisma/client');
const mockService = require('../services/mockService');

const router = express.Router();
const prisma = new PrismaClient();

// 获取Mock数据
router.get('/:projectId', async (req, res) => {
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

// 设置Mock数据
router.post('/:projectId', async (req, res) => {
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
    console.error('设置Mock数据失败:', error);
    res.status(500).json({ error: '设置Mock数据失败' });
  }
});

// 更新Mock数据
router.put('/:projectId', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { projectId } = req.params;
    const { updates } = req.body;

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

    const result = await mockService.updateMockData(projectId, updates);
    res.json(result);
  } catch (error) {
    console.error('更新Mock数据失败:', error);
    res.status(500).json({ error: '更新Mock数据失败' });
  }
});

// 生成API响应
router.post('/:projectId/api/:endpoint(*)', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { projectId, endpoint } = req.params;
    const { method = 'GET', params = {} } = req.body;

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

    const response = mockService.generateAPIResponse(endpoint, method, params);
    res.json(response);
  } catch (error) {
    console.error('生成API响应失败:', error);
    res.status(500).json({ error: '生成API响应失败' });
  }
});

// 清理Mock数据
router.delete('/:projectId', async (req, res) => {
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

    const result = await mockService.cleanupProjectMockData(projectId);
    res.json(result);
  } catch (error) {
    console.error('清理Mock数据失败:', error);
    res.status(500).json({ error: '清理Mock数据失败' });
  }
});

module.exports = router; 