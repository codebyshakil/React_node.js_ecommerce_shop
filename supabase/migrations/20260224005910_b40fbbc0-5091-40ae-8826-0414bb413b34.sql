-- Allow marketing_manager to view blog posts
CREATE POLICY "Marketing managers manage blogs"
ON public.blog_posts
FOR ALL
USING (has_role(auth.uid(), 'marketing_manager'::app_role));

-- Allow marketing_manager to manage email campaigns
CREATE POLICY "Marketing managers manage campaigns"
ON public.email_campaigns
FOR ALL
USING (has_role(auth.uid(), 'marketing_manager'::app_role));

-- Allow marketing_manager to manage email templates
CREATE POLICY "Marketing managers manage email templates"
ON public.email_templates
FOR ALL
USING (has_role(auth.uid(), 'marketing_manager'::app_role));

-- Allow marketing_manager to manage coupons
CREATE POLICY "Marketing managers manage coupons"
ON public.coupons
FOR ALL
USING (has_role(auth.uid(), 'marketing_manager'::app_role));

-- Allow marketing_manager to view products (read only)
CREATE POLICY "Marketing managers view products"
ON public.products
FOR SELECT
USING (has_role(auth.uid(), 'marketing_manager'::app_role));

-- Allow marketing_manager to view activity logs
CREATE POLICY "Marketing managers view logs"
ON public.activity_logs
FOR SELECT
USING (has_role(auth.uid(), 'marketing_manager'::app_role));

-- Allow marketing_manager to insert activity logs
CREATE POLICY "Marketing managers insert logs"
ON public.activity_logs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'marketing_manager'::app_role) AND auth.uid() = user_id);

-- Allow marketing_manager to view profiles (for customer lists)
CREATE POLICY "Marketing managers view profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'marketing_manager'::app_role));

-- Allow marketing_manager to view homepage sections
CREATE POLICY "Marketing managers manage homepage"
ON public.homepage_sections
FOR ALL
USING (has_role(auth.uid(), 'marketing_manager'::app_role));
