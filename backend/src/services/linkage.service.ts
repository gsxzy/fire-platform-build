/**
 * ═══════════════════════════════════════════════════════════════════
 * 安消联动服务
 * 火警自动触发门禁、电梯、摄像头、电源等联动设备
 * ═══════════════════════════════════════════════════════════════════
 */
import { LinkageRule, Alarm } from '@/models';
import { DeviceControlService } from './deviceControl.service';
import logger from '@/config/logger';
import redis from '@/config/redis';

/** trigger_condition JSON（与前端安消联动页对齐） */
export interface LinkageTriggerConditionV2 {
  version?: number;
  type?: string;
  trigger?: string;
  triggerDesc?: string;
  priority?: 'high' | 'medium' | 'low';
  timeRange?: string;
  units?: string[];
  deviceTypes?: string[];
  targets?: string[];
  description?: string;
  /** 限制的告警类型，空或不填则仅受全局类型/级别策略约束 */
  alarmTypes?: number[];
}

const PRIORITY_ORDER: Record<string, number> = { high: 3, medium: 2, low: 1 };

function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null || raw === '') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function parseActionPairs(rule: any): { deviceId: number; command: string; params: any; delay: number }[] {
  const devices = safeParseJson<number[]>(rule.action_devices, []);
  const commands = safeParseJson<{ command: string; params?: any; delay?: number }[]>(rule.action_commands, []);
  const out: { deviceId: number; command: string; params: any; delay: number }[] = [];
  const n = Math.min(devices.length, commands.length);
  for (let i = 0; i < n; i++) {
    out.push({
      deviceId: Number(devices[i]) || 0,
      command: commands[i]?.command ?? 'config',
      params: commands[i]?.params ?? {},
      delay: commands[i]?.delay ?? 0,
    });
  }
  return out;
}

function inTimeRange(range: string | undefined, now: Date): boolean {
  if (!range || !range.includes('-')) return true;
  const [a, b] = range.split('-').map((s) => s.trim());
  if (!a || !b) return true;
  const parse = (t: string) => {
    const [h, m] = t.split(':').map((x) => parseInt(x, 10));
    if (!Number.isFinite(h)) return null;
    return (h * 60 + (Number.isFinite(m) ? m : 0)) % (24 * 60);
  };
  const start = parse(a);
  const end = parse(b);
  const cur = now.getHours() * 60 + now.getMinutes();
  if (start == null || end == null) return true;
  if (start <= end) return cur >= start && cur <= end;
  return cur >= start || cur <= end;
}

function matchesTriggerCondition(alarm: any, rule: any): boolean {
  const cond = safeParseJson<LinkageTriggerConditionV2>(rule.trigger_condition, {} as LinkageTriggerConditionV2);

  if (cond.alarmTypes && cond.alarmTypes.length > 0 && !cond.alarmTypes.includes(Number(alarm.alarm_type))) {
    return false;
  }

  const units = cond.units?.filter((u) => u && u.trim());
  if (units && units.length > 0 && !units.some((u) => u === '全部单位')) {
    const uname = String(alarm.unit_name ?? '').trim();
    const uid = alarm.unit_id != null ? String(alarm.unit_id) : '';
    const hit = units.some((u) => {
      const t = u.trim();
      return (uid && t === uid) || (uname && (uname.includes(t) || t.includes(uname)));
    });
    if (!hit) return false;
  }

  if (!inTimeRange(cond.timeRange, new Date())) {
    return false;
  }

  return true;
}

function rulePriority(rule: any): number {
  const cond = safeParseJson<LinkageTriggerConditionV2>(rule.trigger_condition, {} as LinkageTriggerConditionV2);
  return PRIORITY_ORDER[cond.priority ?? 'medium'] ?? 2;
}

export interface LinkageAction {
  deviceId: number;
  command: string;
  params: any;
  delay?: number; // 延迟执行（秒）
}

export interface LinkagePlan {
  triggerAlarmId: number;
  actions: LinkageAction[];
  status: 'pending' | 'executing' | 'completed' | 'failed';
  startTime: Date;
  completedTime?: Date;
  results: any[];
}

export class LinkageService {
  private static readonly LINKAGE_REDIS_KEY = 'linkage:plan:';
  private static readonly LINKAGE_CACHE_TTL = 86400; // 24小时

  /**
   * 告警触发联动
   */
  static async triggerLinkage(alarmId: number, userId?: number, userName?: string): Promise<LinkagePlan | null> {
    try {
      // 获取告警信息
      const alarm = await Alarm.findByPk(alarmId) as any;
      if (!alarm) {
        logger.error(`[Linkage] 告警不存在: ${alarmId}`);
        return null;
      }

      // 只对火警和高级别告警触发联动
      if (alarm.alarm_type !== 1 && alarm.alarm_level < 2) {
        logger.info(`[Linkage] 告警不触发联动: type=${alarm.alarm_type}, level=${alarm.alarm_level}`);
        return null;
      }

      const candidates = await LinkageRule.findAll({
        where: {
          trigger_type: 1,
          status: 1,
        },
      }) as any[];

      const rules = candidates
        .filter((rule) => {
          const tid = rule.trigger_device_id;
          if (tid != null && tid !== '' && Number(tid) > 0) {
            if (alarm.device_id == null || Number(tid) !== Number(alarm.device_id)) return false;
          }
          return matchesTriggerCondition(alarm, rule);
        })
        .sort((a, b) => rulePriority(b) - rulePriority(a));

      if (rules.length === 0) {
        logger.info(`[Linkage] 没有匹配的联动规则: alarmId=${alarmId}, deviceId=${alarm.device_id}`);
        return null;
      }

      const plan: LinkagePlan = {
        triggerAlarmId: alarmId,
        actions: [],
        status: 'pending',
        startTime: new Date(),
        results: [],
      };

      for (const rule of rules) {
        const pairs = parseActionPairs(rule);
        for (const p of pairs) {
          plan.actions.push({
            deviceId: p.deviceId,
            command: p.command,
            params: { ...p.params, _ruleId: rule.id, _ruleName: rule.rule_name },
            delay: p.delay,
          });
        }
      }

      // 缓存联动计划
      await redis.setex(
        `${this.LINKAGE_REDIS_KEY}${alarmId}`,
        this.LINKAGE_CACHE_TTL,
        JSON.stringify(plan)
      );

      logger.info(`[Linkage] 联动计划创建成功: alarmId=${alarmId}, actions=${plan.actions.length}`);

      // 异步执行联动
      this.executeLinkage(plan, userId, userName);

      return plan;
    } catch (err: any) {
      logger.error(`[Linkage] 触发联动失败: ${err.message}`);
      return null;
    }
  }

  /**
   * 执行联动计划
   */
  private static async executeLinkage(plan: LinkagePlan, userId?: number, userName?: string): Promise<void> {
    try {
      // 更新状态为执行中
      plan.status = 'executing';
      await redis.setex(
        `${this.LINKAGE_REDIS_KEY}${plan.triggerAlarmId}`,
        this.LINKAGE_CACHE_TTL,
        JSON.stringify(plan)
      );

      logger.info(`[Linkage] 开始执行联动: alarmId=${plan.triggerAlarmId}`);

      // 按延迟时间排序执行
      const sortedActions = [...plan.actions].sort((a, b) => (a.delay || 0) - (b.delay || 0));

      let lastDelay = 0;
      for (const action of sortedActions) {
        const delay = action.delay || 0;
        const waitTime = delay - lastDelay;

        if (waitTime > 0) {
          await this.sleep(waitTime * 1000);
        }

        let result: { success: boolean; message: string; result?: any };
        if (!action.deviceId) {
          logger.info(`[Linkage] 软动作（无设备反控）: ${action.command} params=${JSON.stringify(action.params)}`);
          result = { success: true, message: '软动作，仅记录不下发设备' };
        } else {
          result = await DeviceControlService.sendCommand({
            deviceId: action.deviceId,
            commandType: this.getCommandType(action.command),
            params: action.params,
            operatorId: userId || 0,
            operatorName: userName || '系统自动',
          });
        }

        plan.results.push({
          action,
          result,
          executedAt: new Date(),
        });

        lastDelay = delay;
      }

      // 更新状态为已完成
      plan.status = 'completed';
      plan.completedTime = new Date();
      await redis.setex(
        `${this.LINKAGE_REDIS_KEY}${plan.triggerAlarmId}`,
        this.LINKAGE_CACHE_TTL,
        JSON.stringify(plan)
      );

      logger.info(`[Linkage] 联动执行完成: alarmId=${plan.triggerAlarmId}`);
    } catch (err: any) {
      logger.error(`[Linkage] 执行联动失败: ${err.message}`);

      // 更新状态为失败
      plan.status = 'failed';
      plan.results.push({
        error: err.message,
        failedAt: new Date()
      });

      await redis.setex(
        `${this.LINKAGE_REDIS_KEY}${plan.triggerAlarmId}`,
        this.LINKAGE_CACHE_TTL,
        JSON.stringify(plan)
      );
    }
  }

  /**
   * 获取联动计划状态
   */
  static async getLinkageStatus(alarmId: number): Promise<LinkagePlan | null> {
    const cached = await redis.get(`${this.LINKAGE_REDIS_KEY}${alarmId}`);
    if (cached) {
      return JSON.parse(cached) as LinkagePlan;
    }
    return null;
  }

  /**
   * 手动触发联动
   */
  static async manualTrigger(ruleId: number, userId: number, userName: string): Promise<LinkagePlan | null> {
    try {
      const rule = await LinkageRule.findByPk(ruleId) as any;
      if (!rule) {
        return null;
      }

      // 创建虚拟告警ID（手动触发）
      const manualAlarmId = Date.now();

      // 手动触发不检查告警条件，直接执行联动规则
      const plan: LinkagePlan = {
        triggerAlarmId: manualAlarmId,
        actions: [],
        status: 'pending',
        startTime: new Date(),
        results: []
      };

      const pairs = parseActionPairs(rule);
      for (const p of pairs) {
        plan.actions.push({
          deviceId: p.deviceId,
          command: p.command,
          params: { ...p.params, _ruleId: rule.id, _ruleName: rule.rule_name },
          delay: p.delay,
        });
      }

      // 缓存并执行
      await redis.setex(
        `${this.LINKAGE_REDIS_KEY}${manualAlarmId}`,
        this.LINKAGE_CACHE_TTL,
        JSON.stringify(plan)
      );

      await this.executeLinkage(plan, userId, userName);

      return plan;
    } catch (err: any) {
      logger.error(`[Linkage] 手动触发失败: ${err.message}`);
      return null;
    }
  }

  /**
   * 获取命令类型
   */
  private static getCommandType(command: string): number {
    const commandMap: Record<string, number> = {
      'start': 1,      // 远程启动
      'stop': 2,       // 远程停止
      'reset': 3,      // 远程复位
      'silence': 4,    // 远程消音
      'config': 5,     // 参数配置
      'unlock': 6,     // 门禁解锁
      'floor1': 7,      // 电梯归首
      'power_off': 8,   // 强切电源
      'broadcast': 9     // 应急广播
    };

    return commandMap[command] || 1;
  }

  /**
   * 延时等待
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 常见联动方案
   */
  static readonly PRESET_PLANS = {
    // 火警联动方案
    fireAlarm: {
      name: '火警标准联动',
      actions: [
        { command: 'unlock', delay: 0, description: '门禁解锁' },
        { command: 'floor1', delay: 5, description: '电梯归首' },
        { command: 'broadcast', delay: 10, description: '应急广播' },
        { command: 'power_off', delay: 15, description: '强切非消防电源' }
      ]
    },

    // 误报联动方案
    falseAlarm: {
      name: '误报恢复联动',
      actions: [
        { command: 'reset', delay: 0, description: '设备复位' },
        { command: 'unlock', delay: 5, description: '门禁恢复' }
      ]
    },

    // 演习联动方案
    drill: {
      name: '消防演习联动',
      actions: [
        { command: 'broadcast', delay: 0, description: '演习广播' },
        { command: 'unlock', delay: 10, description: '门禁解锁' },
        { command: 'floor1', delay: 20, description: '电梯归首' }
      ]
    }
  };

  /**
   * 应用预设联动方案
   */
  static async applyPresetPlan(planType: 'fireAlarm' | 'falseAlarm' | 'drill', deviceIds: number[], userId: number, userName: string): Promise<void> {
    const preset = this.PRESET_PLANS[planType];
    if (!preset) {
      logger.error(`[Linkage] 预设方案不存在: ${planType}`);
      return;
    }

    logger.info(`[Linkage] 应用预设方案: ${preset.name}, 设备数: ${deviceIds.length}`);

    const plan: LinkagePlan = {
      triggerAlarmId: Date.now(),
      actions: [],
      status: 'pending',
      startTime: new Date(),
      results: []
    };

    // 为每个设备应用预设动作
    for (const deviceId of deviceIds) {
      for (const action of preset.actions) {
        plan.actions.push({
          deviceId,
          command: action.command,
          params: { description: action.description },
          delay: action.delay
        });
      }
    }

    // 执行
    await this.executeLinkage(plan, userId, userName);
  }
}