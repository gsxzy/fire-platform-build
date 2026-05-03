import { useEffect, useRef } from 'react';

/**
 * 页面可见性感知轮询 - 标签页隐藏时暂停，显示时恢复
 * @param callback 轮询执行的回调
 * @param interval 轮询间隔（毫秒）
 * @param immediate 是否立即执行一次
 */
export function useVisibilityPolling(
  callback: () => void,
  interval: number,
  immediate = true
) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const start = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => callbackRef.current(), interval);
    };
    const stop = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        callbackRef.current();
        start();
      }
    };

    if (immediate) callbackRef.current();
    start();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [interval, immediate]);
}
