import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import postgres from 'https://deno.land/x/postgresjs@v3.4.5/mod.js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SCHEMA_SQL = `
-- =============================================
-- ENUMS
-- =============================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'sales_manager', 'account_manager', 'support_assistant', 'marketing_manager');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- FUNCTIONS (create early, used by RLS)
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $fn$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $fn$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
END;
$$;

-- =============================================
-- TABLES
-- =============================================

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  avatar_url TEXT,
  address TEXT,
  city TEXT,
  zip_code TEXT,
  country TEXT,
  country_code TEXT DEFAULT '+880',
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  blocked_ip TEXT,
  last_ip TEXT,
  ip_blocked_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

-- Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  image_url TEXT,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Products
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  short_description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url TEXT,
  gallery JSONB DEFAULT '[]',
  variations JSONB DEFAULT '[]',
  regular_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_price NUMERIC(10,2),
  stock_quantity INT NOT NULL DEFAULT 0,
  stock_status TEXT NOT NULL DEFAULT 'in_stock',
  rating NUMERIC(2,1) DEFAULT 0,
  review_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_address JSONB,
  payment_method TEXT,
  transaction_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  price NUMERIC(10,2) NOT NULL,
  variation JSONB
);

-- Blog Posts
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT,
  image_url TEXT,
  author TEXT DEFAULT 'Admin',
  category TEXT DEFAULT 'General',
  status TEXT NOT NULL DEFAULT 'draft',
  is_published BOOLEAN DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Testimonials
CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT,
  content TEXT NOT NULL,
  rating INT DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contact Messages
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread',
  is_read BOOLEAN DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Product Reviews
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INT NOT NULL DEFAULT 5,
  comment TEXT,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cart Items
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  variation JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Site Settings
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT 'true'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admin Settings
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Shipping Zones
CREATE TABLE IF NOT EXISTS public.shipping_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'flat_rate',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Shipping Rates
CREATE TABLE IF NOT EXISTS public.shipping_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES public.shipping_zones(id) ON DELETE CASCADE,
  area_name TEXT,
  country TEXT,
  min_order_amount NUMERIC DEFAULT 0,
  rate NUMERIC NOT NULL DEFAULT 0,
  free_shipping_threshold NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Role Permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  permission TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role, permission)
);

-- Activity Logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_name TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  ip_address TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Variants
CREATE TABLE IF NOT EXISTS public.variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Homepage Sections
CREATE TABLE IF NOT EXISTS public.homepage_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT DEFAULT '',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  layout_type TEXT NOT NULL DEFAULT 'grid',
  product_source TEXT DEFAULT 'latest',
  selected_ids JSONB DEFAULT '[]'::jsonb,
  item_limit INT DEFAULT 4,
  settings_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email Templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'custom',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email Campaigns
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  recipient_group TEXT NOT NULL DEFAULT 'all',
  recipient_ids TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  sent_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  total_count INT DEFAULT 0,
  pending_count INT DEFAULT 0,
  send_interval_minutes INT DEFAULT 1,
  is_paused BOOLEAN DEFAULT false,
  error_log TEXT DEFAULT '',
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pages
CREATE TABLE IF NOT EXISTS public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT DEFAULT '',
  page_type TEXT NOT NULL DEFAULT 'custom',
  meta_description TEXT DEFAULT '',
  is_published BOOLEAN NOT NULL DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Page Sections
CREATE TABLE IF NOT EXISTS public.page_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL DEFAULT 'text_block',
  title TEXT NOT NULL DEFAULT '',
  display_order INT NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  settings_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  description TEXT DEFAULT '',
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL DEFAULT 0,
  min_order_amount NUMERIC DEFAULT 0,
  max_discount_amount NUMERIC DEFAULT NULL,
  usage_limit INT DEFAULT NULL,
  usage_count INT NOT NULL DEFAULT 0,
  per_user_limit INT DEFAULT 1,
  start_date TIMESTAMPTZ DEFAULT now(),
  end_date TIMESTAMPTZ DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  applies_to TEXT NOT NULL DEFAULT 'all',
  selected_product_ids JSONB DEFAULT '[]'::jsonb,
  selected_customer_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Coupon Usage
CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_unique ON public.coupons (UPPER(code));
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_user ON public.coupon_usage (coupon_id, user_id);
CREATE INDEX IF NOT EXISTS idx_page_sections_page_id ON public.page_sections(page_id);
CREATE INDEX IF NOT EXISTS idx_page_sections_order ON public.page_sections(page_id, display_order);

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

-- =============================================
-- FUNCTIONS (that depend on tables)
-- =============================================
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role::text
    WHERE ur.user_id = _user_id AND rp.permission = _permission AND rp.enabled = true
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone, country_code, country)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'country_code', '+880'),
    COALESCE(NEW.raw_user_meta_data->>'country', '')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_enabled_payment_methods()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'sslcommerz', jsonb_build_object('enabled', COALESCE((value->'sslcommerz'->>'enabled')::boolean, false)),
    'bkash', jsonb_build_object('enabled', COALESCE((value->'bkash'->>'enabled')::boolean, false)),
    'nagad', jsonb_build_object('enabled', COALESCE((value->'nagad'->>'enabled')::boolean, false)),
    'cod', jsonb_build_object('enabled', COALESCE((value->'cod'->>'enabled')::boolean, false)),
    'paypal', jsonb_build_object(
      'enabled', COALESCE((value->'paypal'->>'enabled')::boolean, false),
      'client_id', COALESCE(value->'paypal'->>'client_id', ''),
      'sandbox', COALESCE((value->'paypal'->>'sandbox')::boolean, true)
    ),
    'stripe', jsonb_build_object('enabled', COALESCE((value->'stripe'->>'enabled')::boolean, false)),
    'manual_payment', jsonb_build_object(
      'enabled', COALESCE((value->'manual_payment'->>'enabled')::boolean, false),
      'gateway_name', COALESCE(value->'manual_payment'->>'gateway_name', 'Manual Payment'),
      'description', COALESCE(value->'manual_payment'->>'description', ''),
      'instruction', COALESCE(value->'manual_payment'->>'instruction', ''),
      'accounts', COALESCE(value->'manual_payment'->'accounts', '[]'::jsonb)
    )
  )
  FROM public.admin_settings WHERE key = 'payment_methods' LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.find_order_by_partial_id(partial_id text)
RETURNS SETOF orders LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.orders WHERE id::text ILIKE partial_id || '%' LIMIT 1;
$$;

-- =============================================
-- TRIGGER: on_auth_user_created
-- =============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_shipping_zones_updated_at ON public.shipping_zones;
CREATE TRIGGER update_shipping_zones_updated_at BEFORE UPDATE ON public.shipping_zones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_variants_updated_at ON public.variants;
CREATE TRIGGER update_variants_updated_at BEFORE UPDATE ON public.variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_homepage_sections_updated_at ON public.homepage_sections;
CREATE TRIGGER update_homepage_sections_updated_at BEFORE UPDATE ON public.homepage_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_email_templates_updated_at ON public.email_templates;
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_email_campaigns_updated_at ON public.email_campaigns;
CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON public.email_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_admin_settings_updated_at ON public.admin_settings;
CREATE TRIGGER update_admin_settings_updated_at BEFORE UPDATE ON public.admin_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_coupons_updated_at ON public.coupons;
CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_page_sections_updated_at ON public.page_sections;
CREATE TRIGGER update_page_sections_updated_at BEFORE UPDATE ON public.page_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
`;

const RLS_POLICIES_SQL = `
-- =============================================
-- RLS POLICIES
-- =============================================

-- Profiles
DO $$ BEGIN CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Staff view customer profiles" ON public.profiles FOR SELECT USING (public.has_permission(auth.uid(), 'customer_view')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Staff update customer profiles" ON public.profiles FOR UPDATE USING (public.has_permission(auth.uid(), 'customer_edit') OR public.has_permission(auth.uid(), 'customer_status_change')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Marketing managers view profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'marketing_manager')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- User Roles
DO $$ BEGIN CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Staff view user roles" ON public.user_roles FOR SELECT USING (public.has_permission(auth.uid(), 'customer_view')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Categories
DO $$ BEGIN CREATE POLICY "Categories are public" ON public.categories FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins manage categories" ON public.categories FOR ALL USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Staff manage categories" ON public.categories FOR ALL USING (public.has_permission(auth.uid(), 'category_view') OR public.has_permission(auth.uid(), 'category_edit') OR public.has_permission(auth.uid(), 'category_add') OR public.has_permission(auth.uid(), 'category_delete')) WITH CHECK (public.has_permission(auth.uid(), 'category_add') OR public.has_permission(auth.uid(), 'category_edit')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Products
DO $$ BEGIN CREATE POLICY "Products are public" ON public.products FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins manage products" ON public.products FOR ALL USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Staff manage products" ON public.products FOR ALL USING (public.has_permission(auth.uid(), 'product_view') OR public.has_permission(auth.uid(), 'product_edit') OR public.has_permission(auth.uid(), 'product_add') OR public.has_permission(auth.uid(), 'product_delete')) WITH CHECK (public.has_permission(auth.uid(), 'product_add') OR public.has_permission(auth.uid(), 'product_edit')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Marketing managers view products" ON public.products FOR SELECT USING (public.has_role(auth.uid(), 'marketing_manager')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Orders
DO $$ BEGIN CREATE POLICY "Users view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins manage orders" ON public.orders FOR ALL USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Staff manage orders" ON public.orders FOR ALL USING (public.has_permission(auth.uid(), 'order_view') OR public.has_permission(auth.uid(), 'order_manage') OR public.has_permission(auth.uid(), 'order_status_change') OR public.has_permission(auth.uid(), 'order_delete')) WITH CHECK (public.has_permission(auth.uid(), 'order_manage') OR public.has_permission(auth.uid(), 'order_status_change')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Order Items
DO $$ BEGIN CREATE POLICY "Users view own order items" ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users create order items" ON public.order_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins manage order items" ON public.order_items FOR ALL USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Staff view order items" ON public.order_items FOR SELECT USING (public.has_permission(auth.uid(), 'order_view') OR public.has_permission(auth.uid(), 'order_manage')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Blog Posts
DO $$ BEGIN CREATE POLICY "Published blogs are public" ON public.blog_posts FOR SELECT USING (is_published = true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins manage blogs" ON public.blog_posts FOR ALL USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Marketing managers manage blogs" ON public.blog_posts FOR ALL USING (public.has_role(auth.uid(), 'marketing_manager')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Staff manage blogs" ON public.blog_posts FOR ALL USING (public.has_permission(auth.uid(), 'blog_view') OR public.has_permission(auth.uid(), 'blog_edit') OR public.has_permission(auth.uid(), 'blog_add') OR public.has_permission(auth.uid(), 'blog_delete')) WITH CHECK (public.has_permission(auth.uid(), 'blog_add') OR public.has_permission(auth.uid(), 'blog_edit')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Testimonials
DO $$ BEGIN CREATE POLICY "Active testimonials are public" ON public.testimonials FOR SELECT USING (is_active = true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins manage testimonials" ON public.testimonials FOR ALL USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Staff manage testimonials" ON public.testimonials FOR ALL USING (public.has_permission(auth.uid(), 'testimonial_view') OR public.has_permission(auth.uid(), 'testimonial_edit') OR public.has_permission(auth.uid(), 'testimonial_add') OR public.has_permission(auth.uid(), 'testimonial_delete')) WITH CHECK (public.has_permission(auth.uid(), 'testimonial_add') OR public.has_permission(auth.uid(), 'testimonial_edit')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Contact Messages
DO $$ BEGIN CREATE POLICY "Anyone can submit contact" ON public.contact_messages FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins manage contacts" ON public.contact_messages FOR ALL USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Staff manage contacts" ON public.contact_messages FOR ALL USING (public.has_permission(auth.uid(), 'message_access') OR public.has_permission(auth.uid(), 'message_read') OR public.has_permission(auth.uid(), 'message_status_change') OR public.has_permission(auth.uid(), 'message_delete')) WITH CHECK (public.has_permission(auth.uid(), 'message_status_change')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Product Reviews
DO $$ BEGIN CREATE POLICY "Approved reviews are public" ON public.product_reviews FOR SELECT USING (is_approved = true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users create reviews" ON public.product_reviews FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins manage reviews" ON public.product_reviews FOR ALL USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Staff view reviews" ON public.product_reviews FOR SELECT USING (public.has_permission(auth.uid(), 'product_view')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Cart Items
DO $$ BEGIN CREATE POLICY "Users manage own cart" ON public.cart_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Site Settings
DO $$ BEGIN CREATE POLICY "Settings are public read" ON public.site_settings FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins manage settings" ON public.site_settings FOR ALL USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Staff manage site settings" ON public.site_settings FOR ALL USING (public.has_permission(auth.uid(), 'settings_access') OR public.has_permission(auth.uid(), 'settings_general')) WITH CHECK (public.has_permission(auth.uid(), 'settings_general')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admin Settings
DO $$ BEGIN CREATE POLICY "Admins manage admin settings" ON public.admin_settings FOR ALL USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Staff view admin settings" ON public.admin_settings FOR SELECT USING (public.has_permission(auth.uid(), 'settings_access')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Shipping Zones
DO $$ BEGIN CREATE POLICY "Admins manage shipping zones" ON public.shipping_zones FOR ALL USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Shipping zones public read" ON public.shipping_zones FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Staff manage shipping zones" ON public.shipping_zones FOR ALL USING (public.has_permission(auth.uid(), 'shipping_access') OR public.has_permission(auth.uid(), 'shipping_manage')) WITH CHECK (public.has_permission(auth.uid(), 'shipping_manage')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Shipping Rates
DO $$ BEGIN CREATE POLICY "Admins manage shipping rates" ON public.shipping_rates FOR ALL USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Shipping rates public read" ON public.shipping_rates FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Staff manage shipping rates" ON public.shipping_rates FOR ALL USING (public.has_permission(auth.uid(), 'shipping_access') OR public.has_permission(auth.uid(), 'shipping_manage')) WITH CHECK (public.has_permission(auth.uid(), 'shipping_manage')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Role Permissions
DO $$ BEGIN CREATE POLICY "Admins manage permissions" ON public.role_permissions FOR ALL USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Staff can view permissions" ON public.role_permissions FOR SELECT USING (public.has_role(auth.uid(), 'sales_manager') OR public.has_role(auth.uid(), 'account_manager') OR public.has_role(auth.uid(), 'support_assistant') OR public.has_role(auth.uid(), 'marketing_manager')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Activity Logs
DO $$ BEGIN CREATE POLICY "Admins manage logs" ON public.activity_logs FOR ALL USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Staff can view logs" ON public.activity_logs FOR SELECT USING (public.has_role(auth.uid(), 'sales_manager') OR public.has_role(auth.uid(), 'account_manager') OR public.has_role(auth.uid(), 'support_assistant')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Authenticated users can insert logs" ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Marketing managers view logs" ON public.activity_logs FOR SELECT USING (public.has_role(auth.uid(), 'marketing_manager')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Marketing managers insert logs" ON public.activity_logs FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'marketing_manager') AND auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Staff with logs permission view logs" ON public.activity_logs FOR SELECT USING (public.has_permission(auth.uid(), 'logs_access')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Variants
DO $$ BEGIN CREATE POLICY "Admins manage variants" ON public.variants FOR ALL USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Variants are public read" ON public.variants FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Staff manage variants" ON public.variants FOR ALL USING (public.has_permission(auth.uid(), 'variant_view') OR public.has_permission(auth.uid(), 'variant_edit') OR public.has_permission(auth.uid(), 'variant_add') OR public.has_permission(auth.uid(), 'variant_delete')) WITH CHECK (public.has_permission(auth.uid(), 'variant_add') OR public.has_permission(auth.uid(), 'variant_edit')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Homepage Sections
DO $$ BEGIN CREATE POLICY "Homepage sections are public read" ON public.homepage_sections FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins manage homepage sections" ON public.homepage_sections FOR ALL USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Marketing managers manage homepage" ON public.homepage_sections FOR ALL USING (public.has_role(auth.uid(), 'marketing_manager')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Staff manage homepage sections" ON public.homepage_sections FOR ALL USING (public.has_permission(auth.uid(), 'page_access') OR public.has_permission(auth.uid(), 'page_edit')) WITH CHECK (public.has_permission(auth.uid(), 'page_edit')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Email Templates
DO $$ BEGIN CREATE POLICY "Admins manage email templates" ON public.email_templates FOR ALL USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Marketing managers manage email templates" ON public.email_templates FOR ALL USING (public.has_role(auth.uid(), 'marketing_manager')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Staff manage email templates" ON public.email_templates FOR ALL USING (public.has_permission(auth.uid(), 'marketing_access') OR public.has_permission(auth.uid(), 'marketing_template_manage')) WITH CHECK (public.has_permission(auth.uid(), 'marketing_template_manage')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Email Campaigns
DO $$ BEGIN CREATE POLICY "Admins manage campaigns" ON public.email_campaigns FOR ALL USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Marketing managers manage campaigns" ON public.email_campaigns FOR ALL USING (public.has_role(auth.uid(), 'marketing_manager')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Staff manage campaigns" ON public.email_campaigns FOR ALL USING (public.has_permission(auth.uid(), 'marketing_access') OR public.has_permission(auth.uid(), 'marketing_campaign_create') OR public.has_permission(auth.uid(), 'marketing_campaign_send')) WITH CHECK (public.has_permission(auth.uid(), 'marketing_campaign_create') OR public.has_permission(auth.uid(), 'marketing_campaign_send')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Pages
DO $$ BEGIN CREATE POLICY "Admins manage pages" ON public.pages FOR ALL USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Published pages are public read" ON public.pages FOR SELECT USING (is_published = true AND is_deleted = false); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Staff manage pages" ON public.pages FOR ALL USING (public.has_permission(auth.uid(), 'page_access') OR public.has_permission(auth.uid(), 'page_edit') OR public.has_permission(auth.uid(), 'page_add') OR public.has_permission(auth.uid(), 'page_delete')) WITH CHECK (public.has_permission(auth.uid(), 'page_add') OR public.has_permission(auth.uid(), 'page_edit')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Page Sections
DO $$ BEGIN CREATE POLICY "Admins manage page sections" ON public.page_sections FOR ALL USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Published page sections are public read" ON public.page_sections FOR SELECT USING (EXISTS (SELECT 1 FROM public.pages WHERE pages.id = page_sections.page_id AND pages.is_published = true AND pages.is_deleted = false)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Staff manage page sections" ON public.page_sections FOR ALL USING (public.has_permission(auth.uid(), 'page_access') OR public.has_permission(auth.uid(), 'page_edit')) WITH CHECK (public.has_permission(auth.uid(), 'page_edit') OR public.has_permission(auth.uid(), 'page_add')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Coupons
DO $$ BEGIN CREATE POLICY "Admins manage coupons" ON public.coupons FOR ALL USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Active coupons are public read" ON public.coupons FOR SELECT USING (is_active = true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Marketing managers manage coupons" ON public.coupons FOR ALL USING (public.has_role(auth.uid(), 'marketing_manager')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Staff manage coupons" ON public.coupons FOR ALL USING (public.has_permission(auth.uid(), 'coupon_view') OR public.has_permission(auth.uid(), 'coupon_edit') OR public.has_permission(auth.uid(), 'coupon_add') OR public.has_permission(auth.uid(), 'coupon_delete')) WITH CHECK (public.has_permission(auth.uid(), 'coupon_add') OR public.has_permission(auth.uid(), 'coupon_edit')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Coupon Usage
DO $$ BEGIN CREATE POLICY "Admins manage coupon usage" ON public.coupon_usage FOR ALL USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users insert own coupon usage" ON public.coupon_usage FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users view own coupon usage" ON public.coupon_usage FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Staff view coupon usage" ON public.coupon_usage FOR SELECT USING (public.has_permission(auth.uid(), 'coupon_view')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================
-- STORAGE BUCKETS
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-screenshots', 'payment-screenshots', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies
DO $$ BEGIN CREATE POLICY "Users can upload payment screenshots" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'payment-screenshots' AND auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Payment screenshots are publicly readable" ON storage.objects FOR SELECT USING (bucket_id = 'payment-screenshots'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can delete payment screenshots" ON storage.objects FOR DELETE USING (bucket_id = 'payment-screenshots' AND public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Media images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'media'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can upload media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can delete media" ON storage.objects FOR DELETE USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can update media" ON storage.objects FOR UPDATE USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Staff can upload media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media' AND public.has_permission(auth.uid(), 'media_upload')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Staff can delete media" ON storage.objects FOR DELETE USING (bucket_id = 'media' AND public.has_permission(auth.uid(), 'media_delete')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Staff can update media" ON storage.objects FOR UPDATE USING (bucket_id = 'media' AND public.has_permission(auth.uid(), 'media_upload')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================
-- SEED DATA
-- =============================================

-- Default homepage sections
INSERT INTO public.homepage_sections (section_key, title, subtitle, is_enabled, display_order, layout_type, product_source, item_limit, settings_json) VALUES
('hero', 'Hero', '', true, 0, 'slider', null, null, '{}'::jsonb),
('featured_products', 'Featured Products', 'Handpicked premium products for you', true, 1, 'grid', 'latest', 4, '{"show_ratings": true, "show_discount_badge": true}'::jsonb),
('categories', 'Featured Categories', 'Explore our curated collection', true, 2, 'grid', null, 6, '{}'::jsonb),
('flash_sale', 'Flash Sale', 'Limited time offers!', false, 3, 'grid', 'manual', 4, '{"end_date": "", "auto_hide_expired": true}'::jsonb),
('why_choose_us', 'Why Choose Us', 'What sets us apart', true, 4, 'grid', null, 4, '{}'),
('blog', 'Latest from Our Blog', 'Tips and insights', true, 5, 'grid', null, 3, '{}'),
('testimonials', 'What Our Clients Say', 'Trusted by businesses worldwide', true, 6, 'slider', null, null, '{}'),
('partners', 'Trusted by Leading Brands', '', true, 7, 'horizontal', null, null, '{}'),
('cta', 'Ready to Get Started?', 'Browse our premium product catalog.', true, 8, 'default', null, null, '{}')
ON CONFLICT (section_key) DO NOTHING;

-- Default pages
INSERT INTO public.pages (title, slug, content, page_type) VALUES
('About Us', 'about', '', 'about'),
('Terms & Conditions', 'terms', '', 'terms'),
('Privacy Policy', 'privacy-policy', '', 'privacy'),
('Return Policy', 'return-policy', '', 'returns'),
('FAQ', 'faq', '', 'faq')
ON CONFLICT (slug) DO NOTHING;

-- Default shipping zone
INSERT INTO public.shipping_zones (name, type)
SELECT 'Standard Shipping', 'flat_rate'
WHERE NOT EXISTS (SELECT 1 FROM public.shipping_zones LIMIT 1);
`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const body = await req.json()
    const { db_url, admin_email, admin_password, admin_name, site_title, site_description, site_logo, currency_code, currency_symbol, currency_position, smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, payment_methods } = body

    // Use db_url from request body (wizard UI), fallback to env var
    const dbUrl = db_url || Deno.env.get('SUPABASE_DB_URL')
    if (!dbUrl) {
      return new Response(JSON.stringify({ error: 'Database URL is required. Please provide it in the installation form.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if already installed
    let alreadyInstalled = false
    try {
      const { data: existing } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'installed')
        .maybeSingle()
      if (existing?.value === true) {
        alreadyInstalled = true
      }
    } catch {
      // Table doesn't exist yet, that's fine - we'll create it
    }

    if (alreadyInstalled) {
      return new Response(JSON.stringify({ error: 'Already installed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!admin_email || !admin_password || !admin_name) {
      return new Response(JSON.stringify({ error: 'Admin email, password, and name are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ========================================
    // STEP 1: Create all tables via direct SQL
    // ========================================
    console.log('Step 1: Creating database schema...')
    const sql = postgres(dbUrl, { max: 1 })
    
    try {
      // Run schema creation
      await sql.unsafe(SCHEMA_SQL)
      console.log('Schema created successfully')
      
      // Run RLS policies
      await sql.unsafe(RLS_POLICIES_SQL)
      console.log('RLS policies and seed data created successfully')
    } catch (dbErr: any) {
      console.error('DB schema error:', dbErr.message)
      // Continue even if some already exist
    } finally {
      await sql.end()
    }

    // ========================================
    // STEP 2: Create admin user
    // ========================================
    console.log('Step 2: Creating admin user...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: admin_email,
      password: admin_password,
      email_confirm: true,
      user_metadata: { full_name: admin_name },
    })

    if (authError) {
      return new Response(JSON.stringify({ error: `Failed to create admin: ${authError.message}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = authData.user.id

    // ========================================
    // STEP 3: Set admin role (trigger creates 'user', we update to 'admin')
    // ========================================
    console.log('Step 3: Setting admin role...')
    await new Promise(r => setTimeout(r, 1500))
    await supabase.from('user_roles').update({ role: 'admin' }).eq('user_id', userId)

    // ========================================
    // STEP 4: Set site settings
    // ========================================
    console.log('Step 4: Setting site settings...')
    const settingsToUpsert = [
      { key: 'site_title', value: site_title || 'CommerceX' },
      { key: 'site_description', value: site_description || '' },
      { key: 'site_logo_url', value: site_logo || '' },
      { key: 'currency_settings', value: { code: currency_code || 'BDT', symbol: currency_symbol || '৳', position: currency_position || 'before' } },
      { key: 'payment_enabled', value: true },
      { key: 'buy_now_enabled', value: true },
      { key: 'maintenance_mode', value: false },
      { key: 'whatsapp_enabled', value: false },
      { key: 'installed', value: true },
    ]

    for (const s of settingsToUpsert) {
      await supabase.from('site_settings').upsert(
        { key: s.key, value: s.value as any },
        { onConflict: 'key' }
      )
    }

    // ========================================
    // STEP 5: Payment methods
    // ========================================
    if (payment_methods) {
      await supabase.from('admin_settings').upsert(
        { key: 'payment_methods', value: payment_methods as any },
        { onConflict: 'key' }
      )
    }

    // ========================================
    // STEP 6: SMTP settings
    // ========================================
    if (smtp_host) {
      await supabase.from('admin_settings').upsert(
        {
          key: 'smtp_settings',
          value: {
            host: smtp_host,
            port: smtp_port || '587',
            user: smtp_user || '',
            password: smtp_password || '',
            from_email: smtp_from_email || admin_email,
          } as any,
        },
        { onConflict: 'key' }
      )
    }

    // ========================================
    // STEP 7: Default role permissions
    // ========================================
    console.log('Step 7: Setting up permissions...')
    const { data: existingPerms } = await supabase.from('role_permissions').select('id').limit(1)
    if (!existingPerms || existingPerms.length === 0) {
      const defaultPermissions = [
        'product_view', 'product_add', 'product_edit', 'product_delete',
        'order_view', 'order_manage', 'order_status_change', 'order_delete',
        'customer_view', 'customer_edit', 'customer_status_change',
        'category_view', 'category_add', 'category_edit', 'category_delete',
        'blog_view', 'blog_add', 'blog_edit', 'blog_delete',
        'testimonial_view', 'testimonial_add', 'testimonial_edit', 'testimonial_delete',
        'message_access', 'message_read', 'message_status_change', 'message_delete',
        'settings_access', 'settings_general',
        'page_access', 'page_add', 'page_edit', 'page_delete',
        'coupon_view', 'coupon_add', 'coupon_edit', 'coupon_delete',
        'shipping_access', 'shipping_manage',
        'variant_view', 'variant_add', 'variant_edit', 'variant_delete',
        'marketing_access', 'marketing_campaign_create', 'marketing_campaign_send', 'marketing_template_manage',
        'logs_access', 'media_access',
      ]
      const roles = ['sales_manager', 'account_manager', 'support_assistant', 'marketing_manager']
      const permInserts = []
      for (const role of roles) {
        for (const perm of defaultPermissions) {
          permInserts.push({ role, permission: perm, enabled: false })
        }
      }
      await supabase.from('role_permissions').insert(permInserts)
    }

    console.log('Installation complete!')
    return new Response(JSON.stringify({ success: true, message: 'Installation complete! All tables, policies, and settings have been created.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('Installation error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
