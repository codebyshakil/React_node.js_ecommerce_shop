import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const usePermissions = () => {
  const { user, isAdmin } = useAuth();

  const { data: userRole } = useQuery({
    queryKey: ['my-role', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user!.id);
      if (!data || data.length === 0) return 'user';
      const roles = data.map((r: any) => r.role);
      if (roles.includes('admin')) return 'admin';
      return roles.find((r: string) => r !== 'user') || roles[0] || 'user';
    },
    enabled: !!user,
  });

  const role = (userRole as string) || 'user';
  const isAdminRole = role === 'admin';

  const { data: dbPermissions = [] } = useQuery({
    queryKey: ['admin-permissions', role],
    queryFn: async () => {
      const { data } = await supabase.from('role_permissions').select('*').eq('role', role);
      return data ?? [];
    },
    enabled: !!role && !isAdminRole,
  });

  const can = (permission: string): boolean => {
    if (isAdminRole || isAdmin) return true;
    return dbPermissions.some((p: any) => p.permission === permission && p.enabled);
  };

  return { can, role, isAdminRole };
};
