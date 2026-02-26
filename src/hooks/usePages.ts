import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Page {
  id: string;
  title: string;
  slug: string;
  content: string;
  page_type: string;
  meta_description: string;
  is_published: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export const usePages = (includeDeleted = false) => {
  return useQuery({
    queryKey: ['pages', includeDeleted],
    queryFn: async () => {
      let query = supabase.from('pages').select('*').order('created_at', { ascending: true });
      if (!includeDeleted) query = query.eq('is_deleted', false);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Page[];
    },
  });
};

export const useCreatePage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (page: { title: string; slug: string; content?: string; page_type?: string }) => {
      const { error } = await supabase.from('pages').insert(page as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pages'] }),
  });
};

export const useUpdatePage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Page> & { id: string }) => {
      const { error } = await supabase.from('pages').update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pages'] }),
  });
};

export const useSoftDeletePage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pages').update({ is_deleted: true, deleted_at: new Date().toISOString() } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pages'] }),
  });
};

export const useRestorePage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pages').update({ is_deleted: false, deleted_at: null } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pages'] }),
  });
};

export const useDeletePagePermanently = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pages'] }),
  });
};
