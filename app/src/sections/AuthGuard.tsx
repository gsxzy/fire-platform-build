import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@/hooks/useAuth';

export default function AuthGuard(props: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    // 保留当前路径作为 redirect 参数，登录后自动跳转回来
    const redirect = encodeURIComponent(location.pathname + location.search + location.hash);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  return <>{props.children}</>;
}
