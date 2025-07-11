const express = require('express');
const { PrismaClient } = require('@prisma/client');
const fileService = require('../services/fileService');

const router = express.Router();
const prisma = new PrismaClient();

// 保存文件
router.post('/:projectId', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { projectId } = req.params;
    const { path: filePath, content, type = 'FRONTEND' } = req.body;

    if (!userId) {
      return res.status(401).json({ error: '未授权访问' });
    }

    if (!filePath || content === undefined) {
      return res.status(400).json({ error: '文件路径和内容不能为空' });
    }

    // 检查项目权限
    const member = await prisma.projectMember.findFirst({
      where: { projectId, userId }
    });

    if (!member) {
      return res.status(403).json({ error: '无权限访问项目' });
    }

    const file = await fileService.saveFile(projectId, filePath, content, userId, type);
    res.json(file);
  } catch (error) {
    console.error('保存文件失败:', error);
    res.status(500).json({ error: '保存文件失败' });
  }
});

// 获取文件内容
router.get('/:projectId/:filePath(*)', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { projectId, filePath } = req.params;

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

    const file = await fileService.getFile(projectId, filePath);
    res.json(file);
  } catch (error) {
    console.error('获取文件失败:', error);
    res.status(500).json({ error: '获取文件失败' });
  }
});

// 删除文件
router.delete('/:projectId/:filePath(*)', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { projectId, filePath } = req.params;

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

    const result = await fileService.deleteFile(projectId, filePath, userId);
    res.json(result);
  } catch (error) {
    console.error('删除文件失败:', error);
    res.status(500).json({ error: '删除文件失败' });
  }
});

// 获取文件历史版本
router.get('/:projectId/:filePath(*)/history', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { projectId, filePath } = req.params;
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

    const history = await fileService.getFileHistory(projectId, filePath, parseInt(limit));
    res.json(history);
  } catch (error) {
    console.error('获取文件历史失败:', error);
    res.status(500).json({ error: '获取文件历史失败' });
  }
});

module.exports = router; 