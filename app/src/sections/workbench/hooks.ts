import { useState, useEffect, useRef } from 'react';

export function useAnimatedNumber(target: number, duration = 1200) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number>(0);
  const fromRef = useRef<number>(0);
  const toRef = useRef<number>(target);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    fromRef.current = display;
    toRef.current = target;
    startRef.current = performance.now();

    const step = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(fromRef.current + (toRef.current - fromRef.current) * easeOutQuart);
      setDisplay(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}
