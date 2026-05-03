/**
 * ═══════════════════════════════════════════════════════════════
 * 仪表盘统计路由模块
 * 路径前缀: /api/dashboard/*
 * ═══════════════════════════════════════════════════════════════
 */
const express = require('express');
const { pool } = require('../utils/db');
const { success, fail, handleError } = require('../utils/response');

const router = express.Router();

// GET /api/dashboard/stats - 仪表盘核心统计
router.get('/stats', async (req, res) => {
  try {
    const [[stats]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM fire_host) AS unitCount,
        (SELECT COUNT(*) FROM fire_device) AS deviceCount,
        (SELECT COUNT(*) FROM fire_device WHERE status = 1) AS onlineDeviceCount,
        (SELECT COUNT(*) FROM fire_device WHERE status = 3) AS alarmCount24h,
        (SELECT COUNT(*) FROM fire_device WHERE status = 2) AS unhandledAlarmCount
    `);
    res.json(success({
      unitCount: stats.unitCount,
      deviceCount: stats.deviceCount,
      onlineDeviceCount: stats.onlineDeviceCount,
      alarmCount24h: stats.alarmCount24h,
      unhandledAlarmCount: stats.unhandledAlarmCount,
      controlRoomCount: stats.unitCount,
      pendingWorkOrderCount: 0,
      deviceOnlineRate: stats.deviceCount > 0 ? ((stats.onlineDeviceCount / stats.deviceCount) * 100).toFixed(1) + '%' : '0%',
    }));
  } catch (err) {
    handleError(res, err, req, 'dashboard stats error');
  }
});

// GET /api/dashboard/unit-rank - 单位在线率排名
router.get('/unit-rank', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT h.host_code AS name,
        IFNULL(FLOOR((COUNT(CASE WHEN d.status = 1 THEN 1 END) / NULLIF(COUNT(d.id), 0)) * 100), 100) AS online,
        COUNT(CASE WHEN d.status = 3 THEN 1 END) AS alarm,
        COUNT(CASE WHEN d.status = 2 THEN 1 END) AS fault,
        h.status
      FROM fire_host h
      LEFT JOIN fire_device d ON h.id = d.host_id
      GROUP BY h.id, h.host_code, h.status
      ORDER BY online DESC
      LIMIT 20
    `);
    res.json(success(rows));
  } catch (err) {
    handleError(res, err, req, 'dashboard unit-rank error');
  }
});

// GET /api/dashboard/subsystems - 子系统状态
router.get('/subsystems', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT device_type AS name,
        COUNT(*) AS total,
        COUNT(CASE WHEN status = 1 THEN 1 END) AS online,
        COUNT(CASE WHEN status = 3 THEN 1 END) AS alarm
      FROM fire_device
      WHERE device_type IS NOT NULL AND device_type != ''
      GROUP BY device_type
      ORDER BY total DESC
      LIMIT 10
    `);
    res.json(success(rows));
  } catch (err) {
    handleError(res, err, req, 'dashboard subsystems error');
  }
});

module.exports = router;
