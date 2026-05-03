/**
 * ═══════════════════════════════════════════════════════════════
 * 页面过渡动画包装器
 * 路由切换时添加淡入+上滑动画效果
 * ═══════════════════════════════════════════════════════════════
 */
import { useLayoutEffect, useState } from 'react';
import { useLocation } from 'react-router';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useLayoutEffect(() => {
    if (location.pathname) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setDisplayChildren(children);
        setIsTransitioning(false);
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, children]);

  return (
    <div
      className="transition-all duration-200 ease-out"
      style={{
        opacity: isTransitioning ? 0.3 : 1,
        transform: isTransitioning ? 'translateY(4px)' : 'translateY(0)',
      }}
    >
      {displayChildren}
    </div>
  );
}
