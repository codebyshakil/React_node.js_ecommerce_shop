import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HeroSettings {
  category_expanded: boolean;
  sticky_top_header: boolean;
  sticky_navbar: boolean;
  social_icons_enabled: boolean;
}

const defaults: HeroSettings = {
  category_expanded: true,
  sticky_top_header: false,
  sticky_navbar: true,
  social_icons_enabled: true,
};

export const useHeroSettings = () => {
  return useQuery({
    queryKey: ['hero-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'hero_settings')
        .maybeSingle();
      if (error) throw error;
      if (!data?.value || typeof data.value !== 'object') return defaults;
      return { ...defaults, ...(data.value as any) } as HeroSettings;
    },
    staleTime: 60_000,
  });
};

export const useSocialLinks = () => {
  return useQuery({
    queryKey: ['social-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'social_links')
        .maybeSingle();
      if (error) throw error;
      return (data?.value as any) ?? {};
    },
    staleTime: 60_000,
  });
};

export const useSiteLogo = () => {
  return useQuery({
    queryKey: ['page-content', 'site_logo_url'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'site_logo_url')
        .maybeSingle();
      if (error) throw error;
      return typeof data?.value === 'string' ? data.value : '';
    },
    staleTime: 60_000,
  });
};
