import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HomepageSection {
  id: string;
  section_key: string;
  title: string;
  subtitle: string | null;
  is_enabled: boolean;
  display_order: number;
  layout_type: string;
  product_source: string | null;
  selected_ids: any;
  item_limit: number | null;
  settings_json: any;
  created_at: string;
  updated_at: string;
}

export const useHomepageSections = () => {
  return useQuery({
    queryKey: ['homepage-sections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homepage_sections')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as HomepageSection[];
    },
    staleTime: 30_000,
  });
};

export const useUpdateHomepageSection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<HomepageSection> }) => {
      const { error } = await supabase
        .from('homepage_sections')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['homepage-sections'] }),
  });
};

export const useReorderHomepageSections = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sections: { id: string; display_order: number }[]) => {
      for (const s of sections) {
        const { error } = await supabase
          .from('homepage_sections')
          .update({ display_order: s.display_order } as any)
          .eq('id', s.id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['homepage-sections'] }),
  });
};

export const useCreateHomepageSection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (section: Omit<HomepageSection, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase
        .from('homepage_sections')
        .insert(section as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['homepage-sections'] }),
  });
};

export const useDeleteHomepageSection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('homepage_sections')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['homepage-sections'] }),
  });
};
