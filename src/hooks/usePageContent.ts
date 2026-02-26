import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePageContent = (key: string) => {
  return useQuery({
    queryKey: ['page-content', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();
      if (error) throw error;
      return data?.value ?? null;
    },
    staleTime: 60_000,
  });
};

export const useUpdatePageContent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ key, value: value as any }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['page-content', vars.key] });
      qc.invalidateQueries({ queryKey: ['site-settings'] });
    },
  });
};
