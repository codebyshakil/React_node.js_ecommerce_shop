
-- Drop RFQ table and clean up
DROP TABLE IF EXISTS public.rfqs;

-- Delete RFQ-related settings
DELETE FROM public.site_settings WHERE key = 'rfq_enabled';

-- Add new roles to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'account_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support_assistant';
