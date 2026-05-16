import { Navigate, useLocation } from 'react-router';

/** 旧菜单路径 /iot/access → /device/access，保留查询串（如 deviceId） */
export default function DeviceAccessRedirect() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: '/device/access', search }} replace />;
}
