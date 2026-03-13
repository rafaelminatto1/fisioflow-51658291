import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SecurityMonitoring() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/admin/audit-logs?tab=security', { replace: true });
  }, [navigate]);

  return null;
}
