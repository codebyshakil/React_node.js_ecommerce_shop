import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RecaptchaSettings {
  enabled: boolean;
  site_key: string;
  secret_key: string;
  pages: string[]; // e.g. ['admin_login', 'user_login', 'register', 'checkout', 'contact']
}

const DEFAULT_SETTINGS: RecaptchaSettings = {
  enabled: false,
  site_key: '',
  secret_key: '',
  pages: [],
};

export const useRecaptchaSettings = () => {
  return useQuery({
    queryKey: ['admin-settings', 'recaptcha'],
    queryFn: async () => {
      const { data } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'recaptcha')
        .maybeSingle();
      if (data?.value && typeof data.value === 'object') {
        return { ...DEFAULT_SETTINGS, ...(data.value as any) } as RecaptchaSettings;
      }
      return DEFAULT_SETTINGS;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useIsRecaptchaEnabled = (page: string) => {
  const { data } = useRecaptchaSettings();
  if (!data) return { enabled: false, siteKey: '' };
  return {
    enabled: data.enabled && data.site_key.length > 0 && data.pages.includes(page),
    siteKey: data.site_key,
  };
};
