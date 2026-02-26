
-- Add status column to contact_messages for read/unread/responded tracking
ALTER TABLE public.contact_messages ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'unread';

-- Update existing messages: set is_read=true ones to 'read'
UPDATE public.contact_messages SET status = 'read' WHERE is_read = true;
