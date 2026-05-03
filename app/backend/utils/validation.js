/**
 * ═══════════════════════════════════════════════════════════════
 * 输入验证与分页辅助函数
 * ═══════════════════════════════════════════════════════════════
 */

/* ── 输入验证辅助 ── */
function validateRequired(body, fields) {
  const missing = fields.filter(f => body[f] === undefined || body[f] === null || body[f] === '');
  if (missing.length > 0) return { valid: false, msg: `缺少必填字段: ${missing.join(', ')}` };
  return { valid: true };
}

function sanitizeLike(keyword) {
  if (!keyword || typeof keyword !== 'string') return '';
  return keyword.replace(/[%_\\]/g, '\\$&');
}

/* ── 分页辅助 ── */
function parsePagination(query) {
  let page = Math.max(1, parseInt(query.page, 10) || 1);
  let pageSize = Math.min(500, Math.max(1, parseInt(query.pageSize, 10) || 10));
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

/* ── 排序白名单校验 ── */
const SORT_WHITELIST = {
  fire_host: ['id', 'host_code', 'brand', 'status', 'created_at'],
  fire_loop: ['id', 'loop_no', 'loop_name', 'status'],
  fire_device: ['id', 'address', 'device_type', 'location', 'status'],
  users: ['id', 'username', 'real_name', 'status', 'created_at'],
  fscn8001_alarm: ['id', 'alarm_time', 'device_sn'],
  fscn8001_device: ['id', 'updated_at', 'device_sn'],
  fscn8001_raw_log: ['id', 'created_at'],
  control_room: ['host_id', 'room_id', 'updated_at'],
  multiline_panel: ['point_no', 'id'],
  bus_panel: ['loop_no', 'point_no', 'id'],
  devices: ['id', 'name', 'type', 'status', 'created_at'],
  iot_devices: ['id', 'name', 'category', 'status', 'created_at'],
  cameras: ['id', 'name', 'type', 'status', 'created_at'],
  gb28181_devices: ['id', 'name', 'device_id', 'status', 'created_at'],
};

function validateSort(sortBy, sortOrder, table, defaultCol = 'id') {
  const allowed = SORT_WHITELIST[table] || [];
  const col = allowed.includes(sortBy) ? sortBy : defaultCol;
  const dir = sortOrder && String(sortOrder).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  return { col, dir };
}

module.exports = { validateRequired, sanitizeLike, parsePagination, validateSort, SORT_WHITELIST };
