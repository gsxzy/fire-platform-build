/**
 * ═══════════════════════════════════════════════════════════════════
 * 进程级运行时指标采集
 * Event loop lag、CPU 占用、active handles 等
 * ═══════════════════════════════════════════════════════════════════
 */

import os from 'os';

interface ProcessMetricsSnapshot {
  timestamp: number;
  eventLoopLagMs: number;
  cpuUsage: {
    userPercent: number;
    systemPercent: number;
    loadAvg: number[];
    cores: number;
  };
  memory: {
    rssMB: number;
    heapUsedMB: number;
    heapTotalMB: number;
    externalMB: number;
    arrayBuffersMB: number;
    systemTotalMB: number;
    systemFreeMB: number;
    processPercent: number;
  };
  process: {
    pid: number;
    uptime: number;
    activeHandles: number;
    activeRequests: number;
  };
}

export class ProcessMetricsCollector {
  private lastCpuUsage = process.cpuUsage();
  private lastCpuTime = process.hrtime.bigint();

  /** 测量 event loop lag（精确到微秒级） */
  measureEventLoopLag(): Promise<number> {
    return new Promise((resolve) => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const lagNs = process.hrtime.bigint() - start;
        resolve(Number(lagNs) / 1_000_000); // 转换为毫秒
      });
    });
  }

  async snapshot(): Promise<ProcessMetricsSnapshot> {
    const eventLoopLagMs = await this.measureEventLoopLag();
    const mem = process.memoryUsage();
    const currentCpu = process.cpuUsage(this.lastCpuUsage);
    const currentTime = process.hrtime.bigint();
    const elapsedUs = Number(currentTime - this.lastCpuTime) / 1000; // 纳秒→微秒

    // 更新基准
    this.lastCpuUsage = process.cpuUsage();
    this.lastCpuTime = currentTime;

    const userPercent = elapsedUs > 0 ? Math.round((currentCpu.user / elapsedUs) * 1000) / 10 : 0;
    const systemPercent = elapsedUs > 0 ? Math.round((currentCpu.system / elapsedUs) * 1000) / 10 : 0;

    const sysTotal = os.totalmem();
    const sysFree = os.freemem();

    return {
      timestamp: Date.now(),
      eventLoopLagMs: Math.round(eventLoopLagMs * 1000) / 1000,
      cpuUsage: {
        userPercent,
        systemPercent,
        loadAvg: os.loadavg().map(v => Math.round(v * 100) / 100),
        cores: os.cpus().length,
      },
      memory: {
        rssMB: Math.round(mem.rss / 1024 / 1024),
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
        externalMB: Math.round((mem.external || 0) / 1024 / 1024),
        arrayBuffersMB: Math.round((mem.arrayBuffers || 0) / 1024 / 1024),
        systemTotalMB: Math.round(sysTotal / 1024 / 1024),
        systemFreeMB: Math.round(sysFree / 1024 / 1024),
        processPercent: sysTotal > 0 ? Math.round((mem.rss / sysTotal) * 1000) / 10 : 0,
      },
      process: {
        pid: process.pid,
        uptime: Math.round(process.uptime()),
        activeHandles: (process as any)._getActiveHandles?.().length || 0,
        activeRequests: (process as any)._getActiveRequests?.().length || 0,
      },
    };
  }
}

export const processMetrics = new ProcessMetricsCollector();
