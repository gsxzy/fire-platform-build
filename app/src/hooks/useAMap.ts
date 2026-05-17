// src/hooks/useAMap.ts
import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

declare global {
  interface Window {
    AMap: any;
    _AMapSecurityConfig?: { securityJsCode?: string };
  }
}

/**
 * AMap 加载 Hook
 * - 处理地图脚本的异步加载
 * - 管理加载状态和错误
 */
export function useAMap() {
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMap = useCallback(async () => {
    if (window.AMap) {
      logger.info('[AMap] window.AMap 已存在，直接使用');
      setLoaded(true);
      setLoading(false);
      return;
    }

    const key = (import.meta.env.VITE_AMAP_KEY as string | undefined)?.trim();
    if (!key) {
      logger.error('[AMap] 错误：未设置 VITE_AMAP_KEY 环境变量，地图无法加载');
      setLoading(false);
      return;
    }
    const securityJsCode = (import.meta.env.VITE_AMAP_SECURITY_JS_CODE as string | undefined)?.trim();

    logger.info('[AMap] 使用 Key:', key.slice(0, 8) + '...');
    logger.info('[AMap] 安全密钥:', securityJsCode ? '已配置' : '未配置（高德2.0必须配置！）');

    if (securityJsCode) {
      window._AMapSecurityConfig = { securityJsCode };
    } else {
      logger.warn('[AMap] 警告：未配置 VITE_AMAP_SECURITY_JS_CODE，高德地图2.0可能无法加载！');
    }

    return new Promise<void>((resolve) => {
      let resolved = false;

      const timeout = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        const errMsg = '[AMap] 地图脚本加载超时（15s），请检查：1)网络连接 2)Key是否有效 3)域名是否在Key白名单中 4)安全密钥是否配置';
        logger.error(errMsg);
        setError(errMsg);
        setLoading(false);
        resolve();
      }, 15000);

      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      // 高德2.0 不支持 callback 参数，改用 onload 检测
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}&plugin=AMap.Scale,AMap.ToolBar,AMap.ControlBar`;

      logger.info('[AMap] 开始加载地图脚本:', script.src.slice(0, 80) + '...');

      script.onload = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        if (window.AMap) {
          logger.info('[AMap] 地图脚本加载成功，AMap 对象已就绪');
          setLoaded(true);
          setError(null);
        } else {
          const errMsg = '[AMap] 地图脚本加载后未找到 AMap 对象，可能Key无效或安全密钥缺失';
          logger.error(errMsg);
          setError(errMsg);
        }
        setLoading(false);
        resolve();
      };

      script.onerror = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        const errMsg = '[AMap] 脚本加载失败，请检查：1)Key是否正确 2)域名白名单 3)安全密钥(VITE_AMAP_SECURITY_JS_CODE) 4)网络连接';
        logger.error(errMsg);
        setError(errMsg);
        setLoading(false);
        resolve();
      };

      document.head.appendChild(script);
    });
  }, []);

  useEffect(() => {
    loadMap();
  }, [loadMap]);

  return {
    loading,
    loaded,
    error,
    AMap: window.AMap,
  };
}
