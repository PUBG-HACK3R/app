-- Check what subscriptions exist in the database
SELECT 
  s.*,
  p.name as plan_name
FROM public.subscriptions s
LEFT JOIN public.plans p ON s.plan_id = p.id
ORDER BY s.created_at DESC
LIMIT 10;

-- Check RLS policies on subscriptions table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'subscriptions';
