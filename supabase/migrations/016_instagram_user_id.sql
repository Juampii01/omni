-- 016: Add user_id to instagram_accounts + fix RLS
-- instagram_accounts had no user reference — connections weren't isolated per user

ALTER TABLE public.instagram_accounts
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Drop the old blanket policy
DROP POLICY IF EXISTS "authenticated full access" ON public.instagram_accounts;

-- New policy: each user only sees and edits their own accounts
CREATE POLICY "Users manage own instagram accounts"
  ON public.instagram_accounts FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Also fix integrations: add created_by index for faster lookups
CREATE INDEX IF NOT EXISTS integrations_created_by_idx ON public.integrations(created_by);
