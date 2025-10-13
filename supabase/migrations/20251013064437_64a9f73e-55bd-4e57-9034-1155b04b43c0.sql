-- Corregir función para tener search_path inmutable
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.chatbot_rate_limits 
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;