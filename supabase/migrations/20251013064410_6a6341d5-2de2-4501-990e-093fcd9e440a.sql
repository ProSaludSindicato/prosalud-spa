-- Tabla para control de rate limiting del chatbot
CREATE TABLE IF NOT EXISTS public.chatbot_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_ip TEXT NOT NULL,
  user_agent TEXT,
  message_count_hour INTEGER DEFAULT 1,
  message_count_day INTEGER DEFAULT 1,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  consecutive_messages INTEGER DEFAULT 1,
  cooldown_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas rápidas por IP
CREATE INDEX IF NOT EXISTS idx_chatbot_rate_limits_ip ON public.chatbot_rate_limits(user_ip);

-- Índice para limpiar registros antiguos
CREATE INDEX IF NOT EXISTS idx_chatbot_rate_limits_created ON public.chatbot_rate_limits(created_at);

-- Habilitar RLS (solo service role puede acceder desde edge functions)
ALTER TABLE public.chatbot_rate_limits ENABLE ROW LEVEL SECURITY;

-- No se necesitan policies ya que solo el service role accederá desde edge functions

-- Función para limpiar registros antiguos (> 7 días)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.chatbot_rate_limits 
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;

COMMENT ON TABLE public.chatbot_rate_limits IS 'Control de rate limiting para prevenir abuso del chatbot';
COMMENT ON FUNCTION public.cleanup_old_rate_limits IS 'Limpia registros de rate limiting mayores a 7 días';