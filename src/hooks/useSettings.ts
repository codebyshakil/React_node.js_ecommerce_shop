import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SiteSettings {
  payment_enabled: boolean;
  buy_now_enabled: boolean;
  maintenance_mode: boolean;
  whatsapp_enabled: boolean;
}

export const useSettings = () => {
  return useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('key, value');
      if (error) throw error;
      const settings: Record<string, boolean> = {};
      (data ?? []).forEach((row: any) => {
        settings[row.key] = row.value === true || row.value === 'true';
      });
      return settings as unknown as SiteSettings;
    },
    staleTime: 60_000,
  });
};

export const useUpdateSetting = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      const { error } = await supabase
        .from('site_settings')
        .update({ value: value as any })
        .eq('key', key);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['site-settings'] }),
  });
};
