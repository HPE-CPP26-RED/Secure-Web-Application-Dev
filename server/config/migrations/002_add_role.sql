-- Add the new role column with 'user' as default
ALTER TABLE public.users ADD COLUMN role VARCHAR(10) DEFAULT 'user';

-- Migrate existing admin users if any existed using the old 'roles' array
UPDATE public.users SET role = 'admin' WHERE 'admin' = ANY(roles);
