/**
 * ═══════════════════════════════════════════════════════════════
 * 设备控制路由
 * 路径前缀: /api/* (通过 routes/index.js 挂载)
 * 功能：设备反控指令下发、指令记录查询
 * ═══════════════════════════════════════════════════════════════
 */
const express = require('express');
const { executeCommand, listCommands } = require('../services/deviceControl.service');
const { success, fail, handleError } = require('../utils/response');
const { requirePermission } = require('../middleware/permission');

const router = express.Router();

// POST /api/devices/:deviceId/command - 下发控制指令（需要 device:control 权限）
router.post('/devices/:deviceId/command', requirePermission('device:control'), async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { command, params } = req.body;
    if (!command) {
      return res.status(400).json(fail('command 不能为空', 400));
    }
    const result = await executeCommand(deviceId, command, params || {});
    res.json(success(result, '指令已下发'));
  } catch (err) {
    // 即使失败也返回 200，但 data 中包含失败信息（前端需要 commandId 来跟踪状态）
    if (err.message && (err.message.includes('超时') || err.message.includes('未连接'))) {
      // 超时/未连接时，指令记录已保存为 timeout/failed 状态
      return res.status(200).json(success({ error: err.message }, err.message));
    }
    handleError(res, err, req, 'device control error');
  }
});

// GET /api/devices/:deviceId/commands - 查询设备指令记录
router.get('/devices/:deviceId/commands', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 50;
    const rows = await listCommands(deviceId, limit);
    res.json(success(rows));
  } catch (err) {
    handleError(res, err, req, 'list commands error');
  }
});

// GET /api/commands/recent - 查询最近指令记录（全量）
router.get('/commands/recent', async (req, res) => {
  try {
    const { pool } = require('../utils/db');
    const limit = parseInt(req.query.pageSize, 10) || 50;
    const [rows] = await pool.query(
      `SELECT * FROM fire_control_command ORDER BY created_at DESC LIMIT ?`,
      [limit]
    );
    res.json(success(rows));
  } catch (err) {
    handleError(res, err, req, 'recent commands error');
  }
});

// POST /api/commands/batch - 批量下发控制指令
router.post('/commands/batch', async (req, res) => {
  try {
    const { commands } = req.body;
    if (!Array.isArray(commands) || commands.length === 0) {
      return res.status(400).json(fail('commands 不能为空数组', 400));
    }
    const results = [];
    for (const cmd of commands) {
      try {
        const result = await executeCommand(cmd.deviceId, cmd.command, cmd.params || {});
        results.push({ deviceId: cmd.deviceId, command: cmd.command, ...result });
      } catch (err) {
        results.push({ deviceId: cmd.deviceId, command: cmd.command, status: 'failed', error: err.message });
      }
    }
    res.json(success(results, '批量指令已下发'));
  } catch (err) {
    handleError(res, err, req, 'batch control error');
  }
});

module.exports = router;
