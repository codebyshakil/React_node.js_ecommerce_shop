
-- 1. Create a function to check if a user has a specific permission via role_permissions table
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role::text
    WHERE ur.user_id = _user_id
      AND rp.permission = _permission
      AND rp.enabled = true
  )
$$;

-- 2. Fix: Add marketing_manager to role_permissions SELECT policy
DROP POLICY IF EXISTS "Staff can view permissions" ON public.role_permissions;
CREATE POLICY "Staff can view permissions"
ON public.role_permissions FOR SELECT
USING (
  has_role(auth.uid(), 'sales_manager'::app_role) OR
  has_role(auth.uid(), 'account_manager'::app_role) OR
  has_role(auth.uid(), 'support_assistant'::app_role) OR
  has_role(auth.uid(), 'marketing_manager'::app_role)
);

-- 3. Products: allow staff with product permissions
CREATE POLICY "Staff manage products"
ON public.products FOR ALL
USING (
  has_permission(auth.uid(), 'product_view') OR
  has_permission(auth.uid(), 'product_edit') OR
  has_permission(auth.uid(), 'product_add') OR
  has_permission(auth.uid(), 'product_delete')
)
WITH CHECK (
  has_permission(auth.uid(), 'product_add') OR
  has_permission(auth.uid(), 'product_edit')
);

-- 4. Categories: allow staff with category permissions
CREATE POLICY "Staff manage categories"
ON public.categories FOR ALL
USING (
  has_permission(auth.uid(), 'category_view') OR
  has_permission(auth.uid(), 'category_edit') OR
  has_permission(auth.uid(), 'category_add') OR
  has_permission(auth.uid(), 'category_delete')
)
WITH CHECK (
  has_permission(auth.uid(), 'category_add') OR
  has_permission(auth.uid(), 'category_edit')
);

-- 5. Orders: allow staff with order permissions
CREATE POLICY "Staff manage orders"
ON public.orders FOR ALL
USING (
  has_permission(auth.uid(), 'order_view') OR
  has_permission(auth.uid(), 'order_manage') OR
  has_permission(auth.uid(), 'order_status_change') OR
  has_permission(auth.uid(), 'order_delete')
)
WITH CHECK (
  has_permission(auth.uid(), 'order_manage') OR
  has_permission(auth.uid(), 'order_status_change')
);

-- 6. Order items: allow staff with order permissions
CREATE POLICY "Staff view order items"
ON public.order_items FOR SELECT
USING (
  has_permission(auth.uid(), 'order_view') OR
  has_permission(auth.uid(), 'order_manage')
);

-- 7. Variants: allow staff with variant permissions
CREATE POLICY "Staff manage variants"
ON public.variants FOR ALL
USING (
  has_permission(auth.uid(), 'variant_view') OR
  has_permission(auth.uid(), 'variant_edit') OR
  has_permission(auth.uid(), 'variant_add') OR
  has_permission(auth.uid(), 'variant_delete')
)
WITH CHECK (
  has_permission(auth.uid(), 'variant_add') OR
  has_permission(auth.uid(), 'variant_edit')
);

-- 8. Blog posts: allow staff with blog permissions
CREATE POLICY "Staff manage blogs"
ON public.blog_posts FOR ALL
USING (
  has_permission(auth.uid(), 'blog_view') OR
  has_permission(auth.uid(), 'blog_edit') OR
  has_permission(auth.uid(), 'blog_add') OR
  has_permission(auth.uid(), 'blog_delete')
)
WITH CHECK (
  has_permission(auth.uid(), 'blog_add') OR
  has_permission(auth.uid(), 'blog_edit')
);

-- 9. Testimonials: allow staff with testimonial permissions
CREATE POLICY "Staff manage testimonials"
ON public.testimonials FOR ALL
USING (
  has_permission(auth.uid(), 'testimonial_view') OR
  has_permission(auth.uid(), 'testimonial_edit') OR
  has_permission(auth.uid(), 'testimonial_add') OR
  has_permission(auth.uid(), 'testimonial_delete')
)
WITH CHECK (
  has_permission(auth.uid(), 'testimonial_add') OR
  has_permission(auth.uid(), 'testimonial_edit')
);

-- 10. Contact messages: allow staff with message permissions
CREATE POLICY "Staff manage contacts"
ON public.contact_messages FOR ALL
USING (
  has_permission(auth.uid(), 'message_access') OR
  has_permission(auth.uid(), 'message_read') OR
  has_permission(auth.uid(), 'message_status_change') OR
  has_permission(auth.uid(), 'message_delete')
)
WITH CHECK (
  has_permission(auth.uid(), 'message_status_change')
);

-- 11. Coupons: allow staff with coupon permissions
CREATE POLICY "Staff manage coupons"
ON public.coupons FOR ALL
USING (
  has_permission(auth.uid(), 'coupon_view') OR
  has_permission(auth.uid(), 'coupon_edit') OR
  has_permission(auth.uid(), 'coupon_add') OR
  has_permission(auth.uid(), 'coupon_delete')
)
WITH CHECK (
  has_permission(auth.uid(), 'coupon_add') OR
  has_permission(auth.uid(), 'coupon_edit')
);

-- 12. Profiles: allow staff with customer permissions
CREATE POLICY "Staff view customer profiles"
ON public.profiles FOR SELECT
USING (has_permission(auth.uid(), 'customer_view'));

CREATE POLICY "Staff update customer profiles"
ON public.profiles FOR UPDATE
USING (
  has_permission(auth.uid(), 'customer_edit') OR
  has_permission(auth.uid(), 'customer_status_change')
);

-- 13. Pages: allow staff with page permissions
CREATE POLICY "Staff manage pages"
ON public.pages FOR ALL
USING (
  has_permission(auth.uid(), 'page_access') OR
  has_permission(auth.uid(), 'page_edit') OR
  has_permission(auth.uid(), 'page_add') OR
  has_permission(auth.uid(), 'page_delete')
)
WITH CHECK (
  has_permission(auth.uid(), 'page_add') OR
  has_permission(auth.uid(), 'page_edit')
);

-- 14. Page sections: allow staff with page permissions
CREATE POLICY "Staff manage page sections"
ON public.page_sections FOR ALL
USING (
  has_permission(auth.uid(), 'page_access') OR
  has_permission(auth.uid(), 'page_edit')
)
WITH CHECK (
  has_permission(auth.uid(), 'page_edit') OR
  has_permission(auth.uid(), 'page_add')
);

-- 15. Homepage sections: allow staff with relevant permissions
CREATE POLICY "Staff manage homepage sections"
ON public.homepage_sections FOR ALL
USING (
  has_permission(auth.uid(), 'page_access') OR
  has_permission(auth.uid(), 'page_edit')
)
WITH CHECK (has_permission(auth.uid(), 'page_edit'));

-- 16. User roles: allow staff with customer_view to see roles
CREATE POLICY "Staff view user roles"
ON public.user_roles FOR SELECT
USING (has_permission(auth.uid(), 'customer_view'));

-- 17. Settings: allow staff with settings permissions
CREATE POLICY "Staff view admin settings"
ON public.admin_settings FOR SELECT
USING (has_permission(auth.uid(), 'settings_access'));

CREATE POLICY "Staff manage site settings"
ON public.site_settings FOR ALL
USING (
  has_permission(auth.uid(), 'settings_access') OR
  has_permission(auth.uid(), 'settings_general')
)
WITH CHECK (has_permission(auth.uid(), 'settings_general'));

-- 18. Email campaigns: allow staff with marketing permissions
CREATE POLICY "Staff manage campaigns"
ON public.email_campaigns FOR ALL
USING (
  has_permission(auth.uid(), 'marketing_access') OR
  has_permission(auth.uid(), 'marketing_campaign_create') OR
  has_permission(auth.uid(), 'marketing_campaign_send')
)
WITH CHECK (
  has_permission(auth.uid(), 'marketing_campaign_create') OR
  has_permission(auth.uid(), 'marketing_campaign_send')
);

-- 19. Email templates: allow staff with marketing permissions
CREATE POLICY "Staff manage email templates"
ON public.email_templates FOR ALL
USING (
  has_permission(auth.uid(), 'marketing_access') OR
  has_permission(auth.uid(), 'marketing_template_manage')
)
WITH CHECK (has_permission(auth.uid(), 'marketing_template_manage'));

-- 20. Shipping: allow staff with shipping permissions
CREATE POLICY "Staff manage shipping zones"
ON public.shipping_zones FOR ALL
USING (
  has_permission(auth.uid(), 'shipping_access') OR
  has_permission(auth.uid(), 'shipping_manage')
)
WITH CHECK (has_permission(auth.uid(), 'shipping_manage'));

CREATE POLICY "Staff manage shipping rates"
ON public.shipping_rates FOR ALL
USING (
  has_permission(auth.uid(), 'shipping_access') OR
  has_permission(auth.uid(), 'shipping_manage')
)
WITH CHECK (has_permission(auth.uid(), 'shipping_manage'));

-- 21. Activity logs: allow staff with logs permission
CREATE POLICY "Staff with logs permission view logs"
ON public.activity_logs FOR SELECT
USING (has_permission(auth.uid(), 'logs_access'));

-- 22. Product reviews: allow staff with product permissions
CREATE POLICY "Staff view reviews"
ON public.product_reviews FOR SELECT
USING (has_permission(auth.uid(), 'product_view'));

-- 23. Coupon usage: allow staff with coupon permissions
CREATE POLICY "Staff view coupon usage"
ON public.coupon_usage FOR SELECT
USING (has_permission(auth.uid(), 'coupon_view'));
