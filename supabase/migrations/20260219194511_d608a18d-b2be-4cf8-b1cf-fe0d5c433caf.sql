
-- Add payment_status to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending';

-- Add is_blocked and blocked_ip to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked_ip text;

-- Create role_permissions table for granular RBAC
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  permission text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(role, permission)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage permissions"
ON public.role_permissions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view permissions"
ON public.role_permissions FOR SELECT
USING (
  has_role(auth.uid(), 'sales_manager'::app_role) OR
  has_role(auth.uid(), 'account_manager'::app_role) OR
  has_role(auth.uid(), 'support_assistant'::app_role)
);

-- Create activity_logs table
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text,
  user_role text,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  details text,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage logs"
ON public.activity_logs FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view logs"
ON public.activity_logs FOR SELECT
USING (
  has_role(auth.uid(), 'sales_manager'::app_role) OR
  has_role(auth.uid(), 'account_manager'::app_role) OR
  has_role(auth.uid(), 'support_assistant'::app_role)
);

CREATE POLICY "Authenticated users can insert logs"
ON public.activity_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Seed default permissions for each staff role
INSERT INTO public.role_permissions (role, permission, enabled) VALUES
-- Sales Manager defaults
('sales_manager', 'product_add', true),
('sales_manager', 'product_edit', true),
('sales_manager', 'product_delete', false),
('sales_manager', 'category_add', true),
('sales_manager', 'category_edit', true),
('sales_manager', 'category_delete', false),
('sales_manager', 'order_manage', true),
('sales_manager', 'order_status_change', true),
('sales_manager', 'order_payment_status_change', false),
('sales_manager', 'revenue_access', true),
('sales_manager', 'shipping_access', false),
('sales_manager', 'blog_add', false),
('sales_manager', 'blog_edit', false),
('sales_manager', 'blog_delete', false),
('sales_manager', 'testimonial_add', false),
('sales_manager', 'testimonial_edit', false),
('sales_manager', 'testimonial_delete', false),
('sales_manager', 'message_access', false),
('sales_manager', 'message_read', false),
('sales_manager', 'message_status_change', false),
('sales_manager', 'message_delete', false),
('sales_manager', 'page_access', false),
('sales_manager', 'customer_view', true),
('sales_manager', 'customer_edit', false),
('sales_manager', 'customer_status_change', false),
('sales_manager', 'customer_delete', false),
-- Account Manager defaults
('account_manager', 'product_add', false),
('account_manager', 'product_edit', false),
('account_manager', 'product_delete', false),
('account_manager', 'category_add', false),
('account_manager', 'category_edit', false),
('account_manager', 'category_delete', false),
('account_manager', 'order_manage', true),
('account_manager', 'order_status_change', true),
('account_manager', 'order_payment_status_change', true),
('account_manager', 'revenue_access', false),
('account_manager', 'shipping_access', false),
('account_manager', 'blog_add', false),
('account_manager', 'blog_edit', false),
('account_manager', 'blog_delete', false),
('account_manager', 'testimonial_add', false),
('account_manager', 'testimonial_edit', false),
('account_manager', 'testimonial_delete', false),
('account_manager', 'message_access', true),
('account_manager', 'message_read', true),
('account_manager', 'message_status_change', true),
('account_manager', 'message_delete', false),
('account_manager', 'page_access', false),
('account_manager', 'customer_view', true),
('account_manager', 'customer_edit', true),
('account_manager', 'customer_status_change', false),
('account_manager', 'customer_delete', false),
-- Support Assistant defaults
('support_assistant', 'product_add', false),
('support_assistant', 'product_edit', false),
('support_assistant', 'product_delete', false),
('support_assistant', 'category_add', false),
('support_assistant', 'category_edit', false),
('support_assistant', 'category_delete', false),
('support_assistant', 'order_manage', true),
('support_assistant', 'order_status_change', false),
('support_assistant', 'order_payment_status_change', false),
('support_assistant', 'revenue_access', false),
('support_assistant', 'shipping_access', false),
('support_assistant', 'blog_add', false),
('support_assistant', 'blog_edit', false),
('support_assistant', 'blog_delete', false),
('support_assistant', 'testimonial_add', false),
('support_assistant', 'testimonial_edit', false),
('support_assistant', 'testimonial_delete', false),
('support_assistant', 'message_access', true),
('support_assistant', 'message_read', true),
('support_assistant', 'message_status_change', true),
('support_assistant', 'message_delete', false),
('support_assistant', 'page_access', false),
('support_assistant', 'customer_view', true),
('support_assistant', 'customer_edit', false),
('support_assistant', 'customer_status_change', false),
('support_assistant', 'customer_delete', false)
ON CONFLICT (role, permission) DO NOTHING;

-- Update existing orders payment_status based on current status
UPDATE public.orders SET payment_status = 'paid' WHERE status IN ('confirmed', 'delivered', 'processing', 'send_to_courier');
UPDATE public.orders SET payment_status = 'unpaid' WHERE status = 'payment_failed';
UPDATE public.orders SET payment_status = 'cod' WHERE payment_method = 'cod' AND payment_status = 'pending';
