import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useAdminContent = (key: string) => {
  return useQuery({
    queryKey: ['admin-settings', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();
      if (error) throw error;
      return data?.value ?? null;
    },
    staleTime: 60_000,
  });
};

export const useUpdateAdminContent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      // Try update first, then upsert if no rows matched
      const { data, error } = await supabase
        .from('admin_settings')
        .update({ value: value as any })
        .eq('key', key)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) {
        const { error: insertErr } = await supabase
          .from('admin_settings')
          .insert({ key, value: value as any });
        if (insertErr) throw insertErr;
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-settings', vars.key] });
    },
  });
};
