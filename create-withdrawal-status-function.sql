-- Create RPC function to get withdrawal status bypassing RLS
CREATE OR REPLACE FUNCTION get_withdrawal_status(withdrawal_id UUID, user_id_param UUID)
RETURNS TABLE (
  id UUID,
  status TEXT,
  admin_notes TEXT,
  user_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.status,
    w.admin_notes,
    w.user_id
  FROM withdrawals w
  WHERE w.id = withdrawal_id 
    AND w.user_id = user_id_param;
END;
$$;
