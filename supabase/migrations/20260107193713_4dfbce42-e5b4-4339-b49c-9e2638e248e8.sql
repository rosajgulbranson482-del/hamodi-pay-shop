-- Add free delivery threshold to delivery_settings
ALTER TABLE delivery_settings 
ADD COLUMN IF NOT EXISTS free_delivery_threshold numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS free_delivery_enabled boolean DEFAULT false;