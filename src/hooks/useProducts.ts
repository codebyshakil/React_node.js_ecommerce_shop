import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DbProduct {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  category_id: string | null;
  image_url: string | null;
  gallery: any;
  regular_price: number;
  discount_price: number | null;
  stock_status: string;
  stock_quantity: number;
  rating: number | null;
  review_count: number | null;
  variations: any;
  is_active: boolean | null;
  category?: { id: string; name: string; slug: string } | null;
}

export const useProducts = (categorySlug?: string | null) => {
  return useQuery({
    queryKey: ['products', categorySlug],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*, category:categories(id, name, slug)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (categorySlug) {
        const { data: cat } = await supabase.from('categories').select('id').eq('slug', categorySlug).maybeSingle();
        if (cat) {
          query = query.eq('category_id', cat.id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as DbProduct[];
    },
  });
};

export const useProduct = (slug: string) => {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(id, name, slug)')
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      return data as DbProduct | null;
    },
    enabled: !!slug,
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useTestimonials = () => {
  return useQuery({
    queryKey: ['testimonials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useBlogPosts = () => {
  return useQuery({
    queryKey: ['blog_posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};
