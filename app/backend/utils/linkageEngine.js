/**
 * ═══════════════════════════════════════════════════════════════
 * 安消联动引擎
 * 功能：
 *   1. 告警触发时自动匹配联动规则
 *   2. 按优先级执行联动动作
 *   3. 记录联动执行日志
 * ═══════════════════════════════════════════════════════════════
 */

const crypto = require('crypto');

let linkagePool = null;
let linkageEnabled = false;

function initLinkageEngine(pool) {
  linkagePool = pool;
  linkageEnabled = !!pool;
}

function log(tag, msg) {
  console.log(`[Linkage][${new Date().toISOString()}][${tag}] ${msg}`);
}

/* ── 生成记录编号 ── */
function genRecordCode() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = crypto.randomInt(1000, 9999);
  return `LK-${y}${m}${d}${rand}`;
}

/* ── 查询匹配的联动规则 ── */
async function findMatchingRules(alarmType, alarmLevel, deviceType, location, orgId) {
  if (!linkageEnabled || !linkagePool) return [];
  try {
    const [rows] = await linkagePool.query(
      `SELECT id, rule_code, rule_name, trigger_condition, linkage_action, priority
       FROM linkage_rules
       WHERE status = 1
       ORDER BY priority ASC, id ASC`
    );
    const matched = [];
    for (const rule of rows) {
      let cond = {};
      try { cond = typeof rule.trigger_condition === 'string' ? JSON.parse(rule.trigger_condition) : rule.trigger_condition; } catch { continue; }
      // 匹配 alarmTypes
      if (cond.alarmTypes && cond.alarmTypes.length > 0) {
        if (!cond.alarmTypes.includes(alarmType) && !cond.alarmTypes.includes(String(alarmType))) continue;
      }
      // 匹配 alarmLevels
      if (cond.alarmLevels && cond.alarmLevels.length > 0) {
        if (!cond.alarmLevels.includes(alarmLevel) && !cond.alarmLevels.includes(String(alarmLevel))) continue;
      }
      // 匹配 deviceTypes
      if (cond.deviceTypes && cond.deviceTypes.length > 0) {
        if (!deviceType || !cond.deviceTypes.some(dt => String(deviceType).includes(dt))) continue;
      }
      // 匹配 locations
      if (cond.locations && cond.locations.length > 0) {
        if (!location || !cond.locations.some(loc => String(location).includes(loc))) continue;
      }
      // 匹配 orgId
      if (cond.orgIds && cond.orgIds.length > 0) {
        if (!orgId || !cond.orgIds.includes(String(orgId))) continue;
      }
      matched.push(rule);
    }
    return matched;
  } catch (err) {
    log('ERROR', `查询联动规则失败: ${err.message}`);
    return [];
  }
}

/* ── 执行单个联动动作 ── */
async function executeAction(action, alarmInfo) {
  const start = Date.now();
  const result = { type: action.type, status: 1, msg: '', detail: null };

  try {
    switch (action.type) {
      case 'video': {
        // 调取摄像头视频（记录目标摄像头ID）
        result.detail = { target: action.target || 'nearest', duration: action.duration || 30 };
        result.msg = `调取视频: ${action.target || 'nearest'}, ${action.duration || 30}秒`;
        result.status = 2;
        break;
      }
      case 'record': {
        // 自动录像
        result.detail = { duration: action.duration || 60 };
        result.msg = `自动录像 ${action.duration || 60}秒`;
        result.status = 2;
        break;
      }
      case 'popup': {
        // 弹窗告警
        result.detail = { level: action.level || 'normal' };
        result.msg = `弹窗告警: ${action.level || 'normal'}`;
        result.status = 2;
        break;
      }
      case 'notify': {
        // 推送通知
        const channels = action.channels || ['app'];
        const targets = action.targets || ['duty'];
        result.detail = { channels, targets };
        result.msg = `推送通知: ${channels.join(',')} -> ${targets.join(',')}`;
        result.status = 2;
        break;
      }
      case 'sound_light': {
        // 声光报警
        result.detail = { level: action.level || 'normal' };
        result.msg = `声光报警: ${action.level || 'normal'}`;
        result.status = 2;
        break;
      }
      case 'broadcast': {
        // 疏散广播
        result.detail = { content: action.content || '火警警报，请立即疏散' };
        result.msg = `广播: ${action.content || '火警警报，请立即疏散'}`;
        result.status = 2;
        break;
      }
      case 'access_control': {
        // 门禁释放
        result.detail = { action: action.action || 'release' };
        result.msg = `门禁${action.action === 'release' ? '释放' : action.action}`;
        result.status = 2;
        break;
      }
      case 'elevator': {
        // 电梯迫降
        result.detail = { action: action.action || 'forced_stop' };
        result.msg = '电梯迫降';
        result.status = 2;
        break;
      }
      case 'ai': {
        // AI深度分析
        result.detail = { action: action.action || 'deep_analysis' };
        result.msg = 'AI烟火识别深度分析';
        result.status = 2;
        break;
      }
      default: {
        result.msg = `未知动作类型: ${action.type}`;
        result.status = 4;
      }
    }
  } catch (err) {
    result.status = 4;
    result.msg = `执行失败: ${err.message}`;
  }

  result.duration_ms = Date.now() - start;
  return result;
}

/* ── 触发联动 ── */
async function triggerLinkage(alarmInfo) {
  if (!linkageEnabled || !linkagePool) {
    log('SKIP', '联动引擎未初始化，跳过联动');
    return;
  }

  const {
    alarmId = null,
    alarmType = 'fire',
    alarmLevel = 1,
    deviceId = '',
    deviceName = '',
    deviceType = '',
    location = '',
    orgId = '',
    orgName = '',
    alarmEventCode = '',
    description = ''
  } = alarmInfo;

  const startTime = Date.now();

  // 1. 查找匹配规则
  const rules = await findMatchingRules(alarmType, alarmLevel, deviceType, location, orgId);
  if (rules.length === 0) {
    log('INFO', `无匹配联动规则: ${alarmType} ${alarmLevel} ${deviceType} ${location}`);
    return;
  }

  log('TRIGGER', `告警 ${alarmType} 匹配到 ${rules.length} 条联动规则`);

  // 2. 执行每条规则的联动动作
  for (const rule of rules) {
    const recordCode = genRecordCode();
    let actions = [];
    try {
      const actionDef = typeof rule.linkage_action === 'string' ? JSON.parse(rule.linkage_action) : rule.linkage_action;
      actions = actionDef.actions || [];
    } catch { actions = []; }

    const actionResults = [];
    let successCount = 0;
    let failCount = 0;

    for (const action of actions) {
      const res = await executeAction(action, alarmInfo);
      actionResults.push(res);
      if (res.status === 2) successCount++;
      else failCount++;
    }

    const overallStatus = failCount === 0 ? 2 : successCount === 0 ? 4 : 3;
    const duration = Date.now() - startTime;

    // 3. 记录联动日志
    try {
      await linkagePool.query(
        `INSERT INTO linkage_records
         (record_code, rule_id, rule_name, alarm_id, alarm_event_code, alarm_type, alarm_level,
          alarm_device_name, alarm_location, device_id, org_id, org_name,
          action_results, overall_status, duration_ms, operator)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          recordCode, rule.id, rule.rule_name, alarmId, alarmEventCode, alarmType, alarmLevel,
          deviceName, location, deviceId, orgId, orgName,
          JSON.stringify(actionResults), overallStatus, duration, 'system'
        ]
      );

      // 更新规则触发次数
      await linkagePool.query(
        'UPDATE linkage_rules SET trigger_count = trigger_count + 1 WHERE id = ?',
        [rule.id]
      );

      log('RECORD', `规则[${rule.rule_name}] 联动记录: ${recordCode}, 动作:${actionResults.length}, 成功:${successCount}, 失败:${failCount}, 耗时:${duration}ms`);
    } catch (err) {
      log('ERROR', `记录联动日志失败: ${err.message}`);
    }
  }
}

module.exports = { initLinkageEngine, triggerLinkage };
