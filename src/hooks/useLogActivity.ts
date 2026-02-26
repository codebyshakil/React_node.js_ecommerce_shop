import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

export const useLogActivity = () => {
  const { user, userRole } = useAuth();

  // Fetch user's display name from profiles
  const { data: profileName } = useQuery({
    queryKey: ['log-profile-name', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle();
      return data?.full_name || user.user_metadata?.full_name || 'Unknown';
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const logActivity = useCallback(
    async (action: string, entityType: string, entityId: string, details: string) => {
      if (!user) return;
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        user_name: profileName || user.user_metadata?.full_name || 'Unknown',
        user_role: userRole || 'user',
        action,
        entity_type: entityType,
        entity_id: entityId,
        details,
      } as any);
    },
    [user, profileName, userRole]
  );

  return logActivity;
};
