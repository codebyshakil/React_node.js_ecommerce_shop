import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useInstallCheck = () => {
  return useQuery({
    queryKey: ['install-check'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'installed')
        .maybeSingle();
      if (error) return false;
      return data?.value === true;
    },
    staleTime: 60_000,
  });
};
