import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PageSection {
  id: string;
  page_id: string;
  section_type: string;
  title: string;
  display_order: number;
  is_enabled: boolean;
  settings_json: any;
  created_at: string;
  updated_at: string;
}

export const usePageSections = (pageId: string | undefined) => {
  return useQuery({
    queryKey: ['page-sections', pageId],
    queryFn: async () => {
      if (!pageId) return [];
      const { data, error } = await supabase
        .from('page_sections')
        .select('*')
        .eq('page_id', pageId)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as PageSection[];
    },
    enabled: !!pageId,
    staleTime: 30_000,
  });
};

export const usePageSectionsBySlug = (slug: string) => {
  return useQuery({
    queryKey: ['page-sections-slug', slug],
    queryFn: async () => {
      // First get page id from slug
      const { data: page, error: pageError } = await supabase
        .from('pages')
        .select('id')
        .eq('slug', slug)
        .eq('is_published', true)
        .eq('is_deleted', false)
        .maybeSingle();
      if (pageError) throw pageError;
      if (!page) return [];
      
      const { data, error } = await supabase
        .from('page_sections')
        .select('*')
        .eq('page_id', page.id)
        .eq('is_enabled', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as PageSection[];
    },
    enabled: !!slug,
    staleTime: 30_000,
  });
};

export const useCreatePageSection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (section: Omit<PageSection, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase
        .from('page_sections')
        .insert(section as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['page-sections', vars.page_id] }),
  });
};

export const useUpdatePageSection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pageId, updates }: { id: string; pageId: string; updates: Partial<PageSection> }) => {
      const { error } = await supabase
        .from('page_sections')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['page-sections', vars.pageId] }),
  });
};

export const useDeletePageSection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pageId }: { id: string; pageId: string }) => {
      const { error } = await supabase
        .from('page_sections')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['page-sections', vars.pageId] }),
  });
};

export const useReorderPageSections = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sections, pageId }: { sections: { id: string; display_order: number }[]; pageId: string }) => {
      for (const s of sections) {
        const { error } = await supabase
          .from('page_sections')
          .update({ display_order: s.display_order } as any)
          .eq('id', s.id);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['page-sections', vars.pageId] }),
  });
};
