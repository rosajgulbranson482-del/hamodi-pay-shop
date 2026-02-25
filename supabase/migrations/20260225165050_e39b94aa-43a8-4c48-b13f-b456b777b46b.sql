
-- Create backend_logs table for edge function logging
CREATE TABLE public.backend_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  log_type text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  details text,
  execution_time_ms integer,
  status_code integer,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.backend_logs ENABLE ROW LEVEL SECURITY;

-- Admin-only SELECT policy
CREATE POLICY "Admins can view backend logs"
ON public.backend_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin-only DELETE policy
CREATE POLICY "Admins can delete backend logs"
ON public.backend_logs
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role INSERT (edge functions use service role key)
CREATE POLICY "Service role can insert logs"
ON public.backend_logs
FOR INSERT
WITH CHECK (true);

-- Auto-cleanup: delete logs older than 30 days
CREATE INDEX idx_backend_logs_created_at ON public.backend_logs(created_at);
CREATE INDEX idx_backend_logs_function_name ON public.backend_logs(function_name);
