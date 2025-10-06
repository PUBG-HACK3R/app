-- Create the process_daily_earnings SQL function
CREATE OR REPLACE FUNCTION process_daily_earnings()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_count integer := 0;
    sub_record record;
    daily_amount numeric;
BEGIN
    -- Process all active subscriptions
    FOR sub_record IN 
        SELECT id, user_id, amount_invested, daily_earning, end_date, active
        FROM public.subscriptions 
        WHERE active = true 
        AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    LOOP
        -- Use the daily_earning from the subscription
        daily_amount := COALESCE(sub_record.daily_earning, 0);
        
        IF daily_amount > 0 THEN
            -- Insert earning transaction
            INSERT INTO public.transactions (
                user_id, 
                type, 
                amount_usdt, 
                reference_id, 
                status,
                created_at
            ) VALUES (
                sub_record.user_id,
                'earning',
                daily_amount,
                sub_record.id,
                'completed',
                NOW()
            );
            
            -- Update user balance
            INSERT INTO public.balances (user_id, available_usdt)
            VALUES (sub_record.user_id, daily_amount)
            ON CONFLICT (user_id) 
            DO UPDATE SET available_usdt = balances.available_usdt + daily_amount;
            
            -- Update total_earned in subscription
            UPDATE public.subscriptions 
            SET total_earned = COALESCE(total_earned, 0) + daily_amount
            WHERE id = sub_record.id;
            
            result_count := result_count + 1;
        END IF;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'processed_subscriptions', result_count,
        'timestamp', NOW()
    );
END;
$$;
