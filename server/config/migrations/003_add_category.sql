-- Migration: Add category column to products table
ALTER TABLE public.products ADD COLUMN category VARCHAR(50);
-- Fill existing products with a default category if needed
UPDATE public.products SET category = 'Uncategorized' WHERE category IS NULL;
-- Make it NOT NULL for future inserts
ALTER TABLE public.products ALTER COLUMN category SET NOT NULL;
