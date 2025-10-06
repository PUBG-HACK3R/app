-- Fix subscription RLS policies by dropping and recreating them

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can read own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admin full access subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Subscriptions: owner read" ON public.subscriptions;
DROP POLICY IF EXISTS "Subscriptions: owner insert" ON public.subscriptions;
DROP POLICY IF EXISTS "Subscriptions: owner update" ON public.subscriptions;

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Users can read own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admin full access subscriptions"
  ON public.subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Test: Check if we can see subscriptions now
SELECT 
  COUNT(*) as total_subscriptions,
  COUNT(CASE WHEN active = true THEN 1 END) as active_subscriptions
FROM public.subscriptions;
