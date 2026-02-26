
-- Create coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  description TEXT DEFAULT '',
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL DEFAULT 0,
  min_order_amount NUMERIC DEFAULT 0,
  max_discount_amount NUMERIC DEFAULT NULL,
  usage_limit INTEGER DEFAULT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  per_user_limit INTEGER DEFAULT 1,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  applies_to TEXT NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all', 'selected_products', 'selected_customers', 'new_customers')),
  selected_product_ids JSONB DEFAULT '[]'::jsonb,
  selected_customer_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique code constraint (case-insensitive)
CREATE UNIQUE INDEX coupons_code_unique ON public.coupons (UPPER(code));

-- Track coupon usage per user
CREATE TABLE public.coupon_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_coupon_usage_coupon_user ON public.coupon_usage (coupon_id, user_id);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

-- Admins manage coupons
CREATE POLICY "Admins manage coupons" ON public.coupons FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Public can read active coupons (needed for checkout validation)
CREATE POLICY "Active coupons are public read" ON public.coupons FOR SELECT USING (is_active = true);

-- Admins manage coupon usage
CREATE POLICY "Admins manage coupon usage" ON public.coupon_usage FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can insert their own usage
CREATE POLICY "Users insert own coupon usage" ON public.coupon_usage FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view own usage
CREATE POLICY "Users view own coupon usage" ON public.coupon_usage FOR SELECT USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
