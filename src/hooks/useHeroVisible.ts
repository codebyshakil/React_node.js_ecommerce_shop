import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useHeroVisible = (slug: string) => {
  return useQuery({
    queryKey: ['hero-visible', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', `hero_visible_${slug}`)
        .maybeSingle();
      if (error) throw error;
      // Default to true (visible) if no setting exists
      if (!data) return true;
      return data.value === true || data.value === 'true';
    },
    enabled: !!slug,
    staleTime: 60_000,
  });
};
