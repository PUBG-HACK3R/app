-- Create subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id SERIAL PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id integer NOT NULL REFERENCES public.plans(id),
  principal_usdt numeric(12,2) NOT NULL CHECK (principal_usdt > 0),
  roi_daily_percent numeric(5,2) NOT NULL CHECK (roi_daily_percent > 0),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  active boolean NOT NULL DEFAULT true,
  next_earning_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for subscriptions table
DROP POLICY IF EXISTS "Subscriptions: owner read" ON public.subscriptions;
CREATE POLICY "Subscriptions: owner read"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Subscriptions: owner insert" ON public.subscriptions;
CREATE POLICY "Subscriptions: owner insert"
  ON public.subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Subscriptions: owner update" ON public.subscriptions;
CREATE POLICY "Subscriptions: owner update"
  ON public.subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow admin users full access to all subscriptions
DROP POLICY IF EXISTS "Subscriptions: admin full access" ON public.subscriptions;
CREATE POLICY "Subscriptions: admin full access"
  ON public.subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
